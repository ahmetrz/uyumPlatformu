import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   O26 · EŞLEME PROFİLİ TEZGÂHI — erişim ve değişmezlik regresyonu

   Denetim bulgusu #10: `lib/eylemler2/esleme.ts`'in altı eylemi yazılmış
   ama hiçbir yerden çağrılmıyordu; bir profil connector'a BAĞLANABİLİYOR
   ama üründe hiç OLUŞTURULAMIYORDU. Yüzey `/esleme` olarak açıldı.

   Bu dosya yüzeyin sözünü ölçer:

     · yönetim yazma yetkisi olmayan profil YAYIMLAYAMAZ,
     · SANTRALE KISITLI bir kullanıcı bu kurum geneli tezgâhı hiç açamaz,
     · yayımlanmış sürüm DEĞİŞMEZ: ikinci yayın yeni sürüm açar, eskisi
       arşive geçer ve v1'in kuralları aynen okunabilir kalır,
     · ÖNİZLEME HİÇBİR ŞEY YAZMAZ,
     · varsayılanla dolan alan "ölçüldü" sayılmaz, gelmeyen alan SIFIR
       değil BİLİNMEYENdir, ölçülemeyen güven null'dır,
     · profilsiz connector "kuralsız" değil, kuralı ÜRÜNDE TANIMSIZdır.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-esleme-tezgah-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const oturum = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (ad: string) =>
      ad === 'oturum' && oturum.token ? { name: ad, value: oturum.token } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

const { db } = await import('@/lib/db');
const E = await import('@/lib/eylemler2/esleme');
const M = await import('@/app/(kabuk)/(operasyonel)/esleme/mantik');

type SurumSatiri = import('@/app/(kabuk)/(operasyonel)/esleme/mantik').SurumSatiri;
type ConnectorSatiri =
  import('@/app/(kabuk)/(operasyonel)/esleme/mantik').ConnectorSatiri;

/* ═══ Fikstür ═════════════════════════════════════════════════════════ */

const ONEK = 'ESLTZG';

type Kisi = { id: string; token: string };

async function kullaniciAc(
  eposta: string, yetki: { rol: string; tesisId?: string },
): Promise<Kisi> {
  const kisi = await db.kullanici.create({
    data: { eposta, adSoyad: eposta, aktif: true } });
  await db.yetki.create({ data: {
    kullaniciId: kisi.id, rol: yetki.rol, tesisId: yetki.tesisId ?? null } });
  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  return { id: kisi.id, token };
}

let yonetici: Kisi;
let okuyucu: Kisi;   // yonetim: yalnız okuma → yayımlayamaz
let sahaci: Kisi;    // SANTRALE kısıtlı → kurum geneli tezgâhı açamaz

const KURALLAR = [
  { kaynakAlan: 'device.tag', hedefAlan: 'etiket', zorunlu: true },
  { kaynakAlan: 'device.serial', hedefAlan: 'seriNo' },
  { kaynakAlan: 'device.criticality', hedefAlan: 'kritiklik',
    enumEsleme: { HIGH: 'yuksek', LOW: 'dusuk' } },
  { kaynakAlan: 'device.vendor', hedefAlan: 'uretici', varsayilan: 'bilinmeyen üretici' },
] as never;

beforeAll(async () => {
  await db.eslemeProfili.deleteMany({ where: { kod: { startsWith: ONEK } } });
  const tesis = await db.tesis.create({
    data: { kod: `${ONEK}-SNT`, ad: 'Eşleme tezgâhı santrali', durum: 'aktif' } });

  yonetici = await kullaniciAc(`${ONEK}-yonetici@test.local`, { rol: 'yonetici' });
  okuyucu = await kullaniciAc(`${ONEK}-okuyucu@test.local`, { rol: 'okuyucu' });
  sahaci = await kullaniciAc(`${ONEK}-saha@test.local`,
    { rol: 'yonetici', tesisId: tesis.id });
  oturum.token = yonetici.token;
});

/* ═══ 1 · Yetki — yüzeyin yapamadığı ══════════════════════════════════ */

describe('Eşleme tezgâhı yetki kapısı', () => {
  it('YÖNETİM YAZMA yetkisi olmayan profil YAYIMLAYAMAZ', async () => {
    const kod = `${ONEK}-YETKISIZ`;
    oturum.token = okuyucu.token;
    try {
      const sonuc = await E.eslemeProfilYayinla({
        kod, ad: 'Yetkisiz deneme', connectorTipi: 'test_tip', kurallar: KURALLAR });
      expect(sonuc.ok).toBe(false);
      // Reddedilen yayın hiçbir satır BIRAKMAZ.
      expect(await db.eslemeProfili.count({ where: { kod } })).toBe(0);
    } finally { oturum.token = yonetici.token; }
  });

  it('SANTRALE KISITLI kullanıcı kurum geneli tezgâhı hiç okuyamaz', async () => {
    /* Eşleme profili kurum geneli bir tanımdır (`EslemeProfili` şemada
       `tesisId` taşımaz) ve bir profil tüm santrallerin verisini yorumlar.
       Kapsam bu yüzden ayrı bir `where` ile değil, `lib/erisim.ts →
       kapsamUyar` kuralıyla uygulanır: santrale kısıtlı yetki kapsamsız
       (global) `yonetim` işlemini geçemez. */
    oturum.token = sahaci.token;
    try {
      const gecmis = await E.eslemeProfilGecmisi(`${ONEK}-ANY`);
      expect(gecmis.ok).toBe(false);
      const onizleme = await E.eslemeOnizle({
        kurallar: KURALLAR, ornekJson: '{"device":{"tag":"X"}}' });
      expect(onizleme.ok).toBe(false);
    } finally { oturum.token = yonetici.token; }
  });

  it('OTURUMSUZ çağrı yayımlayamaz', async () => {
    const kod = `${ONEK}-OTURUMSUZ`;
    const eski = oturum.token;
    oturum.token = null;
    try {
      const sonuc = await E.eslemeProfilYayinla({
        kod, ad: 'Oturumsuz', connectorTipi: 'test_tip', kurallar: KURALLAR });
      expect(sonuc.ok).toBe(false);
      expect(await db.eslemeProfili.count({ where: { kod } })).toBe(0);
    } finally { oturum.token = eski; }
  });
});

/* ═══ 2 · Yayımlanmış sürüm DEĞİŞMEZ ══════════════════════════════════ */

describe('Yayımlanmış sürüm değişmez, yeni yayın YENİ SÜRÜM açar', () => {
  const kod = `${ONEK}-SURUM`;

  it('ikinci yayın v2 açar, v1 arşive geçer ve v1 kuralları AYNEN kalır [ESL-PRF-001]', async () => {
    const ilk = await E.eslemeProfilYayinla({
      kod, ad: 'Sürüm testi', connectorTipi: 'test_tip', kurallar: KURALLAR });
    expect(ilk.ok).toBe(true);
    if (!ilk.ok) return;
    expect(ilk.surum).toBe(1);

    const ikinci = await E.eslemeProfilYayinla({
      kod, ad: 'Sürüm testi · genişletildi', connectorTipi: 'test_tip',
      kurallar: [...(KURALLAR as unknown as object[]),
        { kaynakAlan: 'device.model', hedefAlan: 'model' }] as never });
    expect(ikinci.ok).toBe(true);
    if (!ikinci.ok) return;
    expect(ikinci.surum).toBe(2);

    const gecmis = await E.eslemeProfilGecmisi(kod);
    expect(gecmis.ok).toBe(true);
    if (!gecmis.ok) return;

    const aile = M.aileKur(gecmis.surumler as SurumSatiri[]);
    expect(aile).not.toBeNull();
    expect(aile!.surumler.length).toBe(2);
    // Geçmiş GİZLENMEZ: arşiv sürüm listede kalır.
    expect(aile!.etkin?.surum).toBe(2);
    expect(aile!.surumler.find((s) => s.surum === 1)?.durum).toBe('arsiv');

    // v1'in kuralları YENİ yayından etkilenmedi: eski içe aktarımların
    // hangi kuralla yorumlandığı okunabilir kaldı.
    const v1 = await E.eslemeProfilKurallari(kod, 1);
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(v1.kurallar.length).toBe(4);
    const v2 = await E.eslemeProfilKurallari(kod, 2);
    expect(v2.ok).toBe(true);
    if (v2.ok) expect(v2.kurallar.length).toBe(5);
  });

  it('taslak yayın etkin sürümü DÜŞÜRMEZ', async () => {
    const sonuc = await E.eslemeProfilYayinla({
      kod, ad: 'Sürüm testi · taslak', connectorTipi: 'test_tip',
      kurallar: KURALLAR, etkinlestir: false });
    expect(sonuc.ok).toBe(true);

    const gecmis = await E.eslemeProfilGecmisi(kod);
    if (!gecmis.ok) throw new Error(gecmis.hata);
    const aile = M.aileKur(gecmis.surumler as SurumSatiri[])!;
    // v3 taslak; koşuda hâlâ v2 geçerli.
    expect(aile.sonSurum).toBe(3);
    expect(aile.etkin?.surum).toBe(2);
    expect(M.profilImi(aile)).toBe('ok');
  });
});

/* ═══ 3 · Önizleme HİÇBİR ŞEY YAZMAZ ══════════════════════════════════ */

describe('Önizleme bir prova, bir ölçüm değil', () => {
  it('önizleme profil, köken ya da red kaydı YAZMAZ [ESL-PRF-002]', async () => {
    const once = await Promise.all([
      db.eslemeProfili.count(), db.veriKokeni.count(), db.reddedilenKayit.count(),
    ]);
    const sonuc = await E.eslemeOnizle({
      kurallar: KURALLAR,
      ornekJson: JSON.stringify([
        { device: { tag: 'HAM-1', serial: 'SN-1', criticality: 'HIGH' } },
        { device: { tag: 'HAM-2', criticality: 'BILINMEYEN' } },
      ]),
    });
    expect(sonuc.ok).toBe(true);
    const sonra = await Promise.all([
      db.eslemeProfili.count(), db.veriKokeni.count(), db.reddedilenKayit.count(),
    ]);
    expect(sonra).toEqual(once);
  });

  it('bozuk JSON sessizce boş sonuç DÖNDÜRMEZ, sebep söyler', async () => {
    const sonuc = await E.eslemeOnizle({ kurallar: KURALLAR, ornekJson: '{bozuk' });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain('JSON');
  });
});

/* ═══ 4 · Bilinmeyen ≠ sıfır ══════════════════════════════════════════ */

describe('Önizleme: bilinmeyen ≠ sıfır', () => {
  it('gelmeyen alan SIFIR değil BİLİNMEYEN, varsayılan ise ÖLÇÜM DEĞİL', async () => {
    const sonuc = await E.eslemeOnizle({
      kurallar: KURALLAR,
      // `serial` hiç gelmedi (bilinmiyor), `vendor` hiç gelmedi ama kuralın
      // varsayılanı var (ölçüm değil), `tag` kaynaktan geldi.
      ornekJson: JSON.stringify({ device: { tag: 'HAM-9', criticality: 'LOW' } }),
    });
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;

    const alanlar = Object.values(sonuc.satirlar[0].uygulama.alanlar);
    const sayim = M.onizlemeSayimi(alanlar);

    // Üç kova AYRI: kaynaktan gelen · kuralın doldurduğu · hiç gelmeyen.
    expect(sayim.kaynaktan).toBe(2);        // tag + criticality
    expect(sayim.varsayilandan).toBe(1);    // vendor
    expect(sayim.bilinmeyen).toBe(1);       // serial
    expect(sayim.kaynaktan + sayim.varsayilandan + sayim.bilinmeyen)
      .toBe(alanlar.length);

    const seri = alanlar.find((a) => a.hedefAlan === 'seriNo')!;
    expect(seri.kaynagi).toBe('yok');
    expect(seri.deger).toBeNull();          // boş string ya da 0 DEĞİL
    const uretici = alanlar.find((a) => a.hedefAlan === 'uretici')!;
    expect(uretici.kaynagi).toBe('varsayilan');
  });

  it('hiçbir güven kuralı yoksa güven ÖLÇÜLMEDİ (null), sıfır değil', async () => {
    const sonuc = await E.eslemeOnizle({
      kurallar: KURALLAR,
      ornekJson: JSON.stringify({ device: { tag: 'HAM-10' } }),
    });
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    expect(sonuc.satirlar[0].uygulama.guven).toBeNull();
    // Ekran bunu "0,00" diye YAZMAZ.
    expect(M.guvenYazisi(null)).toBe('ölçülmedi');
    expect(M.guvenYazisi(0.42)).toBe('0.42');
  });

  it('tanınmayan enum değeri SESSİZ DÜŞMEZ, sorun olarak raporlanır', async () => {
    const sonuc = await E.eslemeOnizle({
      kurallar: KURALLAR,
      ornekJson: JSON.stringify({ device: { tag: 'HAM-11', criticality: 'YOKBOYLE' } }),
    });
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    expect(sonuc.satirlar[0].uygulama.sorunlar.length).toBeGreaterThan(0);
  });
});

/* ═══ 5 · Profilsiz connector "kuralsız" değildir ═════════════════════ */

describe('Gömülü eşleme BİLİNMEYENdir, sıfır değil', () => {
  it('profili olmayan connector için eylem null profil döner, ekran "gömülü" der', async () => {
    const c = await db.connector.create({ data: {
      kod: `${ONEK}-CON`, ad: 'Profilsiz connector', tip: `${ONEK}_bostip`,
      kaynakSistem: `${ONEK}-SISTEM`, etkin: true, durum: 'etkin' } });

    const sonuc = await E.connectorEslemeProfili(c.id);
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    expect(sonuc.profil).toBeNull();

    const satir: ConnectorSatiri = {
      id: c.id, kod: c.kod, ad: c.ad, tip: c.tip,
      kaynak: 'gomulu', profilKodu: null, profilSurumu: null, profilDurumu: null,
      hata: null,
    };
    // İşaretçi 'unk': "kural yok" (ok) DEĞİL, "kural üründe tanımlı değil".
    expect(M.connectorImi(satir)).toBe('unk');
    expect(M.eslemeHucresi(satir)).toBe('gömülü eşleme');
    expect(M.KAYNAK_SOZU.gomulu).toContain('üründe tanımlı değil');
  });

  it('okunamayan eşleme boş hücreye DÜŞMEZ', () => {
    const satir: ConnectorSatiri = {
      id: 'x', kod: 'C1', ad: 'Connector', tip: 't',
      kaynak: 'gomulu', profilKodu: null, profilSurumu: null, profilDurumu: null,
      hata: 'Demo sürümü: eşleme tezgâhı yalnız canlı kurulumda çalışır.',
    };
    expect(M.eslemeHucresi(satir)).toBe('okunamadı');
    expect(M.connectorImi(satir)).toBe('unk');
  });
});

/* ═══ 6 · Ekran hâli ve yayın kapısı ══════════════════════════════════ */

describe('Ekran hâli üç sıfırı ayırır', () => {
  const bosSayim = M.sayimHesapla([], []);

  it('hiç profil yayımlanmadıysa "yok" değil "hiç yayımlanmadı" der', () => {
    const hal = M.ekranHali(bosSayim, 0);
    expect(hal.durum).toBe('unk');
    expect(hal.metin).toContain('yayımlanmadı');
  });

  it('gömülü eşlemeyle koşan connector varsa hâl BİLİNMEYENdir', () => {
    const sayim = { ...bosSayim, profil: 2, etkinSurum: 2, gomuluConnector: 3 };
    const hal = M.ekranHali(sayim, 5);
    expect(hal.durum).toBe('unk');
    expect(hal.metin).toContain('gömülü');
  });

  it('yayın kapısı: kuralsız / kodsuz / yetkisiz yayın GEÇMEZ', () => {
    const temel = {
      yetkili: true, kod: 'CMDB-VARLIK', ad: 'CMDB', connectorTipi: 'cmdb_rest',
      kuralSayisi: 3, bekliyor: false,
    };
    expect(M.yayinPasifMi(temel)).toBe('');
    expect(M.yayinPasifMi({ ...temel, yetkili: false })).toContain('yetkisi');
    expect(M.yayinPasifMi({ ...temel, kuralSayisi: 0 })).toContain('kural');
    expect(M.yayinPasifMi({ ...temel, kod: '  ' })).toContain('kod');
    expect(M.yayinPasifMi({ ...temel, kod: 'BOŞLUK LU' })).not.toBe('');
  });

  it('önizleme kapısı örneksiz ya da kuralsız önizlemeyi ENGELLER', () => {
    expect(M.onizlemePasifMi({ kuralSayisi: 0, ornek: '{}', bekliyor: false }))
      .toContain('kural');
    expect(M.onizlemePasifMi({ kuralSayisi: 2, ornek: '   ', bekliyor: false }))
      .toContain('Örnek');
    expect(M.onizlemePasifMi({ kuralSayisi: 2, ornek: '{}', bekliyor: false })).toBe('');
  });
});
