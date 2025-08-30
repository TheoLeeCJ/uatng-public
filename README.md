![https://i.imgur.com/HVD9pfZ.png](https://i.imgur.com/HVD9pfZ.png)

# UAT-NG: Next Generation Automated UI Testing

This repository contains the files needed to run uat-ng, `npm install` for both frontend and backend, set the LLM API keys in `backend/.env`, and have a MongoDB instance (or set its connection string in `.env` also).

Please refer to PDF file submitted via Devpost for demo link.

# Watch the video: https://www.youtube.com/watch?v=PUaEzR5Judg

# Problem Statement: Harnessing MLLM for Next-Generation UI Automation Testing

With the explosive growth of mobile Internet and smart devices, user interfaces (GUIs) are becoming increasingly complex and evolving at a rapid pace, driving up the demand for high-quality application assurance. To reduce the cost of manual testing, automated GUI testing has become a mainstream approach, especially for regression and compatibility testing whenever requirements change or versions are updated.

While extensive research has applied LLMs and MLLMs to GUI automation, most work has focused primarily on UI element localization. However, real-world business scenarios involve numerous dynamic interference factors and strong domain-specific contexts, which often result in lower success rates for these methods.

# UAT-NG

Most existing automated UI testers fall short in 3 main ways - **inadequate consistency checking, poor exception handling and subpar inference efficiency**. UAT-NG delivers an innovative solution to these problems to help make UI testing faster and more accurate, helping developers squash bugs and improving user experience for all.

## Development tools used:
- Visual Studio Code with GitHub Copilot for rapid prototyping
- adb (Android Debug Bridge) for user input simulation on devices

## APIs used in the project
LLM API:
- Bytedance Research's UI-TARS 1.5 7B as mobile phone GUI agent (hosted on Parasail)
- Gemini 2.5 Flash (Google AI Studio)

## Assets used in the project
- Google Material Symbols Outlined icons library
- TikTok app used as demonstration

## Libraries used in the project
- MongoDB for data storage
- NodeJS and Fastify for backend web server
- Vue and TailwindCSS for frontend user interface

## What it does

We decided to tackle all 3 highlighted issues and build a web application to demonstrate these solutions because doing so helps to provide a much stronger, more cohesive overview of how each of these different features might work together to enhance automated UI testing.

UAT-NG also incorporates a convenient teaching mode for configuring tests - developers can simply **demonstrate the steps needed to test a feature**, and UAT-NG creates a mostly generalisable plan for its testing agent to execute, allowing **tests to be created in under a minute**.

## 1. Consistency Verification
• How can we establish robust consistency between text and single-image/multi-image sequences/videos in UI scenarios?
1. Runtime detection - while the test executes, we use Gemini 2.5 Flash with a custom engineered system prompt and **multi-screenshot-sequence** to determine if the app's state deviates from what is expected. **We deliver a pass/fail verdict and reason based on the result.**
2. Postprocessing and comparison - after the test completes, we **compare its screenshots and actions against previous runs** to determine if there have been any regressions or changes. This uses the historical test data to effectively check consistency and produces a concise comparison for users.

![](https://i.imgur.com/pPTIUGg.png)

## 2. Exception Detection
• How can exception detection be used to identify and respond to interruptions?
1. UI-TARS 1.5 7B is able to respond to some exceptions such as loading screens and popups.
2. Gemini 2.5 Flash handles more subtle exceptions such as detecting and alerting users to overflowing text and other issues, in **single-image-inputs**.

![https://i.imgur.com/bqKe8zZ.png](https://i.imgur.com/bqKe8zZ.png)

## 3. Inference Efficiency
• Given that the execution chain of a task typically involves 5–15 steps, and inference with large models can be time-consuming, what technical approaches can be employed to accelerate the
process?

We greatly improved inference efficiency and increased test execution speed by:
1. Using UI-TARS 1.5 7B as the main GUI agent. Being a lightweight 7 billion parameter model, it uses very little compute resources and gives results quickly, allowing for fast testing
2. Reducing token usage through dynamic image resizing. We resize previous images in the context by 50% as they are mostly for reference, decreasing token usage without sacrificing quality.
