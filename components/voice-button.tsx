import { useState, useEffect } from 'react';
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

export function VoiceButton({ onRecordingComplete, disabled }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

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
      const result = await stopRecording(recording);
      setIsRecording(false);
      setRecording(null);

      if (result) {
        onRecordingComplete(result);
      }
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
          <MicOff size={24} color="#FFFFFF" />
        ) : (
          <Mic size={24} color={disabled ? '#9CA3AF' : '#FFFFFF'} />
        )}
      </TouchableOpacity>
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRecording: {
    backgroundColor: '#DC2626',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
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
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
});
