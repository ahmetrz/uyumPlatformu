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

export function radarOzeti(
  satirlar: readonly KaynakSatiri[], bekleyenAday: number,
): RadarOzeti {
  return {
    bekleyenAday,
    etkinKaynak: satirlar.filter((s) => s.etkin).length,
    engelliKaynak: satirlar.filter((s) => s.durum === 'engelli').length,
    /* NULL'u false'tan ayıran tek yer: `sonTaramaFarkVar === null` VE
       tarama koşmuş olmalı. Hiç koşmamış kaynak ayrı sayılır. */
    karsilastirilamayan: satirlar.filter((s) => s.sonTarama !== null && s.sonTaramaFarkVar === null).length,
    hicTaranmayan: satirlar.filter((s) => s.hicTaranmadi).length,
  };
}

/** Başlık cümlesi — sıfır aday "her şey yolunda" DEMEZ. */
export function baslikCumlesi(o: RadarOzeti): string {
  if (o.etkinKaynak === 0) return 'HİÇBİR KAYNAK TARANMIYOR';
  if (o.bekleyenAday === 0 && o.karsilastirilamayan === 0 && o.hicTaranmayan === 0) {
    return 'BEKLEYEN DEĞİŞİKLİK YOK';
  }
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
