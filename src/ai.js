import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateModuleWithAI(prompt, category) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const systemInstruction = `
    You are a nutrition assistant API for a React app. 
    The user will describe a meal. You must output strictly valid JSON.
    Do not output markdown code blocks. Just the raw JSON object.
    
    The JSON structure must be:
    {
      "name": "Short Name (Max 20 chars)",
      "desc": "Short description of contents",
      "ingredients": ["Ingredient1", "Ingredient2", "Ingredient3"]
    }
    
    Context: The user is looking for a ${category} meal for bulking.
  `;

  const fullPrompt = `${systemInstruction}\n\nUser Request: ${prompt}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up if the AI accidentally adds markdown ```json blocks
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}