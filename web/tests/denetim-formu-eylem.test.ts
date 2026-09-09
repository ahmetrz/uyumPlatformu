import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════════
   DENETİM FORMU EYLEMİ — kapsam denetimi ve boş hücre kapısı

   Saf katman (`lib/denetim/`) veritabanısız ölçülüyor; bu dosya EYLEMİ
   ölçer: kapsam yetkiden gelir, kapsam dışı istek REDDEDİLİR (sessizce
   daraltılmaz), ve üretilen dosyada boş hücre yoktur.

   Veritabanı izole kopyadır; `TEST_DB` db'ye dokunan her importtan ÖNCE
   ayarlanır.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-dnt-frm-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Aktör MUTABLE bir tutucudan okunur: aynı dosyada hem tam yetkili hem
   kısıtlı kullanıcı ölçülecek ve modül düzeyi mock bir kez kurulur. */
/* AKTÖR GERÇEK BİR KULLANICI OLMALI: iz kaydı `aktorId` üstünden yabancı
   anahtar taşır ve uydurma bir kimlik kısıtı ihlal eder. Ölçüldü — form
   üretiliyor, `iz()` düşüyor ve eylem "ok: false" dönüyordu; yani iz
   yazılamadığında ürün formu VERMİYOR ve bu doğru davranıştır: denetim
   izine yazılmayan bir dışa aktarım, olmamış sayılır. */
const aktor: {
  id: string;
  yetkiler: { rol: string; tesisId: string | null; modul: string | null }[];
} = { id: '', yetkiler: [{ rol: 'yonetici', tesisId: null, modul: null }] };
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return {
    ...gercek,
    aktifKullanici: async () => ({
      id: aktor.id, adSoyad: 'Form Testi', eposta: 'form@test', unvan: null,
      yetkiler: aktor.yetkiler.map((y) => ({
        rol: y.rol, surecId: null, tesisId: y.tesisId, tuzelKisiId: null,
        regulasyonId: null, modul: y.modul,
      })),
    }),
  };
});

const { db } = await import('@/lib/db');
const { denetimFormuUretEylem } = await import('@/lib/eylemler2/denetimFormu');

/* Fikstürdeki ilk kullanıcı aktör olur; kimliği testin başında bir kez
   okunur ve mock onu kullanır. */
const aktoruKur = async () => {
  if (aktor.id) return;
  const k = await db.kullanici.findFirst({ select: { id: true } });
  if (!k) throw new Error('Fikstürde kullanıcı yok');
  aktor.id = k.id;
};

const kapsam = async () => {
  const satir = await db.maddeDurumu.findFirst({
    where: { kapsamOgesi: { tesisId: { not: null } } },
    select: {
      kapsamOgesi: { select: { tesisId: true } },
      surec: { select: { regulasyonId: true } },
    },
  });
  if (!satir?.kapsamOgesi.tesisId) throw new Error('Fikstürde kapsamlı madde durumu yok');
  return { tesisId: satir.kapsamOgesi.tesisId, regulasyonId: satir.surec.regulasyonId };
};

describe('denetim formu eylemi', () => {
  it('öz denetim formu üretilir; BOŞ HÜCRE SIFIR [DNT-FRM-001]', async () => {
    await aktoruKur();
    aktor.yetkiler = [{ rol: 'yonetici', tesisId: null, modul: null }];
    const { tesisId, regulasyonId } = await kapsam();
    const s = await denetimFormuUretEylem({
      regulasyonId, tesisIdleri: [tesisId], tur: 'oz_denetim',
    });
    expect(s.ok, s.ok ? '' : JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.olcum.bosHucre).toBe(0);
    expect(s.olcum.satir).toBeGreaterThan(0);
    /* HER ÇAĞRI İZ BIRAKIR — sayılarla. */
    const izSatiri = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'DenetimFormu', eylem: 'olusturma' },
      orderBy: { zaman: 'desc' }, select: { gerekce: true },
    });
    expect(izSatiri?.gerekce).toContain('boş 0');
    expect(s.olcum.hucre).toBe(s.olcum.satir * 9);
    expect(s.csvAdi).toMatch(/\.csv$/);
    expect(s.xlsxAdi).toMatch(/\.xlsx$/);
    /* XLSX gövdesi ZIP'tir; base64 çözümü "PK" ile başlamalı — boş ya da
       metin bir gövde denetçinin açamadığı bir dosya olurdu. */
    expect(Buffer.from(s.xlsxBase64, 'base64').subarray(0, 2).toString()).toBe('PK');
    /* CSV Excel için BOM ile başlar; olmadan Türkçe karakter bozulur. */
    expect(s.csv.startsWith('﻿')).toBe(true);
  });

  it('SoA da aynı kapıdan geçer ve yedi sütun taşır [DNT-FRM-001]', async () => {
    await aktoruKur();
    aktor.yetkiler = [{ rol: 'yonetici', tesisId: null, modul: null }];
    const { tesisId, regulasyonId } = await kapsam();
    const s = await denetimFormuUretEylem({
      regulasyonId, tesisIdleri: [tesisId], tur: 'soa',
    });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    if (!s.ok) return;
    expect(s.olcum.bosHucre).toBe(0);
    expect(s.olcum.hucre).toBe(s.olcum.satir * 7);
  });

  it('KAPSAM DIŞI istek REDDEDİLİR — sessizce daraltılmaz [DNT-FRM-003]', async () => {
    /* Yetki tek tesise kısıtlı; istenen tesis başka. Sessiz daraltma
       denetçiye eksik bir formu TAM sanarak vermek olurdu. */
    await aktoruKur();
    const { regulasyonId } = await kapsam();
    aktor.yetkiler = [{ rol: 'dis_denetci', tesisId: 'baska-tesis-id', modul: 'denetim' }];
    const s = await denetimFormuUretEylem({
      regulasyonId, tesisIdleri: ['istenen-tesis-id'], tur: 'oz_denetim',
    });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.hata).toMatch(/kapsam|yetki/i);
    /* Hangi tesisin dışarıda kaldığı SIZMAZ — kaç tanesi söylenir. */
    expect(s.hata).not.toContain('istenen-tesis-id');
  });

  it('DENETİM MODÜLÜNDE yetkisi olmayan form üretemez [DNT-FRM-003]', async () => {
    await aktoruKur();
    const { tesisId, regulasyonId } = await kapsam();
    aktor.yetkiler = [{ rol: 'risk_sahibi', tesisId: null, modul: 'risk' }];
    const s = await denetimFormuUretEylem({
      regulasyonId, tesisIdleri: [tesisId], tur: 'oz_denetim',
    });
    expect(s.ok).toBe(false);
  });
});
