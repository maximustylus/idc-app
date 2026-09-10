/**
 * Select the public screening route and the ResultPage tier it renders.
 *
 * Both the conversational and conventional pathways call this function. The
 * route identifies the pathway-specific copy shown in chat; the tier identifies
 * the shared banner and resource plan shown on ResultPage.
 */
export const CTA_TIER_BY_ROUTE = Object.freeze({
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

const selection = (route) => ({ route, tier: CTA_TIER_BY_ROUTE[route] });

export const selectCTA = (data = {}) => {
  const {
    pavsScore,
    symptomFlag,
    medFlag,
    age,
    sdohPsychological,
    sdohFinancial,
    sdohSocial,
  } = data;

  if (symptomFlag) return selection('symptoms_present');
  if (age === '60+' && sdohSocial) return selection('senior_isolated');
  if (medFlag) return selection('chronic_metabolic');
  if (age === '60+' && pavsScore < 150) return selection('senior_low_activity');
  if (sdohPsychological) return selection('mental_health_first');
  if (sdohFinancial && pavsScore < 150) return selection('financial_low_activity');
  if (sdohSocial && pavsScore < 150) return selection('social_low_activity');
  if (pavsScore < 150) return selection('start2move');
  if (pavsScore <= 300) return selection('active_health_lab');
  return selection('perform');
};
