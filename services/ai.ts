import { aiRun } from './ai-api';
import type { HealthCoachResult, ExcursionPlanResult } from '@/types/ai';

export async function coachMessage(input: {
  message: string;
  userProfile?: Record<string, unknown>;
}) {
  return aiRun<HealthCoachResult>({
    action: 'health_coach_message',
    input,
  });
}

export async function getExcursionPlan(input: {
  userLocation: { lat: number; lng: number };
  durationMinutes: number;
  preferences?: Record<string, unknown>;
  nearbyPlaces?: Array<{ name: string; lat: number; lng: number }>;
}) {
  return aiRun<ExcursionPlanResult>({
    action: 'excursion_plan',
    input,
  });
}
