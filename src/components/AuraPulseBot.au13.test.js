/**
 * `AU13` — "11 of 6 checked in".
 *
 * The daily pulse document is a per-person map, and two things made the
 * board's header count things that were not people on this team: the
 * anonymous AURA log minted a random `Anon_NNNN` key into that map on every
 * confirmation, and the header counted the document's keys rather than the
 * team's tiles. `pulseKeys.test.js` proves the new arithmetic; this file pins
 * the two source facts it depends on, read from the source the way
 * `an14.bundle.test.js` reads the bundle — because a green arithmetic test
 * proves nothing if a writer can still put phantoms in the map.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = (rel) => readFileSync(resolve(here, rel), 'utf8');

describe('AU13 — nothing anonymous is written into the per-person pulse map', () => {
    const bot = src('./AuraPulseBot.jsx');

    it('no writer mints an Anon_ key any more', () => {
        // The exact expression the ledger's own evidence string was about.
        expect(bot).not.toMatch(/Anon_\$\{/);
        expect(bot).not.toMatch(/heatKey/);
    });

    it('the anonymous branch still records the log itself', () => {
        // Anchor on the branch's own comment: the persona check appears three
        // times in the file, and the first is a flag assignment, not the write.
        const start = bot.indexOf('An anonymous log goes to the anonymous log ONLY');
        expect(start).toBeGreaterThan(-1);
        const anonBranch = bot.slice(start);
        const branch = anonBranch.slice(0, anonBranch.indexOf('} else if'));
        expect(branch).toMatch(/anonymousWellbeingPath\(teamId\)/);
        expect(branch).toMatch(/arrayUnion\(logData\)/);
        expect(branch).not.toMatch(/pulsePath\(/);
    });

    it('every pulse entry the bot writes carries the calendar date the reader needs', () => {
        expect(bot).toMatch(/const heatmapPayload = \{[\s\S]*?\.\.\.pulseTimestamp\(\)[\s\S]*?\};/);
    });
});

describe('AU13 — the board counts its tiles, not the document', () => {
    const view = src('./WellbeingView.jsx');

    it('derives the header from pulseStats over the tiles', () => {
        expect(view).toMatch(/const stats = pulseStats\(pulseData, pulseTiles\)/);
    });

    it('no longer counts Object.values of the document', () => {
        expect(view).not.toMatch(/Object\.values\(data\)/);
        expect(view).not.toMatch(/calculateStats/);
    });

    it('stamps the date on what the board itself writes, in both modes', () => {
        expect(view).toMatch(/const updatePayload = \{[\s\S]*?\.\.\.pulseTimestamp\(\)[\s\S]*?\};/);
        expect(view).toMatch(/lastUpdate: 'Just now',[\s\S]*?\.\.\.pulseTimestamp\(\)/);
    });
});
