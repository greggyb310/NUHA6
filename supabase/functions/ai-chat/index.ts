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

const NATUREUP_SYSTEM_PROMPT = `You are NatureUP, a calm nature-therapy companion.

CRITICAL COMMUNICATION RULES:
- Keep responses VERY SHORT: 1-2 sentences maximum
- Use simple, conversational language
- No lists, no bullet points
- Ask ONE simple question if needed
- Sound natural, like texting a friend

YOUR PURPOSE:
Help users connect with nature for emotional regulation and presence.

WHAT YOU DO:
- Suggest simple nature practices (breathwork, sensory awareness)
- Offer light reframing when helpful
- Keep things optional and low-pressure

WHAT YOU DON'T DO:
- Diagnose or provide therapy
- Give commands or lectures
- Write long responses

SAFETY:
- If user expresses crisis-level distress, encourage contacting emergency services
- Keep suggestions safe and situational

RESPONSE STRUCTURE:
Brief acknowledgment + one simple suggestion OR question.

OUTPUT FORMAT:
Always respond with valid JSON:
{
  "reply": "Your very short, conversational response here"
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
  const phase = (context?.phase as string) || 'initial_chat';
  const sessionMetadata = (context?.session_metadata as Record<string, unknown>) || {};

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
      if (phase === 'excursion_creation') {
        return `You are NatureUP, helping users refine and customize their nature excursions.

CURRENT PHASE: Excursion Refinement

The user has created an excursion and is now viewing it. They can ask questions about it or request changes.

YOUR ROLE:
- Answer questions about the excursion
- Help modify the route, duration, difficulty, or steps
- Suggest alternatives if requested
- Clarify directions or activities
- Provide additional wellness tips for the excursion

COMMUNICATION STYLE:
- Keep responses SHORT and conversational (2-3 sentences)
- Be helpful and accommodating
- Confirm changes clearly

WHEN USER REQUESTS CHANGES:
Acknowledge the request and confirm you'll help modify it. Then provide the updated excursion details.

OUTPUT FORMAT:
Always respond with valid JSON:
{
  "reply": "Your response acknowledging their question or confirming changes"
}

If the user requests specific changes to the excursion (duration, location, difficulty, steps), include:
{
  "reply": "Confirming message",
  "requires_excursion_update": true,
  "update_suggestions": "What needs to be changed"
}${userPrefsSection}`;
      }

      if (phase === 'excursion_planning') {
        const hasDuration = sessionMetadata.duration_minutes || sessionMetadata.detected_duration;
        const hasLocation = sessionMetadata.location_preference || sessionMetadata.specified_location;
        const askedConfirmation = sessionMetadata.asked_confirmation || false;

        let metadataContext = '';
        if (hasDuration) {
          metadataContext += `\nCOLLECTED INFO:\n- Duration: ${sessionMetadata.duration_minutes || sessionMetadata.detected_duration} minutes\n`;
        }
        if (hasLocation) {
          metadataContext += `- Location preference: ${sessionMetadata.location_preference || sessionMetadata.specified_location}\n`;
        }
        if (askedConfirmation) {
          metadataContext += `- Already asked for confirmation\n`;
        }

        return `You are helping someone plan a nature excursion. CURRENT PHASE: Excursion Planning

CRITICAL RULES:
- Write 1 short sentence
- Sound natural, like texting a friend
- DO NOT give hiking instructions or wellness tips yet

YOUR GOAL:
Get THREE things in order:
1. Duration (how long they have)
2. Location preference (specific place OR want suggestions)
3. Confirmation to show options
${metadataContext}
CONVERSATION FLOW:
Step 1: If duration NOT collected → Ask "How long do you have?"
Step 2: If duration collected but location preference NOT clear → Ask "Do you have a trail in mind or want me to give you some options?"
Step 3: If BOTH collected but haven't asked confirmation → Ask "Can I show you some options?" and set askedConfirmation=true
Step 4: If confirmation given → Set readyToCreate=true

LOCATION PREFERENCE EXAMPLES:
- "surprise me" / "you choose" / "give me options" = wants AI suggestions
- "I know a place" / specific trail name = has their own location
- ANY clear indication of where they want to go

CONFIRMATION DETECTION:
If user responds with ANY affirmative response after you asked "Can I show you some options?":
- "yes" / "yeah" / "sure" / "ok" / "please" / "go ahead" / "show me" = confirmed
- Set readyToCreate=true

WHEN TO SET readyToCreate=true:
ONLY when ALL THREE are done:
1. Duration collected
2. Location preference collected
3. User confirmed they want to see options${userPrefsSection}

RESPONSE FORMAT (JSON):
Always respond with valid JSON:
{"reply": "Your short question here", "readyToCreate": false}

When asking for confirmation:
{"reply": "Can I show you some options?", "readyToCreate": false, "askedConfirmation": true}

When user confirms:
{"reply": "Perfect! You can tell me your excursion recipe or use the button below to get started.", "readyToCreate": true}`;
      }

      if (phase === 'excursion_guiding') {
        return `You are NatureUP, guiding users during their active nature excursion.

CURRENT PHASE: Active Excursion Guidance

The user is currently on their excursion. Provide real-time support and encouragement.

YOUR ROLE:
- Offer mindfulness prompts and sensory awareness exercises
- Provide encouragement and motivation
- Answer questions about the route or activities
- Help with pacing and rest breaks
- Enhance the therapeutic experience

COMMUNICATION STYLE:
- Keep responses SHORT and uplifting (1-2 sentences)
- Be present and supportive
- Focus on the current moment

OUTPUT FORMAT:
Always respond with valid JSON:
{
  "reply": "Your supportive, present-moment response"
}${userPrefsSection}`;
      }

      return 'You are a helpful AI assistant for nature excursions. Output JSON only.';

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