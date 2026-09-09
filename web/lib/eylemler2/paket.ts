'use server';
/* ═══ P4 · İçerik paketi eylemleri ═══════════════════════════════════════
   Kalıp `eylemler2/*` ile aynıdır: zod → `yetkiZorunlu` → iş → `iz`.

   Paket bir DİZİNDİR ve yalnız ürünün kendi `paketler/` klasöründen
   kurulur: yol dışarı çıkamaz (`..`, mutlak yol) — kurucu diskte gezinen
   bir araç değildir; dizin adı manifest koduyla uyuşmak zorundadır
   (doğrulayıcı). Doğrulayıcıdan geçmeyen paket yazılmaz; yazma tek
   transaction'dır ve İZ O TRANSACTION'IN İÇİNDEDİR: iz yazılamazsa
   kurulum/arşiv de geri alınır (ortak.ts › iz, `ayniIslemde`). Çerçeve
   TASLAK gelir, aktifleştirme `surumAktiflestir` ile insan kararıdır.
   Kaldırma arşivdir, silmez. */
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

function kurulumGerekcesi(r: KurulumRaporu): string {
  const p = r.pasiflestirilen;
  const pasif = p.kapsamTurleri + p.yukumlulukler + p.cerceveSurumleri;
  const artik = r.artik.sozluk.length + r.artik.oznitelikler.length;
  return `sözlük ${r.sayilar.sozluk} · tür ${r.sayilar.kapsamTurleri} · öznitelik ${r.sayilar.oznitelikler} · `
    + `çerçeve ${r.sayilar.cerceveler} (${r.sayilar.maddeler} madde, TASLAK) · yükümlülük ${r.sayilar.yukumlulukler}`
    + (r.celiskiler.length ? ` · çelişki ${r.celiskiler.length} (kiracı satırı korundu)` : '')
    + (pasif ? ` · uzlaştırma: tür ${p.kapsamTurleri} ve yükümlülük ${p.yukumlulukler} pasif, taslak sürüm ${p.cerceveSurumleri} arşiv` : '')
    + (artik ? ` · artık (yerinde, karar bekler): ${[...r.artik.sozluk, ...r.artik.oznitelikler].join(', ')}` : '');
}

export async function paketKur(girdi: { kod: string }): Promise<PaketKurSonucu> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({ kod: z.string().regex(PAKET_KODU, 'paket kodu: TR-ENERJI') }).parse(girdi);
    const sonuc = await paketiKur(paketDizini(v.kod), {
      kuranId: k.id, istemci: db,
      ayniIslemde: (tx, rapor) => iz({
        aktorId: k.id, varlikTipi: 'IcerikPaketi', varlikId: rapor.paketId, eylem: 'kurulum',
        alan: 'surum', sonra: rapor.surum, gerekce: kurulumGerekcesi(rapor),
      }, tx),
    });
    if (!sonuc.ok) {
      return hata(new Error(`Paket reddedildi (${sonuc.hatalar.length} hata):\n${sonuc.hatalar.map(hataSatiri).join('\n')}`));
    }
    revalidatePath('/uyum');
    revalidatePath('/yonetim-tezgahi');
    return { ok: true, rapor: sonuc.rapor };
  } catch (e) { return hata(e); }
}

export async function paketKaldir(girdi: { kod: string; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({ kod: z.string().regex(PAKET_KODU), gerekce: bosluksuz('Gerekçe').pipe(z.string().min(10, 'Gerekçe en az 10 karakter')) }).parse(girdi);
    const sonuc = await paketiKaldir(v.kod, db, {
      ayniIslemde: (tx, rapor) => iz({
        aktorId: k.id, varlikTipi: 'IcerikPaketi', varlikId: rapor.paketId, eylem: 'arsiv', alan: 'durum',
        once: 'kurulu', sonra: 'arsiv', gerekce: v.gerekce,
      }, tx),
    });
    if (!sonuc.ok) return hata(new Error(sonuc.hata));
    revalidatePath('/uyum');
    return { ok: true };
  } catch (e) { return hata(e); }
}
