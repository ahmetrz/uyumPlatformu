import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import { anahtarOzeti, kapsamiCoz, UC_KIMLIKLERI } from '@/lib/api/kapsam';
import { openapiBelgesi } from '@/lib/api/sozlesme';
import ApiSozlesmesiIstemci from './ApiSozlesmesiIstemci';
import { simdiOku } from './veri';

export const metadata: Metadata = { title: 'API sözleşmesi' };

/* ═══ UY-52 · Dış API sözleşmesi ══════════════════════════════════════

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   ── NEDEN AYRI BİR EKRAN ──────────────────────────────────────────────
   Anahtar kütüğü `/yonetim-tezgahi`tedir ve orası "kimde anahtar var"
   sorusunu yanıtlar. Burası "bu API ne yapar ve hangi anahtar neye
   erişebilir" sorusunu yanıtlar: entegrasyonu yazan tarafın bakacağı
   yüzey. İkisini aynı ekrana yığmak, sözleşmeyi anahtar listesinin
   altında görünmez kılardı.

   ── SÖZLEŞME BURADA ÜRETİLİR, SAKLANMAZ ───────────────────────────────
   Belge her istekte `openapiBelgesi()` ile ürünün kendi kütüğünden
   türetilir. Diskte tutulan bir kopya, ilk uç değişikliğinde sessizce
   eskirdi.

   ── KAPI ──────────────────────────────────────────────────────────────
   `yonetim/okuma`: API anahtarlarının kütüğüyle aynı kapı. Sözleşmenin
   kendisi sır değildir ama hangi anahtarın neye eriştiği kurumun erişim
   haritasıdır. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'yonetim', 'okuma')) return <Yetkisiz rol="yönetim okuma" />;

  const anahtarlar = await db.apiAnahtari.findMany({
    select: {
      id: true, ad: true, onEk: true, kapsamJson: true, saltOkunur: true,
      bitis: true, iptalZamani: true,
    },
    orderBy: { olusturuldu: 'desc' },
  });

  /* "Pasif" = artık istek geçirmeyen anahtar: iptal edilmiş ya da süresi
     dolmuş. Kapsam kusuru yalnız ETKİN anahtarlarda sayılır — kapatılmış
     bir kapının genişliği bir kusur değildir. */
  const simdi = simdiOku();
  const ozet = anahtarOzeti(anahtarlar.map((a) => ({
    kapsamJson: a.kapsamJson,
    saltOkunur: a.saltOkunur,
    pasif: a.iptalZamani !== null || (a.bitis !== null && a.bitis.getTime() <= simdi),
  })));

  /* Uç başına kaç ETKİN anahtar erişebiliyor. Kapsamı tanımsız anahtar
     HER uca sayılır: bugünkü gerçek erişimi odur. */
  const ucKullanimi = Object.fromEntries(UC_KIMLIKLERI.map((uc) => [uc, 0])) as
    Record<string, number>;
  let mirasli = 0;
  for (const a of anahtarlar) {
    if (a.iptalZamani || (a.bitis && a.bitis.getTime() <= simdi)) continue;
    if (a.kapsamJson === null) {
      mirasli++;
      for (const uc of UC_KIMLIKLERI) ucKullanimi[uc]++;
      continue;
    }
    for (const uc of kapsamiCoz(a.kapsamJson).uclar) ucKullanimi[uc]++;
  }

  return (
    <ApiSozlesmesiIstemci
      belge={JSON.stringify(openapiBelgesi(), null, 2)}
      ozet={ozet}
      ucKullanimi={ucKullanimi}
      mirasli={mirasli}
    />
  );
}
