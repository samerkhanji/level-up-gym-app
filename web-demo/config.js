/* GYM-APP backend switch.
   mode 'demo'  — today's behavior: DemoData engine + GymBus, no server.
   mode 'live'  — pages talk to Supabase (fill url + anonKey from the project's
                  Settings → API after launch; see LAUNCH.md). The anon key is
                  safe to ship in the client BY DESIGN — every table is behind
                  RLS and every mutation behind a role-checked RPC (0005/0006).
   Pages migrate one at a time: a page that doesn't read this yet just keeps
   working in demo mode. */
window.GYM_BACKEND = {
  mode: 'demo',
  url: '',        // https://<project-ref>.supabase.co
  anonKey: '',
};
