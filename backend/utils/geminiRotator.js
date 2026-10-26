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
 * 🖼️ Multimodal Vision Helper: Fetches an image from a URL,
 * optimizes Cloudinary URLs for fast transmission, and encodes it into Gemini's inlineData format.
 * 
 * @param {string} imageUrl - HTTPS URL of the image
 * @param {number} timeoutMs - Timeout in milliseconds (default 5000)
 * @returns {Promise<{ inlineData: { mimeType: string, data: string } } | null>}
 */
export const fetchImageAsBase64 = async (imageUrl, timeoutMs = 5000) => {
    try {
        if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
            return null;
        }

        // Optimize Cloudinary URLs for fast multimodal processing (width 800, quality auto, jpeg)
        let fetchUrl = imageUrl;
        if (fetchUrl.includes("/upload/") && !fetchUrl.includes("/upload/w_")) {
            fetchUrl = fetchUrl.replace("/upload/", "/upload/w_800,c_limit,q_auto,f_jpg/");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        try {
            response = await fetch(fetchUrl, { signal: controller.signal });
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            // Fallback to original URL if transformed URL failed
            if (fetchUrl !== imageUrl) {
                const fallbackController = new AbortController();
                const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeoutMs);
                try {
                    response = await fetch(imageUrl, { signal: fallbackController.signal });
                } catch {
                    return null;
                } finally {
                    clearTimeout(fallbackTimeout);
                }
            } else {
                return null;
            }
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response || !response.ok) {
            // If transformation returned 4xx, try raw URL
            if (fetchUrl !== imageUrl) {
                const fallbackRes = await fetch(imageUrl).catch(() => null);
                if (fallbackRes && fallbackRes.ok) {
                    response = fallbackRes;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        
        let mimeType = "image/jpeg";
        const contentType = response.headers.get("content-type");
        if (contentType) {
            if (contentType.includes("png")) mimeType = "image/png";
            else if (contentType.includes("webp")) mimeType = "image/webp";
            else if (contentType.includes("gif")) mimeType = "image/gif";
        }

        return {
            inlineData: {
                mimeType,
                data: base64Data
            }
        };
    } catch (err) {
        console.warn(`[Gemini Multimodal] Failed to prepare image from ${imageUrl}:`, err.message);
        return null;
    }
};

/**
 * Executes content generation using Gemini REST API with automated key rotation and model fallback.
 * Supports both text-only prompts and multimodal input (text + images).
 * 
 * @param {string} prompt - Prompt text to send
 * @param {object} options - Generation options (systemInstruction, temperature, timeoutMs, parts)
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
                
                // Construct parts payload supporting multimodal images
                const partsPayload = (options.parts && Array.isArray(options.parts) && options.parts.length > 0)
                    ? options.parts
                    : [{ text: prompt }];

                const bodyPayload = {
                    contents: [
                        {
                            parts: partsPayload
                        }
                    ],
                    generationConfig: {
                        temperature: options.temperature !== undefined ? options.temperature : 0.2,
                        maxOutputTokens: options.maxOutputTokens || 8192,
                    }
                };

                if (options.responseMimeType) {
                    bodyPayload.generationConfig.responseMimeType = options.responseMimeType;
                }

                if (model.includes("2.5") && (options.thinkingBudget !== undefined || options.responseMimeType === "application/json")) {
                    bodyPayload.generationConfig.thinkingConfig = {
                        thinkingBudget: options.thinkingBudget !== undefined ? options.thinkingBudget : 0
                    };
                }

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
 * Supports both text prompts and multimodal parts (text + images)
 * 
 * @param {string} prompt - Primary prompt or JSON instruction
 * @param {string} systemInstruction - Optional system persona instruction
 * @param {object} options - Options including parts, temperature, timeoutMs
 */
export const generateJsonWithGemini = async (prompt, systemInstruction = "", options = {}) => {
    const fullPrompt = `${prompt}\n\nIMPORTANT: Output strictly valid JSON conforming to RFC 8259. Do NOT wrap in markdown code fences or backticks.`;
    
    let parts = options.parts ? [...options.parts] : null;
    if (parts && Array.isArray(parts) && parts.length > 0) {
        // Append prompt and JSON instruction as the final text part for the multimodal input
        parts.push({ text: fullPrompt });
    }

    const result = await generateWithGemini(fullPrompt, {
        systemInstruction: systemInstruction || "You are an ATS-compliant JSON generator. Always return strict, valid raw JSON.",
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingBudget: 0,
        ...options,
        parts: parts || null
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
                // Heuristic repair: fix unclosed quotes or missing closing braces
                try {
                    let repaired = jsonMatch[0];
                    const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
                    if (quotes % 2 !== 0) repaired += '"';
                    const openB = (repaired.match(/\{/g) || []).length;
                    const closeB = (repaired.match(/\}/g) || []).length;
                    for (let i = 0; i < (openB - closeB); i++) repaired += "}";
                    const parsed = JSON.parse(repaired);
                    return {
                        data: parsed,
                        model: result.model,
                        keyIndex: result.keyIndex
                    };
                } catch (repairErr) {
                    console.error("[Gemini Engine] JSON heuristic repair failed:", repairErr);
                }
            }
        }
        throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}\nRaw: ${rawText.substring(0, 300)}`);
    }
};

export default {
    getGeminiApiKeys,
    generateWithGemini,
    generateJsonWithGemini,
    fetchImageAsBase64,
    MODEL_FALLBACK_CHAIN
};
