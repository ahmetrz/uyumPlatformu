/* Operasyonel KAYIT verisi — üretim üniteleri, değişiklik yönetimi,
   olaylar ve istisna/onay zinciri.

   Bu dosya neden var: Faz 5-6 ekranları yazıldıktan sonra dört ürün
   tablosunun boş olduğu ortaya çıktı (`Degisiklik`, `Olay`, `Istisna`,
   `OnayTalebi`) ve `/operasyon`, `/olaylar`, yönetim tezgâhının onay
   merceği gerçek veriyle hiç görülemedi. Ekranın boş durumu doğru
   çalışıyor olabilir ama dolu durumu doğrulanmamış demektir.

   NE SEED EDİLMEZ — ve bu bilinçlidir:
   Connector'dan gelmesi gereken tablolar (KesifKaydi, VeriKokeni,
   KonfigurasyonYedegi, TopolojiGozlemi, TedarikciErisimOturumu,
   EntegrasyonKosusu, ApiAnahtari…) BOŞ KALIR. Onları doldurmak, kimlik
   bilgisi olmayan bir entegrasyonun çalıştığı izlenimi verirdi — sahte
   entegrasyon yazmıyoruz. Buradaki dört tablo ise İNSANIN doldurduğu
   ürün tablolarıdır; bir uyum platformunda sıfır değişiklik kaydı olması
   gerçekçi değildir.

   Sayılar kural ile sabittir, rastgele değil: her kayıt bir şeyi
   göstermek için var. Sinyal yoğunluğu düşük tutuldu — dokuz değişiklik,
   dört olay, üç istisna. Daha fazlası ekranı gürültüye boğar. */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;

export async function operasyonKayitlari(db: PrismaClient) {
  const gun = (n: number) => new Date(Date.now() + n * G);

  const tesisler = Object.fromEntries(
    (await db.tesis.findMany({ select: { id: true, kod: true } })).map((t) => [t.kod, t.id]),
  );
  const K = Object.fromEntries(
    (await db.kullanici.findMany({ select: { id: true, eposta: true } }))
      .map((u) => [u.eposta.split('@')[0], u.id]),
  );

  /* ═══ 1 · Üretim üniteleri ══════════════════════════════════════════
     Santral seviyesi zaten vardı; ünite seviyesi hiç yoktu. Etki zinciri
     (VARLIK → SİSTEM → SÜREÇ → TESİS) ünite üzerinden geçtiği için bu
     boşluk olay etkisi motorunu da köreltiyordu.

     Kurulu güçler santralin kendi kaydından bölünür: uydurma bir sayı
     yazmak yerine gerçek toplam üniteler arasında paylaştırılır. */
  const uniteTanim: [string, string[]][] = [
    ['KIZILDERE-3', ['Ünite 1', 'Ünite 2', 'Ünite 3']],
    ['KIZILDERE-2', ['Ünite 1', 'Ünite 2']],
    ['KIZILDERE-1', ['Ünite 1']],
    ['ALASEHIR-JES', ['Ünite 1', 'Ünite 2']],
    ['GOKCEDAG-RES', ['Saha A', 'Saha B', 'Saha C']],
    ['SARITEPE-RES', ['Saha A', 'Saha B']],
    ['DEMIRCILER-RES', ['Saha A']],
    ['IKIZDERE-HES', ['Türbin 1', 'Türbin 2']],
    ['BEYKOY-HES', ['Türbin 1', 'Türbin 2']],
    ['CILDIR-HES', ['Türbin 1', 'Türbin 2']],
    ['KUZGUN-HES', ['Türbin 1', 'Türbin 2']],
    ['MERCAN-HES', ['Türbin 1', 'Türbin 2']],
    ['TERCAN-HES', ['Türbin 1']],
    ['ATAKOY-HES', ['Türbin 1']],
    ['ALASEHIR-GES', ['Dizi 1']],
  ];
  let unite = 0;
  for (const [tesisKod, adlar] of uniteTanim) {
    const tesisId = tesisler[tesisKod];
    if (!tesisId) continue;
    const tesis = await db.tesis.findUniqueOrThrow({
      where: { id: tesisId }, select: { kuruluGucMw: true, devreyeGiris: true } });
    // Toplam güç ünitelere eşit paylaştırılır; santral gücü yoksa null kalır.
    const pay = tesis.kuruluGucMw != null
      ? Math.round((tesis.kuruluGucMw / adlar.length) * 100) / 100 : null;
    for (let i = 0; i < adlar.length; i++) {
      const kod = `U${i + 1}`;
      const varOlan = await db.uretimUnitesi.findUnique({
        where: { tesisId_kod: { tesisId, kod } } });
      if (varOlan) continue;
      await db.uretimUnitesi.create({
        data: {
          tesisId, kod, ad: adlar[i], kuruluGucMw: pay,
          devreyeGiris: tesis.devreyeGiris,
          /* Bir ünite planlı bakımda: "hepsi aktif" bir portföy gerçekçi
             değil ve bakımdaki ünite değişiklik penceresi kararlarını
             etkiler. */
          durum: tesisKod === 'KIZILDERE-2' && i === 1 ? 'bakim' : 'aktif',
        },
      });
      unite++;
    }
  }

  /* ═══ 2 · Değişiklik yönetimi ═══════════════════════════════════════
     OT değişikliği BT değişikliğinden farklı kapılardan geçer: sağlayıcı
     onayı, bakım penceresi, geri alma planı ve değişiklik öncesi yedek.
     Kayıtların bir kısmı bu kapıları BİLEREK eksik bırakır — ekranın
     "kapı kapalı" durumunu gösterebilmesi için. */
  const degisiklikTanim: {
    kod: string; baslik: string; tesis: string | null; ot: boolean; durum: string;
    talep: string; onay?: string; plan?: number; varlik?: string;
    saglayici?: boolean | null; pencere?: string; geriAlma?: string; yedek?: boolean | null;
    uretim?: string; dogrulama?: string; aciklama: string;
  }[] = [
    {
      kod: 'DEG-2026-041', baslik: 'Kızıldere III DCS yazılım yaması',
      tesis: 'KIZILDERE-3', ot: true, durum: 'dogrulandi',
      talep: 'burak.sahin', onay: 'ahmet.terzi', plan: -21,
      varlik: 'KIZILDERE3-DCS-01', saglayici: true,
      pencere: '14.08.2026 02:00–06:00 · planlı duruş',
      geriAlma: 'Önceki firmware imajı saha PC\'sinde; geri alma 40 dk.',
      yedek: true, uretim: 'Planlı duruş penceresinde, üretim kaybı yok',
      dogrulama: 'Çevrim sonrası 48 saat izlendi; alarm sayısı taban değerde.',
      aciklama: 'Sağlayıcının kritik güvenlik yaması. Test sisteminde iki hafta koşturuldu.',
    },
    {
      kod: 'DEG-2026-047', baslik: 'OT güvenlik duvarı kural sadeleştirmesi',
      tesis: 'KIZILDERE-3', ot: true, durum: 'onay',
      talep: 'mehmet.kaya', plan: 12, saglayici: null,
      pencere: '12.09.2026 01:00–04:00',
      geriAlma: 'Kural seti dışa aktarıldı; geri yükleme 10 dk.',
      yedek: true, uretim: 'Yok — kural değişikliği trafiği kesmiyor',
      aciklama: 'Kurumsal ağ ile süreç kontrol ağı arasında kalan geniş kurallar daraltılacak. '
        + 'Sağlayıcı onayı henüz alınmadı.',
    },
    {
      kod: 'DEG-2026-052', baslik: 'Gökçedağ türbin SCADA sunucu yenileme',
      tesis: 'GOKCEDAG-RES', ot: true, durum: 'planlandi',
      talep: 'burak.sahin', onay: 'ahmet.terzi', plan: 26,
      varlik: 'GOKCEDAG-RES-SCADA-01', saglayici: true,
      pencere: '26.09.2026 · düşük rüzgâr penceresi',
      geriAlma: 'Eski sunucu iki hafta yerinde bekletilecek.',
      yedek: true, uretim: 'Düşük — saha B geçici olarak elle izlenecek',
      aciklama: 'Destek süresi biten Windows Server sürümü yenileniyor.',
    },
    {
      kod: 'DEG-2026-055', baslik: 'Merkez sanallaştırma ana makinesi bellek artırımı',
      tesis: 'MERKEZ-BT', ot: false, durum: 'uygulandi',
      talep: 'mehmet.kaya', onay: 'ahmet.terzi', plan: -6,
      varlik: 'MERKEZ-ESX-02',
      geriAlma: 'Donanım geri sökülebilir.', yedek: true,
      uretim: 'Yok — BT tarafı',
      aciklama: 'Sanal makine yoğunluğu eşiği aşıldı.',
    },
    {
      kod: 'DEG-2026-058', baslik: 'Ataköy HES operatör istasyonu işletim sistemi yükseltmesi',
      tesis: 'ATAKOY-HES', ot: true, durum: 'talep',
      talep: 'selin.aydin', saglayici: null,
      uretim: 'Değerlendirilmedi',
      aciklama: 'Destek süresi bitmiş istasyon. Sağlayıcı uyumluluk yanıtı bekleniyor; '
        + 'bakım penceresi ve geri alma planı henüz yazılmadı.',
    },
    {
      kod: 'DEG-2026-060', baslik: 'Uzak erişim jump host oturum kaydı zorunlu hâle getirilmesi',
      tesis: null, ot: false, durum: 'onay',
      talep: 'zeynep.arslan', plan: 8,
      geriAlma: 'Yapılandırma sürümlenmiş; geri alma anlık.', yedek: true,
      uretim: 'Yok',
      aciklama: 'Tedarikçi uzak bakım oturumlarında kayıt eksikliği bulgusunun karşılığı.',
    },
    {
      kod: 'DEG-2026-062', baslik: 'Alaşehir JES ünite 2 titreşim izleme kartı değişimi',
      tesis: 'ALASEHIR-JES', ot: true, durum: 'geri_alindi',
      talep: 'burak.sahin', onay: 'ahmet.terzi', plan: -9,
      saglayici: true, pencere: '22.08.2026 03:00–05:00',
      geriAlma: 'Eski kart yerine takıldı.', yedek: true,
      uretim: 'Yok',
      dogrulama: 'Yeni kart beklenmedik alarm üretti; değişiklik geri alındı ve '
        + 'sağlayıcıya bildirildi.',
      aciklama: 'Titreşim izleme kartı yenilenmek istendi.',
    },
    {
      kod: 'DEG-2026-064', baslik: 'Yedekleme politikası saklama süresi uzatımı',
      tesis: null, ot: false, durum: 'planlandi',
      talep: 'zeynep.arslan', onay: 'ahmet.terzi', plan: 15,
      geriAlma: 'Politika sürümlenmiş.', yedek: false,
      uretim: 'Yok',
      aciklama: 'Regülasyon saklama süresi gereği 90 günden 365 güne çıkarılıyor.',
    },
    {
      kod: 'DEG-2026-066', baslik: 'İkizdere HES ağ anahtarı firmware güncellemesi',
      tesis: 'IKIZDERE-HES', ot: true, durum: 'talep',
      talep: 'selin.aydin', saglayici: false,
      uretim: 'Değerlendirilmedi',
      aciklama: 'Sağlayıcı bu firmware sürümünü kontrol sistemiyle uyumlu bulmadı; '
        + 'değişiklik askıda.',
    },
  ];

  let degisiklik = 0;
  for (const d of degisiklikTanim) {
    if (await db.degisiklik.findUnique({ where: { kod: d.kod } })) continue;
    await db.degisiklik.create({
      data: {
        kod: d.kod, baslik: d.baslik, aciklama: d.aciklama,
        tesisId: d.tesis ? tesisler[d.tesis] ?? null : null,
        varlikEtiketi: d.varlik ?? null,
        otMu: d.ot,
        // null = SORULMADI/BİLİNMİYOR; false = sağlayıcı onay VERMEDİ
        saglayiciOnayi: d.saglayici === undefined ? null : d.saglayici,
        bakimPenceresi: d.pencere ?? null,
        geriAlmaPlani: d.geriAlma ?? null,
        onDegisiklikYedegi: d.yedek === undefined ? null : d.yedek,
        uretimEtkisi: d.uretim ?? null,
        sonDogrulama: d.dogrulama ?? null,
        durum: d.durum,
        talepEdenId: K[d.talep] ?? null,
        onaylayanId: d.onay ? K[d.onay] ?? null : null,
        planTarihi: d.plan != null ? gun(d.plan) : null,
      },
    });
    degisiklik++;
  }

  /* ═══ 3 · Olaylar ══════════════════════════════════════════════════
     Etki boyutları AYRI doldurulur ve bir kısmı BİLİNÇLİ olarak null
     bırakılır: bir olayın regülasyon etkisi değerlendirilmemiş olabilir
     ve bunu "yok" yazmak yanlış olur. Ekran bunu `unk` gösterir. */
  const olayTanim: {
    kod: string; baslik: string; tesis: string | null; siddet: string; durum: string;
    bas: number; cozum?: number; kaynak: string; ozet: string;
    uretim?: string; emniyet?: string; regulasyon?: string; siber?: string;
    kokNeden?: string; sinirlama?: string; kurtarma?: string; ogrenilenler?: string;
    bildirim?: boolean;
  }[] = [
    {
      kod: 'OLY-2026-014', baslik: 'Kızıldere III mühendislik istasyonunda zararlı yazılım tespiti',
      tesis: 'KIZILDERE-3', siddet: 'yuksek', durum: 'cozuldu',
      bas: -34, cozum: -31, kaynak: 'siem',
      ozet: 'EDR, taşınabilir bellekten bulaşan bir betiği karantinaya aldı.',
      uretim: 'yok', emniyet: 'yok', siber: 'yuksek', regulasyon: 'orta',
      kokNeden: 'Kontrollü olmayan USB kullanımı; istasyonda port kilidi yoktu.',
      sinirlama: 'İstasyon ağdan ayrıldı, imaj alındı.',
      kurtarma: 'Temiz imajdan geri yüklendi, port kilidi uygulandı.',
      ogrenilenler: 'OT istasyonlarında USB politikası teknik olarak zorlanmalı; '
        + 'yalnız prosedür yeterli değil.',
      bildirim: true,
    },
    {
      kod: 'OLY-2026-019', baslik: 'Gökçedağ RES saha ağında beklenmedik kesinti',
      tesis: 'GOKCEDAG-RES', siddet: 'orta', durum: 'kapali',
      bas: -20, cozum: -20, kaynak: 'operator',
      ozet: 'Saha B ile kontrol merkezi arasındaki bağlantı 40 dakika koptu.',
      uretim: 'dusuk', emniyet: 'yok', siber: 'yok',
      // regulasyonEtkisi bilerek null: değerlendirme yapılmadı
      kokNeden: 'Fiber ek kutusunda gevşek konnektör.',
      sinirlama: 'Türbinler yerel kontrolde kaldı.',
      kurtarma: 'Konnektör yenilendi.',
      ogrenilenler: 'Saha bağlantısında yedek yol yok; risk kütüğüne alındı.',
      bildirim: false,
    },
    {
      kod: 'OLY-2026-023', baslik: 'Tedarikçi uzak bakım oturumu kayıt dışı kaldı',
      tesis: 'KIZILDERE-3', siddet: 'orta', durum: 'mudahale',
      bas: -7, kaynak: 'denetim',
      ozet: 'İç denetim, üç uzak bakım oturumunun oturum kaydını bulamadı.',
      siber: 'orta', uretim: 'yok',
      // emniyet ve regülasyon etkisi HENÜZ değerlendirilmedi
      sinirlama: 'İlgili tedarikçi erişimi jump host üzerinden zorunlu kılındı.',
      bildirim: true,
    },
    {
      kod: 'OLY-2026-026', baslik: 'Merkez yedekleme koşusu üç gün üst üste başarısız',
      tesis: 'MERKEZ-BT', siddet: 'yuksek', durum: 'acik',
      bas: -2, kaynak: 'otomatik_kural',
      ozet: 'Yedekleme platformu üç ardışık gece işi tamamlayamadı; hata mesajı depolama alanı.',
      uretim: 'yok', siber: 'yok',
      bildirim: false,
    },
  ];

  let olay = 0;
  for (const o of olayTanim) {
    if (await db.olay.findUnique({ where: { kod: o.kod } })) continue;
    await db.olay.create({
      data: {
        kod: o.kod, baslik: o.baslik, tip: 'olay',
        tesisId: o.tesis ? tesisler[o.tesis] ?? null : null,
        siddet: o.siddet, durum: o.durum,
        baslangic: gun(o.bas),
        cozum: o.cozum != null ? gun(o.cozum) : null,
        ozet: o.ozet, tespitKaynagi: o.kaynak,
        uretimEtkisi: o.uretim ?? null,
        emniyetEtkisi: o.emniyet ?? null,
        regulasyonEtkisi: o.regulasyon ?? null,
        siberEtki: o.siber ?? null,
        kokNeden: o.kokNeden ?? null,
        sinirlama: o.sinirlama ?? null,
        kurtarma: o.kurtarma ?? null,
        ogrenilenler: o.ogrenilenler ?? null,
        bildirimGerekli: o.bildirim ?? null,
      },
    });
    olay++;
  }

  /* Olay ↔ varlık/sistem/risk/bulgu bağları: etki zinciri ekranının
     girdisi. Bağ kurulamıyorsa SESSİZ GEÇİLİR — uydurma bağ, olmayan bir
     etki zinciri gösterirdi. */
  let bag = 0;
  const bagla = async (
    olayKod: string, etiketler: string[], rol = 'etkilenen',
  ) => {
    const o = await db.olay.findUnique({ where: { kod: olayKod }, select: { id: true } });
    if (!o) return;
    for (const etiket of etiketler) {
      const v = await db.varlik.findFirst({ where: { etiket }, select: { id: true } });
      if (!v) continue;
      const varOlan = await db.olayVarlik.findUnique({
        where: { olayId_varlikId: { olayId: o.id, varlikId: v.id } } });
      if (varOlan) continue;
      await db.olayVarlik.create({ data: { olayId: o.id, varlikId: v.id, rol } });
      bag++;
    }
  };
  await bagla('OLY-2026-014', ['KIZILDERE3-EWS-01', 'KIZILDERE3-DCS-01']);
  await bagla('OLY-2026-019', ['GOKCEDAG-RES-SW-01', 'GOKCEDAG-RES-SCADA-01']);
  await bagla('OLY-2026-023', ['KIZILDERE3-SCADA-01']);
  await bagla('OLY-2026-026', ['MERKEZ-SRV-01', 'MERKEZ-ESX-02']);

  /* ═══ 4 · İstisna ve onay talebi ════════════════════════════════════
     İstisna bir maddenin bir tesiste GEÇİCİ olarak uygulanmadığını
     kaydeder ve onay ister. `OnayTalebi` bu akıştan doğar; tablo boş
     olduğu için yönetim tezgâhının onay merceği hiç görülememişti. */
  const maddeler = await db.madde.findMany({
    where: { kod: { in: ['EPDK-SYM-4.2.1', 'EPDK-SYM-6.1.2', 'EPDK-SYM-8.1.2'] } },
    select: { id: true, kod: true, baslik: true },
  });
  const istisnaTanim: [string, string, string, number, string][] = [
    ['EPDK-SYM-4.2.1', 'ATAKOY-HES',
      'Saha operatör istasyonunun işletim sistemi destek dışı; sağlayıcı uyumlu sürüm '
      + 'yayımlayana kadar ağ ayrıştırması telafi edici kontrol olarak uygulanıyor.',
      120, 'onay_bekliyor'],
    ['EPDK-SYM-6.1.2', 'IKIZDERE-HES',
      'Tedarikçi uzak bakım oturum kaydı için jump host kurulumu DEG-2026-060 ile '
      + 'planlandı; kurulum tamamlanana kadar erişim elle gözetleniyor.',
      60, 'onay_bekliyor'],
    ['EPDK-SYM-8.1.2', 'ALASEHIR-GES',
      'Kanıt yenileme periyodu saha ziyareti takvimine bağlı; bir sonraki ziyarete '
      + 'kadar süre uzatımı talep edildi.',
      45, 'aktif'],
  ];

  let istisna = 0, onay = 0;
  for (const [maddeKod, tesisKod, gerekce, sure, durum] of istisnaTanim) {
    const madde = maddeler.find((m) => m.kod === maddeKod);
    const tesisId = tesisler[tesisKod];
    if (!madde || !tesisId) continue;
    const varOlan = await db.istisna.findFirst({ where: { maddeId: madde.id, tesisId } });
    if (varOlan) continue;
    const kayit = await db.istisna.create({
      data: {
        maddeId: madde.id, tesisId, gerekce,
        bitis: gun(sure), durum,
        onaylayanId: durum === 'aktif' ? K['ahmet.terzi'] ?? null : null,
      },
    });
    istisna++;
    /* Onay talebi YALNIZ onay bekleyen istisna için açılır: onaylanmış
       bir istisnanın kuyrukta durması, kapanmış işi açık göstermek olur. */
    if (durum !== 'onay_bekliyor') continue;
    await db.onayTalebi.create({
      data: {
        tip: 'istisna', kaynakTipi: 'Istisna', kaynakId: kayit.id,
        ozet: `${madde.kod} · ${tesisKod} — ${sure} günlük istisna talebi`,
        talepEdenId: K['selin.aydin'] ?? null,
        durum: 'bekliyor',
        gerekce,
      },
    });
    onay++;
  }

  console.log(
    `Operasyon kayıtları: ${unite} üretim ünitesi · ${degisiklik} değişiklik · `
    + `${olay} olay (${bag} varlık bağı) · ${istisna} istisna · ${onay} onay talebi`,
  );
}
