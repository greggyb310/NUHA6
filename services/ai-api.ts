import type { AiRequest, AiResponse } from '@/types/ai';
import Constants from 'expo-constants';

function getEnvVar(key: string): string {
  return (
    process.env[key] ||
    Constants.expoConfig?.extra?.[key] ||
    ''
  );
}

const SUPABASE_URL = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

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
    console.log('AI API: Sending request to', `${SUPABASE_URL}/functions/v1/ai-chat`);
    console.log('AI API: Payload action:', payload.action);

    // PERF_TIMERS:CHAT_CLIENT
    const t0 = Date.now();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const t1 = Date.now();
    console.log('[chat] network ms:', t1 - t0);

    console.log('AI API: Response status:', response.status);

    let data;
    try {
      data = await response.json();
      const t2 = Date.now();
      console.log('[chat] total to body ms:', t2 - t0);
      console.log('AI API: Response data:', data);
    } catch (parseErr) {
      console.error('AI API: Failed to parse response as JSON');
      return {
        ok: false,
        error: {
          message: `Server returned invalid JSON (status ${response.status})`,
          code: 'INVALID_RESPONSE',
        },
        meta: { latency_ms: Date.now() - start },
      };
    }

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Server error: ${response.status}`;
      const isApiKeyMissing = errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('API key');

      console.error('AI API: Error response:', errorMessage);

      return {
        ok: false,
        error: {
          message: isApiKeyMissing
            ? 'AI service not configured. The OpenAI API key needs to be added to Supabase Edge Function secrets.'
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
    console.error('AI API: Network error:', err);
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      ok: false,
      error: {
        message: `Unable to reach AI service: ${message}. Please check your internet connection.`,
        code: 'NETWORK_ERROR'
      },
      meta: { latency_ms: Date.now() - start },
    };
  }
}
