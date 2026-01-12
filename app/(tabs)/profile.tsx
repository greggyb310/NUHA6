import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, LogOut, Fingerprint, Heart, Activity } from 'lucide-react-native';
import { getCurrentUser, signOut } from '@/services/auth';
import { getUserProfile, updateUserProfile } from '@/services/user-profile';
import {
  getBiometricCapabilities,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  BiometricCapabilities,
} from '@/services/biometric-auth';
import {
  isHealthKitAvailable,
  enableAppleHealth,
  disableAppleHealth,
  syncHealthMetricsToDatabase,
  getRecentHealthSummary,
} from '@/services/apple-health';
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

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const MOBILITY_LEVELS = ['Wheelchair', 'Limited', 'Moderate', 'Full'];
const RISK_TOLERANCE_OPTIONS = ['Low', 'Medium', 'High'];

const ACTIVITY_PREFERENCES = [
  'Walking',
  'Hiking',
  'Trail Running',
  'Road Biking',
  'Mountain Biking',
  'Swimming',
  'Boating',
];

const THERAPY_PREFERENCES = [
  'Meditation',
  'Breath Work',
  'Sensory Immersion',
  'Forest Bathing',
  'Nature Journaling',
  'Reconnect to Awe',
  'Somatic',
];

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<string | null>(null);
  const [mobilityLevel, setMobilityLevel] = useState<string | null>(null);
  const [riskTolerance, setRiskTolerance] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [appleHealthEnabled, setAppleHealthEnabled] = useState(false);
  const [appleHealthConnectedAt, setAppleHealthConnectedAt] = useState<string | null>(null);
  const [lastHealthSync, setLastHealthSync] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState({ steps: 0, distance: 0, calories: 0 });
  const [syncingHealth, setSyncingHealth] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [togglingHealth, setTogglingHealth] = useState(false);

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
        setAge(profile.age ? profile.age.toString() : '');
        setFitnessLevel(profile.fitness_level || null);
        setMobilityLevel(profile.mobility_level || null);
        setRiskTolerance(profile.risk_tolerance ? profile.risk_tolerance.charAt(0).toUpperCase() + profile.risk_tolerance.slice(1) : null);
        setSelectedGoals(profile.health_goals || []);
        setSelectedActivities(profile.activity_preferences || []);
        setSelectedTherapies(profile.therapy_preferences || []);
        setAppleHealthEnabled(profile.apple_health_enabled || false);
        setAppleHealthConnectedAt(profile.apple_health_connected_at || null);
        setLastHealthSync(profile.last_health_sync_at || null);

        if (profile.apple_health_enabled) {
          loadHealthSummary(user.id);
        }
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadHealthSummary = async (userId: string) => {
    const summary = await getRecentHealthSummary(userId, 7);
    setHealthSummary(summary);
  };

  const checkBiometricAvailability = async () => {
    const capabilities = await getBiometricCapabilities();
    setBiometricCapabilities(capabilities);

    if (capabilities.isAvailable) {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
    }
  };

  const handleAppleHealthToggle = async (value: boolean) => {
    const user = await getCurrentUser();
    if (!user) {
      setError('Authentication error');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setTogglingHealth(true);

    if (value) {
      const result = await enableAppleHealth(user.id);
      if (result.success) {
        setAppleHealthEnabled(true);
        setAppleHealthConnectedAt(new Date().toISOString());
        setLastHealthSync(new Date().toISOString());
        await loadHealthSummary(user.id);
        setSuccessMessage('Apple Health connected successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to enable Apple Health. Please check your iOS Health app permissions.');
      }
    } else {
      const result = await disableAppleHealth(user.id);
      if (result.success) {
        setAppleHealthEnabled(false);
        setAppleHealthConnectedAt(null);
        setLastHealthSync(null);
        setHealthSummary({ steps: 0, distance: 0, calories: 0 });
        setSuccessMessage('Apple Health disconnected');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to disable Apple Health');
      }
    }

    setTogglingHealth(false);
  };

  const handleManualSync = async () => {
    const user = await getCurrentUser();
    if (!user) {
      setError('Authentication error');
      return;
    }

    setSyncingHealth(true);
    setError(null);

    const result = await syncHealthMetricsToDatabase(user.id, 7);
    if (result.success) {
      setLastHealthSync(new Date().toISOString());
      await loadHealthSummary(user.id);
    } else {
      setError(result.error || 'Failed to sync health data');
    }

    setSyncingHealth(false);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      if (!username || username.trim() === '') {
        setError('Profile data missing. Please sign out and sign in again to enable biometric authentication.');
        return;
      }

      if (!password) {
        setError('Please enter your password to enable biometric authentication');
        return;
      }

      const result = await enableBiometric(username, password);

      if (result.success) {
        setBiometricEnabled(true);
        setPassword('');
        setError(null);
        setSuccessMessage(`${biometricCapabilities?.biometricType || 'Biometric'} authentication enabled successfully`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to enable biometric authentication. Please verify your password is correct.');
      }
    } else {
      await disableBiometric();
      setBiometricEnabled(false);
      setError(null);
      setSuccessMessage(`${biometricCapabilities?.biometricType || 'Biometric'} authentication disabled`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const toggleTherapy = (therapy: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(therapy) ? prev.filter((t) => t !== therapy) : [...prev, therapy]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (email && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const ageNumber = age ? parseInt(age, 10) : undefined;
    if (age && (isNaN(ageNumber!) || ageNumber! < 13 || ageNumber! > 120)) {
      setError('Please enter a valid age between 13 and 120');
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
      age: ageNumber,
      fitness_level: fitnessLevel || undefined,
      mobility_level: mobilityLevel || undefined,
      risk_tolerance: riskTolerance ? riskTolerance.toLowerCase() : undefined,
      health_goals: selectedGoals.length > 0 ? selectedGoals : undefined,
      activity_preferences: selectedActivities.length > 0 ? selectedActivities : undefined,
      therapy_preferences: selectedTherapies.length > 0 ? selectedTherapies : undefined,
    });

    if (!updatedProfile) {
      setError('Failed to save profile');
      setSaving(false);
      return;
    }

    setSuccessMessage('Profile saved successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
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

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age (optional)"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness & Mobility</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Fitness Level</Text>
            <View style={styles.optionsRow}>
              {FITNESS_LEVELS.map((level) => {
                const isSelected = fitnessLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => setFitnessLevel(level)}
                  >
                    <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Mobility Level</Text>
            <View style={styles.optionsRow}>
              {MOBILITY_LEVELS.map((level) => {
                const isSelected = mobilityLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => setMobilityLevel(level)}
                  >
                    <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Risk Tolerance</Text>
            <View style={styles.optionsRow}>
              {RISK_TOLERANCE_OPTIONS.map((level) => {
                const isSelected = riskTolerance === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => setRiskTolerance(level)}
                  >
                    <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Preferences</Text>
          <View style={styles.goalsGrid}>
            {ACTIVITY_PREFERENCES.map((activity) => {
              const isSelected = selectedActivities.includes(activity);
              return (
                <TouchableOpacity
                  key={activity}
                  style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                  onPress={() => toggleActivity(activity)}
                >
                  <Text style={[styles.goalChipText, isSelected && styles.goalChipTextSelected]}>
                    {activity}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Therapy Preferences</Text>
          <View style={styles.goalsGrid}>
            {THERAPY_PREFERENCES.map((therapy) => {
              const isSelected = selectedTherapies.includes(therapy);
              return (
                <TouchableOpacity
                  key={therapy}
                  style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                  onPress={() => toggleTherapy(therapy)}
                >
                  <Text style={[styles.goalChipText, isSelected && styles.goalChipTextSelected]}>
                    {therapy}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apple Health</Text>
            <Text style={styles.sectionDescription}>
              Connect with Apple Health to track your nature excursions and personalize recommendations
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Note: Apple Health requires a native build. If you see errors, install the latest TestFlight build or rebuild with clear cache.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Heart size={20} color="#4A7C2E" />
                <Text style={styles.settingLabel}>Apple Health</Text>
                {togglingHealth ? (
                  <ActivityIndicator size="small" color="#4A7C2E" />
                ) : (
                  <Switch
                    value={appleHealthEnabled}
                    onValueChange={handleAppleHealthToggle}
                    trackColor={{ false: '#E5E7EB', true: '#7FA957' }}
                    thumbColor={appleHealthEnabled ? '#4A7C2E' : '#f4f3f4'}
                    disabled={togglingHealth}
                  />
                )}
              </View>

              {appleHealthEnabled && (
                <>
                  {appleHealthConnectedAt && (
                    <View style={styles.healthInfoRow}>
                      <Text style={styles.healthInfoLabel}>Connected</Text>
                      <Text style={styles.healthInfoValue}>
                        {new Date(appleHealthConnectedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {lastHealthSync && (
                    <View style={styles.healthInfoRow}>
                      <Text style={styles.healthInfoLabel}>Last Sync</Text>
                      <Text style={styles.healthInfoValue}>
                        {new Date(lastHealthSync).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.healthStatsContainer}>
                    <View style={styles.healthStat}>
                      <Activity size={16} color="#4A7C2E" />
                      <Text style={styles.healthStatValue}>{healthSummary.steps.toLocaleString()}</Text>
                      <Text style={styles.healthStatLabel}>Steps (7d)</Text>
                    </View>

                    <View style={styles.healthStat}>
                      <Activity size={16} color="#4A7C2E" />
                      <Text style={styles.healthStatValue}>
                        {(healthSummary.distance / 1000).toFixed(1)}km
                      </Text>
                      <Text style={styles.healthStatLabel}>Distance</Text>
                    </View>

                    <View style={styles.healthStat}>
                      <Activity size={16} color="#4A7C2E" />
                      <Text style={styles.healthStatValue}>{Math.round(healthSummary.calories)}</Text>
                      <Text style={styles.healthStatLabel}>Calories</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={handleManualSync}
                    disabled={syncingHealth}
                  >
                    {syncingHealth ? (
                      <ActivityIndicator size="small" color="#4A7C2E" />
                    ) : (
                      <>
                        <Activity size={16} color="#4A7C2E" />
                        <Text style={styles.syncButtonText}>Sync Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

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
                  disabled={!username || username.trim() === ''}
                />
              </View>

              {!username || username.trim() === '' ? (
                <View style={styles.biometricPasswordSection}>
                  <Text style={[styles.biometricPasswordLabel, { color: '#DC2626' }]}>
                    Profile data is missing. Please sign out and sign in again to enable {biometricCapabilities.biometricType}.
                  </Text>
                </View>
              ) : (
                !biometricEnabled && (
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
                )
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

        {successMessage && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
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
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
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
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  optionButtonTextSelected: {
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
  successContainer: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  healthInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F8F3',
    borderRadius: 8,
    marginTop: 12,
  },
  healthInfoLabel: {
    fontSize: 14,
    color: '#5A6C4A',
    fontWeight: '600',
  },
  healthInfoValue: {
    fontSize: 14,
    color: '#2D3E1F',
  },
  healthStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  healthStat: {
    flex: 1,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  healthStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginTop: 4,
  },
  healthStatLabel: {
    fontSize: 11,
    color: '#5A6C4A',
    textAlign: 'center',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A7C2E',
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoBoxText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
