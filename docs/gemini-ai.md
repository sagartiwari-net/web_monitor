# Gemini API (@google/generative-ai) — Why We Use It

## What is the Gemini API?

Google's Gemini is a multimodal large language model (LLM). We use the `@google/generative-ai` Node.js SDK to call the Gemini Pro model for two AI features in this platform.

## Why Gemini in THIS Project?

| Reason | Detail |
|---|---|
| **Free tier available** | Gemini API has a generous free tier — ideal for hackathon demos. |
| **System prompt support** | We can inject structured context (user's website metrics) into the system prompt. |
| **Fast responses** | Gemini Flash model is optimized for speed — sub-second for 2-line explanations. |
| **Google ecosystem** | We're already using Google PageSpeed API. Using Gemini keeps us within the Google Cloud ecosystem. |

## Two Use Cases in This Project

### 1. Root-Cause Analysis (Automated)

Triggered automatically when a ping returns `status: DOWN`.

**System Prompt:**
```
You are a web reliability expert. Given a website downtime event, explain the likely cause in exactly 2 sentences. Use simple language for a non-technical business owner.
```

**User Message (dynamically built):**
```
Website: https://example.com
HTTP Status: 502
Error: Bad Gateway
Time: 2024-01-15 14:32:00 UTC
```

### 2. Context-Aware Chatbot

User asks questions about their website health. We inject their live data into the system prompt.

**System Prompt (dynamically built per user):**
```
You are a website health assistant. The user owns the following websites:

1. https://example.com — Status: UP, Response: 234ms, SEO Score: 78, Performance: 65
2. https://myblog.com — Status: DOWN (last downtime: 2 hours ago), Performance: 45

Answer the user's questions based ONLY on this data. Be specific and helpful.
```

## How We Use It

```js
// services/ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateRootCause(errorContext) {
  const result = await model.generateContent({
    systemInstruction: 'You are a web reliability expert...',
    contents: [{ role: 'user', parts: [{ text: errorContext }] }],
  });
  return result.response.text();
}
```

## Alternatives Considered

- **OpenAI GPT** — Paid from first token. Gemini has free tier.
- **Groq (Llama)** — Free and fast, but less reliable for structured outputs.
- **Ollama (local)** — No API cost, but requires local GPU. Not feasible for deployed hackathon.

## Version Used

```
@google/generative-ai: ^0.21.x
```
