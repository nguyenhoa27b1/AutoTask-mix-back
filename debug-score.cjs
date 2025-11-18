// Debug date parsing and comparison
const deadlineStr = process.argv[2] || new Date().toISOString().slice(0,10);
const now = new Date();
let deadlineDate;
if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
  const parts = deadlineStr.split('-').map(s => Number(s));
  deadlineDate = new Date(parts[0], parts[1]-1, parts[2]);
} else {
  deadlineDate = new Date(deadlineStr);
}
const submissionDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
console.log('now=', now.toISOString());
console.log('deadlineStr=', deadlineStr);
console.log('deadlineDate=', deadlineDate.toISOString());
console.log('submissionDay=', submissionDay.toISOString());
console.log('deadlineDay=', deadlineDay.toISOString());
console.log('subTime=', submissionDay.getTime(), 'dlTime=', deadlineDay.getTime());
if (submissionDay.getTime() < deadlineDay.getTime()) console.log('score=1');
else if (submissionDay.getTime() === deadlineDay.getTime()) console.log('score=0');
else console.log('score=-1');
