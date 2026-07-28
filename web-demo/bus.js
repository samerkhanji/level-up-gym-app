/* GymBus — the cross-dashboard event bus.
   Member app and staff dashboards publish and consume the same event log:
   member submits → staff receives → staff resolves → member is notified → audited.

   Transport: BroadcastChannel (live, between open tabs/windows of this browser)
   + a persisted localStorage log (survives refresh; late-opened dashboards
   catch up). TRUE cross-device sync requires the real backend (see ROADMAP —
   Supabase schema already written); this bus is the same contract, local. */

const GymBus = (() => {
  const LOG_KEY = 'gym_bus_log';
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('gym-bus') : null;
  const handlers = [];
  const nowT = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const readLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { return []; } };
  const writeLog = (log) => localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-60)));

  function send(type, payload) {
    const ev = {
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type, payload, at: nowT(), status: 'open', history: [],
    };
    const log = readLog(); log.push(ev); writeLog(log);
    if (chan) chan.postMessage({ kind: 'event', ev });
    return ev.id;
  }

  /* Only staff dashboards call update — statuses change by human action, never timers. */
  function update(id, status, by, note) {
    const log = readLog();
    const ev = log.find((e) => e.id === id);
    if (!ev) return null;
    ev.status = status;
    ev.history.push({ at: nowT(), by, status, note: note || '' });
    writeLog(log);
    if (chan) chan.postMessage({ kind: 'update', ev });
    return ev;
  }

  function on(fn) { handlers.push(fn); }
  if (chan) chan.onmessage = (m) => handlers.forEach((f) => f(m.data.kind, m.data.ev));

  const all = () => readLog();
  const get = (id) => readLog().find((e) => e.id === id);

  return { send, update, on, all, get };
})();
