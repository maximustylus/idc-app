/**
 * ==============================================================================
 * PULSE-BOARD KEY RESOLUTION — the reader and the writers must agree (`AU12`)
 * ==============================================================================
 *
 * The daily pulse document is keyed by uid; entries written before 2026-08-24
 * are keyed by display name, and each save migrates its own person. The subtle
 * part is CASE: the first cut let the reader and the writer disagree about it —
 * the reader found a legacy key case-insensitively, the writer deleted only the
 * exact-case key, so the one scenario the tolerant read existed for (a display
 * name whose casing changed since the entry was written) was the one the
 * migration failed to clean up. The person was then counted twice: once under
 * their uid, once under the stale name key `calculateStats` still sees.
 *
 * One module, used by both sides, so the set the reader falls back to IS the
 * set the writer deletes.
 */

/**
 * Every key in the pulse map that is a legacy name entry for this person:
 * case-insensitive match on the display name, excluding the uid key itself.
 * Ordered as Firestore returned them; the READER uses the first, the WRITERS
 * delete them all.
 */
export const legacyPulseKeys = (pulseData, name, uid) => {
    if (!pulseData || typeof name !== 'string' || name === '') return [];
    const wanted = name.toLowerCase();
    return Object.keys(pulseData).filter(
        (k) => k !== uid && k.toLowerCase() === wanted,
    );
};

/** The entry to display: the uid key, else the first legacy name entry. */
export const resolvePulseEntry = (pulseData, person) => {
    if (!pulseData) return undefined;
    if (pulseData[person.uid] !== undefined) return pulseData[person.uid];
    const legacy = legacyPulseKeys(pulseData, person.name, person.uid);
    return legacy.length > 0 ? pulseData[legacy[0]] : undefined;
};

/**
 * ==============================================================================
 * "N of M CHECKED IN" — COUNT THE TEAM, NEVER THE DOCUMENT
 * ==============================================================================
 *
 * The board read "11 of 6 checked in" for a six-person team. The denominator
 * was the member list; the numerator was `Object.values(pulseDoc)` — every key
 * the daily pulse document had ever accumulated: random `Anon_NNNN` keys minted
 * by each anonymous AURA wellbeing log and never removed (`AU13`), legacy
 * name-keyed entries for people who had not saved since the uid conversion,
 * entries for colleagues since removed from the team, and — because "daily" was
 * only the document's NAME — every check-in ever made, since nothing expired.
 * The team energy average and the zone badge were computed over the same set.
 *
 * Two rules fix it structurally rather than by cleaning the document:
 *
 *   1. The statistics walk the team's TILES and resolve each person's entry.
 *      A key that belongs to nobody on the board cannot be counted.
 *   2. An entry counts as checked in only if it was written TODAY. `lastUpdate`
 *      is a clock time with no date, so the writers now stamp `updatedOn`
 *      (local calendar date) beside it; an entry without one predates this and
 *      is treated as not today's — the tile still shows its last known energy.
 */

const pad2 = (n) => String(n).padStart(2, '0');

/** Local calendar date as `YYYY-MM-DD` — the day a check-in belongs to. */
export const localDateKey = (d = new Date()) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** The two fields every pulse writer stamps, so the reader can tell the day. */
export const pulseTimestamp = (d = new Date()) => ({
    updatedOn: localDateKey(d),
    updatedAt: d.toISOString(),
});

/** A check-in made today. No `updatedOn` means pre-dating this rule: not today's. */
export const isCheckedInToday = (entry, today = localDateKey()) =>
    !!entry
    && typeof entry.updatedOn === 'string'
    && entry.updatedOn === today
    && (Number(entry.energy) > 0 || !!entry.lastUpdate);

export const pulseZone = (avg, active) => {
    if (active === 0) return 'HEALTHY';
    if (avg > 79) return 'HEALTHY';
    if (avg > 49) return 'REACTING';
    return 'INJURED';
};

/**
 * `{ avg, active, zone }` for the board's header — over the team's tiles, for
 * today. `active` can never exceed `tiles.length` by construction.
 */
export const pulseStats = (pulseData, tiles, today = localDateKey()) => {
    const checkedIn = (tiles || [])
        .map((person) => resolvePulseEntry(pulseData, person))
        .filter((entry) => isCheckedInToday(entry, today));
    const active = checkedIn.length;
    const total = checkedIn.reduce((acc, entry) => acc + (Number(entry.energy) || 0), 0);
    const avg = active > 0 ? Math.round(total / active) : 0;
    return { avg, active, zone: pulseZone(avg, active) };
};
