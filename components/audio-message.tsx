import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface AudioMessageProps {
  audioBase64: string;
  transcript: string;
  duration?: number;
  isUser?: boolean;
}

export function AudioMessage({ audioBase64, transcript, duration, isUser }: AudioMessageProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);

  useEffect(() => {
    setupAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up audio in AudioMessage:', error);
    }
  };

  const handlePlayPause = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const audioUri = `data:audio/mp3;base64,${audioBase64}`;
        console.log('Creating audio from base64, length:', audioBase64.length);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
        console.log('Audio playback started');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis || 0);
      setPlaybackDuration(status.durationMillis || playbackDuration);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View style={styles.container}>
      <View style={styles.audioControls}>
        <TouchableOpacity
          style={[styles.playButton, isUser && styles.playButtonUser]}
          onPress={handlePlayPause}
        >
          {isPlaying ? (
            <Pause size={16} color={isUser ? '#FFFFFF' : '#4A7C2E'} />
          ) : (
            <Play size={16} color={isUser ? '#FFFFFF' : '#4A7C2E'} />
          )}
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, isUser && styles.progressBarUser]}>
            <View
              style={[
                styles.progressFill,
                isUser ? styles.progressFillUser : styles.progressFillAssistant,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.timeText, isUser && styles.timeTextUser]}>
            {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
          </Text>
        </View>
      </View>

      {transcript && (
        <Text style={[styles.transcript, isUser && styles.transcriptUser]}>
          {transcript}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 124, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(74, 124, 46, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressFillAssistant: {
    backgroundColor: '#4A7C2E',
  },
  progressFillUser: {
    backgroundColor: '#FFFFFF',
  },
  timeText: {
    fontSize: 11,
    color: '#5A6C4A',
  },
  timeTextUser: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  transcript: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3E1F',
  },
  transcriptUser: {
    color: '#FFFFFF',
  },
});
