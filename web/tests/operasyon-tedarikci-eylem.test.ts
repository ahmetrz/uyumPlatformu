import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Değişiklik kaydı + tedarikçi oturum kararı — kapsam kapısının son iki
   yerleşim yeri (`operasyon.ts`, `tedarikciOturum.ts`).

   İkisi de tesise bağlı kayıtlarla çalışır ve ikisinde de ön kapı
   kapsamsız çağrılıyordu: tesise kısıtlı rol kendi santralinin
   değişikliğini kaydedemiyor, kendi santralindeki tedarikçi oturumuna
   karar veremiyordu.

   `tedarikciOturum.ts`'de kapsamsız kayıt için AYRI bir mesaj vardı —
   "Santrali bilinmeyen oturumda karar vermek kapsamsız yetki ister" —
   ama kod bunu SÖYLEDİĞİ GİBİ YAPMIYORDU: `{ tesisId: null }` ile
   sorulan `izinVar`, `kapsamUyar` gereği tesise kısıtlı rolü reddetmez
   (`null` ile `undefined` farkı). Mesaj bir kural vaat ediyor, kapı onu
   uygulamıyordu; bugün yalnız ön kapının katılığı yüzünden görünmüyordu.
   Ön kapı gevşetilirken bu delik kapatıldı — testi aşağıda.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-operasyon-'));
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

const oturumKimlik = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'operasyon@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturumKimlik };
});

const { db } = await import('@/lib/db');
const { degisiklikKaydet } = await import('@/lib/eylemler2/operasyon');
const { oturumKarariKaydet } = await import('@/lib/eylemler2/tedarikciOturum');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturumKimlik.yetkiler;
  oturumKimlik.yetkiler = yetkiler;
  try { return await is(); } finally { oturumKimlik.yetkiler = onceki; }
}

let tesisA = '';
let tesisB = '';
let tedarikciId = '';

async function degisiklikAc(tesisId: string | null) {
  const baslik = benzersiz('Test değişikliği');
  expect(hataMetni(await degisiklikKaydet({ baslik, otMu: false, tesisId }))).toBe('');
  return db.degisiklik.findFirstOrThrow({ where: { baslik } });
}

async function oturumAc(tesisId: string | null) {
  return db.tedarikciErisimOturumu.create({ data: {
    tedarikciId, tesisId, baslangic: new Date(),
    kaynakSistem: 'TEST-PAM', kaynakKayitId: benzersiz('otr'),
    onayli: false, mfaVar: false, izlendi: true, durum: 'tamamlandi',
  } });
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturumKimlik.id = kisi.id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
  tedarikciId = (await db.tedarikci.findFirstOrThrow({ select: { id: true } })).id;
});

describe('Değişiklik kaydı', () => {
  it('yeni değişiklik SIRALI KOD alır', async () => {
    const d = await degisiklikAc(tesisA);
    expect(d.kod).toMatch(/^DGS-\d{4}$/);
    expect(d.talepEdenId).toBe(oturumKimlik.id);
  });

  it('boş başlık reddedilir', async () => {
    expect(hataMetni(await degisiklikKaydet({ baslik: '   ', otMu: false, tesisId: tesisA })))
      .not.toBe('');
  });

  it('tesise kısıtlı rol KENDİ tesisine değişiklik kaydedebilir', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => degisiklikKaydet({
      baslik: benzersiz('Kendi tesisi'), otMu: true, tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesise değişiklik kaydedemez', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => degisiklikKaydet({
      baslik: benzersiz('Başka tesis'), otMu: true, tesisId: tesisB,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol TESİSSİZ değişiklik kaydedemez', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => degisiklikKaydet({
      baslik: benzersiz('Kurumsal'), otMu: false,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('KAYDIN GERÇEK tesisi güncellemede de bağlayıcıdır', async () => {
    /* Girdi tesis taşımadan güncelleme yapılırsa kapı denetleyecek bir
       tesis bulamaz; kaydın kendi tesisi okunmazsa tesise kısıtlı rol
       başka santralin değişikliğini düzenleyebilirdi. */
    const d = await degisiklikAc(tesisB);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => degisiklikKaydet({
      id: d.id, baslik: 'Değişti', otMu: false,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.degisiklik.findUniqueOrThrow({ where: { id: d.id } })).baslik)
      .toBe(d.baslik);
  });

  it('okuyucu rolü değişiklik kaydedemez', async () => {
    const sonuc = await kimlikle([yetki('okuyucu')], () => degisiklikKaydet({
      baslik: benzersiz('x'), otMu: false, tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('Tedarikçi oturum kararı', () => {
  it('kapatma talebi GÖREV açar ve kanıtlı ihlalleri özete yazar', async () => {
    /* Karar altı ay sonra da okunabilmeli: hangi ihlaller görülerek
       verildiği özette durur. Bilinmeyen alan ihlal sayılmaz. */
    const o = await oturumAc(tesisA);
    expect(hataMetni(await oturumKarariKaydet({
      oturumId: o.id, karar: 'kapatma_talebi', gerekce: 'onaysız erişim tespit edildi',
    }))).toBe('');

    const gorev = await db.gorev.findFirstOrThrow({
      where: { tip: 'erisim_incelemesi', tesisId: tesisA },
      orderBy: { olusturuldu: 'desc' },
    });
    expect(gorev.otomatikUretildi).toBe(false);

    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikId: o.id }, orderBy: { zaman: 'desc' } });
    expect(iz.gerekce).toContain('onaysız erişim');
  });

  it('GEREKÇE en az on karakter olmalı', async () => {
    const o = await oturumAc(tesisA);
    expect(hataMetni(await oturumKarariKaydet({
      oturumId: o.id, karar: 'yanlis_pozitif', gerekce: 'olur',
    }))).toMatch(/10 karakter/);
  });

  it('geçersiz karar reddedilir', async () => {
    const o = await oturumAc(tesisA);
    expect(hataMetni(await oturumKarariKaydet({
      oturumId: o.id, karar: 'belki' as 'istisna', gerekce: 'yeterince uzun gerekçe',
    }))).toMatch(/geçersiz karar/i);
  });

  it('olmayan oturuma karar verilemez', async () => {
    expect(hataMetni(await oturumKarariKaydet({
      oturumId: 'yok-boyle-bir-id', karar: 'istisna', gerekce: 'yeterince uzun gerekçe',
    }))).toMatch(/bulunamadı/i);
  });

  it('tesise kısıtlı rol KENDİ santralinin oturumuna karar verebilir', async () => {
    const o = await oturumAc(tesisA);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => oturumKarariKaydet({
      oturumId: o.id, karar: 'yanlis_pozitif', gerekce: 'bizim planlı bakımımız',
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA santralin oturumuna karar veremez', async () => {
    const o = await oturumAc(tesisB);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => oturumKarariKaydet({
      oturumId: o.id, karar: 'istisna', gerekce: 'başka sahanın oturumu',
    }));
    expect(hataMetni(sonuc)).toMatch(/kapsamında yetkiniz yok/i);
  });

  it('SANTRALİ BİLİNMEYEN oturum kapsamsız yetki ister', async () => {
    /* Mesajın söylediği kural burada uygulanıyor mu diye sorar. Kapsamsız
       kayıt `{}` ile sorulmalı; `{ tesisId: null }` ile sorulursa
       `kapsamUyar` tesise kısıtlı rolü reddetmez ve mesaj yalan söyler. */
    const o = await oturumAc(null);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => oturumKarariKaydet({
      oturumId: o.id, karar: 'istisna', gerekce: 'santrali bilinmiyor',
    }));
    expect(hataMetni(sonuc)).toMatch(/kapsamsız yetki ister/i);

    // Kapsamsız rol aynı kararı verebilir.
    expect(hataMetni(await oturumKarariKaydet({
      oturumId: o.id, karar: 'istisna', gerekce: 'kurumsal karar verildi',
    }))).toBe('');
  });

  it('okuyucu rolü oturum kararı veremez', async () => {
    const o = await oturumAc(tesisA);
    const sonuc = await kimlikle([yetki('okuyucu')], () => oturumKarariKaydet({
      oturumId: o.id, karar: 'istisna', gerekce: 'yeterince uzun gerekçe',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});
