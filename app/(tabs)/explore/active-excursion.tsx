import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { supabase } from '@/services/supabase';
import { X, Mic, Navigation as NavigationIcon, MapPin, Clock } from 'lucide-react-native';
import MapScreen from '@/components/map-screen';
import { LoadingScreen } from '@/components/loading-screen';

interface Excursion {
  id: string;
  title: string;
  description: string;
  route_data: {
    steps?: string[];
    start_location?: { lat: number; lng: number };
    destination?: { name: string; lat: number; lng: number };
    waypoints?: Array<{ lat: number; lng: number; name?: string }>;
  };
  duration_minutes: number | null;
  distance_km: number | null;
  difficulty: string | null;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export default function ActiveExcursionScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [excursion, setExcursion] = useState<Excursion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    loadExcursion();
    startLocationTracking();
    startTimer();

    return () => {
      stopLocationTracking();
    };
  }, [id]);

  const loadExcursion = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('excursions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (dbError || !data) {
        setError('Failed to load excursion');
      } else {
        setExcursion(data as Excursion);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading excursion:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setUserLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (excursion?.route_data?.waypoints) {
            const nextWaypoint = excursion.route_data.waypoints[currentStepIndex];
            if (nextWaypoint) {
              const distance = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                nextWaypoint.lat,
                nextWaypoint.lng
              );
              setDistanceToNext(distance);

              if (distance < 0.03) {
                if (currentStepIndex < (excursion.route_data.waypoints.length - 1)) {
                  setCurrentStepIndex(prev => prev + 1);
                }
              }
            }
          }
        }
      );
    } catch (err) {
      console.error('Error starting location tracking:', err);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for voice guidance');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
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
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  };

  const stopVoiceRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri && Platform.OS !== 'web') {
        await processVoiceInput(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsProcessing(false);
    }
  };

  const processVoiceInput = async (audioUri: string) => {
    try {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        const apiResponse = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-chat`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_base64: base64Audio,
              conversation_history: [],
              user_context: {
                excursion_title: title,
                current_step: currentStepIndex + 1,
                total_steps: excursion?.route_data?.steps?.length || 0,
              },
            }),
          }
        );

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data.response_text) {
            setAiResponse(data.response_text);
          }

          if (data.response_audio_base64) {
            await playAudioResponse(data.response_audio_base64);
          }
        }

        setIsProcessing(false);
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error processing voice input:', err);
      setIsProcessing(false);
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${base64Audio}` },
        { shouldPlay: true }
      );

      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  const handleEndExcursion = () => {
    Alert.alert(
      'End Excursion?',
      'Are you sure you want to end this excursion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            stopLocationTracking();
            await supabase
              .from('excursions')
              .update({ completed_at: new Date().toISOString() })
              .eq('id', id);
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingScreen message="Starting your nature experience..." />;
  }

  if (error || !excursion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Excursion not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const steps = excursion.route_data?.steps || [];
  const currentStep = steps[currentStepIndex];
  const waypoints = excursion.route_data?.waypoints || [];
  const nextWaypoint = waypoints[currentStepIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={handleEndExcursion} style={styles.closeButton}>
          <X size={24} color="#C00" />
        </TouchableOpacity>
      </View>

      {userLocation && nextWaypoint && (
        <View style={styles.mapContainer}>
          <MapScreen
            initialRegion={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showUserLocation={true}
            showNearbyPlaces={false}
            destination={{
              latitude: nextWaypoint.lat,
              longitude: nextWaypoint.lng,
              title: `Waypoint ${currentStepIndex + 1}`,
            }}
          />
        </View>
      )}

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStepIndex + 1) / steps.length) * 100}%` }]} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <NavigationIcon size={18} color="#5A6C4A" />
          <Text style={styles.statValue}>{distanceToNext ? `${distanceToNext.toFixed(2)} km` : '--'}</Text>
          <Text style={styles.statLabel}>to next</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={18} color="#5A6C4A" />
          <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.statLabel}>elapsed</Text>
        </View>
        <View style={styles.statItem}>
          <MapPin size={18} color="#5A6C4A" />
          <Text style={styles.statValue}>{currentStepIndex + 1}/{steps.length}</Text>
          <Text style={styles.statLabel}>waypoint</Text>
        </View>
      </View>

      {currentStep && (
        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>Current Activity</Text>
          <Text style={styles.stepText}>{currentStep}</Text>
        </View>
      )}

      {aiResponse && (
        <View style={styles.aiResponseCard}>
          <Text style={styles.aiResponseLabel}>Your Guide Says:</Text>
          <Text style={styles.aiResponseText}>{aiResponse}</Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.voiceButton, (isRecording || isProcessing) && styles.voiceButtonActive]}
          onPressIn={startVoiceRecording}
          onPressOut={stopVoiceRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Mic size={32} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E1F',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  mapContainer: {
    height: 250,
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A7C2E',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A7C2E',
  },
  statLabel: {
    fontSize: 12,
    color: '#5A6C4A',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5A6C4A',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 16,
    color: '#2D3E1F',
    lineHeight: 24,
  },
  aiResponseCard: {
    backgroundColor: '#F5F8F3',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7FA957',
  },
  aiResponseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A7C2E',
    marginBottom: 6,
  },
  aiResponseText: {
    fontSize: 15,
    color: '#2D3E1F',
    lineHeight: 22,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  pauseButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A7C2E',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A7C2E',
  },
  voiceButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#C00',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#C00',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4A7C2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
