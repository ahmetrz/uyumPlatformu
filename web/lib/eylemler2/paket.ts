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

/* İz gerekçesi raporun HER kalemini sayar — form/rapor (2.2) ve rol (2.3)
   dâhil; sayılmayan kalem izde görünmez ve uzlaştırma sessiz kalırdı. */
function kurulumGerekcesi(r: KurulumRaporu): string {
  const p = r.pasiflestirilen; const s = r.sayilar;
  const pasif = p.kapsamTurleri + p.yukumlulukler + p.cerceveSurumleri + p.sozluk + p.oznitelikler + p.formlar + p.raporlar + p.roller + p.eslemeler;
  return `sözlük ${s.sozluk} · tür ${s.kapsamTurleri} · öznitelik ${s.oznitelikler} · `
    + `çerçeve ${s.cerceveler} (${s.maddeler} madde, TASLAK) · yükümlülük ${s.yukumlulukler} · eşleme ${s.eslemeler} · form ${s.formlar} · rapor ${s.raporlar} · rol ${s.roller}`
    + (r.celiskiler.length ? ` · çelişki ${r.celiskiler.length} (kiracı satırı korundu)` : '')
    + (pasif ? ` · uzlaştırma: tür ${p.kapsamTurleri}, yükümlülük ${p.yukumlulukler}, sözlük ${p.sozluk}, öznitelik ${p.oznitelikler}, eşleme ${p.eslemeler}, form ${p.formlar}, rapor ${p.raporlar}, rol ${p.roller} pasif; taslak sürüm ${p.cerceveSurumleri} arşiv`
      + ((p.sozluk + p.oznitelikler) ? ` (${[...r.pasifAnahtarlar.sozluk, ...r.pasifAnahtarlar.oznitelikler].join(', ')})` : '') : '');
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
