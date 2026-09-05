/* Operasyonel katman başlangıç verisi — Faz 5.
   CMDB, ömür (EOL/EOS), yedekleme & kurtarma, kimlik & erişim ve tedarikçi
   kayıtları. seed.ts'in devamıdır; kendi başına çalıştırılmaz.

   Neden ayrı dosya: seed.ts elle yazılmış 700 satırlık uyum verisi taşıyor ve
   paralel çalışılan bir dosyada satır kaydırmak riskli. Buradaki veriler
   yalnızca kod ve isimlerle bağlanır, seed.ts'in iç değişkenlerine dokunmaz.

   Rakamlar Zorlu Enerji üretim portföyünün gerçek yapısına oturur; ZES, OEDAŞ
   ve OEPSAŞ platform kapsamı dışıdır ve buraya girmez. */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

/* Yeniden üretilebilir sözde-rastgele: görsel regresyon testleri her seed'de
   aynı tabloyu görmeli, bu yüzden Math.random kullanılmaz. */
function uret(tohum: number) {
  let s = tohum >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Santral bazlı varlık şablonu. sayi = o santralde kaç adet üretileceği.
   [tur kodu, etiket eki, ad kalıbı, kritiklik, bölge tipi] */
const SABLON: [string, string, string, string, string, number][] = [
  ['SCADA-SRV', 'SCADA', '%s SCADA Sunucusu', 'kritik', 'ot', 2],
  ['DCS', 'DCS', '%s Türbin Denetleyicisi', 'kritik', 'ot', 2],
  ['HMI', 'HMI', '%s Operatör İstasyonu', 'yuksek', 'ot', 3],
  ['PLC', 'PLC', '%s Saha PLC', 'yuksek', 'ot', 5],
  ['EWS', 'EWS', '%s Mühendislik İstasyonu', 'yuksek', 'ot', 1],
  ['OTFW', 'OTFW', '%s OT Güvenlik Duvarı', 'kritik', 'ot_dmz', 1],
  ['AGCIHAZ', 'SW', '%s Saha Anahtarı', 'orta', 'ot', 4],
  ['SSUNUCU', 'HIST', '%s Historian', 'yuksek', 'ot_dmz', 1],
  ['SSUNUCU', 'SRV', '%s Yardımcı Sunucu', 'orta', 'kurumsal', 2],
  ['UYGULAMA', 'APP', '%s Raporlama Uygulaması', 'dusuk', 'kurumsal', 1],
];

/* Merkez BT'nin kendi şablonu — üretim varlığı yok. */
const MERKEZ_SABLON: [string, string, string, string, number][] = [
  ['FSUNUCU', 'ESX', 'Sanallaştırma Ana Makinesi', 'kritik', 4],
  ['SSUNUCU', 'SRV', 'Merkez Sunucusu', 'yuksek', 14],
  ['UYGULAMA', 'APP', 'Kurumsal Uygulama', 'orta', 8],
  ['AGCIHAZ', 'SW', 'Omurga Anahtarı', 'yuksek', 4],
  ['AGCIHAZ', 'FW', 'Kurumsal Güvenlik Duvarı', 'kritik', 2],
];

export async function operasyonVerisi(db: PrismaClient) {
  const rnd = uret(20260831);

  const tesisler = await db.tesis.findMany({ where: { durum: 'aktif' }, include: { tip: true } });
  const T = Object.fromEntries(tesisler.map((x) => [x.kod, x]));
  const kullanicilar = await db.kullanici.findMany();
  const K = Object.fromEntries(kullanicilar.map((x) => [x.eposta.split('@')[0], x]));
  const turler = Object.fromEntries(
    (await db.varlikTuru.findMany()).map((x) => [x.kod, x]),
  );
  const sistemler = await db.sistemServis.findMany();
  const bolgeler = await db.agBolgesi.findMany();

  const uretimSantralleri = tesisler.filter(
    (x) => x.kod !== 'MERKEZ-BT' && !x.kod.startsWith('LULEBURGAZ'),
  );

  /* ═══ Tedarikçiler ═══════════════════════════════════════════════════
     18 kayıt: donanım/OT sağlayıcı/yazılım/hizmet. Uzaktan erişimi olan
     ama oturum kaydı bulunmayan tedarikçi O16'nın ana sinyalidir. */
  // [ad, tip, uzaktan erişim, kritiklik, yöntem, oturum kaydı]
  // oturumKaydi null = BİLİNMİYOR; false = kayıt alınmıyor. İkisi aynı şey
  // değildir ve ekranda da aynı gösterilmez (unknown ≠ zero).
  const tedarikciTanim: [string, string, boolean, string, string | null, boolean | null][] = [
    ['Siemens Energy', 'ot_saglayici', true, 'kritik', 'jump_host', true],
    ['Ormat Technologies', 'ot_saglayici', true, 'kritik', 'saticiya_ozel', false],
    ['GE Vernova', 'ot_saglayici', true, 'yuksek', 'vpn', true],
    ['Vestas', 'ot_saglayici', true, 'yuksek', 'saticiya_ozel', null],
    ['Enercon', 'ot_saglayici', true, 'orta', 'vpn', true],
    ['Andritz Hydro', 'ot_saglayici', true, 'yuksek', 'jump_host', true],
    ['Voith Hydro', 'ot_saglayici', false, 'orta', 'yok', null],
    ['ABB', 'donanim', false, 'orta', 'yok', null],
    ['Schneider Electric', 'donanim', true, 'yuksek', 'vpn', false],
    ['Honeywell', 'ot_saglayici', false, 'orta', 'yok', null],
    ['Emerson', 'ot_saglayici', false, 'orta', 'yok', null],
    ['Cisco Systems', 'donanim', false, 'orta', 'yok', null],
    ['Fortinet', 'donanim', false, 'yuksek', 'yok', null],
    ['Microsoft', 'yazilim', false, 'yuksek', 'yok', null],
    ['Broadcom (VMware)', 'yazilim', false, 'kritik', 'yok', null],
    ['Türk Telekom', 'hizmet', true, 'orta', 'vpn', true],
    ['Turkcell', 'hizmet', true, 'dusuk', 'vpn', true],
    ['TÜBİTAK BİLGEM', 'hizmet', false, 'dusuk', 'yok', null],
  ];
  const TD: Record<string, { id: string }> = {};
  for (const [ad, tip, uzak, krit, yontem, oturum] of tedarikciTanim) {
    TD[ad] = await db.tedarikci.create({
      data: {
        ad, tip, uzaktanErisimVar: uzak, kritiklik: krit,
        uzaktanErisimYontemi: yontem, oturumKaydiVar: oturum,
      },
    });
  }

  /* Sözleşmeler — destek bitişi O16'nın "1 destek bitiyor" metriğini besler. */
  const sozlesmeTanim: [string, string, string, number, string, boolean | null][] = [
    ['Siemens Energy', 'SZL-2023-SIE-DCS', 'DCS/SCADA bakım ve destek', 41, '7×24 saha, 4 saat müdahale', true],
    ['Ormat Technologies', 'SZL-2022-ORM-JES', 'Jeotermal ünite O&M', 128, 'Yıllık revizyon + uzaktan izleme', true],
    ['GE Vernova', 'SZL-2024-GE-TRB', 'Türbin kontrol sistemi desteği', 402, '5×8 uzaktan', true],
    ['Vestas', 'SZL-2021-VES-WTG', 'Rüzgâr türbini tam bakım', 19, 'Tam kapsam O&M', false],
    ['Enercon', 'SZL-2024-ENR-WTG', 'Rüzgâr türbini yedek parça', 610, 'Parça + teknik destek', true],
    ['Andritz Hydro', 'SZL-2023-AND-HES', 'Hidrolik ünite kontrol desteği', 233, 'Yıllık 2 saha ziyareti', true],
    ['Voith Hydro', 'SZL-2020-VOI-HES', 'Türbin regülatör bakımı', -46, 'Süresi doldu, yenilenmedi', null],
    ['Schneider Electric', 'SZL-2024-SCH-RTU', 'RTU ve saha ekipmanı', 520, 'Parça garantisi', true],
    ['Fortinet', 'SZL-2025-FTN-FW', 'Güvenlik duvarı lisans ve destek', 296, 'Lisans + imza güncelleme', true],
    ['Microsoft', 'SZL-2024-MS-EA', 'Kurumsal lisans anlaşması', 487, 'EA + Defender', true],
    ['Broadcom (VMware)', 'SZL-2025-BRC-VS', 'Sanallaştırma abonelik', 174, 'VVF abonelik', true],
    ['Türk Telekom', 'SZL-2023-TT-MPLS', 'Santral MPLS bağlantıları', 88, '%99,5 erişilebilirlik', false],
    ['Turkcell', 'SZL-2024-TCL-APN', 'Özel APN / uzak saha', 355, 'Kapalı devre APN', false],
    ['TÜBİTAK BİLGEM', 'SZL-2025-TBT-SOME', 'SOME danışmanlığı', 210, 'Yıllık 40 adam-gün', true],
    ['Cisco Systems', 'SZL-2023-CSC-NET', 'Ağ donanımı bakım', 143, 'NBD parça', true],
    ['ABB', 'SZL-2022-ABB-DRV', 'Sürücü ve motor bakımı', 66, 'Yıllık bakım', false],
  ];
  const SZ: Record<string, { id: string }> = {};
  for (const [ted, kod, ad, bitisGun, sla, guvenlik] of sozlesmeTanim) {
    SZ[kod] = await db.sozlesme.create({
      data: {
        tedarikciId: TD[ted].id, kod, ad,
        baslangic: gun(bitisGun - 1095), bitis: gun(bitisGun),
        slaOzeti: sla, guvenlikSartlariVar: guvenlik,
      },
    });
  }

  /* ═══ Yazılım ürünleri — ömür ekranının (O13) gerçek EOL kaynağı ═══════ */
  const yazilimTanim: [string, string, string, number | null, number | null][] = [
    ['Windows Server', 'Microsoft', '2012 R2', -1050, -1050],
    ['Windows Server', 'Microsoft', '2016', 380, 380],
    ['Windows Server', 'Microsoft', '2019', 1290, 1290],
    ['Windows Server', 'Microsoft', '2022', 2380, 2380],
    ['SIMATIC WinCC', 'Siemens', 'V7.4', -240, -240],
    ['SIMATIC WinCC', 'Siemens', 'V7.5', 690, 690],
    ['SIMATIC PCS 7', 'Siemens', 'V8.2', -520, -520],
    ['SIMATIC PCS 7', 'Siemens', 'V9.1', 1120, 1120],
    ['vSphere', 'Broadcom (VMware)', '6.7', -1010, -1010],
    ['vSphere', 'Broadcom (VMware)', '8.0', 1460, 1460],
    ['Cisco IOS', 'Cisco Systems', '15.2', -160, 95],
    ['Cisco IOS-XE', 'Cisco Systems', '17.9', 1580, 1580],
    ['FortiOS', 'Fortinet', '7.2', 540, 540],
    ['RSLogix 5000', 'Rockwell', 'V20', -1400, -1400],
    ['Ovation', 'Emerson', '3.7', 260, 260],
    ['Oracle Database', 'Oracle', '12c', -890, -890],
  ];
  const YZ: Record<string, { id: string }> = {};
  for (const [ad, uretici, surum, eol, eos] of yazilimTanim) {
    YZ[`${ad} ${surum}`] = await db.yazilimUrunu.create({
      data: {
        ad, uretici, surum,
        eolTarihi: eol == null ? null : gun(eol),
        eosTarihi: eos == null ? null : gun(eos),
      },
    });
  }
  const yazilimAnahtarlari = Object.keys(YZ);

  /* ═══ Ağ bölgeleri — her üretim santralinde kurumsal / OT DMZ / OT ═════ */
  const bolgeIndeksi = new Map<string, string>();
  for (const b of bolgeler) bolgeIndeksi.set(`${b.tesisId}|${b.tip}`, b.id);
  for (const s of uretimSantralleri) {
    for (const [tip, ad, sl] of [
      ['kurumsal', 'Kurumsal Ağ', 4],
      ['ot_dmz', 'OT DMZ', 3],
      ['ot', 'Süreç Kontrol Ağı', 2],
    ] as const) {
      const anahtar = `${s.id}|${tip}`;
      if (bolgeIndeksi.has(anahtar)) continue;
      const b = await db.agBolgesi.create({
        data: {
          tesisId: s.id, kod: `${s.kod}-${tip.toUpperCase()}`,
          ad: `${s.ad} ${ad}`, tip, guvenlikSeviyesi: sl,
        },
      });
      bolgeIndeksi.set(anahtar, b.id);
    }
  }

  /* ═══ Varlıklar ═══════════════════════════════════════════════════════
     Santral başına şablon; toplam ~410 kayıt. Sağlık alanları rastgele
     değil KURALLIDIR: eski yazılım → yamasız, izleme kapsamı dışındaki
     bölgeler → izlemeDurumu 'bilinmiyor' (sıfır değil, BİLİNMEYEN). */
  const sistemEslesme = new Map(sistemler.map((x) => [x.tesisId ?? '', x.id]));
  const varliklar: { id: string; etiket: string; tesisId: string | null; kritiklik: string }[] = [];
  const sahipDagitim = ['ahmet.terzi', 'selin.aydin', 'burak.sahin', 'mehmet.kaya', 'zeynep.arslan'];

  for (const s of uretimSantralleri) {
    const jes = s.kod.includes('JES') || s.kod.startsWith('KIZILDERE');
    const res = s.kod.includes('RES');
    const hes = s.kod.includes('HES');
    /* Tedarikçi santralin teknolojisinden gelir: jeotermal ünitede Ormat,
       rüzgârda Vestas/Enercon, hidroda Andritz/Voith. Rastgele atama
       tedarikçi ekranını anlamsız kılıyordu — zincir gerçek olmalı. */
    const havuz = jes
      ? ['Ormat Technologies', 'Siemens Energy', 'Schneider Electric', 'Cisco Systems', 'Honeywell']
      : res
        ? ['Vestas', 'Enercon', 'GE Vernova', 'Schneider Electric', 'Cisco Systems']
        : hes
          ? ['Andritz Hydro', 'Voith Hydro', 'ABB', 'Schneider Electric', 'Cisco Systems']
          : ['Siemens Energy', 'GE Vernova', 'Schneider Electric', 'ABB', 'Cisco Systems'];
    // Ağ cihazı her sahada aynı sağlayıcıdan gelir, üretim ekipmanından bağımsız.
    const saglayici = (r: () => number) => havuz[Math.floor(r() * havuz.length)];
    for (const [turKod, ek, adKalibi, kritiklik, bolgeTipi, sayi] of SABLON) {
      // HES/RES'te ikinci SCADA ve DCS yok; şablon santral tipine uyarlanır.
      const adet = !jes && (ek === 'SCADA' || ek === 'DCS') ? 1 : sayi;
      for (let i = 1; i <= adet; i++) {
        const etiket = `${s.kod}-${ek}-${String(i).padStart(2, '0')}`;
        if (await db.varlik.findUnique({ where: { etiket } })) continue;
        const r = rnd();
        /* Oranlar iyi işletilen bir tesise göre ayarlıdır: filoyu kırmızıya
           boyamak ekranı okunmaz yapar ve "sağlıklı kayıtlar toplanır"
           sözleşmesini bozar. ~%3,5 desteksiz, ~%7 bir yıl içinde bitiyor. */
        /* Ömür ekranında kritik satırlar ASLA kuyruğa toplanmaz; oran
           yükseldiğinde tablo 14 satırlık bir kırmızı duvara dönüyor ve
           5–9 görünür satır bütçesi aşılıyor. İyi işletilen bir filoda
           destek dışı varlık ~%1,5'tir. */
        const eski = r < 0.015;
        const yasli = r >= 0.015 && r < 0.045;
        // Ömür tarihi hiç kaydedilmemiş varlıklar — gerçek veri kalitesi açığı.
        const tarihsiz = r >= 0.045 && r < 0.075;
        const izlemeYok = bolgeTipi === 'ot' && r > 0.92;
        const olusan = await db.varlik.create({
          data: {
            etiket,
            ad: adKalibi.replace('%s', s.ad),
            turId: turler[turKod].id,
            tesisId: s.id,
            sistemId: sistemEslesme.get(s.id) ?? null,
            bolgeId: bolgeIndeksi.get(`${s.id}|${bolgeTipi}`) ?? null,
            kritiklik,
            uretimEtkisi: kritiklik === 'kritik' ? 'uretim_durur' : kritiklik === 'yuksek' ? 'yuksek' : 'dusuk',
            gizlilik: kritiklik === 'kritik' ? 3 : 2,
            butunluk: kritiklik === 'kritik' ? 5 : 3,
            erisilebilirlik: kritiklik === 'kritik' ? 5 : 3,
            uretici: saglayici(rnd),
            kurulumTarihi: gun(-Math.floor(1200 + rnd() * 3200)),
            destekBitis: eski ? gun(-Math.floor(30 + rnd() * 700))
              : yasli ? gun(Math.floor(20 + rnd() * 340)) : gun(Math.floor(400 + rnd() * 1800)),
            /* Üretici ömür tarihini yayımlar; kayıtta bulunmaması bir VERİ
               AÇIĞIDIR, normal hâl değil. Bu yüzden tarih varlığın kendi
               yaşından türetilir ve yalnız birkaç kayıt bilerek boş kalır
               (yeni devralınan sahalar) — envanterin yarısını "tarih eksik"
               göstermek ekranı da bulguyu da anlamsız kılıyordu. */
            eolTarihi: tarihsiz ? null
              : eski ? gun(-Math.floor(60 + rnd() * 800))
              : yasli ? gun(Math.floor(20 + rnd() * 340))
              : gun(Math.floor(500 + rnd() * 2200)),
            eosTarihi: tarihsiz ? null
              : eski ? gun(-Math.floor(20 + rnd() * 700))
              : yasli ? gun(Math.floor(40 + rnd() * 360))
              : gun(Math.floor(600 + rnd() * 2400)),
            yamaDurumu: eski ? 'yamasiz' : yasli ? 'eksik' : rnd() > 0.94 ? 'bilinmiyor' : 'guncel',
            yedekDurumu: bolgeTipi === 'ot' && rnd() > 0.9 ? 'bilinmiyor' : rnd() > 0.07 ? 'var' : 'yok',
            izlemeDurumu: izlemeYok ? 'bilinmiyor' : rnd() > 0.06 ? 'var' : 'yok',
            logKaynagi: izlemeYok ? 'bilinmiyor' : 'var',
            internetMaruziyeti: bolgeTipi === 'kurumsal' ? 'sinirli' : 'yok',
            uzaktanErisim: bolgeTipi !== 'ot' ? true : rnd() > 0.8,
            // Sahipsiz varlık O11'in "atanmadı" durumunu besler.
            sahipId: rnd() > 0.02 ? K[sahipDagitim[Math.floor(rnd() * 5)]].id : null,
            tedarikciId: TD[saglayici(rnd)].id,
            yasamDongusu: eski && rnd() > 0.75 ? 'bakim' : 'aktif',
          },
        });
        varliklar.push({ id: olusan.id, etiket, tesisId: s.id, kritiklik });
      }
    }
  }

  // Merkez BT
  const merkez = T['MERKEZ-BT'];
  if (merkez) {
    for (const [turKod, ek, ad, kritiklik, sayi] of MERKEZ_SABLON) {
      for (let i = 1; i <= sayi; i++) {
        const etiket = `MERKEZ-${ek}-${String(i).padStart(2, '0')}`;
        if (await db.varlik.findUnique({ where: { etiket } })) continue;
        const r = rnd();
        const eski = r < 0.05;
        const olusan = await db.varlik.create({
          data: {
            etiket, ad: `${ad} ${i}`, turId: turler[turKod].id, tesisId: merkez.id,
            bolgeId: bolgeIndeksi.get(`${merkez.id}|kurumsal`) ?? null,
            kritiklik, uretimEtkisi: 'yok',
            uretici: turKod === 'AGCIHAZ' ? 'Cisco Systems' : 'Microsoft',
            kurulumTarihi: gun(-Math.floor(400 + rnd() * 2400)),
            destekBitis: eski ? gun(-Math.floor(20 + rnd() * 500)) : gun(Math.floor(200 + rnd() * 1500)),
            eolTarihi: eski ? gun(-Math.floor(30 + rnd() * 400)) : null,
            eosTarihi: eski ? gun(-Math.floor(10 + rnd() * 380)) : null,
            yamaDurumu: eski ? 'eksik' : 'guncel',
            yedekDurumu: 'var', izlemeDurumu: 'var', logKaynagi: 'var',
            internetMaruziyeti: turKod === 'AGCIHAZ' && ek === 'FW' ? 'var' : 'sinirli',
            uzaktanErisim: true,
            sahipId: K['mehmet.kaya'].id,
            tedarikciId: TD[turKod === 'AGCIHAZ' ? 'Cisco Systems' : 'Microsoft'].id,
          },
        });
        varliklar.push({ id: olusan.id, etiket, tesisId: merkez.id, kritiklik });
      }
    }
  }

  /* Varlık → yazılım kurulumları. EOL'ü geçmiş yazılım, üstünde çalıştığı
     varlığı da riskli kılar; O13'ün "hangi ürün" sütunu buradan gelir. */
  /* Süresi dolmuş ürünler kataloğun %37'si; bunu envantere düz dağıtmak
     varlıkların yarısını desteksiz gösteriyordu. Gerçek bir filoda eski
     sürüm azınlıktadır ve zaten eskimiş donanımla birlikte gelir. */
  const gecmisEos = yazilimAnahtarlari.filter((a) => {
    const t = yazilimTanim.find(([ad, , surum]) => `${ad} ${surum}` === a);
    return t && t[4] != null && t[4] < 0;
  });
  const guncelEos = yazilimAnahtarlari.filter((a) => !gecmisEos.includes(a));
  for (const v of varliklar) {
    const adet = rnd() > 0.55 ? 2 : 1;
    const secilenler = new Set<string>();
    // Varlıkların ~%8'i eski sürüm taşır; kalanı güncel havuzdan seçilir.
    const eskiSurum = rnd() < 0.08;
    for (let i = 0; i < adet; i++) {
      const havuz = eskiSurum && i === 0 ? gecmisEos : guncelEos;
      if (!havuz.length) continue;
      secilenler.add(havuz[Math.floor(rnd() * havuz.length)]);
    }
    for (const anahtar of secilenler) {
      await db.varlikYazilimi.create({
        data: { varlikId: v.id, yazilimId: YZ[anahtar].id },
      }).catch(() => undefined); // aynı ürün iki kez seçilirse yok say
    }
  }

  /* ═══ Zafiyetler ══════════════════════════════════════════════════════ */
  const zafiyetTanim: [string, string, number][] = [
    ['CVE-2023-3595', 'Rockwell ControlLogix üzerinde uzaktan kod çalıştırma', 9.8],
    ['CVE-2022-38465', 'Siemens SIMATIC S7-1200/1500 global özel anahtar ifşası', 9.3],
    ['CVE-2021-44228', 'Apache Log4j uzaktan kod çalıştırma (Log4Shell)', 10.0],
    ['CVE-2024-21762', 'FortiOS SSL-VPN sınır dışı yazma', 9.8],
    ['CVE-2023-34362', 'MOVEit Transfer SQL enjeksiyonu', 9.8],
    ['CVE-2020-1472', 'Netlogon ayrıcalık yükseltme (Zerologon)', 10.0],
    ['CVE-2023-20198', 'Cisco IOS XE web arayüzü yetkisiz erişim', 10.0],
    ['CVE-2022-31814', 'pfSense komut enjeksiyonu', 9.8],
    ['CVE-2024-3400', 'PAN-OS GlobalProtect komut enjeksiyonu', 10.0],
    ['CVE-2019-0708', 'Windows RDP uzaktan kod çalıştırma (BlueKeep)', 9.8],
  ];
  const zafiyetler = [] as { id: string }[];
  for (const [ref, baslik, cvss] of zafiyetTanim) {
    zafiyetler.push(await db.zafiyet.create({
      data: { kaynakRef: ref, baslik, cvss, kesfedildi: gun(-Math.floor(20 + rnd() * 400)) },
    }));
  }
  for (const v of varliklar) {
    if (rnd() > 0.93) {
      const z = zafiyetler[Math.floor(rnd() * zafiyetler.length)];
      await db.varlikZafiyeti.create({
        data: {
          zafiyetId: z.id, varlikId: v.id,
          durum: rnd() > 0.65 ? 'acik' : rnd() > 0.4 ? 'azaltildi' : 'yamalandi',
          sonTarih: gun(Math.floor(-40 + rnd() * 160)),
        },
      }).catch(() => undefined);
    }
  }

  /* ═══ Sertifikalar — O16'nın "21g sertifika doluyor" sinyali ══════════ */
  const kritikVarliklar = varliklar.filter((v) => v.kritiklik === 'kritik');
  const sertifikaTanim: [string, number, string][] = [
    ['Saha VPN geçit sertifikası', 21, 'Zorlu Enerji İç PKI'],
    ['Uzaktan bakım VPN sertifikası', 47, 'Zorlu Enerji İç PKI'],
    ['Historian TLS sertifikası', -9, "Let's Encrypt"],
    ['SCADA istemci sertifikası', 118, 'Zorlu Enerji İç PKI'],
    ['Kurumsal portal TLS', 240, 'DigiCert'],
    ['OPC UA sunucu sertifikası', 63, 'Zorlu Enerji İç PKI'],
    ['Denetçi erişim portalı TLS', 12, 'DigiCert'],
  ];
  for (let i = 0; i < sertifikaTanim.length; i++) {
    const [ad, kalanGun, veren] = sertifikaTanim[i];
    await db.sertifika.create({
      data: {
        ad, veren, bitis: gun(kalanGun),
        varlikId: kritikVarliklar[i % Math.max(1, kritikVarliklar.length)]?.id ?? null,
        durum: kalanGun < 0 ? 'suresi_doldu' : kalanGun <= 30 ? 'yaklasiyor' : 'gecerli',
      },
    });
  }

  /* ═══ Yedekleme & kurtarma (O14) ══════════════════════════════════════
     Santral başına bir politika. Kapsama oranı UYDURULMAZ: ekran bunu
     santralin varlıklarındaki yedekDurumu alanından hesaplar. Buradaki
     kayıtlar koşu geçmişi ve restore testi kanıtıdır.
     "Hiç test edilmemiş" santral 0 gün değil, KAYIT YOKLUĞU ile anlatılır. */
  const testEdilmeyen = new Set(['CILDIR-HES', 'ATAKOY-HES']);
  for (const s of uretimSantralleri.concat(merkez ? [merkez] : [])) {
    const pol = await db.yedeklemePolitikasi.create({
      data: {
        ad: `${s.ad} — kontrol sistemi yedeklemesi`,
        kapsam: s.kod === 'MERKEZ-BT' ? 'Sanallaştırma + dosya + veritabanı' : 'SCADA / DCS konfigürasyon + historian',
        siklik: s.kod === 'MERKEZ-BT' ? 'gunluk' : rnd() > 0.5 ? 'gunluk' : 'haftalik',
        saklamaGun: rnd() > 0.5 ? 90 : 30,
        hedef: rnd() > 0.7 ? 'immutable' : rnd() > 0.35 ? 'uzak' : 'yerel',
        rpoSaat: s.kod === 'MERKEZ-BT' ? 4 : rnd() > 0.5 ? 24 : 168,
        rtoSaat: s.kod === 'MERKEZ-BT' ? 8 : rnd() > 0.5 ? 48 : 72,
        // Kapsam dışı bırakılan kritik sistem O14'ün ana sinyali.
        haricTutulan: rnd() > 0.72
          ? 'Mühendislik istasyonu yerel projeleri; saha PLC programları'
          : null,
      },
    });

    // Son 12 koşu — bazıları başarısız, biri kısmi
    let sonBasarili: { id: string } | null = null;
    for (let i = 11; i >= 0; i--) {
      const r = rnd();
      const durum = r > 0.88 ? 'basarisiz' : r > 0.8 ? 'kismi' : 'basarili';
      const kosu = await db.yedeklemeKosusu.create({
        data: {
          politikaId: pol.id, zaman: gun(-i * 7 - Math.floor(rnd() * 3)),
          durum, boyutMb: durum === 'basarisiz' ? null : Math.round(4000 + rnd() * 90000),
          hata: durum === 'basarisiz' ? 'Hedef depolama erişilemedi (NFS zaman aşımı)' : null,
        },
      });
      if (durum === 'basarili') sonBasarili = kosu;
    }

    // Restore testi: kanıt. Bazı santrallerde hiç yok — bu "test yok"tur.
    if (sonBasarili && !testEdilmeyen.has(s.kod)) {
      const gecmisGun = rnd() > 0.72 ? Math.floor(190 + rnd() * 160) : Math.floor(20 + rnd() * 140);
      await db.geriYuklemeTesti.create({
        data: {
          kosuId: sonBasarili.id, zaman: gun(-gecmisGun),
          sonuc: rnd() > 0.15 ? 'basarili' : 'basarisiz',
          sureDk: Math.floor(35 + rnd() * 260),
          not: gecmisGun > 180
            ? 'Yıllık tatbikat kapsamında; tekrar planlanmadı.'
            : 'Historian ve DCS konfigürasyonu izole ortamda geri yüklendi.',
        },
      });
    }
  }

  await kimlikErisim(db);

  /* ═══ Varlık ilişkileri — O10 / O12 grafiği için ═══════════════════════ */
  for (const s of uretimSantralleri) {
    const sV = varliklar.filter((v) => v.tesisId === s.id);
    const bul = (ek: string) => sV.filter((v) => v.etiket.includes(`-${ek}-`));
    const scada = bul('SCADA')[0]; const hist = bul('HIST')[0];
    const fw = bul('OTFW')[0]; const ews = bul('EWS')[0];
    const iliski = async (a?: { id: string }, b?: { id: string }, tip = 'connects_to') => {
      if (!a || !b) return;
      await db.varlikIliskisi.create({ data: { kaynakId: a.id, hedefId: b.id, tip } })
        .catch(() => undefined);
    };
    await iliski(hist, scada, 'depends_on');
    await iliski(scada, fw, 'connects_to');
    await iliski(ews, scada, 'connects_to');
    for (const plc of bul('PLC')) await iliski(scada, plc, 'connects_to');
    for (const hmi of bul('HMI')) await iliski(hmi, scada, 'depends_on');
  }

  /* Ağ geçitleri — kurumsal → OT DMZ → OT zinciri. Doğrulanmamış geçit
     O12'nin "sapma" sinyalidir. */
  for (const s of uretimSantralleri) {
    const kur = bolgeIndeksi.get(`${s.id}|kurumsal`);
    const dmz = bolgeIndeksi.get(`${s.id}|ot_dmz`);
    const ot = bolgeIndeksi.get(`${s.id}|ot`);
    if (!kur || !dmz || !ot) continue;
    const varMi = await db.agGeciti.count({ where: { kaynakBolgeId: kur, hedefBolgeId: dmz } });
    if (varMi) continue;
    await db.agGeciti.create({
      data: {
        kaynakBolgeId: kur, hedefBolgeId: dmz,
        kontrolVarligi: `${s.kod}-OTFW-01`, protokoller: 'HTTPS, OPC UA',
        onaylandi: true, sonDogrulama: gun(-Math.floor(20 + rnd() * 300)),
      },
    }).catch(() => undefined);
    await db.agGeciti.create({
      data: {
        kaynakBolgeId: dmz, hedefBolgeId: ot,
        kontrolVarligi: `${s.kod}-OTFW-01`, protokoller: 'OPC UA, Modbus/TCP',
        onaylandi: rnd() > 0.25,
        sonDogrulama: rnd() > 0.3 ? gun(-Math.floor(30 + rnd() * 400)) : null,
      },
    }).catch(() => undefined);
  }

  const sayim = {
    varlik: await db.varlik.count(),
    tedarikci: await db.tedarikci.count(),
    hesap: await db.kimlikHesabi.count(),
    politika: await db.yedeklemePolitikasi.count(),
  };
  console.log(
    `Operasyonel veri: ${sayim.varlik} varlık · ${sayim.tedarikci} tedarikçi · ` +
    `${sayim.hesap} hesap · ${sayim.politika} yedekleme politikası`,
  );
}

/* Kimlik & erişim katmanı ayrı fonksiyondur: tanım değiştiğinde tüm
   operasyonel seti yeniden kurmadan yalnız bu tablolar yenilenebilsin. */
export async function kimlikErisim(db: PrismaClient) {
  const rnd = uret(20260901);
  const kullanicilar = await db.kullanici.findMany();
  const K = Object.fromEntries(kullanicilar.map((x) => [x.eposta.split('@')[0], x]));
  const sahipDagitim = ['ahmet.terzi', 'selin.aydin', 'burak.sahin', 'mehmet.kaya', 'zeynep.arslan'];
  const uretimSantralleri = (await db.tesis.findMany({ where: { durum: 'aktif' } }))
    .filter((x) => x.kod !== 'MERKEZ-BT' && !x.kod.startsWith('LULEBURGAZ'));
  const varliklar = (await db.varlik.findMany({
    where: { silindi: null }, select: { id: true, kritiklik: true },
  }));

  /* ═══ Kimlik & erişim (O15) ═══════════════════════════════════════════
     Servis hesapları grup satırı olarak gösterilebilsin diye aynı önekten
     çok sayıda kayıt üretilir (svc-scada-*). Parola rotasyonu olmayan
     ayrıcalıklı servis hesabı ekranın ana sinyalidir. */
  const hesaplar: { id: string; ayricalikli: boolean }[] = [];

  for (let i = 1; i <= 14; i++) {
    const s = uretimSantralleri[i % uretimSantralleri.length];
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: `svc-scada-${String(i).padStart(2, '0')}`,
        tip: 'servis', kaynakSistem: 'AD', ayricalikli: true, tesisId: s.id,
        // rotasyon YOK: alan null bırakılır, ekran bunu bilinmeyen değil
        // "hiç rotasyon yapılmamış" olarak sabit bir sinyalle gösterir
        parolaRotasyon: null,
        sonKullanim: gun(-Math.floor(rnd() * 6)),
        durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: true });
  }
  for (let i = 1; i <= 8; i++) {
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: `svc-hist-${String(i).padStart(2, '0')}`,
        tip: 'servis', kaynakSistem: 'yerel', ayricalikli: false,
        tesisId: uretimSantralleri[(i * 3) % uretimSantralleri.length].id,
        parolaRotasyon: gun(-Math.floor(40 + rnd() * 200)),
        sonKullanim: gun(-Math.floor(rnd() * 12)), durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: false });
  }
  // Atıl yönetici hesapları — 90 günden uzun süredir kullanılmamış
  for (let i = 1; i <= 6; i++) {
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: `adm-ot-${String(i).padStart(2, '0')}`,
        tip: 'kisi', kaynakSistem: 'Entra', ayricalikli: true,
        kullaniciId: i <= 3 ? K[sahipDagitim[i % 5]].id : null,
        tesisId: uretimSantralleri[(i * 5) % uretimSantralleri.length].id,
        parolaRotasyon: gun(-Math.floor(120 + rnd() * 200)),
        sonKullanim: gun(-Math.floor(95 + rnd() * 260)), durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: true });
  }
  // Acil durum ve paylaşımlı hesaplar
  for (const [ad, tip, ayr] of [
    ['break-glass-ot', 'acil_durum', true],
    ['break-glass-bt', 'acil_durum', true],
    ['ops-vardiya', 'paylasimli', false],
    ['bakim-muteahhit', 'paylasimli', true],
  ] as const) {
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: ad, tip, kaynakSistem: 'AD', ayricalikli: ayr,
        parolaRotasyon: ad.startsWith('break') ? gun(-14) : null,
        sonKullanim: ad === 'ops-vardiya' ? gun(-1) : gun(-Math.floor(30 + rnd() * 300)),
        durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: ayr });
  }
  /* SCADA yerel hesapları: ayrıcalık bilgisi ÖLÇÜLMEDİ.
     Kontrol sistemi kendi hesap deposunu tutar ve dizine ayrıcalık
     bayrağı vermez — platformun bunu "ayrıcalıklı değil" diye kaydetmesi
     yanlış olur. Dört hesap yeter: bu bir sinyaldir, gürültü değil. */
  for (const [ad, sistem] of [
    ['scada-hmi-01', 'SCADA yerel'],
    ['scada-eng-01', 'SCADA yerel'],
    ['historian-svc', 'Historian yerel'],
    ['rtu-bakim', 'SCADA yerel'],
  ] as const) {
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: ad, tip: 'servis', kaynakSistem: sistem,
        ayricalikli: null,                       // ÖLÇÜLMEDİ ≠ ayrıcalıksız
        tesisId: uretimSantralleri[0].id,
        /* Rotasyon kaydı VAR: bu dört hesabın tek eksiği ayrıcalık
           bilgisi. Rotasyonu da boş bıraksaydık ekranda "rotasyonsuz
           servis" bulgusu olarak kırmızıya düşer, asıl anlatmak
           istediğimiz "ölçülmedi" durumu görünmez olurdu. */
        parolaRotasyon: gun(-Math.floor(15 + rnd() * 50)),
        sonKullanim: gun(-Math.floor(5 + rnd() * 40)),
        durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: false });   // atama üretimi için
  }
  // Personel hesapları — incelenmiş kuyruğu bunlar oluşturur
  for (const u of kullanicilar) {
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: u.eposta.split('@')[0], tip: 'kisi', kaynakSistem: 'Entra',
        kullaniciId: u.id, ayricalikli: false,
        parolaRotasyon: gun(-Math.floor(20 + rnd() * 70)),
        sonKullanim: gun(-Math.floor(rnd() * 3)), durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: false });
  }
  /* Saha hesapları vardiya sorumlusuna bağlıdır. Sahipsiz bırakılan üç
     hesap gerçek bir bulgudur (görev devri sonrası kalmış), veri artığı
     değil — bu yüzden sayısı kural ile sabitlenir, rastgele değil. */
  for (let i = 1; i <= 34; i++) {
    const sahipsiz = i === 7 || i === 19 || i === 28;
    const h = await db.kimlikHesabi.create({
      data: {
        hesapAdi: `saha-op-${String(i).padStart(2, '0')}`,
        tip: 'kisi', kaynakSistem: 'Entra', ayricalikli: false,
        kullaniciId: sahipsiz ? null : K[sahipDagitim[i % 5]].id,
        tesisId: uretimSantralleri[i % uretimSantralleri.length].id,
        parolaRotasyon: gun(-Math.floor(10 + rnd() * 80)),
        sonKullanim: gun(-Math.floor(rnd() * 20)), durum: 'aktif',
      },
    });
    hesaplar.push({ id: h.id, ayricalikli: false });
  }

  /* Erişim atamaları + dönemsel inceleme. İncelemesi olmayan ayrıcalıklı
     atama "inceleme gecikmesi"ni doğurur; uydurma sayaç yok. */
  const kritikVeYuksek = varliklar.filter((v) => v.kritiklik === 'kritik' || v.kritiklik === 'yuksek');
  for (const h of hesaplar) {
    const adet = h.ayricalikli ? 3 : 1;
    for (let i = 0; i < adet; i++) {
      const v = kritikVeYuksek[Math.floor(rnd() * kritikVeYuksek.length)];
      const verilisGun = Math.floor(60 + rnd() * 900);
      const atama = await db.erisimAtamasi.create({
        data: {
          hesapId: h.id, varlikId: v?.id ?? null,
          kapsam: ['SCADA HMI', 'Historian', 'Etki alanı', 'Güvenlik duvarı yönetimi', 'Yedekleme konsolu'][Math.floor(rnd() * 5)],
          yetkiSeviyesi: h.ayricalikli ? 'yonetici' : rnd() > 0.5 ? 'yazma' : 'okuma',
          verilis: gun(-verilisGun),
        },
      });
      /* Eski atamalar en az bir kez incelenmiş olmalı — aksi hâlde gecikme
         metriği iki buçuk yıl okur ve inceleme döngüsünün hiç işlemediğini
         söyler. İncelenmemiş bırakılanlar son çeyreğin atamalarıdır. */
      const incelenmemis = h.ayricalikli && verilisGun < 120 && rnd() > 0.45;
      if (!incelenmemis) {
        await db.erisimIncelemesi.create({
          data: {
            atamaId: atama.id, inceleyenId: K['mehmet.kaya'].id,
            sonuc: rnd() > 0.12 ? 'onaylandi' : 'kaldirilsin',
            not: rnd() > 0.85 ? 'Vardiya rotasyonu nedeniyle kapsam daraltıldı.' : null,
            zaman: gun(-Math.floor(10 + rnd() * 150)),
          },
        });
      }
    }
  }
}
