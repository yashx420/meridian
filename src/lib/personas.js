// Shared specialist persona library. `icon` is a string key resolved against
// the icon set in the consuming component (the `I` set in MeridianTCE, passed
// to ExecuteReport as `iconSet`). The first five are the core specialists; the
// next five round out the full library. All ten are backed by real system
// prompts in server/ai.js.
export const PERSONAS = [
  { id: 'comp',   icon: 'Shield',      role: 'Compliance Sentinel',           spec: 'NIS2 · GDPR · Schrems II',          confidence: 94, core: true },
  { id: 'cloud',  icon: 'Cloud',       role: 'Cloud Architect',               spec: 'Sovereign stack migration',         confidence: 91, core: true },
  { id: 'legal',  icon: 'Scale',       role: 'Legal Advisor',                 spec: 'Data processing · EU law',          confidence: 89, core: true },
  { id: 'fin',    icon: 'Chart',       role: 'Financial Analyst',             spec: 'TCO · transition modelling',        confidence: 92, core: true },
  { id: 'risk',   icon: 'Compass',     role: 'Risk Officer',                  spec: 'Vendor lock-in · continuity',       confidence: 88, core: true },
  { id: 'sec',    icon: 'Lock',        role: 'Security Architect',            spec: 'Zero-Trust · identity · endpoints', confidence: 93 },
  { id: 'data',   icon: 'Network',     role: 'Data Governance Lead',          spec: 'Classification · residency · AI Act', confidence: 90 },
  { id: 'change', icon: 'Sparkle',     role: 'Change & Adoption Lead',        spec: 'Workforce change · training',       confidence: 87 },
  { id: 'proc',   icon: 'Engagements', role: 'Procurement Strategist',        spec: 'EU procurement · tendering',        confidence: 91 },
  { id: 'ops',    icon: 'Settings',    role: 'Operations & Continuity Engineer', spec: 'Cutover · runbooks · SRE',        confidence: 90 },
];

export const PERSONA_BY_ID = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));

// Team roles a persona can be assigned during assembly. Order matters for the UI.
export const TEAM_ROLES = ['Lead', 'Contributor', 'Challenger', 'Synthesizer', 'Observer'];

// Seneca's proactive recommendation: the core five with sensible default roles.
export const SUGGESTED_TEAM = [
  { personaId: 'cloud', role: 'Lead' },
  { personaId: 'comp',  role: 'Contributor' },
  { personaId: 'legal', role: 'Contributor' },
  { personaId: 'fin',   role: 'Synthesizer' },
  { personaId: 'risk',  role: 'Challenger' },
];

// Fallback team used when a consultation starts without an explicit assembly
// (e.g. jumping straight to Phase 4, or loading a saved result).
export const DEFAULT_TEAM = PERSONAS.filter((p) => p.core).map((p) => ({ personaId: p.id, role: 'Contributor' }));

// Context signals per persona — used to tailor the recommended team to the
// actual engagement (org tech stack, compliance frameworks, challenges, etc.).
const PERSONA_SIGNALS = {
  comp:   ['nis2', 'gdpr', 'schrems', 'dora', 'bio', 'compliance', 'regulat', 'privacy', 'audit'],
  cloud:  ['cloud', 'migrat', 'microsoft 365', 'm365', 'azure', 'aws', 'google', 'stack', 'infrastructure', 'sovereign', 'open-source', 'open source', 'on-prem', 'datacenter', 'data centre'],
  legal:  ['legal', 'law', 'contract', 'dpa', 'jurisdiction', 'liabilit', 'processor', 'clause'],
  fin:    ['budget', 'cost', 'tco', 'eur', 'euro', '€', 'spend', 'funding', 'economic', 'pricing', 'roi', 'savings'],
  risk:   ['risk', 'lock-in', 'lock in', 'continuity', 'resilience', 'dependency', 'vendor', 'exit'],
  sec:    ['security', 'zero-trust', 'zero trust', 'identity', 'iam', 'entra', 'endpoint', 'mfa', 'threat', 'breach', 'encryption'],
  data:   ['data', 'classification', 'residency', 'retention', 'ai act', 'analytics', 'records', 'sovereignty'],
  change: ['change', 'adoption', 'training', 'workforce', 'staff', 'employee', 'people', 'culture', 'user', 'communication'],
  proc:   ['procure', 'tender', 'rfp', 'vendor selection', 'sourcing', 'framework agreement', 'bid', 'contract award'],
  ops:    ['operation', 'cutover', 'runbook', 'rollback', 'sre', 'uptime', 'sla', 'downtime', 'service continuity', 'support'],
};

// Build the engagement text blob the suggestion is scored against.
function orgBlob(orgData) {
  if (!orgData) return '';
  return [
    orgData.industry, orgData.size, orgData.headquarters, orgData.current_tech_stack,
    Array.isArray(orgData.compliance_frameworks) ? orgData.compliance_frameworks.join(' ') : orgData.compliance_frameworks,
    orgData.key_challenges, orgData.engagement_trigger, orgData.budget_envelope,
    orgData.timeline, orgData.stakeholders, orgData.raw_context,
  ].filter(Boolean).join(' ').toLowerCase();
}

// Seneca's proactive, situation-dependent team recommendation. Scores every
// specialist against the engagement context, keeps the sovereignty backbone plus
// the highest-scoring specialists, and assigns varied roles. Falls back to the
// static SUGGESTED_TEAM when there's no usable context yet.
export function suggestTeam(orgData) {
  const blob = orgBlob(orgData);
  const scored = PERSONAS.map((p) => ({
    id: p.id,
    score: (PERSONA_SIGNALS[p.id] || []).reduce((n, kw) => n + (blob.includes(kw) ? 1 : 0), 0),
  }));
  if (!blob || !scored.some((s) => s.score > 0)) return [...SUGGESTED_TEAM];

  const scoreOf = (id) => scored.find((s) => s.id === id)?.score ?? 0;

  // Sovereignty backbone is always present; fill the rest with top scorers (cap 6).
  const chosen = new Set(['cloud', 'comp', 'legal']);
  scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
    .forEach((s) => { if (chosen.size < 6) chosen.add(s.id); });

  const ids = [...chosen].sort((a, b) => scoreOf(b) - scoreOf(a));

  let synth = false, challenger = false, observer = false;
  return ids.map((id, i) => {
    let role = 'Contributor';
    if (i === 0) role = 'Lead';
    else if (id === 'risk' && !challenger) { role = 'Challenger'; challenger = true; }
    else if ((id === 'fin' || id === 'legal') && !synth) { role = 'Synthesizer'; synth = true; }
    else if ((id === 'sec' || id === 'data' || id === 'ops') && !observer) { role = 'Observer'; observer = true; }
    return { personaId: id, role };
  });
}
