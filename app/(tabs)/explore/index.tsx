import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';
import { getCurrentWeather, type WeatherData } from '@/services/weather';
import { LoadingScreen } from '@/components/loading-screen';
import MinimalWeather from '@/components/minimal-weather';
import { getOrCreateSession, getSessionMessages, sendMessage, type StoredMessage } from '@/services/chat';
import type { ChatMessage } from '@/types/ai';

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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<StoredMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadExcursions();
        await loadWeather();
        await initializeChatSession();
      } catch (error) {
        console.error('Error initializing screen:', error);
        setError('Failed to initialize. Please try again.');
        setLoading(false);
      }
    };

    initialize();
  }, []);

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

  const initializeChatSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, skipping chat initialization');
        return;
      }

      const session = await getOrCreateSession('excursion_creator');
      if (session) {
        setSessionId(session.id);
        const messages = await getSessionMessages(session.id);
        setChatMessages(messages);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

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
    loadWeather();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !sessionId || sendingMessage) return;

    const userMessageText = inputText.trim();
    setInputText('');
    setSendingMessage(true);
    setError(null);

    const userMessage: StoredMessage = {
      id: Date.now().toString(),
      session_id: sessionId,
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const conversationHistory: ChatMessage[] = chatMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const result = await sendMessage(sessionId, userMessageText, conversationHistory, 'excursion_creator');

      if (result.error) {
        setError(result.error);
        setChatMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
      } else if (result.reply) {
        const assistantMessage: StoredMessage = {
          id: (Date.now() + 1).toString(),
          session_id: sessionId,
          role: 'assistant',
          content: result.reply,
          created_at: new Date().toISOString(),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);

        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      setChatMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your excursions..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A7C2E" />
          }
        >
          <MinimalWeather weather={weather} loading={weatherLoading} />

          {sessionId && (
            <View style={styles.chatSection}>
              <Text style={styles.chatTitle}>Ask About Nature Spots</Text>
              <View style={styles.chatContainer}>
                <ScrollView
                  ref={chatScrollRef}
                  style={styles.chatMessages}
                  contentContainerStyle={styles.chatMessagesContent}
                >
                  {chatMessages.length === 0 ? (
                    <Text style={styles.chatPlaceholder}>
                      Ask me about nearby trails, parks, or outdoor activities
                    </Text>
                  ) : (
                    chatMessages.map((message) => (
                      <View
                        key={message.id}
                        style={[
                          styles.messageContainer,
                          message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                          ]}
                        >
                          {message.content}
                        </Text>
                      </View>
                    ))
                  )}
                  {sendingMessage && (
                    <View style={[styles.messageContainer, styles.assistantMessage]}>
                      <ActivityIndicator size="small" color="#4A7C2E" />
                    </View>
                  )}
                </ScrollView>

                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={500}
                    editable={!sendingMessage}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || sendingMessage) && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || sendingMessage}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.excursionsSection}>
            <Text style={styles.sectionTitle}>My Excursions</Text>
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
                      pathname: '/(tabs)/explore/excursion-detail',
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
          </View>
        </ScrollView>
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
    paddingBottom: 20,
  },
  chatSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 12,
  },
  chatContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatMessages: {
    maxHeight: 300,
  },
  chatMessagesContent: {
    padding: 16,
  },
  chatPlaceholder: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A7C2E',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F8F3',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#2D3E1F',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F5F8F3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2D3E1F',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4A7C2E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    marginHorizontal: 20,
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
  excursionsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 16,
  },
  emptyState: {
    paddingVertical: 40,
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
