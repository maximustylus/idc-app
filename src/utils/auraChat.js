const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- ADD THIS LINE TO DEBUG ---
console.log("DEBUG: Current API Key is:", API_KEY); 

const SYSTEM_PROMPT = `...`

// src/utils/auraChat.js

// This grabs the key from your hidden .env file automatically
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `
ROLE: You are AURA, an empathetic wellbeing assistant for Allied Health Professionals (AHPs).
CONTEXT: Staff members will tell you how they feel. You must listen, validate, and then categorize them into the Mental Health Continuum.

CONTINUUM DEFINITIONS:
1. HEALTHY (Energy 80-100%): Calm, good humor, performing well.
2. REACTING (Energy 50-79%): Irritable, nervous, procrastination, trouble sleeping.
3. INJURED (Energy 20-49%): Anxiety, fatigue, pervasive sadness, negative attitude.
4. ILL (Energy 0-19%): Excessive anxiety, depression, unable to function.

TASK:
1. Respond with empathy (keep it short, <50 words).
2. Estimate their "Phase" and "Energy" (0-100) based on their text.
3. Suggest a specific "Action to Take" from the continuum chart (e.g., "Recognize limits", "Seek support").

OUTPUT FORMAT:
Return ONLY a JSON object:
{
  "reply": "Your empathetic response here...",
  "phase": "REACTING", 
  "energy": 65,
  "action": "Minimize stressors and get rest."
}
`;

export const analyzeWellbeing = async (userText) => {
    // If the key is missing in the .env file, throw an error
    if (!API_KEY) throw new Error("API Key missing. Please add VITE_GEMINI_API_KEY to your .env file.");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    { text: `USER SAYS: "${userText}"` }
                ]
            }]
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI Error");

    let rawText = data.candidates[0].content.parts[0].text;
    
    // Clean up JSON markdown if Gemini adds it
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(rawText);
};
