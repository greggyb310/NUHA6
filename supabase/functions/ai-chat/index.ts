import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type AiAction = 'health_coach_message' | 'excursion_plan';

interface AiRequest {
  action: AiAction;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
}

interface AiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: { message: string; code?: string };
  meta?: {
    provider?: string;
    model?: string;
    latency_ms?: number;
    trace_id?: string;
  };
}

interface Provider {
  id: string;
  model: string;
  run: (req: AiRequest, traceId: string) => Promise<unknown>;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

const openaiProvider: Provider = {
  id: 'openai',
  model: OPENAI_MODEL,
  run: async (req: AiRequest, traceId: string) => {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = getSystemPrompt(req.action);
    const userPrompt = JSON.stringify({ input: req.input, context: req.context || {} });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  },
};

function getSystemPrompt(action: AiAction): string {
  switch (action) {
    case 'health_coach_message':
      return `You are a supportive wellness coach for NatureUP Health, an app focused on nature therapy and outdoor wellness.

Your role:
- Provide encouraging, personalized health coaching
- Focus on nature-based wellness activities
- Keep responses conversational and warm
- Suggest outdoor activities when appropriate

Output format (JSON):
{
  "reply": "Your supportive message here"
}`;

    case 'excursion_plan':
      return `You are an AI assistant that creates personalized nature therapy excursions.

Your role:
- Design safe, enjoyable outdoor routes
- Consider user location, nearby places, preferences, and duration
- Focus on wellness benefits (stress reduction, mindfulness, physical activity)
- Provide clear, actionable steps

Output format (JSON):
{
  "title": "Excursion name",
  "description": "Brief overview with wellness benefits",
  "steps": ["Step 1: ...", "Step 2: ..."],
  "duration_minutes": 60,
  "distance_km": 3.5,
  "difficulty": "easy"
}`;

    default:
      return 'You are a helpful AI assistant. Output JSON only.';
  }
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';

const geminiProvider: Provider = {
  id: 'gemini',
  model: GEMINI_MODEL,
  run: async (req: AiRequest, traceId: string) => {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const prompt = JSON.stringify({ action: req.action, input: req.input, context: req.context || {} });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';

    if (!text) {
      throw new Error('No content in Gemini response');
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  },
};

function getProvider(): Provider {
  const providerId = (Deno.env.get('AI_PROVIDER') || 'openai').toLowerCase();
  
  switch (providerId) {
    case 'openai':
      return openaiProvider;
    case 'gemini':
      return geminiProvider;
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${providerId}`);
  }
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

  let body: AiRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { ok: false, error: { message: 'Invalid JSON', code: 'INVALID_JSON' }, meta: { trace_id: traceId } },
      400
    );
  }

  if (!body.action || !body.input) {
    return jsonResponse(
      { ok: false, error: { message: 'Missing required fields: action, input', code: 'INVALID_REQUEST' }, meta: { trace_id: traceId } },
      400
    );
  }

  try {
    const provider = getProvider();
    const result = await provider.run(body, traceId);

    return jsonResponse({
      ok: true,
      result,
      meta: {
        provider: provider.id,
        model: provider.model,
        latency_ms: Date.now() - start,
        trace_id: traceId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${traceId}] AI run failed:`, message);
    
    return jsonResponse(
      {
        ok: false,
        error: { message, code: 'AI_RUN_FAILED' },
        meta: { latency_ms: Date.now() - start, trace_id: traceId },
      },
      500
    );
  }
});
