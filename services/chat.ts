import { supabase } from './supabase';
import { aiRun } from './ai-api';
import { sendVoiceMessage as sendVoiceToApi, base64ToDataUri } from './voice';
import { getUserProfile } from './user-profile';
import type { ChatMessage, HealthCoachResult } from '@/types/ai';

export type ConversationPhase = 'initial_chat' | 'excursion_creation' | 'excursion_guiding' | 'post_excursion_followup';

export interface ChatSession {
  id: string;
  user_id: string | null;
  assistant_type: string;
  title: string;
  phase: ConversationPhase;
  conversation_metadata: Record<string, unknown>;
  excursion_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  message_type?: 'text' | 'voice';
  audio_url?: string;
  audio_duration_ms?: number;
  transcript?: string;
}

export async function createSession(
  assistantType = 'health_coach',
  phase: ConversationPhase = 'initial_chat',
  excursionId?: string
): Promise<ChatSession | null> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      assistant_type: assistantType,
      title: 'New Conversation',
      user_id: user?.id || null,
      phase,
      conversation_metadata: {},
      excursion_id: excursionId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return data;
}

export async function getOrCreateSession(assistantType = 'health_coach'): Promise<ChatSession | null> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('chat_sessions')
    .select('*')
    .eq('assistant_type', assistantType)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }

  const { data: existingSessions, error: fetchError } = await query;

  if (fetchError) {
    console.error('Error fetching sessions:', fetchError);
    return null;
  }

  if (existingSessions && existingSessions.length > 0) {
    return existingSessions[0];
  }

  return createSession(assistantType);
}

export async function getSessionMessages(sessionId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
}

export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  audioMetadata?: {
    messageType?: 'text' | 'voice';
    audioUrl?: string;
    audioDurationMs?: number;
    transcript?: string;
  }
): Promise<StoredMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      message_type: audioMetadata?.messageType || 'text',
      audio_url: audioMetadata?.audioUrl,
      audio_duration_ms: audioMetadata?.audioDurationMs,
      transcript: audioMetadata?.transcript,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }

  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return data;
}

export async function sendMessage(
  sessionId: string,
  userMessage: string,
  conversationHistory: ChatMessage[],
  assistantType?: string,
  onProgress?: (partialReply: string) => void,
  contextMetadata?: Record<string, unknown>
): Promise<{ reply: string; readyToCreate?: boolean; error?: string }> {
  await saveMessage(sessionId, 'user', userMessage);

  const { data: sessionRow, error: sessionErr } = await supabase
    .from('chat_sessions')
    .select('assistant_type, phase, conversation_metadata')
    .eq('id', sessionId)
    .maybeSingle();

  if (!assistantType) {
    if (!sessionErr && sessionRow?.assistant_type) {
      assistantType = sessionRow.assistant_type;
    } else {
      assistantType = 'health_coach';
    }
  }

  const phase = sessionRow?.phase || 'initial_chat';
  const sessionMetadata = sessionRow?.conversation_metadata || {};

  const historyForApi: ChatMessage[] = conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const { data: { user } } = await supabase.auth.getUser();
  let userContext: Record<string, unknown> = {
    phase,
    session_metadata: sessionMetadata,
  };

  if (user) {
    const profile = await getUserProfile(user.id);
    if (profile) {
      userContext = {
        ...userContext,
        activity_preferences: profile.activity_preferences || [],
        therapy_preferences: profile.therapy_preferences || [],
        health_goals: profile.health_goals || [],
        fitness_level: profile.fitness_level,
        mobility_level: profile.mobility_level,
      };
    }
  }

  if (contextMetadata) {
    userContext = { ...userContext, ...contextMetadata };
  }

  const action = assistantType === 'excursion_creator' ? 'excursion_creator_message' : 'health_coach_message';

  const response = await aiRun<HealthCoachResult & { readyToCreate?: boolean }>({
    action,
    input: { message: userMessage },
    context: userContext,
    conversation_history: historyForApi,
  });

  if (!response.ok || !response.result) {
    return {
      reply: '',
      error: response.error?.message || 'Failed to get response',
    };
  }

  const assistantReply = response.result.reply;
  const readyToCreate = response.result.readyToCreate;
  const askedConfirmation = (response.result as any).askedConfirmation;

  if (askedConfirmation !== undefined) {
    const updatedMetadata = {
      ...sessionMetadata,
      asked_confirmation: askedConfirmation,
    };

    await supabase
      .from('chat_sessions')
      .update({ conversation_metadata: updatedMetadata })
      .eq('id', sessionId);
  }

  await saveMessage(sessionId, 'assistant', assistantReply);

  return { reply: assistantReply, readyToCreate };
}

export async function sendVoiceMessage(
  sessionId: string,
  recording: { uri: string; duration: number },
  conversationHistory: ChatMessage[]
): Promise<{
  transcript: string;
  reply: string;
  replyAudioBase64?: string;
  error?: string;
}> {
  const historyForApi: ChatMessage[] = conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const { data: { user } } = await supabase.auth.getUser();
  let userContext = {};

  if (user) {
    const profile = await getUserProfile(user.id);
    if (profile) {
      userContext = {
        activity_preferences: profile.activity_preferences || [],
        therapy_preferences: profile.therapy_preferences || [],
        health_goals: profile.health_goals || [],
        fitness_level: profile.fitness_level,
        mobility_level: profile.mobility_level,
      };
    }
  }

  const voiceResult = await sendVoiceToApi(recording, historyForApi, userContext);

  if ('error' in voiceResult) {
    return {
      transcript: '',
      reply: '',
      error: voiceResult.error,
    };
  }

  await saveMessage(sessionId, 'user', voiceResult.transcript, {
    messageType: 'voice',
    transcript: voiceResult.transcript,
    audioDurationMs: recording.duration,
  });

  const audioDataUri = base64ToDataUri(voiceResult.responseAudioBase64);
  await saveMessage(sessionId, 'assistant', voiceResult.responseText, {
    messageType: 'voice',
    audioUrl: audioDataUri,
    transcript: voiceResult.responseText,
  });

  return {
    transcript: voiceResult.transcript,
    reply: voiceResult.responseText,
    replyAudioBase64: voiceResult.responseAudioBase64,
  };
}

export async function updateSessionPhase(
  sessionId: string,
  phase: ConversationPhase
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session phase:', error);
    return false;
  }

  return true;
}

export async function updateSessionMetadata(
  sessionId: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  const { data: session, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('conversation_metadata')
    .eq('id', sessionId)
    .maybeSingle();

  if (fetchError || !session) {
    console.error('Error fetching session:', fetchError);
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
    console.error('Error updating session metadata:', updateError);
    return false;
  }

  return true;
}

export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  return data;
}

export async function clearSession(sessionId: string): Promise<boolean> {
  const { error: messagesError } = await supabase
    .from('chat_messages')
    .delete()
    .eq('session_id', sessionId);

  if (messagesError) {
    console.error('Error clearing messages:', messagesError);
    return false;
  }

  const { error: sessionError } = await supabase
    .from('chat_sessions')
    .update({ title: 'New Conversation', updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('Error updating session:', sessionError);
    return false;
  }

  return true;
}
