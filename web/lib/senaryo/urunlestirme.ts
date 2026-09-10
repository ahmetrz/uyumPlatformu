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
  {
    id: 'URN-KUR-008', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Göç zincirinin yeni kurulumda şemayla birebir olması — elle düzeltilmiş bir göç diskte doğru, zincirde yanlış olabilir',
    rol: 'ürünü sürdüren geliştirici · müşteri kurulumunu yapan', kapsam: 'prisma/migrations · prisma/schema.prisma · arac/goc-zinciri.mjs',
    onkosul: 'Bir göç `migrate diff` çıktısından farklı yazılmıştır (P4 · 2.4: RedefineTables yerine elle ADD COLUMN) ve yerel dev.db '
      + 'sağlaması elle güncellenmiştir; `kapi:sema-sapmasi` MEVCUT dev.db\'yi ölçtüğü için zinciri görmez',
    veriHali: 'aykiri',
    eylem: 'BOŞ bir SQLite dosyasına bütün göçler sırayla uygulanır (`prisma migrate deploy`), uygulanan göç listesi veritabanından okunur ve '
      + 'sonuç `schema.prisma` ile karşılaştırılır (`migrate diff --exit-code`)',
    beklenenSonuc: 'Uygulanan göç listesi dizinle birebir ve şema farkı SIFIR; eksik göç, deploy hatası, ölçülemeyen fark ya da herhangi bir '
      + 'SQL farkı kırmızıdır. Sabotaj kalıcıdır: ADD COLUMN silinmiş zincir kopyası ve göçsüz şema kolonu kırmızı yanar',
    beklenenEkran: 'ekran yok — depo kapısı (CI · bloklayıcı)',
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
    id: 'URN-PKT-017', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'OSCAL 1.1 katalog okuyucu/yazıcı: çerçeve madde ağacı OSCAL olarak taşınır, CSV ile aynı kurallardan geçer, gidiş-dönüş birebir',
    rol: 'paket yazarı · dış katalog yayıncısı', kapsam: '`cerceve/<KOD>.oscal.json` · `lib/paket/oscal.ts` · `paket:dogrula --oscal`',
    onkosul: 'İskelet çerçeveleri CSV (BDDK-BS 58 · EPDK-SGYM 23 · EK3 578, Türkçe kodlar); telifli çerçeve kuralı',
    veriHali: 'tipik',
    eylem: 'Satırlar OSCAL\'a yazılır ve doğrulayıcı yolundan geri okunur; telifli çerçevede prose, uzun başlık, tekrar kod, kimlik uyuşmazlığı, bozuk katalog, aralık dışı seviye denenir; yabancı gruplu katalog okunur; araç --oscal ile yazar',
    beklenenSonuc: 'Satırlar birebir döner, ikinci yazım birincisiyle aynı, belirteçler ASCII ve tekil, Türkçe kod prop\'ta, uuid deterministik, bilinmeyen değer prop olmaz, tarih uydurulmaz; '
      + 'OSCAL paketi LİSANS/KİMLİK/BIÇIM sınıflarını CSV ile aynı mesajlarla alır; yabancı katalogda grup üst madde, id kod, sıra gezinti sırası; araç her çerçeveyi <dizin>/<KOD>.oscal.json yazar',
    beklenenEkran: 'Ekran yok — biçim', beklenenIz: 'yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
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
    id: 'URN-PKT-019', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Metnin NEREDEN ve NE ZAMAN alındığı maddenin yanında dursun: kaynağı olduğunu söyleyen çerçevede köken zorunlu, uydurulmaz',
    rol: 'paket yazarı · denetçi', kapsam: 'paket CSV/OSCAL köken sütunları · Madde.maddeKaynakUrl · kaynakSayfa · kaynakErisimTarihi · gecerliBaslangic',
    onkosul: 'Çerçeve kimliği `kaynakUrl` beyan ediyor (resmî kaynağı olduğunu söylüyor) ve madde metin taşıyor',
    veriHali: 'kısmi',
    eylem: 'Paket doğrulanır ve kurulur; metinli maddede kaynak_url · kaynak_yeri · erisim_tarihi · yururluk_tarihi okunur',
    beklenenSonuc: 'Metinli maddede kaynak adresi ve erişim tarihi YOKSA KAYNAK hatası; adres http(s) değilse, tarih takvimde yoksa, konum 200 karakteri aşarsa kırmızı; '
      + 'metinsiz madde köken istemez ve metni "metin girilmedi" olur (uydurulmaz, boş bırakılmaz, sıfır sayılmaz); kaynaksız çerçeve (kiracı iç politikası) ve kurgusal demo paketi muaftır',
    beklenenEkran: 'Süreç değerlendirme çekmecesinde madde metni ve altında kaynak künyesi',
    beklenenIz: 'yazma yok (doğrulama) · kurulumda paket izi', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER'],
  },
  {
    id: 'URN-PKT-020', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Çerçevenin hangi kapsam öğesi TÜRÜNE hangi koşulla asıldığını PAKET beyan etsin; koda gömülmesin ve motor yalnız ÖNERSİN',
    rol: 'paket yazarı · uyum yöneticisi', kapsam: 'cerceve/<KOD>.json `uygulanabilirlik` · UygulanabilirlikKurali (köken paket) · lib/motorlar/uygulanabilirlik.ts',
    onkosul: 'Paket kapsam türü ve öznitelik beyan ediyor; kiracının kendi kuralı da olabilir',
    veriHali: 'çelişen',
    eylem: 'Beyanlı paket doğrulanır ve kurulur; sürüm yükseltilir, beyan bırakılır, paket kaldırılır; motor kuralı koşar',
    beklenenSonuc: 'Beyandaki tanınmayan tür KAPSAM TÜRÜ, paketin olmayan ya da kuralda kullanılmayan alanı ÖZNİTELİK, işleç–değer uyumsuzluğu BIÇIM hatasıdır; '
      + 'kurulum kuralı köken paket yazar ve KARAR YAZMAZ; koşul değişince kural sürümü artar; bırakılan ve kaldırılan kural PASİF olur (silinmez); '
      + 'kiracının kuralı hiç okunmaz ve ezilmez; motorda tür bilinmiyorsa karar üretilmez ve aynı adlı bir öznitelik türü ezemez',
    beklenenEkran: 'Uyum defterinde çerçevenin kural cümlesi (iç içe koşul parantezli, `icinde` küme olarak)',
    beklenenIz: 'kurulum izi (kural sayısı gerekçede)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER'],
  },
  {
    id: 'URN-PKT-021', alan: 'Ürünleştirme', rota: '/uyum', eksen: 'arayuz',
    amac: 'Paketin TASLAK kurduğu çerçeve, uyum defterinde "0 kontrol" gibi görünmesin: aktif sürüm yokluğu ölçülmemişliktir, sıfır değil',
    rol: 'uyum okuma yetkili', kapsam: '/uyum · dizin sütunu · defter gövdesi',
    onkosul: 'Paket kuruldu, çerçeve sürümleri TASLAK; insan henüz aktifleştirmedi',
    veriHali: 'bilinmiyor',
    eylem: 'Uyum defteri açılır; taslak çerçeve dizinde ve seçildiğinde gövdede okunur',
    beklenenSonuc: 'Dizinde yaprak sayısı yerine "N taslak" yazar; gövde "aktif sürüm yok · sürüm etiketi · N madde TASLAK · kontroller ölçülmedi" der ve '
      + 'aktifleştirmenin insan kararı olduğunu, Regülasyonlar ekranında yapıldığını söyler; ekran hiçbir sürümü aktifleştirmez ve taslak madde matrise girmez',
    beklenenEkran: 'Taslak çerçeve seçilince matris yerine açıklama bloğu; aktif sürümlü çerçeve etkilenmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'UI'],
  },
  {
    id: 'URN-KUR-009', alan: 'Kurulum', rota: '—', eksen: 'veri',
    amac: 'Ürün İKİ sağlayıcıda da aynı garantileri versin: PostgreSQL kurulumu SQLite\'ta duran korumaların hiçbirini kaybetmesin',
    rol: 'kurulumu yapan · ürünü sürdüren geliştirici', kapsam: 'prisma/postgres/ · lib/veritabani.ts · lib/db.ts · lib/aramaKosulu.ts · arac/pg-taban.mjs · arac/pg-goc.mjs',
    onkosul: 'SQLite göç zinciri elle yazılmış DDL taşıyor (tetikleyici, kısmi indeks, ifade indeksi); `prisma migrate diff` bunların hiçbirini görmez',
    veriHali: 'aykiri',
    eylem: 'Boş bir PostgreSQL veritabanına taban göçü uygulanır; şema farkı, nesne envanteri ve değişmezlik ölçülür; arama kipi sağlayıcıdan seçilir',
    beklenenSonuc: 'Taban göçü şemadan üretilir ve bayatlarsa KIRMIZI; boş veritabanında şema farkı 0; SQLite\'ta olup PostgreSQL\'de olmayan tetikleyici/indeks KIRMIZI (ad kısaltması yalancı kırmızı üretmez); '
      + 'denetim izi UPDATE/DELETE/TRUNCATE reddedilir ve mesaj SQLite ile aynıdır; hiçbir satıra dokunmayan UPDATE GEÇER (FOR EACH ROW kanıtı); '
      + 'arama kipi sağlayıcıdan gelir ve tanınmayan bağlantı şeması sessizce SQLite olmaz; geçici veritabanı silinir ve silindiği doğrulanır',
    beklenenEkran: 'yok (kurulum kapısı)',
    beklenenIz: 'yazma yok (ölçüm)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-010', alan: 'Kurulum', rota: '—', eksen: 'veri',
    amac: 'Kurulumda günlüğü bir insan değil TOPLAYICI okur: olay aranabilir olsun ve sır günlüğe düşmesin',
    rol: 'kurulumu işleten operatör · olay müdahale ekibi', kapsam: 'lib/gunluk.ts · lib/ ve app/ altındaki sunucu kodu',
    onkosul: 'Ürün kodu serbest metin konsol satırları yazıyordu; bir hata nesnesini olduğu gibi basmak bağlantı dizesini ve jetonu diske yazar',
    veriHali: 'aykiri',
    eylem: 'Günlük satırı üretilir (sır kokan alanlar, hata nesnesi, derin nesne) ve ürün kodunda çıplak `console.*` çağrısı taranır',
    beklenenSonuc: 'Satır tek satır JSON\'dur ve sabit alanlar taşır (zaman · duzey · olay); adı sır kokan alanın DEĞERİ `[gizlendi]` olur ama ANAHTAR kalır (hangi alanın gizlendiği görünmezse operatör neyin eksik olduğunu bilemez); '
      + 'tanıma AD tabanlıdır, değer sezgisi değil; hata nesnesi yığın izi olmadan yazılır (iz iç yol sızdırır); derin nesne `[derin]`de durur; '
      + 'sunucu kodunda çıplak `console.*` KIRMIZIDIR (istemci bileşenleri hariç — tarayıcıda tek yol odur)',
    beklenenEkran: 'yok (kurulum kapısı)',
    beklenenIz: 'yazma yok (günlük)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KML-001', alan: 'Kurulum', rota: '—', eksen: 'yetki',
    amac: 'Kimlik katmanı ürüne YENİ bir sır değeri sokamasın — kural yetmez, kapı gerekir',
    rol: 'ürünü sürdüren geliştirici · bağımsız inceleyen',
    kapsam: 'prisma/schema.prisma · lib/kimlik/ · lib/eylemler2/kimlikSaglayici.ts'
      + ' · ayarlar/kimlik ekranı',
    onkosul: 'P6 ile OIDC `client_secret` ve TOTP paylaşılan sırrı kavramları ürüne girdi;'
      + ' ikisi de "sır değeri saklanmaz" kuralına delik açma fırsatıdır',
    veriHali: 'aykiri',
    eylem: 'Şema, eylem katmanı, ekran verisi ve ekran tipi sır DEĞERİ alanı için taranır;'
      + ' `sirZarfi` yazan her dosyanın `sifrele()` çağırdığı ölçülür',
    beklenenSonuc: '`KimlikSaglayici` yalnız `istemciSirriReferansi` taşır (adres, değer değil);'
      + ' `MfaKaydi` düz sır değil AES-256-GCM ZARFI taşır ve şifreleme anahtarı veritabanında'
      + ' YOKTUR (sır referansından çözülür); `MfaKurtarmaKodu` kodun kendisini değil scrypt'
      + ' ÖZETİNİ tutar; eylem katmanı sır değeri kabul etmez ve `siriCoz` çağırmaz;'
      + ' ekran verisi sırrı ÇÖZMEZ, yalnız `sirMaskesi` (adres) gösterir. Ekran tipindeki'
      + ' sır-kokan alanlar GEREKÇELİ izin listesindedir ve liste ölü satır taşıyamaz',
    beklenenEkran: 'Sır alanı MASKELİ adres gösterir; sırrın DEĞERİ hiçbir ekranda görünmez',
    beklenenIz: 'yazma yok (bekçi)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER'],
  },
  {
    id: 'URN-POL-001', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Ekranda yazan bir politikanın kodda karşılığı olmadan kalmasını engellemek',
    rol: 'ürünü sürdüren geliştirici · bağımsız inceleyen',
    kapsam: 'app/** metin sabitleri · arac/politika-cumleleri.json',
    onkosul: '#49 aynı sınıfı iki inceleme turunda iki kez üretti: ekran "MFA zorunlu"'
      + ' diyordu ve giriş akışı MFA sormuyordu; takvim yükümlülükleri için ayrı motor'
      + ' yazıldı ve eski motor simetrik daralmayı almadı',
    veriHali: 'aykiri',
    eylem: 'Ekran metinleri politika cümlesi kalıbıyla TARANIR ve kütükle karşılaştırılır',
    beklenenSonuc: 'Kütükte olmayan cümle KIRMIZI; kodda olmayan kütük satırı KIRMIZI.'
      + ' Her POLITIKA satırı ya ölçümünü (dosya + vaka) ya da ölçülmediğini SAHİBİ ve'
      + ' KAPANIŞ AŞAMASIYLA söyler; ölçülmeyen sayısı bir TAVANDIR ve yalnız küçülür.'
      + ' Kapı beyanın VARLIĞINI ölçer, ölçümün iddiayı sınadığını DEĞİL — sınır R-D ile'
      + ' aynıdır ve kabul edilmiştir',
    beklenenEkran: 'yok — bekçi',
    beklenenIz: 'yazma yok (bekçi)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-011', alan: 'Kurulum', rota: '—', eksen: 'veri',
    amac: 'Ürünün KENDİ yedeği, müşteriye dayattığı kuralı tutsun: geri yüklenebildiği kanıtlanmamış yedek, yedek değildir — ve kanıt DOSYALARINI da taşısın',
    rol: 'kurulumu işleten operatör · ürünü sürdüren geliştirici', kapsam: 'arac/yedek.mjs · kanıt deposu · docs/URUN_YEDEKLEME.md',
    onkosul: 'Yedek tek bir `.db` dosyasıydı ve kanıt dosyalarını ALMIYORDU: geri yükleme ekranı doldurur, denetçiye gösterilecek dosyayı getirmezdi',
    veriHali: 'aykiri',
    eylem: 'Yedek alınır (veritabanı + kanıt deposu + manifest), yedekten dosya silinir/değiştirilir, veritabanına yedekte olmayan bir kanıt eklenir, boş ortama geri yüklenir',
    beklenenSonuc: 'Yedek bir DİZİNDİR ve manifest her kanıt dosyasının anahtar · boyut · özetini taşır (özet KOPYADAN ölçülür, kaynaktan değil); '
      + 'yedekten silinen ya da değiştirilen dosya doğrulamada ADIYLA çıkar; veritabanının beklediği ama yedekte olmayan dosya EKSİK, `dosyaHash` ile tutmayan ÇÜRÜK diye ADIYLA listelenir ve araç sıfır dışı döner; '
      + '`KanitSurumu` dosyaları da beklenenler arasındadır (eski sürüm gelmezse kanıtın geçmişi gelmez); BOŞ depoda "dosya: 0" ÖLÇÜLÜR — "kanıt dosyası yok" denmez, depo dizininin hiç olmaması ayrı raporlanır; '
      + 'sahipsiz dosya kusur değildir (içerik adresli depoda paylaşım normaldir), sayı olarak raporlanır; geri yükleme DOLU ortama yazmaz ve sağlayıcılar arası yapılmaz; geri yüklenen her dosya okunarak doğrulanır',
    beklenenEkran: 'yok (kurulum aracı)',
    beklenenIz: 'yazma yok (yedek)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-KUR-012', alan: 'Kurulum', rota: '—', eksen: 'veri',
    amac: 'Eksik ya da bozuk bir yapılandırma değeri AÇILIŞTA adıyla düşsün; sessiz varsayılana düşen bir kurulum yanlış çalışır ve bunu ancak müşteri fark eder',
    rol: 'kurulumu yapan operatör', kapsam: 'lib/yapilandirma/ortam.ts · instrumentation.ts · /api/v1/health',
    onkosul: 'Yapılandırma okuması koda dağılmıştı; "belirtilmedi" ile "yanlış yazıldı" aynı sonuca düşüyordu',
    veriHali: 'aykiri',
    eylem: 'Bozuk sayı, tanınmayan sağlayıcı ve AYRIŞTIRILAMAYAN PostgreSQL bağlantı dizesi verilir',
    beklenenSonuc: 'Her hatalı değer ANAHTAR ADIYLA reddedilir ve sebebi okunabilirdir; bozuk sayı sessizce varsayılana DÜŞMEZ; tanınmayan sağlayıcı SQLite olmaz; '
      + 'ayrıştırılamayan PostgreSQL dizesi (parolada URL kodlanmamış `/`: URI otoritesini böler; `+` ve `=` bölmez) açılışta yakalanır — hem `new URL`in fırlattığı hâl hem de sessizce YANLIŞ hosta ayrışan hâl — PostgreSQL parolayı kabul ettiği için kusur aksi hâlde OPAKTIR; '
      + 'URL kodlanmış parola kabul edilir (kural dizeye bakar, parolaya değil); bilerek serbest bırakılan alan (TRUST_PROXY) reddedilmez ve bu ayrım YAZILIDIR',
    beklenenEkran: 'yok (açılış ve sağlık ucu)',
    beklenenIz: 'yazma yok (doğrulama)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'URN-PKT-022', alan: 'Ürünleştirme', rota: '—', eksen: 'veri',
    amac: 'Kaynak belgenin bir alanı ürünün YANLIŞ alanına yazıldığında biçim doğru kalır ve hiçbir kapı göremez; savunma paketin ALAN EŞLEME BEYANIDIR',
    rol: 'paket yazarı · bağımsız inceleyici', kapsam: 'manifest.json `alanEslemesi` · lib/paket/dogrula.ts',
    onkosul: 'EPDK Ek-3\'ün "Seviye" kademesi ürünün HEDEF OLGUNLUK alanına yazılmıştı; 508 zorunlu kontrolün hedefi bozuldu (bağımsız inceleme, PR #43 tur 2)',
    veriHali: 'aykiri',
    eylem: 'Paket doğrulanır: beyansız çerçeve, beyansız dolu sütun, ölü beyan, çifte beyan, temsilî çerçeveye beyan ve olmayan çerçeveye beyan denenir',
    beklenenSonuc: 'Temsilî olmayan her çerçeve beyan eder; dosyada DOLU her sütun beyanda geçer (beyansız sütun ALAN EŞLEME hatası); beyanda geçip dosyada boş kalan sütun ÖLÜ beyandır; '
      + 'bir ürün alanı iki kez beyan edilemez; temsilî çerçeve (kaynak belgesi yok) beyan edemez; pakette olmayan çerçeveye beyan yazılamaz; '
      + 'gerekçe en az 40 karakterdir ve ürün alanı sütun listesinin dışına yazılamaz — kapı beyanın VARLIĞINI ölçer, DOĞRULUĞUNU değil (kabul edilmiş sınır)',
    beklenenEkran: 'yok (paket doğrulama)',
    beklenenIz: 'yazma yok (doğrulama)', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
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
