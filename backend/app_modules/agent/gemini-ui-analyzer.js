const { exceptionInferLlmKey } = require('./config');

const GEMINI_API_KEY = exceptionInferLlmKey;
const MODEL_ID = "gemini-2.5-flash";
const GENERATE_CONTENT_API = "generateContent";

async function analyzeUIIssuesWithGemini(screenshotBase64) {
  try {
    const requestBody = {
      "contents": [
        {
          "role": "user",
          "parts": [
            {
              "text": "Is there text overflow in this UI? Exclude scrolling areas and if not sure say no.\nDo not hallucinate or come up with non-existent issues.\nText *truncation* does not count. \n\nFollow the structured response prompt."
            },
            {
              "inlineData": {
                "mimeType": "image/jpeg",
                "data": screenshotBase64
              }
            }
          ]
        }
      ],
      "generationConfig": {
        "temperature": 0,
        "thinkingConfig": {
          "thinkingBudget": 8192
        },
        "responseMimeType": "application/json",
        "responseSchema": {
          "type": "object",
          "properties": {
            "issues": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "summary": {
                    "type": "string"
                  },
                  "details": {
                    "type": "string"
                  },
                  "confidenceZeroToTen": {
                    "type": "number"
                  }
                },
                "required": [
                  "summary",
                  "details",
                  "confidenceZeroToTen"
                ],
                "propertyOrdering": [
                  "summary",
                  "details",
                  "confidenceZeroToTen"
                ]
              }
            }
          },
          "required": [
            "issues"
          ],
          "propertyOrdering": [
            "issues"
          ]
        }
      }
    };

    console.log('Sending UI analysis request to Gemini...');

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
    console.log('Gemini API raw response:', JSON.stringify(result, null, 2));

    // Extract content from streaming response
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const content = candidate.content.parts[0].text;
        console.log('Gemini UI analysis output text:', content);
        
        try {
          return JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse Gemini response as JSON:', parseError);
          console.log('Raw content:', content);
          return { issues: [] };
        }
      }
    }

    console.error('Unexpected Gemini response structure:', result);
    return { issues: [] };

  } catch (error) {
    console.error('Gemini UI Issues analysis failed:', error.message);
    return { issues: [] };
  }
}

module.exports = {
  analyzeUIIssuesWithGemini
};
