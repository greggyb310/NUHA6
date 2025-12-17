import { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Platform } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { Audio } from 'expo-av';
import {
  requestMicrophonePermission,
  startRecording,
  stopRecording,
  type VoiceRecording,
} from '@/services/voice';

interface VoiceButtonProps {
  onRecordingComplete: (recording: VoiceRecording) => void;
  disabled?: boolean;
}

const MAX_RECORDING_DURATION_MS = 60000;
const COUNTDOWN_START_MS = 45000;

export function VoiceButton({ onRecordingComplete, disabled }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === 'web') {
      setHasPermission(true);
      return;
    }

    const granted = await requestMicrophonePermission();
    setHasPermission(granted);
    if (!granted) {
      setPermissionError(true);
    }
  };

  const handleStopRecording = useCallback(async () => {
    if (!recording) return;

    const result = await stopRecording(recording);
    setIsRecording(false);
    setRecording(null);
    setElapsedMs(0);

    if (result) {
      onRecordingComplete(result);
    }
  }, [recording, onRecordingComplete]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRecording) {
      setElapsedMs(0);
      interval = setInterval(() => {
        setElapsedMs((prev) => {
          const next = prev + 100;
          if (next >= MAX_RECORDING_DURATION_MS) {
            handleStopRecording();
            return MAX_RECORDING_DURATION_MS;
          }
          return next;
        });
      }, 100);
    } else {
      setElapsedMs(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, handleStopRecording]);

  const handlePress = async () => {
    if (disabled) return;

    if (!hasPermission) {
      const granted = await requestMicrophonePermission();
      setHasPermission(granted);
      if (!granted) {
        setPermissionError(true);
        return;
      }
    }

    if (isRecording && recording) {
      await handleStopRecording();
    } else {
      const newRecording = await startRecording();
      if (newRecording) {
        setRecording(newRecording);
        setIsRecording(true);
        setPermissionError(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled}
      >
        {isRecording ? (
          <MicOff size={22} color="#FFFFFF" />
        ) : (
          <Mic size={22} color={disabled ? '#9CA3AF' : '#FFFFFF'} />
        )}
        {isRecording && <View style={styles.recordingIndicator} />}
      </TouchableOpacity>
      {permissionError && !isRecording && (
        <Text style={styles.errorText}>Microphone access denied</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonRecording: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  recordingIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  recordingText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
});
