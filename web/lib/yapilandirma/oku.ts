import 'server-only';
import { db } from '../db';
import { AYARLAR, ayarDogrula, ayarTanimi } from './tanimlar';

/* Yapılandırma OKUMA katmanı (sunucu). Kayıt yoksa ya da saklanan değer
   şemayı geçmezse KOD VARSAYILANI döner — bozuk bir satır motoru
   durdurmaz, sessizce de sıfır saymaz. Hangi kaynaktan geldiği
   (`kaynak`) konsolda gösterilir: "varsayılan" ile "konsoldan ayarlandı"
   ayrımı kullanıcıya görünür.

   Önbellek yok: SQLite'ta anahtarla okuma ucuzdur ve motorlar dakikada
   bir koşar; bayat değerle koşan motor, önbelleğin kazandırdığından
   pahalıya gelir. */

export type AyarOkuma<T> = {
  anahtar: string; deger: T; kaynak: 'varsayilan' | 'yapilandirma' | 'gecersiz_kayit';
  guncellendi: Date | null; guncelleyenId: string | null;
};

export async function ayarOku<T = unknown>(anahtar: string): Promise<AyarOkuma<T>> {
  const t = ayarTanimi(anahtar);
  if (!t) throw new Error(`Bilinmeyen yapılandırma anahtarı: ${anahtar}`);
  const kayit = await db.yapilandirma.findUnique({ where: { anahtar } });
  if (!kayit) {
    return { anahtar, deger: t.varsayilan as T, kaynak: 'varsayilan', guncellendi: null, guncelleyenId: null };
  }
  let ham: unknown;
  try { ham = JSON.parse(kayit.degerJson); } catch { ham = undefined; }
  const d = ayarDogrula(anahtar, ham);
  if (!d.ok) {
    return { anahtar, deger: t.varsayilan as T, kaynak: 'gecersiz_kayit',
      guncellendi: kayit.guncellendi, guncelleyenId: kayit.guncelleyenId };
  }
  return { anahtar, deger: d.deger as T, kaynak: 'yapilandirma',
    guncellendi: kayit.guncellendi, guncelleyenId: kayit.guncelleyenId };
}

/** Kısa yol: yalnız değer. */
export async function ayar<T = unknown>(anahtar: string): Promise<T> {
  return (await ayarOku<T>(anahtar)).deger;
}

/** Birden çok anahtarı tek sorguda okur (motor başlangıcı için). */
export async function ayarlar<K extends string>(anahtarlar: readonly K[]): Promise<Record<K, unknown>> {
  const kayitlar = await db.yapilandirma.findMany({ where: { anahtar: { in: [...anahtarlar] } } });
  const harita = new Map(kayitlar.map((k) => [k.anahtar, k]));
  const sonuc = {} as Record<K, unknown>;
  for (const a of anahtarlar) {
    const t = ayarTanimi(a);
    if (!t) throw new Error(`Bilinmeyen yapılandırma anahtarı: ${a}`);
    const k = harita.get(a);
    if (!k) { sonuc[a] = t.varsayilan; continue; }
    let ham: unknown;
    try { ham = JSON.parse(k.degerJson); } catch { ham = undefined; }
    const d = ayarDogrula(a, ham);
    sonuc[a] = d.ok ? d.deger : t.varsayilan;
  }
  return sonuc;
}

export async function sayiAyar(anahtar: string): Promise<number> {
  const d = await ayar(anahtar);
  return typeof d === 'number' ? d : Number(ayarTanimi(anahtar)?.varsayilan);
}

/** Konsol için tüm sözlük + saklanan değerler. */
export async function tumAyarlar(): Promise<AyarOkuma<unknown>[]> {
  const kayitlar = await db.yapilandirma.findMany();
  const harita = new Map(kayitlar.map((k) => [k.anahtar, k]));
  return AYARLAR.map((t) => {
    const k = harita.get(t.anahtar);
    if (!k) return { anahtar: t.anahtar, deger: t.varsayilan, kaynak: 'varsayilan' as const, guncellendi: null, guncelleyenId: null };
    let ham: unknown;
    try { ham = JSON.parse(k.degerJson); } catch { ham = undefined; }
    const d = ayarDogrula(t.anahtar, ham);
    return d.ok
      ? { anahtar: t.anahtar, deger: d.deger, kaynak: 'yapilandirma' as const, guncellendi: k.guncellendi, guncelleyenId: k.guncelleyenId }
      : { anahtar: t.anahtar, deger: t.varsayilan, kaynak: 'gecersiz_kayit' as const, guncellendi: k.guncellendi, guncelleyenId: k.guncelleyenId };
  });
}
