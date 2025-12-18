import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Send, X, ArrowRight } from 'lucide-react-native';
import { getOrCreateSession, getSessionMessages, sendMessage, type StoredMessage } from '@/services/chat';
import type { ChatMessage } from '@/types/ai';
import type { ParsedIntent } from '@/types/intent';

export default function ConversationScreen() {
  const params = useLocalSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [readyToCreate, setReadyToCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      const session = await getOrCreateSession('excursion_creator');
      if (!session) {
        console.error('Failed to create session');
        setError('Unable to start conversation. Please try again.');
        setLoading(false);
        return;
      }

      setSessionId(session.id);

      const existingMessages = await getSessionMessages(session.id);
      setMessages(existingMessages);

      if (params.intentData) {
        const intent = JSON.parse(params.intentData as string) as ParsedIntent;
        setParsedIntent(intent);

        if (existingMessages.length === 0) {
          await sendInitialMessage(session.id, intent.rawText, intent);
        }
      } else if (existingMessages.length === 0) {
        await sendInitialMessage(session.id, 'I want to create a nature excursion');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const sendInitialMessage = async (sessionId: string, message: string, intent?: ParsedIntent) => {
    setSending(true);

    const conversationHistory: ChatMessage[] = [
      {
        role: 'user',
        content: message,
      },
    ];

    const contextMetadata = intent ? {
      detected_duration: intent.durationMinutes,
      detected_activities: intent.activities,
      detected_proximity: intent.proximityBias,
      detected_difficulty: intent.difficulty,
      detected_therapeutic_goals: intent.therapeuticGoals,
    } : undefined;

    const result = await sendMessage(sessionId, message, conversationHistory, 'excursion_creator', undefined, contextMetadata);

    if (result.error) {
      console.error('Error sending message:', result.error);
    } else {
      const updatedMessages = await getSessionMessages(sessionId);
      setMessages(updatedMessages);
      scrollToBottom();

      if (result.readyToCreate) {
        setReadyToCreate(true);
      }
    }

    setSending(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId || sending) return;

    const userMessage = inputText.trim();
    setInputText('');
    setSending(true);

    const conversationHistory: ChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const result = await sendMessage(sessionId, userMessage, conversationHistory, 'excursion_creator');

    if (result.error) {
      console.error('Error sending message:', result.error);
      setInputText(userMessage);
    } else {
      const updatedMessages = await getSessionMessages(sessionId);
      setMessages(updatedMessages);
      scrollToBottom();

      if (result.readyToCreate) {
        setReadyToCreate(true);
      }
    }

    setSending(false);
  };

  const handleExcursionCreation = () => {
    console.log('Excursion creation confirmed - navigating to form with intent data');
    if (parsedIntent) {
      const intentData = JSON.stringify(parsedIntent);
      router.replace({
        pathname: '/(tabs)/chat',
        params: { intentData, autoCreate: 'true' },
      });
    } else {
      router.replace('/(tabs)/chat');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A7C2E" />
          <Text style={styles.loadingText}>Starting conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Excursion</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#2D3E1F" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              initializeConversation();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Excursion</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={24} color="#2D3E1F" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
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
              <ActivityIndicator size="small" color="#5A6C4A" />
            </View>
          )}
        </ScrollView>

        {readyToCreate && (
          <View style={styles.createButtonContainer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleExcursionCreation}
            >
              <Text style={styles.createButtonText}>Create Excursion</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your response..."
            placeholderTextColor="#9CA3AF"
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
          >
            <Send size={20} color={inputText.trim() && !sending ? '#FFFFFF' : '#9CA3AF'} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#5A6C4A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4A7C2E',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  closeButton: {
    padding: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
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
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#2D3E1F',
  },
  createButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A7C2E',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#4A7C2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F8F3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3E1F',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});
