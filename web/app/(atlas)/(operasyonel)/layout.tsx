import Ray, { RAY_OPERASYONEL } from '@/components/atlas/Ray';
import { aktifKullanici } from '@/lib/auth';
import { db } from '@/lib/db';

/** Rayın oturum bloğu için: ad, unvan ve çıkış düğmesinin görünüp
    görünmeyeceği. Oturum yoksa blok hiç çizilmez. */
async function oturumBlogu() {
  const k = await aktifKullanici();
  if (!k) return null;
  return { ad: k.adSoyad, unvan: k.unvan, demo: k.id === 'demo' };
}

/**
 * Rayın sayaçları. Şimdilik tek sayaç var: kullanıcının OKUNMAMIŞ bildirim
 * sayısı.
 *
 * Neden rayda: son tarih motoru her koşuda bildirim yazıyordu ve hiçbir
 * ekran okumuyordu (denetim bulgusu #11). Kutu artık var, ama kullanıcı
 * onu açmayı akıl etmezse uyarı yine ulaşmaz — sayaç, kutunun kendisini
 * duyuran şeydir. `eskalasyon` varsa sayaç kritik rengini alır.
 *
 * Sayaç KİŞİSELDİR (`kullaniciId`), santral kapsamıyla genişletilmez:
 * kullanıcı yalnız kendi kutusunu sayar.
 */
async function raySayaclari(): Promise<
  Record<string, { sayi: number; kritik?: boolean }> | undefined
> {
  const k = await aktifKullanici();
  if (!k) return undefined;
  const [okunmamis, uyari] = await Promise.all([
    db.bildirim.count({ where: { kullaniciId: k.id, okundu: null } }),
    db.bildirim.count({
      where: { kullaniciId: k.id, okundu: null, tip: { in: ['uyari', 'eskalasyon'] } } }),
  ]);
  // Sıfır sayaç hiç çizilmez (Ray kendisi eler); burada uydurma yapılmaz.
  return { '/bildirimler': { sayi: okunmamis, kritik: uyari > 0 } };
}

/* Atlas kabuğu — 250px ray | esnek içerik | 420px çekmece (seçim varken).
   Çekmece kolonu CSS :has() ile açılır: ekran <aside class="cekmece">
   render ettiğinde grid ikinci kolonu kazanır, JS gerekmez. */

export default async function AtlasYerlesim({ children }: { children: React.ReactNode }) {
  const [kullanici, sayilar] = await Promise.all([oturumBlogu(), raySayaclari()]);
  return (
    <div className="atlas atlas-kabuk">
      <Ray ogeler={RAY_OPERASYONEL} kullanici={kullanici} sayilar={sayilar} />
      <div className="atlas-govde">{children}</div>
    </div>
  );
}
