export const TRACK_MASTERY_PRIORITY=Object.freeze([
  'retention_due','needs_review','awaiting_evidence','awaiting_advanced_evidence','ready_for_retention','learning'
]);

export function aggregateTrackMastery(records=[]){
  const lessons=Array.isArray(records)?records:[];
  const total=lessons.length;
  const stateCounts=lessons.reduce((acc,record)=>{
    const state=record?.masteryState||'not_started';
    acc[state]=(acc[state]||0)+1;
    return acc;
  },{});
  const activityCount=lessons.filter(record=>record?.activity).length;
  const completedCount=lessons.filter(record=>record?.completed).length;
  const masteredCount=lessons.filter(record=>record?.masteryState==='mastered').length;
  const evaluatedCount=lessons.filter(record=>record?.progress?.mastery?.evaluated===true).length;

  let state='not_started';
  if(activityCount>0){
    state=TRACK_MASTERY_PRIORITY.find(candidate=>(stateCounts[candidate]||0)>0)||'learning';
    if(completedCount===total&&masteredCount===total&&total>0)state='mastered';
  }

  let blockingRecords=[];
  if(state==='mastered'||state==='not_started'){
    blockingRecords=[];
  }else if(state==='learning'){
    blockingRecords=lessons.filter(record=>!record?.completed);
  }else{
    blockingRecords=lessons.filter(record=>record?.masteryState===state);
  }

  return {
    state,
    total,
    activityCount,
    completedCount,
    masteredCount,
    evaluatedCount,
    masteryPercent:total?Math.round((masteredCount/total)*100):0,
    stateCounts,
    blockingRecords,
    blockingCount:blockingRecords.length
  };
}
