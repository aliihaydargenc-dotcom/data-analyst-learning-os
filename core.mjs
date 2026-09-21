export function assessLevel(score){
  if(score>=90)return 'L5';
  if(score>=75)return 'L4';
  if(score>=60)return 'L3';
  if(score>=40)return 'L2';
  return 'L1';
}

export function normalizeSQL(sql=''){
  return sql.toLowerCase().replace(/\s+/g,' ').trim();
}

export function checkSqlStructure(sql=''){
  const s=normalizeSQL(sql);
  const checks=[
    ['LAG','lag('],
    ['OVER','over'],
    ['PARTITION BY','partition by'],
    ['ORDER BY','order by'],
    ['hotel_daily','from hotel_daily']
  ];
  const missing=checks.filter(([,needle])=>!s.includes(needle)).map(([label])=>label);
  return {ok:missing.length===0,missing};
}

export function computeDomainScores(questions,answers){
  const out={};
  for(const q of questions){
    if(!out[q.domain])out[q.domain]={correct:0,total:0,score:0,level:'L1'};
    out[q.domain].total++;
    if(answers[q.id]===q.answer)out[q.domain].correct++;
  }
  for(const value of Object.values(out)){
    value.score=Math.round((value.correct/value.total)*100);
    value.level=assessLevel(value.score);
  }
  return out;
}
