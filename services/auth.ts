import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

export interface SignUpData {
  username: string;
  password: string;
  email?: string;
}

export interface SignInData {
  username: string;
  password: string;
}

function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@natureup.local`;
}

export async function signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const email = usernameToEmail(data.username);

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to create account' };
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        username: data.username.toLowerCase(),
        email: data.email || null,
      });

    if (profileError) {
      if (profileError.code === '23505') {
        return { user: null, error: 'Username already taken' };
      }
      return { user: null, error: 'Failed to create profile' };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        username: data.username,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function signIn(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const email = usernameToEmail(data.username);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error) {
      return { user: null, error: 'Invalid username or password' };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to sign in' };
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', authData.user.id)
      .single();

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        username: profileData?.username || data.username,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    return null;
  }
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
      });
    } else {
      callback(null);
    }
  });

  return subscription;
}
