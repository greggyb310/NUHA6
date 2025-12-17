import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, LogOut, Fingerprint } from 'lucide-react-native';
import { getCurrentUser, signOut } from '@/services/auth';
import { getUserProfile, updateUserProfile } from '@/services/user-profile';
import {
  getBiometricCapabilities,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  BiometricCapabilities,
} from '@/services/biometric-auth';
import { LoadingScreen } from '@/components/loading-screen';

const HEALTH_GOALS = [
  'Reduce stress',
  'Improve sleep',
  'Boost mood',
  'Increase energy',
  'Connect with nature',
  'Build mindfulness',
  'Get more exercise',
  'Improve mental clarity',
];

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadProfile();
    checkBiometricAvailability();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();

      if (!user) {
        router.replace('/sign-in');
        return;
      }

      const profile = await getUserProfile(user.id);

      if (profile) {
        setUsername(profile.username || '');
        setEmail(profile.email || '');
        setName(profile.full_name || '');
        setSelectedGoals(profile.health_goals || []);
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    const capabilities = await getBiometricCapabilities();
    setBiometricCapabilities(capabilities);

    if (capabilities.isAvailable) {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      if (!password) {
        setError('Please enter your password to enable biometric authentication');
        return;
      }

      const result = await enableBiometric(username, password);

      if (result.success) {
        setBiometricEnabled(true);
        setPassword('');
        setError(null);
      } else {
        setError(result.error || 'Failed to enable biometric authentication');
      }
    } else {
      await disableBiometric();
      setBiometricEnabled(false);
      setError(null);
    }
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedGoals.length === 0) {
      setError('Please select at least one health goal');
      return;
    }

    if (email && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    setError(null);

    const user = await getCurrentUser();

    if (!user) {
      setError('Authentication error');
      setSaving(false);
      return;
    }

    const updatedProfile = await updateUserProfile(user.id, {
      full_name: name,
      email: email || undefined,
      health_goals: selectedGoals,
    });

    if (!updatedProfile) {
      setError('Failed to save profile');
      setSaving(false);
      return;
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    const { error: signOutError } = await signOut();

    if (signOutError) {
      setError('Failed to sign out');
      return;
    }

    router.replace('/sign-in');
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <User size={48} color="#4A7C2E" />
          </View>
          <Text style={styles.headerTitle}>Your Profile</Text>
          <Text style={styles.headerSubtitle}>Personalize your wellness journey</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={username}
              editable={false}
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email (optional)"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Goals</Text>
          <Text style={styles.sectionDescription}>
            Select the wellness areas you'd like to focus on
          </Text>
          <View style={styles.goalsGrid}>
            {HEALTH_GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal);
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                  onPress={() => toggleGoal(goal)}
                >
                  <Text style={[styles.goalChipText, isSelected && styles.goalChipTextSelected]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          {biometricCapabilities?.isAvailable && Platform.OS !== 'web' && (
            <>
              <View style={styles.settingRow}>
                <Fingerprint size={20} color="#5A6C4A" />
                <Text style={styles.settingLabel}>
                  {biometricCapabilities.biometricType}
                </Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#E5E7EB', true: '#7FA957' }}
                  thumbColor={biometricEnabled ? '#4A7C2E' : '#f4f3f4'}
                />
              </View>

              {!biometricEnabled && (
                <View style={styles.biometricPasswordSection}>
                  <Text style={styles.biometricPasswordLabel}>
                    Enter your password to enable {biometricCapabilities.biometricType}:
                  </Text>
                  <TextInput
                    style={styles.biometricPasswordInput}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>NatureUP Health v1.0.0</Text>
          <Text style={styles.footerSubtext}>iOS Beta Preview</Text>
        </View>
      </ScrollView>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#5A6C4A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(74, 124, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#5A6C4A',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#5A6C4A',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#2D3E1F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
  },
  inputDisabled: {
    opacity: 0.6,
    color: '#5A6C4A',
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#4A7C2E',
    backgroundColor: 'rgba(74, 124, 46, 0.05)',
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 124, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  goalIconSelected: {
    backgroundColor: '#4A7C2E',
  },
  goalLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3E1F',
  },
  goalLabelSelected: {
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#4A7C2E',
    backgroundColor: '#4A7C2E',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#2D3E1F',
  },
  saveButton: {
    backgroundColor: '#4A7C2E',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#5A6C4A',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  goalChipSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  goalChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  goalChipTextSelected: {
    color: '#FFFFFF',
  },
  biometricPasswordSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  biometricPasswordLabel: {
    fontSize: 14,
    color: '#5A6C4A',
  },
  biometricPasswordInput: {
    fontSize: 16,
    color: '#2D3E1F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: {
    flex: 1,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
});
