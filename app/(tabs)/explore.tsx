import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { LoadingScreen } from '@/components/loading-screen';

interface Excursion {
  id: string;
  title: string;
  description: string;
  duration_minutes: number | null;
  distance_km: number | null;
  difficulty: string | null;
  created_at: string;
  completed_at: string | null;
  route_data: {
    start_location?: { lat: number; lng: number };
  };
}

export default function ExploreScreen() {
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExcursions();
  }, []);

  const loadExcursions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to view your excursions');
        setLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('excursions')
        .select('id, title, description, duration_minutes, distance_km, difficulty, created_at, completed_at, route_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) {
        setError('Failed to load excursions');
        console.error('Error loading excursions:', dbError);
      } else {
        setExcursions(data || []);
        setError(null);
      }

      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error loading excursions:', err);
      setError('An unexpected error occurred');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExcursions();
  };

  if (loading) {
    return <LoadingScreen message="Loading your excursions..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Excursions</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A7C2E" />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {excursions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No excursions yet</Text>
            <Text style={styles.emptyText}>
              Create your first nature experience in the Create tab
            </Text>
          </View>
        ) : (
          excursions.map((excursion) => (
            <TouchableOpacity
              key={excursion.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const location = excursion.route_data?.start_location;
                router.push({
                  pathname: '/excursion-detail',
                  params: {
                    id: excursion.id,
                    userLat: location?.lat.toString() || '0',
                    userLng: location?.lng.toString() || '0',
                  },
                });
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{excursion.title}</Text>
                {excursion.completed_at && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>

              {excursion.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {excursion.description}
                </Text>
              )}

              <View style={styles.cardMetrics}>
                {excursion.duration_minutes && (
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{excursion.duration_minutes}</Text>
                    <Text style={styles.metricLabel}>min</Text>
                  </View>
                )}

                {excursion.distance_km && (
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {excursion.distance_km.toFixed(1)}
                    </Text>
                    <Text style={styles.metricLabel}>km</Text>
                  </View>
                )}

                {excursion.difficulty && (
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>
                      {excursion.difficulty}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardDate}>
                Created {new Date(excursion.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEE',
    borderWidth: 1,
    borderColor: '#FCC',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#C00',
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#5A6C4A',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    flex: 1,
  },
  completedBadge: {
    backgroundColor: '#4A7C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 14,
    color: '#5A6C4A',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A7C2E',
  },
  metricLabel: {
    fontSize: 12,
    color: '#5A6C4A',
  },
  difficultyBadge: {
    backgroundColor: '#F5F8F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6C4A',
    textTransform: 'capitalize',
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
