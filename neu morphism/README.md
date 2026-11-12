# Samsa — Neumorphism / Soft UI Sürümü

`samsa` kişisel web sitesinin, **Neumorphism (Soft UI)** tasarım diliyle yeniden yorumlanmış bağımsız statik sürümüdür.

## Tasarım Özellikleri
- **Tek malzeme yüzeyi:** Tüm sayfa, mat Toz Taşı seramiği (`#DDE3EA`) tekil yüzeyinden sol-üstten (`135°`) aydınlatılarak yükselmiş veya oyulmuş gibi modellenmiştir.
- **Kabartma dağ panoraması & ışık düzlemleri:** `mountain-data.js` verisindeki 3 kaya/kar kanalı bilineer yükseklik alanı gradyanıyla oyulmuş bas-relief kabartmaya dönüştürülür ve tek `<canvas>` şeridi üzerinde 60 FPS akıcılıkla kayar; 3 çapraz ışık bandı yumuşak pah düzlemleri olarak çizilir.
- **Sosyal daireler & dizgi kapsülleri:** 5 sosyal bağlantı dışbükey yumuşak diskler olarak yer alır; tıklandığında (`:active`) içbükey yuvaya çöker, `hover`/`focus` sırasında altında kapsül etiket (`.seal-label`: VSCO, YouTube, Tezgâh, Pinterest, E-posta) açılır.
- **Ayrı `Blog` tuşu:** Sosyal dairelerin altında içbükey bir yuvaya oturan çıkık dikdörtgen dokunsal tuş olarak `https://blog.sahinosman.com` adresine bağlanır.

## Önizleme
Statik bir sitedir; hem `file://` ile hem de yerel HTTP sunucusuyla çalışır:

```bash
py -3 -m http.server 8771
```
