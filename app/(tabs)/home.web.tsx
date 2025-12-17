import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Search, Navigation, MapPin } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { getOrCreateUserProfile } from '@/services/user-profile';
import {
  searchNatureSpotsNearby,
  searchPlaceByName,
  type NatureSpot,
} from '@/services/nature-spots';

export default function HomeScreenWeb() {
  const [userName, setUserName] = useState<string>('');
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [nearbySpots, setNearbySpots] = useState<NatureSpot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NatureSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<NatureSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    initializeHome();
  }, []);

  const initializeHome = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(coords);
            setLocationPermission(true);

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
              const profile = await getOrCreateUserProfile(user.id, user.email || undefined);
              setUserName(profile?.full_name || 'Friend');
            } else {
              setUserName('Friend');
            }

            fetchNearbySpots(coords.latitude, coords.longitude);
            setLoading(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setError('Location access denied. Web preview requires location.');
            setLoading(false);
          }
        );
      } else {
        setError('Geolocation not supported in this browser');
        setLoading(false);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Failed to initialize');
      setLoading(false);
    }
  };

  const fetchNearbySpots = async (latitude: number, longitude: number) => {
    setSearchingPlaces(true);
    const result = await searchNatureSpotsNearby(latitude, longitude, 5);
    setNearbySpots(result.places);
    setSearchingPlaces(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userLocation) return;

    setSearchingPlaces(true);
    setError(null);

    const results = await searchPlaceByName(
      searchQuery,
      userLocation.latitude,
      userLocation.longitude
    );

    setSearchResults(results);
    setSearchingPlaces(false);

    if (results.length > 0) {
      setSelectedSpot(results[0]);
    } else {
      setError('No places found. Try a different search.');
    }
  };

  const handleSpotSelect = (spot: NatureSpot) => {
    setSelectedSpot(spot);
  };

  const handleGetDirections = () => {
    if (!selectedSpot) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSpot.latitude},${selectedSpot.longitude}`;
    window.open(url, '_blank');
  };

  const clearSelection = () => {
    setSelectedSpot(null);
    setSearchResults([]);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A7C2E" />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  if (error && !userLocation) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.infoText}>
          This is a web preview. For full map functionality, test on iPhone via launch.expo.dev
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <MapPin size={64} color="#7FA957" />
        <Text style={styles.mapPlaceholderText}>Map Preview</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Full map functionality available on iOS
        </Text>
      </View>

      <View style={styles.topPanel}>
        <Text style={styles.welcomeText}>Welcome {userName},</Text>
        <Text style={styles.questionText}>
          Where do you want to go today? Would you like me to give you some options?
        </Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for trails, parks, or nature spots..."
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={handleSearch}
            editable={!searchingPlaces}
          />
          <TouchableOpacity
            style={[styles.searchButton, searchingPlaces && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={searchingPlaces || !searchQuery.trim()}
          >
            {searchingPlaces ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Search size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <Text style={styles.errorTextSmall}>{error}</Text>
        )}

        {selectedSpot && (
          <View style={styles.selectedSpotCard}>
            <View style={styles.selectedSpotHeader}>
              <View style={styles.selectedSpotInfo}>
                <Text style={styles.selectedSpotName}>{selectedSpot.name}</Text>
                <Text style={styles.selectedSpotType}>{selectedSpot.type}</Text>
                {selectedSpot.distance && (
                  <Text style={styles.selectedSpotDistance}>
                    {(selectedSpot.distance / 1609.34).toFixed(1)} miles away
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={clearSelection} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.directionsButton}
              onPress={handleGetDirections}
            >
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {nearbySpots.length > 0 && !selectedSpot && (
          <View style={styles.nearbySpotsContainer}>
            <Text style={styles.nearbySpotsTitle}>Nearby Nature Spots</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.nearbySpotsScroll}
            >
              {nearbySpots.map((spot) => (
                <TouchableOpacity
                  key={spot.id}
                  style={styles.nearbySpotCard}
                  onPress={() => handleSpotSelect(spot)}
                >
                  <Text style={styles.nearbySpotName}>{spot.name}</Text>
                  <Text style={styles.nearbySpotType}>{spot.type}</Text>
                  {spot.distance && (
                    <Text style={styles.nearbySpotDistance}>
                      {(spot.distance / 1609.34).toFixed(1)} mi
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F0E3',
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A7C2E',
    marginTop: 16,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#5A6C4A',
    marginTop: 8,
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
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#5A6C4A',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTextSmall: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 8,
  },
  topPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#5A6C4A',
    lineHeight: 24,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2D3E1F',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#4A7C2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  selectedSpotCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
  },
  selectedSpotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  selectedSpotInfo: {
    flex: 1,
  },
  selectedSpotName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  selectedSpotType: {
    fontSize: 14,
    color: '#5A6C4A',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  selectedSpotDistance: {
    fontSize: 14,
    color: '#7FA957',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#5A6C4A',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4A7C2E',
    paddingVertical: 12,
    borderRadius: 8,
  },
  directionsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nearbySpotsContainer: {
    marginTop: 16,
  },
  nearbySpotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
    marginBottom: 8,
  },
  nearbySpotsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  nearbySpotCard: {
    backgroundColor: '#F5F8F3',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nearbySpotName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  nearbySpotType: {
    fontSize: 12,
    color: '#5A6C4A',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  nearbySpotDistance: {
    fontSize: 12,
    color: '#7FA957',
    fontWeight: '500',
  },
});
