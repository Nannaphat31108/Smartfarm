/* Smart Farm — ESP32 dashboard (vanilla JS, no build step) */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Config
   * apiBase: ใส่ URL ของ ESP32 (เช่น "http://192.168.1.50") เพื่อใช้ข้อมูลจริง
   *          ถ้าเว้นว่างไว้ แอปจะจำลองค่าเซนเซอร์ให้เอง
   * ------------------------------------------------------------------ */
  const CONFIG = {
    apiBase: localGet("sf.apiBase", ""),
    pollMs: 5000,
    // ESP32-CAM: URL หลัก (มี /capture, /control) และ URL สตรีม (ปกติคือพอร์ต 81 /stream)
    camBase: localGet("sf.camBase", ""),
    camStream: localGet("sf.camStream", ""),
    // ความเร็วจำลอง: 1 นาทีของปั๊ม = 60000 / DEMO_SPEED ms
    demoSpeed: 20,
  };

  /* ---------- Icons (lucide-style strokes) ---------- */
  const P = {
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    thermo: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    chart: '<path d="M4 4v16h16"/><path d="M9 16v-4M13 16V8M17 16v-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    power: '<path d="M12 3v9"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4-4L5 21"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5v-2z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19"/><path d="M9 7h6M9 11h4"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>',
  };
  const icon = (n, extra = "") => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${P[n]}</svg>`;

  /* ---------- Storage helpers ---------- */
  function localGet(k, d) {
    try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function localSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
  }

  /* ---------- State ---------- */
  const DAYS = { daily: "ทุกวัน", weekdays: "จ.–ศ.", weekends: "ส.–อา." };
  let uid = Date.now();
  const nid = () => "r" + (uid++).toString(36);

  const defaultState = () => ({
    started: false,
    sensors: { temp: 31.2, hum: 68, soil: 46, lux: 12400 },
    online: true,
    updatedAt: Date.now(),
    light: { on: true, mode: "schedule", minutesToday: 70 },
    pump: { on: false, runUntil: 0, threshold: 40, duration: 3, lastRun: { at: pastAt(17, 0), min: 3 }, minutesToday: 8 },
    autoOn: true,
    alertsOn: true,
    rules: [
      { id: nid(), device: "light", kind: "time", start: "18:00", end: "22:00", days: "daily", on: true },
      { id: nid(), device: "pump", kind: "time", start: "06:30", duration: 5, days: "daily", on: true },
      { id: nid(), device: "pump", kind: "time", start: "17:00", duration: 3, days: "weekdays", on: true },
      { id: nid(), device: "pump", kind: "soil", on: true },
      { id: nid(), device: "light", kind: "lux", value: 5000, start: "06:00", end: "18:00", on: false },
      { id: nid(), device: "alert", kind: "temp", value: 35, on: true },
    ],
    notifications: [
      { at: pastAt(17, 3), type: "pump", text: "รดน้ำเสร็จแล้ว 3 นาที" },
      { at: pastAt(6, 35), type: "pump", text: "รดน้ำตามเวลา 06:30 เสร็จแล้ว" },
    ],
    unread: 1,
    history: null,
    lastFired: {},
    camera: { flash: false, res: 8, timelapse: false, every: 60, lastShot: 0 },
  });

  let state = Object.assign(defaultState(), localGet("sf.state", {}));
  if (!state.history) state.history = seedHistory(state.sensors);

  const ui = {
    route: state.started ? "home" : "welcome",
    devFilter: "all",
    devQuery: "",
    autoFilter: "all",
    range: "day",
    metric: "soil",
    camPlaying: true,
    camFull: false,
  };

  function save() {
    const { history, ...rest } = state;
    localSet("sf.state", Object.assign({}, rest, { history }));
  }

  function todayAt(h, m) { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); }
  // most recent past occurrence of h:m (yesterday if it hasn't happened yet today)
  function pastAt(h, m) { const t = todayAt(h, m); return t > Date.now() ? t - 86400000 : t; }

  /* ---------- Formatting ---------- */
  const isNum = (v) => typeof v === "number" && !isNaN(v);
  const fmtNum = (n) => (isNum(n) ? Math.round(n).toLocaleString("en-US") : "–");
  const fmt1 = (n) => (isNum(n) ? (Math.round(n * 10) / 10).toFixed(1) : "–");
  const rnd = (n) => (isNum(n) ? Math.round(n) : "–");
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (t) => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const fmtDuration = (min) => {
    min = Math.round(min);
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h} ชม. ${m} นาที` : `${m} นาที`;
  };
  function ago(t) {
    const s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return `${s} วินาทีที่แล้ว`;
    if (s < 3600) return `${Math.round(s / 60)} นาทีที่แล้ว`;
    return `${Math.round(s / 3600)} ชั่วโมงที่แล้ว`;
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "สวัสดีตอนดึก";
    if (h < 12) return "สวัสดีตอนเช้า";
    if (h < 16) return "สวัสดีตอนบ่าย";
    if (h < 19) return "สวัสดีตอนเย็น";
    return "สวัสดีตอนค่ำ";
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Rules ---------- */
  function describeRule(r) {
    if (r.device === "light" && r.kind === "time")
      return { name: "เปิดไฟปลูกต้นไม้", desc: `${r.start}–${r.end} · ${DAYS[r.days]}`, icon: "bulb", c: "c-yellow", group: "time" };
    if (r.device === "pump" && r.kind === "time")
      return { name: `รดน้ำ ${r.duration} นาที`, desc: `${r.start} · ${DAYS[r.days]}`, icon: "drop", c: "c-blue", group: "time" };
    if (r.kind === "soil")
      return { name: "รดน้ำเมื่อดินแห้ง", desc: `ความชื้นดินต่ำกว่า ${state.pump.threshold}%`, icon: "refresh", c: "c-green", group: "sensor" };
    if (r.kind === "lux")
      return { name: "เปิดไฟเสริมเมื่อแสงน้อย", desc: `แสงต่ำกว่า ${fmtNum(r.value)} lux · ${r.start}–${r.end}`, icon: "sun", c: "c-yellow", group: "sensor" };
    if (r.kind === "temp")
      return { name: "แจ้งเตือนอากาศร้อน", desc: `อุณหภูมิเกิน ${r.value}°C`, icon: "bell", c: "c-orange", group: "sensor" };
    return { name: "กฎ", desc: "", icon: "refresh", c: "c-green", group: "sensor" };
  }

  function dayMatches(days, d) {
    const wd = d.getDay();
    if (days === "weekdays") return wd >= 1 && wd <= 5;
    if (days === "weekends") return wd === 0 || wd === 6;
    return true;
  }
  function inWindow(start, end, nowMin) {
    const s = toMin(start), e = toMin(end);
    return s <= e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e;
  }
  const lightTimeRules = () => state.rules.filter((r) => r.device === "light" && r.kind === "time");

  function lightAutoOffText() {
    if (!state.light.on) {
      if (state.light.mode === "manual") return "ควบคุมด้วยตนเอง";
      const next = lightTimeRules().filter((r) => r.on).sort((a, b) => toMin(a.start) - toMin(b.start))[0];
      return next ? `เปิดอัตโนมัติตามเวลา ${next.start}` : "ยังไม่มีเวลาที่ตั้งไว้";
    }
    if (state.light.mode === "schedule") {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const r = lightTimeRules().find((x) => x.on && inWindow(x.start, x.end, nowMin));
      if (r) return `ปิดอัตโนมัติตามเวลา ${r.end}`;
    }
    if (state.light.mode === "light") return "ปิดอัตโนมัติเมื่อแสงเพียงพอ";
    return "ควบคุมด้วยตนเอง";
  }

  function nextWaterText() {
    const c = nextWaterSlot();
    return c ? `รอบรดน้ำถัดไป ${c.day} ${c.start}` : "ยังไม่มีรอบรดน้ำที่ตั้งไว้";
  }
  function nextWaterSlot() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const cands = [];
    state.rules.filter((r) => r.on && r.device === "pump" && r.kind === "time").forEach((r) => {
      for (let off = 0; off < 8; off++) {
        const d = new Date(now); d.setDate(d.getDate() + off);
        if (!dayMatches(r.days, d)) continue;
        if (off === 0 && toMin(r.start) <= nowMin) continue;
        cands.push({ off, min: toMin(r.start), start: r.start });
        break;
      }
    });
    if (!cands.length) return null;
    cands.sort((a, b) => a.off - b.off || a.min - b.min);
    const c = cands[0];
    return { start: c.start, day: c.off === 0 ? "วันนี้" : c.off === 1 ? "พรุ่งนี้" : `อีก ${c.off} วัน` };
  }

  /* ---------- Device control (+ ESP32 API) ---------- */
  // with a real board connected, automation runs on the ESP32 and timers are real-time
  const board = () => !!CONFIG.apiBase;
  const speed = () => (board() ? 1 : CONFIG.demoSpeed);

  async function api(path, body) {
    if (!CONFIG.apiBase) return null;
    try {
      const res = await fetch(CONFIG.apiBase.replace(/\/$/, "") + path, body
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : undefined);
      if (!res.ok) throw new Error(res.status);
      state.online = true;
      return await res.json().catch(() => ({}));
    } catch (e) {
      state.online = false;
      return null;
    }
  }

  function setLight(on, source) {
    if (state.light.on === on) return;
    state.light.on = on;
    api("/relay", { channel: 1, on });
    if (source === "user") toast(on ? "เปิดไฟปลูกต้นไม้แล้ว" : "ปิดไฟปลูกต้นไม้แล้ว");
  }

  function startPump(minutes, source) {
    const ms = (minutes * 60000) / speed();
    state.pump.on = true;
    state.pump.runUntil = Date.now() + ms;
    state.pump.runMin = minutes;
    state.pump.lastRun = { at: Date.now(), min: minutes };
    api("/relay", { channel: 2, on: true, minutes });
    if (source === "user") toast(`เริ่มรดน้ำ ${minutes} นาที`);
    else notify("pump", source);
  }
  function stopPump(source) {
    if (!state.pump.on) return;
    const ranMin = state.pump.runMin - Math.max(0, state.pump.runUntil - Date.now()) * speed() / 60000;
    if (!board()) state.pump.minutesToday += Math.max(0, ranMin);
    state.pump.on = false;
    state.pump.runUntil = 0;
    api("/relay", { channel: 2, on: false });
    if (source === "user") toast("หยุดปั๊มน้ำแล้ว");
  }

  function boardConfig() {
    const luxRule = state.rules.find((r) => r.kind === "lux");
    return {
      auto: state.autoOn,
      threshold: state.pump.threshold,
      duration: state.pump.duration,
      lightMode: state.light.mode,
      soilRule: state.rules.some((r) => r.kind === "soil" && r.on),
      lightSchedules: lightTimeRules().map(({ start, end, days, on }) => ({ start, end, days, on })),
      pumpSchedules: state.rules.filter((r) => r.device === "pump" && r.kind === "time")
        .map(({ start, duration, days, on }) => ({ start, duration, days, on })),
      lux: luxRule ? { on: luxRule.on, value: luxRule.value, start: luxRule.start, end: luxRule.end }
        : { on: false, value: 5000, start: "06:00", end: "18:00" },
    };
  }
  let syncTimer = null, lastSynced = "";
  function syncConfig(force) {
    if (!board()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const cfg = JSON.stringify(boardConfig());
      if (!force && cfg === lastSynced) return;
      if (await api("/config", JSON.parse(cfg))) lastSynced = cfg;
    }, 400);
  }

  function notify(type, text) {
    state.notifications.unshift({ at: Date.now(), type, text });
    state.notifications = state.notifications.slice(0, 30);
    state.unread++;
  }

  /* ---------- Simulation / polling ---------- */
  function seedHistory(s) {
    const day = [];
    let soil = s.soil + 8;
    for (let i = 0; i < 25; i++) {
      if (i === 13) soil += 12; // watering bump
      soil -= 0.55 + Math.random() * 0.3;
      day.push({
        soil: i === 24 ? s.soil : soil,
        temp: 27 + 5 * Math.sin(((i - 6) / 24) * Math.PI * 2 - Math.PI / 2 + Math.PI) * -1 + Math.random(),
        hum: 70 - 8 * Math.sin((i / 24) * Math.PI * 2) + Math.random() * 3,
        lux: Math.max(0, 30000 * Math.sin(((i - 6) / 12) * Math.PI)) + Math.random() * 600,
      });
    }
    day[24] = { soil: s.soil, temp: s.temp, hum: s.hum, lux: s.lux };
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        soil: 44 + Math.random() * 12, temp: 29 + Math.random() * 4,
        hum: 62 + Math.random() * 10, lux: 14000 + Math.random() * 9000,
      });
    }
    week[6] = { soil: s.soil, temp: s.temp, hum: s.hum, lux: s.lux };
    return { day, week, lastPush: Date.now() };
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const jitter = (v, amt) => v + (Math.random() - 0.5) * amt;

  function simulate(dtMs) {
    const s = state.sensors;
    const scaled = (dtMs / 60000) * CONFIG.demoSpeed; // demo minutes elapsed
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const daylight = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
    s.lux = clamp(jitter(daylight * 28000 + 300, 900), 0, 60000);
    s.temp = clamp(jitter(s.temp + (26 + daylight * 8 - s.temp) * 0.02, 0.25), 15, 45);
    s.hum = clamp(jitter(s.hum + (75 - daylight * 15 - s.hum) * 0.02, 0.6), 20, 99);
    if (state.pump.on) {
      s.soil = clamp(s.soil + 1.6 * scaled, 0, 95);
    } else {
      s.soil = clamp(s.soil - 0.02 * scaled - Math.random() * 0.05, 0, 100);
    }
    state.updatedAt = Date.now();
  }

  async function poll() {
    if (CONFIG.apiBase) {
      const data = await api("/sensors");
      if (data) applyBoard(data);
    } else {
      simulate(CONFIG.pollMs);
    }
  }
  function applyBoard(data) {
    ["temp", "hum", "soil", "lux"].forEach((k) => {
      if (k in data) state.sensors[k] = isNum(data[k]) ? data[k] : null; // null = sensor not connected
    });
    if (typeof data.light === "boolean") state.light.on = data.light;
    if (typeof data.pump === "boolean") {
      const rem = isNum(data.pumpRemaining) ? data.pumpRemaining : 0;
      if (data.pump && !state.pump.on) {
        state.pump.runMin = Math.max(1, Math.round(rem / 60));
        state.pump.lastRun = { at: Date.now(), min: state.pump.runMin };
        notify("pump", "บอร์ดเริ่มรดน้ำ");
      }
      if (!data.pump && state.pump.on) notify("pump", "รดน้ำเสร็จแล้ว");
      state.pump.on = data.pump;
      state.pump.runUntil = data.pump ? Date.now() + rem * 1000 : 0;
    }
    if (isNum(data.lightMinutesToday)) state.light.minutesToday = data.lightMinutesToday;
    if (isNum(data.pumpMinutesToday)) state.pump.minutesToday = data.pumpMinutesToday;
    if (["schedule", "light", "manual"].includes(data.lightMode)) state.light.mode = data.lightMode;
    state.board = { soilRaw: data.soilRaw, clock: data.clock, rssi: data.rssi };
    state.updatedAt = Date.now();
  }

  let lastTick = Date.now();
  function automation() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dt = Date.now() - lastTick;
    lastTick = Date.now();
    const s = state.sensors;

    if (state.light.on && !board()) state.light.minutesToday += (dt / 60000);

    // pump timer (simulation only — the board times itself)
    if (!board() && state.pump.on && Date.now() >= state.pump.runUntil) {
      stopPump("auto");
      notify("pump", `รดน้ำเสร็จแล้ว ${state.pump.lastRun.min} นาที`);
    }

    if (state.autoOn && !board()) {
      // light
      if (state.light.mode === "schedule") {
        const want = lightTimeRules().some((r) => r.on && dayMatches(r.days, now) && inWindow(r.start, r.end, nowMin));
        setLight(want, "auto");
      } else if (state.light.mode === "light") {
        const luxRule = state.rules.find((r) => r.kind === "lux") || { value: 5000, start: "06:00", end: "18:00" };
        setLight(s.lux < luxRule.value && inWindow(luxRule.start, luxRule.end, nowMin), "auto");
      }
      // lux rule acts as booster when in schedule mode too
      const lux = state.rules.find((r) => r.kind === "lux" && r.on);
      if (lux && state.light.mode === "schedule" && !state.light.on && s.lux < lux.value && inWindow(lux.start, lux.end, nowMin)) {
        setLight(true, "auto");
      }

      // pump schedules
      const key = now.toDateString() + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
      state.rules.forEach((r) => {
        if (!r.on || r.device !== "pump" || r.kind !== "time") return;
        if (!dayMatches(r.days, now) || toMin(r.start) !== nowMin) return;
        if (state.lastFired[r.id] === key || state.pump.on) return;
        state.lastFired[r.id] = key;
        startPump(r.duration, `เริ่มรดน้ำตามเวลา ${r.start}`);
      });

      // soil rule
      const soilRule = state.rules.find((r) => r.kind === "soil" && r.on);
      if (soilRule && !state.pump.on && s.soil < state.pump.threshold) {
        startPump(state.pump.duration, `ดินแห้ง (${rnd(s.soil)}%) เริ่มรดน้ำอัตโนมัติ`);
      }
    }

    // alerts
    if (state.alertsOn) {
      const t = state.rules.find((r) => r.kind === "temp" && r.on);
      if (t && isNum(s.temp) && s.temp > t.value && Date.now() - (state.lastFired.temp || 0) > 30 * 60000) {
        state.lastFired.temp = Date.now();
        notify("temp", `อุณหภูมิสูง ${fmt1(s.temp)}°C`);
      }
    }

    // camera time-lapse
    const cam = state.camera;
    if (cam.timelapse && Date.now() - (cam.lastShot || 0) >= cam.every * 60000) {
      cam.lastShot = Date.now();
      takeSnapshot("auto");
    }

    // keep "now" point of history current; push a new point each hour
    const hist = state.history;
    // missing sensors keep the previous value so the chart stays continuous
    const point = (prev) => ["soil", "temp", "hum", "lux"].reduce((o, k) => ((o[k] = isNum(s[k]) ? s[k] : prev[k]), o), {});
    hist.day[hist.day.length - 1] = point(hist.day[hist.day.length - 2]);
    hist.week[hist.week.length - 1] = point(hist.week[hist.week.length - 2]);
    if (Date.now() - hist.lastPush > 3600000) {
      hist.day.shift();
      hist.day.push(point(hist.day[hist.day.length - 1]));
      hist.lastPush = Date.now();
    }
  }

  async function tick() {
    await poll();
    automation();
    save();
    refresh();
  }

  /* ---------- Views ---------- */
  function navBar(variant = "") {
    const items = [
      ["home", "home", "หน้าหลัก"],
      ["devices", "grid", "อุปกรณ์"],
      ["auto", "refresh", "อัตโนมัติ"],
      ["camera", "camera", "กล้อง"],
      ["data", "chart", "ข้อมูล"],
      ["guide", "book", "ต่อวงจร", "nav-extra"],
    ];
    const current = ui.route === "light" || ui.route === "pump" ? "devices" : ui.route;
    return `<nav class="nav ${variant}"><div class="nav-brand">${icon("leaf")}Smart Farm</div>${items.map(([r, i, l, extra = ""]) =>
      `<button data-go="${r}" class="${current === r ? "active" : ""} ${extra}" aria-label="${l}"><span class="pill">${icon(i)}</span>${l}</button>`
    ).join("")}<div class="nav-foot"><span class="status-dot ${state.online ? "" : "off"}"></span>ESP32 ${state.online ? "ออนไลน์" : "ออฟไลน์"}</div></nav>`;
  }

  const views = {};

  views.welcome = () => `
    <section class="welcome">
      <div class="brand">${icon("leaf")}Smart Farm</div>
      <h1>ฟาร์มอัจฉริยะ<br>ดูแลง่ายจากมือถือ</h1>
      <p>ควบคุมไฟ น้ำ และดูค่าเซนเซอร์ได้ทุกที่ ทุกเวลา</p>
      <div class="illus">${greenhouseSVG()}</div>
      <button class="btn-start" data-action="start">เริ่มต้นใช้งาน ${icon("arrow")}</button>
    </section>`;

  function greenhouseSVG() {
    const sprout = (x) => `<g transform="translate(${x} 300)" fill="#7cc08a" stroke="none">
        <rect x="-2" y="-12" width="4" height="34" rx="2"/>
        <ellipse cx="-12" cy="-12" rx="14" ry="8" transform="rotate(-12 -12 -12)"/>
        <ellipse cx="12" cy="-18" rx="14" ry="8" transform="rotate(18 12 -18)" fill="#8fd09c"/></g>`;
    return `<svg viewBox="0 0 400 340" role="img" aria-label="โรงเรือน">
      <circle cx="322" cy="40" r="31" fill="#ecc55c"/>
      <rect x="0" y="262" width="400" height="60" rx="22" fill="#2d5638"/>
      <path d="M50 180 Q200 50 350 180 V318 H50 Z" fill="#30553a"/>
      <g stroke="#9ec9a5" stroke-width="2.5" fill="none" opacity=".75">
        <path d="M125 135 V318M275 135 V318M200 100 V318"/>
        <path d="M50 228 H350"/>
      </g>
      <path d="M50 180 Q200 50 350 180" stroke="#c6e8c9" stroke-width="4" fill="none"/>
      <path d="M50 180 V318 H350 V180" stroke="#c6e8c9" stroke-width="4" fill="none"/>
      ${[80, 112, 144, 256, 288, 320].map(sprout).join("")}
      <rect x="181" y="248" width="38" height="70" rx="6" fill="#1f3a26" stroke="#c6e8c9" stroke-width="3.5"/>
    </svg>`;
  }

  views.home = () => {
    const s = state.sensors;
    const q = [
      ["light", "bulb", "c-yellow", "ไฟปลูก", state.light.on],
      ["pump", "drop", "c-blue", "ปั๊มน้ำ", state.pump.on],
      ["auto", "refresh", "c-green", "อัตโนมัติ", state.autoOn],
      ["alerts", "bell", "c-orange", "แจ้งเตือน", state.alertsOn],
    ];
    return `
    <section class="screen">
      <header class="home-head">
        <div class="avatar">${icon("leaf")}</div>
        <div><div class="greet">${greeting()}</div><div class="name">สวนของฉัน</div></div>
        <button class="icon-btn" data-action="notifications" aria-label="การแจ้งเตือน">${icon("bell")}${state.unread ? '<span class="dot"></span>' : ""}</button>
      </header>

      ${installBanner()}
      <div class="cols"><div class="col">
      <div class="farm-card">
        <div class="loc">${icon("pin")}<div>
          <b>แปลงผักหลังบ้าน</b>
          <span><span class="status-dot ${state.online ? "" : "off"}"></span>ESP32 ${state.online ? "ออนไลน์" : "ออฟไลน์"} · อัปเดต <span data-live="ago">${ago(state.updatedAt)}</span></span>
        </div></div>
        <div class="stats">
          <div><div class="ic" style="color:var(--orange)">${icon("thermo")}</div><div class="v">${fmt1(s.temp)}°C</div><div class="l">อุณหภูมิ</div></div>
          <div><div class="ic" style="color:var(--blue)">${icon("drop")}</div><div class="v">${rnd(s.hum)}%</div><div class="l">ความชื้นอากาศ</div></div>
          <div><div class="ic" style="color:var(--green)">${icon("leaf")}</div><div class="v">${rnd(s.soil)}%</div><div class="l">ความชื้นดิน</div></div>
        </div>
      </div>

      <h2 class="section">ควบคุมด่วน</h2>
      <div class="quick">
        ${q.map(([k, i, c, l, on]) => `<button class="${on ? "on" : ""}" data-quick="${k}" aria-pressed="${on}">
          <span class="bubble ${c}">${icon(i)}</span><b>${l}</b><small>${on ? "เปิด" : "ปิด"}</small></button>`).join("")}
      </div>

      </div><div class="col">
      <div class="row-between"><h2 class="section">ค่าเซนเซอร์</h2><button class="link" data-go="data">ดูทั้งหมด</button></div>
      <div class="tiles">
        <button class="tile" data-go="data" data-metric="lux"><span class="sq c-yellow">${icon("sun")}</span><span><small>ความเข้มแสง</small><b>${fmtNum(s.lux)} lux</b></span></button>
        <button class="tile" data-go="pump"><span class="sq c-blue">${icon("drop")}</span><span><small>รดน้ำล่าสุด</small><b>${state.pump.on ? "กำลังรด" : hhmm(state.pump.lastRun.at)}</b></span></button>
        <button class="tile" data-go="auto"><span class="sq c-green">${icon("refresh")}</span><span><small>รอบถัดไป ${nextWaterSlot() ? nextWaterSlot().day : ""}</small><b>${nextWaterSlot() ? nextWaterSlot().start : "–"}</b></span></button>
        <button class="tile" data-go="pump"><span class="sq c-green">${icon("clock")}</span><span><small>รดน้ำวันนี้</small><b>${Math.round(state.pump.minutesToday)} นาที</b></span></button>
      </div>

      <div class="row-between"><h2 class="section">กล้อง</h2><button class="link" data-go="camera">ดูสด</button></div>
      ${camHomeCard()}
      ${guideCardHome()}
      </div></div>
    </section>${navBar()}`;
  };

  function deviceList() {
    const s = state.sensors;
    return [
      { id: "light", type: "control", name: "ไฟปลูกต้นไม้", sub: "รีเลย์ช่อง 1", icon: "bulb", c: "c-yellow", on: state.light.on },
      { id: "pump", type: "control", name: "ปั๊มน้ำ", sub: "รีเลย์ช่อง 2", icon: "drop", c: "c-blue", on: state.pump.on },
      { id: "soil", type: "sensor", name: "ความชื้นดิน", sub: "Capacitive · GPIO34", icon: "drop", c: "c-blue", value: `${rnd(s.soil)}%`, go: "pump" },
      { id: "dht", type: "sensor", name: "อุณหภูมิ/ความชื้นอากาศ", sub: "DHT22 · GPIO4", icon: "thermo", c: "c-orange", value: `${fmt1(s.temp)}°C`, metric: "temp" },
      { id: "lux", type: "sensor", name: "ความเข้มแสง", sub: "BH1750 · I2C", icon: "sun", c: "c-yellow", value: `${fmtNum(s.lux)} lux`, metric: "lux" },
      { id: "cam", type: "sensor", name: "กล้องแปลงผัก", sub: "ESP32-CAM · OV2640", icon: "camera", c: "c-green", value: CONFIG.camBase ? "LIVE" : "จำลอง", go: "camera" },
    ];
  }

  function devicesListHTML() {
    const q = ui.devQuery.trim().toLowerCase();
    const items = deviceList().filter((d) =>
      (ui.devFilter === "all" || d.type === ui.devFilter) &&
      (!q || (d.name + " " + d.sub).toLowerCase().includes(q)));
    if (!items.length) return `<div class="empty">ไม่พบอุปกรณ์ที่ค้นหา</div>`;
    return items.map((d) => d.type === "control"
      ? `<div class="item"><span class="sq ${d.c}">${icon(d.icon)}</span>
          <div class="txt clickable" data-go="${d.id}"><b>${d.name}</b><span>${d.sub}</span></div>
          <button class="switch ${d.on ? "on" : ""}" data-toggle="${d.id}" role="switch" aria-checked="${d.on}" aria-label="${d.name}"></button></div>`
      : `<button class="item" data-go="${d.go || "data"}" ${d.metric ? `data-metric="${d.metric}"` : ""}><span class="sq ${d.c}">${icon(d.icon)}</span>
          <div class="txt"><b>${d.name}</b><span>${d.sub}</span></div><span class="badge">${d.value}</span></button>`
    ).join("");
  }

  views.devices = () => `
    <section class="screen">
      <div class="head-row"><h1 class="title">อุปกรณ์</h1><span class="meta">ต่อกับ ESP32 · 6 ชิ้น</span></div>
      <button class="guide-link" data-go="guide">${icon("book")} วิธีต่อวงจรและรายการอุปกรณ์ ${icon("arrow")}</button>
      <label class="search">${icon("search", 'style="color:#4b544e"')}<input id="dev-search" type="search" placeholder="ค้นหาอุปกรณ์" value="${esc(ui.devQuery)}" autocomplete="off"></label>
      <div class="chips">
        ${[["all", "ทั้งหมด"], ["control", "ควบคุม"], ["sensor", "เซนเซอร์"]].map(([k, l]) =>
          `<button class="chip ${ui.devFilter === k ? "active" : ""}" data-devfilter="${k}">${l}</button>`).join("")}
      </div>
      <div class="list" id="dev-list">${devicesListHTML()}</div>
    </section>${navBar()}`;

  views.light = () => {
    const on = state.light.on;
    const rules = lightTimeRules();
    const modes = [["schedule", "clock", "c-green", "ตามเวลา"], ["light", "sun", "c-yellow", "ตามแสง"], ["manual", "power", "c-green", "สั่งเอง"]];
    return `
    <section class="screen no-nav">
      <div class="top-bar">
        <button class="icon-btn" data-go="back" aria-label="กลับ">${icon("back")}</button>
        <h1>ไฟปลูกต้นไม้</h1>
        <button class="icon-btn" data-action="device-menu" data-device="light" aria-label="เมนู">${icon("more")}</button>
      </div>
      <div class="cols"><div class="col center-col">
      <div class="halo ${on ? "" : "off"}"><div class="mid"><div class="core">${icon("bulb")}</div></div></div>
      <p class="state-title">${on ? "เปิดอยู่" : "ปิดอยู่"}</p>
      <div class="state-sub">${lightAutoOffText()}</div>
      <div class="two">
        <div class="mini"><small>เปิดมาแล้ววันนี้</small><b>${fmtDuration(state.light.minutesToday)}</b></div>
        <div class="mini"><small>แสงตอนนี้</small><b>${fmtNum(state.sensors.lux)} lux</b></div>
      </div>
      </div><div class="col">
      <h2 class="section">โหมดการทำงาน</h2>
      <div class="modes">${modes.map(([k, i, c, l]) =>
        `<button class="mode ${state.light.mode === k ? "active" : ""}" data-mode="${k}"><span class="bubble ${c}">${icon(i)}</span>${l}</button>`).join("")}
      </div>
      <h2 class="section">ตั้งเวลา</h2>
      <div class="sched-row">
        ${rules.map((r) => `<button class="sched" data-edit="${r.id}" style="${r.on ? "" : "opacity:.55"}">
            <span class="sq c-green">${icon("clock")}</span><span><b>${r.start}–${r.end}</b><span>${DAYS[r.days]}${r.on ? "" : " · ปิดอยู่"}</span></span></button>`).join("")}
        <button class="add-dashed" data-action="add-rule" data-device="light">+ เพิ่ม</button>
      </div>
      <div class="bottom-action"><button class="btn btn-outline" data-toggle="light">${icon("power")} ${on ? "ปิดไฟ" : "เปิดไฟ"}</button></div>
      </div></div>
    </section>${navBar("detail")}`;
  };

  function gaugeSVG(pct) {
    const r = 108, cx = 130, cy = 130, start = 225, sweep = 270;
    const pt = (deg) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const arc = (from, to) => {
      const [x1, y1] = pt(from), [x2, y2] = pt(to);
      const large = to - from > 180 ? 1 : 0;
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    };
    const end = start + (sweep * clamp(pct, 0, 100)) / 100;
    return `<svg viewBox="0 0 260 230" aria-hidden="true">
      <path d="${arc(start, start + sweep)}" stroke="#e3e9e4" stroke-width="20" fill="none" stroke-linecap="round"/>
      ${pct > 0.5 ? `<path d="${arc(start, end)}" stroke="var(--primary)" stroke-width="20" fill="none" stroke-linecap="round"/>` : ""}
    </svg>`;
  }

  views.pump = () => {
    const s = state.sensors, p = state.pump;
    const notice = p.on
      ? `<div class="notice run">${icon("drop")} กำลังรดน้ำ… เหลืออีก ${Math.max(1, Math.ceil(((p.runUntil - Date.now()) * speed()) / 60000))} นาที</div>`
      : isNum(s.soil) && s.soil < p.threshold
        ? `<div class="notice warn">${icon("drop")} ดินแห้ง ควรรดน้ำ</div>`
        : `<div class="notice">${icon("drop")} ความชื้นพอ ยังไม่ต้องรดน้ำ</div>`;
    const lastDay = new Date(p.lastRun.at).toDateString() === new Date().toDateString() ? "วันนี้" : "เมื่อวาน";
    return `
    <section class="screen no-nav">
      <div class="top-bar">
        <button class="icon-btn" data-go="back" aria-label="กลับ">${icon("back")}</button>
        <h1>ปั๊มน้ำ</h1>
        <button class="icon-btn" data-action="device-menu" data-device="pump" aria-label="เมนู">${icon("more")}</button>
      </div>
      <div class="cols"><div class="col center-col">
      ${notice}
      <div class="gauge">${gaugeSVG(s.soil)}
        <div class="center"><div class="big">${rnd(s.soil)}<small>%</small></div><div class="cap">ความชื้นดินตอนนี้</div></div>
      </div>
      <div class="stepper">
        <button data-threshold="-5" aria-label="ลดเกณฑ์">${icon("minus")}</button>
        <div class="val"><small>เกณฑ์รดน้ำอัตโนมัติ</small><b>ต่ำกว่า ${p.threshold}%</b></div>
        <button data-threshold="5" aria-label="เพิ่มเกณฑ์">${icon("plus")}</button>
      </div>
      </div><div class="col">
      <div class="info-card">
        <button class="info-row" data-action="duration"><span class="sq c-green">${icon("clock")}</span><span><small>ระยะเวลารดน้ำต่อรอบ</small><b>${p.duration} นาที</b></span></button>
        <div class="info-row"><span class="sq c-blue">${icon("drop")}</span><span><small>รดน้ำล่าสุด</small><b>${lastDay} ${hhmm(p.lastRun.at)} · ${p.lastRun.min} นาที</b></span></div>
      </div>
      <div class="bottom-action">${p.on
      ? `<button class="btn btn-outline" data-action="pump-stop">${icon("power")} หยุดรดน้ำ</button>`
      : `<button class="btn btn-solid" data-action="pump-now">${icon("drop")} รดน้ำทันที</button>`}</div>
      </div></div>
    </section>${navBar("detail")}`;
  };

  views.auto = () => {
    const rules = state.rules.map((r) => ({ r, d: describeRule(r) }))
      .filter(({ d }) => ui.autoFilter === "all" || d.group === ui.autoFilter);
    return `
    <section class="screen">
      <div class="row-between"><h1 class="title">อัตโนมัติ</h1><button class="fab" data-action="add-rule" aria-label="เพิ่มกฎ">${icon("plus")}</button></div>
      <div class="chips" style="margin-top:0">
        ${[["all", "ทั้งหมด"], ["time", "ตั้งเวลา"], ["sensor", "ตามเซนเซอร์"]].map(([k, l]) =>
          `<button class="chip ${ui.autoFilter === k ? "active" : ""}" data-autofilter="${k}">${l}</button>`).join("")}
      </div>
      <div class="list">
        ${rules.length ? rules.map(({ r, d }) => `<div class="item">
          <span class="sq ${d.c}">${icon(d.icon)}</span>
          <div class="txt clickable" data-edit="${r.id}"><b>${d.name}</b><span>${d.desc}</span></div>
          <button class="switch ${r.on ? "on" : ""}" data-rule="${r.id}" role="switch" aria-checked="${r.on}" aria-label="${d.name}"></button>
        </div>`).join("") : `<div class="empty">ยังไม่มีกฎในหมวดนี้</div>`}
      </div>
      ${state.autoOn ? "" : `<div class="tip warn" style="margin-top:18px"><span class="sq">${icon("refresh")}</span><div><b>ระบบอัตโนมัติปิดอยู่</b><span>เปิดได้ที่ “ควบคุมด่วน” หน้าหลัก</span></div></div>`}
    </section>${navBar()}`;
  };

  const METRICS = {
    soil: { label: "ความชื้นดิน", unit: "%", fmt: (v) => `${Math.round(v)}%`, min: 0, max: 100 },
    temp: { label: "อุณหภูมิอากาศ", unit: "°C", fmt: (v) => `${fmt1(v)}°C`, min: 15, max: 45 },
    hum: { label: "ความชื้นอากาศ", unit: "%", fmt: (v) => `${Math.round(v)}%`, min: 0, max: 100 },
    lux: { label: "ความเข้มแสง", unit: "lux", fmt: (v) => `${fmtNum(v)} lux`, min: 0, max: 40000 },
  };

  function chartSVG(points, m, key) {
    const W = 340, H = 170, top = 10, bottom = 150;
    const vals = points.map((p) => p[key]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (key === "soil") { lo = Math.min(lo, state.pump.threshold); hi = Math.max(hi, state.pump.threshold); }
    const span = Math.max(hi - lo, (m.max - m.min) * 0.08);
    lo -= span * 0.35; hi += span * 0.25;
    const x = (i) => 6 + (i / (points.length - 1)) * (W - 12);
    const y = (v) => top + (1 - (v - lo) / (hi - lo)) * (bottom - top);
    const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const area = `${d} L${x(vals.length - 1).toFixed(1)} ${bottom} L${x(0).toFixed(1)} ${bottom} Z`;
    const last = vals.length - 1;
    const thr = key === "soil"
      ? `<line x1="6" x2="${W - 6}" y1="${y(state.pump.threshold)}" y2="${y(state.pump.threshold)}" stroke="#b05a2a" stroke-width="2" stroke-dasharray="7 6"/>
         <text x="10" y="${y(state.pump.threshold) - 8}" fill="#b05a2a" font-size="13" font-family="Kanit">เกณฑ์ ${state.pump.threshold}%</text>` : "";
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟ${m.label}">
      <path d="${area}" fill="#eef4ef"/>
      <line x1="6" x2="${W - 6}" y1="${bottom}" y2="${bottom}" stroke="#e1e7e2" stroke-width="1.5"/>
      ${thr}
      <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(last)}" cy="${y(vals[last])}" r="8" fill="#fff" stroke="var(--primary)" stroke-width="3.5"/>
    </svg>`;
  }

  views.data = () => {
    const s = state.sensors;
    const m = METRICS[ui.metric];
    const pts = ui.range === "day" ? state.history.day : state.history.week;
    const axis = ui.range === "day"
      ? ["24 ชม.ก่อน", "18", "12", "6", "ตอนนี้"]
      : (() => { const n = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]; const t = new Date().getDay(); return Array.from({ length: 7 }, (_, i) => i === 6 ? "วันนี้" : n[(t - 6 + i + 7) % 7]); })();
    const bars = [
      ["thermo", "c-orange", "อุณหภูมิอากาศ", `${fmt1(s.temp)}°C`, (s.temp - 15) / 35, "#b05a2a"],
      ["drop", "c-blue", "ความชื้นอากาศ", `${rnd(s.hum)}%`, s.hum / 100, "#3a6fb5"],
      ["sun", "c-yellow", "ความเข้มแสง", `${fmtNum(s.lux)} lux`, s.lux / 23000, "#8a6420"],
    ];
    const dry = isNum(s.soil) && s.soil < state.pump.threshold, wet = isNum(s.soil) && s.soil > 80;
    return `
    <section class="screen">
      <h1 class="title">ข้อมูลเซนเซอร์</h1>
      <div class="chips" style="margin-top:0">
        <button class="chip ${ui.range === "day" ? "active" : ""}" data-range="day">วันนี้</button>
        <button class="chip ${ui.range === "week" ? "active" : ""}" data-range="week">7 วัน</button>
      </div>
      <div class="cols wide-left"><div class="col">
      <div class="chart-card">
        <div class="row-between"><h3>${m.label}</h3><span class="big">${m.fmt(s[ui.metric])}</span></div>
        <div class="metric-tabs">${Object.entries(METRICS).map(([k, v]) =>
          `<button class="${ui.metric === k ? "active" : ""}" data-metric-tab="${k}">${v.label}</button>`).join("")}</div>
        ${chartSVG(pts, m, ui.metric)}
        <div class="axis">${axis.map((a) => `<span>${a}</span>`).join("")}</div>
      </div>
      </div><div class="col">
      <div class="bars">
        ${bars.map(([i, c, l, v, pct, col]) => `<div class="bar-row"><span class="sq ${c}">${icon(i)}</span>
          <div class="body"><div class="top"><span>${l}</span><b>${v}</b></div>
          <div class="track"><i style="width:${(clamp(pct, 0.02, 1) * 100).toFixed(1)}%;background:${col}"></i></div></div></div>`).join("")}
      </div>
      <div class="tip ${dry || wet ? "warn" : ""}"><span class="sq">${icon("leaf")}</span>
        <div><b>${dry ? "ความชื้นดินต่ำกว่าเกณฑ์" : wet ? "ดินชื้นมากเกินไป" : "ความชื้นดินอยู่ในช่วงเหมาะสม"}</b><span>${nextWaterText()}</span></div></div>
      </div></div>
    </section>${navBar()}`;
  };

  /* ---------- Camera (ESP32-CAM) ---------- */
  const RES = { 5: "QVGA 320×240", 8: "VGA 640×480", 9: "SVGA 800×600", 11: "HD 1280×720" };
  const MAX_SNAPS = 12;
  let snaps = localGet("sf.snaps", []);
  let camRAF = null;
  let camError = false;

  function saveSnaps() {
    // localStorage มีพื้นที่จำกัด — ถ้าเต็ม ให้ทิ้งภาพเก่าทีละภาพ
    while (snaps.length) {
      try { localStorage.setItem("sf.snaps", JSON.stringify(snaps)); return; } catch (e) { snaps.pop(); }
    }
    try { localStorage.removeItem("sf.snaps"); } catch (e) { /* ignore */ }
  }

  function camUrls() {
    const base = CONFIG.camBase.replace(/\/$/, "");
    let stream = CONFIG.camStream;
    if (!stream && base) {
      try { const u = new URL(base); stream = `${u.protocol}//${u.hostname}:81/stream`; } catch (e) { stream = base + ":81/stream"; }
    }
    return { base, stream, capture: base + "/capture", control: (v, val) => `${base}/control?var=${v}&val=${val}` };
  }

  function camControl(v, val) {
    if (!CONFIG.camBase) return;
    fetch(camUrls().control(v, val), { mode: "no-cors" }).catch(() => toast("ส่งคำสั่งไปกล้องไม่สำเร็จ"));
  }

  // ฉากจำลองสำหรับโหมดไม่มีกล้องจริง (ถูกใช้ทั้งแสดงผลสดและถ่ายภาพ)
  function drawScene(ctx, w, h, t) {
    const horizon = h * 0.5;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#d9eadc"); sky.addColorStop(1, "#a9cdb0");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
    const soil = ctx.createLinearGradient(0, horizon, 0, h);
    soil.addColorStop(0, "#7a5a3c"); soil.addColorStop(1, "#4a3523");
    ctx.fillStyle = soil; ctx.fillRect(0, horizon, w, h - horizon);

    // greenhouse frame
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = w / 260;
    ctx.beginPath(); ctx.moveTo(0, horizon * 0.35); ctx.quadraticCurveTo(w / 2, -horizon * 0.25, w, horizon * 0.35); ctx.stroke();
    for (let i = 1; i < 6; i++) { const x = (w / 6) * i; ctx.beginPath(); ctx.moveTo(x, horizon * 0.1); ctx.lineTo(w / 2 + (x - w / 2) * 0.55, horizon); ctx.stroke(); }

    // planting rows (perspective)
    const rows = [[0.58, 0.45, 9], [0.7, 0.68, 7], [0.86, 1, 5]];
    rows.forEach(([ry, sc, n], ri) => {
      const y = h * ry, span = w * (0.5 + sc * 0.5);
      ctx.fillStyle = "rgba(40,28,18,.35)";
      ctx.fillRect((w - span) / 2, y + 2 * sc, span, 10 * sc * (w / 640));
      for (let i = 0; i < n; i++) {
        const x = (w - span) / 2 + (span / n) * (i + 0.5);
        const sway = Math.sin(t / 900 + i * 1.3 + ri) * 0.12;
        const s = sc * (w / 640) * (0.9 + ((i * 7 + ri * 3) % 5) * 0.06);
        ctx.save(); ctx.translate(x, y); ctx.rotate(sway); ctx.scale(s, s);
        ctx.fillStyle = "#3e7d4d"; ctx.fillRect(-2, -34, 4, 34);
        [[-16, -30, -0.5, "#5ea86c"], [16, -36, 0.5, "#6cbb7a"], [-10, -48, -0.2, "#7cc08a"], [10, -52, 0.25, "#8fd09c"]].forEach(([lx, ly, r, c]) => {
          ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(lx, ly, 17, 8, r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      }
    });

    // pump running → water drops
    if (state.pump.on) {
      ctx.strokeStyle = "rgba(120,170,230,.7)"; ctx.lineWidth = w / 320;
      for (let i = 0; i < 40; i++) {
        const x = ((i * 97) % w), y = (((t / 4) + i * 53) % (h - horizon)) + horizon * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h / 40); ctx.stroke();
      }
    }
    // grow light / flash tint
    if (state.light.on) { ctx.fillStyle = "rgba(255,214,120,.14)"; ctx.fillRect(0, 0, w, h); }
    if (state.camera.flash) { ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(0, 0, w, h); }

    // sensor noise
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // timestamp
    const d = new Date();
    const fs = Math.round(w / 34);
    ctx.font = `500 ${fs}px Kanit, sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, h - fs * 1.8, w, fs * 1.8);
    ctx.fillStyle = "#fff";
    ctx.fillText(`ESP32-CAM  ${d.toLocaleDateString("th-TH")} ${d.toLocaleTimeString("th-TH")}`, fs * 0.6, h - fs * 0.6);
  }

  function captureReal() {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const timer = setTimeout(() => resolve(null), 10000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const scale = Math.min(1, 640 / img.naturalWidth);
          const c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.75));
        } catch (e) { resolve(null); } // CORS ไม่ผ่าน
      };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = camUrls().capture + "?_t=" + Date.now();
    });
  }

  async function takeSnapshot(source) {
    let src;
    if (CONFIG.camBase) {
      src = await captureReal();
    } else {
      const c = document.createElement("canvas");
      c.width = 640; c.height = 480;
      drawScene(c.getContext("2d"), 640, 480, performance.now());
      src = c.toDataURL("image/jpeg", 0.75);
    }
    if (!src) {
      if (source === "user") toast("ถ่ายภาพไม่สำเร็จ ตรวจสอบการเชื่อมต่อกล้อง");
      return;
    }
    snaps.unshift({ at: Date.now(), src, auto: source === "auto" });
    snaps = snaps.slice(0, MAX_SNAPS);
    saveSnaps();
    state.camera.lastShot = Date.now();
    save();
    if (source === "user") {
      const v = document.getElementById("cam-view");
      if (v) { v.classList.remove("shutter"); void v.offsetWidth; v.classList.add("shutter"); }
      toast("บันทึกภาพแล้ว");
    }
    if (ui.route === "camera") refreshCamera();
    else if (ui.route === "home") refresh();
  }

  function camStatusText() {
    if (!CONFIG.camBase) return "โหมดจำลอง";
    return camError ? "เชื่อมต่อกล้องไม่ได้" : "ESP32-CAM ออนไลน์";
  }

  function camHomeCard() {
    const last = snaps[0];
    return `<button class="cam-card" data-go="camera">
      <span class="cam-thumb">${last ? `<img src="${last.src}" alt="ภาพล่าสุด">` : icon("camera")}</span>
      <span class="txt"><b>กล้องแปลงผัก</b>
        <span><span class="status-dot ${CONFIG.camBase && camError ? "off" : ""}"></span>${camStatusText()}</span>
        <span>${last ? `ภาพล่าสุด ${hhmm(last.at)}` : "ยังไม่มีภาพ"}${state.camera.timelapse ? ` · ถ่ายอัตโนมัติทุก ${everyLabel(state.camera.every)}` : ""}</span></span>
      ${icon("arrow", 'style="color:var(--primary)"')}
    </button>`;
  }

  const everyLabel = (m) => (m < 60 ? `${m} นาที` : `${m / 60} ชม.`);

  function camGalleryHTML() {
    if (!snaps.length) return `<div class="empty" style="grid-column:1/-1;padding:24px 0">ยังไม่มีภาพ กด “ถ่ายภาพ” เพื่อเริ่ม</div>`;
    return snaps.map((sn, i) => `<button class="snap" data-snap="${i}" aria-label="ภาพเวลา ${hhmm(sn.at)}">
      <img src="${sn.src}" alt="" loading="lazy"><span>${sn.auto ? "อัตโนมัติ · " : ""}${hhmm(sn.at)}</span></button>`).join("");
  }

  views.camera = () => {
    const live = ui.camPlaying;
    const real = !!CONFIG.camBase;
    const cam = state.camera;
    const viewInner = !live
      ? `<div class="cam-paused">${snaps[0] ? `<img src="${snaps[0].src}" alt="">` : ""}<button class="cam-play" data-cam="play" aria-label="เล่น">${icon("play")}</button></div>`
      : real
        ? `<img id="cam-stream" data-src="${esc(camUrls().stream)}" alt="ภาพสดจากกล้อง">
           <div class="cam-offline" id="cam-offline" ${camError ? "" : "hidden"}>${icon("wifi")}<b>เชื่อมต่อกล้องไม่ได้</b><span>ตรวจสอบ URL และให้มือถืออยู่ Wi-Fi เดียวกับกล้อง</span></div>`
        : `<canvas id="cam-canvas" width="640" height="480"></canvas>`;
    return `
    <section class="screen">
      <div class="head-row"><h1 class="title">กล้อง</h1><span class="meta" id="cam-status">${camStatusText()}</span></div>
      <div class="cols wide-left"><div class="col">
      <div class="cam-view ${ui.camFull ? "full" : ""}" id="cam-view">
        ${viewInner}
        <span class="cam-badge ${live ? "live" : ""}">${live ? "● LIVE" : "หยุดชั่วคราว"}</span>
        <span class="cam-res">${RES[cam.res].split(" ")[0]}</span>
        <button class="cam-fs" data-cam="full" aria-label="เต็มจอ">${icon(ui.camFull ? "minus" : "expand")}</button>
      </div>
      </div><div class="col">
      <div class="cam-controls">
        <button data-cam="${live ? "pause" : "play"}"><span class="round">${icon(live ? "pause" : "play")}</span>${live ? "หยุด" : "เล่น"}</button>
        <button data-cam="flash" class="${cam.flash ? "on" : ""}"><span class="round">${icon("zap")}</span>แฟลช${cam.flash ? "เปิด" : "ปิด"}</button>
        <button data-cam="shot" class="primary"><span class="round">${icon("camera")}</span>ถ่ายภาพ</button>
        <button data-cam="full"><span class="round">${icon("expand")}</span>เต็มจอ</button>
      </div>

      <div class="info-card">
        <button class="info-row" data-cam="res"><span class="sq c-green">${icon("image")}</span><span><small>ความละเอียด</small><b>${RES[cam.res]}</b></span></button>
        <div class="info-row"><span class="sq c-yellow">${icon("clock")}</span>
          <span class="txt clickable" data-cam="every" style="flex:1"><small>ถ่ายภาพอัตโนมัติ (ไทม์แลปส์)</small><b>${cam.timelapse ? `ทุก ${everyLabel(cam.every)}` : "ปิดอยู่"}</b></span>
          <button class="switch ${cam.timelapse ? "on" : ""}" data-cam="timelapse" role="switch" aria-checked="${cam.timelapse}" aria-label="ถ่ายภาพอัตโนมัติ"></button></div>
        <button class="info-row" data-cam="settings"><span class="sq c-blue">${icon("wifi")}</span><span><small>การเชื่อมต่อ</small><b>${real ? esc(CONFIG.camBase) : "ยังไม่ได้ตั้งค่า (โหมดจำลอง)"}</b></span></button>
      </div>
      </div></div>

      <div class="row-between"><h2 class="section">ภาพที่บันทึก</h2><span class="meta muted" id="cam-count">${snaps.length}/${MAX_SNAPS}</span></div>
      <div class="gallery" id="cam-gallery">${camGalleryHTML()}</div>
    </section>${navBar()}`;
  };

  // called after every render: attaches stream / starts demo animation
  function mountCamera(oldStream) {
    if (ui.route !== "camera") { stopCamLoop(); return; }
    const ph = app.querySelector("#cam-stream");
    if (ph) {
      if (oldStream && oldStream.dataset.src === ph.dataset.src) ph.replaceWith(oldStream); // ไม่เปิดสตรีมซ้ำ (ESP32-CAM รับได้ทีละ 1 คน)
      else { camError = false; ph.src = ph.dataset.src; }
    }
    if (app.querySelector("#cam-canvas") && !camRAF) camRAF = requestAnimationFrame(camLoop);
  }
  function camLoop(t) {
    const c = document.getElementById("cam-canvas");
    if (!c || ui.route !== "camera") { camRAF = null; return; }
    drawScene(c.getContext("2d"), c.width, c.height, t);
    camRAF = requestAnimationFrame(camLoop);
  }
  function stopCamLoop() { if (camRAF) cancelAnimationFrame(camRAF); camRAF = null; }

  function refreshCamera() {
    const g = document.getElementById("cam-gallery");
    if (g) g.innerHTML = camGalleryHTML();
    const n = document.getElementById("cam-count");
    if (n) n.textContent = `${snaps.length}/${MAX_SNAPS}`;
    const st = document.getElementById("cam-status");
    if (st) st.textContent = camStatusText();
  }

  // stream errors (img error events don't bubble → capture phase)
  document.addEventListener("error", (e) => {
    if (e.target && e.target.id === "cam-stream") {
      camError = true;
      const o = document.getElementById("cam-offline");
      if (o) o.hidden = false;
      refreshCamera();
    }
  }, true);

  function setCamFull(on) {
    ui.camFull = on;
    const v = document.getElementById("cam-view");
    if (!v) return;
    v.classList.toggle("full", on);
    const btn = v.querySelector(".cam-fs");
    if (btn) btn.innerHTML = icon(on ? "minus" : "expand");
    document.body.style.overflow = on ? "hidden" : "";
  }

  function camAction(a, snapIdx) {
    const cam = state.camera;
    if (snapIdx !== undefined) return snapSheet(Number(snapIdx));
    switch (a) {
      case "play": ui.camPlaying = true; camError = false; return render();
      case "pause": ui.camPlaying = false; return render();
      case "shot": return takeSnapshot("user");
      case "flash":
        cam.flash = !cam.flash;
        camControl("led_intensity", cam.flash ? 255 : 0);
        return afterChange(cam.flash ? "เปิดแฟลชแล้ว" : "ปิดแฟลชแล้ว");
      case "full": return setCamFull(!ui.camFull);
      case "timelapse":
        cam.timelapse = !cam.timelapse;
        if (cam.timelapse) cam.lastShot = Date.now();
        return afterChange(cam.timelapse ? `ถ่ายอัตโนมัติทุก ${everyLabel(cam.every)}` : "ปิดถ่ายอัตโนมัติ");
      case "res":
        return openSheet(`<h3>ความละเอียดภาพ</h3><div class="seg">${Object.entries(RES).map(([k, l]) =>
          `<button type="button" class="${cam.res === Number(k) ? "active" : ""}" data-res="${k}">${l}</button>`).join("")}</div>
          <p class="muted" style="font-size:13.5px">ความละเอียดสูงจะใช้เน็ตมากและภาพสดอาจกระตุก</p>`, (el) => {
          el.addEventListener("click", (e) => {
            const b = e.target.closest("[data-res]"); if (!b) return;
            cam.res = Number(b.dataset.res);
            camControl("framesize", cam.res);
            closeSheet(); afterChange(`ความละเอียด ${RES[cam.res]}`);
          });
        });
      case "every":
        return openSheet(`<h3>ถ่ายภาพอัตโนมัติทุก</h3><div class="seg">${[15, 30, 60, 180, 360, 720].map((m) =>
          `<button type="button" class="${cam.every === m ? "active" : ""}" data-every="${m}">${everyLabel(m)}</button>`).join("")}</div>
          <p class="muted" style="font-size:13.5px">ต้องเปิดหน้าเว็บค้างไว้ ภาพจะถูกเก็บในเครื่องนี้สูงสุด ${MAX_SNAPS} ภาพ</p>`, (el) => {
          el.addEventListener("click", (e) => {
            const b = e.target.closest("[data-every]"); if (!b) return;
            cam.every = Number(b.dataset.every); cam.timelapse = true; cam.lastShot = Date.now();
            closeSheet(); afterChange(`ถ่ายอัตโนมัติทุก ${everyLabel(cam.every)}`);
          });
        });
      case "settings": return camSettingsSheet();
    }
  }

  function snapSheet(i) {
    const sn = snaps[i];
    if (!sn) return;
    const name = `smartfarm-${new Date(sn.at).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.jpg`;
    openSheet(`<h3>${sn.auto ? "ภาพอัตโนมัติ" : "ภาพที่ถ่าย"} · ${hhmm(sn.at)}</h3>
      <img class="snap-full" src="${sn.src}" alt="">
      <a class="btn btn-solid" href="${sn.src}" download="${name}" style="text-decoration:none">${icon("download")} ดาวน์โหลด</a>
      <button class="btn" style="height:50px;color:var(--orange)" data-del>${icon("trash")} ลบภาพนี้</button>`, (el) => {
      el.querySelector("[data-del]").addEventListener("click", () => {
        snaps.splice(i, 1); saveSnaps(); closeSheet(); refreshCamera(); toast("ลบภาพแล้ว");
      });
    });
  }

  function camSettingsSheet() {
    openSheet(`<h3>เชื่อมต่อ ESP32-CAM</h3>
      <div class="field"><label>URL กล้อง (เว้นว่างเพื่อใช้โหมดจำลอง)</label>
        <input name="cam" type="url" placeholder="http://192.168.1.60" value="${esc(CONFIG.camBase)}"></div>
      <div class="field"><label>URL สตรีม (ไม่บังคับ — ค่าเริ่มต้น :81/stream)</label>
        <input name="stream" type="url" placeholder="http://192.168.1.60:81/stream" value="${esc(CONFIG.camStream)}"></div>
      <p class="muted" style="font-size:13.5px;margin:0 0 10px">ใช้ได้กับตัวอย่าง <b>CameraWebServer</b> ของ Arduino หรือโค้ดใน <b>firmware/esp32cam</b></p>
      <button class="btn btn-solid" data-save>บันทึก</button>`, (el) => {
      el.querySelector("[data-save]").addEventListener("click", () => {
        CONFIG.camBase = el.querySelector('[name="cam"]').value.trim();
        CONFIG.camStream = el.querySelector('[name="stream"]').value.trim();
        localSet("sf.camBase", CONFIG.camBase);
        localSet("sf.camStream", CONFIG.camStream);
        camError = false;
        closeSheet();
        if (CONFIG.camBase) { camControl("framesize", state.camera.res); camControl("led_intensity", state.camera.flash ? 255 : 0); }
        ui.camPlaying = true;
        render();
        toast(CONFIG.camBase ? "เชื่อมต่อกล้องแล้ว" : "ใช้โหมดจำลอง");
      });
    });
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.camFull) setCamFull(false); });

  /* ---------- Wiring & build guide ---------- */
  const W = { red: "#d64545", black: "#3a3a3a", yellow: "#d9a514", green: "#3e9a5a", blue: "#3a6fb5", purple: "#8a5cc2", orange: "#e07a2a", gray: "#8f9a93" };
  const REPO = "https://github.com/Nannaphat31108/Smartfarm/blob/main/";

  // each row: [component pin, target pin, wire colour, optional part drawn on the wire]
  const WIRING = [
    { id: "power", name: "ไฟเลี้ยง: อะแดปเตอร์ 12V → LM2596 → 5V", icon: "zap", c: "c-yellow", left: "LM2596", right: "ESP32",
      rows: [["OUT+", "VIN (5V)", W.red], ["OUT−", "GND", W.black]],
      note: "ต่อ IN+/IN− ของ LM2596 เข้าอะแดปเตอร์ 12V แล้ว<b>หมุนเกลียวปรับให้ OUT วัดได้ 5.0V ด้วยมิเตอร์ก่อน</b>ค่อยต่อเข้าบอร์ด · ห้ามเสียบ USB กับ VIN พร้อมกันตอนใช้งานจริง" },
    { id: "dht", name: "DHT22 อุณหภูมิ/ความชื้นอากาศ", icon: "thermo", c: "c-orange", left: "DHT22", right: "ESP32",
      rows: [["+ / VCC", "3V3", W.red], ["OUT / DATA", "GPIO 4", W.yellow], ["− / GND", "GND", W.black]],
      note: "ถ้าเป็นตัวเปล่า 4 ขา (ไม่มีแผงวงจร) ให้ใส่ตัวต้านทาน 10kΩ ระหว่าง VCC กับ DATA · ขา 3 ไม่ต่อ" },
    { id: "soil", name: "เซนเซอร์ความชื้นดิน (Capacitive v1.2)", icon: "drop", c: "c-blue", left: "Soil", right: "ESP32",
      rows: [["VCC", "3V3", W.red], ["AOUT", "GPIO 34", W.green], ["GND", "GND", W.black]],
      note: "เสียบลงดินแค่ถึงขีดเส้น ห้ามให้ส่วนวงจรด้านบนโดนน้ำ (ทาซิลิโคนหรือหุ้มท่อหดกันน้ำ) · ใช้ GPIO 34 เพราะเป็น ADC1 ใช้ได้ขณะเปิด Wi-Fi" },
    { id: "bh1750", name: "BH1750 ความเข้มแสง (I2C)", icon: "sun", c: "c-yellow", left: "BH1750", right: "ESP32",
      rows: [["VCC", "3V3", W.red], ["GND", "GND", W.black], ["SCL", "GPIO 22", W.blue], ["SDA", "GPIO 21", W.purple]],
      note: "ขา ADDR ไม่ต้องต่อ · วางให้หน้าเซนเซอร์หงายรับแสง ถ้าอยู่กลางแจ้งใส่ฝาครอบใสกันฝน" },
    { id: "relay", name: "โมดูลรีเลย์ 2 ช่อง (ฝั่งควบคุม)", icon: "power", c: "c-green", left: "Relay", right: "ESP32",
      rows: [["VCC", "VIN (5V)", W.red], ["GND", "GND", W.black], ["IN1 (ไฟ)", "GPIO 26", W.blue], ["IN2 (ปั๊ม)", "GPIO 27", W.green]],
      note: "โมดูลส่วนใหญ่ทำงานเมื่อ IN เป็น LOW (ในโค้ดตั้ง RELAY_ACTIVE_LOW = true) · ถ้าสั่งเปิดแล้วกลับเป็นปิด ให้เปลี่ยนเป็น false" },
    { id: "load", name: "รีเลย์ → ไฟปลูกและปั๊ม 12V (ฝั่งกำลัง)", icon: "bulb", c: "c-yellow", left: "Relay", right: "อุปกรณ์ 12V",
      rows: [["COM1", "12V +", W.red], ["NO1", "ไฟปลูก +", W.red], ["COM2", "12V +", W.red], ["NO2", "ปั๊ม +", W.red]],
      note: "ขั้ว − ของไฟปลูกและปั๊มต่อเข้า 12V − โดยตรง · <b>ใส่ไดโอด 1N4007 คร่อมขั้วปั๊ม</b> (ด้านขีดสีเงินไปขั้ว +) กันไฟย้อนตอนตัดปั๊ม · ใช้สายเส้นใหญ่ ≥ 0.75 sq.mm ฝั่งนี้" },
    { id: "cam", name: "ESP32-CAM (บอร์ดแยก)", icon: "camera", c: "c-green", left: "ESP32-CAM", right: "ไฟ 5V",
      rows: [["5V", "LM2596 OUT+", W.red], ["GND", "LM2596 OUT−", W.black]],
      note: "ใช้ไฟ 5V ที่จ่ายได้ ≥ 1A ไฟไม่พอจะรีสตาร์ทเอง (brownout) · ตอนใช้งานไม่ต้องต่อขาอื่น" },
    { id: "camflash", name: "อัปโหลดโค้ด ESP32-CAM ด้วย USB-TTL", icon: "download", c: "c-blue", left: "ESP32-CAM", right: "USB-TTL",
      rows: [["5V", "5V", W.red], ["GND", "GND", W.black], ["U0R", "TX", W.green], ["U0T", "RX", W.yellow], ["IO0", "GND", W.gray]],
      note: "ต่อ IO0 ลง GND ค้างไว้ → กด RST → อัปโหลด → <b>ถอด IO0 ออกแล้วกด RST อีกครั้ง</b>เพื่อรันโปรแกรม · ถ้ามีบอร์ด ESP32-CAM-MB เสียบ USB ได้เลย" },
  ];

  const PARTS = [
    ["ESP32 DevKit V1 (ESP32-WROOM-32, 30 ขา)", 1, 150, "บอร์ดหลัก"],
    ["DHT22 (AM2302) แบบมีแผงวงจร", 1, 120, "อุณหภูมิ/ความชื้นอากาศ"],
    ["Capacitive Soil Moisture Sensor v1.2", 1, 40, "แบบ capacitive ไม่ผุกร่อนเหมือนแบบเข็ม"],
    ["BH1750 (GY-302)", 1, 50, "วัดแสง lux"],
    ["โมดูลรีเลย์ 5V 2 ช่อง (มี optocoupler)", 1, 45, "สั่งไฟปลูก/ปั๊ม"],
    ["ปั๊มน้ำ DC 12V (เช่น 385 / ไดอะแฟรม)", 1, 150, "พร้อมสายยาง"],
    ["ไฟปลูกต้นไม้ LED 12V", 1, 200, "หรือแถบ LED full spectrum"],
    ["อะแดปเตอร์ 12V 3A + แจ็ค DC ตัวเมีย", 1, 150, "จ่ายไฟทั้งระบบ"],
    ["LM2596 step-down (ปรับได้)", 1, 40, "แปลง 12V → 5V"],
    ["ESP32-CAM + บอร์ด ESP32-CAM-MB", 1, 250, "กล้อง (ไม่บังคับ)"],
    ["ตัวต้านทาน 10kΩ (เฉพาะ DHT22 แบบตัวเปล่า 4 ขา)", 1, 5, "pull-up"],
    ["ไดโอด 1N4007", 1, 5, "กันไฟย้อนจากปั๊ม"],
    ["กล่องกันน้ำ IP65 + เคเบิลแกลนด์", 1, 120, "ใส่บอร์ดและรีเลย์"],
    ["สายจัมเปอร์, เทอร์มินอลบล็อก, PCB อเนกประสงค์, ท่อหด", 1, 100, ""],
  ];

  const STEPS = [
    ["เตรียมอุปกรณ์", "ดูรายการในแท็บ <b>อุปกรณ์</b> · ต้องมีมัลติมิเตอร์, หัวแร้ง (หรือใช้ breadboard ทดลองก่อน) และสาย USB สำหรับ ESP32"],
    ["ติดตั้ง Arduino IDE", "ดาวน์โหลด Arduino IDE 2 → <i>File › Preferences › Additional boards manager URLs</i> ใส่ <code>https://espressif.github.io/arduino-esp32/package_esp32_index.json</code> → <i>Boards Manager</i> ติดตั้ง <b>esp32 by Espressif</b>"],
    ["ติดตั้งไลบรารี", "<i>Library Manager</i> ค้นหาและติดตั้ง: <b>DHT sensor library</b>, <b>Adafruit Unified Sensor</b>, <b>BH1750</b> (Christopher Laws), <b>ArduinoJson</b>"],
    ["ทดสอบบอร์ดเปล่า", "เปิด <code>firmware/smartfarm/smartfarm.ino</code> แก้ <code>WIFI_SSID</code>/<code>WIFI_PASS</code> → เลือกบอร์ด <b>ESP32 Dev Module</b> → Upload → เปิด Serial Monitor (115200) จะเห็น <code>Smart Farm ready: http://192.168.x.x</code> จด IP ไว้"],
    ["ต่อไฟเลี้ยง 5V", "ปรับ LM2596 ให้ได้ 5.0V <b>ก่อน</b>ต่อเข้า VIN · ต่อ GND ทุกตัวรวมกัน (ESP32, LM2596, รีเลย์, เซนเซอร์) ให้เป็นกราวด์เดียวกัน"],
    ["ต่อ DHT22 และ BH1750", "ต่อตามแท็บ <b>ต่อทีละชิ้น</b> → รีเซ็ตบอร์ด → Serial Monitor ต้องเห็นค่า T, H และ lux (ถ้าขึ้น “ไม่พบ BH1750” ให้สลับ SDA/SCL)"],
    ["ต่อเซนเซอร์ความชื้นดิน + คาลิเบรต", "ดูค่า <code>raw</code> ใน Serial Monitor: ตอนถืออยู่ในอากาศ → ใส่ใน <code>SOIL_DRY</code> · ตอนจุ่มน้ำถึงขีด → ใส่ใน <code>SOIL_WET</code> แล้วอัปโหลดใหม่"],
    ["ทดสอบรีเลย์ (ยังไม่ต่อโหลด)", "ต่อฝั่งควบคุมของรีเลย์ → ในแอปกดเปิด/ปิดไฟและปั๊ม ต้องได้ยินเสียงคลิกและไฟ LED บนโมดูลติด"],
    ["ต่อไฟปลูกและปั๊ม 12V", "ถอดปลั๊กอะแดปเตอร์ก่อนต่อ · ต่อตามแท็บต่อทีละชิ้น (ฝั่งกำลัง) · ใส่ไดโอด 1N4007 คร่อมปั๊ม · ทดสอบสั่งจากแอปอีกครั้ง"],
    ["เชื่อมแอปกับบอร์ด", "หน้า ไฟปลูก/ปั๊มน้ำ → เมนู ⋮ → <b>ตั้งค่าการเชื่อมต่อ ESP32</b> ใส่ <code>http://IP-ของบอร์ด</code> · แอปจะส่งกฎอัตโนมัติไปเก็บที่บอร์ดเอง (ปิดแอปแล้วบอร์ดก็ยังรดน้ำตามกฎ)"],
    ["ติดตั้งกล้อง ESP32-CAM (ไม่บังคับ)", "อัปโหลด <code>firmware/esp32cam/esp32cam.ino</code> (บอร์ด <b>AI Thinker ESP32-CAM</b>) → จด IP → ในแอปแท็บ <b>กล้อง</b> → การเชื่อมต่อ ใส่ IP"],
    ["ใส่กล่องและติดตั้งหน้างาน", "ใส่บอร์ด รีเลย์ LM2596 ในกล่องกันน้ำ ร้อยสายผ่านเคเบิลแกลนด์ · วางกล่องให้สูงจากพื้น ไม่โดนน้ำจากการรดน้ำ · DHT22 ควรอยู่ในที่ร่ม อากาศถ่ายเทได้"],
  ];

  let guideDone = localGet("sf.guideDone3", []);
  const guideProgress = () => `${guideDone.length}/${STEPS.length}`;

  function wireSVG(w) {
    const rowH = 36, top = 30, n = w.rows.length, h = top + n * rowH + 10;
    const lx = 4, lw = 128, rx = 212, rw = 124;
    const rows = w.rows.map(([a, b, col, part], i) => {
      const y = top + 8 + i * rowH + rowH / 2 - 4;
      const mid = (lx + lw + rx) / 2;
      return `<line x1="${lx + lw}" y1="${y}" x2="${rx}" y2="${y}" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="${lx + lw}" cy="${y}" r="4.5" fill="${col}"/><circle cx="${rx}" cy="${y}" r="4.5" fill="${col}"/>
        <text x="${lx + lw - 10}" y="${y + 4.5}" text-anchor="end" class="pin">${esc(a)}</text>
        <text x="${rx + 10}" y="${y + 4.5}" class="pin">${esc(b)}</text>
        ${part ? `<rect x="${mid - 30}" y="${y - 10}" width="60" height="20" rx="5" class="part"/><text x="${mid}" y="${y + 4}" text-anchor="middle" class="part-t">${esc(part)}</text>` : ""}`;
    }).join("");
    return `<svg class="wire-svg" viewBox="0 0 340 ${h}" role="img" aria-label="การต่อสาย ${esc(w.name)}">
      <text x="${lx + lw / 2}" y="18" text-anchor="middle" class="box-t">${esc(w.left)}</text>
      <text x="${rx + rw / 2}" y="18" text-anchor="middle" class="box-t">${esc(w.right)}</text>
      <rect x="${lx}" y="${top}" width="${lw}" height="${n * rowH}" rx="10" class="box"/>
      <rect x="${rx}" y="${top}" width="${rw}" height="${n * rowH}" rx="10" class="box esp"/>
      ${rows}</svg>`;
  }

  function overviewSVG() {
    const box = (x, y, w, h, title, sub, cls = "") =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" class="ov-box ${cls}"/>
       <text x="${x + w / 2}" y="${y + (sub ? h / 2 - 4 : h / 2 + 6)}" text-anchor="middle" class="ov-t">${title}</text>
       ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 18}" text-anchor="middle" class="ov-s">${sub}</text>` : ""}`;
    const wire = (d, col, label, lx, ly, anchor = "middle") =>
      `<path d="${d}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
       ${label ? `<text x="${lx}" y="${ly}" text-anchor="${anchor}" class="ov-l">${label}</text>` : ""}`;
    const sensors = [["DHT22", "GPIO 4", 40], ["Soil Moisture", "GPIO 34", 130], ["BH1750", "SDA 21 · SCL 22", 220]];
    return `<svg class="ov-svg" viewBox="0 0 900 575" role="img" aria-label="แผนผังวงจรรวม">
      ${wire("M105 110 V200", W.red, "12V", 114, 162, "start")}
      ${wire("M190 235 H300", W.red, "5V → VIN", 245, 226)}
      ${wire("M60 110 H40 V405 H20", W.red, "12V → COM1, COM2", 48, 320, "start")}
      ${wire("M300 330 H250 V385 H190", W.blue, "GPIO 26", 220, 377)}
      ${wire("M300 370 H265 V420 H190", W.green, "GPIO 27", 222, 440)}
      ${wire("M60 450 V500", W.red, "NO1", 70, 482, "start")}
      ${wire("M150 450 V500", W.red, "NO2", 160, 482, "start")}
      ${sensors.map(([, pin, y]) => wire(`M520 ${y + 35} H640`, W.yellow, pin, 580, y + 26)).join("")}
      ${box(20, 40, 170, 70, "อะแดปเตอร์ 12V", "3A")}
      ${box(20, 200, 170, 70, "LM2596", "12V → 5V")}
      ${box(300, 30, 220, 380, "ESP32", "DevKit V1", "esp")}
      ${box(20, 360, 170, 90, "รีเลย์ 2 ช่อง", "5V")}
      ${box(10, 500, 110, 64, "ไฟปลูก", "12V")}
      ${box(130, 500, 110, 64, "ปั๊มน้ำ", "12V + 1N4007")}
      ${sensors.map(([n, , y]) => box(640, y, 240, 70, n, "")).join("")}
      <text x="760" y="330" text-anchor="middle" class="ov-s">เซนเซอร์ทุกตัวใช้ 3V3 + GND ร่วม</text>
      <text x="410" y="440" text-anchor="middle" class="ov-s">GND ทุกตัวต่อรวมกัน</text>
    </svg>`;
  }

  function pinTable() {
    const rows = WIRING.filter((w) => w.right === "ESP32").flatMap((w) =>
      w.rows.filter(([, b]) => /GPIO/.test(b)).map(([a, b]) => [w.left, a, b]));
    return `<table class="pin-table"><thead><tr><th>อุปกรณ์</th><th>ขา</th><th>ESP32</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td><b>${esc(r[2])}</b></td></tr>`).join("")}</tbody></table>`;
  }

  function guideLiveHTML() {
    if (!board()) return `<span class="muted">ยังไม่ได้เชื่อมต่อบอร์ด — ใส่ IP ที่ ตั้งค่าการเชื่อมต่อ ESP32 เพื่อดูค่าดิบสำหรับคาลิเบรต</span>`;
    if (!state.online || !state.board) return `<span class="muted">กำลังเชื่อมต่อ ${esc(CONFIG.apiBase)} …</span>`;
    const b = state.board, s = state.sensors;
    const cell = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
    return `<div class="live-grid">
      ${cell("soilRaw (ดิน)", isNum(b.soilRaw) ? b.soilRaw : "–")}${cell("ความชื้นดิน", `${rnd(s.soil)}%`)}
      ${cell("อุณหภูมิ", `${fmt1(s.temp)}°C`)}${cell("แสง", `${fmtNum(s.lux)} lux`)}
      ${cell("ความชื้นอากาศ", `${rnd(s.hum)}%`)}${cell("เวลาบนบอร์ด", b.clock ? "ซิงก์แล้ว" : "ยังไม่ซิงก์")}
    </div>`;
  }

  const GUIDE_TABS = [["overview", "ภาพรวม"], ["wiring", "ต่อทีละชิ้น"], ["parts", "อุปกรณ์"], ["steps", "วิธีทำ"], ["code", "โค้ด"]];

  views.guide = () => {
    const tab = ui.guideTab || "overview";
    let body = "";
    if (tab === "overview") {
      body = `
        <div class="tip warn"><span class="sq">${icon("zap")}</span><div><b>ความปลอดภัย</b><span>ระบบนี้ใช้ไฟ 12V ทั้งหมด ไม่ต้องยุ่งกับไฟบ้าน 220V · ถอดปลั๊กทุกครั้งก่อนต่อสาย · ถ้าจะใช้หลอด/ปั๊ม 220V ให้ช่างไฟฟ้าต่อและใส่กล่องปิดมิดชิด</span></div></div>
        <div class="guide-card"><div class="row-between"><h3>แผนผังรวม</h3><button class="link" data-guide="zoom">ขยาย</button></div>
          <div class="ov-wrap" data-guide="zoom">${overviewSVG()}</div></div>
        <div class="guide-card"><h3>ตารางขาที่ใช้</h3>${pinTable()}
          <p class="muted small">ไฟเลี้ยง: เซนเซอร์ทุกตัวใช้ <b>3V3</b> ส่วนรีเลย์ใช้ <b>VIN (5V)</b> · GND ต่อรวมกันทั้งหมด</p></div>`;
    } else if (tab === "wiring") {
      body = `<div class="legend">${[["แดง", W.red, "ไฟ +"], ["ดำ", W.black, "GND"], ["สีอื่น", W.yellow, "สัญญาณ"]].map(([, c, l]) =>
          `<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>
        <div class="wire-grid">${WIRING.map((w) => `<div class="guide-card wire-card">
          <div class="wire-head"><span class="sq ${w.c}">${icon(w.icon)}</span><h3>${esc(w.name)}</h3></div>
          ${wireSVG(w)}<p class="small">${w.note}</p></div>`).join("")}</div>`;
    } else if (tab === "parts") {
      const total = PARTS.reduce((a, p) => a + p[1] * p[2], 0);
      body = `<div class="guide-card"><table class="pin-table parts"><thead><tr><th>อุปกรณ์</th><th>ราคาประมาณ</th></tr></thead><tbody>
        ${PARTS.map(([n, q, p, note]) => `<tr><td><b>${esc(n)}</b>${q > 1 ? ` ×${q}` : ""}${note ? `<br><span class="muted small">${esc(note)}</span>` : ""}</td><td>~${p} ฿</td></tr>`).join("")}
        <tr class="total"><td>รวมประมาณ</td><td>~${total.toLocaleString("en-US")} ฿</td></tr></tbody></table>
        <p class="muted small">ราคาโดยประมาณจากร้านออนไลน์ในไทย อาจต่างกันตามร้านและช่วงเวลา · ไม่รวมกระบะปลูก/ถังน้ำ/สายยาง</p></div>`;
    } else if (tab === "steps") {
      body = `<div class="progress-row"><b>ทำแล้ว ${guideProgress()} ขั้น</b><div class="track"><i style="width:${(guideDone.length / STEPS.length) * 100}%;background:var(--primary)"></i></div></div>
        <ol class="steps">${STEPS.map(([t, d], i) => `<li class="${guideDone.includes(i) ? "done" : ""}">
          <button class="step-check" data-step="${i}" role="checkbox" aria-checked="${guideDone.includes(i)}" aria-label="ทำขั้นที่ ${i + 1} แล้ว">${guideDone.includes(i) ? "✓" : i + 1}</button>
          <div><b>${t}</b><p>${d}</p></div></li>`).join("")}</ol>`;
    } else {
      body = `
        <div class="guide-card"><h3>ไฟล์โค้ด</h3>
          <a class="file-link" href="${REPO}firmware/smartfarm/smartfarm.ino" target="_blank" rel="noopener">${icon("download")}<span><b>smartfarm.ino</b><small>ESP32 ตัวหลัก · เซนเซอร์ รีเลย์ ระบบอัตโนมัติ</small></span></a>
          <a class="file-link" href="${REPO}firmware/esp32cam/esp32cam.ino" target="_blank" rel="noopener">${icon("camera")}<span><b>esp32cam.ino</b><small>ESP32-CAM · ภาพสดและถ่ายภาพ</small></span></a></div>
        <div class="guide-card"><h3>ค่าที่ต้องแก้ในโค้ด</h3>
          <table class="pin-table"><tbody>
            <tr><td><code>WIFI_SSID / WIFI_PASS</code></td><td>ชื่อและรหัส Wi-Fi (2.4GHz เท่านั้น)</td></tr>
            <tr><td><code>SOIL_DRY / SOIL_WET</code></td><td>ค่า soilRaw ตอนแห้ง / ตอนจุ่มน้ำ</td></tr>
            <tr><td><code>RELAY_ACTIVE_LOW</code></td><td>true สำหรับโมดูลรีเลย์ทั่วไป</td></tr>
          </tbody></table></div>
        <div class="guide-card"><h3>ค่าดิบจากบอร์ด (สำหรับคาลิเบรต)</h3><div id="guide-live">${guideLiveHTML()}</div></div>
        <div class="guide-card"><h3>API ของบอร์ด</h3>
          <table class="pin-table"><tbody>
            <tr><td><code>GET /sensors</code></td><td>ค่าเซนเซอร์ + สถานะรีเลย์</td></tr>
            <tr><td><code>POST /relay</code></td><td><code>{"channel":2,"on":true,"minutes":3}</code></td></tr>
            <tr><td><code>GET/POST /config</code></td><td>กฎอัตโนมัติ (แอปส่งให้เอง)</td></tr>
          </tbody></table></div>`;
    }
    return `
    <section class="screen guide">
      <div class="top-bar">
        <button class="icon-btn" data-go="back" aria-label="กลับ">${icon("back")}</button>
        <h1>ต่อวงจรและวิธีทำ</h1>
        <span style="width:52px"></span>
      </div>
      <div class="chips guide-tabs">${GUIDE_TABS.map(([k, l]) =>
        `<button class="chip ${tab === k ? "active" : ""}" data-guide-tab="${k}">${l}</button>`).join("")}</div>
      ${body}
    </section>${navBar("detail")}`;
  };

  function guideCardHome() {
    return `<button class="cam-card guide-entry" data-go="guide">
      <span class="sq c-green" style="width:54px;height:54px;border-radius:16px">${icon("book")}</span>
      <span class="txt"><b>คู่มือต่อวงจรและวิธีทำ</b><span>แผนผัง · รายการอุปกรณ์ · ขั้นตอน ${guideProgress()}</span></span>
      ${icon("arrow", 'style="color:var(--primary)"')}
    </button>`;
  }

  function guideAction(d) {
    if (d.guideTab) { ui.guideTab = d.guideTab; render(); window.scrollTo(0, 0); return; }
    if (d.step !== undefined) {
      const i = Number(d.step);
      guideDone = guideDone.includes(i) ? guideDone.filter((x) => x !== i) : [...guideDone, i];
      localSet("sf.guideDone3", guideDone);
      return render();
    }
    if (d.guide === "zoom") {
      openSheet(`<h3>แผนผังรวม</h3><div class="ov-zoom">${overviewSVG()}</div>
        <p class="muted small">เลื่อนซ้าย-ขวาเพื่อดูทั้งหมด</p><button class="btn btn-outline" data-close-btn>ปิด</button>`);
    }
  }

  /* ---------- App install (PWA) ---------- */
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const isStandalone = () => isNative || window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let installEvt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvt = e;
    if (ui.route === "home") render();
  });
  window.addEventListener("appinstalled", () => { installEvt = null; toast("ติดตั้งแอปแล้ว"); if (ui.route === "home") render(); });

  function installBanner() {
    if (isStandalone() || localGet("sf.installDismissed", false)) return "";
    if (!installEvt && !isIOS) return "";
    const hint = installEvt ? "เปิดเร็วขึ้น ใช้แบบเต็มจอ และเปิดได้แม้ไม่มีเน็ต" : "แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”";
    return `<div class="install-card">
      <img src="icons/icon-192.png" alt="" width="44" height="44">
      <div class="txt"><b>ติดตั้งแอป Smart Farm</b><span>${hint}</span></div>
      ${installEvt ? `<button class="btn-install" data-action="install">ติดตั้ง</button>` : ""}
      <button class="install-x" data-action="install-dismiss" aria-label="ปิด">×</button>
    </div>`;
  }

  if ("serviceWorker" in navigator && !isNative && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  /* ---------- Render ---------- */
  const app = document.getElementById("app");
  let prevRoute = null;
  const stack = [];

  function render() {
    const html = (views[ui.route] || views.home)();
    const oldStream = app.querySelector("#cam-stream");
    app.innerHTML = html;
    app.classList.toggle("has-nav", ui.route !== "welcome");
    const screen = app.firstElementChild;
    if (prevRoute === ui.route && screen) screen.style.animation = "none";
    prevRoute = ui.route;
    mountCamera(oldStream);
  }

  // partial refresh for periodic updates (keeps inputs focused)
  function refresh() {
    if (ui.route === "devices") {
      const list = document.getElementById("dev-list");
      if (list) { list.innerHTML = devicesListHTML(); return; }
    }
    if (ui.route === "welcome") return;
    if (ui.route === "camera") return refreshCamera();
    if (ui.route === "guide") {
      const live = document.getElementById("guide-live");
      if (live) live.innerHTML = guideLiveHTML();
      return;
    }
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  function go(route) {
    if (ui.camFull) { ui.camFull = false; document.body.style.overflow = ""; }
    if (route === "back") {
      route = stack.pop() || "home";
    } else if (route === "light" || route === "pump" || route === "guide") {
      if (ui.route !== route) stack.push(ui.route);
    } else {
      stack.length = 0;
    }
    ui.route = route;
    if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route);
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- Sheets ---------- */
  const sheetRoot = document.getElementById("sheet-root");
  function openSheet(html, onMount) {
    sheetRoot.innerHTML = `<div class="backdrop" data-close><div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}</div></div>`;
    if (onMount) onMount(sheetRoot.querySelector(".sheet"));
  }
  function closeSheet() { sheetRoot.innerHTML = ""; }

  function ruleSheet(existing, presetDevice) {
    const r = existing ? Object.assign({}, existing) : {
      id: null, device: presetDevice || "pump", kind: "time", start: "07:00", end: "19:00", duration: 3, days: "daily", value: 5000, on: true,
    };
    if (!existing && r.device === "light") { r.start = "18:00"; r.end = "22:00"; }
    const kinds = [["time", "ตั้งเวลา"], ["soil", "ความชื้นดิน"], ["lux", "แสงน้อย"], ["temp", "อุณหภูมิสูง"]];

    function body() {
      const timeLight = r.kind === "time" && r.device === "light";
      const timePump = r.kind === "time" && r.device === "pump";
      return `
        <h3>${existing ? "แก้ไขกฎอัตโนมัติ" : "เพิ่มกฎอัตโนมัติ"}</h3>
        ${existing ? "" : `<div class="field"><label>ประเภท</label><div class="seg">${kinds.map(([k, l]) =>
          `<button type="button" class="${r.kind === k ? "active" : ""}" data-kind="${k}">${l}</button>`).join("")}</div></div>`}
        ${r.kind === "time" ? `
          <div class="field"><label>อุปกรณ์</label><div class="seg">
            <button type="button" class="${r.device === "light" ? "active" : ""}" data-dev="light">ไฟปลูกต้นไม้</button>
            <button type="button" class="${r.device === "pump" ? "active" : ""}" data-dev="pump">ปั๊มน้ำ</button></div></div>` : ""}
        ${timeLight || r.kind === "lux" ? `<div class="field-two">
            <div class="field"><label>เริ่ม</label><input type="time" name="start" value="${r.start}" required></div>
            <div class="field"><label>สิ้นสุด</label><input type="time" name="end" value="${r.end}" required></div></div>` : ""}
        ${timePump ? `<div class="field-two">
            <div class="field"><label>เวลา</label><input type="time" name="start" value="${r.start}" required></div>
            <div class="field"><label>นาน (นาที)</label><input type="number" name="duration" min="1" max="60" value="${r.duration}" required></div></div>` : ""}
        ${r.kind === "time" ? `<div class="field"><label>วัน</label><div class="seg">${Object.entries(DAYS).map(([k, l]) =>
          `<button type="button" class="${r.days === k ? "active" : ""}" data-days="${k}">${l}</button>`).join("")}</div></div>` : ""}
        ${r.kind === "soil" ? `<div class="field"><label>รดน้ำเมื่อความชื้นดินต่ำกว่า (%)</label><input type="number" name="threshold" min="10" max="80" step="5" value="${state.pump.threshold}"></div>
          <div class="field"><label>ระยะเวลารดน้ำต่อรอบ (นาที)</label><input type="number" name="pduration" min="1" max="30" value="${state.pump.duration}"></div>` : ""}
        ${r.kind === "lux" ? `<div class="field"><label>เปิดไฟเมื่อแสงต่ำกว่า (lux)</label><input type="number" name="value" min="100" max="40000" step="100" value="${r.value || 5000}"></div>` : ""}
        ${r.kind === "temp" ? `<div class="field"><label>แจ้งเตือนเมื่ออุณหภูมิเกิน (°C)</label><input type="number" name="value" min="20" max="50" step="0.5" value="${r.value || 35}"></div>` : ""}
        <button class="btn btn-solid" data-sheet="save">บันทึก</button>
        ${existing ? `<button class="btn" style="color:var(--orange);height:50px" data-sheet="delete">${icon("trash")} ลบกฎนี้</button>` : ""}`;
    }

    function readInputs(el) {
      el.querySelectorAll("input[name]").forEach((i) => {
        const v = i.type === "number" ? Number(i.value) : i.value;
        if (i.name === "threshold") state.pump.threshold = clamp(v || 40, 10, 80);
        else if (i.name === "pduration") state.pump.duration = clamp(v || 3, 1, 30);
        else r[i.name] = v;
      });
    }

    openSheet(body(), (el) => {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.kind || b.dataset.dev || b.dataset.days) {
          readInputs(el);
          if (b.dataset.kind) { r.kind = b.dataset.kind; if (r.kind === "lux") { r.device = "light"; r.start = "06:00"; r.end = "18:00"; } if (r.kind === "temp") r.device = "alert"; if (r.kind === "soil") r.device = "pump"; }
          if (b.dataset.dev) { r.device = b.dataset.dev; if (r.device === "light") { r.start = "18:00"; r.end = "22:00"; } }
          if (b.dataset.days) r.days = b.dataset.days;
          el.innerHTML = '<div class="grip"></div>' + body();
          return;
        }
        if (b.dataset.sheet === "save") {
          readInputs(el);
          if (r.kind === "time" && r.device === "pump") r.duration = clamp(Math.round(r.duration) || 3, 1, 60);
          if (!existing && (r.kind === "soil" || r.kind === "lux" || r.kind === "temp")) {
            const dup = state.rules.find((x) => x.kind === r.kind);
            if (dup) { Object.assign(dup, r, { id: dup.id, on: true }); closeSheet(); afterChange("อัปเดตกฎเดิมแล้ว"); return; }
          }
          const clean = pickRule(r);
          if (existing) Object.assign(existing, clean);
          else state.rules.push(Object.assign(clean, { id: nid() }));
          closeSheet();
          afterChange(existing ? "บันทึกแล้ว" : "เพิ่มกฎแล้ว");
        }
        if (b.dataset.sheet === "delete") {
          state.rules = state.rules.filter((x) => x.id !== existing.id);
          closeSheet();
          afterChange("ลบกฎแล้ว");
        }
      });
    });
  }

  function pickRule(r) {
    const base = { id: r.id, device: r.device, kind: r.kind, on: r.on !== false };
    if (r.kind === "time" && r.device === "light") return Object.assign(base, { start: r.start, end: r.end, days: r.days });
    if (r.kind === "time") return Object.assign(base, { start: r.start, duration: r.duration, days: r.days });
    if (r.kind === "lux") return Object.assign(base, { start: r.start, end: r.end, value: r.value, device: "light" });
    if (r.kind === "temp") return Object.assign(base, { value: r.value, device: "alert" });
    return Object.assign(base, { device: "pump" });
  }

  function notificationsSheet() {
    const map = { pump: ["drop", "c-blue"], temp: ["thermo", "c-orange"] };
    const list = state.notifications.map((n) => {
      const [i, c] = map[n.type] || ["bell", "c-green"];
      return `<div class="notif"><span class="sq ${c}">${icon(i)}</span><div><b>${esc(n.text)}</b><span>${hhmm(n.at)} · ${new Date(n.at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span></div></div>`;
    }).join("");
    state.unread = 0;
    save();
    render();
    openSheet(`<h3>การแจ้งเตือน</h3>${list || '<div class="empty">ยังไม่มีการแจ้งเตือน</div>'}
      <button class="btn btn-outline" data-close-btn style="margin-top:14px">ปิด</button>`);
  }

  function deviceMenu(device) {
    const isLight = device === "light";
    openSheet(`<h3>${isLight ? "ไฟปลูกต้นไม้" : "ปั๊มน้ำ"}</h3>
      <div class="info-card" style="margin-bottom:14px">
        <div class="info-row"><span class="sq c-green">${icon("wifi")}</span><span><small>เชื่อมต่อ</small><b>ESP32 · รีเลย์ช่อง ${isLight ? 1 : 2}</b></span></div>
        <div class="info-row"><span class="sq c-green">${icon("refresh")}</span><span><small>ระบบอัตโนมัติ</small><b>${state.autoOn ? "เปิดอยู่" : "ปิดอยู่"}</b></span></div>
      </div>
      <button class="btn btn-outline" data-menu="settings">ตั้งค่าการเชื่อมต่อ ESP32</button>
      <button class="btn" style="height:50px;color:var(--muted)" data-close-btn>ปิด</button>`, (el) => {
      el.querySelector('[data-menu="settings"]').addEventListener("click", settingsSheet);
    });
  }

  function settingsSheet() {
    openSheet(`<h3>เชื่อมต่อ ESP32</h3>
      <div class="field"><label>URL ของ ESP32 (เว้นว่างเพื่อใช้โหมดจำลอง)</label>
        <input name="api" type="url" placeholder="http://192.168.1.50" value="${esc(CONFIG.apiBase)}"></div>
      <p class="muted" style="font-size:13.5px;margin:0 0 10px">แอปจะเรียก <b>GET /sensors</b> ทุก 5 วินาที และ <b>POST /relay</b> เมื่อสั่งเปิด/ปิด</p>
      <button class="btn btn-solid" data-set="save">บันทึก</button>
      <button class="btn" style="height:50px;color:var(--orange)" data-set="reset">รีเซ็ตข้อมูลทั้งหมด</button>
      <button class="btn" style="height:46px;color:var(--primary)" data-goguide>${icon("book")} วิธีต่อวงจรและอัปโหลดโค้ด</button>
      <a href="privacy.html" target="_blank" rel="noopener" class="muted" style="display:block;text-align:center;font-size:13.5px;margin-top:6px">นโยบายความเป็นส่วนตัว</a>`, (el) => {
      el.querySelector('[data-set="save"]').addEventListener("click", () => {
        CONFIG.apiBase = el.querySelector("input").value.trim();
        localSet("sf.apiBase", CONFIG.apiBase);
        state.online = true;
        closeSheet();
        if (!CONFIG.apiBase) { toast("ใช้โหมดจำลอง"); return tick(); }
        toast("กำลังเชื่อมต่อ…");
        tick().then(() => {
          toast(state.online ? "เชื่อมต่อ ESP32 แล้ว" : "เชื่อมต่อไม่ได้ ตรวจ IP และ Wi-Fi");
          if (state.online) syncConfig(true);
        });
      });
      el.querySelector("[data-goguide]").addEventListener("click", () => { closeSheet(); go("guide"); });
      el.querySelector('[data-set="reset"]').addEventListener("click", () => {
        if (!confirm("ล้างการตั้งค่าและข้อมูลทั้งหมด?")) return;
        try { localStorage.removeItem("sf.state"); } catch (e) { /* ignore */ }
        state = defaultState();
        state.started = true;
        state.history = seedHistory(state.sensors);
        closeSheet();
        save();
        go("home");
      });
    });
  }

  function durationSheet() {
    openSheet(`<h3>ระยะเวลารดน้ำต่อรอบ</h3>
      <div class="field"><label>นาที</label><div class="seg">${[1, 2, 3, 5, 10, 15].map((n) =>
        `<button type="button" class="${state.pump.duration === n ? "active" : ""}" data-dur="${n}">${n} นาที</button>`).join("")}</div></div>`, (el) => {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-dur]");
        if (!b) return;
        state.pump.duration = Number(b.dataset.dur);
        closeSheet();
        afterChange(`ตั้งรดน้ำรอบละ ${state.pump.duration} นาที`);
      });
    });
  }

  sheetRoot.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]") || e.target.closest("[data-close-btn]")) closeSheet();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function afterChange(msg) {
    syncConfig();
    automation();
    save();
    render();
    if (msg) toast(msg);
  }

  /* ---------- Events ---------- */
  app.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-action],[data-quick],[data-toggle],[data-devfilter],[data-autofilter],[data-rule],[data-edit],[data-mode],[data-threshold],[data-range],[data-metric-tab],[data-cam],[data-snap],[data-guide],[data-guide-tab],[data-step]");
    if (!t) return;
    const d = t.dataset;

    if (d.cam || d.snap) return camAction(d.cam || "view", d.snap);
    if (d.guide || d.guideTab || d.step !== undefined) return guideAction(d);
    if (d.toggle) {
      if (d.toggle === "light") {
        if (state.light.mode !== "manual" && state.autoOn) {
          state.light.mode = "manual";
          toast("เปลี่ยนเป็นโหมดสั่งเอง");
        }
        setLight(!state.light.on, "user");
      } else if (d.toggle === "pump") {
        state.pump.on ? stopPump("user") : startPump(state.pump.duration, "user");
      }
      return afterChange();
    }
    if (d.quick) {
      if (d.quick === "light") { state.light.mode = "manual"; setLight(!state.light.on, "user"); }
      if (d.quick === "pump") state.pump.on ? stopPump("user") : startPump(state.pump.duration, "user");
      if (d.quick === "auto") { state.autoOn = !state.autoOn; toast(state.autoOn ? "เปิดระบบอัตโนมัติ" : "ปิดระบบอัตโนมัติ"); }
      if (d.quick === "alerts") { state.alertsOn = !state.alertsOn; toast(state.alertsOn ? "เปิดการแจ้งเตือน" : "ปิดการแจ้งเตือน"); }
      return afterChange();
    }
    if (d.go) {
      if (d.metric) ui.metric = d.metric;
      return go(d.go);
    }
    if (d.devfilter) { ui.devFilter = d.devfilter; return render(); }
    if (d.autofilter) { ui.autoFilter = d.autofilter; return render(); }
    if (d.range) { ui.range = d.range; return render(); }
    if (d.metricTab) { ui.metric = d.metricTab; return render(); }
    if (d.rule) {
      const r = state.rules.find((x) => x.id === d.rule);
      if (r) r.on = !r.on;
      return afterChange();
    }
    if (d.edit) {
      const r = state.rules.find((x) => x.id === d.edit);
      if (r) ruleSheet(r);
      return;
    }
    if (d.mode) {
      state.light.mode = d.mode;
      const labels = { schedule: "ทำงานตามเวลา", light: "ทำงานตามแสง", manual: "สั่งเอง" };
      return afterChange(`โหมด: ${labels[d.mode]}`);
    }
    if (d.threshold) {
      state.pump.threshold = clamp(state.pump.threshold + Number(d.threshold), 10, 80);
      return afterChange();
    }
    switch (d.action) {
      case "start": state.started = true; save(); return go("home");
      case "notifications": return notificationsSheet();
      case "add-rule": return ruleSheet(null, d.device);
      case "device-menu": return deviceMenu(d.device);
      case "duration": return durationSheet();
      case "pump-now": startPump(state.pump.duration, "user"); return afterChange();
      case "pump-stop": stopPump("user"); return afterChange();
      case "install":
        if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); }
        return;
      case "install-dismiss": localSet("sf.installDismissed", true); return render();
    }
  });

  app.addEventListener("input", (e) => {
    if (e.target.id === "dev-search") {
      ui.devQuery = e.target.value;
      document.getElementById("dev-list").innerHTML = devicesListHTML();
    }
  });

  // live "updated x seconds ago"
  setInterval(() => {
    const el = app.querySelector('[data-live="ago"]');
    if (el) el.textContent = ago(state.updatedAt);
  }, 1000);

  window.addEventListener("hashchange", () => {
    const r = location.hash.slice(1);
    if (views[r] && r !== ui.route) go(r);
  });

  /* ---------- Boot ---------- */
  const initial = location.hash.slice(1);
  if (state.started && views[initial] && initial !== "welcome") ui.route = initial;
  // reset daily counters when the day changes
  const today = new Date().toDateString();
  if (state.day && state.day !== today) { state.light.minutesToday = 0; state.pump.minutesToday = 0; }
  state.day = today;
  if (state.pump.on && Date.now() > state.pump.runUntil) state.pump.on = false;

  automation();
  render();
  setInterval(tick, CONFIG.pollMs);
  if (board()) syncConfig(true);
  if (CONFIG.apiBase) tick();
})();
