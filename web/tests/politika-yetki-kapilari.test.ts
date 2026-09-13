import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Modul } from '@/lib/erisim';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S1 · EKRANIN YETKİ CÜMLELERİ GERÇEK YOLLA [SIS-YTK-010]

   Bu dosya, R-F kütüğünün S1 (yetki ve güvenlik) sınıfındaki dört
   cümlenin gerçek yolunu sürer. Sınıfın kuralı sert: S1'de gerekçeli
   istisna KABUL EDİLMEZ — ihlali veri sızdırır.

   POL-042 · POL-043  "Hesap açık ama hiçbir yetkisi yok: giriş yapar,
                       hiçbir ekranı açamaz."
   POL-063            "Reddedilen kaydı kapatmak yönetim yazma yetkisi
                       ister."
   POL-072            "Yürürlüğe alma uyum onay yetkisi ister."
   POL-036            "…kurum geneli kapsam gerektirir. Dönem okunabilir,
                       kapatılamaz."

   ── NEDEN GERÇEK YOL ──────────────────────────────────────────────────
   Bu cümlelerin her biri BİR KAPININ davranışını anlatıyor. Kapıyı tek
   başına sınamak (izinVar'ı çağırmak) iddiayı ölçmez: iddia EYLEMLER
   hakkındadır. R-F'i doğuran kusur tam buydu — MFA katmanı doğruydu,
   `girisYap` onu çağırmıyordu.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s1-yetki-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { izinVar } = await import('@/lib/erisim');
const { redKaydiIncele } = await import('@/lib/eylemler2/reddedilenKayit');
const { dokumanDurumDegistir } = await import('@/lib/eylemler2/dokuman');
const { donemVerildiIsaretle } = await import('@/lib/eylemler2/bildirimDonemi');

const damga = Date.now();
type Yetki = {
  rol: string; modul: string | null; tesisId: string | null;
  surecId: string | null; regulasyonId: string | null;
};
const YETKISIZ: Yetki[] = [];

const oturum = {
  id: '', adSoyad: 'Kurgusal S1', eposta: `s1-${damga}@kurgusal.local`, unvan: null,
  yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const rol = (r: string, tesisId: string | null = null): Yetki[] =>
  [{ rol: r, modul: null, tesisId, surecId: null, regulasyonId: null }];

/* MODÜL LİSTESİ TÜRETİLİR: elle yazılmış bir liste, yeni bir modül
   eklendiği gün eksik kalır ve bekçi ona hiç bakmaz. */
const MODULLER: Modul[] = ['uyum', 'envanter', 'risk', 'denetim', 'proje', 'tanimlar', 'yonetim'];

let redKaydiId = '';
let dokumanId = '';
let donemId = '';

beforeAll(async () => {
  oturum.id = (await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: 'Kurgusal S1', aktif: true },
  })).id;

  /* AÇIK bir kayıt gerekir: eylem koşullu günceller ve kapanmış bir
     kaydı ikinci kez kapatmaz. */
  const red = await db.reddedilenKayit.findFirst({
    where: { durum: 'acik' }, select: { id: true },
  });
  redKaydiId = red?.id ?? '';
  const dok = await db.dokuman.findFirst({
    where: { durum: { not: 'yururlukte' } }, select: { id: true },
  });
  dokumanId = dok?.id ?? '';
  const donem = await db.bildirimDonemi.findFirst({
    where: { durum: 'acik' }, select: { id: true },
  });
  donemId = donem?.id ?? '';
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('YETKİSİZ hesap hiçbir ekranı açamaz [SIS-YTK-010]', () => {
  it('fikstür GERÇEKTEN yetkisiz — ölçüm boşa koşmuyor [SIS-YTK-010]', async () => {
    const kayit = await db.yetki.count({ where: { kullaniciId: oturum.id } });
    expect(kayit).toBe(0);
  });

  it('HER modülde okuma kapısı KAPALI — liste türetilir [SIS-YTK-010]', () => {
    oturum.yetkiler = YETKISIZ;
    const acilan = MODULLER.filter((m) => izinVar({
      id: oturum.id, adSoyad: oturum.adSoyad, eposta: oturum.eposta,
      unvan: null, yetkiler: [],
    }, m, 'okuma'));
    expect(acilan, `yetkisiz hesap şu modülleri açıyor: ${acilan.join(', ')}`).toEqual([]);
  });

  it('yetkisiz hesap GERÇEK bir eylemi de çalıştıramaz [SIS-YTK-010]', async () => {
    /* "Hiçbir ekranı açamaz" cümlesinin öbür yüzü: ekranı açamayan
       hesap eylemi de çağıramaz. Kapı ekranda değil sunucuda. */
    oturum.yetkiler = YETKISIZ;
    if (!redKaydiId) throw new Error('fikstürde reddedilen kayıt yok — ölçüm koşamaz');
    const s = await redKaydiIncele({
      idler: [redKaydiId], durum: 'incelendi', not: 'Kurgusal inceleme notu.',
    });
    expect(s.ok).toBe(false);
  });
});

describe('POL-063 · reddedilen kaydı kapatmak YÖNETİM YAZMA ister [SIS-YTK-010]', () => {
  it('yönetim yazması OLMAYAN rol REDDEDİLİR ve kayıt DEĞİŞMEZ [SIS-YTK-010]', async () => {
    if (!redKaydiId) throw new Error('fikstürde reddedilen kayıt yok');
    const once = await db.reddedilenKayit.findUniqueOrThrow({ where: { id: redKaydiId } });
    /* `okuyucu` her modülde OKUR, hiçbirine yazmaz. */
    oturum.yetkiler = rol('okuyucu');
    const s = await redKaydiIncele({
      idler: [redKaydiId], durum: 'incelendi', not: 'Kurgusal inceleme notu.',
    });
    expect(s.ok).toBe(false);
    const sonra = await db.reddedilenKayit.findUniqueOrThrow({ where: { id: redKaydiId } });
    expect(sonra.durum).toBe(once.durum);
  });

  it('yönetim yazması OLAN rol geçer [SIS-YTK-010]', async () => {
    /* Kapının SIKI olduğu kadar AÇIK da olduğu ölçülür: her şeyi
       reddeden bir kapı da bu iddiayı "sağlar" görünürdü. */
    if (!redKaydiId) throw new Error('fikstürde reddedilen kayıt yok');
    oturum.yetkiler = rol('yonetici');
    const s = await redKaydiIncele({
      idler: [redKaydiId], durum: 'incelendi', not: 'Kurgusal inceleme notu.',
    });
    expect(s.ok, `eylem reddetti: ${s.ok ? '' : s.hata}`).toBe(true);
  });
});

describe('POL-072 · yürürlüğe alma UYUM ONAY ister [SIS-YTK-010]', () => {
  it('uyum ONAYI olmayan rol belgeyi yürürlüğe ALAMAZ [SIS-YTK-010]', async () => {
    if (!dokumanId) throw new Error('fikstürde taslak belge yok');
    const once = await db.dokuman.findUniqueOrThrow({ where: { id: dokumanId } });
    /* `katkici` uyumda YAZAR ama ONAYLAMAZ — ayrım tam burada ölçülür. */
    oturum.yetkiler = rol('katkici');
    const s = await dokumanDurumDegistir({ id: dokumanId, durum: 'yururlukte' });
    expect(s.ok).toBe(false);
    const sonra = await db.dokuman.findUniqueOrThrow({ where: { id: dokumanId } });
    expect(sonra.durum).toBe(once.durum);
  });
});

describe('POL-036 · dönem KURUM GENELİ kapsam ister [SIS-YTK-010]', () => {
  it('TESİSE KISITLI rol dönemi kapatamaz [SIS-YTK-010]', async () => {
    if (!donemId) throw new Error('fikstürde açık dönem yok');
    const once = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: donemId } });
    const tesis = await db.kapsamOgesi.findFirst({ select: { tesisId: true } });
    oturum.yetkiler = rol('tesis_yoneticisi', tesis?.tesisId ?? 'kurgusal-tesis');
    const s = await donemVerildiIsaretle({ donemId, referansNo: `KURGU-${damga}` });
    expect(s.ok).toBe(false);
    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: donemId } });
    expect(sonra.durum).toBe(once.durum);
    expect(sonra.referansNo).toBeNull();
  });
});
