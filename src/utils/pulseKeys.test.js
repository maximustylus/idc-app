/** `AU12` — the reader's fallback set and the writer's delete set are one set. */
import { describe, it, expect } from 'vitest';
import {
    legacyPulseKeys, resolvePulseEntry,
    localDateKey, pulseTimestamp, isCheckedInToday, pulseStats, pulseZone,
} from './pulseKeys.js';

/**
 * "11 of 6 checked in" — the count walked the DOCUMENT's keys, not the team.
 * The fixture below is the shape of a real daily pulse document after a month:
 * six members (two still under legacy name keys), four anonymous phantoms, one
 * colleague who left. The old numerator counted eleven.
 */
describe('pulseStats — counts the team, for today, never the document', () => {
    const TODAY = '2026-09-06';
    const YESTERDAY = '2026-09-05';
    const on = (date, energy = 80) => ({ energy, focus: 7, lastUpdate: '09:41 AM', updatedOn: date });

    const tiles = [
        { uid: 'u1', name: 'Ann Lee' },
        { uid: 'u2', name: 'Ben Ong' },
        { uid: 'u3', name: 'Cara Lim' },
        { uid: 'u4', name: 'Dev Raj' },
        { uid: 'u5', name: 'Ewa Tan' },
        { uid: 'u6', name: 'Farid Nor' },
    ];

    const document = {
        u1: on(TODAY, 90),
        u2: on(TODAY, 70),
        u3: on(YESTERDAY, 20),            // checked in yesterday — not today
        'cara lim': on(TODAY, 60),        // a case-variant legacy key for u3; the uid entry wins
        'Dev Raj': on(TODAY, 50),         // u4 has never saved since the uid conversion
        u5: { energy: 65, focus: 5, lastUpdate: '08:00 AM' }, // pre-dates updatedOn
        Anon_4021: on(TODAY, 30),         // anonymous AURA logs — AU13 phantoms
        Anon_17: on(TODAY, 10),
        Anon_9999: on(YESTERDAY, 10),
        Anon_3: on(TODAY, 100),
        'uid-of-someone-who-left': on(TODAY, 40),
    };

    it('never exceeds the team size, and ignores every key that is nobody on the board', () => {
        const { active } = pulseStats(document, tiles, TODAY);
        expect(active).toBe(3);                       // u1, u2, and u4 via the legacy name key
        expect(active).toBeLessThanOrEqual(tiles.length);
        // The old numerator, for the record: every key with a lastUpdate.
        expect(Object.values(document).filter((e) => e.energy > 0 || e.lastUpdate).length).toBe(11);
    });

    it('resolves a legacy name entry through the same lookup the tiles use', () => {
        expect(pulseStats({ 'Dev Raj': on(TODAY, 50) }, tiles, TODAY).active).toBe(1);
    });

    it('prefers the uid entry over a stale legacy one for the same person', () => {
        // u3 saved yesterday under uid; a stale name key claims today. The uid
        // entry is the person's record, so they are NOT counted today.
        expect(pulseStats({ u3: on(YESTERDAY), 'cara lim': on(TODAY) }, tiles, TODAY).active).toBe(0);
    });

    it('does not count yesterday, and does not count an entry with no date', () => {
        expect(pulseStats({ u1: on(YESTERDAY) }, tiles, TODAY).active).toBe(0);
        expect(pulseStats({ u1: { energy: 80, lastUpdate: '09:00 AM' } }, tiles, TODAY).active).toBe(0);
    });

    it('averages only the people it counted', () => {
        const { avg, zone } = pulseStats(document, tiles, TODAY);
        expect(avg).toBe(Math.round((90 + 70 + 50) / 3));  // 70 — not dragged down by Anon_17 at 10
        expect(zone).toBe('REACTING');
    });

    it('is zero-and-healthy on an empty board, an empty team, or no document', () => {
        expect(pulseStats({}, tiles, TODAY)).toEqual({ avg: 0, active: 0, zone: 'HEALTHY' });
        expect(pulseStats(document, [], TODAY)).toEqual({ avg: 0, active: 0, zone: 'HEALTHY' });
        expect(pulseStats(undefined, tiles, TODAY)).toEqual({ avg: 0, active: 0, zone: 'HEALTHY' });
    });

    it('defaults `today` to the local calendar date', () => {
        const today = localDateKey();
        expect(pulseStats({ u1: on(today) }, tiles).active).toBe(1);
    });
});

describe('isCheckedInToday / localDateKey / pulseTimestamp', () => {
    it('formats the LOCAL date with zero padding', () => {
        expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
        expect(localDateKey(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
    });

    it('stamps both a calendar date and an instant', () => {
        const d = new Date(2026, 8, 6, 9, 41);
        expect(pulseTimestamp(d)).toEqual({ updatedOn: '2026-09-06', updatedAt: d.toISOString() });
    });

    it.each([
        [undefined, false],
        [null, false],
        [{ energy: 80, lastUpdate: 'x' }, false],                        // no date
        [{ energy: 80, lastUpdate: 'x', updatedOn: '2026-09-05' }, false], // yesterday
        [{ energy: 80, lastUpdate: 'x', updatedOn: '2026-09-06' }, true],
        [{ energy: 0, lastUpdate: '', updatedOn: '2026-09-06' }, false],   // dated but empty
        [{ energy: 0, lastUpdate: '09:00', updatedOn: '2026-09-06' }, true],
    ])('%j → %s', (entry, expected) => {
        expect(isCheckedInToday(entry, '2026-09-06')).toBe(expected);
    });

    it('pulseZone: no check-ins is not INJURED', () => {
        expect(pulseZone(0, 0)).toBe('HEALTHY');
        expect(pulseZone(0, 1)).toBe('INJURED');
        expect(pulseZone(50, 1)).toBe('REACTING');
        expect(pulseZone(80, 1)).toBe('HEALTHY');
    });
});

describe('legacyPulseKeys', () => {
    it('finds the exact-case legacy key', () => {
        expect(legacyPulseKeys({ 'Sarah Tan': {} }, 'Sarah Tan', 'uid-1')).toEqual(['Sarah Tan']);
    });

    it('finds a case-variant legacy key — the scenario the first cut missed', () => {
        // Written as "sarah tan" before a rename to "Sarah Tan": the reader
        // displayed it, the writer deleted nothing, and the person was counted
        // twice after their first save.
        expect(legacyPulseKeys({ 'sarah tan': {} }, 'Sarah Tan', 'uid-1')).toEqual(['sarah tan']);
    });

    it('finds EVERY case variant, because the writer deletes them all', () => {
        const data = { 'sarah tan': {}, 'SARAH TAN': {}, 'Sarah Tan': {}, 'uid-1': {} };
        expect(legacyPulseKeys(data, 'Sarah Tan', 'uid-1').sort())
            .toEqual(['SARAH TAN', 'Sarah Tan', 'sarah tan']);
    });

    it('never includes the uid key, even when the name IS the uid (demo mode)', () => {
        expect(legacyPulseKeys({ Steve: {} }, 'Steve', 'Steve')).toEqual([]);
    });

    it('does not match a different name — exact, not substring', () => {
        // The pre-AU12 reader used `.includes`, so 'Ann' matched 'Joanne'.
        expect(legacyPulseKeys({ Joanne: {} }, 'Ann', 'uid-1')).toEqual([]);
        expect(legacyPulseKeys({ 'Anne-Marie': {} }, 'Anne', 'uid-1')).toEqual([]);
    });

    it.each([[null], [undefined], [{}]])('is empty on %s data', (data) => {
        expect(legacyPulseKeys(data, 'Sarah', 'uid-1')).toEqual([]);
    });

    it.each([[''], [null], [undefined], [42]])('is empty on %j as a name', (name) => {
        expect(legacyPulseKeys({ a: {} }, name, 'uid-1')).toEqual([]);
    });
});

describe('resolvePulseEntry', () => {
    const entry = { energy: 70, focus: 6 };

    it('prefers the uid key over any legacy key', () => {
        expect(resolvePulseEntry({ 'uid-1': entry, 'Sarah Tan': { energy: 1 } },
            { uid: 'uid-1', name: 'Sarah Tan' })).toBe(entry);
    });

    it('falls back to a case-variant legacy entry', () => {
        expect(resolvePulseEntry({ 'sarah tan': entry }, { uid: 'uid-1', name: 'Sarah Tan' })).toBe(entry);
    });

    it('is undefined when the person has never checked in', () => {
        expect(resolvePulseEntry({ other: entry }, { uid: 'uid-1', name: 'Sarah Tan' })).toBeUndefined();
    });
});
