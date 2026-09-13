/* ═══════════════════════════════════════════════════════════════════════
   UY-07 · Kontrol sahipliği ve dört göz

   Bir kontrolün "sorumlusu" tek bir kullanıcı kimliğiydi ve bu üç şeyi
   birden yapamıyordu:

     1. Kişi ayrıldığında kontrol öksüz kalıyordu (OT-09'un varlık tarafında
        çözdüğü sorunun aynısı, bu kez kontrol tarafında).
     2. Hazırlayan ile doğrulayan AYNI kişi olabiliyordu; dört göz ilkesi
        kâğıt üstünde kalıyordu.
     3. ÖLÇÜLMÜŞ KUSUR: sorumlu değişikliği denetim izine DÜŞMÜYORDU.
        `maddeDurumGuncelle` iz satırını yalnız `durum` değiştiğinde
        yazıyordu; sorumlu sessizce el değiştirebiliyordu ve denetimde
        "bu kontrolün sorumlusu ne zaman değişti" sorusunun cevabı yoktu.

   Bu dosya saf karar kodudur: veritabanı ve React bilmez.

   ── DÖRT GÖZ NEDİR, NE DEĞİLDİR ───────────────────────────────────────
   Doğrulama bir ONAY DEĞİLDİR: onay akışı ayrı bir mekanizmadır
   (`OnayTalebi`). Buradaki doğrulama, değerlendirmeyi yapan kişiden
   BAŞKA birinin kaydı okuyup "evet, dayanağı yeterli" demesidir. Aynı
   kişinin kendi değerlendirmesini doğrulaması, hiç doğrulanmamış olmakla
   aynı kapıya çıkar — ama ekranda "doğrulandı" yazar. Bu yüzden sunucu
   reddeder ve ekran düğmeyi hiç göstermez. */

export const SAHIPLIK_DURUMLARI = [
  'saglam', 'ekipsiz', 'pasif', 'bos_ekip', 'atanmadi',
] as const;
export type KontrolSahipligi = (typeof SAHIPLIK_DURUMLARI)[number];

export const SAHIPLIK_SOZU: Record<KontrolSahipligi, string> = {
  saglam: 'Sorumluluk zinciri tam',
  ekipsiz: 'Ekip atanmadı — sorumlu ayrılırsa kontrol öksüz kalır',
  pasif: 'Sorumlu kullanıcı pasif — atama görünüyor ama sorumlu yok',
  bos_ekip: 'Sorumlu ekibin aktif üyesi yok',
  atanmadi: 'Sorumlu atanmadı',
};

/** `pasif` ve `atanmadi` KUSURDUR; `ekipsiz` bir borçtur. */
export const SAHIPLIK_SINIFI: Record<KontrolSahipligi, 'ok' | 'md' | 'bd' | 'unk'> = {
  saglam: 'ok', ekipsiz: 'md', pasif: 'bd', bos_ekip: 'bd', atanmadi: 'bd',
};

export type SahiplikGirdisi = {
  sorumlu: { id: string; ad: string; aktif: boolean } | null;
  ekip: { id: string; kod: string; aktif: boolean; aktifUye: number } | null;
};

/**
 * Sorumluluk zincirinin durumu.
 *
 * Sıra OT-09 ile BİREBİR aynıdır ve bu bilinçlidir: pasif sahip en
 * ağırdır, çünkü ekranda "sorumlusu var" gibi görünür ve bu yüzden hiç
 * incelenmez. İki modülün aynı soruya farklı sıra vermesi, aynı kurumda
 * iki farklı "sahipsizlik" tanımı üretirdi.
 */
export function kontrolSahipligi(g: SahiplikGirdisi): KontrolSahipligi {
  const kisiVar = g.sorumlu !== null;
  const kisiAktif = g.sorumlu?.aktif === true;
  const ekipVar = g.ekip !== null && g.ekip.aktif;

  if (kisiVar && !kisiAktif) return 'pasif';
  if (ekipVar && g.ekip!.aktifUye === 0) return 'bos_ekip';
  if (!kisiVar && !ekipVar) return 'atanmadi';
  if (kisiAktif && ekipVar) return 'saglam';
  if (!kisiVar && ekipVar) return 'saglam';
  return 'ekipsiz';
}

/* ── Dört göz ────────────────────────────────────────────────────────── */

export type DogrulamaKarari =
  | { ok: true }
  | { ok: false; sebep: string };

/**
 * Bu kişi bu değerlendirmeyi doğrulayabilir mi?
 *
 * `degerlendiren` son değerlendirmeyi yapan kişidir (`sorumlu` DEĞİL:
 * sorumlu kontrolün sahibidir, değerlendirmeyi başkası da yapmış
 * olabilir). Karşılaştırma o kişiyledir.
 */
export function dogrulayabilirMi(o: {
  dogrulayanId: string;
  degerlendirenId: string | null;
  /** Değerlendirme hiç yapılmadıysa doğrulanacak bir şey de yoktur. */
  degerlendirildi: boolean;
}): DogrulamaKarari {
  if (!o.degerlendirildi) {
    return {
      ok: false,
      sebep: 'Bu kontrol hiç değerlendirilmedi; doğrulanacak bir karar yok.',
    };
  }
  if (o.degerlendirenId === null) {
    /* Kim değerlendirdiği bilinmiyorsa dört göz KANITLANAMAZ. "Muhtemelen
       başkasıdır" diye geçmek, doğrulamayı anlamsız kılardı. */
    return {
      ok: false,
      sebep: 'Değerlendirmeyi kimin yaptığı kayıtlı değil; dört göz kanıtlanamaz.',
    };
  }
  if (o.dogrulayanId === o.degerlendirenId) {
    return {
      ok: false,
      sebep: 'Kendi değerlendirmenizi doğrulayamazsınız — dört göz ilkesi. '
        + 'Doğrulama, kararı verenden BAŞKA birinin dayanağı okuyup onaylamasıdır.',
    };
  }
  return { ok: true };
}

/* ── Doğrulama tazeliği ──────────────────────────────────────────────── */

/** Doğrulama bu süreden eskiyse "doğrulandı" cümlesi taze değildir. */
export const DOGRULAMA_TAZELIK_GUN = 365;

export type DogrulamaDurumu = 'dogrulandi' | 'bayat' | 'degerlendirme_sonrasi_degisti' | 'yok';

export const DOGRULAMA_SOZU: Record<DogrulamaDurumu, string> = {
  dogrulandi: 'doğrulandı',
  bayat: 'doğrulama bayat',
  degerlendirme_sonrasi_degisti: 'doğrulamadan SONRA değerlendirme değişti',
  yok: 'doğrulanmadı',
};

export const DOGRULAMA_SINIFI: Record<DogrulamaDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  dogrulandi: 'ok', bayat: 'md', degerlendirme_sonrasi_degisti: 'bd', yok: 'unk',
};

/**
 * Doğrulamanın bugünkü değeri.
 *
 * En ağır hâl `degerlendirme_sonrasi_degisti`dir ve bunun sebebi
 * ölçülebilir: doğrulamadan sonra değerlendirme değiştiyse, ekranda
 * duran "doğrulandı" damgası ARTIK BAŞKA BİR KARARI işaret eder. Bu,
 * hiç doğrulanmamış olmaktan daha tehlikelidir — çünkü yanlış bir güven
 * verir.
 */
export function dogrulamaDurumu(o: {
  dogrulamaZamani: number | null;
  sonDegerlendirme: number | null;
  simdi: number;
  esikGun?: number;
}): DogrulamaDurumu {
  if (o.dogrulamaZamani === null) return 'yok';
  if (o.sonDegerlendirme !== null && o.sonDegerlendirme > o.dogrulamaZamani) {
    return 'degerlendirme_sonrasi_degisti';
  }
  const esik = (o.esikGun ?? DOGRULAMA_TAZELIK_GUN) * 86_400_000;
  return o.simdi - o.dogrulamaZamani > esik ? 'bayat' : 'dogrulandi';
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type SahiplikOzeti = Record<KontrolSahipligi, number> & { toplam: number };

export function sahiplikOzeti(
  durumlar: readonly KontrolSahipligi[],
): SahiplikOzeti {
  const s: SahiplikOzeti = {
    saglam: 0, ekipsiz: 0, pasif: 0, bos_ekip: 0, atanmadi: 0, toplam: 0,
  };
  for (const d of durumlar) { s[d] += 1; s.toplam += 1; }
  return s;
}
