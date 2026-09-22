const TRACK_CONTEXT={
  sql:{tr:'otel gelir verisinde',en:'in hotel revenue data'},
  qlik:{tr:'bir Qlik yönetim raporunda',en:'in a Qlik management report'},
  python:{tr:'bir analitik veri akışında',en:'in an analytics data pipeline'},
  excel:{tr:'bir yönetim workbook’unda',en:'in a management workbook'},
  html:{tr:'bir analitik web raporunda',en:'in an analytical web report'},
  english:{tr:'bir analitik ekip iletişiminde',en:'in analytics team communication'}
};

const DIMENSION_LABELS={
  knowledge:{tr:'Bilgi',en:'Knowledge'},
  interpretation:{tr:'Yorum',en:'Interpretation'},
  production:{tr:'Üretim',en:'Production'},
  transfer:{tr:'Transfer',en:'Transfer'}
};

const DIFFICULTY={
  L1:{tr:'Başlangıç',en:'Beginner',minutes:5,xp:80},
  L2:{tr:'Başlangıç+',en:'Beginner+',minutes:7,xp:100},
  L3:{tr:'Orta',en:'Intermediate',minutes:10,xp:120},
  L4:{tr:'İleri',en:'Advanced',minutes:12,xp:140},
  L5:{tr:'İleri',en:'Advanced',minutes:15,xp:160},
  Expert:{tr:'Expert',en:'Expert',minutes:18,xp:180}
};

function appendQuery(href,key,value){
  const separator=href.includes('?')?'&':'?';
  return `${href}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export function dailyChallengeDateKey(now=new Date()){
  const date=now instanceof Date?now:new Date(now);
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

function taskFor({topic,track,dimension,lang}){
  const context=(TRACK_CONTEXT[track]||TRACK_CONTEXT.sql)[lang];
  const tasks=lang==='en'?{
    knowledge:`Explain “${topic}” ${context}; name one failure mode and one validation check.`,
    interpretation:`Diagnose how “${topic}” could produce a misleading result ${context}, and state which business decision would be affected.`,
    production:`Build an analyst-ready output using “${topic}” ${context}; include the grain, metric definition and one validation check.`,
    transfer:`Transfer the “${topic}” principle to a different business problem ${context}; state the assumptions and how you would validate the result.`
  }:{
    knowledge:`“${topic}” kavramını ${context} açıkla; bir hata riski ve bir doğrulama kontrolü belirt.`,
    interpretation:`“${topic}” yaklaşımının ${context} hangi durumda yanıltıcı sonuç üreteceğini teşhis et ve etkilenecek iş kararını belirt.`,
    production:`“${topic}” bilgisini kullanarak ${context} analist seviyesinde bir çıktı üret; grain, metrik tanımı ve en az bir doğrulama kontrolü ekle.`,
    transfer:`“${topic}” prensibini ${context} farklı bir iş problemine taşı; varsayımlarını ve sonucu nasıl doğrulayacağını belirt.`
  };
  return tasks[dimension]||tasks.production;
}

export function buildDailyChallenge(snapshot,{lang='tr',now=new Date()}={}){
  const locale=lang==='en'?'en':'tr';
  const targets=snapshot?.diagnosticTargets||[];
  const target=targets[0]||null;
  const targetRecord=target?(snapshot?.records||[]).find(record=>record.entry.id===target.lessonId):null;
  const record=targetRecord||snapshot?.continueRecord||(snapshot?.records||[])[0]||null;
  if(!record)return null;

  const dimension=target?.dimension||'production';
  const dateKey=dailyChallengeDateKey(now);
  const level=record.entry.level||'L1';
  const difficulty=DIFFICULTY[level]||DIFFICULTY.L3;
  const topic=snapshot.title(record.entry,locale);
  let href=record.entry.runtime||`lesson.html?id=${encodeURIComponent(record.entry.id)}`;
  if(target)href=appendQuery(href,'focus',dimension);
  href=appendQuery(href,'source','daily-challenge');
  href=appendQuery(href,'day',dateKey);

  return {
    id:`${dateKey}:${record.entry.id}:${dimension}`,
    dateKey,
    lessonId:record.entry.id,
    track:record.entry.track,
    trackName:snapshot.tracks?.find(item=>item.id===record.entry.track)?.name||record.entry.track,
    level,
    topic,
    dimension,
    dimensionLabel:DIMENSION_LABELS[dimension]?.[locale]||dimension,
    difficulty:difficulty[locale],
    estimatedMinutes:difficulty.minutes,
    rewardXp:difficulty.xp,
    task:taskFor({topic,track:record.entry.track,dimension,lang:locale}),
    href
  };
}
