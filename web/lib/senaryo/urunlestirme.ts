import type { Senaryo } from './tipler';

/* ═══════════════════════════════════════════════════════════════════════
   ÜRÜNLEŞTİRME SENARYOLARI — P0 · kurgu, kurallar, ad

   Bu dosyadaki senaryoların "kullanıcısı" ürünü sürdüren kişidir ve
   "ekranı" deponun kendisidir. Kütüğe girmelerinin sebebi şu: P0'ın
   kabul kriterleri belge cümleleridir ve belge cümleleri sessizce
   bayatlar. Kütüğe girince her biri bir teste bağlanır (`senaryo-belge`
   aracı bağı ölçer) ve bayatlama ilk koşuda kırmızı olur.

   Ad değişimi bu ürünün planlı bir olayıdır — bugünkü ad geçicidir
   (`docs/URUN_VIZYONU.md` §10). URN-KUR-004 o değişimin tek satır
   kalmasını garanti eder. */

export const URUNLESTIRME_SENARYOLARI: Senaryo[] = [
  {
    id: 'URN-KUR-001', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Hangi kuralın kaldığını, hangisinin değiştiğini tek yerden okuyabilmek',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Ürünleştirme kararı verilmiş (5 Eylül 2026)', veriHali: 'normal',
    eylem: 'Kök `CLAUDE.md` bağlayıcı kurallar bölümünü okur',
    beklenenSonuc: 'Kurallar "kalan" ve "değişen" başlıkları altında ayrılmıştır; tek dilli ve gömülü ürün adı cümleleri kalkmıştır',
    beklenenEkran: 'Ekran yok — belge',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-002', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Ürün sözleşmesinin çok kiracılı kurguyu anlattığından emin olmak',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'P0 uygulanmış', veriHali: 'normal',
    eylem: '`web/PRODUCT.md` kullanıcı tiplerini, konumlandırmayı ve marka bölümünü okur',
    beklenenSonuc: 'Kiracı yöneticisi, ürün yöneticisi ve destek tipleri yazılıdır; konumlandırma beş mekanizma sayar; ürün adı düz metin geçmez, yapılandırmaya atıf yapar',
    beklenenEkran: 'Ekran yok — belge',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-003', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Yönlendirici belgenin var olmayan dosyalara göndermemesi',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Vizyon belgesi depoda; tabloda temizlik öncesi 13 ölü atıf vardı',
    veriHali: 'yok',
    eylem: '`CLAUDE.md` "Nereye bakılır" tablosundaki her hedefi açmayı dener',
    beklenenSonuc: 'Tablodaki her hedef diskte vardır; ölü atıf sayısı sıfırdır',
    beklenenEkran: 'Ekran yok — belge',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-004', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Ürün adını değiştirmenin tek satırlık bir iş olması',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Ad geçici; kalıcı ad sonra verilecek. Kaynak taraması sözcük-olan adlarda yanlış alarm verdiği için davranış ölçümüne çevrildi',
    veriHali: 'çelişen',
    eylem: 'Nöbetçi bir adla statik demo derlemesi koşar ve üretilen çıktıya bakar',
    beklenenSonuc: 'Varsayılan ad işlenmiş hiçbir yüzeyde geçmez (JS demeti taranmaz — oradaki varsayılan yedeğin kendisidir); nöbetçi ad sekme başlıklarında ve kabuk sözcük markasında görünür. Belgelerdeki başlıklar da varsayılandan sapmaz',
    beklenenEkran: 'Sekme başlığı ve kabuk sözcük markası nöbetçi adı gösterir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'URN-KUR-005', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Depoda gerçek bir kuruluş adının bulunmaması',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Depo public ve demo dışarıya gösteriliyor; tohumda on sekiz '
      + 'gerçek şirket adı vardı ve bazılarına uydurma güvenlik zafiyeti bağlıydı',
    veriHali: 'aykiri',
    eylem: 'Tohum koşulur ve veritabanındaki kuruluş, üretici, denetleyici, '
      + 'tüzel kişi ve kişi adları okunur',
    beklenenSonuc: 'Hepsi `prisma/kurgusal-adlar.ts` kümesinden gelir; kara liste '
      + 'değil TEK KAYNAK ölçülür, böylece yarın eklenecek yeni bir gerçek ad da yakalanır',
    beklenenEkran: 'Ekranda hiçbir gerçek firma adı görünmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-006', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Depoda beyansız bir gerçek ÜRÜN adının bulunmaması',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Kuruluş adları kurgusallaştırıldı ama ürün/yazılım adı alanları '
      + 'kapsam dışındaydı; ürün adı da bir iddia taşır — "şu üründe oturum '
      + 'kaydı yok" cümlesi, ürünün adı gerçekse o ürün hakkındadır',
    veriHali: 'aykiri',
    eylem: 'Tohum koşulur ve veritabanındaki yazılım adı, varlık modeli, '
      + 'işletim sistemi, connector kaynak sistemi ve sertifika veren alanları okunur',
    beklenenSonuc: 'Her değer ya `prisma/kurgusal-adlar.ts` kurgusal kümesinden '
      + 'gelir, ya bir TİP sözcüğüdür, ya da `GERCEK_AD_BEYANLARI` içinde kaynağı '
      + 've gerekçesiyle beyan edilmiştir; beyansız gerçek ad kırmızıdır',
    beklenenEkran: 'Ekranda beyan edilmemiş hiçbir gerçek ürün adı görünmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-007', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'İstisnanın sessiz bir beyaz listeye çürümemesi',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Gerçek ad istisnası meşrudur (entegrasyon hedefi, yayımlanmış CVE) '
      + 'ama beyan tablosu, kara liste yazmamak için kurulan kapının tersinden '
      + 'bir beyaz listeye dönüşmesinin en kolay yoludur',
    veriHali: 'aykiri',
    eylem: 'Beyan tablosu ile veritabanı karşılaştırılır: beyanların kaynağı ve '
      + 'gerekçesi, kullanımda olup olmadıkları, zafiyet satırlarının kaynak '
      + 'referansı ve kurgusal/gerçek ad karışımı ölçülür',
    beklenenSonuc: 'Kaynaksız ya da gerekçesiz beyan kırmızıdır; veritabanında '
      + 'geçmeyen beyan kırmızıdır; kaynak referansı olmayan zafiyet kırmızıdır; '
      + 'kurgusal bir adı gerçek bir adla aynı kayıtta birleştiren metin kırmızıdır',
    beklenenEkran: 'ekran yok — depo kapısı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  /* ── P1 · URN-ALN ────────────────────────────────────────────────────
     Kütüğe yalnız TESTİ OLAN senaryo girer: kayıtlı ama testsiz senaryo
     `senaryo-belge` aracında GAP olur ve kütük "kapsanıyor" diye yalan
     söylemeye başlar. P1'in kalan kriterleri (002-006) uygulandıkça
     buraya eklenir. */
  {
    id: 'URN-ALN-001', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Sektöre özgü niteliğin çekirdek şemadan çıkarken kaybolmaması',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Kurulu güç bir kolondu; öznitelik satırına taşınıyor',
    veriHali: 'kısmi',
    eylem: 'Göç koşulduktan sonra kolon ile öznitelik satırı karşılaştırılır',
    beklenenSonuc: 'Değeri olan her tesis ve birim aynı sayıyı öznitelik satırında taşır; değeri OLMAYAN satır almaz ve göç ölçüm zamanı uydurmaz',
    beklenenEkran: 'Ekran yok — veri göçü',
    beklenenIz: 'yazma yok (göç betiği)', beklenenBildirim: 'yok',
    katmanlar: ['MIGRATION', 'DOMAIN'],
  },
  {
    id: 'URN-ALN-002', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Niteliğin kolondan satıra geçmesinin kapsam kararını kaydırmaması',
    rol: 'uyum sorumlusu', kapsam: 'kiracı geneli',
    onkosul: 'Uygulanabilirlik kuralı artık öznitelik anahtarı okuyor',
    veriHali: 'kısmi',
    eylem: 'Bütün tesisler için kapsam yeniden hesaplanır',
    beklenenSonuc: 'Kapsama giren tesis kümesi göç öncesiyle AYNI kalır; elle değiştirilmiş karar korunur; özniteliği ÖLÇÜLMEMİŞ tesis "kapsam dışı" değil "bilinmiyor" döner ve sağlanan başka bir koşulu engellemez',
    beklenenEkran: 'Uygulanabilirlik kararı gerekçesiyle; ölçülmemiş nitelik "bilinmiyor" yazar',
    beklenenIz: 'hesaplama', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'URN-ALN-004', alan: 'Ürünleştirme', rota: '/tesisler/[id]', eksen: 'arayuz',
    amac: 'Ekran metninin kiracının sektörüne göre değişmesi, kodun değişmemesi',
    rol: 'enerji kiracısının uyum sorumlusu', kapsam: 'tek tesis',
    onkosul: 'Tesisin tipi bir sektöre bağlı; o sektörün terim sözlüğü kurulu',
    veriHali: 'dolu',
    eylem: 'Tesis 360 ekranı açılır; sonra sektör sözlüğü kaldırılıp aynı ekran yeniden açılır',
    beklenenSonuc: 'Sözlük kuruluyken ekran adı "Tesis 360" ve birim şeridi "üretim üniteleri"; sözlük yokken AYNI bileşen "Tesis 360" ve "birimler" der. Eksik biçim çekirdeğe düşer, ekran boş kalmaz',
    beklenenEkran: 'Tesis 360 — sekme başlığı, ölçü şeridi, birim bölümü ve saha şeridi sözlükten',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'URN-ALN-003', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Çekirdek koda sektör teriminin geri sızmasını engellemek',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Aşama E sonunda 12 dosya hâlâ gömülü terim taşıyor (258\'den indi); '
      + 'kalanların her biri kütükte YAZILI bir kalıcı ya da ertelenmiş gerekçe taşıyor',
    veriHali: 'kısmi',
    eylem: 'Bekçi test app/, components/ ve lib/ altındaki .ts/.tsx/.css dosyalarını (adları dâhil) tarar',
    beklenenSonuc: 'İzin listesinde OLMAYAN dosyada sektör terimi varsa kırmızı; listedeki bir dosyada terim kalmamışsa kırmızı (listeden düşürülür); liste tavanı aşamaz. Tarama metin literaliyle sınırlı değildir — tanımlayıcılar, yorumlar, CSS sınıfları ve dosya adları da sayılır',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'URN-ALN-007', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Bekçinin Türkçe yazım biçimlerine kör kalmaması',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Terim araması iki küçültmenin (tr-TR ve değişmez) birleşimi üzerinde yapılır',
    veriHali: 'yok',
    eylem: 'Bugün depoda geçmeyen yazımlar (ÜNİTE · TERMİK · TERMIK · UNITE · DGKÇ · şapkasız rüzgar) bekçi kalıbına verilir',
    beklenenSonuc: 'Her yazım için düzeltme ÖNCESİ kalıp 0, bugünkü kalıp 1 eşleşme verir. Katlama mantığı tek küçültmeye sadeleştirilirse ya da Unicode sözcük sınırı `\\b`ye döndürülürse vakalar kırmızıya döner; körlük sessizce geri gelemez',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-ALN-008', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Sözlük terimine Türkçe ekinin ELLE eklenmesini engellemek',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Sözlük altı hâl verir (tekil · çoğul · iyelik · belirtme · bulunma · '
      + 'yönelme); yoksunluk (-siz) ve ayrılma (-den) hâlleri YOKTUR',
    veriHali: 'yok',
    eylem: 'Bekçi, kaynakta `${…sözlük çağrısı…}` hemen ardından küçük harf gelen '
      + 'yazımları arar (`${terim(\'tesis\')}siz`)',
    beklenenSonuc: 'Tek bir örnek bile kırmızı verir; tavan sıfırdır ve borç kütüğü '
      + 'yoktur. Ek ünlü uyumuna göre değişir ("saha" → "sahasız", "istasyon" → '
      + '"istasyonsuz"): çekirdek sözlükte doğru görünen yazım sektör paketiyle bozulur. '
      + 'Aşama E\'de üç gerçek örnek bu kalıpla bulundu ve cümleler var olan hâllerle '
      + 'yeniden yazıldı; kalıcı vakalar o üçünü tutuyor',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'URN-KAP-001', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Uyum omurgasının tesise geri çakılmaması',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'B1: dokuz omurga tablosu (süreç kapsamı · madde durumu · uygulanabilirlik '
      + 'kararı · istisna · kanıt bağı · denetçi kapsamı · aktarım · anlık · yetki) '
      + 'kapsam öğesine bağlı; tesis yalnız `KapsamOgesi.tesisId` köprüsü',
    veriHali: 'aykiri',
    eylem: 'Bekçi şemayı okur: `kapsamOgesiId` taşıyan her modelde doğrudan `tesisId` '
      + 'arar; izin listesi taban dalın alt kümesi olmak zorundadır',
    beklenenSonuc: 'Omurga tablosuna eklenen tek bir `tesisId` kolonu adıyla kırmızı; ölü '
      + 'izin satırı da kırmızı; liste yalnız küçülür. Kalıcı vaka kirli parçayı kırmızı, '
      + 'temizini yeşil görür',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'MIGRATION'],
  },
  {
    id: 'URN-KAP-002', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Sektöre özgü alanın çekirdek kolonu olamaması (kalıcı kural)',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'B2: `TesisProfili`nin sekiz enerji kolonu paketin öznitelik şemasına taşındı; '
      + 'kurulu paketlerin anahtarları tohum kaynağından okunur',
    veriHali: 'aykiri',
    eylem: 'Bekçi şema model/alan adlarını paket anahtarlarına ve sektör terimi '
      + 'kalıplarına karşı tarar',
    beklenenSonuc: '`blackStart` gibi bir paket anahtarı ya da adında sektör sözcüğü taşıyan '
      + 'bir kolon adıyla kırmızı; tavan sıfır, borç kütüğü yok',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KAP-003', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Taze kurulum (tohum) ile yükseltmenin (göç) aynı veriyi yazması ve göçün veri kaybettirmemesi',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Tür kataloğu, öğe kimlik kuralı, kurum eşlemesi, öznitelik şeması, etiketler, '
      + 'profil→öznitelik taşıması ve kural bileşimi iki kaynakta (SQL · TypeScript) yaşar',
    veriHali: 'normal',
    eylem: 'Göç SQL\'i ayrıştırılıp tohum sabitleriyle alan alan karşılaştırılır; göç '
      + 'öncesi/sonrası sayım dosyaları ortak anahtarlarda eşitlik için okunur',
    beklenenSonuc: 'İki kaynaktan biri değişip öbürü değişmezse kırmızı; K3 sayımlarında '
      + 'ortak anahtarların hepsi eşit, her tesis bir öğe almış',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['MIGRATION', 'DOMAIN'],
  },
  {
    id: 'URN-VER-001', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Nullable kolon üzerindeki olumsuz yüklemin NULL satırı sessizce düşürmemesi (veri doğruluğu sınıfı)',
    rol: 'ürünü sürdüren geliştirici', kapsam: 'depo geneli',
    onkosul: 'Prisma `NOT:` · `not:` · `notIn:` · `isNot:` ve ham SQL `NOT IN` · `<>` · `!=` '
      + 'yüklemleri şemadaki null\'lukla birlikte okunur; ölçüldü: `NOT: { rol: \'kapasite\' }` '
      + 'rolü NULL yedi özniteliği düşürdü ve 3 292 yeşil test görmedi',
    veriHali: 'aykiri',
    eylem: 'Bekçi her üretim dosyasındaki olumsuz yüklemi kapsayan Prisma çağrısından modele, '
      + 'ilişki zincirinden alana çözer ve NULL\'un ele alınıp alınmadığına bakar',
    beklenenSonuc: 'NULL\'un kendisini olumsuzlayan, NOT NULL kolondaki ya da NULL\'u aynı where içinde '
      + 'açıkça ele alan olumsuzlama güvenli; kalanı gerekçeli izin listesinde yoksa kırmızı; liste '
      + 'yalnız küçülür, tavan satır sayısına eşit; ölçüm tabanı (dosya · çağrı · bulgu) sıfır olamaz',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },

  /* ── P4 · İçerik paketi mimarisi (docs/SEKTOR_PAKETI_SOZLESMESI.md) ── */
  {
    id: 'URN-PKT-001', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Paket biçimi ve manifest doğrulayıcısının eksik alanı, özet uyuşmazlığını ve biçim hatasını adıyla reddetmesi',
    rol: 'paket yazarı (kod bilmez)', kapsam: 'paket dizini',
    onkosul: 'Paket bir dizindir: manifest.json + JSON/CSV içerik; icerikOzetleri her dosyanın sha256\'sını taşır',
    veriHali: 'aykiri',
    eylem: 'Eksik alanlı, özeti uyuşmayan, listede olmayan dosyalı, tekrar kodlu, üst maddesi sonra gelen paketler doğrulanır',
    beklenenSonuc: 'Her kusur bir satır: dosya:konum — SINIF: ne yanlış → nasıl düzeltilir; tek hata paketi reddeder',
    beklenenEkran: 'Ekran yok — `npm run paket:dogrula`',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-PKT-002', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Lisans sınırının makine okunur alanda durması: telifli çerçeve yalnız yapı ve kimlik taşır',
    rol: 'paket yazarı', kapsam: 'çerçeve dosyası',
    onkosul: 'Çerçeve kimliği `lisans: { tur, metinDahil }` taşır; telifli çerçevede metin girilemez, başlık 120 karakteri aşamaz',
    veriHali: 'aykiri',
    eylem: 'Telifli çerçeveye metin ya da uzun başlık yazılır; kamuya açık iskelet metinsiz kurulur',
    beklenenSonuc: 'LİSANS sınıfı hata "lisans sınırı: <kod> telifli, metin girilemez"; kurulumda telifli madde metni "lisans nedeniyle girilmedi", '
      + 'kamuya açık iskelette "metin paketle gelmedi"; `Regulasyon.lisansTuru` ve `metinDahil` dolar',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER'],
  },
  {
    id: 'URN-PKT-003', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Kurucunun doğrulanmış paketi tek transaction\'da yazması; çerçeveyi TASLAK bırakması, aktifleştirmeyi insana bırakması',
    rol: 'tanımlar yazma yetkili', kapsam: 'kurulum',
    onkosul: 'Sözlük → SektorSozlugu, türler → KapsamOgesiTuru, öznitelikler → SektorOznitelikSemasi, çerçeve → Regulasyon + FrameworkSurumu(taslak) + Madde',
    veriHali: 'normal',
    eylem: 'Paket kurulur; ortada patlayan kurulum yeniden denenir; aynı sürüm ikinci kez kurulur',
    beklenenSonuc: 'Hiçbir sürüm aktif olmaz; hata hâlinde HİÇBİR satır kalmaz (kısmi yazma yok); ikinci kurulum idempotent; '
      + 'yazılan her satır koken=paket ve paketSurumId taşır',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'IcerikPaketi kurulum izi (sayılarla)', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-004', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Kaldırmanın arşiv olması ve paket güncellemesinin kiracının kendi satırlarını EZMEMESİ',
    rol: 'tanımlar yazma yetkili', kapsam: 'kurulum · kaldırma',
    onkosul: 'Aynı anahtarda kiracı kökenli satır var; paketin taslak sürümünün maddesine kiracı eşlemesi bağlı',
    veriHali: 'aykiri',
    eylem: 'Yeni sürüm kurulur; paket kaldırılır; aktif sürüm taşıyan paket kaldırılmak istenir',
    beklenenSonuc: 'Kiracı satırı değişmez ve raporda "çelişki" olarak işaretlenir; bağlı taslak üzerine yazılmaz (yeni etiket ister); '
      + 'kaldırma hiçbir satır silmez — paket/sürüm arşiv, tür ve yükümlülük pasif, taslak çerçeve arşiv; aktif sürümlü paket kaldırılamaz',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'IcerikPaketi arşiv izi gerekçeli', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-005', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'TR-ENERJI ve TR-BANKACILIK iskelet paketlerinin doğrulayıcıdan geçmesi ve madde metni taşımaması',
    rol: 'ürünü sürdüren geliştirici', kapsam: '`paketler/`',
    onkosul: 'İskelet yalnız yapı taşır: sözlük, türler, öznitelikler, çerçeve kimliği ve madde ağacı (kod · üst · başlık · seviye); metin sütunu boş',
    veriHali: 'normal',
    eylem: 'İki iskelet doğrulanır ve taze bir veritabanına kurulur',
    beklenenSonuc: 'Doğrulayıcı 0 hata; özetler dosyalarla eşit; hiçbir maddede metin yok; kurulumda çerçeveler taslak, madde sayısı CSV satır sayısına eşit',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'yazma yok (test veritabanı)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-006', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Paket yükseltmesinin bıraktığı içeriği uzlaştırması: kaldırılan tür ve yükümlülük pasif, taslak sürüm arşiv, silme yok',
    rol: 'tanımlar yazma yetkili', kapsam: 'kurulum (yükseltme)',
    onkosul: 'Önceki sürümün yazdığı paket kökenli tür, yükümlülük, çerçeve taslağı, sözlük ve öznitelik satırları var; yeni sürüm bir kısmını beyan etmiyor',
    veriHali: 'aykiri',
    eylem: 'Yeni sürüm kurulur; aynı sürüm ikinci kez kurulur; kiracının kendi türü aynı sektörde durur',
    beklenenSonuc: 'Beyan edilmeyen paket türü, yükümlülüğü, sözlük ve öznitelik satırı aktif=false, paketin kendi taslak çerçeve sürümü arşiv; '
      + 'hiçbir satır silinmez; pasifleşen anahtarlar raporda listelenir; kiracı satırına dokunulmaz; ikinci kurulumda uzlaştırma sıfır',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'IcerikPaketi kurulum izi uzlaştırma sayılarıyla', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-007', alan: 'Ürünleştirme', rota: '—', eksen: 'akis',
    amac: 'Paket durum değişimi ile iz kaydının aynı transaction\'da olması; kaldırmada aktif sürüm kararının arşiv yazımıyla atomik verilmesi',
    rol: 'tanımlar yazma yetkili', kapsam: 'kurulum · kaldırma',
    onkosul: 'İz yazıcı transaction istemcisi kabul eder (ortak.ts › iz); kaldırma okuma-karar-yazma tek transaction',
    veriHali: 'aykiri',
    eylem: 'İz yazımı patlatılır (sentetik) ve paket kurulur / kaldırılır; kök istemciye dokunmayı kaydeden sahte istemciyle kaldırma çağrılır',
    beklenenSonuc: 'İz yazılamazsa kurulum da arşiv de GERİ ALINIR: paket kaydı yok / paket kurulu kalır, iz satırı yok; '
      + 'kaldırma aktif sürüm sayımını ve kurulum bağımlılık kararını transaction İÇİNDE yapar — kök istemciye dokunan kaldırma/kurulum kırmızı',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'iz ya durumla birlikte var ya ikisi de yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-008', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Kurulu paket sürümünün değişmezliği: aynı SemVer numarasıyla içeriği değişmiş paket kurulu sürümü ezemez',
    rol: 'tanımlar yazma yetkili', kapsam: 'kurulum (yeniden kurulum)',
    onkosul: 'Sürüm kaydı kurulumdaki içerik özetlerini (`ozetJson`) taşır; paket özetleri yeniden yazılmış ama `surum` aynı',
    veriHali: 'aykiri',
    eylem: 'Aynı numarayla değişmiş içerik kurulur; aynı numarayla aynı içerik kurulur; yeni numarayla değişmiş içerik kurulur',
    beklenenSonuc: 'Değişmiş içerik ya da değişmez üstveri (sektör · lisans · bağımlılık) SÜRÜM hatasıyla reddedilir ("kurulu sürüm değişmez"), '
      + 'sürüm kaydı ve içerik olduğu gibi kalır; aynı içerik idempotent ve madde ağacına dokunmaz (kimlikler korunur); yeni numara kurulur',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'yazma yok (red)', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-009', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Kaldırmanın bağımlı paketleri koruması ve kaldırılan paketin aynı içerikle geri kurulabilmesi',
    rol: 'tanımlar yazma yetkili', kapsam: 'kaldırma · geri kurulum',
    onkosul: 'Kurulu B paketi manifestinde A\'ya bağımlı; A kaldırılınca taslak çerçeve sürümleri arşive çekilir',
    veriHali: 'aykiri',
    eylem: 'A kaldırılmak istenir; B kaldırılıp A kaldırılır; A aynı içerikle geri kurulur',
    beklenenSonuc: 'B kuruluyken A kaldırılamaz (bağımlı paket adıyla); B gidince A arşivlenir; geri kurulumda paketin kendi arşiv taslağı '
      + 'taslağa döner, madde kimlikleri korunur, paket kurulu — yeni etiket istenmez',
    beklenenEkran: 'Ekran yok',
    beklenenIz: 'IcerikPaketi arşiv izi', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-011', alan: 'Ürünleştirme', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Pasif sözlük ve öznitelik satırının ekrana inmemesi: paket yükseltmesinin bıraktığı sözcük ve alan görünmez, silinmez',
    rol: 'uyum uzmanı · tanımlar yazma yetkili', kapsam: 'sözlük okuyucu · rol anahtarı · Tesis 360 profili · profil kaydı · portföy',
    onkosul: '`SektorSozlugu.aktif` ve `SektorOznitelikSemasi.aktif` (2.1, elle eklemeli göç); paket yükseltmesi ve kaldırma pasifleştirir, geri kurulum aktifleştirir',
    veriHali: 'aykiri',
    eylem: 'v2 bir sözlük anahtarını ve bir özniteliği bırakır; paket kaldırılır; aynı içerikle geri kurulur; pasif alana değer yazılmak istenir',
    beklenenSonuc: 'Pasif satır yerinde kalır (silme yok) ama sözlük okuyucu, rol anahtarı, Tesis 360 profili ve portföy onu görmez; pasif özniteliğe '
      + 'profil kaydı "bilinmeyen öznitelik" der; kaldırma tüm paket satırlarını pasifler, geri kurulum aktifler; her okuyucu sorgusu `aktif: true` süzer (bekçi)',
    beklenenEkran: 'Tesis 360 profil bloğunda pasif alan çizilmez; sözlük pasif sözcüğü söylemez',
    beklenenIz: 'kurulum izi pasifleşen anahtarlarla', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-012', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Form ve rapor şablonu türlerinin paketle gelmesi: yapı doğrulanır, XLSX hücreleri dosyaya karşı okunur, telifli pakette XLSX yasak, katalogda köken ve aktif',
    rol: 'paket yazarı · tanımlar yazma yetkili', kapsam: '`form/<KOD>.json` (+XLSX) · `rapor/<KOD>.json` · FormSablonu · RaporSablonu',
    onkosul: 'Form: bölümler ve alanlar (anahtar, etiket ≤ 120, tip, seçenek, madde referansı, hücre); rapor: alanlar, sıralama (permütasyon), künye, sayfa',
    veriHali: 'aykiri',
    eylem: 'Eksik sayfa, aralık dışı hücre, hücresiz XLSX alanı, telifli pakette XLSX, permütasyon olmayan sıralama, kopuk madde referansı doğrulanır/kurulur; yükseltme bir şablonu bırakır; paket kaldırılır',
    beklenenSonuc: 'Her kusur adıyla BIÇIM/KİMLİK/LİSANS; kopuk madde referansı kurulumda KİMLİK ve hiçbir satır yazılmaz; kurulan şablon koken=paket, tanım JSON, '
      + 'kiracı şablonu ezilmez (çelişki); bırakılan şablon pasif (silme yok); kaldırma pasifler',
    beklenenEkran: 'Ekran yok — katalog; ekran P4 sonraki dilimi',
    beklenenIz: 'kurulum izi sayılarla', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-013', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Rol önerilerinin paketle gelmesi: modül × işlem izinleri ve kapsam ekseni doğrulanır, katalogda köken ve aktif; çalışma zamanı yetkisi kataloğu okumaz',
    rol: 'paket yazarı · tanımlar yazma yetkili', kapsam: '`roller.json` · RolKatalogu · lib/erisim.ts sabitleri',
    onkosul: 'Rol satırı: kod (küçük harf), ad, izinler {modül: [okuma|yazma|onay]}, kapsamEkseni (global|kapsamOgesi); çekirdek rollerin izinleri koddadır',
    veriHali: 'aykiri',
    eylem: 'Tekrar kod, çekirdek rol kodu, bilinmeyen modül/işlem, boş izin, işlem tekrarı, merdiven ihlali (onay yazmasız, yazma okumasız), bilinmeyen eksen doğrulanır; '
      + 'paket kurulur, kiracı rolü varken güncellenir, bir rolü bırakır, kaldırılır; paket rol koduyla yetki sorulur',
    beklenenSonuc: 'Her kusur adıyla BIÇIM/KİMLİK; kurulan rol koken=paket, izinler JSON, eksen; kiracı rolü ezilmez (çelişki); bırakılan rol pasif (silme yok); kaldırma pasifler; '
      + 'paket rol kodu taşıyan yetki çalışma zamanında izin VERMEZ (katalog öneri, kod karar); paket biçiminin modül · işlem · çekirdek rol sabitleri erisim.ts ile birebir ve çekirdek roller merdivene uyar (bekçi)',
    beklenenEkran: 'Ekran yok — katalog; /paketler ekranı 2.6',
    beklenenIz: 'kurulum izi sayılarla (rol dâhil)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-014', alan: 'Ürünleştirme', rota: '/eslestirme', eksen: 'veri',
    amac: 'Çerçeveler arası madde eşlemesinin paketle gelmesi: CSV yapı kusuru lisanstan ÖNCE reddedilir, açıklama metni lisansla sınırlı, kiracı eşlemesi ezilmez, bırakılan eşleme pasif',
    rol: 'paket yazarı · tanımlar yazma yetkili', kapsam: '`esleme/<KOD>.json` + CSV · MaddeEslestirmesi (koken · aktif) · eşleme okuyucuları',
    onkosul: 'Kimlik: kaynak/hedef çerçeve + sürüm etiketi (paket içi ya da kurulu), lisans; CSV: kaynak_kod;hedef_kod;denklik;aciklama',
    veriHali: 'aykiri',
    eylem: 'Tekrar başlık, başlığı aşan dolu hücre, eksik/bilinmeyen sütun, boş kod, tekrar çift, bilinmeyen denklik, paket içi olmayan madde, telifli pakette/eşlemede/çerçevede açıklama doğrulanır; '
      + 'kurulu çerçeveye eşleme kurulur (yanlış etiket, olmayan madde, telifli kurulu çerçeve + açıklama); kiracı eşlemesi varken kurulur; kendi eşlemesini taşıyan paket aynı etiketle yenilenir; kiracı eşlemesi bağlıyken yenileme; bir eşleme bırakılır; paket kaldırılır',
    beklenenSonuc: 'Yapı kusuru BIÇIM ve o satırda LİSANS üretilmez (yapı önce); açıklama LİSANS yalnız metin yasağında, > 200 karakter BIÇIM; kurulan eşleme koken=paket, aktif; kiracı eşlemesi çelişki ve dokunulmaz; '
      + 'paketin kendi eşlemesi bağ sayılmaz ama kiracının eşlemesi taslak yenilemesini SÜRÜM ile durdurur; bırakılan eşleme pasif (silme yok), yeniden beyan aktifler, kaldırma pasifler; her eşleme okuyucusu ve içermesi aktif süzer (bekçi)',
    beklenenEkran: '/eslestirme ve süreç ekranı pasif eşlemeyi göstermez',
    beklenenIz: 'kurulum izi eşleme sayısıyla', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-015', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Demo tohumunun paket biçimine taşınması: sözlük, öznitelik şeması, çerçeve ve denklikler DEMO paketlerinden kurulur; telifli çerçevenin metni düşer, kayıp ölçülür',
    rol: 'ürünü sürdüren geliştirici · tohumu kuran yönetici', kapsam: '`paketler/DEMO-TR-ORTAK · DEMO-TR-ENERJI · DEMO-TR-SU` · `prisma/seed.ts` · `kanit_tipi` sütunu',
    onkosul: 'Tohum sabitleri (`prisma/sozlukler.ts`, `prisma/kapsam-ogesi.ts`) ve 2.5 öncesi madde ağaçları; ISO 27001 telifli',
    veriHali: 'tipik',
    eylem: 'Üç demo paketi doğrulanır ve özetleri ölçülür; sözlük/öznitelik paket–sabit birebir karşılaştırılır; taze tohum koşulur ve veritabanı sayılır',
    beklenenSonuc: 'Paketler 0 hata; sözlük 13+5 ve öznitelik 9+1 sabitlerle birebir; ISO 27001 4 madde metinsiz ama kanıt tipi korunmuş (ölçülen kayıp: 4 kısa açıklama); '
      + 'tohumlanmış veritabanında üç paket kurulu, sözlük/öznitelik/regülasyon/eşleme satırları paket kökenli, dört çerçeve sürümü aktif (taslak yok), her madde sürümlü, ISO maddesi TELIFLI_METIN, kanıt tipi ve BT/OT alan bağı yerinde',
    beklenenEkran: 'Ekran değişmez — aynı sözcük, aynı çerçeveler, aynı denklikler',
    beklenenIz: 'yok (tohum)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },
  {
    id: 'URN-PKT-016', alan: 'Ürünleştirme', rota: '/paketler', eksen: 'arayuz',
    amac: 'İçerik paketleri ekranı: kurulu paketler, sürüm, "güncelleme var", kur/güncelle/kaldır (arşiv); ekran hiçbir çerçeveyi aktifleştirmez ve bunu açıkça söyler',
    rol: 'tanımlar okuma / yazma yetkili', kapsam: '`/paketler` · disk `paketler/<KOD>` × `IcerikPaketi`',
    onkosul: 'Tohumda üç demo paketi kurulu; diskte iskeletler; diskteki kopya yeni sürüm / bozuk / yok olabilir',
    veriHali: 'aykiri',
    eylem: 'Ekran verisi disk ve veritabanından birleştirilir; sürüm karşılaştırılır; bir satır seçilip kur/güncelle/kaldır (gerekçeli) denenir; yetkisiz kullanıcı bakar',
    beklenenSonuc: 'Hâl yedi değerden biri (güncel · güncelleme var · diskteki kopya eski · diskte yok · doğrulanamadı · kurulu değil · arşiv) ve bilinmeyen kaynak başarı gibi görünmez; '
      + 'düğme yetkisize de gösterilir, engel nedeni yanına yazılır (bağımlı paket, aktif çerçeve, doğrulanamadı); kaldırma gerekçe ister ve arşivler; kurulum raporu ve doğrulayıcı hataları seçili satırın panelinde',
    beklenenEkran: 'Lede altında kalıcı cümle: aktifleştirme insan kararıdır, ekran hiçbir çerçeveyi aktifleştirmez (Regülasyonlar bağı); taslak çerçeve sayısı ölçütte',
    beklenenIz: 'kurulum / arşiv izi eylemden', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'UI'],
  },
  {
    id: 'URN-PKT-018', alan: 'Ürünleştirme', rota: '/paketler', eksen: 'arayuz',
    amac: 'Paket dizini diskte YOK ya da paket kökü okunamıyor: ekran "diskte yok"u güncel gibi göstermez, kökün okunamadığını "paket yok"la karıştırmaz; seçili satırın paneli engel nedenini yazar',
    rol: 'tanımlar okuma / yazma yetkili', kapsam: '`/paketler` · satır seçimi paneli (çekmece) · boş hâl',
    onkosul: 'Veritabanında kurulu paket var ama `paketler/<KOD>` dizini silinmiş; ya da paket kökü hiç yok; ya da ne kurulu ne diskte paket var',
    veriHali: 'yok',
    eylem: 'Ekran açılır, kurulu ama dizini olmayan paket seçilir; paket kökü olmayan kurulumda ekran açılır; hiç paket yokken ekran açılır',
    beklenenSonuc: 'Hâl "Diskte yok" (`unk` işaretçisi — bilinmeyen ≠ güncel); panelde Kur/Güncelle engeli "paket dizini diskte yok", Kaldır serbest; kök okunamazsa ayrı hata bloğu ("ölçülmedi") ve yalnız kurulu satırlar; '
      + 'hiç paket yokken boş hâl bir sonraki işi söyler (regülasyonu elle içe aktarma bağı)',
    beklenenEkran: 'Sıralamada diskte olmayan paket dikkat grubunda (güncelleme ve doğrulanamadı ile birlikte, güncelden önce)',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'UI'],
  },
  {
    id: 'URN-PKT-010', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Paket işlemlerinin müşteri verisini SİLEMEMESİ (R-C): bekçi tavanı sıfır, gerekçeli istisna yok',
    rol: 'ürünü sürdüren geliştirici', kapsam: '`lib/paket/` · paket eylemleri · şema',
    onkosul: '"Kaldırma = arşiv, silme yok" kuralı yazılıydı; kod kiracının kapsam alanı eşlemesini kaskatla sildi (PR #41 inceleme bulgusu) — kural yetmedi, kapı gerekti',
    veriHali: 'aykiri',
    eylem: 'Bekçi paket modülündeki delete/deleteMany çağrılarını ve Madde\'nin şemadaki liste ilişkilerini okur',
    beklenenSonuc: 'madde dışında hiçbir modelde silme yok; madde silmesi yalnız paketin kendi taslağını (`surumId`) hedefler ve bağ kontrolünden sonra gelir; '
      + 'Madde\'den başka modele giden her liste ilişkisi bağ kontrolünde; kurucu gerekçeli istisna listesi ihraç etmez',
    beklenenEkran: 'Ekran yok — kapı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
];
