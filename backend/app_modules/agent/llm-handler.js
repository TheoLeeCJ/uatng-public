const { llmUrl, llmApiKey, llmModel, exceptionInferLlmUrl, exceptionInferLlmKey, exceptionInferLlm } = require('./config');

const systemPrompt = `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.
## Output Format
'''
Thought: ... (you need to reason carefully about which button, possibly which icon, is most valid, if it's icon-based)
Action: ...
'''
## Action Space

click(point='<point>x1 y1</point>')
long_press(point='<point>x1 y1</point>')
type(content='') #If you want to submit your input, use "\\n" at the end of 'content'.
scroll(point='<point>x1 y1</point>', direction='down or up or right or left')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
press_home()
press_back()
finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format. Write in English.

## Note
- Use English in 'Thought' part.
- Very imporant to follow the output format for each action from the action space you propose; if you don't follow the format, the entire system will crash
- Do not hallucinate elements that are not available on the latest screenshot yet
- Write a small plan and finally summarize your next action (with its target element) in two sentences in 'Thought' part.`;

const exceptionInferSystemPrompt = `You are a skilled GUI testing monitor, monitoring someone else's testing of a GUI.
You are to raise exceptions or proceed according to the following specification:

exception_loading() # Use when you see a loading indicator on the main content area (by your own discretion)
exception_blank_area() # Use when the main content area is "unnaturally" blank (i.e. it should have content but is blank)
exception_consistency(reason='reason') # Use when there is a clear inconsistency in the app state between past states (e.g. added an item to cart, but it's not visible in the cart)
exception_crashed(reason='reason') # When the app seems to have crashed to home screen, or you cannot proceed because a UI element is blocked
pass() # Use when none of the above are satisfied, meaning UI is OK.

You must do a thorough analysis of the current steps taken and screenshots and the latest screenshot to infer the expected state and whether there are issues.
You must output your choice in code fences (three backticks).`;

function constructMessages(userInstruction, history) {
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: `## User Instruction\n\n${userInstruction}\nStop when done.` },
        ...history.flat()
      ]
    }
  ];
  return messages;
}

function constructExceptionInferMessages(userInstruction, history) {
  const messages = [
    { role: "system", content: exceptionInferSystemPrompt },
    {
      role: "user",
      content: [
        ...history.flat()
      ]
    }
  ];
  return messages;
}

async function callLLM(url, apiKey, model, messages) {
  const response = await fetch(url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.25,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API request failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  if (!result.choices || result.choices.length === 0) {
    console.error("Invalid LLM response:", result);
    throw new Error("LLM returned no choices.");
  }

  return result.choices[0].message.content;
}

async function getNextActionAndExceptionInference(userInstruction, history) {
  const actionMessages = constructMessages(userInstruction, history);
  const exceptionInferMessages = constructExceptionInferMessages(userInstruction, history);

  const [actionResponse, exceptionInferResponse] = await Promise.all([
    callLLM(llmUrl, llmApiKey, llmModel, actionMessages),
    callLLM(exceptionInferLlmUrl, exceptionInferLlmKey, exceptionInferLlm, exceptionInferMessages)
  ]);

  return {
    actionResponse,
    exceptionInferResponse
  };
}

function parseLLMResponse(responseText) {
  const thoughtMatch = responseText.match(/Thought: ([\s\S]*?)Action:/);
  const actionMatch = responseText.match(/Action: ([\s\S]*)/);

  if (!thoughtMatch || !actionMatch) {
    throw new Error("Could not parse Thought and Action from LLM response.");
  }

  return {
    thought: thoughtMatch[1].trim(),
    action: actionMatch[1].trim()
  };
}

function parseExceptionInferResponse(responseText) {
  const codeBlockMatch = responseText.match(/```[\s\S]*?(exception_\w+\([^)]*\)|pass\(\))[\s\S]*?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const directMatch = responseText.match(/(exception_\w+\([^)]*\)|pass\(\))/);
  return directMatch ? directMatch[1].trim() : 'pass()';
}

module.exports = {
  getNextActionAndExceptionInference,
  parseLLMResponse,
  parseExceptionInferResponse
};