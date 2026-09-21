import fs from 'node:fs';

const items=JSON.parse(fs.readFileSync('data/question-bank.json','utf8'));
const REQUIRED_DOMAINS=['SQL','Qlik','Python','Excel','HTML','English'];
const errors=[];
const fail=message=>errors.push(message);
const ids=new Set();
const normalizedQuestions=new Set();

for(const item of items){
  if(ids.has(item.id)) fail('Duplicate item id: '+item.id);
  ids.add(item.id);

  if(!REQUIRED_DOMAINS.includes(item.domain)) fail(`Unknown domain ${item.domain} in ${item.id}`);
  if(item.type!=='mcq') fail(`${item.id}: starter screening bank expects mcq items`);
  if(!Array.isArray(item.choices)||item.choices.length<3) fail(`${item.id}: needs at least 3 choices`);
  if(!Number.isInteger(item.answer)||item.answer<0||item.answer>=item.choices.length) fail(`${item.id}: invalid answer index`);
  if(!item.question_tr?.trim()||!item.question_en?.trim()) fail(`${item.id}: TR/EN question text required`);
  if(!item.explanation_tr?.trim()) fail(`${item.id}: explanation required`);

  const normalized=(item.domain+'|'+item.question_tr).toLowerCase().replace(/\s+/g,' ').trim();
  if(normalizedQuestions.has(normalized)) fail(`${item.id}: duplicate normalized question text`);
  normalizedQuestions.add(normalized);
}

for(const domain of REQUIRED_DOMAINS){
  const domainItems=items.filter(item=>item.domain===domain);
  if(domainItems.length<5) fail(`${domain}: needs at least 5 curated quick-screen items; found ${domainItems.length}`);
  const topics=new Set(domainItems.map(item=>item.topic));
  if(topics.size<3) fail(`${domain}: needs at least 3 distinct topics; found ${topics.size}`);
}

if(errors.length){
  console.error('SCREENING VALIDATION FAILED');
  for(const error of errors) console.error(' - '+error);
  process.exit(1);
}

console.log(`screening validation: PASS · ${items.length} items · ${REQUIRED_DOMAINS.length} domains · no fixed upper limit`);
