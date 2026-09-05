import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db';

/* ═══════════════════════════════════════════════════════════════════════
   ADLANDIRILMIŞ İŞ KİLİDİ

   Neden var: çakışma önleme "önce bak, sonra oluştur" biçimindeydi
   (`isKosucu.ts` ve `cekirdek.ts`). İki süreç aynı anda "koşan yok" görüp
   ikisi de koşuyu açabilir. Tek örnekli geliştirmede hiç görünmez; iki
   örnekli bir dağıtımda her motor iki kez koşar, bulgular çoğalır ve
   sebebi aylarca "motor bozuk" diye aranır.

   Buradaki kilit TEK atomik ifadeyle alınır. İki yol var ve ikisi de
   yarışa dayanıklıdır:

     1. `updateMany` — WHERE kirası dolmuş satırı hedefler. Veritabanı
        satırı kilitleyip yüklemi YENİDEN değerlendirir; ikinci yarışmacı
        0 satır günceller.
     2. `create` — birincil anahtar çakışması. Kaybeden istisna alır.

   Kaybetmek güvenlidir: kaybeden koşmaz. Asla "ikisi de koşar" olmaz.

   ── KİRA, KİLİT DEĞİL ──────────────────────────────────────────────────
   `gecerlilik` bir kira bitişidir. Süreç çökerse kilit kendiliğinden
   serbest kalır. Sonsuz kilit olsaydı ilk çökmede otomasyon kalıcı
   dururdu ve kimse fark etmezdi (motor "hiç koşmamış" görünür, sebebi
   görünmez). Uzun işler `kilidiTazele` ile kirayı uzatır.

   ── SAHİPLİK ───────────────────────────────────────────────────────────
   Bırakma ve tazeleme SAHİP kontrolüyle yapılır: kirası dolduğu için
   kilidi devralan başka bir süreç varken, geciken eski sahip onu
   bırakamamalı — bırakırsa yeni sahibin altından kilidi çeker.
   ═══════════════════════════════════════════════════════════════════════ */

/** Bu çalışma örneğinin kimliği. Süreç başına bir kez üretilir; kilit
    kayıtlarında "kim tutuyor" sorusunun yanıtıdır. Yeniden başlatmada
    değişir — bu bilinçlidir, eski sahibin kilidi kirası dolunca düşer. */
export const ORNEK_KIMLIGI = `${process.pid}-${randomUUID().slice(0, 8)}`;

/** Varsayılan kira. Motorların en uzunundan belirgin şekilde uzun, ama
    bir insanın "takıldı mı?" diye sormasından kısa. */
export const VARSAYILAN_KIRA_MS = 10 * 60_000;

export type KilitSonucu =
  | { alindi: true; sahip: string; gecerlilik: Date }
  | { alindi: false; sebep: 'baskasi_tutuyor'; sahip: string; gecerlilik: Date };

function benzersizlikIhlali(e: unknown): boolean {
  const kod = (e as { code?: unknown } | null | undefined)?.code;
  return kod === 'P2002' || String((e as Error | undefined)?.message ?? '').includes('UNIQUE');
}

/**
 * Kilidi almayı dener. Alamamak bir HATA DEĞİLDİR — çağıran o turu atlar.
 *
 * `simdi` enjekte edilebilir: testler kira bitişini beklemek için gerçek
 * saat ilerletmek zorunda kalmasın.
 */
export async function kilitAl(
  ad: string,
  kiraMs: number = VARSAYILAN_KIRA_MS,
  sahip: string = ORNEK_KIMLIGI,
  simdi: Date = new Date(),
): Promise<KilitSonucu> {
  const gecerlilik = new Date(simdi.getTime() + kiraMs);

  /* 1) Kirası dolmuş kilidi devral. Aynı sahip tekrar isterse de buradan
        geçer (yeniden giriş): kendi kilidini kendine karşı kaybetmez. */
  const devir = await db.isKilidi.updateMany({
    where: { ad, OR: [{ gecerlilik: { lte: simdi } }, { sahip }] },
    data: { sahip, alindi: simdi, gecerlilik },
  });
  if (devir.count === 1) return { alindi: true, sahip, gecerlilik };

  /* 2) Satır hiç yoksa oluştur. Yarışın kaybedeni burada çakışır. */
  try {
    await db.isKilidi.create({ data: { ad, sahip, alindi: simdi, gecerlilik } });
    return { alindi: true, sahip, gecerlilik };
  } catch (e) {
    if (!benzersizlikIhlali(e)) throw e;
  }

  /* 3) Canlı bir kilit var. Kimin tuttuğunu söyleyerek dön — "atlandı"
        satırına sebep yazılabilsin; sessiz atlama yasak. */
  const mevcut = await db.isKilidi.findUnique({ where: { ad } });
  if (!mevcut) {
    // Aradaki mikro-saniyede serbest kalmış: bir kez daha dene.
    return kilitAl(ad, kiraMs, sahip, new Date());
  }
  return {
    alindi: false, sebep: 'baskasi_tutuyor',
    sahip: mevcut.sahip, gecerlilik: mevcut.gecerlilik,
  };
}

/** Kirayı uzatır. Kilit artık bizde değilse `false` döner — çağıran işi
    KESMELİDİR: kilidi kaybetmiş bir iş yazmaya devam ederse, devralan
    süreçle aynı satırlara iki kez dokunur. */
export async function kilidiTazele(
  ad: string,
  sahip: string = ORNEK_KIMLIGI,
  kiraMs: number = VARSAYILAN_KIRA_MS,
  simdi: Date = new Date(),
): Promise<boolean> {
  const sonuc = await db.isKilidi.updateMany({
    where: { ad, sahip },
    data: { gecerlilik: new Date(simdi.getTime() + kiraMs) },
  });
  return sonuc.count === 1;
}

/** Kilidi bırakır. YALNIZ sahibi bırakabilir; kirası dolup devredilmiş
    bir kilidi eski sahip bırakamaz. */
export async function kilidiBirak(ad: string, sahip: string = ORNEK_KIMLIGI): Promise<boolean> {
  const sonuc = await db.isKilidi.deleteMany({ where: { ad, sahip } });
  return sonuc.count === 1;
}

/**
 * Kilitli bölge. İş ne yaparsa yapsın kilit bırakılır (hata dâhil).
 * Kilit alınamazsa iş HİÇ ÇALIŞMAZ ve `{ kosuldu: false }` döner —
 * çağıran bunu bir başarı sanmasın diye sonuç açıkça ayrılır.
 */
export async function kilitAltinda<T>(
  ad: string,
  is: () => Promise<T>,
  kiraMs: number = VARSAYILAN_KIRA_MS,
  sahip: string = ORNEK_KIMLIGI,
): Promise<{ kosuldu: true; sonuc: T } | { kosuldu: false; tutan: string }> {
  const kilit = await kilitAl(ad, kiraMs, sahip);
  if (!kilit.alindi) return { kosuldu: false, tutan: kilit.sahip };
  try {
    return { kosuldu: true, sonuc: await is() };
  } finally {
    await kilidiBirak(ad, sahip);
  }
}

/** Kirası dolmuş kilit satırlarını siler. İşleyişi etkilemez (dolmuş
    kilit zaten devralınabilir), tabloyu şişirmemek içindir. */
export async function dolmusKilitleriTemizle(simdi: Date = new Date()): Promise<number> {
  const sonuc = await db.isKilidi.deleteMany({ where: { gecerlilik: { lte: simdi } } });
  return sonuc.count;
}
