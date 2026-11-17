import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiRateLimit } from '@/lib/mcp/rate-limit';

const MAX_SELECTED_CHARS = 20_000;
const MAX_CONTEXT_CHARS = 40_000;
const MAX_CUSTOM_PROMPT_CHARS = 2_000;

// Define the action → system prompt registry
const ACTION_REGISTRY: Record<string, string> = {
  summarize:
    'You are a precision editor. Condense the provided text into a concise summary that preserves all key points. Return only the summary, no preamble.',
  simplify:
    'You are a writing coach. Rewrite the provided text using clearer, simpler language suitable for a broad audience. Return only the rewritten text.',
  fix_grammar:
    'You are a grammar expert. Fix all spelling and grammar mistakes in the provided text without changing the original intent, style, or meaning. Return only the corrected text.',
  improve:
    'You are a professional editor. Improve the clarity, flow, and impact of the provided text while preserving its intent. Return only the improved text.',
  make_professional:
    'You are a business writing expert. Rewrite the provided text in a formal, professional tone suitable for business communication. Return only the result.',
  make_casual:
    'You are a copywriter. Rewrite the provided text in a friendly, conversational, and approachable tone. Return only the result.',
  continue:
    'You are a skilled writer. Continue writing from where the provided text leaves off, matching the same style, tone, and subject matter. Write 2-3 natural paragraphs.',
  custom: '', // Will be replaced by user-provided prompt
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const limit = checkAiRateLimit(user.id);
  if (!limit.ok) {
    return new Response('Too many AI requests. Try again shortly.', {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) },
    });
  }

  let body: { action?: unknown; selectedText?: unknown; context?: unknown; customPrompt?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const action = typeof body.action === 'string' ? body.action : '';
  const selectedText = typeof body.selectedText === 'string' ? body.selectedText : '';
  // Surrounding-document context is trimmed (not rejected) so long pages still work.
  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : '';
  const customPrompt = typeof body.customPrompt === 'string' ? body.customPrompt.trim() : '';

  if (
    selectedText.length > MAX_SELECTED_CHARS ||
    customPrompt.length > MAX_CUSTOM_PROMPT_CHARS
  ) {
    return new Response('Selection is too long for AI. Try a smaller section.', { status: 413 });
  }

  if (!action || !Object.prototype.hasOwnProperty.call(ACTION_REGISTRY, action)) {
    return new Response('Invalid action', { status: 400 });
  }

  const systemPrompt = action === 'custom'
    ? customPrompt
      ? `You are a writing assistant inside a document editor. Apply the user's instruction to the provided text and return only the resulting text.\n\nUser instruction: ${customPrompt}`
      : ''
    : ACTION_REGISTRY[action];

  if (!systemPrompt) {
    return new Response('Missing prompt for custom action', { status: 400 });
  }

  const userMessage = context
    ? `Document context:\n${context}\n\n---\n\nText to work on:\n${selectedText || context}`
    : selectedText || '';

  const startTime = Date.now();

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxOutputTokens: 2048,
    onFinish: ({ usage, finishReason }) => {
      const duration = Date.now() - startTime;
      console.log(`[AI] action="${action}" user="${user.id}" tokens=${usage?.outputTokens ?? 0} duration=${duration}ms reason=${finishReason}`);
    },
  });

  return result.toTextStreamResponse();
}
