/* ═══ OT-33 · Hesap tipleri ve ayrıcalık riski ════════════════════════

   `KimlikHesabi.tip` bugün hesabın KİME ait olduğunu söylüyor
   (kişi/servis/paylaşımlı/acil durum). OT-33 ikinci bir eksen istiyor:
   hesap NEREDE yaşıyor?

     yerel      Cihazın kendi hesabı. Dizinde görünmez, merkezî olarak
                kapatılamaz — ayrılan bir çalışanın en uzun yaşayan
                erişimi budur.
     dizin      AD / Entra hesabı. Merkezî kapatma çalışır.
     uygulama   SCADA / historian / DCS uygulamasının kendi hesabı.
     tedarikci  Dış firmaya verilen erişim. Süreli olması beklenir.

   İki eksen birbirinin yerine GEÇMEZ: bir dizin hesabı da servis hesabı
   olabilir ve ikisini tek alana sıkıştırmak, "kaç yerel servis hesabı
   var" sorusunu cevapsız bırakırdı.

   ── MFA'DA ÜÇ DEĞER ───────────────────────────────────────────────────
   `mfaVar === null` "MFA yok" DEĞİL "ölçülmedi"dir ve bu ayrım ayrıcalıklı
   hesap raporunun tamamını değiştirir: ölçülmemiş hesapları MFA'sız
   saymak, kapatılamayacak bir açık listesi üretir ve kimse ona bakmaz. */

export const HESAP_KAYNAK_TIPLERI = [
  'yerel', 'dizin', 'uygulama', 'tedarikci', 'bilinmiyor',
] as const;
export type HesapKaynakTipi = (typeof HESAP_KAYNAK_TIPLERI)[number];

export const KAYNAK_TIP_ETIKETI: Record<HesapKaynakTipi, string> = {
  yerel: 'yerel hesap',
  dizin: 'dizin hesabı',
  uygulama: 'uygulama hesabı',
  tedarikci: 'tedarikçi hesabı',
  bilinmiyor: 'kaynağı bilinmiyor',
};

/**
 * Merkezî olarak kapatılabilir mi?
 *
 * `null` = kaynağı bilinmiyor, karar verilemez. `false` dönmek, yerel bir
 * hesabın kapatılabilir sanılmasından daha az zararlı ama yine yanlış
 * olurdu: bilinmeyeni bilinen saymak.
 */
export function merkezdenKapatilabilir(kaynakTipi: string): boolean | null {
  switch (kaynakTipi) {
    case 'dizin': return true;
    case 'yerel': case 'uygulama': return false;
    /* Tedarikçi hesabı dizinde de olabilir cihazda da; kaynağı tek
       başına kapatılabilirliği söylemez. */
    case 'tedarikci': return null;
    default: return null;
  }
}

export type HesapGirdisi = {
  tip: string;
  kaynakTipi: string;
  /** null = ölçülmedi (ayrıcalıksız DEĞİL) */
  ayricalikli: boolean | null;
  /** null = ölçülmedi (MFA yok DEĞİL) */
  mfaVar: boolean | null;
  /** ISO tarih; null = süresiz ya da belirlenmemiş */
  sonaErme: string | null;
  sonKullanim: string | null;
  parolaRotasyon: string | null;
  durum: string;
};

export const HESAP_BULGULARI = [
  'mfa_yok', 'suresi_gecmis', 'suresiz_tedarikci', 'yerel_ayricalikli',
  'atil', 'rotasyon_yok',
] as const;
export type HesapBulgusu = (typeof HESAP_BULGULARI)[number];

export const BULGU_SOZU: Record<HesapBulgusu, string> = {
  mfa_yok: 'Ayrıcalıklı hesapta MFA yok',
  suresi_gecmis: 'Hesabın süresi geçmiş ama hâlâ aktif',
  suresiz_tedarikci: 'Tedarikçi hesabına bitiş tarihi konmamış',
  yerel_ayricalikli: 'Yerel ayrıcalıklı hesap — merkezden kapatılamaz',
  atil: 'Uzun süredir kullanılmamış aktif hesap',
  rotasyon_yok: 'Parola rotasyonu hiç kaydedilmemiş',
};

export type HesapDegerlendirmesi = {
  bulgular: HesapBulgusu[];
  /**
   * Ölçülmemiş alanlar — bulgu DEĞİL, borç. İkisini karıştırmak
   * kapatılamayan bir açık listesi üretirdi.
   */
  borclar: ('ayricalik' | 'mfa' | 'son_kullanim' | 'kaynak_tipi')[];
};

/** Atıl sayılma eşiği (gün). Tek yerde durur. */
export const ATIL_ESIGI_GUN = 90;

export function hesabiDegerlendir(
  h: HesapGirdisi, simdi: number, atilEsigiGun: number = ATIL_ESIGI_GUN,
): HesapDegerlendirmesi {
  const bulgular: HesapBulgusu[] = [];
  const borclar: HesapDegerlendirmesi['borclar'] = [];

  if (h.ayricalikli === null) borclar.push('ayricalik');
  if (h.mfaVar === null) borclar.push('mfa');
  if (h.kaynakTipi === 'bilinmiyor') borclar.push('kaynak_tipi');

  /* MFA bulgusu YALNIZ ayrıcalıklı olduğu BİLİNEN hesapta açılır:
     ayrıcalığı ölçülmemiş bir hesap için "MFA yok" demek, iki
     bilinmeyeni bir kusura çevirmek olurdu. */
  if (h.ayricalikli === true && h.mfaVar === false) bulgular.push('mfa_yok');
  if (h.ayricalikli === true && h.kaynakTipi === 'yerel') bulgular.push('yerel_ayricalikli');

  if (h.durum === 'aktif' && h.sonaErme) {
    const t = new Date(h.sonaErme).getTime();
    if (!Number.isNaN(t) && t < simdi) bulgular.push('suresi_gecmis');
  }
  if (h.durum === 'aktif' && h.kaynakTipi === 'tedarikci' && !h.sonaErme) {
    bulgular.push('suresiz_tedarikci');
  }

  if (h.durum === 'aktif') {
    if (!h.sonKullanim) borclar.push('son_kullanim');
    else {
      const t = new Date(h.sonKullanim).getTime();
      if (!Number.isNaN(t) && (simdi - t) / 86_400_000 > atilEsigiGun) bulgular.push('atil');
    }
  }

  /* Rotasyon kaydı olmayan hesap: yalnız ayrıcalıklı olduğu BİLİNENLERDE
     bulgu, ötekilerde sessiz. Her hesap için açmak, listeyi okunmaz
     yapardı ve kimse bakmazdı. */
  if (h.ayricalikli === true && !h.parolaRotasyon) bulgular.push('rotasyon_yok');

  return { bulgular, borclar };
}

export type HesapOzeti = {
  toplam: number;
  /** Ayrıcalıklı olduğu BİLİNEN hesap sayısı. */
  ayricalikli: number;
  /** Ayrıcalık durumu ölçülmemiş hesap sayısı. */
  ayricalikOlculmemis: number;
  /** Bulgusu olan hesap sayısı. */
  bulgulu: number;
  /** Yalnız ölçüm borcu olan (bulgusuz) hesap sayısı. */
  borclu: number;
  /** Kaynak tipine göre dağılım. */
  kaynakDagilimi: Record<HesapKaynakTipi, number>;
};

export function hesapOzeti(
  satirlar: readonly { girdi: HesapGirdisi; sonuc: HesapDegerlendirmesi }[],
): HesapOzeti {
  const dagilim = Object.fromEntries(
    HESAP_KAYNAK_TIPLERI.map((t) => [t, 0]),
  ) as Record<HesapKaynakTipi, number>;

  let ayricalikli = 0; let olculmemis = 0; let bulgulu = 0; let borclu = 0;
  for (const s of satirlar) {
    const kt = (HESAP_KAYNAK_TIPLERI as readonly string[]).includes(s.girdi.kaynakTipi)
      ? s.girdi.kaynakTipi as HesapKaynakTipi : 'bilinmiyor';
    dagilim[kt] += 1;
    if (s.girdi.ayricalikli === true) ayricalikli += 1;
    if (s.girdi.ayricalikli === null) olculmemis += 1;
    if (s.sonuc.bulgular.length > 0) bulgulu += 1;
    else if (s.sonuc.borclar.length > 0) borclu += 1;
  }
  return {
    toplam: satirlar.length, ayricalikli, ayricalikOlculmemis: olculmemis,
    bulgulu, borclu, kaynakDagilimi: dagilim,
  };
}
