import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import parserModule from './responseParser.cjs';

const { parseJsonResponse, ResponseParseError } = parserModule;

const errorFrom = (raw, required) => {
    try {
        parseJsonResponse(raw, required);
        return null;
    } catch (error) {
        return error;
    }
};

describe('AU18 — one response parser', () => {
    it('parses a plain object and preserves the extracted wire text', () => {
        expect(parseJsonResponse('{"reply":"hello"}', ['reply'])).toEqual({
            text: '{"reply":"hello"}',
            parsed: { reply: 'hello' },
        });
    });

    it('accepts a fenced object and ignores surrounding model prose', () => {
        expect(parseJsonResponse('Here it is:\n```JSON\n{"reply":"hello"}\n```\nDone.').parsed)
            .toEqual({ reply: 'hello' });
    });

    it('keeps braces inside JSON strings intact', () => {
        expect(parseJsonResponse('{"reply":"Use {placeholder} here"}').parsed.reply)
            .toBe('Use {placeholder} here');
    });

    it('distinguishes a response with no JSON object', () => {
        const error = errorFrom('hello', ['reply']);
        expect(error).toBeInstanceOf(ResponseParseError);
        expect(error.code).toBe('non-json');
    });

    it('distinguishes malformed JSON', () => {
        expect(errorFrom('{"reply":}', ['reply']).code).toBe('malformed-json');
    });

    it('names every missing required field without treating null as absent', () => {
        const error = errorFrom('{"reply":null}', ['reply', 'mode', 'db_workload']);
        expect(error.code).toBe('missing-fields');
        expect(error.missing).toEqual(['mode', 'db_workload']);
    });

    it('does not mutate the required-field list', () => {
        const required = ['reply'];
        parseJsonResponse('{"reply":"hello"}', required);
        expect(required).toEqual(['reply']);
    });
});

describe('AU18 — both runtimes use that parser', () => {
    const server = readFileSync(resolve(process.cwd(), 'functions/index.js'), 'utf8');
    const client = readFileSync(resolve(process.cwd(), 'src/components/AuraPulseBot.jsx'), 'utf8');

    it('routes the backend through the shared module', () => {
        expect(server).toContain("require('./responseParser.cjs')");
        expect(server).toContain('responseParser.parseJsonResponse(rawText, requiredFields)');
        expect(server).not.toMatch(/rawText\.replace\(\/```json/);
    });

    it('routes AuraPulseBot through the same module and removes its parser copy', () => {
        expect(client).toContain("import responseParser from '../../functions/responseParser.cjs'");
        expect(client).toContain("responseParser.parseJsonResponse(result.data?.text ?? '').parsed");
        expect(client).not.toMatch(/JSON\.parse\(stripped\.substring/);
    });
});
