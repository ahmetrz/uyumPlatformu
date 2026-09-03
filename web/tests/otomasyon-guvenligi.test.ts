import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE ayarlanır (db modülü ilk erişimde okur).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-otom-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { MOTORLAR, MOTOR_ADLARI } = await import('@/lib/motorlar/kayit');
const {
  guvenlikAnligiAl, guvenlikKarsilastir, GUVENLIK_OLCULERI, zinciriCalistir,
} = await import('@/lib/entegrasyon/zincir');

import type { GuvenlikAnligi } from '@/lib/entegrasyon/zincir';

/* ═══════════════════════════════════════════════════════════════════════
   §16 · OTOMASYON GÜVENLİĞİ REGRESYONU

   Ürünün en sert sözü: OTOMASYON ÖNERİR, KARAR VERMEZ. Sekiz şey hiçbir
   motor tarafından otomatik YAPILAMAZ:

     risk kabulü · bulgu kapatma · uygulanabilirlik override'ı ·
     firewall/ağ değişikliği · PLC/DCS değişikliği ·
     yama / firmware güncellemesi · varlık silme · baseline kabulü

   YÖNTEM: kayıt defterindeki (`lib/motorlar/kayit.ts → MOTORLAR`) motorların
   TAMAMI koşturulur ve koşu ÖNCESİ/SONRASI güvenlik anlık görüntüsü
   karşılaştırılır. Yani test motorların ne yaptığını okumaz, NE YAPMADIĞINI
   ÖLÇER — yarın bir motorun içine yazılacak yeni bir satır da bu ağa takılır.

   Ayrıca detect → correlate → propose → HUMAN APPROVE zinciri sabitlenir:
   keşif kaydı insan onayı olmadan CMDB'ye geçemez; öneri 'oneri' kalır.
   ═══════════════════════════════════════════════════════════════════════ */

const ONEK = 'OTOM';

const veri = {
  tesisId: '', turId: '', varlikId: '', riskId: '', bulguId: '',
  kararId: '', gecitId: '', anlikId: '', kesifId: '', adayId: '',
};

/** Motorların HEPSİNİ koşturur. `isKos` sarmalayıcısı kasıtlı olarak
    atlanır: ölçülmek istenen şey motorun kendi yazma davranışıdır, iş
    kaydı kirası değil. Bir motor patlarsa test onu yutmaz. */
async function tumMotorlariKostur(): Promise<string[]> {
  const kosanlar: string[] = [];
  for (const [ad, motor] of Object.entries(MOTORLAR)) {
    await motor();
    kosanlar.push(ad);
  }
  return kosanlar;
}

/** Ölçüde değişen alanları isimleriyle döner — hata mesajı "bir şey değişti"
    demez, NE değiştiğini söyler. */
function farklar(once: GuvenlikAnligi, sonra: GuvenlikAnligi): string[] {
  return (Object.keys(once) as (keyof GuvenlikAnligi)[])
    .filter((a) => once[a] !== sonra[a])
    .map((a) => `${a}: ${JSON.stringify(once[a])} → ${JSON.stringify(sonra[a])}`);
}

/* ═══ kurulum: motorlara çiğneyecek gerçek veri ver ═══════════════════ */

beforeAll(async () => {
  const tesis = await db.tesis.create({ data: {
    kod: `${ONEK}-T`, ad: 'Otomasyon Santrali', durum: 'aktif' } });
  const tur = await db.varlikTuru.create({ data: {
    kod: `${ONEK}-TUR`, ad: 'PLC', sinif: 'OT' } });
  const bolgeBt = await db.agBolgesi.create({ data: {
    kod: `${ONEK}-BT`, ad: 'BT bölgesi', tip: 'bt', tesisId: tesis.id } });
  const bolgeOt = await db.agBolgesi.create({ data: {
    kod: `${ONEK}-OT`, ad: 'OT bölgesi', tip: 'ot', tesisId: tesis.id } });
  veri.tesisId = tesis.id;
  veri.turId = tur.id;

  /* PLC/DCS + yama/firmware ölçüsünün konusu: sahada duran, sahipsiz,
     kritik, EOS'u geçmiş bir OT varlığı. Bu profil `veri_kalitesi`,
     `gap_to_action`, `yedek_dogrulama` ve `deadline_motoru` motorlarının
     hepsini tetikler — yani motorlar bu satıra BAKAR, ama DOKUNAMAZ. */
  const varlik = await db.varlik.create({ data: {
    etiket: `${ONEK}-PLC-1`, ad: 'Türbin PLC', turId: tur.id, tesisId: tesis.id,
    bolgeId: bolgeOt.id, kritiklik: 'kritik', firmware: 'v1.2.3', surum: '1.2.3',
    yamaDurumu: 'eksik', ipAdresi: '10.10.0.5', yasamDongusu: 'aktif',
    eosTarihi: new Date('2025-01-01'), sahipId: null } });
  veri.varlikId = varlik.id;

  // Güvenlik duvarı / zone-to-zone geçidi: ONAY bayrağı insan kararıdır.
  const gecit = await db.agGeciti.create({ data: {
    kaynakBolgeId: bolgeBt.id, hedefBolgeId: bolgeOt.id,
    kontrolVarligi: `${ONEK}-FW-1`, protokoller: 'S7,Modbus', onaylandi: false } });
  veri.gecitId = gecit.id;

  // Topoloji temeli (baseline): onay insan kararıdır.
  const anlik = await db.topolojiAnlik.create({ data: {
    tesisId: tesis.id, kaynak: `${ONEK}-KAYNAK`, ozetHash: `${ONEK}-HASH`,
    temelMi: false } });
  veri.anlikId = anlik.id;
  await db.topolojiSapmasi.create({ data: {
    tesisId: tesis.id, anlikId: anlik.id, tip: 'yeni_bt_ot_koprusu', siddet: 'kritik',
    aciklama: 'BT-OT köprüsü gözlendi', durum: 'gozlendi' } });

  /* Açık bulgu / açık risk / el ile değiştirilmiş karar TOHUM VERİDEN
     seçilir, uydurulmaz: motorların gerçekte baktığı satırlar bunlar.
     Sentetik bir satır motorun sorgu koşullarını (madde bağı, süreç,
     tesis kapsamı) taşımayabilir ve test yanlışlıkla YEŞİL kalırdı. */
  veri.bulguId = (await db.bulgu.findFirstOrThrow({
    where: { durum: 'acik', silindi: null }, orderBy: { id: 'asc' } })).id;
  veri.riskId = (await db.risk.findFirstOrThrow({
    where: { durum: 'acik', silindi: null }, orderBy: { id: 'asc' } })).id;
  veri.kararId = (await db.uygulanabilirlikKarari.findFirstOrThrow({
    where: { elIleDegistirildi: true }, orderBy: { id: 'asc' } })).id;

  // Bekleyen keşif kaydı: CMDB'ye ANCAK insan kararıyla geçer.
  const kesif = await db.kesifKaydi.create({ data: {
    kaynak: `${ONEK}-KESIF`, kaynakKayitId: 'bekleyen-1', tesisId: tesis.id,
    hamJson: '{"hostname":"otom-yeni-cihaz"}', normalJson: '{}',
    durum: 'inceleme_bekliyor', guvenSkoru: 0.97 } });
  veri.kesifId = kesif.id;

  // Öneri: motor üretir, insan terfi ettirir.
  const aday = await db.projeAdayi.create({ data: {
    baslik: `${ONEK} aday`, gerekce: 'test', kaynak: 'eol_eos',
    tesisId: tesis.id, durum: 'oneri' } });
  veri.adayId = aday.id;
});

/* ═══ ölçünün kendisi ════════════════════════════════════════════════ */

describe('Güvenlik anlık görüntüsü sekiz yasağın HEPSİNİ ölçer', () => {
  it('kayıt defterindeki on iki motorun tamamı koşturulabilir', () => {
    /* Yeni bir motor eklenirse bu test onu görür ve sayı değişir.
       Dokuzuncusu `erisim_degerlendirme` (tedarikçi/uzaktan erişim):
       aşağıdaki yasak ölçüleri artık onun koşusunu da kapsıyor. */
    expect(MOTOR_ADLARI).toHaveLength(12);
    expect(Object.keys(MOTORLAR).sort()).toEqual([...MOTOR_ADLARI].sort());
  });

  it('her yasak için bir ölçü vardır — yorumda kalan kural yok', () => {
    const alanlar = GUVENLIK_OLCULERI.map((o) => o.alan);
    /* Bu liste kısalırsa bir yasak ÖLÇÜLMEZ hâle gelmiş demektir; testin
       tek amacı o sessiz gerilemeyi yakalamaktır. */
    expect(alanlar).toEqual(expect.arrayContaining([
      'kabulEdilenRisk',        // risk kabulü
      'kapaliBulgu',            // bulgu kapatma
      'elIleKararImzasi',       // uygulanabilirlik override'ı
      'agGecidiImzasi',         // firewall / ağ değişikliği
      'otVarlikImzasi',         // PLC/DCS + yama/firmware
      'silinmisVarlik',         // varlık silme
      'onayliTopolojiTemeli',   // baseline kabulü
      'kabulEdilenSapma',       // sapma kabulü
      'onaylanmisKesif',        // insan onayı olmadan CMDB
      'oneriDisiProjeAdayi',    // öneri terfisi
    ]));
  });

  it('karşılaştırıcı gerçekten çalışır — sahte ihlal YAKALANIR', async () => {
    /* Ölçüm aracının kendisi sınanmadan "hiç ihlal yok" sonucu bir şey
       kanıtlamaz: hep boş dizi döndüren bir karşılaştırıcı da testi geçerdi. */
    const gercek = await guvenlikAnligiAl();
    expect(guvenlikKarsilastir(gercek, gercek)).toEqual([]);

    const sahte: GuvenlikAnligi = {
      ...gercek,
      kabulEdilenRisk: gercek.kabulEdilenRisk + 1,
      kapaliBulgu: gercek.kapaliBulgu + 1,
      silinmisVarlik: gercek.silinmisVarlik + 1,
      onayliTopolojiTemeli: gercek.onayliTopolojiTemeli + 1,
      kabulEdilenSapma: gercek.kabulEdilenSapma + 1,
      onaylanmisKesif: gercek.onaylanmisKesif + 1,
      oneriDisiProjeAdayi: gercek.oneriDisiProjeAdayi + 1,
      varlikSayisi: gercek.varlikSayisi + 1,
      elIleKararImzasi: 'ezildi',
      agGecidiImzasi: 'ezildi',
      otVarlikImzasi: 'ezildi',
    };
    expect(guvenlikKarsilastir(gercek, sahte)).toHaveLength(GUVENLIK_OLCULERI.length);
  });

  it('sayım ölçüleri yalnız ARTIŞA takılır (azalma meşrudur)', async () => {
    /* `sonTarih` motoru kabul süresi dolan riski 'acik'a çevirir: kabul
       SAYISI DÜŞER. Bu bir ihlal değil, kuralın ta kendisidir — makine
       kabulü geri alabilir, veremez. */
    const gercek = await guvenlikAnligiAl();
    const azalan: GuvenlikAnligi = {
      ...gercek,
      kabulEdilenRisk: gercek.kabulEdilenRisk + 5,
      kapaliBulgu: gercek.kapaliBulgu + 5,
    };
    expect(guvenlikKarsilastir(azalan, gercek)).toEqual([]);
  });
});

/* ═══ asıl regresyon: motorların tamamı koşar ════════════════════════ */

let kararGerekcesiOnce: string | null = null;
let kararUygulanabilirOnce = false;

describe('Motorların TAMAMI koşar — sekiz yasağın hiçbiri çiğnenmez', () => {
  let once: GuvenlikAnligi;
  let sonra: GuvenlikAnligi;

  beforeAll(async () => {
    /* ISINMA KOŞUSU. Motorların MEŞRU ve bir kereye mahsus geçişleri var:
       kabul süresi dolan risk 'acik'a döner, süresi geçen istisna
       'suresi_doldu' olur, günün anlık görüntüsü alınır. Bunlar yasak
       değil, kuralın kendisidir (makine kabulü GERİ ALABİLİR, VEREMEZ).
       Ölçüm bu geçişler bittikten SONRA başlar; böylece test "hiçbir şey
       değişmedi" iddiasını gevşetmeden kurabiliyoruz. */
    await tumMotorlariKostur();

    const karar = await db.uygulanabilirlikKarari.findUniqueOrThrow({
      where: { id: veri.kararId } });
    kararGerekcesiOnce = karar.gerekce;
    kararUygulanabilirOnce = karar.uygulanabilir;

    once = await guvenlikAnligiAl();
    const kosanlar = await tumMotorlariKostur();
    expect(kosanlar).toHaveLength(12);
    sonra = await guvenlikAnligiAl();
  });

  it('hiçbir otomasyon sınırı ihlali yok', () => {
    expect(farklar(once, sonra)).toEqual([]);
    expect(guvenlikKarsilastir(once, sonra)).toEqual([]);
  });

  it('risk KABUL EDİLMEDİ', async () => {
    expect(sonra.kabulEdilenRisk).toBeLessThanOrEqual(once.kabulEdilenRisk);
    expect((await db.risk.findUniqueOrThrow({ where: { id: veri.riskId } })).durum).toBe('acik');
  });

  it('bulgu KAPATILMADI', async () => {
    expect(sonra.kapaliBulgu).toBeLessThanOrEqual(once.kapaliBulgu);
    const b = await db.bulgu.findUniqueOrThrow({ where: { id: veri.bulguId } });
    expect(b.durum).toBe('acik');
    expect(b.kapanmaTarihi).toBeNull();
    expect(b.kapanisDogrulayanId).toBeNull();
  });

  it('uygulanabilirlik override\'ı EZİLMEDİ', async () => {
    expect(sonra.elIleKararImzasi).toBe(once.elIleKararImzasi);
    const k = await db.uygulanabilirlikKarari.findUniqueOrThrow({ where: { id: veri.kararId } });
    // Bayrak da, kararın kendisi de, gerekçesi de olduğu gibi duruyor.
    expect(k.elIleDegistirildi).toBe(true);
    expect(k.gerekce).toBe(kararGerekcesiOnce);
    expect(k.uygulanabilir).toBe(kararUygulanabilirOnce);
  });

  it('firewall / ağ geçidi yapılandırması DEĞİŞMEDİ', async () => {
    expect(sonra.agGecidiImzasi).toBe(once.agGecidiImzasi);
    const g = await db.agGeciti.findUniqueOrThrow({ where: { id: veri.gecitId } });
    expect(g.onaylandi).toBe(false);          // onay insan kararı
    expect(g.protokoller).toBe('S7,Modbus');  // kural metnine dokunulmadı
    expect(g.kontrolVarligi).toBe(`${ONEK}-FW-1`);
  });

  it('PLC/DCS varlığının konfigürasyonu DEĞİŞMEDİ', async () => {
    expect(sonra.otVarlikImzasi).toBe(once.otVarlikImzasi);
    const v = await db.varlik.findUniqueOrThrow({ where: { id: veri.varlikId } });
    expect(v.firmware).toBe('v1.2.3');
    expect(v.surum).toBe('1.2.3');
    expect(v.ipAdresi).toBe('10.10.0.5');
    expect(v.yasamDongusu).toBe('aktif');
  });

  it('yama / firmware durumu GÜNCELLENMEDİ', async () => {
    const v = await db.varlik.findUniqueOrThrow({ where: { id: veri.varlikId } });
    /* `yamaDurumu: 'eksik'` bir BULGUdur; motor onu 'guncel' yapamaz —
       yama uygulamak platformun işi değil, değişiklik sürecinin işidir. */
    expect(v.yamaDurumu).toBe('eksik');
  });

  it('varlık SİLİNMEDİ (yumuşak silme dâhil)', async () => {
    expect(sonra.silinmisVarlik).toBe(once.silinmisVarlik);
    expect(sonra.varlikSayisi).toBe(once.varlikSayisi);
    expect((await db.varlik.findUniqueOrThrow({
      where: { id: veri.varlikId } })).silindi).toBeNull();
  });

  it('topoloji temeli (baseline) KABUL EDİLMEDİ', async () => {
    expect(sonra.onayliTopolojiTemeli).toBe(once.onayliTopolojiTemeli);
    const a = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: veri.anlikId } });
    expect(a.temelMi).toBe(false);
    expect(a.onaylayanId).toBeNull();
    expect(a.onayZamani).toBeNull();
  });

  it('topoloji sapması KABUL EDİLMEDİ — yalnız raporlandı', async () => {
    expect(sonra.kabulEdilenSapma).toBe(once.kabulEdilenSapma);
    const s = await db.topolojiSapmasi.findFirstOrThrow({
      where: { anlikId: veri.anlikId } });
    expect(s.durum).toBe('gozlendi');
    expect(s.kararVerenId).toBeNull();
    // Kritik sapma risk/bulgu ADAYI üretir; kaydı insan açar.
    expect(s.uretilenRiskId).toBeNull();
    expect(s.uretilenBulguId).toBeNull();
  });

  it('motorlar tekrar koşunca da hiçbir şey değişmez (idempotent sınır)', async () => {
    const a = await guvenlikAnligiAl();
    await tumMotorlariKostur();
    const b = await guvenlikAnligiAl();
    expect(farklar(a, b)).toEqual([]);
  });
});

/* ═══ detect → correlate → propose → HUMAN APPROVE ═══════════════════ */

describe('detect → correlate → propose → insan onayı zinciri kopmaz', () => {
  it('keşif kaydı motor koşusundan sonra CMDB\'ye GEÇMEZ', async () => {
    await tumMotorlariKostur();
    const k = await db.kesifKaydi.findUniqueOrThrow({ where: { id: veri.kesifId } });
    // Güven %97 olsa bile: yüksek güven bir ÖNERİdir, karar değil.
    expect(k.durum).not.toBe('onaylandi');
    expect(k.inceleyenId).toBeNull();
    expect(k.incelemeZamani).toBeNull();
    // (b) CMDB'de karşılığı YOK — "geçmedi" iddiası veriyle kanıtlanır
    expect(await db.varlik.count({ where: { hostname: 'otom-yeni-cihaz' } })).toBe(0);
  });

  it('motor koşusu hiçbir keşif kaydını onaylanmış yapmaz', async () => {
    const once = await db.kesifKaydi.count({ where: { durum: 'onaylandi' } });
    await tumMotorlariKostur();
    expect(await db.kesifKaydi.count({ where: { durum: 'onaylandi' } })).toBe(once);
  });

  it('üretilen proje adayları YALNIZ \'oneri\' durumundadır', async () => {
    await tumMotorlariKostur();
    const durumlar = new Set((await db.projeAdayi.findMany({
      select: { durum: true } })).map((a) => a.durum));
    /* `gap_to_action` motoru aday ÜRETİR ama terfi ettiremez. Kurulumdaki
       tohum verisinde insan eliyle terfi ettirilmiş aday olabilir; ölçülen
       şey MOTOR KOŞUSUNUN yeni bir terfi üretmemesidir. */
    expect((await db.projeAdayi.findUniqueOrThrow({
      where: { id: veri.adayId } })).durum).toBe('oneri');
    expect(durumlar.has('oneri')).toBe(true);

    const once = await guvenlikAnligiAl();
    await tumMotorlariKostur();
    const sonra = await guvenlikAnligiAl();
    expect(sonra.oneriDisiProjeAdayi).toBe(once.oneriDisiProjeAdayi);
  });

  it('motorlar hiç VARLIK YARATMAZ — CMDB yazımı insan kararıdır', async () => {
    const once = await db.varlik.count();
    await tumMotorlariKostur();
    expect(await db.varlik.count()).toBe(once);
  });
});

/* ═══ zincir üzerinden: aynı sınır, orkestrasyon katmanında ══════════ */

describe('Entegrasyon zinciri de sınırı korur ve İHLALİ RAPORLAR', () => {
  it('tüm bayraklarla koşan zincir otomasyon ihlali üretmez', async () => {
    const once = await guvenlikAnligiAl();
    const sonuc = await zinciriCalistir({ degisenler: {
      varlik: true, tesis: true, kanit: true, zafiyet: true,
      yedek: true, erisim: true, topoloji: true } });
    const sonra = await guvenlikAnligiAl();

    expect(sonuc.otomasyonIhlalleri).toEqual([]);
    expect(sonuc.zincirHatalari).toEqual([]);
    expect(farklar(once, sonra)).toEqual([]);
    // Zincir gerçekten iş yaptı — boş koşup "ihlal yok" demedi.
    expect(sonuc.kosan.length).toBeGreaterThan(0);
  });

  it('ihlal olsaydı SESSİZ GEÇMEZDİ: kayıt satırı ve rapor alanı hazır', async () => {
    /* İhlali gerçekten üretemeyiz (motorlar yapmıyor) — ölçülen şey
       raporlama yolunun BAĞLI olduğudur: karşılaştırıcı ihlal döndüğünde
       zincir onu `otomasyonIhlalleri` alanına koyar ve
       `zincir_guvenlik_ihlali` iş kaydı açar. Karşılaştırıcının çalıştığı
       yukarıda, alanın var olduğu burada sabitlenir. */
    const sonuc = await zinciriCalistir({ degisenler: { varlik: true } });
    expect(Array.isArray(sonuc.otomasyonIhlalleri)).toBe(true);
    expect(await db.isKosusu.count({
      where: { isAdi: 'zincir_guvenlik_ihlali' } })).toBe(0);
  });
});
