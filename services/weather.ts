import { supabase } from './supabase';
import Constants from 'expo-constants';

function getEnvVar(key: string): string {
  return (
    process.env[key] ||
    Constants.expoConfig?.extra?.[key] ||
    ''
  );
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials for weather API');
      return null;
    }

    const apiUrl = `${supabaseUrl}/functions/v1/current-weather`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}
