/* ═══ OT-09 · Sahiplik ve ekip ════════════════════════════════════════

   Bugün sahiplik tek bir kullanıcıya bağlı. Kişi ayrıldığında varlık
   öksüz kalıyor ve bunu fark eden hiçbir mekanizma yok: pasifleşmiş bir
   kullanıcı hâlâ 200 cihazın "sahibi" görünüyor ve denetimde o cihazların
   sahibi VAR sanılıyor.

   Ekip bunu çözer ama kişiyi silmez — ikisi birlikte bir ZİNCİRDİR:

     kişi sahip → ekip sahip → hiçbiri

   ── ÜÇ AYRI EKSİKLİK, ÜÇ AYRI AD ──────────────────────────────────────
     ATANMADI   Ne kişi ne ekip var. Kapatılacak bir boşluk.
     PASİF      Sahip atanmış ama kullanıcı artık aktif değil. Bu daha
                sinsidir: ekran "sahibi var" der ve kimse bakmaz.
     EKİPSİZ    Kişi var, ekip yok. Kişi ayrıldığında yine öksüz kalır.

   Üçünü tek bir "sahipsiz" sayacına toplamak, en sinsi olanı en görünmez
   yapardı. */

export const EKIP_TIPLERI = ['ot', 'bt', 'guvenlik', 'bakim', 'isletme', 'diger'] as const;
export type EkipTipi = (typeof EKIP_TIPLERI)[number];

export const EKIP_TIP_ETIKETI: Record<EkipTipi, string> = {
  ot: 'OT', bt: 'BT', guvenlik: 'Güvenlik', bakim: 'Bakım',
  isletme: 'İşletme', diger: 'Diğer',
};

export const UYELIK_ROLLERI = ['sahip', 'emanetci', 'uye'] as const;
export type UyelikRolu = (typeof UYELIK_ROLLERI)[number];

export type SahiplikGirdisi = {
  /** Kişi sahip; null = atanmadı. */
  sahip: { id: string; ad: string; aktif: boolean } | null;
  /** Emanetçi (custodian); null = atanmadı. */
  emanetci: { id: string; ad: string; aktif: boolean } | null;
  /** Sahip ekip; null = atanmadı. */
  ekip: { id: string; kod: string; aktif: boolean; aktifUye: number } | null;
};

export type SahiplikDurumu =
  | 'saglam'      // aktif kişi VE aktif üyesi olan aktif ekip
  | 'ekipsiz'     // aktif kişi var, ekip yok ya da pasif
  | 'pasif'       // atama var ama sahip kişi pasif
  | 'bos_ekip'    // ekip atanmış ama aktif üyesi yok
  | 'atanmadi';   // ne kişi ne ekip

export const SAHIPLIK_SOZU: Record<SahiplikDurumu, string> = {
  saglam: 'Sahiplik zinciri tam',
  ekipsiz: 'Ekip atanmadı — kişi ayrılırsa kayıt öksüz kalır',
  pasif: 'Sahip kullanıcı pasif — atama görünüyor ama sahip yok',
  bos_ekip: 'Sahip ekibin aktif üyesi yok',
  atanmadi: 'Sahip atanmadı',
};

/** Ekran sınıfı. `pasif` ve `atanmadi` KUSURDUR; `ekipsiz` bir borçtur. */
export const SAHIPLIK_SINIFI: Record<SahiplikDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  saglam: 'ok', ekipsiz: 'md', pasif: 'bd', bos_ekip: 'bd', atanmadi: 'bd',
};

/**
 * Sahiplik zincirinin durumu.
 *
 * Sıra bilinçli: PASİF sahip en ağırdır çünkü ekranda "sahibi var" gibi
 * görünür ve bu yüzden hiç incelenmez. Atanmamış sahiplik en azından
 * görünürdür.
 */
export function sahiplikDurumu(g: SahiplikGirdisi): SahiplikDurumu {
  const kisiVar = g.sahip !== null;
  const kisiAktif = g.sahip?.aktif === true;
  const ekipVar = g.ekip !== null && g.ekip.aktif;

  if (kisiVar && !kisiAktif) return 'pasif';
  if (ekipVar && g.ekip!.aktifUye === 0) return 'bos_ekip';
  if (!kisiVar && !ekipVar) return 'atanmadi';
  if (kisiAktif && ekipVar) return 'saglam';
  /* Yalnız ekip var (kişi yok) da `saglam` sayılır: ekip devredilebilir
     bir birimdir ve kişi sahipliğinden DAHA dayanıklıdır. */
  if (!kisiVar && ekipVar) return 'saglam';
  return 'ekipsiz';
}

/** Sahipliği devralacak KİŞİYİ çözer — kişi yoksa ekibin `sahip` rolü. */
export function etkinSahip(
  g: SahiplikGirdisi,
  ekipSahipleri: readonly { kullaniciId: string; ad: string; aktif: boolean }[],
): { id: string; ad: string; kaynak: 'kisi' | 'ekip' } | null {
  if (g.sahip && g.sahip.aktif) {
    return { id: g.sahip.id, ad: g.sahip.ad, kaynak: 'kisi' };
  }
  const aktifSahip = ekipSahipleri.find((u) => u.aktif);
  if (aktifSahip) {
    return { id: aktifSahip.kullaniciId, ad: aktifSahip.ad, kaynak: 'ekip' };
  }
  /* Pasif bir kişiyi "etkin sahip" olarak döndürmek, görev atamasını
     kimsenin okumadığı bir kutuya yollamak olurdu. */
  return null;
}

export type SahiplikOzeti = Record<SahiplikDurumu, number> & { toplam: number };

export function sahiplikOzeti(
  durumlar: readonly SahiplikDurumu[],
): SahiplikOzeti {
  const s: SahiplikOzeti = {
    saglam: 0, ekipsiz: 0, pasif: 0, bos_ekip: 0, atanmadi: 0, toplam: 0,
  };
  for (const d of durumlar) { s[d] += 1; s.toplam += 1; }
  return s;
}

/**
 * Toplu devir öncesi ÖN İZLEME.
 *
 * Devir geri alınamaz bir işlemdir ve bir tuşla yüzlerce kaydı
 * değiştirir; kaç kaydın gerçekten değişeceğini ÖNCE söylemek bu yüzden
 * bir kolaylık değil bir güvenlik önlemidir. Zaten hedefte olan kayıtlar
 * `degismeyen` sayılır ve yazılmaz — gereksiz denetim izi üretmezler.
 */
export function devirOnizlemesi<T extends { id: string; sahipId: string | null }>(
  kayitlar: readonly T[],
  hedefKullaniciId: string | null,
): { degisecek: T[]; degismeyen: T[] } {
  const degisecek: T[] = []; const degismeyen: T[] = [];
  for (const k of kayitlar) {
    if ((k.sahipId ?? null) === (hedefKullaniciId ?? null)) degismeyen.push(k);
    else degisecek.push(k);
  }
  return { degisecek, degismeyen };
}
