import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.3 — ROL KATALOĞU (URN-PKT-013)

   `roller.json` paket rol ÖNERİR: kod, ad, modül × işlem izinleri, kapsam
   ekseni. Doğrulayıcı çekirdek rol kodunu (KİMLİK), bilinmeyen modül /
   işlem, boş izin, işlem tekrarı ve merdiven ihlalini (BIÇIM) reddeder.
   Kurucu `RolKatalogu`ya köken ve aktif ile yazar; kiracı rolü ezilmez;
   yükseltmede bırakılan rol pasif; kaldırma pasifler. ÇALIŞMA ZAMANI
   YETKİSİ KATALOĞU OKUMAZ: paket rol koduyla `izinVar` false döner.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-rol-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { paketiKaldir, paketiKur } = await import('@/lib/paket/kur');
const { izinVar } = await import('@/lib/erisim');

const ROL = (ek: Record<string, unknown> = {}) => ({
  kod: 'ic_kontrol_gorevlisi', ad: 'İç kontrol görevlisi',
  izinler: { denetim: ['okuma', 'yazma', 'onay'], uyum: ['okuma'] }, kapsamEkseni: 'global', sira: 10, ...ek,
});
const ROL2 = { kod: 'dis_hizmet_sorumlusu', ad: 'Dış hizmet sorumlusu', izinler: { envanter: ['okuma', 'yazma'] }, kapsamEkseni: 'kapsamOgesi', sira: 20 };
const TEMEL: PaketDosyalari = {
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
  'cerceve/ROL-REG.json': cerceve('ROL-REG', { tur: 'kamuya_acik', metinDahil: false }),
  'cerceve/ROL-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
};
const manifest = { kod: 'ROL-PAKET', sektor: { kod: 'ROL-SEKTOR', ad: 'Rol' } };
const siniflar = (d: string) => paketiDogrula(d).hatalar.map((h) => `${h.sinif}|${h.dosya}|${h.konum ?? ''}`);
const rolPaketi = (roller: unknown[], m: Record<string, unknown> = manifest) => paketYaz({ ...TEMEL, 'roller.json': roller }, m);

describe('doğrulayıcı · rol önerileri [URN-PKT-013]', () => {
  it('geçerli roller sayılır; kapsam ekseni ve sıra varsayılanı; sektörsüz (yatay) paket rol önerebilir [URN-PKT-013]', () => {
    const s = paketiDogrula(rolPaketi([ROL(), ROL2]));
    expect(s.ok, s.hatalar.map(hataSatiri).join('\n')).toBe(true);
    expect(s.sayilar).toMatchObject({ roller: 2 });
    expect(s.icerik!.roller[1]).toMatchObject({ kod: 'dis_hizmet_sorumlusu', kapsamEkseni: 'kapsamOgesi', sira: 20 });
    const varsayilan = paketiDogrula(rolPaketi([{ kod: 'okur', ad: 'Okur', izinler: { uyum: ['okuma'] } }]));
    expect(varsayilan.ok).toBe(true);
    expect(varsayilan.icerik!.roller[0]).toMatchObject({ kapsamEkseni: 'global', sira: 0 });
    const yatay = paketiDogrula(paketYaz({ 'roller.json': [ROL()] }, { kod: 'ROL-YATAY', tur: 'yatay', sektor: null }));
    expect(yatay.ok, yatay.hatalar.map(hataSatiri).join('\n')).toBe(true);
    expect(yatay.sayilar).toMatchObject({ roller: 1, sozluk: 0 });
  });

  it('tekrar eden kod ve ÇEKİRDEK rol kodu KİMLİK — paket yönetici/denetim sorumlusunu yeniden tanımlayamaz [URN-PKT-013]', () => {
    expect(siniflar(rolPaketi([ROL(), ROL()]))).toContain('KİMLİK|roller.json|[1]');
    const cekirdek = paketiDogrula(rolPaketi([ROL({ kod: 'yonetici' }), ROL({ kod: 'denetim_sorumlusu' })]));
    expect(cekirdek.ok).toBe(false);
    expect(cekirdek.hatalar.map((h) => `${h.sinif}|${h.konum}`)).toEqual(['KİMLİK|[0] yonetici', 'KİMLİK|[1] denetim_sorumlusu']);
    expect(cekirdek.hatalar[0].mesaj).toMatch(/çekirdek rol kodu paketle yeniden tanımlanamaz: yonetici/);
  });

  it('bilinmeyen modül, bilinmeyen işlem, boş izin, işlem tekrarı, bilinmeyen eksen BIÇIM [URN-PKT-013]', () => {
    expect(siniflar(rolPaketi([ROL({ izinler: { muhasebe: ['okuma'] } })]))).toContain('BIÇIM|roller.json|[0].izinler');
    expect(siniflar(rolPaketi([ROL({ izinler: { uyum: ['silme'] } })]))).toContain('BIÇIM|roller.json|[0].izinler.uyum.0');
    expect(siniflar(rolPaketi([ROL({ izinler: {} })]))).toContain('BIÇIM|roller.json|[0] ic_kontrol_gorevlisi.izinler');
    const tekrar = paketiDogrula(rolPaketi([ROL({ izinler: { uyum: ['okuma', 'okuma'] } })]));
    expect(tekrar.hatalar.map((h) => `${h.sinif}|${h.konum}|${h.mesaj}`)).toEqual(['BIÇIM|[0] ic_kontrol_gorevlisi.izinler.uyum|işlem tekrar ediyor: okuma']);
    expect(siniflar(rolPaketi([ROL({ kapsamEkseni: 'tesis' })]))).toContain('BIÇIM|roller.json|[0].kapsamEkseni');
  });

  it('izin merdiveni: onay yazma ister, yazma okuma ister [URN-PKT-013]', () => {
    const onay = paketiDogrula(rolPaketi([ROL({ izinler: { denetim: ['okuma', 'onay'] } })]));
    expect(onay.hatalar.map((h) => `${h.sinif}|${h.konum}|${h.mesaj}`)).toEqual(['BIÇIM|[0] ic_kontrol_gorevlisi.izinler.denetim|onay yazma ister (izin merdiveni: okuma → yazma → onay)']);
    const yazma = paketiDogrula(rolPaketi([ROL({ izinler: { risk: ['yazma'] } })]));
    expect(yazma.hatalar.map((h) => `${h.sinif}|${h.konum}|${h.mesaj}`)).toEqual(['BIÇIM|[0] ic_kontrol_gorevlisi.izinler.risk|yazma okuma ister (izin merdiveni: okuma → yazma → onay)']);
    expect(paketiDogrula(rolPaketi([ROL({ izinler: { risk: ['okuma', 'yazma', 'onay'] } })])).ok).toBe(true);
  });
});

describe('kurucu · rol kataloğu, köken, uzlaştırma, çalışma zamanı [URN-PKT-013]', () => {
  let kuranId = '';
  beforeAll(async () => { kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id; });
  const kur = (roller: unknown[], m: Record<string, unknown>) => paketiKur(rolPaketi(roller, m), { kuranId, istemci: db });
  const yetkili = (rol: string) => ({
    id: 'rol-test', adSoyad: 'Rol Testi', eposta: 'rol@test.local', unvan: null,
    yetkiler: [{ rol, modul: null, kapsamOgesiId: null, tesisId: null, surecId: null, tuzelKisiId: null, regulasyonId: null }],
  });

  it('roller koken=paket yazılır (izinler JSON, eksen, sıra); paket rol kodu çalışma zamanında izin VERMEZ — katalog öneri, kod karar [URN-PKT-013]', async () => {
    const s = await kur([ROL(), ROL2], { ...manifest, surum: '0.1.0' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toMatchObject({ roller: 2 });
    const rol = await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'ic_kontrol_gorevlisi' } });
    expect(rol).toMatchObject({ koken: 'paket', paketSurumId: s.rapor.surumId, aktif: true, kapsamEkseni: 'global', sira: 10, aciklama: null });
    expect(JSON.parse(rol.izinlerJson)).toEqual({ denetim: ['okuma', 'yazma', 'onay'], uyum: ['okuma'] });
    expect(await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'dis_hizmet_sorumlusu' } })).toMatchObject({ kapsamEkseni: 'kapsamOgesi', koken: 'paket' });
    // çalışma zamanı: katalogdaki rol koda bağlı DEĞİL — çekirdek rol izin verir, paket rolü vermez
    expect(izinVar(yetkili('yonetici'), 'denetim', 'okuma')).toBe(true);
    expect(izinVar(yetkili('ic_kontrol_gorevlisi'), 'denetim', 'okuma')).toBe(false);
  });

  it('kiracı rolü ezilmez (çelişki); bırakılan rol pasif, silinmez; yeniden beyan aktifler; kaldırma paket rollerini pasifler [URN-PKT-013]', async () => {
    await db.rolKatalogu.create({ data: { kod: 'kiraci_rolu', ad: 'Kiracının rolü', izinlerJson: '{"uyum":["okuma"]}', koken: 'kiraci' } });
    const once = await db.rolKatalogu.count();
    // 0.2.0: kiracı rolünü de beyan ediyor, dis_hizmet_sorumlusu'nu bırakıyor
    const s = await kur([ROL(), { ...ROL2, kod: 'kiraci_rolu', ad: 'Paketin rolü' }], { ...manifest, surum: '0.2.0' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.celiskiler).toEqual([{ tablo: 'RolKatalogu', anahtar: 'kiraci_rolu', sebep: expect.stringContaining('kiracı') }]);
    expect(await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'kiraci_rolu' } })).toMatchObject({ ad: 'Kiracının rolü', koken: 'kiraci', aktif: true });
    expect(s.rapor.pasiflestirilen).toMatchObject({ roller: 1 });
    expect(await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'dis_hizmet_sorumlusu' } })).toMatchObject({ aktif: false, koken: 'paket' });
    expect(await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'ic_kontrol_gorevlisi' } })).toMatchObject({ aktif: true, paketSurumId: s.rapor.surumId });
    expect(await db.rolKatalogu.count()).toBe(once);
    // 0.3.0 yeniden beyan → aktif
    const g = await kur([ROL(), ROL2], { ...manifest, surum: '0.3.0' });
    expect(g.ok, JSON.stringify(g)).toBe(true);
    expect(await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'dis_hizmet_sorumlusu' } })).toMatchObject({ aktif: true });
    // kaldırma = arşiv: paket rolleri pasif, kiracı rolü aktif, satır sayısı aynı
    const k = await paketiKaldir('ROL-PAKET', db);
    expect(k.ok, JSON.stringify(k)).toBe(true);
    if (k.ok) expect(k.arsivlenen).toMatchObject({ roller: 2 });
    expect((await db.rolKatalogu.findMany({ where: { koken: 'paket' } })).map((r) => r.aktif)).toEqual([false, false]);
    expect((await db.rolKatalogu.findUniqueOrThrow({ where: { kod: 'kiraci_rolu' } })).aktif).toBe(true);
    expect(await db.rolKatalogu.count()).toBe(once);
  });
});
