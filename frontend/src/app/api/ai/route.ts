import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// System prompt for the GIS AI assistant
const SYSTEM_PROMPT = `You are Siteora AI, an expert spatial analysis assistant for property and land development in Queensland, Australia.

You help users with:
1. Understanding planning constraints (heritage, flood, bushfire, environmental)
2. Interpreting spatial data and map layers
3. Providing guidance on development potential
4. Explaining Queensland planning regulations
5. Analyzing site suitability for different uses

Key knowledge areas:
- Queensland Planning Act 2016
- State Planning Policy (SPP)
- Matters of State Environmental Significance (MSES)
- Local Government planning schemes
- Heritage places and cultural significance
- Natural hazards (flood, bushfire, landslide, coastal)
- Environmental protection areas

When responding:
- Be concise and practical
- Reference specific planning controls when relevant
- Suggest what professionals to consult (town planner, environmental consultant, etc.)
- Highlight any high-risk constraints that need urgent attention
- Provide actionable next steps

If the user provides site analysis data, use it to give specific advice about that property.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, siteContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build context message if site data is provided
    let contextMessage = '';
    if (siteContext) {
      contextMessage = `\n\nCurrent Site Context:
Property: ${siteContext.property?.lotPlan || 'Unknown'}
Location: ${siteContext.property?.locality || 'Unknown'}, ${siteContext.property?.lga || 'Unknown'}
Area: ${siteContext.property?.area ? `${siteContext.property.area.toLocaleString()} m²` : 'Unknown'}
Coordinates: ${siteContext.coordinates?.[1]?.toFixed(6) || 'Unknown'}, ${siteContext.coordinates?.[0]?.toFixed(6) || 'Unknown'}

Identified Constraints:
${siteContext.constraints?.length > 0
  ? siteContext.constraints.map((c: any) => `- ${c.layerName} (${c.severity || 'info'} severity)`).join('\n')
  : 'No constraints identified'}
`;
    }

    // Format messages for Claude
    const formattedMessages = messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add context to the first user message if provided
    if (contextMessage && formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
      formattedMessages[0].content = contextMessage + '\n\nUser Question: ' + formattedMessages[0].content;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: formattedMessages,
    });

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text');
    const assistantMessage = textContent?.type === 'text' ? textContent.text : '';

    return NextResponse.json({
      message: assistantMessage,
      usage: response.usage,
    });
  } catch (error) {
    console.error('AI API error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
