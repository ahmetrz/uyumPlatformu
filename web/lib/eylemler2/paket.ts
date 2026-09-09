'use server';
/* ═══ P4 · İçerik paketi eylemleri ═══════════════════════════════════════
   Kalıp `eylemler2/*` ile aynıdır: zod → `yetkiZorunlu` → iş → `iz`.

   Paket bir DİZİNDİR ve yalnız ürünün kendi `paketler/` klasöründen
   kurulur: yol dışarı çıkamaz (`..`, mutlak yol) — kurucu diskte gezinen
   bir araç değildir. Doğrulayıcıdan geçmeyen paket yazılmaz; yazma tek
   transaction'dır. Çerçeve TASLAK gelir, aktifleştirme `surumAktiflestir`
   ile insan kararıdır. Kaldırma arşivdir, silmez. */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { PAKET_KODU } from '../paket/bicim';
import { paketDizini } from '../paket/dizin';
import { hataSatiri } from '../paket/dogrula';
import { paketiKaldir, paketiKur, type KurulumRaporu } from '../paket/kur';
import { type Sonuc, hata, iz, bosluksuz } from './ortak';

export type PaketKurSonucu = Sonuc | { ok: true; rapor: KurulumRaporu };

export async function paketKur(girdi: { kod: string }): Promise<PaketKurSonucu> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({ kod: z.string().regex(PAKET_KODU, 'paket kodu: TR-ENERJI') }).parse(girdi);
    const sonuc = await paketiKur(paketDizini(v.kod), { kuranId: k.id, istemci: db });
    if (!sonuc.ok) {
      return hata(new Error(`Paket reddedildi (${sonuc.hatalar.length} hata):\n${sonuc.hatalar.map(hataSatiri).join('\n')}`));
    }
    await iz({
      aktorId: k.id, varlikTipi: 'IcerikPaketi', varlikId: sonuc.rapor.paketId, eylem: 'kurulum',
      alan: 'surum', sonra: sonuc.rapor.surum,
      gerekce: `sözlük ${sonuc.rapor.sayilar.sozluk} · tür ${sonuc.rapor.sayilar.kapsamTurleri} · öznitelik ${sonuc.rapor.sayilar.oznitelikler} · `
        + `çerçeve ${sonuc.rapor.sayilar.cerceveler} (${sonuc.rapor.sayilar.maddeler} madde, TASLAK) · yükümlülük ${sonuc.rapor.sayilar.yukumlulukler}`
        + (sonuc.rapor.celiskiler.length ? ` · çelişki ${sonuc.rapor.celiskiler.length} (kiracı satırı korundu)` : ''),
    });
    revalidatePath('/uyum');
    revalidatePath('/yonetim-tezgahi');
    return { ok: true, rapor: sonuc.rapor };
  } catch (e) { return hata(e); }
}

export async function paketKaldir(girdi: { kod: string; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({ kod: z.string().regex(PAKET_KODU), gerekce: bosluksuz('Gerekçe').pipe(z.string().min(10, 'Gerekçe en az 10 karakter')) }).parse(girdi);
    const sonuc = await paketiKaldir(v.kod, db);
    if (!sonuc.ok) return hata(new Error(sonuc.hata));
    const paket = await db.icerikPaketi.findUniqueOrThrow({ where: { kod: v.kod }, select: { id: true } });
    await iz({
      aktorId: k.id, varlikTipi: 'IcerikPaketi', varlikId: paket.id, eylem: 'arsiv', alan: 'durum',
      once: 'kurulu', sonra: 'arsiv', gerekce: v.gerekce,
    });
    revalidatePath('/uyum');
    return { ok: true };
  } catch (e) { return hata(e); }
}
