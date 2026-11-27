(function () {
  const $ = (i) => document.getElementById(i),
    ART = document.body.dataset.type === "artist",
    TYPE = ART ? "artist" : "guest",
    A = AM;
  const T = {
    ar: {
      titleG: "تسجيل الزوار",
      titleA: "تسجيل الفنانين المشاركين",
      name: "الاسم الكامل",
      phone: "رقم الجوال",
      email: "البريد الإلكتروني",
      acode: "رمز الفنانين",
      send: "احصل على بطاقة الدخول",
      code: "الرمز المرسل إلى بريدك",
      verify: "تأكيد وإصدار البطاقة",
      dl: "حفظ البطاقة",
      share: "مشاركة / واتساب",
      mail: "إرسال نسخة إلى بريدي",
      mailed: "أُرسلت نسخة من البطاقة إلى بريدك",
      again: "تسجيل زائر آخر",
      hint: "على الآيفون: اختر «حفظ الصورة» من قائمة المشاركة.",
      eN: "اكتب اسمك الحقيقي (اسمان على الأقل)",
      eP: "رقم الجوال غير صحيح",
      eM: "البريد الإلكتروني غير صحيح",
      eC: "الرمز غير صحيح أو منتهي",
      eE: "التسجيل مغلق حالياً",
      eX: "تعذّر الإرسال، حاول بعد قليل",
      eR: "محاولات كثيرة لهذا البريد، حاول بعد ساعة",
      eB: "النظام مشغول، حاول بعد دقيقة",
      eQ: "تعذّر الإرسال حالياً، راجع فريق التنظيم",
      eA: "رمز الفنانين غير صحيح",
      sent: "أرسلنا رمز التحقق إلى ",
    },
    en: {
      titleG: "Visitor registration",
      titleA: "Participating artists registration",
      name: "Full name",
      phone: "Mobile number",
      email: "Email",
      acode: "Artists code",
      send: "Get your entry pass",
      code: "Code sent to your email",
      verify: "Verify and get my pass",
      dl: "Save pass",
      share: "Share / WhatsApp",
      mail: "Email me a copy",
      mailed: "A copy was sent to your email",
      again: "Register another visitor",
      hint: "On iPhone: choose “Save Image” from the share sheet.",
      eN: "Enter your real name (at least two words)",
      eP: "Invalid mobile number",
      eM: "Invalid email address",
      eC: "Wrong or expired code",
      eE: "Registration is closed",
      eX: "Could not send. Please try again",
      eR: "Too many attempts for this email. Try again in an hour",
      eB: "System busy. Try again in a minute",
      eQ: "Cannot send right now. Please ask the staff",
      eA: "Invalid artists code",
      sent: "We sent a verification code to ",
    },
  };
  let L = "ar",
    ev = null,
    last = null,
    nm,
    ph,
    em;
  function ui() {
    document.documentElement.lang = L;
    document.documentElement.dir = L == "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i]").forEach((e) => (e.textContent = T[L][e.dataset.i]));
    $("ttl").textContent = T[L][ART ? "titleA" : "titleG"];
    $("lang").textContent = L == "ar" ? "EN" : "عربي";
    if (ev) $("evn").textContent = L == "ar" ? ev.name_ar : ev.name_en;
    if (last) A.drawCard($("cv"), last, L);
  }
  $("lang").onclick = () => {
    L = L == "ar" ? "en" : "ar";
    ui();
  };
  const MAP = { closed: "eE", bad: "eN", acode: "eA", rate: "eR", busy: "eB", quota: "eQ" };
  $("go").onclick = async () => {
    nm = A.clean.name($("nm").value);
    ph = A.clean.phone($("ph").value);
    em = A.clean.email($("em").value);
    const e = $("e1");
    e.textContent = "";
    if (!ev) return (e.textContent = T[L].eE);
    if (!A.okName(nm)) return (e.textContent = T[L].eN);
    if (!A.okPhone(ph)) return (e.textContent = T[L].eP);
    if (!A.okMail(em)) return (e.textContent = T[L].eM);
    if (ART && !$("ac").value.trim()) return (e.textContent = T[L].eA);
    $("go").disabled = true;
    const r = await A.api("send_code", {
      name: nm,
      phone: ph,
      email: em,
      lang: L,
      type: TYPE,
      acode: ART ? $("ac").value : "",
    });
    $("go").disabled = false;
    if (!r.ok) return (e.textContent = T[L][MAP[r.err] || "eX"]);
    $("sent").textContent = T[L].sent + em;
    $("s1").classList.add("hide");
    $("s2").classList.remove("hide");
  };
  $("vf").onclick = async () => {
    const e = $("e2");
    e.textContent = "";
    $("vf").disabled = true;
    const r = await A.api("verify", { email: em, code: $("code").value });
    $("vf").disabled = false;
    if (!r.ok)
      return (e.textContent = T[L][r.err == "closed" ? "eE" : r.err == "code" ? "eC" : "eX"]);
    last = r.card;
    await A.drawCard($("cv"), last, L);
    $("s2").classList.add("hide");
    $("s3").classList.remove("hide");
  };
  $("dl").onclick = () => A.download($("cv"), last);
  $("sh").onclick = () => A.share($("cv"), last, L);
  $("ml").onclick = async () => {
    $("ml").disabled = true;
    const r = await A.mailCard($("cv"), last);
    if (r.ok) {
      $("mm").textContent = T[L].mailed;
      $("ml").classList.add("hide");
    } else {
      $("ml").disabled = false;
      $("mm").textContent = "";
      $("e3").textContent = T[L][r.err == "quota" ? "eQ" : r.err == "busy" ? "eB" : "eX"];
    }
  };
  $("nw").onclick = () => {
    last = null;
    ["nm", "ph", "em", "code", "ac"].forEach((i) => $(i) && ($(i).value = ""));
    $("mm").textContent = "";
    $("e3").textContent = "";
    $("ml").classList.remove("hide");
    $("ml").disabled = false;
    $("s3").classList.add("hide");
    $("s1").classList.remove("hide");
  };
  (async () => {
    ui();
    if (/demo/.test(location.search)) {
      last = {
        name: ART ? "محمد أحمد العتيبي" : "سارة عبدالله الحربي",
        serial: ART ? 12 : 127,
        type: TYPE,
        ticket: "3f2b8c1e-5a7d-4c9e-9b1a-0d6e4f2a7c38",
        name_ar: "معرض بصمات فن 2026 – النسخة 19",
        name_en: "ArtMarks Exhibition 2026 – 19th Edition",
        event_date: "2026-12-01",
      };
      A.drawCard($("cv"), last, L);
      $("s1").classList.add("hide");
      $("s3").classList.remove("hide");
      return;
    }
    const r = await A.api("event");
    ev = r.ok ? r.ev : null;
    ui();
    if (!ev) $("e1").textContent = T[L].eE;
  })();
})();
