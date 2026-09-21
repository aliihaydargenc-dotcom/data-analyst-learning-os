import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const pageErrors=[];
const consoleErrors=[];

page.on('pageerror',err=>pageErrors.push(String(err)));
page.on('console',msg=>{
  if(msg.type()==='error') consoleErrors.push(msg.text());
});

try{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:120000});

  await page.locator('#trackGrid .track-card').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#trackGrid .track-card').count(),6);
  await page.locator('#curriculumGrid .curriculum-card').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#curriculumGrid .curriculum-card').count(),6);
  assert.equal(await page.locator('#curriculumGrid .level-step').count(),36); 
  assert.equal(await page.getByText('HTML & Web Foundations',{exact:true}).count(),2);

  await page.locator('#runSql').click();
  await page.locator('#sqlTable tbody tr').first().waitFor({state:'visible',timeout:120000});

  const status=await page.locator('#duckdbStatus').textContent();
  assert.match(status,/1460|1\.460/);

  const headers=await page.locator('#sqlTable thead th').allTextContents();
  assert.deepEqual(headers,['HOTEL','BUSINESS_DATE','REVENUE_EUR','PREV_DAY_REVENUE']);

  const firstRow=await page.locator('#sqlTable tbody tr').first().locator('td').allTextContents();
  assert.equal(firstRow.length,4);
  assert.ok(firstRow[0].includes('Regnum'));

  const errorText=(await page.locator('#sqlError').textContent())?.trim();
  assert.equal(errorText,'');

  await page.goto('http://127.0.0.1:4173/lesson.html?id=sql.relational-thinking.001',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Satır neyi temsil ediyor/);
  assert.equal(await page.locator('#lessonOutline .outline-item').count(),8);
  assert.equal(await page.locator('#sourceList .source-item').count(),3);

  await page.locator('#lessonOutline .outline-item').nth(3).click();
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/yanıt taslağı/i);

  await page.locator('#sectionResponse').fill('Reservations tablosunda bir satır tek bir rezervasyonu temsil eder; join öncesi grain ve candidate key birlikte doğrulanmalıdır.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonOutline').isVisible(),true);
  assert.equal(await page.locator('.lesson-reader').isVisible(),true);

  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(consoleErrors,[]);
  console.log('browser smoke: PASS');
}finally{
  await browser.close();
}
