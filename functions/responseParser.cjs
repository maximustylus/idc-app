'use strict';

/**
 * One parser for every Gemini JSON response (`AU18`).
 *
 * This file deliberately has no Firebase, browser or model dependency. Cloud Functions
 * require it directly, while Vite bundles the same CommonJS export for AuraPulseBot.
 * Callers translate `ResponseParseError` into the message appropriate to their surface.
 */

class ResponseParseError extends Error {
    constructor(code, details = {}) {
        super(code);
        this.name = 'ResponseParseError';
        this.code = code;
        this.missing = details.missing || [];
    }
}

/**
 * Extract and parse the first-to-last JSON object in a model response, preserving the
 * wire text alongside the parsed object for callers that return or archive it.
 */
const parseJsonResponse = (rawText, requiredFields = []) => {
    const stripped = String(rawText ?? '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
    const jsonStart = stripped.indexOf('{');
    const jsonEnd = stripped.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
        throw new ResponseParseError('non-json');
    }

    const jsonStr = stripped.substring(jsonStart, jsonEnd);
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (_error) {
        throw new ResponseParseError('malformed-json');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new ResponseParseError('malformed-json');
    }

    const missing = requiredFields.filter((field) => !(field in parsed));
    if (missing.length > 0) {
        throw new ResponseParseError('missing-fields', { missing });
    }

    return { text: jsonStr, parsed };
};

module.exports = { parseJsonResponse, ResponseParseError };
