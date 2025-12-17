import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AllTrailsRequest {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  activities?: string[];
  filters?: string;
  numTrails?: number;
}

interface TrailResult {
  trail_name: string;
  hyperlink_url: string;
  location: string;
  description?: string;
  difficulty_rating: string;
  elevation_gain: string;
  length: string;
  estimated_completion_time: string;
  star_rating: number;
  image?: string;
  geoloc: {
    lat: number;
    lng: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const alltrailsToken = Deno.env.get("ALLTRAILS_API_TOKEN");

    if (!alltrailsToken) {
      throw new Error("AllTrails API token not configured");
    }

    const body: AllTrailsRequest = await req.json();
    const {
      latitude,
      longitude,
      radiusMiles = 10,
      activities = [],
      filters = "",
      numTrails = 10
    } = body;

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Missing latitude or longitude" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const radiusMeters = Math.round(radiusMiles * 1609.34);

    const alltrailsPayload = {
      country_name: "United States",
      raw_query: `trails near ${latitude},${longitude}`,
      location_helper: "near",
      radius: radiusMeters,
      num_trails: numTrails,
      filters: filters || "",
    };

    const alltrailsResponse = await fetch(
      "https://chatgpt-production.alltrails.com/search-trails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${alltrailsToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(alltrailsPayload),
      }
    );

    if (!alltrailsResponse.ok) {
      const errorText = await alltrailsResponse.text();
      console.error("AllTrails API error:", errorText);
      throw new Error(`AllTrails API returned ${alltrailsResponse.status}`);
    }

    const alltrailsData = await alltrailsResponse.json();
    const trails: TrailResult[] = alltrailsData.data || [];

    const formattedTrails = trails.map((trail) => ({
      id: trail.hyperlink_url,
      name: trail.trail_name,
      latitude: trail.geoloc.lat,
      longitude: trail.geoloc.lng,
      type: "trail",
      difficulty: trail.difficulty_rating,
      length: trail.length,
      elevation_gain: trail.elevation_gain,
      estimated_time: trail.estimated_completion_time,
      star_rating: trail.star_rating,
      description: trail.description || "",
      location: trail.location,
      url: trail.hyperlink_url,
      image_url: trail.image,
    }));

    return new Response(
      JSON.stringify({
        trails: formattedTrails,
        assumed_location: alltrailsData.assumed_location,
        count: formattedTrails.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in alltrails-search function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        trails: [],
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
