import { supabase } from './supabase';
import Constants from 'expo-constants';

export interface NatureSpot {
  id: string;
  osm_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  tags?: Record<string, unknown>;
  distance?: number;
  difficulty?: string;
  length?: string;
  elevation_gain?: string;
  estimated_time?: string;
  star_rating?: number;
  description?: string;
  location?: string;
  url?: string;
  image_url?: string;
  source?: 'osm' | 'alltrails';
}

export interface PlaceSearchResult {
  places: NatureSpot[];
  cached: boolean;
  error?: string;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function searchNatureSpotsNearby(
  latitude: number,
  longitude: number,
  radiusMiles: number = 5,
  includeTrails: boolean = true
): Promise<PlaceSearchResult> {
  const radiusMeters = radiusMiles * 1609.34;

  try {
    const { data: cachedSpots, error: cacheError } = await supabase
      .from('nature_spots')
      .select('*');

    if (cacheError) {
      console.error('Error fetching cached spots:', cacheError);
    }

    if (cachedSpots && cachedSpots.length > 0) {
      const nearbySpots = cachedSpots
        .map((spot) => {
          const distance = calculateDistance(
            latitude,
            longitude,
            Number(spot.latitude),
            Number(spot.longitude)
          );
          return {
            ...spot,
            distance,
            latitude: Number(spot.latitude),
            longitude: Number(spot.longitude),
            source: 'osm' as const,
          };
        })
        .filter((spot) => spot.distance <= radiusMeters)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      if (nearbySpots.length >= 3) {
        return {
          places: nearbySpots,
          cached: true,
        };
      }
    }

    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const [osmResponse, alltrailsResponse] = await Promise.allSettled([
      fetch(
        `${supabaseUrl}/functions/v1/nearby-places`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude }),
        }
      ),
      includeTrails ? fetch(
        `${supabaseUrl}/functions/v1/alltrails-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude, radiusMiles }),
        }
      ) : Promise.resolve(null),
    ]);

    let osmPlaces: NatureSpot[] = [];
    let alltrailsPlaces: NatureSpot[] = [];

    if (osmResponse.status === 'fulfilled' && osmResponse.value.ok) {
      const data = await osmResponse.value.json();
      osmPlaces = (data.places || []).map((place: any) => ({
        ...place,
        source: 'osm' as const,
      }));

      for (const place of osmPlaces) {
        await supabase
          .from('nature_spots')
          .upsert(
            {
              osm_id: place.id,
              name: place.name,
              latitude: place.latitude,
              longitude: place.longitude,
              type: place.type,
              tags: {},
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'osm_id',
            }
          );
      }
    }

    if (alltrailsResponse.status === 'fulfilled' && alltrailsResponse.value && alltrailsResponse.value.ok) {
      const data = await alltrailsResponse.value.json();
      alltrailsPlaces = (data.trails || []).map((trail: any) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          trail.latitude,
          trail.longitude
        );
        return {
          ...trail,
          distance,
          source: 'alltrails' as const,
        };
      });
    }

    const combinedPlaces = [...osmPlaces, ...alltrailsPlaces]
      .sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      })
      .slice(0, 10);

    return {
      places: combinedPlaces,
      cached: false,
    };
  } catch (error) {
    console.error('Error searching nature spots:', error);
    return {
      places: [],
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function searchPlaceByName(
  query: string,
  userLat: number,
  userLon: number
): Promise<NatureSpot[]> {
  try {
    const { data: spots, error } = await supabase
      .from('nature_spots')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching by name:', error);
      return [];
    }

    return (spots || []).map((spot) => ({
      ...spot,
      latitude: Number(spot.latitude),
      longitude: Number(spot.longitude),
      distance: calculateDistance(
        userLat,
        userLon,
        Number(spot.latitude),
        Number(spot.longitude)
      ),
    })).sort((a, b) => a.distance! - b.distance!);
  } catch (error) {
    console.error('Error in place search:', error);
    return [];
  }
}

export async function getUserFavoriteSpots(userId: string): Promise<NatureSpot[]> {
  try {
    const { data, error } = await supabase
      .from('user_favorite_spots')
      .select(`
        *,
        spot:nature_spots (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return (data || []).map((fav: any) => ({
      ...fav.spot,
      latitude: Number(fav.spot.latitude),
      longitude: Number(fav.spot.longitude),
      notes: fav.notes,
    }));
  } catch (error) {
    console.error('Error in favorites:', error);
    return [];
  }
}

export async function addFavoriteSpot(
  userId: string,
  spotId: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_favorite_spots')
      .insert({
        user_id: userId,
        spot_id: spotId,
        notes: notes || null,
      });

    if (error) {
      console.error('Error adding favorite:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in add favorite:', error);
    return false;
  }
}

export async function removeFavoriteSpot(
  userId: string,
  spotId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_favorite_spots')
      .delete()
      .eq('user_id', userId)
      .eq('spot_id', spotId);

    if (error) {
      console.error('Error removing favorite:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in remove favorite:', error);
    return false;
  }
}
