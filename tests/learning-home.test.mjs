import assert from 'node:assert/strict';
import {buildLearningSnapshot} from '../learning-home.mjs';

class MemoryStorage{
  constructor(values={}){this.values=new Map(Object.entries(values));}
  getItem(key){return this.values.get(key)??null;}
}

const catalog={production_lessons:[
  {id:'sql.one.001',module_id:'sql.one',track:'sql',level:'L1',order:1,runtime:'lesson.html?id=sql.one.001'},
  {id:'sql.two.001',module_id:'sql.two',track:'sql',level:'L2',order:2,runtime:'lesson.html?id=sql.two.001'},
  {id:'html.one.001',module_id:'html.one',track:'html',level:'L1',order:3,runtime:'lesson.html?id=html.one.001'}
]};
const curriculum={tracks:[
  {id:'sql',name:'SQL',modules:[{id:'sql.one',title_tr:'SQL Bir',title_en:'SQL One'},{id:'sql.two',title_tr:'SQL İki',title_en:'SQL Two'}]},
  {id:'html',name:'HTML',modules:[{id:'html.one',title_tr:'HTML Bir',title_en:'HTML One'}]}
]};

let snapshot=buildLearningSnapshot({catalog,curriculum,storage:new MemoryStorage(),now:new Date('2026-09-22T06:00:00Z')});
assert.equal(snapshot.continueRecord.entry.id,'sql.one.001');
assert.equal(snapshot.completedLessons,0);
assert.equal(snapshot.retentionDue.length,0);
assert.equal(snapshot.title(snapshot.continueRecord.entry,'tr'),'SQL Bir');

const storage=new MemoryStorage({
  'da-learning-os:lesson:sql.one.001':JSON.stringify({lessonId:'sql.one.001',startedAt:'2026-09-20T08:00:00Z',updatedAt:'2026-09-20T09:00:00Z',completedAt:'2026-09-20T09:00:00Z',completedSections:['a'],evidenceDrafts:{knowledge:'Yeterince uzun ve gerekçeli bir kanıt taslağı yazıldı.'},labEvidence:{lab:{passed:true}},retentionDue:[{day:1,dueAt:'2026-09-21T09:00:00Z',status:'pending'}]}),
  'da-learning-os:lesson:sql.two.001':JSON.stringify({lessonId:'sql.two.001',startedAt:'2026-09-22T05:00:00Z',updatedAt:'2026-09-22T05:30:00Z',completedAt:null,completedSections:['a'],evidenceDrafts:{},labEvidence:{},retentionDue:[]})
});
snapshot=buildLearningSnapshot({catalog,curriculum,storage,now:new Date('2026-09-22T06:00:00Z')});
assert.equal(snapshot.lastWorked.entry.id,'sql.two.001');
assert.equal(snapshot.continueRecord.entry.id,'sql.two.001');
assert.equal(snapshot.completedLessons,1);
assert.equal(snapshot.activeTracks,1);
assert.equal(snapshot.retentionDue.length,1);
assert.equal(snapshot.tracks.find(track=>track.id==='sql').progressPercent,50);
assert.equal(snapshot.tracks.find(track=>track.id==='sql').level,'L2');
assert.equal(snapshot.evidenceDrafts,1);
assert.equal(snapshot.masteryEvaluated,false);
console.log('learning home: PASS');
