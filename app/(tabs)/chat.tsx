import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Trash2, Leaf } from 'lucide-react-native';
import { Audio } from 'expo-av';
import {
  getOrCreateSession,
  getSessionMessages,
  sendMessage,
  sendVoiceMessage,
  clearSession,
  type StoredMessage,
  type ChatSession,
} from '@/services/chat';
import type { ChatMessage } from '@/types/ai';
import { VoiceButton } from '@/components/voice-button';
import { AudioMessage } from '@/components/audio-message';
import type { VoiceRecording } from '@/services/voice';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  messageType?: 'text' | 'voice';
  audioUrl?: string;
  audioDurationMs?: number;
  transcript?: string;
}

export default function ChatScreen() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeChat();
    setupAudio();
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const initializeChat = async () => {
    setIsInitializing(true);
    setError(null);

    const chatSession = await getOrCreateSession('health_coach');
    if (!chatSession) {
      setError('Unable to start chat session. Please try again.');
      setIsInitializing(false);
      return;
    }

    setSession(chatSession);

    const storedMessages = await getSessionMessages(chatSession.id);
    const displayMessages: DisplayMessage[] = storedMessages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        messageType: msg.message_type,
        audioUrl: msg.audio_url,
        audioDurationMs: msg.audio_duration_ms,
        transcript: msg.transcript,
      }));

    setMessages(displayMessages);
    setIsInitializing(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !session || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setError(null);

    const tempUserMessage: DisplayMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
    };

    const tempLoadingMessage: DisplayMessage = {
      id: `temp-loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, tempUserMessage, tempLoadingMessage]);
    setIsLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    const conversationHistory: ChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await sendMessage(session.id, userMessage, conversationHistory);

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setMessages((prev) => prev.filter((msg) => !msg.isLoading));
      return;
    }

    setMessages((prev) => {
      const filtered = prev.filter((msg) => !msg.isLoading && !msg.id.startsWith('temp-user-'));
      return [
        ...filtered,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userMessage,
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
        },
      ];
    });

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleVoiceRecording = async (recording: VoiceRecording) => {
    if (!session || isLoading) return;

    setError(null);

    const tempLoadingMessage: DisplayMessage = {
      id: `temp-loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, tempLoadingMessage]);
    setIsLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    const conversationHistory: ChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await sendVoiceMessage(session.id, recording, conversationHistory);

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setMessages((prev) => prev.filter((msg) => !msg.isLoading));
      return;
    }

    setMessages((prev) => {
      const filtered = prev.filter((msg) => !msg.isLoading);
      return [
        ...filtered,
        {
          id: `user-voice-${Date.now()}`,
          role: 'user',
          content: result.transcript,
          messageType: 'voice',
          audioDurationMs: recording.duration,
        },
        {
          id: `assistant-voice-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
          messageType: 'voice',
          audioUrl: result.replyAudioBase64 ? `data:audio/mp3;base64,${result.replyAudioBase64}` : undefined,
        },
      ];
    });

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClearChat = async () => {
    if (!session) return;

    const success = await clearSession(session.id);
    if (success) {
      setMessages([]);
      setError(null);
    }
  };

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';

    if (item.isLoading) {
      return (
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A7C2E" />
            <Text style={styles.loadingText}>NatureUP is thinking...</Text>
          </View>
        </View>
      );
    }

    const isVoiceMessage = item.messageType === 'voice' && item.audioUrl;

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {isVoiceMessage ? (
          <AudioMessage
            audioBase64={item.audioUrl!.replace('data:audio/mp3;base64,', '')}
            transcript={item.content}
            duration={item.audioDurationMs}
            isUser={isUser}
          />
        ) : (
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        What would you like to do today?
      </Text>
      <View style={styles.suggestionContainer}>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInputText("I'm feeling stressed today")}
        >
          <Text style={styles.suggestionText}>I am feeling stressed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInputText('Help me feel more grounded')}
        >
          <Text style={styles.suggestionText}>Help me feel grounded</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInputText("I'm going for a walk")}
        >
          <Text style={styles.suggestionText}>Going for a walk</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4A7C2E" />
          <Text style={styles.initializingText}>Starting your session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Leaf size={24} color="#4A7C2E" />
          <Text style={styles.headerTitle}>Create</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
            <Trash2 size={20} color="#5A6C4A" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.emptyMessageList,
          ]}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <VoiceButton
              onRecordingComplete={handleVoiceRecording}
              disabled={isLoading}
            />
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Share what's on your mind..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Send size={20} color={inputText.trim() && !isLoading ? '#FFFFFF' : '#9CA3AF'} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initializingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2D3E1F',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  clearButton: {
    padding: 8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyMessageList: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#4A7C2E',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3E1F',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#5A6C4A',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8F3',
    borderRadius: 28,
    paddingLeft: 8,
    paddingRight: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingVertical: 12,
    fontSize: 16,
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
    backgroundColor: '#E5E7EB',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(74, 124, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#5A6C4A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  suggestionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    fontSize: 14,
    color: '#4A7C2E',
    fontWeight: '500',
  },
});
