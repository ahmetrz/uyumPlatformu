/* Başlangıç verisi. Tüm sözlükler (sektör, tip, alan, regülasyon, süreç)
   panelden yönetilebilir — burası yalnızca ilk kurulum örneğidir. */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';

const parolaUret = (parola: string) => {
  const tuz = randomBytes(16).toString('hex');
  return `s1$${tuz}$${scryptSync(parola, tuz, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString('hex')}`;
};
const GELISTIRME_PAROLASI = 'Enerji!2026';

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }),
});

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

async function main() {
  // Denetim izi değişmezdir: dolu veritabanına seed atılmaz.
  if (await db.aktiviteKaydi.count() > 0) {
    console.error('Veritabanı dolu. Yeniden seed için önce prisma/dev.db dosyasını silin.');
    process.exit(1);
  }
  await db.kanitBaglantisi.deleteMany();
  await db.kanit.deleteMany();
  await db.aksiyon.deleteMany();
  await db.projeBaglantisi.deleteMany();
  await db.proje.deleteMany();
  await db.bulgu.deleteMany();
  await db.maddeDurumu.deleteMany();
  await db.surecKapsami.deleteMany();
  await db.yetki.deleteMany();
  await db.uyumSureci.deleteMany();
  await db.maddeAlan.deleteMany();
  await db.madde.deleteMany();
  await db.iceAktarim.deleteMany();
  await db.regulasyon.deleteMany();
  await db.kapsamAlani.deleteMany();
  await db.tesis.deleteMany();
  await db.tesisTipi.deleteMany();
  await db.sektor.deleteMany();
  await db.kullanici.deleteMany();

  // ---- sektör ve tesis tipleri (panelden genişletilebilir)
  const elektrik = await db.sektor.create({ data: { kod: 'ELEKTRIK-URETIM', ad: 'Elektrik Üretimi' } });
  const tip = Object.fromEntries(await Promise.all(
    [
      ['DGKC', 'Doğal Gaz Kombine Çevrim', 1], ['JEO', 'Jeotermal', 2], ['HES', 'Hidroelektrik', 3],
      ['RES', 'Rüzgâr', 4], ['GES', 'Güneş', 5], ['MERKEZ', 'Merkez BT', 9],
    ].map(async ([kod, ad, sira]) => [kod, await db.tesisTipi.create({
      data: { kod: kod as string, ad: ad as string, sira: sira as number, sektorId: elektrik.id } })]),
  )) as Record<string, { id: string }>;

  // ---- tesisler (biri kapalı: satış örneği)
  const t = Object.fromEntries(await Promise.all(([
    ['ADANA-DGKC', 'Adana DGKÇ Santrali', 'DGKC', 790, 'Adana', 'aktif', null, null],
    ['SEYHAN-HES', 'Seyhan HES', 'HES', 138, 'Adana', 'aktif', null, null],
    ['BELEN-RES', 'Belen RES', 'RES', 96, 'Hatay', 'aktif', null, null],
    ['AYDIN-JEO', 'Germencik Jeotermal', 'JEO', 47, 'Aydın', 'aktif', null, null],
    ['KONYA-GES', 'Karapınar GES', 'GES', 63, 'Konya', 'aktif', null, null],
    ['MERKEZ', 'Genel Müdürlük Veri Merkezi', 'MERKEZ', null, 'İstanbul', 'aktif', null, null],
    ['VAN-HES', 'Engil HES', 'HES', 24, 'Van', 'kapali', gun(-140), 'satis'],
  ] as const).map(async ([kod, ad, tipKod, guc, konum, durum, kapanis, neden]) => [kod,
    await db.tesis.create({ data: {
      kod, ad, tipId: tip[tipKod].id, kuruluGucMw: guc, konum, durum,
      kapanisTarihi: kapanis, kapanisNedeni: neden, devreyeGiris: gun(-3650),
    } })]))) as Record<string, { id: string }>;

  // ---- kapsam alanları (panelden genişletilebilir)
  const alanBT = await db.kapsamAlani.create({ data: { kod: 'BT', ad: 'Bilgi Teknolojileri' } });
  const alanOT = await db.kapsamAlani.create({ data: { kod: 'OT', ad: 'Operasyonel Teknolojiler (SCADA/EKS)' } });

  // ---- kullanıcılar
  const k = Object.fromEntries(await Promise.all(([
    ['ayse.demir', 'Ayşe Demir', 'BT Direktörü'],
    ['selin.aydin', 'Selin Aydın', 'Uyum Yöneticisi'],
    ['burak.sahin', 'Burak Şahin', 'OT Güvenlik Mühendisi'],
    ['mehmet.kaya', 'Mehmet Kaya', 'Sistem Yöneticisi'],
    ['zeynep.arslan', 'Zeynep Arslan', 'İç Denetçi'],
  ] as const).map(async ([e, ad, unvan]) => [e, await db.kullanici.create({
    data: { eposta: `${e}@enerji.example`, adSoyad: ad, unvan,
      parolaHash: parolaUret(GELISTIRME_PAROLASI) } })]))) as Record<string, { id: string }>;

  // ---- regülasyonlar (başlangıç seti; panelden eklenir)
  const reg = Object.fromEntries(await Promise.all(([
    ['EPDK-SYM', 'EPDK Siber Yetkinlik Modeli', '2024', 'https://www.epdk.gov.tr'],
    ['CBDDO', 'CBDDÖ Bilgi ve İletişim Güvenliği Rehberi', '2.0', 'https://cbddo.gov.tr'],
    ['ISO-27001', 'ISO/IEC 27001 Bilgi Güvenliği YS', '2022', 'https://www.iso.org'],
    ['SPK-BS', 'SPK Bilgi Sistemleri Yönetimi Tebliği', 'VII-128.9', 'https://spk.gov.tr'],
  ] as const).map(async ([kod, ad, surum, url]) => [kod, await db.regulasyon.create({
    data: { kod, ad, surum, kaynakUrl: url, yururlukTarih: gun(-720) } })]))) as Record<string, { id: string }>;

  // ---- maddeler: EPDK-SYM ayrıntılı, diğerleri temsilî
  type M = { kod: string; baslik: string; metin: string; alan: ('BT' | 'OT')[]; kanit?: string; alt?: M[] };
  const epdkAgac: M[] = [
    { kod: '4', baslik: 'Varlık Yönetimi', metin: 'Kritik enerji altyapısına ait BT ve OT varlıklarının envanteri ve sınıflandırması.', alan: ['BT', 'OT'], alt: [
      { kod: '4.1', baslik: 'Varlık Envanteri', metin: 'Tüm BT/OT varlıkları güncel bir envanterde izlenmelidir.', alan: ['BT', 'OT'], kanit: 'kayit', alt: [
        { kod: '4.1.1', baslik: 'Envanter güncelliği', metin: 'Envanter en geç 6 ayda bir gözden geçirilir; değişiklikler 30 gün içinde işlenir.', alan: ['BT', 'OT'], kanit: 'kayit' },
        { kod: '4.1.2', baslik: 'Kritiklik sınıflandırması', metin: 'Varlıklar üretim sürekliliğine etkisine göre sınıflandırılır.', alan: ['OT'], kanit: 'politika' },
      ] },
      { kod: '4.2', baslik: 'Ağ Mimarisi ve Ayrıştırma', metin: 'Kurumsal BT ağı ile endüstriyel kontrol ağı ayrıştırılmalıdır.', alan: ['OT'], alt: [
        { kod: '4.2.1', baslik: 'SCADA segmentasyonu', metin: 'SCADA/EKS ağları, kurumsal ağdan güvenlik bölgeleriyle (zone/conduit) ayrılır; bölgeler arası trafik denetlenir.', alan: ['OT'], kanit: 'konfigurasyon' },
        { kod: '4.2.2', baslik: 'Uzaktan erişim', metin: 'OT ortamına uzaktan erişim çok faktörlü kimlik doğrulama ve kayıt altına alma ile yapılır.', alan: ['BT', 'OT'], kanit: 'konfigurasyon' },
      ] },
    ] },
    { kod: '5', baslik: 'Kimlik ve Erişim Yönetimi', metin: 'Erişim hakları görev ayrılığı ve en az ayrıcalık ilkesine göre yönetilir.', alan: ['BT'], alt: [
      { kod: '5.1', baslik: 'Hesap Yönetimi', metin: 'Hesap açma/kapama süreçleri tanımlı ve izlenebilir olmalıdır.', alan: ['BT'], alt: [
        { kod: '5.1.1', baslik: 'Servis hesapları', metin: 'Servis hesapları envanterde izlenir, parolaları kasada tutulur ve düzenli rotasyona tabidir.', alan: ['BT'], kanit: 'kayit' },
        { kod: '5.1.2', baslik: 'Ayrıcalıklı erişim', metin: 'Ayrıcalıklı oturumlar kaydedilir ve düzenli gözden geçirilir.', alan: ['BT'], kanit: 'kayit' },
      ] },
    ] },
    { kod: '7', baslik: 'Olay Yönetimi ve İzleme', metin: 'Siber olayların tespiti, müdahalesi ve raporlanması.', alan: ['BT', 'OT'], alt: [
      { kod: '7.1', baslik: 'Kayıt Yönetimi', metin: 'Güvenlik olay kayıtları merkezî olarak toplanır.', alan: ['BT', 'OT'], alt: [
        { kod: '7.1.4', baslik: 'OT log toplama', metin: 'Endüstriyel protokol trafiği ve OT sistem kayıtları pasif yöntemlerle merkezî SIEM\'e aktarılır.', alan: ['OT'], kanit: 'konfigurasyon' },
      ] },
      { kod: '7.2', baslik: 'Olay Müdahale Planı', metin: 'EPDK bildirim yükümlülüklerini içeren olay müdahale planı bulunur ve yılda bir tatbikat yapılır.', alan: ['BT', 'OT'], kanit: 'politika' },
    ] },
  ];
  const digerMaddeler: Record<string, M[]> = {
    CBDDO: [
      { kod: '3.1', baslik: 'Ağ Güvenliği', metin: 'Ağ topolojisi belgelenir; kritik bölümler ayrıştırılır.', alan: ['BT', 'OT'], kanit: 'konfigurasyon' },
      { kod: '3.2', baslik: 'Sıkılaştırma', metin: 'Sunucu ve istemciler kurumsal sıkılaştırma standardına göre yapılandırılır.', alan: ['BT'], kanit: 'konfigurasyon' },
      { kod: '4.1', baslik: 'Yetkilendirme', metin: 'Erişim talepleri onay akışıyla yönetilir.', alan: ['BT'], kanit: 'kayit' },
      { kod: '4.2', baslik: 'Denetim İzleri', metin: 'Kritik sistemlerde denetim izleri en az 2 yıl saklanır.', alan: ['BT'], kanit: 'kayit' },
    ],
    'ISO-27001': [
      { kod: 'A.5.9', baslik: 'Bilgi varlıkları envanteri', metin: 'Bilgi ve diğer ilişkili varlıkların envanteri tutulur.', alan: ['BT'], kanit: 'kayit' },
      { kod: 'A.8.9', baslik: 'Konfigürasyon yönetimi', metin: 'Donanım, yazılım ve ağ konfigürasyonları yönetilir.', alan: ['BT', 'OT'], kanit: 'konfigurasyon' },
      { kod: 'A.8.16', baslik: 'İzleme faaliyetleri', metin: 'Ağlar ve sistemler anormal davranış için izlenir.', alan: ['BT', 'OT'], kanit: 'kayit' },
      { kod: 'A.5.24', baslik: 'Olay yönetimi planlaması', metin: 'Bilgi güvenliği olay yönetimi süreci planlanır.', alan: ['BT'], kanit: 'politika' },
    ],
    'SPK-BS': [
      { kod: '11', baslik: 'Erişim kontrolü', metin: 'Bilgi sistemlerine erişim yetkilendirme esaslarına bağlanır.', alan: ['BT'], kanit: 'politika' },
      { kod: '14', baslik: 'Denetim izi', metin: 'İşlem kayıtları değiştirilemez şekilde saklanır.', alan: ['BT'], kanit: 'kayit' },
      { kod: '19', baslik: 'Süreklilik planı', metin: 'İş sürekliliği ve felaket kurtarma planları test edilir.', alan: ['BT'], kanit: 'rapor' },
    ],
  };

  const maddeIdx: Record<string, { id: string }> = {};
  async function maddeEkle(regKod: string, m: M, ustId: string | null, sira: number) {
    const kayit = await db.madde.create({ data: {
      regulasyonId: reg[regKod].id, ustMaddeId: ustId,
      kod: `${regKod}-${m.kod}`, baslik: m.baslik, metin: m.metin,
      kanitTipi: m.kanit ?? null, sira,
    } });
    maddeIdx[`${regKod}-${m.kod}`] = kayit;
    for (const a of m.alan) {
      await db.maddeAlan.create({ data: {
        maddeId: kayit.id, alanId: a === 'BT' ? alanBT.id : alanOT.id } });
    }
    for (const [i, alt] of (m.alt ?? []).entries()) await maddeEkle(regKod, alt, kayit.id, i);
  }
  for (const [i, m] of epdkAgac.entries()) await maddeEkle('EPDK-SYM', m, null, i);
  for (const [regKod, liste] of Object.entries(digerMaddeler))
    for (const [i, m] of liste.entries()) await maddeEkle(regKod, m, null, i);

  // ---- regülasyonlar arası denklikler
  const denklikler: [string, string, string][] = [
    ['EPDK-SYM-4.1', 'ISO-27001-A.5.9', 'tam'],
    ['EPDK-SYM-4.2.1', 'CBDDO-3.1', 'kismi'],
    ['EPDK-SYM-5.1.2', 'CBDDO-4.2', 'kismi'],
    ['EPDK-SYM-5.1.2', 'SPK-BS-14', 'ilgili'],
    ['EPDK-SYM-7.1.4', 'ISO-27001-A.8.16', 'kismi'],
    ['EPDK-SYM-7.2', 'ISO-27001-A.5.24', 'tam'],
    ['CBDDO-4.1', 'SPK-BS-11', 'ilgili'],
    ['ISO-27001-A.8.9', 'CBDDO-3.2', 'kismi'],
  ];
  for (const [a, b, d] of denklikler)
    await db.maddeEslestirmesi.create({ data: {
      kaynakId: maddeIdx[a].id, hedefId: maddeIdx[b].id, denklik: d } });

  // ---- uyum süreçleri (denetimler) — biri pasif örnek
  const surecEpdk = await db.uyumSureci.create({ data: {
    kod: 'EPDK-SYM-2026', ad: 'EPDK SYM 2026 Dönemi', regulasyonId: reg['EPDK-SYM'].id,
    durum: 'aktif', baslangic: gun(-120), bitis: gun(120),
    aciklama: 'Yıllık siber yetkinlik öz değerlendirmesi ve saha doğrulaması.' } });
  const surecCbddo = await db.uyumSureci.create({ data: {
    kod: 'CBDDO-2026', ad: 'CBDDÖ Yerinde Denetim Hazırlığı', regulasyonId: reg['CBDDO'].id,
    durum: 'aktif', baslangic: gun(-60), bitis: gun(42),
    aciklama: 'Kasım ayındaki yerinde denetim öncesi kapanış çalışması.' } });
  const surecIso = await db.uyumSureci.create({ data: {
    kod: 'ISO-27001-2026', ad: 'ISO 27001 Gözetim Denetimi 2026', regulasyonId: reg['ISO-27001'].id,
    durum: 'aktif', baslangic: gun(-30), bitis: gun(75) } });
  const surecSpk = await db.uyumSureci.create({ data: {
    kod: 'SPK-BS-2025', ad: 'SPK BS 2025 Dönemi', regulasyonId: reg['SPK-BS'].id,
    durum: 'tamamlandi', baslangic: gun(-420), bitis: gun(-40),
    aciklama: 'Tamamlanan dönem; kayıtlar tarihçe olarak saklanıyor.' } });
  await db.uyumSureci.create({ data: {
    kod: 'VAN-HES-KAPANIS', ad: 'Engil HES Devir Uyum Kapanışı', regulasyonId: reg['EPDK-SYM'].id,
    durum: 'pasif', baslangic: gun(-300), bitis: gun(-140),
    aciklama: 'Santral satışı nedeniyle süreç pasifleştirildi.' } });

  // ---- süreç kapsamları
  const epdkTesisler = ['ADANA-DGKC', 'SEYHAN-HES', 'BELEN-RES', 'AYDIN-JEO', 'KONYA-GES'];
  for (const tk of epdkTesisler)
    await db.surecKapsami.create({ data: { surecId: surecEpdk.id, tesisId: t[tk].id } });
  for (const tk of ['ADANA-DGKC', 'SEYHAN-HES', 'MERKEZ'])
    await db.surecKapsami.create({ data: { surecId: surecCbddo.id, tesisId: t[tk].id } });
  for (const tk of ['MERKEZ', 'ADANA-DGKC'])
    await db.surecKapsami.create({ data: { surecId: surecIso.id, tesisId: t[tk].id } });
  await db.surecKapsami.create({ data: { surecId: surecSpk.id, tesisId: t['MERKEZ'].id } });

  // ---- madde durumları: EPDK süreci (5 tesis × yaprak maddeler)
  const yapraklar = ['EPDK-SYM-4.1.1', 'EPDK-SYM-4.1.2', 'EPDK-SYM-4.2.1', 'EPDK-SYM-4.2.2',
    'EPDK-SYM-5.1.1', 'EPDK-SYM-5.1.2', 'EPDK-SYM-7.1.4', 'EPDK-SYM-7.2'];
  // Gerçekçi dağılım: her tesiste farklı zayıflıklar
  const durumMatrisi: Record<string, Record<string, string>> = {
    'ADANA-DGKC': { 'EPDK-SYM-4.2.1': 'uyumsuz', 'EPDK-SYM-5.1.1': 'uyumsuz', 'EPDK-SYM-7.1.4': 'kismi', 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'uyumlu', 'EPDK-SYM-4.2.2': 'kismi', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.2': 'uyumlu' },
    'SEYHAN-HES': { 'EPDK-SYM-4.2.1': 'kismi', 'EPDK-SYM-7.1.4': 'uyumsuz', 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'kismi', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'uyumlu', 'EPDK-SYM-5.1.2': 'incelemede', 'EPDK-SYM-7.2': 'uyumlu' },
    'BELEN-RES': { 'EPDK-SYM-4.2.1': 'kismi', 'EPDK-SYM-7.1.4': 'kismi', 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'uyumlu', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'incelemede', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.2': 'kismi' },
    'AYDIN-JEO': { 'EPDK-SYM-4.1.1': 'kismi', 'EPDK-SYM-4.1.2': 'incelemede', 'EPDK-SYM-4.2.1': 'uyumlu', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'uyumlu', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.1.4': 'incelemede', 'EPDK-SYM-7.2': 'uyumlu' },
    'KONYA-GES': { 'EPDK-SYM-4.2.1': 'kapsamdisi', 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'uyumlu', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'kismi', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.1.4': 'kapsamdisi', 'EPDK-SYM-7.2': 'uyumlu' },
  };
  const sorumluSirasi = [k['selin.aydin'], k['burak.sahin'], k['mehmet.kaya']];
  const durumKaydi: Record<string, { id: string }> = {};
  let si = 0;
  for (const tk of epdkTesisler) {
    for (const mk of yapraklar) {
      const d = await db.maddeDurumu.create({ data: {
        surecId: surecEpdk.id, maddeId: maddeIdx[mk].id, tesisId: t[tk].id,
        durum: durumMatrisi[tk][mk] ?? 'incelemede',
        sorumluId: sorumluSirasi[si++ % 3].id,
        sonDegerlendirme: gun(-(si % 45) - 2),
      } });
      durumKaydi[`${tk}|${mk}`] = d;
    }
  }
  // CBDDO + ISO süreçleri: temsilî durumlar
  for (const tk of ['ADANA-DGKC', 'SEYHAN-HES', 'MERKEZ']) {
    for (const m of digerMaddeler['CBDDO']) {
      await db.maddeDurumu.create({ data: {
        surecId: surecCbddo.id, maddeId: maddeIdx[`CBDDO-${m.kod}`].id, tesisId: t[tk].id,
        durum: tk === 'MERKEZ' ? 'uyumlu' : m.kod.startsWith('3') ? 'kismi' : 'incelemede',
        sorumluId: k['mehmet.kaya'].id, sonDegerlendirme: gun(-12),
      } });
    }
  }
  for (const tk of ['MERKEZ', 'ADANA-DGKC']) {
    for (const m of digerMaddeler['ISO-27001']) {
      await db.maddeDurumu.create({ data: {
        surecId: surecIso.id, maddeId: maddeIdx[`ISO-27001-${m.kod}`].id, tesisId: t[tk].id,
        durum: tk === 'MERKEZ' ? 'uyumlu' : 'incelemede',
        sorumluId: k['ayse.demir'].id, sonDegerlendirme: gun(-5),
      } });
    }
  }

  // ---- bulgular + aksiyonlar
  const b1 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['ADANA-DGKC|EPDK-SYM-4.2.1'].id,
    baslik: 'DGKÇ SCADA ağı kurumsal ağdan ayrıştırılmamış',
    aciklama: 'Adana DGKÇ tarafında SCADA VLAN\'ı ile kurumsal ağ arasında erişim kontrol listesi bulunmuyor; düz ağ topolojisi tespit edildi. Zone/conduit modeline geçiş gerekiyor.',
    onemDerecesi: 'kritik', durum: 'aksiyonda', kaynak: 'ic_denetim',
    tespitTarihi: gun(-38), hedefTarih: gun(24), sorumluId: k['burak.sahin'].id } });
  const b2 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['ADANA-DGKC|EPDK-SYM-5.1.1'].id,
    baslik: 'Rotasyona girmeyen servis hesapları',
    aciklama: 'DGKÇ tarafındaki 14 servis hesabının parolası 2 yıldır değiştirilmemiş; 6\'sı etki alanı yöneticisi grubunda.',
    onemDerecesi: 'yuksek', durum: 'acik', kaynak: 'ic_denetim',
    tespitTarihi: gun(-21), hedefTarih: gun(9), sorumluId: k['mehmet.kaya'].id } });
  const b3 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['SEYHAN-HES|EPDK-SYM-7.1.4'].id,
    baslik: 'HES OT kayıtları SIEM\'e akmıyor',
    aciklama: 'Seyhan HES\'te endüstriyel protokol trafiği izlenmiyor; pasif TAP kurulumu için ağ kesintisi planlanmalı.',
    onemDerecesi: 'yuksek', durum: 'aksiyonda', kaynak: 'oz_degerlendirme',
    tespitTarihi: gun(-60), hedefTarih: gun(35), sorumluId: k['burak.sahin'].id } });
  const b4 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['BELEN-RES|EPDK-SYM-7.2'].id,
    baslik: 'Olay müdahale tatbikatı RES sahasını kapsamıyor',
    aciklama: 'Yıllık tatbikat senaryosunda Belen RES yer almadı; EPDK bildirim akışı saha ekibince bilinmiyor.',
    onemDerecesi: 'orta', durum: 'acik', kaynak: 'dis_denetim',
    tespitTarihi: gun(-14), hedefTarih: gun(50), sorumluId: k['selin.aydin'].id } });
  const b5 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['AYDIN-JEO|EPDK-SYM-4.1.1'].id,
    baslik: 'Jeotermal saha envanteri eksik',
    aciklama: 'Kuyu başı RTU\'ları ve haberleşme modemleri varlık envanterinde yer almıyor.',
    onemDerecesi: 'orta', durum: 'kapali', kaynak: 'ic_denetim',
    tespitTarihi: gun(-90), hedefTarih: gun(-20), kapanmaTarihi: gun(-8),
    sorumluId: k['mehmet.kaya'].id } });

  const aksiyonlar: [string, { id: string }, string, string, number, number | null][] = [
    ['Zone/conduit tasarımının çıkarılması', b1, 'tamamlandi', 'burak.sahin', -30, -6],
    ['Güvenlik duvarı tedariki ve kurulumu', b1, 'devam', 'burak.sahin', -20, null],
    ['ACL kural setinin devreye alınması', b1, 'planlandi', 'mehmet.kaya', 10, null],
    ['Servis hesap envanterinin çıkarılması', b2, 'devam', 'mehmet.kaya', -14, null],
    ['Parola kasası entegrasyonu', b2, 'planlandi', 'mehmet.kaya', 2, null],
    ['Pasif TAP için kesinti planı', b3, 'devam', 'burak.sahin', -25, null],
    ['Tatbikat senaryosuna RES eklenmesi', b4, 'planlandi', 'selin.aydin', 5, null],
  ];
  for (const [baslik, bulgu, durum, sorumlu, bas, bit] of aksiyonlar)
    await db.aksiyon.create({ data: {
      bulguId: bulgu.id, baslik, durum, sorumluId: k[sorumlu].id,
      baslangic: gun(bas), hedef: gun(bas + 30), tamamlanma: bit === null ? null : gun(bit) } });

  // ---- kanıtlar (crosswalk örneğiyle)
  const k1 = await db.kanit.create({ data: {
    ad: 'Varlık Envanteri 2026-Q3.xlsx', tip: 'kayit',
    gecerlilikBaslangic: gun(-40), yukleyenId: k['mehmet.kaya'].id } });
  const k2 = await db.kanit.create({ data: {
    ad: 'Ağ Segmentasyon Şeması v3.pdf', tip: 'konfigurasyon',
    gecerlilikBaslangic: gun(-160), yukleyenId: k['burak.sahin'].id } });
  const k3 = await db.kanit.create({ data: {
    ad: 'Olay Müdahale Planı 2026.docx', tip: 'politika',
    gecerlilikBaslangic: gun(-200), yukleyenId: k['selin.aydin'].id } });
  // Aynı envanter kanıtı hem EPDK 4.1.1 hem ISO A.5.9'u karşılıyor (crosswalk)
  await db.kanitBaglantisi.create({ data: { kanitId: k1.id, maddeDurumuId: durumKaydi['ADANA-DGKC|EPDK-SYM-4.1.1'].id } });
  await db.kanitBaglantisi.create({ data: { kanitId: k1.id, maddeDurumuId: durumKaydi['SEYHAN-HES|EPDK-SYM-4.1.1'].id } });
  const isoDurum = await db.maddeDurumu.findFirst({ where: {
    surecId: surecIso.id, maddeId: maddeIdx['ISO-27001-A.5.9'].id, tesisId: t['MERKEZ'].id } });
  if (isoDurum) await db.kanitBaglantisi.create({ data: { kanitId: k1.id, maddeDurumuId: isoDurum.id } });
  await db.kanitBaglantisi.create({ data: { kanitId: k2.id, maddeDurumuId: durumKaydi['ADANA-DGKC|EPDK-SYM-4.2.1'].id } });
  await db.kanitBaglantisi.create({ data: { kanitId: k3.id, maddeDurumuId: durumKaydi['BELEN-RES|EPDK-SYM-7.2'].id } });

  // ---- projeler
  const p1 = await db.proje.create({ data: {
    kod: 'PRJ-OT-SEG', ad: 'OT Ağ Segmentasyonu Programı',
    aciklama: 'Tüm santrallerde zone/conduit modeline geçiş.', durum: 'devam',
    baslangic: gun(-90), hedef: gun(120), sahipId: k['burak.sahin'].id } });
  const p2 = await db.proje.create({ data: {
    kod: 'PRJ-PAM', ad: 'Ayrıcalıklı Erişim Yönetimi',
    aciklama: 'Parola kasası + oturum kaydı yaygınlaştırması.', durum: 'devam',
    baslangic: gun(-45), hedef: gun(60), sahipId: k['mehmet.kaya'].id } });
  const p3 = await db.proje.create({ data: {
    kod: 'PRJ-SIEM-OT', ad: 'OT Görünürlük / SIEM Genişletme',
    aciklama: 'Santral OT kayıtlarının merkezî SIEM\'e alınması.', durum: 'planlandi',
    baslangic: gun(20), hedef: gun(180), sahipId: k['ayse.demir'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p1.id, maddeId: maddeIdx['EPDK-SYM-4.2.1'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p1.id, bulguId: b1.id } });
  await db.projeBaglantisi.create({ data: { projeId: p2.id, maddeId: maddeIdx['EPDK-SYM-5.1.1'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p2.id, bulguId: b2.id } });
  await db.projeBaglantisi.create({ data: { projeId: p3.id, maddeId: maddeIdx['EPDK-SYM-7.1.4'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p3.id, bulguId: b3.id } });

  // ---- yetkiler (süreç × tesis kapsamlı)
  const yetkiler: [string, { id: string } | null, string | null, string][] = [
    ['ayse.demir', null, null, 'yonetici'],
    ['selin.aydin', null, null, 'denetim_sorumlusu'],
    ['burak.sahin', surecEpdk, null, 'katkici'],
    ['mehmet.kaya', surecCbddo, 'MERKEZ', 'katkici'],
    ['zeynep.arslan', null, null, 'okuyucu'],
  ];
  for (const [e, surec, tesisKod, rol] of yetkiler)
    await db.yetki.create({ data: {
      kullaniciId: k[e].id, surecId: surec?.id ?? null,
      tesisId: tesisKod ? t[tesisKod].id : null, rol } });

  // ---- aktivite kaydı (bulgu zaman çizelgeleri)
  const aktiviteler: [number, string, string, string, string, string | null, string | null, string | null][] = [
    [-38, 'zeynep.arslan', 'Bulgu', b1.id, 'olusturma', null, null, null],
    [-36, 'selin.aydin', 'Bulgu', b1.id, 'guncelleme', 'onemDerecesi', 'yuksek', 'kritik'],
    [-30, 'burak.sahin', 'Aksiyon', b1.id, 'olusturma', null, null, null],
    [-12, 'burak.sahin', 'Bulgu', b1.id, 'dosya_ekleme', null, null, 'Ağ Segmentasyon Şeması v3.pdf'],
    [-6, 'burak.sahin', 'Bulgu', b1.id, 'durum_degisimi', 'durum', 'acik', 'aksiyonda'],
    [-21, 'zeynep.arslan', 'Bulgu', b2.id, 'olusturma', null, null, null],
    [-60, 'burak.sahin', 'Bulgu', b3.id, 'olusturma', null, null, null],
    [-40, 'burak.sahin', 'Bulgu', b3.id, 'durum_degisimi', 'durum', 'acik', 'aksiyonda'],
    [-14, 'zeynep.arslan', 'Bulgu', b4.id, 'olusturma', null, null, null],
    [-8, 'mehmet.kaya', 'Bulgu', b5.id, 'durum_degisimi', 'durum', 'aksiyonda', 'kapali'],
    [-2, 'mehmet.kaya', 'MaddeDurumu', durumKaydi['ADANA-DGKC|EPDK-SYM-4.1.1'].id, 'durum_degisimi', 'durum', 'kismi', 'uyumlu'],
    [-140, 'ayse.demir', 'Tesis', t['VAN-HES'].id, 'guncelleme', 'durum', 'aktif', 'kapali'],
  ];
  for (const [g, e, vt, vid, ey, alan, once, sonra] of aktiviteler)
    await db.aktiviteKaydi.create({ data: {
      aktorId: k[e].id, varlikTipi: vt, varlikId: vid, eylem: ey,
      alan, oncekiDeger: once, yeniDeger: sonra,
      dosyaAdi: ey === 'dosya_ekleme' ? sonra : null, zaman: gun(g) } });

  // ---- örnek içe aktarım kaydı (onay kuyruğu dolu görünsün)
  await db.iceAktarim.create({ data: {
    regulasyonId: reg['CBDDO'].id, kaynakTipi: 'excel', kaynakAdi: 'cbddo-rehber-guncelleme.xlsx',
    durum: 'dogrulama_bekliyor', okunan: 12, eklenen: 0, guncellenen: 0, elenen: 2,
    raporJson: JSON.stringify({ satirlar: [
      { kod: 'CBDDO-3.3', baslik: 'Kablosuz Ağ Güvenliği', islem: 'yeni', alanlar: ['BT'] },
      { kod: 'CBDDO-3.1', baslik: 'Ağ Güvenliği', islem: 'guncelleme', alanlar: ['BT', 'OT'] },
    ], elenenler: [
      { satir: 7, sebep: 'alan kolonu boş — BT/OT eşleşmesi yok' },
      { satir: 11, sebep: 'madde_kodu tekrarı' },
    ] }),
    yukleyenId: k['selin.aydin'].id } });

  // ================= hedef mimari genişlemesi =================

  // Organizasyon hiyerarşisi: Grup → Tüzel Kişi → Tesis
  const grup = await db.grup.create({ data: { kod: 'ENERJI-GRUP', ad: 'Enerji Üretim Grubu' } });
  const tuzelUretim = await db.tuzelKisi.create({ data: {
    grupId: grup.id, kod: 'URETIM-AS', ad: 'Enerji Üretim A.Ş.' } });
  const tuzelYenilenebilir = await db.tuzelKisi.create({ data: {
    grupId: grup.id, kod: 'YENILENEBILIR-AS', ad: 'Yenilenebilir Enerji A.Ş.' } });
  await db.tesis.updateMany({ where: { kod: { in: ['ADANA-DGKC', 'SEYHAN-HES', 'MERKEZ', 'VAN-HES'] } },
    data: { tuzelKisiId: tuzelUretim.id } });
  await db.tesis.updateMany({ where: { kod: { in: ['BELEN-RES', 'AYDIN-JEO', 'KONYA-GES'] } },
    data: { tuzelKisiId: tuzelYenilenebilir.id } });

  // Santral profilleri (§5.1) — uygulanabilirlik motorunun girdisi
  const profiller: [string, object][] = [
    ['ADANA-DGKC', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: true,
      teiasScadaEms: true, seriHaberlesme: false, kritiklikSinifi: 'yuksek',
      kritikAltyapiStatusu: true, otMimariTipi: 'dcs', dcsSaglayici: 'Siemens',
      uzaktanErisim: true, internetMaruziyeti: 'sinirli', yerelAdVar: true,
      grupOrtakServisler: 'merkezi_ad;soc;edr' }],
    ['SEYHAN-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, kritiklikSinifi: 'orta', otMimariTipi: 'scada',
      scadaSaglayici: 'ABB', uzaktanErisim: true, internetMaruziyeti: 'yok',
      grupOrtakServisler: 'merkezi_ad;soc' }],
    ['BELEN-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, seriHaberlesme: true, kritiklikSinifi: 'dusuk',
      otMimariTipi: 'plc_scada', plcAileleri: 'Siemens S7', iotVar: true }],
    ['AYDIN-JEO', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada' }],
    ['KONYA-GES', { lisansTipi: 'uretim', kabulDurumu: 'gecici_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', iotVar: true, akilliSayacVar: true }],
    ['MERKEZ', { kritiklikSinifi: 'yuksek', yerelVeriMerkeziVar: true, yerelAdVar: true,
      internetMaruziyeti: 'var', grupOrtakServisler: 'merkezi_ad;soc;edr;siem' }],
  ];
  for (const [kod, profil] of profiller)
    await db.tesisProfili.create({ data: { tesisId: t[kod].id, ...profil } });

  // Framework sürümleri: mevcut maddeler aktif sürüme bağlanır (backfill)
  for (const [kod, r] of Object.entries(reg)) {
    const surum = await db.frameworkSurumu.create({ data: {
      regulasyonId: r.id, surumEtiketi: kod === 'EPDK-SYM' ? '2024' : 'mevcut',
      durum: 'aktif', yururlukTarih: gun(-720) } });
    await db.madde.updateMany({ where: { regulasyonId: r.id }, data: { surumId: surum.id } });
  }

  // Uygulanabilirlik kuralı (§5.2) + kararlar
  const epdkKural = await db.uygulanabilirlikKurali.create({ data: {
    regulasyonId: reg['EPDK-SYM'].id, ad: 'EPDK SYM kapsam kuralı',
    aciklama: 'Kurulu güç ≥100 MWe VEYA Black-Start VEYA TEİAŞ SCADA/EMS (seri olmayan) → kapsamda',
    kosulJson: JSON.stringify({ herhangi: [
      { alan: 'kuruluGucMw', islec: '>=', deger: 100 },
      { alan: 'blackStart', islec: '=', deger: true },
      { alan: 'teiasScadaEmsSeriOlmayan', islec: '=', deger: true },
    ] }) } });
  const kapsamda = [['ADANA-DGKC', true, 'kuruluGucMw=790 ≥ 100 VE blackStart VE TEİAŞ SCADA/EMS'],
    ['SEYHAN-HES', true, 'kuruluGucMw=138 ≥ 100 VE TEİAŞ SCADA/EMS (seri değil)'],
    ['BELEN-RES', false, 'güç 96 < 100; TEİAŞ haberleşmesi seri tabanlı; Black-Start yok'],
    ['AYDIN-JEO', false, 'güç 47 < 100; kapsam koşulları sağlanmıyor'],
    ['KONYA-GES', false, 'güç 63 < 100; geçici kabul; kapsam koşulları sağlanmıyor']] as const;
  for (const [kod, uygulanabilir, gerekce] of kapsamda)
    await db.uygulanabilirlikKarari.create({ data: {
      tesisId: t[kod].id, regulasyonId: reg['EPDK-SYM'].id,
      uygulanabilir, gerekce, kuralId: epdkKural.id, kuralSurumu: 1 } });
  // Örnek onaylı override: BELEN-RES sözleşme gereği gönüllü kapsamda
  await db.uygulanabilirlikKarari.update({
    where: { tesisId_regulasyonId: { tesisId: t['BELEN-RES'].id, regulasyonId: reg['EPDK-SYM'].id } },
    data: { uygulanabilir: true, elIleDegistirildi: true,
      degistirmeGerekcesi: 'TEİAŞ bağlantı anlaşması gereği gönüllü uyum taahhüdü',
      onaylayanId: k['ayse.demir'].id } });

  // CMDB çekirdeği: varlık türleri + örnek varlıklar + ağ bölgeleri
  const tur = Object.fromEntries(await Promise.all(([
    ['FSUNUCU', 'Fiziksel Sunucu', 'BT'], ['SSUNUCU', 'Sanal Sunucu', 'BT'],
    ['UYGULAMA', 'Uygulama', 'BT'], ['AGCIHAZ', 'Ağ Cihazı', 'BT'],
    ['OTFW', 'OT Güvenlik Duvarı', 'BT_OT_KOPRU'], ['PLC', 'PLC', 'OT'],
    ['HMI', 'HMI', 'OT'], ['SCADA-SRV', 'SCADA Sunucusu', 'OT'],
    ['DCS', 'DCS Denetleyici', 'OT'], ['EWS', 'Mühendislik İstasyonu', 'OT'],
    ['SRVHESAP', 'Servis Hesabı', 'BT'],
  ] as const).map(async ([kod, ad, sinif]) => [kod, await db.varlikTuru.create({
    data: { kod, ad, sinif } })]))) as Record<string, { id: string }>;

  const zonKurumsal = await db.agBolgesi.create({ data: {
    kod: 'ADANA-KURUMSAL', ad: 'Adana Kurumsal Ağ', tip: 'kurumsal',
    tesisId: t['ADANA-DGKC'].id, guvenlikSeviyesi: 4 } });
  const zonOtDmz = await db.agBolgesi.create({ data: {
    kod: 'ADANA-OT-DMZ', ad: 'Adana OT DMZ', tip: 'ot_dmz',
    tesisId: t['ADANA-DGKC'].id, guvenlikSeviyesi: 3 } });
  const zonOt = await db.agBolgesi.create({ data: {
    kod: 'ADANA-OT', ad: 'Adana SCADA/DCS Ağı', tip: 'ot',
    tesisId: t['ADANA-DGKC'].id, guvenlikSeviyesi: 2 } });
  await db.agGeciti.create({ data: {
    kaynakBolgeId: zonKurumsal.id, hedefBolgeId: zonOtDmz.id,
    kontrolVarligi: 'ADANA-OTFW-01', protokoller: 'https;opc-ua', onaylandi: true } });
  await db.agGeciti.create({ data: {
    kaynakBolgeId: zonOtDmz.id, hedefBolgeId: zonOt.id,
    kontrolVarligi: 'ADANA-OTFW-01', protokoller: 'modbus-tcp;iec104', onaylandi: true } });

  const sistemScada = await db.sistemServis.create({ data: {
    kod: 'ADANA-SCADA', ad: 'Adana DGKÇ SCADA/DCS', tip: 'sistem',
    tesisId: t['ADANA-DGKC'].id, kritiklik: 'kritik', sahipId: k['burak.sahin'].id } });
  const surecUretim = await db.isSureci.create({ data: {
    kod: 'ADANA-URETIM', ad: 'Adana elektrik üretimi', tesisId: t['ADANA-DGKC'].id,
    uretimEtkisi: 'uretim_durur' } });
  await db.isSureciSistemi.create({ data: { surecId: surecUretim.id, sistemId: sistemScada.id } });

  const varlikOtfw = await db.varlik.create({ data: {
    etiket: 'ADANA-OTFW-01', ad: 'OT Güvenlik Duvarı (Adana)', turId: tur['OTFW'].id,
    tesisId: t['ADANA-DGKC'].id, sistemId: sistemScada.id, uretici: 'Fortinet',
    model: 'FG-200F', kritiklik: 'kritik', uretimEtkisi: 'yuksek',
    bolgeId: zonOtDmz.id, yasamDongusu: 'aktif', sahipId: k['burak.sahin'].id,
    eosTarihi: gun(500), yamaDurumu: 'guncel', izlemeDurumu: 'var', logKaynagi: 'var' } });
  const varlikScada = await db.varlik.create({ data: {
    etiket: 'ADANA-SCADA-SRV-01', ad: 'SCADA Sunucusu 1', turId: tur['SCADA-SRV'].id,
    tesisId: t['ADANA-DGKC'].id, sistemId: sistemScada.id, isletimSistemi: 'Windows Server 2012 R2',
    kritiklik: 'kritik', uretimEtkisi: 'yuksek', bolgeId: zonOt.id,
    eolTarihi: gun(-800), eosTarihi: gun(-400), yamaDurumu: 'yamasiz',
    yedekDurumu: 'var', sahipId: k['burak.sahin'].id } });
  await db.varlik.create({ data: {
    etiket: 'ADANA-EWS-01', ad: 'Mühendislik İstasyonu', turId: tur['EWS'].id,
    tesisId: t['ADANA-DGKC'].id, sistemId: sistemScada.id, kritiklik: 'yuksek',
    bolgeId: zonOt.id, yamaDurumu: 'eksik', uzaktanErisim: true } });
  await db.varlikIliskisi.create({ data: {
    kaynakId: varlikScada.id, hedefId: varlikOtfw.id, tip: 'connects_to' } });

  // Risk kaydı: EOS SCADA sunucusu → bulgu b1 ile bağlantılı üretim riski
  const risk1 = await db.risk.create({ data: {
    kod: 'RSK-2026-001', baslik: 'Desteksiz SCADA sunucusu üzerinden üretim kesintisi',
    aciklama: 'Adana SCADA sunucusu EOL/EOS geçmiş Windows 2012 R2 üzerinde; yama alamıyor. Segmentasyon eksikliğiyle (bulgu) birleşince fidye yazılımının üretimi durdurma olasılığı yüksek.',
    kaynak: 'eol', tesisId: t['ADANA-DGKC'].id, sistemId: sistemScada.id, bulguId: b1.id,
    tehdit: 'Fidye yazılımı / yetkisiz erişim', zayiflik: 'EOS işletim sistemi + düz ağ',
    olasilik: 4, etkiUretim: 5, etkiEmniyet: 3, etkiRegulasyon: 4, etkiFinans: 4,
    etkiSiber: 5, dogalRisk: 20, artikRisk: 16,
    mevcutKontroller: 'OT DMZ güvenlik duvarı; günlük yedek',
    sahipId: k['burak.sahin'].id, islemTipi: 'azalt', durum: 'islemde' } });
  await db.riskVarlik.create({ data: { riskId: risk1.id, varlikId: varlikScada.id } });
  await db.riskKontrol.create({ data: { riskId: risk1.id, maddeId: maddeIdx['EPDK-SYM-4.2.1'].id } });
  await db.projeBaglantisi.create({ data: {
    projeId: p1.id, riskId: risk1.id, tesisId: t['ADANA-DGKC'].id,
    gerekce: 'Segmentasyon programı bu riskin ana azaltıcısıdır' } });
  // Süreli risk kabulü örneği
  await db.risk.create({ data: {
    kod: 'RSK-2026-002', baslik: 'RES SCADA bağlantısında tekil güzergah',
    aciklama: 'Belen RES haberleşmesi tek fiber güzergahta; kopmada görünürlük kaybı.',
    kaynak: 'manuel', tesisId: t['BELEN-RES'].id, olasilik: 2, etkiUretim: 2, etkiSiber: 1,
    dogalRisk: 4, artikRisk: 4, islemTipi: 'kabul', kabulBitis: gun(180),
    onaylayanId: k['ayse.demir'].id, sahipId: k['burak.sahin'].id, durum: 'kabul_edildi' } });

  // Denetim yaşam döngüsü: yaklaşan CBDDÖ yerinde denetimi
  const denetim1 = await db.denetim.create({ data: {
    kod: 'DEN-2026-CBDDO', ad: 'CBDDÖ Yerinde Denetimi 2026', tip: 'dis_denetim',
    denetleyen: 'CBDDÖ', surecId: surecCbddo.id, durum: 'kanit_talebi',
    planBaslangic: gun(35), planBitis: gun(42) } });
  await db.denetimKapsami.create({ data: { denetimId: denetim1.id, tesisId: t['MERKEZ'].id } });
  await db.denetimKapsami.create({ data: { denetimId: denetim1.id, tesisId: t['ADANA-DGKC'].id } });
  await db.kanitTalebi.create({ data: {
    denetimId: denetim1.id, baslik: 'Ağ topolojisi ve segmentasyon şeması',
    sorumluId: k['burak.sahin'].id, sonTarih: gun(20), kanitId: k2.id, durum: 'saglandi' } });
  await db.kanitTalebi.create({ data: {
    denetimId: denetim1.id, baslik: 'Denetim izi saklama konfigürasyonu',
    sorumluId: k['mehmet.kaya'].id, sonTarih: gun(25) } });

  // Kanıt geçerlilikleri (tazelik motoru için) + bayat örnek
  await db.kanit.update({ where: { id: k1.id }, data: {
    gecerliBitis: gun(140), sahipId: k['mehmet.kaya'].id, toplanmaTarihi: gun(-40) } });
  await db.kanit.update({ where: { id: k2.id }, data: {
    gecerliBitis: gun(20), sahipId: k['burak.sahin'].id, toplanmaTarihi: gun(-160) } });
  await db.kanit.update({ where: { id: k3.id }, data: {
    gecerliBitis: gun(-20), sahipId: k['selin.aydin'].id, toplanmaTarihi: gun(-200) } });

  // Proje adayı örneği: EOS varlıktan otomatik üretilmiş, onay bekliyor
  await db.projeAdayi.create({ data: {
    baslik: 'Adana SCADA sunucu modernizasyonu',
    gerekce: 'ADANA-SCADA-SRV-01 EOL/EOS geçti (Windows 2012 R2); RSK-2026-001 artık riski 16/25; EPDK-SYM-4.2.1 uyumsuz. Modernizasyon üç kaydı birden kapatır.',
    kaynak: 'eol_eos', kaynakRef: varlikScada.id, tesisId: t['ADANA-DGKC'].id } });

  // Görev motoru örnekleri
  await db.gorev.create({ data: {
    baslik: 'Olay Müdahale Planı kanıtı süresi doldu — yenileyin',
    tip: 'kanit_yenileme', kaynakTipi: 'Kanit', kaynakId: k3.id,
    sorumluId: k['selin.aydin'].id, tesisId: t['BELEN-RES'].id,
    sonTarih: gun(14), otomatikUretildi: true } });
  await db.gorev.create({ data: {
    baslik: 'CBDDÖ kanıt talebi: denetim izi konfigürasyonu',
    tip: 'dogrulama', kaynakTipi: 'KanitTalebi', kaynakId: denetim1.id,
    sorumluId: k['mehmet.kaya'].id, sonTarih: gun(25), otomatikUretildi: true } });

  console.log('Seed tamam. Geliştirme girişi: ayse.demir@enerji.example / ' + GELISTIRME_PAROLASI);
}

main().finally(() => db.$disconnect());
