import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '@/services/auth';
import { updateUserProfile } from '@/services/user-profile';

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const MOBILITY_LEVELS = ['Limited', 'Moderate', 'Full'];

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
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [age, setAge] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<string | null>(null);
  const [mobilityLevel, setMobilityLevel] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter((a) => a !== activity));
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const toggleTherapy = (therapy: string) => {
    if (selectedTherapies.includes(therapy)) {
      setSelectedTherapies(selectedTherapies.filter((t) => t !== therapy));
    } else {
      setSelectedTherapies([...selectedTherapies, therapy]);
    }
  };

  const handleComplete = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      setError('Authentication error. Please sign in again.');
      setLoading(false);
      return;
    }

    const ageNumber = age ? parseInt(age, 10) : undefined;
    if (age && (isNaN(ageNumber!) || ageNumber! < 13 || ageNumber! > 120)) {
      setError('Please enter a valid age between 13 and 120');
      setLoading(false);
      return;
    }

    const profile = await updateUserProfile(user.id, {
      age: ageNumber,
      fitness_level: fitnessLevel || undefined,
      mobility_level: mobilityLevel || undefined,
      activity_preferences: selectedActivities.length > 0 ? selectedActivities : undefined,
      therapy_preferences: selectedTherapies.length > 0 ? selectedTherapies : undefined,
    });

    if (!profile) {
      setError('Failed to save profile. Please try again.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Build Your Profile</Text>
            <Text style={styles.subtitle}>Help us personalize your outdoor wellness journey</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Age (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                placeholderTextColor="#5A6C4A"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness Level (Optional)</Text>
              <View style={styles.optionsRow}>
                {FITNESS_LEVELS.map((level) => {
                  const isSelected = fitnessLevel === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                      onPress={() => setFitnessLevel(level)}
                      disabled={loading}
                    >
                      <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mobility Level (Optional)</Text>
              <View style={styles.optionsRow}>
                {MOBILITY_LEVELS.map((level) => {
                  const isSelected = mobilityLevel === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                      onPress={() => setMobilityLevel(level)}
                      disabled={loading}
                    >
                      <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity Preferences (Optional)</Text>
              <Text style={styles.sectionSubtitle}>Select all that apply</Text>
              <View style={styles.chipsGrid}>
                {ACTIVITY_PREFERENCES.map((activity) => {
                  const isSelected = selectedActivities.includes(activity);
                  return (
                    <TouchableOpacity
                      key={activity}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleActivity(activity)}
                      disabled={loading}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {activity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Therapy Preferences (Optional)</Text>
              <Text style={styles.sectionSubtitle}>Select all that apply</Text>
              <View style={styles.chipsGrid}>
                {THERAPY_PREFERENCES.map((therapy) => {
                  const isSelected = selectedTherapies.includes(therapy);
                  return (
                    <TouchableOpacity
                      key={therapy}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleTherapy(therapy)}
                      disabled={loading}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {therapy}
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

            {success && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>Profile saved successfully!</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saving...' : 'Complete Setup'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                disabled={loading}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
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
    padding: 24,
    paddingBottom: 40,
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
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  chipTextSelected: {
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
  successContainer: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#4A7C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#5A6C4A',
    fontSize: 16,
    fontWeight: '600',
  },
});
