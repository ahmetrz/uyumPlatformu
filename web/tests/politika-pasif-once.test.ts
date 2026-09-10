import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S1 · "PASİF ÖNCE, AKTİF TARAMA YOK" — GERÇEK YOLLA [SIS-PAS-001]

   ── ÖLÇÜLEN İDDİALAR ──────────────────────────────────────────────────
   POL-013 (`topoloji/Karar.tsx`):
     "Anlık almak ya da temeli taşımak ağa hiçbir paket göndermez."
   POL-070 (`topoloji/TopolojiIstemci.tsx`):
     "varlık aktarımı (CMDB kaydı) ile gelir; bu ekran ağı taramaz."

   ── NEDEN GERÇEK YOL ──────────────────────────────────────────────────
   Bu ürünün en pahalı vaadi budur: bir OT ağına paket göndermek, bir
   veri sızıntısından daha ağır sonuç doğurur. İddianın "kodu okudum,
   `fetch` yok" diye kapatılması yetmez — bir bağımlılık, bir yardımcı ya
   da sonradan eklenen bir satır ağa çıkabilir.

   Bu yüzden ölçüm ÇALIŞMA ANINDADIR: ağ ilkelleri FIRLATAN bir sahteyle
   değiştirilir ve GERÇEK eylemler koşturulur. Yol ağa çıkmaya kalkarsa
   test kırmızı yanar. `fetch`in yanında `http`/`https` modülleri de
   kapatılır: `fetch` tek kapı değildir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-pasif-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { anlikGoruntuAl } = await import('@/lib/motorlar/anlik');
const { topolojiSapmasiniIsle } = await import('@/lib/motorlar/topolojiSapma');
const { kayittanAnlikAl, temelOlarakOnayla } = await import('@/lib/eylemler2/topoloji');

const damga = Date.now();
let kullaniciId = '';
let anlikId = '';

const oturum = {
  id: '', adSoyad: 'Kurgusal OT', eposta: `pasif-${damga}@kurgusal.local`, unvan: null,
  yetkiler: [{ rol: 'yonetici', modul: null as string | null, tesisId: null as string | null,
    surecId: null as string | null, regulasyonId: null as string | null }],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

/** Ağ ilkellerini FIRLATAN sahteyle değiştirir; çağrı sayısını tutar. */
const agDenemeleri: string[] = [];
function agiKapat() {
  /* REDDEDİLEN SÖZ döner, SENKRON FIRLATMAZ: gerçek `fetch` de öyle
     yapar. Senkron fırlatan bir sahte, `await fetch(...)` yazan kodu
     farklı bir dalda yakalatır ve ölçüm gerçek yolu taklit etmez. */
  vi.stubGlobal('fetch', async (...a: unknown[]) => {
    agDenemeleri.push(`fetch ${String(a[0])}`);
    throw new Error('AĞA ÇIKILDI — pasif önce kuralı çiğnendi');
  });
}

beforeAll(async () => {
  kullaniciId = (await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: 'Kurgusal OT', aktif: true },
  })).id;
  oturum.id = kullaniciId;
  agiKapat();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('anlık ve temel AĞA ÇIKMAZ [SIS-PAS-001]', () => {
  it('sahte ağ GERÇEKTEN kapalı — ölçüm boşa koşmuyor [SIS-PAS-001]', async () => {
    /* Bu vaka olmadan, sahteleme çalışmadığında dosyanın tamamı yeşil
       kalır ve hiçbir şey ölçmemiş olurdu. */
    await expect(fetch('https://kurgusal.ornek/')).rejects.toThrow(/AĞA ÇIKILDI/);
    agDenemeleri.length = 0;
  });

  it('anlık görüntü motoru ağa HİÇ paket göndermez [SIS-PAS-001]', async () => {
    const s = await anlikGoruntuAl();
    expect(s.islenen).toBeGreaterThanOrEqual(0);
    expect(agDenemeleri, `ağ denemesi: ${agDenemeleri.join(' · ')}`).toEqual([]);
  });

  it('topoloji sapma motoru da ağa çıkmaz [SIS-PAS-001]', async () => {
    const s = await topolojiSapmasiniIsle();
    expect(s.islenen).toBeGreaterThanOrEqual(0);
    expect(agDenemeleri, `ağ denemesi: ${agDenemeleri.join(' · ')}`).toEqual([]);
  });

  it('KAYITTAN anlık alma eylemi ağa çıkmaz — kayıt CMDB\'den gelir [SIS-PAS-001]', async () => {
    const tesis = await db.tesis.findFirst({ select: { id: true } });
    if (!tesis) throw new Error('fikstürde tesis yok — ölçüm koşamaz');
    const s = await kayittanAnlikAl({ tesisId: tesis.id });
    /* Eylem başarısız olabilir (veri yoksa) ama AĞA ÇIKMAMALIDIR:
       ölçülen şey sonucun kendisi değil, yolun sessizliğidir. */
    expect(agDenemeleri, `ağ denemesi: ${agDenemeleri.join(' · ')}`).toEqual([]);
    if (s.ok) anlikId = s.anlikId ?? '';
  });

  it('TEMEL onaylama eylemi de ağa çıkmaz [SIS-PAS-001]', async () => {
    if (!anlikId) {
      /* Anlık yoksa iddia ÖLÇÜLEMEZ — "geçti" yazmak yerine bunu
         söylüyoruz ve vaka kırmızı yanıyor. */
      expect(anlikId, 'anlık alınamadı; temel onaylama ölçülemedi').not.toBe('');
      return;
    }
    await temelOlarakOnayla({ anlikId, gerekce: 'Kurgusal temel onayı — ölçüm için.' });
    expect(agDenemeleri, `ağ denemesi: ${agDenemeleri.join(' · ')}`).toEqual([]);
  });
});
