import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface VoiceRequest {
  audio_base64: string;
  conversation_history?: ChatMessage[];
  user_context?: Record<string, unknown>;
}

interface VoiceResponse {
  ok: boolean;
  transcript?: string;
  response_text?: string;
  response_audio_base64?: string;
  error?: { message: string; code?: string };
  meta?: {
    latency_ms?: number;
    trace_id?: string;
  };
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

For voice interactions, keep responses conversational and concise (2-3 sentences typically).`;

async function transcribeAudio(audioBase64: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const binaryString = atob(audioBase64);
  const audioBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    audioBuffer[i] = binaryString.charCodeAt(i);
  }
  const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.m4a');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
}

async function generateResponse(transcript: string, conversationHistory: ChatMessage[], userContext?: Record<string, unknown>): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  let systemPrompt = NATUREUP_SYSTEM_PROMPT;
  const phase = (userContext?.phase as string) || 'health_coach';

  if (phase === 'excursion_guiding') {
    const excursionContext = userContext?.excursion_title as string || 'your excursion';
    const currentStep = userContext?.current_step as number || 1;
    const totalSteps = userContext?.total_steps as number || 0;

    systemPrompt += `\n\nCURRENT CONTEXT:\nYou are providing real-time guidance during an active nature excursion: "${excursionContext}".\nProgress: Step ${currentStep}${totalSteps > 0 ? ` of ${totalSteps}` : ''}\n\nFocus on:\n- Real-time encouragement and mindfulness cues\n- Responding to what the user is experiencing right now\n- Safety awareness and pacing\n- Noticing their immediate surroundings\n- Keeping responses brief and conversational (1-2 sentences)`;
  }

  if (userContext) {
    const activityPrefs = userContext.activity_preferences as string[] || [];
    const therapyPrefs = userContext.therapy_preferences as string[] || [];
    const healthGoals = userContext.health_goals as string[] || [];
    const fitnessLevel = userContext.fitness_level as string || null;
    const mobilityLevel = userContext.mobility_level as string || null;

    if (activityPrefs.length > 0 || therapyPrefs.length > 0 || healthGoals.length > 0 || fitnessLevel || mobilityLevel) {
      let userPrefsSection = '\n\nUSER PREFERENCES:\n';

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
      systemPrompt += userPrefsSection;
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: transcript },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function textToSpeech(text: string): Promise<string> {
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
      voice: 'nova',
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

    let body: VoiceRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { ok: false, error: { message: 'Invalid JSON', code: 'INVALID_JSON' }, meta: { trace_id: traceId } },
        400
      );
    }

    if (!body.audio_base64) {
      return jsonResponse(
        { ok: false, error: { message: 'Missing required field: audio_base64', code: 'INVALID_REQUEST' }, meta: { trace_id: traceId } },
        400
      );
    }

    const transcript = await transcribeAudio(body.audio_base64);
    const conversationHistory = body.conversation_history || [];
    const responseText = await generateResponse(transcript, conversationHistory, body.user_context);
    const responseAudio = await textToSpeech(responseText);

    return jsonResponse({
      ok: true,
      transcript,
      response_text: responseText,
      response_audio_base64: responseAudio,
      meta: {
        latency_ms: Date.now() - start,
        trace_id: traceId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${traceId}] Voice processing failed:`, message);

    return jsonResponse(
      {
        ok: false,
        error: { message, code: 'VOICE_PROCESSING_FAILED' },
        meta: { latency_ms: Date.now() - start, trace_id: traceId },
      },
      500
    );
  }
});