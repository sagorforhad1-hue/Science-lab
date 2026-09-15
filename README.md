# Science Lab — Coaching workspace

বাংলা ও ইংরেজিতে কোচিং পরিচালনার স্থানীয় অ্যাপ। ডেটা একই ব্রাউজারে সংরক্ষিত থাকে।

## চালু করুন

এই ফোল্ডারে terminal খুলে:

    node server.mjs

তারপর http://127.0.0.1:5173 খুলুন। কোনো npm installation বা API key লাগবে না।

Windows-এ Start-Science-Lab.cmd-ও চালাতে পারেন। একই ঠিকানা এবং একই browser profile ব্যবহার করুন; অন্য ব্রাউজারে আলাদা স্থানীয় ডেটা থাকবে।

## শুরু করার সহজ পথ

1. প্রথমবার শিক্ষক ড্যাশবোর্ড ও নমুনা তথ্য দেখাবে।
2. উপরের বাংলা / EN বাটন দিয়ে ভাষা বদলান।
3. **Switch workspace** থেকে Teacher, Student, Super Admin ডেমো ভিউ দেখুন।
4. **Super Admin → Teachers → Create teacher** থেকে স্থানীয় শিক্ষক অ্যাকাউন্ট বানান।
5. **Teacher → Students → Add student** থেকে শিক্ষার্থী অ্যাকাউন্ট বানান।
6. অস্থায়ী লগইন তথ্য তৈরির পর নিজে সংশ্লিষ্ট ব্যক্তিকে দিন। প্রথম লগইনে পাসওয়ার্ড পরিবর্তন করতে হবে।
7. **Settings → Data & backup → Export backup** দিয়ে রেকর্ড ও সংযুক্ত ফাইল সংরক্ষণ করুন।
8. রসিদ ও রিপোর্ট কার্ডের **Print report** থেকে browser-এর Save as PDF ব্যবহার করুন।

## এই সংস্করণে কাজ করে

- আলাদা শিক্ষক, শিক্ষার্থী, প্ল্যাটফর্ম অ্যাডমিন ভিউ; প্রকাশ্য signup নেই।
- শিক্ষার্থী যোগ/সম্পাদনা/আর্কাইভ; একাধিক ব্যাচে ভর্তি; অভিভাবক নম্বর বাধ্যতামূলক।
- ব্যাচ যোগ/সম্পাদনা/আর্কাইভ; আসন ও account quota যাচাই।
- তারিখ/ব্যাচভিত্তিক Present, Absent, Late; সবাইকে উপস্থিত; সংশোধনের audit log।
- হাজিরার ইতিহাস, তারিখের পরিসর, CSV, print report ও শিক্ষার্থীর মাসিক calendar।
- হোমওয়ার্ক draft/publish, deadline, late submission, text/file/camera attachment।
- শিক্ষার্থীর submission/resubmission; শিক্ষকের নম্বর, মতামত, ফেরত পাঠানো; CSV/ZIP export।
- বিষয় ও অধ্যায়সহ পাঠ্য উপকরণ, ফাইল ও ভিডিও লিংক; PDF/image/audio/video preview।
- পরীক্ষা, marks entry, configurable grade thresholds, publish, ranking, printable report card।
- MCQ authoring, 4 options, answer key, schedule, randomized order, countdown, scoring, review।
- কুইজ চলাকালে answer ও timer deadline locally save থাকে; refresh করে আবার Start quiz করলে resume।
- সাপ্তাহিক রুটিন; একই শিক্ষকের overlapping class রোধ।
- নোটিশ, pin, expiry, batch targeting, platform announcements।
- শিক্ষক–শিক্ষার্থী local chat, file/audio/video, ১৫ মিনিটের মধ্যে নিজের মেসেজ edit/delete।
- মাইক্রোফোন অনুমতি দিলে voice recording করে chat/review-তে attach।
- Calendar month/week/list, exam/deadline/routine এবং custom events।
- ফি, আংশিক পেমেন্ট, Cash/bKash/Nagad manual entry, বকেয়া, receipt, CSV।
- Attendance/marks progress chart এবং শিক্ষার্থীর summary।
- Admin teacher CRUD, suspension, support view, plans, billing, feature flags ও quotas।
- মেয়াদ শেষের পর grace period অনুযায়ী app খোলার সময় local subscription suspension।
- Guardian notification previews ও summary queue; কোনো automatic message পাঠানো হয় না।
- AI Studio-তে স্পষ্টভাবে চিহ্নিত sample/rule-based previews।
- বাংলা/ইংরেজি, dark/light, reduced motion, notification preferences, password change।
- Teacher-scoped অথবা platform backup, attachments-সহ import/export।
- Keyboard focus, native accessible dialogs, mobile navigation, reduced-motion support।

## বর্তমান সীমা / পরবর্তী integration phase

এটি কার্যকর **local demo**, production SaaS নয়। Local role checks UI যাচাইয়ের জন্য; browser owner developer tools দিয়ে স্থানীয় records দেখতে/পরিবর্তন করতে পারেন। বাস্তব শিক্ষার্থীর ডেটা দিয়ে প্রকাশের আগে server authentication, database row-level authorization, storage permissions এবং server-side validation যোগ করতে হবে।

- Vercel, Supabase, Git/GitHub, payment gateway, WhatsApp, email, SMS ও AI provider সংযুক্ত করা হয়নি।
- Multi-device sync এবং real-time network chat পরে backend-এর মাধ্যমে চালু হবে।
- WhatsApp queue ও AI Studio আসল external execution নয়।
- Background jobs এবং scheduled notifications browser বন্ধ থাকা অবস্থায় চলে না।
- PDF তৈরি করতে browser print ব্যবহার করা হয়; unattended PDF generation পরে server-এ যোগ করা যাবে।
- Office files download হয়; in-browser Word/PowerPoint editing নেই।
- Rich-text editing-এর বদলে সহজ plain text ব্যবহার করা হয়েছে। Batch group chat, bulk CSV import, individual notice targeting এবং latest published result per subject দিয়ে combined report যুক্ত আছে।
- Camera/microphone ও ফাইল preview browser/device support এবং user permission-এর ওপর নির্ভরশীল।
- Fonts online থাকলে Google Fonts থেকে আসে, offline হলে system font ব্যবহার হয়।

## Developer notes

- dist/ : সরাসরি পরিবেশনযোগ্য সম্পূর্ণ static app।
- src/core.js : shell, navigation, dashboard, scope helpers।
- src/features.js : local module workflows, form validation, quiz, backup, UI event handlers।
- dist/data.js : normalized local records, sample dataset, domain calculations।
- dist/storage.js : IndexedDB file storage এবং local password hashing।
- dist/zip.js : dependency-free submission ZIP packaging।
- dist/integrations.js : future AI/messaging contracts; external calls currently fail explicitly।
- build.mjs : core ও features একসাথে dist/app.js-এ তৈরি করে।
- server.mjs : 127.0.0.1:5173-এ static file server; directory traversal প্রতিরোধ করে।
- tests/domain.test.mjs : domain rules, role scoping, route rendering ও integration-boundary tests।

Source পরিবর্তনের পর:

    node build.mjs
    node --test tests/domain.test.mjs

এবং browser reload করুন।

## Validation performed

১৫টি automated test সফল: fees, grading, escaping, সব অনুমোদিত route দুই ভাষায় render, student/teacher scopes, invalid form records, scoped backup, ZIP format, disconnected integration behavior, expiry/grace handling।

Browser-এ teacher/admin module navigation, উপস্থিতি save/reload, quiz authoring question addition, student quiz timer/3-of-3 scoring, language toggle এবং 390px mobile layout পরীক্ষা করা হয়েছে। Voice capture ও external services পরীক্ষা করা হয়নি; সেগুলোর জন্য যথাক্রমে device permission ও future API integration লাগবে।

AI/API পরিকল্পনা: API-GUIDE.md।
