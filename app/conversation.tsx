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
import { Send, X } from 'lucide-react-native';
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

  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      const session = await getOrCreateSession('excursion_creator');
      if (!session) {
        console.error('Failed to create session');
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
          const contextMessage = buildInitialMessage(intent);
          await sendInitialMessage(session.id, contextMessage);
        }
      } else if (existingMessages.length === 0) {
        await sendInitialMessage(session.id, 'I want to create a nature excursion');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setLoading(false);
    }
  };

  const buildInitialMessage = (intent: ParsedIntent): string => {
    const parts: string[] = [];

    if (intent.durationMinutes) {
      parts.push(`${intent.durationMinutes} minute`);
    }

    if (intent.activities && intent.activities.length > 0) {
      parts.push(intent.activities.join(' and '));
    }

    if (intent.proximityBias !== 'none') {
      parts.push(intent.matches?.proximity || 'nearby');
    }

    if (intent.therapeuticGoals && intent.therapeuticGoals.length > 0) {
      parts.push(`to ${intent.therapeuticGoals.join(' and ')}`);
    }

    return parts.length > 0
      ? `I want a ${parts.join(' ')} excursion`
      : 'I want to create a nature excursion';
  };

  const sendInitialMessage = async (sessionId: string, message: string) => {
    setSending(true);

    const conversationHistory: ChatMessage[] = [
      {
        role: 'user',
        content: message,
      },
    ];

    const result = await sendMessage(sessionId, message, conversationHistory, 'excursion_creator');

    if (result.error) {
      console.error('Error sending message:', result.error);
    } else {
      const updatedMessages = await getSessionMessages(sessionId);
      setMessages(updatedMessages);
      scrollToBottom();

      if (result.readyToCreate) {
        handleExcursionCreation();
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
        handleExcursionCreation();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Excursion</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={24} color="#2D3E1F" />
        </TouchableOpacity>
      </View>

      {parsedIntent && (
        <View style={styles.intentBanner}>
          <Text style={styles.intentBannerText}>
            Based on: {parsedIntent.rawText}
          </Text>
        </View>
      )}

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
  intentBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C2E',
  },
  intentBannerText: {
    fontSize: 14,
    color: '#2D3E1F',
    fontWeight: '500',
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
