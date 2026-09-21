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
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 3/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.select-null-filtering\.001/);

  await page.locator('#lessonOutline .outline-item').nth(3).click();
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/yanıt taslağı/i);

  await page.locator('#sectionResponse').fill('Reservations tablosunda bir satır tek bir rezervasyonu temsil eder; join öncesi grain ve candidate key birlikte doğrulanmalıdır.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/SELECT gerçekten ne yapıyor/);
  assert.equal(await page.locator('#lessonOutline .outline-item').count(),8);
  assert.equal(await page.locator('#sourceList .source-item').count(),6);
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 3/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.aggregation-grain\.001/);

  await page.locator('#lessonOutline .outline-item').nth(1).click();
  assert.match(await page.locator('#sectionBody').textContent(),/UNKNOWN/);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('NULL ile boş string aynı değildir; ayrıca hotel_daily için yarı-açık tarih aralığı ve deterministik ORDER BY kullanırım.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#lessonSqlEditor').fill(`SELECT BOOKING_ID, HOTEL, STATUS, CANCEL_REASON
FROM reservation_filter_cases
WHERE CANCEL_REASON = NULL
  AND (STATUS = 'Active' OR STATUS = 'Pending')
  AND HOTEL = 'A'
ORDER BY STATUS, BOOKING_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`SELECT BOOKING_ID, HOTEL, STATUS, CANCEL_REASON
FROM reservation_filter_cases
WHERE CANCEL_REASON IS NULL
  AND (STATUS = 'Active' OR STATUS = 'Pending')
  AND HOTEL = 'A'
ORDER BY STATUS, BOOKING_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),3);
  const lessonRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(lessonRows[0],/B001/);
  assert.match(lessonRows[1],/B004/);
  assert.match(lessonRows[2],/B007/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonOutline').isVisible(),true);
  assert.equal(await page.locator('.lesson-reader').isVisible(),true);
  assert.equal(await page.locator('#lessonSequence').isVisible(),true);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  assert.match(await page.locator('#progressValue').textContent(),/13%/);
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/GROUP BY neyi değiştiriyor/);
  assert.match(await page.locator('#sequencePosition').textContent(),/3 \/ 3/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#sourceList .source-item').count(),6);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Kaynak grain stay-charge satırı, hedef grain HOTEL × SEGMENT. WHERE Temmuz popülasyonunu kurar; HAVING aggregate grupları filtreler. COUNT(*) tüm satırları, COUNT(REVENUE_EUR) yalnızca non-NULL revenue değerlerini sayar.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#lessonSqlEditor').fill(`SELECT
  HOTEL,
  SEGMENT,
  COUNT(*) AS ROWS_IN_GROUP,
  COUNT(REVENUE_EUR) AS PRICED_ROWS,
  SUM(REVENUE_EUR) AS TOTAL_REVENUE
FROM stay_charge_cases
WHERE BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
  AND BUSINESS_DATE < CAST('2026-08-01' AS DATE)
GROUP BY HOTEL, SEGMENT
ORDER BY HOTEL, SEGMENT;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`SELECT
  HOTEL,
  SEGMENT,
  COUNT(*) AS ROWS_IN_GROUP,
  COUNT(REVENUE_EUR) AS PRICED_ROWS,
  SUM(REVENUE_EUR) AS TOTAL_REVENUE
FROM stay_charge_cases
WHERE BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
  AND BUSINESS_DATE < CAST('2026-08-01' AS DATE)
GROUP BY HOTEL, SEGMENT
HAVING SUM(REVENUE_EUR) >= 2000
ORDER BY HOTEL, SEGMENT;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),3);
  const aggregateRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(aggregateRows[0],/ALeisure.*3.*2.*2100/);
  assert.match(aggregateRows[1],/BCorporate.*2.*1.*2200/);
  assert.match(aggregateRows[2],/BLeisure.*2.*2.*3000/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(consoleErrors,[]);
  console.log('browser smoke: PASS');
}finally{
  await browser.close();
}
