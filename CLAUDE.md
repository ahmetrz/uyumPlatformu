# Uyum ve Yönetişim Platformu

Düzenlemeye tabi kuruluşlar için BT/OT yönetişim, uyum ve dönüşüm
platformu. Ürün kodu `web/` altındadır (Next.js 16 · React 19 · Prisma 7 ·
SQLite).

Platform bir enerji şirketi için kurum içi geliştirildi ve **sektör ile
ülke bağımsız bir ürüne** dönüştürülüyor; ilk kurum, ilk ve referans
kiracı oluyor. Ne olduğu ve ne olmadığı `docs/URUN_VIZYONU.md`'de;
nasıl yapılacağı `docs/GELISTIRME_PAKETLERI.md`'de.

Bu dosya bir **yönlendiricidir**. Projenin gerçeği için güncel dosyaları
oku; buradan varsayma. Bu tablodaki her hedefin diskte var olması bir
kabul kriteridir (P0 · URN-KUR-003); ölü atıf eklemeyin.

## Nereye bakılır

| Konu | Yer |
| --- | --- |
| Ürün ne, ne değil · hangi kural değişti | `docs/URUN_VIZYONU.md` |
| İş listesi · paketler · kararlar defteri | `docs/GELISTIRME_PAKETLERI.md` |
| İlk müşteri asgari kümesi (ölçülmüş) | `docs/ILK_MUSTERI_ASGARI_KUME.md` |
| TR sektör paketleri · v1 kapsamı · efor ölçümü | `docs/TR_SEKTOR_PAKETLERI.md` |
| Paketlerin koda karşı durumu · çelişki kütüğü | `docs/GELISTIRME_PAKETLERI_DURUM.md` |
| Ürün / kod kuralları | `web/CLAUDE.md` → `web/AGENTS.md` (Next.js sürüm uyarısı) |
| Ürün bağlamı ve sözlük | `web/PRODUCT.md` |
| Tasarım sistemi | `web/DESIGN.md` |
| Veri modeli | `docs/ICERIK_MODELI.md` · `web/prisma/schema.prisma` |
| İçerik omurgası kararı (SCF · UCF · mevzuat) | `docs/ICERIK_OMURGASI_KARARI.md` |
| Mimari | `docs/MIMARI.md` |
| İsterlerin "nasıl" cevabı · veri yolları | `docs/VERI_NEREDEN_GELIR.md` |
| Ekran envanteri | `docs/ROTA_HARITASI.md` · `web/arac/rotalar.json` |
| PostgreSQL geçiş hazırlığı | `docs/POSTGRES_READINESS.md` |
| Bağlantı günü sırası | `INTEGRATION_DAY_RUNBOOK.md` |
| Ürünün kendi yedeği | `docs/URUN_YEDEKLEME.md` · `web/arac/yedek.mjs` |
| Senaryo kütüğü · test eşlemesi | `docs/MASTER_SCENARIO_REGISTRY.md` · `docs/SCENARIO_TEST_MATRIX.md` (`web/lib/senaryo/` üretir) |
| Kalite araçları ve kapılar | `web/arac/BENIOKU.md` |
| Devir kaydı · açık kalemler · son ölçüm | `docs/DEVIR_KAYDI.md` |
| Kalite borcu izin listesi · cırcır | `web/arac/kalite-borcu.json` |
| Ölçüm kapsamı tabanı | `web/arac/olcum-tabani.json` |
| Görsel künyeleri | `web/public/gorseller/KUNYE.md` · `web/public/tesisler/KUNYE.md` |
| Demo yolu · satış gezintisi | `docs/DEMO_YOLU.md` |
| Tesis-dışı sektör (bankacılık) model uyum testi | `docs/TESIS_DISI_SEKTOR_UYUM_TESTI.md` |
| Açılış ekranı devir notu · ürün şartı | `docs/ACILIS_DEVIR_NOTU.md` |
| Sektör-ülke paketi sözleşmesi | `docs/SEKTOR_PAKETI_SOZLESMESI.md` |
| Paket dizinleri · doğrulayıcı · kurucu (P4) | `web/paketler/BENIOKU.md` · `web/lib/paket/` · `docs/P4_TOHUM_TASIMA_OLCUMU.md` |
| Enerji–su parite kanıtı (K4) | `docs/kanit/faz-b-k4/OZET.md` · `web/arac/k4-enerji-su.mjs` |
| Zorunlu UX / ürün tasarımı skill seti | `.claude/skills/` |

Terim sözlüğü belgesi (`docs/TERIMLER_SOZLUGU.md`) **henüz yok**: terim
katmanı P1'de kurulur (`web/lib/dil/terimler.ts`), belge ondan sonra
yazılır. Kodsuz bir sözlük belgesi ilk gün doğru olur, ertesi gün yalan
söyler.

## Bağlayıcı kurallar

Ürünleştirme kararıyla (5 Eylül 2026) bazı kurallar **aynen kaldı**,
bazıları **değişti**. Çelişkide `docs/URUN_VIZYONU.md` §6 tablosu
kazanır.

### Kalan kurallar

**Uydurma veri yok.** Gerçek endpoint, credential, secret veya token
uydurulmaz. Sayılar (kapsam, Lighthouse puanı, kusur sayısı) ölçüldüğü
gibi yazılır, hedefe uydurulmaz. Ölçülemeyen "ölçülmedi" diye yazılır.

**Bilinmeyen ≠ sıfır.** Ölçülmemiş bir değer sıfır olarak gösterilmez,
ortalamaya çekilmez, tahmin edilmez. Ekran "ölçülmedi" der.

**Pasif önce, aktif tarama yok.** OT ağına paket gönderilmez.

**Motor önerir, insan karar verir.** Hiçbir motor durum değiştirmez,
sürüm aktifleştirmez, kanıtı "yeterli" işaretlemez.

**Değişmez denetim izi · dört göz · sır değeri saklanmaz.** Sır yalnız
`sirReferansi` ile taşınır (`env:` · `dosya:` · `vault:`).

**Bağlı olmayan sağlayıcı "bağlı değil" der.** Sessiz düşüş yok.

**Koyu tema.** Bütün ekranlar koyu temadır; açık temaya geçiş yoktur.

**Değişiklikler PR ile gelir.** `main`'e doğrudan push yok, otomatik
merge yok. **Merge ön koşulu İKİDİR: CI yeşil VE açık inceleme yorumu
yok.** İkisi ayrı şeydir ve biri öbürünün yerine geçmez. Ölçüldü: #30'da
inceleme 06:58'de düştü, merge 07:00'de yapıldı — yalnız CI'ya bakıldığı
için beş bulgu (ikisi P1) doğrudan `main`e girdi. Elle yapılan kontrol
bir gün yapılmaz; koşul dal korumasında da zorunlu tutulur
(`docs/DEVIR_KAYDI.md` → depo ayarı).

**Gerekçe kusuru anlatır, maliyeti değil.** Bir muafiyet, beyan ya da
"bilinçli körlük" kaydının gerekçesi, kusurun neden kusur OLMADIĞINI
söylemelidir. Düzeltmenin neye mal olacağını anlatan bir cümle gerekçe
değildir — ölçüldü: `Plant360` üç yerde "yakalamak dosya adlarını da
kirli sayardı" diye muaf tutulmuştu; düzeltme yapılınca muafiyet
buharlaştı. Tarama: `node arac/gerekce-tarama.mjs` (kapı değil, kusur
avı — çıktısı elle sınıflandırılır).

**Süresiz beyan yoktur.** Ertelenen her kırmızı, R0 kütüğüne SAHİBİ ve
HANGİ AŞAMADA kapanacağı yazılarak geçer (`docs/GELISTIRME_PAKETLERI.md`
§6). Sahipsiz bir erteleme üç hafta sonra sebebi bilinmeyen bir
istisnadır.

**Kırmızıyı koda yazmadan önce ölçüm ortamının tazeliğini doğrula.**
Bayat bir `next start` süreci, dolu bir disk ya da kapatılmış bir port,
kod kusuru gibi görünen kırmızılar üretir (üçü de ölçüldü). Sıra:
süreçleri öldür → portun kapandığını doğrula → derle → başlat → ölç.
Ayrıntı `web/arac/BENIOKU.md`.

**Düzelttiğini iddia eden değişiklik SABOTAJLA kanıtlanır.** Bir
kırmızıyı kapattığını söyleyen yama, geri alındığında kırmızıyı geri
GETİRMELİDİR. Getirmiyorsa düzelttiği şey o değildi — kapı başka bir
sebeple sustu, ya da kırmızı en baştan yanlış alarmdı. Ölçüldü: `/`
saha ekranının 27px'lik "kaydırılamayan içerik" kırmızısı için yazılan
`grid-template-rows` kısıtı, sabotaj turunda ETKİSİZ çıktı; asıl kusur
kapının kendi yürüyüşündeydi (kaydıran atayı atlayıp üstündeki kırpan
atayı suçluyordu). Sabotaj koşulmasaydı depoya, kusuru düzelttiğini
söyleyen bir gerekçeyle birlikte ölü bir kural girecekti. Aynı ölçüt
kapı düzeltmeleri için de geçerlidir: düzeltilmiş kapı, kusurun ESKİ
hâlinde hâlâ kırmızı yanmalıdır — yoksa düzeltme değil, delik açtın.


**Temizlik adımı SON KOŞULUNU doğrular.** "Durdurdum · sildim ·
boşalttım" diyen bir adım, dediğini yaptığını ÖLÇMELİDİR; başarısız
olamayan bir adım adım değildir. Ölçüldü: `pkill -f 'next start' ||
true` iki satırda üç kusur taşıyordu — `next start` açılışta süreç adını
`next-server (vX.Y.Z)` yapıyor (öldürme YABANCI bir detaya bağlıydı ve
sürümle kaymıştı), kalıp hiçbir şeye eşleşmiyor, `|| true` da bunu
susturuyordu. CI'da runner atıldığı için maskeliydi; `kapi:parti` aynı
adımı iş akışından türettiği için YERELDE her parti kapanışı 3210'da
bayat bir sunucu bırakıyordu — yani ölçüm aracımız, "bayat `next start`"
tuzağını kendi eliyle üretiyordu. Bugün: öldürme porttan yapılır, sonra
portun kapandığı BAŞKA bir araçla doğrulanır (öldüren `fuser`,
doğrulayan `curl` — tek araca bakan kontrol, o araç yoksa kandırılır) ve
kapanmadıysa kırmızıdır. Dedektör: `durdurmaKarari` ·
`sunucuYasamDongusu` (`web/arac/kapi-farki.mjs`), vakaları
`web/tests/sunucu-durdurma.test.ts`.

**Parti kapanış kapı kümesi = PR kapı kümesi.** Bir parti, PR'da koşan
kapıların TAMAMI koşulmadan "kapandı" diye yazılmaz. Ölçüldü: statik
demo derlemesi (`demo:build`) parti sonunda koşmadığı için modül döngüsü
İKİ PARTİ boyunca kırmızı kaldı ve kusur ancak PR açılınca göründü.
Küme elle sayılmaz, `pr-kapisi.yml`den türetilir: `npm run kapi:parti`
(`--liste` ile koşmadan görülür). Koşulmayan kapı "geçti" yazılmaz —
"ölçülmedi" yazılır ve kapanış kırmızıdır.

**Taban indirmesi ve tavan yükseltmesi gerekçe ister — DOSYADA.** Cırcır
bir turda iki kez zayıflatıldı; ikisi de elle yakalandı, üçüncüsü
yakalanmayabilir. Ölçüldü: `terimTavani` 85'ten 500'e çekildiğinde bekçinin
on bir vakası da yeşil kalıyordu. Bugün: ölçüm tabanı yalnız
`--taban-yaz --sebep="..."` ile iner ve gerekçe `olcum-tabani.json`
içine işlenir; tavan ölçülen sayının üstüne çıkamaz ve yükselme
`tavanGerekceleri` altında o yükselmeyi (`eski` → `yeni`) adıyla
anlatan bir gerekçe ister. Commit mesajı yetmez: commit mesajı dosyayı
okuyanın önünde durmaz.

**Borç kütüğünde tek karışık sayı bırakılmaz.** İzin listesinin her
satırı KALICI (ilkesel gerekçe, sıfır beklenmiyor) ya da ERTELENMİŞ
(hangi aşamada kapanacağı yazılı) olarak sınıflanır; erteleme kapanış
aşaması taşımak zorundadır ("süresiz beyan yoktur"), kalıcı satır
kapanış taşıyamaz. KALICI cırcırın kaçış kapısı olduğu için kendi alt
küme dişini taşır: taban dalda ertelenmiş olan bir satır bu dalda
kalıcıya sessizce terfi edemez.

**Nullable kolonda olumsuz yüklem NULL'u AÇIKÇA ele alır.** `NOT: { x: v }`,
`{ not: v }`, `{ notIn: [...] }`, ham SQL `NOT IN`/`<>`/`!=` üç değerli
mantıkta NULL satırı sessizce düşürür. Ölçüldü (8 Eylül 2026):
`NOT: { rol: 'kapasite' }` enerji Tesis 360'ta rolü boş yedi özniteliği
yok etti ve 3 292 yeşil test görmedi. Bugün: NULL ya `OR` dalıyla dâhil
edilir (`OR: [{ x: null }, { x: { not: v } }]`) ya `NOT: { x: null }` ile
bilerek dışlanır; ikisi de yoksa bekçi kırmızıdır
(`web/tests/bekci/null-olumsuzlama.test.ts`, URN-VER-001); meşru istisna
gerekçeli izin listesinde durur ve liste yalnız küçülür.

**Kaynak alanı ürün alanına BEYANLA girer (R-D).** Bir kaynak
belgenin alanı ürünün yanlış alanına yazıldığında biçim doğru, değer
aralıkta ve iki taraf da geçerli veridir — hiçbir kapı göremez. Ölçüldü
(bağımsız inceleme, PR #43 tur 2): EPDK Ek-3'ün "Seviye" kademesi ürünün
HEDEF OLGUNLUK alanına yazılmış, 508 zorunlu kontrolün hedefi en alt üç
kademeye çekilmiş, ad-hoc uygulama "hedefte" (yeşil) görünüyordu; kusuru
metni okuyan insan yakaladı. Bugün paket manifesti dolu HER ürün alanı
için "hangi kaynak alanından · hangi ürün alanına · hangi gerekçeyle"
beyan eder (`alanEslemesi`); gerekçe alanın ANLAMINI anlatır, dönüşümün
kolaylığını değil. Beyansız dolu sütun, ölü beyan, çifte beyan, temsilî
çerçeveye beyan ve olmayan çerçeveye beyan KIRMIZIDIR
(`web/tests/paket-alan-eslemesi.test.ts`, URN-PKT-022). **Kapı beyanın
VARLIĞINI ölçer, DOĞRULUĞUNU değil** — kabul edilmiş sınırdır ve
`docs/SEKTOR_PAKETI_SOZLESMESI.md` §1.10'da yazılıdır: doğruluk bağımsız
incelemenin işidir, "kapı yeşil" onu doğrulanmış saymaz.

**Kırmızı yakmayan sabotaj BİR BULGUDUR (R-E).** Sabotaj turu iki şeyi
birden ölçer: kodun kusurunu ve TESTİN KENDİSİNİ. Bir sabotaj kırmızı
yakmıyorsa test, iddia ettiği şeyi sınamıyor demektir — kod doğru olsa
bile o iddia ölçülmemiştir. Bu bir bulgudur: parti kapanmadan çözülür,
"düzeltildi" yazılmaz, "sabotaj yakmadı, test şu şekilde düzeltildi"
yazılır.

**Yakmayan sabotaj sayısı HER RAPORDA yazılır** — test kümesinin sağlık
göstergesidir ve sıfır olması beklenmez; bilinmeyen ≠ sıfır kuralının
test katmanındaki karşılığıdır.

Gerekçe ölçüldü (10 Eylül 2026, #47–#48): 22 sabotajın **dördü** kırmızı
yakmadı ve üçü ölü kural olarak depoya girecekti.

| Yakmayan sabotaj | Testin gerçekte ölçtüğü | Nasıl düzeltildi |
| --- | --- | --- |
| Durum korumasını kaldır | Sıralı çağrıda kapı zaten reddediyordu — YARIŞ hiç kurulmamıştı | İki eylem `Promise.all` ile başlatıldı: ikisi de bayat okumayla kapıdan geçiyor |
| Atfı yanlış eke çevir | Kapı yalnız maddenin VARLIĞINI ölçüyordu | Başlık dişi eklendi |
| Aynısı, ikinci kez | EPDK aynı başlığı farklı maddelerde kullanıyor | Mercinin kısaltması maddenin METNİNDE aranır |
| Kapsam notunun bir cümlesini sil | Not aynı sözcüğü başka cümlede de taşıyordu | Sabotaj notun ESKİ hâline çevrildi (yanlış sabotaj, gerçek kusur yok) |

Son satır kuralın öbür yüzüdür: yakmayan sabotaj her zaman testin kusuru
değildir — SABOTAJIN kendisi de zayıf olabilir. Ayrım şudur: sabotaj
kusurun ESKİ hâlini geri getiriyor mu? Getiriyorsa ve kırmızı yanmıyorsa
bulgu testtedir; getirmiyorsa sabotaj yeniden yazılır.

**İnceleme turu İKİ ile sınırlıdır (R-A).** Tur 1 → düzelt → tur 2 →
düzelt → merge. Üçüncü turda çıkan bulgular YENİ PR olur. Gerekçe
(ölçüldü, 9 Eylül 2026, #41): dal inmezse `main` ayrışır; birleştirme
maliyeti aynı günde iki kez ödendi (#37 ile birleştirme + üç inceleme
turu). Bağımsız inceleme değerlidir — iki turda 15 gerçek bulgu, sıfır
yanlış alarm; kapıların göremediği sınıflar (transaction sınırı, kaskat
silme, telifli metin kaçağı) ancak orada çıktı — ama sınırsız tur, dalı
hiç indirmez.

**Şema/göç, kiracı verisi ve lisans sınırına dokunan PR'larda BAĞIMSIZ
İNCELEME ZORUNLUDUR (R-B).** Kural ZAYIFLATILMADI: bağımsız inceleme bu
depoda 40'tan fazla gerçek kusur buldu ve kapıların göremediği sınıfları
(transaction sınırı, kaskat silme, telifli metin kaçağı, anlam eşleme
hatası) yalnız o yakaladı. Diğer PR'larda mevcut kural aynen geçerlidir:
inceleme koştu ve temiz · koştu ve bulgu var (bulgular kapanmadan merge
yok) · koşmadı ve PR gövdesinde beyanlı. Merge ön koşulu (CI yeşil VE
açık inceleme yorumu yok) her sınıfta değişmez.

R-B kapsamındaki bir PR'da inceleme **hiç alınamıyorsa** (kota, erişim,
kaynak yok) bu SÜRESİZ BEKLEME DEĞİLDİR — üçüncü durum işler ve sırası
bağlayıcıdır:

1. **Bir kez daha dene.** #43'te işe yarayan yol: ayrı worktree, YAZMA
   YETKİSİZ okuma, ikinci model. Kotanın dolması kalıcı değildir.
2. Yine alınamıyorsa **YAPILANDIRILMIŞ ÖZ-İNCELEME** koşulur. Serbest
   okuma değildir: bu depoda bağımsız incelemenin GERÇEKTEN yakaladığı
   sınıflara karşı, sınıf sınıf yürünür ve her sınıf için "bakıldı mı ·
   bulgu var mı · kanıt ne" yazılır.

   | # | Sınıf |
   | --- | --- |
   | 1 | Transaction sınırı — iz kaydı işlemin DIŞINDA mı |
   | 2 | Kaskat silme · müşteri verisi kaybı (R-C) |
   | 3 | Telifli metin kaçağı (grup · iç içe parça · CSV · XLSX) |
   | 4 | Anlam eşleme hatası — kaynak alanı yanlış ürün alanına (R-D) |
   | 5 | Üç değerli mantık — NULL, olumsuz yüklem, "bilinmeyen" |
   | 6 | Hiçbir şey ölçmeden yeşil yanan kapı · atlanan iş |
   | 7 | Tek tek doğru, BİRLİKTE tutarsız ekran cümleleri |
   | 8 | Sağlayıcı/ortam farkı — env, artefakt, iki zincir |

3. Sonuç PR gövdesinde **AÇIKÇA** beyan edilir: "bağımsız inceleme
   alınamadı; yapılandırılmış öz-inceleme koşuldu" + sınıf tablosu.
4. **R0 kütüğüne kayıt düşer**: hangi PR · hangi tarih · neden
   alınamadı (`docs/GELISTIRME_PAKETLERI.md` §6).
5. Ancak bundan sonra merge edilebilir.

**Öz-inceleme bağımsız incelemenin YERİNE GEÇMEZ.** Kaynağı olmayan
durumda tanımlı ve ölçülmüş bir ASGARİDİR; "inceleme yapıldı" diye
yazılmaz, "alınamadı, yerine şu koşuldu" diye yazılır.

**Paket işlemleri müşteri verisini SİLEMEZ, yalnız arşivler (R-C).**
Bekçi tavanı SIFIRDIR; gerekçeli istisna kabul edilmez. Ölçüldü:
"kaldırma = arşiv, silme yok" yazılıydı ve kod `madde.deleteMany` ile
kiracının kapsam alanı eşlemesini kaskatla siliyordu (#41 inceleme
bulgusu) — kural yetmedi, kapı gerekti. Bugün
`web/tests/bekci/paket-silme.test.ts` (URN-PKT-010): `lib/paket/` ve
paket eylemlerinde `madde` dışında hiçbir modelde `delete`/`deleteMany`
yok; madde silmesi yalnız paketin kendi taslağını (`surumId`) hedefler ve
bağ kontrolünden sonra gelir; şemada `Madde`den başka modele giden HER
liste ilişkisi bağ kontrolündedir (`MADDE_BAG_ILISKILERI`); kurucu
istisna listesi ihraç etmez. Bir uyum ürününde paket işleminin müşteri
verisini silmesi, ürünün en temel vaadini (değişmez iz) bozar.

**Dosyayı değiştirmeden önce güncel hâlini oku.**

### Değişen kurallar

**Ürün adı yapılandırmadan gelir.** Görünen ad "Uyum ve Yönetişim
Platformu"dur; **geçici ve tanımlayıcı** bir addır, marka değildir,
sektör sözcüğü içermez. Ad koda **gömülmez**: tek kaynak
`web/lib/marka.ts` (`MARKA_AD`, `NEXT_PUBLIC_MARKA_AD` ile ezilir).
Kabuk sözcük markasının ilk satırı kurulumun adıdır (`KIRACI_AD`; P2
bunu `Kiraci.markaAd` alanına taşır). `Regula` **iç çalışma adıdır** ve
arayüzde, sitede, dış iletişimde kullanılmaz; domain alınmaz, marka
başvurusu yapılmaz, logo çizdirilmez (`docs/URUN_VIZYONU.md` §10).

**Dil çok dillidir; Türkçe birinci dil.** Kod yorumları, commit
mesajları ve belgeler Türkçedir. Arayüz metinleri P3'ten sonra mesaj
kataloğundan gelir (TR birinci, EN ikinci); o güne kadar mevcut Türkçe
metinler kalır, **yeni** metin sözlük anahtarıyla yazılır. İçerik
paketleri kendi dilinde kalır ve ekran içeriğin dilini rozetle söyler.

**"Kurum" değil "müşteri/kiracı".** Ürün bir kuruma değil, kiracılara
hizmet eder. İlk kurum **referans kiracıdır**; adı ve verisi yalnız
kendi kurulumunda bulunur.

**Gerçek müşteri sistemine bağlanılmaz.** AD/Entra, EDR, zafiyet
tarayıcı, SIEM, yedekleme platformu, firewall ve ağ cihazları, OT keşif
ürünü, PAM/VPN/tedarikçi oturum sistemi, herhangi bir kurum içi API —
hiçbirine erişilmez. Bu kural **müşterinin kendi** sistemleri içindir:
kamuya açık resmî kaynaklar (Resmî Gazete, EPDK, KVKK, CISA, NVD…)
belgelenmiş sabit olarak koda girebilir, `etkin=false` gelir ve
`robots.txt` uygulanır (`docs/GELISTIRME_PAKETLERI.md` §0.2).

**Depodaki veri kurgusaldır.** Gerçek kurum, tesis ya da kişi adı; gerçek
bir tesisin fotoğrafı; tesise bağlı gerçek güvenlik bulgusu koda
**girmez**. Depo geneldir (public). Şüphedeysen sor.

**Görseller.** Tesis görselleri temsilîdir ve ödünç alınmaz: fotoğrafı
olmayan tesise başka bir tesisin görseli konmaz, üretim tipleri
birbirinin yerine geçmez (`web/public/tesisler/KUNYE.md`). Giriş ve
saha görselleri üçüncü taraf atıf yükümlülüğü taşımaz
(`web/public/gorseller/KUNYE.md`). Kurgusal demo kiracısının kayıtları
gerçek bir tesise bağlanmaz.

**Sektör ve ülke bağımsızlık.** Çekirdeğe sektör terimi ("santral",
"MWe"), ülke adresi, para birimi, mevzuat adı ya da dil sabiti
**girmez**; bunlar içerik paketinden, kiracı yapılandırmasından ve
öznitelik şemasından gelir (`docs/GELISTIRME_PAKETLERI.md` §0.5). P1
öncesi mevcut "santral" metinleri **yeni** kodda çoğaltılmaz.
**Sektöre özgü hiçbir alan çekirdek kolonu olmaz** — paketin beyan ettiği
özniteliktir (`SektorOznitelikSemasi`: tip · rol · grup · seçenek); ölçüldü:
sekiz enerji profil kolonu B2 ile öznitelik oldu. Uyum zincirinin öznesi
`Tesis` değil `KapsamOgesi`dir; omurga tablosu doğrudan `tesisId` taşımaz.
İkisi de bekçilidir (`web/tests/bekci/sema-sektorsuz.test.ts` ·
`web/tests/bekci/kapsam-omurga.test.ts`); istisna yalnız küçülen gerekçe
listesinde durur, sabotaj kanıtı zorunludur.

## Zorunlu UX / ürün tasarımı skill seti

UX, UI, ürün tasarımı, etkileşim tasarımı, bilgi mimarisi, responsive
tasarım, erişilebilirlik veya kullanıcı akışıyla ilgili **her** görevde
aşağıdaki üç skill birlikte kullanılmalıdır:

1. `.claude/skills/enterprise-ux-product-design-auditor/SKILL.md`
2. `.claude/skills/credit-efficient-enterprise-design-execution/SKILL.md`
3. `.claude/skills/enterprise-interaction-simplification-auditor/SKILL.md`

Bunlar opsiyonel referans değildir; çalışma talimatıdır.

UX/UI işi başlamadan önce:

- üç skill dosyasının da güncel hâlini oku,
- mevcut kullanıcı yolculuğunu ve ekranın birincil kullanıcı görevini tanımla,
- mevcut audit ve kabul edilmiş kararları tekrar üretmek yerine delta üzerinden ilerle,
- iş kuralları, RBAC, kapsam, değişmez denetim izi, köken ve bilinmeyen veri
  semantiğini koru,
- bilişsel yükü, görev tamamlama süresini, gereksiz tıklamayı, bilgi tekrarını,
  bağlam kaybını ve gereksiz navigasyonu ayrı kalite eksenleri olarak ölç,
- responsive/axe/test kapılarının yeşil olmasını tek başına iyi UX kanıtı sayma,
- mümkün olduğunda tek güçlü tasarım yönü seç; gereksiz varyant üretme,
- önce örnek/archetype ekranlarda doğrula, sonra platform geneline yay.

Çelişki durumunda öncelik sırası:
1. güvenlik ve veri bütünlüğü,
2. iş kuralları / yetki / kapsam / audit,
3. doğru semantik ve gerçeklik,
4. kullanılabilirlik,
5. görsel iyileştirme,
6. yürütme/credit optimizasyonu.

Claude Code görevin başlangıcında bu üç skill'in okunduğunu kısa bir
`SKILL LOAD CHECK` ile doğrulamalı ve her biri için bu görevde uygulanacak
en az üç kuralı belirtmelidir. Bu kontrol audit veya kod değişikliğinden önce
yapılır.

## Kalite kapıları

CI'da (`.github/workflows/pr-kapisi.yml`) **on iş** koşar:

| İş | Ne koşar |
| --- | --- |
| `kapi` | lint · tsc · vitest · test envanteri · ters kapsam · dil · tasarım · sözlük kipi · şema sapması · göç zinciri · PostgreSQL taban tazeliği · gerekçe taraması (bilgi) · **kapı farkı** · **derleme ortamı beyanı** |
| `derleme` | üretim derlemesi **BİR KEZ** + ortam damgası; `.next` (cache hariç · ölçüldü 74 MB) artefakt olur |
| `kapi-rota` · `kapi-gezinme` · `kapi-tasma` · `kapi-axe` | dört tarayıcılı kapı **paralel**; dördü de AYNI artefaktı indirir ve ortam beyanını doğrular. `kapi-rota` tek sunucuyla BEŞ kapı koşar: rota duman · denetim formu kanıtı (R12) · bildirim kaydı kanıtı (R10) · bildirim dönemi kanıtı (R10+) · kimlik ve SSO kanıtı (P6) |
| `kapi-demo` | statik demo derlemesi + marka kapısı — ortamı FARKLI (`NEXT_PUBLIC_DEMO=1`), bu yüzden kendi derlemesini yapar |
| `kapi-yavas` | **toplayıcı**: kapı koşmaz, beş işin sonucunu toplar. Adı korunuyor çünkü dal korumasındaki zorunlu check adıdır ve o ayar koddan görünmez |
| `kapi-postgres` | postgres:16 servisi — `kapi:pg-goc` ve TAM test kümesi (iki sağlayıcıda da aynı sayı) |
| `kapi-compose` | `deploy/compose/` ile ayağa kalkan kurulumda `rota:duman` — ürünün müşteri ortamında çalıştığının tek kanıtı |

Bölünmenin gerekçesi ve sonucu ÖLÇÜLDÜ (9 Eyl 2026):

| | Seri (`80ce71c`) | Paralel (`1951110`) |
| --- | --- | --- |
| **Koşunun duvar saati** | **14 dk 00 sn** | **6 dk 19 sn** |
| `kapi-yavas` | 12 dk 54 sn (altı kapı seri) | 3 sn (toplayıcı) |
| `kapi` | 5 dk 21 sn | 4 dk 18 sn (derleme çıktı) |
| `derleme` | — (derleme iki işte tekrarlıyordu) | 1 dk 40 sn |
| En uzun tarayıcılı iş | — | `kapi-axe` 4 dk 30 sn |

Kritik yol artık `derleme` → `kapi-axe` → toplayıcı. Kazanç 7 dk 41 sn
(%55): seri kümede sürenin yarısı ölçüm değil BEKLEMEYDİ ve bu bekleme
bir turda iki kez faturalandı — `main` iki kez ilerledi, dal iki kez
yeniden ölçüldü. Artefakt taşımanın maliyeti ölçüldü ve küçük çıktı:
yükleme 7 sn, indirme 3–4 sn (74 MB).

**Hiçbir kapı çıkarılmadı.** Seri kümenin 23 kapısının 23'ü duruyor ve
bu bir testle sabit (`web/tests/kapi-is-kapsami.test.ts`); üstüne ALTI
kapı eklendi ve altısı da o testte adıyla beyanlı — bölünmenin kendisi
üçünü getirdi (derleme ortamı damgası · doğrulaması · `kapi:derleme-artefakti`),
kalan beşi sonraki işlerde eklendi (`kanit:denetim-formu` ·
`kapi:ithal-zinciri` · `kanit:bildirim-kaydi` · `kanit:bildirim-donemi` ·
`kanit:kimlik`). Ölçüm (10 Eyl 2026): 23 + 8 = **31 benzersiz komut, 32
adım** (bir komut iki ayrı ortamda koşuyor ve bu iki ayrı kapıdır). Sayı
elle sayılmaz, testte iki yönlü eşitlikle tutulur: kapı düşerse de,
BEYANSIZ kapı eklenirse de kırmızı.

**Paylaşılan derlemeyi tüketen her iş ORTAM BEYAN EDER**
(`DERLEME_ORTAMI`). Beyansız tüketim kırmızıdır; beyanı üreticiden
farklı olan iş artefaktı tüketemez, kendi derlemesini yapar. Gerekçe
ölçüldü: `NEXT_PUBLIC_*` istemci paketine DERLEME ANINDA gömülür —
indiren işin verdiği değer hiçbir şey yapmaz ve ekran derleyenin
değerini gösterir (`web/arac/derleme-artefakti.mjs`).

**İş adları da türetilir.** `kapi:parti` yerel kümeyi iş akışından
çıkarır (`isler()`); sabit ad listesi yoktur. Kapı TAŞIYAN bir iş
kümenin dışında kalırsa kapanış KIRMIZI olur — ölçüldü: dört ad sabit
yazılıyken eklenen beşinci iş yerel kümeye hiç girmiyor, kapanış yine
"tamamı koştu" diyordu.

Dört tarayıcılı kapı CI'da üretim sunucusuyla koşar ve BLOKLAYICIDIR;
taşma ve axe kapılarının açık bulguları `web/arac/kalite-borcu.json`
izin listesindedir ve liste **yalnız küçülebilir** (dört dişli cırcır —
tavan · alt küme · taban dal `origin/main` · okunamazsa kırmızı).

Taşma kapısı **üç kusur türü** ölçer: sayfa yana kayıyor mu · kırpılan
içerik var mı · akış içi iki taşıyıcı üst üste biniyor mu. Taşma ve axe
kapıları oturum İSTEMEYEN yüzeyleri (`/giris`) ayrı ve oturumsuz tarar.

Geri kalan tarayıcılı kapılar canlı sunucu ister ve elle koşulur
(`PORT=3210 npm run dev` başka bir kabukta). Hangileri olduğu tahmin
değil ölçüm: **`npm run kapi:farki`** her `package.json` betiğini PR
kapısında gerçekten koşanla karşılaştırır; koşmayan her betik
gerekçesiyle beyan edilmiş olmalı, beyansız betik kapıyı kırmızı yakar.
Koşulmayan kapı "geçti" diye yazılmaz — "ölçülmedi" yazılır.

Sayı raporlayan her kapı bir **ölçüm tabanı** taşır
(`web/arac/olcum-tabani.json`): cırcır borç için TAVAN tutar, taban
kapsam için TABAN. Kusur sayısı sıfır olabilir; ölçüm sayısı olamaz —
sıfır ölçümle "kusur yok" demek, hiçbir şeye bakmadan temiz
raporlamaktır (ölçüldü: disk dolunca test keşfi 0 vaka döndü ve sayım
kapısı "gerçek keşifle doğrulandı" diyerek geçti). Taban ancak ÖLÇÜMLE
indirilir (`--taban-yaz`) ve düşüşün sebebi commit mesajına yazılır.
