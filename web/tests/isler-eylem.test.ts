import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Motor tetikleme eylemleri — KISMÎ DURUMUN RAPORLANMASI

   `lib/eylemler2/isler.ts` %0 kapsamdaydı. Bu dosyanın asıl işi motor
   koşturmak DEĞİL, koşunun sonucunu dürüstçe raporlamaktır — ve tam
   orada iki kez gerçek kusur çıkmış:

     · Motorların hepsi patlasa bile `tamam()` dönüyordu.
     · Sekiz motorun sekizi de "zaten çalışıyor" dönse yine `tamam()`
       dönüyordu; düğmeye basan kişi motorların koştuğunu sanıyor, oysa
       HİÇBİRİ koşmamış oluyordu. Ekranda değişiklik olmadığı için bunu
       ancak koşu geçmişini açıp saat karşılaştırarak fark ederdi.

   Bu yüzden ölçülen şey motorlar değil, KARAR TABLOSUDUR. `isKos`
   bilerek sahtelenir: burada sınanan birim, sonuçların toplanma ve
   raporlanma mantığıdır. Yetki kapısı ise SAHTELENMEZ.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-isler-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string): Yetki => ({
  rol, surecId: null, tesisId: null, tuzelKisiId: null, regulasyonId: null, modul: null,
});

const oturum = {
  id: 'test', adSoyad: 'Test Kullanıcısı', eposta: 'isler@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

type KosuSonucu =
  | { ok: true; islenen: number; uretilen: number; sureMs: number }
  | { ok: false; sebep: 'zaten_calisiyor' }
  | { ok: false; sebep: 'hata'; hata: string };

const BASARILI: KosuSonucu = { ok: true, islenen: 1, uretilen: 0, sureMs: 1 };
const MESGUL: KosuSonucu = { ok: false, sebep: 'zaten_calisiyor' };
const PATLADI: KosuSonucu = { ok: false, sebep: 'hata', hata: 'motor patladı' };

/** Motor adına göre yanıt verir; verilmeyen motor başarılı sayılır. */
let yanitlar: Record<string, KosuSonucu> = {};
let varsayilan: KosuSonucu = BASARILI;
const cagrilanlar: string[] = [];

vi.mock('@/lib/motorlar/isKosucu', () => ({
  isKos: async (ad: string) => {
    cagrilanlar.push(ad);
    return yanitlar[ad] ?? varsayilan;
  },
}));

const { tumIsleriCalistir, tekIsCalistir } = await import('@/lib/eylemler2/isler');
const { MOTOR_ADLARI } = await import('@/lib/motorlar/kayit');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

beforeEach(() => {
  yanitlar = {};
  varsayilan = BASARILI;
  cagrilanlar.length = 0;
});

describe('tumIsleriCalistir — karar tablosu', () => {
  it('hepsi koşarsa başarı döner ve KAYITLI HER motor çağrılır', async () => {
    /* Motor listesi `kayit.ts`'te yaşar ve zamanlayıcı da onu okur. İki
       kopya bir kez ayrışmış, zamanlayıcı sekiz motorun beşini
       koşturmuştu; burada sayı değil, KÜME karşılaştırılır. */
    expect(hataMetni(await tumIsleriCalistir())).toBe('');
    expect([...cagrilanlar].sort()).toEqual([...MOTOR_ADLARI].sort());
  });

  it('bir motor patlarsa BAŞARI DÖNMEZ ve adı söylenir', async () => {
    yanitlar = { [MOTOR_ADLARI[0]]: PATLADI };
    const s = await tumIsleriCalistir();
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain(MOTOR_ADLARI[0]);
    expect(hataMetni(s)).toMatch(/başarısız/i);
  });

  it('HİÇBİRİ koşmazsa (hepsi meşgul) başarı DÖNMEZ', async () => {
    /* Kusurun kendisi buydu: çakışma hata değildir ama "hiçbir şey
       olmadı" da başarı değildir. */
    varsayilan = MESGUL;
    const s = await tumIsleriCalistir();
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/hiçbir motor koşmadı/i);
    // Çakışmanın bir hata OLMADIĞI da söylenmeli — kullanıcı paniklemesin.
    expect(hataMetni(s)).toMatch(/çakışma korumas/i);
  });

  it('KISMÎ durumda kaç motorun atlandığı söylenir', async () => {
    yanitlar = { [MOTOR_ADLARI[0]]: MESGUL };
    const s = await tumIsleriCalistir();
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain(MOTOR_ADLARI[0]);
    expect(hataMetni(s)).toMatch(/atlandı/i);
    expect(hataMetni(s)).toContain(String(MOTOR_ADLARI.length - 1));
  });

  it('HATA meşguliyetten önce gelir — sessizlenmez', async () => {
    yanitlar = { [MOTOR_ADLARI[0]]: PATLADI, [MOTOR_ADLARI[1]]: MESGUL };
    expect(hataMetni(await tumIsleriCalistir())).toMatch(/başarısız/i);
  });

  it('yonetim/yazma yetkisi olmayan çalıştıramaz — tek motora bile dokunulmaz [YON-MOT-001]', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => tumIsleriCalistir());
    expect(hataMetni(s)).toMatch(/yetki/i);
    expect(cagrilanlar).toEqual([]);
  });
});

describe('tekIsCalistir', () => {
  it('bilinen motoru çalıştırır', async () => {
    expect(hataMetni(await tekIsCalistir(MOTOR_ADLARI[0]))).toBe('');
    expect(cagrilanlar).toEqual([MOTOR_ADLARI[0]]);
  });

  it('BİLİNMEYEN iş adı reddedilir ve hiçbir motor koşmaz', async () => {
    const s = await tekIsCalistir('uydurma_motor');
    expect(s.ok).toBe(false);
    expect(cagrilanlar).toEqual([]);
  });

  it('meşgul motor için ayrı, hata için ayrı mesaj verir', async () => {
    yanitlar = { [MOTOR_ADLARI[0]]: MESGUL };
    expect(hataMetni(await tekIsCalistir(MOTOR_ADLARI[0]))).toMatch(/hâlihazırda koşuyor/i);

    yanitlar = { [MOTOR_ADLARI[0]]: PATLADI };
    const s = await tekIsCalistir(MOTOR_ADLARI[0]);
    expect(hataMetni(s)).toMatch(/başarısız/i);
    expect(hataMetni(s)).toContain('motor patladı');
  });

  it('okuyucu tek motor da çalıştıramaz', async () => {
    expect(hataMetni(await kimlikle([yetki('okuyucu')],
      () => tekIsCalistir(MOTOR_ADLARI[0])))).toMatch(/yetki/i);
    expect(cagrilanlar).toEqual([]);
  });
});
