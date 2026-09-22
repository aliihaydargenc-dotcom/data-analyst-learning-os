import assert from 'node:assert/strict';
import {
  XP_LEDGER_STORAGE_KEY,
  XP_RULES,
  awardXp,
  dailyChallengeRewardForLevel,
  dailyChallengeXpEventId,
  readXpLedger,
  syncLessonXp
} from '../xp-system.mjs';

class MemoryStorage{
  constructor(){this.values=new Map();}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){this.values.set(key,String(value));}
}

const storage=new MemoryStorage();
assert.equal(readXpLedger(storage).totalXp,0);
assert.equal(dailyChallengeRewardForLevel('L3'),120);
assert.equal(dailyChallengeXpEventId({day:'2026-09-22',lessonId:'sql.window.001',dimension:'production'}),'daily:2026-09-22:sql.window.001:production');

const direct=awardXp(storage,{id:'manual:test',kind:'test',xp:10,awardedAt:'2026-09-22T09:00:00.000Z'});
assert.equal(direct.awarded,true);
assert.equal(awardXp(storage,{id:'manual:test',kind:'test',xp:10}).awarded,false);
assert.equal(readXpLedger(storage).totalXp,10);

storage.setItem(XP_LEDGER_STORAGE_KEY,JSON.stringify({version:1,events:[]}));
const lesson={id:'sql.window.001',level:'L3'};
const before={
  completedAt:null,
  verifiedEvidence:{},
  mastery:{passed:false}
};
const passedProduction={
  completedAt:'2026-09-22T09:10:00.000Z',
  verifiedEvidence:{
    production:{status:'verified',score:100,source:'semantic-sql-lab',observedAt:'2026-09-22T09:09:00.000Z'}
  },
  mastery:{passed:false}
};

let sync=syncLessonXp({
  storage,lesson,previousProgress:before,nextProgress:passedProduction,
  context:{source:'daily-challenge',day:'2026-09-22',focus:'production'},
  now:new Date('2026-09-22T09:10:00.000Z')
});
assert.equal(sync.awardedXp,XP_RULES.lessonCompletion+XP_RULES.verifiedEvidence+120);
assert.equal(sync.totalXp,205);
assert.deepEqual(sync.events.map(event=>event.kind),['lesson-completed','verified-evidence','daily-challenge']);

sync=syncLessonXp({
  storage,lesson,previousProgress:passedProduction,nextProgress:passedProduction,
  context:{source:'daily-challenge',day:'2026-09-22',focus:'production'},
  now:new Date('2026-09-22T09:11:00.000Z')
});
assert.equal(sync.awardedXp,0);
assert.equal(sync.totalXp,205);

const mastered={
  ...passedProduction,
  mastery:{passed:true}
};
sync=syncLessonXp({
  storage,lesson,previousProgress:passedProduction,nextProgress:mastered,
  context:{},
  now:new Date('2026-09-22T09:12:00.000Z')
});
assert.equal(sync.awardedXp,XP_RULES.masteryVerified);
assert.equal(sync.totalXp,305);

const failedLesson={id:'sql.failed.001',level:'L3'};
sync=syncLessonXp({
  storage,lesson:failedLesson,
  previousProgress:{completedAt:null,verifiedEvidence:{},mastery:{passed:false}},
  nextProgress:{
    completedAt:null,
    verifiedEvidence:{production:{status:'verified',score:0,source:'semantic-sql-lab',observedAt:'2026-09-22T09:13:00.000Z'}},
    mastery:{passed:false}
  },
  context:{source:'daily-challenge',day:'2026-09-22',focus:'production'},
  now:new Date('2026-09-22T09:13:00.000Z')
});
assert.equal(sync.awardedXp,0);
assert.equal(sync.totalXp,305);

const ledger=readXpLedger(storage);
assert.equal(ledger.events.length,4);
assert.equal(ledger.events.filter(event=>event.kind==='daily-challenge').length,1);

console.log('xp system tests: PASS');
