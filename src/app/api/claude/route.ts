import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Pricing for Claude Sonnet 4 (per token)
const INPUT_PRICE_PER_TOKEN = 3 / 1_000_000;   // $3 / 1M tokens
const OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000;  // $15 / 1M tokens

// Load API key: try process.env first, fallback to reading .env.local directly
function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Claude API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Claude API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Calculate cost from usage
    const usage = data.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cost = inputTokens * INPUT_PRICE_PER_TOKEN + outputTokens * OUTPUT_PRICE_PER_TOKEN;

    console.log(`[API] Tokens: ${inputTokens} in / ${outputTokens} out — Cost: $${cost.toFixed(4)}`);

    return NextResponse.json({
      content,
      usage: {
        inputTokens,
        outputTokens,
        cost: Math.round(cost * 10000) / 10000, // 4 decimal places
      },
    });
  } catch (error) {
    console.error('[API] Server error:', error);
    return NextResponse.json(
      { error: `Server error: ${String(error)}` },
      { status: 500 }
    );
  }
}
