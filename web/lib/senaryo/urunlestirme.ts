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
];
