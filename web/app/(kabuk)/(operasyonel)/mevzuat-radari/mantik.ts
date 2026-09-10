import {
  ADAY_DURUM_SOZU, type AdayDurumu, DURUM_SOZU, farkSozu,
} from '@/lib/mevzuat/radar';

/* ═══════════════════════════════════════════════════════════════════════
   R1 · /mevzuat-radari · EKRAN MANTIĞI

   Ekranın birincil işi: "mevzuatta bir şey değişti mi, değiştiyse ne
   yapacağım" — ve bunun yanında, aynı ağırlıkta ikinci bir iş:
   "NEREYE BAKAMADIM".

   ── İKİ AYRI HÂL, İKİ AYRI SAYAÇ ──────────────────────────────────────
   `engelli` ve `karşılaştırılamadı` AYNI ŞEY DEĞİLDİR ve ekranda tek
   sayıya toplanmazlar:

     ENGELLİ            → kaynağın kararı. robots.txt kapatıyor ya da
                          anti-bot yanıtı geldi. Ürün bu engeli AŞMAZ;
                          kaynak elle izlenir.
     KARŞILAŞTIRILAMADI → bizim bilgi eksiğimiz. Bakıldı ama sonuç
                          çıkarılamadı (ağ, biçim). `farkVar` NULL'dur.

   İkisini "sorunlu kaynak" diye toplamak, birbirinden bambaşka iki işi
   (kurumdan izin istemek · ayrıştırıcıyı düzeltmek) tek satıra
   sıkıştırırdı — ve daha kötüsü, "bakılamadı"yı "temiz" göstermeye bir
   adım kalırdı.
   ═══════════════════════════════════════════════════════════════════════ */

export type KaynakKaydi = {
  id: string;
  kod: string;
  ad: string;
  yayinKanali: string;
  merci: string | null;
  paketKodu: string | null;
  etkin: boolean;
  durum: string;
  durumNotu: string | null;
  sonTarama: Date | null;
  sonTaramaFarkVar: boolean | null;
  sonTaramaSebep: string | null;
  bekleyenAday: number;
};

export type AdayKaydi = {
  id: string;
  kaynakKod: string;
  kaynakAd: string;
  merci: string | null;
  url: string;
  baslik: string;
  yayinTarihi: Date | null;
  ozet: string | null;
  bulundu: Date;
  durum: string;
  gerekce: string | null;
};

export type KaynakSatiri = KaynakKaydi & {
  durumSozu: string;
  farkSozu: string;
  /** Taraması hiç koşmamış kaynak "değişiklik yok" DEMEZ. */
  hicTaranmadi: boolean;
};

export type RadarOzeti = {
  /** Karar bekleyen aday. */
  bekleyenAday: number;
  /** Taraması AÇIK kaynak. */
  etkinKaynak: number;
  /** Kaynağın kendi kararıyla otomatik erişime kapalı olan. */
  engelliKaynak: number;
  /** Bakıldı ama SONUÇ ÇIKARILAMADI (farkVar NULL) — ayrı metrik. */
  karsilastirilamayan: number;
  /** Taraması hiç koşmamış — "değişiklik yok" DEĞİL, "bilinmiyor". */
  hicTaranmayan: number;
};

export function kaynakSatirlari(kayitlar: readonly KaynakKaydi[]): KaynakSatiri[] {
  return kayitlar.map((k) => ({
    ...k,
    durumSozu: DURUM_SOZU[k.durum] ?? k.durum,
    farkSozu: k.sonTarama === null ? 'Hiç taranmadı' : farkSozu(k.sonTaramaFarkVar),
    hicTaranmadi: k.sonTarama === null,
  }));
}

/* ── BİR KAYNAK, BİR HÂL ───────────────────────────────────────────────
   Ölçüldü (bağımsız inceleme, PR #50 tur 1): sayaçlar birbirinden
   BAĞIMSIZ süzgeçlerle hesaplanıyordu ve engelli bir kaynak İKİSİNE
   birden giriyordu — engelli bir kaynağın son taraması her zaman
   `farkVar: null` yazar. Ekran "Engelli kaynak: 1 · Karşılaştırılamadı:
   1" diyordu; okuyan kişi iki ayrı sorunlu kaynak sanıyordu, oysa bir
   tane vardı. Kodun kendi yorumu ("iki ayrı hâl, iki ayrı sayaç")
   doğruydu, kod onu uygulamıyordu.

   Bugün hâl TEK bir sınıflandırıcıdan çıkar ve sıra bağlayıcıdır: bir
   kaynak tam olarak BİR hâle düşer, iki sayaca birden giremez. Ayrı
   süzgeçler yerine tek sınıflandırıcı seçildi çünkü ayrık olma
   ("disjoint") bir sözleşme değil, YAPISAL bir sonuç olmalı: bir
   sözleşme unutulur, yapı unutulmaz.

   Sıra: engelli → hiç taranmadı → karşılaştırılamadı → okundu.
   Engelli kaynak hiç taranmamış da olabilir; sebebi ENGELDİR ve ekran
   önce onu söyler. */
export type KaynakHali = 'engelli' | 'hic_taranmadi' | 'karsilastirilamadi' | 'okundu';

export function kaynakHali(s: KaynakSatiri): KaynakHali {
  if (s.durum === 'engelli') return 'engelli';
  if (s.sonTarama === null) return 'hic_taranmadi';
  /* NULL'u false'tan ayıran tek yer: bakıldı ama SONUÇ çıkarılamadı. */
  if (s.sonTaramaFarkVar === null) return 'karsilastirilamadi';
  return 'okundu';
}

export function radarOzeti(
  satirlar: readonly KaynakSatiri[], bekleyenAday: number,
): RadarOzeti {
  const sayim: Record<KaynakHali, number> = {
    engelli: 0, hic_taranmadi: 0, karsilastirilamadi: 0, okundu: 0,
  };
  for (const s of satirlar) sayim[kaynakHali(s)] += 1;
  return {
    bekleyenAday,
    /* `etkin` AYRI EKSENDİR: taramanın açık olup olmadığını söyler,
       kaynağın hâlini değil. Bu yüzden hâl sayımına karışmaz. */
    etkinKaynak: satirlar.filter((s) => s.etkin).length,
    engelliKaynak: sayim.engelli,
    karsilastirilamayan: sayim.karsilastirilamadi,
    hicTaranmayan: sayim.hic_taranmadi,
  };
}

/** Başlık cümlesi — sıfır aday "her şey yolunda" DEMEZ.
 *
 * ── ENGELLİ KAYNAK DA BİR KÖRLÜKTÜR ───────────────────────────────────
 * Bu koşul `engelliKaynak`a BAKMIYORDU ve kusur MASKELİYDİ: sayaçlar
 * ayrık olmadığı için engelli kaynak `karsilastirilamayan`a da giriyor,
 * koşul kazara tutuyordu (bkz. `radarOzeti`). Sayaçlar ayrılınca ortaya
 * çıktı — yalnız engelli kaynağı olan bir kurulumda ekran "BEKLEYEN
 * DEĞİŞİKLİK YOK" diyordu; oysa ürün o kaynağa hiç bakamamıştı.
 *
 * İki kusurun üst üste binip birbirini gizlemesi, bir düzeltmenin
 * öbürünü GÖRÜNÜR yapmasıyla bitti: yapısal düzeltmenin serbest
 * süzgeçlere üstünlüğü de burada ölçüldü. */
export function baslikCumlesi(o: RadarOzeti): string {
  if (o.etkinKaynak === 0) return 'HİÇBİR KAYNAK TARANMIYOR';
  const bakilamayan = o.karsilastirilamayan + o.hicTaranmayan + o.engelliKaynak;
  if (o.bekleyenAday === 0 && bakilamayan === 0) return 'BEKLEYEN DEĞİŞİKLİK YOK';
  return `${o.bekleyenAday} BEKLEYEN DEĞİŞİKLİK ADAYI`;
}

/**
 * Kapsam cümlesi — ekranın NEYİ GÖRMEDİĞİNİ söyler.
 *
 * "Bilinmeyen ≠ sıfır" bu ekranda bir cümleye dönüşüyor: taranmayan,
 * engelli ve karşılaştırılamayan kaynaklar ADIYLA sayılır. Gizlenselerdi
 * ekran "bekleyen değişiklik yok" derken aslında hiçbir yere bakmamış
 * olabilirdi.
 */
export function kapsamCumlesi(o: RadarOzeti, toplamKaynak: number): string {
  const parcalar: string[] = [`${o.etkinKaynak}/${toplamKaynak} kaynak taranıyor`];
  if (o.engelliKaynak > 0) parcalar.push(`${o.engelliKaynak} kaynak ENGELLİ (elle izlenir)`);
  if (o.karsilastirilamayan > 0) parcalar.push(`${o.karsilastirilamayan} kaynakta son tarama KARŞILAŞTIRILAMADI`);
  if (o.hicTaranmayan > 0) parcalar.push(`${o.hicTaranmayan} kaynak hiç taranmadı`);
  return parcalar.join(' · ');
}

export const ADAY_SOZU = ADAY_DURUM_SOZU;
export type { AdayDurumu };
