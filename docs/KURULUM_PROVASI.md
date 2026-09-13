# Kurulum provası — bir müşteri mühendisinin yolu

**Ne yapıldı:** temiz bir ortamda, `docs/KURULUM.md` **harfiyen** izlenerek
sıfırdan kurulum yapıldı ve ardından uçtan uca müşteri yolu yürütüldü.
Belgede yazmayan hiçbir adım kendiliğinden eklenmedi; **eklemek zorunda
kalınan her adım belgenin kusuru olarak yazıldı.**

**Neden:** bugüne kadar `kapi-compose` koştu ve yeşildi. Ama o kapı
kuruluma **kendi fikstürünü tohumlar** — yani kurulumu bir kullanıcı ve
veri KOYARAK ölçer. Müşteri mühendisinin yolunu, belgeyi eline alıp
sıfırdan yürüyen birini, hiçbir kapı sürmemişti.

Ölçüm tarihi: **10 Eylül 2026**. Ortam: Linux, Docker Engine 29.3.1,
Docker Compose v5.1.1 — belgedeki `## 0` tablosuyla aynı sürümler.
Kaynak: `origin/main` @ `e4a6350` klonu (ayrı dizin, ayrı compose projesi).

---

## 1 · Adım adım ölçüm

Süreler duvar saatidir. "Tıklama" sayısı gerçek tarayıcıda (Chromium,
1440×900) sayıldı; sayfa hatası (`pageerror`) her adımda izlendi.

| # | Adım | Süre | Tıklama | Sonuç |
| --- | --- | --- | --- | --- |
| 1.1 | `git clone` | 10 sn | — | ok |
| 1.2 | `cp ornek.env .env` + iki zorunlu değeri doldur | < 1 dk | — | ok · `ornek.env` hangi satırın zorunlu olduğunu satır satır söylüyor |
| 2 | `docker compose up -d --build` (temiz önbellek) | **4 dk 11 sn** | — | ok · iki kapsayıcı da `healthy`; imaj **2,47 GB** |
| 3 | `curl … /api/v1/health \| jq` | **61 ms** | — | ok · `saglayici: postgresql`, üç bağımlılık da sağlıklı; **174 tablo** göç etti |
| 3 | `?kip=canli` (liveness) | < 50 ms | — | ok |
| — | **`/` açıldı** | — | — | **TAKILDI · KUSUR 1** — `/giris`e düşüyor, `Kullanici` tablosunda **0 satır**, belgede ilk kullanıcı adımı YOK |
| 4 | `arac/kurucu-hesap.ts` ile kurucu hesap (bu turda YAZILDI) | **2 sn** | — | ok · ikinci koşu reddedildi ve **hiçbir şey yazmadı** |
| c | Giriş | **0,6 sn** | 2 | ok |
| a | `/paketler` → TR-ENERJI satırı → **KUR** | **2,1 sn** | 2 | ok · sözlük 17 · öznitelik 12 · **8 çerçeve · 3 803 madde** · form 1 · rapor 1 · rol 2 |
| b | `/regulasyonlar` (kurulum sonrası) | — | — | **TAKILDI · KUSUR 3** — sekiz çerçevenin sekizi de "KATALOG BOŞ · henüz yüklenmedi" diyordu; 3 803 madde TASLAKTA duruyordu |
| b | `/regulasyonlar` → **Yürürlüğe alma kararını aç** → EK-3'ü yürürlüğe al | **4,1 sn** | 3 | ok (düzeltmeden sonra) · EK-3 **0 → 578 madde** |
| c | `/yetkiler` → ikinci kullanıcı | — | 1 | ölçülemedi — sürücü betiğinin alan seçicisi tutmadı (ürün kusuru DEĞİL; bkz. §3 not) |
| d | `/tesisler` (0 tesis) | 0,7 sn | 0 | **KUSUR 5** — boş durum tesisin nerede açıldığını SÖYLEMİYOR |
| d | `/yonetim-tezgahi` (tesis burada açılır) | 1,1 sn | 0 | ok · 9 grup · 122 modül |
| e | `/uyum` | 1,1 sn | 0 | ok · aktif çerçeve görünüyor; "Bu çerçevede uygulanabilir kontrol bulunmuyor · 0 kapsam içi hücre" — **kapsam öğesi yokken doğru cümle** |
| f | `/raporlar/denetim-formlari` | 1,0 sn | 0 | ok · "önce bir çerçeve kurulmalı ve kapsam tanımlanmalı" — yolu SÖYLÜYOR |
| g | `yedek.mjs --al` | **1 sn** | — | ok · içerik özeti `814dced31383d415` · kullanıcı 1 · iz kaydı 12 |
| g | `yedek.mjs --karsilastir` | **1 sn** | — | ok · **SONUÇ: SAĞLAM** |

**Kurulumdan ilk ekrana:** `up -d --build` 4 dk 11 sn + kurucu hesap 2 sn
+ giriş 0,6 sn ≈ **4 dk 14 sn**, **2 tıklama**.
**Girişten kurulu ve yürürlükte bir çerçeveye:** 6,2 sn, **5 tıklama**.

Sayfa hatası (`pageerror`) toplamı: **0**.

---

## 2 · `KURULUM.md`'de bulunan kusurlar — **7**

| # | Kusur | Sınıf | Ne yapıldı |
| --- | --- | --- | --- |
| 1 | **İlk kullanıcı adımı YOK.** Kurulum ayağa kalkıyor, giriş ekranı parola istiyor, `Kullanici` tablosu boş, hiçbir yerde hesabın nasıl açılacağı yazmıyor — **ürün kuruluyor ve içine girilemiyor** | **P1 · yol kesiliyor** | Araç YAZILDI (`web/arac/kurucu-hesap.ts`), belgeye **§4** eklendi |
| 2 | §5 "paket `/paketler` ekranından kurulur" diyor; kurma eylemi **satır çekmecesinde**, tabloda değil | P3 · yol uzuyor | §5'e "paket satırına tıklayın, çekmecedeki KUR" cümlesi eklendi |
| 3 | Belge §5 "kurulan çerçeve TASLAK gelir, aktifleştirme Regülasyonlar ekranında" diyor; **ekran bunu yalanlıyordu** ("katalog henüz yüklenmedi" + yanlış eylem) | **P1 · ürün kusuru** | Ekran DÜZELTİLDİ (`katalogBoslugu`), ölçümü `tests/regulasyon-katalog-boslugu.test.ts` |
| 4 | Ölçüm kaydında imaj **2,37 GB** yazıyordu; ölçülen **2,47 GB** | P3 · bayat sayı | Düzeltildi, tarih damgalandı |
| 5 | Ölçüm kaydında **158 tablo** yazıyordu; ölçülen **174** | P3 · bayat sayı | Düzeltildi, tarih damgalandı |
| 6 | §3 `jq` kullanıyor; ön koşul tablosunda `jq` (ve `curl`) YOKTU | P3 | Ön koşullara eklendi |
| 7 | `up -d --build` süresi hiç yazmıyordu — operatör ne kadar bekleyeceğini bilmiyordu | P3 | **4 dk 11 sn** olarak yazıldı |

---

## 3 · Üründe bulunan kusurlar

**KUSUR 1 · İlk kullanıcı yoktu (P1, düzeltildi).**
`web/arac/kurucu-hesap.ts` yazıldı. Değişmezleri:
yalnız **BOŞ** kurulumda çalışır (aksi hâlde kalıcı bir arka kapı olurdu) ·
parola **argümandan alınmaz** (`ps` ve kabuk geçmişi) · parola, uzunluğu
ya da özeti **denetim izine girmez** · kullanıcı + yetki + iz **tek
transaction**. Ölçümü: `web/tests/kurucu-hesap.test.ts` (9 vaka), ayrıca
**gerçek kurulumda** koşturuldu.

Test yazılırken aracın `tsx` altında **hiç açılmadığı** ortaya çıktı
(`ERR_REQUIRE_ASYNC_MODULE` — üst düzey `await`). Kusur yalnız SÜRECİ
ÇAĞIRAN vaka ile göründü; kütüphane yolunu süren vakalar yeşildi.

**KUSUR 3 · Regülasyonlar ekranı yüklü kataloğu "yüklenmedi" diyordu
(P1, düzeltildi).** Maddeleri yalnız AKTİF sürümden saymak doğrudur ve
değişmedi; kusur, sayı sıfır çıkınca söylenen CÜMLEDEYDİ. Bugün üç hâl
ayrı: sürüm yok → "henüz yüklenmedi" · taslakta madde var → "**YÜKLÜ: N
madde … aktifleştirme bekliyor**" + kararı açan düğme · sürüm var maddesi
yok → "sürüm açılmış ama içinde madde yok".

**KUSUR 5 · `/tesisler` boş durumu yolu göstermiyor (P3, DÜZELTİLMEDİ).**
Tesis `/yonetim-tezgahi`nde açılıyor; `/tesisler` bunu söylemiyor.
Sahibi: KODLAYAN. Kapanış aşaması: **ilk müşteri kurulumu öncesi UX
turu**. R0 kütüğüne işlendi.

**Not (c adımı).** İkinci kullanıcı yaratma adımı ölçülemedi: sürücü
betiğinin alan seçicisi tutmadı. Bunun ürün kusuru OLMADIĞI ayrıca
doğrulandı — düğme kaynakta `<button>… + Yeni kullanıcı</button>` olarak
duruyor. İlk denemede seçici `/YENİ KULLANICI/i` idi ve **JavaScript'in
`i` bayrağı Türkçe `İ`'yi `i`'ye eşlemiyor**; bu, deponun `\w` bulgusuyla
aynı sınıftır (`arac/politika-kutugu.mjs`). Adım **ÖLÇÜLMEDİ** diye
işaretlidir; sahibi KODLAYAN, kapanış aşaması ilk müşteri kurulumu
öncesi UX turu.

---

## 4 · Ölçülmeyenler

| Ne | Neden | Sahip · kapanış |
| --- | --- | --- |
| Uygulama rolünün tablo sahibinden ayrılması (`KURULUM.md` §4b) | bu kurulumda koşturulmadı | KODLAYAN · ilk müşteri kurulumu |
| Kapalı ağda `docker save`/`load` | bu ortamda ağ kapatılmadı | KODLAYAN · ilk müşteri kurulumu |
| İkinci kullanıcı + rol ataması (c adımı) | sürücü betiği seçici kusuru | KODLAYAN · ilk müşteri kurulumu öncesi UX turu |
| Kapsam öğesi + tesis kaydı (d adımı) ve ardından `/uyum` hücre üretimi | c adımına bağlı | KODLAYAN · ilk müşteri kurulumu öncesi UX turu |

**"Ölçülmedi" ile "çalışmıyor" aynı şey değildir** ve bu tablo tam olarak
bunun için var: yukarıdaki dört satır denenmedi, başarısız olmadı.

---

## 5 · Provanın kendi dersi

Kapılar kuruluma **veri koyarak** ölçüyordu; müşteri mühendisi kuruluma
**hiçbir şey koymadan** geliyor. İki kusur da (giriş yapılamayan kurulum,
yüklü kataloğu "yok" diyen ekran) tam bu farkta yaşıyordu ve ikisi de
32 kapının hiçbirinde görünmüyordu — çünkü hepsi tohumlanmış bir
kurulumu ölçüyor.

Kapı eklemek bu turda yapılmadı; yapılsaydı ölçeceği şey "boş kurulumda
müşteri yolu"dur ve girdisi bu belgedeki adım listesidir.
