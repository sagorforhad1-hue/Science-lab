# API setup and usage — Science Lab

## কী যোগ হয়েছে
- Groq দিয়ে quiz, grading draft, learning insights, guardian summary এবং study tutor।
- Super Admin-এর operations, billing summary, announcement ও support assistant।
- Resend email, Firebase web push, ভবিষ্যতের WhatsApp template delivery।
- Google Meet / Zoom link দিয়ে ব্যাচভিত্তিক online class schedule ও Join class।
- Platform-wide service switches, প্রতি শিক্ষক module/AI-tool switches, দৈনিক limits।
- Super Admin আলাদা শিক্ষার্থীর AI permission-ও বন্ধ/চালু করতে পারেন।
- Demo-তে বাস্তব provider ব্যবহার হয় না। Real login দরকার।
- এই পরিবর্তনের জন্য নতুন SQL লাগবে না; আগের sl_profiles ও sl_workspaces ব্যবহার হয়।

## Vercel-এ কোথায় বসাবে
https://vercel.com/forhad1/sciencelab/settings/environment-variables

Add Environment Variable → Name/Value → Production → Save।
স্থানীয় .env.local-এর মান নিজে বসাবে; এই ফাইল GitHub বা deployment-এ যায় না।
পরিবর্তনের পরে নতুন deployment দরকার।

### Groq
- GROQ_API_KEY — Sensitive
- GROQ_MODEL — optional; default openai/gpt-oss-20b।
এই account-এর available model endpoint থেকে default যাচাই করা হয়েছে।
AI prompt-এর সঙ্গে স্বয়ংক্রিয়ভাবে কেবল aggregate counts/marks/billing summary যায়; contacts/password যায় না।
AI output খসড়া; নিজে review করে ব্যবহার করতে হবে। AI নিজে marks, roles, messages পরিবর্তন করে না।
Provider free-tier quota শেষ হলে app rate-limit error দেখায়; unlimited free নয়।

### Resend
- RESEND_API_KEY — Sensitive
- RESEND_FROM_EMAIL — verified domain-এর sender, যেমন Science Lab <notices@yourdomain.com>

Resend → Domains → Add domain → নির্দেশিত DNS records যোগ → Verified হওয়া পর্যন্ত অপেক্ষা।
শুধু key থাকলে arbitrary sender থেকে email পাঠানো যায় না।
onboarding@resend.dev পরীক্ষার sender হলে recipient সীমাবদ্ধতা থাকে।
Super Admin: API connections; Teacher: Guardians → recipient → Email → subject/message → Send message।
Super Admin teachers-কে, teacher নিজের students-কে পাঠাতে পারেন।

Forgot password-এর email আলাদা: Supabase Authentication-এর SMTP configuration ব্যবহার করে।
Supabase → Authentication → Email/SMTP Settings-এ custom SMTP configure করতে হবে।
Resend SMTP: https://resend.com/docs/send-with-supabase-smtp
শুধু RESEND_API_KEY environment variable বসালে Supabase-এর SMTP নিজে configure হয় না।

### Firebase web push
Vercel environment names:
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_PROJECT_ID
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID
- FIREBASE_VAPID_KEY
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY — Sensitive; বাইরের double quote ছাড়া, literal \n রাখতে পারো।

Firebase → Project settings → Cloud Messaging → Web Push certificates থেকে VAPID public key।
Service accounts থেকে matching Firebase service account email/private key।
Firebase Cloud Messaging API enabled থাকতে হবে।

প্রাপক real account-এ Settings → Device notifications → Enable push notifications চাপবেন এবং browser permission দেবেন।
প্রতি account-এর সর্বশেষ নিবন্ধিত browser-এ notification যাবে।
HTTPS ও supported browser দরকার; device permission বন্ধ থাকলে delivery সম্ভব নয়।
Foreground এবং background notification handling যুক্ত আছে।
Delivery status “Accepted by provider” মানে provider গ্রহণ করেছে; ডিভাইসে পৌঁছেছে এমন নিশ্চয়তা নয়।

### WhatsApp — পরে credentials যোগ করবে
বর্তমানে platform default OFF।
- WHATSAPP_ACCESS_TOKEN — Sensitive
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_GRAPH_VERSION — তোমার Meta app-এ supported version, যেমন vXX.X
- WHATSAPP_TEMPLATE_NAME
- WHATSAPP_TEMPLATE_LANGUAGE

Meta Cloud API-তে approved template থাকতে হবে যার body-তে একটি text parameter {{1}} আছে।
Guardian number international format-এ দাও। Guardian consent নিশ্চিত করে UI থেকে পাঠাবে।
এরপর Super Admin → API connections → WhatsApp ON এবং Teachers → Features → WhatsApp ON।
এই সংস্করণ outbound template send প্রস্তুত রাখে। Incoming bot, webhook delivery receipts ও automatic replies অন্তর্ভুক্ত নয়।
WhatsApp template delivery-তে Meta charge করতে পারে; এটি free হিসেবে প্রতিশ্রুত নয়।

## Online class
Teacher → Online classes → Schedule class → Open Google Meet → meeting link তৈরি → app-এ link/date/time/batch সংরক্ষণ।
Student কেবল নিজের batch-এর class link দেখবে। Zoom link-ও সংরক্ষণ করা যায়।
Meet account creation/hosting provider-এর নিজস্ব পেজে হবে; app স্বয়ংক্রিয় meeting creation বা recording দাবি করে না।
Personal free Google Meet: সর্বোচ্চ 100 জন; 3+ participants হলে 60 মিনিট।
https://support.google.com/meet/answer/13396001?hl=en

## Super Admin controls
- API connections: global AI/email/push/WhatsApp/online switches ও দৈনিক request limits।
- Teachers → Features: classroom modules, প্রতিটি AI tool, student tutor, channels, online classes এবং teacher AI limit।
- API connections → Student AI access: নির্দিষ্ট শিক্ষার্থীর AI বন্ধ/চালু।
- ছাত্রের tutor চালাতে global AI, শিক্ষক AI + Student study tutor, tutor tool এবং student permission—সব চালু থাকতে হবে।
- AI limit প্রতি account/day (UTC); teacher limit এবং platform limit-এর ছোটটি প্রযোজ্য।
- Message limit প্রতি workspace/day (UTC)। ব্যর্থ provider request-ও quota ব্যবহার করে।
- Sender history “Processing” হলে ফল নিশ্চিত না হওয়া পর্যন্ত পুনরায় পাঠাবে না।
- API key values কখনো app-এ দেখানো হয় না; শুধু missing variable names দেখায়।

## যাচাই
Automated tests cover role isolation, tool permissions, daily limits, sender ownership, meeting link validation, escaped output and provider request formats.
Live Groq generation and Firebase OAuth credentials were tested locally without student data or sending messages.
Real end-to-end email/push delivery requires a verified sender/recipient device and an explicit send from the owner.

API connections পাতা ও integration-status endpoint শুধু Super Admin-এর জন্য। Teachers/Students-এর device push setup Settings-এ; অনুমতিপ্রাপ্ত teacher delivery Guardians-এ।
