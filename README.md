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
- SQL window-function yapı kontrolü
- 24 haftalık yol haritası
- 1.460 satırlık sentetik otel veri seti
- Kaynak ve müfredat dokümantasyonu
- Node tabanlı temel testler

## Çalıştırma

Bağımlılık gerektirmez:

```bash
python -m http.server 8080
```

Ardından:

```text
http://localhost:8080/
```

Test:

```bash
npm test
```

## Repo yapısı

- `index.html`: uygulama
- `styles.css`: responsive UI
- `app.js`: sınav ve arayüz mantığı
- `core.mjs`: saf değerlendirme fonksiyonları
- `data/question-bank.json`: 50 özgün soru
- `data/roadmap.json`: 24 haftalık plan
- `datasets/hotel_daily.csv`: sentetik otel verisi
- `docs/`: müfredat, sınav tasarımı ve kaynaklar
- `tests/`: temel testler

## Sonraki teknik dilimler

1. DuckDB-Wasm ile gerçek SQL execution engine
2. Pyodide ile tarayıcı içi Python laboratuvarı
3. Supabase ile kullanıcı, ilerleme ve sınav geçmişi
4. Soru bazlı spaced repetition
5. Qlik/Excel uygulama ödevleri ve rubric puanlama
6. Case Study motoru: SQL → Python → Excel → Qlik

İçerik üçüncü taraf eğitimlerden kopyalanmaz. Resmî dokümantasyon ve uygun lisanslı açık kaynak depolar referans olarak kullanılır; soru bankası ve vaka çalışmaları özgün hazırlanır.
