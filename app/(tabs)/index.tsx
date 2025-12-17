import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import MapScreen from '@/components/map-screen';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'welcome' | 'map'>('welcome');

  if (currentView === 'map') {
    return <MapScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/natureup_health_logo_-_green_bkgd.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.heroTitle}>NatureUp Health</Text>
          <Text style={styles.heroSubtitle}>
            Your voice-first companion for personalized nature therapy and outdoor wellness
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <View style={styles.featureIcon}>
              <MessageCircle size={28} color="#4A7C2E" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Create</Text>
              <Text style={styles.featureDescription}>
                Voice-first wellness guidance and nature therapy recommendations
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => setCurrentView('map')}
          >
            <View style={styles.featureIcon}>
              <MapPin size={28} color="#4A7C2E" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Explore</Text>
              <Text style={styles.featureDescription}>
                Discover parks, trails, and outdoor spaces near you
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <MessageCircle size={24} color="#FFFFFF" />
          <Text style={styles.ctaButtonText}>Start Your Journey</Text>
        </TouchableOpacity>
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#4A7C2E',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#5A6C4A',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(74, 124, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A7C2E',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
