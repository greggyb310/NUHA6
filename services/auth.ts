import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
}

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export async function signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to create account' };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
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
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to sign in' };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
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
