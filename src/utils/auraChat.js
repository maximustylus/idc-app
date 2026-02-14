// src/utils/auraChat.js

// --- ⚠️ PASTE YOUR API KEY PARTS BELOW ⚠️ ---
const PART_1 = "AIzaSy"; 
const PART_2 = "YOUR_REST_OF_KEY_HERE"; // <--- PASTE THE REST OF YOUR KEY HERE

const API_KEY = PART_1 + PART_2;

// --- FIX: Define the cache variable explicitly ---
let cachedModelName = null;

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

const getBestModel = async () => {
    // If we already found a working model, use it
    if (cachedModelName) return cachedModelName;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error("List models failed");

        const models = data.models || [];
        
        // Priority: Flash -> Pro -> Any Generator
        const best = models.find(m => m.name.includes('gemini-1.5-flash')) || 
                     models.find(m => m.name.includes('gemini-pro')) ||
                     models.find(m => m.name.includes('generateContent'));

        if (best) {
            // Clean the name (remove 'models/' prefix if present)
            cachedModelName = best.name.replace('models/', '');
            return cachedModelName;
        }
    } catch (e) {
        console.warn("Model auto-detect failed, defaulting to gemini-pro");
    }
    
    // Safety Fallback
    return 'gemini-pro';
};

export const analyzeWellbeing = async (userText) => {
    if (!API_KEY || API_KEY.includes("YOUR_REST")) {
        throw new Error("API Key missing. Check src/utils/auraChat.js");
    }

    const modelName = await getBestModel();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
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
    if (!response.ok) throw new Error(data.error?.message || "AI Connection Error");

    let rawText = data.candidates[0].content.parts[0].text;
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(rawText);
};
