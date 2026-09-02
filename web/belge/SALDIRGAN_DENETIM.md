# Saldırgan Denetim — 19 kusur sınıfı

**Tarih:** 2026-09-01 · **Kapsam kökü:** `/home/user/uyumPlatformu/web` · **Kip:** SALT OKUNUR
(bu dosya dışında hiçbir kaynak dosya değiştirilmedi; derleme, `next build`, `rm -rf .next`,
git yazma işlemi ve test koşusu YAPILMADI).

## Yöntem

Denetim statik okuma ve `grep`/`find` ile yapıldı. Bakılanlar: (a) `'use server'` işaretli
tüm modüllerden dışa aktarılan **120 sunucu eylemi** ve her birinin `app/` + `components/`
altındaki çağrı yeri (sözcük sınırlı arama), sonra çağrısı bulunmayanların tüm repoda ikinci
taraması; (b) `app/**/page.tsx` dosyalarının **hepsi** (37 dosya) — her biri için `girisZorunlu`,
`yetkiZorunlu`, `izinVar`, `izinliTesisIdleri` çağrısı ile `db.` sorgusu sayısının karşılaştırılması;
(c) `prisma/schema.prisma`'daki **95 modelin** üretim kodunda (`db.<model>` ve ilişki adı üzerinden)
referansı; (d) `docs/POSTGRES_READINESS.md` §c'deki yedi yarış vakasının tek tek doğrulanması ve
listede olmayan yeni vakaların aranması; (e) `lib/`, `components/` altındaki dışa aktarılan
fonksiyonların çağrı sayımı (kendi dosyası dahil ve hariç, iki ayrı geçiş); (f) şemadaki tüm
`///` yorumlarının koddaki karşılığı; (g) `?? false` / `|| false` / `=== false` kalıpları ile
`Boolean?` alanların üç değerliliği; (h) `app/api/v1/*` uçlarının kapsam ve idempotency yüzeyi;
(i) `belge/UI_BUTUNLUK_DENETIMI.md` içindeki 37 `UI_EKSIK` kaleminin tek tek yeniden ölçümü.

**Bakılmayanlar:** çalışma zamanı davranışı, tarayıcı/görsel kalite, `lib/prisma-client/`
(üretilmiş kod), `node_modules`, `.next`, `out`, `prisma/migrations/*.sql` içeriği (yalnız
adlarına ve §c iddialarının doğrulanmasına bakıldı), erişilebilirlik, i18n.

**Başka ajanların ŞU AN değiştirdiği dosyalar** (`lib/motorlar/**`, `lib/entegrasyon/zincir.ts`,
`lib/eylemler.ts`, `lib/entegrasyon/varlikAktarim.ts`, `lib/entegrasyon/kesif.ts`,
`lib/girisKorumasi.ts`, `lib/api/oranSinir.ts`, `lib/api/ucnokta.ts`, `tests/yaris-kosullari.test.ts`)
"DEĞİŞİYOR" işaretlendi ve düşük öncelikli tutuldu.

`belge/UI_BUTUNLUK_DENETIMI.md` **doğrulandı, kopyalanmadı**: oradaki 37 `UI_EKSIK` kaleminin
**31'i o tarihten bu yana bağlanmış**, 6'sı hâlâ açık, 1'i (`kokenGorunumu`) bağlanmış. Ayrıca o
denetimde hiç görünmeyen **6 yeni erişilemez eylem** (`lib/eylemler2/esleme.ts`) bulundu.

---

## Bulgular

| # | Sınıf | Bulgu | Kanıt | Önem | Durum |
|---|---|---|---|---|---|
| 1 | 9 · Yetki kapsamı sızıntısı | On ekran santral verisini yalnız `girisZorunlu()` ile okuyor; `izinliTesisIdleri` hiç çağrılmıyor, yani A santraline kısıtlı kullanıcı tüm santrallerin bulgularını, risklerini, varlıklarını, hesaplarını ve denetim izini görüyor | `app/(kabuk)/(operasyonel)/bulgular/page.tsx:15,17` · `bulgular/[id]/page.tsx:19,22` · `riskler/page.tsx:11,14` · `riskler/[id]/page.tsx:19,22` · `omur/page.tsx:19,25` · `kimlik/page.tsx:20,23` · `aktivite/page.tsx:26,31` · `app/(tam)/portfoy/page.tsx:14,17` · `app/(kabuk)/(flagship)/page.tsx:14,19` · `app/(kabuk)/(flagship)/tesisler/[id]/page.tsx:16,19` — karşılaştırma: 18 ekran doğru daraltıyor (`envanter/page.tsx:38`, `topoloji/page.tsx:47`, …); sözleşme `lib/erisim.ts:6-8`'de yazılı: "her sayfa sorgusu `izinliTesisIdleri` ile daraltılır". **Not:** denetim sürerken başka bir ajan `app/kapsam.ts` ve `app/(kabuk)/(operasyonel)/riskler/veri.ts` dosyalarını açtı (aynı sızıntıyı `/riskler` için anlatıyor), ama `riskler/page.tsx:11` hâlâ eski yolu kullanıyor — riskler satırı DEĞİŞİYOR, diğer dokuz ekran AÇIK | **P0** | AÇIK (riskler: DEĞİŞİYOR) |
| 2 | 9 · Modül yetkisi hiç yok | `/aktivite`, `/omur`, `/kimlik` ekranları modül izni de sormuyor: yalnız `risk` okuma yetkisi olan `risk_sahibi` rolü tüm denetim izini (`AktiviteKaydi`) ve tüm kimlik hesaplarını okuyabiliyor | `aktivite/page.tsx:26,31` (`db.aktiviteKaydi.findMany`, filtre yok) · `kimlik/page.tsx:20,23` · `omur/page.tsx:19,25`; rol matrisi `lib/erisim.ts:13-32` | **P0** | AÇIK |
| 3 | 6 · Sessiz fallback (+ güvenlik kontrolünün silinmesi) | Connector formu `yapilandirmaJson` alanını HİÇ göndermiyor; eylem onu koşulsuz `?? null` ile yazıyor — yani bir connector'ın adını düzeltmek, o connector'ın **santral kapsamını (`kapsamTesisKodlari`), varsayılan tesis kodunu ve tüm adaptör ayarlarını sessizce siliyor**. Aynı dosyada sır referansı için bu tuzak düşünülüp forma zorunlu yeniden giriş konmuş; yapılandırma için konmamış | Form: `app/(kabuk)/(operasyonel)/saglik/Yapilandirma.tsx:90-100` (anahtar yok) · Eylem: `lib/eylemler2/entegrasyon.ts:117` (`yapilandirmaJson: v.yapilandirmaJson ?? null`) ve `:129` (`update`) · Sır için düşünülmüş hâli: `app/(kabuk)/(operasyonel)/saglik/mantik.ts:543-549` · Kapsamın gerçekten okunduğu yer: `lib/entegrasyon/cekirdek.ts:846-851` | **P0** | AÇIK |
| 4 | 19 · Yorumda var, kodda yok | `Connector.kapsamTesisleriJson` şemada dört satırlık `///` yorumla "connector'ın yazabileceği santraller — güvenlik sınırı" diye tanımlı ve çekirdek onu okuyor, ama **tüm repoda hiçbir yer bu kolona yazmıyor** (eylem yok, form yok, seed yok). Kapsamı ayarlamanın tek yolu belgelenmemiş `yapilandirmaJson.kapsamTesisKodlari` anahtarı — o da #3 yüzünden ilk düzenlemede siliniyor | `prisma/schema.prisma:1636-1640` · okuma: `lib/entegrasyon/cekirdek.ts:849` · yazma: `grep -rn "kapsamTesisleriJson" app lib components prisma` → yalnız bu iki yer + yorum | **P0** | AÇIK |
| 5 | 8 · bilinmiyor → false | `Degisiklik.saglayiciOnayi` ve `onDegisiklikYedegi` şemada `Boolean?` (üç değerli: null = değerlendirilmedi); sunucu eylemi `?? null` ile doğru koruyor ama **form `?? false` ile null'ı işaretsiz onay kutusuna indiriyor** ve kaydettiğinde `false` yazıyor. "OT sağlayıcı onayı henüz ölçülmedi" kaydı, "sağlayıcı onayı ALINMADI" beyanına dönüşüyor — hiç yapılmamış bir olumsuz beyan denetim kaydına giriyor | Form: `app/(kabuk)/(operasyonel)/operasyon/Formlar.tsx:38,41` · Şema: `prisma/schema.prisma:1283,1286` · Eylemin doğru hâli: `lib/eylemler2/operasyon.ts:42,44` · Kapının okuması: `lib/eylemler2/operasyon.ts:77,80` (`!== true`) | **P0** | AÇIK |
| 6 | 11 · Atomik olmayan yan etki | `maddeAlanAta` önce `deleteMany` ile maddenin tüm kapsam alanı bağlarını siliyor, sonra transaction DIŞINDA tek tek yeniden kuruyor; döngü ortasında patlarsa madde kapsam alanı olmadan kalır ve içe aktarımda "alan kolonu tanımlı bir kapsam alanıyla eşleşmiyor" diye elenmeye başlar | `lib/eylemler.ts:169-180` (silme `:172`, döngü `:173-174`) | **P0** | AÇIK · DEĞİŞİYOR (`lib/eylemler.ts`) |
| 7 | 10 · Yarış / TOCTOU (§c'de YOK) | `ErisimAtamasi` için idempotency `findFirst` → yoksa `create` biçiminde ve **veritabanında hiçbir tekillik kısıtı yok**. `20260901160000_kapsam_ve_idempotency_kisitlari` migration'ı `KesifKaydi`, `KonfigurasyonYedegi`, `TedarikciErisimOturumu` için kısıt eklemiş; `ErisimAtamasi` atlanmış. İki eşzamanlı PAM aktarımı (farklı Idempotency-Key) kopya erişim ataması yazar → `/kimlik` ekranındaki ayrıcalıklı erişim sayısı olduğundan yüksek çıkar | `lib/api/uclar/erisimler.ts:130-137` · `prisma/schema.prisma:1087-1099` (model, `@@unique` yok) | **P1** | AÇIK |
| 8 | 10 · Yarış (§c · P5 kısmen açık) | `docs/POSTGRES_READINESS.md` §c P5'in denetim yarısı kapandı (`asamaIlerlet`/`asamaGeriAl` koşullu `updateMany` + transaction), ama **operasyon yarısı hâlâ açık**: `degisiklikIlerlet` aşamayı okuyup koşulsuz yazıyor; `degisiklikGeriAl` de öyle. "İlerlet" + "geri al" eşzamanlı koşarsa kaybeden sessizce yutulur ve denetim izine gerçekleşmemiş bir geçiş düşer | `lib/eylemler2/operasyon.ts:65` (okuma) → `:88` (koşulsuz `update`) · `:105` → `:106` · Doğru kalıp aynı repoda: `lib/eylemler2/denetim.ts:113-120` | **P1** | AÇIK |
| 9 | 1 · Backend var, UI yok | `profilKaydet` ve `uygulanabilirlikOverride` hiçbir yerden çağrılmıyor. `TesisProfili` şemada "uygulanabilirlik motorunun girdisi" diye tanımlı ve yalnız `prisma/seed.ts:496` yazıyor. Sonuç: `/yonetim-tezgahi`'ndan yeni açılan bir santralin profili **hiçbir zaman girilemiyor**, uygulanabilirlik kararı sonsuza dek "bilinmiyor" kalıyor ve onaylı override yolu da yok | `lib/eylemler2/tesis360.ts:45,100` (çağıranı yok) · `prisma/schema.prisma:634,730` · Santral 360 ekranı tamamen salt okunur: `app/(kabuk)/(flagship)/tesisler/[id]/Plant360.tsx` (tek `'use server'` importu yok) · Santral açma: `lib/eylemler.ts:74,91-97` | **P1** | AÇIK |
| 10 | 1 · 18 · Erişilemez eylem | `lib/eylemler2/esleme.ts`'in **altı eylemi de** hiçbir yerden çağrılmıyor: `eslemeSozlugu`, `eslemeProfilYayinla`, `eslemeProfilGecmisi`, `eslemeProfilKurallari`, `connectorEslemeProfili`, `eslemeOnizle`. Yalnız `eslemeProfiliBagla` bağlı — yani bir eşleme profili UI'dan **seçilebiliyor ama hiç oluşturulamıyor/yayınlanamıyor**; şemadaki "sürümlü eşleme" gerekçesi (`schema.prisma:1666-1673`) ürün yüzeyinde karşılıksız | `lib/eylemler2/esleme.ts:68,87,168,179,191,218` · bağlı olan tek kardeş: `app/(kabuk)/(operasyonel)/saglik/Yapilandirma.tsx:10,482` | **P1** | AÇIK |
| 11 | 1 · Backend var, UI yok | `bildirimOkundu` hiçbir yerden çağrılmıyor ve **hiçbir ekran `db.bildirim` okumuyor**. Deadline motoru her koşuda bildirim üretiyor; kimse görmüyor, kimse okundu işaretleyemiyor, tablo tek yönlü büyüyor | Üretici: `lib/motorlar/sonTarih.ts:36` · Eylem: `lib/eylemler2/bildirim.ts:9` · `grep -rn "db.bildirim" app` → boş | **P1** | AÇIK |
| 12 | 1 · Backend var, UI yok | `erisimAta` (erişim ataması) hiçbir yerden çağrılmıyor; `/kimlik` ekranı yalnız inceleme sunuyor. Erişim ataması yalnız API'den (`/api/v1/access-observations`) doğabiliyor | `lib/eylemler2/kimlik.ts:53` · `grep -rn "erisimAta" app components` → boş | **P1** | AÇIK |
| 13 | 6 · 19 · Sessiz fallback | `/api/v1/evidence` kapsamı `tesisBaglantilari` (model `KanitTesis`) üzerinden uyguluyor, ama **`KanitTesis`'e üretimde hiçbir yerde yazılmıyor** (yalnız `tests/api.test.ts:595,598`). Sonuç: santrale kısıtlı bir API anahtarı **her zaman boş liste** alıyor ve her kanıt için `plantIds: []` dönüyor — kayıt "bağlı değil" iken "yok" gibi görünüyor. Ucun kendi yorumu (`:13-15`) uygulanan bir kontrolü anlatıyor; uygulanan şey aslında "hiçbir şey görmezsin" | `lib/api/uclar/kanitlar.ts:13-15,34,35,43,61` · Kanıt açan üç yol da bağ kurmuyor: `lib/eylemler.ts:422`, `lib/eylemler2/denetim.ts:234`, `prisma/seed-kanit.ts:85` | **P1** | AÇIK |
| 14 | 11 · 13 · Atomik değil + N+1 | `surumOlustur` yeni sürümü açıp kaynak maddeleri **transaction dışında** madde başına bir `create`, alan başına bir `create` ile kopyalıyor. Ortada patlarsa yarım kopyalanmış bir taslak sürüm kalıcı olarak kalıyor; 500 maddelik bir çerçevede 500+ sıralı sorgu | `lib/eylemler2/surum.ts:17-52` (döngü `:35`, iç döngü `:44`) | **P1** | AÇIK |
| 15 | 11 · Atomik olmayan yan etki | `surumAktiflestir` `SurumFarki` satırlarını **transaction'dan ÖNCE ve dışında** yazıyor; asıl aktifleştirme transaction'ı `CAKISMA` ile reddedilirse diff satırları veritabanında kalıyor ve hiç aktifleşmemiş bir sürüm için "değişiklik farkı" görünüyor | `lib/eylemler2/surum.ts:113-136` (diff yazımı, `create` çağrıları `:116,121,131`) vs `:160` (transaction başlangıcı) | **P1** | AÇIK · DEĞİŞİYOR (`surum.ts` düzenleniyor) |
| 16 | 11 · Atomik olmayan yan etki | İstisna onayının yan etkisi (`onayYanEtkisi`) istisnayı `aktif` yapıp sonra N adet `MaddeDurumu`'nu `kapsamdisi`'ye çekiyor, N tarihçe ve N iz satırı yazıyor — hepsi **transaction dışında**. `onayKarar` sahiplenmeyi atomik yaptı ama yan etki hâlâ yarım kalabilir: istisna aktif, maddelerin bir kısmı kapsam içinde | `lib/eylemler2/gorev.ts:188-202` (çağrı `:164`) | **P1** | AÇIK |
| 17 | 11 · 13 · Atomik değil + N+1 | `surecKapsamEkle` kapsam kaydını açıp **yaprak madde başına bir `upsert`** çalıştırıyor, transaction yok. 500 maddelik bir regülasyonda tek istekte 500 sıralı yazma; ortada patlarsa tesis kapsamda ama madde durumlarının bir kısmı açılmamış | `lib/eylemler.ts:223-245` (döngü `:233-239`) | **P1** | AÇIK · DEĞİŞİYOR (`lib/eylemler.ts`) |
| 18 | 14 · Bellek sıçraması | `/omur` her istekte **tüm `Varlik` tablosunu** iç içe `yazilimlar`, `riskler` (+`kontroller`,`projeler`), `projeBaglantilari` ilişkileriyle belleğe alıyor; `take` yok. `docs/PERFORMANS_TABANI.md` §4'te ölçülmüş: 10.347 varlıkta **422,7 ms · 33,7 MB heap** (taban 6,0 MB). Ekran ayrıca kapsam da uygulamıyor (bkz. #1) | `app/(kabuk)/(operasyonel)/omur/page.tsx:25-65` (`where: { silindi: null }`, `take` yok) · ölçüm: `docs/PERFORMANS_TABANI.md:116,206` | **P1** | AÇIK |
| 19 | 14 · Bellek sıçraması | `/bulgular` tüm bulguları, hepsinin aksiyonlarını ve 600 iz satırını; `/riskler` tüm riskleri + tüm açık bulguları `take` olmadan çekiyor. Bugün küçük, ama sınırı yok ve büyüme tek yönlü | `app/(kabuk)/(operasyonel)/bulgular/page.tsx:17-31` · `riskler/page.tsx:14-30` | **P1** | AÇIK |
| 20 | 3 · 16 · Zamanlayıcı çağırmıyor | `dolmusOturumlariTemizle` yazılmış, testi vardı, kendi yorumu "tabloyu şişirmemek içindir" diyordu — ama üretimde hiçbir yerden çağrılmıyordu; `Oturum` tablosu sınırsız büyüyordu. **Denetim sürerken başka bir ajan kapattı:** zamanlayıcıya saatlik `bakim_temizlik` işi eklendi ve hem dolmuş oturumları hem dolmuş kilitleri siliyor | `lib/auth.ts:89-94` · yeni çağıran: `lib/is/zamanlayici.ts:5-6,55-61,207-208,213-215,274-277` | **P1** | ÇÖZÜLMÜŞ (denetim sırasında) |
| 21 | 13 · N+1 (transaction içinde) | `surumAktiflestir` transaction'ının içinde süreç × değişen madde × kapsam tesisi üçlü döngüsü, her yaprakta bir `upsert` çalıştırıyor. SQLite tek yazıcıdır; bu döngü yazma transaction'ını binlerce gidiş-dönüş boyunca açık tutuyor | `lib/eylemler2/surum.ts:170-190` | **P1** | AÇIK |
| 22 | 5 · İki ayrı doğruluk kaynağı | `lib/entegrasyon/topoloji.ts` içinde yazılmış dört okuma yardımcısı (`anliklariListele`, `sapmalariListele`, `sapmaDetay`, `topolojiOzeti`) **hiçbir yerden çağrılmıyor**; `/topoloji` ekranı aynı işi kendi ham `db` sorgularıyla yeniden yapıyor. İki tanım bugün aynı sonucu veriyor, ama biri değişirse diğeri sessizce ayrışır | Ölü: `lib/entegrasyon/topoloji.ts:1157,1180,1206,1288` · Kopyası: `app/(kabuk)/(operasyonel)/topoloji/page.tsx:62-77` | P2 | AÇIK |
| 23 | 13 · N+1 | Zamanlayıcı her tikte (60 sn) motor başına bir `IsKosusu.findFirst` ve connector başına bir `EntegrasyonKosusu.findFirst` çalıştırıyor; 8 motor + N connector = 8+N sorgu/dakika, tek `groupBy` ile inebilir | `lib/is/zamanlayici.ts:82-90` · `:168-176` | P2 | AÇIK |
| 24 | 13 · N+1 | `/tedarikciler` her tedarikçi için iki ayrı özet fonksiyonu çağırıyor (`Promise.all(tedarikciler.map(...))`), her biri kendi sorgularını açıyor | `app/(kabuk)/(operasyonel)/tedarikciler/veri.ts:103,163-166` | P2 | AÇIK |
| 25 | 13 · N+1 | `/topoloji` kapsam (santral) başına `temelDurumu` çağırıyor; her çağrı dört sorgu açıyor → 4×N sorgu | `app/(kabuk)/(operasyonel)/topoloji/page.tsx:107` → `lib/entegrasyon/topoloji.ts:321-333` | P2 | AÇIK |
| 26 | 4 · Model var, üretimde referans yok | `KanitVarlik` (tüm repoda sıfır referans), `Lisans` (sıfır), `ProjeBagimliligi` (yalnız `prisma/seed-denetim-proje.ts:244` yazıyor, hiçbir yer okumuyor), `KanitTesis` (yalnız API'de okunuyor, hiç yazılmıyor — bkz. #13). Migration'da tablolar var, şemada ilişki alanları var, üründe karşılığı yok | `prisma/schema.prisma:1403` (KanitVarlik), `:1174` (Lisans), `:1372` (ProjeBagimliligi), `:1414` (KanitTesis) | P2 | AÇIK |
| 27 | 16 · Ölü kod | Hiçbir yerden (kendi dosyası dahil) çağrılmayan on dışa aktarım: `anlikOgeleri`, `anliklariListele`, `sapmalariListele`, `sapmaDetay`, `topolojiOzeti` (`lib/entegrasyon/topoloji.ts`), `kapsanabilirTip` (`lib/entegrasyon/kokenRapor.ts`), `kokenDagilimi` (`lib/entegrasyon/koken.ts`), `riskSeviyeRengi` (`lib/sabitler.ts`), `useKapsam` (`components/atlas/kapsam.ts`), `yedekDogrulamaSonKosu` (`lib/motorlar/yedekDogrulama.ts`) | yukarıdaki dosya:isim çiftleri | P2 | AÇIK (`yedekDogrulamaSonKosu` DEĞİŞİYOR) |
| 28 | 10 · Yarış (§c'de YOK) | Kod üretimi say-sonra-yaz: `DGS-` ve `OLY-` kodları `count()`+1 ile üretiliyor (silinen bir kayıt kalıcı çakışma yaratır); `RSK-`, `DEN-`, `PRJ-` kodları ise **sayfa render'ında** hesaplanıp forma varsayılan olarak veriliyor — iki kullanıcı aynı anda form açarsa ikincisi tekillik ihlali alır | `lib/eylemler2/operasyon.ts:52,143` · `app/(kabuk)/(operasyonel)/riskler/page.tsx:35` · `denetimler/page.tsx:52` · `projeler/page.tsx:57` | P2 | AÇIK |
| 29 | 7 · Sahte başarı | `tumIsleriCalistir` yalnız `sebep === 'hata'` olan koşuları başarısız sayıyor; sekiz motorun hepsi `zaten_calisiyor` dönerse (hiçbiri koşmadığı hâlde) kullanıcıya `tamam()` dönüyor | `lib/eylemler2/isler.ts:39-47` (`:41`) | P2 | AÇIK |
| 30 | 11 · Atomik olmayan yan etki | Dead-letter toplu inceleme, `TOPLU_SINIR` kadar kaydı transaction dışında tek tek güncelliyor; ortada patlarsa bir kısmı incelenmiş bir kısmı açık kalır (üst sınır var, bu yüzden P2) | `lib/eylemler2/reddedilenKayit.ts:75-91` | P2 | AÇIK |
| 31 | 19 · Yorumda var, kodda yok (kalıntı) | `lib/erisim.ts:6-8` yorumu "her sayfa sorgusu `izinliTesisIdleri` ile daraltılır" diyor; 37 sayfanın 10'unda karşılığı yok (#1). Yorum, olmayan bir kontrolü kayıtlı gösteriyor | `lib/erisim.ts:6-8` | P2 (kaynak: #1 P0) | AÇIK |

---

## `docs/POSTGRES_READINESS.md` §c — yedi vakanın doğrulaması

| §c | Vaka | Bugünkü durum | Kanıt |
|---|---|---|---|
| P1 | `onayKarar` dört göz onayı | **ÇÖZÜLMÜŞ** — koşullu `updateMany`, `count === 0` → açık hata, yan etki yalnız kazananda | `lib/eylemler2/gorev.ts:151-160` |
| P2 | İçe aktarım onayı (madde) | **ÇÖZÜLMÜŞ** — sahiplenme transaction'ın ilk işlemi | `lib/eylemler.ts:668-677` |
| P2 | İçe aktarım onayı (varlık) | **ÇÖZÜLMÜŞ** — aynı kalıp | `lib/entegrasyon/varlikAktarim.ts:719-727` · DEĞİŞİYOR |
| P3 | Keşif kararı | **ÇÖZÜLMÜŞ** — `durum: { notIn: [...] }` koşullu sahiplenme | `lib/entegrasyon/kesif.ts:783-790` · DEĞİŞİYOR |
| P4 | Motor/connector koşu çakışması | **ÇÖZÜLMÜŞ** — `IsKilidi` + kira; ayrıca kirası dolan `calisiyor` satırları kapatılıyor | `lib/is/kilit.ts:60-82` · `lib/motorlar/isKosucu.ts:15,24-34,60-62` · DEĞİŞİYOR |
| P5 | Aşama makineleri (denetim) | **ÇÖZÜLMÜŞ** — koşullu `updateMany` + iz aynı transaction'da | `lib/eylemler2/denetim.ts:113-120,159-168` |
| P5 | Aşama makinesi (değişiklik) | **AÇIK** — koşulsuz `update` (bkz. bulgu #8) | `lib/eylemler2/operasyon.ts:88,106` |
| P6 | Topoloji sapma kararı + türetilmiş kayıt | **ÇÖZÜLMÜŞ** — üç yerde de koşullu sahiplenme, kaybeden transaction'ı geri sarıyor | `lib/entegrasyon/topoloji.ts:840-850,1004-1013,1049-1057` |
| P7 | Sürüm aktifleştirme | **ÇÖZÜLMÜŞ** — koşullu `updateMany` + kısmi tekil indeks (`20260901201000`) + hata çevirisi | `lib/eylemler2/surum.ts:158-172,63-89` |

Listede **olmayan** yeni yarış vakaları: bulgu **#7** (`ErisimAtamasi`, kısıtsız
`findFirst`→`create`), bulgu **#8**'in operasyon yarısı, bulgu **#28** (kod üretimi).

---

## Bakıldı — bulgu YOK

| Sınıf | Ne arandı, neden bulgu çıkmadı |
|---|---|
| **2 · UI var, eylem çağrılmıyor / no-op** | `app/**` altındaki tüm `onClick`/`onSubmit` handler'ları tarandı; boş handler (`() => {}`), sabit `disabled`, TODO/"yakında" işaretli düğme yok. Her form `useEylem` üzerinden gerçek bir sunucu eylemine bağlı. |
| **15 · Bayat iş** | Hem motor koşuları hem connector koşuları için kira mekanizması var ve `calisiyor` kalan satırlar bir sonraki koşuda kapatılıyor: `lib/motorlar/isKosucu.ts:15,24-34` (30 dk kira), `lib/entegrasyon/cekirdek.ts:106,247-266,549`. Kilidin kendisi de kiralı: `lib/is/kilit.ts:43,70-74`. Sağlık ekranı `bayat_kosu` durumunu ayrı gösteriyor (`lib/entegrasyon/saglikOzeti.ts:133,364-366`). |
| **17 · Yetim rota** | `app/` altındaki 37 rota ile `components/atlas/Ray.tsx`'teki `RAY_FLAGSHIP`+`RAY_OPERASYONEL` listeleri karşılaştırıldı. Ray'de olmayan her rota bir yerden bağlanıyor: `/raporlar/kanit-paketi` ← `RaporlarIstemci.tsx:165`, `/saglik/reddedilenler` ← `SaglikIstemci.tsx:437`, `/tesisler/[id]` ← `Portfoy.tsx:133,173` + `Genel.tsx:123`, `/uyum/[cerceve]`, `/bulgular/[id]`, `/riskler/[id]`, `/denetimler/[id]`, `/surecler/[id]` liste ekranlarından. `/tesisler` bilinçli `redirect('/portfoy')` (`tesisler/page.tsx:7`). `/sistem` ve `/sistem/bilesenler` bilinçli istisna. |
| **12 · Eksik idempotency (API)** | `lib/api/ucnokta.ts:172-215` her yazma isteğinde `Idempotency-Key` zorunlu kılıyor, `ApiIstegi` üzerinde rezervasyon açıyor, ikinci çağrıda ilk yanıtı `Idempotent-Replay: true` ile oynatıyor. Yazma uçlarının kendileri köken defteri (`kokenliKayitlar`) ya da tekillik kısıtı üzerinden ikinci kez yazmıyor. **Tek istisna bulgu #7'dir.** |
| **7 · Sahte başarı (entegrasyon)** | Bağlanmamış adaptörler dürüst: `testConnection` → `{ ok: false, kimlikEksik: true }`, `fetchChanges` → boş liste değil, açık `throw` (`lib/entegrasyon/sozlesme.ts:194-214`). Kuyruk soyutlaması "sahte bağlılık yasak" kuralını uyguluyor: bağlı olmayan sağlayıcı sessizce süreç-içine düşmüyor, hata veriyor (`lib/is/kuyruk.ts:11-15,169-183`). Bulunan tek sahte başarı bulgu #29'dur (P2). |
| **8 · bilinmiyor → false (diğer alanlar)** | `KimlikHesabi.ayricalikli`, `Tedarikci.oturumKaydiVar`, `Sozlesme.guvenlikSartlariVar`, `Olay.uretimEtkisi/emniyetEtkisi/regulasyonEtkisi`, `Kanit.gecerliBitis`, `AgGeciti.sonDogrulama`, `VeriKokeni.guven` — hepsi `=== false` / `=== null` ayrımıyla okunuyor ve API yazma uçları `null` geldiğinde alana **dokunmuyor** (`lib/api/uclar/erisimler.ts:17-22,107`). Bulunan tek çöküş bulgu #5'tir. |
| **9 · API uçlarında kapsam** | Dokuz ucun hepsi kapsamı uyguluyor: `santraller.ts:17`, `varliklar.ts:28,33`, `kanitlar.ts:29,34`, `kosular.ts:21-23` (kapsamlı anahtar tamamen reddediliyor), yazma uçları kayıt kayıt `yazmaIzniZorunlu(kullanici, 'envanter', tesisId)` (`varlikYazma.ts:113`, `zafiyetler.ts:41`, `yedekler.ts:44`, `erisimler.ts:81,85-88`). `erisimler.ts` hem hedef hem mevcut santral için ayrı ayrı izin arıyor. |
| **5 · İki ayrı doğruluk kaynağı (uyum yüzdesi)** | `uyumOzeti` (`lib/sabitler.ts:111-124`) tek kaynak; `hucreOzeti` (`raporlar/mantik.ts:46-59`) ve `Plant360`, `/uyum`, `/portfoy`, `/raporlar/kanit-paketi` hepsi ondan türüyor. `tedarikciOturumOzeti`/`uyumsuzOturumlar` ve `tesisYedekGorunumu` — eski denetimde ayrışıktı, artık ekrandan çağrılıyor (`tedarikciler/veri.ts:5,163`). Kalan tek ayrışma bulgu #22'dir. |
| **3 · Eylem var, zamanlayıcı çağırmıyor** | Motor defteri tek kaynağa indi (`lib/motorlar/kayit.ts`) ve hem `instrumentation.ts:24-28` hem `lib/eylemler2/isler.ts:17` onu okuyor; zamanlayıcı connector'ları da `pollAralikDk`'ya göre gerçekten koşturuyor (`lib/is/zamanlayici.ts:155-177`) ve koşmayan her hedefin SEBEBİ dönüyor; oturum/kilit temizliği de saatlik bakım işine bağlandı (`:274-277`). Bulgu #20 bu tarama sırasında kapandı; başka zamanlanmamış iş kalmadı. |

---

## Önerilen düzeltmeler (her P0/P1 için tek cümle)

1. **#1** — On ekranın her birinde `const izinli = izinliTesisIdleri(k, '<modül>')` çağrılıp ana sorgulara `envanter/page.tsx:38-42`'deki `kapsamKosulu` kalıbıyla aynı koşul eklenmeli.
2. **#2** — `/aktivite`, `/omur`, `/kimlik` sayfaları başında ilgili modül için `izinVar(k, ..., 'okuma')` kontrolü yapıp yetkisizse `<Yetkisiz>` döndürmeli (`raporlar/kanit-paketi/page.tsx:25` kalıbı).
3. **#3** — `connectorKaydet` yalnız kendisine gönderilen alanları yazmalı (`yapilandirmaJson` gelmediyse `data`'ya hiç koymamalı), ya da form mevcut yapılandırmayı forma yükleyip geri göndermeli.
4. **#4** — Connector formuna santral kapsamı seçici eklenip `kapsamTesisleriJson`'a yazan bir sunucu eylemi açılmalı; olmayacaksa kolon ve `///` yorumu şemadan kaldırılmalı.
5. **#5** — Formdaki iki OT kapısı onay kutusu yerine üç seçenekli (`evet / hayır / değerlendirilmedi`) alana çevrilmeli ve `?? false` yerine `?? null` gönderilmeli.
6. **#6** — `maddeAlanAta`'nın `deleteMany` + `create` döngüsü tek `db.$transaction` içine alınmalı (tercihen `createMany` ile).
7. **#7** — `ErisimAtamasi`'na `@@unique([hesapId, varlikId, kapsam])` migration'ı eklenip `findFirst`→`create` yerine `upsert` kullanılmalı.
8. **#8** — `degisiklikIlerlet` ve `degisiklikGeriAl` `updateMany({ where: { id, durum: d.durum } })` + `count === 0` → hata kalıbına çevrilmeli, iz aynı transaction'a alınmalı.
9. **#9** — Santral 360 ekranına tesis profili formu ve onaylı uygulanabilirlik override yüzeyi eklenip `profilKaydet` / `uygulanabilirlikOverride` bağlanmalı.
10. **#10** — Eşleme profili yönetim yüzeyi (`/saglik` çekmecesi ya da `/yonetim-tezgahi` sekmesi) açılıp altı eylem bağlanmalı; olmayacaksa modül silinmeli.
11. **#11** — Ray'e/rayın oturum bloğuna bildirim yüzeyi eklenip `db.bildirim` okunmalı ve `bildirimOkundu` bağlanmalı.
12. **#12** — `/kimlik` ekranına erişim ataması formu eklenip `erisimAta` bağlanmalı.
13. **#13** — Kanıt oluşturan üç yol (`kanitEkle`, `kanitTalebiKarsila`, seed) kanıtı ilgili `MaddeDurumu`'nun tesisine `KanitTesis` ile bağlamalı; olmayacaksa uçtaki kapsam koşulu `maddeDurumu.tesisId` üzerinden kurulmalı.
14. **#14** — `surumOlustur` tek `db.$transaction` içine alınmalı ve madde/alan kopyalama `createMany` ile toplu yapılmalı.
15. **#15** — `SurumFarki` yazımı mevcut aktifleştirme transaction'ının içine taşınmalı.
16. **#16** — `onayYanEtkisi` çağrısı `onayKarar`'ın sahiplenme transaction'ına alınmalı (ya da kendi transaction'ıyla sarılmalı).
17. **#17** — `surecKapsamEkle` transaction'a alınmalı ve madde durumları `createMany({ skipDuplicates: true })` ile tek sorguda açılmalı.
18. **#18** — `/omur` sayfalanmalı (`take` + imleç) ya da en azından ölçülmüş 33,7 MB'yi doğuran iç içe ilişkiler ayrı toplu sorgulara bölünmeli.
19. **#19** — `/bulgular` ve `/riskler` ana sorgularına açık bir üst sınır (`take`) ve sayfalama eklenmeli.
20. **#20** — Düzeltme denetim sırasında geldi (`lib/is/zamanlayici.ts` bakım işi); ek iş yok.
21. **#21** — `surumAktiflestir` içindeki üçlü döngü, süreç×tesis çiftleri için tek `createMany({ skipDuplicates: true })` çağrısına indirilmeli.
