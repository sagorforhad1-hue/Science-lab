// Deterministic reports from this visitor's sample records. No provider requests.
export function demoReport(db, {tool='insights',prompt='',teacherId=null,studentId=null,language='en'}={}) {
 const bn=language==='bn', say=(en,b)=>bn?b:en;
 const students=db.students.filter(s=>(!teacherId||s.teacherId===teacherId)&&(!studentId||s.id===studentId));
 const ids=new Set(students.map(s=>s.id));
 const attendance=db.attendance.filter(a=>ids.has(a.studentId));
 const marks=db.marks.filter(m=>ids.has(m.studentId));
 const rate=attendance.length?Math.round(attendance.filter(a=>a.status!=='Absent').length/attendance.length*100):null;
 const results=marks.flatMap(m=>{const exam=db.exams.find(e=>e.id===m.examId);const total=Number(exam?.total||exam?.marks);return total>0&&Number.isFinite(Number(m.marks))?[Number(m.marks)/total*100]:[];});
 const header=say('DEMO REPORT · Generated locally from sample records. No live AI or message delivery.','ডেমো রিপোর্ট · নমুনা তথ্য থেকে স্থানীয়ভাবে তৈরি। লাইভ AI বা মেসেজ পাঠানো হয়নি।');
 const overview=[say('Students','শিক্ষার্থী')+': '+students.length,say('Recorded attendance entries','নথিভুক্ত হাজিরা')+': '+attendance.length,say('Attendance (present + late)','হাজিরা (উপস্থিত + দেরি)')+': '+(rate===null?say('No records','তথ্য নেই'):rate+'%'),say('Average exam score','গড় পরীক্ষার ফল')+': '+(results.length?(results.reduce((a,b)=>a+b,0)/results.length).toFixed(1)+'%':say('No valid exam totals','পরীক্ষার পূর্ণমান পাওয়া যায়নি'))];
 const details=students.map(s=>{const rows=attendance.filter(a=>a.studentId===s.id),absent=rows.filter(a=>a.status==='Absent').length;return s.name+': '+say('absent','অনুপস্থিত')+' '+absent+'/'+rows.length;});
 let body;
 if(tool==='quiz') {const q=db.quizzes.find(q=>!teacherId||q.teacherId===teacherId);body=q?.questions?.length?q.questions.map((q,i)=>(i+1)+'. '+q.text+'\n'+q.options.map((o,j)=>String.fromCharCode(65+j)+'. '+o).join('\n')).join('\n\n'):say('Create a sample quiz in Quizzes first.','আগে Quizzes থেকে নমুনা কুইজ তৈরি করো।');}
 else if(tool==='grading')body=say('Grading worksheet: review the answer against the rubric, check reasoning and units, then enter marks in Assignments. This offline demo cannot assess an arbitrary answer.','মূল্যায়ন: rubric অনুযায়ী উত্তর, সমাধানের ধাপ ও একক যাচাই করে Assignments-এ নম্বর দাও। এই offline demo যেকোনো উত্তরের সঠিক মূল্যায়ন করতে পারে না।')+'\n\n'+overview.join('\n');
 else if(tool==='announcement'||tool==='agent-communication')body=say('Notice draft: Please review your latest attendance and exam results. Bring any questions to your next class.','নোটিশের খসড়া: তোমার সর্বশেষ হাজিরা ও পরীক্ষার ফল দেখে নাও। কোনো প্রশ্ন থাকলে পরের ক্লাসে শিক্ষককে জানাও।')+'\n\n'+overview.join('\n');
 else body=overview.join('\n')+'\n\n'+details.join('\n')+'\n\n'+say('Next steps: follow up on absences; review lower scores in Results; create practice work in Assignments. Use Students → Add, Attendance → mark attendance, and AI Studio to regenerate this report after changes.','পরের কাজ: অনুপস্থিত শিক্ষার্থীর খোঁজ নাও; Results-এ কম নম্বর দেখো; Assignments-এ অনুশীলন দাও। Students থেকে শিক্ষার্থী যোগ, Attendance থেকে হাজিরা দাও; তথ্য বদলানোর পর AI Studio-তে আবার রিপোর্ট তৈরি করো।');
 return header+'\n\n'+(prompt?say('Your request: ','তোমার অনুরোধ: ')+prompt.slice(0,500)+'\n\n':'')+body;
}
