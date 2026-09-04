import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { kapanisYolu, type KapanisGirdisi } from '@/lib/uyum/kapanisYolu';
import { kapanisKapisi } from '@/lib/uyum/kokNeden';

/* ═══════════════════════════════════════════════════════════════════════
   KAPANIŞ YOLU

   `/bulgular/[id]` ekranının birincil işi tek bir sorudur: "bu bulgunun
   kapanması için ne eksik?" Ekran o cevabı bugüne kadar hiçbir yerde tek
   parça vermiyordu; `kapanisYolu` onu hesaplar.

   Buradaki en pahalı kusur, yolun kapıdan AYRIŞMASI olurdu: ekran
   "kapanışa hazır" derken sunucunun reddetmesi. Bu yüzden son test
   ikisini yan yana koşturur ve aynı şeyi söylediklerini sınar.
   ═══════════════════════════════════════════════════════════════════ */

const tarih = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

const temel = (ek: Partial<KapanisGirdisi> = {}): KapanisGirdisi => ({
  durum: 'acik',
  onemDerecesi: 'dusuk',
  tekrarMi: false,
  analiz: { kategori: null, metin: null, analizEdenId: null, analizZamani: null },
  aksiyonToplam: 0,
  aksiyonAcik: 0,
  retestGerekli: false,
  retestSonucu: null,
  dogrulamaBekleyen: false,
  kapanisDogrulama: null,
  tespit: '2026-08-01T00:00:00.000Z',
  tarih,
  ...ek,
});

const adim = (y: ReturnType<typeof kapanisYolu>, ad: string) =>
  y.adimlar.find((a) => a.anahtar === ad)!;

describe('adım sırası ve durumları', () => {
  it('beş adım hep aynı sırada gelir — iş sırası, alan sırası değil', () => {
    /* Analiz aksiyondan ÖNCE gelir: yanlış teşhisle planlanan aksiyon
       bulguyu kapatmaz, yalnız erteler. */
    expect(kapanisYolu(temel()).adimlar.map((a) => a.anahtar))
      .toEqual(['tespit', 'analiz', 'aksiyon', 'dogrulama', 'kapanis']);
  });

  it('tespit hiç eksik olmaz; kayıt varsa tespit yapılmıştır', () => {
    expect(adim(kapanisYolu(temel()), 'tespit').durum).toBe('tamam');
    expect(adim(kapanisYolu(temel({ durum: 'kapali' })), 'tespit').durum).toBe('tamam');
  });

  it('düşük önemli bulguda kök neden ZORUNLU değildir ve adım tamam sayılır', () => {
    const y = kapanisYolu(temel({ onemDerecesi: 'dusuk' }));
    expect(adim(y, 'analiz').durum).toBe('tamam');
    expect(adim(y, 'analiz').olgu).toBe('gerekmiyor');
    /* Zorunlu olmayan bir adımı "eksik" göstermek, kullanıcıya
       yapmayacağı bir iş dayatmak olurdu. */
  });

  it('kritik bulguda analiz eksikse sıradaki iş kök nedendir', () => {
    const y = kapanisYolu(temel({ onemDerecesi: 'kritik' }));
    expect(adim(y, 'analiz').durum).toBe('eksik');
    expect(y.sonraki?.anahtar).toBe('analiz');
    expect(y.sonraki?.etiket).toBe('Kök nedeni tamamla');
  });

  it('tekrarlayan bulgu önem derecesinden BAĞIMSIZ olarak analiz ister', () => {
    /* Bir şeyin ikinci kez olması, ilk teşhisin yanlış olduğunun
       kanıtıdır (UY-28). */
    const y = kapanisYolu(temel({ onemDerecesi: 'dusuk', tekrarMi: true }));
    expect(adim(y, 'analiz').durum).toBe('eksik');
  });

  it('kategori seçmek analiz DEĞİLDİR; cümle bunu söyler', () => {
    const y = kapanisYolu(temel({
      onemDerecesi: 'kritik',
      analiz: { kategori: 'surec', metin: 'kısa', analizEdenId: 'k1', analizZamani: 1 },
    }));
    expect(adim(y, 'analiz').durum).toBe('eksik');
    expect(adim(y, 'analiz').cumle).toContain('kategori seçmek analiz değildir');
  });

  it('imzasız analiz eksiktir — kim yazdığı bilinmeyen analiz bir görüştür', () => {
    const y = kapanisYolu(temel({
      onemDerecesi: 'kritik',
      analiz: {
        kategori: 'surec', metin: 'x'.repeat(60), analizEdenId: null, analizZamani: null,
      },
    }));
    expect(adim(y, 'analiz').durum).toBe('eksik');
    expect(adim(y, 'analiz').cumle).toContain('kimin ne zaman');
  });
});

describe('aksiyon adımı — planlama ile yürütme ayrı işlerdir', () => {
  it('hiç aksiyon yoksa istenen iş PLANLAMAKTIR', () => {
    const y = kapanisYolu(temel({ aksiyonToplam: 0 }));
    expect(adim(y, 'aksiyon').cumle).toContain('planlayın');
    expect(adim(y, 'aksiyon').olgu).toBe('planlanmadı');
  });

  it('açık aksiyon varsa istenen iş TAMAMLAMAKTIR ve sayı yazılır', () => {
    const y = kapanisYolu(temel({ aksiyonToplam: 3, aksiyonAcik: 2 }));
    expect(adim(y, 'aksiyon').cumle).toBe('2 açık aksiyonu tamamlayın.');
    expect(adim(y, 'aksiyon').olgu).toBe('1/3');
  });

  it('tek açık aksiyonda sayı yazılmaz — "1 açık aksiyon" gereksiz', () => {
    const y = kapanisYolu(temel({ aksiyonToplam: 2, aksiyonAcik: 1 }));
    expect(adim(y, 'aksiyon').cumle).toBe('Açık aksiyonu tamamlayın.');
  });

  it('hepsi bittiyse adım tamamdır', () => {
    const y = kapanisYolu(temel({ aksiyonToplam: 2, aksiyonAcik: 0 }));
    expect(adim(y, 'aksiyon').durum).toBe('tamam');
    expect(adim(y, 'aksiyon').olgu).toBe('2/2');
  });
});

describe('doğrulama — "yapılmadı" ile "sırası gelmedi" ayrılır', () => {
  it('aksiyon bitmeden doğrulama BEKLİYOR durumundadır, eksik değil', () => {
    /* Yapılamayacak bir işi "eksik" göstermek, kullanıcıya olmayan bir
       borç yazmaktır. */
    const y = kapanisYolu(temel({ aksiyonToplam: 2, aksiyonAcik: 1 }));
    expect(adim(y, 'dogrulama').durum).toBe('bekliyor');
    expect(y.sonraki?.anahtar).toBe('aksiyon');
  });

  it('aksiyon bitti ve doğrulama yoksa sıradaki iş doğrulamadır', () => {
    const y = kapanisYolu(temel({ aksiyonToplam: 2, aksiyonAcik: 0 }));
    expect(adim(y, 'dogrulama').durum).toBe('eksik');
    expect(y.sonraki?.etiket).toBe('Doğrulama ekle');
  });

  it('doğrulama bekleyen aksiyon varsa cümle onu söyler', () => {
    const y = kapanisYolu(temel({
      aksiyonToplam: 1, aksiyonAcik: 0, dogrulamaBekleyen: true,
    }));
    expect(adim(y, 'dogrulama').cumle).toContain('doğrulayın');
  });

  it('kapanış doğrulaması kaydı varsa adım tamamdır', () => {
    const y = kapanisYolu(temel({
      aksiyonToplam: 1, aksiyonAcik: 0,
      kapanisDogrulama: '2026-09-01T00:00:00.000Z',
    }));
    expect(adim(y, 'dogrulama').durum).toBe('tamam');
    expect(adim(y, 'dogrulama').olgu).toBe('2026-09-01');
  });

  it('retest gerekli ve sonucu girilmişse doğrulama tamamdır', () => {
    const y = kapanisYolu(temel({
      aksiyonToplam: 1, aksiyonAcik: 0,
      retestGerekli: true, retestSonucu: 'Yeniden tarandı, açık bulgu yok',
    }));
    expect(adim(y, 'dogrulama').durum).toBe('tamam');
  });
});

describe('kapanış', () => {
  it('her şey tamamsa sıradaki iş kapanıştır', () => {
    const y = kapanisYolu(temel({
      aksiyonToplam: 1, aksiyonAcik: 0,
      kapanisDogrulama: '2026-09-01T00:00:00.000Z',
    }));
    expect(y.sonraki?.anahtar).toBe('kapanis');
    expect(y.sonraki?.etiket).toBe('Kapanışa gönder');
    expect(adim(y, 'kapanis').olgu).toBe('hazır');
  });

  it('kapanmış kayıtta sıradaki iş YOKTUR', () => {
    const y = kapanisYolu(temel({ durum: 'kapali' }));
    expect(y.sonraki).toBeNull();
    expect(y.bitti).toBe(true);
  });

  it('riski kabul edilmiş kayıt kapanış İSTEMEZ ve öyle yazar', () => {
    const y = kapanisYolu(temel({ durum: 'kabul_edildi' }));
    expect(y.bitti).toBe(true);
    expect(adim(y, 'kapanis').ad).toBe('Risk kabulü');
    expect(adim(y, 'kapanis').cumle).toContain('kapanış istemiyor');
  });

  it('doğrulama kaydı OLMADAN kapanmış kayıt "tamam" gösterilmez', () => {
    /* Üç seçenek de yanlış olurdu: "tamam" yalan, "eksik" kapanmış bir
       kayda yapılamayacak iş dayatmak, sessizce gizlemek ise denetimde
       en pahalı olan. Dördüncü hâl: olanı yaz. */
    const y = kapanisYolu(temel({ durum: 'kapali', aksiyonToplam: 1, aksiyonAcik: 0 }));
    expect(adim(y, 'dogrulama').durum).toBe('bekliyor');
    expect(adim(y, 'dogrulama').cumle).toContain('doğrulama kaydı olmadan kapanmış');
    expect(adim(y, 'dogrulama').olgu).toBe('kayıt yok');
    expect(y.sonraki).toBeNull();
  });

  it('riski kabul edilen kayıt doğrulama İSTEMEZ', () => {
    const y = kapanisYolu(temel({ durum: 'kabul_edildi' }));
    expect(adim(y, 'dogrulama').cumle).toContain('doğrulama istemez');
  });

  it('ilerleme sayısı adım durumlarından türer, ayrı sayılmaz', () => {
    const y = kapanisYolu(temel({ aksiyonToplam: 1, aksiyonAcik: 1 }));
    expect(y.ilerleme.toplam).toBe(5);
    expect(y.ilerleme.tamam).toBe(y.adimlar.filter((a) => a.durum === 'tamam').length);
  });
});

describe('yol ile sunucu kapısı AYRIŞAMAZ', () => {
  /* Ekranın "kapanışa hazır" deyip sunucunun reddetmesi, kullanıcının
     güvenini bir kez kaybettiren kusurdur. `kapanisYolu` ikinci bir
     kural yazmaz; `kapanisKapisi`yi çağırır. Bu test onu dondurur. */
  const haller: KapanisGirdisi[] = [
    temel(),
    temel({ onemDerecesi: 'kritik' }),
    temel({ onemDerecesi: 'kritik', aksiyonToplam: 2, aksiyonAcik: 1 }),
    temel({ onemDerecesi: 'yuksek', tekrarMi: true }),
    temel({
      onemDerecesi: 'kritik', aksiyonToplam: 1, aksiyonAcik: 0,
      analiz: {
        kategori: 'surec', metin: 'y'.repeat(60), analizEdenId: 'k1', analizZamani: 1,
      },
      kapanisDogrulama: '2026-09-01T00:00:00.000Z',
    }),
    temel({ aksiyonToplam: 3, aksiyonAcik: 3 }),
  ];

  it.each(haller.map((h, i) => [i, h] as const))(
    'hâl %i: ekran "kapanışa hazır" derse kapı da açıktır',
    (_i, h) => {
      const y = kapanisYolu(h);
      const kapi = kapanisKapisi({
        onemDerecesi: h.onemDerecesi,
        tekrarMi: h.tekrarMi,
        analiz: h.analiz,
        acikAksiyon: h.aksiyonAcik,
      });
      const ekranHazirDiyor = y.sonraki?.anahtar === 'kapanis';
      if (ekranHazirDiyor) expect(kapi.ok).toBe(true);
      /* Tersi zorunlu değil: kapı açık olsa bile doğrulama kaydı
         yoksa yol önce doğrulamayı ister — yol kapıdan DAHA SIKI
         olabilir, daha gevşek olamaz. */
    },
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   EKRANIN KENDİSİ — kaynak metni üzerinden dondurulan kurallar

   Alan mantığı yukarıda ölçüldü. Aşağıdakiler ekranın YERLEŞİM
   kararlarıdır ve tarayıcı ölçümü (`arac/bilissel-yuk.mjs`) onları sayı
   olarak doğrular; burada donan şey kuralın kendisidir.
   ═══════════════════════════════════════════════════════════════════ */

const EKRAN = 'app/(kabuk)/(operasyonel)/bulgular/[id]/BulguDetayIstemci.tsx';
const BANT = 'components/kabuk/ekran.tsx';
const oku = (y: string) => readFileSync(y, 'utf8');

describe('bulgu kaydı ekranı', () => {
  it('kapanış şeridi TIKLANABİLİR — süs değil, navigatör [BUL-KAP-003]', () => {
    const bant = oku(BANT);
    /* Adımlar `<button>`dur ve `git` çağırır. Eskiden `Asamalar`
       kullanılıyordu: dört aşama, dört tarih, sıfır etkileşim. */
    expect(bant).toContain('export function KapanisBandi(');
    expect(bant).toMatch(/<button type="button" onClick=\{\(\) => git\(a\.anahtar\)\}/);

    const ekran = oku(EKRAN);
    expect(ekran).toContain('<KapanisBandi');
    expect(ekran).not.toContain('<Asamalar');
    /* Birincil eylem ANA KOLONDA ve şeritle aynı bloktadır: ölçümde
       ilk birincil eylem 1098px'ten 390px'e indi. */
    expect(ekran).toMatch(/birincil=\{yol\.sonraki && veri\.yazabilir/);
  });

  it('kök nedene yazan İKİNCİ form yoktur [BUL-KAP-004]', () => {
    const ekran = oku(EKRAN);
    /* Kaldırılan form `bulguGuncelle({ kokNeden })` ile kategorisiz,
       asgari uzunluksuz ve imzasız yazabiliyordu — yani kapanış
       kapısının reddettiği hâli tam olarak o üretiyordu. */
    expect(ekran).not.toContain('CapaAlanlari');
    expect(ekran).not.toMatch(/kokNeden:\s*(neden|deger)/);
    expect(ekran).not.toContain('<textarea className="ab-gr" value={neden}');
    expect(ekran).toContain('kokNedenKaydet(');
    /* Retest bloğu kaldı — o ayrı bir alandır. */
    expect(ekran).toContain('function RetestBlogu(');
  });

  it('kayıt açılınca düzenleme formu KENDİLİĞİNDEN gelmez [BUL-KAP-005]', () => {
    const ekran = oku(EKRAN);
    expect(ekran).toContain('const [duzenle, setDuzenle] = useState(false);');
    expect(ekran).toContain('const [analizAcik, setAnalizAcik] = useState(false);');
    /* Geçmiş ana yüzeyde durmaz: zaman ekseni denetim izi sekmesinde. */
    const anaKolonSonu = ekran.indexOf('</main>');
    expect(ekran.slice(0, anaKolonSonu)).not.toContain('<ZamanCizelgesi');
    expect(ekran).toContain('<ZamanCizelgesi');
  });
});
