/* ═══ P6 · TOTP · SAF KATMAN (RFC 6238 / RFC 4226) ═════════════════════

   Bu dosya HİÇBİR ŞEY OKUMAZ ve HİÇBİR ŞEY YAZMAZ: saat dışarıdan gelir,
   sır dışarıdan gelir. Sebebi ölçülebilirlik — bir MFA doğrulayıcısı
   "çalışıyor gibi" test edilemez; RFC'nin kendi vektörleriyle sınanır ve
   o vektörler sabit bir zamanda tanımlıdır.

   ── NEDEN KENDİ UYGULAMAMIZ ───────────────────────────────────────────
   TOTP otuz satırlık bir HMAC hesabıdır ve bağımlılık eklemek burada
   yüzey büyütür. Kriptografinin kendisi `node:crypto`dandır; bu dosya
   yalnız RFC'nin sayaç/pencere aritmetiğini yazar.

   ── PENCERE BİR ADIMDIR, ÜÇ DEĞİL ─────────────────────────────────────
   Kabul penceresi ±1 adımdır (toplam 90 sn). Geniş pencere, çalınmış bir
   kodun ömrünü uzatır; dar pencere saat kaymasında kullanıcıyı dışarıda
   bırakır. Bir adım ikisinin arasındaki kabul edilmiş sınırdır ve
   BURADA yazılıdır — çağıranın keyfine bırakılmaz.

   ── TEKRAR KULLANIM ENGELİ BURADA DEĞİL ───────────────────────────────
   Aynı kodun iki kez kabul edilmesini engellemek DURUM ister (en son
   kullanılan adım) ve bu saf katmanın işi değildir; `mfa.ts` son kabul
   edilen adımı kaydeder. Burası yalnız "bu kod bu adımda geçerli mi"
   sorusunu yanıtlar ve HANGİ adımda geçtiğini döndürür — çağıran onu
   saklayabilsin diye. */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 6238 varsayılanı; değiştirilmez, çünkü doğrulayıcı uygulamaların
    (Google Authenticator, Aegis…) tamamı bunu varsayar. */
export const ADIM_SANIYE = 30;
export const BASAMAK = 6;
/** Kabul penceresi: ±1 adım. */
export const PENCERE_ADIM = 1;

/* ── base32 (RFC 4648, dolgusuz) ───────────────────────────────────────
   TOTP sırrı kullanıcıya base32 gösterilir: QR olmadan elle girilebilsin
   ve `otpauth://` URI'si standart kalsın. */

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Kodla(bayt: Buffer): string {
  let bit = 0;
  let deger = 0;
  let cikti = '';
  for (const b of bayt) {
    deger = (deger << 8) | b;
    bit += 8;
    while (bit >= 5) {
      cikti += ABC[(deger >>> (bit - 5)) & 31];
      bit -= 5;
    }
  }
  if (bit > 0) cikti += ABC[(deger << (5 - bit)) & 31];
  return cikti;
}

/** Bozuk karakterde `null` — sessizce atlamak, yanlış sırrı doğru
    sanmaya yol açardı. Boşluk ve küçük harf hoş görülür (elle giriş). */
export function base32Coz(metin: string): Buffer | null {
  const temiz = metin.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (temiz.length === 0) return null;
  let bit = 0;
  let deger = 0;
  const bayt: number[] = [];
  for (const ch of temiz) {
    const i = ABC.indexOf(ch);
    if (i < 0) return null;
    deger = (deger << 5) | i;
    bit += 5;
    if (bit >= 8) {
      bayt.push((deger >>> (bit - 8)) & 255);
      bit -= 8;
    }
  }
  return Buffer.from(bayt);
}

/** 160 bit — RFC 4226'nın önerdiği asgari (HMAC-SHA1 blok boyu). */
export function totpSirriUret(): string {
  return base32Kodla(randomBytes(20));
}

/* ── HOTP / TOTP ──────────────────────────────────────────────────────── */

export function hotp(sir: Buffer, sayac: number, basamak = BASAMAK): string {
  const gövde = Buffer.alloc(8);
  gövde.writeBigUInt64BE(BigInt(sayac));
  const ozet = createHmac('sha1', sir).update(gövde).digest();
  const kaydirma = ozet[ozet.length - 1] & 0x0f;
  const ikili = ((ozet[kaydirma] & 0x7f) << 24)
    | ((ozet[kaydirma + 1] & 0xff) << 16)
    | ((ozet[kaydirma + 2] & 0xff) << 8)
    | (ozet[kaydirma + 3] & 0xff);
  return String(ikili % 10 ** basamak).padStart(basamak, '0');
}

export const adimNo = (simdiMs: number) => Math.floor(simdiMs / 1000 / ADIM_SANIYE);

export function totp(sirBase32: string, simdiMs: number): string | null {
  const sir = base32Coz(sirBase32);
  if (sir === null) return null;
  return hotp(sir, adimNo(simdiMs));
}

export type TotpSonucu =
  | { ok: true; adim: number }
  | { ok: false; sebep: 'bicim' | 'sir_bozuk' | 'kod_yanlis' | 'tekrar' };

/**
 * Kodu doğrular ve HANGİ adımda geçtiğini söyler.
 *
 * `sonKullanilanAdim` verilirse o adım ve öncesi REDDEDİLİR: aynı kodun
 * iki kez kullanılması (omuz sörfü, araya girme) engellenir. Bu kontrol
 * çağıranın kaydettiği duruma dayanır; saf katman durumu tutmaz ama
 * kararı verir — kararın iki yerde yaşaması, bir gün ikisinin ayrışması
 * demektir.
 */
export function totpDogrula(o: {
  sirBase32: string;
  kod: string;
  simdiMs: number;
  sonKullanilanAdim?: number | null;
}): TotpSonucu {
  const kod = o.kod.replace(/\s/g, '');
  if (!new RegExp(`^\\d{${BASAMAK}}$`).test(kod)) return { ok: false, sebep: 'bicim' };
  const sir = base32Coz(o.sirBase32);
  if (sir === null) return { ok: false, sebep: 'sir_bozuk' };

  const simdi = adimNo(o.simdiMs);
  for (let k = -PENCERE_ADIM; k <= PENCERE_ADIM; k += 1) {
    const adim = simdi + k;
    if (adim < 0) continue;
    const beklenen = Buffer.from(hotp(sir, adim));
    const gelen = Buffer.from(kod);
    if (gelen.length === beklenen.length && timingSafeEqual(gelen, beklenen)) {
      if (o.sonKullanilanAdim != null && adim <= o.sonKullanilanAdim) {
        return { ok: false, sebep: 'tekrar' };
      }
      return { ok: true, adim };
    }
  }
  return { ok: false, sebep: 'kod_yanlis' };
}

export const TOTP_RET_SOZU: Record<Exclude<TotpSonucu, { ok: true }>['sebep'], string> = {
  bicim: `Kod ${BASAMAK} haneli olmalı`,
  sir_bozuk: 'Kayıtlı MFA sırrı okunamadı — kaydı yenileyin',
  kod_yanlis: 'Kod doğrulanmadı',
  tekrar: 'Bu kod zaten kullanıldı — doğrulayıcıdaki bir sonraki kodu bekleyin',
};

/* ── Kaydolma URI'si ──────────────────────────────────────────────────── */

/**
 * `otpauth://` URI'si — doğrulayıcı uygulamanın okuduğu tek biçim.
 *
 * `yayinci` MARKADAN gelir, koda GÖMÜLMEZ (`lib/marka.ts`): kurulumun adı
 * doğrulayıcı uygulamada görünür ve o ad kiracıya göre değişir.
 */
export function kaydolmaUri(o: {
  yayinci: string; hesap: string; sirBase32: string;
}): string {
  const etiket = encodeURIComponent(`${o.yayinci}:${o.hesap}`);
  const p = new URLSearchParams({
    secret: o.sirBase32,
    issuer: o.yayinci,
    algorithm: 'SHA1',
    digits: String(BASAMAK),
    period: String(ADIM_SANIYE),
  });
  return `otpauth://totp/${etiket}?${p.toString()}`;
}

/* ── Kurtarma kodları ─────────────────────────────────────────────────── */

export const KURTARMA_ADEDI = 10;
/** 10 karakter base32 = 50 bit; kaba kuvvete kapalı, elle yazılabilir. */
export const KURTARMA_UZUNLUK = 10;

/** Kodun kendisi YALNIZ BİR KEZ gösterilir; veritabanına ÖZETİ gider. */
export function kurtarmaKodlariUret(adet = KURTARMA_ADEDI): string[] {
  return Array.from({ length: adet }, () => base32Kodla(randomBytes(7)).slice(0, KURTARMA_UZUNLUK));
}

/** Karşılaştırma için normalleştirme: boşluk ve tire yok sayılır. */
export const kurtarmaNormalize = (kod: string) => kod.replace(/[\s-]/g, '').toUpperCase();
