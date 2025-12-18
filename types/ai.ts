export type AiAction =
  | 'health_coach_message'
  | 'excursion_plan';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AiRequest = {
  action: AiAction;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
  conversation_history?: ChatMessage[];
};

export type AiResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  error?: { message: string; code?: string };
  meta?: {
    provider?: string;
    model?: string;
    latency_ms?: number;
    trace_id?: string;
  };
};

export type HealthCoachResult = {
  reply: string;
};

export type ExcursionPlanResult = {
  title: string;
  description: string;
  steps: string[];
  duration_minutes?: number;
  distance_km?: number;
  difficulty?: 'easy' | 'moderate' | 'challenging';
  destination?: {
    name: string;
    lat: number;
    lng: number;
  };
};
