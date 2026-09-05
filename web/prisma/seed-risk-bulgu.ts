/* Risk kütüğü ve bulgu/CAPA başlangıç verisi — Faz 5, O3/O4 ve O7 ekranları.

   Üründe dört risk ve beş bulgu vardı. On beş santrallik bir portföyde bu
   ne bir risk kütüğü ne de bir CAPA hattıdır; ekranların metrik satırının
   üç kutusu sıfır okuyordu.

   Her kayıt operasyonel veriden TÜREtilir, uydurulmaz: desteksiz varlık,
   oturum kaydı olmayan tedarikçi erişimi, restore testi olmayan santral,
   rotasyonsuz servis hesabı, doğrulanmamış geçit. Böylece O4'ün kapanış
   zinciri (kontrol boşluğu → bulgu → proje → doğrulama) gerçekten bağlanır. */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

/* Skor kuralı lib/eylemler2/risk.ts ile aynı olmalı: olasılık × en yüksek
   etki. Etki verilmemişse (null) skor da null — bilinmeyen sıfır değildir. */
function skor(olasilik: number | null, etkiler: (number | null)[]): number | null {
  if (olasilik == null) return null;
  const e = etkiler.filter((x): x is number => x != null);
  if (!e.length) return null;
  return olasilik * Math.max(...e);
}

type RiskTanim = {
  kod: string; baslik: string; aciklama: string; kaynak: string;
  tesis?: string; sistem?: string; tehdit: string; zayiflik: string;
  kontroller?: string;
  olasilik: number | null;
  etki: Partial<Record<'uretim' | 'emniyet' | 'regulasyon' | 'finans' | 'siber' | 'itibar' | 'cevre' | 'veri', number>>;
  /** artık risk doğal riskten düşükse mevcut kontroller işe yarıyor demektir */
  artikCarpan?: number;
  sahip: string | null;
  durum: string; islemTipi: string | null;
  kabulGun?: number;
  maddeKod?: string;
  varlikEtiketi?: string;
};

const RISKLER: RiskTanim[] = [
  {
    kod: 'RSK-2026-005',
    baslik: 'Kurtarma başarısızlığı — restore testi hiç yapılmamış santraller',
    aciklama: 'Çıldır ve Ataköy HES için yedekleme koşusu var ancak geri yükleme testi kaydı yok. Yedeğin geri dönebildiği kanıtlanmamış; kesinti hâlinde kurtarma süresi öngörülemez.',
    kaynak: 'veri_kalitesi', tesis: 'CILDIR-HES',
    tehdit: 'Donanım arızası veya fidye yazılımı sonrası kontrol sistemi verisinin kaybı',
    zayiflik: 'Geri yükleme testi yapılmamış; RTO doğrulanmamış',
    kontroller: 'Haftalık yedekleme koşusu çalışıyor, uzak hedefe kopyalanıyor',
    olasilik: 3, etki: { uretim: 5, finans: 4, regulasyon: 3 }, artikCarpan: 1,
    sahip: 'zeynep.arslan', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-8.1.2',
  },
  {
    kod: 'RSK-2026-006',
    baslik: 'Tedarikçi uzak bakım oturumları kayıt altına alınmıyor',
    aciklama: 'Uzaktan erişimi olan üç tedarikçide oturum kaydı yok veya bilinmiyor. Bir kötüye kullanım hâlinde ne yapıldığı geriye dönük tespit edilemez.',
    kaynak: 'denetim', tesis: 'KIZILDERE-3',
    tehdit: 'Tedarikçi hesabının ele geçirilmesi ya da yetki dışı işlem',
    zayiflik: 'Oturum kaydı ve onay akışı yok; erişim sürekli açık',
    kontroller: 'Jump host üzerinden erişim, ağ seviyesinde kısıtlı hedef listesi',
    olasilik: 3, etki: { siber: 5, uretim: 4, regulasyon: 4 }, artikCarpan: 0.8,
    sahip: 'mehmet.kaya', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-6.1.2',
  },
  {
    kod: 'RSK-2026-007',
    baslik: 'Desteksiz kontrol sistemi varlıkları — güvenlik yaması alamıyor',
    aciklama: 'Destek süresi biten kontrol sistemi varlıkları üretim durduran kritiklikte. Üretici artık güvenlik yaması yayımlamıyor; yeni bir zafiyet için telafi edici kontrolden başka seçenek yok.',
    kaynak: 'eol', tesis: 'KIZILDERE-3',
    tehdit: 'Yamanmamış bilinen zafiyetin kötüye kullanılması',
    zayiflik: 'Üretici desteği bitti; yerine koyma projesi henüz dalga 1 aşamasında',
    kontroller: 'Ağ segmentasyonu, sanal yama, erişim kısıtı',
    olasilik: 4, etki: { uretim: 5, siber: 5, regulasyon: 4 }, artikCarpan: 0.8,
    sahip: 'burak.sahin', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-6.2.1', varlikEtiketi: 'KIZILDERE3-SCADA-01',
  },
  {
    kod: 'RSK-2026-008',
    baslik: 'Parola rotasyonu yapılmamış ayrıcalıklı servis hesapları',
    aciklama: 'SCADA servis hesaplarında parola rotasyonu hiç yapılmamış. Hesaplardan biri sızarsa tespit edilene kadar süresiz geçerli kalır.',
    kaynak: 'denetim', tesis: 'GOKCEDAG-RES',
    tehdit: 'Kimlik bilgisi sızıntısı ile yetkisiz SCADA erişimi',
    zayiflik: 'Rotasyon yok, kasa yok, kullanım izlenmiyor',
    kontroller: 'Hesaplar etki alanı dışında; ağ erişimi bölgeyle sınırlı',
    olasilik: 3, etki: { siber: 5, uretim: 4 }, artikCarpan: 1,
    sahip: 'mehmet.kaya', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-5.1.1',
  },
  {
    kod: 'RSK-2026-009',
    baslik: 'Kurumsal ağ ile süreç kontrol ağı arasında doğrulanmamış geçit',
    aciklama: 'Bazı sahalarda OT DMZ → süreç kontrol ağı geçidi onaylı değil veya son doğrulama tarihi yok. Kural setinin hâlâ tasarlandığı gibi olduğu bilinmiyor.',
    kaynak: 'denetim', tesis: 'SARITEPE-RES',
    tehdit: 'Kurumsal ağdan yayılan zararlının süreç ağına ulaşması',
    zayiflik: 'Geçit kuralları belgelenmemiş, dönemsel doğrulama yapılmıyor',
    kontroller: 'OT güvenlik duvarı mevcut; kural seti üretici varsayılanına yakın',
    olasilik: 3, etki: { siber: 4, uretim: 4, regulasyon: 3 }, artikCarpan: 1,
    sahip: 'burak.sahin', durum: 'acik', islemTipi: null,
    maddeKod: 'EPDK-SYM-6.1.1',
  },
  {
    kod: 'RSK-2026-010',
    baslik: 'OT bölgelerinde log toplama kapsamı bilinmiyor',
    aciklama: 'Süreç kontrol ağındaki bir dizi varlığın log kaynağı bilinmiyor. Kapsam dışında mı yoksa kayıt mı üretmiyor, ayırt edilemiyor — olay sonrası inceleme kör kalır.',
    kaynak: 'veri_kalitesi', tesis: 'GOKCEDAG-RES',
    tehdit: 'Olayın fark edilmemesi veya kök nedeninin bulunamaması',
    zayiflik: 'Envanterde izleme durumu bilinmeyen varlıklar var',
    kontroller: 'Kurumsal tarafta SIEM var; OT tarafı kapsam dışı',
    olasilik: 4, etki: { siber: 4, regulasyon: 3 }, artikCarpan: 1,
    sahip: 'selin.aydin', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-7.1.4',
  },
  {
    kod: 'RSK-2026-011',
    baslik: 'Sertifika süresi doluyor — historian TLS zinciri',
    aciklama: 'Historian TLS sertifikasının süresi doldu, bir VPN geçit sertifikası ise üç hafta içinde doluyor. Yenileme sahibi atanmamış.',
    kaynak: 'zafiyet', tesis: 'KIZILDERE-2',
    tehdit: 'Şifreli kanalın kesilmesi veya doğrulamanın devre dışı bırakılması',
    zayiflik: 'Sertifika envanteri ve yenileme hatırlatıcısı yok',
    kontroller: 'İç PKI mevcut; yenileme elle yapılıyor',
    olasilik: 4, etki: { uretim: 3, siber: 3 }, artikCarpan: 1,
    sahip: null, durum: 'acik', islemTipi: null,
    maddeKod: 'EPDK-SYM-6.1.1',
  },
  {
    kod: 'RSK-2026-012',
    baslik: 'Atıl yönetici hesapları kapatılmıyor',
    aciklama: 'Doksan günden uzun süredir kullanılmayan ayrıcalıklı hesaplar aktif durumda. Ayrılan personel ya da devredilen görev sonrası hesap kapanışı işlemiyor.',
    kaynak: 'denetim',
    tehdit: 'Kullanılmayan ayrıcalıklı hesabın ele geçirilmesi',
    zayiflik: 'Dönemsel erişim incelemesi gecikmiş; otomatik askıya alma yok',
    kontroller: 'Çok faktörlü doğrulama zorunlu',
    olasilik: 2, etki: { siber: 4, veri: 3 }, artikCarpan: 1,
    sahip: 'mehmet.kaya', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-5.1.2',
  },
  {
    kod: 'RSK-2026-013',
    baslik: 'Kapsam dışı bırakılan kritik sistemler yedeklenmiyor',
    aciklama: 'Bazı santrallerin yedekleme politikasında mühendislik istasyonu projeleri ve saha PLC programları kapsam dışı. Bunlar kaybedilirse yeniden üretmek haftalar sürer.',
    kaynak: 'bulgu', tesis: 'KIZILDERE-3',
    tehdit: 'Mühendislik verisinin kalıcı kaybı',
    zayiflik: 'Yedek kapsamı eksik; kapsam dışı bırakma gerekçesi gözden geçirilmemiş',
    kontroller: 'Saha ekiplerinde yerel kopyalar var, merkezî değil',
    olasilik: 3, etki: { uretim: 4, finans: 3 }, artikCarpan: 1,
    sahip: 'zeynep.arslan', durum: 'islemde', islemTipi: 'azalt',
    maddeKod: 'EPDK-SYM-8.1.1',
  },
  {
    kod: 'RSK-2026-014',
    baslik: 'Sahipsiz varlıklar — kritiklik ve bakım sorumluluğu belirsiz',
    aciklama: 'Envanterde sahibi atanmamış varlıklar var. Yama, yedek ve erişim kararlarının kime ait olduğu belli değil.',
    kaynak: 'veri_kalitesi',
    tehdit: 'Bakımı yapılmayan varlığın zamanla kontrolsüz kalması',
    zayiflik: 'Sahiplik alanı boş; envanter güveni düşük',
    kontroller: 'Veri kalitesi kuyruğu bu kayıtları işaretliyor',
    olasilik: 3, etki: { siber: 3, regulasyon: 2 }, artikCarpan: 1,
    sahip: null, durum: 'acik', islemTipi: null,
    maddeKod: 'EPDK-SYM-4.1.2',
  },
  {
    kod: 'RSK-2026-015',
    baslik: 'EOS geçmiş sanallaştırma platformu — merkez BT',
    aciklama: 'Merkez sanallaştırma platformunun bir bölümü destek dışı sürümde çalışıyor. Uyum konsolu dâhil kurumsal uygulamalar bu platformda barınıyor.',
    kaynak: 'eol', tesis: 'MERKEZ-BT',
    tehdit: 'Hipervizör seviyesinde yamanmamış zafiyet',
    zayiflik: 'Sürüm yükseltmesi bütçe döngüsüne bağlı',
    kontroller: 'Yönetim arayüzü ayrı ağda, erişim kısıtlı',
    olasilik: 2, etki: { siber: 4, veri: 4, finans: 3 }, artikCarpan: 1,
    sahip: 'mehmet.kaya', durum: 'islemde', islemTipi: 'azalt',
  },
  /* Kabul edilmiş riskler — süreli ve onaylı; kütükte kuyruğa toplanır. */
  {
    kod: 'RSK-2026-016',
    baslik: 'Demirciler RES seri haberleşme hattında tekil güzergah',
    aciklama: 'Saha haberleşmesi tek güzergah üzerinden yürüyor. Yedek güzergah maliyeti üretim etkisiyle orantısız bulundu.',
    kaynak: 'manuel', tesis: 'DEMIRCILER-RES',
    tehdit: 'Hat kesintisi sonucu uzaktan izleme kaybı',
    zayiflik: 'Yedek güzergah yok',
    kontroller: 'Saha operatörü mevcut; yerel kontrol devrede kalıyor',
    olasilik: 2, etki: { uretim: 2, siber: 1 }, artikCarpan: 1,
    sahip: 'ahmet.terzi', durum: 'kabul_edildi', islemTipi: 'kabul', kabulGun: 210,
  },
  {
    kod: 'RSK-2026-017',
    baslik: 'Küçük HES sahalarında ayrı mühendislik istasyonu yok',
    aciklama: 'Kurulu gücü düşük sahalarda mühendislik işlemleri operatör istasyonundan yapılıyor. Ayrı istasyon yatırımı kapsam dışı bırakıldı.',
    kaynak: 'manuel', tesis: 'TERCAN-HES',
    tehdit: 'Görev ayrılığının sağlanamaması',
    zayiflik: 'Tek istasyon üzerinde hem işletme hem mühendislik yetkisi',
    kontroller: 'Ayrı hesap ve yetki seviyeleri tanımlı',
    olasilik: 2, etki: { siber: 2, uretim: 2 }, artikCarpan: 1,
    sahip: 'ahmet.terzi', durum: 'kabul_edildi', islemTipi: 'kabul', kabulGun: 95,
  },
  /* Değerlendirmesi tamamlanmamış: olasılık ve etki bilinmiyor.
     Skor null kalır ve ekranda SIFIR değil BİLİNMEYEN olarak görünür. */
  {
    kod: 'RSK-2026-018',
    baslik: 'Yeni devralınan sahalarda kontrol sistemi envanteri çıkarılmadı',
    aciklama: 'Portföye yeni giren sahalarda kontrol sistemi envanteri henüz toplanmadı; risk değerlendirmesi yapılamıyor.',
    kaynak: 'veri_kalitesi', tesis: 'ATAKOY-HES',
    tehdit: 'Bilinmeyen varlıkların bilinmeyen zafiyetleri',
    zayiflik: 'Envanter toplama saha ziyaretine bağlı',
    olasilik: null, etki: {},
    sahip: 'ahmet.terzi', durum: 'acik', islemTipi: null,
  },
  /* Kapanmış risk — "Kapalı riskleri gör" boş durumunun karşılığı. */
  {
    kod: 'RSK-2025-004',
    baslik: 'Kurumsal uzak erişimde çok faktörlü doğrulama yok',
    aciklama: 'Kurumsal VPN erişiminde ikinci faktör zorunlu hâle getirildi; risk kapatıldı.',
    kaynak: 'denetim', tesis: 'MERKEZ-BT',
    tehdit: 'Parola sızıntısı ile kurumsal ağa erişim',
    zayiflik: 'Tek faktörlü kimlik doğrulama',
    kontroller: 'Entra ID koşullu erişim, tüm kullanıcılarda MFA zorunlu',
    olasilik: 1, etki: { siber: 2 }, artikCarpan: 1,
    sahip: 'mehmet.kaya', durum: 'kapali', islemTipi: 'azalt',
  },
];

/* Bulgu ve aksiyon zinciri. hedefGun < 0 → gecikmiş (sıralamadan bağımsız
   üstte kalır ve asla kuyruğa toplanmaz). */
type BulguTanim = {
  baslik: string; aciklama: string; onem: string; durum: string;
  maddeKod: string; tesisKod: string; kaynak: string;
  tespitGun: number; hedefGun: number | null; sorumlu: string | null;
  kokNeden?: string;
  aksiyon?: {
    baslik: string; durum: string; sorumlu: string | null;
    hedefGun: number | null; dogrulama: string; engel?: string;
  } | null;
};

const BULGULAR: BulguTanim[] = [
  {
    baslik: 'Geri yükleme testi kaydı bulunamadı',
    aciklama: 'İki santralde yedekleme koşusu düzenli çalışıyor ancak hiçbir geri yükleme testi kaydı yok.',
    onem: 'kritik', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-8.1.2',
    tesisKod: 'KIZILDERE-3', kaynak: 'ic_denetim', tespitGun: -75, hedefGun: -12,
    sorumlu: 'zeynep.arslan', kokNeden: 'Test ortamı tahsis edilmemiş',
    aksiyon: {
      baslik: 'İzole geri yükleme ortamı kur ve ilk testi çalıştır',
      durum: 'devam', sorumlu: 'zeynep.arslan', hedefGun: -12,
      dogrulama: 'bekliyor', engel: 'Test donanımı tedarik bekliyor',
    },
  },
  {
    baslik: 'Tedarikçi uzak erişim oturumları kaydedilmiyor',
    aciklama: 'Uzaktan erişimi olan tedarikçilerden üçünde oturum kaydı yok veya durumu bilinmiyor.',
    onem: 'kritik', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-6.1.2',
    tesisKod: 'KIZILDERE-3', kaynak: 'dis_denetim', tespitGun: -52, hedefGun: -3,
    sorumlu: 'mehmet.kaya', kokNeden: 'Sözleşmede oturum kaydı şartı yok',
    aksiyon: {
      baslik: 'Jump host üzerinden oturum kaydı zorunlu hâle getir',
      durum: 'devam', sorumlu: 'mehmet.kaya', hedefGun: -3,
      dogrulama: 'bekliyor', engel: 'Tedarikçi sözleşme eki imza bekliyor',
    },
  },
  {
    baslik: 'OT DMZ → süreç ağı geçidi onaylı değil',
    aciklama: 'Geçit kuralları belgelenmemiş, son doğrulama tarihi kayıtlı değil.',
    onem: 'yuksek', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-6.1.1',
    tesisKod: 'SARITEPE-RES', kaynak: 'ic_denetim', tespitGun: -40, hedefGun: 18,
    sorumlu: 'burak.sahin',
    aksiyon: {
      baslik: 'Geçit kural setini belgele ve onaya sun', durum: 'devam',
      sorumlu: 'burak.sahin', hedefGun: 18, dogrulama: 'bekliyor',
    },
  },
  {
    baslik: 'Yama penceresi tanımsız — OT varlıkları',
    aciklama: 'Kritik yamaların hangi pencerede uygulanacağı yazılı değil; uygulanamayanlar için telafi edici kontrol kaydı yok.',
    onem: 'yuksek', durum: 'acik', maddeKod: 'EPDK-SYM-6.2.1',
    tesisKod: 'KIZILDERE-3', kaynak: 'oz_degerlendirme', tespitGun: -28, hedefGun: 34,
    sorumlu: 'burak.sahin', aksiyon: null,
  },
  {
    baslik: 'Servis hesaplarında parola rotasyonu yok',
    aciklama: 'SCADA servis hesaplarının hiçbirinde parola rotasyon kaydı bulunmuyor.',
    onem: 'kritik', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-5.1.1',
    tesisKod: 'GOKCEDAG-RES', kaynak: 'dis_denetim', tespitGun: -66, hedefGun: 26,
    sorumlu: 'mehmet.kaya', kokNeden: 'Parola kasası OT tarafında konumlandırılmamış',
    aksiyon: {
      baslik: 'Servis hesaplarını kasaya al, 90 günlük rotasyon başlat',
      durum: 'devam', sorumlu: 'mehmet.kaya', hedefGun: 26, dogrulama: 'bekliyor',
    },
  },
  {
    baslik: 'Erişim incelemesi dönemi kaçırıldı',
    aciklama: 'Ayrıcalıklı atamaların bir bölümünde dönemsel inceleme kaydı yok.',
    onem: 'yuksek', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-5.1.2',
    tesisKod: 'MERKEZ-BT', kaynak: 'ic_denetim', tespitGun: -35, hedefGun: 12,
    sorumlu: 'mehmet.kaya',
    aksiyon: {
      baslik: 'Q3 erişim incelemesini tamamla ve kaldırılacakları uygula',
      durum: 'devam', sorumlu: 'mehmet.kaya', hedefGun: 12, dogrulama: 'bekliyor',
    },
  },
  {
    baslik: 'OT log kaynakları SIEM kapsamında değil',
    aciklama: 'Süreç kontrol ağındaki varlıkların bir bölümünde log kaynağı durumu bilinmiyor.',
    onem: 'yuksek', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-7.1.4',
    tesisKod: 'GOKCEDAG-RES', kaynak: 'ic_denetim', tespitGun: -90, hedefGun: 55,
    sorumlu: 'selin.aydin',
    aksiyon: {
      baslik: 'OT log toplayıcıyı iki pilot sahaya kur', durum: 'devam',
      sorumlu: 'selin.aydin', hedefGun: 55, dogrulama: 'bekliyor',
    },
  },
  {
    baslik: 'Yedek kapsamı dışında bırakılan kritik sistemler',
    aciklama: 'Mühendislik istasyonu projeleri ve saha PLC programları yedekleme kapsamı dışında.',
    onem: 'yuksek', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-8.1.1',
    tesisKod: 'KIZILDERE-2', kaynak: 'oz_degerlendirme', tespitGun: -22, hedefGun: 44,
    sorumlu: 'zeynep.arslan',
    aksiyon: {
      baslik: 'Mühendislik projelerini merkezî yedeğe dâhil et', durum: 'planlandi',
      sorumlu: 'zeynep.arslan', hedefGun: 44, dogrulama: 'gerekmez',
    },
  },
  {
    baslik: 'RPO ve RTO tanımlı değil',
    aciklama: 'Kritik sistemlerin kurtarma hedefleri belgelenmemiş, sahiplendirilmemiş.',
    onem: 'orta', durum: 'acik', maddeKod: 'EPDK-SYM-8.2.1',
    tesisKod: 'SARITEPE-RES', kaynak: 'oz_degerlendirme', tespitGun: -15, hedefGun: 70,
    sorumlu: null, aksiyon: null,
  },
  /* Doğrulama bekleyenler: aksiyon TAMAMLANDI, etkinliği kanıtlanmadı.
     Bunun için ayrı bir Bulgu durumu YOKTUR ve uydurulmaz: bulgu 'aksiyonda'
     kalır, retestGerekli işaretlenir, doğrulamayı Aksiyon.dogrulamaDurumu
     taşır. Ekranın "doğrulama bekliyor" metriği bu üçlüden türer. */
  {
    baslik: 'Envanter güncelliği bir aydan eski',
    aciklama: 'Envanter dışa aktarımı otomatikleştirildi; güncellik doğrulanmayı bekliyor.',
    onem: 'orta', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-4.1.1',
    tesisKod: 'KIZILDERE-3', kaynak: 'ic_denetim', tespitGun: -120, hedefGun: 8,
    sorumlu: 'ahmet.terzi',
    aksiyon: {
      baslik: 'Envanter senkronizasyonunu günlük çalışacak şekilde planla',
      durum: 'tamamlandi', sorumlu: 'ahmet.terzi', hedefGun: -6, dogrulama: 'bekliyor',
    },
  },
  {
    baslik: 'Kritiklik sınıflandırması eksik varlıklar',
    aciklama: 'Sınıflandırma kuralı uygulandı; kalan varlıklar için doğrulama bekleniyor.',
    onem: 'orta', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-4.1.2',
    tesisKod: 'KIZILDERE-2', kaynak: 'oz_degerlendirme', tespitGun: -100, hedefGun: 20,
    sorumlu: 'ahmet.terzi',
    aksiyon: {
      baslik: 'Kritiklik kuralını tüm envantere uygula', durum: 'tamamlandi',
      sorumlu: 'ahmet.terzi', hedefGun: -10, dogrulama: 'bekliyor',
    },
  },
  {
    baslik: 'Uzaktan erişim çok faktörlü doğrulama kapsamı',
    aciklama: 'Kurumsal VPN erişiminde MFA zorunlu hâle getirildi; örnekleme ile doğrulanacak.',
    onem: 'orta', durum: 'aksiyonda', maddeKod: 'EPDK-SYM-4.2.2',
    tesisKod: 'MERKEZ-BT', kaynak: 'dis_denetim', tespitGun: -140, hedefGun: 5,
    sorumlu: 'mehmet.kaya',
    aksiyon: {
      baslik: 'Koşullu erişim politikasını tüm gruplara uygula', durum: 'tamamlandi',
      sorumlu: 'mehmet.kaya', hedefGun: -20, dogrulama: 'bekliyor',
    },
  },
];

export async function riskVeBulgu(db: PrismaClient) {
  const K = Object.fromEntries(
    (await db.kullanici.findMany()).map((x) => [x.eposta.split('@')[0], x]),
  );
  const T = Object.fromEntries((await db.tesis.findMany()).map((x) => [x.kod, x]));
  const M = Object.fromEntries(
    (await db.madde.findMany({ select: { id: true, kod: true } })).map((x) => [x.kod, x]),
  );
  const surec = await db.uyumSureci.findUnique({ where: { kod: 'EPDK-SYM-2026' } });

  /* ═══ Bulgular ════════════════════════════════════════════════════════
     Bulgu MaddeDurumu'na asılıdır. Kapsam dışı bir santral için madde
     durumu yoksa bulgu da yazılmaz — kapsam kararını ekranda delmemek için. */
  let bulguSayisi = 0;
  const varOlanBulgular = new Set(
    (await db.bulgu.findMany({ select: { baslik: true } })).map((x) => x.baslik),
  );
  for (const b of BULGULAR) {
    if (varOlanBulgular.has(b.baslik)) continue;
    const madde = M[b.maddeKod]; const tesis = T[b.tesisKod];
    if (!madde || !tesis || !surec) continue;
    const durumKaydi = await db.maddeDurumu.findFirst({
      where: { surecId: surec.id, maddeId: madde.id, tesisId: tesis.id },
    });
    if (!durumKaydi) continue;

    const bulgu = await db.bulgu.create({
      data: {
        maddeDurumuId: durumKaydi.id, baslik: b.baslik, aciklama: b.aciklama,
        onemDerecesi: b.onem, durum: b.durum, kaynak: b.kaynak,
        kokNeden: b.kokNeden ?? null,
        // Aksiyonu tamamlanmış ama doğrulanmamış bulgu retest bekler.
        retestGerekli: b.aksiyon?.dogrulama === 'bekliyor'
          && b.aksiyon?.durum === 'tamamlandi',
        tespitTarihi: gun(b.tespitGun),
        hedefTarih: b.hedefGun == null ? null : gun(b.hedefGun),
        sorumluId: b.sorumlu ? K[b.sorumlu]?.id ?? null : null,
      },
    });
    bulguSayisi++;

    if (b.aksiyon) {
      const a = b.aksiyon;
      await db.aksiyon.create({
        data: {
          bulguId: bulgu.id, baslik: a.baslik, durum: a.durum,
          sorumluId: a.sorumlu ? K[a.sorumlu]?.id ?? null : null,
          baslangic: gun(b.tespitGun + 5),
          hedef: a.hedefGun == null ? null : gun(a.hedefGun),
          tamamlanma: a.durum === 'tamamlandi' ? gun((a.hedefGun ?? 0) - 2) : null,
          dogrulamaDurumu: a.dogrulama,
          // Engel notu durum kelimesi değil, NE olduğunu yazar.
          etkinlikNotu: a.engel ?? null,
        },
      });
    }
  }

  /* ═══ Riskler ═════════════════════════════════════════════════════════ */
  let riskSayisi = 0;
  const varOlanRiskler = new Set(
    (await db.risk.findMany({ select: { kod: true } })).map((x) => x.kod),
  );
  for (const r of RISKLER) {
    if (varOlanRiskler.has(r.kod)) continue;
    const etkiler = [
      r.etki.uretim ?? null, r.etki.emniyet ?? null, r.etki.regulasyon ?? null,
      r.etki.finans ?? null, r.etki.siber ?? null, r.etki.itibar ?? null,
      r.etki.cevre ?? null, r.etki.veri ?? null,
    ];
    const dogal = skor(r.olasilik, etkiler);
    const artik = dogal == null ? null : Math.round(dogal * (r.artikCarpan ?? 1));

    const risk = await db.risk.create({
      data: {
        kod: r.kod, baslik: r.baslik, aciklama: r.aciklama, kaynak: r.kaynak,
        tesisId: r.tesis ? T[r.tesis]?.id ?? null : null,
        tehdit: r.tehdit, zayiflik: r.zayiflik, mevcutKontroller: r.kontroller ?? null,
        olasilik: r.olasilik,
        etkiUretim: r.etki.uretim ?? null, etkiEmniyet: r.etki.emniyet ?? null,
        etkiRegulasyon: r.etki.regulasyon ?? null, etkiFinans: r.etki.finans ?? null,
        etkiSiber: r.etki.siber ?? null, etkiItibar: r.etki.itibar ?? null,
        etkiCevre: r.etki.cevre ?? null, etkiVeri: r.etki.veri ?? null,
        dogalRisk: dogal, artikRisk: artik,
        sahipId: r.sahip ? K[r.sahip]?.id ?? null : null,
        islemTipi: r.islemTipi,
        islemTarihi: r.islemTipi ? gun(-Math.floor(10 + r.kod.length)) : null,
        kabulBitis: r.kabulGun == null ? null : gun(r.kabulGun),
        onaylayanId: r.islemTipi === 'kabul' ? K['ahmet.terzi']?.id ?? null : null,
        durum: r.durum,
      },
    });
    riskSayisi++;

    // Kontrol bağı — O4'ün kapanış zincirinin ilk halkası.
    if (r.maddeKod && M[r.maddeKod]) {
      await db.riskKontrol.create({
        data: { riskId: risk.id, maddeId: M[r.maddeKod].id },
      }).catch(() => undefined);
    }
    if (r.varlikEtiketi) {
      const v = await db.varlik.findUnique({ where: { etiket: r.varlikEtiketi } });
      if (v) {
        await db.riskVarlik.create({ data: { riskId: risk.id, varlikId: v.id } })
          .catch(() => undefined);
      }
    }
  }

  /* Ömrü dolmuş varlıkları şemsiye riske bağla.
     Telafi edici kontrol, varlığı kapsayan riskin kontrol maddesinden gelir.
     Bu bağ olmadan envanterdeki HER eskimiş varlık "telafi yok" görünüyor ve
     ömür ekranı tümüyle kırmızıya dönüyordu — sert sinyal anlamını yitirir.
     Üç varlık bilerek bağsız bırakılır: gerçekten telafisi olmayanlar. */
  const semsiye = await db.risk.findUnique({ where: { kod: 'RSK-2026-007' } });
  if (semsiye) {
    const omruDolan = await db.varlik.findMany({
      where: {
        silindi: null,
        OR: [
          { destekBitis: { lt: new Date() } },
          { eosTarihi: { lt: gun(365) } },
        ],
      },
      orderBy: { etiket: 'asc' },
      select: { id: true },
    });
    // Son üçü telafisiz kalır (sıralama sabit olduğu için sonuç yeniden üretilebilir).
    for (const v of omruDolan.slice(0, Math.max(0, omruDolan.length - 3))) {
      await db.riskVarlik.create({ data: { riskId: semsiye.id, varlikId: v.id } })
        .catch(() => undefined);
    }
  }

  /* Riski doğuran bulguya bağla — zincir iki uçtan da yürünebilsin. */
  const eslesme: [string, string][] = [
    ['RSK-2026-005', 'Geri yükleme testi kaydı bulunamadı'],
    ['RSK-2026-006', 'Tedarikçi uzak erişim oturumları kaydedilmiyor'],
    ['RSK-2026-008', 'Servis hesaplarında parola rotasyonu yok'],
    ['RSK-2026-009', 'OT DMZ → süreç ağı geçidi onaylı değil'],
    ['RSK-2026-010', 'OT log kaynakları SIEM kapsamında değil'],
    ['RSK-2026-012', 'Erişim incelemesi dönemi kaçırıldı'],
    ['RSK-2026-013', 'Yedek kapsamı dışında bırakılan kritik sistemler'],
  ];
  for (const [riskKod, bulguBaslik] of eslesme) {
    const risk = await db.risk.findUnique({ where: { kod: riskKod } });
    const bulgu = await db.bulgu.findFirst({ where: { baslik: bulguBaslik } });
    if (risk && bulgu && !risk.bulguId) {
      await db.risk.update({ where: { id: risk.id }, data: { bulguId: bulgu.id } });
    }
  }

  console.log(
    `Risk & bulgu: ${riskSayisi} risk, ${bulguSayisi} bulgu eklendi · ` +
    `toplam ${await db.risk.count()} risk · ${await db.bulgu.count()} bulgu · ` +
    `${await db.aksiyon.count()} aksiyon`,
  );
}
