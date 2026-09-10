import 'server-only';

/* P6 · KURUM HESABIYLA GİRİŞ · DENETİM İZİ

   Yerel girişin izi `girisKorumasi.ts`tedir ve aynı sözleşmeyi taşır:
   BAŞARI DA RET DE yazılır, sebep izdedir, ekranda tek cümle görünür.

   Buradaki fark tek şey: aktör çoğu retde BİLİNMEZ (tanınmayan bir
   `sub`un kullanıcısı yoktur). O yüzden `aktorId` null yazılır ve
   kimliğin yerine `sub` ÖZETİ konur — aynı kişinin tekrar tekrar
   denediği görülebilir, kimliği ise ize sızmaz. */

import { db } from '../db';
import { gunluk } from '../gunluk';

export const BILINMEYEN_KIMLIK = 'kimlik:bilinmeyen';

export async function kimlikGirisiYaz(v: {
  kullaniciId: string | null;
  saglayiciAd: string;
  sonuc: 'kabul' | 'red';
  not: string;
  gerekce: string;
  adres: string | null;
}): Promise<void> {
  try {
    await db.aktiviteKaydi.create({
      data: {
        aktorId: v.kullaniciId,
        varlikTipi: 'Oturum',
        varlikId: v.kullaniciId ?? BILINMEYEN_KIMLIK,
        eylem: v.sonuc === 'kabul' ? 'olusturma' : 'red',
        alan: 'kimlik_girisi',
        /* JETON YOK, `sub` HAM YOK, SIR YOK. Yalnız sağlayıcı adı,
           `sub` özeti ve kaynak adres. */
        yeniDeger: `${v.saglayiciAd} · ${v.not}${v.adres ? ` · ${v.adres}` : ''}`,
        gerekce: v.gerekce,
        kaynak: 'ui',
      },
    });
  } catch (e) {
    gunluk.hata('kimlik.iz_yazilamadi', { hata: e });
  }
}
