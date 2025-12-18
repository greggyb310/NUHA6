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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';
import { getCurrentWeather, type WeatherData } from '@/services/weather';
import { getExcursionPlan } from '@/services/ai';
import { searchNatureSpotsNearby } from '@/services/nature-spots';
import { LoadingScreen } from '@/components/loading-screen';
import { Send, Leaf, ArrowLeft } from 'lucide-react-native';
import { sendMessage as sendChatMessage, getOrCreateSession, getSession, type ConversationPhase } from '@/services/chat';
import type { ChatMessage } from '@/types/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const getFirstTimeGreeting = (name?: string) => {
  const greeting = name ? `Hi ${name}!` : "Hi!";
  return `${greeting} I'm your nature wellness guide. I can help you plan a personalized outdoor experience based on how you're feeling today. What kind of nature experience are you looking for? You can tell me things like how much time you have, what activities interest you, or what you'd like to get out of your time outdoors.\n\nOr tap the Create icon below to build your excursion with more options.`;
};

const getReturningGreeting = (name?: string) => {
  const greeting = name ? `Hi ${name}!` : "Hi!";
  return `${greeting} What would you like to do today? Let me know how long you have and anything else that I should know when we plan your excursion.`;
};

const CREATE_TAB_HINT = "\n\nOr tap the Create icon below to build your excursion with more options.";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [creatingExcursion, setCreatingExcursion] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPhase, setSessionPhase] = useState<ConversationPhase>('initial_chat');
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    initializeChat();
    loadLocationAndWeather();
  }, []);

  const initializeChat = async () => {
    try {
      const session = await getOrCreateSession('health_coach');
      if (session) {
        setSessionId(session.id);
        setSessionPhase(session.phase);
      }

      const { data: { user } } = await supabase.auth.getUser();
      let greeting = getFirstTimeGreeting();

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('chat_session_count, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const currentCount = profile?.chat_session_count || 0;
        const userName = profile?.full_name;

        if (currentCount === 0) {
          greeting = getFirstTimeGreeting(userName);
        } else if (currentCount < 4) {
          greeting = getReturningGreeting(userName) + CREATE_TAB_HINT;
        } else {
          greeting = getReturningGreeting(userName);
        }

        await supabase
          .from('user_profiles')
          .update({ chat_session_count: currentCount + 1 })
          .eq('user_id', user.id);
      }

      setMessages([{ id: '0', role: 'assistant', content: greeting }]);
    } catch (error) {
      console.error('Error initializing chat session:', error);
      setMessages([{ id: '0', role: 'assistant', content: getFirstTimeGreeting() }]);
    }
  };

  const loadLocationAndWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);

      const weatherData = await getCurrentWeather(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
      setWeather(weatherData);
    } catch (error) {
      console.error('Error loading location/weather:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };

    setMessages(prev => [...prev, newUserMessage]);
    scrollToBottom();
    setSending(true);

    try {
      const conversationHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      if (sessionId) {
        const result = await sendChatMessage(sessionId, userMessage, conversationHistory);

        if (result.reply) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.reply,
          };
          setMessages(prev => [...prev, assistantMessage]);
          scrollToBottom();

          const updatedSession = await getSession(sessionId);
          if (updatedSession) {
            setSessionPhase(updatedSession.phase);
          }
        }
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'd be happy to help you plan a nature experience! Tell me more about what you're looking for - how much time do you have, and what kind of activity sounds appealing?",
        };
        setMessages(prev => [...prev, assistantMessage]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Would you like to tell me more about your ideal nature experience?",
      };
      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
    } finally {
      setSending(false);
    }
  };

  const handleCreateExcursion = async () => {
    if (!location) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I need your location to find nature spots nearby. Please enable location permissions and try again.",
      };
      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
      return;
    }

    setCreatingExcursion(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCreatingExcursion(false);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Please sign in to create an excursion.",
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const nearbyResult = await searchNatureSpotsNearby(
        location.coords.latitude,
        location.coords.longitude,
        5
      );

      const nearbyPlaces = nearbyResult.places.map(place => ({
        name: place.name,
        lat: place.latitude,
        lng: place.longitude,
        type: place.type,
        difficulty: place.difficulty,
        star_rating: place.star_rating,
      }));

      if (nearbyPlaces.length === 0) {
        setCreatingExcursion(false);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I couldn't find any nature spots nearby. Try moving to a different location.",
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const conversationContext = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');

      const result = await getExcursionPlan({
        userLocation: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        durationMinutes: 30,
        preferences: {
          activities: [],
          therapeutic: [],
          riskTolerance: 'medium',
          energyLevel: 'medium',
          additionalNotes: conversationContext,
          weather: weather ? {
            temp: weather.temperature,
            condition: weather.description,
          } : undefined,
        },
        nearbyPlaces,
      });

      if (!result.ok || !result.result || !result.result.destination) {
        setCreatingExcursion(false);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I had trouble creating an excursion. Can you tell me more about what you're looking for?",
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const excursionData = result.result;
      const destination = excursionData.destination!;
      const startLat = location.coords.latitude;
      const startLng = location.coords.longitude;
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
          duration_minutes: excursionData.duration_minutes || 30,
          distance_km: excursionData.distance_km,
          difficulty: excursionData.difficulty,
        })
        .select('id')
        .single();

      setCreatingExcursion(false);

      if (dbError || !insertedData) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I created an excursion but had trouble saving it. Please try again.",
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      router.replace({
        pathname: '/(tabs)/explore/excursion-detail',
        params: {
          id: insertedData.id,
          userLat: location.coords.latitude.toString(),
          userLng: location.coords.longitude.toString(),
          sessionId: sessionId || '',
        },
      });
    } catch (error) {
      console.error('Error creating excursion:', error);
      setCreatingExcursion(false);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Something went wrong while creating your excursion. Please try again.",
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (creatingExcursion) {
    return <LoadingScreen message="Creating your personalized nature experience..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#2D3E1F" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Leaf size={20} color="#4A7C2E" />
          </View>
          <Text style={styles.headerTitle}>
            {sessionPhase === 'excursion_planning' ? 'Excursion Planning' : 'Nature Guide'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
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
          {sending && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color="#4A7C2E" />
            </View>
          )}
        </ScrollView>

        {messages.length > 2 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateExcursion}
            activeOpacity={0.8}
          >
            <Leaf size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create My Experience</Text>
          </TouchableOpacity>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              sessionPhase === 'excursion_planning'
                ? 'How long do you have? Any location preferences?'
                : "Tell me what you're looking for..."
            }
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!sending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  headerSpacer: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A7C2E',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#2D3E1F',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    backgroundColor: '#7FA957',
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F8F3',
    borderRadius: 22,
    fontSize: 15,
    color: '#2D3E1F',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
