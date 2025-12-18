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

    console.log(`Searching for parks/trails near ${latitude}, ${longitude}`);

    const radiusMeters = 8000;

    const query = `
      [out:json][timeout:15];
      (
        node["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        way["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        relation["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        node["leisure"="nature_reserve"](around:${radiusMeters},${latitude},${longitude});
        way["leisure"="nature_reserve"](around:${radiusMeters},${latitude},${longitude});
        way["highway"="path"]["name"](around:${radiusMeters},${latitude},${longitude});
        way["highway"="footway"]["name"](around:${radiusMeters},${latitude},${longitude});
        relation["route"="hiking"](around:${radiusMeters},${latitude},${longitude});
      );
      out center 20;
    `.trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(
        `https://overpass-api.de/api/interpreter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("OSM API error:", response.status);
        throw new Error(`OSM API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`OSM returned ${data.elements?.length || 0} elements`);

      const places: Place[] = [];

      if (data.elements && data.elements.length > 0) {
        for (const element of data.elements) {
          const lat = element.lat || element.center?.lat;
          const lng = element.lon || element.center?.lon;
          const name = element.tags?.name;

          if (!lat || !lng || !name) continue;

          const distance = calculateDistance(latitude, longitude, lat, lng);

          let type = "park";
          if (element.tags?.highway === "path" || element.tags?.highway === "footway") {
            type = "trail";
          } else if (element.tags?.route === "hiking") {
            type = "hiking trail";
          } else if (element.tags?.leisure === "nature_reserve") {
            type = "nature reserve";
          }

          places.push({
            id: `osm-${element.id}`,
            name,
            latitude: lat,
            longitude: lng,
            type,
            distance,
          });
        }
      }

      places.sort((a, b) => a.distance - b.distance);
      const uniquePlaces = Array.from(
        new Map(places.map((p) => [p.name, p])).values()
      ).slice(0, 10);

      console.log(`Returning ${uniquePlaces.length} unique places`);

      return new Response(
        JSON.stringify({ places: uniquePlaces }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("OSM fetch failed:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error:", error);

    let lat = 0, lng = 0;
    try {
      const body = await req.clone().json();
      lat = body.latitude || 0;
      lng = body.longitude || 0;
    } catch {}

    const fallbackPlaces = generateFallbackPlaces(lat, lng);
    console.log("Returning fallback places");

    return new Response(
      JSON.stringify({ places: fallbackPlaces, fallback: true }),
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
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function generateFallbackPlaces(latitude: number, longitude: number): Place[] {
  if (!latitude || !longitude) {
    return [
      { id: "fallback-1", name: "Local Park", latitude: 37.7749, longitude: -122.4194, type: "park", distance: 500 },
      { id: "fallback-2", name: "Nature Trail", latitude: 37.7739, longitude: -122.4184, type: "trail", distance: 1200 },
    ];
  }

  return [
    {
      id: "fallback-1",
      name: "Nearby Park",
      latitude: latitude + 0.008,
      longitude: longitude + 0.008,
      type: "park",
      distance: 1000,
    },
    {
      id: "fallback-2",
      name: "Nature Trail",
      latitude: latitude - 0.012,
      longitude: longitude + 0.015,
      type: "trail",
      distance: 2000,
    },
    {
      id: "fallback-3",
      name: "Community Park",
      latitude: latitude + 0.015,
      longitude: longitude - 0.01,
      type: "park",
      distance: 2200,
    },
  ];
}
