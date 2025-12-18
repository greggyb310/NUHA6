import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';
import { getCurrentWeather, type WeatherData } from '@/services/weather';
import { getExcursionPlan } from '@/services/ai';
import { searchNatureSpotsNearby } from '@/services/nature-spots';
import { LoadingScreen } from '@/components/loading-screen';
import MinimalWeather from '@/components/minimal-weather';
import type { ParsedIntent } from '@/types/intent';

const ACTIVITY_OPTIONS = [
  'Walking',
  'Hiking',
  'Meditation',
  'Birdwatching',
  'Photography',
  'Forest Bathing',
  'Yoga',
  'Running',
];

const THERAPEUTIC_OPTIONS = [
  'Stress Relief',
  'Anxiety Reduction',
  'Mood Enhancement',
  'Sleep Improvement',
  'Focus & Clarity',
  'Energy Boost',
  'Pain Management',
  'Mindfulness',
];

const RISK_TOLERANCE_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Safe and easy paths' },
  { value: 'medium', label: 'Medium', description: 'Some challenge' },
  { value: 'high', label: 'High', description: 'Adventurous routes' },
];

const ENERGY_LEVELS = [
  { value: 'low', label: 'Low - Gentle pace' },
  { value: 'medium', label: 'Medium - Moderate activity' },
  { value: 'high', label: 'High - Vigorous activity' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export default function CreateScreen() {
  const params = useLocalSearchParams();
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedTherapeutic, setSelectedTherapeutic] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<string>('medium');
  const [energyLevel, setEnergyLevel] = useState<string>('medium');
  const [duration, setDuration] = useState<number>(30);
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);
  const [showEnergyDropdown, setShowEnergyDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showActivityOptions, setShowActivityOptions] = useState(false);
  const [showTherapeuticOptions, setShowTherapeuticOptions] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.intentData) {
      try {
        const intent = JSON.parse(params.intentData as string) as ParsedIntent;
        setParsedIntent(intent);

        if (intent.durationMinutes) {
          setDuration(intent.durationMinutes);
        }

        if (intent.activities && intent.activities.length > 0) {
          setSelectedActivities(intent.activities);
        }

        if (intent.therapeuticGoals && intent.therapeuticGoals.length > 0) {
          const mappedGoals = intent.therapeuticGoals.map(goal => {
            const titleCase = goal.split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            const goalMap: Record<string, string> = {
              'Reduce Stress': 'Stress Relief',
              'Improve Mood': 'Mood Enhancement',
              'Boost Energy': 'Energy Boost',
              'Improve Sleep': 'Sleep Improvement',
              'Increase Focus': 'Focus & Clarity',
              'Relax': 'Stress Relief',
            };
            return goalMap[titleCase] || titleCase;
          });
          setSelectedTherapeutic(mappedGoals);
        }

        if (intent.difficulty) {
          setRiskTolerance(intent.difficulty === 'easy' ? 'low' : intent.difficulty === 'hard' ? 'high' : 'medium');
        }
      } catch (e) {
        console.error('Failed to parse intent:', e);
      }
    }
  }, [params.intentData]);

  useEffect(() => {
    loadUserPreferences();
    loadWeather();
  }, []);

  const loadUserPreferences = async () => {
    if (params.intentData) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('activity_preferences, risk_tolerance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.activity_preferences) {
        setSelectedActivities(data.activity_preferences);
      }
      if (data?.risk_tolerance) {
        setRiskTolerance(data.risk_tolerance);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeatherLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);

      const weatherData = await getCurrentWeather(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      setWeather(weatherData);
      setWeatherLoading(false);
    } catch (error) {
      console.error('Error loading weather:', error);
      setWeatherLoading(false);
    }
  };

  const toggleActivity = async (activity: string) => {
    const newActivities = selectedActivities.includes(activity)
      ? selectedActivities.filter(a => a !== activity)
      : [...selectedActivities, activity];

    setSelectedActivities(newActivities);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_profiles')
        .update({ activity_preferences: newActivities })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const toggleTherapeutic = (option: string) => {
    const newOptions = selectedTherapeutic.includes(option)
      ? selectedTherapeutic.filter(o => o !== option)
      : [...selectedTherapeutic, option];

    setSelectedTherapeutic(newOptions);
  };

  const updateRiskTolerance = async (value: string) => {
    setRiskTolerance(value);
    setShowRiskDropdown(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_profiles')
        .update({ risk_tolerance: value })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving risk tolerance:', error);
    }
  };

  const handleCreateExcursion = async () => {
    Keyboard.dismiss();

    if (!location) {
      setError('Location not available. Please enable location permissions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const perfStart = Date.now();
      const perfMarks: Record<string, number> = {};
      const mark = (label: string) => {
        perfMarks[label] = Date.now();
        console.log(`[PERF] ${label}: ${Date.now() - perfStart}ms`);
      };

      console.log('Starting excursion creation...');
      mark('start');

      const { data: { user } } = await supabase.auth.getUser();
      mark('auth_complete');
      if (!user) {
        setError('Please sign in to create an excursion.');
        setLoading(false);
        return;
      }

      console.log('User authenticated, fetching nearby places...');
      const nearbyResult = await searchNatureSpotsNearby(
        location.coords.latitude,
        location.coords.longitude,
        5
      );
      mark('places_fetched');

      const nearbyPlaces = nearbyResult.places.map(place => ({
        name: place.name,
        lat: place.latitude,
        lng: place.longitude,
        type: place.type,
        difficulty: place.difficulty,
        star_rating: place.star_rating,
      }));

      console.log('Found nearby places:', nearbyPlaces.length);

      if (nearbyPlaces.length === 0) {
        setError('No nearby nature spots found. Do you know anywhere we can do this? Try moving to a different location or adjusting your preferences.');
        setLoading(false);
        return;
      }

      const preferences = {
        activities: selectedActivities,
        therapeutic: selectedTherapeutic,
        riskTolerance,
        energyLevel,
        additionalNotes: additionalNotes.trim() || undefined,
        weather: weather ? {
          temp: weather.temperature,
          condition: weather.description,
        } : undefined,
      };

      console.log('Calling AI to create excursion plan...');
      const result = await getExcursionPlan({
        userLocation: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        durationMinutes: duration,
        preferences,
        nearbyPlaces,
      });
      mark('ai_complete');

      console.log('AI result:', result);

      if (!result.ok || !result.result) {
        const errorMsg = result.error?.message || 'Failed to create excursion. Please try again.';
        console.error('AI error:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const excursionData = result.result;
      console.log('Excursion data:', excursionData);

      if (!excursionData.destination) {
        setError('Could not determine a destination. Please try again with different preferences.');
        setLoading(false);
        return;
      }

      const startLat = location.coords.latitude;
      const startLng = location.coords.longitude;
      const destLat = excursionData.destination.lat;
      const destLng = excursionData.destination.lng;

      const generateRouteToDestination = (
        startLat: number,
        startLng: number,
        endLat: number,
        endLng: number,
        points: number = 8
      ) => {
        const waypoints = [];
        for (let i = 0; i <= points; i++) {
          const progress = i / points;
          const lat = startLat + (endLat - startLat) * progress;
          const lng = startLng + (endLng - startLng) * progress;
          waypoints.push({ lat, lng });
        }
        return waypoints;
      };

      const routeWaypoints = generateRouteToDestination(startLat, startLng, destLat, destLng, 8);

      console.log('Saving to database...');
      const { data: insertedData, error: dbError } = await supabase
        .from('excursions')
        .insert({
          user_id: user.id,
          title: excursionData.title,
          description: excursionData.description,
          route_data: {
            steps: excursionData.steps,
            start_location: {
              lat: startLat,
              lng: startLng,
            },
            destination: {
              name: excursionData.destination.name,
              lat: destLat,
              lng: destLng,
            },
            waypoints: routeWaypoints,
          },
          duration_minutes: excursionData.duration_minutes || duration,
          distance_km: excursionData.distance_km,
          difficulty: excursionData.difficulty,
        })
        .select('id')
        .single();

      if (dbError || !insertedData) {
        console.error('Database error:', dbError);
        setError('Created excursion but failed to save. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Excursion saved with ID:', insertedData.id);
      mark('db_saved');

      const totalTime = Date.now() - perfStart;
      console.log(`[PERF] Total excursion creation time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
      console.log('[PERF] Breakdown:', JSON.stringify(perfMarks, null, 2));

      setLoading(false);

      console.log('Navigating to detail page...');
      setTimeout(() => {
        router.push({
          pathname: '/(tabs)/explore/excursion-detail',
          params: {
            id: insertedData.id,
            userLat: location.coords.latitude.toString(),
            userLng: location.coords.longitude.toString(),
          },
        });
      }, 100);
    } catch (err) {
      console.error('Error creating excursion:', err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading && (
        <LoadingScreen message="Creating your personalized nature experience... This might take a minute..." />
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Excursion</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
        <MinimalWeather weather={weather} loading={weatherLoading} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDurationDropdown(!showDurationDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {DURATION_OPTIONS.find(opt => opt.value === duration)?.label}
            </Text>
            <Text style={styles.dropdownArrow}>{showDurationDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDurationDropdown && (
            <View style={styles.dropdownMenu}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setDuration(option.value);
                    setShowDurationDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    duration === option.value && styles.dropdownItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Level</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowEnergyDropdown(!showEnergyDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {ENERGY_LEVELS.find(lvl => lvl.value === energyLevel)?.label}
            </Text>
            <Text style={styles.dropdownArrow}>{showEnergyDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showEnergyDropdown && (
            <View style={styles.dropdownMenu}>
              {ENERGY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setEnergyLevel(level.value);
                    setShowEnergyDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    energyLevel === level.value && styles.dropdownItemTextSelected
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Tolerance</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowRiskDropdown(!showRiskDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {RISK_TOLERANCE_OPTIONS.find(opt => opt.value === riskTolerance)?.label} - {RISK_TOLERANCE_OPTIONS.find(opt => opt.value === riskTolerance)?.description}
            </Text>
            <Text style={styles.dropdownArrow}>{showRiskDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showRiskDropdown && (
            <View style={styles.dropdownMenu}>
              {RISK_TOLERANCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownItem}
                  onPress={() => updateRiskTolerance(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    riskTolerance === option.value && styles.dropdownItemTextSelected
                  ]}>
                    {option.label} - {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Preferences</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowActivityOptions(!showActivityOptions)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {selectedActivities.length > 0
                ? `${selectedActivities.length} selected: ${selectedActivities.slice(0, 2).join(', ')}${selectedActivities.length > 2 ? '...' : ''}`
                : 'Tap to select activities'}
            </Text>
            <Text style={styles.dropdownArrow}>{showActivityOptions ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showActivityOptions && (
            <View style={styles.expandedSection}>
              <View style={styles.chipContainer}>
                {ACTIVITY_OPTIONS.map((activity) => (
                  <TouchableOpacity
                    key={activity}
                    style={[
                      styles.chip,
                      selectedActivities.includes(activity) && styles.chipSelected,
                    ]}
                    onPress={() => toggleActivity(activity)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedActivities.includes(activity) && styles.chipTextSelected,
                      ]}
                    >
                      {activity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Therapeutic Goals</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTherapeuticOptions(!showTherapeuticOptions)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {selectedTherapeutic.length > 0
                ? `${selectedTherapeutic.length} selected: ${selectedTherapeutic.slice(0, 2).join(', ')}${selectedTherapeutic.length > 2 ? '...' : ''}`
                : 'Tap to select goals'}
            </Text>
            <Text style={styles.dropdownArrow}>{showTherapeuticOptions ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showTherapeuticOptions && (
            <View style={styles.expandedSection}>
              <View style={styles.chipContainer}>
                {THERAPEUTIC_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.chip,
                      selectedTherapeutic.includes(option) && styles.chipSelected,
                    ]}
                    onPress={() => toggleTherapeutic(option)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedTherapeutic.includes(option) && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Anything else I should know?</Text>
          <TextInput
            style={styles.notesInput}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
            placeholder="Add any special requests or considerations..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{additionalNotes.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateExcursion}
          disabled={loading || selectedActivities.length === 0}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Experience</Text>
          )}
        </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#5A6C4A',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3E1F',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#5A6C4A',
    marginLeft: 8,
  },
  dropdownMenu: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F8F3',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#2D3E1F',
  },
  dropdownItemTextSelected: {
    color: '#4A7C2E',
    fontWeight: '700',
  },
  expandedSection: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  createButton: {
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4A7C2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEE',
    borderWidth: 1,
    borderColor: '#FCC',
  },
  errorText: {
    fontSize: 14,
    color: '#C00',
    textAlign: 'center',
  },
  notesSection: {
    marginTop: 24,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2D3E1F',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
});
