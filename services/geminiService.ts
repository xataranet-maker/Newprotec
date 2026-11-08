import { GoogleGenAI } from "@google/genai";

export const generateResponse = async (prompt: string, context?: string): Promise<string> => {
  try {
    // Guidelines: Always initialize GoogleGenAI with a named parameter 'apiKey' right before making the call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const fullPrompt = context 
      ? `Context about the current app state: ${context}\n\nUser Query: ${prompt}`
      : prompt;

    // Guidelines: Use 'gemini-3-flash-preview' for basic text tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
    });

    // Guidelines: Use response.text to extract the generated string output. Do not use text() method.
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request. Please check your API key.";
  }
};