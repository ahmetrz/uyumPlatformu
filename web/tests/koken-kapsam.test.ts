import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Köken doğrulama — kapsam kapısı

   `tests/koken.test.ts` köken SÖZLEŞMESİNİ ölçer (ne yazılır, ne
   raporlanır). Bu dosya yalnız kapıyı ölçer ve ayrı durur çünkü ötekinin
   oturum kurulumu gerçek çereze dayanır; burada gereken şey kimliği
   satır satır değiştirebilmek.

   İki aşamalı kapı burada da eksikti (2026-09-02, nöbetçi genişletilince
   çıktı): ön kapı kapsamsız çağrılıyordu, yani santral yöneticisi KENDİ
   santralinin kökenini doğrulayamıyordu. İkinci aşama
   (`kokenGetirVeKapsamDenetle`) zaten doğru yazılmıştı — kapsamı
   çözülemeyen kaydı "serbest" saymıyor, kapsamsız kaydı `{}` ile soruyor.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-koken-kapsam-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, tesisId, tuzelKisiId: null, regulasyonId: null, modul: null,
});

const kimlik = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: '', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => kimlik };
});

const { db } = await import('@/lib/db');
const { kokenDogrulaEylem, kokenTopluDogrula } = await import('@/lib/eylemler2/koken');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = kimlik.yetkiler;
  kimlik.yetkiler = yetkiler;
  try { return await is(); } finally { kimlik.yetkiler = onceki; }
}

let turId = '';
let tesisA = '';
let tesisB = '';

/** Belirli santraldeki bir varlığa bağlı doğrulanmamış köken açar. */
async function kokenAc(tesisId: string | null) {
  const varlik = await db.varlik.create({ data: {
    etiket: benzersiz('KKN-VRL'), ad: 'Köken hedefi', turId, tesisId,
  } });
  const koken = await db.veriKokeni.create({ data: {
    varlikTipi: 'Varlik', varlikId: varlik.id, kokenTipi: 'otomatik',
    kaynakSistem: 'TEST-CMDB', kaynakKayitId: benzersiz('kyt'),
  } });
  return { varlik, koken };
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  kimlik.id = kisi.id;
  kimlik.eposta = kisi.eposta;
  turId = (await db.varlikTuru.findFirstOrThrow({ select: { id: true } })).id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('Tekil köken doğrulama', () => {
  it('tesise kısıtlı rol KENDİ santralinin kökenini doğrulayabilir', async () => {
    const { koken } = await kokenAc(tesisA);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kokenDogrulaEylem({
      kokenId: koken.id, sonuc: 'dogrulandi', gerekce: 'saha karşılaştırdı',
    }));
    expect(hataMetni(sonuc)).toBe('');
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: koken.id } })).dogrulamaDurumu)
      .toBe('dogrulandi');
  });

  it('tesise kısıtlı rol BAŞKA santralin kökenini doğrulayamaz', async () => {
    const { koken } = await kokenAc(tesisB);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kokenDogrulaEylem({
      kokenId: koken.id, sonuc: 'dogrulandi', gerekce: 'başka saha',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: koken.id } })).dogrulamaDurumu)
      .toBe('dogrulanmadi');
  });

  it('SANTRALSİZ kaydın kökeni kapsamsız yetki ister', async () => {
    const { koken } = await kokenAc(null);
    const kisitli = await kimlikle([yetki('yonetici', tesisA)], () => kokenDogrulaEylem({
      kokenId: koken.id, sonuc: 'dogrulandi', gerekce: 'kurumsal kayıt',
    }));
    expect(hataMetni(kisitli)).toMatch(/kapsamsız/i);

    expect(hataMetni(await kokenDogrulaEylem({
      kokenId: koken.id, sonuc: 'dogrulandi', gerekce: 'kurumsal karar',
    }))).toBe('');
  });

  it('okuyucu rolü köken doğrulayamaz', async () => {
    const { koken } = await kokenAc(tesisA);
    const sonuc = await kimlikle([yetki('okuyucu')], () => kokenDogrulaEylem({
      kokenId: koken.id, sonuc: 'dogrulandi', gerekce: 'olur',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('Toplu köken doğrulama', () => {
  it('tesise kısıtlı rol kendi santralinin kökenlerini toplu doğrulayabilir', async () => {
    const a = await kokenAc(tesisA);
    const b = await kokenAc(tesisA);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kokenTopluDogrula({
      kokenIdler: [a.koken.id, b.koken.id], sonuc: 'dogrulandi', gerekce: 'saha turu',
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('KAPSAM DIŞI tek kayıt bütün partiyi durdurur — yarım onay bırakmaz [SAG-KOK-002]', async () => {
    /* Ön denetim hepsini birden yapar: biri kapsam dışıysa hiçbirine
       dokunulmaz. Yarım toplu onay, hangi kaydın kimin kararıyla
       doğrulandığını belirsiz bırakırdı. */
    const kendi = await kokenAc(tesisA);
    const yabanci = await kokenAc(tesisB);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kokenTopluDogrula({
      kokenIdler: [kendi.koken.id, yabanci.koken.id], sonuc: 'dogrulandi', gerekce: 'karışık parti',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: kendi.koken.id } }))
      .dogrulamaDurumu).toBe('dogrulanmadi');
  });
});
