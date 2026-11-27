# Resume Position for YouTube

[English](README.md) · [Firefox eklenti mağazası](https://addons.mozilla.org/firefox/addon/resume-position-for-youtube/)

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
- Arayüz dilleri: İngilizce, Türkçe, Almanca, Fransızca, İspanyolca, Portekizce, Rusça (tarayıcı diline göre).
- 90 gündür açılmayan videoların kayıtları silinir.

## Ayarlar
Araç çubuğundaki eklenti düğmesi ya da about:addons → eklenti → Seçenekler (yeni sekmede açılır). Değişiklikler hemen uygulanır; yukarıdaki süreler varsayılanlardır.
- Konumları sakla: 30 gün, 90 gün, 6 ay, 1 yıl, süresiz. Kısaltınca eski kayıtlar onay alınarak hemen silinir.
- Hatırlanacak en kısa video: 1, 1,5, 3, 5, 10 dk.
- İzlendi sayılsın: otomatik (son %5, 10–30 sn) ya da sona 10 sn, 30 sn, 1 dk, 2 dk kala. Sabit değer videonun en fazla beşte biri kadar olabilir.
- Devam bildirimi açık/kapalı; küçük resim işaretleri açık/kapalı ve çubuk rengi.
- Kayıt sayısı, yedeği indir (JSON), yedekten geri yükle (her video için daha yeni kayıt kazanır, ayarlar da alınır), tümünü sil.
- Videolar listesi: başlık ve kanal adıyla, en son izlenen üstte; arama, videoyu açma ve tek tek silme (geri alınabilir). Başlık ve kanal adı 1.3.0'dan itibaren kaydedilir; daha eski kayıtlarda video tekrar izlenince görünür.

## Geliştirme
    npm test            # mantık testleri (Node)
    npx web-ext lint
    npx web-ext run --start-url https://www.youtube.com
    FIREFOX_BIN=/path/to/firefox npm run e2e   # gerçek YouTube üzerinde 17 senaryo
    npm run build:chrome                       # Chrome paketi: dist/chrome/ ve web-ext-artifacts/ içinde zip
    CHROME_BIN=/path/to/chrome npm run e2e     # aynı 17 senaryo Chrome'da (dist/chrome'u dener)

Chrome sürümü aynı kaynaktan üretilir; Chrome'a özgü dosyalar ve mağaza metni `chrome/` klasöründe.

Mağaza sayfası: https://addons.mozilla.org/firefox/addon/resume-position-for-youtube/

Yeni sürüm yayınlamak için listelenen (listed) kanala gönderilir.
Bunun için gereken anahtarlar addons.mozilla.org > Developer Hub > Manage API Keys sayfasından alınır.

    WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... npm run sign

Her imzalamadan önce `manifest.json` içindeki `version` artırılmalı. Mağaza metinleri `amo/metadata.json` dosyasında
(sürüm notları `--amo-metadata amo/metadata.json` ile gider; özet ve açıklama için `node amo/listing.mjs meta`).
Ekran görüntüleri: `node amo/listing.mjs info | add-preview <png> <sıra> [en] [tr] | delete-preview <id>`.
