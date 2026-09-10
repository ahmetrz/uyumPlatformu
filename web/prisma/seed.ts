/* Başlangıç verisi — Demo Enerji portföyü. Tüm sözlükler (sektör, tip, alan,
   regülasyon, süreç) panelden yönetilebilir; burası yalnızca ilk kurulum setidir. */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { SAGLAYICI } from '../lib/veritabani';
import { operasyonVerisi } from './seed-operasyon';
import { uyumKatalogu } from './seed-uyum';
import { denetimVeProje } from './seed-denetim-proje';
import { riskVeBulgu } from './seed-risk-bulgu';
import { kanitVerisi } from './seed-kanit';
import { dokumanKutugu } from './seed-dokuman';
import { entegrasyonVerisi } from './seed-entegrasyon';
import { operasyonKayitlari } from './seed-operasyon-kayitlari';
import { dolulukKatmani } from './seed-doluluk';
import { suSektoru, suUyumu } from './seed-su';
import { suVeriSeti } from './seed-su-veri';
import { kapsamTurleriniKur, profiliAyir, TEIAS_SERI_OLMAYAN_KOSULU, tesislerdenOgeler } from './kapsam-ogesi';
import { KURULU_GUC } from '../lib/alan/oznitelik';
import { hataSatiri } from '../lib/paket/dogrula';
import { paketiKur } from '../lib/paket/kur';
import { acikOlaylarinKayitlarini } from '../lib/uyum/bildirimKaydiAcma';
import { acikDonemleriKur } from '../lib/uyum/bildirimDonemiAcma';
import { MADDE_ALANLARI } from './seed-madde-alanlari';

const parolaUret = (parola: string) => {
  const tuz = randomBytes(16).toString('hex');
  return `s1$${tuz}$${scryptSync(parola, tuz, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString('hex')}`;
};
const GELISTIRME_PAROLASI = 'Enerji!2026';

/* Tohum SAĞLAYICIYI kendi başına seçmez: `lib/veritabani.ts` seçer (R5).
   Önce doğrudan SQLite kuruyordu ve `DATABASE_URL` PostgreSQL'i gösterdiğinde
   sessizce geliştirme dosyasını okuyordu — PostgreSQL kurulumu tohumsuz
   kalır, sebebi "veritabanı dolu" diye görünürdü (ölçüldü). */
const VERITABANI = SAGLAYICI === 'postgresql'
  ? { ad: process.env.DATABASE_URL!.replace(/:[^:@/]*@/, ':***@'), istemci: () => new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) }) }
  : { ad: path.join(__dirname, 'dev.db'), istemci: () => new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }) }) };
const db = VERITABANI.istemci();

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

async function main() {
  // Denetim izi değişmezdir: dolu veritabanına seed atılmaz.
  if (await db.aktiviteKaydi.count() > 0) {
    console.error(`Veritabanı dolu (${VERITABANI.ad}). Yeniden seed için önce bu veritabanını boşaltın.`);
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
  /* Kapsam öğesi TÜRLERİ — katalog (B1). Çekirdek iki tür getirir;
     kimlikler göçle aynı ('kot-…') ki taze kurulum ve yükseltme aynı
     satırı yazsın. "Merkez BT" tipi kurumun kendisidir → `kurum`. */
  const kapsamTuru = await kapsamTurleriniKur(db);
  const tip = Object.fromEntries(await Promise.all(
    [
      ['JEO', 'Jeotermal', 1], ['RES', 'Rüzgâr', 2], ['HES', 'Hidroelektrik', 3],
      ['GES', 'Güneş', 4], ['DGKC', 'Doğal Gaz Kombine Çevrim', 5], ['MERKEZ', 'Merkez BT', 9],
    ].map(async ([kod, ad, sira]) => [kod, await db.tesisTipi.create({
      data: { kod: kod as string, ad: ad as string, sira: sira as number, sektorId: elektrik.id,
        varsayilanKapsamTuruId: kod === 'MERKEZ' ? kapsamTuru.kurum.id : kapsamTuru.tesis.id } })]),
  )) as Record<string, { id: string }>;

  /* ---- enerji sözlüğü ve öznitelik şeması (P1 · URN-ALN-004 · B2)

     2.5'ten beri DEMO-TR-ENERJI PAKETİNDEN gelir (aşağıda `demoPaketiKur`):
     çekirdek "tesis" der, paket sözlüğü "santral" der; sektörün birincil
     ölçüsü (`kuruluGuc`, MW, rol=kapasite) ve enerji profil öznitelikleri
     paketin `oznitelikler.json`undadır. Sözlük SİLİNİRSE ekran bozulmaz,
     çekirdek sözcüğe döner — kurulu sektör paketi olmayan bir kiracının
     hâli budur ve test tam olarak bunu ölçer. */

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
        anahtar: KURULU_GUC, sayisalDeger: guc, birim: 'MW', kaynak: 'tohum',
      }] },
      kapanisTarihi: kapanis === null ? null : gun(kapanis), kapanisNedeni: neden,
      devreyeGiris: gun(giris),
      // 05-photography §2: yalnız fotoğrafı SAĞLANMIŞ santral anahtar alır.
      // Karşılığı olmayan null kalır ve tipografik fallback render edilir —
      // asla "yakın" başka bir santralin fotoğrafı kullanılmaz (§1.3).
      gorselAnahtari: gorsel,
    } })]))) as Record<string, { id: string }>;

  /* Her tesis için bir KAPSAM ÖĞESİ (B1): uyum zinciri artık `ko[kod]`
     ile bağlanır, `t[kod]` ile değil. Kod ve ad tesisinki. */
  const ko = await tesislerdenOgeler(db, t);

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

  /* ---- P4 · 2.5 · UYUM İÇERİĞİ DEMO PAKETLERİNDEN GELİR

     Sözlük, öznitelik şeması, çerçeveler (EPDK-SYM demo · CBDDÖ · ISO 27001
     · SPK BS) ve denklikler `paketler/DEMO-TR-*` dizinlerinden `paketiKur`
     ile kurulur; tohum artık ikinci bir doğruluk kaynağı değildir
     (docs/P4_TOHUM_TASIMA_OLCUMU.md §4). Çerçeve TASLAK gelir ve
     aktifleştirme insan kararıdır — burada o insan tohumu kuran
     yöneticidir (`kullanici.a`): ilk kurulumun sürümleri doğrudan aktif
     yazılır (2.5 öncesi de doğrudan aktif yazılıyordu; SurumFarki ve iz
     yok). ISO 27001 maddelerinin kısa açıklama metinleri telifli kuralıyla
     DÜŞER — kayıp beklenen ve ölçülen. Kiracı katmanı (BT/OT kapsam alanı
     eşlemesi, aile adı) tohumda kalır: paket kalemi değildir. */
  const paketDizini = (kod: string) => path.join(__dirname, '..', 'paketler', kod);
  async function demoPaketiKur(kod: string) {
    const sonuc = await paketiKur(paketDizini(kod), { kuranId: k['kullanici.a'].id, istemci: db });
    if (!sonuc.ok) throw new Error(`${kod} kurulamadı:\n${sonuc.hatalar.map(hataSatiri).join('\n')}`);
    for (const t of sonuc.rapor.taslakSurumler) {
      await db.frameworkSurumu.update({ where: { id: t.surumId }, data: { durum: 'aktif' } });
    }
    const s = sonuc.rapor.sayilar;
    console.log(`Paket ${kod} ${sonuc.rapor.surum}: sözlük ${s.sozluk} · öznitelik ${s.oznitelikler} · çerçeve ${s.cerceveler} (${s.maddeler} madde, aktif) · eşleme ${s.eslemeler}`
      + (sonuc.rapor.celiskiler.length ? ` · çelişki ${sonuc.rapor.celiskiler.length}` : ''));
    return sonuc.rapor;
  }
  await demoPaketiKur('DEMO-TR-ORTAK');
  await demoPaketiKur('DEMO-TR-ENERJI');
  const reg = Object.fromEntries((await db.regulasyon.findMany({ select: { id: true, kod: true } })).map((r) => [r.kod, r])) as Record<string, { id: string }>;
  const maddeIdx = Object.fromEntries((await db.madde.findMany({ select: { id: true, kod: true } })).map((m) => [m.kod, m])) as Record<string, { id: string }>;
  /* Kapsam alanı (BT/OT) eşlemesi kiracı katmanıdır: paketten gelmez, tohum
     her maddeyi alanına bağlar (`seed-madde-alanlari.ts`, 38 madde). */
  for (const [kod, alanlar] of Object.entries(MADDE_ALANLARI)) {
    const madde = maddeIdx[kod];
    if (!madde) throw new Error(`kapsam alanı eşlemesi: madde paketten gelmedi — ${kod}`);
    for (const a of alanlar) await db.maddeAlan.create({ data: { maddeId: madde.id, alanId: a === 'BT' ? alanBT.id : alanOT.id } });
  }
  const CBDDO_KODLARI = ['3.1', '3.2', '4.1', '4.2'];
  const ISO_KODLARI = ['A.5.9', 'A.8.9', 'A.8.16', 'A.5.24'];

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
    await db.surecKapsami.create({ data: { surecId: surecEpdk.id, kapsamOgesiId: ko[tk].id } });
  for (const tk of ['MERKEZ-BT', 'SAHA-A3'])
    await db.surecKapsami.create({ data: { surecId: surecCbddo.id, kapsamOgesiId: ko[tk].id } });
  for (const tk of ['MERKEZ-BT', 'SAHA-A3'])
    await db.surecKapsami.create({ data: { surecId: surecIso.id, kapsamOgesiId: ko[tk].id } });
  await db.surecKapsami.create({ data: { surecId: surecSpk.id, kapsamOgesiId: ko['MERKEZ-BT'].id } });

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
        surecId: surecEpdk.id, maddeId: maddeIdx[mk].id, kapsamOgesiId: ko[tk].id,
        durum: durumMatrisi[tk][mk] ?? 'incelemede',
        sorumluId: sorumluSirasi[si++ % 3].id,
        sonDegerlendirme: gun(-(si % 45) - 2),
      } });
      durumKaydi[`${tk}|${mk}`] = d;
    }
  }
  // CBDDÖ + ISO süreçleri: temsilî durumlar
  for (const tk of ['MERKEZ-BT', 'SAHA-A3']) {
    for (const kod of CBDDO_KODLARI) {
      await db.maddeDurumu.create({ data: {
        surecId: surecCbddo.id, maddeId: maddeIdx[`CBDDO-${kod}`].id, kapsamOgesiId: ko[tk].id,
        durum: tk === 'MERKEZ-BT' ? 'uyumlu' : kod.startsWith('3') ? 'kismi' : 'incelemede',
        sorumluId: k['kullanici.d'].id, sonDegerlendirme: gun(-12),
      } });
    }
  }
  for (const tk of ['MERKEZ-BT', 'SAHA-A3']) {
    for (const kod of ISO_KODLARI) {
      await db.maddeDurumu.create({ data: {
        surecId: surecIso.id, maddeId: maddeIdx[`ISO-27001-${kod}`].id, kapsamOgesiId: ko[tk].id,
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
    surecId: surecIso.id, maddeId: maddeIdx['ISO-27001-A.5.9'].id, kapsamOgesiId: ko['MERKEZ-BT'].id } });
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

  // ---- yetkiler (süreç × kapsam öğesi kapsamlı; tesis kodu → öğe)
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
      kapsamOgesiId: tesisKod ? ko[tesisKod].id : null, rol } });

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
      kritikAltyapiStatusu: true, otMimariTipi: 'dcs', dcsSaglayici: 'Demo Türbin Sistemleri',
      scadaSaglayici: 'Demo Türbin Sistemleri', uzaktanErisim: true, internetMaruziyeti: 'sinirli',
      yerelAdVar: true, yerelVeriMerkeziVar: true, veriIslemeProfili: 'uretim_telemetrisi',
      grupOrtakServisler: 'merkezi_ad;soc;edr' }],
    ['SAHA-A2', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, seriHaberlesme: false, kritiklikSinifi: 'orta',
      kritikAltyapiStatusu: false, otMimariTipi: 'scada', scadaSaglayici: 'Demo Elektrik Ekipmanları',
      uzaktanErisim: true, internetMaruziyeti: 'yok', yerelAdVar: true,
      grupOrtakServisler: 'merkezi_ad;soc' }],
    ['SAHA-A1', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada' }],
    ['SAHA-B-JES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, seriHaberlesme: true, kritiklikSinifi: 'dusuk',
      otMimariTipi: 'plc_scada', plcAileleri: 'Demo Türbin Sistemleri S7', internetMaruziyeti: 'yok' }],
    ['SAHA-C-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, seriHaberlesme: false, kritiklikSinifi: 'yuksek',
      kritikAltyapiStatusu: true, otMimariTipi: 'scada', scadaSaglayici: 'Demo Rüzgâr Türbini',
      uzaktanErisim: true, internetMaruziyeti: 'sinirli', iotVar: true,
      grupOrtakServisler: 'merkezi_ad;soc' }],
    ['SAHA-D-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: true, seriHaberlesme: true, kritiklikSinifi: 'orta',
      otMimariTipi: 'scada', scadaSaglayici: 'Demo Rüzgâr Türbini', uzaktanErisim: true,
      internetMaruziyeti: 'sinirli', iotVar: true }],
    ['SAHA-E-RES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, seriHaberlesme: true, kritiklikSinifi: 'dusuk',
      otMimariTipi: 'plc_scada' }],
    ['SAHA-F-HES', { lisansTipi: 'uretim', kabulDurumu: 'kesin_kabul', blackStart: false,
      teiasScadaEms: false, kritiklikSinifi: 'dusuk', otMimariTipi: 'plc_scada',
      plcAileleri: 'Demo Türbin Sistemleri S7', internetMaruziyeti: 'yok' }],
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
  /* B2 · Enerjiye özgü alanlar (lisans, kabul, black start, TEİAŞ, seri
     haberleşme, EPDK kritiklik sınıfı) ÇEKİRDEK KOLONU DEĞİL, enerji
     paketinin beyan ettiği ÖZNİTELİKTİR: şema satırı + tesis başına
     `TesisOzellik`. Kalanlar OT genel profil kolonu olarak kalır. */
  /* Öznitelik şeması DEMO-TR-ENERJI paketinden geldi; burada yalnız tesis
     başına DEĞERLER yazılır (demo verisi — kalem 9). */
  for (const [kod, profil] of profiller) {
    const { ozellikler, kalan } = profiliAyir(profil as Record<string, unknown>);
    await db.tesisProfili.create({ data: { tesisId: t[kod].id, ...kalan } });
    for (const o of ozellikler) {
      await db.tesisOzellik.create({ data: { tesisId: t[kod].id, kaynak: 'tohum', ...o } });
    }
  }

  /* Çerçeve sürümleri paketle geldi ve `demoPaketiKur` içinde aktif yapıldı;
     maddeler sürümüne kurulumda bağlandı (backfill yok). */

  // Uygulanabilirlik kuralı (§5.2) + kararlar
  const epdkKural = await db.uygulanabilirlikKurali.create({ data: {
    regulasyonId: reg['EPDK-SYM'].id, ad: 'EPDK SYM kapsam kuralı',
    aciklama: 'Kurulu güç ≥100 MWe VEYA Black-Start VEYA TEİAŞ SCADA/EMS (seri olmayan) → kapsamda',
    kosulJson: JSON.stringify({ herhangi: [
      { alan: 'kuruluGuc', islec: '>=', deger: 100 },
      { alan: 'blackStart', islec: '=', deger: true },
      /* Türetim ÇEKİRDEKTE değil KURALDA: "TEİAŞ SCADA/EMS var VE seri
         değil" iç içe `hepsi` ile söylenir (B2); göçle aynı nesne. */
      TEIAS_SERI_OLMAYAN_KOSULU,
    ] }) } });
  const kapsamda = [
    ['SAHA-A3', true, 'kuruluGuc=165 ≥ 100 VE TEİAŞ SCADA/EMS (seri değil)'],
    ['SAHA-A2', true, 'TEİAŞ SCADA/EMS haberleşmesi seri tabanlı değil'],
    ['SAHA-C-RES', true, 'kuruluGuc=135 ≥ 100 VE TEİAŞ SCADA/EMS (seri değil); Black-Start yok'],
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
      kapsamOgesiId: ko[kod].id, regulasyonId: reg['EPDK-SYM'].id,
      uygulanabilir, gerekce, kuralId: epdkKural.id, kuralSurumu: 1 } });
  // Örnek onaylı override: Saha D RES sözleşme gereği gönüllü kapsamda
  await db.uygulanabilirlikKarari.update({
    where: { kapsamOgesiId_regulasyonId: { kapsamOgesiId: ko['SAHA-D-RES'].id, regulasyonId: reg['EPDK-SYM'].id } },
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
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, uretici: 'Demo Ağ Güvenliği',
    model: 'DEMO-FW-200', kritiklik: 'kritik', uretimEtkisi: 'yuksek',
    bolgeId: zonOtDmz.id, yasamDongusu: 'aktif', sahipId: k['kullanici.c'].id,
    emanetciId: k['kullanici.d'].id, eosTarihi: gun(500), yamaDurumu: 'guncel',
    izlemeDurumu: 'var', logKaynagi: 'var', internetMaruziyeti: 'yok' } });
  const varlikDcs = await db.varlik.create({ data: {
    etiket: 'SAHA-A3-DCS-01', ad: 'Türbin DCS Denetleyicisi', turId: tur['DCS'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, uretici: 'Demo Türbin Sistemleri',
    model: 'DEMO-DCS-3000', firmware: 'R8.2 SP2', kritiklik: 'kritik',
    emniyetEtkisi: 'yuksek', uretimEtkisi: 'uretim_durur', bolgeId: zonOt.id,
    sahipId: k['kullanici.c'].id, yamaDurumu: 'eksik', izlemeDurumu: 'yok',
    logKaynagi: 'yok', internetMaruziyeti: 'yok', eosTarihi: gun(900) } });
  const varlikScada = await db.varlik.create({ data: {
    etiket: 'SAHA-A3-SCADA-01', ad: 'Saha A-3 SCADA Sunucusu', turId: tur['SCADA-SRV'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, isletimSistemi: 'Demo Sunucu OS 2012',
    uretici: 'Demo Sunucu Donanımı', model: 'DEMO-SRV-740', kritiklik: 'kritik', uretimEtkisi: 'yuksek',
    bolgeId: zonOt.id, eolTarihi: gun(-800), eosTarihi: gun(-400), yamaDurumu: 'yamasiz',
    yedekDurumu: 'var', edrDurumu: 'yok', sahipId: k['kullanici.c'].id } });
  await db.varlik.create({ data: {
    etiket: 'SAHA-A3-EWS-01', ad: 'Mühendislik İstasyonu (Saha A-3)', turId: tur['EWS'].id,
    tesisId: t['SAHA-A3'].id, sistemId: sistemDcs.id, kritiklik: 'yuksek',
    isletimSistemi: 'Demo Uç OS 10 IoT', bolgeId: zonOt.id,
    yamaDurumu: 'eksik', uzaktanErisim: true, sahipId: k['kullanici.c'].id } });
  const varlikSahaC = await db.varlik.create({ data: {
    etiket: 'SAHA-C-SCADA-01', ad: 'Saha C Türbin SCADA Sunucusu', turId: tur['SCADA-SRV'].id,
    tesisId: t['SAHA-C-RES'].id, sistemId: sistemTurbin.id, uretici: 'Demo Rüzgâr Türbini',
    isletimSistemi: 'Demo Sunucu OS 2016', bolgeId: zonSahaCOt.id,
    uretimEtkisi: 'yuksek', logKaynagi: 'yok', izlemeDurumu: 'bilinmiyor',
    yamaDurumu: 'bilinmiyor' } }); // sahipsiz + kritikliği bilinmiyor: veri kalitesi örneği
  await db.varlik.create({ data: {
    etiket: 'MERKEZ-SSUNUCU-01', ad: 'Yönetişim Platformu Uygulama Sunucusu', turId: tur['SSUNUCU'].id,
    tesisId: t['MERKEZ-BT'].id, sistemId: sistemSanal.id, isletimSistemi: 'Demo Linux 24.04 LTS',
    kritiklik: 'yuksek', bolgeId: zonMerkez.id, sahipId: k['kullanici.d'].id,
    yamaDurumu: 'guncel', edrDurumu: 'var', yedekDurumu: 'var', izlemeDurumu: 'var',
    logKaynagi: 'var', internetMaruziyeti: 'sinirli', eosTarihi: gun(1400) } });
  await db.varlik.create({ data: {
    etiket: 'MERKEZ-SSUNUCU-02', ad: 'Etki Alanı Denetleyicisi', turId: tur['SSUNUCU'].id,
    tesisId: t['MERKEZ-BT'].id, sistemId: sistemSanal.id, isletimSistemi: 'Demo Sunucu OS 2022',
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
    aciklama: 'Saha A-3 SCADA sunucusu EOL/EOS geçmiş Demo Sunucu OS 2012 üzerinde; yama alamıyor. DCS ağının kurumsal ağdan ayrıştırılmamış olmasıyla (bulgu) birleşince fidye yazılımının 165 MW üretimi durdurma olasılığı yüksek.',
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
    gerekce: 'SAHA-A3-SCADA-01 EOL/EOS geçti (Demo Sunucu OS 2012); RSK-2026-001 artık riski 16/25; EPDK-SYM-4.2.1 uyumsuz. Modernizasyon üç kaydı birden kapatır.',
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
  /* ---- ikinci sektör: su ve atıksu (demo · sektör bağımsızlığının KANITI)

     Enerji verisinin kopyası değildir: kendi tipleri, kendi ölçüsü
     (m³/gün) ve kendi tesisleri var. Biri bilerek ölçümsüz — "bilinmeyen
     ≠ sıfır" ekranda görünsün diye. */
  const su = await suSektoru(db);
  /* Su sözlüğü ve öznitelik şeması (günlük debi, m³/gün) DEMO-TR-SU
     paketinden (2.5); çerçeveler DEMO-TR-ORTAK'tan paylaşılır. */
  await demoPaketiKur('DEMO-TR-SU');
  console.log(`Su sektörü: ${su.tesisSayisi} tesis · sözlük ve öznitelik şeması paketten kuruldu`);

  /* Su kiracısının uyum katmanı — maddeler ve regülasyonlar kurulduktan
     SONRA koşar (CBDDÖ ve ISO 27001 satırlarını arar). Su için ayrı bir
     mevzuat uydurulmadı: iki çerçeve de kamuya açık ve gerçekten sektör
     üstüdür. Enerjiye özgü EPDK-SYM su kapsamına GİRMEZ — gerçek bir
     düzenlemeye yanlış kapsam atfetmek, mevzuat uydurmakla aynı kusur. */
  const suUyum = await suUyumu(db);
  console.log(`Su uyumu: ${suUyum.surec} süreç · ${suUyum.kapsam} tesis kapsamda`
    + ` · ${suUyum.bulgu} bulgu (CBDDÖ + ISO 27001)`);

  /* Su kiracısının kalan ekranları: risk, olay, doküman, denetim, proje,
     tedarikçi. Boş bir ekran satışta "bu modül yok" diye okunur; sektör
     bağımsızlığı ikinci sektör de DOLU olduğunda kanıtlanır. */
  const suVeri = await suVeriSeti(db);
  console.log(`Su veri seti: ${suVeri.risk} risk · ${suVeri.olay} olay`
    + ` · ${suVeri.dokuman} doküman · ${suVeri.denetim} denetim`
    + ` · ${suVeri.proje} proje · ${suVeri.tedarikci} tedarikçi`);

  await dolulukKatmani(db);

  /* R10 · BİLDİRİM TASLAKLARINI MOTOR AÇAR — tohum ELLE YAZMAZ.
     Kayıtları buraya elle yazmak, motorun yaptığı işi taklit eden ikinci
     bir gerçek olurdu; motor bir gün değişse tohum eski davranışı
     göstermeye devam ederdi. Gerçek motor koşar ve fikstür onun çıktısını
     taşır — `paketiKur`un gerçek kurucuyu koşmasıyla aynı gerekçe. */
  /* Takvim tetikli yükümlülüklerin dönemleri de motorun kendi
     döngüsünden açılır — tohumun elle dönem yazması, motorun işini
     taklit eden ikinci bir gerçek doğururdu. */
  const donem = await acikDonemleriKur(db);
  console.log(`Bildirim dönemleri: ${donem.acilanDonem} dönem açıldı`
    + ` · ${donem.suresiGecen} süresi geçti`
    + ` · ${donem.donemsiz} yükümlülükte dönem mevzuatta belirlenmedi`
    + ` · ${donem.teslimsiz} dönemde teslim süresi yok.`);

  const bildirim = await acikOlaylarinKayitlarini(db);
  console.log(`Bildirim kayıtları: ${bildirim.acilanTaslak} taslak açıldı`
    + ` · ${bildirim.suresiGecen} süresi geçti`
    + ` · ${bildirim.suresiz} kayıtta süre mevzuatta belirlenmedi`
    + '.');

  /* ── R1 · MEVZUAT RADARI · DEMO HÂLLERİ ─────────────────────────────
     Kaynaklar DEMO-TR-ORTAK kataloğundan geldi ve KAPALI doğdu; tohum
     onları AÇMAZ (taramayı açmak insan kararıdır). Tohumun yazdığı tek
     şey, ekranın üç ayrı hâli gösterebilmesi için gereken TARAMA
     GEÇMİŞİDİR — üçü de kurgusal:

       fark yok            → bakıldı, değişiklik yok
       KARŞILAŞTIRILAMADI  → bakıldı, sonuç çıkarılamadı (farkVar NULL)
       ENGELLİ             → kaynağın kendi kararı, ürün aşmaz

     İkisi arasındaki farkın ekranda AYRI göründüğü tarayıcı kanıtıyla
     ölçülür (`npm run kanit:mevzuat-radari`). */
  const radarKaynaklari = await db.mevzuatKaynagi.findMany({
    where: { paketKodu: 'DEMO-TR-ORTAK' }, orderBy: { kod: 'asc' },
  });
  for (const kaynak of radarKaynaklari) {
    if (kaynak.kod === 'DEMO-KAYNAK-ENGELLI') {
      await db.mevzuatKaynagi.update({
        where: { id: kaynak.id },
        data: {
          durum: 'engelli', sonTarama: new Date(Date.now() - 3 * 24 * 3_600_000),
          durumNotu: 'Kaynak otomatik erişime kapalı (kurgusal). ELLE izlenir;'
            + ' ürün bu engeli aşmaz.',
        },
      });
      await db.mevzuatTaramasi.create({
        data: {
          kaynakId: kaynak.id, farkVar: null,
          sebep: 'robots.txt bu yolu kapatıyor (/)',
          zaman: new Date(Date.now() - 3 * 24 * 3_600_000),
        },
      });
      continue;
    }
    if (kaynak.kod === 'DEMO-KAYNAK-BILINMEYEN') {
      await db.mevzuatKaynagi.update({
        where: { id: kaynak.id },
        data: { durum: 'hata', durumNotu: 'RSS kökü var ama hiçbir öğe okunamadı',
          sonTarama: new Date(Date.now() - 2 * 3_600_000) },
      });
      await db.mevzuatTaramasi.create({
        data: {
          kaynakId: kaynak.id, farkVar: null, httpKodu: 200,
          sebep: 'biçim okunamadı: RSS kökü var ama hiçbir öğe okunamadı',
          zaman: new Date(Date.now() - 2 * 3_600_000),
        },
      });
      continue;
    }
    /* Sağlam kaynak: bir koşu fark buldu, iki aday karar bekliyor. */
    await db.mevzuatKaynagi.update({
      where: { id: kaynak.id },
      data: { durum: 'hazir', sonTarama: new Date(Date.now() - 6 * 3_600_000) },
    });
    await db.mevzuatTaramasi.create({
      data: { kaynakId: kaynak.id, farkVar: true, httpKodu: 200, adaySayisi: 2,
        zaman: new Date(Date.now() - 6 * 3_600_000) },
    });
    for (const [i, baslik] of [
      'Kurgusal tebliğ değişikliği — bildirim süreleri',
      'Kurgusal kurul kararı — kapsam güncellemesi',
    ].entries()) {
      await db.mevzuatDegisiklikAdayi.upsert({
        where: { kaynakId_url: { kaynakId: kaynak.id, url: `${kaynak.yayinKanali}/${i + 1}` } },
        create: {
          kaynakId: kaynak.id, url: `${kaynak.yayinKanali}/${i + 1}`, baslik,
          ozet: 'Kurgusal özet — gerçek bir mevzuat metni değildir.',
          yayinTarihi: new Date(Date.now() - (i + 1) * 24 * 3_600_000),
          bulundu: new Date(Date.now() - 6 * 3_600_000),
        },
        update: {},
      });
    }
  }
  const radarOzet = await db.mevzuatKaynagi.count();
  console.log(`Mevzuat radarı: ${radarOzet} kaynak kurulu`
    + ` · ${await db.mevzuatKaynagi.count({ where: { etkin: true } })} taraması açık`
    + ` · ${await db.mevzuatDegisiklikAdayi.count({ where: { durum: 'yeni' } })} aday karar bekliyor.`);

  /* ── R15 · KİŞİSEL VERİ KORUMA ────────────────────────────────────
     Süreler PAKETTEN gelir; tohum onları PAKET KURULUMU gibi yazar ve
     dayanağını açıkça beyan eder. `basvuru_yanit` süresi 6698 s. KVKK
     md. 13/2'nin verdiği "en geç otuz gün"dür ve TAKVİM günüdür.

     `aktarim_bildirim_standart_sozlesme` satırı BİLEREK KURULMADI:
     standart sözleşmenin Kuruma bildirim süresini veren metin bu turda
     AÇILAMADI (bkz. docs/TR_SEKTOR_PAKETLERI.md §7) ve ürün bir gün
     sayısı UYDURMAZ. Satır yokken ekran "bu dayanak için bildirim
     süresi tanımlı değil" der ve sayaç hiç çalışmaz — mekanizma
     ölçülebilir, içerik boş. */
  await db.veriKorumaSuresi.upsert({
    where: { konu: 'basvuru_yanit' },
    create: {
      konu: 'basvuru_yanit', gun: 30, isGunu: false, haftaSonuJson: null,
      dayanak: '6698 s. KVKK md. 13/2: veri sorumlusu başvuruda yer alan'
        + ' talepleri, talebin niteliğine göre en kısa sürede ve en geç'
        + ' OTUZ GÜN içinde ücretsiz olarak sonuçlandırır.',
      koken: 'paket',
    },
    update: {},
  });

  const kvkSurec = await db.isSureci.findFirst({ select: { id: true, kod: true } });
  if (kvkSurec) {
    const saklama = await db.saklamaPolitikasi.findFirst({ select: { id: true } });
    const faaliyet = await db.veriIslemeFaaliyeti.upsert({
      where: { kod: 'KVK-001' },
      create: {
        kod: 'KVK-001', ad: 'Personel özlük kayıtlarının işlenmesi',
        isSureciId: kvkSurec.id,
        amac: 'İş sözleşmesinin kurulması ve yürütülmesi',
        hukukiSebep: 'Sözleşmenin ifası',
        veriKategorileriJson: JSON.stringify(['kimlik', 'iletişim', 'özlük']),
        ilgiliKisiGruplariJson: JSON.stringify(['çalışan']),
        aliciGruplariJson: JSON.stringify(['insan kaynakları', 'muhasebe']),
        /* İlk satır DEĞERLENDİRİLDİ, ikincisi bilerek DEĞERLENDİRİLMEDİ:
           ekranın üç değerli hâli fikstürde de görünsün. */
        ozelNitelikli: false,
        saklamaPolitikasiId: saklama?.id ?? null,
      },
      update: {},
    });
    await db.veriIslemeFaaliyeti.upsert({
      where: { kod: 'KVK-002' },
      create: {
        kod: 'KVK-002', ad: 'Ziyaretçi giriş kayıtlarının işlenmesi',
        isSureciId: kvkSurec.id,
        amac: 'Tesis güvenliğinin sağlanması',
        hukukiSebep: 'Meşru menfaat',
        veriKategorileriJson: JSON.stringify(['kimlik', 'görsel kayıt']),
        ilgiliKisiGruplariJson: JSON.stringify(['ziyaretçi']),
        aliciGruplariJson: JSON.stringify([]),
        ozelNitelikli: null,
      },
      update: {},
    });

    /* İKİ AKTARIM, İKİ HÂL: biri bildirim gerektirmeyen dayanak, öbürü
       standart sözleşme ve BİLDİRİM TARİHİ GİRİLMEMİŞ — KVK-ENV-001'in
       ekranda görünen hâli. */
    const varAktarim = await db.yurtDisiAktarim.count({ where: { faaliyetId: faaliyet.id } });
    if (varAktarim === 0) {
      await db.yurtDisiAktarim.createMany({
        data: [
          {
            faaliyetId: faaliyet.id, aliciUlke: 'Kurgusalya',
            aliciAd: 'Kurgusal Bulut A.Ş.', dayanak: 'standart_sozlesme',
            bildirimTarihi: null,
            not: 'Kurgusal kayıt — bildirim tarihi bilerek boş bırakıldı.',
          },
          {
            faaliyetId: faaliyet.id, aliciUlke: 'Kurgusalistan',
            aliciAd: 'Kurgusal Destek Ltd.', dayanak: 'yeterlilik',
            bildirimTarihi: null,
          },
        ],
      });
    }
  }

  /* ÜÇ BAŞVURU: yeni (süresi işliyor) · süresi geçmek üzere · karara
     bağlanmış. Motor koşusu bunlardan geçeni işaretler. */
  const kvkBasvurular = [
    { kod: 'VSB-001', gunOnce: 3, konu: 'bilgi_talebi', durum: 'yeni' },
    { kod: 'VSB-002', gunOnce: 45, konu: 'silme', durum: 'yeni' },
    { kod: 'VSB-003', gunOnce: 60, konu: 'duzeltme', durum: 'yanitlandi' },
  ];
  for (const b of kvkBasvurular) {
    await db.veriSahibiBasvurusu.upsert({
      where: { kod: b.kod },
      create: {
        kod: b.kod, konu: b.konu, durum: b.durum,
        alinma: new Date(Date.now() - b.gunOnce * 24 * 3_600_000),
        kanal: 'Kurgusal kanal — adres değil, not',
        ozet: 'Kurgusal başvuru özeti — gerçek bir kişi ya da talep değildir.',
        yanitMetni: b.durum === 'yanitlandi'
          ? 'Kurgusal yanıt metni — ölçüm fikstürü.' : null,
      },
      update: {},
    });
  }

  /* SİCİL KAYDI: yükümlülük DEĞERLENDİRİLMEDİ hâliyle kurulur — ekranın
     "bilinmeyen ≠ hayır" cümlesi fikstürde de görünsün. Sicilin adı
     PAKETTEN gelir; tohum TR kiracısı için VERBİS yazar. */
  if ((await db.sicilKaydi.count()) === 0) {
    await db.sicilKaydi.create({
      data: {
        sicilAd: 'VERBİS', yukumluMu: null,
        dayanak: '6698 s. KVKK md. 16: kişisel veri işleyen gerçek ve tüzel'
          + ' kişiler, veri işlemeye başlamadan önce Veri Sorumluları Siciline'
          + ' kaydolmak zorundadır (Kurulca istisna tanınanlar hariç).',
      },
    });
  }
  console.log(`Kişisel veri koruma: ${await db.veriIslemeFaaliyeti.count()} işleme faaliyeti`
    + ` · ${await db.yurtDisiAktarim.count()} aktarım`
    + ` · ${await db.veriSahibiBasvurusu.count()} başvuru.`);

  console.log('Seed tamam. Geliştirme girişi: kullanici.a@demo.local / ' + GELISTIRME_PAROLASI);
}

main().finally(() => db.$disconnect());
