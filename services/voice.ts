import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { ChatMessage } from '@/types/ai';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export interface VoiceRecording {
  uri: string;
  duration: number;
  base64?: string;
}

export interface VoiceResponse {
  transcript: string;
  responseText: string;
  responseAudioBase64: string;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

export async function startRecording(): Promise<Audio.Recording | null> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    });

    await recording.startAsync();
    return recording;
  } catch (error) {
    console.error('Error starting recording:', error);
    return null;
  }
}

export async function stopRecording(recording: Audio.Recording): Promise<VoiceRecording | null> {
  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording.getURI();
    const status = await recording.getStatusAsync();

    if (!uri) {
      return null;
    }

    return {
      uri,
      duration: status.durationMillis || 0,
    };
  } catch (error) {
    console.error('Error stopping recording:', error);
    return null;
  }
}

async function audioUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // iOS/Android: Recording.getURI() returns a file:// URI. FileSystem can read it directly.
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function sendVoiceMessage(
  recording: VoiceRecording,
  conversationHistory: ChatMessage[]
): Promise<VoiceResponse | { error: string }> {
  try {
    const base64Audio = await audioUriToBase64(recording.uri);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/voice-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_base64: base64Audio,
        conversation_history: conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Voice API error: ${response.status} ${errorText}` };
    }

    const data = await response.json();

    if (!data.ok) {
      return { error: data.error?.message || 'Voice processing failed' };
    }

    return {
      transcript: data.transcript,
      responseText: data.response_text,
      responseAudioBase64: data.response_audio_base64,
    };
  } catch (error) {
    console.error('Error sending voice message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function playAudio(base64Audio: string): Promise<Audio.Sound | null> {
  try {
    const audioUri = `data:audio/mp3;base64,${base64Audio}`;
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true }
    );
    return sound;
  } catch (error) {
    console.error('Error playing audio:', error);
    return null;
  }
}

export function base64ToDataUri(base64Audio: string): string {
  return `data:audio/mp3;base64,${base64Audio}`;
}
