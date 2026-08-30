import 'server-only';
import { db } from '../db';

/* İş koşucusu (§68): her otomasyon motoru bu sarmalayıcıdan geçer.
   Koşu kaydı açılır (calisiyor) → iş çalışır → başarıda durum=basarili,
   süre ve sayaçlar yazılır; HATADA durum=basarisiz + hata mesajı kaydedilir.
   Sessiz hata YASAK: hata throw EDİLMEZ, IsKosusu satırına geçer ve
   /saglik ekranında görünür. */

export async function isKos(
  isAdi: string,
  is: () => Promise<{ islenen: number; uretilen: number }>,
): Promise<void> {
  // Aynı iş hâlâ koşuyorsa ikinci koşu başlatılmaz (çakışma önleme).
  const calisan = await db.isKosusu.findFirst({ where: { isAdi, durum: 'calisiyor' } });
  if (calisan) return;

  const kosu = await db.isKosusu.create({ data: { isAdi } });
  const basla = Date.now();
  try {
    const { islenen, uretilen } = await is();
    await db.isKosusu.update({ where: { id: kosu.id }, data: {
      durum: 'basarili', bitis: new Date(), sureMs: Date.now() - basla, islenen, uretilen,
    } });
  } catch (e) {
    await db.isKosusu.update({ where: { id: kosu.id }, data: {
      durum: 'basarisiz', bitis: new Date(), sureMs: Date.now() - basla,
      hata: e instanceof Error ? e.message : String(e),
    } });
  }
}
