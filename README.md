# Data Analyst Learning OS

Sıfır önkoşulla başlayabilen, fakat hızlı kavrayan öğrenciyi gereksiz tekrarlarla yavaşlatmayan; SQL, Qlik Sense, Python, Excel, HTML/Web Foundations ve Technical English'i tek mastery sistemi altında birleştiren veri analisti akademisi.

## Academy kernel v0.4

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
- 1.460 satırlık sentetik hotel dataset
- gerçek Chromium smoke test
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
- `scripts/validate-academy.mjs`: broken/circular prerequisite ve content gate\n- `scripts/validate-screening.mjs`: domain/topic coverage, duplicate ve answer-integrity gate
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
