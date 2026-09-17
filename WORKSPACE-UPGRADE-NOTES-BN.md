# Science Lab — dashboard update

## ব্যবহার
- Super Admin → Teachers → View as teacher: server-enforced read-only preview; Exit view দিয়ে ফিরে আসবে। নতুন শিক্ষক প্রথম login না করলেও preview চলবে।
- Dashboard / Teachers → AI usage & limits: দৈনিক request, মাসিক tracked request, provider-reported token, feature breakdown, remaining request ও reset date।
- Teachers → Edit limits: দৈনিক 0–500, মাসিক 0–15,000; মাসিক ঘর ফাঁকা হলে আলাদা monthly cap নেই। Platform-এর দৈনিক cap-ও প্রযোজ্য।
- 80% / 90% পৌঁছালে usage panel ও notification bell-এর তালিকায় সতর্কতা।
- Settings → Edit profile & photos: কোচিং পরিচিতি, বিষয়, bio, logo/cover/profile image; student নিজের bio/interests/photo বদলাতে পারে।
- Students: profile/guardian cards, batch tabs, name/class/batch search, guardian CSV এবং Print / Save as PDF।
- Teacher profile settings: নিজের published exam results-এর leaderboard on/off।
- Dashboard: quick actions, আজকের recorded attendance এবং AI assistant shortcut।
- API connections → Check connections: শুধু Super Admin; live credential/model ও sender-domain checks। কোনো message পাঠায় না।

## হিসাবের নিয়ম
Request limit এবং provider token usage আলাদা। Provider balance/বাকি free credit অ্যাপ জানে না এবং দেখায় না।
Failed বা outcome-unknown request-ও limit-এ গণনা হয়। Provider token সংখ্যা না দিলে unknown হিসেবে থাকে।
পুরোনো মাসিক/token ব্যবহার আগে সংরক্ষিত ছিল না; সেই হিসাব বানানো হয়নি। Tracking শুরুর তারিখ দেখানো হয়।
মাস ও দিন UTC boundary-তে reset; UI reset সময় local timezone-এ দেখায়। Monthly tracking প্রতি account; student-এর cap তার teacher-এর configured cap থেকে আসে।
Monthly ledger সাম্প্রতিক প্রায় চার মাস পর্যন্ত থাকে; আগের history স্বয়ংক্রিয়ভাবে সংরক্ষণের দাবি করা হচ্ছে না।
Concurrent request reserve ও result merge version-check দিয়ে হয়। Result write ব্যর্থ/অজানা হলে token usage unknown থাকে।

## যাচাই
- 53 automated tests: quota, zero limit, privacy, read-only access, SQL, role boundaries এবং password-change reauthentication।
- 390px mobile viewport: horizontal overflow নেই; demo usage স্পষ্টভাবে unavailable।
- Production: owner session, শিক্ষক ও শিক্ষার্থীর password login/change, teacher identity → student, student profile edit, attendance save/read, private API denial, read-only preview এবং actual AI response যাচাই করা হয়েছে।
- প্রথম live AI test: 389 provider-reported tokens; monthly cap ও zero daily cap enforced।
- Disposable test accounts পরীক্ষা শেষে সরানো হয়েছে। Owner password বদলানো হয়নি।
- Email delivery ব্যবহারকারীর অনুরোধে আপাতত disabled; নিজের verified sender domain হলে চালু হবে।
- Firebase credential verification-এর সর্বশেষ ফল আলাদা করে জানানো হবে; বাস্তব device push delivery এই পরীক্ষায় পাঠানো হয়নি।
- WhatsApp incoming guardian replies/webhook নতুন করে যোগ করা হয়নি। Existing outbound template integration পরে configure করতে হবে।
- নতুন SQL migration দরকার নেই; existing profile/workspace JSON fields ব্যবহার করা হয়েছে।
