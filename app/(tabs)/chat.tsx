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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Send } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { getCurrentWeather, type WeatherData } from '@/services/weather';
import { getExcursionPlan } from '@/services/ai';
import { getOrCreateSession, sendMessage, getSessionMessages, type StoredMessage } from '@/services/chat';
import { LoadingScreen } from '@/components/loading-screen';
import MinimalWeather from '@/components/minimal-weather';

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

const ENERGY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Gentle pace' },
  { value: 'medium', label: 'Medium', description: 'Moderate activity' },
  { value: 'high', label: 'High', description: 'Vigorous activity' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export default function CreateScreen() {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedTherapeutic, setSelectedTherapeutic] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState<string>('medium');
  const [duration, setDuration] = useState<number>(30);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserPreferences();
    loadWeather();
    initializeChat();
  }, []);

  const initializeChat = async () => {
    const session = await getOrCreateSession('excursion_creator');
    if (session) {
      setSessionId(session.id);
      const existingMessages = await getSessionMessages(session.id);
      setMessages(existingMessages);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('activity_preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.activity_preferences) {
        setSelectedActivities(data.activity_preferences);
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || !sessionId || chatLoading) return;

    const userMessageText = inputText.trim();
    setInputText('');
    setChatLoading(true);

    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const result = await sendMessage(sessionId, userMessageText, conversationHistory);

      if (result.error) {
        setError(result.error);
      } else {
        const updatedMessages = await getSessionMessages(sessionId);
        setMessages(updatedMessages);

        setTimeout(() => {
          chatScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateExcursion = async () => {
    if (!location) {
      setError('Location not available. Please enable location permissions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting excursion creation...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to create an excursion.');
        setLoading(false);
        return;
      }

      console.log('User authenticated, calling AI...');
      const preferences = {
        activities: selectedActivities,
        therapeutic: selectedTherapeutic,
        energyLevel,
        weather: weather ? {
          temp: weather.temperature,
          condition: weather.description,
        } : undefined,
      };

      const result = await getExcursionPlan({
        userLocation: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        durationMinutes: duration,
        preferences,
      });

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
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            },
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
        <LoadingScreen message="Creating your personalized nature experience..." />
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Excursion</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <MinimalWeather weather={weather} loading={weatherLoading} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Preferences</Text>
          <Text style={styles.sectionSubtitle}>Select all that interest you</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Therapeutic Goals</Text>
          <Text style={styles.sectionSubtitle}>What would you like to focus on?</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Level</Text>
          <Text style={styles.sectionSubtitle}>How much energy do you have today?</Text>
          <View style={styles.energyContainer}>
            {ENERGY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.energyButton,
                  energyLevel === level.value && styles.energyButtonSelected,
                ]}
                onPress={() => setEnergyLevel(level.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.energyLabel,
                    energyLevel === level.value && styles.energyLabelSelected,
                  ]}
                >
                  {level.label}
                </Text>
                <Text
                  style={[
                    styles.energyDescription,
                    energyLevel === level.value && styles.energyDescriptionSelected,
                  ]}
                >
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <Text style={styles.sectionSubtitle}>How long do you want to be outside?</Text>
          <View style={styles.durationContainer}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationButton,
                  duration === option.value && styles.durationButtonSelected,
                ]}
                onPress={() => setDuration(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === option.value && styles.durationTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.chatSection}>
          <Text style={styles.chatTitle}>Anything else I should know?</Text>
          <View style={styles.chatContainer}>
            {messages.length > 0 && (
              <ScrollView
                ref={chatScrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.role === 'user' ? styles.userText : styles.assistantText,
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={[styles.inputContainer, messages.length > 0 && styles.inputContainerWithBorder]}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Chat with NatureUp."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                editable={!chatLoading}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || chatLoading) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || chatLoading}
              >
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: 20,
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
  energyContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  energyButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  energyButtonSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  energyLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  energyLabelSelected: {
    color: '#FFFFFF',
  },
  energyDescription: {
    fontSize: 12,
    color: '#5A6C4A',
  },
  energyDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
  },
  durationButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  durationButtonSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  durationTextSelected: {
    color: '#FFFFFF',
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
  chatSection: {
    marginTop: 24,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 12,
  },
  chatContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  messagesContainer: {
    maxHeight: 200,
    minHeight: 120,
  },
  messagesContent: {
    padding: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A7C2E',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#2D3E1F',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
  },
  inputContainerWithBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F8F3',
    fontSize: 14,
    color: '#2D3E1F',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A7C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
