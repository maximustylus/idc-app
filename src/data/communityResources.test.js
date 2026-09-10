import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMUNITY_RESOURCES, COMMUNITY_RESOURCE_IDS } from './communityResources';

const EXPECTED_IDS = [
  'ssmc_kkh', 'spag', 'healthier_sg', 'start2move', 'active_health',
  'activesg_gym', 'pa_courses', 'singhealth_healthup', 'nuhs_chp',
  'nhg_coaches', 'aic_aac', 'touch_community', 'society_wings',
  'singhealth_careline', 'financial_chas', 'mental_wellness',
];

describe('community resource registry', () => {
  it('preserves the 16 telemetry-stable resource ids', () => {
    expect(COMMUNITY_RESOURCE_IDS).toEqual(EXPECTED_IDS);
  });

  it('provides an HTTPS destination, shipped logo, and four complete languages', () => {
    Object.entries(COMMUNITY_RESOURCES).forEach(([key, resource]) => {
      expect(resource.id, key).toBe(key);
      expect(resource.url, key).toMatch(/^https:\/\//);
      expect(resource.logo, key).toMatch(/^\/logos\/.+\.png$/);
      expect(existsSync(resolve('public', resource.logo.slice(1))), resource.logo).toBe(true);

      ['en', 'ms', 'zh', 'ta'].forEach((language) => {
        expect(resource[language]?.title, `${key}.${language}.title`).toBeTruthy();
        expect(resource[language]?.desc, `${key}.${language}.desc`).toBeTruthy();
      });
    });
  });
});
