import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { supabase } from '@/services/supabase';
import { X, Navigation as NavigationIcon, MapPin, Clock, MessageCircle } from 'lucide-react-native';
import MapScreen from '@/components/map-screen';
import { LoadingScreen } from '@/components/loading-screen';
import { createSession, type ChatSession } from '@/services/chat';
import { EmbeddedChat } from '@/components/embedded-chat';
import { ExcursionFeedback } from '@/components/excursion-feedback';

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
  const [aiResponse, setAiResponse] = useState<string>('');
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [guidingSession, setGuidingSession] = useState<ChatSession | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    initializeGuidingSession();
    loadExcursion();
    startLocationTracking();
    startTimer();

    return () => {
      stopLocationTracking();
    };
  }, [id]);

  const initializeGuidingSession = async () => {
    const session = await createSession('health_coach', 'excursion_guiding', id);
    if (session) {
      setGuidingSession(session);
    }
  };

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

  const handleEndExcursion = () => {
    stopLocationTracking();
    setShowFeedback(true);
  };

  const handleFeedbackComplete = () => {
    setShowFeedback(false);
    router.back();
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

      {guidingSession && (
        <View style={styles.chatCard}>
          <TouchableOpacity
            style={styles.chatToggleButton}
            onPress={() => setShowChat(!showChat)}
            activeOpacity={0.7}
          >
            <MessageCircle size={18} color="#4A7C2E" />
            <Text style={styles.chatToggleText}>
              {showChat ? 'Hide Chat' : 'Chat with Guide'}
            </Text>
          </TouchableOpacity>

          {showChat && (
            <EmbeddedChat
              sessionId={guidingSession.id}
              assistantType="health_coach"
              placeholder="Ask your guide a question..."
            />
          )}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showFeedback} transparent animationType="fade">
        <ExcursionFeedback
          excursionId={id}
          excursionTitle={title}
          startTime={new Date(startTime.current)}
          durationMinutes={Math.round(elapsedTime / 60)}
          distanceKm={excursion?.distance_km || undefined}
          activityType={excursion?.difficulty || 'Walking'}
          onComplete={handleFeedbackComplete}
        />
      </Modal>
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
  chatCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#F5F8F3',
  },
  chatToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A7C2E',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pauseButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A7C2E',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A7C2E',
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
