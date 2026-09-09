# Sektör-ülke paketleri — `paketler/`

Bir paket bir **dizindir**; ürün buradan kurar (`lib/paket/kur.ts`), yazar
buradan doğrular (`npm run paket:dogrula -- paketler/<KOD>`). Sözleşme
`docs/SEKTOR_PAKETI_SOZLESMESI.md`; biçim `lib/paket/bicim.ts`.

Paket **veri** getirir, kod getirmez. Çekirdeğe giren tek şey satırdır:
`SektorSozlugu` · `KapsamOgesiTuru` · `SektorOznitelikSemasi` · `Regulasyon` +
`FrameworkSurumu` (**taslak**) + `Madde` · `BildirimYukumlulugu` ·
`FormSablonu` · `RaporSablonu` · `RolKatalogu` (2.2–2.3; ekranlar şablonu,
çalışma zamanı yetkisi rol kataloğunu henüz okumaz — katalog öneridir).
Çerçeveyi aktifleştirmek insan kararıdır (`surumAktiflestir`); kurucu
hiçbir sürümü aktif yapmaz, hiçbir madde durumu yazmaz.

## Dosyalar

| Dosya | Biçim | Ne |
| --- | --- | --- |
| `manifest.json` | JSON | kimlik: `kod` · `ad` · `tur` (sektor · yatay · demo · uluslararasi) · `ulke` (ISO 3166-1, TR) · `sektor {kod, ad}` · `dil` · `surum` (SemVer) · `yayinci` · `lisans` · `bagimliliklar[]` · `icerikOzetleri {dosya: sha256}` · `imza?` · **`alanEslemesi?`** (aşağıda) |
| `manifest.alanEslemesi` | JSON nesne | **alan eşleme beyanı** (9 Eyl 2026, URN-PKT-022): `{ "<ÇERÇEVE KODU>": [{ kaynakAlan, urunAlani, gerekce }] }`. Madde dosyasında DOLU her sütun için bir satır: `kaynakAlan` kaynak belgedeki alanın adı (kaynakta karşılığı yoksa `null` — değeri paket yazarı atadı), `urunAlani` madde sütunlarından biri, `gerekce` (≥ 40 karakter) ürün alanının ANLAMINI anlatır — dönüşümün kolaylığını değil. Beyansız dolu sütun, ölü beyan (dosyada boş sütuna beyan), aynı ürün alanına iki beyan, temsilî çerçeveye beyan ve pakette olmayan çerçeveye beyan `ALAN EŞLEME` hatasıdır. **Kapı beyanın VARLIĞINI ölçer, doğruluğunu değil** (`docs/SEKTOR_PAKETI_SOZLESMESI.md` §1.10) |
| `sozluk.json` | JSON dizi | `anahtar · dil · tekil · cogul · iyelik · belirtme · bulunma · yonelme` — **altı hâl de zorunlu** |
| `kapsam-turleri.json` | JSON dizi | `kod` (küçük harf) · `ad` · `etiketAnahtari?` · `tesiseBagli` · `sira` |
| `oznitelikler.json` | JSON dizi | `anahtar · tip (sayi · metin · mantik · tarih) · birim? · etiketAnahtari · rol? (kapasite · kritiklik) · grup? · secenekler? · kuraldaKullanilir · sira` |
| `cerceve/<KOD>.json` | JSON | çerçeve kimliği: `uygulanabilirlik? { kapsamTurleri[] · kosul? · aciklama? }` (9 Eyl 2026: çerçeve hangi kapsam öğesi TÜRÜNE hangi koşulla asılır — kurulumda `UygulanabilirlikKurali` köken paket olur, motor ÖNERİR) · `kod · ad · surumEtiketi · yayimTarihi? · yururlukTarih? · kaynakUrl? · lisans · maddeDosyasi · zorunlulukTipi` |
| `cerceve/<KOD>.csv` | CSV (`;`, UTF-8, başlık satırı) | madde ağacı: `kod;ust_kod;baslik;metin;sira;seviye;zorunluluk_tipi;kanit_beklentisi;dis_kontrol_id;kanit_tipi` — üst madde satırı alt maddeden ÖNCE gelir; `kanit_tipi` beklenen kanıt türünün KODU (`kayit`, `konfigurasyon`, `test_kaydi`…; küçük harf, ≤ 40, metin değil — 2.5); her başlık **bir kez**, satırda başlığı aşan **dolu** hücre olamaz (okunmayan hücre içerik taşırdı — telifli metin kaçağı); tırnak kapanır (`""` kaçış); `seviye` 0–5 (ürünün olgunluk ölçeği); telifli çerçevede `kanit_beklentisi` boş, `dis_kontrol_id` ≤ 60 karakter. **Köken sütunları** (9 Eyl 2026): `kaynak_url` (resmî belge adresi) · `kaynak_yeri` (belge içi konum, ≤ 200) · `erisim_tarihi` (YYYY-AA-GG) · `yururluk_tarihi` (maddenin kendi yürürlüğü; boşsa çerçevenin). Metin taşıyan kamuya açık çerçeve YA `kaynakUrl` beyan eder (o zaman her metinli madde `kaynak_url` + `erisim_tarihi` taşımak ZORUNDA) YA `temsili: true` der (kurgusal içerik); ikisi birden olamaz. `tur: demo` paketi muaftır. **`gereksinim_tipi`**: çerçevenin KENDİ kademesi/sınıfı ("Seviye 2", "Ek Kontrol"; ≤ 60) — `seviye` sütunu ürünün HEDEF OLGUNLUĞUDUR (0–5), düzenleyicinin kademesi oraya yazılmaz |

Paket yapısında yeri olmayan dosya (hiçbir tanımlayıcının okumadığı
`cerceve/başka.csv`, `notlar.txt`…) özeti doğru olsa da **reddedilir**:
okunmayan dosya lisans kontrolünden geçmeden pakette taşınırdı. `ust_kod`
satırın kendisi olamaz.

Paket dizininin adı `manifest.kod` ile **aynı** olmalıdır
(`paketler/TR-ENERJI` ↔ `"kod": "TR-ENERJI"`); uyuşmazsa doğrulayıcı
`KİMLİK` ile reddeder — kopyalanmış bir dizin başka paketin kimliğiyle
kurulamaz.
| `yukumlulukler.json` | JSON dizi | `kod · ad · regulasyonKod? · asgariSiddet · sureSaat · dayanak · merci` |
| `form/<KOD>.json` | JSON | denetim formu şablonu: `kod · ad · tur (denetim · oz_degerlendirme · saha) · bolumler[{kod, baslik, alanlar[{anahtar, etiket ≤ 120, tip (metin · sayi · mantik · tarih · secim), secenekler?, maddeKod?, zorunlu, hucre?}]}]`; isteğe bağlı `dosya` (aynı dizinde XLSX) + `sayfa`: doğrulayıcı sayfayı ve her alanın hücresini DOSYAYA karşı okur. **Telifli pakette XLSX yasak** (hücre metni denetlenemez). Dosya adı = kod |
| `rapor/<KOD>.json` | JSON | rapor şablonu: `kod · ad · alanlar[{anahtar, etiket, kaynak (nokta yolu: madde.durum)}] · siralama (alanların permütasyonu) · kunye {baslik, altbilgi?} · sayfa {boyut A4/Letter, yon dikey/yatay}`. Dosya adı = kod |
| `cerceve/<KOD>.oscal.json` | OSCAL 1.1 katalog JSON | CSV'nin **alternatifi** (2.7): kimlikteki `maddeDosyasi` `.oscal.json` ile biter; `control` = madde (iç içe `controls` hiyerarşi), `title` başlık, `parts[statement].prose` metin, `parts[guidance].prose` kanıt beklentisi, OSCAL dışı alanlar `props` (`kod · sira · seviye · zorunluluk_tipi · dis_kontrol_id · kanit_tipi`, ad alanı `urn:uyum-platformu:paket`); `props[kod]` yoksa `id` kod olur, `groups` (İÇ İÇE de olabilir) üst madde olur; propumuz yalnız kendi ad alanımızla tanınır (ns'siz yabancı prop bizim sayılmaz). Doğrulayıcı OSCAL'ı satıra indirir ve **CSV ile aynı kuralları** uygular: telifli çerçevede metin `prose` içinden sızamaz, OKUNMAYAN `prose`/`props` alanı doluysa LİSANS, katalog `metadata.version` kimlikteki `surumEtiketi` ile uyuşmazsa KİMLİK. CSV → OSCAL: `npm run paket:dogrula -- <dizin> --oscal <çıktı>` |
| `esleme/<KOD>.json` | JSON | eşleme kimliği: `kod · ad · kaynak {cerceve, surumEtiketi} · hedef {cerceve, surumEtiketi} · lisans · eslemeDosyasi · kaynakBelge?` — çerçeveler ARASI; paket içi çerçeveye referans onun kendi sürüm etiketiyle, kurulu çerçeveye kurulu sürümün etiketiyle (yoksa kurulum KİMLİK). Dosya adı = kod |
| `esleme/<KOD>.csv` | CSV (`;`, UTF-8, başlık satırı) | `kaynak_kod;hedef_kod;denklik;aciklama` — madde kodu çerçeve önekinden sonraki kısım (`EPDK-SGYM-3` → `3`); `denklik` `tam · kismi · ilgili`; her çift bir kez; tekrar başlık ve başlığı aşan dolu hücre lisans kontrolünden ÖNCE reddedilir; `aciklama` ≤ 200 karakter ve yalnız `lisans.metinDahil=true` iken, telifli olmayan pakette ve telifli olmayan çerçevelere karşı dolabilir. Yalnız eşleme taşıyan paket `yatay` olabilir |
| `roller.json` | JSON dizi | rol önerisi: `kod (küçük harf) · ad · aciklama? · izinler {modül: [okuma · yazma · onay]} · kapsamEkseni (global · kapsamOgesi) · sira` — modül adları `uyum · envanter · risk · denetim · proje · tanimlar · yonetim`; çekirdek rol kodu (`yonetici`, `denetim_sorumlusu`, `tesis_yoneticisi`, `bt_yoneticisi`, `ot_yoneticisi`, `risk_sahibi`, `katkici`, `dis_denetci`, `okuyucu`) yeniden tanımlanamaz; `onay` `yazma` ister, `yazma` `okuma` ister. **Çalışma zamanı yetkisi kataloğu okumaz**: paket önerir, kiracı karar verir |

## Lisans sınırı — alanda, yorumda değil

`lisans.tur = kamuya_acik` → tam metin girebilir (`metinDahil: true`) ya da
iskelet kalır (`metinDahil: false`, metin sütunu boş → kurulumda
`"metin paketle gelmedi"`). `lisans.tur = telifli` (ISO, IEC, PCI, COBIT) →
**yalnız yapı ve kimlikler**: `metinDahil` false, metin sütunu boş, başlık
≤ 120 karakter; kurulumda `Madde.metin = "lisans nedeniyle girilmedi"`.
Doğrulayıcı aksini **reddeder** (`LİSANS`).

## Özetler

`icerikOzetleri` her içerik dosyasının sha256'sını taşır. Dosyayı
değiştirdiyseniz: `npm run paket:dogrula -- paketler/<KOD> --ozet-yaz`.
Uyuşmayan özet, listede olmayan dosya ve eksik dosya üçü de reddedilir —
"elle bir satır değişti" hâliyle paket kurulamaz.

## Köken ve ezmeme

Kurucunun yazdığı her satır `koken = paket` ve `paketSurumId` taşır. Paket
güncellemesi yalnız kendi (`paket`) satırlarını değiştirir; aynı anahtarda
`kiraci` satırı varsa DOKUNULMAZ ve kurulum raporuna "çelişki" düşer.
Kaldırma = arşiv: hiçbir satır silinmez.

**Kurulu sürüm değişmez.** Aynı `surum` numarasıyla içeriği ya da
değişmez üstverisi (`kod · tur · ulke · sektor · dil · yayinci · lisans ·
bagimliliklar · icerikOzetleri`) değişmiş bir paket reddedilir: "o sürümde
ne vardı" izi kalıcıdır; `ad` ve `aciklama` aynı sürümde değişebilir.
İçerik değiştiyse `manifest.surum` yükseltilir (yama = metin / çeviri,
minör = ekleme, majör = kaldırma / kod değişimi). Aynı içerikle yeniden
kurulum idempotenttir ve madde ağacına dokunmaz (kimlikler, kiracının
hedef olgunluk gibi düzenlemeleri korunur). Tarihler takvimde var olmalıdır
(`2025-02-30` reddedilir). Sektörsüz paket (`sektor: null`) sözlük ve
öznitelik beyan edemez.

**Kiracı dokunduysa yenileme yok.** Yeni paket sürümü aynı çerçeve
etiketini yenilerken taslağın maddesine kiracı bir şey bağlamışsa (kapsam
alanı, durum, eşleme, istisna, proje, risk, denetim kapsamı, belge, eğitim)
**ya da maddeyi düzenlemişse** (denetim izinde `Madde` kaydı — hedef
olgunluk gibi) yenileme reddedilir; paket yeni bir `surumEtiketi` verir.
Paketin KENDİ eşlemesi bağ sayılmaz (yeniden yazılır); kiracının ve başka
paketin eşlemesi sayılır.

**Kaldırma ve geri kurulum.** Kurulu başka bir paket bu pakete bağımlıysa
kaldırma reddedilir (önce bağımlı kaldırılır). Kaldırılan paket aynı
içerikle geri kurulunca arşivdeki kendi taslağı taslağa döner; yeni etiket
istenmez.

**Yükseltme uzlaştırması.** Yeni sürümün artık beyan etmediği paket
kökenli tür, yükümlülük, sözlük satırı, öznitelik, form/rapor şablonu,
rol önerisi ve eşleme `aktif=false` olur,
paketin kendi taslak çerçeve sürümü `arsiv`e çekilir — hiçbiri silinmez
(R-C). Pasifleşen sözlük/öznitelik anahtarları kurulum raporunda
`pasifAnahtarlar` altında listelenir; ekran pasif sözcüğü söylemez, pasif
özniteliği çizmez, pasif özniteliğe değer yazılamaz. Kaldırma paketin tüm
satırlarını pasifler; aynı içerikle geri kurulum aktifler. Kurulum/arşiv
ile iz kaydı aynı transaction'dadır: iz yazılamazsa işlem de geri alınır.

## Buradaki paketler

| Paket | Durum | İçerik |
| --- | --- | --- |
| `TR-ENERJI` | **içerikli** (0.2.0) | sözlük (tohumla birebir), `kontrol_sistemi` türü, 12 öznitelik, `EPDK-SGYM` yönetmeliği (4 bölüm + 18 madde + 1 geçici madde, **tam metin**), `EPDK-SGYM-EK3` (13 aile + 565 kontrol, **tam metin**; 57 "Ek Kontrol" seviyesiz ve `OPTIONAL`), `EPDK-SGYM-KARNE` rapor şablonu, 2 rol önerisi. Metin EPDK resmî sitesinden (birincil kaynak) 9 Eyl 2026'da alındı; her metinli maddede kaynak adresi, belge içi konum ve erişim tarihi durur. İki çerçeve de uygulanabilirlik beyan eder. Dayanak: 5846 s. FSEK md. 31 |
| `DEMO-TR-ORTAK` | **demo tohumu** (0.1.0, `yatay`) | sektör üstü üç çerçeve: `CBDDO` (4 temsilî madde, metinli), `ISO-27001` (**telifli** — 4 madde yalnız kimlik + başlık + kanıt tipi; tohumdaki 4 kısa açıklama metni bilinçli düşürüldü), `SPK-BS` (3); iki çerçeve arası 2 denklik. Kurgusal kiracılar bu paketi paylaşır |
| `DEMO-TR-ENERJI` | **demo tohumu** (0.1.0, `demo`, `DEMO-TR-ORTAK`a bağımlı) | enerji sözlüğü (13 — `prisma/sozlukler.ts` ile birebir), öznitelik şeması (9: `kuruluGuc` + 8 profil), `EPDK-SYM` **demo** çerçevesi (5 aile, 27 madde; kodlar ve metinler kurgusal, gerçek yönetmelik `TR-ENERJI/cerceve/EPDK-SGYM*`), EPDK → ortak çerçeve 6 denklik. Tesisler, tipler, süreçler, bulgular tohumda (P8) |
| `DEMO-TR-SU` | **demo tohumu** (0.1.0, `demo`, `DEMO-TR-ORTAK`a bağımlı) | su sözlüğü (5), öznitelik şeması (1: `gunlukDebi`, m³/gün); çerçeveler ortak paketten |
| `TR-BANKACILIK` | **iskelet** (0.1.0) | 4 kapsam öğesi türü, 7 öznitelik, `BDDK-BS` yapısı (4 kısım, 7 bölüm, 47 madde numarası), `BDDK-BS-OZDEGERLENDIRME` form şablonu (JSON yapı), 3 rol önerisi — başlıklar birincil metin erişilince; **madde metni yok** |

**Tohum bu paketlerden kurulur (2.5).** `prisma/seed.ts` sözlük, öznitelik
şeması, çerçeve ve denklikleri `DEMO-TR-*` dizinlerinden `paketiKur` ile
kurar, ilk kurulumun sürümlerini aktif yapar (tohumu kuran yönetici) ve
kiracı katmanını (BT/OT kapsam alanı eşlemesi, aile adı, tesisler, tipler,
süreçler, durumlar, bulgular) üstüne yazar. Ölçüm: `docs/P4_TOHUM_TASIMA_OLCUMU.md` §4.

İskeletlerde eşleme dosyası **yok**: iki çerçeve arasında denklik iddiası
madde metni gibi içerik işidir, uydurulmaz (biçim `tests/paket-esleme.test.ts`
ile sentetik paketlerde ölçülür).

Madde metni aktarımı **içerik işidir** (`docs/TR_SEKTOR_PAKETLERI.md` §4);
telifli çerçeve metni depoya girmez; Türkçe SCF dağıtımına bağlı hiçbir
şey inşa edilmez (hukuki görüş bekleniyor — `docs/ICERIK_OMURGASI_KARARI.md`).
