// © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt
// Supabase Edge Function "course-handoff" (HANDOFF-1): keeps a learner signed in when they go from Daily Turkish to
// Daily Turkmen or back. The two sites use the same accounts, but a browser keeps each site's sign-in apart.
//
// The site the learner leaves calls this function with its session (turkish-account.js / turkmen-account.js do it
// when the header's link to the sister course is clicked). The function checks who is calling, then makes a
// single-use sign-in token for that same account (the token of a "magic link"; no email is sent) and returns its hash.
// The other site signs in with it (verifyOtp), so it gets a session of its own and the two never share a refresh token.
//
// Deploy (Supabase dashboard): Edge Functions › Deploy a new function › Via Editor; name it exactly course-handoff;
// paste this file; Deploy. Then, in the function's Details (or Settings), turn OFF "Verify JWT with legacy secret"
// (or "Enforce JWT verification"): the function checks the caller itself, below. No secret to add: Supabase gives
// every function SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never copy the service key into the website.
// (With the CLI instead: copy to supabase/functions/course-handoff/index.ts and run
//  `supabase functions deploy course-handoff --no-verify-jwt --project-ref xmbwayxoqlvhqenmiyzr`.)
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const ORIGINS = [
  "https://dailyturkish.app",
  "https://dailyturkmen.app",
  "https://gregoiremaillard.com",
  "https://www.gregoiremaillard.com",
];

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" };
  const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return answer(405, { error: "POST only" });
  // Only the course sites may ask (a browser always sends Origin on this cross-site request).
  if (!origin || !ORIGINS.includes(origin)) return answer(403, { error: "origin not allowed" });

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return answer(401, { error: "not signed in" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who is calling: the session's access token must be valid and belong to an account with an email.
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt);
  const email = who?.user?.email;
  if (whoErr || !email) return answer(401, { error: "not signed in" });

  // A single-use token for the same account. generateLink sends no email.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const token_hash = data?.properties?.hashed_token;
  if (error || !token_hash) return answer(500, { error: "couldn't make a sign-in token" });

  return answer(200, { token_hash });
});
