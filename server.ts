import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini SDK
// Note: We use the server-side key process.env.GEMINI_API_KEY
// and set the dynamic User-Agent 'aistudio-build' as required.
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint to debug code
app.post("/api/debug", async (req, res) => {
  try {
    const {
      code,
      errorLogs,
      language, // e.g., 'typescript', 'python', 'auto'
      category, // e.g., 'runtime', 'logical', etc.
      customContext, // additional instructions or info
      expectedBehavior,
      actualBehavior,
      stepsToReproduce,
      modelName, // 'gemini-3.5-flash' or 'gemini-3.1-pro-preview'
      beginnerMode,
      securityScan,
      performanceScan,
    } = req.body;

    const selectedModel = modelName || "gemini-3.5-flash";

    const promptMessage = `You are a senior software debugging assistant. Please trace and analyze my broken code or error log systematically. Conduct full mental dry runs to find exactly where expectations diverge from reality.

Target Language: ${language || "auto-detect"}
Bug Category: ${category || "auto-detect"}
Environment Context: ${customContext || "None provided"}
Expected Behavior: ${expectedBehavior || "None provided"}
Actual Behavior: ${actualBehavior || "None provided"}
Steps to Reproduce: ${stepsToReproduce || "None provided"}
Beginner Mode: ${beginnerMode ? "true" : "false"}
Security Scan: ${securityScan ? "true" : "false"}
Performance Scan: ${performanceScan ? "true" : "false"}

Source Code:
${code || "/* No specific source code provided */"}

Error Stack Trace:
${errorLogs || "/* No error logs provided */"}

Instructions:
- Be extremely deep, methodical, and production-grade.
- If beginnerMode is true, use simpler analogies and explain core programming paradigms step-by-step.
- If securityScan is true, execute a thorough threat model scan, highlighting insecure functions, injection points, memory safety bugs, or access control failures.
- If performanceScan is true, perform a thorough algorithm analysis, pinpointing memory leaks, execution speed improvements, garbage collection spikes, database query bottlenecks, or loop nesting redundancies.

Return the answer in this exact format:

## Bug Summary
...
## Severity
...
## Confidence Score
...
## Root Cause
...
## Root Cause Chain
...
## Analysis
...
## Minimal Fix
...
## Best Practice Fix
...
## Updated Code
...
## Git Diff Patch
...
## Test Cases
...
## Security Notes
...
## Performance Notes
...
## Edge Cases
...
## Prevention Tips
...`;

    const systemInstruction = `You are a world-class AI Bug Fix Assistant designed for production-grade software engineering support.
You act as a Senior Software Engineer, Debugging Expert, Code Reviewer, System Architect, and Performance Engineer all in one.
Your mission is to:
- Identify bugs accurately.
- Explain root causes clearly.
- Provide minimal safe fixes.
- Improve code quality.
- Prevent future bugs.
- Teach developers while fixing issues.

You must prioritize correctness, clarity, and safety over speed.
Analyze the user's input code files, errors, and context. Output a detailed report following the exact markdown headers specified.`;

    // 1. Try OpenRouter First as requested
    const openRouterApiKey = process.env.OPENROUTER_API_KEY || "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";
    const mappedModel = selectedModel === "gemini-3.1-pro-preview" 
      ? "google/gemini-2.5-pro" 
      : "google/gemini-2.5-flash";

    console.log(`[OpenRouter Router] Forwarding to model ${mappedModel} using key...`);
    try {
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterApiKey}`,
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "AI Studio Debugger",
        },
        body: JSON.stringify({
          model: mappedModel,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: promptMessage }
          ],
          temperature: 0.2,
        }),
      });

      if (openRouterResponse.ok) {
        const data = await openRouterResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log("[OpenRouter Router] Diagnostic response retrieved successfully.");
          return res.json({ output: content, provider: "OpenRouter" });
        }
      } else {
        const errorText = await openRouterResponse.text();
        console.warn(`[OpenRouter Fallback] OpenRouter API status ${openRouterResponse.status}: ${errorText}`);
      }
    } catch (orError) {
      console.warn("[OpenRouter Fallback] OpenRouter invocation failed, descending to Gemini client SDK:", orError);
    }

    // 2. Direct Gemini SDK fallback if OpenRouter is unreachable/exhausted
    console.log("[Gemini Fallback] Initializing default Google Gemini Client SDK payload fallback...");
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: promptMessage,
      config: {
        systemInstruction,
      },
    });

    const outputText = response.text || "";
    res.json({ output: outputText, provider: "Gemini CLI" });
  } catch (error: any) {
    console.error("Diagnosis process failed completely: ", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during diagnostics.",
    });
  }
});

// Setup Vite Dev server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
