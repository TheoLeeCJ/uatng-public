const { executeAdbCommand, getScreenSize } = require('./adb-utils');
const { captureAndProcessScreenshot } = require('./image-processor');
const { getNextActionAndExceptionInference, parseLLMResponse, parseExceptionInferResponse } = require('./llm-handler');
const { analyzeUIIssuesWithGemini } = require('./gemini-ui-analyzer');
const { loadingThreshold, blankThreshold } = require('./config');
const { ObjectId } = require('mongodb');

class UIAgent {
    constructor(db, testRunId, test) {
        this.db = db;
        this.testRunId = testRunId;
        this.test = test;
        this.deviceId = test.deviceId;
        this.userInstruction = test.instruction;
        this.history = [];
        this.consecutiveLoading = 0;
        this.consecutiveBlank = 0;
        this.screenSize = null;
        this.isRunning = false;
        this.stepCounter = 0; // Track step order for async updates
    }

    async start() {
        console.log(`Starting UI Agent for test run ${this.testRunId}...`);
        this.isRunning = true;
        
        try {
            this.screenSize = await getScreenSize(this.deviceId);
            console.log(`Physical screen size: ${this.screenSize.width}x${this.screenSize.height}`);

            // Execute initial ADB command if provided
            if (this.test.adb_cmdline) {
                await executeAdbCommand(this.deviceId, ['shell', this.test.adb_cmdline]);
                console.log(`Executed initial command: ${this.test.adb_cmdline}`);
            }

            await this.agentLoop();
        } catch (error) {
            console.error("Agent failed to start:", error.message);
            await this.updateTestRunStatus('quit', error.message);
        }
    }

    async stop() {
        this.isRunning = false;
        console.log(`Stopping UI Agent for test run ${this.testRunId}`);
    }

    async agentLoop() {
        while (this.isRunning) {
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const screenshotBase64 = await captureAndProcessScreenshot(this.deviceId);
                const currentScreenshotTurn = [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` } }];
                
                const historyWithCurrentScreenshot = [...this.history, currentScreenshotTurn];

                const { actionResponse, exceptionInferResponse } = await getNextActionAndExceptionInference(this.userInstruction, historyWithCurrentScreenshot);
                
                const exceptionInferAction = parseExceptionInferResponse(exceptionInferResponse);
                console.log(`Exception Inference: ${exceptionInferAction}`);

                const { thought, action } = parseLLMResponse(actionResponse);
                console.log(`\nThought: ${thought}`);
                console.log(`Action: ${action}\n`);

                const currentStepIndex = this.stepCounter++;

                // Save step to database
                const stepData = {
                    screenshot: screenshotBase64,
                    exceptionInferResponse,
                    actionResponse,
                    thought,
                    action,
                    timestamp: new Date(),
                    stepIndex: currentStepIndex
                };
                await this.saveStep(stepData);

                // Start async UI issue analysis (non-blocking)
                this.analyzeUIIssuesAsync(screenshotBase64, currentStepIndex);

                const stepException = this.handleExceptionInferenceExceptions(exceptionInferAction);
                let addToHistory = true;
                
                if (stepException) {
                    if (stepException.type === 'loading' || stepException.type === 'blank') {
                        addToHistory = false;
                        if (this.consecutiveLoading > loadingThreshold || this.consecutiveBlank > blankThreshold) {
                            console.error(`Exceeded threshold for ${stepException.type}. Terminating.`);
                            await this.updateTestRunStatus('quit', `Exceeded threshold for ${stepException.type}`);
                            this.isRunning = false;
                        }
                    } else if (stepException.type === 'terminal') {
                        await this.updateTestRunStatus('quit', stepException.reason);
                        this.isRunning = false;
                    }
                } else {
                    const actionException = this.handleActionExceptions(action);
                    if (actionException) {
                        if (actionException.type === 'terminal') {
                            await this.updateTestRunStatus('completed', 'Test finished successfully');
                            this.isRunning = false;
                        }
                    } else {
                        this.consecutiveLoading = 0;
                        this.consecutiveBlank = 0;
                        await this.executeAction(action);
                    }
                }
                
                if (addToHistory && this.isRunning) {
                    const llmAnswerTurn = [{ type: 'text', text: `Thought: ${thought}\nAction: ${action}` }];
                    this.history.push(currentScreenshotTurn);
                    this.history.push(llmAnswerTurn);
                }
                
            } catch (error) {
                console.error("An error occurred in the agent loop:", error.message);
                await this.updateTestRunStatus('quit', error.message);
                this.isRunning = false;
            }
        }
        console.log("Agent has finished its task.");
    }

    async saveStep(stepData) {
        try {
            await this.db.collection('testRuns').updateOne(
                { _id: new ObjectId(this.testRunId) },
                { 
                    $push: { steps: stepData },
                    $set: { updatedAt: new Date() }
                }
            );
        } catch (error) {
            console.error('Failed to save step:', error.message);
        }
    }

    async updateTestRunStatus(status, reason = null) {
        try {
            const update = { 
                status,
                updatedAt: new Date()
            };
            if (reason) {
                update.reason = reason;
            }
            if (status === 'completed' || status === 'quit') {
                update.endedAt = new Date();
            }

            await this.db.collection('testRuns').updateOne(
                { _id: new ObjectId(this.testRunId) },
                { $set: update }
            );
        } catch (error) {
            console.error('Failed to update test run status:', error.message);
        }
    }

    handleExceptionInferenceExceptions(exceptionInferAction) {
        if (exceptionInferAction.startsWith('exception_loading()')) {
            this.consecutiveLoading++;
            console.warn(`Loading detected... (${this.consecutiveLoading}/${loadingThreshold})`);
            return { type: 'loading' };
        }
        if (exceptionInferAction.startsWith('exception_blank_area()')) {
            this.consecutiveBlank++;
            console.warn(`Blank area detected... (${this.consecutiveBlank}/${blankThreshold})`);
            return { type: 'blank' };
        }
        if (exceptionInferAction.startsWith('exception_consistency(')) {
            console.error(`Consistency issue detected: ${exceptionInferAction}`);
            return { type: 'terminal', reason: `Consistency issue: ${exceptionInferAction}` };
        }
        if (exceptionInferAction.startsWith('exception_crashed(')) {
            console.error(`App crashed: ${exceptionInferAction}`);
            return { type: 'terminal', reason: `App crashed: ${exceptionInferAction}` };
        }
        if (exceptionInferAction.startsWith('pass()')) {
            return null;
        }
        console.warn(`Unknown exception inference action: ${exceptionInferAction}`);
        return null;
    }

    handleActionExceptions(action) {
        if (action.startsWith('finished(')) {
            console.log(`Task finished: ${action}`);
            return { type: 'terminal' };
        }
        return null;
    }
    
    scaleCoordinates(x, y) {
        return {
            x: Math.round(x * 2),
            y: Math.round(y * 2)
        };
    }

    async executeAction(action) {
        const commandMatch = action.match(/^(\w+)\(.*\)$/);
        if (!commandMatch) {
            console.error("Invalid action format:", action);
            return;
        }
        const command = commandMatch[1];
        
        const coordRegex = /\((\d{1,4}),\s*(\d{1,4})\)/g;
        const allCoords = [...action.matchAll(coordRegex)];

        switch (command) {
            case 'click':
            case 'long_press': {
                if (allCoords.length < 1) {
                    console.error(`No coordinates found for ${command}:`, action);
                    return;
                }
                const [_, xStr, yStr] = allCoords[0];
                const scaled = this.scaleCoordinates(Number(xStr), Number(yStr));
                
                if (command === 'click') {
                    await executeAdbCommand(this.deviceId, ['shell', 'input', 'tap', String(scaled.x), String(scaled.y)]);
                } else {
                    await executeAdbCommand(this.deviceId, ['shell', 'input', 'swipe', String(scaled.x), String(scaled.y), String(scaled.x), String(scaled.y), '500']);
                }
                break;
            }
            case 'type': {
                const contentMatch = action.match(/content='([^']*)'/);
                if (!contentMatch || !contentMatch[1]) {
                     console.error("No content found for type action:", action);
                     return;
                }
                const content = contentMatch[1];
                await executeAdbCommand(this.deviceId, ['shell', 'input', 'text', content.replace(/"/g, '\\"')]);
                break;
            }
            case 'scroll': {
                if (allCoords.length < 1) {
                    console.error("No coordinates found for scroll:", action);
                    return;
                }
                const directionMatch = action.match(/direction='(\w+)'/);
                 if (!directionMatch || !directionMatch[1]) {
                     console.error("No direction found for scroll action:", action);
                     return;
                }
                const direction = directionMatch[1];
                const [_, xStr, yStr] = allCoords[0];
                const scaled = this.scaleCoordinates(Number(xStr), Number(yStr));
                
                let endX = scaled.x, endY = scaled.y;
                const scrollAmount = 500;

                if (direction === 'down') endY -= scrollAmount;
                else if (direction === 'up') endY += scrollAmount;
                else if (direction === 'left') endX += scrollAmount;
                else if (direction === 'right') endX -= scrollAmount;
                
                await executeAdbCommand(this.deviceId, ['shell', 'input', 'swipe', String(scaled.x), String(scaled.y), String(endX), String(endY), '100']);
                break;
            }
            case 'drag': {
                if (allCoords.length < 2) {
                    console.error("Drag action requires at least two coordinate pairs:", action);
                    return;
                }
                const [_, x1Str, y1Str] = allCoords[0];
                const [__, x2Str, y2Str] = allCoords[1];

                const scaledStart = this.scaleCoordinates(Number(x1Str), Number(y1Str));
                const scaledEnd = this.scaleCoordinates(Number(x2Str), Number(y2Str));

                await executeAdbCommand(this.deviceId, ['shell', 'input', 'swipe', String(scaledStart.x), String(scaledStart.y), String(scaledEnd.x), String(scaledEnd.y), '500']);
                break;
            }
            case 'press_home':
                await executeAdbCommand(this.deviceId, ['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
                break;
            case 'press_back':
                await executeAdbCommand(this.deviceId, ['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
                break;
            case 'finished':
                break;
            default:
                console.error("Unknown command:", command);
        }
    }

    async analyzeUIIssuesAsync(screenshotBase64, stepIndex) {
        try {
            console.log(`Starting async UI issue analysis for step ${stepIndex}...`);
            const issuesResult = await analyzeUIIssuesWithGemini(screenshotBase64);
            
            // Update the specific step with the issues analysis
            await this.updateStepWithIssues(stepIndex, issuesResult.issues);
            
            console.log(`UI issue analysis completed for step ${stepIndex}. Found ${issuesResult.issues.length} issues.`);
        } catch (error) {
            console.error(`UI issue analysis failed for step ${stepIndex}:`, error.message);
            // Don't throw - this should not affect the main agent loop
        }
    }

    async updateStepWithIssues(stepIndex, issues) {
        try {
            await this.db.collection('testRuns').updateOne(
                { 
                    _id: new ObjectId(this.testRunId),
                    "steps.stepIndex": stepIndex
                },
                { 
                    $set: { 
                        "steps.$.issues": issues,
                        "steps.$.issuesAnalyzedAt": new Date()
                    }
                }
            );
        } catch (error) {
            console.error(`Failed to update step ${stepIndex} with issues:`, error.message);
        }
    }
}

module.exports = UIAgent;
