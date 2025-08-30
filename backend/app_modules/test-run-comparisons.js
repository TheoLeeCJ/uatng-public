const { ObjectId } = require('mongodb');
const { resizeAndConvertToJpeg } = require('./imgutils');
const fs = require('fs').promises;
const path = require('path');

const GEMINI_API_KEY = process.env.EXCEPTION_INFER_LLM_KEY;
const MODEL_ID = "gemini-2.5-flash";
const GENERATE_CONTENT_API = "generateContent";

async function loadSystemPrompt() {
  try {
    const promptPath = path.join(__dirname, 'sysprompt-compare.txt');
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load system prompt: ${error.message}`);
  }
}

async function compareTestRuns(db, firstRunId, secondRunId, user) {
  if (!firstRunId || !secondRunId) {
    throw new Error('Both test run IDs are required');
  }

  // Check if comparison already exists
  const existingComparison = await db.collection('comparisons').findOne({
    $or: [
      { firstRunId: new ObjectId(firstRunId), secondRunId: new ObjectId(secondRunId) },
      { firstRunId: new ObjectId(secondRunId), secondRunId: new ObjectId(firstRunId) }
    ]
  });

  if (existingComparison) {
    return existingComparison;
  }

  // Get both test runs with access control
  const [firstRun, secondRun] = await Promise.all([
    db.collection('testRuns').findOne({ 
      _id: new ObjectId(firstRunId),
      ...(user.role !== 'admin' && { userId: user._id })
    }),
    db.collection('testRuns').findOne({ 
      _id: new ObjectId(secondRunId),
      ...(user.role !== 'admin' && { userId: user._id })
    })
  ]);

  if (!firstRun || !secondRun) {
    throw new Error('One or both test runs not found or access denied');
  }

  // Determine which run is older (Previous) and which is newer (Latest)
  const firstDate = new Date(firstRun.createdAt);
  const secondDate = new Date(secondRun.createdAt);
  
  let previousRun, latestRun, previousRunId, latestRunId;
  if (firstDate < secondDate) {
    previousRun = firstRun;
    latestRun = secondRun;
    previousRunId = firstRunId;
    latestRunId = secondRunId;
  } else {
    previousRun = secondRun;
    latestRun = firstRun;
    previousRunId = secondRunId;
    latestRunId = firstRunId;
  }

  // Immediately create a placeholder comparison to prevent duplicates
  const placeholderDoc = {
    firstRunId: new ObjectId(previousRunId),
    secondRunId: new ObjectId(latestRunId),
    previousRunId: new ObjectId(previousRunId),
    latestRunId: new ObjectId(latestRunId),
    previousRunCreatedAt: previousRun.createdAt,
    latestRunCreatedAt: latestRun.createdAt,
    comparison: 'Generating comparison...',
    status: 'generating',
    createdAt: new Date(),
    userId: user._id
  };

  const placeholderResult = await db.collection('comparisons').insertOne(placeholderDoc);
  const comparisonId = placeholderResult.insertedId;

  // Generate comparison using AI in background
  try {
    const comparisonResult = await generateComparison(previousRun, latestRun);
    
    // Update with actual comparison result
    await db.collection('comparisons').updateOne(
      { _id: comparisonId },
      { 
        $set: { 
          comparison: comparisonResult,
          status: 'completed',
          completedAt: new Date()
        }
      }
    );

    // Return updated document
    const finalDoc = await db.collection('comparisons').findOne({ _id: comparisonId });
    return finalDoc;

  } catch (error) {
    // Update with error status
    await db.collection('comparisons').updateOne(
      { _id: comparisonId },
      { 
        $set: { 
          comparison: `Comparison failed: ${error.message}`,
          status: 'failed',
          failedAt: new Date()
        }
      }
    );

    // Return updated document with error
    const failedDoc = await db.collection('comparisons').findOne({ _id: comparisonId });
    return failedDoc;
  }
}

async function generateComparison(previousRun, latestRun) {
  try {
    // Load system prompt fresh each time
    const systemPrompt = await loadSystemPrompt();
    
    // Initialize messages array with system prompt
    const messages = [];
    
    // Add system message
    messages.push({
      role: "user",
      parts: [
        { text: systemPrompt }
      ]
    });

    // Process previous run screenshots
    if (previousRun.steps && previousRun.steps.length > 0) {
      for (let i = 0; i < previousRun.steps.length; i++) {
        const step = previousRun.steps[i];
        if (step.screenshot) {
          try {
            // Resize screenshot to 66% of original size
            const originalBuffer = Buffer.from(step.screenshot, 'base64');
            const resizedBuffer = await resizeAndConvertToJpeg(originalBuffer, 0.66);
            const resizedBase64 = resizedBuffer.toString('base64');
            
            // Add step label
            messages.push({
              role: "user",
              parts: [
                { text: `Previous Run, Step ${i + 1}` }
              ]
            });
            
            // Add screenshot
            messages.push({
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: resizedBase64
                  }
                }
              ]
            });
          } catch (error) {
            console.error('Failed to process previous run screenshot:', error);
          }
        }
      }
    }

    // Add separator message for previous run
    messages.push({
      role: "user",
      parts: [
        { text: "Above is the Previous Run." }
      ]
    });

    // Process latest run screenshots
    if (latestRun.steps && latestRun.steps.length > 0) {
      for (let i = 0; i < latestRun.steps.length; i++) {
        const step = latestRun.steps[i];
        if (step.screenshot) {
          try {
            // Resize screenshot to 66% of original size
            const originalBuffer = Buffer.from(step.screenshot, 'base64');
            const resizedBuffer = await resizeAndConvertToJpeg(originalBuffer, 0.66);
            const resizedBase64 = resizedBuffer.toString('base64');
            
            // Add step label
            messages.push({
              role: "user",
              parts: [
                { text: `Latest Run, Step ${i + 1}` }
              ]
            });
            
            // Add screenshot
            messages.push({
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: resizedBase64
                  }
                }
              ]
            });
          } catch (error) {
            console.error('Failed to process latest run screenshot:', error);
          }
        }
      }
    }

    // Add separator message for latest run
    messages.push({
      role: "user",
      parts: [
        { text: "Above is the Latest Run." }
      ]
    });

    // Prepare request body for Gemini API
    const requestBody = {
      contents: messages,
      generationConfig: {
        temperature: 0,
        thinkingConfig: {
          thinkingBudget: 8192
        },
        maxOutputTokens: 8192
      }
    };

    console.log('Sending test run comparison request to Gemini...');

    // Send request to Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini comparison API response received');

    // Extract and parse the response
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const content = candidate.content.parts[0].text;
        
        // Parse the summary from the response
        const summaryMatch = content.match(/BEGIN_SUMMARY_0132AE\s*(.*?)\s*END_SUMMARY_0132AE/s);
        if (summaryMatch) {
          return summaryMatch[1].trim();
        } else {
          console.warn('Could not parse summary from Gemini response, using full content');
          return content;
        }
      }
    }

    console.error('Unexpected Gemini response structure:', result);
    return 'Failed to generate comparison - unexpected API response';

  } catch (error) {
    console.error('Test run comparison failed:', error.message);
    throw error;
  }
}

module.exports = {
  compareTestRuns
};
