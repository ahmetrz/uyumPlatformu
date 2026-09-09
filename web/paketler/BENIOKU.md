# Sektör-ülke paketleri — `paketler/`

Bir paket bir **dizindir**; ürün buradan kurar (`lib/paket/kur.ts`), yazar
buradan doğrular (`npm run paket:dogrula -- paketler/<KOD>`). Sözleşme
`docs/SEKTOR_PAKETI_SOZLESMESI.md`; biçim `lib/paket/bicim.ts`.

Paket **veri** getirir, kod getirmez. Çekirdeğe giren tek şey satırdır:
`SektorSozlugu` · `KapsamOgesiTuru` · `SektorOznitelikSemasi` · `Regulasyon` +
`FrameworkSurumu` (**taslak**) + `Madde` · `BildirimYukumlulugu`. Çerçeveyi
aktifleştirmek insan kararıdır (`surumAktiflestir`); kurucu hiçbir sürümü
aktif yapmaz, hiçbir madde durumu yazmaz.

## Dosyalar

| Dosya | Biçim | Ne |
| --- | --- | --- |
| `manifest.json` | JSON | kimlik: `kod` · `ad` · `tur` (sektor · yatay · demo · uluslararasi) · `ulke` (ISO 3166-1, TR) · `sektor {kod, ad}` · `dil` · `surum` (SemVer) · `yayinci` · `lisans` · `bagimliliklar[]` · `icerikOzetleri {dosya: sha256}` · `imza?` |
| `sozluk.json` | JSON dizi | `anahtar · dil · tekil · cogul · iyelik · belirtme · bulunma · yonelme` — **altı hâl de zorunlu** |
| `kapsam-turleri.json` | JSON dizi | `kod` (küçük harf) · `ad` · `etiketAnahtari?` · `tesiseBagli` · `sira` |
| `oznitelikler.json` | JSON dizi | `anahtar · tip (sayi · metin · mantik · tarih) · birim? · etiketAnahtari · rol? (kapasite · kritiklik) · grup? · secenekler? · kuraldaKullanilir · sira` |
| `cerceve/<KOD>.json` | JSON | çerçeve kimliği: `kod · ad · surumEtiketi · yayimTarihi? · yururlukTarih? · kaynakUrl? · lisans · maddeDosyasi · zorunlulukTipi` |
| `cerceve/<KOD>.csv` | CSV (`;`, UTF-8, başlık satırı) | madde ağacı: `kod;ust_kod;baslik;metin;sira;seviye;zorunluluk_tipi;kanit_beklentisi;dis_kontrol_id` — üst madde satırı alt maddeden ÖNCE gelir; her başlık **bir kez**, satırda başlığı aşan **dolu** hücre olamaz (okunmayan hücre içerik taşırdı — telifli metin kaçağı); tırnak kapanır (`""` kaçış); `seviye` 0–5 (ürünün olgunluk ölçeği); telifli çerçevede `kanit_beklentisi` boş, `dis_kontrol_id` ≤ 60 karakter |

Paket dizininin adı `manifest.kod` ile **aynı** olmalıdır
(`paketler/TR-ENERJI` ↔ `"kod": "TR-ENERJI"`); uyuşmazsa doğrulayıcı
`KİMLİK` ile reddeder — kopyalanmış bir dizin başka paketin kimliğiyle
kurulamaz.
| `yukumlulukler.json` | JSON dizi | `kod · ad · regulasyonKod? · asgariSiddet · sureSaat · dayanak · merci` |

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

**Kurulu sürüm değişmez.** Aynı `surum` numarasıyla içeriği değişmiş bir
paket (özetler yeniden yazılmış) reddedilir: "o sürümde ne vardı" izi
kalıcıdır. İçerik değiştiyse `manifest.surum` yükseltilir (yama = metin /
çeviri, minör = ekleme, majör = kaldırma / kod değişimi). Aynı içerikle
yeniden kurulum idempotenttir. Tarihler takvimde var olmalıdır
(`2025-02-30` reddedilir). Sektörsüz paket (`sektor: null`) sözlük ve
öznitelik beyan edemez.

**Yükseltme uzlaştırması.** Yeni sürümün artık beyan etmediği paket
kökenli tür ve yükümlülük `aktif=false` olur, paketin kendi taslak çerçeve
sürümü `arsiv`e çekilir — silinmez. Sözlük ve öznitelik şemasında aktif
bayrağı yok: satır yerinde kalır, kurulum raporunda `artik` altında
listelenir; kaldırma insan kararıdır. Kurulum/arşiv ile iz kaydı aynı
transaction'dadır: iz yazılamazsa işlem de geri alınır.

## Buradaki paketler

| Paket | Durum | İçerik |
| --- | --- | --- |
| `TR-ENERJI` | **iskelet** (0.1.0) | sözlük (tohumla birebir), `kontrol_sistemi` türü, 12 öznitelik, `EPDK-SGYM` yönetmelik yapısı (4 bölüm, 18 + 1 geçici madde başlığı), `EPDK-SGYM-EK3` (13 aile, 565 kontrol kimliği ve seviyesi) — **madde metni yok** |
| `TR-BANKACILIK` | **iskelet** (0.1.0) | 4 kapsam öğesi türü, 7 öznitelik, `BDDK-BS` yapısı (4 kısım, 7 bölüm, 47 madde numarası) — başlıklar birincil metin erişilince; **madde metni yok** |

Madde metni aktarımı **içerik işidir** (`docs/TR_SEKTOR_PAKETLERI.md` §4);
telifli çerçeve metni depoya girmez; Türkçe SCF dağıtımına bağlı hiçbir
şey inşa edilmez (hukuki görüş bekleniyor — `docs/ICERIK_OMURGASI_KARARI.md`).
