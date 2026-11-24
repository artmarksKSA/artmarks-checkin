# نظام تسجيل الزوار – بصمات فن (قاعدة البيانات في Google Drive)

الملفات: `index.html` (التسجيل) · `gate.html` (البوابة) · `admin.html` (لوحة الإدارة) · `style.css` · `config.js` · `logo.png` · `pat.png` · `backend/Code.gs`

## 1) قاعدة البيانات (Google Sheet في درايفك)
1. drive.google.com ← جديد ← Google Sheets (سمّيه مثلاً: زوار بصمات فن).
2. الإضافات (Extensions) ← Apps Script. احذفي الكود الموجود والصقي محتوى `backend/Code.gs` ← احفظي.
3. اختاري الدالة `setup` من القائمة العلوية ← Run. اسمحي بالصلاحيات (Advanced ← Go to project ← Allow).
4. افتحي Execution log وانسخي **كلمة مرور الإدارة** و**رمز البوابة** الظاهرين.

## 2) النشر
Deploy ← New deployment ← النوع Web app ← Execute as: **Me** ← Who has access: **Anyone** ← Deploy. انسخي الرابط (ينتهي بـ `/exec`) وضعيه في `config.js`.

## 3) GitHub Pages
ارفعي كل الملفات دفعة واحدة ← Settings ← Pages ← main.
- `…/index.html` للزوار · `…/gate.html` للبوابة (رمز البوابة) · `…/admin.html` للإدارة (كلمة مرور الإدارة).

## 4) المعرض
من `admin.html` ← معرض جديد ← الاسمان والتاريخ ← حفظ وتفعيل. الأرقام التسلسلية تبدأ من 1 لكل معرض.

## 5) سعة الإيميل
الحساب المجاني على Gmail: نحو 100 رسالة يومياً. حساب Google Workspace: نحو 1500. لرفع السعة مجاناً إلى نحو 300 فعّلي Brevo: أضيفي في Project Settings ← Script properties الخصائص `BREVO_KEY` و`SENDER_EMAIL` و`SENDER_NAME`.

## 6) بعد أي تعديل على Code.gs
Deploy ← Manage deployments ← Edit ← Version: New version ← Deploy (الرابط لا يتغير).
