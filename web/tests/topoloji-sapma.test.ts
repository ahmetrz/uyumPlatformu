import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-topo-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const T = await import('@/lib/entegrasyon/topoloji');
const { topolojiSapmasiniIsle, sonTopolojiKosusu, TOPOLOJI_CONNECTOR_TIPLERI } =
  await import('@/lib/motorlar/topolojiSapma');

type Oge = import('@/lib/entegrasyon/topoloji').TopolojiOgesi;

/* Sabit test topolojisi: kurumsal → OT-DMZ → OT üç bölgeli klasik dizilim. */
const dugum = (anahtar: string, ip: string | null, bolgeKodu: string, bolgeTipi: string): Oge =>
  ({ tip: 'dugum', anahtar, ozellikler: { ip, bolgeKodu, bolgeTipi } });
const gecit = (
  k: string, h: string, kt: string, ht: string,
  ek: { protokoller?: string[]; onaylandi?: boolean | null } = {},
): Oge => ({
  tip: 'gecit', anahtar: `${k}>${h}`,
  ozellikler: {
    kaynakBolge: k, hedefBolge: h, kaynakTipi: kt, hedefTipi: ht,
    protokoller: ek.protokoller ?? ['https'],
    onaylandi: ek.onaylandi === undefined ? true : ek.onaylandi,
  },
});
const baglanti = (
  k: string, h: string, kb: string, hb: string, kt: string, ht: string,
  ek: Record<string, unknown> = {},
): Oge => ({
  tip: 'baglanti', anahtar: `${k}>${h}`,
  ozellikler: { kaynak: k, hedef: h, kaynakBolge: kb, hedefBolge: hb,
    kaynakTipi: kt, hedefTipi: ht, ...ek },
});

const TEMEL_OGELER: Oge[] = [
  dugum('SRV-KURUMSAL-01', '10.10.0.5', 'Z-KURUMSAL', 'kurumsal'),
  dugum('SRV-DMZ-01', '10.20.0.5', 'Z-OT-DMZ', 'ot_dmz'),
  dugum('PLC-01', '192.168.10.11', 'Z-OT', 'ot'),
  gecit('Z-KURUMSAL', 'Z-OT-DMZ', 'kurumsal', 'ot_dmz', { protokoller: ['https'] }),
  gecit('Z-OT-DMZ', 'Z-OT', 'ot_dmz', 'ot', { protokoller: ['opc-ua'] }),
  baglanti('SRV-DMZ-01', 'PLC-01', 'Z-OT-DMZ', 'Z-OT', 'ot_dmz', 'ot',
    { protokoller: ['opc-ua'], izinliProtokoller: ['opc-ua'] }),
];

let kullaniciId = '';
let ikinciKullaniciId = '';

/** Her testin kendi tesisi olsun — temel ve sapmalar birbirine karışmasın. */
async function tesisAc(kod: string): Promise<string> {
  const t = await db.tesis.create({
    data: { kod, ad: `Topoloji testi ${kod}` } });
  return t.id;
}

/** Anlık yaz + (istenirse) temel olarak onayla. */
async function anlik(tesisId: string, ogeler: Oge[], temelYap = false) {
  const s = await T.anlikAl(tesisId, 'test_kaynak', ogeler);
  if (temelYap) await T.temelBelirle(s.id, kullaniciId, 'Test temeli onaylandı.');
  return s;
}

describe('Topoloji sapma tespiti (P2-2)', () => {
  beforeAll(async () => {
    const kullanicilar = await db.kullanici.findMany({ take: 2, orderBy: { eposta: 'asc' } });
    kullaniciId = kullanicilar[0].id;
    ikinciKullaniciId = kullanicilar[1]?.id ?? kullanicilar[0].id;
  });

  /* ── 1 · temel yoksa hesap yok ──────────────────────────────────── */

  it('temel yokken sapma HESAPLANMAZ — ilk anlık kendiliğinden temel olmaz [TOP-SAP-001]', async () => {
    const tesisId = await tesisAc('TOPO-TEMELSIZ');
    const ilk = await anlik(tesisId, TEMEL_OGELER);

    // İlk anlık otomatik temel OLMADI
    const kayit = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: ilk.id } });
    expect(kayit.temelMi).toBe(false);
    expect(kayit.onaylayanId).toBeNull();
    expect(await T.temelAnlik(tesisId)).toBeNull();

    // ikinci anlık gelse bile karşılaştırma yapılmaz
    const ikinci = await anlik(tesisId, [...TEMEL_OGELER, dugum('YENI-01', '10.10.0.9', 'Z-KURUMSAL', 'kurumsal')]);
    const sonuc = await T.anligiKarsilastir(ikinci.id);
    expect(sonuc.durum).toBe('temel_yok');
    expect(sonuc.sapmalar).toHaveLength(0);
    expect(await db.topolojiSapmasi.count({ where: { tesisId } })).toBe(0);
  });

  it('temelsiz anlık MOTORU da hata verdirmez; koşu "temel_yok" der', async () => {
    const oncekiKosu = await sonTopolojiKosusu();
    await expect(topolojiSapmasiniIsle()).resolves.toBeDefined();
    const kosu = await sonTopolojiKosusu();
    expect(kosu?.id).not.toBe(oncekiKosu?.id);
    expect(['basarili', 'temel_yok', 'kaynak_yok']).toContain(kosu?.durum);
    expect(kosu?.hata).toBeNull(); // temelsizlik HATA DEĞİL
    const temelsizTesis = await db.tesis.findUniqueOrThrow({ where: { kod: 'TOPO-TEMELSIZ' } });
    expect(await db.topolojiSapmasi.count({ where: { tesisId: temelsizTesis.id } })).toBe(0);
  });

  /* ── 2 · özet ──────────────────────────────────────────────────── */

  it('özet sıralamadan bağımsız; içerik değişince değişir', async () => {
    const ters = [...TEMEL_OGELER].reverse();
    expect(T.ozetHesapla(ters)).toBe(T.ozetHesapla(TEMEL_OGELER));
    const degisik = [...TEMEL_OGELER, dugum('EK-01', null, 'Z-OT', 'ot')];
    expect(T.ozetHesapla(degisik)).not.toBe(T.ozetHesapla(TEMEL_OGELER));
  });

  it('boş gözlem kümesi anlık sayılmaz — sessizce "her şey kayboldu" üretmez', async () => {
    const tesisId = await tesisAc('TOPO-BOS');
    await expect(T.anlikAl(tesisId, 'test_kaynak', [])).rejects.toThrow(/boş gözlem/i);
  });

  /* ── 3 · tespit kuralları (saf karşılaştırma) ──────────────────── */

  const gorunum = (ogeler: Oge[]) => ({ ogeler });

  it('yeni düğüm tespit edilir; OT bölgesindeki yeni düğüm daha ağırdır', () => {
    const sapmalar = T.sapmalariHesapla(
      gorunum(TEMEL_OGELER),
      gorunum([...TEMEL_OGELER,
        dugum('LAPTOP-99', '10.10.0.99', 'Z-KURUMSAL', 'kurumsal'),
        dugum('BILINMEYEN-OT', '192.168.10.99', 'Z-OT', 'ot')]),
    );
    const yeni = sapmalar.filter((s) => s.tip === 'yeni_dugum');
    expect(yeni.map((s) => s.anahtar).sort()).toEqual(['BILINMEYEN-OT', 'LAPTOP-99']);
    expect(yeni.find((s) => s.anahtar === 'BILINMEYEN-OT')!.siddet).toBe('yuksek');
    expect(yeni.find((s) => s.anahtar === 'LAPTOP-99')!.siddet).toBe('orta');
  });

  it('kayıp düğüm ORTA şiddettedir (silinmiş de olabilir, kapalı da — bilinmiyor)', () => {
    const eksik = TEMEL_OGELER.filter((o) => o.anahtar !== 'PLC-01');
    const sapmalar = T.sapmalariHesapla(gorunum(TEMEL_OGELER), gorunum(eksik));
    const kayip = sapmalar.find((s) => s.tip === 'kayip_dugum');
    expect(kayip).toBeDefined();
    expect(kayip!.anahtar).toBe('PLC-01');
    expect(kayip!.siddet).toBe('orta');
    expect(kayip!.aciklama).toMatch(/kapalı|görülemem/i);
  });

  it('IP değişikliği DÜŞÜK (DHCP olağan), bölge değişikliği ayrı sapmadır', () => {
    const degisik = TEMEL_OGELER.map((o) =>
      o.anahtar === 'SRV-KURUMSAL-01'
        ? dugum('SRV-KURUMSAL-01', '10.10.0.77', 'Z-KURUMSAL', 'kurumsal') : o);
    const s1 = T.sapmalariHesapla(gorunum(TEMEL_OGELER), gorunum(degisik));
    expect(s1.find((s) => s.tip === 'ip_degisti')!.siddet).toBe('dusuk');
    expect(s1.some((s) => s.tip === 'bolge_degisti')).toBe(false);

    const tasindi = TEMEL_OGELER.map((o) =>
      o.anahtar === 'SRV-KURUMSAL-01'
        ? dugum('SRV-KURUMSAL-01', '10.10.0.5', 'Z-OT', 'ot') : o);
    const s2 = T.sapmalariHesapla(gorunum(TEMEL_OGELER), gorunum(tasindi));
    const bolge = s2.find((s) => s.tip === 'bolge_degisti');
    expect(bolge!.siddet).toBe('yuksek'); // OT'ye taşınma segmentasyon sınırını kaydırır
  });

  it('BT/kurumsal → OT DOĞRUDAN yeni bağlantı KRİTİKTİR', () => {
    const sapmalar = T.sapmalariHesapla(
      gorunum(TEMEL_OGELER),
      gorunum([...TEMEL_OGELER,
        baglanti('SRV-KURUMSAL-01', 'PLC-01', 'Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot',
          { protokoller: ['modbus-tcp'] })]),
    );
    const s = sapmalar.find((x) => x.tip === 'yetkisiz_dogrudan_baglanti');
    expect(s).toBeDefined();
    expect(s!.siddet).toBe('kritik');
    expect(s!.anahtar).toBe('SRV-KURUMSAL-01>PLC-01');
  });

  it('ONAYSIZ yeni geçit KRİTİK; onay durumu BİLİNMİYORSA kritik denmez', () => {
    const onaysiz = T.sapmalariHesapla(
      gorunum(TEMEL_OGELER),
      gorunum([...TEMEL_OGELER,
        gecit('Z-KURUMSAL', 'Z-BT-2', 'kurumsal', 'bt', { onaylandi: false })]),
    ).find((s) => s.tip === 'yeni_gecit');
    expect(onaysiz!.siddet).toBe('kritik');

    const bilinmiyor = T.sapmalariHesapla(
      gorunum(TEMEL_OGELER),
      gorunum([...TEMEL_OGELER,
        gecit('Z-KURUMSAL', 'Z-BT-2', 'kurumsal', 'bt', { onaylandi: null })]),
    ).find((s) => s.tip === 'yeni_gecit');
    // bilinmeyen ≠ yanlış: kritik denemez ama incelenmeden de geçilemez
    expect(bilinmiyor!.siddet).toBe('yuksek');
    expect(bilinmiyor!.aciklama).toMatch(/bilinmiyor/i);
  });

  it('BT ile OT arasında doğrudan yeni geçit ayrı tip olarak KRİTİK işaretlenir', () => {
    const sapmalar = T.sapmalariHesapla(
      gorunum(TEMEL_OGELER),
      gorunum([...TEMEL_OGELER,
        gecit('Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot', { onaylandi: true })]),
    );
    const kopru = sapmalar.find((s) => s.tip === 'yeni_bt_ot_koprusu');
    expect(kopru).toBeDefined();
    expect(kopru!.siddet).toBe('kritik');
  });

  it('OT geçidinde beklenmeyen protokol YÜKSEK; silinen geçit ORTA', () => {
    const degisik = TEMEL_OGELER
      .filter((o) => o.anahtar !== 'Z-KURUMSAL>Z-OT-DMZ')
      .map((o) => o.anahtar === 'Z-OT-DMZ>Z-OT'
        ? gecit('Z-OT-DMZ', 'Z-OT', 'ot_dmz', 'ot', { protokoller: ['opc-ua', 'telnet'] })
        : o);
    const sapmalar = T.sapmalariHesapla(gorunum(TEMEL_OGELER), gorunum(degisik));
    const protokol = sapmalar.find((s) => s.tip === 'beklenmeyen_protokol');
    expect(protokol!.siddet).toBe('yuksek');
    expect(protokol!.aciklama).toContain('telnet');
    expect(sapmalar.find((s) => s.tip === 'silinen_gecit')!.siddet).toBe('orta');
  });

  it('yol DMZ atlıyorsa KRİTİK — fiilen doğrudan BT→OT bağlantısıdır', () => {
    const temel = [...TEMEL_OGELER,
      baglanti('SRV-KURUMSAL-01', 'PLC-01', 'Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot',
        { yol: ['Z-KURUMSAL', 'Z-OT-DMZ', 'Z-OT'] })];
    const yeni = [...TEMEL_OGELER,
      baglanti('SRV-KURUMSAL-01', 'PLC-01', 'Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot',
        { yol: ['Z-KURUMSAL', 'Z-OT'] })];
    const s = T.sapmalariHesapla(gorunum(temel), gorunum(yeni)).find((x) => x.tip === 'yol_degisti');
    expect(s!.siddet).toBe('kritik');
  });

  /* ── 4 · akış: kabul / ret ─────────────────────────────────────── */

  it('KABUL edilen sapma yeni temeli yazar, eski temel DÜŞER', async () => {
    const tesisId = await tesisAc('TOPO-KABUL');
    const eskiTemel = await anlik(tesisId, TEMEL_OGELER, true);
    const yeni = await anlik(tesisId, [...TEMEL_OGELER,
      dugum('YENI-SUNUCU', '10.10.0.50', 'Z-KURUMSAL', 'kurumsal')]);

    const karsilastirma = await T.anligiKarsilastir(yeni.id);
    expect(karsilastirma.durum).toBe('sapma_var');
    expect(karsilastirma.yazilan).toBe(1);

    const sapma = await db.topolojiSapmasi.findFirstOrThrow({ where: { anlikId: yeni.id } });
    expect(sapma.durum).toBe('gozlendi');

    await T.incelemeyeAl(sapma.id, kullaniciId);
    expect((await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } })).durum)
      .toBe('inceleme');

    const sonuc = await T.sapmaKarari({
      sapmaId: sapma.id, karar: 'kabul', kararVerenId: ikinciKullaniciId,
      gerekce: 'Yeni sunucu değişiklik kaydıyla kuruldu; temel güncellensin.',
    });
    expect(sonuc.temelGuncellendi).toBe(true);
    expect(sonuc.dusenTemelId).toBe(eskiTemel.id);

    const temel = await T.temelAnlik(tesisId);
    expect(temel!.id).toBe(yeni.id);
    expect(temel!.onaylayanId).toBe(ikinciKullaniciId);
    expect((await db.topolojiAnlik.findUniqueOrThrow({ where: { id: eskiTemel.id } })).temelMi)
      .toBe(false);

    // karar izi kaydedildi
    const karar = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
    expect(karar.durum).toBe('kabul');
    expect(karar.kararVerenId).toBe(ikinciKullaniciId);
    expect(karar.kararZamani).not.toBeNull();
    expect(karar.kararGerekcesi).toMatch(/değişiklik kaydıyla/);
  });

  it('REDDEDİLEN sapmada temel DEĞİŞMEZ', async () => {
    const tesisId = await tesisAc('TOPO-RET');
    const temelAnligi = await anlik(tesisId, TEMEL_OGELER, true);
    const yeni = await anlik(tesisId, [...TEMEL_OGELER,
      gecit('Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot', { onaylandi: false })]);
    await T.anligiKarsilastir(yeni.id);

    const sapma = await db.topolojiSapmasi.findFirstOrThrow({ where: { anlikId: yeni.id } });
    expect(sapma.siddet).toBe('kritik');

    const sonuc = await T.sapmaKarari({
      sapmaId: sapma.id, karar: 'ret', kararVerenId: kullaniciId,
      gerekce: 'Bu köprü yetkisiz açılmış; kaldırılacak, temele alınmayacak.',
    });
    expect(sonuc.temelGuncellendi).toBe(false);

    const temel = await T.temelAnlik(tesisId);
    expect(temel!.id).toBe(temelAnligi.id); // temel KORUNDU
    expect((await db.topolojiAnlik.findUniqueOrThrow({ where: { id: yeni.id } })).temelMi)
      .toBe(false);
    expect((await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } })).durum)
      .toBe('ret');
  });

  it('anlığın bir farkı bile açık/reddedilmişse kabul temeli TAŞIMAZ', async () => {
    const tesisId = await tesisAc('TOPO-KISMI');
    const temelAnligi = await anlik(tesisId, TEMEL_OGELER, true);
    const yeni = await anlik(tesisId, [...TEMEL_OGELER,
      dugum('EK-A', '10.10.0.61', 'Z-KURUMSAL', 'kurumsal'),
      dugum('EK-B', '10.10.0.62', 'Z-KURUMSAL', 'kurumsal')]);
    await T.anligiKarsilastir(yeni.id);

    const sapmalar = await db.topolojiSapmasi.findMany({ where: { anlikId: yeni.id } });
    expect(sapmalar).toHaveLength(2);

    const ilk = await T.sapmaKarari({
      sapmaId: sapmalar[0].id, karar: 'kabul', kararVerenId: kullaniciId,
      gerekce: 'Bu sunucu bilinen bir kurulumdur, kabul edildi.' });
    expect(ilk.temelGuncellendi).toBe(false); // diğeri hâlâ açık
    expect(ilk.bekleyen).toBe(1);
    expect((await T.temelAnlik(tesisId))!.id).toBe(temelAnligi.id);

    const ikinci = await T.sapmaKarari({
      sapmaId: sapmalar[1].id, karar: 'kabul', kararVerenId: kullaniciId,
      gerekce: 'İkinci sunucu da bilinen bir kurulumdur, kabul edildi.' });
    expect(ikinci.temelGuncellendi).toBe(true); // hepsi kabul → temel taşındı
    expect((await T.temelAnlik(tesisId))!.id).toBe(yeni.id);
  });

  it('GEREKÇESİZ karar reddedilir; yetersiz gerekçe de reddedilir', async () => {
    const tesisId = await tesisAc('TOPO-GEREKCE');
    await anlik(tesisId, TEMEL_OGELER, true);
    const yeni = await anlik(tesisId, [...TEMEL_OGELER,
      dugum('EK-C', '10.10.0.71', 'Z-KURUMSAL', 'kurumsal')]);
    await T.anligiKarsilastir(yeni.id);
    const sapma = await db.topolojiSapmasi.findFirstOrThrow({ where: { anlikId: yeni.id } });

    await expect(T.sapmaKarari({
      sapmaId: sapma.id, karar: 'kabul', kararVerenId: kullaniciId, gerekce: '',
    })).rejects.toThrow(/gerekçe zorunlu/i);
    await expect(T.sapmaKarari({
      sapmaId: sapma.id, karar: 'ret', kararVerenId: kullaniciId, gerekce: '   ',
    })).rejects.toThrow(/gerekçe zorunlu/i);
    await expect(T.sapmaKarari({
      sapmaId: sapma.id, karar: 'kabul', kararVerenId: kullaniciId, gerekce: 'kısa',
    })).rejects.toThrow(/en az 10/i);
    // karar verenin kimliği olmadan da geçmez
    await expect(T.sapmaKarari({
      sapmaId: sapma.id, karar: 'kabul', kararVerenId: '', gerekce: 'Yeterince uzun bir gerekçe.',
    })).rejects.toThrow(/karar veren zorunlu/i);

    // hiçbiri geçmedi: sapma hâlâ açık, temel yerinde
    expect((await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } })).durum)
      .toBe('gozlendi');
    // temel de gerekçesiz kurulamaz
    await expect(T.temelBelirle(yeni.id, kullaniciId, '')).rejects.toThrow(/gerekçe zorunlu/i);
    await expect(T.temelBelirle(yeni.id, '', 'Yeterince uzun bir gerekçe.'))
      .rejects.toThrow(/onaylayan zorunlu/i);
  });

  /* ── 5 · sapma ağı DEĞİŞTİRMEZ ─────────────────────────────────── */

  it('sapma tespiti ve kararı AgGeciti / AgBolgesi / Varlik üzerinde HİÇBİR değişiklik yapmaz', async () => {
    const parmakIzi = async () => JSON.stringify({
      gecitler: await db.agGeciti.findMany({ orderBy: { id: 'asc' } }),
      bolgeler: await db.agBolgesi.findMany({ orderBy: { id: 'asc' } }),
      varliklar: await db.varlik.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, etiket: true, ipAdresi: true, bolgeId: true,
          guncellendi: true, silindi: true } }),
      iliskiler: await db.varlikIliskisi.findMany({ orderBy: { id: 'asc' } }),
    });

    const tesisId = await tesisAc('TOPO-DOKUNMA');
    await anlik(tesisId, TEMEL_OGELER, true);
    const once = await parmakIzi();

    // Gerçek ağda "olsa" en ağır sayılacak farkları içeren anlık
    const yeni = await anlik(tesisId, [
      ...TEMEL_OGELER.filter((o) => o.anahtar !== 'PLC-01'),
      dugum('PLC-01', '192.168.10.44', 'Z-KURUMSAL', 'kurumsal'),
      gecit('Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot', { onaylandi: false }),
      baglanti('SRV-KURUMSAL-01', 'PLC-01', 'Z-KURUMSAL', 'Z-OT', 'kurumsal', 'ot',
        { protokoller: ['modbus-tcp'] }),
    ]);
    const karsilastirma = await T.anligiKarsilastir(yeni.id);
    expect(karsilastirma.sapmalar.some((s) => s.siddet === 'kritik')).toBe(true);
    expect(await parmakIzi()).toBe(once); // tespit hiçbir şeyi değiştirmedi

    // motor koşusu da değiştirmez
    await topolojiSapmasiniIsle();
    expect(await parmakIzi()).toBe(once);

    // kararlar da değiştirmez (biri kabul, biri ret)
    const sapmalar = await db.topolojiSapmasi.findMany({ where: { anlikId: yeni.id } });
    await T.sapmaKarari({ sapmaId: sapmalar[0].id, karar: 'kabul', kararVerenId: kullaniciId,
      gerekce: 'Kabul kararı da ağa dokunmamalı — bu test onu doğruluyor.' });
    await T.sapmaKarari({ sapmaId: sapmalar[1].id, karar: 'ret', kararVerenId: kullaniciId,
      gerekce: 'Ret kararı da ağa dokunmamalı — bu test onu doğruluyor.' });
    expect(await parmakIzi()).toBe(once);
  });

  /* ── 6 · aday üretimi ──────────────────────────────────────────── */

  it('kritik sapma risk/bulgu ADAYI üretir ama kaydı AÇMAZ; kaydı insan açar', async () => {
    const tesisId = await tesisAc('TOPO-ADAY');
    await anlik(tesisId, TEMEL_OGELER, true);
    const yeni = await anlik(tesisId, [...TEMEL_OGELER,
      gecit('Z-KURUMSAL', 'Z-BT-9', 'kurumsal', 'bt', { onaylandi: false })]);
    await T.anligiKarsilastir(yeni.id);

    const sapma = await db.topolojiSapmasi.findFirstOrThrow({ where: { anlikId: yeni.id } });
    expect(sapma.siddet).toBe('kritik');
    // motor kaydı AÇMADI
    expect(sapma.uretilenRiskId).toBeNull();
    expect(sapma.uretilenBulguId).toBeNull();

    const adaylar = await T.bekleyenAdaylar([tesisId]);
    expect(adaylar).toHaveLength(1);
    expect(adaylar[0].aday.kaynak).toBe('topoloji_sapma');
    expect(adaylar[0].aday.kaynakRef).toBe(sapma.id);

    // orta şiddetli sapma aday üretmez
    expect(T.sapmaAdayi({ ...sapma, siddet: 'orta' })).toBeNull();

    // insan kaydı açınca uretilenRiskId dolar
    const riskOnce = await db.risk.count();
    const { riskId } = await T.riskKaydiAc(sapma.id, kullaniciId, {
      kod: `RSK-TOPO-${Date.now()}`,
      gerekce: 'Onaysız geçit için risk kaydı açıldı (insan kararı).',
    });
    expect(await db.risk.count()).toBe(riskOnce + 1);
    expect((await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } })).uretilenRiskId)
      .toBe(riskId);
    // skor uydurulmadı: bilinmeyen bilinmeyen kaldı
    const risk = await db.risk.findUniqueOrThrow({ where: { id: riskId } });
    expect(risk.olasilik).toBeNull();
    expect(risk.dogalRisk).toBeNull();
    // ikinci kez açılamaz
    await expect(T.riskKaydiAc(sapma.id, kullaniciId, {
      kod: 'RSK-TOPO-IKINCI', gerekce: 'Mükerrer kayıt denemesi.' }))
      .rejects.toThrow(/zaten/i);
    // aktörsüz açılamaz
    await expect(T.riskKaydiAc(sapma.id, '', { kod: 'RSK-X', gerekce: 'Aktörsüz deneme.' }))
      .rejects.toThrow(/aktör zorunlu/i);
  });

  /* ── 7 · motor ─────────────────────────────────────────────────── */

  it('motor: kaynak yoksa hata vermez, sıfır işler ve koşu kaydında SÖYLER', async () => {
    // İşlenmemiş anlık bırakma; topoloji gözlemi üreten connector'ları da kapat.
    await db.topolojiSapmasi.deleteMany({});
    await db.topolojiAnlik.deleteMany({ where: { temelMi: false } });
    const topolojiKaynaklari = { tip: { in: [...TOPOLOJI_CONNECTOR_TIPLERI] } };
    await db.connector.updateMany({ where: topolojiKaynaklari, data: { etkin: false } });
    expect(await db.connector.count({ where: { ...topolojiKaynaklari, etkin: true, silindi: null } }))
      .toBe(0);

    const sonuc = await topolojiSapmasiniIsle();
    expect(sonuc).toEqual({ islenen: 0, uretilen: 0 }); // hata YOK, sıfır işledi

    const kosu = await sonTopolojiKosusu();
    expect(kosu!.durum).toBe('kaynak_yok'); // koşu kaydı sebebi açıkça söylüyor
    expect(kosu!.hata).toBeNull();          // "kaynak yok" başarısızlık DEĞİLDİR
    expect(kosu!.bitis).not.toBeNull();     // koşu temiz kapandı

    // Kaynak var ama yeni anlık yoksa bu AYNI ŞEY DEĞİLDİR: 'basarili' der.
    await db.connector.updateMany({ where: topolojiKaynaklari, data: { etkin: true } });
    await topolojiSapmasiniIsle();
    expect((await sonTopolojiKosusu())!.durum).toBe('basarili');
  });

  it('motor: temeli olan tesisin yeni anlığını karşılaştırır ve sapmayı yazar', async () => {
    const tesisId = await tesisAc('TOPO-MOTOR');
    await anlik(tesisId, TEMEL_OGELER, true);
    const yeni = await anlik(tesisId, [...TEMEL_OGELER,
      dugum('MOTOR-EK', '10.10.0.80', 'Z-KURUMSAL', 'kurumsal')]);

    const sonuc = await topolojiSapmasiniIsle();
    expect(sonuc.islenen).toBeGreaterThan(0);
    expect(sonuc.uretilen).toBeGreaterThan(0);

    const sapmalar = await db.topolojiSapmasi.findMany({ where: { anlikId: yeni.id } });
    expect(sapmalar.map((s) => s.tip)).toContain('yeni_dugum');
    expect(sapmalar.every((s) => s.durum === 'gozlendi')).toBe(true);

    // ikinci koşu aynı sapmayı ÇOĞALTMAZ
    await topolojiSapmasiniIsle();
    expect(await db.topolojiSapmasi.count({ where: { anlikId: yeni.id } }))
      .toBe(sapmalar.length);
  });

  /* ── 8 · kayıttan anlık ────────────────────────────────────────── */

  it('kayıtlı topolojiden anlık: seed geçitleri ve bölgeleri öğeye dönüşür', async () => {
    const ogeler = await T.mevcutTopolojiOgeleri(null);
    const gecitler = ogeler.filter((o) => o.tip === 'gecit');
    expect(gecitler.length).toBeGreaterThan(0);
    const onaysiz = gecitler.find((g) => g.ozellikler.onaylandi === false);
    expect(onaysiz).toBeDefined(); // seed'de MERKEZ→GOKCEDAG-OT onaysız
    // sonDogrulama özet dışında: kontrol alanı topolojiyi değiştirmez
    expect(Object.keys(gecitler[0].ozellikler)).not.toContain('sonDogrulama');
  });
});
