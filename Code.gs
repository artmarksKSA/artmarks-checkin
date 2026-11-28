// ArtMarks check-in backend v2 — Google Sheet in your Drive = database
const P = PropertiesService.getScriptProperties();
const SS = () => SpreadsheetApp.getActive();
const NAME = /^[\p{L}\p{M}'.\-]+( [\p{L}\p{M}'.\-]+)+$/u;
const BAD = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "fakeinbox.com",
  "throwaway.email",
];
const okName = (n) =>
  NAME.test(n) &&
  n.length >= 5 &&
  n.length <= 60 &&
  n.split(" ").every((w) => w.length >= 2) &&
  !/(.)\1{3,}/u.test(n);
const okPhone = (p) => {
  const d = p.replace(/\D/g, "");
  return (
    /^\+?\d{8,15}$/.test(p) &&
    !/^(\d)\1+$/.test(d) &&
    !/(012345|123456|234567|345678|456789)/.test(d) &&
    !(/^05/.test(p) && p.length != 10)
  );
};
const okMail = (e) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 80 && !BAD.includes(e.split("@")[1]);
const rnd = (n) => Utilities.getUuid().replace(/-/g, "").slice(0, n);
const EV_H = ["id", "name_ar", "name_en", "event_date", "active", "seq_guest", "seq_artist"];
const VI_H = [
  "event_id",
  "serial",
  "name",
  "phone",
  "email",
  "ticket",
  "created_at",
  "checked_in_at",
  "type",
  "source",
  "card_mailed",
];
const isT = (v) => v === true || String(v).toUpperCase() === "TRUE";
const typeOf = (r) => (String(r[8] || "guest") === "artist" ? "artist" : "guest");

const SC_H = ["time", "event_id", "gate", "ticket", "status", "name", "serial", "type"];
function sheetOf(name, headers) {
  const s = SS();
  let sh = s.getSheetByName(name);
  if (!sh) {
    sh = s.insertSheet(name);
    if (headers) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}
function logScan(ev, gate, t, status, row) {
  try {
    sheetOf("Scans", SC_H).appendRow([
      new Date().toISOString(),
      ev ? ev.id : "",
      gate || "",
      String(t).slice(0, 36),
      status,
      row ? row[2] : "",
      row ? row[1] : "",
      row ? typeOf(row) : "",
    ]);
  } catch (e) {}
}
function buildDashboard() {
  const s = SS();
  if (s.getSheetByName("Dashboard")) return;
  const d = s.insertSheet("Dashboard", 0);
  const rows = [
    ["لوحة المتابعة (تُحدَّث تلقائياً)", "", "", ""],
    ["", "", "", ""],
    [
      "المعرض الفعّال",
      '=IFERROR(INDEX(Events!B:B,MATCH(TRUE,Events!E:E,0)),"لا يوجد معرض مفعّل")',
      "",
      "",
    ],
    ["معرّف المعرض", '=IFERROR(INDEX(Events!A:A,MATCH(TRUE,Events!E:E,0)),"")', "", ""],
    ["", "", "", ""],
    ["", "المسجلون", "الداخلون", "المتبقون"],
    [
      "الضيوف",
      '=COUNTIFS(Visitors!A:A,$B$4,Visitors!I:I,"guest")',
      '=COUNTIFS(Visitors!A:A,$B$4,Visitors!I:I,"guest",Visitors!H:H,"<>")',
      "=B7-C7",
    ],
    [
      "الفنانون",
      '=COUNTIFS(Visitors!A:A,$B$4,Visitors!I:I,"artist")',
      '=COUNTIFS(Visitors!A:A,$B$4,Visitors!I:I,"artist",Visitors!H:H,"<>")',
      "=B8-C8",
    ],
    ["الإجمالي", "=B7+B8", "=C7+C8", "=D7+D8"],
    ["", "", "", ""],
    ["تسجيل فوري عند المدخل", '=COUNTIFS(Visitors!A:A,$B$4,Visitors!J:J,"walkin")', "", ""],
    ["بطاقات مكررة (مُسحت سابقاً)", '=COUNTIFS(Scans!B:B,$B$4,Scans!E:E,"duplicate")', "", ""],
    ["بطاقات في بوابة خاطئة", '=COUNTIFS(Scans!B:B,$B$4,Scans!E:E,"wrong_gate")', "", ""],
    ["بطاقات غير صالحة", '=COUNTIFS(Scans!B:B,$B$4,Scans!E:E,"invalid")', "", ""],
  ];
  d.getRange(1, 1, rows.length, 4).setValues(rows);
}
function setup() {
  const s = SS();
  const ev = s.getSheetByName("Events") || s.insertSheet("Events");
  const vi = s.getSheetByName("Visitors") || s.insertSheet("Visitors");
  ev.getRange(1, 1, 1, EV_H.length).setValues([EV_H]);
  vi.getRange(1, 1, 1, VI_H.length).setValues([VI_H]);
  ev.getRange("A:D").setNumberFormat("@");
  vi.getRange("A:A").setNumberFormat("@");
  vi.getRange("C:F").setNumberFormat("@");
  vi.getRange("I:K").setNumberFormat("@");
  const sc = sheetOf("Scans", SC_H);
  sc.getRange(1, 1, 1, SC_H.length).setValues([SC_H]);
  sc.getRange("B:D").setNumberFormat("@");
  buildDashboard();
  s.getSheets().forEach((x) => {
    if (x.getLastRow() === 0 && /^(Sheet ?1|ورقة ?1|الورقة ?1)$/.test(x.getName()))
      s.deleteSheet(x);
  });
  if (!P.getProperty("ADMIN_PASS")) P.setProperty("ADMIN_PASS", rnd(10));
  if (!P.getProperty("GATE_PIN"))
    P.setProperty("GATE_PIN", String(100000 + (parseInt(rnd(6), 16) % 900000)));
  if (!P.getProperty("ARTIST_CODE")) P.setProperty("ARTIST_CODE", rnd(6).toUpperCase());
  Logger.log(
    "ADMIN_PASS (كلمة مرور الإدارة): " +
      P.getProperty("ADMIN_PASS") +
      "\nGATE_PIN (رمز فريق البوابة): " +
      P.getProperty("GATE_PIN") +
      "\nARTIST_CODE (رمز الفنانين): " +
      P.getProperty("ARTIST_CODE"),
  );
  MailApp.getRemainingDailyQuota();
}
function doGet() {
  return ContentService.createTextOutput("ArtMarks check-in API v2");
}
function doPost(e) {
  let o;
  try {
    o = route(JSON.parse(e.postData.contents));
  } catch (x) {
    o = { ok: false, err: "server" };
  }
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
const fd = (v) =>
  v instanceof Date
    ? Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd")
    : String(v);
function evObj(v, i) {
  return {
    row: i + 1,
    id: String(v[0]),
    name_ar: v[1],
    name_en: v[2],
    event_date: fd(v[3]),
    active: isT(v[4]),
    seq: { guest: Number(v[5]) || 0, artist: Number(v[6]) || 0 },
  };
}
function activeEvent() {
  const v = SS().getSheetByName("Events").getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (isT(v[i][4])) return evObj(v[i], i);
  return null;
}
function cardOf(ev, r) {
  return {
    name: r[2],
    serial: r[1],
    ticket: String(r[5]),
    type: typeOf(r),
    name_ar: ev.name_ar,
    name_en: ev.name_en,
    event_date: ev.event_date,
  };
}
function nextSerial(ev, type) {
  const n = ev.seq[type] + 1;
  ev.seq[type] = n;
  SS()
    .getSheetByName("Events")
    .getRange(ev.row, type === "artist" ? 7 : 6)
    .setValue(n);
  return n;
}
function route(d) {
  const a = d.a,
    c = CacheService.getScriptCache();
  if (a === "event") {
    const ev = activeEvent();
    return {
      ok: true,
      ev: ev && { name_ar: ev.name_ar, name_en: ev.name_en, event_date: ev.event_date },
    };
  }
  if (a === "send_code") return sendCode(d);
  if (a === "verify") return verify(d);
  if (a === "card_mail") return cardMail(d);
  if ((+c.get("fail") || 0) > 30) return { ok: false, err: "locked" };
  const admin = !!d.pass && d.pass === P.getProperty("ADMIN_PASS"),
    gate = admin || (!!d.pin && d.pin === P.getProperty("GATE_PIN"));
  if (!gate) {
    c.put("fail", (+c.get("fail") || 0) + 1, 300);
    return { ok: false, err: "auth" };
  }
  if (a === "login") return { ok: true, role: admin ? "admin" : "gate" };
  if (a === "checkin") return checkin(String(d.ticket || ""), String(d.gate || ""));
  if (a === "stats") return stats();
  if (a === "walkin") return walkin(d);
  if (!admin) return { ok: false, err: "auth" };
  const sh = SS().getSheetByName("Events");
  if (a === "events") {
    const v = sh
      .getDataRange()
      .getValues()
      .slice(1)
      .map((r, i) => evObj(r, i + 1))
      .map((x) => ({
        id: x.id,
        name_ar: x.name_ar,
        name_en: x.name_en,
        event_date: x.event_date,
        active: x.active,
        seq: x.seq,
      }));
    return {
      ok: true,
      events: v.reverse(),
      quota: MailApp.getRemainingDailyQuota(),
      brevo: !!P.getProperty("BREVO_KEY"),
      artist_code: P.getProperty("ARTIST_CODE"),
      gate_pin: P.getProperty("GATE_PIN"),
    };
  }
  if (a === "set_artist_code") {
    const code = String(d.code || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return { ok: false, err: "bad" };
    P.setProperty("ARTIST_CODE", code);
    return { ok: true, artist_code: code };
  }
  if (a === "set_gate_pin") {
    let c = String(d.code || "").trim();
    if (!c) c = String(100000 + (parseInt(rnd(6), 16) % 900000));
    if (!/^\d{4,8}$/.test(c)) return { ok: false, err: "bad" };
    P.setProperty("GATE_PIN", c);
    return { ok: true, gate_pin: c };
  }
  if (a === "save_event") {
    const n1 = String(d.name_ar || "").trim(),
      n2 = String(d.name_en || "").trim(),
      dt = String(d.date || "");
    if (!n1 || !n2 || !/^\d{4}-\d{2}-\d{2}$/.test(dt)) return { ok: false, err: "bad" };
    const n = sh.getLastRow();
    if (n > 1) sh.getRange(2, 5, n - 1, 1).setValue(false);
    sh.appendRow([Utilities.getUuid(), n1, n2, dt, true, 0, 0]);
    return { ok: true };
  }
  if (a === "activate") {
    const v = sh.getDataRange().getValues();
    let f = false;
    for (let i = 1; i < v.length; i++) {
      const m = String(v[i][0]) === String(d.id);
      if (m) f = true;
      sh.getRange(i + 1, 5).setValue(m);
    }
    return { ok: f };
  }
  if (a === "visitors") {
    const ev = activeEvent();
    if (!ev) return { ok: true, rows: [] };
    const rows = SS()
      .getSheetByName("Visitors")
      .getDataRange()
      .getValues()
      .slice(1)
      .filter((r) => String(r[0]) === ev.id)
      .map((r) => ({
        type: typeOf(r),
        serial: r[1],
        name: r[2],
        phone: r[3],
        email: r[4],
        source: r[9] || "online",
        registered: r[6],
        checked_in: r[7],
      }));
    return { ok: true, rows };
  }
  return { ok: false, err: "auth" };
}
function mail(to, subject, body, att) {
  const k = P.getProperty("BREVO_KEY");
  if (k) {
    const pl = {
      sender: {
        name: P.getProperty("SENDER_NAME") || "ArtMarks",
        email: P.getProperty("SENDER_EMAIL"),
      },
      to: [{ email: to }],
      subject: subject,
      textContent: body,
    };
    if (att) pl.attachment = [{ name: att.name, content: att.b64 }];
    const r = UrlFetchApp.fetch("https://api.brevo.com/v3/smtp/email", {
      method: "post",
      contentType: "application/json",
      headers: { "api-key": k },
      muteHttpExceptions: true,
      payload: JSON.stringify(pl),
    });
    return r.getResponseCode() < 300;
  }
  const o = { to: to, subject: subject, body: body, name: "ArtMarks | بصمات فن" };
  if (att)
    o.attachments = [Utilities.newBlob(Utilities.base64Decode(att.b64), "image/png", att.name)];
  MailApp.sendEmail(o);
  return true;
}
function throttle(c) {
  const mk = "g" + Math.floor(Date.now() / 60000),
    g = +c.get(mk) || 0;
  if (g > 40) return false;
  c.put(mk, g + 1, 120);
  return true;
}
function sendCode(d) {
  const ev = activeEvent();
  if (!ev) return { ok: false, err: "closed" };
  const type = d.type === "artist" ? "artist" : "guest";
  const name = String(d.name || "")
      .trim()
      .replace(/\s+/g, " "),
    phone = String(d.phone || "").replace(/[\s-]/g, ""),
    email = String(d.email || "")
      .trim()
      .toLowerCase();
  if (!okName(name) || !okPhone(phone) || !okMail(email)) return { ok: false, err: "bad" };
  if (
    type === "artist" &&
    String(d.acode || "")
      .trim()
      .toUpperCase() !== P.getProperty("ARTIST_CODE")
  )
    return { ok: false, err: "acode" };
  const c = CacheService.getScriptCache();
  if (!throttle(c)) return { ok: false, err: "busy" };
  const rk = "r" + email,
    r = +c.get(rk) || 0;
  if (r >= 5) return { ok: false, err: "rate" };
  c.put(rk, r + 1, 3600);
  if (!P.getProperty("BREVO_KEY") && MailApp.getRemainingDailyQuota() < 1)
    return { ok: false, err: "quota" };
  const code = String(
    100000 + (parseInt(Utilities.getUuid().replace(/-/g, "").slice(0, 8), 16) % 900000),
  );
  c.put(
    "c" + email,
    JSON.stringify({ code: code, name: name, phone: phone, type: type, t: 0 }),
    600,
  );
  const ok = mail(
    email,
    "ArtMarks | " + code,
    "رمز التحقق الخاص بك في بصمات فن: " +
      code +
      "\nصالح لمدة 10 دقائق.\n\nYour ArtMarks verification code: " +
      code +
      "\nValid for 10 minutes.",
  );
  return ok ? { ok: true } : { ok: false, err: "mail" };
}
function verify(d) {
  const email = String(d.email || "")
      .trim()
      .toLowerCase(),
    c = CacheService.getScriptCache(),
    k = "c" + email,
    raw = c.get(k);
  if (!raw) return { ok: false, err: "code" };
  const o = JSON.parse(raw);
  if (o.t >= 5) {
    c.remove(k);
    return { ok: false, err: "code" };
  }
  if (String(d.code || "").trim() !== o.code) {
    o.t++;
    c.put(k, JSON.stringify(o), 600);
    return { ok: false, err: "code" };
  }
  c.remove(k);
  const L = LockService.getScriptLock();
  L.waitLock(20000);
  try {
    const ev = activeEvent();
    if (!ev) return { ok: false, err: "closed" };
    const sh = SS().getSheetByName("Visitors"),
      v = sh.getDataRange().getValues();
    let row = null;
    for (let i = 1; i < v.length; i++)
      if (String(v[i][0]) === ev.id && String(v[i][4]).toLowerCase() === email) {
        row = v[i];
        break;
      }
    if (!row) {
      const serial = nextSerial(ev, o.type);
      row = [
        ev.id,
        serial,
        o.name,
        o.phone,
        email,
        Utilities.getUuid(),
        new Date().toISOString(),
        "",
        o.type,
        "online",
        "",
      ];
      sh.appendRow(row);
    }
    return { ok: true, card: cardOf(ev, row) };
  } finally {
    L.releaseLock();
  }
}
function walkin(d) {
  const type = d.type === "artist" ? "artist" : "guest";
  const name = String(d.name || "")
      .trim()
      .replace(/\s+/g, " "),
    phone = String(d.phone || "").replace(/[\s-]/g, ""),
    email = String(d.email || "")
      .trim()
      .toLowerCase();
  if (!okName(name) || !okPhone(phone) || (email && !okMail(email)))
    return { ok: false, err: "bad" };
  const L = LockService.getScriptLock();
  L.waitLock(20000);
  try {
    const ev = activeEvent();
    if (!ev) return { ok: false, err: "closed" };
    const sh = SS().getSheetByName("Visitors"),
      v = sh.getDataRange().getValues();
    let row = null,
      ri = 0;
    if (email)
      for (let i = 1; i < v.length; i++)
        if (String(v[i][0]) === ev.id && String(v[i][4]).toLowerCase() === email) {
          row = v[i];
          ri = i + 1;
          break;
        }
    let existing = true;
    if (!row) {
      existing = false;
      const serial = nextSerial(ev, type);
      row = [
        ev.id,
        serial,
        name,
        phone,
        email,
        Utilities.getUuid(),
        new Date().toISOString(),
        new Date().toISOString(),
        type,
        "walkin",
        "",
      ];
      sh.appendRow(row);
    } else if (!row[7]) sh.getRange(ri, 8).setValue(new Date().toISOString());
    return { ok: true, existing: existing, card: cardOf(ev, row), email: !!email };
  } finally {
    L.releaseLock();
  }
}
function cardMail(d) {
  const t = String(d.ticket || ""),
    img = String(d.image || ""),
    pre = "data:image/png;base64,";
  if (!/^[0-9a-f-]{36}$/i.test(t) || img.indexOf(pre) !== 0 || img.length > 4000000)
    return { ok: false, err: "bad" };
  const c = CacheService.getScriptCache();
  if (!throttle(c)) return { ok: false, err: "busy" };
  if (!P.getProperty("BREVO_KEY") && MailApp.getRemainingDailyQuota() < 1)
    return { ok: false, err: "quota" };
  const L = LockService.getScriptLock();
  L.waitLock(20000);
  try {
    const ev = activeEvent();
    if (!ev) return { ok: false, err: "closed" };
    const sh = SS().getSheetByName("Visitors"),
      v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++)
      if (String(v[i][5]) === t && String(v[i][0]) === ev.id) {
        if (!v[i][4]) return { ok: false, err: "noemail" };
        if (v[i][10]) return { ok: true, already: true };
        const ok = mail(
          String(v[i][4]),
          "بطاقة دخولك | Your entry pass – ArtMarks",
          "أهلاً " +
            v[i][2] +
            "،\nمرفقة بطاقة دخولك إلى " +
            ev.name_ar +
            ". أبرزي الباركود الكبير عند البوابة.\n\nHello " +
            v[i][2] +
            ",\nYour entry pass for " +
            ev.name_en +
            " is attached. Show the large QR code at the gate.\n\nhttps://artmarks.net",
          { name: "ArtMarks-pass.png", b64: img.slice(pre.length) },
        );
        if (ok) sh.getRange(i + 1, 11).setValue(new Date().toISOString());
        return ok ? { ok: true } : { ok: false, err: "mail" };
      }
    return { ok: false, err: "bad" };
  } finally {
    L.releaseLock();
  }
}
function checkin(t, gate) {
  const L = LockService.getScriptLock();
  L.waitLock(10000);
  try {
    const ev = activeEvent();
    if (!ev) {
      logScan(null, gate, t, "invalid", null);
      return { ok: true, status: "invalid" };
    }
    const sh = SS().getSheetByName("Visitors"),
      v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++)
      if (String(v[i][5]) === t && String(v[i][0]) === ev.id) {
        const type = typeOf(v[i]),
          base = { ok: true, type: type, name: v[i][2], serial: v[i][1] };
        if (gate && gate !== type) {
          logScan(ev, gate, t, "wrong_gate", v[i]);
          return Object.assign(base, { status: "wrong_gate" });
        }
        if (v[i][7]) {
          logScan(ev, gate, t, "duplicate", v[i]);
          return Object.assign(base, { status: "duplicate" });
        }
        sh.getRange(i + 1, 8).setValue(new Date().toISOString());
        logScan(ev, gate, t, "ok", v[i]);
        return Object.assign(base, { status: "ok" });
      }
    logScan(ev, gate, t, "invalid", null);
    return { ok: true, status: "invalid" };
  } finally {
    L.releaseLock();
  }
}
function stats() {
  const ev = activeEvent();
  const z = { total: 0, inside: 0 },
    o = { ok: true, guest: Object.assign({}, z), artist: Object.assign({}, z) };
  if (!ev) return o;
  SS()
    .getSheetByName("Visitors")
    .getDataRange()
    .getValues()
    .slice(1)
    .filter((r) => String(r[0]) === ev.id)
    .forEach((r) => {
      const x = o[typeOf(r)];
      x.total++;
      if (r[7]) x.inside++;
    });
  return o;
}
