import { describe, expect, it } from 'vitest';
import { copyFileSync, cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.6 — /paketler EKRANI · VERİ KATMANI (URN-PKT-016)

   Tohumlanmış veritabanı üç demo paketini kurulu taşır; disk kökü olarak
   depo `paketler/` dizini verilir. Sonra geçici bir kökle güncelleme,
   doğrulanamayan kopya, diskte olmayan paket ve kaldırma (arşiv) hâlleri
   ölçülür — ekranın söylediği her hâl bir gerçek durumdan türetilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-paketler-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { paketiKaldir } = await import('@/lib/paket/kur');
const { paketEkranVerisi } = await import('@/app/(kabuk)/(operasyonel)/paketler/veri');

const KOK = path.resolve(process.cwd(), 'paketler');

describe('/paketler · veri katmanı [URN-PKT-016]', () => {
  it('tohumlanmış veritabanı + depo paketleri: üç demo paketi güncel, iskeletler kurulu değil; bağımlılar ve çerçeve sayıları [URN-PKT-016]', async () => {
    const v = await paketEkranVerisi(db, KOK);
    expect(v.kokHatasi).toBeNull();
    const hal = Object.fromEntries(v.satirlar.map((s) => [s.kod, s.hal]));
    expect(hal).toMatchObject({ 'DEMO-TR-ORTAK': 'guncel', 'DEMO-TR-ENERJI': 'guncel', 'DEMO-TR-SU': 'guncel', 'TR-ENERJI': 'kurulu_degil', 'TR-BANKACILIK': 'kurulu_degil' });
    const ortak = v.satirlar.find((s) => s.kod === 'DEMO-TR-ORTAK')!;
    expect(ortak.bagimlilar).toEqual(['DEMO-TR-ENERJI', 'DEMO-TR-SU']);
    expect(ortak.cerceve).toEqual({ aktif: 3, taslak: 0, arsiv: 0 });
    expect(ortak.kurulu).toMatchObject({ surum: '0.1.0', durum: 'kurulu', kuran: 'Kullanıcı A' });
    expect(ortak.kurulu!.rapor!.sayilar).toMatchObject({ cerceveler: 3, maddeler: 11, eslemeler: 2 });
    expect(ortak.disk!.sayilar).toMatchObject({ cerceveler: 3, maddeler: 11 });
    const enerji = v.satirlar.find((s) => s.kod === 'TR-ENERJI')!;
    expect(enerji.kurulu).toBeNull();
    expect(enerji.disk).toMatchObject({ surum: '0.1.0', hatalar: [], sektor: 'ELEKTRIK-URETIM' });
    expect(v.ozet).toEqual({ kurulu: 3, guncellemeVar: 0, dogrulanamadi: 0, taslakCerceve: 0 });
    // karar sırası: kurulu-güncel önce, kurulabilir sonra
    expect(v.satirlar.map((s) => s.hal)).toEqual(['guncel', 'guncel', 'guncel', 'kurulu_degil', 'kurulu_degil']);
  });

  it('geçici kök: yeni sürüm → güncelleme var; bozuk manifest → doğrulanamadı (hatalar listelenir); dizin yok → diskte yok; paket kökü yok → kökHatasi [URN-PKT-016] [URN-PKT-018]', async () => {
    const kok = path.join(dizin, 'paketler');
    cpSync(KOK, kok, { recursive: true });
    const suManifest = path.join(kok, 'DEMO-TR-SU', 'manifest.json');
    const su = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(suManifest, 'utf8'))) as { surum: string };
    writeFileSync(suManifest, JSON.stringify({ ...su, surum: '0.2.0' }, null, 2) + '\n');
    writeFileSync(path.join(kok, 'TR-BANKACILIK', 'manifest.json'), '{ "kod": "TR-BANKACILIK", bozuk');
    await import('node:fs').then((fs) => fs.rmSync(path.join(kok, 'DEMO-TR-ENERJI'), { recursive: true }));
    const v = await paketEkranVerisi(db, kok);
    const s = Object.fromEntries(v.satirlar.map((x) => [x.kod, x]));
    expect(s['DEMO-TR-SU'].hal).toBe('guncelleme_var');
    expect(s['DEMO-TR-SU'].disk!.surum).toBe('0.2.0');
    expect(s['TR-BANKACILIK'].hal).toBe('dogrulanamadi');
    expect(s['TR-BANKACILIK'].disk!.hatalar.length).toBeGreaterThan(0);
    expect(s['TR-BANKACILIK'].disk!.sayilar).toBeNull();
    expect(s['DEMO-TR-ENERJI'].hal).toBe('disk_yok');
    expect(s['DEMO-TR-ENERJI'].disk).toBeNull();
    expect(s['DEMO-TR-ENERJI'].kurulu!.surum).toBe('0.1.0');
    expect(v.ozet).toMatchObject({ kurulu: 3, guncellemeVar: 1, dogrulanamadi: 1 });
    expect(v.satirlar.slice(0, 3).map((x) => x.hal)).toEqual(['guncelleme_var', 'dogrulanamadi', 'disk_yok']);
    const yok = await paketEkranVerisi(db, path.join(dizin, 'yok'));
    expect(yok.kokHatasi).toMatch(/paket kökü yok/);
    expect(yok.satirlar.map((x) => x.hal)).toEqual(['disk_yok', 'disk_yok', 'disk_yok']);
  });

  it('kaldırma (arşiv) → hâl arşiv, diskte varsa geri kurulabilir; kaldırılan paket bağımlılar listesinden düşer [URN-PKT-016]', async () => {
    const k = await paketiKaldir('DEMO-TR-SU', db);
    expect(k.ok, JSON.stringify(k)).toBe(true);
    const v = await paketEkranVerisi(db, KOK);
    const su = v.satirlar.find((x) => x.kod === 'DEMO-TR-SU')!;
    expect(su.hal).toBe('arsiv');
    expect(su.kurulu).toMatchObject({ durum: 'arsiv', surum: '0.1.0' });
    expect(su.disk!.surum).toBe('0.1.0');
    expect(v.satirlar.find((x) => x.kod === 'DEMO-TR-ORTAK')!.bagimlilar).toEqual(['DEMO-TR-ENERJI']);
    expect(v.ozet.kurulu).toBe(2);
    expect(v.satirlar[v.satirlar.length - 1].kod).toBe('DEMO-TR-SU');
  });
});
