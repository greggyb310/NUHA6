import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RouteRequest {
  waypoints: Array<{ lat: number; lng: number }>;
  mode?: 'foot' | 'driving';
}

interface OSRMResponse {
  code: string;
  routes: Array<{
    geometry: {
      coordinates: Array<[number, number]>;
    };
    distance: number;
    duration: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { waypoints, mode = 'foot' }: RouteRequest = await req.json();

    if (!waypoints || waypoints.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 waypoints are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const coordinates = waypoints
      .map(wp => `${wp.lng},${wp.lat}`)
      .join(';');

    const osrmUrl = `https://router.project-osrm.org/route/v1/${mode}/${coordinates}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const route = data.routes[0];
    const routeCoordinates = route.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    return new Response(
      JSON.stringify({
        coordinates: routeCoordinates,
        distance: route.distance,
        duration: route.duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Route calculation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to calculate route' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
