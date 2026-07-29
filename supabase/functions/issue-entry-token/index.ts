// issue-entry-token — called by the member app to get a short-lived entry/exit
// credential. The QR shown on screen encodes `${jti}.${hmac}` and the app
// refreshes it every ~25 seconds (token TTL 60s).
//
// All eligibility checks happen here so the app can show the exact deny
// reason BEFORE the member reaches the gate.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TOKEN_TTL_SECONDS = 60;

async function hmac(payload: string): Promise<string> {
  const secret = Deno.env.get("ENTRY_TOKEN_SECRET")!;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
    .slice(0, 16); // 16 url-safe chars is plenty on top of a random uuid
}

function deny(reason: string, message: string) {
  return Response.json({ allowed: false, reason, message }, { status: 200 });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Authenticated member context
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return Response.json({ allowed: false, reason: "unauthenticated" }, { status: 401 });
  }

  const { device_id, branch_id } = await req.json();
  if (!device_id || !branch_id) {
    return Response.json({ error: "device_id and branch_id required" }, { status: 400 });
  }

  // Member lookup
  const { data: member } = await supabase
    .from("members")
    .select("id, status, balance_due_usd, full_name, photo_url")
    .eq("user_id", userData.user.id)
    .is("deleted_at", null)
    .single();
  if (!member) return deny("no_member", "No member profile found for this account.");
  // allow-list: 'suspended' (or any future non-active status) is denied too
  if (member.status !== "active") return deny("account_blocked", "Your account is not active. Please see reception.");
  if (Number(member.balance_due_usd) > 0) {
    return deny("unpaid_balance", "You have an unpaid balance. Please settle it at reception.");
  }

  // Device binding — must be THE active registered device
  const { data: device } = await supabase
    .from("member_devices")
    .select("id")
    .eq("member_id", member.id)
    .eq("device_id", device_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!device) {
    return deny("device_mismatch", "This phone is not your registered device. Reception can transfer your account.");
  }

  // Active subscription covering today
  const today = new Date().toISOString().slice(0, 10);
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, ends_on, plan_id, plans(all_branches, branch_id)")
    .eq("member_id", member.id)
    .eq("status", "active")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("ends_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) {
    const { data: frozen } = await supabase
      .from("subscriptions").select("id").eq("member_id", member.id)
      .eq("status", "frozen").limit(1).maybeSingle();
    if (frozen) return deny("subscription_frozen", "Your membership is frozen. Unfreeze it to enter.");
    return deny("subscription_expired", "No active subscription. Renew to enter the gym.");
  }

  // Branch check (plan may be branch-restricted)
  const plan = sub.plans as unknown as { all_branches: boolean; branch_id: string | null };
  if (plan && !plan.all_branches && plan.branch_id !== branch_id) {
    return deny("wrong_branch", "Your plan does not include this branch.");
  }

  // Anti-passback state decides the token purpose
  const { data: open } = await supabase
    .from("gym_sessions")
    .select("id, entered_at")
    .eq("member_id", member.id)
    .eq("status", "inside")
    .maybeSingle();
  const purpose = open ? "exit" : "entry";

  // Issue token
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  const { data: token, error: tokenErr } = await supabase
    .from("entry_tokens")
    .insert({
      member_id: member.id,
      device_id,
      branch_id,
      purpose,
      expires_at: expiresAt,
    })
    .select("jti")
    .single();
  if (tokenErr) return Response.json({ error: "token_issue_failed" }, { status: 500 });

  const sig = await hmac(token.jti);
  return Response.json({
    allowed: true,
    purpose,                       // app shows "Scan to enter" vs "Scan to exit"
    qr: `${token.jti}.${sig}`,     // encode this string as the QR
    expires_at: expiresAt,
    inside_since: open?.entered_at ?? null,
    member: { name: member.full_name, photo_url: member.photo_url },
  });
});
