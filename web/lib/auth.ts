import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { db } from './db';
import { DEMO } from './demo';

/* Oturum modeli: rastgele 32B token çerezde taşınır; DB'de yalnız SHA-256
   özeti durur. Parola: scrypt (N=2^15) + kayıt başına tuz. */

const CEREZ_ADI = 'oturum';
const OTURUM_SURESI_SAAT = 12;

export function parolaOzetle(parola: string): string {
  const tuz = randomBytes(16).toString('hex');
  const ozet = scryptSync(parola, tuz, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString('hex');
  return `s1$${tuz}$${ozet}`;
}

export function parolaDogru(parola: string, kayit: string | null): boolean {
  if (!kayit) return false;
  const [, tuz, ozet] = kayit.split('$');
  if (!tuz || !ozet) return false;
  const aday = scryptSync(parola, tuz, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const hedef = Buffer.from(ozet, 'hex');
  return aday.length === hedef.length && timingSafeEqual(aday, hedef);
}

const tokenOzeti = (token: string) => createHash('sha256').update(token).digest('hex');

export async function oturumAc(kullaniciId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const bitis = new Date(Date.now() + OTURUM_SURESI_SAAT * 3_600_000);
  await db.oturum.create({ data: { kullaniciId, tokenHash: tokenOzeti(token), bitis } });
  (await cookies()).set(CEREZ_ADI, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    expires: bitis, path: '/',
  });
}

export async function oturumKapat(): Promise<void> {
  const depo = await cookies();
  const token = depo.get(CEREZ_ADI)?.value;
  if (token) await db.oturum.deleteMany({ where: { tokenHash: tokenOzeti(token) } });
  depo.delete(CEREZ_ADI);
}

export type AktifKullanici = {
  id: string; adSoyad: string; eposta: string; unvan: string | null;
  yetkiler: { rol: string; surecId: string | null; tesisId: string | null;
    tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null }[];
};

/** İstek başına bir kez çözülür (React cache). Demo yayında sanal salt-okur
    kullanıcı döner — statik dışa aktarım oturum taşıyamaz. */
export const aktifKullanici = cache(async (): Promise<AktifKullanici | null> => {
  if (DEMO) {
    // Örnek veriyle aynı kişi görünür; yetki YİNE salt okur ('okuyucu') —
    // demo hiçbir koşulda yazma yetkisi taşımaz.
    return { id: 'demo', adSoyad: 'Ahmet Terzi', eposta: 'ahmet.terzi@zorlu.com',
      unvan: 'BT Direktörü · demo (salt okunur)',
      yetkiler: [{ rol: 'okuyucu', surecId: null, tesisId: null,
        tuzelKisiId: null, regulasyonId: null, modul: null }] };
  }
  const token = (await cookies()).get(CEREZ_ADI)?.value;
  if (!token) return null;
  const oturum = await db.oturum.findUnique({
    where: { tokenHash: tokenOzeti(token) },
    include: { kullanici: { include: { yetkiler: true } } },
  });
  if (!oturum || oturum.bitis < new Date() || !oturum.kullanici.aktif) return null;
  const k = oturum.kullanici;
  return {
    id: k.id, adSoyad: k.adSoyad, eposta: k.eposta, unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({ rol: y.rol, surecId: y.surecId, tesisId: y.tesisId,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul })),
  };
});
