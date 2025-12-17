import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Fingerprint } from 'lucide-react-native';
import { signIn } from '@/services/auth';
import {
  getBiometricCapabilities,
  isBiometricEnabled,
  getStoredCredentials,
  authenticateWithBiometrics,
  BiometricCapabilities,
} from '@/services/biometric-auth';

export default function SignInScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const capabilities = await getBiometricCapabilities();
    setBiometricCapabilities(capabilities);

    if (capabilities.isAvailable) {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
    }
  };

  const handleBiometricSignIn = async () => {
    setError(null);
    setLoading(true);

    const authResult = await authenticateWithBiometrics();

    if (!authResult.success) {
      setError(authResult.error || 'Biometric authentication failed');
      setLoading(false);
      return;
    }

    const credentials = await getStoredCredentials();

    if (!credentials) {
      setError('No stored credentials found');
      setLoading(false);
      return;
    }

    const { user, error: signInError } = await signIn(credentials);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    if (user) {
      router.replace('/(tabs)');
    }

    setLoading(false);
  };

  const handleSignIn = async () => {
    setError(null);

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    const { user, error: signInError } = await signIn({ username, password });

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    if (user) {
      router.replace('/(tabs)');
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your wellness journey</Text>
          </View>

          {biometricEnabled && biometricCapabilities?.isAvailable && (
            <View style={styles.biometricSection}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricSignIn}
                disabled={loading}
              >
                <Fingerprint size={32} color="#4A7C2E" />
                <Text style={styles.biometricText}>
                  Sign in with {biometricCapabilities.biometricType}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#5A6C4A"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#5A6C4A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/sign-up')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5A6C4A',
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E1F',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3E1F',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#4A7C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#5A6C4A',
  },
  footerLink: {
    fontSize: 14,
    color: '#4A7C2E',
    fontWeight: '600',
  },
  biometricSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  biometricButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A7C2E',
    gap: 8,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A7C2E',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#5A6C4A',
    marginHorizontal: 16,
  },
});
