import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  latitude: number;
  longitude: number;
}

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  distance: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { latitude, longitude }: RequestBody = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Latitude and longitude are required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const radius = 8046.72;
    const allPlaces: Place[] = [];
    const debugInfo: any = { searches: [], totalResults: 0, source: "openstreetmap" };

    const queries = [
      { amenity: "park", type: "park" },
      { leisure: "park", type: "park" },
      { leisure: "nature_reserve", type: "nature reserve" },
      { natural: "beach", type: "beach" },
      { natural: "water", type: "lake" },
      { leisure: "garden", type: "garden" },
      { tourism: "viewpoint", type: "viewpoint" },
      { highway: "path", type: "trail" },
      { highway: "footway", type: "trail" },
      { highway: "track", type: "trail" },
      { route: "hiking", type: "hiking trail" },
    ];

    for (const query of queries) {
      const key = Object.keys(query).find(k => k !== 'type');
      const value = key ? query[key as keyof typeof query] : '';
      const type = query.type;

      const url = `https://overpass-api.de/api/interpreter?data=[out:json];(node[${key}=${value}](around:${radius},${latitude},${longitude});way[${key}=${value}](around:${radius},${latitude},${longitude}););out center;`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        debugInfo.searches.push({
          query: `${key}=${value}`,
          status: response.status,
          resultCount: data.elements?.length || 0,
        });

        if (data.elements && data.elements.length > 0) {
          const places = data.elements.slice(0, 5).map((element: any) => {
            const lat = element.lat || element.center?.lat;
            const lng = element.lon || element.center?.lon;
            
            if (!lat || !lng) return null;
            
            const distance = calculateDistance(latitude, longitude, lat, lng);

            return {
              id: `osm-${element.id}`,
              name: element.tags?.name || element.tags?.ref || `${type}`,
              latitude: lat,
              longitude: lng,
              type: type,
              distance: distance,
            };
          }).filter((place: any) => place !== null);

          allPlaces.push(...places);
          debugInfo.totalResults += places.length;
        }
      } catch (error) {
        console.error(`Error fetching ${key}=${value}:`, error);
      }

      if (allPlaces.length >= 15) {
        break;
      }
    }

    allPlaces.sort((a, b) => a.distance - b.distance);
    const uniquePlaces = Array.from(
      new Map(allPlaces.map((place) => [place.id, place])).values()
    );
    const topThree = uniquePlaces.slice(0, 3);

    console.log(`Found ${topThree.length} places using OpenStreetMap for ${latitude},${longitude}`);

    return new Response(
      JSON.stringify({ places: topThree, debug: debugInfo }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        places: generateMockPlaces(0, 0),
        error: "Using fallback mock data",
        debug: { errorMessage: String(error), mock: true }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

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

function generateMockPlaces(latitude: number, longitude: number): Place[] {
  return [
    {
      id: "mock-1",
      name: "Nearby Park",
      latitude: latitude + 0.01,
      longitude: longitude + 0.01,
      type: "park",
      distance: 1200,
    },
    {
      id: "mock-2",
      name: "Nature Trail",
      latitude: latitude - 0.015,
      longitude: longitude + 0.02,
      type: "trail",
      distance: 2100,
    },
    {
      id: "mock-3",
      name: "Scenic Viewpoint",
      latitude: latitude + 0.02,
      longitude: longitude - 0.015,
      type: "viewpoint",
      distance: 2800,
    },
  ];
}