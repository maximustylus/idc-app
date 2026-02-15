// src/utils/auraChat.js
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 1. ADVANCED SYSTEM PROMPT: The "Compassion Engine"
const SYSTEM_PROMPT = `
ROLE: You are AURA, the Nexus Intelligence Engine. You are a Senior Principal Allied Health Professional and a trained Peer Support Counselor.
TONE: Warm, professional, unhurried, deeply empathetic, and non-judgmental.

---
COUNSELING PROTOCOL (STRICT ADHERENCE REQUIRED):
You are using the "OARS" (Open-ended, Affirmations, Reflections, Summaries) framework.

PHASE 1: THE LISTENING & VALIDATION PHASE (Turns 1-3)
- GOAL: Make the user feel heard and understood. Do NOT fix the problem yet.
- ACTION: If the user says "I'm tired" or "stressed", do NOT jump to advice.
- REFLECT: Use reflective listening. (e.g., "It sounds like the clinical load is really weighing on you today.")
- EXPLORE: Ask *one* gentle, open-ended question to understand the context (e.g., "Is it the volume of patients, or something specific on your mind?").
- NAME EXTRACTION: If the user introduces themselves (e.g., "Alif here"), acknowledge them warmly by name, but keep the focus on their wellbeing.

PHASE 2: THE TRIAGE & ACTION PHASE (Turn 4+)
- GOAL: Collaborative problem solving (The "5As").
- TRIGGER: Only move to this phase when you clearly understand the *source* of their stress.
- ACTION: Propose a small, manageable step (Micro-break, peer chat, hydration).
- DIAGNOSIS: Set "diagnosis_ready": true only when you have proposed this action.

---
INTERNAL THOUGHT PROCESS:
Before generating a reply, silently ask yourself:
1. Did I validate their emotion first?
2. Am I rushing to a solution? (If yes, stop and reflect instead).
3. Is my tone warm enough?

---
OUTPUT FORMAT (Strict JSON):
{
  "reply": "Your empathetic response string. Keep it under 60 words to feel conversational.",
  "diagnosis_ready": boolean,
  "phase": "HEALTHY" | "REACTING" | "INJURED" | "ILL" (Set ONLY if diagnosis_ready is true, else null),
  "energy": 0-100 (Set ONLY if diagnosis_ready is true, else null),
  "action": "Specific 5A advice" (Set ONLY if diagnosis_ready is true, else null)
}
`;

// 2. MODEL SELECTION (Kept your existing logic, it's good)
const getBestModel = async () => {
    // ... (Your existing code for model selection is fine to keep here)
    return 'gemini-1.5-flash'; 
};

// 3. MAIN ANALYSIS FUNCTION
export const analyzeWellbeing = async (chatHistory) => {
    if (!API_KEY) throw new Error("Key Missing: Check VITE_GEMINI_API_KEY");

    // Convert chat history to Gemini's "user/model" format
    // CRITICAL FIX: Ensure we don't send 'bot' as a role, Gemini only likes 'model'
    const formattedHistory = chatHistory.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    // Inject the System Prompt as the "Primary Directive" at the start
    const contents = [
        { 
            role: 'user', 
            parts: [{ text: SYSTEM_PROMPT }] 
        },
        ...formattedHistory
    ];

    try {
        const modelName = 'gemini-1.5-flash'; 
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: { 
                    // This forces Gemini to respond in JSON, preventing "I can't do that" errors
                    responseMimeType: "application/json",
                    // Temperature 0.7 allows for warmth/creativity without hallucinations
                    temperature: 0.7 
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Gemini API Error:", data);
            throw new Error(data.error?.message || "AI Error");
        }

        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawText) throw new Error("Empty response from AURA");

        // Clean up markdown just in case (e.g. ```json ... ```)
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(rawText);

    } catch (e) {
        console.error("AURA Connection Failed:", e);
        // Graceful Fallback - Keeps the UI alive if the API fails
        return { 
            reply: "I'm sensing a disturbance in the Nexus connection. I'm here, but can you repeat that?", 
            diagnosis_ready: false 
        };
    }
};
