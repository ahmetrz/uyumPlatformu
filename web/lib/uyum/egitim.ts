/* ═══════════════════════════════════════════════════════════════════════
   UY-66 · Eğitim ve farkındalık kütüğü — SAF KARAR

   "Eğitim kaydı" ürüne zaten bir KANIT TİPİ olarak girmişti: bir belge
   yükleyip kontrole bağlayabiliyordunuz. Eksik olan KÜTÜKTÜ — kimin
   hangi eğitimi ne zaman aldığı ve o eğitimin ne zaman geçerliliğini
   yitirdiği. Tek bir katılım listesi PDF'i, "bu kontrol karşılanıyor mu"
   sorusunu yanıtlamaz.

   ── SÜRESİZ EĞİTİM BİLİNÇLİ BİR KARARDIR ──────────────────────────────
   `gecerlilikAy = null` "ölçülmedi" değil "yenilenmesi gerekmiyor"
   demektir. Bir kere alınan ve bir daha tazelenmeyen eğitimler vardır.

   ── KAPSAMDA OLUP KAYDI OLMAYAN KİŞİ "EKSİK"TİR ───────────────────────
   Burada bilinmeyen ≠ sıfır kuralı TERSİNE işler: zorunlu bir eğitimde
   kaydı olmayan kişi, eğitimi almamış sayılır. Çünkü ölçüm zaten
   "kaydı var mı" ölçümüdür; kayıt yokluğu ölçümün sonucudur, ölçümün
   yapılmamış olması değil.

   Bu dosya veritabanı ve React bilmez. */

/** Geçerliliğin bitmesine bu kadar kalınca "yenilenmeli" denir. */
export const YENILEME_UYARI_GUN = 30;

export type EgitimDurumu =
  | 'gecerli' | 'yenilenmeli' | 'suresi_doldu' | 'kayit_yok' | 'suresiz';

export const EGITIM_SOZU: Record<EgitimDurumu, string> = {
  gecerli: 'geçerli',
  yenilenmeli: `geçerliliği ${YENILEME_UYARI_GUN} gün içinde bitiyor`,
  suresi_doldu: 'geçerliliği DOLDU',
  kayit_yok: 'kaydı YOK',
  suresiz: 'geçerli — süresiz eğitim',
};

export const EGITIM_SINIFI: Record<EgitimDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  gecerli: 'ok',
  yenilenmeli: 'md',
  suresi_doldu: 'bd',
  kayit_yok: 'bd',
  suresiz: 'ok',
};

/**
 * Bir kişinin bir eğitimdeki durumu.
 *
 * En son tamamlama kaydı esas alınır: aynı eğitimi ikinci kez alan
 * kişinin durumu tazelenmelidir.
 */
export function egitimDurumu(o: {
  gecerlilikBitis: number | null;
  kayitVar: boolean;
  simdi: number;
  uyariGun?: number;
}): EgitimDurumu {
  if (!o.kayitVar) return 'kayit_yok';
  if (o.gecerlilikBitis === null) return 'suresiz';
  if (o.gecerlilikBitis <= o.simdi) return 'suresi_doldu';
  const esik = (o.uyariGun ?? YENILEME_UYARI_GUN) * 86_400_000;
  return o.gecerlilikBitis - o.simdi <= esik ? 'yenilenmeli' : 'gecerli';
}

/** Tamamlama + geçerlilik süresi. Süresiz eğitimde null. */
export function gecerlilikBitisi(tamamlanma: number, gecerlilikAy: number | null): number | null {
  if (gecerlilikAy === null) return null;
  const t = new Date(tamamlanma);
  t.setMonth(t.getMonth() + gecerlilikAy);
  return t.getTime();
}

/* ── Kapı ────────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

export function egitimKapisi(o: { gecerlilikAy: number | null }): Karar {
  if (o.gecerlilikAy === null) return { ok: true };
  if (!Number.isInteger(o.gecerlilikAy) || o.gecerlilikAy <= 0) {
    return {
      ok: false,
      sebep: 'Geçerlilik süresi girildiyse en az 1 ay olmalı. Yenilenmesi '
        + 'gerekmiyorsa BOŞ bırakın — bu bilinçli bir karardır.',
    };
  }
  if (o.gecerlilikAy > 120) {
    return { ok: false, sebep: 'Geçerlilik süresi 120 ayı (10 yıl) aşamaz.' };
  }
  return { ok: true };
}

export function kayitKapisi(o: {
  tamamlanma: number; simdi: number;
}): Karar {
  if (o.tamamlanma > o.simdi) {
    return { ok: false, sebep: 'Eğitim tamamlanma tarihi gelecekte olamaz.' };
  }
  return { ok: true };
}

/* ── Kapsama ─────────────────────────────────────────────────────────── */

export type EgitimKapsamasi = {
  /** Kapsamdaki kişi sayısı — PAYDA. */
  kapsam: number;
  gecerli: number;
  yenilenmeli: number;
  suresiDolan: number;
  kaydiOlmayan: number;
  /** Kapsama oranı (%). Kapsam sıfırsa null — "%100" DEĞİL. */
  oran: number | null;
};

/**
 * Bir eğitimin kapsamı.
 *
 * Kapsam sıfırken oran `null` döner. Sıfır kişilik bir eğitimi "%100
 * tamamlandı" göstermek, ekranı yalan söyler hâle getirirdi.
 */
export function egitimKapsamasi(o: {
  durumlar: readonly EgitimDurumu[];
}): EgitimKapsamasi {
  const say = (d: EgitimDurumu) => o.durumlar.filter((x) => x === d).length;
  const gecerli = say('gecerli') + say('suresiz');
  const kapsam = o.durumlar.length;
  return {
    kapsam,
    gecerli,
    yenilenmeli: say('yenilenmeli'),
    suresiDolan: say('suresi_doldu'),
    kaydiOlmayan: say('kayit_yok'),
    oran: kapsam === 0
      ? null
      : Math.round(((gecerli + say('yenilenmeli')) / kapsam) * 100),
  };
}

export function egitimCumlesi(o: EgitimKapsamasi & { ad?: string }): string {
  const ad = o.ad ? `"${o.ad}" ` : '';
  if (o.kapsam === 0) {
    return `${ad}eğitiminin kapsamında kimse yok; oran ÖLÇÜLMEDİ.`;
  }
  if (o.kaydiOlmayan > 0) {
    return `${o.kaydiOlmayan}/${o.kapsam} kişinin ${ad}eğitim kaydı YOK.`;
  }
  if (o.suresiDolan > 0) {
    return `${o.suresiDolan} kişinin ${ad}eğitiminin geçerliliği doldu.`;
  }
  if (o.yenilenmeli > 0) {
    return `${o.yenilenmeli} kişinin ${ad}eğitimi ${YENILEME_UYARI_GUN} gün `
      + 'içinde yenilenmeli.';
  }
  return `Kapsamdaki ${o.kapsam} kişinin ${ad}eğitimi geçerli.`;
}
