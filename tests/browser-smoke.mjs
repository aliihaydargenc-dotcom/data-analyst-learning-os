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
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 7/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 7/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/3 \/ 7/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.join-cardinality\.001/);
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

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/JOIN neden satır çoğaltır/);
  assert.match(await page.locator('#sequencePosition').textContent(),/4 \/ 7/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.cte-subquery-sets\.001/);
  assert.equal(await page.locator('#sourceList .source-item').count(),4);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('booking_fact grain bir booking, hotel_dim HOTEL_ID üzerinde tekil, booking_guest ise booking başına çoklu satır taşır. Hedef grain booking olmalı; row count, distinct booking ve revenue reconciliation birlikte kontrol edilir.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#lessonSqlEditor').fill(`SELECT
    b.BOOKING_ID,
    h.HOTEL_NAME,
    COUNT(g.GUEST_ID) AS GUEST_COUNT,
    SUM(b.REVENUE_EUR) AS BOOKING_REVENUE
FROM booking_fact AS b
JOIN hotel_dim AS h
  ON h.HOTEL_ID = b.HOTEL_ID
LEFT JOIN booking_guest AS g
  ON g.BOOKING_ID = b.BOOKING_ID
GROUP BY b.BOOKING_ID, h.HOTEL_NAME
ORDER BY b.BOOKING_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`SELECT
    b.BOOKING_ID,
    h.HOTEL_NAME,
    COUNT(g.GUEST_ID) AS GUEST_COUNT,
    MAX(b.REVENUE_EUR) AS BOOKING_REVENUE
FROM booking_fact AS b
JOIN hotel_dim AS h
  ON h.HOTEL_ID = b.HOTEL_ID
LEFT JOIN booking_guest AS g
  ON g.BOOKING_ID = b.BOOKING_ID
GROUP BY b.BOOKING_ID, h.HOTEL_NAME
ORDER BY b.BOOKING_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),3);
  const joinRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(joinRows[0],/B001Aurora.*2.*500/);
  assert.match(joinRows[1],/B002Aurora.*0.*700/);
  assert.match(joinRows[2],/B003Boreal.*1.*900/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/4 \/ 7/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/CTE, subquery ve EXISTS/);
  assert.match(await page.locator('#sequencePosition').textContent(),/5 \/ 7/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.window-semantics\.001/);
  assert.equal(await page.locator('#sourceList .source-item').count(),7);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Ara CTE customer grain Completed revenue üretir; dış sorgu customer grain kalır. Cancelled booking varlığı correlated NOT EXISTS ile test edilir ve aynı Temmuz yarı-açık tarih penceresi korunur.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`WITH completed AS (
  SELECT CUSTOMER_ID, SUM(REVENUE_EUR) AS JULY_COMPLETED_REVENUE
  FROM booking_fact
  WHERE BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
    AND BUSINESS_DATE < CAST('2026-08-01' AS DATE)
    AND STATUS = 'Completed'
  GROUP BY CUSTOMER_ID
  HAVING SUM(REVENUE_EUR) >= 1000
)
SELECT c.CUSTOMER_ID, c.CUSTOMER_NAME, x.JULY_COMPLETED_REVENUE
FROM customer_dim AS c
JOIN completed AS x ON x.CUSTOMER_ID = c.CUSTOMER_ID
WHERE NOT EXISTS (
  SELECT 1 FROM booking_fact AS b
  WHERE b.CUSTOMER_ID = c.CUSTOMER_ID
    AND b.BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
    AND b.BUSINESS_DATE < CAST('2026-08-01' AS DATE)
    AND b.STATUS = 'Cancelled'
)
ORDER BY c.CUSTOMER_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),2);
  const cteRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(cteRows[0],/C1Ada.*1100/);
  assert.match(cteRows[1],/C5Ece.*1000/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/5 \/ 7/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Window functions/);
  assert.match(await page.locator('#sequencePosition').textContent(),/6 \/ 7/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.analytical-patterns\.001/);
  assert.equal(await page.locator('#sourceList .source-item').count(),6);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('HOTEL partition hesaplamayı otel bazında yeniden başlatır. BUSINESS_DATE + EVENT_ID row-level order için tie-break sağlar; ROWS fiziksel satır cumulative, RANGE ise aynı tarihli peer satırların ortak date-running değerini üretir.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#lessonSqlEditor').fill(`SELECT EVENT_ID, HOTEL, BUSINESS_DATE, REVENUE_EUR,
  LAG(REVENUE_EUR) OVER (ORDER BY BUSINESS_DATE) AS PREV_REVENUE,
  SUM(REVENUE_EUR) OVER (ORDER BY BUSINESS_DATE) AS ROW_RUNNING_REVENUE,
  SUM(REVENUE_EUR) OVER (ORDER BY BUSINESS_DATE) AS DATE_RUNNING_REVENUE,
  ROW_NUMBER() OVER (ORDER BY BUSINESS_DATE) AS HOTEL_ROW_NUMBER
FROM window_metric_cases
ORDER BY HOTEL, BUSINESS_DATE, EVENT_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`SELECT
  EVENT_ID,
  HOTEL,
  BUSINESS_DATE,
  REVENUE_EUR,
  LAG(REVENUE_EUR) OVER (PARTITION BY HOTEL ORDER BY BUSINESS_DATE, EVENT_ID) AS PREV_REVENUE,
  SUM(REVENUE_EUR) OVER (
    PARTITION BY HOTEL
    ORDER BY BUSINESS_DATE, EVENT_ID
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS ROW_RUNNING_REVENUE,
  SUM(REVENUE_EUR) OVER (
    PARTITION BY HOTEL
    ORDER BY BUSINESS_DATE
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS DATE_RUNNING_REVENUE,
  ROW_NUMBER() OVER (PARTITION BY HOTEL ORDER BY BUSINESS_DATE, EVENT_ID) AS HOTEL_ROW_NUMBER
FROM window_metric_cases
ORDER BY HOTEL, BUSINESS_DATE, EVENT_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),7);
  const windowRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(windowRows[0],/E01A.*100.*NULL.*100.*300.*1/);
  assert.match(windowRows[1],/E02A.*200.*100.*300.*300.*2/);
  assert.match(windowRows[2],/E03A.*150.*200.*450.*450.*3/);
  assert.match(windowRows[4],/E05B.*120.*NULL.*120.*200.*1/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/6 \/ 7/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Analitik SQL desenleri/);
  assert.match(await page.locator('#sequencePosition').textContent(),/7 \/ 7/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#sourceList .source-item').count(),7);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Hedef grain source event satırı olarak korunur. Gaps/islands DAY_NO farkı üzerinden boundary üretir; rolling metric son üç gözlemi kullanır; ranking HOTEL partition içinde revenue desc ve DAY_NO + EVENT_ID tie-break ile deterministiktir.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`WITH ordered AS (
  SELECT
    EVENT_ID, HOTEL, DAY_NO, REVENUE_EUR,
    LAG(DAY_NO) OVER (PARTITION BY HOTEL ORDER BY DAY_NO, EVENT_ID) AS PREV_DAY_NO,
    SUM(REVENUE_EUR) OVER (
      PARTITION BY HOTEL ORDER BY DAY_NO, EVENT_ID
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS ROLLING_3_REVENUE,
    ROW_NUMBER() OVER (
      PARTITION BY HOTEL ORDER BY REVENUE_EUR DESC, DAY_NO, EVENT_ID
    ) AS HOTEL_REVENUE_RANK
  FROM analytical_pattern_cases
),
flagged AS (
  SELECT *,
    CASE WHEN PREV_DAY_NO IS NULL OR DAY_NO - PREV_DAY_NO > 1 THEN 1 ELSE 0 END AS IS_NEW_ISLAND
  FROM ordered
)
SELECT
  EVENT_ID, HOTEL, DAY_NO, REVENUE_EUR, PREV_DAY_NO, IS_NEW_ISLAND,
  SUM(IS_NEW_ISLAND) OVER (
    PARTITION BY HOTEL ORDER BY DAY_NO, EVENT_ID
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS ISLAND_ID,
  ROLLING_3_REVENUE,
  HOTEL_REVENUE_RANK
FROM flagged
ORDER BY HOTEL, DAY_NO, EVENT_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),8);
  const patternRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(patternRows[0],/A1A1.*100.*NULL.*1.*1.*100.*5/);
  assert.match(patternRows[1],/A2A2.*200.*1.*0.*1.*300.*3/);
  assert.match(patternRows[2],/A3A4.*150.*2.*1.*2.*450.*4/);
  assert.match(patternRows[3],/A4A5.*300.*4.*0.*2.*650.*1/);
  assert.match(patternRows[4],/A5A5.*300.*5.*0.*2.*750.*2/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/7 \/ 7/);

  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(consoleErrors,[]);
  console.log('browser smoke: PASS');
}finally{
  await browser.close();
}
