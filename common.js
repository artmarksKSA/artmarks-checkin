window.AM = (function () {
  const api = async (a, d = {}) => {
    try {
      const r = await fetch(CFG.API, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ a, ...d }),
      });
      return await r.json();
    } catch (e) {
      return { ok: false, err: "net" };
    }
  };
  const pad = (c) => (c.type === "artist" ? "A-" : "G-") + String(c.serial).padStart(6, "0");
  const ld = (s) =>
    s
      ? new Promise((o) => {
          const i = new Image();
          i.onload = () => o(i);
          i.onerror = () => o(null);
          i.src = s;
        })
      : Promise.resolve(null);
  async function drawCard(cv, c, lang) {
    const W = 1080,
      H = 1920,
      ar = lang === "ar",
      art = c.type === "artist",
      x = cv.getContext("2d");
    cv.width = W;
    cv.height = H;
    await Promise.all([300, 400, 700, 800].map((w) => document.fonts.load(w + " 40px Almarai")));
    const [lg, strip, band] = await Promise.all([
      ld("logo-teal.png"),
      ld(art ? null : "strip-guest.png"),
      ld(art ? "band-artist.png" : null),
    ]);
    x.fillStyle = "#F1ECDA";
    x.fillRect(0, 0, W, H);
    const gr = x.createRadialGradient(W / 2, 900, 0, W / 2, 900, 1250);
    gr.addColorStop(0, "rgba(255,252,242,.6)");
    gr.addColorStop(1, "rgba(255,252,242,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    let cx = W / 2,
      mw = 860;
    if (art) {
      if (band) x.drawImage(band, 0, H - band.height);
    } else {
      const sw = 170,
        sx = ar ? W - sw : 0;
      if (strip) x.drawImage(strip, sx, 0);
      x.fillStyle = "rgba(3,81,87,.47)";
      x.fillRect(ar ? W - sw - 15 : sw + 13, 0, 2, H);
      cx = ar ? (W - sw) / 2 : sw + (W - sw) / 2;
      mw = 760;
    }
    const Y = art
      ? {
          lh: 280,
          ly: 95,
          label: 490,
          name: 605,
          line: 660,
          phrase: 735,
          event: 805,
          date: 868,
          r1: 925,
          serial: 1000,
          r2: 1030,
          qr: 1075,
          rule: 1500,
          sm: 1530,
          brand: 1565,
          url: 1605,
        }
      : {
          lh: 300,
          ly: 110,
          label: 520,
          name: 640,
          line: 695,
          phrase: 770,
          event: 845,
          date: 910,
          r1: 975,
          serial: 1052,
          r2: 1084,
          qr: 1130,
          rule: 1560,
          sm: 1590,
          brand: 1625,
          url: 1665,
        };
    if (lg) {
      const w = (Y.lh * lg.width) / lg.height;
      x.drawImage(lg, cx - w / 2, Y.ly, w, Y.lh);
    }
    x.textAlign = "center";
    const t = (s, y, sz, col, w, rtl = ar, xx = cx, maxw = mw) => {
      x.direction = rtl ? "rtl" : "ltr";
      x.fillStyle = col;
      let f = sz;
      do {
        x.font = w + " " + f + "px Almarai";
        f -= 2;
      } while (x.measureText(s).width > maxw && f > 16);
      x.fillText(s, xx, y);
    };
    const hl = (y, half, a) => {
      x.fillStyle = "rgba(3,81,87," + a + ")";
      x.fillRect(cx - half, y, half * 2, 2);
    };
    const qr = (data, qx, y, size) => {
      const q = qrcode(0, "M");
      q.addData(data);
      q.make();
      const n = q.getModuleCount(),
        s = Math.max(1, Math.floor(size / n)),
        S = s * n,
        ox = Math.round(qx - S / 2);
      x.fillStyle = "#035157";
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) if (q.isDark(i, j)) x.fillRect(ox + j * s, y + i * s, s, s);
      return S;
    };
    const d = new Date(c.event_date + "T00:00:00").toLocaleDateString(
      ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB",
      { year: "numeric", month: "long", day: "numeric" },
    );
    t(
      art ? (ar ? "فنان مشارك" : "PARTICIPATING ARTIST") : ar ? "ضيف المعرض" : "EXHIBITION GUEST",
      Y.label,
      art ? 58 : 56,
      "#035157",
      700,
    );
    t(c.name, Y.name, 92, "#035157", 800);
    hl(Y.line, 260, 0.55);
    t(
      art ? (ar ? "أشارك بأعمالي في" : "EXHIBITING AT") : ar ? "سأكون في" : "I'LL BE AT",
      Y.phrase,
      30,
      "#2f7f85",
      300,
    );
    t(ar ? c.name_ar : c.name_en, Y.event, 50, "#035157", 700);
    t(d, Y.date, 30, "#2f7f85", 300);
    hl(Y.r1, 230, 0.6);
    t("No. " + pad(c), Y.serial, 58, "#035157", 800, false);
    hl(Y.r2, 230, 0.6);
    const S = qr(c.ticket, cx, Y.qr, 290);
    t(
      ar ? "امسح هذا الرمز عند البوابة" : "SCAN THIS CODE AT THE GATE",
      Y.qr + S + 54,
      28,
      "#035157",
      700,
    );
    x.fillStyle = "rgba(3,81,87,.35)";
    x.fillRect(cx - 300, Y.rule, 600, 1);
    const xs = ar ? [cx + 330, cx - 330] : [cx - 330, cx + 330],
      it = [
        [ar ? "المنصة" : "Platform", "https://artmarks.net"],
        [ar ? "الجاليري" : "Gallery", "https://artmarksgallary.shop"],
      ];
    it.forEach((v, i) => {
      qr(v[1], xs[i], Y.sm, 96);
      t(v[0], Y.sm + 96 + 34, 24, "#035157", 700, ar, xs[i], 200);
    });
    t("بصمات فن | ArtMarks", Y.brand, 34, "#035157", 700, true, cx, 440);
    t("https://artmarks.net", Y.url, 24, "#2f7f85", 300, false, cx, 440);
  }
  const blob = (cv) => new Promise((r) => cv.toBlob(r, "image/png"));
  const fname = (c) => "ArtMarks-" + pad(c) + ".png";
  async function share(cv, c, lang) {
    const b = await blob(cv),
      f = new File([b], fname(c), { type: "image/png" }),
      ar = lang === "ar";
    const text =
      (c.type === "artist"
        ? ar
          ? "أشارك بأعمالي في "
          : "I am exhibiting at "
        : ar
          ? "سأكون في "
          : "I'll be at ") +
      (ar ? c.name_ar : c.name_en) +
      " https://artmarks.net";
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({ files: [f], text });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "abort";
      }
    }
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
    return "wa";
  }
  async function download(cv, c) {
    const b = await blob(cv),
      a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fname(c);
    a.click();
  }
  const mailCard = (cv, c) =>
    api("card_mail", { ticket: c.ticket, image: cv.toDataURL("image/png") });
  const okName = (n) =>
    /^[\p{L}\p{M}'.\-]+( [\p{L}\p{M}'.\-]+)+$/u.test(n) &&
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
  const okMail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && !BAD.includes(e.split("@")[1]);
  const clean = {
    name: (v) => v.trim().replace(/\s+/g, " "),
    phone: (v) => v.replace(/[\s-]/g, "").replace(/^00/, "+"),
    email: (v) => v.trim().toLowerCase(),
  };
  return { api, pad, drawCard, share, download, mailCard, okName, okPhone, okMail, clean };
})();
