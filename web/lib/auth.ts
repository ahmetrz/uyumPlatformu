import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { db } from './db';
import { DEMO } from './demo';

/* Oturum modeli: rastgele 32B token çerezde taşınır; DB'de yalnız SHA-256
   özeti durur. Parola: scrypt (N=2^15) + kayıt başına tuz.

   ── İKİ AYRI SÜRE, İKİSİ DE GEREKLİ ────────────────────────────────────
   Eskiden yalnız MUTLAK süre vardı (12 saat) ve `Oturum.sonKullanim`
   sütunu şemada duruyor ama HİÇ YAZILMIYORDU. Sonuç: açık bırakılmış bir
   tarayıcı 12 saat boyunca tam yetkiyle canlı kalıyordu; kilitlenmemiş bir
   dizüstü ya da paylaşılan bir kontrol odası terminali oturumu kimseye
   sormadan devrediyordu. Sütunun varlığı bir koruma OLDUĞU izlenimi
   veriyordu — olmayan bir kontrolün kayıtlı görünmesi, hiç olmamasından
   kötüdür.

   Şimdi iki eşik birlikte çalışır:
   · MUTLAK (12 saat) — oturum ne kadar aktif olursa olsun yenilenmez.
     Kayan bir mutlak süre, çalınmış bir çerezi sonsuza dek geçerli kılardı.
   · ATIL (2 saat) — son kullanımdan bu yana geçen süre. Kullanıldıkça
     ilerler, mutlak sınırı AŞMAZ.

   ── NEDEN HER İSTEKTE YAZMIYORUZ ───────────────────────────────────────
   `sonKullanim` her istekte güncellenseydi, her sayfa görüntülemesi bir
   yazma işlemi olurdu; SQLite tek yazıcıdır ve bu, okuma yükünü yazma
   yüküne çevirirdi. Bu yüzden yalnız eşik kadar bayatlamışsa yazılır.
   Yazma sıklığı atıl eşiğinden çok küçük olduğu sürece davranış aynıdır. */

const CEREZ_ADI = 'oturum';
/** Oturumun mutlak ömrü. Etkinlikle UZAMAZ. */
const OTURUM_SURESI_SAAT = 12;
/** Bu kadar süre hiç kullanılmayan oturum düşer. */
const ATIL_SURE_MS = 2 * 3_600_000;
/** `sonKullanim` en fazla bu sıklıkta yazılır (yazma gürültüsünü keser). */
const KULLANIM_YAZMA_ARALIGI_MS = 5 * 60_000;

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

/**
 * Bir kullanıcının TÜM oturumlarını sonlandırır.
 *
 * Parola değişiminde ve hesap pasifleştirmede çağrılmalıdır: yalnız mevcut
 * çerezi silmek, parolası çalınmış bir kullanıcının saldırgandaki açık
 * oturumunu canlı bırakır. Parola değiştirmenin bütün anlamı o oturumu
 * kesmektir.
 *
 * Kaç oturumun düştüğünü döndürür — denetim izine yazılabilsin.
 */
export async function tumOturumlariKapat(kullaniciId: string): Promise<number> {
  const sonuc = await db.oturum.deleteMany({ where: { kullaniciId } });
  return sonuc.count;
}

/** Süresi dolmuş oturum satırlarını siler. İşleyişi etkilemez (dolmuş
    oturum zaten reddedilir), tabloyu şişirmemek içindir. */
export async function dolmusOturumlariTemizle(simdi: Date = new Date()): Promise<number> {
  const sonuc = await db.oturum.deleteMany({ where: { bitis: { lt: simdi } } });
  return sonuc.count;
}

/** Oturum hâlâ geçerli mi — mutlak VE atıl eşiği birlikte. Saf fonksiyon;
    testler saat beklemeden ölçebilsin diye `simdi` dışarıdan verilir. */
export function oturumGecerli(
  oturum: { bitis: Date; sonKullanim: Date },
  simdi: Date = new Date(),
): { gecerli: true } | { gecerli: false; sebep: 'mutlak_sure_doldu' | 'atil_kaldi' } {
  if (oturum.bitis < simdi) return { gecerli: false, sebep: 'mutlak_sure_doldu' };
  if (simdi.getTime() - oturum.sonKullanim.getTime() > ATIL_SURE_MS) {
    return { gecerli: false, sebep: 'atil_kaldi' };
  }
  return { gecerli: true };
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
  if (!oturum) return null;

  const simdi = new Date();
  const gecerlilik = oturumGecerli(oturum, simdi);
  if (!gecerlilik.gecerli) {
    /* Düşen oturum satırı BIRAKILMAZ: aksi hâlde atıl kalmış bir oturum
       satırı, mutlak süresi dolana kadar tabloda "canlı" görünürdü ve
       "kaç açık oturum var" sorusunun yanıtı yanlış olurdu. */
    await db.oturum.deleteMany({ where: { id: oturum.id } });
    return null;
  }
  if (!oturum.kullanici.aktif) return null;

  /* Etkinlik damgası: yalnız yeterince bayatsa yazılır (yukarıdaki
     gerekçe). `updateMany` kullanılır — satır bu arada silinmişse
     `update` fırlatırdı ve bir sayfa görüntülemesi hataya dönerdi. */
  if (simdi.getTime() - oturum.sonKullanim.getTime() > KULLANIM_YAZMA_ARALIGI_MS) {
    await db.oturum.updateMany({ where: { id: oturum.id }, data: { sonKullanim: simdi } });
  }

  const k = oturum.kullanici;
  return {
    id: k.id, adSoyad: k.adSoyad, eposta: k.eposta, unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({ rol: y.rol, surecId: y.surecId, tesisId: y.tesisId,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul })),
  };
});
