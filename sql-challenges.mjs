import {normalizeSQL} from './core.mjs';
import {compareResultSets} from './sql-result-evaluator.mjs';

export const SQL_CHALLENGES=Object.freeze([
  Object.freeze({
    id:'previous-day-revenue',
    difficulty:'Intermediate',
    skills:['LAG()','Window Functions'],
    task_tr:'Her otel için günlük geliri ve bir önceki günün gelirini döndür. Çıktıyı HOTEL, BUSINESS_DATE sırasıyla getir.',
    task_en:'Return daily revenue and previous-day revenue for each hotel. Sort the output by HOTEL, BUSINESS_DATE.',
    starterSql:`SELECT
    -- gerekli kolonları seç
FROM hotel_daily
ORDER BY HOTEL, BUSINESS_DATE;`,
    referenceSql:`SELECT
    HOTEL,
    BUSINESS_DATE,
    REVENUE_EUR,
    LAG(REVENUE_EUR) OVER (
        PARTITION BY HOTEL
        ORDER BY BUSINESS_DATE
    ) AS PREV_DAY_REVENUE
FROM hotel_daily
ORDER BY HOTEL, BUSINESS_DATE;`,
    requiredSql:[
      {label:'LAG()',needle:'lag('},
      {label:'PARTITION BY HOTEL',needle:'partition by hotel'},
      {label:'final ORDER BY',needle:'order by hotel, business_date'}
    ]
  }),
  Object.freeze({
    id:'adr-day-over-day',
    difficulty:'Intermediate',
    skills:['LAG()','CTE','Date comparison'],
    task_tr:'Her otel için ADR, önceki gün ADR ve günlük ADR değişimini hesapla. Çıktıyı HOTEL, BUSINESS_DATE sırasıyla getir.',
    task_en:'Calculate ADR, previous-day ADR, and daily ADR change for each hotel. Sort by HOTEL, BUSINESS_DATE.',
    starterSql:`WITH adr_daily AS (
    SELECT
        -- günlük ADR ve önceki gün ADR alanlarını üret
    FROM hotel_daily
)
SELECT
    -- gerekli alanları ve ADR_CHANGE değerini döndür
FROM adr_daily
ORDER BY HOTEL, BUSINESS_DATE;`,
    referenceSql:`WITH adr_daily AS (
    SELECT
        HOTEL,
        BUSINESS_DATE,
        ADR_EUR,
        LAG(ADR_EUR) OVER (
            PARTITION BY HOTEL
            ORDER BY BUSINESS_DATE
        ) AS PREV_DAY_ADR
    FROM hotel_daily
)
SELECT
    HOTEL,
    BUSINESS_DATE,
    ADR_EUR,
    PREV_DAY_ADR,
    ROUND(ADR_EUR - PREV_DAY_ADR, 2) AS ADR_CHANGE
FROM adr_daily
ORDER BY HOTEL, BUSINESS_DATE;`,
    requiredSql:[
      {label:'WITH / CTE',needle:'with '},
      {label:'LAG()',needle:'lag('},
      {label:'PARTITION BY HOTEL',needle:'partition by hotel'},
      {label:'ADR_EUR',needle:'adr_eur'},
      {label:'final ORDER BY',needle:'order by hotel, business_date'}
    ]
  }),
  Object.freeze({
    id:'largest-revenue-drop',
    difficulty:'Advanced',
    skills:['LAG()','CTE','ROW_NUMBER()'],
    task_tr:'Her otel için en büyük günlük gelir düşüşünün yaşandığı günü bul. Gelir değişimini de döndür.',
    task_en:'Find the date of the largest day-over-day revenue decline for each hotel and return the revenue change.',
    starterSql:`WITH daily_change AS (
    SELECT
        -- önceki gün gelirini ve değişimi üret
    FROM hotel_daily
),
ranked AS (
    SELECT
        -- her otelde en büyük düşüşü sırala
    FROM daily_change
)
SELECT
    -- yalnızca en büyük düşüşü döndür
FROM ranked
ORDER BY HOTEL;`,
    referenceSql:`WITH daily_change AS (
    SELECT
        HOTEL,
        BUSINESS_DATE,
        REVENUE_EUR,
        LAG(REVENUE_EUR) OVER (
            PARTITION BY HOTEL
            ORDER BY BUSINESS_DATE
        ) AS PREV_DAY_REVENUE
    FROM hotel_daily
),
ranked AS (
    SELECT
        HOTEL,
        BUSINESS_DATE,
        REVENUE_EUR,
        PREV_DAY_REVENUE,
        ROUND(REVENUE_EUR - PREV_DAY_REVENUE, 2) AS REVENUE_CHANGE,
        ROW_NUMBER() OVER (
            PARTITION BY HOTEL
            ORDER BY REVENUE_EUR - PREV_DAY_REVENUE ASC, BUSINESS_DATE
        ) AS RN
    FROM daily_change
    WHERE PREV_DAY_REVENUE IS NOT NULL
)
SELECT
    HOTEL,
    BUSINESS_DATE,
    REVENUE_EUR,
    PREV_DAY_REVENUE,
    REVENUE_CHANGE
FROM ranked
WHERE RN = 1
ORDER BY HOTEL;`,
    requiredSql:[
      {label:'WITH / CTE',needle:'with '},
      {label:'LAG()',needle:'lag('},
      {label:'ROW_NUMBER()',needle:'row_number('},
      {label:'PARTITION BY HOTEL',needle:'partition by hotel'},
      {label:'final ORDER BY',needle:'order by hotel'}
    ]
  })
]);

export function evaluateSqlChallenge({challenge,sql,actual,expected}){
  if(!challenge)throw new Error('SQL challenge is required.');
  const comparison=compareResultSets(actual,expected);
  const normalized=normalizeSQL(sql);
  const missingSql=(challenge.requiredSql||[]).filter(rule=>!normalized.includes(rule.needle)).map(rule=>rule.label);

  const hasError=type=>comparison.errors.some(error=>error.type===type);
  const checks=[
    {id:'columns',passed:!hasError('columns')},
    {id:'row_count',passed:!hasError('row_count')},
    {id:'values_order',passed:!hasError('cell')},
    {id:'required_sql',passed:missingSql.length===0}
  ];
  const score=checks.filter(check=>check.passed).length*25;

  return {
    passed:checks.every(check=>check.passed),
    score,
    checks,
    missingSql,
    errors:comparison.errors
  };
}
