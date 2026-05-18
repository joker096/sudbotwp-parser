/**
 * Edge Function: get-vapid-public-key
 * Возвращает VAPID public key для frontend подписки
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ publicKey: Deno.env.get('VAPID_PUBLIC_KEY') }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
