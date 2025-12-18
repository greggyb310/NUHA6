export async function textToSpeech(text: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
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
