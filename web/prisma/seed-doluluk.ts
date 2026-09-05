/* ═══════════════════════════════════════════════════════════════════════
   DOLULUK KATMANI — kodun okuduğu ama seed'in hiç yazmadığı tablolar.

   Ölçüm (2026-09-02): 98 tablonun 23'ü tamamen boştu. Hepsi ekran ya da
   kütüphane kodunda OKUNUYORDU — yani ölü model değil, eksik veri. Boş
   tablo ekranı sessizce yalanlar: `/kanitlar` kapsam sütunu "bilinmiyor"
   der çünkü `KanitTesis` boştur, `/saglik/reddedilenler` "her şey yolunda"
   der çünkü hiç red kaydı yoktur.

   ═══ İKİ SINIR ════════════════════════════════════════════════════════

   1 · KÖKEN DÜRÜSTLÜĞÜ. Connector'ların hepsi `kimlik_bekleniyor`
       durumunda — ürün hiçbir kurum sistemine BAĞLANMADI. Bu yüzden
       buradaki türetilmiş kayıtların kökeni CANLI AKIŞ DEĞİL, elle
       aktarım ya da elle dışa aktarım dosyasıdır (`IMP-01`, `VULN-01`
       zaten "elle dışa aktarım" diyor). Kaydı "connector'dan aktı" diye
       yazmak, ürünün ekranda söylediği şeyi yalanlardı.

   2 · EKSİKSİZ DEĞİL. Her tabloyu tamamen yeşil doldurmak ekranların ne
       işe yaradığını gizler. Bu yüzden bilerek: eşleşmeyen keşif kaydı,
       reddedilmiş aktarım, doğrulanmamış köken, kayıt dışı tedarikçi
       oturumu, karara bağlanmamış topoloji sapması bırakıldı.

   DETERMİNİSTİK: `Math.random` YOK. Görsel regresyon altınları ve testler
   seed'in her koşuda aynı çıktısına dayanıyor; rastgelelik onları bozar.
   ═══════════════════════════════════════════════════════════════════════ */

import type { PrismaClient } from '../lib/prisma-client/client';

const GUN = 86_400_000;
const gunOnce = (n: number) => new Date(Date.now() - n * GUN);
const saatOnce = (n: number) => new Date(Date.now() - n * 3_600_000);

/** Sabit tohumlu üreteç — aynı sırayla çağrıldığında aynı diziyi verir. */
function uretec(tohum: number) {
  let s = tohum >>> 0;
  return {
    /** [0, n) aralığında tam sayı. */
    tam(n: number) {
      s = (s * 1_664_525 + 1_013_904_223) >>> 0;
      return s % n;
    },
    /** Diziden deterministik seçim. */
    sec<T>(d: readonly T[]): T {
      return d[this.tam(d.length)];
    },
    /** n olasılıkla true (yüzde). */
    sans(yuzde: number) {
      return this.tam(100) < yuzde;
    },
  };
}

export async function dolulukKatmani(db: PrismaClient) {
  const r = uretec(20260902);

  /* ── ortak okumalar ───────────────────────────────────────────────── */
  const [kullanicilar, tesisler, varliklar, connectorlar, kosular] = await Promise.all([
    db.kullanici.findMany({ select: { id: true, eposta: true }, orderBy: { eposta: 'asc' } }),
    db.tesis.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
    db.varlik.findMany({
      select: {
        id: true, etiket: true, ad: true, tesisId: true, tedarikciId: true, sozlesmeId: true,
        tur: { select: { kod: true } },
      },
      orderBy: { etiket: 'asc' },
    }),
    db.connector.findMany({ select: { id: true, kod: true, tip: true }, orderBy: { kod: 'asc' } }),
    db.entegrasyonKosusu.findMany({
      select: { id: true, connectorId: true, baslangic: true },
      orderBy: { baslangic: 'desc' }, take: 20,
    }),
  ]);

  const kul = (e: string) => kullanicilar.find((k) => k.eposta.startsWith(e))?.id ?? null;
  const ahmet = kul('ahmet.terzi');
  const selin = kul('selin.aydin');
  const burak = kul('burak.sahin');
  const mehmet = kul('mehmet.kaya');
  const zeynep = kul('zeynep.arslan');
  const con = (kod: string) => connectorlar.find((c) => c.kod === kod)?.id ?? null;

  if (kullanicilar.length === 0 || tesisler.length === 0) {
    console.log('doluluk: temel seed yok, atlandı.');
    return;
  }

  await eslemeProfilleri(db, { con, ahmet, burak });
  await kesifKayitlari(db, r, { con, tesisler, varliklar, selin, burak });
  await reddedilenler(db, { con, kosular, selin, burak });
  await veriKokenleri(db, r, { varliklar, ahmet, selin });
  await konfigYedekleri(db, r, { varliklar });
  await varlikAktarimlari(db, { ahmet, burak, mehmet });
  await apiKatmani(db, r, { ahmet, burak });
  await olayEtkiZinciri(db);
  await tedarikciOturumlari(db, r, { tesisler });
  await topolojiTemeli(db, r, { tesisler, ahmet, burak });
  await degerlendirmeTarihcesi(db, r, { ahmet, selin, zeynep });
  await kanitKapsami(db, r, { varliklar });
  await lisanslar(db);
  await surumFarklari(db);

  const [kesif, koken, red, sapma, istek] = await Promise.all([
    db.kesifKaydi.count(), db.veriKokeni.count(), db.reddedilenKayit.count(),
    db.topolojiSapmasi.count(), db.apiIstegi.count(),
  ]);
  console.log(
    `Doluluk: ${kesif} keşif · ${koken} köken (hiçbiri doğrulanmadı — koşu bağlamı yok) · `
    + `${red} red kaydı · ${sapma} topoloji sapması · ${istek} API isteği`);
}

/* ══════════════════════════════════════════════════════════════════════
   1 · EŞLEME PROFİLLERİ · /esleme
   Bir profil iki sürümlü: v1 yürürlükten kalktı, v2 etkin. Ekranın asıl
   sorusu "hangi alan hangi alana çevriliyor ve kim onayladı".
   ══════════════════════════════════════════════════════════════════════ */
async function eslemeProfilleri(
  db: PrismaClient,
  o: { con: (k: string) => string | null; ahmet: string | null; burak: string | null },
) {
  if (await db.eslemeProfili.count() > 0) return;

  /* Kural biçimi `lib/entegrasyon/esleme.ts` sözleşmesidir: DÜZ DİZİ,
     `hedefAlan` HEDEF_ALANLAR sözlüğünden. Ekran bozuk profili sessizce
     düşürmüyor, "okunamadı" diye yazıyor — o yüzden burada doğrulamadan
     geçecek kurallar yazılır, yoksa kütük ekranda hata olarak görünür. */
  /* Kaynak alan adları ürünün İÇE AKTARIM ŞABLONUNUN kolon başlıklarıdır
     ("Asset Tag", "Site Code" …) — `tests/fixture/elleAktarim.ts` ile aynı
     küme. Uydurulmuş kolon adları yazmak, yayımlanmış profilin adaptörün
     gömülü eşlemesini geçersiz kılması yüzünden HİÇBİR kaydın geçmemesine
     yol açardı; sertifikasyon bunu yakalar ve haklıdır.

     `manual_import` tipinde ETKİN profil yalnız bir tane olmalıdır: koşu
     tipin etkin profilini seçer, iki etkin profil belirsizlik demektir. */
  const profiller = [
    {
      kod: 'CMDB_VARLIK', ad: 'CMDB varlık aktarımı', connectorTipi: 'manual_import',
      surum: 1, durum: 'arsiv', olusturanId: o.burak,
      aciklama: 'İlk sürüm; ağ ve ömür alanları taşınmıyordu, yalnız kimlik yazılıyordu.',
      kurallar: [
        { kaynakAlan: 'Asset Tag', hedefAlan: 'etiket', zorunlu: true },
        { kaynakAlan: 'Hostname', hedefAlan: 'hostname' },
        { kaynakAlan: 'Site Code', hedefAlan: 'tesisKodu' },
        { kaynakAlan: 'Device Type', hedefAlan: 'turKodu' },
      ],
    },
    {
      kod: 'CMDB_VARLIK', ad: 'CMDB varlık aktarımı', connectorTipi: 'manual_import',
      surum: 2, durum: 'etkin', olusturanId: o.ahmet,
      aciklama: 'Ağ, üretici ve yazılım alanları eklendi; santral kodu zorunlu ve '
        + 'büyük harfe çevriliyor, MAC/IP biçimi normalleştiriliyor.',
      kurallar: [
        { kaynakAlan: 'Asset Tag', hedefAlan: 'etiket', zorunlu: true, donusum: 'kirp',
          guvenKurali: { agirlik: 0.3 } },
        { kaynakAlan: 'Hostname', hedefAlan: 'hostname', donusum: 'kirp' },
        { kaynakAlan: 'Serial Number', hedefAlan: 'seriNo', donusum: 'kirp' },
        { kaynakAlan: 'MAC Address', hedefAlan: 'macAdresi', donusum: 'mac',
          guvenKurali: { agirlik: 0.2 } },
        { kaynakAlan: 'IP Address', hedefAlan: 'ipAdresi', donusum: 'ip' },
        { kaynakAlan: 'Vendor', hedefAlan: 'uretici' },
        { kaynakAlan: 'Model', hedefAlan: 'model' },
        { kaynakAlan: 'OS', hedefAlan: 'isletimSistemi' },
        { kaynakAlan: 'Firmware Version', hedefAlan: 'firmware' },
        { kaynakAlan: 'Site Code', hedefAlan: 'tesisKodu', zorunlu: true, donusum: 'buyukHarf',
          guvenKurali: { agirlik: 0.3, eksikCezasi: 0.5 } },
        { kaynakAlan: 'Zone', hedefAlan: 'bolgeKodu' },
        { kaynakAlan: 'Device Type', hedefAlan: 'turKodu',
          guvenKurali: { agirlik: 0.2 } },
      ],
    },
    {
      kod: 'OT_KESIF', ad: 'OT pasif keşif dışa aktarımı', connectorTipi: 'ot_discovery',
      surum: 1, durum: 'taslak', olusturanId: o.burak,
      aciklama: 'Taslak: PLC tür sözlüğü üreticiye göre değişiyor ve tamamlanmadı — '
        + 'yayımlanmadan koşuya alınamaz.',
      kurallar: [
        { kaynakAlan: 'MAC Address', hedefAlan: 'macAdresi', donusum: 'mac', zorunlu: true },
        { kaynakAlan: 'IP Address', hedefAlan: 'ipAdresi', donusum: 'ip' },
        { kaynakAlan: 'Vendor', hedefAlan: 'uretici' },
        { kaynakAlan: 'Device Type', hedefAlan: 'turKodu' },
        { kaynakAlan: 'Zone', hedefAlan: 'bolgeKodu' },
        { kaynakAlan: 'Firmware Version', hedefAlan: 'firmware' },
      ],
    },
    {
      kod: 'OMUR_DISA', ad: 'Ömür ve destek tarihleri dışa aktarımı',
      connectorTipi: 'manual_import',
      surum: 1, durum: 'taslak', olusturanId: o.ahmet,
      aciklama: 'Üretici ömür bildirimlerinin elle derlenmiş listesi. Taslak: '
        + 'aynı tipte ikinci bir ETKİN profil koşuda belirsizlik yaratırdı, '
        + 'ayrı bir connector tanımı bekliyor.',
      kurallar: [
        { kaynakAlan: 'Asset Tag', hedefAlan: 'etiket', zorunlu: true },
        { kaynakAlan: 'EOL Date', hedefAlan: 'eolTarihi', donusum: 'tarih' },
        { kaynakAlan: 'EOS Date', hedefAlan: 'eosTarihi', donusum: 'tarih' },
        { kaynakAlan: 'Support End', hedefAlan: 'destekBitis', donusum: 'tarih' },
      ],
    },
  ];

  for (const p of profiller) {
    const { kurallar, ...kalan } = p;
    const kayit = await db.eslemeProfili.create({
      data: { ...kalan, kurallarJson: JSON.stringify(kurallar) },
    });
    /* Etkin profil connector'a bağlanır; taslak bağlanmaz — bağlı taslak
       "kullanılıyor" sanılırdı. */
    if (p.durum === 'etkin' && p.kod === 'CMDB_VARLIK') {
      const cid = o.con('IMP-01');
      if (cid) await db.connector.update({ where: { id: cid }, data: { eslemeProfilId: kayit.id } });
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   2 · KEŞİF KAYITLARI · /kesif · /envanter
   Keşif, envanterin "bunu tanımıyorum" kuyruğudur. Üç hâl ayrı durur:
   eşleşen · eşleşmeyen · çakışan (aynı anahtar iki varlığa gidiyor).
   ══════════════════════════════════════════════════════════════════════ */
async function kesifKayitlari(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: {
    con: (k: string) => string | null;
    tesisler: { id: string; kod: string }[];
    varliklar: { id: string; etiket: string; ad: string; tesisId: string | null; tur: { kod: string } | null }[];
    selin: string | null; burak: string | null;
  },
) {
  if (await db.kesifKaydi.count() > 0) return;

  const otCon = o.con('OT-01');
  const impCon = o.con('IMP-01');
  const KAYNAK_OT = 'OT pasif keşif dışa aktarımı';
  const KAYNAK_CMDB = 'CMDB elle içe aktarım';
  const otVarliklar = o.varliklar.filter(
    (v) => v.tur && ['PLC', 'HMI', 'EWS', 'SCADA-SRV', 'DCS', 'AGCIHAZ'].includes(v.tur.kod));

  /* `normalJson` biçimi `lib/entegrasyon/kesif.ts` sözleşmesidir:
     { tip, gozlem, koken, eslesme }. Ekran satır başlığını `gozlem`den
     türetir (hostname → etiket → seri → mac → ip) ve çakışmayı
     `eslesme.cakisma`dan okur; gövdeyi uydurmak, ekranın kaynak kayıt
     kimliğini iki kez yazmasına yol açardı. */
  const govde = (ek: Record<string, string | null>) => ({
    etiket: null, hostname: null, seriNo: null, macAdresi: null, ipAdresi: null,
    uretici: null, model: null, isletimSistemi: null, firmware: null,
    tesisKodu: null, bolgeKodu: null, turKodu: null, ...ek,
  });
  const koken = (kaynakSistem: string, kaynakKayitId: string, guven: number | null, gun: number) => ({
    kaynakSistem, kaynakKayitId, toplanma: gunOnce(gun).toISOString(), guven,
  });

  type Yeni = Parameters<typeof db.kesifKaydi.create>[0]['data'];
  const kayitlar: Yeni[] = [];

  /* a · Eşleşenler: keşif envanteri doğruluyor, karar gerekmiyor. */
  for (let i = 0; i < 11 && i < otVarliklar.length; i++) {
    const v = otVarliklar[i];
    const m = mac(r);
    const adres = ip(r);
    const kayitId = `OTX-${String(4100 + i)}`;
    kayitlar.push({
      connectorId: otCon, kaynak: KAYNAK_OT, kaynakKayitId: kayitId,
      tesisId: v.tesisId, eslesenVarlikId: v.id, eslesmeAnahtari: 'macAdresi',
      guvenSkoru: 0.92 + (i % 6) / 100,
      durum: 'eslesti',
      hamJson: JSON.stringify({ mac: m, ip: adres, name: v.ad, vendor: uretici(r) }),
      normalJson: JSON.stringify({
        tip: 'varlik',
        gozlem: govde({ hostname: v.ad, etiket: v.etiket, macAdresi: m, ipAdresi: adres }),
        koken: koken(KAYNAK_OT, kayitId, 0.9, 1),
        eslesme: {
          durum: 'eslesti', eslesenVarlikId: v.id, eslesmeAnahtari: 'macAdresi',
          guvenSkoru: 0.92, cakisma: false,
          gerekce: 'MAC adresi envanterdeki tek kayıtla eşleşti.', adaylar: [],
        },
      }),
      ilkGorulme: gunOnce(46 - i), sonGorulme: gunOnce(1),
    });
  }

  /* b · Eşleşmeyenler — envanterde karşılığı yok. Ekranın asıl işi bu. */
  const yabancilar: [string, string, string, string, string][] = [
    ['Rockwell', 'PLC', 'KIZILDERE-3', 'PLC-SAHA-07', 'Türbin sahasında etiketsiz denetleyici'],
    ['Siemens', 'HMI', 'KIZILDERE-3', 'HMI-OPR-03', 'Operatör panosu — CMDB kaydı yok'],
    ['Moxa', 'AGCIHAZ', 'GOKCEDAG-RES', 'GW-SERI-02', 'Seri-Ethernet dönüştürücü'],
    ['Hirschmann', 'AGCIHAZ', 'GOKCEDAG-RES', 'SW-DOLAP-11', 'Yönetilmeyen anahtar, saha dolabı'],
    ['Advantech', 'EWS', 'ALASEHIR-JES', 'EWS-TASINIR-01', 'Taşınabilir mühendislik dizüstü'],
    ['Schneider', 'PLC', 'ALASEHIR-JES', 'PLC-YRD-04', 'Yardımcı tesis denetleyicisi'],
    ['Dell', 'SSUNUCU', 'KIZILDERE-1', 'SRV-TARIH-01', 'Yerel tarih sunucusu — sahibi belirsiz'],
  ];
  yabancilar.forEach(([vendor, tip, tesisKodu, hostname, not], i) => {
    const m = mac(r);
    const adres = ip(r);
    const kayitId = `OTX-${String(4300 + i)}`;
    const normalize = i >= 4;
    kayitlar.push({
      connectorId: otCon, kaynak: KAYNAK_OT, kaynakKayitId: kayitId,
      tesisId: o.tesisler.find((t) => t.kod === tesisKodu)?.id ?? null,
      durum: normalize ? 'normalize' : 'kesfedildi',
      guvenSkoru: null,
      hamJson: JSON.stringify({ mac: m, ip: adres, vendor, device_type: tip, name: hostname, note: not }),
      /* Normalize edilmemiş kayıtta gövde YOKTUR: ekran onu "henüz
         normalleşmedi" diye gösterir, boş bir gövde uydurulmaz. */
      normalJson: normalize ? JSON.stringify({
        tip: 'varlik',
        gozlem: govde({ hostname, macAdresi: m, ipAdresi: adres, uretici: vendor, turKodu: tip, tesisKodu }),
        koken: koken(KAYNAK_OT, kayitId, null, 2),
        eslesme: {
          durum: 'eslesmedi', eslesenVarlikId: null, eslesmeAnahtari: null,
          guvenSkoru: null, cakisma: false,
          gerekce: 'Hiçbir anahtar envanterde karşılık bulmadı.', adaylar: [],
        },
      }) : null,
      ilkGorulme: gunOnce(23 - i * 2), sonGorulme: gunOnce(1),
    });
  });

  /* c · Çakışma: aynı anahtar iki varlığa işaret ediyor — karar insana
     aittir, ürün kendiliğinden birini seçmez. */
  for (let i = 0; i < 3 && i + 1 < otVarliklar.length; i++) {
    const a = otVarliklar[otVarliklar.length - 1 - i];
    const b = otVarliklar[otVarliklar.length - 2 - i];
    const adres = ip(r);
    const kayitId = `OTX-${String(4500 + i)}`;
    const aday = (v: typeof a) => ({
      varlikId: v.id, etiket: v.etiket, ad: v.ad, tesisId: v.tesisId,
      anahtarlar: ['ipAdresi'], guven: 0.41,
    });
    kayitlar.push({
      connectorId: otCon, kaynak: KAYNAK_OT, kaynakKayitId: kayitId,
      tesisId: a.tesisId, eslesenVarlikId: null, eslesmeAnahtari: 'ipAdresi',
      guvenSkoru: 0.41,
      durum: 'inceleme_bekliyor',
      hamJson: JSON.stringify({ ip: adres, name: `NODE-${4500 + i}` }),
      normalJson: JSON.stringify({
        tip: 'varlik',
        gozlem: govde({ hostname: `NODE-${4500 + i}`, ipAdresi: adres }),
        koken: koken(KAYNAK_OT, kayitId, 0.4, 4),
        eslesme: {
          durum: 'cakisma', eslesenVarlikId: null, eslesmeAnahtari: 'ipAdresi',
          guvenSkoru: 0.41, cakisma: true,
          gerekce: 'Aynı IP adresi envanterde iki varlığa kayıtlı; hangisi olduğu belirsiz.',
          adaylar: [aday(a), aday(b)],
        },
      }),
      ilkGorulme: gunOnce(9), sonGorulme: gunOnce(1),
    });
  }

  /* d · Karara bağlanmışlar — kuyruk temizlenebiliyor, ekran bunu göstermeli. */
  /* Karar sözcükleri `kesif/mantik.ts` sözlüğünden: onaylandi · reddedildi
     · yinelenen. Bunların dışındaki bir sözcük ekranda "bekleyen" sayılır
     ve karara bağlanmış kayıt kuyrukta görünmeye devam ederdi. */
  const kararlar: [string, string, string | null, string][] = [
    ['onaylandi', 'Envantere yeni varlık olarak eklendi.', o.burak, 'SRV-YENI-01'],
    ['onaylandi', 'Yedek parça havuzundan sahaya alınmış; kayıt açıldı.', o.burak, 'PLC-YEDEK-02'],
    ['reddedildi', 'Müteahhit dizüstü bilgisayarı; kurum varlığı değil.', o.selin, 'LAPTOP-MTH-4'],
    ['reddedildi', 'Test sırasında geçici bağlanan analiz cihazı.', o.selin, 'ANALIZ-GECICI'],
    ['yinelenen', 'Mevcut PLC kaydının ikinci ağ arayüzü.', o.burak, 'PLC-SAHA-02-B'],
  ];
  kararlar.forEach(([durum, not, kim, hostname], i) => {
    const kayitId = `OTX-${String(4700 + i)}`;
    const kaynak = i % 2 === 0 ? KAYNAK_OT : KAYNAK_CMDB;
    const adres = ip(r);
    kayitlar.push({
      connectorId: i % 2 === 0 ? otCon : impCon,
      kaynak, kaynakKayitId: kayitId,
      tesisId: o.tesisler[i % o.tesisler.length].id,
      durum, inceleyenId: kim, incelemeNotu: not, incelemeZamani: gunOnce(12 - i * 2),
      guvenSkoru: 0.77,
      hamJson: JSON.stringify({ vendor: uretici(r), ip: adres, name: hostname }),
      normalJson: JSON.stringify({
        tip: 'varlik',
        gozlem: govde({ hostname, ipAdresi: adres }),
        koken: koken(kaynak, kayitId, 0.77, 14),
        eslesme: {
          durum, eslesenVarlikId: null, eslesmeAnahtari: null,
          guvenSkoru: 0.77, cakisma: false, gerekce: not, adaylar: [],
        },
      }),
      ilkGorulme: gunOnce(38 - i), sonGorulme: gunOnce(12 - i * 2),
    });
  });

  /* e · Kaybolan: 30 günden uzun süredir görülmüyor (ekranın "görünmez"
     eşiği). Cihazın sökülmüş olması da mümkün, ağdan düşmüş olması da —
     ikisi ayrı iş; ekran karar vermez, gösterir. */
  for (let i = 0; i < 2; i++) {
    const kayitId = `OTX-${String(4900 + i)}`;
    const m = mac(r);
    kayitlar.push({
      connectorId: otCon, kaynak: KAYNAK_OT, kaynakKayitId: kayitId,
      tesisId: o.tesisler[i].id, durum: 'kesfedildi',
      hamJson: JSON.stringify({ mac: m, vendor: uretici(r), name: `SAHA-ESKI-${i + 1}` }),
      normalJson: JSON.stringify({
        tip: 'varlik',
        gozlem: govde({ hostname: `SAHA-ESKI-${i + 1}`, macAdresi: m }),
        koken: koken(KAYNAK_OT, kayitId, null, 52 + i * 9),
        eslesme: null,
      }),
      ilkGorulme: gunOnce(120), sonGorulme: gunOnce(52 + i * 9),
    });
  }

  for (const k of kayitlar) await db.kesifKaydi.create({ data: k });
}

const OKTET = [10, 172, 192];
function ip(r: ReturnType<typeof uretec>) {
  return `${r.sec(OKTET)}.${r.tam(250)}.${r.tam(250)}.${r.tam(250)}`;
}
function mac(r: ReturnType<typeof uretec>) {
  return Array.from({ length: 6 }, () => r.tam(256).toString(16).padStart(2, '0')).join(':');
}
const URETICILER = ['Siemens', 'Rockwell', 'Schneider', 'ABB', 'Moxa', 'Hirschmann', 'Advantech'];
function uretici(r: ReturnType<typeof uretec>) { return r.sec(URETICILER); }

/* ══════════════════════════════════════════════════════════════════════
   3 · REDDEDİLEN KAYITLAR (dead-letter) · /saglik/reddedilenler
   Yedi aşamanın hepsinden örnek var: ekran "hangi aşamada tıkanıyoruz"
   sorusunu yanıtlıyor, "kaç kayıt düştü" sorusunu değil.
   ══════════════════════════════════════════════════════════════════════ */
async function reddedilenler(
  db: PrismaClient,
  o: {
    con: (k: string) => string | null;
    kosular: { id: string; connectorId: string | null }[];
    selin: string | null; burak: string | null;
  },
) {
  if (await db.reddedilenKayit.count() > 0) return;

  const tanimlar: [string, string, string, string][] = [
    ['esleme', 'CMDB elle içe aktarım', 'criticality="Business Critical" sözlükte yok', 'acik'],
    ['esleme', 'CMDB elle içe aktarım', 'criticality="BC" sözlükte yok', 'acik'],
    ['esleme', 'CMDB elle içe aktarım', 'type="Virtual Machine (Linux)" tür koduna çevrilemedi', 'acik'],
    ['eslesme', 'CMDB elle içe aktarım', 'asset_tag=SRV-ARV-0142 envanterde bulunamadı', 'acik'],
    ['eslesme', 'CMDB elle içe aktarım', 'asset_tag=SRV-ARV-0143 envanterde bulunamadı', 'acik'],
    ['dogrulama', 'Zafiyet tarama dışa aktarımı', 'cvss_base boş — köken kaydı üretilemez', 'acik'],
    ['dogrulama', 'Zafiyet tarama dışa aktarımı', 'host alanı hem IP hem ad içeriyor, ayrıştırılamadı', 'acik'],
    ['kapsam', 'CMDB elle içe aktarım', 'Kayıt ROTOR-RES santraline ait; bu aktarımın yazma kapsamı dışında', 'acik'],
    ['kapsam', 'CMDB elle içe aktarım', 'Kayıt ROTOR-RES santraline ait; bu aktarımın yazma kapsamı dışında', 'acik'],
    ['sema', 'OT pasif keşif dışa aktarımı', 'Beklenen "devices" dizisi yok; dosya tek nesne', 'acik'],
    ['normalize', 'OT pasif keşif dışa aktarımı', 'mac alanı "-" ayraçlı, tanınmadı', 'acik'],
    ['yazma', 'CMDB elle içe aktarım', 'etiket benzersizlik kısıtı ihlali (SRV-KZD-0007)', 'acik'],
    ['esleme', 'CMDB elle içe aktarım', 'site="Kizildere 3" santral koduna çevrilemedi', 'duzeltildi'],
    ['eslesme', 'Zafiyet tarama dışa aktarımı', 'host=10.42.7.19 karşılığı envantere eklendi', 'duzeltildi'],
    ['dogrulama', 'CMDB elle içe aktarım', 'Eksik köken alanı; profil v2 ile giderildi', 'duzeltildi'],
    ['kapsam', 'OT pasif keşif dışa aktarımı', 'Kapsam genişletildi, kayıt yeniden işlendi', 'duzeltildi'],
    ['sema', 'Zafiyet tarama dışa aktarımı', 'Rapor biçimi değişmiş; profil güncellendi', 'yok_sayildi'],
    ['normalize', 'OT pasif keşif dışa aktarımı', 'Tarih biçimi kaynakta düzeltilecek', 'incelendi'],
    ['yazma', 'CMDB elle içe aktarım', 'Etiket çakışması kaynak sistemde çözülecek', 'incelendi'],
  ];

  /* Durum sözcükleri `reddedilenler/mantik.ts` sözlüğünden alınır:
     acik · incelendi · yok_sayildi · duzeltildi. Uydurulan bir sözcük
     ekranın sayaçlarına hiç girmez ve kayıt sessizce "açık" görünür. */
  const notlar: Record<string, string> = {
    duzeltildi: 'Kaynak veri düzeltildi ve kayıt yeniden işlendi.',
    yok_sayildi: 'Kaynak biçimi değişti; bu kayıt yeniden işlenmeyecek.',
    incelendi: 'Bakıldı; düzeltme kaynak sistemin sahibinde, bizde iş yok.',
  };

  for (let i = 0; i < tanimlar.length; i++) {
    const [asama, kaynakSistem, sebep, durum] = tanimlar[i];
    const kosu = o.kosular[i % Math.max(o.kosular.length, 1)] ?? null;
    await db.reddedilenKayit.create({
      data: {
        kosuId: kosu?.id ?? null,
        connectorId: kosu?.connectorId ?? o.con('IMP-01'),
        kaynakSistem, kaynakKayitId: `SRC-${String(9000 + i)}`,
        asama, sebep, durum,
        hamJson: JSON.stringify({ satir: 120 + i * 7, alanlar: { asama, kaynak: kaynakSistem } }),
        inceleyenId: durum === 'acik' ? null : (i % 2 === 0 ? o.burak : o.selin),
        incelemeNotu: durum === 'acik' ? null : notlar[durum],
        incelemeZamani: durum === 'acik' ? null : gunOnce(4 + i),
        olusturuldu: gunOnce(2 + i * 2),
      },
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   4 · VERİ KÖKENİ · /raporlar/kanit-paketi
   Denetçinin ilk sorusu: "bu sayı nereden geldi ve kim doğruladı?"
   Köken kaydı olmayan alan, denetimde savunulamaz. Bilerek bir kısmı
   `dogrulanmadi` — köken VAR olması doğrulanmış olması demek değildir.
   ══════════════════════════════════════════════════════════════════════ */
async function veriKokenleri(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: {
    varliklar: { id: string; etiket: string }[];
    ahmet: string | null; selin: string | null;
  },
) {
  if (await db.veriKokeni.count() > 0) return;

  const [zafiyetler, yedekKosulari, atamalar] = await Promise.all([
    db.zafiyet.findMany({ select: { id: true, kaynakRef: true }, take: 10 }),
    db.yedeklemeKosusu.findMany({ select: { id: true }, orderBy: { zaman: 'desc' }, take: 24 }),
    db.erisimAtamasi.findMany({ select: { id: true }, take: 30 }),
  ]);

  type Satir = {
    varlikTipi: string; varlikId: string; kokenTipi: string;
    kaynakSistem: string; kaynakKayitId: string;
  };
  const satirlar: Satir[] = [];

  /* Varlıklar: CMDB elle içe aktarımdan. */
  o.varliklar.slice(0, 120).forEach((v) => satirlar.push({
    varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'elle_aktarim',
    kaynakSistem: 'CMDB elle içe aktarım', kaynakKayitId: `CMDB-${v.etiket}`,
  }));
  /* Zafiyetler: tarayıcı raporunun elle dışa aktarımı. */
  zafiyetler.forEach((z, i) => satirlar.push({
    varlikTipi: 'Zafiyet', varlikId: z.id, kokenTipi: 'dosya',
    kaynakSistem: 'Zafiyet tarama dışa aktarımı', kaynakKayitId: z.kaynakRef ?? `VLN-${i}`,
  }));
  /* Yedekleme koşuları: platform raporu, elle. */
  yedekKosulari.forEach((y, i) => satirlar.push({
    varlikTipi: 'YedeklemeKosusu', varlikId: y.id, kokenTipi: 'dosya',
    kaynakSistem: 'Yedekleme platformu raporu', kaynakKayitId: `BKP-${String(7000 + i)}`,
  }));
  /* Erişim atamaları: dizin dışa aktarımı. */
  atamalar.forEach((a, i) => satirlar.push({
    varlikTipi: 'ErisimAtamasi', varlikId: a.id, kokenTipi: 'dosya',
    kaynakSistem: 'Dizin dışa aktarımı', kaynakKayitId: `IDN-${String(3000 + i)}`,
  }));

  /* ═══ HİÇBİR KÖKEN "DOĞRULANDI" DEĞİLDİR ══════════════════════════
     Bu bilinçli ve iki ayrı kural onu birlikte zorunlu kılıyor:

     1. Veri kalitesi motorunun `kokensiz_dogrulama` kuralı, doğrulanmış
        bir kökenin HANGİ KOŞUDAN geldiğini bilmeyi şart koşar — haklı
        olarak: denetlenemeyen bir doğrulama, doğrulanmamıştan kötüdür,
        çünkü yanlış güven verir.
     2. Koşu bağlamı yaratmak, koşuyu bir connector'a bağlamak demektir;
        o da bağlanmamış bir connector'ı ekranda "başarılı" göstermek
        demektir. `entegrasyon-saglik` testi tam olarak bunu yasaklar ve
        o da haklı: hiçbir kurum sistemine bağlanmadık.

     İkisi birlikte tek doğru sonucu verir: köken kayıtları VARDIR
     (dosya elle yüklendi, kaydı tutuldu) ama hiçbiri doğrulanmamıştır.
     Ekranın "doğrulanmamış köken" sayacının dolu olması bir eksiklik
     değil, bugünkü gerçeğin ta kendisidir. */
  for (const s of satirlar) {
    /* Şüpheli ≠ doğrulanmamış: şüpheli, bakılmış ve tutarsızlık görülmüş
       demektir; doğrulanmamış, henüz bakılmamış demektir. */
    const supheli = r.sans(9);
    await db.veriKokeni.create({
      data: {
        ...s,
        toplanma: gunOnce(r.tam(60) + 2),
        aktarim: gunOnce(r.tam(50) + 1),
        /* Güven eşleme profilinin güven kurallarından türeyen bir ölçüdür;
           hiç ölçülmediyse null kalır, 0 yazmak "ölçtük, sıfır çıktı"
           demek olurdu. */
        guven: r.sans(72) ? 0.55 + r.tam(40) / 100 : null,
        dogrulamaDurumu: supheli ? 'supheli' : 'dogrulanmadi',
        eslemeProfilSurumu: s.kaynakSistem.startsWith('CMDB') ? 2 : 1,
        kayitOzeti: `${s.kaynakSistem} · ${s.kaynakKayitId}`,
      },
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   5 · KONFİGÜRASYON YEDEKLERİ · /envanter
   "Cihazın yapılandırması yedekli mi" — OT'de geri dönüşün ön koşulu.
   Bir kısmı hiç yedeklenmemiş bırakıldı: ekranın işi o boşluğu söylemek.
   ══════════════════════════════════════════════════════════════════════ */
async function konfigYedekleri(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: { varliklar: { id: string; etiket: string; tur: { kod: string } | null }[] },
) {
  if (await db.konfigurasyonYedegi.count() > 0) return;

  const hedefler = o.varliklar.filter(
    (v) => v.tur && ['AGCIHAZ', 'OTFW', 'PLC', 'SCADA-SRV', 'DCS'].includes(v.tur.kod));

  let n = 0;
  for (const v of hedefler) {
    /* Her cihaz yedekli değil — %22'si hiç yedeklenmemiş. */
    if (r.sans(22)) continue;
    const kosuSayisi = 1 + r.tam(3);
    for (let i = 0; i < kosuSayisi; i++) {
      const basarili = !(i === 0 && r.sans(14));
      const dogrulandi = basarili && r.sans(45);
      await db.konfigurasyonYedegi.create({
        data: {
          varlikId: v.id,
          kaynakSistem: 'Yedekleme platformu raporu',
          kaynakKayitId: `CFG-${v.etiket}-${i}`,
          yedekZamani: gunOnce(i * 30 + r.tam(9) + 1),
          surum: `r${3 - i}.${r.tam(9)}`,
          icerikHash: (0x1000000 + r.tam(0xffffff)).toString(16),
          basarili,
          dogrulandi,
          dogrulamaZamani: dogrulandi ? gunOnce(i * 30 + r.tam(5)) : null,
          depolamaKonumu: 'kurum yedekleme deposu · OT bölmesi',
          saklamaGun: 365,
          sonBilinenIyi: i === 0 && basarili,
          hata: basarili ? null : 'Cihaz oturumu zaman aşımına uğradı; yapılandırma alınamadı.',
        },
      });
      n++;
    }
  }
  if (n === 0) console.log('doluluk: konfigürasyon yedeği için uygun varlık yok.');
}

/* ══════════════════════════════════════════════════════════════════════
   6 · VARLIK AKTARIMLARI · /varlik-aktarim
   Dört hâl: onaylandı · doğrulama bekliyor · eşleme (yarım) · hata.
   Ekranın gramerinde bunlar farklı işlerdir, tek "aktarım" değil.
   ══════════════════════════════════════════════════════════════════════ */
async function varlikAktarimlari(
  db: PrismaClient,
  o: { ahmet: string | null; burak: string | null; mehmet: string | null },
) {
  if (await db.varlikAktarimi.count() > 0) return;

  const basliklar = ['asset_tag', 'name', 'site', 'type', 'criticality', 'ip', 'os', 'owner'];
  const esleme = JSON.stringify({
    asset_tag: 'etiket', name: 'ad', site: 'tesisKodu', type: 'turKodu',
    criticality: 'kritiklik', ip: 'ipAdresi', os: 'isletimSistemi', owner: 'sahipEposta',
  });

  await db.varlikAktarimi.create({ data: {
    dosyaAdi: 'cmdb-merkez-2026-07.xlsx', kaynakTipi: 'xlsx',
    yukleyenId: o.burak, durum: 'onaylandi',
    basliklarJson: JSON.stringify(basliklar), eslemeJson: esleme,
    okunan: 212, gecerli: 198, hatali: 9, yinelenen: 5, eklenen: 141, guncellenen: 57,
    raporJson: JSON.stringify({ ozet: '198 geçerli satır yazıldı; 9 satır doğrulamada düştü.' }),
    onaylayanId: o.ahmet, onayZamani: gunOnce(38), olusturuldu: gunOnce(39),
  } });

  await db.varlikAktarimi.create({ data: {
    dosyaAdi: 'ot-saha-kizildere3-2026-08.csv', kaynakTipi: 'csv',
    yukleyenId: o.mehmet, durum: 'dogrulama_bekliyor',
    basliklarJson: JSON.stringify(basliklar), eslemeJson: esleme,
    okunan: 64, gecerli: 58, hatali: 4, yinelenen: 2, eklenen: 0, guncellenen: 0,
    raporJson: JSON.stringify({
      ozet: '58 satır yazılmaya hazır; 4 satırda santral kodu tanınmadı.',
      uyari: 'Onay envanter/onay yetkisi ister.',
    }),
    olusturuldu: gunOnce(6),
  } });

  await db.varlikAktarimi.create({ data: {
    dosyaAdi: 'alasehir-yardimci-tesis.csv', kaynakTipi: 'csv',
    yukleyenId: o.mehmet, durum: 'eslesme',
    basliklarJson: JSON.stringify(['Etiket', 'Cihaz Adı', 'Saha', 'Tip', 'Önem']),
    eslemeJson: null,
    okunan: 31, gecerli: 0, hatali: 0, yinelenen: 0, eklenen: 0, guncellenen: 0,
    olusturuldu: gunOnce(2),
  } });

  await db.varlikAktarimi.create({ data: {
    dosyaAdi: 'gokcedag-envanter-taslak.xlsx', kaynakTipi: 'xlsx',
    yukleyenId: o.mehmet, durum: 'hata',
    basliklarJson: JSON.stringify(['Kolon1', 'Kolon2']), eslemeJson: null,
    okunan: 0, gecerli: 0, hatali: 0, yinelenen: 0, eklenen: 0, guncellenen: 0,
    raporJson: JSON.stringify({
      ozet: 'Başlık satırı bulunamadı; ilk satır boş hücrelerden oluşuyor.',
    }),
    olusturuldu: gunOnce(14),
  } });

  await db.varlikAktarimi.create({ data: {
    dosyaAdi: 'kizildere1-2-birlesik.csv', kaynakTipi: 'csv',
    yukleyenId: o.burak, durum: 'reddedildi',
    basliklarJson: JSON.stringify(basliklar), eslemeJson: esleme,
    okunan: 96, gecerli: 71, hatali: 25, yinelenen: 0, eklenen: 0, guncellenen: 0,
    raporJson: JSON.stringify({
      ozet: '25 satırda kritiklik alanı boş; kaynak dosya düzeltilip yeniden yüklenecek.',
    }),
    onaylayanId: o.ahmet, onayZamani: gunOnce(21), olusturuldu: gunOnce(22),
  } });
}

/* ══════════════════════════════════════════════════════════════════════
   7 · API ANAHTARI VE İSTEK KÜTÜĞÜ · /yonetim-tezgahi
   Anahtarın kendisi SAKLANMAZ; yalnız ön ek ve karma tutulur. Buradaki
   karma da gerçek bir anahtarın karması değil, sabit bir demo dizesidir —
   üretilmiş bir token hiçbir yerde geçerli olmamalı.
   ══════════════════════════════════════════════════════════════════════ */
async function apiKatmani(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: { ahmet: string | null; burak: string | null },
) {
  if (await db.apiAnahtari.count() > 0) return;
  if (!o.ahmet) return;

  const anahtarlar = [
    { ad: 'CMDB aktarım işi', onEk: 'zey_cmdb', kullaniciId: o.burak ?? o.ahmet,
      gunOnce: 120, bitisGun: 245, iptal: false, sonKullanimGun: 1 },
    { ad: 'Raporlama okuyucu', onEk: 'zey_rapor', kullaniciId: o.ahmet,
      gunOnce: 80, bitisGun: 285, iptal: false, sonKullanimGun: 3 },
    { ad: 'Eski aktarım betiği', onEk: 'zey_eski', kullaniciId: o.burak ?? o.ahmet,
      gunOnce: 300, bitisGun: 65, iptal: true, sonKullanimGun: 96 },
  ];

  const olusturulan: { id: string; onEk: string }[] = [];
  for (let i = 0; i < anahtarlar.length; i++) {
    const a = anahtarlar[i];
    const k = await db.apiAnahtari.create({
      data: {
        ad: a.ad, kullaniciId: a.kullaniciId, onEk: a.onEk,
        /* Gerçek bir gizden türetilmemiş sabit dize: hiçbir istek bunu doğrulayamaz. */
        tokenHash: `demo-karma-kullanilamaz-${i}`,
        sonKullanim: gunOnce(a.sonKullanimGun),
        bitis: new Date(Date.now() + a.bitisGun * GUN),
        iptalZamani: a.iptal ? gunOnce(60) : null,
        olusturanId: o.ahmet, olusturuldu: gunOnce(a.gunOnce),
      },
    });
    olusturulan.push({ id: k.id, onEk: a.onEk });
  }

  const yollar: [string, string, number][] = [
    ['GET', '/api/v1/varliklar', 200], ['GET', '/api/v1/varliklar', 200],
    ['POST', '/api/v1/varliklar', 201], ['POST', '/api/v1/varliklar', 409],
    ['GET', '/api/v1/uyum/ozet', 200], ['GET', '/api/v1/bulgular', 200],
    ['GET', '/api/v1/bulgular', 403], ['POST', '/api/v1/kanitlar', 201],
    ['GET', '/api/v1/tesisler', 200], ['PATCH', '/api/v1/varliklar', 422],
    ['GET', '/api/v1/raporlar/kanit-paketi', 200], ['GET', '/api/v1/uyum/ozet', 429],
  ];
  const hataKodu: Record<number, string> = {
    409: 'yinelenen_idempotency', 403: 'kapsam_disi',
    422: 'dogrulama_hatasi', 429: 'hiz_siniri',
  };

  for (let i = 0; i < 44; i++) {
    const [yontem, yol, kod] = yollar[i % yollar.length];
    const a = olusturulan[i % olusturulan.length];
    await db.apiIstegi.create({
      data: {
        anahtarId: a.id, yontem, yol,
        idempotencyAnahtari: yontem === 'POST' ? `${a.onEk}-idem-${i}` : null,
        durumKodu: kod,
        yanitOzeti: kod < 400 ? `${10 + r.tam(180)} kayıt` : null,
        hataKodu: hataKodu[kod] ?? null,
        sureMs: 20 + r.tam(400),
        zaman: saatOnce(i * 5 + r.tam(4) + 1),
      },
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   8 · OLAY ETKİ ZİNCİRİ · /olaylar
   Olayın değeri tek başına kaydı değil, NEYE dokunduğudur: hangi sistem,
   hangi risk, hangi bulgu, hangi değişiklik, hangi proje. Zincir kopuksa
   olay bir günlük satırından ibaret kalır.
   ══════════════════════════════════════════════════════════════════════ */
async function olayEtkiZinciri(db: PrismaClient) {
  if (await db.olaySistem.count() > 0) return;

  const [olaylar, sistemler, riskler, bulgular, projeler, degisiklikler] = await Promise.all([
    db.olay.findMany({ select: { id: true, kod: true, tesisId: true }, orderBy: { kod: 'asc' } }),
    db.sistemServis.findMany({ select: { id: true, kod: true, tesisId: true } }),
    db.risk.findMany({ select: { id: true, kod: true }, orderBy: { kod: 'asc' } }),
    db.bulgu.findMany({ select: { id: true, baslik: true }, orderBy: { tespitTarihi: 'desc' } }),
    db.proje.findMany({ select: { id: true, kod: true }, orderBy: { kod: 'asc' } }),
    db.degisiklik.findMany({ select: { id: true, kod: true }, orderBy: { kod: 'asc' } }),
  ]);
  if (olaylar.length === 0) return;

  /* Zincir el ile kuruldu: rastgele bağ, "etki analizi" değil gürültüdür. */
  for (let i = 0; i < olaylar.length; i++) {
    const olay = olaylar[i];

    const sistem = sistemler.find((s) => s.tesisId === olay.tesisId) ?? sistemler[i % sistemler.length];
    if (sistem) {
      await db.olaySistem.create({
        data: { olayId: olay.id, sistemId: sistem.id, rol: 'etkilenen' },
      });
    }
    /* Kızıldere olayı ikinci bir sistemi de durdurdu. */
    const ikinci = sistemler.find((s) => s.id !== sistem?.id && s.tesisId === olay.tesisId);
    if (i === 0 && ikinci) {
      await db.olaySistem.create({
        data: { olayId: olay.id, sistemId: ikinci.id, rol: 'bagimli' },
      });
    }

    if (riskler[i]) await db.olayRisk.create({ data: { olayId: olay.id, riskId: riskler[i].id } });
    if (riskler[i + 4]) {
      await db.olayRisk.create({ data: { olayId: olay.id, riskId: riskler[i + 4].id } });
    }
    if (bulgular[i]) await db.olayBulgu.create({ data: { olayId: olay.id, bulguId: bulgular[i].id } });
    if (bulgular[i + 5]) {
      await db.olayBulgu.create({ data: { olayId: olay.id, bulguId: bulgular[i + 5].id } });
    }
    if (degisiklikler[i]) {
      await db.olayDegisiklik.create({
        data: { olayId: olay.id, degisiklikId: degisiklikler[i].id },
      });
    }
    /* Her olay bir projeye dönüşmez — ikisi düzeltici projeye bağlandı. */
    if (i < 2 && projeler[i]) {
      await db.olayProje.create({ data: { olayId: olay.id, projeId: projeler[i].id } });
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   9 · TEDARİKÇİ ERİŞİM OTURUMLARI · /tedarikciler
   OLY-2026-023 "kayıt dışı uzak bakım oturumu" diyor. Kütükte o boşluk
   GÖRÜNMELİ: bir kısım oturum onaysız, bir kısmı MFA'sız, bir kısmı
   izlenmemiş. Hepsi yeşil olsaydı olay kaydı ekranı yalanlardı.
   ══════════════════════════════════════════════════════════════════════ */
async function tedarikciOturumlari(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: { tesisler: { id: string; kod: string }[] },
) {
  if (await db.tedarikciErisimOturumu.count() > 0) return;

  const [tedarikciler, hesaplar, sistemler] = await Promise.all([
    db.tedarikci.findMany({
      where: { uzaktanErisimVar: true, silindi: null },
      select: { id: true, ad: true, oturumKaydiVar: true },
    }),
    db.kimlikHesabi.findMany({ select: { id: true, tesisId: true }, take: 40 }),
    db.sistemServis.findMany({ select: { id: true, tesisId: true } }),
  ]);
  if (tedarikciler.length === 0) return;

  let n = 0;
  for (let i = 0; i < 26; i++) {
    const t = tedarikciler[i % tedarikciler.length];
    const tesis = o.tesisler[i % o.tesisler.length];
    const sistem = sistemler.find((s) => s.tesisId === tesis.id) ?? null;
    const hesap = hesaplar[i % Math.max(hesaplar.length, 1)] ?? null;

    /* Oturum kaydı olmayan tedarikçide "izlendi" BİLİNMEZ (null), false
       değil: kaydı tutmayan sistemden "izlenmedi" sonucu çıkarılamaz. */
    const izlendi = t.oturumKaydiVar ? r.sans(78) : null;
    const onayli = r.sans(82) ? true : (r.sans(50) ? false : null);
    const mfaVar = r.sans(70) ? true : (r.sans(60) ? false : null);
    const sureSaat = 1 + r.tam(6);
    const baslangic = gunOnce(r.tam(80) + 1);

    await db.tedarikciErisimOturumu.create({
      data: {
        tedarikciId: t.id,
        hesapId: hesap?.id ?? null,
        tesisId: tesis.id,
        sistemId: sistem?.id ?? null,
        baslangic,
        bitis: new Date(baslangic.getTime() + sureSaat * 3_600_000),
        kaynakSistem: 'Uzak erişim kayıt dışa aktarımı',
        kaynakKayitId: `RAS-${String(5200 + i)}`,
        onayli, mfaVar, izlendi,
        talepReferansi: onayli ? `TLP-2026-${String(400 + i)}` : null,
        kayitReferansi: izlendi ? `KYT-${String(8800 + i)}` : null,
        durum: i === 3 ? 'kayit_disi' : 'tamamlandi',
      },
    });
    n++;
  }
  if (n === 0) console.log('doluluk: tedarikçi oturumu üretilemedi.');
}

/* ══════════════════════════════════════════════════════════════════════
   10 · TOPOLOJİ TEMELİ VE SAPMA · /topoloji
   Temel (baseline) onaylanmış bir anlık görüntüdür; sapma o temele göre
   ölçülür. Temel yoksa "sapma" diye bir şey de yoktur — bu yüzden önce
   temel yazılır, sonra ondan sapan ikinci anlık.
   ══════════════════════════════════════════════════════════════════════ */
async function topolojiTemeli(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: { tesisler: { id: string; kod: string }[]; ahmet: string | null; burak: string | null },
) {
  if (await db.topolojiAnlik.count() > 0) return;

  const [bolgeler, gecitler, riskler, bulgular] = await Promise.all([
    db.agBolgesi.findMany({
      select: { id: true, kod: true, ad: true, tesisId: true, guvenlikSeviyesi: true },
    }),
    db.agGeciti.findMany({
      select: { id: true, kaynakBolgeId: true, hedefBolgeId: true, protokoller: true, onaylandi: true },
    }),
    db.risk.findMany({ where: { silindi: null }, select: { id: true }, take: 4 }),
    db.bulgu.findMany({ where: { silindi: null }, select: { id: true }, take: 4 }),
  ]);

  /* Topoloji ölçümü HER santralde yoktur ve olmamalıdır: pasif keşif
     kurulumu saha saha yayılır. Bölgesi tanımlı santrallerin bir kısmı
     ölçülür, kalanı "hiç ölçülmedi" der — ekranın değeri o boşluğu
     göstermektir, hepsini yeşile boyamak değil. */
  const bolgeliTesisler = o.tesisler.filter((t) => bolgeler.some((b) => b.tesisId === t.id));
  /* Yayılım alfabetik DEĞİL, önem sırasına göredir: pasif keşif önce en
     büyük ve en kritik sahalara kurulur. Alfabetik dilim, portföyün
     amiral santralini (Kızıldere III) ölçülmemiş bırakıyordu ve ekran
     gerçekte olmayacak bir öncelik sırası anlatıyordu. */
  const ONCELIK = ['KIZILDERE-3', 'KIZILDERE-2', 'KIZILDERE-1', 'ALASEHIR-JES',
    'GOKCEDAG-RES', 'ALASEHIR-GES', 'ATAKOY-HES', 'MERKEZ-BT'];
  const sirali = [...bolgeliTesisler].sort((a, b) => {
    const ia = ONCELIK.indexOf(a.kod);
    const ib = ONCELIK.indexOf(b.kod);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.kod.localeCompare(b.kod, 'tr');
  });
  const olculen = sirali.slice(0, Math.max(1, Math.ceil(sirali.length * 0.55)));

  const SAPMA_KALIPLARI = [
    {
      tip: 'yeni_gecit', siddet: 'kritik', durum: 'gozlendi',
      aciklama: 'Seviye 3 ile Seviye 2 arasında temelde olmayan doğrudan bir yol görüldü.',
      onceki: { gecit: null }, sonraki: { gecit: 'L3→L2', protokol: 'RDP', yon: 'tek_yon' },
    },
    {
      tip: 'yeni_dugum', siddet: 'yuksek', durum: 'inceleme',
      aciklama: 'Saha bölgesinde envanterde karşılığı olmayan iki cihaz belirdi.',
      onceki: { dugumSayisi: 41 }, sonraki: { dugumSayisi: 43 },
    },
    {
      tip: 'protokol_degisimi', siddet: 'orta', durum: 'kabul',
      aciklama: 'Tarih eşitleme protokolü değişti; planlı değişiklikle uyumlu.',
      onceki: { protokol: 'NTP v3' }, sonraki: { protokol: 'NTP v4' },
    },
    {
      tip: 'kaybolan_dugum', siddet: 'dusuk', durum: 'kabul',
      aciklama: 'Bir saha anahtarı görünmüyor; bakım kapsamında söküldüğü doğrulandı.',
      onceki: { dugum: 'SW-DOLAP-04' }, sonraki: { dugum: null },
    },
    {
      tip: 'gecit_yonu', siddet: 'yuksek', durum: 'gozlendi',
      aciklama: 'Tek yönlü olması gereken geçit iki yönlü trafik gösteriyor.',
      onceki: { yon: 'tek_yon' }, sonraki: { yon: 'cift_yon' },
    },
    {
      tip: 'yeni_dugum', siddet: 'orta', durum: 'ret',
      aciklama: 'Ölçümde görülen düğüm doğrulanamadı; temel korundu.',
      onceki: { dugumSayisi: 28 }, sonraki: { dugumSayisi: 29 },
    },
  ] as const;

  let sapmaSirasi = 0;
  for (let i = 0; i < olculen.length; i++) {
    const t = olculen[i];
    const yerel = bolgeler.filter((b) => b.tesisId === t.id);
    const yerelIdler = new Set(yerel.map((b) => b.id));
    const yerelGecitler = gecitler.filter(
      (g) => yerelIdler.has(g.kaynakBolgeId) || yerelIdler.has(g.hedefBolgeId));

    const temel = await db.topolojiAnlik.create({
      data: {
        tesisId: t.id, kaynak: 'OT pasif keşif dışa aktarımı',
        alindi: gunOnce(96 + i * 4), ozetHash: `temel-${t.kod.toLowerCase()}`,
        temelMi: true,
        /* Bir temel HENÜZ ONAYLANMAMIŞ olabilir: "temel var" ile "temel
           onaylı" ayrı şeylerdir ve ekran ikisini ayrı sayar. */
        onaylayanId: i % 4 === 3 ? null : o.ahmet,
        onayZamani: i % 4 === 3 ? null : gunOnce(94 + i * 4),
        not: `${t.kod} saha ağı temeli; sapmalar buna göre ölçülür.`,
      },
    });
    const guncel = await db.topolojiAnlik.create({
      data: {
        tesisId: t.id, kaynak: 'OT pasif keşif dışa aktarımı',
        alindi: gunOnce(2 + i), ozetHash: `anlik-${t.kod.toLowerCase()}`,
        temelMi: false,
        not: 'Son alınan görüntü.',
      },
    });

    for (const anlik of [temel, guncel]) {
      for (const b of yerel) {
        await db.topolojiGozlemi.create({
          data: {
            anlikId: anlik.id, tip: 'bolge', anahtar: b.kod,
            ozellikJson: JSON.stringify({ ad: b.ad, guvenlikSeviyesi: b.guvenlikSeviyesi }),
          },
        });
      }
      for (const g of yerelGecitler) {
        await db.topolojiGozlemi.create({
          data: {
            anlikId: anlik.id, tip: 'gecit', anahtar: `${g.kaynakBolgeId}->${g.hedefBolgeId}`,
            ozellikJson: JSON.stringify({ protokoller: g.protokoller, onaylandi: g.onaylandi }),
          },
        });
      }
    }

    /* Her santral sapma göstermez — bir kısmı temeliyle aynı. */
    const sapmaSayisi = i === 0 ? 3 : r.tam(3);
    for (let j = 0; j < sapmaSayisi; j++) {
      const k = SAPMA_KALIPLARI[sapmaSirasi % SAPMA_KALIPLARI.length];
      sapmaSirasi++;
      const kararli = k.durum === 'kabul' || k.durum === 'ret';
      /* Kritik sapmanın kayda dönüşmesi otomatik DEĞİLDİR; ilkinde
         dönüşmüş, ötekinde dönüşmemiştir — ekran farkı söylemeli. */
      const kayda = k.siddet === 'kritik' && i === 1;
      await db.topolojiSapmasi.create({
        data: {
          tesisId: t.id, anlikId: guncel.id,
          tip: k.tip, siddet: k.siddet, aciklama: k.aciklama,
          oncekiJson: JSON.stringify(k.onceki), sonrakiJson: JSON.stringify(k.sonraki),
          durum: k.durum,
          kararVerenId: kararli ? o.burak : null,
          kararZamani: kararli ? gunOnce(2) : null,
          kararGerekcesi: k.durum === 'kabul'
            ? 'Planlı değişiklikle uyumlu; temel bir sonraki onayda güncellenecek.'
            : k.durum === 'ret'
              ? 'Gözlem yinelenmedi; ölçüm gürültüsü kabul edildi, temel değişmedi.'
              : null,
          uretilenRiskId: kayda ? riskler[0]?.id ?? null : null,
          uretilenBulguId: kayda ? bulgular[0]?.id ?? null : null,
          olusturuldu: gunOnce(2 + i),
        },
      });
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   11 · DEĞERLENDİRME TARİHÇESİ
   "Bu kontrol ne zaman uyumsuzdan uyumluya geçti ve kim yazdı?" Denetimde
   sorulan ikinci soru. Tarihçesiz bir durum, imzasız bir beyandır.
   ══════════════════════════════════════════════════════════════════════ */
async function degerlendirmeTarihcesi(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: { ahmet: string | null; selin: string | null; zeynep: string | null },
) {
  if (await db.degerlendirmeTarihcesi.count() > 0) return;

  const durumlar = await db.maddeDurumu.findMany({
    select: { id: true, durum: true, guven: true, sonDegerlendirme: true },
    orderBy: { id: 'asc' },
  });
  const aktorler = [o.ahmet, o.selin, o.zeynep].filter((x): x is string => !!x);
  if (aktorler.length === 0) return;

  const ONCEKI: Record<string, string> = {
    uyumlu: 'kismi', kismi: 'uyumsuz', uyumsuz: 'degerlendirilmedi',
    incelemede: 'degerlendirilmedi', degerlendirilmedi: 'degerlendirilmedi',
    kapsamdisi: 'degerlendirilmedi',
  };
  const GEREKCE: Record<string, string> = {
    uyumlu: 'Kanıt tazelendi ve kontrol yeniden yürütüldü.',
    kismi: 'Kısmi uygulama doğrulandı; kalan kapsam bir sonraki döneme alındı.',
    uyumsuz: 'Yerinde inceleme kontrolün uygulanmadığını gösterdi.',
    incelemede: 'Değerlendirme açıldı, kanıt toplanıyor.',
    degerlendirilmedi: 'Kapsama yeni girdi; henüz değerlendirilmedi.',
    kapsamdisi: 'Uygulanabilirlik kararıyla kapsam dışına alındı.',
  };

  for (const d of durumlar) {
    /* Her durum bir kere değişmiş değil: ~%30'u ilk hâlinde duruyor. */
    if (r.sans(30)) continue;
    const eski = ONCEKI[d.durum] ?? 'degerlendirilmedi';
    if (eski === d.durum) continue;
    const zaman = d.sonDegerlendirme ?? gunOnce(r.tam(120) + 5);
    await db.degerlendirmeTarihcesi.create({
      data: {
        maddeDurumuId: d.id,
        eskiDurum: eski, yeniDurum: d.durum,
        eskiGuven: 'kanit_yok', yeniGuven: d.guven,
        gerekce: GEREKCE[d.durum] ?? null,
        aktorId: aktorler[r.tam(aktorler.length)],
        zaman,
      },
    });
    /* Bir kısmında iki adımlı geçmiş var — kütük tek satırdan ibaret değil. */
    if (r.sans(35)) {
      await db.degerlendirmeTarihcesi.create({
        data: {
          maddeDurumuId: d.id,
          eskiDurum: 'degerlendirilmedi', yeniDurum: eski,
          eskiGuven: null, yeniGuven: 'kanit_yok',
          gerekce: 'İlk değerlendirme kaydı açıldı.',
          aktorId: aktorler[r.tam(aktorler.length)],
          zaman: new Date(zaman.getTime() - (30 + r.tam(90)) * GUN),
        },
      });
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   12 · KANIT KAPSAMI · /kanitlar
   Kanıtın kapsamı üç yoldan bilinir: madde durumu bağı, DOĞRUDAN santral
   bağı, ya da varlık bağı (varlığın santrali). İlki zaten seed'de vardı;
   diğer ikisi boştu ve ekran kapsamı "bilinmiyor" diye gösteriyordu.
   ══════════════════════════════════════════════════════════════════════ */
async function kanitKapsami(
  db: PrismaClient,
  r: ReturnType<typeof uretec>,
  o: { varliklar: { id: string; tesisId: string | null; tur: { kod: string } | null }[] },
) {
  const tesisBagiVar = await db.kanitTesis.count() > 0;
  const varlikBagiVar = await db.kanitVarlik.count() > 0;
  if (tesisBagiVar && varlikBagiVar) return;

  const kanitlar = await db.kanit.findMany({
    where: { silindi: null },
    select: {
      id: true, tip: true,
      baglantilar: { select: { maddeDurumu: { select: { tesisId: true } } } },
    },
    orderBy: { olusturuldu: 'asc' },
  });

  /* Varlık bağı yalnız CİHAZ düzeyinde anlamlı kanıt tiplerinde kurulur:
     bir yapılandırma çıktısı ya da işletim kaydı bir cihaza aittir, bir
     politika belgesi ise kuruma aittir ve varlığa bağlanması yanlış olur. */
  const VARLIK_KANITI = ['konfigurasyon', 'kayit', 'test_kaydi'];

  for (const k of kanitlar) {
    const tesisIdleri = [...new Set(
      k.baglantilar.map((b) => b.maddeDurumu?.tesisId).filter((x): x is string => !!x))];

    /* Doğrudan santral bağı: kanıtın hangi sahanın kanıtı olduğunu madde
       bağından TÜRETMEK zorunda kalmamak için. Türetme kırılgandır —
       madde bağı kaldırılınca kanıt sahipsiz kalırdı. */
    if (!tesisBagiVar) {
      for (const t of tesisIdleri) {
        await db.kanitTesis.create({ data: { kanitId: k.id, tesisId: t } });
      }
    }

    /* Varlık bağı yalnız varlık düzeyinde anlamlı kanıt tiplerinde. */
    if (!VARLIK_KANITI.includes(k.tip)) continue;
    const aday = o.varliklar.filter(
      (v) => v.tesisId && (tesisIdleri.length === 0 || tesisIdleri.includes(v.tesisId)));
    if (aday.length === 0) continue;
    const adet = 1 + r.tam(3);
    const secilen = new Set<string>();
    for (let i = 0; i < adet; i++) secilen.add(aday[r.tam(aday.length)].id);
    for (const vid of secilen) {
      await db.kanitVarlik.create({ data: { kanitId: k.id, varlikId: vid } });
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   13 · LİSANSLAR · /omur
   Yazılım ömrünün maliyet ve adet yüzü. Bir kısmında adet BİLİNMİYOR
   (null) — sözleşmede sınırsız yazan kalem sıfır değildir.
   ══════════════════════════════════════════════════════════════════════ */
async function lisanslar(db: PrismaClient) {
  if (await db.lisans.count() > 0) return;

  const [yazilimlar, sozlesmeler] = await Promise.all([
    db.yazilimUrunu.findMany({ select: { id: true, ad: true }, orderBy: { ad: 'asc' } }),
    db.sozlesme.findMany({ where: { silindi: null }, select: { id: true, kod: true } }),
  ]);
  if (yazilimlar.length === 0) return;

  /* Aynı ürün adı birden çok kayıtta olabiliyor (sürüm başına); lisans
     ürün ADI başına tek kalemdir. */
  const gorulen = new Set<string>();
  let i = 0;
  for (const y of yazilimlar) {
    if (gorulen.has(y.ad)) continue;
    gorulen.add(y.ad);
    const sinirsiz = i % 7 === 3;
    await db.lisans.create({
      data: {
        yazilimId: y.id,
        sozlesmeId: sozlesmeler.length > 0 ? sozlesmeler[i % sozlesmeler.length].id : null,
        adet: sinirsiz ? null : 5 + ((i * 13) % 120),
        bitis: new Date(Date.now() + ((i * 47) % 500 - 60) * GUN),
        maliyet: sinirsiz ? null : 1_800 + ((i * 2_350) % 42_000),
      },
    });
    i++;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   14 · SÜRÜM FARKLARI · /regulasyonlar
   "Çerçeve yeni sürüme geçti — bizde ne değişiyor?" Fark kaydı olmadan
   bu soru elle yanıtlanır ve hep eksik yanıtlanır.
   ══════════════════════════════════════════════════════════════════════ */
async function surumFarklari(db: PrismaClient) {
  if (await db.surumFarki.count() > 0) return;

  const surumler = await db.frameworkSurumu.findMany({
    select: { id: true, regulasyonId: true, surumEtiketi: true, durum: true, yayimTarihi: true },
    orderBy: { yayimTarihi: 'asc' },
  });
  const maddeler = await db.madde.findMany({
    where: { silindi: null },
    select: { kod: true, baslik: true, regulasyonId: true },
    orderBy: { kod: 'asc' },
  });
  if (surumler.length === 0) return;

  /* Regülasyon başına: en yeni sürüm hedef, ondan önceki kaynak. */
  const gruplu = new Map<string, typeof surumler>();
  for (const s of surumler) {
    gruplu.set(s.regulasyonId, [...(gruplu.get(s.regulasyonId) ?? []), s]);
  }

  for (const [regId, liste] of gruplu) {
    if (liste.length === 0) continue;
    const yeni = liste[liste.length - 1];
    const eski = liste.length > 1 ? liste[liste.length - 2] : null;
    const regMaddeleri = maddeler.filter((m) => m.regulasyonId === regId);
    if (regMaddeleri.length === 0) continue;

    for (let i = 0; i < regMaddeleri.length; i++) {
      const m = regMaddeleri[i];
      const degisimTipi = !eski
        ? 'yeni'
        : i % 6 === 0 ? 'degisti' : i % 11 === 5 ? 'yeni' : 'ayni';
      await db.surumFarki.create({
        data: {
          eskiSurumId: eski?.id ?? null,
          yeniSurumId: yeni.id,
          maddeKodu: m.kod,
          degisimTipi,
          ozet: degisimTipi === 'degisti'
            ? `${m.baslik} — gereklilik metni sıkılaştırıldı, kanıt beklentisi netleşti.`
            : degisimTipi === 'yeni'
              ? `${m.baslik} — bu sürümle geldi.`
              : null,
          etkiNotu: degisimTipi === 'ayni'
            ? null
            : 'Kapsamdaki tüm santrallerde yeniden değerlendirme gerekir.',
        },
      });
    }

    /* Kaldırılan madde: eski sürümde vardı, yenide yok. Kütükte karşılığı
       olmayan kod bilerek yazılır — ekran "artık aranmıyor" diyebilmeli. */
    if (eski) {
      await db.surumFarki.create({
        data: {
          eskiSurumId: eski.id, yeniSurumId: yeni.id,
          maddeKodu: `${regMaddeleri[0].kod.split('-').slice(0, -1).join('-')}-ESKI`,
          degisimTipi: 'kaldirildi',
          ozet: 'Bu gereklilik yeni sürümde kaldırıldı.',
          etkiNotu: 'Bağlı kanıtlar arşivlenebilir; yeni değerlendirme açılmaz.',
        },
      });
    }
  }
}
