require('dotenv').config();

module.exports = {
  llmUrl: process.env.LLM_URL || 'https://api.parasail.io/v1/chat/completions',
  llmApiKey: process.env.LLM_API_KEY,
  llmModel: process.env.LLM || 'parasail-ui-tars-1p5-7b',
  exceptionInferLlmUrl: process.env.EXCEPTION_INFER_LLM_URL,
  exceptionInferLlmKey: process.env.EXCEPTION_INFER_LLM_KEY,
  exceptionInferLlm: process.env.EXCEPTION_INFER_LLM,
  loadingThreshold: 3,
  blankThreshold: 3
};
