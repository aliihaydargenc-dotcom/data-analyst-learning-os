const DEFAULT_START_LEVEL=3;

function uniqueLevels(questions){
  return [...new Set(questions.map(question=>Number(question.level)).filter(Number.isFinite))].sort((a,b)=>a-b);
}

function nearestLevel(levels,target){
  return [...levels].sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b)[0]??target;
}

function lowerLevel(levels,current){
  return [...levels].filter(level=>level<current).sort((a,b)=>b-a)[0]??null;
}

function higherLevel(levels,current){
  return [...levels].filter(level=>level>current).sort((a,b)=>a-b)[0]??null;
}

export function createAdaptiveAssessment(questions,{startLevel=DEFAULT_START_LEVEL,domains=null}={}){
  const source=Array.isArray(questions)?questions:[];
  const domainOrder=domains?.length?[...domains]:[...new Set(source.map(question=>question.domain).filter(Boolean))];
  const domainStates={};

  for(const domain of domainOrder){
    const domainQuestions=source.filter(question=>question.domain===domain);
    const levels=uniqueLevels(domainQuestions);
    const targetLevel=nearestLevel(levels,startLevel);
    domainStates[domain]={
      domain,
      levels,
      targetLevel,
      highestPassed:null,
      lowestFailed:null,
      placement:null,
      done:levels.length===0,
      attempts:[]
    };
  }

  const session={
    version:1,
    startLevel,
    domainOrder,
    currentDomainIndex:0,
    domainStates,
    complete:domainOrder.length===0||domainOrder.every(domain=>domainStates[domain].done)
  };

  while(session.currentDomainIndex<domainOrder.length&&domainStates[domainOrder[session.currentDomainIndex]].done){
    session.currentDomainIndex++;
  }
  if(session.currentDomainIndex>=domainOrder.length)session.complete=true;
  return session;
}

export function nextAdaptiveQuestion(session,questions,{random=Math.random}={}){
  if(!session||session.complete)return null;
  const source=Array.isArray(questions)?questions:[];

  while(session.currentDomainIndex<session.domainOrder.length){
    const domain=session.domainOrder[session.currentDomainIndex];
    const state=session.domainStates[domain];
    if(state.done){
      session.currentDomainIndex++;
      continue;
    }

    const asked=new Set(state.attempts.map(attempt=>attempt.questionId));
    const available=source.filter(question=>question.domain===domain&&!asked.has(question.id));
    if(!available.length){
      state.done=true;
      state.placement=state.highestPassed??Math.max(1,(state.levels[0]??2)-1);
      session.currentDomainIndex++;
      continue;
    }

    const exact=available.filter(question=>Number(question.level)===state.targetLevel);
    const candidates=(exact.length?exact:available).sort((a,b)=>
      Math.abs(Number(a.level)-state.targetLevel)-Math.abs(Number(b.level)-state.targetLevel)||
      String(a.id).localeCompare(String(b.id))
    );
    const roll=Math.min(.999999,Math.max(0,Number(random?.()??0)));
    return candidates[Math.floor(roll*candidates.length)]||candidates[0];
  }

  session.complete=true;
  return null;
}

export function submitAdaptiveAnswer(session,question,selectedIndex){
  if(!session||!question)throw new Error('Adaptive assessment requires an active question.');
  const state=session.domainStates?.[question.domain];
  if(!state||state.done)throw new Error('Question domain is not active.');

  const level=Number(question.level);
  const correct=Number(selectedIndex)===Number(question.answer);
  state.attempts.push({questionId:question.id,level,correct});

  if(correct){
    state.highestPassed=state.highestPassed===null?level:Math.max(state.highestPassed,level);
    const next=higherLevel(state.levels,level);
    if(next===null||(state.lowestFailed!==null&&next>=state.lowestFailed)){
      state.done=true;
      state.placement=state.highestPassed;
    }else{
      state.targetLevel=next;
    }
  }else{
    state.lowestFailed=state.lowestFailed===null?level:Math.min(state.lowestFailed,level);
    const next=lowerLevel(state.levels,level);
    if(next===null||(state.highestPassed!==null&&next<=state.highestPassed)){
      state.done=true;
      state.placement=state.highestPassed??Math.max(1,level-1);
    }else{
      state.targetLevel=next;
    }
  }

  if(state.done){
    while(session.currentDomainIndex<session.domainOrder.length&&session.domainStates[session.domainOrder[session.currentDomainIndex]].done){
      session.currentDomainIndex++;
    }
    if(session.currentDomainIndex>=session.domainOrder.length)session.complete=true;
  }

  return {
    correct,
    domainCompleted:state.done,
    placement:state.done?'L'+state.placement:null,
    complete:session.complete
  };
}

export function summarizeAdaptiveAssessment(session){
  const out={};
  if(!session)return out;
  for(const domain of session.domainOrder){
    const state=session.domainStates[domain];
    const correct=state.attempts.filter(attempt=>attempt.correct).length;
    const fallback=state.highestPassed??Math.max(1,(state.levels[0]??2)-1);
    out[domain]={
      level:'L'+(state.placement??fallback),
      correct,
      total:state.attempts.length,
      path:state.attempts.map(attempt=>attempt.level)
    };
  }
  return out;
}
