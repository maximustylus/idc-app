import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CTA_TIER_BY_ROUTE, selectCTA } from './ctaRouting';

const HERE = dirname(fileURLToPath(import.meta.url));
const resultPage = readFileSync(resolve(HERE, '..', 'components', 'ResultPage.jsx'), 'utf8');

const objectKeys = (source, name) => {
  const marker = `const ${name} = {`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find ${marker}`);

  let depth = 0;
  let end = -1;
  for (let index = start + marker.length - 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`Unbalanced ${name} object`);

  const keys = [];
  let nesting = 0;
  source.slice(start + marker.length, end).split('\n').forEach((line) => {
    if (nesting === 0) {
      const match = line.match(/^\s*([A-Z_]+):/);
      if (match) keys.push(match[1]);
    }
    nesting += (line.match(/[{[]/g) || []).length;
    nesting -= (line.match(/[}\]]/g) || []).length;
  });
  if (keys.length === 0) throw new Error(`Parsed no keys from ${name}`);
  return keys;
};

const baseline = (overrides = {}) => ({
  pavsScore: 301,
  symptomFlag: false,
  medFlag: false,
  age: '41-60',
  sdohPsychological: false,
  sdohFinancial: false,
  sdohSocial: false,
  ...overrides,
});

describe('CTA route and tier contract', () => {
  it('publishes the complete route-to-tier table', () => {
    expect(CTA_TIER_BY_ROUTE).toEqual({
      symptoms_present: 'URGENT',
      senior_isolated: 'SOCIAL_CARE',
      chronic_metabolic: 'CLINICAL',
      senior_low_activity: 'COMMUNITY',
      mental_health_first: 'WELLBEING',
      financial_low_activity: 'FREE_FIRST',
      social_low_activity: 'COMMUNITY',
      start2move: 'START',
      active_health_lab: 'LEVEL_UP',
      perform: 'ADVANCED',
    });
  });

  it.each([
    ['symptoms_present', 'URGENT', { symptomFlag: true }],
    ['senior_isolated', 'SOCIAL_CARE', { age: '60+', sdohSocial: true }],
    ['chronic_metabolic', 'CLINICAL', { medFlag: true }],
    ['senior_low_activity', 'COMMUNITY', { age: '60+', pavsScore: 149 }],
    ['mental_health_first', 'WELLBEING', { sdohPsychological: true }],
    ['financial_low_activity', 'FREE_FIRST', { pavsScore: 149, sdohFinancial: true }],
    ['social_low_activity', 'COMMUNITY', { pavsScore: 149, sdohSocial: true }],
    ['start2move', 'START', { pavsScore: 149 }],
    ['active_health_lab', 'LEVEL_UP', { pavsScore: 150 }],
    ['perform', 'ADVANCED', { pavsScore: 301 }],
  ])('selects %s as %s', (route, tier, overrides) => {
    expect(selectCTA(baseline(overrides))).toEqual({ route, tier });
  });

  it('keeps the upper activity boundary in LEVEL_UP', () => {
    expect(selectCTA(baseline({ pavsScore: 300 }))).toEqual({
      route: 'active_health_lab',
      tier: 'LEVEL_UP',
    });
  });

  it('keeps symptoms ahead of every other route', () => {
    expect(selectCTA(baseline({
      pavsScore: 0,
      symptomFlag: true,
      medFlag: true,
      age: '60+',
      sdohPsychological: true,
      sdohFinancial: true,
      sdohSocial: true,
    }))).toEqual({ route: 'symptoms_present', tier: 'URGENT' });
  });

  it('keeps senior isolation ahead of chronic-condition and activity routes', () => {
    expect(selectCTA(baseline({
      pavsScore: 0,
      medFlag: true,
      age: '60+',
      sdohSocial: true,
    }))).toEqual({ route: 'senior_isolated', tier: 'SOCIAL_CARE' });
  });

  it('keeps chronic conditions ahead of low activity and social-needs routes', () => {
    expect(selectCTA(baseline({
      pavsScore: 0,
      medFlag: true,
      sdohPsychological: true,
      sdohFinancial: true,
      sdohSocial: true,
    }))).toEqual({ route: 'chronic_metabolic', tier: 'CLINICAL' });
  });
});

describe('every shared tier is rendered by ResultPage', () => {
  const sharedTiers = [...new Set(Object.values(CTA_TIER_BY_ROUTE))];
  const bannerTiers = objectKeys(resultPage, 'CTA_BANNER');
  const actionPlanTiers = objectKeys(resultPage, 'tierPrimaries');

  it('has a visible banner', () => {
    expect(sharedTiers.filter((tier) => !bannerTiers.includes(tier))).toEqual([]);
  });

  it('has a primary resource plan', () => {
    expect(sharedTiers.filter((tier) => !actionPlanTiers.includes(tier))).toEqual([]);
  });

  it('has no unreachable banner', () => {
    expect(bannerTiers.filter((tier) => !sharedTiers.includes(tier))).toEqual([]);
  });
});
