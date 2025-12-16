import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';

interface NaturePlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [places, setPlaces] = useState<NaturePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocationAndFetchPlaces();
  }, []);

  const requestLocationAndFetchPlaces = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access in Settings.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);

      await fetchNearbyPlaces(currentLocation.coords.latitude, currentLocation.coords.longitude);

      setLoading(false);
    } catch (err) {
      setError('Failed to get your location. Please try again.');
      setLoading(false);
    }
  };

  const fetchNearbyPlaces = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/nearby-places`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch places');
      }

      const data = await response.json();
      setPlaces(data.places || []);
    } catch (err) {
      console.error('Error fetching places:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A7C2E" />
        <Text style={styles.loadingText}>Finding nature spots near you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unable to get location</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centerContainer}>
        <MapPin size={48} color="#4A7C2E" />
        <Text style={styles.webMessage}>Map view is only available on iOS</Text>
        <Text style={styles.webSubtext}>
          Preview this app on your iPhone using launch.expo.dev
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Circle
          center={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          radius={8046.72}
          fillColor="rgba(74, 124, 46, 0.1)"
          strokeColor="rgba(74, 124, 46, 0.3)"
          strokeWidth={2}
        />

        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            title={place.name}
            description={place.type}
            pinColor="#4A7C2E"
          />
        ))}
      </MapView>

      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Nature Spots Near You</Text>
        <Text style={styles.infoSubtext}>
          {places.length} {places.length === 1 ? 'place' : 'places'} within 5 miles
        </Text>
        {places.length === 0 && (
          <Text style={styles.noPlacesText}>
            No nature spots found nearby. Try a different location.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F3',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2D3E1F',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  webMessage: {
    marginTop: 16,
    fontSize: 18,
    color: '#2D3E1F',
    fontWeight: '600',
    textAlign: 'center',
  },
  webSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#5A6C4A',
    textAlign: 'center',
  },
  infoPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#5A6C4A',
  },
  noPlacesText: {
    fontSize: 12,
    color: '#5A6C4A',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
