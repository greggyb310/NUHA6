import { supabase } from './supabase';
import type { ConversationPhase } from './chat';

export function getAssistantForPhase(phase: ConversationPhase): 'health_coach' | 'excursion_creator' {
  switch (phase) {
    case 'excursion_planning':
    case 'excursion_creation':
    case 'excursion_guiding':
      return 'excursion_creator';
    case 'initial_chat':
    case 'post_excursion_followup':
    default:
      return 'health_coach';
  }
}

export function canTransition(fromPhase: ConversationPhase, toPhase: ConversationPhase): boolean {
  const validTransitions: Record<ConversationPhase, ConversationPhase[]> = {
    initial_chat: ['excursion_planning'],
    excursion_planning: ['excursion_creation', 'initial_chat'],
    excursion_creation: ['excursion_guiding', 'initial_chat'],
    excursion_guiding: ['post_excursion_followup'],
    post_excursion_followup: ['initial_chat', 'excursion_planning'],
  };

  return validTransitions[fromPhase]?.includes(toPhase) || false;
}

export async function transitionToExcursionPlanning(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      phase: 'excursion_planning',
      assistant_type: 'excursion_creator',
      conversation_metadata: {
        excursion_step: 'collecting_requirements',
        duration_minutes: null,
        location_preference: null,
        asked_confirmation: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error transitioning to excursion_planning:', error);
    return false;
  }

  return true;
}

export async function transitionToExcursionCreation(
  sessionId: string,
  excursionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      phase: 'excursion_creation',
      assistant_type: 'excursion_creator',
      excursion_id: excursionId,
      conversation_metadata: {
        excursion_id: excursionId,
        modification_count: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error transitioning to excursion_creation:', error);
    return false;
  }

  return true;
}

export async function transitionToExcursionGuiding(
  sessionId: string,
  excursionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      phase: 'excursion_guiding',
      assistant_type: 'excursion_creator',
      excursion_id: excursionId,
      conversation_metadata: {
        excursion_id: excursionId,
        start_time: new Date().toISOString(),
        current_step: 0,
        completion_percentage: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error transitioning to excursion_guiding:', error);
    return false;
  }

  return true;
}

export async function transitionToPostExcursion(
  sessionId: string,
  excursionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      phase: 'post_excursion_followup',
      assistant_type: 'health_coach',
      conversation_metadata: {
        excursion_id: excursionId,
        completed_at: new Date().toISOString(),
        feedback_collected: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error transitioning to post_excursion_followup:', error);
    return false;
  }

  return true;
}

export async function transitionToInitialChat(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      phase: 'initial_chat',
      assistant_type: 'health_coach',
      excursion_id: null,
      conversation_metadata: {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error transitioning to initial_chat:', error);
    return false;
  }

  return true;
}

export async function updatePhaseMetadata(
  sessionId: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  const { data: session, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('conversation_metadata')
    .eq('id', sessionId)
    .maybeSingle();

  if (fetchError || !session) {
    console.error('Error fetching session for metadata update:', fetchError);
    return false;
  }

  const updatedMetadata = {
    ...(session.conversation_metadata || {}),
    ...metadata,
  };

  const { error: updateError } = await supabase
    .from('chat_sessions')
    .update({
      conversation_metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (updateError) {
    console.error('Error updating phase metadata:', updateError);
    return false;
  }

  return true;
}
