// Optimal pricing recommendations for sub tiers per MAU band.
// We accept a *floor* monthly revenue per user (the price they pay) and find
// the tier that maximises profit margin for a given MAU.
//
// Models:
//   - Free tier:   0     | breaks at 500MB DB, 5GB egress, 500 realtime, 50k MAU
//   - Pro tier:    $25/mo + ~$10 micro compute + overages (metered as per cost-model)
//   - Team tier:   $599/mo (org plan: SOC2 etc.) + overages (same rates as Pro)
//   - Enterprise:  custom + committed volume discount
//
// Assumed overage rates per MAU are derived from the cost-model output.

const bands = [50, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000];

const MAU_RATE_OVER = 0.00325;
const MICRO = 10;
const PRO_BASE = 25;
const EGRESS_PER_MAU = 0.000026;        // $/MAU uncached egress (model avg)
const DISK_PER_MAU  = 0.000014;         // $/MAU DB disk
const RT_PER_MAU    = 0.0026;           // realtime
const AUTH_FULL_PER_MAU_MAU_RATIO = 1;  // MAU == MAU
const EB_PER_MAU    = 0.0013;           // edge function invocations pro-rated
const R2_PER_MAU    = 0.0011;           // R2 per MAU

function costAtMau(mau){
  return {
    auth:  Math.max(0, mau - 100_000) * MAU_RATE_OVER,
    egress: mau * EGRESS_PER_MAU,
    disk:   mau * DISK_PER_MAU,
    realtime: mau * RT_PER_MAU,
    edgefn:  mau * EB_PER_MAU,
    r2:      mau * R2_PER_MAU,
  };
}

// Compute total monthly cost under Pro + Micro for a given MAU.
function costAtMauPro(mau){
  const c = costAtMau(mau);
  const sum = c.auth + c.egress + c.disk + c.realtime + c.edgefn + c.r2;
  return { compute: MICRO, base: PRO_BASE, usage: sum, total: PRO_BASE + MICRO + sum, breakdown: c };
}

// Team plan tier: $599/mo base.
function costAtMauTeam(mau){
  const c = costAtMau(mau);
  const sum = c.auth + c.egress + c.disk + c.realtime + c.edgefn + c.r2;
  return { compute: MICRO, base: 599, usage: sum, total: 599 + MICRO + sum, breakdown: c };
}

// Enterprise: custom negotiated. Assume volume discount of 35% on usage when MAU >= 1M, 15% >= 100k.
function costAtMauEnterprise(mau){
  const c = costAtMau(mau);
  let discount = 0;
  if (mau >= 1_000_000) discount = 0.35;
  else if (mau >= 100_000) discount = 0.15;
  const usage = (c.auth + c.egress + c.disk + c.realtime + c.edgefn + c.r2) * (1 - discount);

  // Minimum Enterprise commit: estimated $2,000/mo baseline that includes larger compute.
  const minCommit = Math.max(2000, mau * 0.002); // never cheaper than 0.2¢/MAU commit
  const computeSuggested = mau >= 1_000_000 ? 1870 : (mau >= 100_000 ? 410 : (mau >= 10_000 ? 60 : 15));
  return { compute: computeSuggested, base: minCommit, usage, total: minCommit + computeSuggested + usage, breakdown: c, discount };
}

function fmt(n){
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1000) return '$' + (n/1000).toFixed(2) + 'k';
  return '$' + n.toFixed(2);
}

// Recommend the subscription tiers per MAU band.
// Goal: maximise profit margin at *zero* markup (a friendly price).
function recommend(mau){
  // Free is acceptable ONLY when the app can comfortably run within Free limits.
  // Heuristics: Free holds up to ~12k MAU before the 50k MAU cap, but DB/egress walls first.
  const freeSafeMax = Math.min(5_000, mau); // be conservative against the egress + DB walls

  const pro  = costAtMauPro(mau).total;
  const team = costAtMauTeam(mau).total;
  const ent  = costAtMauEnterprise(mau).total;

  // "Cheapest viable paid" = Pro until it exceeds the Team base advantage point.
  // Team becomes cheaper than Pro when team base ($599) saves more than it adds.
  // With identical usage rates, Pro is *always cheaper than Team* until MAU is huge —
  // at huge MAU, Enterprise out-cuts both via volume discount and larger compute.
  //
  // Switching to Team only pays off when you need SOC2/ISO/HIPAA features, not price.
  let tier;
  if (mau <= freeSafeMax) tier = 'Free';
  else if (mau <= 100)   tier = 'Pro (no compute change)';
  else                    tier = 'Pro';

  return { tier, freeSafeMax, pro, team, ent };
}

// Build a pricing strategy: pick a per-MAU price (cents) that covers costs plus margin,
// and a recommended plan per band.
console.log('# Optimal subscription recommendation');
console.log('MAU\\tband-label\\trecommended_plan\\tmin_price\\tsuggested_price\\tcost_pro\\tcost_team\\tcost_ent\\tpro_margin\\tteam_margin\\tent_margin');

for (const mau of bands){
  const r = recommend(mau);
  // Suggested retail price ($/MAU/month): baseline 1.5× cost on Pro + a $0.95 floor.
  // Slight volume discount kicks in for >100k MAU.
  const pro = costAtMauPro(mau);
  const team = costAtMauTeam(mau);
  const ent  = costAtMauEnterprise(mau);

  const marginFloor = 1.0;
  let perUser;
  if (mau <= 10_000)       perUser = Math.max(1.0, pro.total / mau * 2.0);   // 100%+ markup on small plans
  else if (mau <= 100_000) perUser = Math.max(0.50, pro.total / mau * 1.5);
  else if (mau <= 1e6)     perUser = Math.max(0.20, pro.total / mau * 1.25);
  else                     perUser = Math.max(0.08, pro.total / mau * 1.10);

  const monthlyRevenue = perUser * mau;
  const profitPro = monthlyRevenue - pro.total;
  const profitTeam = monthlyRevenue - team.total;
  const profitEnt = monthlyRevenue - ent.total;

  const bandLabel =
    mau >= 1_000 ? (mau/1_000).toFixed(0) + 'k' : mau.toString();

  console.log([
    mau, bandLabel,
    r.tier,
    '$' + (pro.total / mau).toFixed(4),
    '$' + perUser.toFixed(4),
    pro.total.toFixed(0),
    team.total.toFixed(0),
    ent.total.toFixed(0),
    profitPro.toFixed(0),
    profitTeam.toFixed(0),
    profitEnt.toFixed(0),
  ].join('\t'));
}

// pgfplots coordinates: x=MAU, y=$ per MAU
console.log('\n#PGFPOINTS_PERUSER_COST');
for (const mau of bands) console.log(`(${mau}, ${(costAtMauPro(mau).total / mau).toFixed(6)})`);

// Recommended prices per band
console.log('#PGFPOINTS_PERUSER_PRICE');
const pricePoints = [];
for (const mau of bands){
  let p;
  if (mau <= 10_000)       p = Math.max(1.0, costAtMauPro(mau).total / mau * 2.0);
  else if (mau <= 100_000) p = Math.max(0.50, costAtMauPro(mau).total / mau * 1.5);
  else if (mau <= 1e6)     p = Math.max(0.20, costAtMauPro(mau).total / mau * 1.25);
  else                     p = Math.max(0.08, costAtMauPro(mau).total / mau * 1.10);
  pricePoints.push([mau, p.toFixed(6)]);
  console.log(`(${mau}, ${p.toFixed(6)})`);
}

console.log('#PRICE_BREAKPOINTS');
pricePoints.forEach(([mau, p]) => console.log(`MAU ${mau} (${mau>=1000?(mau/1000)+'k':mau}): $${parseFloat(p).toFixed(4)}/MAU/month`));
