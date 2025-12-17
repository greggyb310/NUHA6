import type { AiRequest, AiResponse } from '@/types/ai';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function aiRun<T = unknown>(payload: AiRequest): Promise<AiResponse<T>> {
  const start = Date.now();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      error: { message: 'Supabase not configured', code: 'CONFIG_ERROR' },
      meta: { latency_ms: Date.now() - start },
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Server error: ${response.status}`;
      const isApiKeyMissing = errorMessage.includes('OPENAI_API_KEY');

      return {
        ok: false,
        error: {
          message: isApiKeyMissing
            ? 'OpenAI API key not configured. Please add it in Supabase Edge Function secrets.'
            : errorMessage,
          code: data?.error?.code || 'API_ERROR',
        },
        meta: { latency_ms: Date.now() - start },
      };
    }

    return {
      ...data,
      meta: {
        ...(data?.meta ?? {}),
        latency_ms: Date.now() - start,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      ok: false,
      error: { message, code: 'NETWORK_ERROR' },
      meta: { latency_ms: Date.now() - start },
    };
  }
}
