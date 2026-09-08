/* ═══════════════════════════════════════════════════════════════════════
   SU KİRACISI · TAM VERİ SETİ (Faz A)

   NİÇİN VAR: su merceğinde risk, denetim, doküman, olay ve proje
   ekranları BOŞTU. Boş bir ekran satışta "bu modül yok" diye okunur;
   sektör bağımsızlığı ancak ikinci sektör de DOLU olduğunda kanıtlanır.

   ── KOPYA DEĞİL ───────────────────────────────────────────────────────
   Kayıtlar enerji verisinin sözcük değiştirilmiş hâli değildir. Su
   işinin kendi olayları var: deşarj limiti aşımı, klor dozaj arızası,
   numune zinciri, terfi merkezi uzak erişimi, debi telemetrisi. Bir
   "santral" kaydını "arıtma tesisi" yapmak sektör bağımsızlığını değil
   bul-değiştir'i gösterirdi.

   ── ÇERÇEVE ───────────────────────────────────────────────────────────
   CBDDÖ ve ISO 27001 (önceki karar). Su için mevzuat UYDURULMADI;
   enerjiye özgü EPDK-SYM su kapsamına girmez.

   ── VERİ KURGUSAL ─────────────────────────────────────────────────────
   Hiçbir kurum, tesis, kişi ya da tedarikçi adı gerçek değildir.
   Tedarikçiler jenerik ("Demo Otomasyon", "Demo Laboratuvar").

   ── BİLİNMEYEN ≠ SIFIR ────────────────────────────────────────────────
   Bilerek ölçümsüz bırakılanlar: bir riskin etki değerleri (skor YOK,
   sıfır değil), bir olayın kök nedeni, bir dokümanın son gözden
   geçirme tarihi. Demo, ürünün dürüstlüğünü de göstermeli.
   ═══════════════════════════════════════════════════════════════════════ */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

/* Skor kuralı `lib/eylemler2/risk.ts` ile AYNI: olasılık × en yüksek etki.
   Etki verilmemişse skor da null — bilinmeyen sıfır değildir. */
function skor(olasilik: number | null, etkiler: (number | null | undefined)[]): number | null {
  if (olasilik == null) return null;
  const e = etkiler.filter((x): x is number => x != null);
  if (!e.length) return null;
  return olasilik * Math.max(...e);
}

type SuRisk = {
  kod: string; baslik: string; aciklama: string; tesis?: string;
  tehdit: string; zayiflik: string; kaynak: string;
  olasilik: number | null;
  etki: Partial<Record<'uretim' | 'emniyet' | 'regulasyon' | 'finans' | 'siber' | 'cevre', number>>;
  sahip: string | null; durum: string; islemTipi: string | null;
};

const SU_RISKLERI: SuRisk[] = [
  { kod: 'RSK-SU-001', baslik: 'Deşarj limiti aşımının geç fark edilmesi',
    aciklama: 'Çıkış suyu kalite ölçümü saatlik alınıyor ama eşik aşımı için otomatik '
      + 'uyarı yok; aşım vardiya raporunda görülüyor.',
    tesis: 'SU-B1', tehdit: 'Proses sapması', zayiflik: 'Eşik uyarısı tanımsız',
    kaynak: 'bulgu', olasilik: 4, etki: { regulasyon: 4, cevre: 5, finans: 3 },
    sahip: 'kullanici.c', durum: 'acik', islemTipi: 'azalt' },

  { kod: 'RSK-SU-002', baslik: 'Klor dozaj kontrolüne yetkisiz erişim',
    aciklama: 'Dozaj PLC\'si proses ağında ve varsayılan kimlik bilgisiyle çalışıyor; '
      + 'mühendislik istasyonundan erişilebiliyor.',
    tesis: 'SU-A1', tehdit: 'Yetkisiz değişiklik', zayiflik: 'Varsayılan kimlik bilgisi',
    kaynak: 'bulgu', olasilik: 3, etki: { emniyet: 5, siber: 4, regulasyon: 3 },
    sahip: 'kullanici.c', durum: 'islemde', islemTipi: 'azalt' },

  { kod: 'RSK-SU-003', baslik: 'Terfi merkezi RTU yapılandırmasının kaybı',
    aciklama: 'Uzak terminal birimlerinin yapılandırması yalnız cihaz üstünde; '
      + 'arızada yeniden kurulum saatler alır.',
    tesis: 'SU-C1', tehdit: 'Donanım arızası', zayiflik: 'Yapılandırma yedeği yok',
    kaynak: 'denetim', olasilik: 3, etki: { uretim: 3, finans: 2 },
    sahip: 'kullanici.d', durum: 'acik', islemTipi: 'azalt' },

  /* ÖLÇÜLMEMİŞ RİSK: olasılık biliniyor, etki değerlendirmesi HENÜZ
     YAPILMADI. Skor null döner ve ekran "ölçülmedi" der — sıfır değil,
     "düşük" de değil. Demo bunu göstermeli. */
  { kod: 'RSK-SU-004', baslik: 'Numune zinciri kayıtlarının bütünlüğü',
    aciklama: 'Laboratuvar numune kayıtları elle tutuluyor; kaydın sonradan '
      + 'değiştirilip değiştirilmediği tespit edilemiyor. Etki değerlendirmesi '
      + 'hukuk ve çevre birimleriyle yapılacak.',
    tesis: 'SU-B1', tehdit: 'Kayıt tahrifatı', zayiflik: 'Değişmez kayıt yok',
    kaynak: 'manuel', olasilik: 2, etki: {},
    sahip: null, durum: 'acik', islemTipi: null },

  /* Tesise BAĞLI: tedarikçi erişimi merkez üstünden yönetiliyor. Tesissiz
     bırakılsaydı mercek yüklemi gereği HER mercekte görünürdü (tesissiz
     kayıt kiracıya aittir) ve su işine ait bir risk enerji merceğinde
     de okunurdu — demoda tutarsızlık. */
  { kod: 'RSK-SU-005', baslik: 'Tedarikçi uzak erişiminin oturum kaydı yok',
    aciklama: 'Otomasyon tedarikçisi SCADA\'ya VPN ile bağlanıyor; oturumlar '
      + 'kaydedilmiyor, sonradan kim ne yaptı okunamıyor.',
    tesis: 'SU-MERKEZ-BT',
    tehdit: 'Tedarikçi kaynaklı değişiklik', zayiflik: 'Oturum kaydı yok',
    kaynak: 'denetim', olasilik: 3, etki: { siber: 4, regulasyon: 3 },
    sahip: 'kullanici.d', durum: 'kabul', islemTipi: 'kabul' },
];

type SuOlay = {
  kod: string; baslik: string; tesis: string; siddet: string; durum: string;
  baslangicGun: number; cozumGun: number | null; ozet: string;
  tespitKaynagi: string; uretimEtkisi: string; regulasyonEtkisi: string;
  kokNeden: string | null;
};

const SU_OLAYLARI: SuOlay[] = [
  { kod: 'OLY-SU-001', baslik: 'Deşarj çıkışında askıda katı madde limiti aşıldı',
    tesis: 'SU-B1', siddet: 'yuksek', durum: 'cozuldu',
    baslangicGun: -47, cozumGun: -45,
    ozet: 'Çöktürme havuzu sıyırıcısının durması sonucu çıkış suyunda askıda katı '
      + 'madde eşiği iki saat boyunca aşıldı.',
    tespitKaynagi: 'vardiya', uretimEtkisi: 'dusuk', regulasyonEtkisi: 'yuksek',
    kokNeden: 'Sıyırıcı motorunun termik koruması periyodik bakımda kontrol edilmemiş.' },

  { kod: 'OLY-SU-002', baslik: 'Klor dozaj pompası beklenmedik şekilde durdu',
    tesis: 'SU-A1', siddet: 'kritik', durum: 'kapali',
    baslangicGun: -88, cozumGun: -87,
    ozet: 'Dozaj pompası kontrol sinyali kesildi; şebekeye verilen suda bakiye klor '
      + 'alt sınıra indi, hat izole edildi.',
    tespitKaynagi: 'scada', uretimEtkisi: 'orta', regulasyonEtkisi: 'yuksek',
    kokNeden: 'PLC ile pompa arasındaki analog kart arızası; yedek kart stokta yoktu.' },

  { kod: 'OLY-SU-003', baslik: 'Terfi merkezine tanımsız uzak bağlantı görüldü',
    tesis: 'SU-C1', siddet: 'orta', durum: 'mudahale',
    baslangicGun: -9, cozumGun: null,
    ozet: 'Mesai dışı saatte terfi merkezi ağına kaynağı belirlenemeyen bir oturum '
      + 'açıldı; oturum kaydı olmadığı için ne yapıldığı okunamıyor.',
    tespitKaynagi: 'guvenlik_izleme', uretimEtkisi: 'yok', regulasyonEtkisi: 'orta',
    /* KÖK NEDEN HENÜZ BİLİNMİYOR — inceleme sürüyor. Boş bırakmak,
       uydurulmuş bir sebep yazmaktan dürüsttür. */
    kokNeden: null },

  { kod: 'OLY-SU-004', baslik: 'Debi telemetrisi altı saat veri göndermedi',
    tesis: 'SU-A2', siddet: 'dusuk', durum: 'cozuldu',
    baslangicGun: -21, cozumGun: -21,
    ozet: 'GSM modem oturumu düştü; kesinti süresince debi verisi kaydedilmedi ve '
      + 'o aralık raporlarda "ölçülmedi" olarak duruyor.',
    tespitKaynagi: 'izleme', uretimEtkisi: 'yok', regulasyonEtkisi: 'dusuk',
    kokNeden: 'Operatör tarifesinde oturum zaman aşımı değişmiş; modem yeniden bağlanmıyor.' },
];

const SU_DOKUMANLARI = [
  { kod: 'POL-SU-001', baslik: 'Su Kalitesi İzleme ve Numune Alma Politikası',
    tur: 'politika', durum: 'yururlukte', surum: '2.1',
    yururlukGun: -300, gozdenGecirmeAy: 12, sonGozdenGecirmeGun: -300 },
  { kod: 'PRS-SU-002', baslik: 'Deşarj Limiti Aşımı Müdahale Prosedürü',
    tur: 'prosedur', durum: 'yururlukte', surum: '1.3',
    yururlukGun: -210, gozdenGecirmeAy: 12, sonGozdenGecirmeGun: -210 },
  { kod: 'PRS-SU-003', baslik: 'SCADA ve PLC Erişim Yönetimi Prosedürü',
    tur: 'prosedur', durum: 'incelemede', surum: '0.9',
    yururlukGun: null, gozdenGecirmeAy: 12, sonGozdenGecirmeGun: null },
  { kod: 'TLM-SU-004', baslik: 'Klor Dozaj Sistemi Bakım Talimatı',
    tur: 'talimat', durum: 'yururlukte', surum: '1.0',
    /* GÖZDEN GEÇİRME TARİHİ YOK: belge yürürlükte ama periyodik gözden
       geçirmesi hiç kaydedilmemiş. Ekran "—" der; bugünü yazmak
       ölçülmemiş bir tarihi ölçülmüş göstermek olurdu. */
    yururlukGun: -430, gozdenGecirmeAy: 12, sonGozdenGecirmeGun: null },
  { kod: 'PLN-SU-005', baslik: 'Arıtma Tesisi Süreklilik ve Acil Durum Planı',
    tur: 'plan', durum: 'askida', surum: '2.0',
    yururlukGun: -520, gozdenGecirmeAy: 24, sonGozdenGecirmeGun: -520 },
];

const SU_TEDARIKCILERI = [
  { ad: 'Demo Otomasyon Sistemleri', tip: 'ot_saglayici', uzaktanErisimVar: true,
    uzaktanErisimYontemi: 'VPN + atlama sunucusu', oturumKaydiVar: false, kritiklik: 'kritik' },
  { ad: 'Demo Laboratuvar Hizmetleri', tip: 'hizmet', uzaktanErisimVar: false,
    uzaktanErisimYontemi: null, oturumKaydiVar: null, kritiklik: 'orta' },
  { ad: 'Demo Pompa ve Ekipman', tip: 'donanim', uzaktanErisimVar: false,
    uzaktanErisimYontemi: null, oturumKaydiVar: null, kritiklik: 'dusuk' },
];

export async function suVeriSeti(db: PrismaClient) {
  const T = Object.fromEntries((await db.tesis.findMany()).map((x) => [x.kod, x]));
  const K = Object.fromEntries(
    (await db.kullanici.findMany()).map((x) => [x.eposta.split('@')[0], x]),
  );
  const sayim = { risk: 0, olay: 0, dokuman: 0, denetim: 0, proje: 0, tedarikci: 0 };

  /* ── RİSKLER ─────────────────────────────────────────────────────── */
  for (const r of SU_RISKLERI) {
    const etkiler = [r.etki.uretim, r.etki.emniyet, r.etki.regulasyon,
      r.etki.finans, r.etki.siber, r.etki.cevre];
    await db.risk.create({ data: {
      kod: r.kod, baslik: r.baslik, aciklama: r.aciklama, kaynak: r.kaynak,
      tesisId: r.tesis ? T[r.tesis]?.id ?? null : null,
      tehdit: r.tehdit, zayiflik: r.zayiflik,
      olasilik: r.olasilik,
      etkiUretim: r.etki.uretim ?? null, etkiEmniyet: r.etki.emniyet ?? null,
      etkiRegulasyon: r.etki.regulasyon ?? null, etkiFinans: r.etki.finans ?? null,
      etkiSiber: r.etki.siber ?? null,
      /* DOĞAL ve ARTIK risk, motor kuralıyla AYNI şekilde hesaplanır
         (`lib/eylemler2/risk.ts`): olasılık × en yüksek etki. Etkisi
         girilmemiş risk null taşır ve ekran "ölçülmedi" der.

         Artık risk, mevcut kontroller işe yarıyorsa doğaldan DÜŞÜKTÜR;
         kontrolü olmayan riskte ikisi eşittir. Uydurulmuş bir düşüş,
         ürünün en kritik sayısını yalancı yapardı. */
      dogalRisk: skor(r.olasilik, etkiler),
      artikRisk: r.durum === 'kabul' ? skor(r.olasilik, etkiler)
        : (() => { const s = skor(r.olasilik, etkiler); return s === null ? null : Math.max(1, s - 3); })(),
      mevcutKontroller: r.durum === 'kabul' ? null : 'Erişim kontrolü ve periyodik gözden geçirme',
      kabulBitis: r.durum === 'kabul' ? gun(120) : null,
      sahipId: r.sahip ? K[r.sahip]?.id ?? null : null,
      durum: r.durum, islemTipi: r.islemTipi,
    } });
    sayim.risk++;
  }

  /* ── OLAYLAR ─────────────────────────────────────────────────────── */
  for (const o of SU_OLAYLARI) {
    await db.olay.create({ data: {
      kod: o.kod, baslik: o.baslik, tesisId: T[o.tesis]?.id ?? null,
      siddet: o.siddet, durum: o.durum,
      baslangic: gun(o.baslangicGun),
      cozum: o.cozumGun === null ? null : gun(o.cozumGun),
      ozet: o.ozet, tespitKaynagi: o.tespitKaynagi,
      uretimEtkisi: o.uretimEtkisi, regulasyonEtkisi: o.regulasyonEtkisi,
      kokNeden: o.kokNeden,
    } });
    sayim.olay++;
  }

  /* ── DOKÜMANLAR ──────────────────────────────────────────────────── */
  for (const d of SU_DOKUMANLARI) {
    await db.dokuman.create({ data: {
      kod: d.kod, baslik: d.baslik, tur: d.tur, durum: d.durum, surum: d.surum,
      sahipId: K['kullanici.b']?.id ?? null,
      onaylayanId: d.durum === 'yururlukte' ? K['kullanici.a']?.id ?? null : null,
      yururlukTarihi: d.yururlukGun === null ? null : gun(d.yururlukGun),
      gozdenGecirmeAy: d.gozdenGecirmeAy,
      sonGozdenGecirme: d.sonGozdenGecirmeGun === null ? null : gun(d.sonGozdenGecirmeGun),
      sonrakiGozdenGecirme: d.sonGozdenGecirmeGun === null ? null
        : gun(d.sonGozdenGecirmeGun + d.gozdenGecirmeAy * 30),
    } });
    sayim.dokuman++;
  }

  /* ── TEDARİKÇİLER ────────────────────────────────────────────────── */
  for (const t of SU_TEDARIKCILERI) {
    await db.tedarikci.create({ data: t });
    sayim.tedarikci++;
  }

  /* ── DENETİMLER — biri KAPANMIŞ, biri AÇIK ───────────────────────────
     Durum farklılığı demonun ölçütü: tek durumlu bir liste, durumun
     ekranda nasıl göründüğünü gösteremez. */
  const surecCbddo = await db.uyumSureci.findUnique({ where: { kod: 'CBDDO-SU-2026' } });
  const surecIso = await db.uyumSureci.findUnique({ where: { kod: 'ISO-27001-SU-2026' } });

  const denetimKapali = await db.denetim.create({ data: {
    kod: 'DEN-SU-2025-1', ad: 'Su Portföyü İç Denetimi · 2025 Dönemi',
    tip: 'ic_denetim', denetleyen: 'İç Denetim Birimi',
    surecId: surecIso?.id ?? null, durum: 'kapanis',
    planBaslangic: gun(-260), planBitis: gun(-200),
  } });
  const denetimAcik = await db.denetim.create({ data: {
    kod: 'DEN-SU-2026-1', ad: 'CBDDÖ Yerinde Denetim Hazırlığı · Su',
    tip: 'oz_degerlendirme', denetleyen: 'Uyum ve Regülasyon',
    surecId: surecCbddo?.id ?? null, durum: 'kanit_talebi',
    planBaslangic: gun(-40), planBitis: gun(35),
  } });
  sayim.denetim = 2;

  for (const [denetim, tesisler] of [
    [denetimKapali, ['SU-MERKEZ-BT', 'SU-B1']],
    [denetimAcik, ['SU-MERKEZ-BT', 'SU-A1', 'SU-B1']],
  ] as const) {
    for (const tk of tesisler) {
      if (T[tk]) await db.denetimKapsami.create({
        data: { denetimId: denetim.id, tesisId: T[tk].id } });
    }
  }

  /* Kanıt talepleri — açık denetimde ikisi bekliyor biri sağlandı;
     kapanmış denetimde hepsi sağlandı. */
  const talepler = [
    { d: denetimAcik, baslik: 'Proses ağı topoloji şeması', durum: 'acik', sonGun: 10 },
    { d: denetimAcik, baslik: 'PLC ve RTU envanteri', durum: 'acik', sonGun: -3 },
    { d: denetimAcik, baslik: 'Yetkilendirme onay kayıtları (son 6 ay)', durum: 'saglandi', sonGun: -12 },
    { d: denetimKapali, baslik: 'Numune zinciri kayıt örnekleri', durum: 'saglandi', sonGun: -230 },
    { d: denetimKapali, baslik: 'Deşarj izleme raporları', durum: 'saglandi', sonGun: -225 },
  ];
  for (const t of talepler) {
    await db.kanitTalebi.create({ data: {
      denetimId: t.d.id, baslik: t.baslik, durum: t.durum,
      sorumluId: K['kullanici.c']?.id ?? null, sonTarih: gun(t.sonGun),
    } });
  }

  /* ── PROJELER — biri devam, biri tamamlandı, biri gecikmiş kilometre
     taşı taşıyor. */
  const projeler = [
    { kod: 'PRJ-SU-001', ad: 'Proses ağı segmentasyonu · su sahaları',
      tip: 'ot', durum: 'devam', baslangicGun: -60, hedefGun: 90,
      gerekce: 'CBDDÖ 3.1 ve iki açık bulgu; atıksu SCADA ağı kurumsal ağdan ayrılacak.',
      taslar: [
        { ad: 'Mevcut topoloji çıkarıldı', hedefGun: -30, gerceklesenGun: -32, durum: 'tamamlandi' },
        { ad: 'Geçiş kuralları tanımlandı', hedefGun: -5, gerceklesenGun: null, durum: 'gecikti' },
        { ad: 'Saha uygulaması', hedefGun: 75, gerceklesenGun: null, durum: 'planlandi' },
      ] },
    { kod: 'PRJ-SU-002', ad: 'RTU yapılandırma yedekleme hattı',
      tip: 'altyapi', durum: 'devam', baslangicGun: -25, hedefGun: 60,
      gerekce: 'ISO 27001 A.8.9; terfi merkezlerinde yapılandırma yedeği yok.',
      taslar: [
        { ad: 'Yedekleme aracı seçimi', hedefGun: -10, gerceklesenGun: -11, durum: 'tamamlandi' },
        { ad: 'Pilot: iki terfi merkezi', hedefGun: 30, gerceklesenGun: null, durum: 'planlandi' },
      ] },
    { kod: 'PRJ-SU-003', ad: 'Deşarj eşiği otomatik uyarı sistemi',
      tip: 'iyilestirme', durum: 'tamamlandi', baslangicGun: -180, hedefGun: -60,
      gerekce: 'Deşarj limiti aşımı olayı (OLY-SU-001) sonrası açıldı.',
      taslar: [
        { ad: 'Eşik kuralları tanımlandı', hedefGun: -120, gerceklesenGun: -125, durum: 'tamamlandi' },
        { ad: 'Uyarı hattı devreye alındı', hedefGun: -65, gerceklesenGun: -62, durum: 'tamamlandi' },
      ] },
  ];
  for (const p of projeler) {
    const proje = await db.proje.create({ data: {
      kod: p.kod, ad: p.ad, tip: p.tip, durum: p.durum, gerekce: p.gerekce,
      baslangic: gun(p.baslangicGun), hedef: gun(p.hedefGun),
      sahipId: K['kullanici.d']?.id ?? null,
    } });
    for (const t of p.taslar) {
      await db.kilometreTasi.create({ data: {
        projeId: proje.id, ad: t.ad, hedef: gun(t.hedefGun),
        gerceklesen: t.gerceklesenGun === null ? null : gun(t.gerceklesenGun),
        durum: t.durum,
      } });
    }
    sayim.proje++;
  }

  /* Projeleri risklere bağla: "bu projeyi neden yapıyoruz" zinciri
     ekranda kapansın. */
  const R = Object.fromEntries((await db.risk.findMany({
    where: { kod: { startsWith: 'RSK-SU-' } }, select: { id: true, kod: true },
  })).map((x) => [x.kod, x]));
  const P = Object.fromEntries((await db.proje.findMany({
    where: { kod: { startsWith: 'PRJ-SU-' } }, select: { id: true, kod: true },
  })).map((x) => [x.kod, x]));
  const baglar = [
    ['PRJ-SU-001', 'RSK-SU-002', 'Dozaj kontrolüne erişim proses ağı ayrımıyla daralır.'],
    ['PRJ-SU-002', 'RSK-SU-003', 'Yapılandırma yedeği arıza sonrası kurtarma süresini düşürür.'],
    ['PRJ-SU-003', 'RSK-SU-001', 'Otomatik eşik uyarısı aşımın geç fark edilmesini engeller.'],
  ] as const;
  for (const [pk, rk, gerekce] of baglar) {
    if (P[pk] && R[rk]) await db.projeBaglantisi.create({
      data: { projeId: P[pk].id, riskId: R[rk].id, gerekce } });
  }

  return sayim;
}
