# UI Bütünlük Denetimi — "Backend'de olup UI'da erişilemeyen capability bırakma"

**Tarih:** 2026-08-31 · **Kapsam kökü:** `/home/user/uyumPlatformu/web` · **Kip:** salt-okunur (hiçbir kaynak dosya değiştirilmedi)

## Yöntem

Denetim tamamen statik okuma ve `grep` ile yapıldı; hiçbir derleme, test ya da tarayıcı koşusu çalıştırılmadı.
Şuna bakıldı: (a) `lib/eylemler.ts`, `lib/eylemler2/*.ts` ve `lib/girisEylemleri.ts` içindeki `'use server'`
dosyalarının `export`lu fonksiyonları — toplam **107 sunucu eylemi**; (b) her eylem adının `app/` ve
`components/` altında sözcük sınırıyla (`grep -rn "\bAD\b"`) geçip geçmediği; (c) çağrı bulunmayan her ad için
tüm repoda (`lib/`, `tests/`, `arac/`, `prisma/`, `instrumentation.ts`) ikinci bir tarama — böylece "UI yok ama
motor/API çağırıyor" ile "hiç kimse çağırmıyor" ayrıldı; (d) `lib/entegrasyon/*.ts` ve `lib/motorlar/*.ts`
modüllerinin özet/rapor `export`larının aynı yöntemle ekrana bağlı olup olmadığı; (e) `app/api/v1/*/route.api.ts`
uçlarının hangi `lib/api/uclar/*` işleyicisine bağlandığı; (f) `components/atlas/Ray.tsx` içindeki
`RAY_FLAGSHIP` + `RAY_OPERASYONEL` rota listeleriyle `app/` altındaki gerçek rota ağacının karşılaştırılması.
Şuna **bakılmadı**: çalışma zamanı davranışı, yetki kapılarının doğruluğu, ekranların görsel/erişilebilirlik
kalitesi, `lib/prisma-client/` üretilmiş kodu, `node_modules`, `.next`, `out`. Ayrıca "eylem UI'dan çağrılıyor"
bulgusu **çağrının erişilebilir bir düğmeye bağlı olduğunu kanıtlar, o düğmenin doğru çalıştığını kanıtlamaz** —
bu denetim erişilebilirlik (reachability) denetimidir, doğruluk denetimi değildir.

`.demo.ts` eşlemeleri (bkz. `next.config.ts:29-104`) UI bağlılığını değiştirmez: demo derlemesinde aynı ad
uyarı stub'ına yönlenir, çağrı yeri aynı kalır. Bu yüzden demo alias'ları "erişilebilir" sayımına dahil edilmedi.

### Sayısal özet

| | Adet |
|---|---|
| `'use server'` eylemi (toplam) | 107 |
| — `lib/eylemler.ts` | 34 |
| — `lib/eylemler2/*.ts` | 71 |
| — `lib/girisEylemleri.ts` | 2 |
| `ERISILEBILIR` | 80 |
| `UI_EKSIK` (eylem) | 27 |
| `OLU_KOD` (eylem) | 0 |
| `UI_EKSIK` (okuma/rapor + bileşen) | 10 |
| `OLU_KOD` (okuma tarafı) | 3 |
| `MAKINE_ARAYUZU` (API ucu) | 9 |

---

## A. `lib/eylemler.ts` — çekirdek yazma eylemleri (34)

Dosya `'use server'` ile başlar (`lib/eylemler.ts:1`). **34/34 eylem UI'dan çağrılıyor.**

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `sektorKaydet` | `lib/eylemler.ts:45` | Evet — Yönetim tezgâhı | `app/(atlas)/(operasyonel)/yonetim-tezgahi/Formlar.tsx:223` | ERISILEBILIR |
| `tesisTipiKaydet` | `lib/eylemler.ts:56` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:221` | ERISILEBILIR |
| `tesisKaydet` | `lib/eylemler.ts:73` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:209` | ERISILEBILIR |
| `tesisKapat` | `lib/eylemler.ts:105` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:375` | ERISILEBILIR |
| `tesisAc` | `lib/eylemler.ts:118` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:361` | ERISILEBILIR |
| `regulasyonKaydet` | `lib/eylemler.ts:130` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:214` | ERISILEBILIR |
| `alanKaydet` | `lib/eylemler.ts:150` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:219` | ERISILEBILIR |
| `maddeAlanAta` | `lib/eylemler.ts:168` | Evet — Regülasyonlar | `app/(atlas)/(operasyonel)/regulasyonlar/Formlar.tsx:107` | ERISILEBILIR |
| `surecKaydet` | `lib/eylemler.ts:183` | Evet — Uyum süreçleri | `app/(atlas)/(operasyonel)/surecler/Formlar.tsx:82` | ERISILEBILIR |
| `surecDurumDegistir` | `lib/eylemler.ts:208` | Evet — Uyum süreçleri | `.../surecler/Formlar.tsx:121` | ERISILEBILIR |
| `surecKapsamEkle` | `lib/eylemler.ts:222` | Evet — Uyum süreçleri | `.../surecler/Formlar.tsx:187` | ERISILEBILIR |
| `surecKapsamCikar` | `lib/eylemler.ts:246` | Evet — Uyum süreçleri | `.../surecler/Formlar.tsx:166` | ERISILEBILIR |
| `maddeDurumGuncelle` | `lib/eylemler.ts:260` | Evet — Uyum süreçleri | `.../surecler/Formlar.tsx:258` | ERISILEBILIR |
| `bulguOlustur` | `lib/eylemler.ts:310` | Evet — Uyum süreçleri | `.../surecler/Formlar.tsx:316` | ERISILEBILIR |
| `bulguGuncelle` | `lib/eylemler.ts:334` | Evet — Bulgu detayı | `app/(atlas)/(operasyonel)/bulgular/[id]/BulguDetayIstemci.tsx:106` | ERISILEBILIR |
| `aksiyonEkle` | `lib/eylemler.ts:379` | Evet — Bulgu detayı | `.../bulgular/[id]/BulguDetayIstemci.tsx:309` | ERISILEBILIR |
| `aksiyonDurumDegistir` | `lib/eylemler.ts:398` | Evet — Bulgu detayı | `.../bulgular/[id]/BulguDetayIstemci.tsx:212` | ERISILEBILIR |
| `kanitEkle` | `lib/eylemler.ts:412` | Evet — Süreçler + Bulgu detayı | `.../surecler/Formlar.tsx:355`, `.../bulgular/[id]/BulguDetayIstemci.tsx:373` | ERISILEBILIR |
| `eslestirmeEkle` | `lib/eylemler.ts:433` | Evet — Eşleştirme | `app/(atlas)/(operasyonel)/eslestirme/Formlar.tsx:66` | ERISILEBILIR |
| `eslestirmeSil` | `lib/eylemler.ts:452` | Evet — Eşleştirme | `.../eslestirme/Formlar.tsx:103` | ERISILEBILIR |
| `projeKaydet` | `lib/eylemler.ts:463` | Evet — Projeler | `app/(atlas)/(operasyonel)/projeler/Formlar.tsx:38,104` | ERISILEBILIR |
| `projeBaglantiEkle` | `lib/eylemler.ts:489` | Evet — Projeler | `.../projeler/Formlar.tsx:158,171` | ERISILEBILIR |
| `projeBaglantiSil` | `lib/eylemler.ts:508` | Evet — Projeler | `.../projeler/Formlar.tsx:190` | ERISILEBILIR |
| `kullaniciKaydet` | `lib/eylemler.ts:519` | Evet — Kullanıcı & yetki | `app/(atlas)/(operasyonel)/yetkiler/Formlar.tsx:40` | ERISILEBILIR |
| `yetkiVer` | `lib/eylemler.ts:536` | Evet — Kullanıcı & yetki | `.../yetkiler/Formlar.tsx:98` | ERISILEBILIR |
| `yetkiSil` | `lib/eylemler.ts:556` | Evet — Kullanıcı & yetki | `.../yetkiler/YetkilerIstemci.tsx:242` | ERISILEBILIR |
| `aktarimYukle` | `lib/eylemler.ts:570` | Evet — Madde aktarımı | `app/(atlas)/(operasyonel)/ice-aktarim/IceAktarimIstemci.tsx:90` | ERISILEBILIR |
| `aktarimOnayla` | `lib/eylemler.ts:629` | Evet — Madde aktarımı | `.../ice-aktarim/IceAktarimIstemci.tsx:351` | ERISILEBILIR |
| `aktarimReddet` | `lib/eylemler.ts:693` | Evet — Madde aktarımı | `.../ice-aktarim/IceAktarimIstemci.tsx:357` | ERISILEBILIR |
| `maddeKaydet` | `lib/eylemler.ts:707` | Evet — Regülasyonlar | `.../regulasyonlar/Formlar.tsx:96` | ERISILEBILIR |
| `maddeSil` | `lib/eylemler.ts:742` | Evet — Regülasyonlar | `.../regulasyonlar/Formlar.tsx:126` | ERISILEBILIR |
| `regulasyonAktifDegistir` | `lib/eylemler.ts:754` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:391` | ERISILEBILIR |
| `kullaniciAktifDegistir` | `lib/eylemler.ts:765` | Evet — Kullanıcı & yetki | `.../yetkiler/YetkilerIstemci.tsx:244` | ERISILEBILIR |
| `tanimSil` | `lib/eylemler.ts:774` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:401` | ERISILEBILIR |

**Bulgu:** `lib/eylemler.ts` tarafında UI boşluğu yok.

---

## B. `lib/eylemler2/*.ts` — modüler eylemler (71)

### B.1 Erişilebilir olanlar (44)

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `apiAnahtariUret` | `lib/eylemler2/apiAnahtari.ts:31` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:479` | ERISILEBILIR |
| `apiAnahtariIptal` | `lib/eylemler2/apiAnahtari.ts:79` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:567` | ERISILEBILIR |
| `ara` | `lib/eylemler2/arama.ts:14` | Evet — Komut paleti (Atlas kabuğu) | `components/KomutPaleti.tsx:4`; kabuğa bağlı: `app/(atlas)/layout.tsx:15` | ERISILEBILIR |
| `denetimKaydet` | `lib/eylemler2/denetim.ts:41` | Evet — Denetimler | `app/(atlas)/(operasyonel)/denetimler/Formlar.tsx:79` | ERISILEBILIR |
| `asamaIlerlet` | `lib/eylemler2/denetim.ts:74` | Evet — Denetimler | `.../denetimler/Formlar.tsx:120` | ERISILEBILIR |
| `asamaGeriAl` | `lib/eylemler2/denetim.ts:111` | Evet — Denetimler | `.../denetimler/Formlar.tsx:139` | ERISILEBILIR |
| `kanitTalebiEkle` | `lib/eylemler2/denetim.ts:141` | Evet — Denetimler + Uyum matrisi | `.../denetimler/Formlar.tsx:193`, `app/(atlas)/(operasyonel)/uyum/UyumIstemci.tsx:397` | ERISILEBILIR |
| `kanitTalebiDurum` | `lib/eylemler2/denetim.ts:174` | Evet — Denetimler | `.../denetimler/Formlar.tsx:242,251,259` | ERISILEBILIR |
| `kapsamEkle` | `lib/eylemler2/denetim.ts:221` | Evet — Denetimler | `.../denetimler/Formlar.tsx:345` | ERISILEBILIR |
| `kapsamCikar` | `lib/eylemler2/denetim.ts:261` | Evet — Denetimler | `.../denetimler/Formlar.tsx:317` | ERISILEBILIR |
| `varlikKaydet` | `lib/eylemler2/envanter.ts:94` | Evet — Varlıklar | `app/(atlas)/(operasyonel)/envanter/Formlar.tsx:123` | ERISILEBILIR |
| `iliskiEkle` | `lib/eylemler2/envanter.ts:168` | Evet — Varlıklar | `.../envanter/Formlar.tsx:339` | ERISILEBILIR |
| `iliskiSil` | `lib/eylemler2/envanter.ts:205` | Evet — Varlıklar | `.../envanter/Formlar.tsx:311` | ERISILEBILIR |
| `varlikYasamDongusu` | `lib/eylemler2/envanter.ts:228` | Evet — Varlıklar | `.../envanter/Formlar.tsx:388` | ERISILEBILIR |
| `gorevOlustur` | `lib/eylemler2/gorev.ts:42` | Evet — Yönetim tezgâhı + Yedek & DR | `.../yonetim-tezgahi/Formlar.tsx:74`, `.../yedekleme/YedeklemeIstemci.tsx:12` | ERISILEBILIR |
| `gorevDurum` | `lib/eylemler2/gorev.ts:75` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:114,121` | ERISILEBILIR |
| `onayKarar` | `lib/eylemler2/gorev.ts:112` | Evet — Yönetim tezgâhı | `.../yonetim-tezgahi/Formlar.tsx:154,160` | ERISILEBILIR |
| `tumIsleriCalistir` | `lib/eylemler2/isler.ts:32` | Evet — Platform sağlığı | `app/(atlas)/(operasyonel)/saglik/Eylemler.tsx:34` | ERISILEBILIR |
| `tekIsCalistir` | `lib/eylemler2/isler.ts:52` | Evet — Platform sağlığı | `.../saglik/Eylemler.tsx:64` | ERISILEBILIR |
| `istisnaTalep` | `lib/eylemler2/istisna.ts:13` | Evet — Uyum süreçleri | `.../surecler/Formlar.tsx:403` | ERISILEBILIR |
| `kesifEslestir` | `lib/eylemler2/kesif.ts:54` | Evet — Keşif | `app/(atlas)/(operasyonel)/kesif/Karar.tsx:261` | ERISILEBILIR |
| `elleAktarimCalistir` | `lib/eylemler2/kesif.ts:92` | Evet — Keşif | `.../kesif/Karar.tsx:315` | ERISILEBILIR |
| `kesifKarariVer` | `lib/eylemler2/kesif.ts:195` | Evet — Keşif | `.../kesif/Karar.tsx:56,65` | ERISILEBILIR |
| `kesifTopluKarar` | `lib/eylemler2/kesif.ts:281` | Evet — Keşif | `.../kesif/Karar.tsx:196` | ERISILEBILIR |
| `hesapKaydet` | `lib/eylemler2/kimlik.ts:13` | Evet — Erişim | `app/(atlas)/(operasyonel)/kimlik/Inceleme.tsx:47` | ERISILEBILIR |
| `erisimIncele` | `lib/eylemler2/kimlik.ts:75` | Evet — Erişim | `.../kimlik/Inceleme.tsx:40` | ERISILEBILIR |
| `etkiOnerisiYenile` | `lib/eylemler2/olay.ts:291` | Evet — Olaylar | `app/(atlas)/(operasyonel)/olaylar/Eylemler.tsx:198` | ERISILEBILIR |
| `etkiDogrula` | `lib/eylemler2/olay.ts:316` | Evet — Olaylar | `.../olaylar/Eylemler.tsx:56` | ERISILEBILIR |
| `etkiDogrulamaGeriAl` | `lib/eylemler2/olay.ts:385` | Evet — Olaylar | `.../olaylar/Eylemler.tsx:61` | ERISILEBILIR |
| `degisiklikKaydet` | `lib/eylemler2/operasyon.ts:16` | Evet — Değişiklikler | `app/(atlas)/(operasyonel)/operasyon/Formlar.tsx:131` | ERISILEBILIR |
| `degisiklikIlerlet` | `lib/eylemler2/operasyon.ts:62` | Evet — Değişiklikler | `.../operasyon/Formlar.tsx:210` | ERISILEBILIR |
| `degisiklikGeriAl` | `lib/eylemler2/operasyon.ts:101` | Evet — Değişiklikler | `.../operasyon/Formlar.tsx:235` | ERISILEBILIR |
| `tedarikciKaydet` | `lib/eylemler2/operasyon.ts:214` | Evet — Tedarikçiler | `app/(atlas)/(operasyonel)/tedarikciler/Eylemler.tsx:46` | ERISILEBILIR |
| `sertifikaKaydet` | `lib/eylemler2/operasyon.ts:259` | Evet — Tedarikçiler | `.../tedarikciler/Eylemler.tsx:114` | ERISILEBILIR |
| `riskKaydet` | `lib/eylemler2/risk.ts:49` | Evet — Risk | `app/(atlas)/(operasyonel)/riskler/Formlar.tsx:82` | ERISILEBILIR |
| `riskIslem` | `lib/eylemler2/risk.ts:110` | Evet — Risk | `.../riskler/Formlar.tsx:241` | ERISILEBILIR |
| `riskKabul` | `lib/eylemler2/risk.ts:143` | Evet — Risk | `.../riskler/Formlar.tsx:239` | ERISILEBILIR |
| `surumOlustur` | `lib/eylemler2/surum.ts:17` | Evet — Regülasyonlar | `.../regulasyonlar/Formlar.tsx:168` | ERISILEBILIR |
| `surumAktiflestir` | `lib/eylemler2/surum.ts:61` | Evet — Regülasyonlar | `.../regulasyonlar/Formlar.tsx:199` | ERISILEBILIR |
| `kapsamYenidenHesapla` | `lib/eylemler2/tesis360.ts:88` | Evet — Uyum çerçevesi | `app/(atlas)/(operasyonel)/uyum/[cerceve]/CerceveIstemci.tsx:354` | ERISILEBILIR |
| `varlikAktarimYukle` | `lib/eylemler2/varlikAktarim.ts:41` | Evet — Varlık aktarımı | `app/(atlas)/(operasyonel)/varlik-aktarim/VarlikAktarimIstemci.tsx:136` | ERISILEBILIR |
| `varlikAktarimEsle` | `lib/eylemler2/varlikAktarim.ts:89` | Evet — Varlık aktarımı | `.../varlik-aktarim/VarlikAktarimIstemci.tsx:326` | ERISILEBILIR |
| `varlikAktarimOnayla` | `lib/eylemler2/varlikAktarim.ts:143` | Evet — Varlık aktarımı | `.../varlik-aktarim/VarlikAktarimIstemci.tsx:479` | ERISILEBILIR |
| `varlikAktarimReddet` | `lib/eylemler2/varlikAktarim.ts:162` | Evet — Varlık aktarımı | `.../varlik-aktarim/VarlikAktarimIstemci.tsx:490` | ERISILEBILIR |

### B.2 UI'sız capability'ler (27)

Aşağıdaki 27 adın `app/` + `components/` altında **tek bir geçişi bile yoktur**
(`grep -rn "\bAD\b" app components` → boş). Tümü tanımlı, yetki kapılı, denetim izi yazan,
`revalidatePath` çağıran tam eylemlerdir — yalnız çağıran bir yüzeyleri yoktur.

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `bildirimOkundu` | `lib/eylemler2/bildirim.ts:9` | Hayır — hiçbir bildirim yüzeyi yok | `grep` boş; üretici: `lib/motorlar/sonTarih.ts:36` (`db.bildirim.create`) | UI_EKSIK |
| `connectorKaydet` | `lib/eylemler2/entegrasyon.ts:80` | Hayır — Platform sağlığı yalnız okur | `grep` boş; ekran: `app/(atlas)/(operasyonel)/saglik/page.tsx:4,59` (yalnız `entegrasyonSagligiOzeti`) | UI_EKSIK |
| `connectorTest` | `lib/eylemler2/entegrasyon.ts:148` | Hayır | `grep` boş; eylem `revalidatePath('/saglik')` der (`entegrasyon.ts:193`) ama /saglik onu çağırmaz | UI_EKSIK |
| `connectorSenkronize` | `lib/eylemler2/entegrasyon.ts:199` | Hayır | `grep` boş; `revalidatePath('/saglik')` (`entegrasyon.ts:216`) | UI_EKSIK |
| `connectorEtkinlik` | `lib/eylemler2/entegrasyon.ts:220` | Hayır | `grep` boş; `revalidatePath('/saglik')` (`entegrasyon.ts:241`) | UI_EKSIK |
| `erisimAta` | `lib/eylemler2/kimlik.ts:53` | Hayır — Erişim ekranı yalnız inceleme sunar | `grep` boş; kardeşleri bağlı: `app/(atlas)/(operasyonel)/kimlik/Inceleme.tsx:6` | UI_EKSIK |
| `kokenDogrulaEylem` | `lib/eylemler2/koken.ts:110` | Hayır | `grep` boş; yalnız test: `tests/koken.test.ts:31,236` | UI_EKSIK |
| `kokenTopluDogrula` | `lib/eylemler2/koken.ts:136` | Hayır | `grep` boş; yalnız test: `tests/koken.test.ts:31,305` | UI_EKSIK |
| `yedegiDogrula` | `lib/eylemler2/konfigYedek.ts:47` | Hayır — Yedek & DR ekranı yalnız okur | `grep` boş; ekran importları: `app/(atlas)/(operasyonel)/yedekleme/YedeklemeIstemci.tsx:12` (yalnız `gorevOlustur`) | UI_EKSIK |
| `sonBilinenIyiIsaretle` | `lib/eylemler2/konfigYedek.ts:89` | Hayır | `grep` boş | UI_EKSIK |
| `yedekBulgusunuIsle` | `lib/eylemler2/konfigYedek.ts:141` | Hayır | `grep` boş; kuyruk ekranda görünür: `app/(atlas)/(operasyonel)/saglik/page.tsx:57` (`db.veriKalitesiBulgusu.findMany`) | UI_EKSIK |
| `olayGuncelle` | `lib/eylemler2/olay.ts:73` | Hayır — Olaylar ekranında yalnız etki doğrulama var | `grep` boş; ekranın bağladığı üçlü: `app/(atlas)/(operasyonel)/olaylar/Eylemler.tsx:7` | UI_EKSIK |
| `olayBagla` | `lib/eylemler2/olay.ts:169` | Hayır | `grep` boş; yalnız test: `tests/olay-etki.test.ts:42,345` | UI_EKSIK |
| `olayBagKaldir` | `lib/eylemler2/olay.ts:190` | Hayır | `grep` boş | UI_EKSIK |
| `olayKaydet` | `lib/eylemler2/operasyon.ts:117` | Hayır — olay OLUŞTURMANIN hiçbir yolu yok | `grep` boş; `/operasyon` ekranı yalnız `db.degisiklik` okur: `app/(atlas)/(operasyonel)/operasyon/page.tsx:36` | UI_EKSIK |
| `yedeklemePolitikasiKaydet` | `lib/eylemler2/operasyon.ts:154` | Hayır | `grep` boş; ekran politikayı okur ama yazmaz: `app/(atlas)/(operasyonel)/yedekleme/page.tsx:35` | UI_EKSIK |
| `yedeklemeKosusuKaydet` | `lib/eylemler2/operasyon.ts:175` | Hayır | `grep` boş; API ucu farklı modele yazar (`lib/api/uclar/yedekler.ts:82` → `konfigurasyonYedegi`) | UI_EKSIK |
| `restoreTestiKaydet` | `lib/eylemler2/operasyon.ts:193` | Hayır | `grep` boş; ekran `GeriYuklemeTesti`'ni kanıt olarak okur (`app/(atlas)/(operasyonel)/yedekleme/page.tsx:9-16` yorumu) | UI_EKSIK |
| `profilKaydet` | `lib/eylemler2/tesis360.ts:45` | Hayır — Santral 360'ta profil formu yok | `grep` boş; ekran importları: `app/(atlas)/(flagship)/tesisler/[id]/Plant360.tsx:2-7` | UI_EKSIK |
| `uygulanabilirlikOverride` | `lib/eylemler2/tesis360.ts:100` | Hayır | `grep` boş; kardeşi bağlı: `app/(atlas)/(operasyonel)/uyum/[cerceve]/CerceveIstemci.tsx:11` | UI_EKSIK |
| `kayittanAnlikAl` | `lib/eylemler2/topoloji.ts:42` | Hayır — /topoloji ekranı iskele | `grep` boş; ekran: `app/(atlas)/(operasyonel)/topoloji/page.tsx:22` ("BOŞ · YAPIM AŞAMASI") | UI_EKSIK |
| `temelOlarakOnayla` | `lib/eylemler2/topoloji.ts:70` | Hayır | `grep` boş; aynı iskele ekran | UI_EKSIK |
| `anligiKarsilastirEylem` | `lib/eylemler2/topoloji.ts:94` | Hayır | `grep` boş; aynı iskele ekran | UI_EKSIK |
| `sapmayiIncelemeyeAl` | `lib/eylemler2/topoloji.ts:111` | Hayır | `grep` boş; aynı iskele ekran | UI_EKSIK |
| `sapmaKararVer` | `lib/eylemler2/topoloji.ts:133` | Hayır | `grep` boş; aynı iskele ekran | UI_EKSIK |
| `sapmadanRiskAc` | `lib/eylemler2/topoloji.ts:173` | Hayır | `grep` boş; aynı iskele ekran | UI_EKSIK |
| `sapmadanBulguAc` | `lib/eylemler2/topoloji.ts:204` | Hayır | `grep` boş; aynı iskele ekran | UI_EKSIK |

**`OLU_KOD` sınıfına giren eylem yoktur:** 27 orphan'ın hepsinin ya bir sahibi ekran hâlihazırda vardır ve
yüzeyi eksiktir, ya da (topoloji) ekranı iskele hâlindedir. Hiçbiri "başka bir eylemle tamamen ikame edilmiş,
silinmesi gereken" durumda değildir — `olayKaydet` ile `olayGuncelle` çakışıyor gibi görünse de
`lib/eylemler2/olay.ts:16-18` ikisini bilerek yan yana konumlandırıyor (biri temel alanlar, biri genişletilmiş).

---

## C. `lib/girisEylemleri.ts` (2)

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `girisYap` | `lib/girisEylemleri.ts:25` | Evet — Giriş formu | `app/(giris)/giris/GirisFormu.tsx:4,20` | ERISILEBILIR |
| `cikisYap` | `lib/girisEylemleri.ts:60` | Evet — Ray oturum bloğu | `components/CikisDugmesi.tsx:3,9`; kullanım: `components/atlas/Ray.tsx:169` | ERISILEBILIR |

---

## D. Okuma tarafı — özet / rapor modülleri

Yöntem: her `export`un `app/` + `components/` altında geçip geçmediği, sonra tüm repoda kimin çağırdığı.
Aşağıda yalnız **rapor/özet düzeyindeki** (yani doğrudan bir ekranı besleyecek şekilde tasarlanmış)
`export`lar listelenmiştir; `connectorSagligi`, `durumSayilari`, `tazelikHesapla`, `bosSayilar`,
`durumaGoreSirala`, `kosuBayatMi`, `kimlikDurumu` gibi saf yardımcılar ekranlara doğrudan bağlı değildir ama
`entegrasyonSagligiOzeti` içinden çağrılır (`lib/entegrasyon/saglikOzeti.ts:467,468,489`) — bunlar **iç yardımcı**
sayıldı ve tabloya alınmadı.

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `entegrasyonSagligiOzeti` | `lib/entegrasyon/saglikOzeti.ts:430` | Evet — Platform sağlığı | `app/(atlas)/(operasyonel)/saglik/page.tsx:4,59`; tipleri de UI'da: `.../saglik/SaglikIstemci.tsx:9` | ERISILEBILIR |
| `kokenSayimlari` | `lib/entegrasyon/kokenRapor.ts:244` | Hayır | `grep app components` boş; yalnız test: `tests/koken.test.ts:29,73` | UI_EKSIK |
| `dogrulanmamisKayitlar` | `lib/entegrasyon/kokenRapor.ts:310` | Hayır | `grep` boş; yalnız test: `tests/koken.test.ts:29,347` | UI_EKSIK |
| `kaynakSistemDagilimi` | `lib/entegrasyon/kokenRapor.ts:356` | Hayır | `grep` boş; yalnız test: `tests/koken.test.ts:29,133` | UI_EKSIK |
| `bayatKokenler` | `lib/entegrasyon/kokenRapor.ts:420` | Hayır | `grep` boş; yalnız test: `tests/koken.test.ts:29,381` | UI_EKSIK |
| `kokenTesisi` | `lib/entegrasyon/kokenRapor.ts:453` | Hayır (ama ölü değil) | Eylem katmanı çağırıyor: `lib/eylemler2/koken.ts:20,77` | ERISILEBILIR (dolaylı) |
| `tesisYedekGorunumu` | `lib/entegrasyon/konfigYedek.ts:404` | Hayır | Tüm repoda çağıran yok (yalnız `konfigYedek.ts:37` yorumu ve `:427` hata metni); /yedekleme ekranı ham `db` sorgusu kullanır: `app/(atlas)/(operasyonel)/yedekleme/page.tsx:22,27,35` | UI_EKSIK |
| `kritikVarliklardaEksikYedek` | `lib/entegrasyon/konfigYedek.ts:313` | Hayır (ama ölü değil) | Motor çağırıyor: `lib/motorlar/yedekDogrulama.ts:3,101` | MAKINE_ARAYUZU |
| `yedekKontrolBagi` | `lib/entegrasyon/konfigYedek.ts:491` | Hayır | `grep` boş; yalnız test: `tests/konfig-yedek.test.ts:15,232` | UI_EKSIK |
| `yedekMetadataYaz` | `lib/entegrasyon/konfigYedek.ts:600` | Hayır | Üretimde çağıran yok; API ucu modele doğrudan yazar (`lib/api/uclar/yedekler.ts:78,82`); yalnız test: `tests/konfig-yedek.test.ts:15` | OLU_KOD |
| `uyumsuzOturumlar` | `lib/entegrasyon/tedarikciOturum.ts:271` | Hayır | `grep` boş; iç çağrı `tedarikciOturum.ts:379`, yalnız test: `tests/tedarikci-oturum.test.ts:14,42` | UI_EKSIK |
| `tedarikciOturumOzeti` | `lib/entegrasyon/tedarikciOturum.ts:371` | Hayır | `grep` boş; Tedarikçiler ekranı ham `db` kullanır: `app/(atlas)/(operasyonel)/tedarikciler/page.tsx:3` | UI_EKSIK |
| `anlikAl` / `anligiKarsilastir` | `lib/entegrasyon/topoloji.ts:212,724` | Hayır | Eylem + motor çağırıyor: `lib/eylemler2/topoloji.ts:16`, `lib/motorlar/topolojiSapma.ts:3,112` | MAKINE_ARAYUZU |
| `temelDurumu` | `lib/entegrasyon/topoloji.ts:306` | Hayır | Tüm repoda **tek geçiş** = tanımın kendisi; test bile çağırmıyor | OLU_KOD |
| `profilYayinla` | `lib/entegrasyon/esleme.ts:537` | Hayır | Tüm repoda tek geçiş = tanım | OLU_KOD |
| `profilSurumleri` | `lib/entegrasyon/esleme.ts:576` | Hayır | Tüm repoda tek geçiş = tanım | OLU_KOD |
| `connectorProfili` | `lib/entegrasyon/esleme.ts:598` | Hayır | Çekirdek çağırıyor: `lib/entegrasyon/cekirdek.ts:8` | MAKINE_ARAYUZU |
| `guvenlikAnligiAl` / `zinciriCalistir` | `lib/entegrasyon/zincir.ts:367,476` | Hayır | API uçları çağırıyor: `lib/api/uclar/erisimler.ts:10,167`, `varlikYazma.ts:11,208`, `zafiyetler.ts:10` | MAKINE_ARAYUZU |
| `sirSaglayicilari` / `rotasyonBildir` | `lib/entegrasyon/sir.ts:151,298` | Hayır | `grep app components` boş; yalnız test: `tests/sir-katmani.test.ts:16,17` | UI_EKSIK |
| `eslestirmeyiKos` | `lib/entegrasyon/cekirdek.ts:769` | Hayır | API ucu + çekirdek çağırıyor: `lib/api/uclar/varlikGozlemleri.ts:8,137`, `cekirdek.ts:750` | MAKINE_ARAYUZU |
| `oturumYaz` | `lib/entegrasyon/tedarikciOturum.ts:91` | Hayır | Adaptör/ingest yolu; UI'dan çağrılmaz | MAKINE_ARAYUZU |

### D.1 Ek bulgu — hazır ama hiç monte edilmemiş UI bileşeni

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `KokenRozeti`, `KokenSatiri`, `kokenGorunumu`, `guvenYazisi` | `components/atlas/Koken.tsx:40,86,111,138` | Hayır — hiçbir ekran import etmiyor | `grep -rn "atlas/Koken" app components` → boş; yalnız test import ediyor: `tests/koken.test.ts:33` | UI_EKSIK |

Not: `guvenYazisi` adı `app/(atlas)/(operasyonel)/kesif/mantik.ts:98`'de **ayrı bir fonksiyon olarak yeniden
tanımlanmış** ve Keşif ekranında o kullanılıyor (`KesifIstemci.tsx:16`, `Karar.tsx:10`) — yani `Koken.tsx`
sürümü değil.

---

## E. `app/api/v1/*/route.api.ts` — makine uçları (9)

Tüm route dosyaları `route.api.ts` adını taşır ve demo (statik) derlemesinde `pageExtensions`'a girmez
(`next.config.ts:12-15`). Hiçbirinin ekran karşılığı **yoktur ve olması gerekmez**: bunlar M2M ingest/okuma
uçlarıdır. Yönetişim yüzeyi vardır — API anahtarı üretme/iptal Yönetim tezgâhı'ndan yapılır
(`.../yonetim-tezgahi/Formlar.tsx:479,567`), koşuların sonucu Platform sağlığı'nda görünür
(`.../saglik/page.tsx:59`).

| Capability | Nerede tanımlı | UI'da erişilebilir mi | Kanıt (dosya:satır) | Sınıf |
|---|---|---|---|---|
| `GET /api/v1/plants` | `app/api/v1/plants/route.api.ts:7` → `lib/api/uclar/santraller.ts` | Hayır (kasten) — veri Santraller/Portföy ekranlarında ayrıca görünür | `app/(tam)/portfoy/Portfoy.tsx:133` | MAKINE_ARAYUZU |
| `GET /api/v1/assets` | `app/api/v1/assets/route.api.ts:7` → `lib/api/uclar/varliklar.ts` | Hayır (kasten) — karşılığı Varlıklar ekranı | `app/(atlas)/(operasyonel)/envanter/page.tsx` | MAKINE_ARAYUZU |
| `POST /api/v1/assets/upsert` | `app/api/v1/assets/upsert/route.api.ts:7` → `lib/api/uclar/varlikYazma.ts` | Hayır (kasten) — insan yolu `varlikKaydet` / Varlık aktarımı | `.../envanter/Formlar.tsx:123` | MAKINE_ARAYUZU |
| `POST /api/v1/assets/observations` | `app/api/v1/assets/observations/route.api.ts:7` → `lib/api/uclar/varlikGozlemleri.ts` | Hayır (kasten) — sonuç Keşif ekranında karara düşer | `app/(atlas)/(operasyonel)/kesif/Karar.tsx:56` | MAKINE_ARAYUZU |
| `POST /api/v1/vulnerabilities` | `app/api/v1/vulnerabilities/route.api.ts:7` → `lib/api/uclar/zafiyetler.ts` | Hayır (kasten) — zafiyetler Varlıklar/Risk ekranlarında okunur | `app/(atlas)/(operasyonel)/envanter/mantik.ts` | MAKINE_ARAYUZU |
| `POST /api/v1/backup-results` | `app/api/v1/backup-results/route.api.ts:7` → `lib/api/uclar/yedekler.ts` | Hayır (kasten) | `lib/api/uclar/yedekler.ts:78,82` (`konfigurasyonYedegi` yazar) | MAKINE_ARAYUZU |
| `POST /api/v1/access-observations` | `app/api/v1/access-observations/route.api.ts:7` → `lib/api/uclar/erisimler.ts` | Hayır (kasten) — karşılığı Erişim ekranı | `app/(atlas)/(operasyonel)/kimlik/page.tsx:23` | MAKINE_ARAYUZU |
| `GET /api/v1/evidence` | `app/api/v1/evidence/route.api.ts:7` → `lib/api/uclar/kanitlar.ts` | Hayır (kasten) — kanıtlar Süreçler/Bulgu ekranlarında | `.../surecler/Formlar.tsx:355` | MAKINE_ARAYUZU |
| `GET /api/v1/integration-runs` | `app/api/v1/integration-runs/route.api.ts:7` → `lib/api/uclar/kosular.ts` | Hayır (kasten) — koşular Platform sağlığı'nda | `.../saglik/page.tsx:59` | MAKINE_ARAYUZU |

**Bulgu:** API tarafında eksiklik yok. 9/9 uç bilinçli makine arayüzüdür.

---

## F. Ray (`components/atlas/Ray.tsx`) ↔ rota ağacı

### F.1 Ray'de listelenip var olmayan rota

**Bulgu yok.** `RAY_FLAGSHIP` (`Ray.tsx:23-32`) ve `RAY_OPERASYONEL` (`Ray.tsx:44-77`) içindeki 6 + 24 = 30
girdinin (tekrar eden `/uyum`, `/riskler`, `/denetimler`, `/yonetim-tezgahi` dâhil) hepsi bir `page.tsx`'e karşılık
gelir. Örnek doğrulamalar: `/portfoy` → `app/(tam)/portfoy/page.tsx`; `/topoloji` →
`app/(atlas)/(operasyonel)/topoloji/page.tsx`; `/ice-aktarim` → `app/(atlas)/(operasyonel)/ice-aktarim/page.tsx`.

### F.2 `app/` altında olup Ray'de olmayan ekranlar (4)

| Rota | Dosya | Rayda mı | Erişilebilir mi | Sınıf |
|---|---|---|---|---|
| `/tesisler` | `app/(atlas)/(flagship)/tesisler/page.tsx` | Hayır | Evet — derin bağlantı: `app/(atlas)/(operasyonel)/projeler/ortak.ts:381` (`yol: '/tesisler'`) | ERISILEBILIR |
| `/tesisler/[id]` | `app/(atlas)/(flagship)/tesisler/[id]/page.tsx` | Hayır | Evet — çok sayıda bağlantı: `app/(tam)/portfoy/Portfoy.tsx:133,173`, `.../uyum/UyumIstemci.tsx:151`, `.../bulgular/BulgularIstemci.tsx:571`, `.../yedekleme/YedeklemeIstemci.tsx:373` | ERISILEBILIR |
| `/sistem` | `app/(atlas)/(operasyonel)/sistem/page.tsx` | Hayır | Hayır (kasten) — hiçbir `Link` yok; geliştirme ekranı olduğu yazılı: `arac/rota-duman.mjs:20-22` ("RAYDA ÖĞESİ YOKTUR — geliştirme ekranıdır") | MAKINE_ARAYUZU |
| `/sistem/bilesenler` | `app/(atlas)/(operasyonel)/sistem/bilesenler/page.tsx` | Hayır | Hayır (kasten) — aynı gerekçe; `arac/denetim.mjs:10` bu rotayı otomatik denetimde kullanır | MAKINE_ARAYUZU |

**Bulgu:** Ray tarafında kırık bağlantı yok. `/tesisler*` rayda yok ama Ray notu bunu açıkça kayıtlı sapma
olarak yazıyor (`Ray.tsx:26-29`: "Enerji portföyü ve Santraller ayrı öğeler; bu uygulamada ikisi de aynı ekranı
açtığı için tek öğede birleştirildi"). `/sistem*` kasten raysızdır.

### F.3 Ray'de var ama ekranı boş olan rota (1)

`/topoloji` Ray'de tam bir öğe olarak duruyor (`Ray.tsx:53`) ama sayfası iskele:
`app/(atlas)/(operasyonel)/topoloji/page.tsx:22` — "BOŞ · YAPIM AŞAMASI". Bu, F.2'deki türden bir raytutarsızlığı
değil; B.2'deki 7 topoloji eyleminin doğrudan nedenidir.

---

## G. Önceliklendirilmiş düzeltme listesi

### G.1 `UI_EKSIK` — 27 eylem + 10 okuma/bileşen kalemi = 37 kalem

**P0 — kullanıcı işi hiç yapamıyor, veri modeli dolu**

1. **`/topoloji` ekranı (7 eylem: `kayittanAnlikAl`, `temelOlarakOnayla`, `anligiKarsilastirEylem`, `sapmayiIncelemeyeAl`, `sapmaKararVer`, `sapmadanRiskAc`, `sapmadanBulguAc`)** — Ray'de rota var, motor sapma üretiyor (`lib/motorlar/topolojiSapma.ts:28`), ama sayfa "BOŞ · YAPIM AŞAMASI" olduğu için sapma yaşam döngüsünün tamamı UI'sız: kullanıcı bunu şu an **hiç** yapamıyor.
2. **`olayKaydet`** — hiçbir ekran olay OLUŞTURAMIYOR; Olaylar ekranı yalnız var olan bir olayın etkisini doğrulatıyor, yani kayıt yalnız seed/DB üzerinden doğabiliyor.
3. **`connectorKaydet` + `connectorTest` + `connectorSenkronize` + `connectorEtkinlik`** — Platform sağlığı connector'ları okuyor ama tanımlamanın, test etmenin, elle senkronlamanın ve duraklatmanın hiçbir yüzeyi yok; kullanıcı entegrasyonu şu an ancak DB'ye elle yazarak kurabiliyor.
4. **`kokenDogrulaEylem` + `kokenTopluDogrula` + `components/atlas/Koken.tsx` rozetleri + 4 köken raporu (`kokenSayimlari`, `dogrulanmamisKayitlar`, `kaynakSistemDagilimi`, `bayatKokenler`)** — "bu veri nereden geldi, kim doğruladı" zincirinin tamamı yazılmış, test edilmiş, ama hiçbir ekrana bağlanmamış; köken doğrulama şu an hiç yapılamıyor.

**P1 — sahibi ekran var, yüzeyi yarım**

5. **`yedegiDogrula` + `sonBilinenIyiIsaretle` + `restoreTestiKaydet` + `yedeklemePolitikasiKaydet` + `yedeklemeKosusuKaydet` + `tesisYedekGorunumu` + `yedekKontrolBagi`** — `/yedekleme` ekranı var ve okuyor, ama yedek doğrulama / "son bilinen iyi" / restore testi / politika yönetiminin hiçbiri düğmeye bağlı değil; kullanıcı yalnız görev açabiliyor (`YedeklemeIstemci.tsx:12`).
6. **`olayGuncelle` + `olayBagla` + `olayBagKaldir`** — kök neden, sınırlama, kurtarma, öğrenilenler ve olay–varlık zinciri alanları yazılabilir durumda ama Olaylar ekranı yalnız `etkiDogrula` üçlüsünü sunuyor.
7. **`profilKaydet` + `uygulanabilirlikOverride`** — Santral 360 profili uygulanabilirlik motorunun girdisi olduğu hâlde düzenlenemiyor, ve motorun kararı onaylı gerekçeyle ezilemiyor (kardeşi `kapsamYenidenHesapla` bağlı, bu ikisi değil).
8. **`erisimAta`** — Erişim ekranında hesap kaydetme ve dönemsel inceleme var, ama yeni erişim ataması yapılamıyor.
9. **`yedekBulgusunuIsle`** — veri kalitesi kuyruğu Platform sağlığı'nda görünüyor (`saglik/page.tsx:57`) ama yedek bulgusunu gerekçeyle kapatma/yok sayma düğmesi yok.
10. **`uyumsuzOturumlar` + `tedarikciOturumOzeti`** — tedarikçi uzaktan erişim oturumu uyum raporu tam yazılmış, Tedarikçiler ekranı ham `db` sorgusuyla çalışıp bu özeti hiç kullanmıyor.

**P2 — küçük yüzeyler**

11. **`bildirimOkundu`** — `sonTarih` motoru bildirim üretiyor (`lib/motorlar/sonTarih.ts:36`) ama okunacak/işaretlenecek bir bildirim yüzeyi hiç yok, dolayısıyla üretilen kayıtlar kullanıcıya hiç görünmüyor.
12. **`sirSaglayicilari` + `rotasyonBildir`** — sır sağlayıcı bağlılığı ve rotasyon durumu okunabilir durumda ama hiçbir yönetim ekranında gösterilmiyor.

### G.2 `OLU_KOD` — 3 kalem

1. **`temelDurumu`** (`lib/entegrasyon/topoloji.ts:306`) — tüm repoda tek geçişi kendi tanımı; testte bile çağrılmıyor, `anligiKarsilastir` + `temelAnlik` ikilisi aynı bilgiyi üretilen yolda zaten veriyor.
2. **`profilYayinla`** (`lib/entegrasyon/esleme.ts:537`) ve **`profilSurumleri`** (`:576`) — eşleme profili sürüm yönetimi API'si hiçbir yerden çağrılmıyor; çalışan yol `connectorProfili` (`esleme.ts:598` → `cekirdek.ts:8`) üzerinden gidiyor.
3. **`yedekMetadataYaz`** (`lib/entegrasyon/konfigYedek.ts:600`) — üretimde çağıran yok; gerçek ingest yolu API ucunun modele doğrudan yazması (`lib/api/uclar/yedekler.ts:78,82`), yani bu ikinci bir yazma yolu olarak sadece testte yaşıyor.

> Uyarı: `OLU_KOD` kalemleri **silinmeli** olarak işaretlendi, ama üçü de bir yarım kalmış özelliğin (eşleme
> profili sürümleme, topoloji temel görünümü) parçası olabilir. Silmeden önce ilgili özelliğin yol haritasında
> olup olmadığı doğrulanmalı; bu denetim yol haritasına bakmadı.
