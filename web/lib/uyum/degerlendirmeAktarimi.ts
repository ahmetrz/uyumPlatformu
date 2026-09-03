/* ═══════════════════════════════════════════════════════════════════════
   UY-43 · Değerlendirme içe aktarımı — SAF KARAR

   `IceAktarim` MADDE metnini aktarır; bu katman DEĞERLENDİRME SONUCUNU
   aktarır (hangi santralde hangi kontrol ne durumda). İkisi ayrı
   şeylerdir: biri regülasyonun kendisi, öteki kurumun ona verdiği cevap.

   ── KURU KOŞU BİR SEÇENEK DEĞİL, BİR ADIMDIR ──────────────────────────
   Bir değerlendirme aktarımı tek hamlede yüzlerce kontrolün durumunu
   değiştirebilir ve bunların her biri bir DENETİM KARARIDIR. Önizlemesiz
   uygulamak, kararları körlemesine toptan yazmaktır. Bu yüzden uygulama
   kaydı kendi kuru koşusuna KÖKENLE bağlıdır ve bağsız uygulama
   yazılamaz.

   ── AYNI DURUMU YENİDEN YAZMAK BİR DEĞİŞİKLİK DEĞİLDİR ────────────────
   `eslesen` ile `degisen` ayrı sayılır. 300 satırın 300'ü eşleşip
   hiçbiri değişmiyorsa, "300 kayıt güncellendi" demek denetim izini
   gürültüye boğar ve gerçek değişikliği görünmez kılar.

   Bu dosya veritabanı ve React bilmez. */

/** Aktarımda kabul edilen durumlar — `lib/sabitler.ts` sözlüğüyle birebir. */
export const AKTARILABILIR_DURUMLAR = [
  'uyumlu', 'kismi', 'uyumsuz', 'degerlendirilmedi', 'incelemede', 'kapsamdisi',
] as const;
export type AktarilabilirDurum = (typeof AKTARILABILIR_DURUMLAR)[number];

export const AKTARIM_DURUMLARI = ['kuru_kosu', 'uygulandi', 'reddedildi'] as const;
export type AktarimDurumu = (typeof AKTARIM_DURUMLARI)[number];

export const AKTARIM_DURUM_SOZU: Record<AktarimDurumu, string> = {
  kuru_kosu: 'kuru koşu — hiçbir şey yazılmadı',
  uygulandi: 'uygulandı',
  reddedildi: 'reddedildi',
};

/* ── Ham satır ───────────────────────────────────────────────────────── */

export type HamSatir = {
  /** Kaynak dosyadaki satır numarası — eleme sebebi buna bağlanır. */
  satirNo: number;
  maddeKodu: string;
  durum: string;
  not?: string | null;
  gerekce?: string | null;
};

export const ELEME_SEBEPLERI = [
  'kod_bos', 'kod_bulunamadi', 'kod_yinelendi', 'durum_gecersiz',
  'kapsam_disi_madde', 'gerekce_eksik',
] as const;
export type ElemeSebebi = (typeof ELEME_SEBEPLERI)[number];

export const ELEME_SOZU: Record<ElemeSebebi, string> = {
  kod_bos: 'Madde kodu boş',
  kod_bulunamadi: 'Bu kodda madde yok (regülasyon ya da sürüm eşleşmiyor)',
  kod_yinelendi: 'Aynı madde kodu dosyada birden çok kez var',
  durum_gecersiz: 'Durum sözlükte yok',
  kapsam_disi_madde: 'Maddede AKTİF istisna var — bu santral için kapsam dışı',
  gerekce_eksik: 'Uyumsuz/kapsam dışı karar gerekçe ister',
};

export type OnizlemeSatiri =
  | {
    kabul: true;
    satirNo: number;
    maddeKodu: string;
    maddeDurumuId: string;
    eskiDurum: string;
    yeniDurum: AktarilabilirDurum;
    /** Aynı durum yeniden yazılıyorsa `false` — sayılır ama uygulanmaz. */
    degisiyor: boolean;
    not: string | null;
    gerekce: string | null;
  }
  | {
    kabul: false;
    satirNo: number;
    maddeKodu: string;
    sebep: ElemeSebebi;
    aciklama: string;
  };

export type MevcutKayit = {
  maddeKodu: string;
  maddeDurumuId: string;
  durum: string;
  /** Bu madde bu santralin kapsamında mı (uygulanabilirlik kararı). */
  kapsamda: boolean;
};

/**
 * Gerekçe ZORUNLU olan kararlar.
 *
 * "Uyumsuz" ve "kapsam dışı" bir kurumun kendi aleyhine ya da lehine
 * verdiği kararlardır ve ikisi de denetimde ilk sorulanlardır.
 * Gerekçesiz toplu aktarımla yazılmaları, tam olarak denetimin
 * yakalamak istediği şeydir.
 */
export function gerekceZorunluMu(durum: string): boolean {
  return durum === 'uyumsuz' || durum === 'kapsamdisi';
}

/**
 * Kuru koşu: hiçbir şey yazmadan ne olacağını hesaplar.
 *
 * Bu fonksiyon UYGULAMA yolunda da çağrılır. Önizlemenin gerçekten
 * olacak şeyi göstermesinin tek garantisi budur; iki ayrı hesap iki
 * ayrı sonuç üretir ve önizleme bir süs olurdu.
 */
export function kuruKosu(o: {
  satirlar: readonly HamSatir[];
  mevcut: readonly MevcutKayit[];
}): OnizlemeSatiri[] {
  const idx = new Map(o.mevcut.map((m) => [m.maddeKodu, m]));
  const gorulen = new Set<string>();
  const sonuc: OnizlemeSatiri[] = [];

  for (const s of o.satirlar) {
    const kod = s.maddeKodu.trim();
    if (kod.length === 0) {
      sonuc.push({
        kabul: false, satirNo: s.satirNo, maddeKodu: kod,
        sebep: 'kod_bos', aciklama: ELEME_SOZU.kod_bos,
      });
      continue;
    }
    if (gorulen.has(kod)) {
      sonuc.push({
        kabul: false, satirNo: s.satirNo, maddeKodu: kod,
        sebep: 'kod_yinelendi', aciklama: ELEME_SOZU.kod_yinelendi,
      });
      continue;
    }
    gorulen.add(kod);

    const mevcut = idx.get(kod);
    if (!mevcut) {
      sonuc.push({
        kabul: false, satirNo: s.satirNo, maddeKodu: kod,
        sebep: 'kod_bulunamadi', aciklama: ELEME_SOZU.kod_bulunamadi,
      });
      continue;
    }
    if (!mevcut.kapsamda) {
      sonuc.push({
        kabul: false, satirNo: s.satirNo, maddeKodu: kod,
        sebep: 'kapsam_disi_madde', aciklama: ELEME_SOZU.kapsam_disi_madde,
      });
      continue;
    }
    const durum = s.durum.trim();
    if (!AKTARILABILIR_DURUMLAR.includes(durum as AktarilabilirDurum)) {
      sonuc.push({
        kabul: false, satirNo: s.satirNo, maddeKodu: kod,
        sebep: 'durum_gecersiz',
        aciklama: `${ELEME_SOZU.durum_gecersiz}: "${durum}"`,
      });
      continue;
    }
    const gerekce = (s.gerekce ?? '').trim();
    if (gerekceZorunluMu(durum) && gerekce.length === 0) {
      sonuc.push({
        kabul: false, satirNo: s.satirNo, maddeKodu: kod,
        sebep: 'gerekce_eksik',
        aciklama: `${ELEME_SOZU.gerekce_eksik} ("${durum}").`,
      });
      continue;
    }
    sonuc.push({
      kabul: true,
      satirNo: s.satirNo,
      maddeKodu: kod,
      maddeDurumuId: mevcut.maddeDurumuId,
      eskiDurum: mevcut.durum,
      yeniDurum: durum as AktarilabilirDurum,
      degisiyor: mevcut.durum !== durum,
      not: (s.not ?? '').trim() || null,
      gerekce: gerekce || null,
    });
  }
  return sonuc;
}

/* ── Sayımlar ────────────────────────────────────────────────────────── */

export type AktarimSayimlari = {
  okunan: number;
  eslesen: number;
  elenen: number;
  /** Gerçekten durumu DEĞİŞECEK satır — `eslesen` ile aynı değildir. */
  degisen: number;
  /** Eşleşti ama aynı durumu taşıyor: yazılmayacak. */
  aynikalan: number;
  sebepler: Record<string, number>;
};

export function aktarimSayimlari(satirlar: readonly OnizlemeSatiri[]): AktarimSayimlari {
  const kabul = satirlar.filter((s): s is Extract<OnizlemeSatiri, { kabul: true }> => s.kabul);
  const red = satirlar.filter((s): s is Extract<OnizlemeSatiri, { kabul: false }> => !s.kabul);
  const sebepler: Record<string, number> = {};
  for (const r of red) sebepler[r.sebep] = (sebepler[r.sebep] ?? 0) + 1;
  return {
    okunan: satirlar.length,
    eslesen: kabul.length,
    elenen: red.length,
    degisen: kabul.filter((s) => s.degisiyor).length,
    aynikalan: kabul.filter((s) => !s.degisiyor).length,
    sebepler,
  };
}

/* ── Uygulama kapısı ─────────────────────────────────────────────────── */

export type UygulamaKarari =
  | { ok: true }
  | { ok: false; sebep: string };

/** Elenen satır oranı bunu aşarsa aktarım şüphelidir. */
export const ELEME_TAVANI = 0.5;

/**
 * Bu kuru koşu uygulanabilir mi?
 *
 * Üç kapı: (1) kuru koşu gerçekten koşmuş olmalı, (2) uygulanacak bir
 * değişiklik olmalı, (3) elenen oranı tavanı aşmamalı.
 *
 * Üçüncüsü bir güvenlik kapısıdır: satırların yarısından çoğu
 * eleniyorsa, kaynak dosya büyük ihtimalle YANLIŞ regülasyona ya da
 * yanlış santrale aktarılıyordur. Kalan azınlığı sessizce yazmak, doğru
 * görünen ama yanlış yere yazılmış bir aktarım üretirdi.
 */
export function uygulamaKapisi(o: {
  sayimlar: AktarimSayimlari;
  kuruKosuVar: boolean;
}): UygulamaKarari {
  if (!o.kuruKosuVar) {
    return {
      ok: false,
      sebep: 'Bu uygulamanın bağlı olduğu bir kuru koşu yok. Değerlendirme '
        + 'aktarımı önizlemesiz uygulanamaz.',
    };
  }
  if (o.sayimlar.okunan === 0) {
    return { ok: false, sebep: 'Kuru koşuda hiç satır okunmadı.' };
  }
  if (o.sayimlar.degisen === 0) {
    return {
      ok: false,
      sebep: `Uygulanacak değişiklik yok: ${o.sayimlar.eslesen} satır eşleşti, `
        + 'hepsi zaten aynı durumda.',
    };
  }
  const elemeOrani = o.sayimlar.elenen / o.sayimlar.okunan;
  if (elemeOrani > ELEME_TAVANI) {
    return {
      ok: false,
      sebep: `${o.sayimlar.elenen}/${o.sayimlar.okunan} satır elendi `
        + `(%${Math.round(elemeOrani * 100)}). Bu oran, dosyanın yanlış `
        + 'regülasyona ya da yanlış santrale aktarıldığını gösterir; '
        + 'kalan satırlar uygulanmaz.',
    };
  }
  return { ok: true };
}

export function aktarimCumlesi(s: AktarimSayimlari): string {
  if (s.okunan === 0) return 'Dosyada satır yok.';
  if (s.elenen === s.okunan) {
    return `${s.okunan} satırın tamamı elendi — hiçbiri uygulanamaz.`;
  }
  if (s.degisen === 0) {
    return `${s.eslesen} satır eşleşti ama hiçbiri durumu değiştirmiyor; `
      + 'uygulanacak bir şey yok.';
  }
  const kuyruk = s.elenen > 0 ? ` · ${s.elenen} satır elendi` : '';
  const ayni = s.aynikalan > 0 ? ` · ${s.aynikalan} satır zaten aynı durumda` : '';
  return `${s.degisen} kontrolün durumu değişecek${ayni}${kuyruk}.`;
}
