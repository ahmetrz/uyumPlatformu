import type { Durum } from '@/components/atlas/temel';

/* Regülasyon MADDE aktarımı — sunucu ile istemcinin paylaştığı tipler ve
   saf hesaplar.

   Bu hat CMDB varlık aktarımından (/varlik-aktarim) AYRIDIR: burada taşınan
   şey `Madde` kayıtlarıdır, hedefi bir regülasyondur (IceAktarim.regulasyonId
   zorunlu) ve onaylanana kadar hiçbir madde yayına girmez. */

export type OnizlemeSatiri = {
  kod: string;
  baslik: string;
  islem: 'yeni' | 'guncelleme';
  alanlar: string[];
};

export type ElenenSatir = { satir: number; sebep: string };

export type Aktarim = {
  id: string;
  kaynakAdi: string;
  kaynakTipi: string;
  durum: string;
  regKod: string;
  regAd: string;
  yukleyen: string | null;
  zaman: string;
  okunan: number;
  eklenen: number;
  guncellenen: number;
  elenen: number;
  /** raporda işlenmeyi bekleyen satır sayısı — onaylanınca yazılacak madde */
  islenecek: number;
  yeni: number;
  guncelleme: number;
  onizleme: OnizlemeSatiri[];
  elenenler: ElenenSatir[];
  elenenKalan: number;
  /** rapor okunamadıysa sebebi — sessizce yutulmaz */
  raporHatasi: string | null;
};

/* ── Durum ──────────────────────────────────────────────────────────── */

/** İşaretçi kararı taşır: bekleyen dosya kısmi, reddedilen değerlendirilmez. */
export const DURUM_IMI: Record<string, Durum> = {
  dogrulama_bekliyor: 'md',
  onaylandi: 'tamam',
  reddedildi: 'unk',
  hata: 'bd',
};

/* Durum sözcükleri YALNIZ çekmecenin kimlik bloğunda geçer (06 §A2). */
export const DURUM_SOZU: Record<string, string> = {
  dogrulama_bekliyor: 'Onay bekliyor',
  onaylandi: 'Yayına girdi',
  reddedildi: 'Reddedildi',
  hata: 'Geri alındı',
};

export const bekliyorMu = (a: Aktarim) => a.durum === 'dogrulama_bekliyor';

export function kimlikCumlesi(a: Aktarim): string | undefined {
  if (a.raporHatasi) return `Rapor okunamadı: ${a.raporHatasi}`;
  switch (a.durum) {
    case 'dogrulama_bekliyor':
      return `Onaylanana kadar ${a.regKod} kütüğü değişmez; ${a.islenecek} madde bekliyor.`;
    case 'onaylandi':
      return `${a.eklenen} yeni madde eklendi, ${a.guncellenen} madde güncellendi.`;
    case 'reddedildi':
      return 'Dosya reddedildi; hiçbir madde yazılmadı.';
    case 'hata':
      return 'Aktarım geri alındı; hiçbir madde yazılmadı.';
    default:
      return undefined;
  }
}

/** Tablo alt satırı: kimlik zaten konuda, burada yalnız olgular durur. */
export function altSatir(a: Aktarim, zaman: string): string {
  const parcalar = [zaman, a.regKod, a.kaynakTipi === 'excel' ? 'EXCEL/CSV' : 'OTOMATİK'];
  if (a.durum === 'onaylandi') parcalar.push(`+${a.eklenen} yeni / ~${a.guncellenen} güncelleme`);
  if (a.durum === 'hata') parcalar.push('yazılan madde yok');
  return parcalar.join(' · ');
}

/* ── Metrikler · filtrelerden BAĞIMSIZ, bekleyen kuyruğun tamamı ────── */

export function metrikleriHesapla(aktarimlar: Aktarim[]) {
  const bekleyenler = aktarimlar.filter(bekliyorMu);
  return {
    dosya: aktarimlar.length,
    bekleyen: bekleyenler.length,
    yeni: bekleyenler.reduce((t, a) => t + a.yeni, 0),
    guncelleme: bekleyenler.reduce((t, a) => t + a.guncelleme, 0),
    elenen: bekleyenler.reduce((t, a) => t + a.elenen, 0),
    raporsuz: aktarimlar.filter((a) => a.raporHatasi !== null).length,
  };
}
