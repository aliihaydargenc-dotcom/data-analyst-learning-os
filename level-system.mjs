export const ANALYST_LEVELS=Object.freeze([
  Object.freeze({level:1,minXp:0,titleTr:'Başlangıç',titleEn:'Starter'}),
  Object.freeze({level:2,minXp:300,titleTr:'Temel',titleEn:'Foundations'}),
  Object.freeze({level:3,minXp:750,titleTr:'Gelişen',titleEn:'Developing'}),
  Object.freeze({level:4,minXp:1500,titleTr:'Orta',titleEn:'Intermediate'}),
  Object.freeze({level:5,minXp:2600,titleTr:'Uygulayıcı',titleEn:'Practitioner'}),
  Object.freeze({level:6,minXp:4000,titleTr:'Yetkin',titleEn:'Proficient'}),
  Object.freeze({level:7,minXp:5700,titleTr:'İleri',titleEn:'Advanced'}),
  Object.freeze({level:8,minXp:7700,titleTr:'İleri+',titleEn:'Advanced+'}),
  Object.freeze({level:9,minXp:10000,titleTr:'Uzmanlaşan',titleEn:'Specializing'}),
  Object.freeze({level:10,minXp:12800,titleTr:'Expert',titleEn:'Expert'})
]);

function normalizeXp(value){
  const number=Number(value);
  if(!Number.isFinite(number)||number<=0)return 0;
  return Math.floor(number);
}

export function analystLevelFromXp(totalXp=0){
  const xp=normalizeXp(totalXp);
  let current=ANALYST_LEVELS[0];
  for(const level of ANALYST_LEVELS){
    if(xp<level.minXp)break;
    current=level;
  }

  const currentIndex=ANALYST_LEVELS.findIndex(level=>level.level===current.level);
  const next=ANALYST_LEVELS[currentIndex+1]||null;
  const isMax=next===null;
  const xpIntoLevel=xp-current.minXp;
  const xpForLevel=isMax?0:next.minXp-current.minXp;
  const xpToNext=isMax?0:Math.max(0,next.minXp-xp);
  const progressPercent=isMax?100:Math.max(0,Math.min(100,Math.round((xpIntoLevel/xpForLevel)*100)));

  return {
    ...current,
    totalXp:xp,
    nextLevel:next?.level||null,
    nextMinXp:next?.minXp??null,
    xpIntoLevel,
    xpForLevel,
    xpToNext,
    progressPercent,
    isMax
  };
}

export function analystLevelTitle(level,lang='tr'){
  if(!level)return '';
  return lang==='en'?level.titleEn:level.titleTr;
}
