import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const client = new Anthropic({ apiKey: Deno.env.get("CLAUDE_API_KEY") });

const SYSTEM_DISCUSS = `You are a senior Microsoft 365 exit consultant advising Dutch government ministries. Write like a senior human consultant. Never use em dashes - use a hyphen instead. Never use asterisks, bullet points, pipe characters, or any markdown formatting. Write in clean plain paragraphs only. No filler phrases. No hedging. State findings and give recommendations directly. Short paragraphs, one idea each.`;

const SYSTEM_EXECUTE = `You are a senior Microsoft 365 exit consultant advising Dutch government ministries. Write like a senior human consultant. Never use em dashes - use a hyphen instead. Never use asterisks, bullet points, pipe characters, or any markdown formatting. Write in clean plain paragraphs only. No filler phrases. No hedging. State findings and give recommendations directly. Short paragraphs, one idea each.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode, question, synthesis, brief, twinContext, orgContext, messageHistory } = body;

    const systemPrompt = mode === 'execute' ? SYSTEM_EXECUTE : SYSTEM_DISCUSS;

    // Build conversation history from messageHistory
    const conversationMessages = (messageHistory || []).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Add current question if not already in history
    if (!conversationMessages.length || conversationMessages[conversationMessages.length - 1].role !== 'user') {
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
    `.trim()
      });
    }

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1200,
      system: systemPrompt,
      messages: conversationMessages,
    });

    return Response.json({
      answer: response.content[0].text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});