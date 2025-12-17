import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { ArrowLeft, MapPin, Clock, Navigation as NavigationIcon } from 'lucide-react-native';
import { LoadingScreen } from '@/components/loading-screen';
import MapScreen from '@/components/map-screen';

interface Excursion {
  id: string;
  title: string;
  description: string;
  route_data: {
    steps?: string[];
    start_location?: { lat: number; lng: number };
    waypoints?: Array<{ lat: number; lng: number; name?: string }>;
  };
  duration_minutes: number | null;
  distance_km: number | null;
  difficulty: string | null;
  created_at: string;
}

export default function ExcursionDetailScreen() {
  const { id, userLat, userLng } = useLocalSearchParams<{
    id: string;
    userLat: string;
    userLng: string;
  }>();
  const [excursion, setExcursion] = useState<Excursion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    loadExcursion();
  }, [id]);

  useEffect(() => {
    if (!loading && excursion) {
      const timer = setTimeout(() => {
        setContentReady(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, excursion]);

  const loadExcursion = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('excursions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (dbError) {
        setError('Failed to load excursion');
        console.error('Error loading excursion:', dbError);
      } else if (!data) {
        setError('Excursion not found');
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

  if (error || (!excursion && !loading)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#2D3E1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Excursion not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !contentReady) {
    return <LoadingScreen message="Loading your nature experience..." />;
  }

  if (!excursion) {
    return <LoadingScreen message="Loading your nature experience..." />;
  }

  const userLocation = userLat && userLng
    ? { lat: parseFloat(userLat), lng: parseFloat(userLng) }
    : null;

  const excursionLocation = excursion.route_data?.start_location ||
    excursion.route_data?.waypoints?.[0];

  const getFirstSentence = (text: string): string => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences[0] ? sentences[0].trim() + '.' : text;
  };

  const steps = excursion.route_data?.steps || [];
  const previewSteps = stepsExpanded ? steps : steps.slice(0, 3);

  const openDirections = async () => {
    if (!excursionLocation) {
      Alert.alert('Location Unavailable', 'This excursion does not have a location set.');
      return;
    }

    const { lat, lng } = excursionLocation;
    const label = encodeURIComponent(excursion.title);

    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    });

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Unable to open directions');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#2D3E1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {excursion.title}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {excursionLocation && (
          <View style={styles.mapCard}>
            <MapScreen
              initialRegion={{
                latitude: excursionLocation.lat,
                longitude: excursionLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showNearbyPlaces={false}
              destination={{
                latitude: excursionLocation.lat,
                longitude: excursionLocation.lng,
                title: excursion.title,
              }}
            />
          </View>
        )}

        <View style={styles.metricsCard}>
          {excursion.duration_minutes && (
            <View style={styles.metricItem}>
              <Clock size={20} color="#5A6C4A" />
              <Text style={styles.metricValue}>{excursion.duration_minutes}</Text>
              <Text style={styles.metricLabel}>min</Text>
            </View>
          )}

          {excursion.distance_km && (
            <View style={styles.metricItem}>
              <MapPin size={20} color="#5A6C4A" />
              <Text style={styles.metricValue}>{excursion.distance_km.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>km</Text>
            </View>
          )}

          {excursion.difficulty && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{excursion.difficulty}</Text>
            </View>
          )}
        </View>

        {excursion.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.excursionTitle}>{excursion.title}</Text>
            <Text style={styles.excursionDescription}>
              {getFirstSentence(excursion.description)}
            </Text>
          </View>
        )}

        {steps.length > 0 && (
          <View style={styles.stepsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                Activities ({steps.length})
              </Text>
            </View>
            {previewSteps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText} numberOfLines={stepsExpanded ? undefined : 2}>
                  {step}
                </Text>
              </View>
            ))}
            {steps.length > 3 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setStepsExpanded(!stepsExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandButtonText}>
                  {stepsExpanded
                    ? 'Show less'
                    : `Show ${steps.length - 3} more activities`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.directionsButton}
          onPress={openDirections}
        >
          <NavigationIcon size={20} color="#FFFFFF" />
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <Text style={styles.secondaryButtonText}>View All Excursions</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
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
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A7C2E',
  },
  metricLabel: {
    fontSize: 14,
    color: '#5A6C4A',
  },
  difficultyBadge: {
    backgroundColor: '#F5F8F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
    textTransform: 'capitalize',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  excursionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  excursionDescription: {
    fontSize: 15,
    color: '#5A6C4A',
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 21,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A7C2E',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 21,
  },
  expandButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A7C2E',
  },
  stepsCard: {
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
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#5A6C4A',
    lineHeight: 18,
    paddingTop: 5,
  },
  mapCard: {
    height: 350,
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  directionsButton: {
    backgroundColor: '#4A7C2E',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  directionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A7C2E',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A7C2E',
  },
});
