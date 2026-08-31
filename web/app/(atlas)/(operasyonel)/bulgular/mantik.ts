import type { Durum } from '@/components/atlas/temel';
import { BULGU_DURUM_ETIKET, etiketle, zamanTR } from '@/lib/sabitler';

/* O7 · bulgu → aksiyon → doğrulama ilerlemesinin tek türetme yeri.
   Liste ekranı ve kayıt ekranı aynı kuralları kullanır, böylece bir satırın
   işaretçisi ile kayıt sayfasındaki aşama birbirinden ayrışmaz.

   Durum eşlemesi (06 §A2 · marker dışında durum sözcüğü yazılmaz):
     gecikmiş/bloke → bd · doğrulama bekleyen → md · zamanında → ok
     aksiyonu olmayan → unk · kapanmış → tamam · riski kabul → pl          */

export type AksiyonOzeti = {
  id: string; baslik: string; durum: string; sorumlu: string | null;
  hedef: string | null; tamamlanma: string | null;
  dogrulama: string; dogrulamaTarihi: string | null;
  dogrulayan: string | null; not: string | null;
};

export type BulguOzeti = {
  durum: string; hedef: string | null;
  retestGerekli: boolean; retestSonucu: string | null;
  kapanisDogrulama: string | null; kapanisDogrulayan: string | null;
  aksiyonlar: AksiyonOzeti[];
};

/** Kapalı ve riski kabul edilmiş kayıtlar "açık" sayılmaz (lib/sabitler ile aynı kural). */
export function acikMi(durum: string): boolean {
  return durum !== 'kapali' && durum !== 'kabul_edildi';
}

/* Şemada olmayan ama veride bulunan durum: `dogrulamada`. Sözlük merkezî
   olarak genişletilene kadar burada karşılanır (rapora bakınız). */
const EK_DURUM_SOZU: Record<string, string> = { dogrulamada: 'Doğrulamada' };

/** Kayıt durumunun Türkçe karşılığı — yalnız çekmece/panel metinlerinde. */
export function bulguDurumSozu(durum: string): string {
  return EK_DURUM_SOZU[durum]
    ?? BULGU_DURUM_ETIKET[durum as keyof typeof BULGU_DURUM_ETIKET]
    ?? etiketle(durum);
}

const GUN = 86_400_000;

/** Gecikmiş = hedefTarih < bugün ve durum kapalı değil. Değilse null. */
export function gecikmeGunu(b: { durum: string; hedef: string | null }): number | null {
  if (!b.hedef || !acikMi(b.durum)) return null;
  const fark = Date.now() - new Date(b.hedef).getTime();
  return fark > 0 ? Math.max(1, Math.floor(fark / GUN)) : null;
}

/** Termine kalan gün (geçmişse negatif); hedef yoksa null. */
export function kalanGun(b: { durum: string; hedef: string | null }): number | null {
  if (!b.hedef || !acikMi(b.durum)) return null;
  return Math.ceil((new Date(b.hedef).getTime() - Date.now()) / GUN);
}

export function aksiyonAcikMi(a: AksiyonOzeti): boolean {
  return a.durum === 'planlandi' || a.durum === 'devam';
}

/** Aksiyonun kendi işaretçisi — kendi termini geçtiyse kritik olur. */
export function aksiyonImi(a: AksiyonOzeti): Durum {
  if (a.durum === 'tamamlandi') return 'ok';
  if (a.durum === 'iptal') return 'unk';
  if (a.hedef && new Date(a.hedef).getTime() < Date.now()) return 'bd';
  return a.durum === 'devam' ? 'md' : 'pl';
}

/** Satırda gösterilen aksiyon: önce takılmış olan, sonra en yakın terminli. */
export function surukleyenAksiyon(b: BulguOzeti): AksiyonOzeti | null {
  if (b.aksiyonlar.length === 0) return null;
  const acik = b.aksiyonlar.filter(aksiyonAcikMi);
  const havuz = acik.length > 0 ? acik : b.aksiyonlar;
  const sirali = [...havuz].sort((x, y) => {
    const gx = aksiyonImi(x) === 'bd' ? 0 : 1;
    const gy = aksiyonImi(y) === 'bd' ? 0 : 1;
    if (gx !== gy) return gx - gy;
    if (!x.hedef) return 1;
    if (!y.hedef) return -1;
    return new Date(x.hedef).getTime() - new Date(y.hedef).getTime();
  });
  return sirali[0] ?? null;
}

export type DogrulamaHucresi = {
  im: Durum | null;
  /** işaretçinin erişilebilir adı — canvasta metin olarak yazılmaz */
  ad: string;
  /** durum sözcüğü — YALNIZ çekmece/panel içinde kullanılır (06 §A2) */
  soz: string;
  /** hücrede görünen OLGU: retest tarihi / doğrulayan. Kanıt yoksa boş. */
  olgu: string;
  /** hover popover'ı — yalnız yardımcı metadata */
  kanit: string | null;
};

/* 06 §A2: doğrulama kolonunda durum sözcüğü TEKRARLANMAZ. İşaretçi durumu
   taşır; metin yalnız elde bir kanıt olgusu varsa (retest tarihi, doğrulayan)
   yazılır. Kanıt yoksa hücre işaretçiden ibarettir. */
export function dogrulamaHucresi(b: BulguOzeti): DogrulamaHucresi {
  const red = b.aksiyonlar.find((a) => a.dogrulama === 'reddedildi');
  if (red) {
    return {
      im: 'bd', ad: 'Doğrulama · retest reddedildi', soz: 'Retest reddedildi',
      olgu: red.dogrulamaTarihi ? `retest ${kisaTarih(red.dogrulamaTarihi)}` : '',
      kanit: retestKaniti(red, b),
    };
  }

  if (b.durum === 'kapali') {
    const onaylı = b.aksiyonlar.find((a) => a.dogrulama === 'dogrulandi');
    const an = b.kapanisDogrulama ?? onaylı?.dogrulamaTarihi ?? null;
    const kanit = [
      b.kapanisDogrulayan && `Doğrulayan ${b.kapanisDogrulayan}`,
      b.kapanisDogrulama && zamanTR(b.kapanisDogrulama),
      b.retestSonucu,
      onaylı && `Aksiyon: ${onaylı.baslik}`,
    ].filter(Boolean).join(' · ');
    return {
      im: 'ok', ad: 'Doğrulama · kapanış doğrulandı', soz: 'Doğrulandı',
      olgu: an ? `retest ${kisaTarih(an)}` : (b.kapanisDogrulayan ?? ''),
      kanit: kanit || 'Kapanış doğrulaması kaydı yok.',
    };
  }

  const bekleyen = b.aksiyonlar.find((a) => a.dogrulama === 'bekliyor');
  if (bekleyen) {
    return {
      im: 'unk', ad: 'Doğrulama · retest bekliyor', soz: 'Retest bekliyor',
      // Elde tarih yoksa metin yazılmaz — işaretçi zaten bunu söylüyor.
      olgu: bekleyen.dogrulayan ?? '',
      kanit: retestKaniti(bekleyen, b),
    };
  }

  if (b.retestGerekli && !b.retestSonucu) {
    return {
      im: 'unk', ad: 'Doğrulama · retest bekliyor', soz: 'Retest bekliyor', olgu: '',
      kanit: 'Retest gerekli olarak işaretlendi; sonuç girilmedi.',
    };
  }

  if (b.retestSonucu) {
    return { im: 'md', ad: 'Doğrulama · retest kaydı var', soz: 'Retest kaydı var', olgu: '', kanit: b.retestSonucu };
  }

  const biten = b.aksiyonlar.filter((a) => a.durum === 'tamamlandi');
  if (acikMi(b.durum) && biten.length > 0 && b.aksiyonlar.every((a) => !aksiyonAcikMi(a))) {
    return {
      im: 'unk', ad: 'Doğrulama · kapanış doğrulaması yapılmadı', soz: 'Kapanış doğrulaması bekliyor', olgu: '',
      kanit: `${biten.length} aksiyon tamamlandı; kapanış doğrulaması yapılmadı.`,
    };
  }

  if (b.durum === 'dogrulamada') {
    return {
      im: 'unk', ad: 'Doğrulama · kayıt doğrulamada', soz: 'Doğrulamada', olgu: '',
      kanit: 'Kayıt doğrulama aşamasında; retest kanıtı henüz bağlanmadı.',
    };
  }

  return { im: null, ad: 'Doğrulama · kayıt yok', soz: 'Doğrulama kaydı yok', olgu: '', kanit: null };
}

function retestKaniti(a: AksiyonOzeti, b: BulguOzeti): string {
  return [
    a.baslik,
    a.dogrulayan && `doğrulayan ${a.dogrulayan}`,
    a.dogrulamaTarihi && zamanTR(a.dogrulamaTarihi),
    a.not,
    b.retestSonucu,
  ].filter(Boolean).join(' · ') || 'Retest kanıtı girilmedi.';
}

/** Doğrulama bekleyen: metriklerde ve satır işaretçisinde aynı tanım. */
export function dogrulamaBekliyorMu(b: BulguOzeti): boolean {
  if (!acikMi(b.durum)) return false;
  if (b.durum === 'dogrulamada') return true;
  const h = dogrulamaHucresi(b);
  return h.im === 'unk' || h.im === 'md';
}

/** Satır işaretçisi. Gecikme her şeyin önündedir. */
export function bulguImi(b: BulguOzeti): Durum {
  if (b.durum === 'kapali') return 'tamam';
  if (b.durum === 'kabul_edildi') return 'pl';
  if (gecikmeGunu(b) !== null) return 'bd';
  if (b.aksiyonlar.length === 0) return 'unk';
  if (dogrulamaBekliyorMu(b)) return 'md';
  return 'ok';
}

/* ── biçimleme ───────────────────────────────────────────────────────── */

const AY_GUN = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const AY_GUN_YIL = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

/** "26 Eylül" · farklı yıldaysa "26 Eyl 2027". Tasarımdaki tarih biçimi. */
export function kisaTarih(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? AY_GUN.format(d) : AY_GUN_YIL.format(d);
}
