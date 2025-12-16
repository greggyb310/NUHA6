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

    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!googleApiKey) {
      console.log("GOOGLE_PLACES_API_KEY not configured, using mock data");
      return new Response(
        JSON.stringify({
          places: generateMockPlaces(latitude, longitude),
          debug: { mock: true, reason: "No API key configured" },
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

    const radius = 8046.72;
    const keywords = [
      "park",
      "trail",
      "nature",
      "hiking",
      "beach",
      "river",
      "lake",
      "forest",
      "mountain",
      "preserve",
      "recreation",
    ];
    const allPlaces: Place[] = [];
    const debugInfo: any = { searches: [], totalResults: 0 };

    for (const keyword of keywords) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${keyword}+near+${latitude},${longitude}&radius=${radius}&key=${googleApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      debugInfo.searches.push({
        keyword,
        status: data.status,
        resultCount: data.results?.length || 0,
      });

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const places = data.results.slice(0, 3).map((place: any) => {
          const lat = place.geometry.location.lat;
          const lng = place.geometry.location.lng;
          const distance = calculateDistance(latitude, longitude, lat, lng);

          if (distance <= radius) {
            return {
              id: place.place_id,
              name: place.name,
              latitude: lat,
              longitude: lng,
              type: keyword,
              distance: distance,
            };
          }
          return null;
        }).filter((place: any) => place !== null);

        allPlaces.push(...places);
        debugInfo.totalResults += places.length;
      }

      if (allPlaces.length >= 10) {
        break;
      }
    }

    allPlaces.sort((a, b) => a.distance - b.distance);
    const uniquePlaces = Array.from(
      new Map(allPlaces.map((place) => [place.id, place])).values()
    );
    const topThree = uniquePlaces.slice(0, 3);

    console.log(`Found ${topThree.length} places for location ${latitude},${longitude}`);

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
        places: [],
        error: "Internal server error",
        debug: { errorMessage: String(error) }
      }),
      {
        status: 500,
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
      name: "Central Park",
      latitude: latitude + 0.01,
      longitude: longitude + 0.01,
      type: "park",
      distance: 1200,
    },
    {
      id: "mock-2",
      name: "Riverside Trail",
      latitude: latitude - 0.015,
      longitude: longitude + 0.02,
      type: "trail",
      distance: 2100,
    },
    {
      id: "mock-3",
      name: "Mountain View Park",
      latitude: latitude + 0.02,
      longitude: longitude - 0.015,
      type: "park",
      distance: 2800,
    },
  ];
}