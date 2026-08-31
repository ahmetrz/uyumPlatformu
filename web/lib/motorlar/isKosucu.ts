import 'server-only';
import { db } from '../db';

/* İş koşucusu (§68): her otomasyon motoru bu sarmalayıcıdan geçer.
   Koşu kaydı açılır (calisiyor) → iş çalışır → başarıda durum=basarili,
   süre ve sayaçlar yazılır; HATADA durum=basarisiz + hata mesajı kaydedilir.
   Sessiz hata YASAK: hata throw EDİLMEZ, IsKosusu satırına geçer ve
   /saglik ekranında görünür. */

/** Bir koşunun `calisiyor` kalabileceği en uzun süre. Bu süreyi aşan kayıt
    ölü sayılır: süreç çöktüğünde ya da kapatıldığında koşu kaydı asılı
    kalıyor ve çakışma önleme o işi KALICI OLARAK blokluyordu. Kira süresi
    dolan kayıt bir sonraki koşuda kapatılır ve iş yeniden koşabilir. */
const KIRA_MS = 30 * 60_000;

export type KosuSonucu =
  | { ok: true; islenen: number; uretilen: number; sureMs: number }
  | { ok: false; sebep: 'zaten_calisiyor' }
  | { ok: false; sebep: 'hata'; hata: string };

/** Kira süresi dolmuş `calisiyor` kayıtlarını kapatır. Süreç öldüğü için
    bitiş yazılamamıştır; bunlar başarısız sayılır ve nedeni yazılır. */
async function oluKosulariKapat(isAdi: string): Promise<void> {
  const esik = new Date(Date.now() - KIRA_MS);
  await db.isKosusu.updateMany({
    where: { isAdi, durum: 'calisiyor', baslangic: { lt: esik } },
    data: {
      durum: 'basarisiz',
      bitis: new Date(),
      hata: `Koşu ${Math.round(KIRA_MS / 60_000)} dakikadan uzun süre 'calisiyor' kaldı; ` +
        'süreç bitmeden sonlanmış olmalı. Kira süresi dolduğu için kapatıldı.',
    },
  });
}

/**
 * Motoru koşu kaydıyla sarmalar.
 *
 * Geriye dönük uyum: eskiden `void` dönüyordu ve çağıranlar dönüşü
 * kullanmıyordu. Artık sonucu döndürüyor ki çağıran koşunun gerçekten
 * başarılı olup olmadığını bilebilsin — `isler.ts` başarısız koşuda bile
 * `tamam()` döndürüyordu, bu da sessiz başarısızlığın kapısıydı.
 * Hâlâ THROW ETMEZ: hata koşu kaydına yazılır ve sonuçta bildirilir.
 */
export async function isKos(
  isAdi: string,
  is: () => Promise<{ islenen: number; uretilen: number }>,
): Promise<KosuSonucu> {
  await oluKosulariKapat(isAdi);

  // Aynı iş hâlâ koşuyorsa ikinci koşu başlatılmaz (çakışma önleme).
  const calisan = await db.isKosusu.findFirst({ where: { isAdi, durum: 'calisiyor' } });
  if (calisan) return { ok: false, sebep: 'zaten_calisiyor' };

  const kosu = await db.isKosusu.create({ data: { isAdi } });
  const basla = Date.now();
  try {
    const { islenen, uretilen } = await is();
    const sureMs = Date.now() - basla;
    await db.isKosusu.update({ where: { id: kosu.id }, data: {
      durum: 'basarili', bitis: new Date(), sureMs, islenen, uretilen,
    } });
    return { ok: true, islenen, uretilen, sureMs };
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : String(e);
    await db.isKosusu.update({ where: { id: kosu.id }, data: {
      durum: 'basarisiz', bitis: new Date(), sureMs: Date.now() - basla, hata: mesaj,
    } });
    return { ok: false, sebep: 'hata', hata: mesaj };
  }
}
