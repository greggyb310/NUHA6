import Constants from 'expo-constants';

function getEnvVar(key: string): string {
  return (
    process.env[key] ||
    Constants.expoConfig?.extra?.[key] ||
    ''
  );
}

export async function textToSpeech(text: string): Promise<string | null> {
  try {
    const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials for TTS');
      throw new Error('Missing Supabase environment variables');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/text-to-speech`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      console.error('TTS API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.audio_base64 || null;
  } catch (error) {
    console.error('Error in TTS:', error);
    return null;
  }
}

export function base64ToDataUri(base64: string): string {
  return `data:audio/mp3;base64,${base64}`;
}
