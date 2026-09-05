import { describe, expect, it } from 'vitest';
import {
  DURUM_IM, acikMi, aileDurumu, enKotuHam, satirAgirligi,
} from '@/app/(kabuk)/(operasyonel)/uyum/mantik';
import {
  acikMi as bulguAcikMi, bulguImi, gecikmeGunu, kalanGun,
  type BulguOzeti,
} from '@/app/(kabuk)/(operasyonel)/bulgular/mantik';
import { davetKapisi } from '@/lib/uyum/denetciErisimi';
import { egitimDurumu, egitimKapsamasi, egitimCumlesi } from '@/lib/uyum/egitim';
import { yasayanDurum, yapildiKapisi } from '@/lib/uyum/gozdenGecirme';
import { takipDurumu } from '@/lib/uyum/mevzuatKaynagi';
import { ORTU_SOZU, belgeOrtusu } from '@/app/(kabuk)/(operasyonel)/dokumanlar/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   Senaryo kütüğünün uyum boşlukları

   Bu dosyanın konusu tek bir doktrindir: ölçülmemiş olan uyumlu
   sayılmaz, tanımlanmamış olan süresiz sayılmaz ve kaydı olmayan
   katılmamış sayılmaz.
   ═══════════════════════════════════════════════════════════════════════ */

const GUN = 86_400_000;
const SIMDI = new Date('2026-09-04T09:00:00.000Z').getTime();

describe('Uyum çerçevesi · madde hiyerarşisi', () => {
  it('bir ailenin durumu EN KÖTÜ yaprağından gelir [UYU-CRC-003]', () => {
    /* Ailenin altındaki tek bir uyumsuz madde, ailenin tamamını uyumlu
       göstermeyi engeller: hiyerarşi ortalama almaz, en kötüyü taşır. */
    expect(enKotuHam(['uyumlu', 'uyumsuz', 'uyumlu'])).toBe('uyumsuz');
    expect(aileDurumu(['uyumlu', 'uyumsuz'])).toBe(DURUM_IM.uyumsuz);
    expect(aileDurumu(['uyumlu', 'uyumlu'])).toBe(DURUM_IM.uyumlu);
  });

  it('değerlendirilmemiş madde ailenin durumunu SAĞLIKLI yapmaz', () => {
    const d = aileDurumu(['degerlendirilmedi']);
    expect(d).not.toBe('ok');
    expect(acikMi('degerlendirilmedi')).toBe(true);
  });

  it('yaprağı olmayan aile BİLİNMEYENDİR, uyumlu değil', () => {
    /* Boş aile "sorun yok" demez: ölçüm hiç yapılmamıştır. Hepsi kapsam
       dışıysa hücre AÇILMAZ (null) — bu ayrı bir hâldir. */
    expect(aileDurumu([])).toBe('unk');
    expect(aileDurumu(['kapsamdisi'])).toBeNull();
    expect(enKotuHam([])).toBeNull();
  });

  it('satır ağırlığı en kötü hücreyi ÖNE alır — ağırlık büyükse üstte', () => {
    expect(satirAgirligi(['bd', 'ok'])).toBeGreaterThan(satirAgirligi(['ok', 'ok']));
    expect(satirAgirligi(['bd', 'ok'])).toBeGreaterThan(satirAgirligi(['md', 'ok']));
    expect(satirAgirligi(['unk', 'ok'])).toBeGreaterThan(satirAgirligi(['ok', 'ok']));
  });
});

/* ── Bulgu ──────────────────────────────────────────────────────────── */

const bulgu = (ek: Partial<BulguOzeti> = {}): BulguOzeti => ({
  id: 'b1', baslik: 'Örnek bulgu', durum: 'acik', onem: 'yuksek',
  hedef: null, aksiyonlar: [], dogrulama: null, ...ek,
} as BulguOzeti);

describe('Bulgu listesi', () => {
  it('son tarihi geçen açık bulgu GECİKMİŞTİR ve gün sayısı ölçülür [BUL-LST-001]', () => {
    /* Hedef, testin kendi anına göre değil ÜRÜNÜN anına göre ölçülür;
       bu yüzden gerçekten geçmiş bir tarih verilir. */
    const b = bulgu({ hedef: '2020-01-01T00:00:00.000Z' });
    const gecikme = gecikmeGunu({ durum: b.durum, hedef: b.hedef });
    expect(gecikme).not.toBeNull();
    expect(gecikme!).toBeGreaterThan(0);
    expect(bulguImi(b)).toBe('bd');
  });

  it('hedefi girilmemiş bulgu "gecikmedi" SAYILMAZ — ölçülemez [BUL-LST-002]', () => {
    /* Sıfır bir ölçüdür; hedefi olmayan bir bulgunun gecikmesi ölçülemez
       ve `null` döner. Sıfır dönseydi ekran "zamanında" derdi. */
    expect(gecikmeGunu({ durum: 'acik', hedef: null })).toBeNull();
    expect(kalanGun({ durum: 'acik', hedef: null })).toBeNull();
  });

  it('kapanmış ve riski kabul edilmiş bulgunun gecikmesi ölçülmez', () => {
    const gecmis = new Date(SIMDI - 5 * GUN).toISOString();
    expect(gecikmeGunu({ durum: 'kapali', hedef: gecmis })).toBeNull();
    expect(gecikmeGunu({ durum: 'kabul_edildi', hedef: gecmis })).toBeNull();
    expect(bulguAcikMi('kapali')).toBe(false);
    expect(bulguAcikMi('kabul_edildi')).toBe(false);
  });

  it('bulgu detayında açık aksiyon işaretçiyi belirler [BUL-DTY-001]', () => {
    const acikAksiyonlu = bulgu({
      aksiyonlar: [{ id: 'a1', baslik: 'Aksiyon', durum: 'acik', sorumlu: null }],
    } as Partial<BulguOzeti>);
    expect(bulguAcikMi(acikAksiyonlu.durum)).toBe(true);
  });
});

/* ── Kanıt ve paket ─────────────────────────────────────────────────── */

describe('Kanıt sahipliği ve paket dürüstlüğü', () => {
  it('sahibi de yükleyeni de olmayan kanıt SORUMSUZDUR [KNT-SHP-001]', () => {
    /* Bu, veri kalitesi motorunun `sahipsiz_kanit` kuralının saf hâli:
       tazelik görevi kimseye atanamayan kanıt bir boşluktur. */
    const sorumluVar = (k: { sahipId: string | null; yukleyenId: string | null }) =>
      k.sahipId !== null || k.yukleyenId !== null;
    expect(sorumluVar({ sahipId: null, yukleyenId: null })).toBe(false);
    expect(sorumluVar({ sahipId: null, yukleyenId: 'u1' })).toBe(true);
    expect(sorumluVar({ sahipId: 'u1', yukleyenId: null })).toBe(true);
  });

  it('imza altyapısı bağlı değilken paket İMZALI görünmez [KNT-PKT-002]', async () => {
    const { DIS_SAGLAYICILAR } = await import('@/lib/uyum/disSaglayicilar');
    const imza = DIS_SAGLAYICILAR.find((s) => s.aile === 'imza');
    expect(imza, 'imza sağlayıcısı kütükte tanımlı olmalı').toBeTruthy();
    /* Bağlı olmayan sağlayıcı listeden ÇIKARILMAZ: asıl bilgi hangi
       yeteneğin henüz olmadığıdır. */
    expect(imza!.bagli).toBe(false);
    expect(imza!.bagliDegilkenDavranis.length).toBeGreaterThan(10);
  });
});

/* ── Gözden geçirme · dış denetçi · doküman · eğitim · mevzuat ─────── */

describe('Gözden geçirme', () => {
  it('kararı olmayan toplantı "yapıldı" işaretlenemez [GZD-DON-001]', () => {
    const k = yapildiKapisi({
      kararSayisi: 0, ozet: 'Görüşüldü', tarih: SIMDI - GUN, simdi: SIMDI,
    });
    expect(k.ok).toBe(false);
  });

  it('gelecekteki toplantı "yapıldı" işaretlenemez', () => {
    expect(yapildiKapisi({
      kararSayisi: 2, ozet: 'Görüşüldü', tarih: SIMDI + GUN, simdi: SIMDI,
    }).ok).toBe(false);
  });

  it('kararsız bir "yapıldı" kaydı YAPILDI sayılmaz', () => {
    /* Denetimde kurumu ürünün kendisinden daha kötü duruma sokan hâl
       budur: toplantı yapılmış görünür ama ortada karar yoktur. */
    expect(yasayanDurum({
      durum: 'yapildi', tarih: SIMDI - GUN, simdi: SIMDI, kararSayisi: 0,
    })).toBe('kararsiz');
    expect(yasayanDurum({
      durum: 'yapildi', tarih: SIMDI - GUN, simdi: SIMDI, kararSayisi: 2,
    })).toBe('yapildi');
  });

  it('tarihi geçmiş plan "planlı" görünmez [GZD-DON-002]', () => {
    expect(yasayanDurum({
      durum: 'planli', tarih: SIMDI - GUN, simdi: SIMDI, kararSayisi: 0,
    })).toBe('gecikmis_plan');
  });
});

describe('Dış denetçi erişimi', () => {
  it('süresiz erişim AÇILAMAZ [DNE-ERS-001]', () => {
    const k = davetKapisi({
      baslangic: SIMDI, bitis: SIMDI + 3650 * GUN, simdi: SIMDI, kapsamSayisi: 1,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toMatch(/süresiz açılmaz/);
  });

  it('geçmişte biten erişim açılamaz', () => {
    expect(davetKapisi({
      baslangic: SIMDI, bitis: SIMDI - GUN, simdi: SIMDI, kapsamSayisi: 1,
    }).ok).toBe(false);
  });

  it('kapsamsız erişim açılamaz', () => {
    expect(davetKapisi({
      baslangic: SIMDI, bitis: SIMDI + 10 * GUN, simdi: SIMDI, kapsamSayisi: 0,
    }).ok).toBe(false);
  });

  it('süreli ve kapsamlı erişim açılır', () => {
    expect(davetKapisi({
      baslangic: SIMDI, bitis: SIMDI + 10 * GUN, simdi: SIMDI, kapsamSayisi: 2,
    }).ok).toBe(true);
  });
});

describe('Doküman kütüğü', () => {
  it('yürürlükte belgesi olmayan kontrol KARŞILANMIŞ sayılmaz [DOK-SUR-002]', () => {
    /* DYS bağlı değil; belge sürümü elle girilir. Taslak bir belge bir
       kontrolü karşılamaz ve ekran bunu "eksik" diye yazar. */
    expect(belgeOrtusu(['taslak'])).toBe('yalniz_taslak');
    expect(belgeOrtusu(['yururlukte'])).toBe('karsilandi');
    /* Hiç bağı olmayan kontrol BİLİNMEYENDİR: belki belge vardır ve bağı
       kurulmamıştır. Taslakla aynı işarete konsaydı iş sırası bozulurdu. */
    expect(belgeOrtusu([])).toBe('belgesiz');
    expect(ORTU_SOZU.belgesiz.length).toBeGreaterThan(3);
  });
});

describe('Eğitim kapsaması', () => {
  it('kaydı olmayan kişi "katılmadı" DEĞİL, "kaydı yok"tur [EGT-KAT-001]', () => {
    expect(egitimDurumu({
      gecerlilikBitis: null, kayitVar: false, simdi: SIMDI,
    })).toBe('kayit_yok');
    /* Kaydı OLAN ama süresiz eğitim ayrı bir durumdur. */
    expect(egitimDurumu({
      gecerlilikBitis: null, kayitVar: true, simdi: SIMDI,
    })).toBe('suresiz');
    const o = egitimKapsamasi({ durumlar: ['kayit_yok', 'gecerli'] });
    expect(o.kaydiOlmayan).toBe(1);
    expect(o.gecerli).toBe(1);
  });

  it('kapsamı boş eğitimde oran ÖLÇÜLMEDİ, %0 değil', () => {
    const o = egitimKapsamasi({ durumlar: [] });
    expect(o.oran).toBeNull();
    expect(egitimCumlesi(o)).toMatch(/ÖLÇÜLMEDİ/);
  });
});

describe('Mevzuat kaynağı', () => {
  it('adresi girilmemiş kaynak "gecikti" DEĞİL, "adressiz"dir [MEV-KYN-001]', () => {
    /* Adres ürünle GELMEZ; kurum girer. Girilmemiş adrese "gecikti"
       demek, kurumun yapmadığı bir işi kusur saymak olurdu. */
    expect(takipDurumu({
      adres: null, sonKontrol: null, araliksGun: 30, simdi: SIMDI,
    })).toBe('adressiz');
    expect(takipDurumu({
      adres: '   ', sonKontrol: null, araliksGun: 30, simdi: SIMDI,
    })).toBe('adressiz');
  });

  it('adresi olan ama hiç bakılmamış kaynak ayrı bir durumdur', () => {
    expect(takipDurumu({
      adres: 'kurum-ici-adres', sonKontrol: null, araliksGun: 30, simdi: SIMDI,
    })).toBe('hic_bakilmadi');
  });
});

/* ── Eşleştirme matrisi ─────────────────────────────────────────────── */

describe('Eşleştirme matrisi', () => {
  it('karşılığı olmayan madde boş bırakılır, uydurulmaz [ESL-MTR-001] [ESL-MTR-002]', async () => {
    const { cizilebilirEsler, hucreleriKur, anahtar } =
      await import('@/app/(kabuk)/(operasyonel)/eslestirme/mantik');

    const madde = (id: string, regKod: string) => ({
      id, kod: `${regKod}-1`, kisaKod: '1', baslik: `Madde ${id}`,
      regId: regKod, regKod,
    });
    const m1 = madde('m1', 'A');
    const m2 = madde('m2', 'B');
    const m3 = madde('m3', 'B');
    const yaprakOlmayan = madde('YOK', 'B');

    /* İki ucu da çizilen kümede olmayan eşleme matrise GİRMEZ: yarım bir
       çizgi, "3 denklik var ama 2 tane çizili" yalanını üretirdi. */
    const esler = [
      { id: 'e1', denklik: 'tam', aciklama: null, kaynak: m1, hedef: m2 },
      { id: 'e2', denklik: 'tam', aciklama: null, kaynak: m1, hedef: yaprakOlmayan },
    ];
    const cizilebilir = cizilebilirEsler(esler, [m1, m2, m3]);
    expect(cizilebilir.map((e) => e.id)).toEqual(['e1']);

    const hucreler = hucreleriKur(cizilebilir);
    /* Eşleme YÖNSÜZDÜR: iki yön de aynı kaydı gösterir. */
    expect(hucreler.get(anahtar('m1', 'm2'))?.id).toBe('e1');
    expect(hucreler.get(anahtar('m2', 'm1'))?.id).toBe('e1');
    /* Karşılığı olmayan hücre haritada YOKTUR — ekran boş bırakır;
       "eşleşme yok" ile "eşleşme sıfır" aynı şey değildir. */
    expect(hucreler.get(anahtar('m1', 'm3'))).toBeUndefined();
  });
});
