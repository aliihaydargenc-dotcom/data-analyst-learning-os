# Assessment & Mastery Blueprint

Mevcut 25 soruluk MCQ ekranı yalnızca hızlı ön taramadır; nihai placement değildir.

Tam placement ve mastery dört ana katmanda ölçülür: Knowledge, Interpretation, Production ve Transfer. Kritik objective'lerde Retention ayrı gate'tir. L4+ için debugging/design evidence, L5+ için production rubric gerekir.

Başlangıç ağırlıkları:
- Knowledge %15
- Interpretation %20
- Production %35
- Transfer %30

Ancak yalnızca ağırlıklı ortalama geçiş sağlamaz. Seviye bazlı minimumlar `content/mastery-policy.json` ve `mastery-engine.mjs` içinde executable policy olarak tutulur.

Retention başlangıç scheduler'ı D+1, D+3, D+7, D+14, D+30; kritik objective'lerde gerekirse D+60 kullanır. Başarısız retrieval sonrası interval yeniden kısalır.

Assessment türleri: MCQ, output prediction, code completion, independent SQL/Python production, debugging, hidden fixture, Qlik/Excel artifact, technical memo, architecture defence ve capstone.

SQL/Python grader mümkün olduğunda cevap metnini değil semantik sonucu ve hidden fixture davranışını değerlendirmelidir.
