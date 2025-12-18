import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

function getEnvVar(key: string): string {
  const value =
    process.env[key] ||
    Constants.expoConfig?.extra?.[key] ||
    '';
  return value;
}

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase initialization failed');
  console.error('URL available:', !!supabaseUrl);
  console.error('Key available:', !!supabaseAnonKey);
  console.error('Constants.expoConfig:', Constants.expoConfig?.extra);
  console.error('process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
