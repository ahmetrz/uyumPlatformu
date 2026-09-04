/* ═══════════════════════════════════════════════════════════════════════
   UY-57 · Dış denetçi erişimi — SAF KARAR

   `dis_denetci` rolü `lib/erisim.ts` içinde VARDI:

       dis_denetci: { denetim: ['okuma'], uyum: ['okuma'] }

   ve yalnız bir rol adıydı. Süresi, kapsamı, kim davet etti, ne zaman
   biter, hangi santralleri kapsar — hiçbiri kayıtlı değildi. Bir dış
   denetçiye kalıcı hesap açmak, denetim bittikten sonra da açık kalan
   bir kapı bırakır ve o kapıyı kimse kapatmayı hatırlamaz.

   ── SÜRE ZORUNLUDUR ───────────────────────────────────────────────────
   Şema `bitis` alanını zorunlu tutar. Süresiz dış erişim diye bir şey
   yoktur: denetimin bir bitiş tarihi vardır ve erişim onunla biter.

   ── BOŞ KAPSAM = HİÇBİR ŞEY ───────────────────────────────────────────
   Kapsamı boş bir denetçi erişimi hiçbir santrali kapsamaz. "Boş kapsam
   = her şey" varsayımı, ürünün öteki yerlerinde de reddedilen bir
   kalıptır ve burada bir dış denetçiye kurumun tamamını açmak olurdu.

   Bu dosya veritabanı ve React bilmez. */

export const ERISIM_DURUMLARI = ['aktif', 'suresi_doldu', 'iptal'] as const;
export type ErisimDurumu = (typeof ERISIM_DURUMLARI)[number];

export const ERISIM_SOZU: Record<ErisimDurumu, string> = {
  aktif: 'erişim açık',
  suresi_doldu: 'süresi doldu',
  iptal: 'iptal edildi',
};

/** Bitişe bu kadar gün kalınca "bitmek üzere" denir. */
export const BITIS_UYARI_GUN = 7;

export type YasayanDurum =
  | 'aktif' | 'bitmek_uzere' | 'suresi_doldu' | 'iptal'
  | 'kapsamsiz' | 'hic_kullanilmadi';

export const YASAYAN_SOZU: Record<YasayanDurum, string> = {
  aktif: 'erişim açık',
  bitmek_uzere: 'süresi bitmek üzere',
  suresi_doldu: 'süresi doldu — erişim kapalı',
  iptal: 'iptal edildi',
  /* Kapsamı olmayan aktif erişim: hesap açık ama hiçbir santral
     görmüyor. Bir kusur değil ama bir kurulum eksiğidir ve gizlenmez. */
  kapsamsiz: 'kapsam tanımlanmadı — hiçbir santral görünmüyor',
  hic_kullanilmadi: 'açık ama HİÇ kullanılmadı',
};

export const YASAYAN_SINIFI: Record<YasayanDurum, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  aktif: 'ok',
  bitmek_uzere: 'md',
  /* Süresi dolmuş erişim bir KUSUR DEĞİLDİR: sistem doğru çalıştı ve
     kapı kapandı. `pl` (planlı/beklemede) ile gösterilir. */
  suresi_doldu: 'pl',
  iptal: 'pl',
  kapsamsiz: 'md',
  hic_kullanilmadi: 'unk',
};

/**
 * Bir erişimin BUGÜNKÜ hâli.
 *
 * `durum` alanı kaydın kendi durumudur; bu fonksiyon ona TARİHİ ve
 * KAPSAMI da katar. Bir kayıt veritabanında `aktif` görünüp bitiş
 * tarihi geçmiş olabilir (zamanlayıcı henüz koşmamıştır) ve ekran o
 * erişimi açık göstermemelidir.
 */
export function yasayanDurum(o: {
  durum: string;
  bitis: number;
  simdi: number;
  kapsamSayisi: number;
  sonErisim: number | null;
  uyariGun?: number;
}): YasayanDurum {
  if (o.durum === 'iptal') return 'iptal';
  if (o.bitis <= o.simdi) return 'suresi_doldu';
  if (o.durum === 'suresi_doldu') return 'suresi_doldu';
  if (o.kapsamSayisi === 0) return 'kapsamsiz';
  const esik = (o.uyariGun ?? BITIS_UYARI_GUN) * 86_400_000;
  if (o.bitis - o.simdi <= esik) return 'bitmek_uzere';
  if (o.sonErisim === null) return 'hic_kullanilmadi';
  return 'aktif';
}

/** Erişim bugün gerçekten çalışıyor mu? Ekran değil, KAPI sorusu. */
export function erisimAcikMi(o: {
  durum: string; bitis: number; simdi: number; kapsamSayisi: number;
}): boolean {
  if (o.durum !== 'aktif') return false;
  if (o.bitis <= o.simdi) return false;
  return o.kapsamSayisi > 0;
}

/* ── Davet kapısı ────────────────────────────────────────────────────── */

export type DavetKarari =
  | { ok: true }
  | { ok: false; sebep: string };

/** Dış denetçi erişimi en çok bu kadar sürebilir. */
export const AZAMI_SURE_GUN = 365;

/**
 * Yeni bir dış denetçi erişimi açılabilir mi?
 *
 * Üç kapı: bitiş gelecekte olmalı, süre tavanı aşılmamalı, kapsam boş
 * olmamalı. Üçü de "sonradan düzeltiriz" denerek atlanabilecek şeyler
 * gibi görünür ve tam da bu yüzden baştan kapatılır: süresiz ya da
 * kapsamsız açılmış bir dış erişim, düzeltilene kadar açık kalır.
 */
export function davetKapisi(o: {
  baslangic: number;
  bitis: number;
  simdi: number;
  kapsamSayisi: number;
  azamiGun?: number;
}): DavetKarari {
  if (o.bitis <= o.simdi) {
    return { ok: false, sebep: 'Bitiş tarihi gelecekte olmalı.' };
  }
  if (o.bitis <= o.baslangic) {
    return { ok: false, sebep: 'Bitiş tarihi başlangıçtan sonra olmalı.' };
  }
  const gun = Math.ceil((o.bitis - o.baslangic) / 86_400_000);
  const tavan = o.azamiGun ?? AZAMI_SURE_GUN;
  if (gun > tavan) {
    return {
      ok: false,
      sebep: `Dış denetçi erişimi en çok ${tavan} gün olabilir (istenen: ${gun} gün). `
        + 'Denetim daha uzun sürüyorsa erişim yenilenir; süresiz açılmaz.',
    };
  }
  if (o.kapsamSayisi === 0) {
    return {
      ok: false,
      sebep: 'En az bir santral seçilmeli. Kapsamsız bir dış erişim hiçbir '
        + 'şey göstermez; "boş kapsam = her şey" DEĞİLDİR.',
    };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type DenetciOzeti = {
  toplam: number;
  aktif: number;
  bitmekUzere: number;
  suresiDolan: number;
  iptal: number;
  kapsamsiz: number;
  hicKullanilmayan: number;
};

export function denetciOzeti(durumlar: readonly YasayanDurum[]): DenetciOzeti {
  const say = (d: YasayanDurum) => durumlar.filter((x) => x === d).length;
  return {
    toplam: durumlar.length,
    aktif: say('aktif'),
    bitmekUzere: say('bitmek_uzere'),
    suresiDolan: say('suresi_doldu'),
    iptal: say('iptal'),
    kapsamsiz: say('kapsamsiz'),
    hicKullanilmayan: say('hic_kullanilmadi'),
  };
}

export function denetciCumlesi(o: DenetciOzeti): string {
  if (o.toplam === 0) return 'Tanımlı dış denetçi erişimi yok.';
  if (o.kapsamsiz > 0) {
    return `${o.kapsamsiz} erişimin kapsamı boş: hesap açık ama hiçbir `
      + 'santral görünmüyor.';
  }
  if (o.bitmekUzere > 0) {
    return `${o.bitmekUzere} erişimin süresi ${BITIS_UYARI_GUN} gün içinde doluyor.`;
  }
  const acik = o.aktif + o.hicKullanilmayan;
  if (acik > 0) {
    return `${acik} dış denetçi erişimi açık`
      + (o.hicKullanilmayan > 0 ? ` (${o.hicKullanilmayan} tanesi hiç kullanılmadı)` : '')
      + '.';
  }
  return `Açık dış denetçi erişimi yok · ${o.suresiDolan} süresi doldu · `
    + `${o.iptal} iptal.`;
}
