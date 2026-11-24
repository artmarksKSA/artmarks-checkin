# نظام تسجيل الزوار – بصمات فن

الملفات: `index.html` (التسجيل) · `gate.html` (البوابة) · `style.css` · `config.js` · `setup.sql` · `logo.png` · `pat.png`

## 1) Supabase
1. أنشئي مشروعاً، ثم SQL Editor ← الصقي `setup.sql` ← Run (عدّلي اسم المعرض وتاريخه في آخره قبل التشغيل).
2. Project Settings ← API: انسخي **Project URL** و**anon public key**.

## 2) الإيميل (Brevo)
1. Brevo ← SMTP & API: أنشئي مفتاح SMTP، وفعّلي إيميل المرسل في Senders.
2. Supabase ← Project Settings ← Authentication ← SMTP: فعّلي Custom SMTP (`smtp-relay.brevo.com` – المنفذ `587`).
3. Authentication ← Email Templates ← **Magic Link**: اجعلي النص يحتوي `{{ .Token }}`.
4. Authentication ← Rate Limits: ارفعي حد الرسائل في الساعة.

## 3) GitHub Pages
1. ارفعي الملفات كلها إلى المستودع ← Settings ← Pages ← Deploy from a branch ← main.
2. **بعد الرفع** عدّلي `config.js` مباشرة على GitHub (أيقونة القلم) وضعي الرابط والمفتاح. لا تعيدي رفع `config.js` من جهازك بعدها حتى لا يُستبدل.

## 4) فريق البوابة
Authentication ← Users ← Add user لكل موظف، ثم: `insert into staff values('UUID');`

## 5) معرض جديد
```sql
update events set active=false where active;
insert into events(name_ar,name_en,event_date,active) values('اسم المعرض','Exhibition name','2027-01-01',true);
```
