import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { WeatherData } from '@/services/weather';

interface MinimalWeatherProps {
  weather: WeatherData | null;
  loading: boolean;
}

export default function MinimalWeather({ weather, loading }: MinimalWeatherProps) {
  const handleForecastPress = () => {
    if (weather) {
      Linking.openURL('https://www.weather.gov/');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#4A7C2E" />
      </View>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.weatherInfo}>
        <Text style={styles.icon}>{weather.icon}</Text>
        <Text style={styles.temperature}>{weather.temperature}°F</Text>
      </View>
      <TouchableOpacity
        onPress={handleForecastPress}
        activeOpacity={0.7}
      >
        <Text style={styles.forecastLink}>Hourly forecast →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 28,
  },
  temperature: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
  },
  forecastLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A7C2E',
  },
});
