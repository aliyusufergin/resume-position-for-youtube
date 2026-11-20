# Resume Position for YouTube

Firefox eklentisi. YouTube izleme geçmişi kapalıyken de videolara kaldığın yerden devam etmeni sağlar.
Konumlar yalnızca bu tarayıcının `storage.local` alanında tutulur ve dışarı hiçbir veri gönderilmez.

## Davranış
- Konum yaklaşık 5 saniyede bir kaydedilir. Duraklatınca, sekmeden çıkınca ve başka videoya geçince de kaydedilir.
- Videoyu tekrar açınca kaldığın yerden başlar. Ekrana "Kaldığın yerden devam: 12:34" bildirimi gelir ve "Baştan başlat" düğmesiyle baştan izleyebilirsin.
- Şu durumlarda kaldığın yerden devam edilmez:
  - Linkte `t=`, `start=` veya `#t=` varsa; o zaman linkteki süre kullanılır.
  - Video bitmişse (son %5'i, 10–30 sn arası) "izlendi" olarak işaretlenir ve baştan başlar. İlk 10 saniyede kapatılan videolar hiç kaydedilmez.
- Kapsam dışı olanlar:
  - 90 saniyeden kısa videolar
  - canlı yayınlar
  - Shorts
  - fareyle üzerine gelince oynayan önizlemeler
  - YouTube Music
  - gömülü videolar
- Arama sonuçlarında, önerilerde ve kanal sayfalarında küçük resimlerin altında kehribar renkli bir ilerleme çubuğu gösterilir. Bitirdiğin videolarda çubuk tam doludur ve "✓ İzlendi" etiketi çıkar.
- İzlendi olarak işaretli bir video tekrar açılınca baştan başlar. İlk birkaç saniyede kapatırsan işaret korunur. 10 saniyeyi geçersen video yeniden "yarım" sayılır.
- Reklam oynarken konum kaydedilmez ve ileri sarma yapılmaz.
- Eklenti gizli pencerelerde çalışmaz.
- 90 gündür açılmayan videoların kayıtları silinir.

## Geliştirme
    npm test            # mantık testleri (Node)
    npx web-ext lint
    npx web-ext run --start-url https://www.youtube.com
    FIREFOX_BIN=/path/to/firefox npm run e2e   # gerçek YouTube üzerinde 17 senaryo

Mağaza sayfası: https://addons.mozilla.org/firefox/addon/resume-position-for-youtube/

Yeni sürüm yayınlamak için listelenen (listed) kanala gönderilir.
Bunun için gereken anahtarlar addons.mozilla.org > Developer Hub > Manage API Keys sayfasından alınır.

    WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... npm run sign

Her imzalamadan önce `manifest.json` içindeki `version` artırılmalı. Mağaza metinleri `amo/metadata.json` dosyasında
(`--amo-metadata amo/metadata.json` ile gönderilir). Ekran görüntüsü yüklemek için: `node amo/upload-preview.mjs amo/screenshot-1.png "caption"`.
