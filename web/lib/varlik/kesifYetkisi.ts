import { kimlikKatla } from '@/lib/alan/metin';
import { macKanonik } from '@/lib/varlik/otGozlem';

/* ═══ OT-16 · Yetkisiz varlık tespiti ═════════════════════════════════

   Keşif kaydının `durum` alanı İŞ AKIŞININ nerede olduğunu söyler
   (keşfedildi → normalize → eşleşti → onaylandı). Bu dosya BAŞKA bir
   soruyu cevaplar: bu cihaz ağda OLMALI MIYDI?

   İkisi ayrıdır ve karıştırılırsa en tehlikeli hâl doğar: "eşleşti"
   durumundaki bir kayıt, envanterde karşılığı olduğu için yetkili
   SANILIR. Oysa envanterde olması onu yetkili yapmaz — biri onu oraya
   yazmıştır, o kadar.

   ── DÖRT DURUM, DÖRDÜ DE AYRI ─────────────────────────────────────────
     karar_verilmedi        Kimse bakmadı. VARSAYILAN budur ve bir borçtur.
     bilinen                İncelendi, envantere ait, yetkili.
     yetkisiz               İncelendi, olmaması gerekiyor. AÇIK bir kusur.
     gerekceyle_yoksayildi  İncelendi, yetkisiz ama gerekçesiyle kabul
                            edildi (test cihazı, geçici kurulum).

   Gerekçesiz yok sayma YASAK: gerekçesiz bir "yoksay", kapatılmış bir
   kusurdan ayırt edilemez ve denetimde savunulamaz.

   ── TERS KARŞILAŞTIRMA ────────────────────────────────────────────────
   Keşif "ağda ne var" der; envanter "ne olmalı" der. Yetkisiz cihaz
   birinci kümenin ikinciden farkıdır. Ama TERSİ de bir bulgudur:
   envanterde olup ağda HİÇ görülmemiş cihaz ya kayıp ya hayalet
   kayıttır. İkisini birlikte hesaplamak, envanterin iki yönlü
   doğrulanmasıdır. */

export const YETKI_DURUMLARI = [
  'karar_verilmedi', 'bilinen', 'yetkisiz', 'gerekceyle_yoksayildi',
] as const;
export type YetkiDurumu = (typeof YETKI_DURUMLARI)[number];

export const YETKI_ETIKETI: Record<YetkiDurumu, string> = {
  karar_verilmedi: 'karar verilmedi',
  bilinen: 'bilinen cihaz',
  yetkisiz: 'YETKİSİZ',
  gerekceyle_yoksayildi: 'gerekçeyle yok sayıldı',
};

export const YETKI_SINIFI: Record<YetkiDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  karar_verilmedi: 'unk',
  bilinen: 'ok',
  yetkisiz: 'bd',
  /* Gerekçeyle yok sayılan cihaz bir kusur DEĞİLDİR ama sağlıklı da
     değildir: kabul edilmiş bir istisnadır ve süresi dolabilir. */
  gerekceyle_yoksayildi: 'md',
};

/** Karar bir gerekçe ister mi? */
export function gerekceIster(durum: YetkiDurumu): boolean {
  return durum === 'yetkisiz' || durum === 'gerekceyle_yoksayildi';
}

export const GEREKCE_ASGARI = 10;

export function kararGecerliMi(
  durum: YetkiDurumu, gerekce: string | null | undefined,
): { ok: true } | { ok: false; hata: string } {
  if (!gerekceIster(durum)) return { ok: true };
  if (!gerekce || gerekce.trim().length < GEREKCE_ASGARI) {
    return {
      ok: false,
      hata: `"${YETKI_ETIKETI[durum]}" kararı en az ${GEREKCE_ASGARI} karakterlik gerekçe ister.`,
    };
  }
  return { ok: true };
}

/* ── Yinelenen aday ─────────────────────────────────────────────────── */

export type KesifKimligi = {
  id: string;
  seriNo: string | null;
  macAdresi: string | null;
  hostname: string | null;
  ipAdresi: string | null;
};

/**
 * İki keşif kaydı AYNI cihaz olabilir mi?
 *
 * Kimlik alanları `kimlikKatla` ile karşılaştırılır: `'AA:BB:CC'` ile
 * `'aa-bb-cc'` aynı MAC'tir ve Türkçe küçültme burada kusur üretirdi.
 *
 * IP TEK BAŞINA yeterli DEĞİLDİR: DHCP'de aynı adres gün içinde iki
 * cihaza gidebilir. Bu yüzden IP yalnız başka bir alanla birlikte
 * sayılır ve tek başına eşleşme `null` (karar verilemedi) döndürür.
 */
export function yinelenenAdayMi(
  a: KesifKimligi, b: KesifKimligi,
): { aynı: boolean | null; anahtar: string | null } {
  if (a.id === b.id) return { aynı: false, anahtar: null };

  const es = (x: string | null, y: string | null) => {
    const kx = kimlikKatla(x); const ky = kimlikKatla(y);
    return kx !== null && ky !== null && kx === ky;
  };
  /* MAC `kimlikKatla` ile KARŞILAŞTIRILAMAZ: o fonksiyon iki nokta üst
     üsteyi ayraç saymaz ve `AA:BB:CC…` ile `aa-bb-cc…` eşleşmezdi. MAC'in
     kendi kanonik biçimi vardır (`macKanonik`: ayraçsız, büyük harf, 12
     hane) ve yalnız o güvenilir — geçersiz MAC zaten `null` döner. */
  const macEs = (x: string | null, y: string | null) => {
    const mx = macKanonik(x); const my = macKanonik(y);
    return mx !== null && my !== null && mx === my;
  };

  if (es(a.seriNo, b.seriNo)) return { aynı: true, anahtar: 'seriNo' };
  if (macEs(a.macAdresi, b.macAdresi)) return { aynı: true, anahtar: 'macAdresi' };
  if (es(a.hostname, b.hostname)) return { aynı: true, anahtar: 'hostname' };
  /* IP tek başına KARAR VERDİRMEZ: DHCP kirası aynı adresi gün içinde
     başka cihaza verir. Eşleşme var ama zayıf — `null` döner ki çağıran
     "aynı" da "farklı" da diyemesin. */
  if (es(a.ipAdresi, b.ipAdresi)) return { aynı: null, anahtar: 'ipAdresi' };
  return { aynı: false, anahtar: null };
}

/* ── Ters karşılaştırma: envanterde var, ağda yok ──────────────────── */

export type TersKarsilastirmaGirdisi = {
  /** Envanterdeki silinmemiş varlıklar. */
  varliklar: readonly { id: string; etiket: string; sonGorulmeMs: number | null }[];
  /** "Görülmedi" sayılmadan önce beklenecek gün. */
  esikGun: number;
  simdi: number;
};

export type HayaletAday = {
  varlikId: string;
  etiket: string;
  /** null = hiç keşif kaydı görülmedi. */
  gecenGun: number | null;
};

/**
 * Envanterde olup ağda görülmeyen varlıklar.
 *
 * İki ayrı küme döner ve karıştırılmaz:
 *   `hicGorulmeyen` — hiçbir keşif kaydı yok. Bu bir ÖLÇÜM BORCUDUR:
 *                     belki cihaz orada ama hiçbir kaynak onu görmüyor.
 *   `kayboldu`      — daha önce görülmüş, eşikten uzun süredir yok. Bu
 *                     bir BULGUDUR: cihaz sökülmüş ve envanterden
 *                     düşülmemiş olabilir.
 *
 * İkisini "kayıp cihaz" diye tek listede toplamak, keşif kapsamındaki bir
 * boşluğu envanter hatası gibi gösterirdi.
 */
export function tersKarsilastir(g: TersKarsilastirmaGirdisi): {
  hicGorulmeyen: HayaletAday[];
  kayboldu: HayaletAday[];
} {
  const hicGorulmeyen: HayaletAday[] = [];
  const kayboldu: HayaletAday[] = [];
  const esikMs = g.esikGun * 86_400_000;

  for (const v of g.varliklar) {
    if (v.sonGorulmeMs === null) {
      hicGorulmeyen.push({ varlikId: v.id, etiket: v.etiket, gecenGun: null });
      continue;
    }
    const gecen = g.simdi - v.sonGorulmeMs;
    if (gecen > esikMs) {
      kayboldu.push({
        varlikId: v.id, etiket: v.etiket,
        gecenGun: Math.floor(gecen / 86_400_000),
      });
    }
  }
  return { hicGorulmeyen, kayboldu };
}

export type YetkiOzeti = Record<YetkiDurumu, number> & { toplam: number };

export function yetkiOzeti(durumlar: readonly string[]): YetkiOzeti {
  const s: YetkiOzeti = {
    karar_verilmedi: 0, bilinen: 0, yetkisiz: 0, gerekceyle_yoksayildi: 0, toplam: 0,
  };
  for (const d of durumlar) {
    const k = (YETKI_DURUMLARI as readonly string[]).includes(d)
      ? d as YetkiDurumu : 'karar_verilmedi';
    s[k] += 1; s.toplam += 1;
  }
  return s;
}
