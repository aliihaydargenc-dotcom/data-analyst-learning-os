import assert from 'node:assert/strict';
import {ANALYST_LEVELS,analystLevelFromXp,analystLevelTitle} from '../level-system.mjs';

assert.equal(ANALYST_LEVELS.length,10);

let level=analystLevelFromXp(0);
assert.equal(level.level,1);
assert.equal(level.xpToNext,300);
assert.equal(level.progressPercent,0);
assert.equal(analystLevelTitle(level,'tr'),'Başlangıç');

level=analystLevelFromXp(299);
assert.equal(level.level,1);
assert.equal(level.xpToNext,1);
assert.equal(level.progressPercent,99);

level=analystLevelFromXp(300);
assert.equal(level.level,2);
assert.equal(level.xpIntoLevel,0);
assert.equal(level.nextLevel,3);
assert.equal(level.progressPercent,0);

level=analystLevelFromXp(750);
assert.equal(level.level,3);
assert.equal(level.nextLevel,4);

level=analystLevelFromXp(1500);
assert.equal(level.level,4);
assert.equal(analystLevelTitle(level,'en'),'Intermediate');
assert.equal(level.xpForLevel,1100);

level=analystLevelFromXp(2050);
assert.equal(level.level,4);
assert.equal(level.progressPercent,50);
assert.equal(level.xpToNext,550);

level=analystLevelFromXp(12800);
assert.equal(level.level,10);
assert.equal(level.isMax,true);
assert.equal(level.progressPercent,100);
assert.equal(level.xpToNext,0);

level=analystLevelFromXp(999999);
assert.equal(level.level,10);
assert.equal(level.isMax,true);

level=analystLevelFromXp(-50);
assert.equal(level.level,1);
assert.equal(level.totalXp,0);

console.log('level system tests: PASS');
