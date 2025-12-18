import * as Location from 'expo-location';
import { searchNatureSpotsNearby } from './nature-spots';

export interface PreloadedLocationData {
  location: Location.LocationObject;
  nearbySpots: Array<{
    name: string;
    latitude: number;
    longitude: number;
    type: string;
    difficulty?: string;
    star_rating?: number;
  }>;
  loadedAt: number;
}

let cachedLocationData: PreloadedLocationData | null = null;

export async function preloadLocationAndSpots(): Promise<PreloadedLocationData | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const nearbyResult = await searchNatureSpotsNearby(
      location.coords.latitude,
      location.coords.longitude,
      10
    );

    cachedLocationData = {
      location,
      nearbySpots: nearbyResult.places || [],
      loadedAt: Date.now(),
    };

    console.log(`Preloaded ${cachedLocationData.nearbySpots.length} nearby nature spots`);

    return cachedLocationData;
  } catch (error) {
    console.error('Error preloading location:', error);
    return null;
  }
}

export function getCachedLocationData(): PreloadedLocationData | null {
  const MAX_AGE_MS = 10 * 60 * 1000;

  if (!cachedLocationData) {
    return null;
  }

  const age = Date.now() - cachedLocationData.loadedAt;
  if (age > MAX_AGE_MS) {
    console.log('Cached location data is stale');
    return null;
  }

  return cachedLocationData;
}

export function clearCachedLocationData(): void {
  cachedLocationData = null;
}
