/**
 * Edge Function для проксирования запросов к pravo.gov.ru
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PRAVO_API = "http://publication.pravo.gov.ru/api";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "PublicBlocks";
    const parent = url.searchParams.get("parent");
    const block = url.searchParams.get("block");
    const page = url.searchParams.get("page") || "1";
    const pageSize = url.searchParams.get("pageSize") || "20";
    const searchQuery = url.searchParams.get("q");
    
    // Build the target URL
    let targetUrl = `${PRAVO_API}/${endpoint}`;
    const params = new URLSearchParams();
    
    if (parent) params.set("parent", parent);
    if (block) params.set("block", block);
    params.set("page", page);
    params.set("pageSize", pageSize);
    if (searchQuery) params.set("q", searchQuery);
    
    const queryString = params.toString();
    if (queryString) targetUrl += `?${queryString}`;
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Make the request to the Pravo API
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Pravo API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
