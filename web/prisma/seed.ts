/* Başlangıç verisi — Demo Enerji portföyü. Tüm sözlükler (sektör, tip, alan,
   regülasyon, süreç) panelden yönetilebilir; burası yalnızca ilk kurulum setidir. */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { operasyonVerisi } from './seed-operasyon';
import { uyumKatalogu } from './seed-uyum';
import { denetimVeProje } from './seed-denetim-proje';
import { riskVeBulgu } from './seed-risk-bulgu';
import { kanitVerisi } from './seed-kanit';
import { dokumanKutugu } from './seed-dokuman';
import { entegrasyonVerisi } from './seed-entegrasyon';
import { operasyonKayitlari } from './seed-operasyon-kayitlari';
import { dolulukKatmani } from './seed-doluluk';

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
      ['JEO', 'Jeotermal', 1], ['RES', 'Rüzgâr', 2], ['HES', 'Hidroelektrik', 3],
      ['GES', 'Güneş', 4], ['DGKC', 'Doğal Gaz Kombine Çevrim', 5], ['MERKEZ', 'Merkez BT', 9],
    ].map(async ([kod, ad, sira]) => [kod, await db.tesisTipi.create({
      data: { kod: kod as string, ad: ad as string, sira: sira as number, sektorId: elektrik.id } })]),
  )) as Record<string, { id: string }>;

  /* ---- enerji sektörü terim sözlüğü (P1 · URN-ALN-004)

     Çekirdek "tesis" der; bu satırlar enerji kiracısının ekranda ne
     göreceğini söyler. Sözlük SİLİNİRSE ekran bozulmaz, çekirdek
     sözcüğe döner — kurulu sektör paketi olmayan bir kiracının hâli
     budur ve test tam olarak bunu ölçer. */
  await db.sektorSozlugu.createMany({ data: [
    { sektorId: elektrik.id, anahtar: 'tesis', tekil: 'santral', cogul: 'santraller',
      iyelik: 'santralin', belirtme: 'santrali', bulunma: 'santralde', yonelme: 'santrale' },
    { sektorId: elektrik.id, anahtar: 'birim', tekil: 'üretim ünitesi',
      cogul: 'üretim üniteleri', iyelik: 'üretim ünitesinin', belirtme: 'üretim ünitesini',
      bulunma: 'üretim ünitesinde', yonelme: 'üretim ünitesine' },
    { sektorId: elektrik.id, anahtar: 'portfoy', tekil: 'enerji portföyü',
      cogul: 'enerji portföyleri', iyelik: 'enerji portföyünün',
      belirtme: 'enerji portföyünü', bulunma: 'enerji portföyünde',
      yonelme: 'enerji portföyüne' },
    { sektorId: elektrik.id, anahtar: 'tesis360', tekil: 'Santral 360',
      cogul: 'Santral 360', iyelik: 'Santral 360', belirtme: 'Santral 360',
      bulunma: 'Santral 360', yonelme: 'Santral 360' },
  ] });

  // ---- tesisler: Demo Enerji üretim portföyü (biri kapalı: devir örneği)
  const t = Object.fromEntries(await Promise.all(([
    ['SAHA-A1', 'Saha A-1 JES', 'JEO', 15, 'Denizli', 'aktif', null, null, -15570, 'sahaa1'],
    ['SAHA-A2', 'Saha A-2 JES', 'JEO', 80, 'Denizli', 'aktif', null, null, -4750, 'sahaa2'],
    ['SAHA-A3', 'Saha A-3 JES', 'JEO', 165, 'Denizli/Aydın', 'aktif', null, null, -3330, 'sahaa3'],
    ['SAHA-B-JES', 'Saha B JES', 'JEO', 45, 'Manisa', 'aktif', null, null, -4090, 'sahabjes'],
    ['SAHA-C-RES', 'Saha C RES', 'RES', 135, 'Osmaniye', 'aktif', null, null, -6320, 'sahac'],
    ['SAHA-D-RES', 'Saha D RES', 'RES', 57, 'Osmaniye', 'aktif', null, null, -5840, 'sahad'],
    ['SAHA-E-RES', 'Saha E RES', 'RES', 23.3, 'Osmaniye', 'aktif', null, null, -5560, 'sahae'],
    ['SAHA-F-HES', 'Saha F HES', 'HES', 24.94, 'Rize', 'aktif', null, null, -5990, 'sahaf'],
    ['SAHA-G-HES', 'Saha G HES', 'HES', 15, 'Erzincan', 'aktif', null, null, -5660, 'sahag'],
    ['SAHA-H-HES', 'Saha H HES', 'HES', 20.4, 'Tunceli', 'aktif', null, null, -5930, 'sahah'],
    ['SAHA-I-HES', 'Saha I HES', 'HES', 16.8, 'Eskişehir', 'aktif', null, null, -5220, 'sahai'],
    ['SAHA-J-HES', 'Saha J HES', 'HES', 20.9, 'Erzurum', 'aktif', null, null, -6200, 'sahaj'],
    ['SAHA-K-HES', 'Saha K HES', 'HES', 15.4, 'Kars', 'aktif', null, null, -6510, 'sahak'],
    ['SAHA-L-HES', 'Saha L HES', 'HES', 5.5, 'Tokat', 'aktif', null, null, -4870, 'sahal'],
    ['SAHA-B-GES', 'Saha B Hibrit GES', 'GES', 3.75, 'Manisa', 'aktif', null, null, -1810, 'sahabges'],
    ['MERKEZ-BT', 'Demo Enerji Genel Müdürlük', 'MERKEZ', null, 'İstanbul', 'aktif', null, null, -5000, 'merkezbt'],
    ['SAHA-M-DGKC', 'Saha M DGKÇ (devredildi)', 'DGKC', 82, 'Kırklareli', 'kapali', -300, 'satis', -9950, 'saham'],
  ] as const).map(async ([kod, ad, tipKod, guc, konum, durum, kapanis, neden, giris, gorsel]) => [kod,
    await db.tesis.create({ data: {
      kod, ad, tipId: tip[tipKod].id, konum, durum,
      /* P1 · kurulu güç KOLON DEĞİL öznitelik satırı. `guc === null` olan
         tesis (MERKEZ-BT) satır ALMAZ: ölçülmemiş değer sıfırla ya da boş
         bir satırla temsil edilmez (URN-ALN-001). */
      ozellikler: guc === null ? undefined : { create: [{
        anahtar: 'kuruluGucMw', sayisalDeger: guc, birim: 'MW', kaynak: 'tohum',
      }] },
      kapanisTarihi: kapanis === null ? null : gun(kapanis), kapanisNedeni: neden,
      devreyeGiris: gun(giris),
      // 05-photography §2: yalnız fotoğrafı SAĞLANMIŞ santral anahtar alır.
      // Karşılığı olmayan null kalır ve tipografik fallback render edilir —
      // asla "yakın" başka bir santralin fotoğrafı kullanılmaz (§1.3).
      gorselAnahtari: gorsel,
    } })]))) as Record<string, { id: string }>;

  // ---- kapsam alanları (panelden genişletilebilir)
  const alanBT = await db.kapsamAlani.create({ data: { kod: 'BT', ad: 'Bilgi Teknolojileri' } });
  const alanOT = await db.kapsamAlani.create({ data: { kod: 'OT', ad: 'Operasyonel Teknolojiler (SCADA/EKS)' } });

  // ---- kullanıcılar
  const k = Object.fromEntries(await Promise.all(([
    ['kullanici.a', 'Kullanıcı A', 'BT Direktörü'],
    ['kullanici.b', 'Kullanıcı B', 'Uyum ve Regülasyon Yöneticisi'],
    ['kullanici.c', 'Kullanıcı C', 'OT Güvenlik Mühendisi'],
    ['kullanici.d', 'Kullanıcı D', 'Sistem ve Altyapı Yöneticisi'],
    ['kullanici.e', 'Kullanıcı E', 'İç Denetçi'],
  ] as const).map(async ([e, ad, unvan]) => [e, await db.kullanici.create({
    data: { eposta: `${e}@demo.local`, adSoyad: ad, unvan,
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

  /* ---- regülasyonlar arası denklikler

     Denklik YAPRAK madde ile kurulur. Bölüm başlığı (çocuğu olan madde)
     bir kontrole denk sayılamaz: alt maddeleri farklı şeyler ister ve
     "bölümün tamamı şu kontrole denktir" demek denetimde savunulamaz.
     Çapraz eşleme matrisi de yaprak olmayan satırı çizemez, yani böyle
     bir kayıt ekranda sessizce düşerdi.

     Düzeltilen kayıt: EPDK-SYM-4.1 "Varlık Envanteri" bir bölümdür
     (4.1.1 envanter güncelliği + 4.1.2 kritiklik sınıflandırması) ve
     ISO-27001 A.5.9'a 'tam' denk yazılmıştı. A.5.9 envanter tutmayı
     ister; karşılığı 4.1.1'dir ve denklik 'kismi'dir — A.5.9 ayrıca
     SAHİPLİK ister, onun EPDK karşılığı bu ağaçta yok. */
  const denklikler: [string, string, string][] = [
    ['EPDK-SYM-4.1.1', 'ISO-27001-A.5.9', 'kismi'],
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
    aciklama: 'Saha A-2/III, Saha C, Saha D ve Merkez BT için yıllık siber yetkinlik öz değerlendirmesi ve saha doğrulaması.' } });
  const surecCbddo = await db.uyumSureci.create({ data: {
    kod: 'CBDDO-2026', ad: 'CBDDÖ 2026 Yerinde Denetim Hazırlığı', regulasyonId: reg['CBDDO'].id,
    durum: 'aktif', baslangic: gun(-60), bitis: gun(42),
    aciklama: 'Genel müdürlük ve Saha A-3 sahasında yerinde denetim öncesi kapanış çalışması.' } });
  const surecIso = await db.uyumSureci.create({ data: {
    kod: 'ISO-27001-2026', ad: 'ISO 27001 Gözetim Denetimi 2026', regulasyonId: reg['ISO-27001'].id,
    durum: 'aktif', baslangic: gun(-30), bitis: gun(75),
    aciklama: 'Belgelendirme kuruluşunun yıllık gözetim denetimi.' } });
  const surecSpk = await db.uyumSureci.create({ data: {
    kod: 'SPK-BS-2025', ad: 'SPK BS 2025 Dönemi', regulasyonId: reg['SPK-BS'].id,
    durum: 'tamamlandi', baslangic: gun(-420), bitis: gun(-40),
    aciklama: 'Tamamlanan dönem; kayıtlar tarihçe olarak saklanıyor.' } });
  await db.uyumSureci.create({ data: {
    kod: 'SAHA-M-KAPANIS', ad: 'Saha M DGKÇ Devir Uyum Kapanışı', regulasyonId: reg['EPDK-SYM'].id,
    durum: 'pasif', baslangic: gun(-430), bitis: gun(-300),
    aciklama: 'Santral devri (satış) nedeniyle süreç pasifleştirildi.' } });

  // ---- süreç kapsamları
  const epdkTesisler = ['SAHA-A3', 'SAHA-A2', 'SAHA-C-RES', 'SAHA-D-RES', 'MERKEZ-BT'];
  for (const tk of epdkTesisler)
    await db.surecKapsami.create({ data: { surecId: surecEpdk.id, tesisId: t[tk].id } });
  for (const tk of ['MERKEZ-BT', 'SAHA-A3'])
    await db.surecKapsami.create({ data: { surecId: surecCbddo.id, tesisId: t[tk].id } });
  for (const tk of ['MERKEZ-BT', 'SAHA-A3'])
    await db.surecKapsami.create({ data: { surecId: surecIso.id, tesisId: t[tk].id } });
  await db.surecKapsami.create({ data: { surecId: surecSpk.id, tesisId: t['MERKEZ-BT'].id } });

  // ---- madde durumları: EPDK süreci (5 tesis × yaprak maddeler)
  const yapraklar = ['EPDK-SYM-4.1.1', 'EPDK-SYM-4.1.2', 'EPDK-SYM-4.2.1', 'EPDK-SYM-4.2.2',
    'EPDK-SYM-5.1.1', 'EPDK-SYM-5.1.2', 'EPDK-SYM-7.1.4', 'EPDK-SYM-7.2'];
  // Gerçekçi dağılım: her sahada farklı zayıflıklar
  const durumMatrisi: Record<string, Record<string, string>> = {
    'SAHA-A3': { 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'uyumlu', 'EPDK-SYM-4.2.1': 'uyumsuz', 'EPDK-SYM-4.2.2': 'kismi', 'EPDK-SYM-5.1.1': 'uyumsuz', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.1.4': 'kismi', 'EPDK-SYM-7.2': 'uyumlu' },
    'SAHA-A2': { 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'kismi', 'EPDK-SYM-4.2.1': 'kismi', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'uyumlu', 'EPDK-SYM-5.1.2': 'incelemede', 'EPDK-SYM-7.1.4': 'uyumsuz', 'EPDK-SYM-7.2': 'uyumlu' },
    'SAHA-C-RES': { 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'uyumlu', 'EPDK-SYM-4.2.1': 'kismi', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'incelemede', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.1.4': 'uyumsuz', 'EPDK-SYM-7.2': 'kismi' },
    'SAHA-D-RES': { 'EPDK-SYM-4.1.1': 'kismi', 'EPDK-SYM-4.1.2': 'incelemede', 'EPDK-SYM-4.2.1': 'kismi', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'uyumlu', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.1.4': 'incelemede', 'EPDK-SYM-7.2': 'uyumlu' },
    'MERKEZ-BT': { 'EPDK-SYM-4.1.1': 'uyumlu', 'EPDK-SYM-4.1.2': 'uyumlu', 'EPDK-SYM-4.2.1': 'kapsamdisi', 'EPDK-SYM-4.2.2': 'uyumlu', 'EPDK-SYM-5.1.1': 'kismi', 'EPDK-SYM-5.1.2': 'uyumlu', 'EPDK-SYM-7.1.4': 'kapsamdisi', 'EPDK-SYM-7.2': 'uyumlu' },
  };
  const sorumluSirasi = [k['kullanici.b'], k['kullanici.c'], k['kullanici.d']];
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
  // CBDDÖ + ISO süreçleri: temsilî durumlar
  for (const tk of ['MERKEZ-BT', 'SAHA-A3']) {
    for (const m of digerMaddeler['CBDDO']) {
      await db.maddeDurumu.create({ data: {
        surecId: surecCbddo.id, maddeId: maddeIdx[`CBDDO-${m.kod}`].id, tesisId: t[tk].id,
        durum: tk === 'MERKEZ-BT' ? 'uyumlu' : m.kod.startsWith('3') ? 'kismi' : 'incelemede',
        sorumluId: k['kullanici.d'].id, sonDegerlendirme: gun(-12),
      } });
    }
  }
  for (const tk of ['MERKEZ-BT', 'SAHA-A3']) {
    for (const m of digerMaddeler['ISO-27001']) {
      await db.maddeDurumu.create({ data: {
        surecId: surecIso.id, maddeId: maddeIdx[`ISO-27001-${m.kod}`].id, tesisId: t[tk].id,
        durum: tk === 'MERKEZ-BT' ? 'uyumlu' : 'incelemede',
        sorumluId: k['kullanici.a'].id, sonDegerlendirme: gun(-5),
      } });
    }
  }

  // ---- bulgular + aksiyonlar
  const b1 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['SAHA-A3|EPDK-SYM-4.2.1'].id,
    baslik: 'Saha A-3 DCS ağı kurumsal ağdan ayrıştırılmamış',
    aciklama: 'Saha A-3 sahasında türbin DCS VLAN\'ı ile kurumsal ağ arasında erişim kontrol listesi bulunmuyor; düz ağ topolojisi tespit edildi. Zone/conduit modeline geçiş gerekiyor.',
    onemDerecesi: 'kritik', durum: 'aksiyonda', kaynak: 'ic_denetim',
    tespitTarihi: gun(-38), hedefTarih: gun(24), sorumluId: k['kullanici.c'].id } });
  const b2 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['SAHA-A3|EPDK-SYM-5.1.1'].id,
    baslik: 'Rotasyona girmeyen servis hesapları',
    aciklama: 'Saha A-3 saha ağındaki 14 servis hesabının parolası 2 yıldır değiştirilmemiş; 6\'sı etki alanı yöneticisi grubunda.',
    onemDerecesi: 'yuksek', durum: 'acik', kaynak: 'ic_denetim',
    tespitTarihi: gun(-21), hedefTarih: gun(9), sorumluId: k['kullanici.d'].id } });
  const b3 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['SAHA-C-RES|EPDK-SYM-7.1.4'].id,
    baslik: 'Saha C türbin SCADA kayıtları SIEM\'e akmıyor',
    aciklama: 'Saha C RES\'te türbin SCADA ve endüstriyel protokol trafiği izlenmiyor; pasif TAP kurulumu için türbin duruş penceresi planlanmalı.',
    onemDerecesi: 'yuksek', durum: 'aksiyonda', kaynak: 'oz_degerlendirme',
    tespitTarihi: gun(-60), hedefTarih: gun(35), sorumluId: k['kullanici.c'].id } });
  const b4 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['SAHA-C-RES|EPDK-SYM-7.2'].id,
    baslik: 'Olay müdahale tatbikatı RES sahalarını kapsamıyor',
    aciklama: 'Yıllık tatbikat senaryosunda Saha C ve Saha D RES yer almadı; EPDK bildirim akışı saha ekibince bilinmiyor.',
    onemDerecesi: 'orta', durum: 'acik', kaynak: 'dis_denetim',
    tespitTarihi: gun(-14), hedefTarih: gun(50), sorumluId: k['kullanici.b'].id } });
  const b5 = await db.bulgu.create({ data: {
    maddeDurumuId: durumKaydi['SAHA-A2|EPDK-SYM-4.1.2'].id,
    baslik: 'Jeotermal kuyu başı ekipmanları envanterde sınıflandırılmamış',
    aciklama: 'Saha A-2 kuyu başı RTU\'ları ve reenjeksiyon hattı haberleşme modemleri varlık envanterinde kritiklik sınıfı olmadan duruyordu.',
    onemDerecesi: 'orta', durum: 'kapali', kaynak: 'ic_denetim',
    tespitTarihi: gun(-90), hedefTarih: gun(-20), kapanmaTarihi: gun(-8),
    sorumluId: k['kullanici.d'].id } });

  const aksiyonlar: [string, { id: string }, string, string, number, number | null][] = [
    ['Zone/conduit tasarımının çıkarılması', b1, 'tamamlandi', 'kullanici.c', -30, -6],
    ['OT güvenlik duvarı tedariki ve kurulumu', b1, 'devam', 'kullanici.c', -20, null],
    ['ACL kural setinin devreye alınması', b1, 'planlandi', 'kullanici.d', 10, null],
    ['Servis hesap envanterinin çıkarılması', b2, 'devam', 'kullanici.d', -14, null],
    ['Parola kasası entegrasyonu', b2, 'planlandi', 'kullanici.d', 2, null],
    ['Pasif TAP için türbin duruş planı', b3, 'devam', 'kullanici.c', -25, null],
    ['Tatbikat senaryosuna RES sahalarının eklenmesi', b4, 'planlandi', 'kullanici.b', 5, null],
  ];
  for (const [baslik, bulgu, durum, sorumlu, bas, bit] of aksiyonlar)
    await db.aksiyon.create({ data: {
      bulguId: bulgu.id, baslik, durum, sorumluId: k[sorumlu].id,
      baslangic: gun(bas), hedef: gun(bas + 30), tamamlanma: bit === null ? null : gun(bit) } });

  // ---- kanıtlar (crosswalk örneğiyle)
  const k1 = await db.kanit.create({ data: {
    ad: 'Demo Enerji Varlık Envanteri 2026-Q3.xlsx', tip: 'kayit',
    gecerlilikBaslangic: gun(-40), yukleyenId: k['kullanici.d'].id } });
  const k2 = await db.kanit.create({ data: {
    ad: 'Saha A-3 OT Ağ Segmentasyon Şeması v3.pdf', tip: 'konfigurasyon',
    gecerlilikBaslangic: gun(-160), yukleyenId: k['kullanici.c'].id } });
  const k3 = await db.kanit.create({ data: {
    ad: 'Olay Müdahale Planı 2026.docx', tip: 'politika',
    gecerlilikBaslangic: gun(-200), yukleyenId: k['kullanici.b'].id } });
  // Aynı envanter kanıtı hem EPDK 4.1.1 hem ISO A.5.9'u karşılıyor (crosswalk)
  await db.kanitBaglantisi.create({ data: { kanitId: k1.id, maddeDurumuId: durumKaydi['SAHA-A3|EPDK-SYM-4.1.1'].id } });
  await db.kanitBaglantisi.create({ data: { kanitId: k1.id, maddeDurumuId: durumKaydi['SAHA-A2|EPDK-SYM-4.1.1'].id } });
  const isoDurum = await db.maddeDurumu.findFirst({ where: {
    surecId: surecIso.id, maddeId: maddeIdx['ISO-27001-A.5.9'].id, tesisId: t['MERKEZ-BT'].id } });
  if (isoDurum) await db.kanitBaglantisi.create({ data: { kanitId: k1.id, maddeDurumuId: isoDurum.id } });
  await db.kanitBaglantisi.create({ data: { kanitId: k2.id, maddeDurumuId: durumKaydi['SAHA-A3|EPDK-SYM-4.2.1'].id } });
  await db.kanitBaglantisi.create({ data: { kanitId: k3.id, maddeDurumuId: durumKaydi['SAHA-C-RES|EPDK-SYM-7.2'].id } });

  // ---- projeler
  const p1 = await db.proje.create({ data: {
    kod: 'PRJ-OT-SEG', ad: 'OT Ağ Segmentasyonu Programı',
    aciklama: 'Jeotermal ve rüzgâr sahalarında zone/conduit modeline geçiş.', durum: 'devam',
    baslangic: gun(-90), hedef: gun(120), sahipId: k['kullanici.c'].id } });
  const p2 = await db.proje.create({ data: {
    kod: 'PRJ-PAM', ad: 'Ayrıcalıklı Erişim Yönetimi',
    aciklama: 'Parola kasası + oturum kaydı yaygınlaştırması.', durum: 'devam',
    baslangic: gun(-45), hedef: gun(60), sahipId: k['kullanici.d'].id } });
  const p3 = await db.proje.create({ data: {
    kod: 'PRJ-SIEM-OT', ad: 'OT Görünürlük / SIEM Genişletme',
    aciklama: 'Saha OT kayıtlarının merkezî SIEM\'e alınması.', durum: 'planlandi',
    baslangic: gun(20), hedef: gun(180), sahipId: k['kullanici.a'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p1.id, maddeId: maddeIdx['EPDK-SYM-4.2.1'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p1.id, bulguId: b1.id } });
  await db.projeBaglantisi.create({ data: { projeId: p2.id, maddeId: maddeIdx['EPDK-SYM-5.1.1'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p2.id, bulguId: b2.id } });
  await db.projeBaglantisi.create({ data: { projeId: p3.id, maddeId: maddeIdx['EPDK-SYM-7.1.4'].id } });
  await db.projeBaglantisi.create({ data: { projeId: p3.id, bulguId: b3.id } });

  // ---- yetkiler (süreç × tesis kapsamlı)
  const yetkiler: [string, { id: string } | null, string | null, string][] = [
    ['kullanici.a', null, null, 'yonetici'],
    ['kullanici.b', null, null, 'denetim_sorumlusu'],
    ['kullanici.c', surecEpdk, null, 'katkici'],
    ['kullanici.d', surecCbddo, 'MERKEZ-BT', 'katkici'],
    ['kullanici.e', null, null, 'okuyucu'],
  ];
  for (const [e, surec, tesisKod, rol] of yetkiler)
    await db.yetki.create({ data: {
      kullaniciId: k[e].id, surecId: surec?.id ?? null,
      tesisId: tesisKod ? t[tesisKod].id : null, rol } });

  // ---- aktivite kaydı (bulgu zaman çizelgeleri)
  const aktiviteler: [number, string, string, string, string, string | null, string | null, string | null][] = [
    [-38, 'kullanici.e', 'Bulgu', b1.id, 'olusturma', null, null, null],
    [-36, 'kullanici.b', 'Bulgu', b1.id, 'guncelleme', 'onemDerecesi', 'yuksek', 'kritik'],
    [-30, 'kullanici.c', 'Aksiyon', b1.id, 'olusturma', null, null, null],
    [-12, 'kullanici.c', 'Bulgu', b1.id, 'dosya_ekleme', null, null, 'Saha A-3 OT Ağ Segmentasyon Şeması v3.pdf'],
    [-6, 'kullanici.c', 'Bulgu', b1.id, 'durum_degisimi', 'durum', 'acik', 'aksiyonda'],
    [-21, 'kullanici.e', 'Bulgu', b2.id, 'olusturma', null, null, null],
    [-60, 'kullanici.c', 'Bulgu', b3.id, 'olusturma', null, null, null],
    [-40, 'kullanici.c', 'Bulgu', b3.id, 'durum_degisimi', 'durum', 'acik', 'aksiyonda'],
    [-14, 'kullanici.e', 'Bulgu', b4.id, 'olusturma', null, null, null],
    [-8, 'kullanici.d', 'Bulgu', b5.id, 'durum_degisimi', 'durum', 'aksiyonda', 'kapali'],
    [-2, 'kullanici.d', 'MaddeDurumu', durumKaydi['SAHA-A3|EPDK-SYM-4.1.1'].id, 'durum_degisimi', 'durum', 'kismi', 'uyumlu'],
    [-300, 'kullanici.a', 'Tesis', t['SAHA-M-DGKC'].id, 'guncelleme', 'durum', 'aktif', 'kapali'],
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
    yukleyenId: k['kullanici.b'].id } });

  // ================= hedef mimari genişlemesi =================

  // Organizasyon hiyerarşisi: Grup → Tüzel Kişi → Tesis
  const grup = await db.grup.create({ data: { kod: 'DEMO-ENERJI', ad: 'Demo Enerji Grubu' } });
  const tuzelEnerji = await db.tuzelKisi.create({ data: {
    grupId: grup.id, kod: 'DEMO-ENERJI-AS', ad: 'Demo Enerji Üretim A.Ş.' } });
  const tuzelJeo = await db.tuzelKisi.create({ data: {
    grupId: grup.id, kod: 'DEMO-JEO', ad: 'Demo Jeotermal Üretim A.Ş.' } });
  const tuzelRotor = await db.tuzelKisi.create({ data: {
    grupId: grup.id, kod: 'DEMO-RES-AS', ad: 'Demo Rüzgâr Üretim A.Ş.' } });
  const tuzelDogal = await db.tuzelKisi.create({ data: {
    grupId: grup.id, kod: 'DEMO-DOGAL', ad: 'Demo Doğal Üretim A.Ş.' } });
  await db.tesis.updateMany({ where: { kod: { in: [
    'SAHA-F-HES', 'SAHA-G-HES', 'SAHA-H-HES', 'SAHA-I-HES', 'SAHA-J-HES',
    'SAHA-K-HES', 'SAHA-L-HES', 'MERKEZ-BT'] } },
    data: { tuzelKisiId: tuzelEnerji.id } });
  await db.tesis.updateMany({ where: { kod: { in: [
    'SAHA-A1', 'SAHA-A2', 'SAHA-A3', 'SAHA-B-JES', 'SAHA-B-GES'] } },
    data: { tuzelKisiId: tuzelJeo.id } });
  await db.tesis.updateMany({ where: { kod: { in: [
    'SAHA-C-RES', 'SAHA-D-RES', 'SAHA-E-RES'] } },
    data: { tuzelKisiId: tuzelRotor.id } });
  await db.tesis.updateMany({ where: { kod: { in: ['SAHA-M-DGKC'] } },
    data: { tuzelKisiId: tuzelDogal.id } });

  // Santral profilleri (§5.1) — uygulanabilirlik motorunun girdisi.
  // Bazı sahalarda alanlar bilinçli olarak null: "bilinmiyor" birinci sınıf
  // durumdur ve veri kalitesi motorunu tetikler.
  const profiller: [string, object][] = [
    ['SAHA-A3', { lisansTipi: 'uretim', lisansNo: 'EU/6521-3', kabulDurumu: 'kesin_kabul',
      blackStart: false, teiasScadaEms: true, seriHaberlesme: false, kritiklikSinifi: 'yuksek',
      kritikAltyapiStatusu: true, otMimariTipi: 'dcs', dcsSaglayici: 'Siemens',
      scadaSaglayici: 'Siemens', uzaktanErisim: true, internetMaruziyeti: 'sinirli',
      yerelAdVar: true, yerelVeriMerkeziVar: true, veriIslemeProfili: 'uretim_telemetrisi',
      grupOrtakServisler: 'merkezi_ad;soc;edr' }],
    ['SAHA-A2', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, seriHaberlesme: false, kritiklikSinifi: 'orta',
      kritikAltyapiStatusu: false, otMimariTipi: 'scada', scadaSaglayici: 'ABB',
      uzaktanErisim: true, internetMaruziyeti: 'yok', yerelAdVar: true,
      grupOrtakServisler: 'merkezi_ad;soc' }],
    ['SAHA-A1', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada' }],
    ['SAHA-B-JES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, seriHaberlesme: true, kritiklikSinifi: 'dusuk',
      otMimariTipi: 'plc_scada', plcAileleri: 'Siemens S7', internetMaruziyeti: 'yok' }],
    ['SAHA-C-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, seriHaberlesme: false, kritiklikSinifi: 'yuksek',
      kritikAltyapiStatusu: true, otMimariTipi: 'scada', scadaSaglayici: 'Vestas',
      uzaktanErisim: true, internetMaruziyeti: 'sinirli', iotVar: true,
      grupOrtakServisler: 'merkezi_ad;soc' }],
    ['SAHA-D-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, seriHaberlesme: true, kritiklikSinifi: 'orta',
      otMimariTipi: 'scada', scadaSaglayici: 'Vestas', uzaktanErisim: true,
      internetMaruziyeti: 'sinirli', iotVar: true }],
    ['SAHA-E-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, seriHaberlesme: true, kritiklikSinifi: 'dusuk',
      otMimariTipi: 'plc_scada' }],
    ['SAHA-F-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada',
      plcAileleri: 'Siemens S7', internetMaruziyeti: 'yok' }],
    ['SAHA-G-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada' }],
    ['SAHA-H-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada' }],
    ['SAHA-I-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, otMimariTipi: 'plc_scada' }],
    ['SAHA-J-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', teiasScadaEms: false,
      kritiklikSinifi: 'dusuk' }],
    ['SAHA-B-GES', { lisansTipi: 'uretim', kabulDurumu: 'gecici_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', iotVar: true, akilliSayacVar: true,
      internetMaruziyeti: 'sinirli' }],
    ['MERKEZ-BT', { kritiklikSinifi: 'yuksek', yerelVeriMerkeziVar: true, yerelAdVar: true,
      internetMaruziyeti: 'var', uzaktanErisim: true, veriIslemeProfili: 'kurumsal_kvkk',
      grupOrtakServisler: 'merkezi_ad;soc;edr;siem' }],
    // SAHA-K-HES ve SAHA-L-HES profilsiz: veri kalitesi motoru "eksik_profil" üretir.
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
  const kapsamda = [
    ['SAHA-A3', true, 'kuruluGucMw=165 ≥ 100 VE TEİAŞ SCADA/EMS (seri değil)'],
    ['SAHA-A2', true, 'TEİAŞ SCADA/EMS haberleşmesi seri tabanlı değil'],
    ['SAHA-C-RES', true, 'kuruluGucMw=135 ≥ 100 VE TEİAŞ SCADA/EMS (seri değil); Black-Start yok'],
    ['SAHA-D-RES', false, 'güç 57 < 100; TEİAŞ haberleşmesi seri tabanlı; Black-Start yok'],
    ['SAHA-A1', false, 'güç 15 < 100; TEİAŞ SCADA/EMS yok; Black-Start yok'],
    ['SAHA-B-JES', false, 'güç 45 < 100; kapsam koşulları sağlanmıyor'],
    ['SAHA-E-RES', false, 'güç 23,3 < 100; haberleşme seri tabanlı'],
    ['SAHA-F-HES', false, 'güç 24,94 < 100; TEİAŞ SCADA/EMS yok'],
    ['SAHA-G-HES', false, 'güç 15 < 100; kapsam koşulları sağlanmıyor'],
    ['SAHA-H-HES', false, 'güç 20,4 < 100; kapsam koşulları sağlanmıyor'],
    ['SAHA-I-HES', false, 'güç 16,8 < 100; kapsam koşulları sağlanmıyor'],
    ['SAHA-J-HES', false, 'güç 20,9 < 100; kapsam koşulları sağlanmıyor'],
    ['SAHA-B-GES', false, 'güç 3,75 < 100; geçici kabul; kapsam koşulları sağlanmıyor'],
  ] as const;
  for (const [kod, uygulanabilir, gerekce] of kapsamda)
    await db.uygulanabilirlikKarari.create({ data: {
      tesisId: t[kod].id, regulasyonId: reg['EPDK-SYM'].id,
      uygulanabilir, gerekce, kuralId: epdkKural.id, kuralSurumu: 1 } });
  // Örnek onaylı override: Saha D RES sözleşme gereği gönüllü kapsamda
  await db.uygulanabilirlikKarari.update({
    where: { tesisId_regulasyonId: { tesisId: t['SAHA-D-RES'].id, regulasyonId: reg['EPDK-SYM'].id } },
    data: { uygulanabilir: true, elIleDegistirildi: true,
      degistirmeGerekcesi: 'Saha C ile ortak şalt sahası ve TEİAŞ bağlantı anlaşması gereği gönüllü uyum taahhüdü',
      onaylayanId: k['kullanici.a'].id } });

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
    kod: 'SAHA-A3-KURUMSAL', ad: 'Saha A-3 Kurumsal Ağ', tip: 'kurumsal',
    tesisId: t['SAHA-A3'].id, guvenlikSeviyesi: 4 } });
  const zonOtDmz = await db.agBolgesi.create({ data: {
    kod: 'SAHA-A3-OT-DMZ', ad: 'Saha A-3 OT DMZ', tip: 'ot_dmz',
    tesisId: t['SAHA-A3'].id, guvenlikSeviyesi: 3 } });
  const zonOt = await db.agBolgesi.create({ data: {
    kod: 'SAHA-A3-OT', ad: 'Saha A-3 DCS/SCADA Ağı', tip: 'ot',
    tesisId: t['SAHA-A3'].id, guvenlikSeviyesi: 2 } });
  const zonSahaCOt = await db.agBolgesi.create({ data: {
    kod: 'SAHA-C-OT', ad: 'Saha C Türbin SCADA Ağı', tip: 'ot',
    tesisId: t['SAHA-C-RES'].id, guvenlikSeviyesi: 2 } });
  const zonMerkez = await db.agBolgesi.create({ data: {
    kod: 'MERKEZ-BT-KURUMSAL', ad: 'Merkez Kampüs Kurumsal Ağ', tip: 'kurumsal',
    tesisId: t['MERKEZ-BT'].id, guvenlikSeviyesi: 4 } });
  await db.agGeciti.create({ data: {
    kaynakBolgeId: zonKurumsal.id, hedefBolgeId: zonOtDmz.id,
    kontrolVarligi: 'SAHA-A3-OTFW-01', protokoller: 'https;opc-ua', onaylandi: true } });
  await db.agGeciti.create({ data: {
    kaynakBolgeId: zonOtDmz.id, hedefBolgeId: zonOt.id,
    kontrolVarligi: 'SAHA-A3-OTFW-01', protokoller: 'modbus-tcp;iec104', onaylandi: true } });
  await db.agGeciti.create({ data: {
    kaynakBolgeId: zonMerkez.id, hedefBolgeId: zonSahaCOt.id,
    protokoller: 'opc-ua;iec104', onaylandi: false,
    aciklama: 'Saha C türbin SCADA verisi merkeze doğrudan akıyor; geçit kontrolü onaylı değil.' } });

  const sistemDcs = await db.sistemServis.create({ data: {
    kod: 'SAHA-A3-DCS', ad: 'Saha A-3 Türbin DCS/SCADA', tip: 'sistem',
    aciklama: 'Buhar türbini ve reenjeksiyon kontrolü.',
    tesisId: t['SAHA-A3'].id, kritiklik: 'kritik', sahipId: k['kullanici.c'].id } });
  const sistemTurbin = await db.sistemServis.create({ data: {
    kod: 'SAHA-C-TURBIN-SCADA', ad: 'Saha C Türbin SCADA', tip: 'sistem',
    aciklama: '54 türbinin uzaktan izleme ve kontrol platformu.',
    tesisId: t['SAHA-C-RES'].id, kritiklik: 'yuksek', sahipId: k['kullanici.c'].id } });
  const sistemSanal = await db.sistemServis.create({ data: {
    kod: 'MERKEZ-SANALLASTIRMA', ad: 'Merkez Sanallaştırma Platformu', tip: 'sistem',
    aciklama: 'Genel müdürlük veri merkezi sanal sunucu kümesi.',
    tesisId: t['MERKEZ-BT'].id, kritiklik: 'yuksek', sahipId: k['kullanici.d'].id } });

  const surecUretim = await db.isSureci.create({ data: {
    kod: 'SAHA-A3-URETIM', ad: 'Saha A-3 jeotermal elektrik üretimi',
    tesisId: t['SAHA-A3'].id, uretimEtkisi: 'uretim_durur' } });
  await db.isSureciSistemi.create({ data: { surecId: surecUretim.id, sistemId: sistemDcs.id } });
  const surecRuzgar = await db.isSureci.create({ data: {
    kod: 'SAHA-C-URETIM', ad: 'Saha C rüzgâr üretimi ve uzaktan izleme',
    tesisId: t['SAHA-C-RES'].id, uretimEtkisi: 'yuksek' } });
  await db.isSureciSistemi.create({ data: { surecId: surecRuzgar.id, sistemId: sistemTurbin.id } });

  const varlikOtfw = await db.varlik.create({ data: {
    etiket: 'SAHA-A3-OTFW-01', ad: 'OT Güvenlik Duvarı (Saha A-3)', turId: tur['OTFW'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, uretici: 'Fortinet',
    model: 'FG-200F', kritiklik: 'kritik', uretimEtkisi: 'yuksek',
    bolgeId: zonOtDmz.id, yasamDongusu: 'aktif', sahipId: k['kullanici.c'].id,
    emanetciId: k['kullanici.d'].id, eosTarihi: gun(500), yamaDurumu: 'guncel',
    izlemeDurumu: 'var', logKaynagi: 'var', internetMaruziyeti: 'yok' } });
  const varlikDcs = await db.varlik.create({ data: {
    etiket: 'SAHA-A3-DCS-01', ad: 'Türbin DCS Denetleyicisi', turId: tur['DCS'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, uretici: 'Siemens',
    model: 'SPPA-T3000', firmware: 'R8.2 SP2', kritiklik: 'kritik',
    emniyetEtkisi: 'yuksek', uretimEtkisi: 'uretim_durur', bolgeId: zonOt.id,
    sahipId: k['kullanici.c'].id, yamaDurumu: 'eksik', izlemeDurumu: 'yok',
    logKaynagi: 'yok', internetMaruziyeti: 'yok', eosTarihi: gun(900) } });
  const varlikScada = await db.varlik.create({ data: {
    etiket: 'SAHA-A3-SCADA-01', ad: 'Saha A-3 SCADA Sunucusu', turId: tur['SCADA-SRV'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, isletimSistemi: 'Windows Server 2012 R2',
    uretici: 'Dell', model: 'PowerEdge R740', kritiklik: 'kritik', uretimEtkisi: 'yuksek',
    bolgeId: zonOt.id, eolTarihi: gun(-800), eosTarihi: gun(-400), yamaDurumu: 'yamasiz',
    yedekDurumu: 'var', edrDurumu: 'yok', sahipId: k['kullanici.c'].id } });
  await db.varlik.create({ data: {
    etiket: 'SAHA-A3-EWS-01', ad: 'Mühendislik İstasyonu (Saha A-3)', turId: tur['EWS'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, kritiklik: 'yuksek',
    isletimSistemi: 'Windows 10 IoT Enterprise', bolgeId: zonOt.id,
    yamaDurumu: 'eksik', uzaktanErisim: true, sahipId: k['kullanici.c'].id } });
  const varlikSahaC = await db.varlik.create({ data: {
    etiket: 'SAHA-C-SCADA-01', ad: 'Saha C Türbin SCADA Sunucusu', turId: tur['SCADA-SRV'].id,
    tesisId: t['SAHA-C-RES'].id, sistemId: sistemTurbin.id, uretici: 'Vestas',
    isletimSistemi: 'Windows Server 2016', bolgeId: zonSahaCOt.id,
    uretimEtkisi: 'yuksek', logKaynagi: 'yok', izlemeDurumu: 'bilinmiyor',
    yamaDurumu: 'bilinmiyor' } }); // sahipsiz + kritikliği bilinmiyor: veri kalitesi örneği
  await db.varlik.create({ data: {
    etiket: 'MERKEZ-SSUNUCU-01', ad: 'Yönetişim Platformu Uygulama Sunucusu', turId: tur['SSUNUCU'].id,
    tesisId: t['MERKEZ-BT'].id, sistemId: sistemSanal.id, isletimSistemi: 'Ubuntu 24.04 LTS',
    kritiklik: 'yuksek', bolgeId: zonMerkez.id, sahipId: k['kullanici.d'].id,
    yamaDurumu: 'guncel', edrDurumu: 'var', yedekDurumu: 'var', izlemeDurumu: 'var',
    logKaynagi: 'var', internetMaruziyeti: 'sinirli', eosTarihi: gun(1400) } });
  await db.varlik.create({ data: {
    etiket: 'MERKEZ-SSUNUCU-02', ad: 'Etki Alanı Denetleyicisi', turId: tur['SSUNUCU'].id,
    tesisId: t['MERKEZ-BT'].id, sistemId: sistemSanal.id, isletimSistemi: 'Windows Server 2022',
    kritiklik: 'kritik', bolgeId: zonMerkez.id, sahipId: k['kullanici.d'].id,
    yamaDurumu: 'guncel', edrDurumu: 'var', yedekDurumu: 'var', izlemeDurumu: 'var',
    logKaynagi: 'var', internetMaruziyeti: 'yok', eosTarihi: gun(1600) } });
  await db.varlikIliskisi.create({ data: {
    kaynakId: varlikScada.id, hedefId: varlikOtfw.id, tip: 'connects_to' } });
  await db.varlikIliskisi.create({ data: {
    kaynakId: varlikDcs.id, hedefId: varlikScada.id, tip: 'depends_on' } });

  // Risk kaydı: EOS SCADA sunucusu → bulgu b1 ile bağlantılı üretim riski
  const risk1 = await db.risk.create({ data: {
    kod: 'RSK-2026-001', baslik: 'Desteksiz SCADA sunucusu üzerinden jeotermal üretim kesintisi',
    aciklama: 'Saha A-3 SCADA sunucusu EOL/EOS geçmiş Windows Server 2012 R2 üzerinde; yama alamıyor. DCS ağının kurumsal ağdan ayrıştırılmamış olmasıyla (bulgu) birleşince fidye yazılımının 165 MW üretimi durdurma olasılığı yüksek.',
    kaynak: 'eol', tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, bulguId: b1.id,
    tehdit: 'Fidye yazılımı / yetkisiz erişim', zayiflik: 'EOS işletim sistemi + düz ağ',
    olasilik: 4, etkiUretim: 5, etkiEmniyet: 3, etkiRegulasyon: 4, etkiFinans: 4,
    etkiSiber: 5, dogalRisk: 20, artikRisk: 16,
    mevcutKontroller: 'OT DMZ güvenlik duvarı; günlük yedek',
    sahipId: k['kullanici.c'].id, islemTipi: 'azalt', durum: 'islemde' } });
  await db.riskVarlik.create({ data: { riskId: risk1.id, varlikId: varlikScada.id } });
  await db.riskKontrol.create({ data: { riskId: risk1.id, maddeId: maddeIdx['EPDK-SYM-4.2.1'].id } });
  await db.projeBaglantisi.create({ data: {
    projeId: p1.id, riskId: risk1.id, tesisId: t['SAHA-A3'].id,
    gerekce: 'Segmentasyon programı bu riskin ana azaltıcısıdır' } });
  // OT görünürlük riski: Saha C SIEM bulgusuna bağlı
  const risk2 = await db.risk.create({ data: {
    kod: 'RSK-2026-002', baslik: 'Saha C türbin SCADA\'sında olay görünürlüğü yok',
    aciklama: 'Türbin SCADA kayıtları merkezî SIEM\'e akmadığı için yetkisiz erişim tespiti yapılamıyor; EPDK bildirim süresi kaçırılabilir.',
    kaynak: 'bulgu', tesisId: t['SAHA-C-RES'].id, sistemId: sistemTurbin.id, bulguId: b3.id,
    tehdit: 'Tespit edilemeyen yetkisiz erişim', zayiflik: 'Log toplama ve izleme yok',
    olasilik: 3, etkiUretim: 3, etkiRegulasyon: 4, etkiSiber: 4, etkiItibar: 3,
    dogalRisk: 12, artikRisk: 12, mevcutKontroller: 'Saha ekibi manuel kontrol',
    sahipId: k['kullanici.c'].id, islemTipi: 'azalt', durum: 'islemde' } });
  await db.riskVarlik.create({ data: { riskId: risk2.id, varlikId: varlikSahaC.id } });
  await db.riskKontrol.create({ data: { riskId: risk2.id, maddeId: maddeIdx['EPDK-SYM-7.1.4'].id } });
  await db.projeBaglantisi.create({ data: {
    projeId: p3.id, riskId: risk2.id, tesisId: t['SAHA-C-RES'].id,
    gerekce: 'SIEM genişletme projesi bu riskin ana azaltıcısıdır' } });
  // Süreli risk kabulü örneği
  await db.risk.create({ data: {
    kod: 'RSK-2026-003', baslik: 'Saha D RES haberleşmesinde tekil güzergah',
    aciklama: 'Saha D RES haberleşmesi Saha C üzerinden tek fiber güzergahta; kopmada uzaktan görünürlük kaybı yaşanıyor.',
    kaynak: 'manuel', tesisId: t['SAHA-D-RES'].id, olasilik: 2, etkiUretim: 2, etkiSiber: 1,
    dogalRisk: 4, artikRisk: 4, islemTipi: 'kabul', kabulBitis: gun(180),
    onaylayanId: k['kullanici.a'].id, sahipId: k['kullanici.c'].id, durum: 'kabul_edildi' } });
  // Veri kalitesi kaynaklı risk: profilsiz sahalar
  await db.risk.create({ data: {
    kod: 'RSK-2026-004', baslik: 'Saha K ve Saha L HES için santral profili yok',
    aciklama: 'İki HES sahasında santral profili doldurulmadığı için EPDK kapsam kararı üretilemiyor; kapsam dışı sayılmaları doğrulanamıyor.',
    kaynak: 'veri_kalitesi', tesisId: t['SAHA-K-HES'].id, olasilik: 3, etkiRegulasyon: 3,
    etkiVeri: 3, dogalRisk: 9, artikRisk: 9, sahipId: k['kullanici.b'].id,
    islemTipi: 'azalt', durum: 'acik' } });

  // Denetim yaşam döngüsü: yaklaşan CBDDÖ yerinde denetimi
  const denetim1 = await db.denetim.create({ data: {
    kod: 'DEN-2026-CBDDO', ad: 'CBDDÖ Yerinde Denetimi 2026', tip: 'dis_denetim',
    denetleyen: 'CBDDÖ', surecId: surecCbddo.id, durum: 'kanit_talebi',
    planBaslangic: gun(35), planBitis: gun(42) } });
  await db.denetimKapsami.create({ data: { denetimId: denetim1.id, tesisId: t['MERKEZ-BT'].id } });
  await db.denetimKapsami.create({ data: { denetimId: denetim1.id, tesisId: t['SAHA-A3'].id } });
  await db.kanitTalebi.create({ data: {
    denetimId: denetim1.id, baslik: 'Ağ topolojisi ve segmentasyon şeması',
    sorumluId: k['kullanici.c'].id, sonTarih: gun(20), kanitId: k2.id, durum: 'saglandi' } });
  await db.kanitTalebi.create({ data: {
    denetimId: denetim1.id, baslik: 'Denetim izi saklama konfigürasyonu',
    sorumluId: k['kullanici.d'].id, sonTarih: gun(25) } });

  // Kanıt geçerlilikleri (tazelik motoru için) + bayat örnek
  await db.kanit.update({ where: { id: k1.id }, data: {
    gecerliBitis: gun(140), sahipId: k['kullanici.d'].id, toplanmaTarihi: gun(-40) } });
  await db.kanit.update({ where: { id: k2.id }, data: {
    gecerliBitis: gun(20), sahipId: k['kullanici.c'].id, toplanmaTarihi: gun(-160) } });
  await db.kanit.update({ where: { id: k3.id }, data: {
    gecerliBitis: gun(-20), sahipId: k['kullanici.b'].id, toplanmaTarihi: gun(-200) } });

  // Proje adayı örneği: EOS varlıktan otomatik üretilmiş, onay bekliyor
  await db.projeAdayi.create({ data: {
    baslik: 'Saha A-3 SCADA sunucu modernizasyonu',
    gerekce: 'SAHA-A3-SCADA-01 EOL/EOS geçti (Windows Server 2012 R2); RSK-2026-001 artık riski 16/25; EPDK-SYM-4.2.1 uyumsuz. Modernizasyon üç kaydı birden kapatır.',
    kaynak: 'eol_eos', kaynakRef: varlikScada.id, tesisId: t['SAHA-A3'].id } });

  // Görev motoru örnekleri
  await db.gorev.create({ data: {
    baslik: 'Olay Müdahale Planı kanıtı süresi doldu — yenileyin',
    tip: 'kanit_yenileme', kaynakTipi: 'Kanit', kaynakId: k3.id,
    sorumluId: k['kullanici.b'].id, tesisId: t['SAHA-C-RES'].id,
    sonTarih: gun(14), otomatikUretildi: true } });
  await db.gorev.create({ data: {
    baslik: 'CBDDÖ kanıt talebi: denetim izi konfigürasyonu',
    tip: 'dogrulama', kaynakTipi: 'KanitTalebi', kaynakId: denetim1.id,
    sorumluId: k['kullanici.d'].id, sonTarih: gun(25), otomatikUretildi: true } });
  await db.gorev.create({ data: {
    baslik: 'Saha K ve Saha L HES santral profillerini doldurun',
    tip: 'veri_kalitesi', kaynakTipi: 'Tesis', kaynakId: t['SAHA-K-HES'].id,
    sorumluId: k['kullanici.a'].id, tesisId: t['SAHA-K-HES'].id,
    sonTarih: gun(30), otomatikUretildi: true } });

  // Operasyonel katman (CMDB, ömür, yedekleme, erişim, tedarikçi) ayrı dosyada.
  await operasyonVerisi(db);
  // Uyum matrisi beş kontrol ailesiyle çalışır; katalog genişletmesi ayrı dosyada.
  await uyumKatalogu(db);
  // Denetim zaman çizelgesi ve dönüşüm portföyü faz/bütçe/zincir kayıtları.
  // Risk kütüğü ve CAPA hattı; kayıtlar operasyonel veriden türer.
  await riskVeBulgu(db);
  await denetimVeProje(db);
  // Kanıt katmanı en sonda: durumdan türer, durumları okumak zorunda.
  await kanitVerisi(db);
  /* Yönetişim belgesi kütüğü kanıttan SONRA: mevcut politika kanıtlarını
     kütükteki karşılıklarına bağlar (C22/C23). */
  await dokumanKutugu(db);
  // Connector TANIMLARI — hiçbiri etkin değil, kimlik bilgisi bekliyor.
  await entegrasyonVerisi(db);
  /* Operasyonel kayıtlar EN SONDA: değişiklik, olay ve istisna kayıtları
     tesis, varlık, madde ve kullanıcı verisine dayanıyor. */
  await operasyonKayitlari(db);
  /* Doluluk katmanı EN SONDA: kodun okuduğu ama seed'in yazmadığı
     tabloları (köken, keşif, red kuyruğu, olay etki zinciri, API kütüğü…)
     var olan kayıtlardan türetir, o yüzden hepsinden sonra gelir. */
  await dolulukKatmani(db);

  console.log('Seed tamam. Geliştirme girişi: kullanici.a@demo.local / ' + GELISTIRME_PAROLASI);
}

main().finally(() => db.$disconnect());
