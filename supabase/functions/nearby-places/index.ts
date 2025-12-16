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
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({
          places: generateMockPlaces(latitude, longitude),
          mock: true,
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
    const types = ["park", "campground", "natural_feature"];
    const allPlaces: Place[] = [];

    for (const type of types) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${googleApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const places = data.results.slice(0, 5).map((place: any) => ({
          id: place.place_id,
          name: place.name,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          type: type,
          distance: calculateDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          ),
        }));

        allPlaces.push(...places);
      }
    }

    allPlaces.sort((a, b) => a.distance - b.distance);
    const topThree = allPlaces.slice(0, 3);

    return new Response(
      JSON.stringify({ places: topThree }),
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
      JSON.stringify({ error: "Internal server error" }),
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
      type: "natural_feature",
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