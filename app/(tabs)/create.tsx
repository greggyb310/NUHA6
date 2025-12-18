import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { ChevronDown, Check, Sun, CloudRain, Cloud, Wind, MapPin, Sparkles } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { getCurrentWeather, type WeatherData } from '@/services/weather';
import { getExcursionPlan } from '@/services/ai';
import { searchNatureSpotsNearby } from '@/services/nature-spots';
import { getCachedLocationData } from '@/services/location-preload';
import { LoadingScreen } from '@/components/loading-screen';

const ENERGY_LEVEL_OPTIONS = [
  { value: 'low', label: 'Low - Gentle pace' },
  { value: 'medium', label: 'Medium - Moderate activity' },
  { value: 'high', label: 'High - Push yourself' },
];

const RISK_TOLERANCE_OPTIONS = [
  { value: 'low', label: 'Low - Stay safe' },
  { value: 'medium', label: 'Medium - Some challenge' },
  { value: 'high', label: 'High - Adventure awaits' },
];

const ACTIVITY_OPTIONS = [
  'Walking',
  'Hiking',
  'Trail Running',
  'Meditation',
  'Forest Bathing',
  'Photography',
  'Bird Watching',
  'Nature Journaling',
];

const THERAPEUTIC_OPTIONS = [
  'Stress Relief',
  'Mental Clarity',
  'Energy Boost',
  'Mindfulness',
  'Grounding',
  'Creativity',
  'Physical Wellness',
  'Emotional Balance',
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

function getSearchRadiusForDuration(durationMinutes: number): number {
  if (durationMinutes <= 15) return 3;
  if (durationMinutes <= 30) return 5;
  if (durationMinutes <= 60) return 10;
  if (durationMinutes <= 90) return 15;
  return 20;
}

type ModalType = 'energyLevel' | 'riskTolerance' | 'duration' | 'activities' | 'therapeutic' | null;
type LocationChoice = 'suggest' | 'custom' | null;

export default function CreateExcursionScreen() {
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [riskTolerance, setRiskTolerance] = useState('medium');
  const [duration, setDuration] = useState(30);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedTherapeutic, setSelectedTherapeutic] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationChoice, setLocationChoice] = useState<LocationChoice>(null);
  const [customLocationName, setCustomLocationName] = useState('');

  useEffect(() => {
    loadLocationAndWeather();
  }, []);

  const loadLocationAndWeather = async () => {
    try {
      const cachedData = getCachedLocationData();

      if (cachedData) {
        setLocation(cachedData.location);
        setLoadingWeather(true);
        const weatherData = await getCurrentWeather(
          cachedData.location.coords.latitude,
          cachedData.location.coords.longitude
        );
        setWeather(weatherData);
        setLoadingWeather(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed for suggestions. You can still enter a custom location.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);

      setLoadingWeather(true);
      const weatherData = await getCurrentWeather(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
      setWeather(weatherData);
      setLoadingWeather(false);
    } catch (err) {
      console.error('Error loading location:', err);
      setError('Unable to get your location. You can still enter a custom location.');
      setLoadingWeather(false);
    }
  };

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter((a) => a !== activity));
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const toggleTherapeutic = (goal: string) => {
    if (selectedTherapeutic.includes(goal)) {
      setSelectedTherapeutic(selectedTherapeutic.filter((g) => g !== goal));
    } else {
      setSelectedTherapeutic([...selectedTherapeutic, goal]);
    }
  };

  const getEnergyLevelLabel = () => {
    return ENERGY_LEVEL_OPTIONS.find((e) => e.value === energyLevel)?.label || 'Select energy level';
  };

  const getRiskToleranceLabel = () => {
    return RISK_TOLERANCE_OPTIONS.find((r) => r.value === riskTolerance)?.label || 'Select risk tolerance';
  };

  const getDurationLabel = () => {
    return DURATION_OPTIONS.find((d) => d.value === duration)?.label || 'Select duration';
  };

  const getActivitiesLabel = () => {
    if (selectedActivities.length === 0) return 'Tap to select activities';
    if (selectedActivities.length === 1) return selectedActivities[0];
    return `${selectedActivities.length} selected: ${selectedActivities.slice(0, 2).join(', ')}${selectedActivities.length > 2 ? '...' : ''}`;
  };

  const getTherapeuticLabel = () => {
    if (selectedTherapeutic.length === 0) return 'Tap to select goals';
    if (selectedTherapeutic.length === 1) return selectedTherapeutic[0];
    return `${selectedTherapeutic.length} selected`;
  };

  const getWeatherIcon = () => {
    if (!weather) return <Sun size={32} color="#F59E0B" />;
    const condition = weather.description.toLowerCase();
    if (condition.includes('rain')) return <CloudRain size={32} color="#3B82F6" />;
    if (condition.includes('cloud')) return <Cloud size={32} color="#6B7280" />;
    if (condition.includes('wind')) return <Wind size={32} color="#6B7280" />;
    return <Sun size={32} color="#F59E0B" />;
  };

  const handleCreate = async () => {
    if (locationChoice === 'custom' && !customLocationName.trim()) {
      setError('Please enter a location name.');
      return;
    }

    if (locationChoice === 'suggest' && !location) {
      setError('Location is required. Please allow location access or enter a custom location.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to create an excursion.');
        setCreating(false);
        return;
      }

      let nearbyPlaces: Array<{
        name: string;
        lat: number;
        lng: number;
        type: string;
        difficulty?: string;
        star_rating?: number;
      }> = [];

      if (locationChoice === 'custom') {
        nearbyPlaces = [{
          name: customLocationName.trim(),
          lat: location?.coords.latitude || 0,
          lng: location?.coords.longitude || 0,
          type: 'custom',
        }];
      } else if (location) {
        const searchRadius = getSearchRadiusForDuration(duration);
        const nearbyResult = await searchNatureSpotsNearby(
          location.coords.latitude,
          location.coords.longitude,
          searchRadius
        );

        nearbyPlaces = nearbyResult.places?.map((place) => ({
          name: place.name,
          lat: place.latitude,
          lng: place.longitude,
          type: place.type,
          difficulty: place.difficulty,
          star_rating: place.star_rating,
        })) || [];

        if (nearbyPlaces.length === 0) {
          setError("I couldn't find any nature spots nearby. Do you know somewhere we can go? Enter a location name below.");
          setLocationChoice('custom');
          setCreating(false);
          return;
        }
      }

      const result = await getExcursionPlan({
        userLocation: location ? {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        } : { lat: 0, lng: 0 },
        durationMinutes: duration,
        preferences: {
          activities: selectedActivities,
          therapeutic: selectedTherapeutic,
          riskTolerance: riskTolerance,
          energyLevel: energyLevel,
          additionalNotes: locationChoice === 'custom'
            ? `User wants to go to: ${customLocationName}. ${additionalNotes}`
            : additionalNotes,
          weather: weather ? {
            temp: weather.temperature,
            condition: weather.description,
          } : undefined,
        },
        nearbyPlaces,
      });

      if (!result.ok || !result.result || !result.result.destination) {
        setError('Unable to create excursion. Please try again.');
        setCreating(false);
        return;
      }

      const excursionData = result.result;
      const destination = excursionData.destination!;
      const startLat = location?.coords.latitude || destination.lat;
      const startLng = location?.coords.longitude || destination.lng;
      const destLat = destination.lat;
      const destLng = destination.lng;

      const routeWaypoints = [];
      for (let i = 0; i <= 8; i++) {
        const progress = i / 8;
        routeWaypoints.push({
          lat: startLat + (destLat - startLat) * progress,
          lng: startLng + (destLng - startLng) * progress,
        });
      }

      const { data: insertedData, error: dbError } = await supabase
        .from('excursions')
        .insert({
          user_id: user.id,
          title: excursionData.title,
          description: excursionData.description,
          route_data: {
            steps: excursionData.steps,
            start_location: { lat: startLat, lng: startLng },
            destination: {
              name: destination.name,
              lat: destLat,
              lng: destLng,
            },
            waypoints: routeWaypoints,
          },
          duration_minutes: excursionData.duration_minutes || duration,
          distance_km: excursionData.distance_km,
          difficulty: energyLevel,
        })
        .select('id')
        .single();

      if (dbError || !insertedData) {
        setError('Failed to save excursion. Please try again.');
        setCreating(false);
        return;
      }

      router.replace({
        pathname: '/(tabs)/explore/excursion-detail',
        params: {
          id: insertedData.id,
          userLat: startLat.toString(),
          userLng: startLng.toString(),
        },
      });
    } catch (err) {
      console.error('Error creating excursion:', err);
      setError('Something went wrong. Please try again.');
      setCreating(false);
    }
  };

  if (creating) {
    return <LoadingScreen message="Creating your personalized nature experience..." />;
  }

  const canCreate = locationChoice !== null && (locationChoice === 'suggest' ? !!location : customLocationName.trim().length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Excursion</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loadingWeather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherLeft}>
              <ActivityIndicator size="small" color="#4A7C2E" />
              <Text style={styles.weatherLoadingText}>Loading weather...</Text>
            </View>
          </View>
        )}

        {weather && !loadingWeather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherLeft}>
              {getWeatherIcon()}
              <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}F</Text>
            </View>
            <TouchableOpacity style={styles.forecastLink}>
              <Text style={styles.forecastText}>Hourly forecast</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.locationSection}>
          <Text style={styles.sectionLabel}>Where would you like to go?</Text>
          <Text style={styles.sectionSubtext}>Do you have a place in mind, or would you like suggestions?</Text>

          <View style={styles.locationChoices}>
            <TouchableOpacity
              style={[
                styles.locationChoice,
                locationChoice === 'suggest' && styles.locationChoiceSelected,
                !location && styles.locationChoiceDisabled,
              ]}
              onPress={() => location && setLocationChoice('suggest')}
              activeOpacity={0.7}
              disabled={!location}
            >
              <Sparkles size={24} color={locationChoice === 'suggest' ? '#FFFFFF' : '#4A7C2E'} />
              <Text style={[
                styles.locationChoiceText,
                locationChoice === 'suggest' && styles.locationChoiceTextSelected,
              ]}>
                Suggest somewhere
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locationChoice,
                locationChoice === 'custom' && styles.locationChoiceSelected,
              ]}
              onPress={() => setLocationChoice('custom')}
              activeOpacity={0.7}
            >
              <MapPin size={24} color={locationChoice === 'custom' ? '#FFFFFF' : '#4A7C2E'} />
              <Text style={[
                styles.locationChoiceText,
                locationChoice === 'custom' && styles.locationChoiceTextSelected,
              ]}>
                I have a place in mind
              </Text>
            </TouchableOpacity>
          </View>

          {locationChoice === 'custom' && (
            <TextInput
              style={styles.customLocationInput}
              value={customLocationName}
              onChangeText={setCustomLocationName}
              placeholder="Enter park, trail, or nature spot name..."
              placeholderTextColor="#999"
            />
          )}

          {!location && (
            <Text style={styles.locationWarning}>
              Enable location access for personalized suggestions, or enter a custom location.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setActiveModal('duration')}
            activeOpacity={0.7}
          >
            <Text style={styles.selectorText}>{getDurationLabel()}</Text>
            <ChevronDown size={20} color="#5A6C4A" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Energy Level</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setActiveModal('energyLevel')}
            activeOpacity={0.7}
          >
            <Text style={styles.selectorText}>{getEnergyLevelLabel()}</Text>
            <ChevronDown size={20} color="#5A6C4A" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Risk Tolerance</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setActiveModal('riskTolerance')}
            activeOpacity={0.7}
          >
            <Text style={styles.selectorText}>{getRiskToleranceLabel()}</Text>
            <ChevronDown size={20} color="#5A6C4A" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activity Preferences</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setActiveModal('activities')}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectorText, selectedActivities.length === 0 && styles.placeholderText]}>
              {getActivitiesLabel()}
            </Text>
            <ChevronDown size={20} color="#5A6C4A" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Therapeutic Goals</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setActiveModal('therapeutic')}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectorText, selectedTherapeutic.length === 0 && styles.placeholderText]}>
              {getTherapeuticLabel()}
            </Text>
            <ChevronDown size={20} color="#5A6C4A" />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Anything else I should know?</Text>
          <TextInput
            style={styles.notesInput}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Add any special requests or considerations..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{additionalNotes.length}/500</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>Create Experience</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={activeModal === 'duration'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Duration</Text>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setDuration(option.value);
                  setActiveModal(null);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {duration === option.value && <Check size={20} color="#4A7C2E" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'energyLevel'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Energy Level</Text>
            {ENERGY_LEVEL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setEnergyLevel(option.value);
                  setActiveModal(null);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {energyLevel === option.value && <Check size={20} color="#4A7C2E" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'riskTolerance'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Risk Tolerance</Text>
            {RISK_TOLERANCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setRiskTolerance(option.value);
                  setActiveModal(null);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {riskTolerance === option.value && <Check size={20} color="#4A7C2E" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'activities'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Activities</Text>
            <FlatList
              data={ACTIVITY_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => toggleActivity(item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {selectedActivities.includes(item) && <Check size={20} color="#4A7C2E" />}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <TouchableOpacity style={styles.modalDone} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'therapeutic'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Therapeutic Goals</Text>
            <FlatList
              data={THERAPEUTIC_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => toggleTherapeutic(item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {selectedTherapeutic.includes(item) && <Check size={20} color="#4A7C2E" />}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <TouchableOpacity style={styles.modalDone} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  weatherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherLoadingText: {
    fontSize: 16,
    color: '#5A6C4A',
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  forecastLink: {
    paddingVertical: 8,
  },
  forecastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A7C2E',
  },
  locationSection: {
    marginBottom: 24,
  },
  sectionSubtext: {
    fontSize: 14,
    color: '#5A6C4A',
    marginBottom: 16,
  },
  locationChoices: {
    flexDirection: 'row',
    gap: 12,
  },
  locationChoice: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
    minHeight: 100,
  },
  locationChoiceSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  locationChoiceDisabled: {
    opacity: 0.5,
  },
  locationChoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E1F',
    textAlign: 'center',
  },
  locationChoiceTextSelected: {
    color: '#FFFFFF',
  },
  customLocationInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3E1F',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
  },
  locationWarning: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorText: {
    fontSize: 16,
    color: '#2D3E1F',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3E1F',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    backgroundColor: '#4A7C2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#2D3E1F',
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#5A6C4A',
  },
  modalDone: {
    marginTop: 16,
    backgroundColor: '#4A7C2E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
