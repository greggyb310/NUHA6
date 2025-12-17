import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '@/services/auth';
import { createUserProfile } from '@/services/user-profile';

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

export default function OnboardingScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleComplete = async () => {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedGoals.length === 0) {
      setError('Please select at least one health goal');
      return;
    }

    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      setError('Authentication error. Please sign in again.');
      setLoading(false);
      return;
    }

    const profile = await createUserProfile(user.id, fullName, selectedGoals);

    if (!profile) {
      setError('Failed to create profile. Please try again.');
      setLoading(false);
      return;
    }

    router.replace('/(tabs)');
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
            <Text style={styles.title}>Let's personalize your experience</Text>
            <Text style={styles.subtitle}>Tell us about yourself to get started</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's your name?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#5A6C4A"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                editable={!loading}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What are your wellness goals?</Text>
              <Text style={styles.sectionSubtitle}>Select all that apply</Text>

              <View style={styles.goalsGrid}>
                {HEALTH_GOALS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal);
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                      onPress={() => toggleGoal(goal)}
                      disabled={loading}
                    >
                      <Text style={[styles.goalChipText, isSelected && styles.goalChipTextSelected]}>
                        {goal}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
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
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
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
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#5A6C4A',
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
});
