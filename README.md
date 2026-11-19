# Resume Position for YouTube

Firefox eklentisi. YouTube izleme geçmişi kapalıyken de videolara kaldığın yerden devam etmeni sağlar.
Konumlar yalnızca bu tarayıcının `storage.local` alanında tutulur ve dışarı hiçbir veri gönderilmez.

## Davranış
- Konum yaklaşık 5 saniyede bir kaydedilir. Duraklatınca, sekmeden çıkınca ve başka videoya geçince de kaydedilir.
- Videoyu tekrar açınca kaldığın yerden başlar. Ekrana "Kaldığın yerden devam: 12:34" bildirimi gelir ve "Baştan başlat" düğmesiyle baştan izleyebilirsin.
- Şu durumlarda kaldığın yerden devam edilmez:
  - Linkte `t=`, `start=` veya `#t=` varsa; o zaman linkteki süre kullanılır.
  - Video bitmişse (son %5'i, 10–30 sn arası) ya da ilk 10 saniyede kapatılmışsa video baştan başlar.
- Kapsam dışı olanlar:
  - 90 saniyeden kısa videolar
  - canlı yayınlar
  - Shorts
  - fareyle üzerine gelince oynayan önizlemeler
  - YouTube Music
  - gömülü videolar
- Reklam oynarken konum kaydedilmez ve ileri sarma yapılmaz.
- Eklenti gizli pencerelerde çalışmaz.
- 90 gündür açılmayan videoların kayıtları silinir.

## Geliştirme
    npm test            # mantık testleri (Node)
    npx web-ext lint
    npx web-ext run --start-url https://www.youtube.com

Kalıcı kurulum için önce AMO'da listelenmeyen (unlisted) imza alınır.
Bunun için gereken anahtarlar addons.mozilla.org > Developer Hub > Manage API Keys sayfasından alınır.

    WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... npm run sign

Her imzalamadan önce `manifest.json` içindeki `version` artırılmalı.
