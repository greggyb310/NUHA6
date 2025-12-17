import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Heart, Target, Moon, Zap, Settings, ChevronRight } from 'lucide-react-native';

const HEALTH_GOALS = [
  { id: 'stress', label: 'Reduce Stress', icon: Heart },
  { id: 'sleep', label: 'Improve Sleep', icon: Moon },
  { id: 'energy', label: 'Boost Energy', icon: Zap },
  { id: 'focus', label: 'Enhance Focus', icon: Target },
];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  const handleSave = () => {
    Alert.alert('Coming Soon', 'Profile saving will be available in the next update.');
  };

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
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Goals</Text>
          <Text style={styles.sectionDescription}>
            Select the wellness areas you'd like to focus on
          </Text>
          {HEALTH_GOALS.map((goal) => {
            const Icon = goal.icon;
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                onPress={() => toggleGoal(goal.id)}
              >
                <View style={[styles.goalIcon, isSelected && styles.goalIconSelected]}>
                  <Icon size={24} color={isSelected ? '#FFFFFF' : '#4A7C2E'} />
                </View>
                <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                  {goal.label}
                </Text>
                <View
                  style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                >
                  {isSelected && <View style={styles.checkboxInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingRow}>
            <Settings size={20} color="#5A6C4A" />
            <Text style={styles.settingLabel}>Notification Preferences</Text>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Settings size={20} color="#5A6C4A" />
            <Text style={styles.settingLabel}>Privacy Settings</Text>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

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
});
