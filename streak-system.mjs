// A study day is earned only from a verified XP event. Dates use the user's local calendar.
export function studyStreak(events,now=new Date()){
  const today=dayKey(now);
  const days=new Set((events||[]).filter(event=>
    ['verified-evidence','mastery-verified','daily-challenge','sql-challenge','case-study'].includes(event?.kind)
  ).map(event=>dayKey(event.awardedAt)).filter(Boolean));
  const yesterday=shiftDay(today,-1);
  let cursor=days.has(today)?today:yesterday;
  let current=0;
  while(days.has(cursor)){
    current++;
    cursor=shiftDay(cursor,-1);
  }
  return {current,activeToday:days.has(today)};
}

function dayKey(value){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function shiftDay(key,amount){
  const [year,month,day]=key.split('-').map(Number);
  const date=new Date(year,month-1,day+amount);
  return dayKey(date);
}
