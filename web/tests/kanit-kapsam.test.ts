import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Kanıt ekleme — kapsam kapısı

   `kanitEkle` kanıtı bir `MaddeDurumu`'na bağlar ve o modelde `tesisId`
   ZORUNLUDUR (`String`, nullable değil): her kanıt tam olarak bir
   santrale aittir. Buna rağmen ön kapı kapsamsız çağrılıyordu, yani
   santral yöneticisi KENDİ santralinin maddesine kanıt ekleyemiyordu.

   Sızıntı değildi — aşırı katılıktı. Kapsamsız kapı fazladan yetki
   vermez, tersine tesise kısıtlı rolü tümüyle dışarıda bırakır. Ama
   ürünün en sık işlerinden biri (kanıt yükleme) santral ekibine
   kapalıydı. Ölçüldü 2026-09-03.

   Kapı iki yönlü ölçülür: kendi santraline EVET, başka santrale HAYIR.
   İkincisi olmadan birincisi bir yetki yükseltmesi olurdu.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kanit-kapsam-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'kanit@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { kanitEkle } = await import('@/lib/eylemler');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

/** Kanıt bağlantısı gerçekten yazıldı mı? */
async function bagliKanitSayisi(maddeDurumuId: string) {
  return db.kanitBaglantisi.count({ where: { maddeDurumuId } });
}

let mdA = '';
let mdB = '';
let tesisA = '';
let tesisB = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;

  /* İKİ AYRI santralin madde durumu gerekiyor; seed'de ikisi de var.
     Sabit id yazılmaz — seed değişince test sessizce yanlış şeyi ölçer. */
  const a = await db.maddeDurumu.findFirstOrThrow({
    select: { id: true, tesisId: true },
  });
  const b = await db.maddeDurumu.findFirstOrThrow({
    where: { tesisId: { not: a.tesisId } },
    select: { id: true, tesisId: true },
  });
  mdA = a.id; tesisA = a.tesisId;
  mdB = b.id; tesisB = b.tesisId;
});

describe('kanitEkle — santral kapsamı', () => {
  it('tesise kısıtlı rol KENDİ santralinin maddesine kanıt ekleyebilir', async () => {
    const once = await bagliKanitSayisi(mdA);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => kanitEkle({
      maddeDurumuId: mdA, ad: 'Saha fotoğrafı', tip: 'ekran_goruntusu',
    }));
    expect(hataMetni(sonuc)).toBe('');
    expect(await bagliKanitSayisi(mdA)).toBe(once + 1);
  });

  it('tesise kısıtlı rol BAŞKA santralin maddesine kanıt EKLEYEMEZ [KNT-YUK-002]', async () => {
    // Kurgunun kendisi de doğrulanır: iki madde gerçekten ayrı santralde
    // değilse bu test hiçbir şey ölçmez, yalnız yeşil yanardı.
    expect(tesisA).not.toBe(tesisB);
    const once = await bagliKanitSayisi(mdB);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => kanitEkle({
      maddeDurumuId: mdB, ad: 'Yabancı kanıt', tip: 'rapor',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    // Kapı kapandıysa YAZILMAMIŞ da olmalı: hata döndürüp yazan bir eylem
    // en kötü hâldir — kullanıcı reddedildiğini sanır, kayıt durur.
    expect(await bagliKanitSayisi(mdB)).toBe(once);
  });

  it('kapsamsız yönetici her santrale ekleyebilir', async () => {
    const once = await bagliKanitSayisi(mdB);
    expect(hataMetni(await kanitEkle({
      maddeDurumuId: mdB, ad: 'Kurumsal politika', tip: 'politika',
    }))).toBe('');
    expect(await bagliKanitSayisi(mdB)).toBe(once + 1);
  });

  it('okuyucu rolü kanıt ekleyemez', async () => {
    const sonuc = await kimlikle([yetki('okuyucu')], () => kanitEkle({
      maddeDurumuId: mdA, ad: 'Olmaz', tip: 'kayit',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('OLMAYAN madde durumu için açık hata verir — sessiz yazma yok', async () => {
    /* Kapsam ancak kayıt okunarak bilinir; kayıt yoksa kapsam da yoktur.
       Eskiden bu yol yabancı anahtar hatasına düşüyordu, yani hata
       mesajı kullanıcıya veritabanı diliyle konuşuyordu. */
    const sonuc = await kanitEkle({
      maddeDurumuId: 'olmayan-madde-durumu', ad: 'Hayalet', tip: 'kayit',
    });
    expect(sonuc.ok).toBe(false);
    expect(hataMetni(sonuc)).not.toMatch(/prisma|foreign key|constraint/i);
  });
});
