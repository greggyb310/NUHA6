import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { ArrowLeft, MapPin, Clock, Navigation } from 'lucide-react-native';
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

  useEffect(() => {
    loadExcursion();
  }, [id]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#2D3E1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !excursion) {
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

  const userLocation = userLat && userLng
    ? { lat: parseFloat(userLat), lng: parseFloat(userLng) }
    : null;

  const excursionLocation = excursion.route_data?.start_location ||
    excursion.route_data?.waypoints?.[0];

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
        <View style={styles.mapContainer}>
          <MapScreen />
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <MapPin size={20} color="#4A7C2E" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Your Location</Text>
              {userLocation ? (
                <Text style={styles.locationCoords}>
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </Text>
              ) : (
                <Text style={styles.locationCoords}>Not available</Text>
              )}
            </View>
          </View>

          {excursionLocation && (
            <>
              <View style={styles.divider} />
              <View style={styles.locationRow}>
                <Navigation size={20} color="#7FA957" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Excursion Start</Text>
                  <Text style={styles.locationCoords}>
                    {excursionLocation.lat.toFixed(4)}, {excursionLocation.lng.toFixed(4)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

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
            <Text style={styles.sectionTitle}>About This Excursion</Text>
            <Text style={styles.description}>{excursion.description}</Text>
          </View>
        )}

        {excursion.route_data?.steps && excursion.route_data.steps.length > 0 && (
          <View style={styles.stepsCard}>
            <Text style={styles.sectionTitle}>Planned Activities</Text>
            {excursion.route_data.steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <Text style={styles.startButtonText}>View All Excursions</Text>
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
  mapContainer: {
    height: 250,
    backgroundColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  locationCard: {
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#5A6C4A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
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
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 22,
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
    marginBottom: 12,
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
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 20,
    paddingTop: 4,
  },
  startButton: {
    backgroundColor: '#4A7C2E',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
