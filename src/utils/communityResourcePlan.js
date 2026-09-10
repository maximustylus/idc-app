import { COMMUNITY_RESOURCES } from '../data/communityResources';
import { clusterForSector } from './singapore/communityServices';

export const RESOURCE_IDS_BY_CTA_TIER = Object.freeze({
  URGENT: ['healthier_sg', 'active_health'],
  CLINICAL: ['active_health', 'healthier_sg'],
  COMMUNITY: ['aic_aac', 'pa_courses'],
  SOCIAL_CARE: ['singhealth_careline', 'aic_aac', 'touch_community'],
  WELLBEING: ['mental_wellness', 'touch_community'],
  FREE_FIRST: ['start2move', 'financial_chas', 'pa_courses'],
  START: ['start2move', 'pa_courses'],
  LEVEL_UP: ['active_health', 'activesg_gym'],
  ADVANCED: ['activesg_gym', 'active_health'],
});

export const REGIONAL_RESOURCE_ID_BY_CLUSTER = Object.freeze({
  SingHealth: 'singhealth_healthup',
  NUHS: 'nuhs_chp',
  NHG: 'nhg_coaches',
});

const resourcesForIds = (ids) => ids.map((id) => COMMUNITY_RESOURCES[id]);

/**
 * Deterministic public resource selection. Ordering is user-visible because the
 * result is capped at six cards, so preserve it when maintaining this function.
 */
export const generateCommunityResourcePlan = (riskTier, ctaTier, data = {}, postalSector) => {
  const cluster = clusterForSector(postalSector);
  const plan = resourcesForIds(['ssmc_kkh', 'spag']);
  const tierIds = ctaTier ? RESOURCE_IDS_BY_CTA_TIER[ctaTier] : null;

  if (tierIds) plan.push(...resourcesForIds(tierIds));
  else if (riskTier === 'Red') plan.push(...resourcesForIds(['healthier_sg', 'active_health']));
  else if (riskTier === 'Amber') plan.push(...resourcesForIds(['start2move', 'pa_courses']));
  else plan.push(...resourcesForIds(['activesg_gym', 'pa_courses']));

  const regionalId = REGIONAL_RESOURCE_ID_BY_CLUSTER[cluster];
  if (regionalId) plan.push(COMMUNITY_RESOURCES[regionalId]);

  if (data.psychoFlag || data.sdohPsychological) plan.push(COMMUNITY_RESOURCES.mental_wellness);
  if (data.sdohFinancial) plan.push(...resourcesForIds(['financial_chas', 'touch_community']));
  if (data.sdohSocial) {
    if (cluster === 'SingHealth') plan.push(COMMUNITY_RESOURCES.singhealth_careline);
    plan.push(...resourcesForIds(['aic_aac', 'touch_community']));
  }
  if (data.gender === 'Female' && (data.age === '41-60' || data.age === '60+')) {
    plan.push(COMMUNITY_RESOURCES.society_wings);
  }

  const seen = new Set();
  return plan
    .filter((resource) => {
      if (seen.has(resource.id)) return false;
      seen.add(resource.id);
      return true;
    })
    .slice(0, 6);
};
