# Data Analyst Learning OS

Kişisel, iki dilli (TR/EN), sınav ve proje odaklı ileri veri analizi öğrenme sistemi.

## Hedef

Dört teknik alanı birbirinden kopuk kurslar halinde değil, tek bir analist akışında geliştirmek:

- SQL Server / T-SQL
- Qlik Sense
- Python for Data Analysis
- Advanced Excel
- Technical English

## MVP özellikleri

- 50 soruluk başlangıç soru bankası
- Her alandan 5 soru seçen 25 soruluk seviye tespit sınavı
- L1–L5 yerleştirme
- TR / EN arayüz
- DuckDB-Wasm ile tarayıcı içinde gerçek SQL execution
- `hotel_daily.csv` üzerinde çalışan Window Function laboratuvarı
- Tek statement ve read-only SQL sandbox kuralı
- 24 haftalık yol haritası
- 1.460 satırlık sentetik otel veri seti
- Kaynak ve müfredat dokümantasyonu
- Core + gerçek Chromium browser smoke testleri

## Çalıştırma

Statik sunucu yeterlidir:

```bash
python -m http.server 8080
```

Ardından:

```text
http://localhost:8080/
```

SQL Lab, DuckDB-Wasm'ın sabitlenmiş CDN sürümünü ilk sorguda yükler. CSV aynı origin'den tarayıcı belleğine alınır ve DuckDB içinde `hotel_daily` tablosuna aktarılır.

## Test

Core:

```bash
npm install
npm test
```

Browser smoke testi için Chromium kurulmalıdır:

```bash
npx playwright install chromium
python -m http.server 4173
npm run test:browser
```

GitHub Actions bu akışı otomatik olarak çalıştırır.

## Repo yapısı

- `index.html`: uygulama ve import map
- `styles.css`: responsive UI
- `app.js`: sınav, dil ve SQL Lab arayüz mantığı
- `duckdb-lab.mjs`: DuckDB-Wasm başlatma, CSV ingestion ve query execution
- `core.mjs`: saf değerlendirme fonksiyonları
- `data/question-bank.json`: 50 özgün soru
- `data/roadmap.json`: 24 haftalık plan
- `datasets/hotel_daily.csv`: sentetik otel verisi
- `docs/`: müfredat, sınav tasarımı ve kaynaklar
- `tests/`: core ve browser smoke testleri

## Sonraki teknik dilimler

1. SQL soru motorunda beklenen sonuç/rubric kontrolü
2. Pyodide ile tarayıcı içi Python laboratuvarı
3. Supabase ile kullanıcı, ilerleme ve sınav geçmişi
4. Soru bazlı spaced repetition
5. Qlik/Excel uygulama ödevleri ve rubric puanlama
6. Case Study motoru: SQL → Python → Excel → Qlik

İçerik üçüncü taraf eğitimlerden kopyalanmaz. Resmî dokümantasyon ve uygun lisanslı açık kaynak depolar referans olarak kullanılır; soru bankası ve vaka çalışmaları özgün hazırlanır.
