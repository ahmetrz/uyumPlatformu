import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE: gerçek dev.db'ye dokunulmaz (tests/sahte/db.ts kuralı).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-sektor-profil-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { tesis360Verisi } = await import('@/app/(kabuk)/(flagship)/tesisler/[id]/veri');

/* ═══════════════════════════════════════════════════════════════════════
   B2 · Tesis 360 profil bloğu paketin şemasını VERİ YOLUNDA eksiksiz alır

   `tests/tesis360-profil.test.ts` saf fonksiyonları sınar (şema satırı →
   alan). Bu test aynı soruyu SUNUCU VERİ YOLUNA sorar: `tesis360Verisi`
   ekrana kaç sektör alanı indiriyor?

   K4 ölçtü (2026-09-08): enerji Tesis 360 "7/13 alan tanımsız" yazıyordu;
   beklenen 12 çekirdek + 8 paket = 20 idi. Sebep `NOT: { rol: 'kapasite' }`
   — SQL'de `NOT (rol = 'kapasite')`, rolü NULL olan satırda NULL döner ve
   satır DÜŞER (üç değerli mantık). Yalnız rolü dolu tek satır
   (`kritiklikSinifi`, rol=kritiklik) geçiyordu. Saf fonksiyon testi bunu
   göremezdi: şema satırı ona zaten hazır geliyordu.

   Beklenti UYDURULMAZ, şema tablosundan ölçülür: paketin `kapasite` rolü
   dışındaki HER satırı ekranda alan olmalıdır — rolü NULL olanlar dahil.
   ═══════════════════════════════════════════════════════════════════════ */

async function aktifKullanici() {
  const k = await db.kullanici.findFirstOrThrow({
    where: { aktif: true, yetkiler: { some: { rol: 'yonetici', kapsamOgesiId: null } } },
    include: { yetkiler: { include: { kapsamOgesi: { select: { tesisId: true } } } } },
  });
  return {
    id: k.id, adSoyad: k.adSoyad, eposta: k.eposta, unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({
      rol: y.rol, surecId: y.surecId, kapsamOgesiId: y.kapsamOgesiId,
      tesisId: y.kapsamOgesi?.tesisId ?? null,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul,
    })),
  };
}

/** Sektör başına şema: kapasite dışı satırlar ve bunların kaçının rolü boş. */
async function semaOlcumu() {
  const satirlar = await db.sektorOznitelikSemasi.findMany({
    select: { sektorId: true, anahtar: true, rol: true } });
  const sektorler = new Map<string, { beklenen: string[]; rolsuz: string[] }>();
  for (const s of satirlar) {
    const k = sektorler.get(s.sektorId) ?? { beklenen: [], rolsuz: [] };
    if (s.rol !== 'kapasite') { k.beklenen.push(s.anahtar); if (s.rol === null) k.rolsuz.push(s.anahtar); }
    sektorler.set(s.sektorId, k);
  }
  return sektorler;
}

async function sektorunTesisi(sektorId: string) {
  return db.tesis.findFirst({ where: { tip: { sektorId }, durum: { not: 'kapali' } }, select: { id: true, kod: true } });
}

describe('sektör profili veri yolu — şemanın kapasite dışı HER satırı ekrana iner', () => {
  it('rolü boş öznitelikler de alan olur; kapasite rolü çizilmez; sayı şemadan ölçülür [TES-PRF-006]', async () => {
    const k = await aktifKullanici();
    const sema = await semaOlcumu();
    const beyanEden = [...sema.entries()].filter(([, v]) => v.rolsuz.length > 0);
    // Tuzak ancak rolü boş satır varken görünür; seed en az bir paket için bunu taşımalı.
    expect(beyanEden.length, 'rolü boş öznitelik beyan eden sektör yok — test tuzağı göremez').toBeGreaterThan(0);

    for (const [sektorId, olcum] of beyanEden) {
      const tesis = await sektorunTesisi(sektorId);
      expect(tesis, `sektör ${sektorId} için tesis yok`).toBeTruthy();
      const ekran = await tesis360Verisi(k, tesis!.id);
      expect(ekran, `tesis ${tesis!.kod} kapsam dışı döndü`).toBeTruthy();
      const anahtarlar = ekran!.veri.sektorProfili.alanlar.map((a) => a.anahtar).sort();
      expect(anahtarlar).toEqual([...olcum.beklenen].sort());
      for (const rolsuz of olcum.rolsuz) expect(anahtarlar).toContain(rolsuz);
      expect(anahtarlar).not.toContain('kuruluGuc');
    }
  });

  it('profil özniteliği beyan etmeyen paket (yalnız kapasite) → boş sektör profili; aynı kod (K4)', async () => {
    const k = await aktifKullanici();
    const sema = await semaOlcumu();
    const beyanEtmeyen = [...sema.entries()].filter(([, v]) => v.beklenen.length === 0);
    expect(beyanEtmeyen.length, 'yalnız kapasite beyan eden sektör yok').toBeGreaterThan(0);
    for (const [sektorId] of beyanEtmeyen) {
      const tesis = await sektorunTesisi(sektorId);
      expect(tesis, `sektör ${sektorId} için tesis yok`).toBeTruthy();
      const ekran = await tesis360Verisi(k, tesis!.id);
      expect(ekran!.veri.sektorProfili).toEqual({ alanlar: [], degerler: {} });
    }
  });
});
