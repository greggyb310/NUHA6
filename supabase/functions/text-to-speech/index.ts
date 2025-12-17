import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TTSRequest {
  text: string;
  voice?: string;
}

interface TTSResponse {
  ok: boolean;
  audio_base64?: string;
  error?: { message: string; code?: string };
  meta?: {
    latency_ms?: number;
    trace_id?: string;
  };
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function textToSpeech(text: string, voice: string = 'nova'): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS API error: ${response.status} ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(audioBuffer);

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  const traceId = crypto.randomUUID();
  const start = Date.now();

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return jsonResponse(
        { ok: false, error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, meta: { trace_id: traceId } },
        405
      );
    }

    let body: TTSRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { ok: false, error: { message: 'Invalid JSON', code: 'INVALID_JSON' }, meta: { trace_id: traceId } },
        400
      );
    }

    if (!body.text) {
      return jsonResponse(
        { ok: false, error: { message: 'Missing required field: text', code: 'INVALID_REQUEST' }, meta: { trace_id: traceId } },
        400
      );
    }

    const audioBase64 = await textToSpeech(body.text, body.voice);

    return jsonResponse({
      ok: true,
      audio_base64: audioBase64,
      meta: {
        latency_ms: Date.now() - start,
        trace_id: traceId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${traceId}] TTS processing failed:`, message);

    return jsonResponse(
      {
        ok: false,
        error: { message, code: 'TTS_PROCESSING_FAILED' },
        meta: { latency_ms: Date.now() - start, trace_id: traceId },
      },
      500
    );
  }
});