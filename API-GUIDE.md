# API পরিকল্পনা — পরবর্তী ধাপ

বর্তমানে কোনো key লাগবে না। UI ও স্থানীয় workflows আগে তৈরি করা হয়েছে।

## AI এজেন্টের জন্য

শুরুতে **একটি AI provider** যথেষ্ট। আলাদা আলাদা agent-এর জন্য আলাদা কোম্পানির API কিনতে হবে না।

| কাজ | API / পদ্ধতি |
| --- | --- |
| Quiz generation | OpenAI Responses API অথবা Anthropic Claude Messages API |
| Homework grading suggestion | একই provider; প্রশ্ন, rubric ও শিক্ষার্থীর উত্তর দিয়ে structured response |
| Image-based answer review | image-capable model; পরীক্ষামূলক accuracy যাচাই জরুরি |
| Weak-topic suggestions | একই provider + অনুমোদিত exam/quiz history; ছোট dataset হলে local calculations যথেষ্ট |
| Guardian question reply | একই provider বা simple intent rules + verified guardian/student mapping |
| Voice transcription | শুধু audio-to-text চাইলে আলাদা transcription endpoint; voice record/send করতে AI লাগে না |

এই use-case mapping অ্যাপের জন্য প্রস্তাবিত নকশা। চূড়ান্ত marks শিক্ষক যাচাই করে publish করবেন। Provider responses সরাসরি grades বা outgoing messages-এ লিখবে না।

OpenAI text/image input, text/JSON output এবং custom tool calls সমর্থন করে: [OpenAI API Reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)।
Claude-এর programmatic model access, Messages API এবং API credentials সম্পর্কে: [Claude API overview](https://platform.claude.com/docs/en/api/overview)।

## অভিভাবককে WhatsApp

**Meta WhatsApp Cloud API**। Message sending এবং inbound webhook যুক্ত হবে। ব্যবসার WhatsApp account ও number configuration লাগবে। [Meta-এর official API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)।

বিকল্প provider নিলে তার মধ্যস্থতার মূল্য ও সীমা integration-এর সময় তুলনা করুন। এখন কোনো account/key তৈরি করা হয়নি।

## অন্য সংযোগ

- Database/Auth/Storage: আপনার পছন্দ অনুযায়ী Supabase integration পরের ধাপ।
- Hosting: আপনার পছন্দ অনুযায়ী Vercel deployment পরের ধাপ।
- Git/GitHub: source history ও repository; coaching/AI feature চালানোর API নয়।
- Email/SMS: account invitation ও password recovery স্বয়ংক্রিয় করতে পরে provider নির্বাচন।
- Payment gateway: online payment চাইলে পরে সংযোগ। বর্তমান Cash/bKash/Nagad manual ledger-এর জন্য gateway API লাগে না।
- Web notifications: server-backed push delivery পরে; এখন app-এর ভেতর notification list।

## Integration sequence

1. বর্তমান local behavior রেখে records ও files-এর server repository adapter যোগ করুন।
2. Admin/teacher/student authorization server-এ enforce করুন; public signup বন্ধ রাখুন।
3. প্রতিটি related record-এ teacher ownership ও student enrollment যাচাই করুন।
4. Local session/demo access production build থেকে সরিয়ে managed authentication দিন।
5. File access-এ tenant-specific private paths এবং signed access দিন।
6. AI routes-এ reviewable structured outputs, per-teacher quotas ও usage logs যোগ করুন।
7. WhatsApp webhook signature, verified guardian mapping, deduplication ও retry queue দিন।
8. Background reminders, subscription expiry job এবং scheduled result notifications server-এ স্থানান্তর করুন।
9. শেষে Vercel ও GitHub সংযোগ করুন।

## Agent contract

dist/integrations.js-এ চারটি আলাদা task contract আছে:

- generateQuiz
- suggestGrade
- learningInsights
- guardianReply

runAgent() ও sendGuardianMessage() ইচ্ছাকৃতভাবে IntegrationNotConfiguredError দেয়। কোনো fake success response নেই। AI/provider secret কখনো static JS, browser localStorage বা public environment variable-এ রাখবেন না।

তালিকাটি ১৫ সেপ্টেম্বর ২০২৬-এ official documentation দেখে প্রস্তুত; pricing বা free-tier entitlement ধরে কোনো implementation করা হয়নি।
