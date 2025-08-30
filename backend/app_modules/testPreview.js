const { ObjectId } = require('mongodb');
const { exec } = require('child_process');
const { getAdbScreenshot, resizeAndConvertToJpeg, addCircleToImage, getScreenSize } = require('./imgutils');

async function createFromTeaching(db, body, user) {
  const { testSuiteId, name, adb_cmdline, deviceId } = body;
  
  if (!testSuiteId || !name || !adb_cmdline || !deviceId) {
    throw new Error('Missing required fields');
  }

  // Verify test suite exists and user has access
  const testSuite = await db.collection('testSuites').findOne({ 
    _id: new ObjectId(testSuiteId),
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!testSuite) {
    throw new Error('Test suite not found or access denied');
  }

  const result = await db.collection('tests').insertOne({
    testSuiteId: new ObjectId(testSuiteId),
    name,
    adb_cmdline,
    deviceId,
    userId: testSuite.userId,
    state: 'preview',
    previewType: 'teaching',
    createdAt: new Date()
  });

  return { testId: result.insertedId };
}

async function createFromInstruction(db, body, user) {
  const { testSuiteId, name, adb_cmdline, instruction, deviceId } = body;
  
  if (!testSuiteId || !name || !adb_cmdline || !instruction || !deviceId) {
    throw new Error('Missing required fields');
  }

  // Verify test suite exists and user has access
  const testSuite = await db.collection('testSuites').findOne({ 
    _id: new ObjectId(testSuiteId),
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!testSuite) {
    throw new Error('Test suite not found or access denied');
  }

  const result = await db.collection('tests').insertOne({
    testSuiteId: new ObjectId(testSuiteId),
    name,
    adb_cmdline,
    instruction,
    deviceId,
    userId: testSuite.userId,
    state: 'preview',
    previewType: 'instruction',
    createdAt: new Date()
  });

  return { testId: result.insertedId };
}

async function cmdlineTest(db, body, user) {
  const { testId, cmdline } = body;
  
  if (!testId || !cmdline) {
    throw new Error('Missing required fields');
  }

  // Get test and verify access
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found or access denied');
  }

  return new Promise((resolve, reject) => {
    exec(`adb -s ${test.deviceId} shell "${cmdline}"`, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr });
      } else {
        resolve({ success: true, output: stdout, stderr });
      }
    });
  });
}

async function getScreen(db, body, user) {
  const { testId } = body;
  
  if (!testId) {
    throw new Error('Missing testId');
  }

  // Get test and verify access
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    state: 'preview',
    previewType: 'teaching',
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found, not in teaching preview mode, or access denied');
  }

  try {
    const pngBuffer = await getAdbScreenshot(test.deviceId);
    const jpegBuffer = await resizeAndConvertToJpeg(pngBuffer, 0.5);
    
    return jpegBuffer;
  } catch (error) {
    throw new Error(`Failed to capture screenshot: ${error.message}`);
  }
}

async function teachTap(db, body, user) {
  const { testId, percentX, percentY } = body;
  
  if (!testId || percentX === undefined || percentY === undefined) {
    throw new Error('Missing required fields: testId, percentX, percentY');
  }

  // Get test and verify access
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    state: 'preview',
    previewType: 'teaching',
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found, not in teaching preview mode, or access denied');
  }

  try {
    // Capture screenshot
    const pngBuffer = await getAdbScreenshot(test.deviceId);
    
    // Resize to 50%
    const resizedBuffer = await resizeAndConvertToJpeg(pngBuffer, 0.5);
    
    // Add circle at tap point
    const imageWithCircle = await addCircleToImage(resizedBuffer, percentX, percentY);
    
    // Create taught step
    const taughtStep = {
      type: 'tap',
      percentX: percentX,
      percentY: percentY,
      image: imageWithCircle
    };
    
    // Update test with new taught step
    await db.collection('tests').updateOne(
      { _id: new ObjectId(testId) },
      { 
        $push: { taughtSteps: taughtStep },
        $set: { updatedAt: new Date() }
      }
    );
    
    return { success: true, step: { type: 'tap', percentX, percentY } };
  } catch (error) {
    throw new Error(`Failed to record tap: ${error.message}`);
  }
}

async function inputTap(db, body, user) {
  const { testId, percentX, percentY } = body;
  
  if (!testId || percentX === undefined || percentY === undefined) {
    throw new Error('Missing required fields: testId, percentX, percentY');
  }

  // Get test and verify access
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    state: 'preview',
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found, not in preview mode, or access denied');
  }

  try {
    let screenSz = test.screenSz;
    
    // If screenSz doesn't exist, capture and store it
    if (!screenSz) {
      screenSz = await getScreenSize(test.deviceId);
      
      // Update test document with screen size
      await db.collection('tests').updateOne(
        { _id: new ObjectId(testId) },
        { 
          $set: { 
            screenSz: screenSz,
            updatedAt: new Date() 
          }
        }
      );
    }
    
    // Calculate actual coordinates from percentages
    const actualX = Math.round((percentX / 100) * screenSz[0]);
    const actualY = Math.round((percentY / 100) * screenSz[1]);

    console.log(actualX, actualY)
    
    // Execute the tap
    const tapResult = await new Promise((resolve, reject) => {
      exec(`adb -s ${test.deviceId} shell input tap ${actualX} ${actualY}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Tap failed: ${error.message}`));
        } else {
          resolve({ success: true, output: stdout, stderr });
        }
      });
    });
    
    return { 
      success: true, 
      coordinates: { x: actualX, y: actualY },
      screenSize: screenSz,
      tapResult
    };
  } catch (error) {
    throw new Error(`Failed to execute tap: ${error.message}`);
  }
}

async function stopTeaching(db, body, user) {
  const { testId } = body;
  
  if (!testId) {
    throw new Error('Missing required fields: testId');
  }

  // Get test and verify access
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    state: 'preview',
    previewType: 'teaching',
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found, not in teaching preview mode, or access denied');
  }

  if (!test.taughtSteps || test.taughtSteps.length === 0) {
    throw new Error('No taught steps found to analyze');
  }

  try {
    // Prepare images for LLM analysis
    const images = test.taughtSteps.map(step => {
      if (step.image) {
        const base64Image = step.image.buffer.toString("base64");
        return {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        };
      }
      return null;
    }).filter(Boolean);

    if (images.length === 0) {
      throw new Error('No valid images found in taught steps');
    }

    // Prepare LLM request
    const systemPrompt = `You are an expert GUI automation tester, supervising the automation testing process. Below are a sequence of screenshots from a test run. A pink circle captures where the user tapped on a screenshot before it went to the next screen. A pink arrow would denote a swipe from the start to the end points.

Thinking through what UI element was clicked for each screen, devise a concise plan to replicate this test by dedicating one sentence to each step with a brief description of the UI element to focus on, its context and what to tap on (e.g. The screen may show an airplane mode icon on a settings menu - tap on the airplane mode icon.). Then provide a concise title for what is being tested.

Follow the format like:

START_TITLE_21ae23
title
END_TITLE_21ae23

START_PLAN_21ae23
Step 1. The screen...
Step 2. Now, it...
END_PLAN_21ae23`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...images
    ];

    // Call LLM API
    const llmResponse = await fetch(process.env.STEP_INFER_LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STEP_INFER_LLM_KEY}`
      },
      body: JSON.stringify({
        model: process.env.STEP_INFER_LLM,
        messages: messages,
        max_tokens: 1024 * 32
      })
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM API request failed: ${llmResponse.status} ${llmResponse.statusText}`);
    }

    const llmResult = await llmResponse.json();
    console.log(llmResult);
    const content = llmResult.choices[0].message.content;

    // Parse title and plan
    const titleMatch = content.match(/START_TITLE_21ae23\s*(.*?)\s*END_TITLE_21ae23/s);
    const planMatch = content.match(/START_PLAN_21ae23\s*(.*?)\s*END_PLAN_21ae23/s);

    const title = titleMatch ? titleMatch[1].trim() : 'Generated Test';
    const plan = planMatch ? planMatch[1].trim() : 'No plan generated';

    return {
      success: true,
      title,
      plan,
      stepsAnalyzed: test.taughtSteps.length
    };

  } catch (error) {
    throw new Error(`Failed to analyze taught steps: ${error.message}`);
  }
}

async function updateTest(db, body, user) {
  const { testId, name, instruction } = body;
  
  if (!testId || !name || !instruction) {
    throw new Error('Missing required fields: testId, name, instruction');
  }

  // Get test and verify access
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    state: 'preview',
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found, not in preview mode, or access denied');
  }

  try {
    // Update test with new name, instruction, and change state to ready
    await db.collection('tests').updateOne(
      { _id: new ObjectId(testId) },
      { 
        $set: { 
          name: name,
          instruction: instruction,
          state: 'ready',
          updatedAt: new Date()
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to update test: ${error.message}`);
  }
}

module.exports = {
  createFromTeaching,
  createFromInstruction,
  cmdlineTest,
  getScreen,
  teachTap,
  inputTap,
  stopTeaching,
  updateTest
};
