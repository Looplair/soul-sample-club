// Supabase Edge Function to trigger MP3 preview generation
// Calls the Vercel API endpoint to do the actual conversion

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  console.log("=== generate-preview function called ===");
  console.log("Method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse the webhook payload
    const rawBody = await req.text();
    console.log("Raw body received, length:", rawBody.length);

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payload type:", payload.type);
    console.log("Payload table:", payload.table);

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      console.log("Skipping non-INSERT event");
      return new Response(
        JSON.stringify({ message: "Ignoring non-INSERT event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sample = payload.record;
    console.log("Sample ID:", sample?.id);
    console.log("Sample file_path:", sample?.file_path);
    console.log("Sample preview_path:", sample?.preview_path);

    // Skip if preview already exists
    if (sample.preview_path) {
      console.log("Preview already exists, skipping");
      return new Response(
        JSON.stringify({ message: "Preview already exists, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if file_path is not a WAV file
    if (!sample.file_path || !sample.file_path.toLowerCase().endsWith(".wav")) {
      console.log("Not a WAV file, skipping");
      return new Response(
        JSON.stringify({ message: "Not a WAV file, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Triggering preview generation for sample ${sample.id}`);

    // Call the Vercel API to generate the preview
    // This uses the internal API that already has FFmpeg set up
    const vercelApiUrl = Deno.env.get("VERCEL_API_URL") || "https://soulsampleclub.com";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Calling Vercel API at:", vercelApiUrl);

    const response = await fetch(`${vercelApiUrl}/api/admin/samples/generate-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass service role key for auth bypass, or use a shared secret
        "x-service-key": serviceRoleKey || "",
      },
      body: JSON.stringify({ sampleId: sample.id }),
    });

    const result = await response.text();
    console.log("Vercel API response status:", response.status);
    console.log("Vercel API response:", result);

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status} - ${result}`);
    }

    console.log(`SUCCESS: Preview generation triggered for sample ${sample.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sample_id: sample.id,
        vercel_response: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ERROR in generate-preview:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
