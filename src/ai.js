import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function chatWithAgent(message, history, appState) {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Use today's date to give AI temporal context
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const { pantry, modules, plan, context } = appState;

    // Since modules are now a single array (after refactor), simply map names
    // If modules is NOT yet an array (migration phase), we flatten it
    let availableModules = [];
    if (Array.isArray(modules)) {
        availableModules = modules;
    } else {
        // Flatten old structure just in case
        Object.values(modules).forEach(list => availableModules.push(...list));
    }

    const systemInstruction = `
    You are the AI Assistant for BulkStack.
    Your goal is to help the user manage their nutrition, pantry, and meal plan.
    
    Current State:
    - Today: ${today}
    - Pantry: ${JSON.stringify(pantry)}
    - User Context: ${JSON.stringify(context)}
    - Available Modules: ${JSON.stringify(availableModules.map(m => ({ id: m.id, name: m.name })))}
    - Weekly Plan (Today): ${JSON.stringify(plan[today] || "No plan for today")}
    
    You must reply with a JSON object containing:
    1. "reply": A friendly, natural language response.
    2. "proposal": (Optional) An action you want to take.
    
    Proposal Types:
    - LOG_MEAL: { type: "LOG_MEAL", data: { day: "${today}", mealType: "breakfast/lunch/dinner/snack", moduleID: "ID" } }
    - CREATE_MODULE: { type: "CREATE_MODULE", data: { name, desc, ingredients: [] } }
    - UPDATE_PANTRY: { type: "UPDATE_PANTRY", data: { items: [{name, quantity}] } } (Note: Always send the FULL new list or diff, but here simplified to just items to add/update)
    - UPDATE_CONTEXT: { type: "UPDATE_CONTEXT", data: { key: "missedMeals/goals", value } }
    - PLAN_WEEK: { type: "PLAN_WEEK", data: null } (Signal to run the auto-planner)
    
    Rules:
    - If user says "I ate X", check if X is in the plan. If yes, propose LOG_MEAL.
    - If user says "I bought X", propose UPDATE_PANTRY.
    - If user says "Create a meal with X", propose CREATE_MODULE.
    - Keep replies concise.
    
    Output strictly valid JSON.
  `;

    // Convert history to Gemini format if needed, or just append latest pair
    const chatContext = history.slice(-5).map(h => `${h.role}: ${h.text}`).join('\n');
    const fullPrompt = `${systemInstruction}\n\nChat History:\n${chatContext}\n\nUser: ${message}`;

    try {
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("AI Agent Error:", error);
        return {
            reply: "I'm having trouble thinking right now. Please try again.",
            proposal: null
        };
    }
}

// Helper to generate a plan (can be called by the Agent via PLAN_WEEK or manually)
export async function generateWeeklyPlan(pantry, modules, context) {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    let moduleList = Array.isArray(modules) ? modules : Object.values(modules).flat();

    const systemInstruction = `
    You are a meal planner.
    Modules: ${JSON.stringify(moduleList)}
    Pantry: ${JSON.stringify(pantry)}
    
    Create a weekly meal plan (Monday-Sunday).
    Return JSON object: { "Monday": { "breakfast": ModuleObject, ... }, ... }
    Use EXACT module objects.
  `;

    try {
        const result = await model.generateContent(systemInstruction);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Planning Error:", error);
        throw error;
    }
}