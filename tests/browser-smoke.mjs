import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const pageErrors=[];
const consoleErrors=[];
const baseUrl='http://127.0.0.1:4173';

page.on('pageerror',err=>pageErrors.push(String(err)));
page.on('console',msg=>{
  if(msg.type()==='error') consoleErrors.push(msg.text());
});

try{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:120000});

  await page.locator('#learningContinue .continue-card').waitFor({state:'visible'});
  assert.equal(await page.locator('#courseGrid .course-card').count(),6);
  assert.equal(await page.locator('#courseGrid [data-track="sql"] .course-lesson').count(),12);
  assert.match(await page.locator('#continueLearning').getAttribute('href'),/sql\.relational-thinking\.001/);
  assert.match(await page.locator('#learningStats').textContent(),/0\/72/);
  assert.match(await page.locator('#learningStats').textContent(),/Başlanmadı/);
  assert.doesNotMatch(await page.locator('#learningStats').textContent(),/Değerlendirilmedi/);
  assert.match(await page.locator('#courseGrid [data-track="sql"] .course-state-row').textContent(),/Başlanmadı/);
  assert.match(await page.locator('#courseGrid [data-track="sql"] .course-state-row').textContent(),/0\/12 ders mastery/);
  assert.equal(await page.locator('[data-page-transition]').count(),1);
  assert.equal(await page.locator('[data-page-transition]').isVisible(),false);

  await page.evaluate(()=>{
    localStorage.setItem('da-learning-os:lesson:sql.relational-thinking.001',JSON.stringify({
      version:5,lessonId:'sql.relational-thinking.001',startedAt:'2026-09-22T05:00:00.000Z',updatedAt:'2026-09-22T05:30:00.000Z',
      completedAt:'2026-09-22T05:30:00.000Z',completedSections:['complete'],responses:{},evidenceDrafts:{},labEvidence:{},
      verifiedEvidence:{
        knowledge:{score:90,source:'mastery-assessment-v1'},
        interpretation:{score:70,source:'mastery-assessment-v1'},
        production:{score:90,source:'semantic-sql-lab'},
        transfer:{score:60,source:'mastery-assessment-v1'}
      },
      retentionDue:[],retentionHistory:[],assessmentHistory:[],advancedHistory:[],masteryInputs:{},
      mastery:{evaluated:true,passed:false,state:'needs_review'}
    }));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#objectiveFocus').waitFor({state:'visible'});
  assert.equal(await page.locator('#objectiveFocus .objective-focus-item').count(),2);
  assert.match(await page.locator('#objectiveFocus .objective-focus-item').first().getAttribute('href'),/focus=interpretation/);
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#learningContinue .continue-card').waitFor({state:'visible'});

  const sqlLessonIds=await page.locator('#courseGrid [data-track="sql"] .course-lesson').evaluateAll(links=>links.map(link=>new URL(link.href).searchParams.get('id')));
  await page.evaluate(ids=>{
    for(const id of ids){
      localStorage.setItem('da-learning-os:lesson:'+id,JSON.stringify({
        version:5,lessonId:id,startedAt:'2026-09-20T08:00:00.000Z',updatedAt:'2026-09-21T08:00:00.000Z',
        completedAt:'2026-09-21T08:00:00.000Z',completedSections:['complete'],responses:{},evidenceDrafts:{},
        labEvidence:{},verifiedEvidence:{},retentionDue:[],retentionHistory:[],assessmentHistory:[],advancedHistory:[],
        masteryInputs:{},mastery:{evaluated:true,passed:true,state:'mastered',weighted:100,failures:[],missingDimensions:[],verifiedDimensions:['knowledge','interpretation','production','transfer'],missingGates:[],verifiedGates:[],confidence:100}
      }));
    }
  },sqlLessonIds);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#courseGrid [data-track="sql"] .course-state-row').waitFor({state:'attached'});
  assert.match(await page.locator('#courseGrid [data-track="sql"] .course-state-row').textContent(),/12\/12 ders mastery/);
  assert.match(await page.locator('#courseGrid [data-track="sql"] .course-state-row').textContent(),/mastery/);
  assert.equal(await page.locator('#courseGrid [data-track="sql"] .course-lesson.mastered').count(),12);
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#learningContinue .continue-card').waitFor({state:'visible'});

  await page.setViewportSize({width:390,height:844});
  const learningHomeMobile=await page.evaluate(()=>({
    noHorizontalOverflow:document.documentElement.scrollWidth<=window.innerWidth+1,
    scrollWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth,
    overflowers:[...document.querySelectorAll('body *')].map(element=>{
      const rect=element.getBoundingClientRect();
      return {tag:element.tagName,id:element.id,className:element.className,left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)};
    }).filter(item=>item.right>window.innerWidth+1||item.left<-1).slice(0,12),
    courseColumns:getComputedStyle(document.querySelector('#courseGrid')).gridTemplateColumns,
    continueHeight:document.querySelector('#continueLearning').getBoundingClientRect().height
  }));
  assert.equal(learningHomeMobile.noHorizontalOverflow,true,`home overflow: scrollWidth=${learningHomeMobile.scrollWidth} viewport=${learningHomeMobile.viewportWidth} offenders=${JSON.stringify(learningHomeMobile.overflowers)}`);
  assert.equal(learningHomeMobile.courseColumns.trim().split(/\s+/).length,1);
  assert.ok(learningHomeMobile.continueHeight>=44);
  await page.setViewportSize({width:1280,height:900});

  assert.equal(await page.locator('.hero').count(),0);
  assert.equal(await page.locator('#tracks').count(),0);
  assert.equal(await page.locator('#academy').count(),0);
  assert.equal(await page.locator('#roadmap').count(),0);
  assert.equal(await page.locator('.home-utilities .utility-panel').count(),2);
  assert.equal((await page.locator('#learningHome').textContent()).includes('Ders ilerlemen, tekrar sıran'),false);

  await page.locator('#sql-lab > summary').click();
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
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 12/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 12/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/3 \/ 12/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/4 \/ 12/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/4 \/ 12/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/CTE, subquery ve EXISTS/);
  assert.match(await page.locator('#sequencePosition').textContent(),/5 \/ 12/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/5 \/ 12/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Window functions/);
  assert.match(await page.locator('#sequencePosition').textContent(),/6 \/ 12/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/6 \/ 12/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Analitik SQL desenleri/);
  assert.match(await page.locator('#sequencePosition').textContent(),/7 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/sql\.model-quality\.001/);
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
  assert.match(await page.locator('#sequencePosition').textContent(),/7 \/ 12/);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);

  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Şema ve veri kalitesi/);
  assert.match(await page.locator('#sequencePosition').textContent(),/8 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.equal(await page.locator('#sourceList .source-item').count(),5);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('PK/UNIQUE/FK/CHECK enforce edilebilen schema kurallarıdır; duplicate ve orphan profiling ile görünür kılınır; source-target completeness ve KPI totals ayrıca reconciliation contract olarak ölçülür.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic SQL Lab/i);

  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçmedi'),{timeout:120000});
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: FAIL|edge: FAIL/);

  await page.locator('#lessonSqlEditor').fill(`WITH hotel_keys AS (
  SELECT DISTINCT HOTEL_ID FROM hotel_dim
),
checks AS (
  SELECT 'duplicate_booking_id' AS CHECK_NAME, COUNT(*) - COUNT(DISTINCT BOOKING_ID) AS VIOLATION_COUNT FROM booking_fact
  UNION ALL
  SELECT 'duplicate_hotel_id', COUNT(*) - COUNT(DISTINCT HOTEL_ID) FROM hotel_dim
  UNION ALL
  SELECT 'invalid_status', COUNT(*) FROM booking_fact WHERE STATUS NOT IN ('Active','Pending','Cancelled')
  UNION ALL
  SELECT 'negative_revenue', COUNT(*) FROM booking_fact WHERE REVENUE_EUR < 0
  UNION ALL
  SELECT 'negative_room_nights', COUNT(*) FROM booking_fact WHERE ROOM_NIGHTS < 0
  UNION ALL
  SELECT 'orphan_hotel_fk', COUNT(*)
  FROM booking_fact AS b
  LEFT JOIN hotel_keys AS h ON h.HOTEL_ID = b.HOTEL_ID
  WHERE b.HOTEL_ID IS NOT NULL AND h.HOTEL_ID IS NULL
)
SELECT CHECK_NAME, VIOLATION_COUNT
FROM checks
ORDER BY CHECK_NAME;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),6);
  const qualityRows=await page.locator('#lessonSqlTable tbody tr').allTextContents();
  assert.match(qualityRows[0],/duplicate_booking_id.*1/);
  assert.match(qualityRows[1],/duplicate_hotel_id.*1/);
  assert.match(qualityRows[2],/invalid_status.*1/);
  assert.match(qualityRows[3],/negative_revenue.*1/);
  assert.match(qualityRows[4],/negative_room_nights.*1/);
  assert.match(qualityRows[5],/orphan_hotel_fk.*1/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);

  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/8 \/ 12/);


  await page.setViewportSize({width:1280,height:900});
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Index, statistics ve execution plan/);
  assert.match(await page.locator('#sequencePosition').textContent(),/9 \/ 12/);
  assert.equal(await page.locator('#sourceList .source-item').count(),5);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Plan triage root-cause değildir; estimate/actual, scan reads ve lookup kanıtlarını ayrı sinyaller olarak üretip SQL Server actual plan, statistics ve workload ölçüleriyle doğrularım.');
  await page.locator('#lessonSqlEditor').fill(`WITH issues AS (
  SELECT 'cardinality_misestimation' AS ISSUE_TYPE, QUERY_ID FROM plan_evidence
  WHERE ACT_ROWS >= EST_ROWS * 10 OR EST_ROWS >= ACT_ROWS * 10
  UNION ALL SELECT 'lookup_hotspot', QUERY_ID FROM plan_evidence WHERE LOOKUPS >= 1000
  UNION ALL SELECT 'scan_hotspot', QUERY_ID FROM plan_evidence WHERE ACCESS_METHOD='Scan' AND LOGICAL_READS >= 5000
)
SELECT ISSUE_TYPE, QUERY_ID FROM issues ORDER BY ISSUE_TYPE, QUERY_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),3);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);
  await page.locator('#completeSection').click();

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Production tuning/);
  assert.match(await page.locator('#sequencePosition').textContent(),/10 \/ 12/);
  assert.equal(await page.locator('#advancedMastery').isVisible(),true);
  assert.match(await page.locator('#advancedMastery').textContent(),/Advanced Mastery Gates/);
  assert.equal(await page.locator('#sourceList .source-item').count(),5);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Önce exact result equality, sonra representative baseline; logical reads ve duration birlikte iyileşmeli. CPU, write overhead, concurrency, plan stability ve rollback ayrı production gate olarak kalır.');
  await page.locator('#lessonSqlEditor').fill(`WITH baseline AS (
  SELECT * FROM tuning_variants WHERE VARIANT='baseline'
)
SELECT c.QUERY_ID, c.VARIANT,
       b.LOGICAL_READS-c.LOGICAL_READS AS READ_SAVING,
       b.DURATION_MS-c.DURATION_MS AS DURATION_SAVING
FROM tuning_variants c
JOIN baseline b ON b.QUERY_ID=c.QUERY_ID
WHERE c.VARIANT<>'baseline'
  AND c.RESULT_HASH=b.RESULT_HASH
  AND c.LOGICAL_READS*100<=b.LOGICAL_READS*80
  AND c.DURATION_MS*100<=b.DURATION_MS*80
ORDER BY c.QUERY_ID,c.VARIANT;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),2);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);
  await page.locator('#completeSection').click();

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Optimizer reasoning ve concurrency/);
  assert.match(await page.locator('#sequencePosition').textContent(),/11 \/ 12/);
  assert.equal(await page.locator('#sourceList .source-item').count(),7);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Blocking normal wait zinciridir; deadlock cycle kanıtı ister. Plan variability, version pressure ve transaction scope ayrı sinyallerdir; isolation değişikliği correctness contract ve resource cost ile değerlendirilir.');
  await page.locator('#lessonSqlEditor').fill(`WITH signals AS (
  SELECT 'plan_instability' AS SIGNAL, CASE_ID FROM workload_signals
  WHERE PLAN_COUNT>=3 AND (ACT_ROWS>=EST_ROWS*10 OR EST_ROWS>=ACT_ROWS*10)
  UNION ALL SELECT 'blocking', CASE_ID FROM workload_signals WHERE BLOCK_MS>=1000
  UNION ALL SELECT 'deadlock', CASE_ID FROM workload_signals WHERE DEADLOCK_COUNT>0
  UNION ALL SELECT 'version_pressure', CASE_ID FROM workload_signals WHERE VERSION_MB>=500
)
SELECT SIGNAL, CASE_ID FROM signals ORDER BY SIGNAL, CASE_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),8);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);
  await page.locator('#completeSection').click();

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/SQL mimari ve code review/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);
  assert.equal(await page.locator('#advancedMastery').isVisible(),true);
  assert.match(await page.locator('#advancedMastery').textContent(),/Advanced Mastery Gates/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#sourceList .source-item').count(),6);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),true);
  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Review preference değil acceptance contracttır: correctness, latency/reads, write overhead, blocking, maintainability, observability ve rollback evidence ile ayrı gate olarak kapanmalıdır.');
  await page.locator('#lessonSqlEditor').fill(`SELECT OPTION_ID
FROM design_options
WHERE RESULT_VALID=TRUE
  AND P95_MS<=500
  AND LOGICAL_READS<=10000
  AND WRITE_OVERHEAD<=30
  AND BLOCK_MS<=500
  AND MAINT_RISK<>'High'
  AND ROLLBACK_READY=TRUE
ORDER BY OPTION_ID;`);
  await page.locator('#runLessonSql').click();
  await page.waitForFunction(()=>document.querySelector('#lessonSqlFeedback')?.textContent?.includes('Semantic test geçti'),{timeout:120000});
  assert.equal(await page.locator('#lessonSqlTable tbody tr').count(),2);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonSqlFeedback').textContent(),/edge: PASS/);
  await page.locator('#completeSection').click();
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonSqlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);


  // Qlik track: track-scoped 12-lesson navigation plus deterministic Semantic Case Lab.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${baseUrl}/lesson.html?id=qlik.associative-state.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Associative model ve selection state/);
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),false);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/qlik\.dimension-measure-grain\.001/);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(4).click();
  await page.locator('#sectionResponse').fill('Selection state mevcut associative context içindeki possible kayıtları belirler; excluded değer veri modelinden silinmiş değildir ve toplam population ayrıca set/state ile tanımlanır.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic Case Lab/i);

  await page.locator('input[name="case-case-1"][value="a"]').check();
  await page.locator('input[name="case-case-2"][value="b"]').check();
  await page.locator('input[name="case-case-3"][value="a"]').check();
  await page.locator('#runLessonCase').click();
  assert.match(await page.locator('#lessonCaseFeedback').textContent(),/geçti/);
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Dimension, measure ve chart grain/);
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 12/);

  await page.goto(`${baseUrl}/lesson.html?id=qlik.engine-review.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Engine\/API farkındalığı ve design review/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),true);

  await page.locator('input[name="case-case-1"][value="a"]').check();
  await page.locator('input[name="case-case-2"][value="a"]').check();
  await page.locator('input[name="case-case-3"][value="a"]').check();
  await page.locator('#runLessonCase').click();
  assert.match(await page.locator('#lessonCaseFeedback').textContent(),/geçti/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonCaseLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);


  // Python track: real Pyodide execution plus track-scoped navigation.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${baseUrl}/lesson.html?id=python.language-semantics.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Python dil semantiği/);
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),false);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/python\.functions-errors-files\.001/);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),false);
  assert.equal(await page.locator('#lessonPythonLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(3).click();
  await page.locator('#sectionResponse').fill('Truthiness type ile aynı değildir; mutable container aliasing yaratabilir. Çözüm input contractını bozmadan truthy, falsy ve mutable sayılarını deterministic üretmelidir.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic Python Lab/i);

  await page.locator('#lessonPythonEditor').fill(`def summarize_values(values):
    return {
        "truthy": sum(bool(v) for v in values),
        "falsy": sum(not bool(v) for v in values),
        "mutable": sum(isinstance(v, (list, dict, set)) for v in values),
    }`);
  await page.locator('#runLessonPython').click();
  await page.waitForFunction(()=>document.querySelector('#lessonPythonFeedback')?.textContent?.includes('Semantic Python Lab geçti'),{timeout:180000});
  assert.match(await page.locator('#lessonPythonFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonPythonFeedback').textContent(),/edge: PASS/);
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Fonksiyonlar, hatalar ve dosyalar/);
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 12/);

  await page.goto(`${baseUrl}/lesson.html?id=python.peer-review.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Production analytics code review/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#lessonPythonLab').isVisible(),true);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),false);


  // Excel track: deterministic Semantic Case Lab plus track-scoped navigation.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${baseUrl}/lesson.html?id=excel.table-reference-semantics.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Table, range ve reference semantiği/);
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),false);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/excel\.logic-lookups\.001/);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),false);
  assert.equal(await page.locator('#lessonPythonLab').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(3).click();
  await page.locator('#sectionResponse').fill('Structured reference tablo ve kolon sözleşmesini izler; current-row @ semantiği ile tüm kolon referansı ayrılmalı, copy/fill davranışı relative ve absolute reference kurallarıyla doğrulanmalıdır.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic Case Lab/i);

  await page.locator('input[name="case-case-1"][value="a"]').check();
  await page.locator('input[name="case-case-2"][value="b"]').check();
  await page.locator('input[name="case-case-3"][value="a"]').check();
  await page.locator('#runLessonCase').click();
  assert.match(await page.locator('#lessonCaseFeedback').textContent(),/geçti/);
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Mantık, aggregation ve lookup/);
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 12/);

  await page.goto(`${baseUrl}/lesson.html?id=excel.audit-review.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Workbook audit ve peer review/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),true);
  await page.locator('input[name="case-case-1"][value="b"]').check();
  await page.locator('input[name="case-case-2"][value="a"]').check();
  await page.locator('input[name="case-case-3"][value="a"]').check();
  await page.locator('#runLessonCase').click();
  assert.match(await page.locator('#lessonCaseFeedback').textContent(),/geçti/);


  // HTML track: real DOMParser semantic lab plus track-scoped navigation.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${baseUrl}/lesson.html?id=html.document-semantics.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Belge yapısı, parser ve semantik/);
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),false);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/html\.text-links-media\.001/);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),false);
  assert.equal(await page.locator('#lessonPythonLab').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),false);
  assert.equal(await page.locator('#lessonHtmlLab').isVisible(),true);

  await page.locator('#lessonOutline .outline-item').nth(3).click();
  await page.locator('#sectionResponse').fill('HTML source browser parser ile DOM ağacına dönüşür; doctype, lang, main ve heading hiyerarşisi görsel stilden bağımsız semantic contract olarak doğrulanmalıdır.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic HTML DOM Lab/i);

  await page.locator('#runLessonHtml').click();
  await page.waitForFunction(()=>document.querySelector('#lessonHtmlFeedback')?.textContent?.includes('Semantic HTML DOM Lab geçti'));
  assert.match(await page.locator('#lessonHtmlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonHtmlFeedback').textContent(),/edge: PASS/);
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);

  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Metin, link, liste ve medya semantiği/);
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 12/);

  await page.goto(`${baseUrl}/lesson.html?id=html.accessibility-peer-review.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Erişilebilirlik ve semantik peer review/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#lessonHtmlLab').isVisible(),true);
  await page.locator('#runLessonHtml').click();
  await page.waitForFunction(()=>document.querySelector('#lessonHtmlFeedback')?.textContent?.includes('Semantic HTML DOM Lab geçti'));
  assert.match(await page.locator('#lessonHtmlFeedback').textContent(),/visible: PASS/);
  assert.match(await page.locator('#lessonHtmlFeedback').textContent(),/edge: PASS/);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonHtmlLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);



  // Technical English track: deterministic communication cases plus track-scoped navigation.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${baseUrl}/lesson.html?id=english.core-vocabulary.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Temel analitik teknik kelime dağarcığı/);
  assert.match(await page.locator('#sequencePosition').textContent(),/1 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),false);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),true);
  assert.match(await page.locator('#nextLessonLink').getAttribute('href'),/english\.task-reading\.001/);
  assert.equal(await page.locator('#lessonSqlLab').isVisible(),false);
  assert.equal(await page.locator('#lessonPythonLab').isVisible(),false);
  assert.equal(await page.locator('#lessonHtmlLab').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),true);
  await page.locator('#lessonOutline .outline-item').nth(3).click();
  await page.locator('#sectionResponse').fill('Grain çıktı satır seviyesini, population kapsamı, key identity sözleşmesini tanımlar; teknik İngilizce bu anlamı reader ve decision context içinde korumalıdır.');
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#sectionFeedback').textContent(),/Semantic Case Lab/i);
  await page.locator('input[name="case-case-1"][value="a"]').check();
  await page.locator('input[name="case-case-2"][value="a"]').check();
  await page.locator('input[name="case-case-3"][value="a"]').check();
  await page.locator('#runLessonCase').click();
  assert.match(await page.locator('#lessonCaseFeedback').textContent(),/geçti/);
  await page.locator('#completeSection').click();
  assert.match(await page.locator('#progressValue').textContent(),/13%/);
  await page.locator('#nextLessonLink').click();
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Teknik görev talimatı okuma/);
  assert.match(await page.locator('#sequencePosition').textContent(),/2 \/ 12/);

  await page.goto(`${baseUrl}/lesson.html?id=english.source-synthesis.001`,{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonTitle').textContent(),/Kaynak sentezi ve öğretme/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);
  assert.equal(await page.locator('#previousLessonLink').isVisible(),true);
  assert.equal(await page.locator('#nextLessonLink').isVisible(),false);
  assert.equal(await page.locator('#lessonCaseLab').isVisible(),true);
  await page.locator('input[name="case-case-1"][value="a"]').check();
  await page.locator('input[name="case-case-2"][value="a"]').check();
  await page.locator('input[name="case-case-3"][value="a"]').check();
  await page.locator('#runLessonCase').click();
  assert.match(await page.locator('#lessonCaseFeedback').textContent(),/geçti/);
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#lessonWorkspace').waitFor({state:'visible'});
  assert.match(await page.locator('#lessonCaseLabStatus').textContent(),/geçti/);
  assert.match(await page.locator('#sequencePosition').textContent(),/12 \/ 12/);

  const mobileLearningUx=await page.evaluate(()=>{
    const body=document.querySelector('.lesson-body');
    const rail=document.querySelector('#lessonOutline');
    const complete=document.querySelector('#completeSection');
    const cards=[...document.querySelectorAll('.lesson-context-card')];
    return {
      noHorizontalOverflow:document.documentElement.scrollWidth<=window.innerWidth+1,
      bodyFont:Number.parseFloat(getComputedStyle(body).fontSize),
      railDisplay:getComputedStyle(rail).display,
      railOverflowX:getComputedStyle(rail).overflowX,
      completeHeight:complete.getBoundingClientRect().height,
      contextClosed:cards.every(card=>card instanceof HTMLDetailsElement&&!card.open)
    };
  });
  assert.equal(mobileLearningUx.noHorizontalOverflow,true,`mobile viewport overflowed: scrollWidth=${await page.evaluate(()=>document.documentElement.scrollWidth)} viewport=${await page.evaluate(()=>window.innerWidth)}`);
  assert.ok(mobileLearningUx.bodyFont>=16);
  assert.equal(mobileLearningUx.railDisplay,'flex');
  assert.match(mobileLearningUx.railOverflowX,/auto|scroll/);
  assert.ok(mobileLearningUx.completeHeight>=44);
  assert.equal(mobileLearningUx.contextClosed,true);

  // Needs-review recovery: runtime derives a targeted transfer remediation and UI routes back to that evidence mechanism.
  await page.goto(baseUrl+'/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('da-learning-os:lesson:sql.relational-thinking.001',JSON.stringify({
      version:5,
      lessonId:'sql.relational-thinking.001',
      startedAt:'2026-09-22T06:00:00.000Z',
      updatedAt:'2026-09-22T06:00:00.000Z',
      completedAt:'2026-09-22T06:00:00.000Z',
      completedSections:[],
      responses:{},
      evidenceDrafts:{},
      labEvidence:{},
      verifiedEvidence:{
        knowledge:{status:'verified',score:90,source:'browser-test',observedAt:'2026-09-22T06:00:00.000Z'},
        interpretation:{status:'verified',score:90,source:'browser-test',observedAt:'2026-09-22T06:00:00.000Z'},
        production:{status:'verified',score:90,source:'browser-test',observedAt:'2026-09-22T06:00:00.000Z'},
        transfer:{status:'verified',score:50,source:'browser-test',observedAt:'2026-09-22T06:00:00.000Z'}
      },
      retentionDue:[{id:'recovery-browser-1',day:1,intervalDays:1,evidence:'adaptive-retention-recovery',dueAt:'2099-01-01T00:00:00.000Z',status:'pending',kind:'adaptive-recovery',sourceReviewId:'scheduled-1'}],
      retentionHistory:[],
      assessmentHistory:[],
      advancedHistory:[],
      masteryInputs:{}
    }));
  });
  await page.goto(baseUrl+'/lesson.html?id=sql.relational-thinking.001',{waitUntil:'domcontentloaded'});
  await page.locator('#lessonHero').waitFor({state:'visible'});
  assert.match(await page.locator('#masteryState').textContent(),/Gözden geçir/);
  assert.equal(await page.locator('#masteryRemediation').isVisible(),true);
  assert.match(await page.locator('#masteryRemediation').textContent(),/Transfer kanıtını güçlendir/);
  assert.match(await page.locator('#masteryRemediation').textContent(),/transfer/i);
  assert.match(await page.locator('#retentionList').textContent(),/R\+1/);
  assert.match(await page.locator('#retentionList').textContent(),/Kurtarma tekrarı/);
  await page.locator('[data-remediation-open="transfer"]').click();
  await page.locator('[data-assessment-dimension="transfer"]').waitFor({state:'visible'});
  assert.equal(await page.locator('#masteryAssessment [data-assessment-dimension]').count(),1);
  assert.equal(await page.locator('#masteryAssessment [data-assessment-dimension]').getAttribute('data-assessment-dimension'),'transfer');

  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(consoleErrors,[]);
  console.log('browser smoke: PASS');
}finally{
  await browser.close();
}
