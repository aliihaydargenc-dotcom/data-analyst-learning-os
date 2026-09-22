import assert from 'node:assert/strict';
import {aggregateTrackMastery} from '../track-mastery.mjs';

const record=(state,{activity=true,completed=true,evaluated=true}={})=>({
  masteryState:state,
  activity,
  completed,
  progress:{mastery:{evaluated,passed:state==='mastered'}}
});

let rollup=aggregateTrackMastery([]);
assert.equal(rollup.state,'not_started');
assert.equal(rollup.masteryPercent,0);

rollup=aggregateTrackMastery([
  record('not_started',{activity:false,completed:false,evaluated:false}),
  record('not_started',{activity:false,completed:false,evaluated:false})
]);
assert.equal(rollup.state,'not_started');

rollup=aggregateTrackMastery([
  record('mastered'),
  record('learning',{activity:true,completed:false,evaluated:false})
]);
assert.equal(rollup.state,'learning');
assert.equal(rollup.masteredCount,1);
assert.equal(rollup.masteryPercent,50);

rollup=aggregateTrackMastery([
  record('needs_review'),
  record('retention_due')
]);
assert.equal(rollup.state,'retention_due');
assert.equal(rollup.blockingCount,1);
assert.equal(rollup.blockingRecords[0].masteryState,'retention_due');

rollup=aggregateTrackMastery([
  record('mastered'),
  record('needs_review')
]);
assert.equal(rollup.state,'needs_review');

rollup=aggregateTrackMastery([
  record('mastered'),
  record('mastered')
]);
assert.equal(rollup.state,'mastered');
assert.equal(rollup.masteredCount,2);
assert.equal(rollup.masteryPercent,100);
assert.equal(rollup.blockingCount,0);

console.log('track mastery tests: PASS');
