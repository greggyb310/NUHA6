import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  age: number | null;
  fitness_level: string | null;
  mobility_level: string | null;
  activity_preferences: string[] | null;
  therapy_preferences: string[] | null;
  health_goals: string[] | null;
  preferences: Record<string, unknown> | null;
  risk_tolerance: string | null;
  chat_session_count: number | null;
  created_at: string;
  updated_at: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

export async function createUserProfile(
  userId: string,
  fullName: string,
  healthGoals?: string[]
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      full_name: fullName,
      health_goals: healthGoals || [],
      preferences: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error);
    return null;
  }

  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    email?: string;
    age?: number;
    fitness_level?: string;
    mobility_level?: string;
    activity_preferences?: string[];
    therapy_preferences?: string[];
    health_goals?: string[];
    preferences?: Record<string, unknown>;
    risk_tolerance?: string;
    chat_session_count?: number;
  }
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return data;
}

export async function getOrCreateUserProfile(userId: string, email?: string): Promise<UserProfile | null> {
  let profile = await getUserProfile(userId);

  if (!profile && email) {
    const defaultName = email.split('@')[0];
    const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    profile = await createUserProfile(userId, capitalizedName);
  }

  return profile;
}
