import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Süreç kapsamı — ekleme ile ÇIKARMA aynı kapıdan geçer

   `surecKapsamEkle` kapsamı ön kapıya gerçek değerlerle veriyordu
   (`{ tesisId, surecId }`), `surecKapsamCikar` ise KAPSAMSIZ çağırıyordu.
   Sonuç asimetrikti ve gözle görünmüyordu: tesise kısıtlı bir yönetici
   kendi santralini bir sürecin kapsamına EKLEYEBİLİYOR ama aynı
   santrali ÇIKARAMIYORDU.

   Çıkarmanın onay yetkisi istemesi doğrudur ve korunuyor — değişen tek
   şey, sorunun kapsamlı sorulması.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-surec-kapsam-'));
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

const oturum = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'kapsam@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { surecKapsamEkle, surecKapsamCikar } = await import('@/lib/eylemler');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const REDDEDILDI = /yetki|kapsam/i;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let surecId = '';
let tesisA = '';
let tesisB = '';

/** Kapsamda olmadığından emin olur (test kendi zeminini kurar). */
async function kapsamdanKaldir(tesisId: string) {
  await db.surecKapsami.deleteMany({ where: { surecId, tesisId } });
}
const kapsamdaMi = async (tesisId: string) =>
  (await db.surecKapsami.count({ where: { surecId, tesisId } })) > 0;

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
  surecId = (await db.uyumSureci.findFirstOrThrow({ select: { id: true } })).id;
  const tesisler = await db.tesis.findMany({
    select: { id: true }, take: 2, orderBy: { kod: 'asc' },
  });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('surecKapsamCikar — ekleme ile aynı kapı', () => {
  it('tesise kısıtlı rol KENDİ santralini ekleyebiliyorsa ÇIKARABİLMELİ de', async () => {
    /* Asimetrinin kendisi: ekleme kapsamlı, çıkarma kapsamsızdı. */
    const kisitli = [yetki('yonetici', tesisA)];
    await kapsamdanKaldir(tesisA);

    expect(hataMetni(await kimlikle(kisitli,
      () => surecKapsamEkle({ surecId, tesisId: tesisA })))).toBe('');
    expect(await kapsamdaMi(tesisA)).toBe(true);

    expect(hataMetni(await kimlikle(kisitli,
      () => surecKapsamCikar({ surecId, tesisId: tesisA })))).toBe('');
    expect(await kapsamdaMi(tesisA)).toBe(false);
  });

  it('BAŞKA santrali kapsamdan çıkaramaz', async () => {
    await kapsamdanKaldir(tesisB);
    expect(hataMetni(await surecKapsamEkle({ surecId, tesisId: tesisB }))).toBe('');

    expect(hataMetni(await kimlikle([yetki('yonetici', tesisA)],
      () => surecKapsamCikar({ surecId, tesisId: tesisB })))).toMatch(REDDEDILDI);
    expect(await kapsamdaMi(tesisB)).toBe(true);
  });

  it('ÇIKARMA onay yetkisi ister — yazma yetmez', async () => {
    /* `tesis_yoneticisi` uyum/yazma taşır, uyum/onay taşımaz: kendi
       santralini ekleyebilir ama çıkaramaz. Bu bir kusur değil, kuralın
       kendisidir ve kapsamlı sorulunca da korunmalıdır. */
    await kapsamdanKaldir(tesisA);
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => surecKapsamEkle({ surecId, tesisId: tesisA })))).toBe('');
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => surecKapsamCikar({ surecId, tesisId: tesisA })))).toMatch(REDDEDILDI);
    expect(await kapsamdaMi(tesisA)).toBe(true);
  });

  it('kapsamsız yönetici her santrali çıkarabilir ve iz düşer', async () => {
    expect(hataMetni(await surecKapsamCikar({ surecId, tesisId: tesisA }))).toBe('');
    expect(await kapsamdaMi(tesisA)).toBe(false);
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'UyumSureci', varlikId: surecId, eylem: 'kapsam_degisimi' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.yeniDeger).toMatch(/çıkarıldı/i);
  });

  it('okuyucu kapsamdan çıkaramaz', async () => {
    await kapsamdanKaldir(tesisA);
    expect(hataMetni(await surecKapsamEkle({ surecId, tesisId: tesisA }))).toBe('');
    expect(hataMetni(await kimlikle([yetki('okuyucu')],
      () => surecKapsamCikar({ surecId, tesisId: tesisA })))).toMatch(REDDEDILDI);
    expect(await kapsamdaMi(tesisA)).toBe(true);
  });
});
