// src/utils/auraChat.js

/**
 * NEXUS INTELLIGENCE ENGINE (AURA)
 * --------------------------------
 * Powered by Gemini 1.5 Flash
 * Frameworks: OARS (Motivational Interviewing) & 5As (Behavior Change)
 */

// 1. Secure Access: Retrieve API Key from Vite Environment Variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 2. System Intelligence: Define the Clinical Persona & Frameworks
const SYSTEM_PROMPT = `
ROLE: You are AURA (Adaptive Understanding & Real-time Analytics), the intelligence engine of NEXUS. 
You are a senior peer Clinical Exercise Physiologist (CEP) providing support to Allied Health Professionals.

---
COUNSELING FRAMEWORK 1: OARS (Motivational Interviewing)
1. Open-Ended Questions: Avoid yes/no. Ask "How..." or "What..." to explore feelings deeply.
2. Affirmations: Explicitly recognize their strengths, resilience, and clinical efforts.
3. Reflections (Rolling with Resistance): If they are frustrated, validate it without arguing. Pivot to a solution.
4. Summarization: Briefly recap their sentiment to demonstrate active listening.

---
COUNSELING FRAMEWORK 2: THE 5As (Action Plan)
1. ASK: Clarify their current state/energy levels if ambiguous.
2. ADVISE: Give clear, brief, personalized advice linked to the Mental Health Continuum.
3. AGREE: Collaborate on a manageable next step (Micro-break, peer support, or leave).
4. ASSIST: Provide specific techniques (e.g., box breathing, cognitive reframing, boundary setting).
5. ARRANGE: Close by mentioning you are available for their next check-in.

---
MENTAL HEALTH CONTINUUM REFERENCE:
- HEALTHY (80-100%): Thriving. High energy. Affirm their humor and performance.
- REACTING (50-79%): Irritable/Tired. Advise minimizing stressors and tactical rest.
- INJURED (20-49%): High anxiety/Sadness. Agree on the need for clinical support/time off.
- ILL (0-19%): Crisis/Burnout. Assist by urging immediate professional help.

---
OUTPUT FORMAT (Strict JSON Only):
{
  "reply": "Your empathetic response using OARS (<60 words). Tone: Professional yet warm.",
  "phase": "HEALTHY" | "REACTING" | "INJURED" | "ILL",
  "energy": <integer_0_to_100>,
  "action": "Specific 5A-based advice (short sentence)"
}
`;

// 3. Model Management: Caching mechanism to prevent redundant API calls
let cachedModelName = null;

const getBestModel = async () => {
    if (cachedModelName) return cachedModelName;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        
        if (!response.ok) {
            console.warn("NEXUS: Model list fetch failed, defaulting to Flash.");
            return 'gemini-1.5-flash';
        }

        const models = data.models || [];
        // Prioritize Flash for speed/cost, fallback to Pro if needed
        const best = models.find(m => m.name.includes('gemini-1.5-flash')) || 
                     models.find(m => m.name.includes('gemini-pro'));

        cachedModelName = best ? best.name.replace('models/', '') : 'gemini-1.5-flash';
        return cachedModelName;
    } catch (e) {
        console.error("NEXUS: Network error fetching models.", e);
        return 'gemini-1.5-flash';
    }
};

/**
 * Main Analysis Function
 * @param {string} userText - The clinician's input message
 * @returns {Promise<Object>} - The parsed JSON response from AURA
 */
export const analyzeWellbeing = async (userText) => {
    // Hard Stop: prevent execution if key is missing (Local or Prod)
    if (!API_KEY) {
        console.error("NEXUS FATAL: VITE_GEMINI_API_KEY is missing.");
        throw new Error("Intelligence Engine offline: Security Key Missing.");
    }

    try {
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
                }],
                generationConfig: {
                    responseMimeType: "application/json", // Enforces JSON output from Gemini
                    temperature: 0.7 // Balanced for empathy vs. logic
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "AI Processing Error");
        }

        // 4. Data Parsing & Sanitization
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawText) {
            throw new Error("NEXUS: Received empty response from intelligence engine.");
        }

        // Clean up markdown formatting if present
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(rawText);

    } catch (error) {
        console.error("NEXUS INTELLIGENCE FAILURE:", error);
        
        // Fallback object to keep the app from crashing UI
        return {
            reply: "I'm having trouble connecting to the Nexus server right now. Please take a deep breath and try again in a moment.",
            phase: "REACTING",
            energy: 50,
            action: "Pause and retry connection."
        };
    }
};
