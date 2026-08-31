/* Denetim ve dönüşüm portföyü başlangıç verisi — Faz 5, O5/O6 (denetim) ve
   O8/O9 (proje) ekranları için.

   Onaylı tasarım denetim ekranında bir zaman çizelgesi ve üç denetim,
   proje ekranında dokuz proje ile bütçe sapması ve faz planı gösteriyor.
   Üründe bir denetim ve üç proje vardı; faz, bütçe ve bağımlılık kaydı hiç
   yoktu — bu ekranların ana kolonları boş kalıyordu.

   Projelerin "varoluş gerekçesi" uydurulmaz: ProjeBaglantisi üzerinden
   madde / bulgu / risk / varlık zincirinden türer. gerekce alanı bu zincirin
   tek cümlelik özetidir. */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

export async function denetimVeProje(db: PrismaClient) {
  const K = Object.fromEntries(
    (await db.kullanici.findMany()).map((x) => [x.eposta.split('@')[0], x]),
  );
  const T = Object.fromEntries(
    (await db.tesis.findMany()).map((x) => [x.kod, x]),
  );
  const M = Object.fromEntries(
    (await db.madde.findMany({ select: { id: true, kod: true } })).map((x) => [x.kod, x]),
  );
  const S = Object.fromEntries(
    (await db.uyumSureci.findMany()).map((x) => [x.kod, x]),
  );
  const riskler = Object.fromEntries(
    (await db.risk.findMany({ select: { id: true, kod: true } })).map((x) => [x.kod, x]),
  );

  /* ═══ Denetimler ══════════════════════════════════════════════════════
     Mevcut CBDDÖ denetimi korunur; yanına bir ISO gözetim denetimi ve bir
     iç denetim eklenir. Aşamalar gerçek: biri kanıt topluyor, biri sahada,
     biri planda. */
  const denetimTanim: [string, string, string, string, string, number, number, string[]][] = [
    ['DEN-2026-ISO-GOZ', 'ISO 27001 Gözetim Denetimi', 'dis_denetim', 'BSI Türkiye',
      'saha', -3, 4, ['MERKEZ-BT', 'KIZILDERE-3']],
    ['DEN-2026-IC-OT', 'OT Güvenliği İç Denetimi', 'ic_denetim', 'İç Denetim Birimi',
      'plan', 62, 74, ['GOKCEDAG-RES', 'SARITEPE-RES', 'KIZILDERE-2']],
  ];

  const denetimler: Record<string, { id: string }> = {};
  for (const d of await db.denetim.findMany({ select: { id: true, kod: true } })) {
    denetimler[d.kod] = d;
  }

  for (const [kod, ad, tip, denetleyen, durum, bas, bit, tesisKodlari] of denetimTanim) {
    if (denetimler[kod]) continue;
    const surecKod = kod.includes('ISO') ? 'ISO-27001-2026' : 'EPDK-SYM-2026';
    const den = await db.denetim.create({
      data: {
        kod, ad, tip, denetleyen, durum,
        surecId: S[surecKod]?.id ?? null,
        planBaslangic: gun(bas), planBitis: gun(bit),
      },
    });
    denetimler[kod] = den;
    for (const tk of tesisKodlari) {
      if (!T[tk]) continue;
      await db.denetimKapsami.create({ data: { denetimId: den.id, tesisId: T[tk].id } });
    }
  }

  /* Kanıt talepleri — tasarımda 11 karşılanmış talep kuyruğa toplanıyor,
     gecikmiş olanlar sıralamadan bağımsız üstte kalıyor. */
  const talepTanim: [string, string, string, string, number, string][] = [
    ['DEN-2026-CBDDO', 'Ağ bölge ve geçit envanteri', 'Onaylı topoloji şeması ve geçit kuralları listesi', 'saglandi', -12, 'burak.sahin'],
    ['DEN-2026-CBDDO', 'Ayrıcalıklı hesap listesi', 'Servis ve yönetici hesapları, son inceleme kayıtlarıyla', 'acik', -4, 'mehmet.kaya'],
    ['DEN-2026-CBDDO', 'Yama yönetimi prosedürü', 'OT varlıklarında yama penceresi ve telafi edici kontroller', 'acik', 9, 'burak.sahin'],
    ['DEN-2026-CBDDO', 'Olay müdahale tatbikat kaydı', 'Son 12 ayda yapılan tatbikatın raporu', 'acik', -1, 'selin.aydin'],
    ['DEN-2026-CBDDO', 'Yedekleme ve geri yükleme test kayıtları', 'Santral bazında son restore testi sonuçları', 'acik', 16, 'zeynep.arslan'],
    ['DEN-2026-CBDDO', 'Tedarikçi uzaktan erişim kayıtları', 'Oturum kaydı örnekleri ve saklama süresi', 'acik', 23, 'mehmet.kaya'],
    ['DEN-2026-ISO-GOZ', 'Bilgi varlıkları envanteri', 'Güncel envanter dışa aktarımı ve sahiplik bilgisi', 'saglandi', -20, 'ahmet.terzi'],
    ['DEN-2026-ISO-GOZ', 'Risk değerlendirme metodolojisi', 'Doğal/artık risk hesabı ve kabul eşikleri', 'saglandi', -18, 'ahmet.terzi'],
    ['DEN-2026-ISO-GOZ', 'Konfigürasyon yönetimi kanıtı', 'Temel konfigürasyon ve sapma raporu', 'saglandi', -15, 'burak.sahin'],
    ['DEN-2026-ISO-GOZ', 'Erişim inceleme kayıtları', 'Dönemsel inceleme çıktıları ve kaldırılan yetkiler', 'saglandi', -11, 'mehmet.kaya'],
    ['DEN-2026-ISO-GOZ', 'İzleme faaliyetleri kanıtı', 'Log toplama kapsamı ve uyarı örnekleri', 'acik', 2, 'selin.aydin'],
    ['DEN-2026-ISO-GOZ', 'Düzeltici faaliyet takibi', 'Önceki denetim bulgularının kapanış kanıtları', 'saglandi', -8, 'zeynep.arslan'],
    ['DEN-2026-IC-OT', 'Saha PLC envanteri', 'Rüzgâr ve jeotermal sahalarda PLC/HMI listesi', 'acik', 40, 'burak.sahin'],
    ['DEN-2026-IC-OT', 'Uzak bakım onay akışı', 'Tedarikçi erişim talep ve onay kayıtları', 'acik', 45, 'mehmet.kaya'],
    ['DEN-2026-IC-OT', 'Bölge güvenlik seviyesi ataması', 'IEC 62443 bölge/geçit dokümanı', 'acik', 52, 'burak.sahin'],
  ];

  const varOlanTalepler = new Set(
    (await db.kanitTalebi.findMany({ select: { baslik: true } })).map((x) => x.baslik),
  );
  for (const [denKod, baslik, aciklama, durum, sonGun, sorumlu] of talepTanim) {
    if (varOlanTalepler.has(baslik)) continue;
    const den = denetimler[denKod];
    if (!den) continue;
    await db.kanitTalebi.create({
      data: {
        denetimId: den.id, baslik, aciklama, durum,
        sonTarih: gun(sonGun), sorumluId: K[sorumlu]?.id ?? null,
      },
    });
  }

  /* ═══ Dönüşüm portföyü ════════════════════════════════════════════════
     [kod, ad, tip, durum, başlangıç, hedef, sahip, gerekçe] */
  const projeTanim: [string, string, string, string, number, number, string, string][] = [
    ['PRJ-YEDEK-DR', 'Yedekleme ve Kurtarma Programı', 'altyapi', 'devam', -150, 210, 'zeynep.arslan',
      'Yedek kapsamı ve geri yükleme testi kontrolleri dört sahada kısmi; iki santralde hiç restore testi yok.'],
    ['PRJ-UZAK-BAKIM', 'Tedarikçi Uzak Bakım Kontrolü', 'guvenlik', 'devam', -90, 120, 'mehmet.kaya',
      'Üç tedarikçinin uzaktan erişiminde oturum kaydı yok; EPDK-SYM-6.1.2 uyumsuz.'],
    ['PRJ-EOS-YENILEME', 'Kontrol Sistemi Yenileme Dalgası 1', 'ot', 'devam', -60, 330, 'burak.sahin',
      'Destek süresi biten kontrol sistemi varlıkları üretim durduran kritiklikte; telafi edici kontrol yetersiz.'],
    ['PRJ-ENVANTER', 'Varlık Envanteri Güveni', 'iyilestirme', 'devam', -200, 60, 'ahmet.terzi',
      'Envanter güncelliği ve kritiklik sınıflandırması kontrollerinde kanıt bayat.'],
    ['PRJ-LOG-OT', 'OT Log Toplama Yaygınlaştırma', 'guvenlik', 'beklemede', -40, 260, 'selin.aydin',
      'OT bölgelerinde log kaynağı bilinmeyen varlıklar var; olay görünürlüğü riski açık.'],
    ['PRJ-YAMA', 'OT Yama Yönetimi Çerçevesi', 'ot', 'planlandi', 30, 400, 'burak.sahin',
      'Yamasız kritik varlıklar için tanımlı pencere ve telafi edici kontrol kaydı yok.'],
  ];

  const varOlanProjeler = new Set(
    (await db.proje.findMany({ select: { kod: true } })).map((x) => x.kod),
  );
  const yeniProjeler: Record<string, { id: string }> = {};
  for (const [kod, ad, tip, durum, bas, hed, sahip, gerekce] of projeTanim) {
    if (varOlanProjeler.has(kod)) continue;
    yeniProjeler[kod] = await db.proje.create({
      data: {
        kod, ad, tip, durum, gerekce,
        baslangic: gun(bas), hedef: gun(hed),
        sahipId: K[sahip]?.id ?? null,
      },
    });
  }

  const tumProjeler = Object.fromEntries(
    (await db.proje.findMany({ select: { id: true, kod: true } })).map((x) => [x.kod, x]),
  );

  // Var olan üç projenin gerekçesi boştu; zincirden tek cümleye indiriliyor.
  const eskiGerekce: [string, string][] = [
    ['PRJ-OT-SEG', 'Kurumsal ağ ile süreç kontrol ağı arasında düz L2 geçiş var; SCADA segmentasyonu iki sahada uyumsuz.'],
    ['PRJ-PAM', 'Parola rotasyonu hiç yapılmamış ayrıcalıklı servis hesapları ve atıl yönetici hesapları mevcut.'],
    ['PRJ-SIEM-OT', 'OT olaylarında görünürlük yok; izleme durumu bilinmeyen varlıklar risk kütüğünde açık.'],
  ];
  for (const [kod, gerekce] of eskiGerekce) {
    if (!tumProjeler[kod]) continue;
    await db.proje.update({ where: { id: tumProjeler[kod].id }, data: { gerekce } });
  }

  /* Bütçe — sapma tasarımın metriklerinden biri (+%12). Harcanan planlananı
     aşan proje riskte sayılır; bu ekranda tek başına renk taşıyan sayıdır. */
  const butceTanim: [string, number, number][] = [
    ['PRJ-OT-SEG', 18_500_000, 20_720_000],
    ['PRJ-PAM', 6_400_000, 5_900_000],
    ['PRJ-SIEM-OT', 11_200_000, 2_100_000],
    ['PRJ-YEDEK-DR', 9_800_000, 9_120_000],
    ['PRJ-UZAK-BAKIM', 3_100_000, 3_640_000],
    ['PRJ-EOS-YENILEME', 42_000_000, 17_400_000],
    ['PRJ-ENVANTER', 2_700_000, 2_540_000],
    ['PRJ-LOG-OT', 7_600_000, 1_050_000],
    ['PRJ-YAMA', 4_300_000, 0],
  ];
  for (const [kod, planlanan, harcanan] of butceTanim) {
    const p = tumProjeler[kod];
    if (!p) continue;
    await db.butce.create({
      data: { projeId: p.id, yil: 2026, tip: 'capex', planlanan, harcanan },
    }).catch(() => undefined);
  }

  /* Faz planı — O9'un beş yığılı kartı. Bloke faz kırmızı kenar ve tek
     satırlık engel notu alır; "gecikti" durumu bunu taşır. */
  const fazSablonu: [string, number, string][] = [
    ['Kapsam ve tasarım', -120, 'tamamlandi'],
    ['Pilot saha', -40, 'tamamlandi'],
    ['Yaygınlaştırma dalgası 1', 20, 'planlandi'],
    ['Yaygınlaştırma dalgası 2', 140, 'planlandi'],
    ['Doğrulama ve kapanış', 240, 'planlandi'],
  ];
  const gecikenFaz: Record<string, number> = {
    'PRJ-OT-SEG': 2, 'PRJ-UZAK-BAKIM': 1, 'PRJ-LOG-OT': 2,
  };
  for (const [kod, p] of Object.entries(tumProjeler)) {
    const mevcut = await db.kilometreTasi.count({ where: { projeId: p.id } });
    if (mevcut > 0) continue;
    for (let i = 0; i < fazSablonu.length; i++) {
      const [ad, kayma, durum] = fazSablonu[i];
      const gecikti = gecikenFaz[kod] === i;
      await db.kilometreTasi.create({
        data: {
          projeId: p.id, ad, hedef: gun(kayma),
          durum: gecikti ? 'gecikti' : durum,
          gerceklesen: durum === 'tamamlandi' && !gecikti ? gun(kayma + 4) : null,
        },
      });
    }
  }

  /* Bağımlılıklar — O9 panelindeki "bağımlılık" alanı ve O8'in aday
     projelerini birbirine bağlar. */
  const bagimlilik: [string, string][] = [
    ['PRJ-SIEM-OT', 'PRJ-OT-SEG'],
    ['PRJ-UZAK-BAKIM', 'PRJ-PAM'],
    ['PRJ-YAMA', 'PRJ-ENVANTER'],
    ['PRJ-EOS-YENILEME', 'PRJ-ENVANTER'],
    ['PRJ-YEDEK-DR', 'PRJ-ENVANTER'],
  ];
  for (const [a, b] of bagimlilik) {
    if (!tumProjeler[a] || !tumProjeler[b]) continue;
    await db.projeBagimliligi.create({
      data: { projeId: tumProjeler[a].id, bagimliProjeId: tumProjeler[b].id },
    }).catch(() => undefined);
  }

  /* Varoluş zinciri — projenin neden var olduğunu gösteren bağlantılar.
     Ekran gerekçeyi bu zincirden sayar ("7 kontrol · 3 risk · 4 bulgu"). */
  const zincir: [string, { madde?: string; risk?: string; tesis?: string }[]][] = [
    ['PRJ-YEDEK-DR', [
      { madde: 'EPDK-SYM-8.1.1' }, { madde: 'EPDK-SYM-8.1.2' }, { madde: 'EPDK-SYM-8.2.1' },
      { tesis: 'KIZILDERE-3' }, { tesis: 'GOKCEDAG-RES' },
    ]],
    ['PRJ-UZAK-BAKIM', [
      { madde: 'EPDK-SYM-6.1.2' }, { madde: 'EPDK-SYM-4.2.2' }, { risk: 'RSK-2026-001' },
    ]],
    ['PRJ-EOS-YENILEME', [
      { madde: 'EPDK-SYM-4.1.1' }, { risk: 'RSK-2026-001' }, { tesis: 'KIZILDERE-3' },
    ]],
    ['PRJ-ENVANTER', [
      { madde: 'EPDK-SYM-4.1.1' }, { madde: 'EPDK-SYM-4.1.2' }, { risk: 'RSK-2026-004' },
    ]],
    ['PRJ-LOG-OT', [
      { madde: 'EPDK-SYM-7.1.4' }, { risk: 'RSK-2026-002' }, { tesis: 'GOKCEDAG-RES' },
    ]],
    ['PRJ-YAMA', [
      { madde: 'EPDK-SYM-6.2.1' }, { risk: 'RSK-2026-001' },
    ]],
  ];
  for (const [kod, baglar] of zincir) {
    const p = tumProjeler[kod];
    if (!p) continue;
    for (const b of baglar) {
      await db.projeBaglantisi.create({
        data: {
          projeId: p.id,
          maddeId: b.madde ? M[b.madde]?.id ?? null : null,
          riskId: b.risk ? riskler[b.risk]?.id ?? null : null,
          tesisId: b.tesis ? T[b.tesis]?.id ?? null : null,
        },
      }).catch(() => undefined);
    }
  }

  console.log(
    `Denetim & proje: ${await db.denetim.count()} denetim · ` +
    `${await db.kanitTalebi.count()} kanıt talebi · ${await db.proje.count()} proje · ` +
    `${await db.kilometreTasi.count()} faz · ${await db.butce.count()} bütçe kaydı`,
  );
}
