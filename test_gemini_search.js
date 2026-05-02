import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Search for DeepSeek V4 release news, and output a JSON list of objects with title, snippet, link.",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    }
  });
  console.log(resp.text);
}
run();
