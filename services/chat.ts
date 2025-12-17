import { supabase } from './supabase';
import { aiRun } from './ai-api';
import type { ChatMessage, HealthCoachResult } from '@/types/ai';

export interface ChatSession {
  id: string;
  user_id: string | null;
  assistant_type: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export async function createSession(assistantType = 'health_coach'): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      assistant_type: assistantType,
      title: 'New Conversation',
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
  const { data: existingSessions, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('assistant_type', assistantType)
    .order('updated_at', { ascending: false })
    .limit(1);

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
  content: string
): Promise<StoredMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
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
  conversationHistory: ChatMessage[]
): Promise<{ reply: string; error?: string }> {
  await saveMessage(sessionId, 'user', userMessage);

  const historyForApi: ChatMessage[] = conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const response = await aiRun<HealthCoachResult>({
    action: 'health_coach_message',
    input: { message: userMessage },
    conversation_history: historyForApi,
  });

  if (!response.ok || !response.result) {
    return {
      reply: '',
      error: response.error?.message || 'Failed to get response',
    };
  }

  const assistantReply = response.result.reply;
  await saveMessage(sessionId, 'assistant', assistantReply);

  return { reply: assistantReply };
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
