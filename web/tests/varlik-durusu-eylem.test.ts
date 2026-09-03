import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Varlık güvenlik duruşu eylemleri — yetki · kapsam · iz · doğrulama

   OT-03 · OT-11 · OT-21 · OT-22 · OT-25 · OT-26 · OT-27 · OT-44

   Bu dosya sekiz maddenin SUNUCU ayağını çiviler. Her eylem için dört
   şey ayrı ayrı sorulur ve hiçbiri ötekinin yerine geçmez:

     1. YETKİ — yetkisiz rol reddedilir,
     2. KAPSAM — başka santralin kaydına yazılamaz (iki aşamalı kapı),
     3. DOĞRULAMA — geçersiz girdi ÜRÜNE GİRMEDEN reddedilir,
     4. İZ — her yazma denetim izine düşer.

   Dördüncüsü ayrıca ölçülüyor çünkü izsiz bir yazma, olmamış bir yazma
   gibidir: denetimde "bunu kim, ne zaman, neden değiştirdi" sorusunun
   cevabı kalmaz.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-durus-'));
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
  id: '', adSoyad: 'Duruş Testi', eposta: 'durus@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  agSegmentiKaydet, alanUygulanamazIsaretle, firmwareTemeliKaydet,
  kapsamKaydet, korelasyonElleKarar, sbomYukle, varligaSegmentAta,
  veriKalitesiBulgusuKapat, yamaKaydiKaydet, yamaDurumuTuret,
} = await import('@/lib/eylemler2/varlikDurusu');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const REDDEDILDI = /yetki|kapsam/i;

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = ''; let tesisB = '';
let varlikA = ''; let varlikB = '';
let bolgeId = ''; let turId = '';

/** İzde bu varlık için kayıt var mı? */
async function izVarMi(varlikTipi: string, varlikId: string, alan: string) {
  return db.aktiviteKaydi.findFirst({
    where: { varlikTipi, varlikId, alan }, orderBy: { zaman: 'desc' },
  });
}

beforeAll(async () => {
  const tesisler = await db.tesis.findMany({ take: 2, orderBy: { kod: 'asc' } });
  tesisA = tesisler[0].id; tesisB = tesisler[1].id;
  const kullanici = await db.kullanici.findFirst({ where: { aktif: true } });
  oturum.id = kullanici!.id;

  const tur = await db.varlikTuru.findFirst();
  turId = tur!.id;
  bolgeId = (await db.agBolgesi.findFirst())!.id;

  const yap = async (tesisId: string) => db.varlik.create({
    data: {
      etiket: benzersiz('DURUS'), ad: 'Duruş test varlığı', turId, tesisId,
      uretici: 'Siemens', model: 'S7-1500', firmware: '4.1.0',
    },
  });
  varlikA = (await yap(tesisA)).id;
  varlikB = (await yap(tesisB)).id;
});

/* ══ OT-03 · Alan uygulanabilirliği ═════════════════════════════════ */

describe('OT-03 · "uygulanamaz" bir ölçüm değil KARARDIR', () => {
  it('gerekçesiz uygulanamazlık reddedilir', async () => {
    const s = await alanUygulanamazIsaretle({ varlikId: varlikA, alan: 'edr', gerekce: 'kısa' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/gerekçe/i);
  });

  it('gerekçeli kayıt yazılır ve İZE düşer', async () => {
    const s = await alanUygulanamazIsaretle({
      varlikId: varlikA, alan: 'edr',
      gerekce: 'OT PLC — üretici EDR ajanı desteklemiyor, telafi edici kontrol ağ ayrımı.',
    });
    expect(hataMetni(s)).toBe('');
    const kayit = await db.alanUygulanabilirligi.findUnique({
      where: { varlikTipi_varlikId_alan: { varlikTipi: 'Varlik', varlikId: varlikA, alan: 'edr' } },
    });
    expect(kayit?.kaydedenId).toBe(oturum.id);
    expect(await izVarMi('Varlik', varlikA, 'uygulanamaz:edr')).not.toBeNull();
  });

  it('BAŞKA santralin varlığına yazılamaz', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => alanUygulanamazIsaretle({
      varlikId: varlikB, alan: 'edr', gerekce: 'Başka santralin cihazına yazma denemesi.',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('okuma yetkisi yazmaya yetmez', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => alanUygulanamazIsaretle({
      varlikId: varlikA, alan: 'siem', gerekce: 'Yetkisiz rol denemesi yapılıyor.',
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-11 · Ağ segmenti ═════════════════════════════════════════════ */

describe('OT-11 · segment CIDR ürüne girmeden doğrulanır', () => {
  it('geçersiz CIDR REDDEDİLİR', async () => {
    for (const cidr of ['10.0.0.0/99', '10.0.0.0', 'bilinmiyor', '999.0.0.0/24']) {
      const s = await agSegmentiKaydet({
        bolgeId, kod: benzersiz('SEG'), ad: 'Geçersiz', cidr,
      });
      expect(s.ok, cidr).toBe(false);
      expect(hataMetni(s)).toMatch(/CIDR/i);
    }
  });

  it('geçerli segment yazılır ve İZE düşer', async () => {
    const kod = benzersiz('SEG');
    const s = await agSegmentiKaydet({
      bolgeId, kod, ad: 'OT hattı', cidr: '10.77.0.0/24', gatewayIp: '10.77.0.1', vlanId: 77,
    });
    expect(hataMetni(s)).toBe('');
    const kayit = await db.agSegmenti.findUnique({ where: { kod } });
    expect(kayit?.vlanId).toBe(77);
    expect(await izVarMi('AgSegmenti', kayit!.id, 'cidr')).not.toBeNull();
  });

  it('VLAN kimliği 1–4094 dışına çıkamaz', async () => {
    for (const vlanId of [0, 4095, -1]) {
      const s = await agSegmentiKaydet({
        bolgeId, kod: benzersiz('SEG'), ad: 'VLAN dışı', cidr: '10.78.0.0/24', vlanId,
      });
      expect(s.ok, String(vlanId)).toBe(false);
    }
  });

  it('segment kütük kaydıdır — yalnız yazma yetkisi yetmez, ONAY ister', async () => {
    const s = await kimlikle([yetki('katkici')], () => agSegmentiKaydet({
      bolgeId, kod: benzersiz('SEG'), ad: 'Yetkisiz', cidr: '10.79.0.0/24',
    }));
    expect(s.ok).toBe(false);
  });

  it('varlığa segment atanır, kapsam dışı varlığa atanamaz', async () => {
    const seg = await db.agSegmenti.findFirst({ where: { cidr: '10.77.0.0/24' } });
    const ok = await varligaSegmentAta({ varlikId: varlikA, segmentId: seg!.id });
    expect(hataMetni(ok)).toBe('');
    expect(await izVarMi('Varlik', varlikA, 'segmentId')).not.toBeNull();

    const red = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => varligaSegmentAta({ varlikId: varlikB, segmentId: seg!.id }));
    expect(red.ok).toBe(false);
  });

  it('bilinmeyen segmente atama reddedilir', async () => {
    const s = await varligaSegmentAta({ varlikId: varlikA, segmentId: 'yok-boyle-bir-segment' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/segment/i);
  });
});

/* ══ OT-21 · Yama kaydı ══════════════════════════════════════════════ */

describe('OT-21 · yama durumu TÜRETİLİR, kullanıcıdan alınmaz', () => {
  it('yamalanamaz > istisna > eksik > uyumlu sırası korunur', () => {
    expect(yamaDurumuTuret({ yamalanamaz: true, eksikYama: 'KB1', mevcutSeviye: '1', temelSeviye: '1' }))
      .toBe('yamalanamaz');
    expect(yamaDurumuTuret({ yamalanamaz: false, istisnaGerekcesi: 'kabul', eksikYama: 'KB1' }))
      .toBe('istisna');
    expect(yamaDurumuTuret({ yamalanamaz: false, eksikYama: 'KB1' })).toBe('eksik');
    expect(yamaDurumuTuret({ yamalanamaz: false, mevcutSeviye: '2024-05', temelSeviye: '2024-05' }))
      .toBe('uyumlu');
  });

  it('taban ya da mevcut seviye yoksa UYUMLU SAYILMAZ', () => {
    /* OT-21'in kuralı: UNKNOWN = COMPLIANT olamaz. */
    expect(yamaDurumuTuret({ yamalanamaz: false })).toBe('karar_verilemedi');
    expect(yamaDurumuTuret({ yamalanamaz: false, mevcutSeviye: '2024-05' })).toBe('karar_verilemedi');
    expect(yamaDurumuTuret({ yamalanamaz: false, mevcutSeviye: 'bilinmiyor', temelSeviye: '2024-05' }))
      .toBe('karar_verilemedi');
  });

  it('kayıt yazılır, durum türetilir ve İZE düşer', async () => {
    const s = await yamaKaydiKaydet({
      varlikId: varlikA, kaynakSistem: 'test-wsus', kaynakKayitId: benzersiz('kb'),
      mevcutSeviye: '2024-05', temelSeviye: '2024-08', eksikYama: 'KB5039212',
      siddet: 'yuksek', yenidenBaslatmaGerekli: true,
    });
    expect(hataMetni(s)).toBe('');
    const kayit = await db.yamaKaydi.findFirst({
      where: { varlikId: varlikA }, orderBy: { olusturuldu: 'desc' },
    });
    expect(kayit?.durum).toBe('eksik');
    expect(await izVarMi('Varlik', varlikA, 'yamaKaydi')).not.toBeNull();
  });

  it('kapsam dışı varlığa yama kaydı yazılamaz', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => yamaKaydiKaydet({
      varlikId: varlikB, kaynakSistem: 'test', kaynakKayitId: benzersiz('kb'),
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-22 · Firmware tabanı ═════════════════════════════════════════ */

describe('OT-22 · taban sürümleri ürüne girmeden çözümlenir', () => {
  it('çözümlenemeyen onaylı sürüm REDDEDİLİR', async () => {
    const s = await firmwareTemeliKaydet({
      turId, uretici: 'Siemens', model: 'S7-1500', onayliSurum: 'bilinmiyor',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/sürüm/i);
  });

  it('hiçbir boyuta bağlanmayan taban REDDEDİLİR', async () => {
    /* Tür, üretici ve model üçü de boşsa taban BÜTÜN cihazlara uyar;
       böyle bir taban kural değil, kaza olurdu. */
    const s = await firmwareTemeliKaydet({ turId: '', onayliSurum: '4.4.0' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/boyut/i);
  });

  it('geçerli taban yazılır ve İZE düşer', async () => {
    const s = await firmwareTemeliKaydet({
      turId, uretici: benzersiz('Uretici'), model: 'S7-1500',
      onayliSurum: '4.4.0', asgariSurum: '4.2.0', bilinenKotuSurumler: '4.3.1',
    });
    expect(hataMetni(s)).toBe('');
    const kayit = await db.firmwareTemeli.findFirst({ orderBy: { olusturuldu: 'desc' } });
    expect(kayit?.asgariSurum).toBe('4.2.0');
    expect(await izVarMi('FirmwareTemeli', kayit!.id, 'onayliSurum')).not.toBeNull();
  });

  it('taban kütük kaydıdır — ONAY yetkisi ister', async () => {
    const s = await kimlikle([yetki('bt_yoneticisi')], () => firmwareTemeliKaydet({
      turId, uretici: 'X', onayliSurum: '1.0.0',
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-25 · Elle karar — yanlış pozitif bastırma ════════════════════ */

describe('OT-25 · elle karar izlenebilir ve kapsamlıdır', () => {
  let korelasyonId = '';

  beforeAll(async () => {
    const z = await db.zafiyet.create({
      data: { kaynakRef: benzersiz('CVE-TEST'), baslik: 'Test zafiyeti', cvss: 7.5 },
    });
    const k = await db.zafiyetKorelasyonu.create({
      data: {
        varlikId: varlikA, zafiyetId: z.id, yontem: 'surum_araligi',
        sonuc: 'etkilenen', guven: 0.8, gerekce: 'Test korelasyonu',
      },
    });
    korelasyonId = k.id;
  });

  it('gerekçesiz elle karar reddedilir', async () => {
    const s = await korelasyonElleKarar({ korelasyonId, sonuc: 'etkilenmeyen', gerekce: 'yok' });
    expect(s.ok).toBe(false);
  });

  it('elle karar yazılır, motor sonucunu EZMEZ ve İZE düşer', async () => {
    const s = await korelasyonElleKarar({
      korelasyonId, sonuc: 'etkilenmeyen',
      gerekce: 'Cihazda ilgili modül kurulu değil; üretici teyit etti (talep #4412).',
    });
    expect(hataMetni(s)).toBe('');
    const k = await db.zafiyetKorelasyonu.findUnique({ where: { id: korelasyonId } });
    expect(k?.elleSonuc).toBe('etkilenmeyen');
    /* Motorun kendi sonucu DURUYOR: elle karar onun yanına yazılır,
       yerine değil — "motor ne demişti" sorusu cevaplanabilir kalır. */
    expect(k?.sonuc).toBe('etkilenen');
    expect(k?.elleKararVerenId).toBe(oturum.id);
    expect(await izVarMi('ZafiyetKorelasyonu', korelasyonId, 'elleSonuc')).not.toBeNull();
  });

  it('kapsam dışı varlığın korelasyonuna karar verilemez', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisB)], () => korelasyonElleKarar({
      korelasyonId, sonuc: 'etkilenmeyen', gerekce: 'Kapsam dışı deneme yapılıyor burada.',
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-26 · SBOM yükleme ════════════════════════════════════════════ */

const SBOM = JSON.stringify({
  bomFormat: 'CycloneDX', specVersion: '1.5',
  components: [
    { name: 'openssl', version: '3.0.8', purl: 'pkg:generic/openssl@3.0.8' },
    { name: 'zlib', version: '1.2.13' },
    { name: 'zlib', version: '1.2.13' },   // yinelenen — tekilleşmeli
    { version: '1.0' },                     // adsız — reddedilmeli
  ],
});

describe('OT-26 · SBOM yükleme', () => {
  it('bozuk SBOM ÜRÜNE GİRMEDEN reddedilir', async () => {
    const s = await sbomYukle({
      varlikId: varlikA, icerik: '{bozuk', kaynakSistem: 'test', kaynakKayitId: benzersiz('sbom'),
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/JSON/i);
  });

  it('geçerli SBOM yüklenir, tekilleşir, reddedileni RAPORLAR', async () => {
    const s = await sbomYukle({
      varlikId: varlikA, icerik: SBOM, kaynakSistem: 'test-sbom', kaynakKayitId: benzersiz('sbom'),
    });
    expect(hataMetni(s)).toBe('');
    expect(s.ok && s.ozet?.kabul).toBe(2);   // 3 bileşen → 2 tekil
    expect(s.ok && s.ozet?.red).toBe(1);     // adsız satır
    expect(await izVarMi('Varlik', varlikA, 'sbom')).not.toBeNull();
  });

  it('bileşenler KANONİK KİMLİKLE tekilleşir — sürümsüz bileşen çoğalmaz', async () => {
    const kayitId = benzersiz('sbom');
    const sursuz = JSON.stringify({
      bomFormat: 'CycloneDX',
      components: [{ name: 'sursuz-kutuphane' }, { name: 'sursuz-kutuphane' }],
    });
    await sbomYukle({ varlikId: varlikA, icerik: sursuz, kaynakSistem: 'test-sbom2', kaynakKayitId: kayitId });
    /* Aynı yükleme ikinci kez: `@@unique([ad,surum,purl])` nullable
       kolonlardan kurulsaydı SQLite NULL'ları farklı sayar ve her
       yüklemede yeni satır açardı. Kanonik `kimlik` bunu engelliyor. */
    await sbomYukle({ varlikId: varlikA, icerik: sursuz, kaynakSistem: 'test-sbom2', kaynakKayitId: kayitId });
    const adet = await db.yazilimBileseni.count({ where: { ad: 'sursuz-kutuphane' } });
    expect(adet).toBe(1);
  });

  it('kapsam dışı varlığa SBOM yüklenemez', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => sbomYukle({
      varlikId: varlikB, icerik: SBOM, kaynakSistem: 'test', kaynakKayitId: benzersiz('sbom'),
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-27 · Güvenlik kapsaması ══════════════════════════════════════ */

describe('OT-27 · kapsam beş durumlu ve uygulanamaz GEREKÇE ister', () => {
  it('geçersiz tip ve durum reddedilir', async () => {
    expect((await kapsamKaydet({ varlikId: varlikA, tip: 'yokboyle', durum: 'kapsanan' })).ok).toBe(false);
    expect((await kapsamKaydet({ varlikId: varlikA, tip: 'edr', durum: 'yokboyle' })).ok).toBe(false);
  });

  it('gerekçesiz "uygulanamaz" REDDEDİLİR', async () => {
    const s = await kapsamKaydet({ varlikId: varlikA, tip: 'edr', durum: 'uygulanamaz' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/gerekçe/i);
  });

  it('kapsam yazılır, DOĞRULAMA ZAMANI damgalanır ve İZE düşer', async () => {
    const s = await kapsamKaydet({ varlikId: varlikA, tip: 'siem', durum: 'kapsanan' });
    expect(hataMetni(s)).toBe('');
    const k = await db.guvenlikKapsami.findUnique({
      where: { varlikId_tip: { varlikId: varlikA, tip: 'siem' } },
    });
    /* Elle kaydedilen kapsam O AN doğrulanmıştır; damga olmasaydı
       tazelik kuralı her elle kaydı bayat sayardı. */
    expect(k?.sonDogrulama).not.toBeNull();
    expect(await izVarMi('Varlik', varlikA, 'kapsam:siem')).not.toBeNull();
  });

  it('gerekçeli uygulanamaz kabul edilir', async () => {
    const s = await kapsamKaydet({
      varlikId: varlikA, tip: 'mfa', durum: 'uygulanamaz',
      gerekce: 'Cihaz yerel konsoldan yönetiliyor; MFA destekleyen arayüzü yok.',
    });
    expect(hataMetni(s)).toBe('');
  });
});

/* ══ OT-44 · Veri kalitesi kararı ════════════════════════════════════ */

describe('OT-44 · bulgu kapatma gerekçeli ve izlidir', () => {
  let bulguId = '';
  beforeAll(async () => {
    const b = await db.veriKalitesiBulgusu.create({
      data: {
        kural: 'cift_ip', kaynakTipi: 'Varlik', kaynakId: varlikA,
        aciklama: 'Test bulgusu', durum: 'acik',
      },
    });
    bulguId = b.id;
  });

  it('gerekçesiz kapatma reddedilir', async () => {
    const s = await veriKalitesiBulgusuKapat({ bulguId, karar: 'giderildi', gerekce: 'ok' });
    expect(s.ok).toBe(false);
  });

  it('kapatma yazılır ve KARAR izde görünür', async () => {
    const s = await veriKalitesiBulgusuKapat({
      bulguId, karar: 'kabul_edildi',
      gerekce: 'Çift IP bilinçli: yedekli hat, aktif/pasif çalışıyor.',
    });
    expect(hataMetni(s)).toBe('');
    const b = await db.veriKalitesiBulgusu.findUnique({ where: { id: bulguId } });
    expect(b?.durum).toBe('kapandi');
    const izKaydi = await izVarMi('VeriKalitesiBulgusu', bulguId, 'durum');
    expect(izKaydi?.yeniDeger).toBe('kabul_edildi');
  });

  it('kapalı bulgu ikinci kez kapatılamaz', async () => {
    const s = await veriKalitesiBulgusuKapat({
      bulguId, karar: 'giderildi', gerekce: 'İkinci kez kapatma denemesi yapılıyor.',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/kapalı/i);
  });
});
