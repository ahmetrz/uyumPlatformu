import { etiketle } from '@/lib/sabitler';

/* Denetim izi — sunucu ile istemcinin paylaştığı tipler ve saf hesaplar.

   Kütük DEĞİŞMEZDİR: veritabanı tetikleyicisi (migration
   20260830190000_denetim_izi_degismezligi) AktiviteKaydi üzerinde UPDATE ve
   DELETE'i reddeder. Bu yüzden ekran salt okunurdur — düzenleme yüzeyi yok.

   Satırlarda DURUM İŞARETÇİSİ kullanılmaz: kaydın taşıdığı önceki/yeni değer
   zaten "uyumlu", "kısmi" gibi durum sözcükleridir ve bunlar kaydın VERİSİDİR,
   satırın kendi durumu değildir. İşaretçi konsaydı iki anlam üst üste biner
   (06 §A2). Satır kimliğini soldaki zaman damgası taşır. */

export type Kayit = {
  id: string;
  /** null = kaydı bir kullanıcı değil sistem yazdı */
  aktor: string | null;
  varlikTipi: string;
  varlikId: string;
  eylem: string;
  alan: string | null;
  once: string | null;
  sonra: string | null;
  dosya: string | null;
  kaynak: string;
  zaman: string;
};

/** Geri alınamaz eylemler: kuyruğa ASLA inmez, hep görünür kalır. */
export const kritikEylem = (k: Kayit) =>
  k.eylem === 'silme' || k.eylem === 'yumusak_silme' || k.eylem === 'red';

export const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'durum', ad: 'Durum değişimi' },
  { id: 'karar', ad: 'Onay ve ret' },
  { id: 'silme', ad: 'Silme' },
  { id: 'dosya', ad: 'Dosya' },
];

export function mercekUyar(k: Kayit, mercek: string): boolean {
  switch (mercek) {
    case 'durum': return k.eylem === 'durum_degisimi' || k.alan === 'durum';
    case 'karar': return k.eylem === 'onay' || k.eylem === 'red';
    case 'silme': return k.eylem === 'silme' || k.eylem === 'yumusak_silme';
    case 'dosya': return k.eylem === 'dosya_ekleme' || !!k.dosya;
    default: return true;
  }
}

/* Kaydın nereden geldiği (AktiviteKaydi.kaynak). `etiketle` bu değerleri
   bilmiyor ve "Ui" gibi okunmaz bir sözcük üretiyordu; sözlük burada. */
const KAYNAK_ETIKET: Record<string, string> = {
  ui: 'Panel',
  is_kosusu: 'İş koşusu',
  entegrasyon: 'Entegrasyon',
  api: 'API',
};

export function kaynakEtiketi(kaynak: string): string {
  return KAYNAK_ETIKET[kaynak] ?? kaynak;
}

/** Aktör metni: sistem yazdıysa bunu söyler, boş bırakmaz. */
export function aktorMetni(k: Kayit): string {
  if (k.aktor) return k.aktor;
  return k.kaynak === 'ui' ? 'bilinmiyor' : 'sistem';
}

/** Kaydın taşıdığı değişim — verinin kendisi, satırın durumu değil. */
export function degisimMetni(k: Kayit): string | null {
  if (k.once || k.sonra) {
    return `${etiketle(k.once, '—')} → ${etiketle(k.sonra, '—')}`;
  }
  return k.dosya ?? null;
}

/** Aynı kaydın izini toplar — çekmecede seçili satırın komşuları. */
export function ayniKayit(kayitlar: Kayit[], k: Kayit): Kayit[] {
  return kayitlar.filter((x) => x.varlikTipi === k.varlikTipi && x.varlikId === k.varlikId);
}

/* ── Zaman ──────────────────────────────────────────────────────────── */

const GUN = 86_400_000;

/* Tablo ilk kolonu: gün.ay + saat. Yıl atlanır çünkü kolon tek satır ve
   kütük zaman sırasında okunuyor; yılın gerektiği yerlerde (kuyruk etiketi,
   çekmece) tam damga `zamanTR`/`tarihTR` ile yazılır. */
export function kisaZaman(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '—';
  const iki = (n: number) => String(n).padStart(2, '0');
  return `${iki(t.getDate())}.${iki(t.getMonth() + 1)} ${iki(t.getHours())}:${iki(t.getMinutes())}`;
}

/* ── Metrikler · filtrelerden BAĞIMSIZ, pencerenin tamamı ───────────── */

export function metrikleriHesapla(kayitlar: Kayit[], simdi: number) {
  return {
    toplam: kayitlar.length,
    son24: kayitlar.filter((k) => simdi - new Date(k.zaman).getTime() <= GUN).length,
    son7: kayitlar.filter((k) => simdi - new Date(k.zaman).getTime() <= 7 * GUN).length,
    aktor: new Set(kayitlar.map(aktorMetni)).size,
    kritik: kayitlar.filter(kritikEylem).length,
    // Aktörü bilinmeyen kayıt sıfır sayılmaz; ayrı raporlanır.
    aktorsuz: kayitlar.filter((k) => !k.aktor && k.kaynak === 'ui').length,
  };
}
