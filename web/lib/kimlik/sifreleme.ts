/* ═══ P6 · MFA SIRRI · ZARF ŞİFRELEME ═════════════════════════════════

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Ürünün kuralı nettir: SIR DEĞERİ SAKLANMAZ, yalnız `sirReferansi`
   taşınır. TOTP bu kuralın kenarındadır: kodu doğrulayabilmek için
   paylaşılan sırrın sunucuda BULUNMASI gerekir — doğrulama matematiği
   bunu zorunlu kılar, bir tasarım tercihi değildir.

   Kuralı çiğnemeden çözüm: sır veritabanında AÇIK durmaz, ŞİFRELİ durur
   ve ŞİFRELEME ANAHTARI veritabanında hiç yoktur — o anahtar bir
   `sirReferansi` ile (env: · dosya: · vault:) dışarıdan çözülür. Yedeği
   çalınan bir veritabanı MFA sırlarını vermez; anahtar ayrı yerdedir.

   ── ANAHTAR YOKSA MFA KURULMAZ ────────────────────────────────────────
   Anahtar referansı tanımlı değilse bu dosya sessizce düz metne
   düşmez: MFA kurulamaz ve ekran "bağlı değil" der. Sessiz düşüş, en
   kötü hâlde şifreli sanılan bir düz metin bırakırdı.

   ── HANGİ ANAHTARLA ŞİFRELENDİĞİ KAYITTA DURUR ────────────────────────
   Zarf, kullanılan REFERANSI da taşır. Anahtar döndürüldüğünde eski
   kayıtların hangi anahtarla açılacağı bilinir; taşımayan bir zarf,
   rotasyondan sonra sessizce açılamayan bir kayıt bırakırdı. */

import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { siriCoz } from '../entegrasyon/sir';

/** Anahtarın nerede olduğunu söyleyen ortam değişkeni — DEĞERİ değil. */
export const ANAHTAR_REFERANSI_ORTAMI = 'MFA_ANAHTAR_REFERANSI';

const ALG = 'aes-256-gcm';
/** Sabit tuz: anahtar zaten yüksek entropili bir sırdır; tuzun görevi
    aynı sırdan farklı amaçlar için farklı anahtar türetmektir. */
const TUZ = 'uyum-mfa-v1';

export type Zarf = {
  s: 1;
  /** Şifrelemede kullanılan sır referansı — rotasyon izlenebilsin. */
  ref: string;
  iv: string;
  etiket: string;
  govde: string;
};

export type AnahtarSonucu =
  | { ok: true; anahtar: Buffer; referans: string }
  | { ok: false; hata: string };

/** Anahtarı ÇÖZER; ne değeri ne türevi hiçbir yere yazılmaz. */
export async function mfaAnahtari(): Promise<AnahtarSonucu> {
  const referans = process.env[ANAHTAR_REFERANSI_ORTAMI];
  if (!referans) {
    return {
      ok: false,
      hata: `MFA anahtarı tanımlı değil. ${ANAHTAR_REFERANSI_ORTAMI} ortam değişkenine`
        + ' bir sır REFERANSI verin (env:… · dosya:… · vault:…). Anahtarın kendisi'
        + ' veritabanında saklanmaz.',
    };
  }
  const cozum = await siriCoz(referans);
  if (!cozum.ok) return { ok: false, hata: `MFA anahtarı çözülemedi: ${cozum.hata}` };
  return {
    ok: true,
    anahtar: scryptSync(cozum.deger, TUZ, 32, { N: 2 ** 14, r: 8, p: 1 }),
    referans,
  };
}

export async function sifrele(duzMetin: string): Promise<
  { ok: true; zarf: string } | { ok: false; hata: string }> {
  const a = await mfaAnahtari();
  if (!a.ok) return a;
  const iv = randomBytes(12);
  const sifre = createCipheriv(ALG, a.anahtar, iv);
  const govde = Buffer.concat([sifre.update(duzMetin, 'utf8'), sifre.final()]);
  const zarf: Zarf = {
    s: 1, ref: a.referans, iv: iv.toString('base64'),
    etiket: sifre.getAuthTag().toString('base64'), govde: govde.toString('base64'),
  };
  return { ok: true, zarf: JSON.stringify(zarf) };
}

export async function coz(zarfMetni: string): Promise<
  { ok: true; deger: string } | { ok: false; hata: string }> {
  let zarf: Zarf;
  try {
    zarf = JSON.parse(zarfMetni) as Zarf;
  } catch { return { ok: false, hata: 'MFA kaydı okunamadı (zarf bozuk)' }; }
  if (zarf.s !== 1) return { ok: false, hata: `Bilinmeyen zarf sürümü: ${String(zarf.s)}` };

  const a = await mfaAnahtari();
  if (!a.ok) return a;
  /* Zarf BAŞKA bir referansla şifrelenmişse bugünkü anahtarla açılmaz ve
     bu SESSİZ bir "kod yanlış" olarak görünmemeli: kullanıcının kodu
     doğru, kurulumun anahtarı değişmiştir. */
  if (zarf.ref !== a.referans) {
    return {
      ok: false,
      hata: `MFA kaydı '${zarf.ref}' anahtarıyla şifrelenmiş, kurulumda '${a.referans}' var`
        + ' — anahtar değişmiş. Kayıtlar yeni anahtarla yenilenmeli.',
    };
  }
  try {
    const sifre = createDecipheriv(ALG, a.anahtar, Buffer.from(zarf.iv, 'base64'));
    sifre.setAuthTag(Buffer.from(zarf.etiket, 'base64'));
    const duz = Buffer.concat([
      sifre.update(Buffer.from(zarf.govde, 'base64')), sifre.final(),
    ]);
    return { ok: true, deger: duz.toString('utf8') };
  } catch {
    return { ok: false, hata: 'MFA kaydının bütünlüğü doğrulanmadı' };
  }
}
