import type { Durum } from '@/components/kabuk/temel';
import type { AktarimDurumu } from '@/lib/uyum/degerlendirmeAktarimi';

/* ═══ UY-43 · Değerlendirme aktarımı — SAF EKRAN MANTIĞI ══════════════

   Bu dosya veritabanına, React'e ve `server-only`ye dokunmaz; testi de
   dokunmaz. Karar kodunun kendisi `lib/uyum/degerlendirmeAktarimi.ts`
   içindedir — burası yalnız ekranın gösterim kararlarını taşır. */

export type AktarimSatiri = {
  id: string;
  durum: AktarimDurumu;
  kaynakAdi: string;
  regulasyonKod: string;
  tesisKod: string;
  surecKod: string | null;
  okunan: number;
  eslesen: number;
  elenen: number;
  degisen: number;
  /** Uygulama kaydıysa hangi kuru koşudan geldiği — KÖKEN. */
  kuruKosuId: string | null;
  /** Kuru koşuysa: bundan üretilmiş uygulama var mı. */
  uygulandiMi: boolean;
  yukleyen: string | null;
  olusturuldu: string;
  uygulandi: string | null;
};

export const AKTARIM_IM: Record<AktarimDurumu, Durum> = {
  /* Kuru koşu bir KUSUR DEĞİLDİR: bekleyen bir karardır. `bd` verilseydi
     her önizleme ekranda kırmızı bir alarm bırakırdı. */
  kuru_kosu: 'pl',
  uygulandi: 'ok',
  reddedildi: 'unk',
};

export const AKTARIM_SOZU: Record<AktarimDurumu, string> = {
  kuru_kosu: 'kuru koşu — karar bekliyor',
  uygulandi: 'uygulandı',
  reddedildi: 'reddedildi',
};

/**
 * Bir satırın alt metni.
 *
 * `eslesen` ile `degisen` AYRI yazılır: 300 satırın 300'ü eşleşip
 * hiçbiri değişmiyorsa "300 kayıt güncellendi" demek denetim izini
 * gürültüye boğar ve gerçek değişikliği görünmez kılar.
 */
export function satirAlti(a: AktarimSatiri): string {
  const parca = [`${a.okunan} satır okundu`];
  if (a.eslesen > 0) parca.push(`${a.eslesen} eşleşti`);
  if (a.elenen > 0) parca.push(`${a.elenen} elendi`);
  if (a.durum === 'uygulandi') {
    parca.push(`${a.degisen} kontrolün durumu DEĞİŞTİ`);
  } else if (a.durum === 'kuru_kosu') {
    parca.push(a.degisen > 0
      ? `${a.degisen} kontrol değişecek`
      : 'değişecek kontrol yok');
  }
  return parca.join(' · ');
}

export type AktarimOzeti = {
  toplam: number;
  bekleyen: number;
  uygulanan: number;
  reddedilen: number;
  /** Uygulanmış aktarımlarda gerçekten değişen kontrol sayısı. */
  degisenToplam: number;
  /** Kökeni olmayan uygulama — OLMAMASI gereken bir durum. */
  kokensizUygulama: number;
};

/**
 * Kütüğün özeti.
 *
 * `kokensizUygulama` bir bütünlük ölçüsüdür ve sıfır olmalıdır: sunucu
 * kökensiz uygulama yazmayı reddeder. Sıfırdan büyükse ürün değil,
 * veritabanı elle kurcalanmış demektir ve ekran bunu gizlemez.
 */
export function aktarimOzeti(satirlar: readonly AktarimSatiri[]): AktarimOzeti {
  const uygulananlar = satirlar.filter((a) => a.durum === 'uygulandi');
  return {
    toplam: satirlar.length,
    bekleyen: satirlar.filter((a) => a.durum === 'kuru_kosu' && !a.uygulandiMi).length,
    uygulanan: uygulananlar.length,
    reddedilen: satirlar.filter((a) => a.durum === 'reddedildi').length,
    degisenToplam: uygulananlar.reduce((t, a) => t + a.degisen, 0),
    kokensizUygulama: uygulananlar.filter((a) => a.kuruKosuId === null).length,
  };
}

export function ozetCumlesi(o: AktarimOzeti): string {
  if (o.kokensizUygulama > 0) {
    return `${o.kokensizUygulama} uygulama kökensiz: bağlı olduğu kuru koşu yok. `
      + 'Sunucu bunu yazmaz — kayıtlar dışarıdan değiştirilmiş olabilir.';
  }
  if (o.toplam === 0) return 'Değerlendirme aktarımı kaydı yok.';
  if (o.bekleyen > 0) {
    return `${o.bekleyen} kuru koşu karar bekliyor — uygulanmadılar, `
      + 'hiçbir değerlendirmeye dokunmadılar.';
  }
  if (o.uygulanan > 0) {
    return `${o.uygulanan} aktarım uygulandı; toplam ${o.degisenToplam} `
      + 'kontrolün durumu değişti.';
  }
  return `${o.toplam} kayıt · uygulanan yok.`;
}

/* ── CSV ayrıştırma ───────────────────────────────────────────────────
   Dosya ürünün İÇİNDE ayrıştırılmaz: kullanıcı metni yapıştırır ve
   ayrıştırma burada, saf ve test edilebilir bir fonksiyonda yapılır.
   Sunucuya giden şey ham metin değil, YAPISAL satırlardır. */

export type AyristirmaSonucu = {
  satirlar: { satirNo: number; maddeKodu: string; durum: string;
    not: string | null; gerekce: string | null }[];
  /** Sütun sayısı beklenenden az olan satırlar — SESSİZCE atılmaz. */
  bozuk: { satirNo: number; icerik: string }[];
};

/** Beklenen sütunlar: madde kodu · durum · not · gerekçe. */
export const SUTUNLAR = ['madde kodu', 'durum', 'not', 'gerekçe'] as const;

/**
 * Yapıştırılan metni satırlara ayırır.
 *
 * Ayraç olarak sekme ve noktalı virgül kabul edilir, VİRGÜL EDİLMEZ:
 * gerekçe metinleri neredeyse her zaman virgül taşır ve virgülle bölmek
 * gerekçeyi ortadan ikiye keser. Elektronik tablodan kopyalanan metin
 * zaten sekmeyle gelir.
 *
 * Başlık satırı varsa atlanır: ilk hücre "madde" ile başlıyorsa o satır
 * veri değil başlıktır.
 */
export function metniAyristir(metin: string): AyristirmaSonucu {
  const satirlar: AyristirmaSonucu['satirlar'] = [];
  const bozuk: AyristirmaSonucu['bozuk'] = [];
  const hamSatirlar = metin.split(/\r?\n/);

  for (let i = 0; i < hamSatirlar.length; i++) {
    const ham = hamSatirlar[i];
    if (ham.trim().length === 0) continue;
    const hucre = ham.split(/[\t;]/).map((h) => h.trim());
    /* Başlık satırı: ilk hücre "madde" ile başlıyor ve bu ilk veri
       satırı. Atlanır, bozuk sayılmaz. */
    if (satirlar.length === 0 && bozuk.length === 0
      && /^madde/i.test(hucre[0] ?? '')) continue;
    if (hucre.length < 2) {
      bozuk.push({ satirNo: i + 1, icerik: ham.slice(0, 120) });
      continue;
    }
    satirlar.push({
      satirNo: i + 1,
      maddeKodu: hucre[0] ?? '',
      durum: hucre[1] ?? '',
      not: (hucre[2] ?? '').trim() || null,
      gerekce: (hucre[3] ?? '').trim() || null,
    });
  }
  return { satirlar, bozuk };
}
