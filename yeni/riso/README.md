# Samsa — Riso / Letterpress Sürümü

`samsa` kişisel web sitesinin, Atölye/Tezgâh görsel kimliğindeki **Risograph ve Letterpress** baskı diliyle yeniden yorumlanmış sürümüdür.

## Tasarım Özellikleri
- **Düzen ve içerik:** Kök dizindeki `index.html` ile aynı yapı, başlık (`Osman Şahin`), alt başlık (`Yığın Değil • İşçi • Web Tasarımcı • Fani`), 5 sosyal bağlantı (VSCO, YouTube, Tezgâh, Pinterest, E-posta — üzerlerinde açılan dizgi etiketleriyle) ve altlarında `blog.sahinosman.com` adresine giden Riso/letterpress **Blog** kartı yer alır.
- **Riso ayrıştırması:** `bg.jpg` silueti ve kaya/kar katmanları 3 ayrı dikişsiz kalıba ayrılır (`14°` nokta tramı, `45°` mimari kaya taraması, `-45°` derin yarık taraması + keskin sırt konturu) ve kâğıt üstünde `multiply` üst üste baskı matematiğiyle tek senkron `<canvas>` şeridinde birleşerek 60 FPS akıcılıkla kayar; dağ yüksekliği masaüstünde butonlarla çakışmayacak biçimde pencere boyuna göre ayarlanır.
- **Tipografi:** `Bricolage Grotesque 800` (letterpress baskı + ikincil mürekkep ofset izi) ve `DM Sans` (`tokens.json` ile uyumlu).
- **Wada Sanzo paletleri (gizli kısayol):** Varsayılan **Wada 167**; arayüzde görünür palet seçici bulunmaz, klavyeden `P` tuşuna basarak veya `?palet=339` parametresiyle onaylı 10 Wada paleti arasında geçiş yapılabilir.

## Önizleme
Statik bir sitedir; hem doğrudan `index.html` açılarak (`file://`) hem de yerel HTTP sunucusuyla çalışır:

```bash
python -m http.server 8000
```
