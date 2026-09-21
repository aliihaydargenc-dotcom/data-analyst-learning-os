# Data Analyst Learning OS

Sıfır önkoşulla başlayabilen, fakat hızlı kavrayan öğrenciyi gereksiz tekrarlarla yavaşlatmayan; SQL, Qlik Sense, Python, Excel, HTML/Web Foundations ve Technical English'i tek mastery sistemi altında birleştiren veri analisti akademisi.

## Academy kernel v0.12

Bu repo artık yalnızca özellik listesiyle ilerlemez. İçerik ve seviye yapısı executable kalite kapılarıyla doğrulanır.

Mevcut çekirdek:
- 72 curriculum module: 6 track × L1–Expert
- prerequisite graph ve cross-tool dependency
- Knowledge / Interpretation / Production / Transfer / Retention mastery engine
- adaptive depth politikası
- D+1 / D+3 / D+7 / D+14 / D+30 retention scheduler
- her track için bir source-verified golden lesson candidate
- sabit üst limite bağlı olmayan, coverage-gated hızlı ön tarama bankası
- DuckDB-Wasm ile gerçek browser SQL Lab
- production derslerinde result-based semantic SQL evaluator: görünür fixture + farklı edge-case fixture
- 1.460 satırlık sentetik hotel dataset
- gerçek Chromium smoke test
- production lesson runtime: section progress, practice-response gate, evidence drafts, lesson sequence ve retention planı
- curriculum quality validator

## Eğitim kalite ilkesi

MCQ bankası nihai placement değildir ve belirli bir soru sayısına sabitlenmez. Production curriculum için knowledge, interpretation, independent production, debugging, transfer ve delayed retention kanıtları gerekir.

24 haftalık plan yalnızca referans tempodur; Expert seviyesi süre ile verilmez.

## Repo yapısı

- `content/curriculum.json`: 6 track × L1–Expert prerequisite graph
- `content/mastery-policy.json`: executable mastery thresholds
- `content/golden-lessons.json`: katmanlı ders kalite örnekleri
- `content/sources.json`: official/academic source catalog
- `mastery-engine.mjs`: mastery, adaptive-depth ve retention mantığı
- `scripts/validate-academy.mjs`: broken/circular prerequisite ve content gate
- `scripts/validate-screening.mjs`: domain/topic coverage, duplicate ve answer-integrity gate
- `scripts/validate-lessons.mjs`: production lesson depth, source, evidence ve pedagogy gate
- `lesson-runtime.mjs`: lesson progress, response gate ve retention runtime
- `lesson.html` + `lesson-page.mjs`: tarayıcıda gerçek ders çalışma ekranı
- `lesson-sql-lab.mjs`: production lesson semantic SQL execution + edge fixture evaluator
- `sql-result-evaluator.mjs`: result-set equality grader
- `duckdb-lab.mjs`: gerçek browser SQL execution
- `data/question-bank.json`: starter MCQ bank
- `data/roadmap.json`: 24 haftalık referans tempo
- `tests/`: core, mastery ve browser smoke testleri

## Çalıştırma

```bash
python -m http.server 8080
```

```text
http://localhost:8080/
```

## Test

```bash
npm install
npm test
npx playwright install chromium
python -m http.server 4173
npm run test:browser
```

`npm test` core testlerinin yanında mastery engine ve curriculum quality gate kontrollerini de çalıştırır.

İçerik üçüncü taraf eğitimlerden kopyalanmaz. Resmî dokümantasyon ve akademik kaynaklar doğruluk/kapsam için kullanılır; öğrenme görevleri ve vakalar özgün hazırlanır.


## Soru sayısı politikası

Soru bankasında sabit bir üst limit yoktur. CI artık `50 soru` gibi bir sayı aramaz. Hızlı ön tarama için her trackte minimum konu çeşitliliği ve item bütünlüğü aranır; gerçek mastery ise knowledge, interpretation, production, debugging, transfer ve delayed retention kanıtlarıyla verilir.

## HTML / Web Foundations kapsamı

HTML track'i front-end geliştirici eğitimi değildir. Veri analistinin ürettiği web raporunu doğru semantik, erişilebilir data table/form yapısı, DOM sözleşmeleri, embedded visualization sınırları ve production review düzeyine taşır. CSS/JavaScript ayrıntısı yalnızca HTML'in veri ürünü bağlamını anlamak için gerektiği kadar kullanılır.


## Production ders runtime

İlk yedi production-candidate ders `sql.relational-thinking.001`, `sql.select-null-filtering.001`, `sql.aggregation-grain.001`, `sql.join-cardinality.001`, `sql.cte-subquery-sets.001`, `sql.window-semantics.001` ve `sql.analytical-patterns.001` üzerinden uçtan uca çalışır. Ders; mental model, worked example, guided practice, independent production, debugging, transfer ve retention katmanlarını ayrı bölümler halinde gösterir.

Practice bölümlerinde gerekçeli yanıt taslağı olmadan bölüm tamamlanamaz. SQL production görevlerinde gerekli olduğunda bölüm ayrıca semantic lab PASS ister. Evaluator keyword aramaz; aday sorgunun result set'ini referans sorguyla hem görünür fixture hem de farklı edge-case fixture üzerinde karşılaştırır. Bu yine tek başına mastery değildir; üretim kanıtının bir parçasıdır. Mastery evidence taslakları ayrı tutulur ve completion yüzdesine dahil edilmez.

Dersler production catalog içindeki açık sırayla önceki/sonraki navigasyona bağlanır. Sıra, mastery yerine geçmez; yalnızca öğrenme yolunu düzenler.

Ders ilerlemesi şimdilik tarayıcı `localStorage` alanında saklanır. Hesaplar arası senkronizasyon eklenmeden önce bunun local-only olduğu açıkça korunur.


### SQL production yolu

İlk üretim hattı relational grain → SELECT/NULL/filtering → GROUP BY/HAVING/aggregate grain → JOIN/cardinality/fan-out → CTE/subquery/EXISTS/set semantics → window partition/order/frame → analytical patterns şeklinde ilerler. GROUP BY dersi aggregate grain'i; JOIN dersi ise 1:1 / 1:N / N:N multiplicity, zero-match LEFT JOIN davranışı, COUNT(*)/COUNT(column) farkı ve fact measure fan-out riskini görünür + edge-case fixture üzerinde kanıtlatır.


CTE/subquery production dersi query block grain, correlated EXISTS/NOT EXISTS, NULL-duyarlı anti-filter düşüncesi ve UNION/UNION ALL/EXCEPT/INTERSECT duplicate sözleşmesini aynı kompozisyon modeli altında ele alır. Semantic lab, CTE ile başlayan gerçek sorguları görünür ve edge-case fixture üzerinde sonuç eşitliğiyle değerlendirir.


Window production dersi GROUP BY ile grain farkını, PARTITION BY / window ORDER BY / ROWS-RANGE frame ayrımını, duplicate order değerlerinde peer davranışını, LAG ve ROW_NUMBER tie-break gereksinimini görünür + edge-case fixture üzerinde kanıtlatır.


Analytical patterns production dersi rolling observation windows, gaps/islands boundary logic, partition top-N ranking ve as-of time-direction sözleşmesini tek grain/order/boundary modeli altında toplar. Semantic lab aynı fixture üzerinde rolling-3, island id ve deterministic hotel ranking'i görünür + edge-case veriyle kanıtlatır.
