import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, ActivityIndicator, ImageSourcePropType, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Send } from 'lucide-react-native';
import { sendMessage as sendChatMessage, getOrCreateSession, getSession, type ConversationPhase } from '@/services/chat';
import type { ChatMessage } from '@/types/ai';

const IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'img_1335_medium.jpeg': require('@/assets/images/img_1335_medium.jpeg'),
  'img_3495_medium.jpeg': require('@/assets/images/img_3495_medium.jpeg'),
  'img_6096_large_medium.jpeg': require('@/assets/images/img_6096_large_medium.jpeg'),
  'img_6448_medium.jpeg': require('@/assets/images/img_6448_medium.jpeg'),
  'img_6502_medium.jpeg': require('@/assets/images/img_6502_medium.jpeg'),
  'img_6521_medium.jpeg': require('@/assets/images/img_6521_medium.jpeg'),
  'img_6583_medium.jpeg': require('@/assets/images/img_6583_medium.jpeg'),
  'snail1_medium.jpeg': require('@/assets/images/snail1_medium.jpeg'),
  'star_shaockwaves_medium.jpeg': require('@/assets/images/star_shaockwaves_medium.jpeg'),
  'sunrise_above_the_clouds_donner_lake_medium.jpeg': require('@/assets/images/sunrise_above_the_clouds_donner_lake_medium.jpeg'),
  'natureup_health_logo_-_green_bkgd.jpeg': require('@/assets/images/natureup_health_logo_-_green_bkgd.jpeg'),
};

interface InspirationPhoto {
  id: string;
  image_url: string;
  photographer: string | null;
  alt_text: string | null;
}

interface InspirationQuote {
  id: string;
  quote_text: string;
  author: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const getFirstTimeGreeting = (name?: string) => {
  const greeting = name ? `Hi ${name}!` : "Hi!";
  return `${greeting} Ready to explore nature?`;
};

const getReturningGreeting = (name?: string) => {
  const greeting = name ? `Hi ${name}!` : "Hi!";
  return `${greeting} What would you like to do today?`;
};

export default function HomeScreen() {
  const [photo, setPhoto] = useState<InspirationPhoto | null>(null);
  const [quote, setQuote] = useState<InspirationQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPhase, setSessionPhase] = useState<ConversationPhase>('initial_chat');
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchInspiration();
    initializeChat();
  }, []);

  const fetchInspiration = async () => {
    try {
      setLoading(true);

      const [photosResult, quotesResult] = await Promise.all([
        supabase.from('inspiration_photos').select('*').eq('active', true),
        supabase.from('inspiration_quotes').select('*').eq('active', true),
      ]);

      const { data: photos } = photosResult;
      const { data: quotes } = quotesResult;

      let newPhoto: InspirationPhoto | null = null;
      let newQuote: InspirationQuote | null = null;

      if (photos && photos.length > 0) {
        newPhoto = photos[Math.floor(Math.random() * photos.length)];
      }

      if (quotes && quotes.length > 0) {
        newQuote = quotes[Math.floor(Math.random() * quotes.length)];
      }

      setPhoto(newPhoto);
      setQuote(newQuote);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inspiration:', error);
      setLoading(false);
    }
  };

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
          content: "I'd be happy to help you plan a nature experience! Tell me more about what you're looking for.",
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

  const backgroundImage = photo && IMAGE_MAP[photo.image_url]
    ? IMAGE_MAP[photo.image_url]
    : require('@/assets/images/img_6096_large_medium.jpeg');

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.topSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/natureup_health_logo_-_green_bkgd.jpeg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>NatureUp Health</Text>
            <Text style={styles.welcomeText}>Partnering with Nature</Text>
          </View>

          <View style={styles.centerSection}>
            <KeyboardAvoidingView
              style={styles.chatContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.chatCard}>
                <View style={styles.chatHeader}>
                  <MessageCircle size={20} color="#4A7C2E" />
                  <Text style={styles.chatHeaderTitle}>
                    {sessionPhase === 'excursion_planning' ? 'Excursion Planning' : 'Nature Guide'}
                  </Text>
                </View>

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

                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Tell me what you're looking for..."
                    placeholderTextColor="rgba(45, 62, 31, 0.5)"
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
                    <Send size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>

          <View style={styles.bottomSection}>
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : quote ? (
              <View style={styles.quoteContainer}>
                <Text style={styles.quoteText}>"{quote.quote_text}"</Text>
                {quote.author && (
                  <Text style={styles.quoteAuthor}>- {quote.author}</Text>
                )}
              </View>
            ) : null}

            {photo?.photographer && (
              <Text style={styles.photoCredit}>Photo by {photo.photographer}</Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  chatContainer: {
    width: '100%',
  },
  chatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(232, 245, 233, 0.25)',
    gap: 8,
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messagesContainer: {
    maxHeight: 240,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(74, 124, 46, 0.9)',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomLeftRadius: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    fontSize: 14,
    color: '#2D3E1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  bottomSection: {
    paddingBottom: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  quoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photoCredit: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    alignSelf: 'flex-end',
  },
});
