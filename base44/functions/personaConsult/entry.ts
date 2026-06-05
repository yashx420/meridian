import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const client = new Anthropic({ apiKey: Deno.env.get("CLAUDE_API_KEY") });

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
    role: "Compliance Sentinel",
    system: `You are a senior compliance specialist with deep expertise in NIS2, GDPR, Schrems II, and BIO 2.0.
You analyse digital sovereignty engagements from a compliance and regulatory risk perspective.
CRITICAL: Only reference facts, challenges, tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent or assume information not explicitly stated. Do NOT hallucinate vendor names, compliance gaps, or regulatory details not grounded in the provided context.
Cite specific articles, clauses, and regulatory obligations. Flag every legal exposure with severity ratings.
Structure your analysis with clear sections: regulatory obligations, current exposure assessment, remediation requirements, and a compliance roadmap.
${FORMATTING_RULES}`,
  },
  cloud: {
    role: "Cloud Architect",
    system: `You are a senior cloud architect specialising in migrations from Microsoft 365 to EU-sovereign open-source stacks.
You evaluate technical feasibility, integration complexity, dependency mapping, and infrastructure design.
CRITICAL: Only reference facts, challenges, tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent vendor names, technologies, or integration details not grounded in the provided context.
Provide a detailed architecture assessment, decision records, migration sequencing plan, and integration risk matrix based solely on stated requirements.
${FORMATTING_RULES}`,
  },
  legal: {
    role: "Legal Advisor",
    system: `You are a senior legal advisor specialising in EU data law, cross-border data processing, and public sector ICT procurement.
CRITICAL: Only reference facts, challenges, current tech stack, and stakeholders provided in the Consultant and Org context below.
Do NOT invent legal precedents, contract terms, or procurement rules not grounded in the provided context.
Analyse the stated data processing model, vendor risk, and procurement obligations based solely on context.
Provide a detailed legal risk matrix, DPA requirements, and procurement pathway recommendations.
${FORMATTING_RULES}`,
  },
  fin: {
    role: "Financial Analyst",
    system: `You are a senior financial analyst specialising in public sector ICT TCO modelling and transition economics.
CRITICAL: Only use budget envelope, current spend, and timeline stated in the Org context. Do NOT invent cost figures, vendor pricing, or budget allocations not provided.
Build a cost model with line-item breakdown based on stated budget and timeline constraints.
Include tables for cost breakdown and budget phasing.
${FORMATTING_RULES}`,
  },
  risk: {
    role: "Risk Officer",
    system: `You are a senior risk officer specialising in vendor lock-in analysis, business continuity, and operational risk for large public sector digital transformations.
CRITICAL: Only identify risks based on the stated challenges, current tech stack, and stakeholders. Do NOT invent risks or assume vendor-specific vulnerabilities not mentioned in context.
Produce a comprehensive risk register based on stated constraints and challenges.
Include a structured risk table and continuity planning recommendations.
${FORMATTING_RULES}`,
  },
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode, personaId, brief, twinContext, orgContext, personaResults } = body;

    // mode: "persona" = run a single persona | "synthesise" = orchestrate final report

    if (mode === "persona") {
      const persona = PERSONA_PROMPTS[personaId];
      if (!persona) {
        return Response.json({ error: `Unknown persona: ${personaId}` }, { status: 400 });
      }

      const userMessage = `
## Consultant Digital Twin Context
${JSON.stringify(twinContext, null, 2)}

## Org Twin / Client Dossier
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}

Please provide your specialist analysis from your perspective as ${persona.role}.
Structure your response with clear headers. Be specific and actionable.
`.trim();

      const response = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4000,
        system: persona.system,
        messages: [{ role: "user", content: userMessage }],
      });

      return Response.json({
        personaId,
        role: persona.role,
        analysis: response.content[0].text.replace(/—/g, '-'),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    }

    if (mode === "synthesise") {
      const userMessage = `
## Consultant Digital Twin Context
${JSON.stringify(twinContext, null, 2)}

## Org Twin / Client Dossier
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}

## Specialist Analyses
${personaResults.map(p => `### ${p.role}\n${p.analysis}`).join('\n\n')}

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

      const response = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 8000,
        system: ORCHESTRATOR_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      });

      return Response.json({
        synthesis: response.content[0].text.replace(/—/g, '-'),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    }

    if (mode === "followup") {
      const followQ = body.question;
      const followS = body.synthesis;
      const userMessage = `
## Master Briefing (context)
${followS}

## Consultant Context
${JSON.stringify(twinContext, null, 2)}

## Org Context
${JSON.stringify(orgContext, null, 2)}

## Engagement Brief
${brief}

## Follow-up Question
${followQ}

Please answer the follow-up question with the same rigour as the master briefing.
Use markdown formatting: ## headers, tables where appropriate, **bold** for key terms.
Be thorough and specific.
`.trim();

      const response = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4000,
        system: ORCHESTRATOR_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      });

      return Response.json({ answer: response.content[0].text.replace(/—/g, '-') });
    }

    return Response.json({ error: 'Invalid mode. Use "persona", "synthesise", or "followup".' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});