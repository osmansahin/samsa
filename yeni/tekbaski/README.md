# Samsa — Tek Baskı

Künyedeki dört kelime tasarımın şartnamesidir:

- **Yığın Değil:** Her ziyaret 1/1 tek baskıdır. Dağ panoramasından (`bg.jpg` ayrıştırması) rastgele bir kesit basılır. Gök, ziyaretçinin saatine göre çizilir: şafak, sabah, öğle, ikindi, akşam, gece; gece ay o günün gerçek evresiyle çıkar. Üç kalıp kâğıda her seferinde biraz farklı oturur (kayıt kayması). Mürekkep de bir önceki ziyaretten farklı seçilir.
- **İşçi:** Üç merdane sırayla geçer (açık → vurgu → anahtar). "Yeni baskı çek" (`B`) ya da mürekkep seçimi (`P`) yeni bir baskı çeker; eski baskılar tezgâhta altta birikir.
- **Web Tasarımcı:** Kâğıttaki program satırları gerçek bağlantılardır (Blog, Tezgâh, YouTube, VSCO, Pinterest, GitHub, E-posta).
- **Fani:** Baskı ~25 dakikada sararır, mürekkebi solar. İş fişindeki "Yaş" satırı bunu sayar.

Kâğıt payında kurşun kalemle baskı notu yazar: `1/1 · Dağ, akşam — 15.XI.2026 · O. Şahin`. Tarayıcıda `Ctrl+P` ile baskı A4'e temiz çıkar.

## Önizleme parametreleri
- `?palet=339` — mürekkep (339, 167, 341, 279, 166, 345)
- `?saat=22` — göğü başka bir saate kurar (`?saat=18.5` = 18:30)
- `?yas=hizli` — eskime 25 dakika yerine 1 dakikada olur

## Dosyalar
- `tekbaski.js`: baskı motoru (kalıpları canvas'a çizme, merdane, yığın, iş fişi, Gregor)
- `main.css`: tezgâh, kâğıt, kalıp katmanları. Baskı içi ölçüler `cqi` (kâğıt genişliği) cinsindendir.
- `mountain-data.js`: riso sürümüyle aynı dağ maskesi

Tezgâhın alt kenarından arada bir Gregor geçer. Sırtında elma vardır.
