import 'server-only';
import { db } from '@/lib/db';
import { aktifKullanici } from '@/lib/auth';
import { durumAyagiVerisi } from '@/components/abacus/durumAyagiVerisi';
import type { KabukVerisi } from './Kabuk';

/* Kabuğun SUNUCU verisi — proje kalıbı: `page.tsx → veri.ts`.

   İş mantığına dokunulmaz. Yetki kapısı ve silinen kayıt yüklemi zaten
   `durumAyagiVerisi`de yaşıyor ve buradan olduğu gibi çağrılır: dış
   denetçi her sayfanın altında grup geneli connector durumunu görmemeli
   (PR #1 incelemesi, P2). Yeni kabuk o düzeltmeyi DEVRALIR, yeniden
   yazmaz.

   Veri kesiti damgası UYDURULMAZ: gerçek bir koşu yoksa `null` döner ve
   kabuk "—" yazar. Prototipte damga hep doluydu (harita §7 kusur 8). */

export async function kabukVerisi(): Promise<KabukVerisi> {
  const k = await aktifKullanici().catch(() => null);

  const [ayak, grup, tuzelKisi, santral] = await Promise.all([
    durumAyagiVerisi(k).catch(() => null),
    db.grup.findFirst({ select: { ad: true } }).catch(() => null),
    db.tuzelKisi.count().catch(() => 0),
    db.tesis.count({ where: { durum: 'aktif' } }).catch(() => 0),
  ]);

  return {
    kullanici: k ? { ad: k.adSoyad, unvan: k.unvan, demo: k.id === 'demo' } : null,
    kapsam: grup ? { grup: grup.ad, tuzelKisi, santral } : null,
    ayak: ayak && {
      toplam: ayak.toplam,
      sayimlar: ayak.sayimlar,
      sonKosu: ayak.sonKosu ? ayak.sonKosu.toISOString() : null,
    },
    /* Veri kesiti = en son BAŞARILI connector koşusu. Yoksa null; sistem
       saatini damga diye göstermek "veri taze" demek olurdu — oysa hiçbir
       kaynak bağlı değilken hiçbir şey tazelenmemiştir. Yetkisiz
       kullanıcıda da null: damga da bir sağlık bilgisidir. */
    kesit: ayak?.sonKosu ? ayak.sonKosu.toISOString() : null,
  };
}
