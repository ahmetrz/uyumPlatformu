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
];
