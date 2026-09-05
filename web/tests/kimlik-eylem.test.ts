import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Kimlik ve erişim yönetimi (§9) — davranış + santral kapsamı

   `lib/eylemler2/kimlik.ts` %27,9 kapsamdaydı ve üç eyleminin ÜÇÜ DE
   kapsamsız korunuyordu. Oysa `KimlikHesabi.tesisId` şemada VAR: bir
   hesap bir santrale ait olabilir, erişim ataması da o hesaba bağlıdır.

   Kusur çift yönlüydü ve ikisi de gerçek:
     · Santral yöneticisi KENDİ santralinin servis hesabını
       düzenleyemiyordu (aşırı katılık),
     · kapı gevşetilirken kaydın kendi santrali sorulmasaydı, başka
       santralin hesabına erişim atanabilirdi (yetki yükseltmesi).
   Bu yüzden hem HEDEF hem KAYDIN KENDİ santrali denetleniyor.

   Ayrıca çivilenen ürün kuralları:
     · `ayricalikli` ÜÇ DURUMLUDUR — null "ölçülmedi", false "hayır",
     · aynı (hesap · varlık · kapsam) üçlüsüne İKİNCİ satır açılmaz;
       seviye değişimi yeni erişim değil, mevcut erişimin değişimidir,
     · "kaldırılsın" kararı atamayı bitiş damgasıyla kapatır.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kimlik-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'kimlik@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { hesapKaydet, erisimAta, erisimIncele } = await import('@/lib/eylemler2/kimlik');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

/* Kapı iki ayrı cümleyle reddedebilir — "yetkiniz yok" (modül kapısı) ya
   da "kapsamınızda değil" (santral kapısı). İkisi de reddir; test
   hangisinin geldiğine değil, REDDEDİLDİĞİNE bakar. */
const REDDEDILDI = /yetki|kapsam/i;

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = '';
let tesisB = '';

/** Belirli santralde hesap açar (kapı denenmeden, doğrudan). */
async function hesapAc(tesisId: string | null) {
  return db.kimlikHesabi.create({ data: {
    hesapAdi: benzersiz('svc'), tip: 'servis', tesisId, ayricalikli: null,
  } });
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
  const tesisler = await db.tesis.findMany({
    select: { id: true }, take: 2, orderBy: { kod: 'asc' },
  });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('hesapKaydet', () => {
  it('yeni hesap açar; ayricalikli ÜÇ DURUMLUDUR', async () => {
    const ad = benzersiz('svc-yeni');
    expect(hataMetni(await hesapKaydet({
      hesapAdi: ad, tip: 'servis', tesisId: tesisA, ayricalikli: null,
    }))).toBe('');
    const h = await db.kimlikHesabi.findUniqueOrThrow({ where: { hesapAdi: ad } });
    // null "ölçülmedi"dir; formu açan kullanıcı "hayır" demiş sayılmaz.
    expect(h.ayricalikli).toBeNull();

    expect(hataMetni(await hesapKaydet({
      id: h.id, hesapAdi: ad, tip: 'servis', tesisId: tesisA, ayricalikli: false,
    }))).toBe('');
    expect((await db.kimlikHesabi.findUniqueOrThrow({ where: { id: h.id } })).ayricalikli)
      .toBe(false);
  });

  it('durum değişimi ayrı iz satırı bırakır', async () => {
    const h = await hesapAc(tesisA);
    expect(hataMetni(await hesapKaydet({
      id: h.id, hesapAdi: h.hesapAdi, tip: 'servis',
      tesisId: tesisA, ayricalikli: null, durum: 'askida',
    }))).toBe('');
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'KimlikHesabi', varlikId: h.id, alan: 'durum' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.oncekiDeger).toBe('aktif');
    expect(iz?.yeniDeger).toBe('askida');
  });

  it('tesise kısıtlı rol KENDİ santralinin hesabını açabilir', async () => {
    const ad = benzersiz('svc-kendi');
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => hesapKaydet({
      hesapAdi: ad, tip: 'servis', tesisId: tesisA, ayricalikli: null,
    })))).toBe('');
    expect(await db.kimlikHesabi.count({ where: { hesapAdi: ad } })).toBe(1);
  });

  it('BAŞKA santralde hesap açamaz', async () => {
    const ad = benzersiz('svc-yabanci');
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => hesapKaydet({
      hesapAdi: ad, tip: 'servis', tesisId: tesisB, ayricalikli: null,
    })))).toMatch(REDDEDILDI);
    expect(await db.kimlikHesabi.count({ where: { hesapAdi: ad } })).toBe(0);
  });

  it('BAŞKA santralin hesabını KENDİ santraline TAŞIYAMAZ', async () => {
    /* Hedefi denetleyip kaydın kendisini denetlemeyen bir kapı, yabancı
       bir hesabı "kendi santralime al" diyerek ele geçirmeye izin
       verirdi. İki soru da soruluyor. */
    const yabanci = await hesapAc(tesisB);
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => hesapKaydet({
      id: yabanci.id, hesapAdi: yabanci.hesapAdi, tip: 'servis',
      tesisId: tesisA, ayricalikli: null,
    })))).toMatch(REDDEDILDI);
    expect((await db.kimlikHesabi.findUniqueOrThrow({ where: { id: yabanci.id } })).tesisId)
      .toBe(tesisB);
  });

  it('SANTRALSİZ (kurumsal) hesap kapsamsız yetki ister [KIM-HSP-001]', async () => {
    const ad = benzersiz('svc-kurumsal');
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => hesapKaydet({
      hesapAdi: ad, tip: 'servis', tesisId: null, ayricalikli: null,
    })))).toMatch(REDDEDILDI);
    expect(hataMetni(await hesapKaydet({
      hesapAdi: ad, tip: 'servis', tesisId: null, ayricalikli: null,
    }))).toBe('');
  });

  it('okuyucu hesap yazamaz; sözlük dışı tip reddedilir', async () => {
    expect(hataMetni(await kimlikle([yetki('okuyucu')], () => hesapKaydet({
      hesapAdi: benzersiz('svc-ret'), tip: 'servis', tesisId: tesisA, ayricalikli: null,
    })))).toMatch(REDDEDILDI);
    expect(hataMetni(await hesapKaydet({
      hesapAdi: benzersiz('svc-tip'), tip: 'robot', tesisId: tesisA, ayricalikli: null,
    }))).not.toBe('');
  });
});

describe('erisimAta', () => {
  it('atama açar ve İKİNCİ satırı açmaz', async () => {
    const h = await hesapAc(tesisA);
    expect(hataMetni(await erisimAta({
      hesapId: h.id, kapsam: 'scada', yetkiSeviyesi: 'okuma',
    }))).toBe('');

    // Aynı üçlü: seviye değişse bile yeni satır AÇILMAZ.
    const ikinci = await erisimAta({
      hesapId: h.id, kapsam: 'scada', yetkiSeviyesi: 'yonetici',
    });
    expect(hataMetni(ikinci)).toMatch(/zaten var/i);
    expect(hataMetni(ikinci)).toMatch(/erişim incelemesi/i);
    expect(await db.erisimAtamasi.count({ where: { hesapId: h.id } })).toBe(1);
  });

  it('tesise kısıtlı rol KENDİ santralinin hesabına atama yapar, yabancıya YAPAMAZ', async () => {
    const kendi = await hesapAc(tesisA);
    const yabanci = await hesapAc(tesisB);
    const kisitli = [yetki('tesis_yoneticisi', tesisA)];

    expect(hataMetni(await kimlikle(kisitli, () => erisimAta({
      hesapId: kendi.id, kapsam: 'hmi', yetkiSeviyesi: 'okuma',
    })))).toBe('');
    expect(hataMetni(await kimlikle(kisitli, () => erisimAta({
      hesapId: yabanci.id, kapsam: 'hmi', yetkiSeviyesi: 'yonetici',
    })))).toMatch(REDDEDILDI);
    expect(await db.erisimAtamasi.count({ where: { hesapId: yabanci.id } })).toBe(0);
  });

  it('olmayan hesaba atama yapılamaz', async () => {
    expect(hataMetni(await erisimAta({
      hesapId: 'yok-boyle-hesap', kapsam: 'x', yetkiSeviyesi: 'okuma',
    }))).not.toBe('');
  });
});

describe('erisimIncele', () => {
  it('"kaldırılsın" atamayı bitiş damgasıyla kapatır', async () => {
    const h = await hesapAc(tesisA);
    await erisimAta({ hesapId: h.id, kapsam: 'tarih', yetkiSeviyesi: 'okuma' });
    const atama = await db.erisimAtamasi.findFirstOrThrow({ where: { hesapId: h.id } });

    expect(hataMetni(await erisimIncele({
      atamaId: atama.id, sonuc: 'kaldirilsin', not: 'kişi ayrıldı',
    }))).toBe('');
    expect((await db.erisimAtamasi.findUniqueOrThrow({ where: { id: atama.id } })).bitis)
      .not.toBeNull();
    expect(await db.erisimIncelemesi.count({ where: { atamaId: atama.id } })).toBe(1);
  });

  it('"onaylandı" atamayı KAPATMAZ ama inceleme satırı bırakır', async () => {
    const h = await hesapAc(tesisA);
    await erisimAta({ hesapId: h.id, kapsam: 'onay', yetkiSeviyesi: 'okuma' });
    const atama = await db.erisimAtamasi.findFirstOrThrow({ where: { hesapId: h.id } });

    expect(hataMetni(await erisimIncele({ atamaId: atama.id, sonuc: 'onaylandi' }))).toBe('');
    expect((await db.erisimAtamasi.findUniqueOrThrow({ where: { id: atama.id } })).bitis)
      .toBeNull();
    expect(await db.erisimIncelemesi.count({ where: { atamaId: atama.id } })).toBe(1);
  });

  it('tesise kısıtlı rol YABANCI santralin atamasını inceleyemez', async () => {
    const yabanci = await hesapAc(tesisB);
    await erisimAta({ hesapId: yabanci.id, kapsam: 'x', yetkiSeviyesi: 'okuma' });
    const atama = await db.erisimAtamasi.findFirstOrThrow({ where: { hesapId: yabanci.id } });

    expect(hataMetni(await kimlikle([yetki('yonetici', tesisA)], () => erisimIncele({
      atamaId: atama.id, sonuc: 'kaldirilsin',
    })))).toMatch(REDDEDILDI);
    expect((await db.erisimAtamasi.findUniqueOrThrow({ where: { id: atama.id } })).bitis)
      .toBeNull();
  });

  it('inceleme ONAY yetkisi ister — yazma yetmez', async () => {
    const h = await hesapAc(tesisA);
    await erisimAta({ hesapId: h.id, kapsam: 'yetki', yetkiSeviyesi: 'okuma' });
    const atama = await db.erisimAtamasi.findFirstOrThrow({ where: { hesapId: h.id } });
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => erisimIncele({ atamaId: atama.id, sonuc: 'onaylandi' })))).toMatch(REDDEDILDI);
  });
});
