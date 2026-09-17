# Science Lab — Coaching workspace

বাংলা/ইংরেজি coaching app with Supabase login, private cloud data, separate demo and a science-lab theme.

## Local development
```powershell
npm ci
npm run build
npm start
```
Open http://127.0.0.1:5173. Server credentials go in ignored .env.local. Copy variable names from .env.example.

## Account setup
1. Run supabase/setup.sql in Supabase SQL Editor.
2. Create your own Auth user in Supabase → Authentication → Users.
3. Edit the owner email in supabase/create-superadmin.sql and run it.
4. Log in. Only this Super Admin creates teachers; teachers create their own students.
5. New teacher/student credentials require a password change at first login.

There is no public sign-up UI. Profiles are provisioned through the authenticated server.
The database allows only one Super Admin. Browser clients cannot read/write business tables directly.
Demo accounts use local sample data and do not access real APIs or accounts.

## Connected services
See [API-SETUP-BN.md](API-SETUP-BN.md) for environment variables, controls, limitations and setup.
- Groq AI assistants for teachers, permitted students and the Super Admin.
- Resend email and Firebase web push through authenticated server adapters.
- WhatsApp Cloud API outbound template adapter, OFF until configured.
- Google Meet/Zoom scheduled class links, restricted by enrollment.
- Global and per-teacher feature/AI switches, individual student AI access, usage limits.

## Coaching features
Students, batches, attendance, homework/submissions, teaching materials, exams/marks,
MCQ quizzes with server-side scoring, routine, notices, chat, calendar, manual fees/receipts,
analytics, teacher plans, billing, settings and data export.

## Checks
```powershell
npm run build
npm test
npm run check
```

## Deployment
Vercel project: forhad1/sciencelab.
Live URL: https://sciencelab-silk.vercel.app
Build command: npm run build. Output: dist. Framework: Other.
The /api/app Node function handles trusted authentication and provider calls.
.env files are excluded from Git and deployment. Configure Production variables in Vercel.
GitHub push does not apply SQL or copy local environment variables.

## Practical limits
AI output is a reviewable draft and does not change marks, permissions or send messages.
Email needs a verified sender; Supabase password-reset SMTP is configured separately.
Push requires device opt-in; the most recently registered browser per account receives notifications.
Messaging delivery status records provider acceptance, not a confirmed read/delivery receipt.
WhatsApp incoming bot/webhook automation is not included.
Meet/Zoom links launch the provider; automatic meeting creation/recording is not implemented.
Fees and billing are manual records; no payment gateway is connected.
