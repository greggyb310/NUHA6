import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Layers } from 'lucide-react-native';

interface NaturePlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface DebugInfo {
  mock?: boolean;
  reason?: string;
  searches?: Array<{ keyword: string; status: string; resultCount: number }>;
  totalResults?: number;
}

type MapType = 'standard' | 'satellite' | 'hybrid';

interface MapScreenProps {
  initialRegion?: Region;
  showNearbyPlaces?: boolean;
  destination?: {
    latitude: number;
    longitude: number;
    title?: string;
  };
  routeWaypoints?: Array<{ lat: number; lng: number }>;
}

export default function MapScreen({
  initialRegion,
  showNearbyPlaces = true,
  destination,
  routeWaypoints
}: MapScreenProps) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [places, setPlaces] = useState<NaturePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  useEffect(() => {
    if (showNearbyPlaces) {
      requestLocationAndFetchPlaces();
    } else if (!initialRegion) {
      requestLocationOnly();
    } else {
      setLoading(false);
    }
  }, [showNearbyPlaces, initialRegion]);

  const requestLocationOnly = async () => {
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
      setLoading(false);
    } catch (err) {
      setError('Failed to get your location. Please try again.');
      setLoading(false);
    }
  };

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
      setDebugInfo(data.debug || null);
    } catch (err) {
      console.error('Error fetching places:', err);
      setError('Failed to fetch nearby places');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A7C2E" />
        <Text style={styles.loadingText}>
          {showNearbyPlaces ? 'Finding nature spots near you...' : 'Loading map...'}
        </Text>
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

  if (!location && !initialRegion) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unable to get location</Text>
      </View>
    );
  }

  const mapRegion = initialRegion || (location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType={mapType}
        showsTraffic={showTraffic}
        showsPointsOfInterest={true}
        showsBuildings={true}
        initialRegion={mapRegion}
        showsUserLocation={!!location}
        showsMyLocationButton={!!location}
      >
        {showNearbyPlaces && location && (
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
        )}

        {showNearbyPlaces && places.map((place) => (
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

        {routeWaypoints && routeWaypoints.length > 0 && (
          <Polyline
            coordinates={routeWaypoints.map(wp => ({
              latitude: wp.lat,
              longitude: wp.lng,
            }))}
            strokeColor="#4A7C2E"
            strokeWidth={3}
          />
        )}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.title || 'Destination'}
            description="Excursion destination"
            pinColor="#DC2626"
          />
        )}
      </MapView>

      {showNearbyPlaces && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Nature Spots Near You</Text>
          <Text style={styles.infoSubtext}>
            {places.length} {places.length === 1 ? 'place' : 'places'} within 5 miles
          </Text>
          {places.length === 0 && (
            <>
              <Text style={styles.noPlacesText}>
                No nature spots found nearby.
              </Text>
              {debugInfo && (
                <Text style={styles.debugText}>
                  {debugInfo.mock
                    ? 'Using mock data (API not configured)'
                    : `Searched ${debugInfo.searches?.length || 0} keywords, found ${debugInfo.totalResults || 0} results`}
                </Text>
              )}
            </>
          )}
          {debugInfo?.mock && places.length > 0 && (
            <Text style={styles.mockBadge}>Mock Data</Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.layerButton}
        onPress={() => setShowLayerMenu(!showLayerMenu)}
      >
        <Layers size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {showLayerMenu && (
        <View style={styles.layerMenu}>
          <Text style={styles.layerMenuTitle}>Map Layers</Text>

          <View style={styles.layerSection}>
            <Text style={styles.layerSectionTitle}>Map Type</Text>
            <View style={styles.mapTypeButtons}>
              <TouchableOpacity
                style={[styles.mapTypeButton, mapType === 'standard' && styles.mapTypeButtonActive]}
                onPress={() => setMapType('standard')}
              >
                <Text style={[styles.mapTypeButtonText, mapType === 'standard' && styles.mapTypeButtonTextActive]}>
                  Standard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapTypeButton, mapType === 'satellite' && styles.mapTypeButtonActive]}
                onPress={() => setMapType('satellite')}
              >
                <Text style={[styles.mapTypeButtonText, mapType === 'satellite' && styles.mapTypeButtonTextActive]}>
                  Satellite
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapTypeButton, mapType === 'hybrid' && styles.mapTypeButtonActive]}
                onPress={() => setMapType('hybrid')}
              >
                <Text style={[styles.mapTypeButtonText, mapType === 'hybrid' && styles.mapTypeButtonTextActive]}>
                  Hybrid
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.layerSection}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setShowTraffic(!showTraffic)}
            >
              <Text style={styles.toggleLabel}>Show Traffic</Text>
              <View style={[styles.toggle, showTraffic && styles.toggleActive]}>
                <View style={[styles.toggleThumb, showTraffic && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  debugText: {
    fontSize: 11,
    color: '#7FA957',
    marginTop: 4,
    fontStyle: 'italic',
  },
  mockBadge: {
    fontSize: 10,
    color: '#7FA957',
    marginTop: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  layerButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A7C2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  layerMenu: {
    position: 'absolute',
    bottom: 170,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  layerMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 12,
  },
  layerSection: {
    marginBottom: 12,
  },
  layerSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6C4A',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  mapTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mapTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F8F3',
    alignItems: 'center',
  },
  mapTypeButtonActive: {
    backgroundColor: '#4A7C2E',
  },
  mapTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  mapTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3E1F',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4A7C2E',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});
