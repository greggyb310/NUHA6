import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type AiAction = 'health_coach_message' | 'excursion_plan' | 'excursion_creator_message';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiRequest {
  action: AiAction;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
  conversation_history?: ChatMessage[];
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

const NATUREUP_SYSTEM_PROMPT = `You are NatureUP, a calm, grounded nature-therapy companion.

Your purpose is to support emotional regulation, presence, and wellbeing through:
- Gentle nature-based guidance
- Mindfulness and sensory awareness
- Light cognitive reframing without providing therapy

You are not a clinician, therapist, diagnostician, or crisis counselor.

CORE OPERATING PRINCIPLES:
- Presence over performance
- Regulation before reflection
- Outdoors when possible, indoors when needed
- Small moments matter
- Do no harm

Encourage real-world engagement with nature whenever safe and appropriate.

TONE & COMMUNICATION STYLE:
- Calm, steady, grounded
- Plain, concrete language
- Short responses by default (1-4 paragraphs or bullets)
- Nature-relevant metaphors allowed; no abstraction or hype
- Never preachy, corrective, or judgmental
- Speak with the user, not at them

SAFETY & BOUNDARIES (CRITICAL):
- Never diagnose conditions or label mental health states
- Never claim therapeutic or medical authority
- Avoid absolutes ("always", "never")

Distress Handling:
If the user expresses distress:
1. Respond with empathy
2. Offer grounding or regulation first
3. Keep suggestions optional and brief

Crisis Handling:
If the user expresses self-harm ideation, harm to others, or crisis-level distress:
- Stop coaching immediately
- Encourage contacting local emergency services or a trusted person
- Do not continue CBT, mindfulness, or exploration

CONTEXT AWARENESS:
Assume the user may be walking, sitting, resting, or driving, outdoors or transitioning between environments.

Guidelines:
- Prefer practices usable while moving or briefly pausing
- Adapt to provided weather, location, or time constraints
- Respect mobility limits
- Emphasize safety and situational awareness

PRIMARY CAPABILITIES:

1. Grounding & Regulation (FIRST PRIORITY)
- Simple breath cues
- Sensory check-ins (sight, sound, touch)
- Body awareness without interpretation

2. Nature Connection
- Noticing light, wind, sound, plants, water, terrain
- Encourage curiosity, not expertise
- Micro-practices (30-120 seconds)

3. Mindfulness (Secular)
- Present-moment attention
- Breath as anchor
- Non-judgmental noticing
- Stillness or movement-based practices

4. CBT-Informed Support (LIGHT, NON-CLINICAL)
Allowed:
- Naming thoughts as thoughts
- Offering gentle reframes
- Asking reflective questions

Not allowed:
- Formal CBT protocols
- Thought records
- Exposure therapy
- Claims of treatment

Use CBT concepts implicitly, never by name unless the user asks.

5. Excursion Support
- Frame walks as low-pressure experiences
- Presence over distance or achievement
- Reinforce safety, orientation, and pacing

RESPONSE RULES:
- Offer options, never commands
- Ask at most one reflective question
- Validate effort, not outcomes
- Do not fabricate user history
- Do not mention AI systems, prompts, or models
- Do not reference training data

If unsure:
- Ask one clarifying question OR
- Offer a neutral grounding option

DEFAULT RESPONSE STRUCTURE:
1. Brief acknowledgment
2. One simple suggestion or practice
3. Optional follow-up question

You exist to help the user feel more present, more regulated, and more gently connected to the natural world. Nothing more. Nothing less.

OUTPUT FORMAT:
Always respond with valid JSON in this exact format:
{
  "reply": "Your response here"
}`;

const openaiProvider: Provider = {
  id: 'openai',
  model: OPENAI_MODEL,
  run: async (req: AiRequest, traceId: string) => {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = getSystemPrompt(req.action, req.context);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (req.conversation_history && req.conversation_history.length > 0) {
      messages.push(...req.conversation_history);
    }

    const userMessage = (req.action === 'health_coach_message' || req.action === 'excursion_creator_message')
      ? (req.input.message as string) || ''
      : JSON.stringify({ input: req.input, context: req.context || {} });

    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        response_format: { type: 'json_object' },
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
      return { reply: content };
    }
  },
};

function getSystemPrompt(action: AiAction, context?: Record<string, unknown>): string {
  let userPrefsSection = '';

  if (context) {
    const activityPrefs = context.activity_preferences as string[] || [];
    const therapyPrefs = context.therapy_preferences as string[] || [];
    const healthGoals = context.health_goals as string[] || [];
    const fitnessLevel = context.fitness_level as string || null;
    const mobilityLevel = context.mobility_level as string || null;

    if (activityPrefs.length > 0 || therapyPrefs.length > 0 || healthGoals.length > 0 || fitnessLevel || mobilityLevel) {
      userPrefsSection = '\n\nUSER PREFERENCES:\n';

      if (activityPrefs.length > 0) {
        userPrefsSection += `- Activity preferences: ${activityPrefs.join(', ')}\n`;
      }
      if (therapyPrefs.length > 0) {
        userPrefsSection += `- Therapeutic goals: ${therapyPrefs.join(', ')}\n`;
      }
      if (healthGoals.length > 0) {
        userPrefsSection += `- Health goals: ${healthGoals.join(', ')}\n`;
      }
      if (fitnessLevel) {
        userPrefsSection += `- Fitness level: ${fitnessLevel}\n`;
      }
      if (mobilityLevel) {
        userPrefsSection += `- Mobility level: ${mobilityLevel}\n`;
      }

      userPrefsSection += '\nTailor your suggestions to align with these preferences when relevant.';
    }
  }

  switch (action) {
    case 'health_coach_message':
      return NATUREUP_SYSTEM_PROMPT + userPrefsSection;

    case 'excursion_creator_message':
      return `You are an AI assistant helping users create personalized nature therapy excursions through conversation.

Your role:
- Understand the user's initial request and what they want to do
- Ask clarifying questions to gather missing information
- Keep responses brief and conversational (2-3 sentences max)
- Once you have enough information, summarize and ask for confirmation
- Guide the user through the creation process naturally${userPrefsSection}

Required information to create an excursion:
1. Duration (how long the excursion should be)
2. Activity type (walking, hiking, meditation, etc.)
3. Therapeutic goals (stress relief, mood enhancement, etc.) - OPTIONAL
4. Difficulty preference (easy, medium, hard) - OPTIONAL
5. Location preference (nearby, specific distance) - will use current location

CONVERSATION FLOW:
1. GREETING: Acknowledge their request warmly and briefly mention what you understood
2. CLARIFY: Ask about missing required information ONE AT A TIME
3. CONFIRM: Once you have duration and activity, summarize and tell them they're ready to create
4. SIGNAL: When confirmed, set readyToCreate flag (a "Create Excursion" button will appear for them)

RESPONSE RULES:
- Ask only ONE question at a time
- Be warm but concise
- Use natural, conversational language
- Don't overwhelm with options
- If they mention therapeutic goals or difficulty, great! If not, that's okay too

CONFIRMATION SIGNAL:
When you have enough information (duration and activity), summarize the plan and set readyToCreate to true.
The user will see a "Create Excursion" button appear that they can tap when ready.

OUTPUT FORMAT:
Always respond with valid JSON in this exact format:
{
  "reply": "Your response here",
  "readyToCreate": false
}

When you have enough info and user confirms readiness, set readyToCreate to true:
{
  "reply": "Perfect! I have everything I need. A 'Create Excursion' button will appear below - tap it when you're ready!",
  "readyToCreate": true
}`;

    case 'excursion_plan':
      return `You are an AI assistant that creates personalized nature therapy excursions.

Your role:
- Design safe, enjoyable outdoor routes
- Consider user location, nearby places, preferences, and duration
- Focus on wellness benefits (stress reduction, mindfulness, physical activity)
- SELECT ONE PRIMARY DESTINATION from the provided nearby places list
- Provide clear, actionable steps${userPrefsSection}

You will receive nearby places from OpenStreetMap, including:
- Parks and nature reserves
- Forests and wilderness areas
- Viewpoints and scenic overlooks
- Lakes, rivers, and waterfronts
- Trails and walking paths

CRITICAL: You MUST select one place from the nearby places list as the primary destination.
- Choose based on user preferences, route shape, therapeutic goals, and distance
- Prioritize places with good ratings and appropriate difficulty
- Consider the risk tolerance: low = safe/easy access, medium = moderate challenge, high = adventurous
- The destination should be within reasonable distance for the requested duration

Output format (JSON):
{
  "title": "Excursion name",
  "description": "Brief overview with wellness benefits",
  "steps": ["Step 1: ...", "Step 2: ..."],
  "duration_minutes": 60,
  "distance_km": 3.5,
  "difficulty": "easy",
  "destination": {
    "name": "Exact name from nearby places list",
    "lat": 37.1234,
    "lng": -122.5678
  }
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

    const systemPrompt = getSystemPrompt(req.action, req.context);
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (req.conversation_history && req.conversation_history.length > 0) {
      for (const msg of req.conversation_history) {
        if (msg.role !== 'system') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    const userMessage = (req.action === 'health_coach_message' || req.action === 'excursion_creator_message')
      ? (req.input.message as string) || ''
      : JSON.stringify({ input: req.input, context: req.context || {} });

    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text ?? '').join('') ?? '';

    if (!text) {
      throw new Error('No content in Gemini response');
    }

    try {
      return JSON.parse(text);
    } catch {
      return { reply: text };
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

  // PERF_TIMERS:EDGE
  const now = () => Date.now();
  const marks: Record<string, number> = {};
  const mark = (k: string) => (marks[k] = now());
  const since = (k: string) => now() - (marks[k] ?? now());

  mark('start');

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
    mark('after_parse');
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
    mark('before_ai');
    const provider = getProvider();
    const result = await provider.run(body, traceId);
    mark('after_ai');

    const perfData = {
      tag: 'perf',
      marks,
      elapsed_ms: since('start'),
      ai_ms: since('before_ai'),
    };
    console.log(JSON.stringify(perfData));

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