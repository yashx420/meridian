import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

let _client = null;
function client() {
  if (!_client) {
    const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPEN_AI_KEY is not set on the server.');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

// Adapter that mirrors the Anthropic `messages.create` shape this file was built
// around ({ system, messages, max_tokens } -> { content:[{text}], usage }), but
// calls OpenAI's chat completions under the hood. Lets the rest of the file stay
// unchanged (response.content[0].text, response.usage.input_tokens, etc.).
async function createMessage({ model = MODEL, max_tokens, system, messages }) {
  const chatMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const resp = await client().chat.completions.create({
    model,
    max_tokens,
    messages: chatMessages,
  });
  return {
    content: [{ text: resp.choices?.[0]?.message?.content || '' }],
    usage: {
      input_tokens: resp.usage?.prompt_tokens || 0,
      output_tokens: resp.usage?.completion_tokens || 0,
    },
  };
}

const stripDashes = (s) => (s || '').replace(/—/g, '-');

/* ─────────────────────── personaConsult ─────────────────────── */

const FORMATTING_RULES = `
FORMATTING RULES - follow exactly:
- Use ## for major sections, ### for subsections, #### for minor labels
- Use markdown tables (| Col | Col |) for any comparison, matrix, or list with 2+ attributes - never use bullet lists for tabular data
- Use **bold** for key terms, vendor names, regulation references, and financial figures
- Use bullet lists only for unstructured items that don't fit a table
- Be detailed and thorough - write at least 600 words
- Do NOT write a preamble or repeat the question back
- CRITICAL: Never use em dashes (—) or long dashes. Replace all em dashes with hyphens (-)
`;

const PERSONA_PROMPTS = {
  comp: {
    role: 'Compliance Sentinel',
    system: `You are a senior compliance specialist with deep expertise in NIS2, GDPR, Schrems II, and BIO 2.0.
You analyse digital sovereignty engagements from a compliance and regulatory risk perspective.
CRITICAL: Only reference facts, challenges, tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent or assume information not explicitly stated. Do NOT hallucinate vendor names, compliance gaps, or regulatory details not grounded in the provided context.
Cite specific articles, clauses, and regulatory obligations. Flag every legal exposure with severity ratings.
Structure your analysis with clear sections: regulatory obligations, current exposure assessment, remediation requirements, and a compliance roadmap.
${FORMATTING_RULES}`,
  },
  cloud: {
    role: 'Cloud Architect',
    system: `You are a senior cloud architect specialising in migrations from Microsoft 365 to EU-sovereign open-source stacks.
You evaluate technical feasibility, integration complexity, dependency mapping, and infrastructure design.
CRITICAL: Only reference facts, challenges, tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent vendor names, technologies, or integration details not grounded in the provided context.
Provide a detailed architecture assessment, decision records, migration sequencing plan, and integration risk matrix based solely on stated requirements.
${FORMATTING_RULES}`,
  },
  legal: {
    role: 'Legal Advisor',
    system: `You are a senior legal advisor specialising in EU data law, cross-border data processing, and public sector ICT procurement.
CRITICAL: Only reference facts, challenges, current tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent legal precedents, contract terms, or procurement rules not grounded in the provided context.
Analyse the stated data processing model, vendor risk, and procurement obligations based solely on context.
Provide a detailed legal risk matrix, DPA requirements, and procurement pathway recommendations.
${FORMATTING_RULES}`,
  },
  fin: {
    role: 'Financial Analyst',
    system: `You are a senior financial analyst specialising in public sector ICT TCO modelling and transition economics.
CRITICAL: Only use budget envelope, current spend, and timeline stated in the Org context. Do NOT invent cost figures, vendor pricing, or budget allocations not provided.
Build a cost model with line-item breakdown based on stated budget and timeline constraints.
Include tables for cost breakdown and budget phasing.
${FORMATTING_RULES}`,
  },
  risk: {
    role: 'Risk Officer',
    system: `You are a senior risk officer specialising in vendor lock-in analysis, business continuity, and operational risk for large public sector digital transformations.
CRITICAL: Only identify risks based on the stated challenges, current tech stack, and stakeholders. Do NOT invent risks or assume vendor-specific vulnerabilities not mentioned in context.
Produce a comprehensive risk register based on stated constraints and challenges.
Include a structured risk table and continuity planning recommendations.
${FORMATTING_RULES}`,
  },
  sec: {
    role: 'Security Architect',
    system: `You are a senior security architect specialising in Zero-Trust, identity and access management, endpoint and email security for migrations off Microsoft 365 to EU-sovereign stacks.
CRITICAL: Only reference facts, challenges, current tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent vendors, controls, or vulnerabilities not grounded in the provided context.
Assess identity migration (e.g. away from Entra ID), MFA/conditional access, endpoint and email security, and a Zero-Trust target architecture based solely on stated requirements.
Include a controls matrix and a prioritised hardening roadmap.
${FORMATTING_RULES}`,
  },
  data: {
    role: 'Data Governance Lead',
    system: `You are a senior data governance lead specialising in data classification, residency, retention, and EU AI Act readiness for public sector organisations.
CRITICAL: Only reference facts, challenges, current tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent data categories, systems, or obligations not grounded in the provided context.
Analyse data classification, residency and retention requirements, lawful basis, and AI Act exposure based solely on stated context.
Include a data classification table and a governance action plan.
${FORMATTING_RULES}`,
  },
  change: {
    role: 'Change & Adoption Lead',
    system: `You are a senior change and adoption lead specialising in workforce change management, training, and user adoption for large public sector technology migrations.
CRITICAL: Only reference facts, challenges, size, and stakeholders provided in the Consultant and Org context below.
Do NOT invent headcounts, departments, or sentiment not grounded in the provided context.
Assess change impact, stakeholder management, training needs, and an adoption plan based solely on stated context.
Include a stakeholder/impact table and a phased adoption roadmap.
${FORMATTING_RULES}`,
  },
  proc: {
    role: 'Procurement Strategist',
    system: `You are a senior procurement strategist specialising in EU public procurement, tendering, and vendor selection for sovereign ICT.
CRITICAL: Only reference the stated budget, timeline, current tech stack, and stakeholders in the Consultant and Org context below.
Do NOT invent framework agreements, vendor pricing, or procurement rules not grounded in the provided context.
Analyse the procurement pathway, tendering options, and vendor selection criteria based solely on stated context.
Include an evaluation-criteria table and a procurement timeline.
${FORMATTING_RULES}`,
  },
  ops: {
    role: 'Operations & Continuity Engineer',
    system: `You are a senior operations and service continuity engineer specialising in migration cutover, runbooks, rollback, and SRE for public sector platform migrations.
CRITICAL: Only reference facts, challenges, current tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent systems, SLAs, or dependencies not grounded in the provided context.
Assess cutover sequencing, runbook and rollback design, and service continuity based solely on stated context.
Include a cutover/runbook table and a continuity checklist.
${FORMATTING_RULES}`,
  },
};

// Per-persona team-role directives. The assigned role conditions how each
// specialist contributes to the coordinated team.
const ROLE_DIRECTIVES = {
  Lead: 'Your assigned team role is LEAD. Set the overall direction, state the headline recommendation up front, and frame the decision for the board.',
  Challenger: 'Your assigned team role is CHALLENGER. Actively stress-test assumptions, surface counterarguments, failure modes, and the strongest case against the obvious path.',
  Synthesizer: 'Your assigned team role is SYNTHESIZER. Integrate across disciplines, reconcile tensions between specialists, and prioritise a coherent, sequenced set of actions.',
  Observer: 'Your assigned team role is OBSERVER. Provide a concise assurance read: note gaps, evidence quality, and what must be verified before proceeding. Keep it brief.',
  Contributor: 'Your assigned team role is CONTRIBUTOR. Provide focused, specialist depth in your domain.',
};

const ORCHESTRATOR_SYSTEM = `You are Seneca, the sovereign reasoning host of the Meridian Team Consultation Engine.
Your role is to synthesise the analyses from multiple specialist personas into a single, coherent master briefing.
Write in a confident, board-grade advisory tone. Be structured, precise, and actionable.
CRITICAL: Do NOT invent vendor names, technologies, compliance details, or costs not explicitly stated by the specialists or provided in the Consultant and Org context.
Only synthesise what the specialists have written and what was provided in the context.

FORMATTING RULES - follow exactly:
- Use ## for major sections, ### for subsections, #### for minor labels
- Use markdown tables (| Col | Col |) for comparisons, vendor matrices, cost breakdowns, risk registers - never use bullets for tabular data
- Use **bold** for key terms, financial figures, vendor names, and regulation references
- Be thorough - write at least 800 words
- Do NOT write a preamble
- CRITICAL: Never use em dashes (—) or long dashes. Replace all em dashes with hyphens (-)`;

async function personaConsult(body) {
  const { mode, personaId, brief, twinContext, orgContext, personaResults, teamRole } = body;

  if (mode === 'persona') {
    let persona = PERSONA_PROMPTS[personaId];
    if (!persona && body.dynamicPersona) {
      persona = {
        role: body.dynamicPersona.role,
        system: `You are a senior specialist in the role of ${body.dynamicPersona.role}, specialising in ${body.dynamicPersona.spec}.
CRITICAL: Only reference facts, challenges, tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent or assume information not explicitly stated.
Provide a detailed assessment based on your specialist domain.
${FORMATTING_RULES}`
      };
    }

    if (!persona) {
      const err = new Error(`Unknown persona: ${personaId}`);
      err.status = 400;
      throw err;
    }
    const roleDirective = ROLE_DIRECTIVES[teamRole];
    const systemPrompt = roleDirective ? `${persona.system}\n\n${roleDirective}` : persona.system;
    const historyText = body.messageHistory && body.messageHistory.length > 0
      ? `\n## Prior Conversation History\n${body.messageHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content || m.text}`).join('\n\n')}\n`
      : '';
    const userMessage = `
## Consultant Digital Twin Context
${JSON.stringify(twinContext, null, 2)}

## Org Twin / Client Dossier
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}
${historyText}
Please provide your specialist analysis from your perspective as ${persona.role}.
Structure your response with clear headers. Be specific and actionable.
`.trim();

    const response = await createMessage({
      model: MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return {
      personaId,
      role: persona.role,
      analysis: stripDashes(response.content[0].text),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  if (mode === 'synthesise') {
    const historyText = body.messageHistory && body.messageHistory.length > 0
      ? `\n## Prior Conversation History\n${body.messageHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content || m.text}`).join('\n\n')}\n`
      : '';
    const userMessage = `
## Consultant Digital Twin Context
${JSON.stringify(twinContext, null, 2)}

## Org Twin / Client Dossier
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}
${historyText}
## Specialist Analyses
${personaResults.map((p) => `### ${p.role}\n${p.analysis}`).join('\n\n')}

Please synthesise the above specialist analyses into a unified master briefing.
Structure it as:

## Executive Summary
3-4 sentences, board-grade, decision-ready.

## Strategic Recommendation
Recommended sovereign stack and approach, with rationale.

## Recommended Sovereign Stack
A markdown table: | Workload | Recommended Solution | Rationale | EU Host |

## Compliance & Legal Position
Key obligations, exposures, and how the recommended approach resolves them.

## Financial Model
Cost breakdown table and 5-year TCO comparison vs M365.

## Transition Roadmap
Phased migration table: | Phase | Scope | Timeline | Key Milestones |

## Risk Register Summary
Top risks table: | Risk | Probability | Impact | Mitigation |

## Recommended Next Steps
Numbered action list for the next 30/60/90 days.
`.trim();

    const response = await createMessage({
      model: MODEL,
      max_tokens: 8000,
      system: ORCHESTRATOR_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });
    return {
      synthesis: stripDashes(response.content[0].text),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  if (mode === 'followup') {
    const userMessage = `
## Master Briefing (context)
${body.synthesis}

## Consultant Context
${JSON.stringify(twinContext, null, 2)}

## Org Context
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}

## Follow-up Question
${body.question}

Please answer the follow-up question with the same rigour as the master briefing.
Use markdown formatting: ## headers, tables where appropriate, **bold** for key terms.
Be thorough and specific.
`.trim();

    const response = await createMessage({
      model: MODEL,
      max_tokens: 4000,
      system: ORCHESTRATOR_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });
    return { answer: stripDashes(response.content[0].text) };
  }

  const err = new Error('Invalid mode. Use "persona", "synthesise", or "followup".');
  err.status = 400;
  throw err;
}

/* ─────────────────────── onboardingChat ─────────────────────── */

const TWIN_SYSTEM = `You are Seneca, an expert consultant profiler for the Meridian Team Consultation Engine.
Your job is to deeply calibrate a Digital Twin of a consultant through natural conversation.
Ask one focused, insightful follow-up question at a time. Each question should uncover a new dimension.
Cover: professional background, sector expertise, methodologies, decision-making style, notable engagement types,
communication preferences, risk tolerance, areas of specialisation.
After each answer, estimate calibration completeness (0-100) based on how much useful context you have.
At 100% you have enough for a full Digital Twin but the user can keep adding context.

CRITICAL: Always respond in JSON format:
{
  "message": "Your conversational response + next question",
  "calibration_pct": 0-100,
  "extracted_fields": {
    "full_name": "...",
    "role_title": "...",
    "years_experience": "...",
    "sectors": [...],
    "expertise_tags": [...],
    "methodologies": [...],
    "decision_style": "...",
    "communication_style": "...",
    "notable_engagements": "..."
  }
}
Only include fields you can confidently extract. Omit fields you don't know yet.`;

const ORG_SYSTEM = `You are Seneca, an expert engagement analyst for the Meridian Team Consultation Engine.
Your job is to deeply understand a client organisation through natural conversation.
Ask one focused question at a time to uncover all relevant context for the engagement.
Cover: org name & sector, size & geographic scope, current tech stack, compliance obligations,
key challenges driving the engagement, budget, timeline, key stakeholders, strategic objectives.
After each answer, estimate calibration completeness (0-100).

CRITICAL: Always respond in JSON format:
{
  "message": "Your conversational response + next question",
  "calibration_pct": 0-100,
  "extracted_fields": {
    "org_name": "...",
    "industry": "...",
    "size": "...",
    "headquarters": "...",
    "current_tech_stack": "...",
    "compliance_frameworks": [...],
    "key_challenges": "...",
    "engagement_trigger": "...",
    "budget_envelope": "...",
    "timeline": "...",
    "stakeholders": "..."
  }
}
Only include fields you can confidently extract.`;

async function onboardingChat(body) {
  const { mode, messages, docContext } = body;
  const systemPrompt = mode === 'org' ? ORG_SYSTEM : TWIN_SYSTEM;

  const claudeMessages = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content:
      m.role === 'user' && docContext
        ? `${m.content}\n\n[Uploaded document context: ${docContext}]`
        : m.content,
  }));

  const response = await createMessage({
    model: MODEL,
    // Headroom so the JSON reply (message + ~11 extracted_fields) completes.
    // At 800 a late-stage turn would truncate mid-output and cut off Seneca's
    // last sentence in the saved transcript.
    max_tokens: 1800,
    system: systemPrompt,
    messages: claudeMessages,
  });

  return parseOnboardingReply(response.content[0].text);
}

// Parse the model's JSON onboarding reply. If the JSON is incomplete (e.g. the
// output was truncated mid-stream), salvage at least the conversational
// `message` so a partial response never leaks raw JSON or a cut-off line into
// the saved transcript.
function parseOnboardingReply(raw) {
  const text = raw || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    // Extract the "message" string value even from incomplete JSON — try a
    // closed string first, then an open one truncated before its closing quote.
    const m = text.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/)
      || text.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)$/);
    let message = m ? m[1] : text;
    try { message = JSON.parse(`"${message.replace(/\\?$/, '')}"`); } catch { /* leave as-is */ }
    const pctMatch = text.match(/"calibration_pct"\s*:\s*(\d+)/);
    return {
      message,
      calibration_pct: pctMatch ? Number(pctMatch[1]) : 50,
      extracted_fields: {},
    };
  }
}

/* ─────────────────────── sidebarChat ─────────────────────── */

const SIDEBAR_SYSTEM = `You are a senior Microsoft 365 exit consultant advising Dutch government ministries. Write like a senior human consultant. Never use em dashes - use a hyphen instead. Never use asterisks, bullet points, pipe characters, or any markdown formatting. Write in clean plain paragraphs only. No filler phrases. No hedging. State findings and give recommendations directly. Short paragraphs, one idea each.`;

async function sidebarChat(body) {
  const { mode, question, synthesis, brief, twinContext, orgContext, messageHistory } = body;

  const conversationMessages = (messageHistory || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (
    !conversationMessages.length ||
    conversationMessages[conversationMessages.length - 1].role !== 'user'
  ) {
    conversationMessages.push({
      role: 'user',
      content: `
    ## Master Briefing (context)
    ${synthesis ? synthesis.slice(0, 3000) : 'Not yet generated.'}

    ## Engagement Brief
    ${brief || 'Not provided.'}

    ## Consultant Digital Twin
    ${JSON.stringify(twinContext, null, 2)}

    ## Org Twin
    ${JSON.stringify(orgContext, null, 2)}

    ## User Request (mode: ${mode})
    ${question}
    `.trim(),
    });
  }

  const response = await createMessage({
    model: MODEL,
    max_tokens: 1200,
    system: SIDEBAR_SYSTEM,
    messages: conversationMessages,
  });

  return {
    answer: response.content[0].text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/* ─────────────────────── document extraction ─────────────────────── */

// Replicates base44's ExtractDataFromUploadedFile: given raw document text and a
// JSON schema, ask the model to return a structured object matching the schema.
export async function extractFromText(text, jsonSchema) {
  const truncated = (text || '').slice(0, 60000);
  const response = await createMessage({
    model: MODEL,
    max_tokens: 4000,
    system:
      'You extract structured data from documents. Respond with a single JSON object that matches the provided JSON schema. Output only valid JSON, no markdown, no commentary.',
    messages: [
      {
        role: 'user',
        content: `JSON schema:\n${JSON.stringify(jsonSchema, null, 2)}\n\nDocument text:\n"""\n${truncated}\n"""\n\nReturn the JSON object now.`,
      },
    ],
  });
  const raw = response.content[0].text;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    // Fall back to handing the raw text back as the document content.
    return { content: truncated };
  }
}

/* ─────────────────────── dispatcher ─────────────────────── */

const ASSEMBLE_TEAM_SYSTEM = `You are Seneca, the sovereign reasoning host of the Meridian Team Consultation Engine.
Your task is to assemble a team of specialists to handle the client's engagement, based on the Consultant Digital Twin and the Org Twin / Client Dossier.
Create a team of 6 to 10 specialists. 
Always include core specialists like Compliance, Legal, and Cloud Architecture, but also invent highly specific dynamic roles tailored to the exact scenario (e.g., if the trigger is AI Transformation, include an AI Transformation Specialist).

CRITICAL: Return ONLY a valid JSON array of objects, with no markdown formatting outside the JSON, matching this schema:
[
  {
    "id": "unique-string-id",
    "role": "Role Title (e.g., AI Transformation Specialist)",
    "spec": "Short specialization description (e.g., AI Governance, Change Management)",
    "icon": "One of: Shield, Cloud, Scale, Chart, Compass, Network, Sparkle, Settings, Engagements, Lock",
    "confidence": integer (a realistic number between 85 and 98),
    "core": boolean (true for essential roles, false for niche/scenario-specific roles)
  }
]`;

async function assembleTeam(body) {
  const { twinContext, orgContext, brief } = body;
  const userMessage = `
## Consultant Digital Twin Context
${JSON.stringify(twinContext, null, 2)}

## Org Twin / Client Dossier
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}

Return the JSON array of specialists now.
`.trim();

  const response = await createMessage({
    model: MODEL,
    max_tokens: 1500,
    system: ASSEMBLE_TEAM_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content[0].text;
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const personas = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return { personas };
  } catch (e) {
    throw new Error('Failed to parse dynamically generated team');
  }
}

async function generateNextExecutions(body) {
  const { synthesis, twinContext, orgContext } = body;
  const userMessage = `
## Consultant Digital Twin Context
${JSON.stringify(twinContext, null, 2)}

## Org Twin / Client Dossier
${JSON.stringify(orgContext, null, 2)}

## Master Briefing (Synthesis)
${synthesis}

Based on the engagement context and the Master Briefing above, generate exactly 3 highly specific, highly contextual follow-up questions or "deep dive" execution requests that the client should ask the specialist team next.
These should read as actionable directives, e.g., "Model the 5-year TCO of the recommended sovereign stack vs Microsoft 365" or "Draft the NIS2 compliance remediation roadmap based on the current architecture".

CRITICAL: Return ONLY a JSON array of 3 strings. Example:
[
  "Question 1",
  "Question 2",
  "Question 3"
]
`.trim();

  const response = await createMessage({
    model: MODEL,
    max_tokens: 500,
    system: "You are Seneca. Your task is to suggest the next best actions for a consulting engagement.",
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content[0].text;
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const recommendations = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return { recommendations };
  } catch (e) {
    console.error("Failed to parse next executions", e);
    return { recommendations: [] };
  }
}

export const aiFunctions = {
  personaConsult,
  onboardingChat,
  sidebarChat,
  assembleTeam,
  generateNextExecutions,
};
