const { ObjectId } = require('mongodb');
const UIAgent = require('./ui-agent');

class TestRunner {
    constructor(db) {
        this.db = db;
        this.activeAgents = new Map();
    }

    async createTestRun(testId, user) {
        // Get test and verify access
        const test = await this.db.collection('tests').findOne({ 
            _id: new ObjectId(testId),
            state: 'ready',
            ...(user.role !== 'admin' && { userId: user._id })
        });
        
        if (!test) {
            throw new Error('Test not found, not ready, or access denied');
        }

        // Create test run document
        const testRun = {
            testId: new ObjectId(testId),
            userId: user._id,
            status: 'running',
            steps: [],
            startedAt: new Date(),
            createdAt: new Date()
        };

        const result = await this.db.collection('testRuns').insertOne(testRun);
        const testRunId = result.insertedId.toString();

        // Start the agent in the background
        this.startAgent(testRunId, test);

        return { testRunId };
    }

    async startAgent(testRunId, test) {
        try {
            const agent = new UIAgent(this.db, testRunId, test);
            this.activeAgents.set(testRunId, agent);

            // Set up timeout (default 120s if not specified)
            const timeoutMs = (test.timeout || 120) * 1000;
            const timeoutId = setTimeout(async () => {
                console.log(`Test run ${testRunId} timed out after ${timeoutMs/1000}s`);
                await agent.stop();
                await agent.updateTestRunStatus('quit', 'Test timed out');
                this.activeAgents.delete(testRunId);
            }, timeoutMs);

            // Start the agent
            agent.start().then(() => {
                clearTimeout(timeoutId);
                this.activeAgents.delete(testRunId);
            }).catch(async (error) => {
                clearTimeout(timeoutId);
                console.error(`Agent error for test run ${testRunId}:`, error.message);
                await agent.updateTestRunStatus('quit', error.message);
                this.activeAgents.delete(testRunId);
            });

        } catch (error) {
            console.error(`Failed to start agent for test run ${testRunId}:`, error.message);
            await this.db.collection('testRuns').updateOne(
                { _id: new ObjectId(testRunId) },
                { 
                    $set: { 
                        status: 'quit',
                        reason: error.message,
                        endedAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );
        }
    }

    async stopTestRun(testRunId, user) {
        const testRun = await this.db.collection('testRuns').findOne({ 
            _id: new ObjectId(testRunId),
            ...(user.role !== 'admin' && { userId: user._id })
        });
        
        if (!testRun) {
            throw new Error('Test run not found or access denied');
        }

        const agent = this.activeAgents.get(testRunId);
        if (agent) {
            await agent.stop();
            await agent.updateTestRunStatus('quit', 'Stopped by user');
            this.activeAgents.delete(testRunId);
        }

        return { success: true };
    }
}

module.exports = TestRunner;
