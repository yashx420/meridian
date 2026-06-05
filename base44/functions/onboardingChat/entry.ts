import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const client = new Anthropic({ apiKey: Deno.env.get("CLAUDE_API_KEY") });

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode, messages, docContext } = body;
    // mode: "twin" | "org"

    const systemPrompt = mode === 'org' ? ORG_SYSTEM : TWIN_SYSTEM;

    // Build message history for Claude
    const claudeMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.role === 'user' && docContext
        ? `${m.content}\n\n[Uploaded document context: ${docContext}]`
        : m.content
    }));

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const raw = response.content[0].text;
    let parsed;
    try {
      // Extract JSON from response (handle cases where model wraps in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      parsed = { message: raw, calibration_pct: 50, extracted_fields: {} };
    }

    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});