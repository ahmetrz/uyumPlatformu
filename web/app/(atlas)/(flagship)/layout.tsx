import Ray from '@/components/atlas/Ray';
import DurumAyagi from '@/components/atlas/DurumAyagi';
import { RAY_SERIDI } from '@/lib/atlas/gorsel';
import { aktifKullanici } from '@/lib/auth';

/** Rayın oturum bloğu için: ad, unvan ve çıkış düğmesinin görünüp
    görünmeyeceği. Oturum yoksa blok hiç çizilmez. */
async function oturumBlogu() {
  const k = await aktifKullanici();
  if (!k) return null;
  return { ad: k.adSoyad, unvan: k.unvan, demo: k.id === 'demo' };
}

/* Atlas 2 kabuğu: ray artık iki kademeli (64px alan rayı + 192px
   bağlamsal liste) ve alan haritası Ray'in kendisinde sabittir; katman
   başına ayrı liste geçirilmez. Flagship'e özgü olan yalnız fotoğrafik
   ayak şerididir. Durum ayağı .atlas-govde'nin KARDEŞİDİR — içine
   konursa :has(> .cekmece) çekmece kolonunu bozar. */

export default async function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas atlas-kabuk">
      <Ray
        ayak={{ tip: 'serit', gorsel: RAY_SERIDI,
          alt: 'Zorlu Enerji üretim portföyü — jeotermal, hidro, rüzgâr',
          yazi: 'Enerji üretim grubu · saha' }}
        kullanici={await oturumBlogu()} />
      <div className="atlas-govde">{children}</div>
      <DurumAyagi />
    </div>
  );
}
