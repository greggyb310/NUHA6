import { supabase } from './supabase';
import type { AiRequest, AiResponse } from '@/types/ai';

export async function aiRun<T = unknown>(payload: AiRequest): Promise<AiResponse<T>> {
  const start = Date.now();

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: payload,
  });

  if (error) {
    return {
      ok: false,
      error: { message: error.message, code: 'EDGE_FUNCTION_ERROR' },
      meta: { latency_ms: Date.now() - start },
    };
  }

  return {
    ...(data as AiResponse<T>),
    meta: {
      ...(data?.meta ?? {}),
      latency_ms: Date.now() - start,
    },
  };
}
