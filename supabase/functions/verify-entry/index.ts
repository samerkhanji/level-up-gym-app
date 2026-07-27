// verify-entry — called by the gate scanner (turnstile controller / reception
// scanner device) when a member's QR is scanned. Authenticated with a per-gate
// API key, NOT a user JWT.
//
// Request:  { gate_key: string, gate_id: string, qr: string }
// Response: { open: boolean, direction?: "entry"|"exit", member?: {...}, reason?: string }
//
// Every attempt — success or failure — is written to access_events.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function hmac(payload: string): Promise<string> {
  const secret = Deno.env.get("ENTRY_TOKEN_SECRET")!;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
    .slice(0, 16);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type EventInsert = Record<string, unknown>;

async function logEvent(e: EventInsert) {
  await supabase.from("access_events").insert(e);
}

function closed(reason: string, extra: Record<string, unknown> = {}) {
  return Response.json({ open: false, reason, ...extra });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { gate_key, gate_id, qr } = await req.json();
  if (!gate_key || !gate_id || !qr) {
    return Response.json({ error: "gate_key, gate_id, qr required" }, { status: 400 });
  }

  // Gate authentication
  const { data: gate } = await supabase
    .from("gates")
    .select("id, branch_id, direction, is_active, api_key_hash")
    .eq("id", gate_id)
    .single();
  if (!gate || !gate.is_active || gate.api_key_hash !== await sha256(gate_key)) {
    return Response.json({ error: "gate_unauthorized" }, { status: 401 });
  }

  const base = { gate_id: gate.id, branch_id: gate.branch_id, method: "qr" };

  // Token parse + signature check (blocks guessed/forged jtis cheaply)
  const [jti, sig] = String(qr).split(".");
  if (!jti || !sig || sig !== await hmac(jti)) {
    await logEvent({ ...base, event_type: "entry_denied", deny_reason: "invalid_token" });
    return closed("invalid_token");
  }

  // Atomically claim the token — replay protection. Only one scan can win.
  const { data: token } = await supabase
    .from("entry_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("jti", jti)
    .is("used_at", null)
    .select("member_id, device_id, branch_id, purpose, expires_at")
    .maybeSingle();

  if (!token) {
    await logEvent({ ...base, event_type: "entry_denied", deny_reason: "token_replayed", token_jti: jti });
    return closed("token_replayed");
  }
  const eventBase = { ...base, member_id: token.member_id, device_id: token.device_id, token_jti: jti };

  if (new Date(token.expires_at) < new Date()) {
    await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "token_expired" });
    return closed("token_expired");
  }
  if (token.branch_id !== gate.branch_id) {
    await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "wrong_branch" });
    return closed("wrong_branch");
  }

  // Member snapshot for the reception display
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, photo_url, status, balance_due_usd")
    .eq("id", token.member_id)
    .single();
  if (!member || member.status === "blocked") {
    await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "account_blocked" });
    return closed("account_blocked");
  }

  // Current anti-passback state (re-checked at scan time, not just issue time)
  const { data: open } = await supabase
    .from("gym_sessions")
    .select("id, entered_at, subscription_id")
    .eq("member_id", member.id)
    .eq("status", "inside")
    .maybeSingle();

  const memberPayload = { name: member.full_name, photo_url: member.photo_url };

  if (token.purpose === "entry") {
    if (open) {
      await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "already_inside" });
      return closed("already_inside", { member: memberPayload });
    }
    if (gate.direction === "exit") {
      await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "invalid_token" });
      return closed("wrong_gate_direction");
    }
    // Re-verify subscription is still active at scan time
    const today = new Date().toISOString().slice(0, 10);
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("member_id", member.id)
      .eq("status", "active")
      .lte("starts_on", today)
      .gte("ends_on", today)
      .order("ends_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) {
      await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "subscription_expired" });
      return closed("subscription_expired", { member: memberPayload });
    }

    const { error: sessErr } = await supabase.from("gym_sessions").insert({
      member_id: member.id,
      branch_id: gate.branch_id,
      subscription_id: sub.id,
      device_id: token.device_id,
      entry_gate_id: gate.id,
      entry_method: "qr",
      status: "inside",
    });
    if (sessErr) {
      // unique index violation = concurrent double entry; treat as passback
      await logEvent({ ...eventBase, event_type: "entry_denied", deny_reason: "already_inside" });
      return closed("already_inside", { member: memberPayload });
    }
    await logEvent({ ...eventBase, event_type: "entry_granted" });
    return Response.json({ open: true, direction: "entry", member: memberPayload });
  }

  // ---- exit flow ----
  if (!open) {
    await logEvent({ ...eventBase, event_type: "exit_denied", deny_reason: "not_inside" });
    return closed("not_inside", { member: memberPayload });
  }
  if (gate.direction === "entry") {
    await logEvent({ ...eventBase, event_type: "exit_denied", deny_reason: "invalid_token" });
    return closed("wrong_gate_direction");
  }

  await supabase
    .from("gym_sessions")
    .update({
      exited_at: new Date().toISOString(),
      exit_gate_id: gate.id,
      exit_method: "qr",
      status: "completed",
    })
    .eq("id", open.id);

  await logEvent({ ...eventBase, event_type: "exit_granted" });
  return Response.json({ open: true, direction: "exit", member: memberPayload });
});
