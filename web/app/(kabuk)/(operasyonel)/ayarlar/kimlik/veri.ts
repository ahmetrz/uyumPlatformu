import 'server-only';
import { db } from '@/lib/db';
import { sirMaskesi } from '@/lib/entegrasyon/sir';
import { ayarKapisi } from '@/lib/kimlik/oidc';
import { mfaAnahtari } from '@/lib/kimlik/sifreleme';
import { VARSAYILAN_POLITIKA } from '@/lib/kimlik/politika';
import type { KimlikVerisi, SaglayiciOzeti } from './mantik';

/* P6 · KİMLİK YÖNETİMİ · SUNUCU VERİSİ

   ── SIR DEĞERİ BU DOSYADAN GEÇMEZ ─────────────────────────────────────
   `siriCoz()` BURADA ÇAĞRILMAZ. Ekrana yalnız `sirMaskesi()` çıktısı
   (sırra giden adres) gider. Aynı kural `entegrasyon/saglikOzeti.ts`te
   de yazılıdır ve gerekçesi aynıdır: yetkisi olan bir kullanıcı bile
   sırrı GÖRMEZ, yalnız nerede olduğunu görür.

   MFA anahtarı istisna GİBİ görünür ama değildir: `mfaAnahtari()`
   çağrılır çünkü "anahtar çözülebiliyor mu" sorusunun cevabı ancak
   çözmeyi deneyerek bulunur — ama DÖNEN DEĞER kullanılmaz, yalnız
   `ok` bayrağı ve hata metni ekrana gider. */

export async function kimlikEkranVerisi(): Promise<KimlikVerisi> {
  const [kayitlar, politika, mfaKurulu, kullaniciSayisi, anahtar] = await Promise.all([
    db.kimlikSaglayici.findMany({
      orderBy: { ad: 'asc' },
      include: { _count: { select: { baglar: true } } },
    }),
    db.oturumPolitikasi.findUnique({ where: { kiraci: 'varsayilan' } }),
    db.mfaKaydi.count({ where: { dogrulandi: true } }),
    db.kullanici.count({ where: { aktif: true } }),
    mfaAnahtari(),
  ]);

  const saglayicilar: SaglayiciOzeti[] = kayitlar.map((s) => {
    const kapi = ayarKapisi(s);
    return {
      id: s.id, ad: s.ad, issuer: s.issuer, clientId: s.clientId,
      /* SIRRA GİDEN ADRES; sırrın kendisi değil. */
      sirMaskeli: sirMaskesi(s.istemciSirriReferansi),
      yetkilendirmeUcu: s.yetkilendirmeUcu, jetonUcu: s.jetonUcu, jwksUcu: s.jwksUcu,
      yonlendirmeUri: s.yonlendirmeUri, rolIddiasi: s.rolIddiasi,
      rolEslemesiJson: s.rolEslemesiJson,
      jitAcik: s.jitAcik, bagli: s.bagli, aktif: s.aktif,
      eksikler: kapi.ok ? [] : kapi.eksikler,
      bagSayisi: s._count.baglar,
    };
  });

  return {
    saglayicilar,
    politika: politika
      ? { mutlakSaat: politika.mutlakSaat, atilDakika: politika.atilDakika,
        mfaZorunlu: politika.mfaZorunlu }
      : { mutlakSaat: VARSAYILAN_POLITIKA.mutlakSaat,
        atilDakika: VARSAYILAN_POLITIKA.atilSaat * 60,
        mfaZorunlu: VARSAYILAN_POLITIKA.mfaZorunlu },
    /* KAYIT YOK ≠ SIFIR: ekran "varsayılan uygulanıyor" der. */
    politikaKayitli: politika !== null,
    mfaAnahtariVar: anahtar.ok,
    mfaAnahtarNotu: anahtar.ok
      ? `anahtar referansı: ${sirMaskesi(anahtar.referans)}`
      : anahtar.hata,
    mfaKurulu,
    kullaniciSayisi,
  };
}
