import dotenv from "dotenv";
dotenv.config();

/**
 * 🔄 Gemini Multi-Key Rotator & Multi-Model Fallback Engine
 * Loads up to 10 API keys from environment variables and seamlessly rotates
 * across keys if rate-limited (HTTP 429) or quota is exhausted.
 * Also cascades across models: gemini-2.5-flash -> gemini-3.8-flash -> gemini-3.5-flash -> gemini-3.5-flash-lite -> gemini-3.6-flash -> gemini-3.1-flash-lite.
 */

// Collect and sanitize all API keys from environment
export const getGeminiApiKeys = () => {
    const keys = [];
    
    // Check numbered keys 1 through 10 (with and without underscores)
    for (let i = 1; i <= 10; i++) {
        const candidate = 
            process.env[`GOOGLE_API_KEY${i}`] ||
            process.env[`GOOGLE_API_KEY_${i}`] ||
            process.env[`GEMINI_API_KEY${i}`] ||
            process.env[`GEMINI_API_KEY_${i}`];
            
        if (candidate) {
            const cleaned = candidate.replace(/^["']|["']$/g, "").trim();
            if (cleaned && !keys.includes(cleaned)) {
                keys.push(cleaned);
            }
        }
    }

    // Fallback to single key if numbered keys are absent
    if (keys.length === 0) {
        const singleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (singleKey) {
            keys.push(singleKey.replace(/^["']|["']$/g, "").trim());
        }
    }

    return keys;
};

// Global rotation state pointer
let currentKeyIndex = 0;

// Model fallback cascade list
const MODEL_FALLBACK_CHAIN = [
    "gemini-2.5-flash",      // Primary requested model
    "gemini-3.8-flash",      // Latest Stable Flash
    "gemini-3.5-flash",      // High speed 3.5 Flash
    "gemini-3.5-flash-lite", // Lightweight high-capacity Flash
    "gemini-3.6-flash",      // Stable previous-gen Flash
    "gemini-3.1-flash-lite"  // Reliable Lite fallback
];

/**
 * Executes content generation using Gemini REST API with automated key rotation and model fallback.
 * 
 * @param {string} prompt - Prompt text to send
 * @param {object} options - Generation options (systemInstruction, temperature, timeoutMs)
 * @returns {Promise<{ text: string, model: string, keyIndex: number }>}
 */
export const generateWithGemini = async (prompt, options = {}) => {
    const keys = getGeminiApiKeys();
    
    if (keys.length === 0) {
        throw new Error("No Gemini API keys found. Please set GOOGLE_API_KEY1..10 or GEMINI_API_KEY in .env");
    }

    const timeoutMs = options.timeoutMs || 15000;
    const errorsEncountered = [];

    // Outer loop: Try each model in the fallback chain
    for (const model of MODEL_FALLBACK_CHAIN) {
        console.log(`[Gemini Engine] Attempting generation with model: ${model}`);

        // Inner loop: Try available keys (up to keys.length attempts per model)
        const totalKeys = keys.length;
        let attemptsWithCurrentModel = 0;

        while (attemptsWithCurrentModel < totalKeys) {
            const activeKey = keys[currentKeyIndex];
            const activeKeySlot = currentKeyIndex + 1;
            attemptsWithCurrentModel++;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
                
                const bodyPayload = {
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: options.temperature !== undefined ? options.temperature : 0.4,
                        maxOutputTokens: options.maxOutputTokens || 2048,
                    }
                };

                if (options.systemInstruction) {
                    bodyPayload.systemInstruction = {
                        parts: [{ text: options.systemInstruction }]
                    };
                }

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyPayload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Handle success
                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (text && text.trim().length > 0) {
                        console.log(`[Gemini Engine] ✅ Success using model '${model}' on Key #${activeKeySlot} (Total keys: ${totalKeys})`);
                        return {
                            text: text.trim(),
                            model,
                            keyIndex: activeKeySlot
                        };
                    } else {
                        console.warn(`[Gemini Engine] Empty response body from ${model} on Key #${activeKeySlot}`);
                    }
                }

                // If not OK, inspect status
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;

                console.warn(`[Gemini Engine] Key #${activeKeySlot} failed for model '${model}': ${response.status} - ${errorMessage}`);
                errorsEncountered.push({ model, keySlot: activeKeySlot, status: response.status, message: errorMessage });

                // If Rate Limited (429) or Quota/Auth issue (403), rotate immediately to next key
                if (response.status === 429 || response.status === 403 || response.status === 503) {
                    currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
                    console.log(`[Gemini Rotator] 🔄 Rotated to Key #${currentKeyIndex + 1} due to ${response.status}`);
                    continue; // Try next key on this model
                }

                // If Model not found (404) or Unsupported (400), don't waste other keys on this dead model
                if (response.status === 404 || (response.status === 400 && errorMessage.toLowerCase().includes("not supported"))) {
                    console.warn(`[Gemini Engine] Model '${model}' not supported/available on API. Cascading to next model...`);
                    break; // Break inner loop, move to next model
                }

                // Otherwise rotate key for next attempt
                currentKeyIndex = (currentKeyIndex + 1) % totalKeys;

            } catch (err) {
                const isAbort = err.name === "AbortError";
                const errDesc = isAbort ? `Timed out after ${timeoutMs}ms` : err.message;
                console.warn(`[Gemini Engine] Network error on Key #${activeKeySlot} for '${model}': ${errDesc}`);
                errorsEncountered.push({ model, keySlot: activeKeySlot, error: errDesc });

                // Rotate to next key on network error or timeout
                currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
            }
        }
    }

    throw new Error(`All Gemini models and API keys failed. Last error: ${JSON.stringify(errorsEncountered.slice(-3))}`);
};

/**
 * Generates and parses strict JSON output using Gemini
 */
export const generateJsonWithGemini = async (prompt, systemInstruction = "") => {
    const fullPrompt = `${prompt}\n\nIMPORTANT: Output ONLY pure raw JSON. Do NOT wrap in markdown code fences or backticks like \`\`\`json.`;
    
    const result = await generateWithGemini(fullPrompt, {
        systemInstruction: systemInstruction || "You are a professional JSON generator. You must return strictly valid JSON.",
        temperature: 0.2
    });

    let rawText = result.text.trim();

    // Strip markdown code fences if present
    if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    try {
        const parsed = JSON.parse(rawText);
        return {
            data: parsed,
            model: result.model,
            keyIndex: result.keyIndex
        };
    } catch (parseError) {
        // Fallback: Attempt regex extraction of outermost JSON object/array
        const jsonMatch = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    data: parsed,
                    model: result.model,
                    keyIndex: result.keyIndex
                };
            } catch (innerErr) {
                console.error("[Gemini Engine] Failed to parse extracted JSON substring:", innerErr);
            }
        }
        throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}\nRaw: ${rawText.substring(0, 300)}`);
    }
};

export default {
    getGeminiApiKeys,
    generateWithGemini,
    generateJsonWithGemini,
    MODEL_FALLBACK_CHAIN
};
