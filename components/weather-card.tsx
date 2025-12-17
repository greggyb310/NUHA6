import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Cloud, ChevronRight } from 'lucide-react-native';
import { WeatherData } from '@/services/weather';

interface WeatherCardProps {
  weather: WeatherData | null;
  loading: boolean;
}

export default function WeatherCard({ weather, loading }: WeatherCardProps) {
  const handleForecastPress = () => {
    if (weather) {
      Linking.openURL('https://www.weather.gov/');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#4A7C2E" />
        <Text style={styles.loadingText}>Loading weather...</Text>
      </View>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Cloud size={20} color="#4A7C2E" />
        <Text style={styles.location}>{weather.location}</Text>
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.icon}>{weather.icon}</Text>
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{weather.temperature}°F</Text>
          <Text style={styles.description}>{weather.description}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.forecastLink}
        onPress={handleForecastPress}
        activeOpacity={0.7}
      >
        <Text style={styles.forecastText}>View hourly forecast</Text>
        <ChevronRight size={16} color="#4A7C2E" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    fontSize: 14,
    color: '#5A6C4A',
    marginLeft: 8,
    fontWeight: '500',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 56,
    marginRight: 16,
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 40,
    fontWeight: '700',
    color: '#2D3E1F',
    lineHeight: 48,
  },
  description: {
    fontSize: 16,
    color: '#5A6C4A',
    textTransform: 'capitalize',
  },
  forecastLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 124, 46, 0.1)',
  },
  forecastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A7C2E',
    marginRight: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#5A6C4A',
    marginTop: 8,
  },
});
