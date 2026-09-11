import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · TÜRETİCİ GENİŞLEYİNCE AÇILAN CÜMLELER [SIS-POL-002]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bu satırları bir insan bulmadı; İKİNCİ BİR POPÜLASYON TANIĞI buldu.
   Kütüğün paydası tek bir düzenli ifadeden türüyordu ve o ifade neyi
   göremiyorsa kütükte YOKTU — görülmeyen bir cümle ölçülmemiş de
   sayılmıyordu, çünkü kimse onu saymıyordu. Türetici genişletildi
   (184 → 213 cümle) ve açılan 33 satırın 17'si mevcut ölçümlere
   eşlendi; KALAN 16'nın gerçek yol ölçümü bu dosyadadır.

   Sayı DÜŞMEDİ, YÜKSELDİ. Bu bir başarısızlık değil, görünmeyen borcun
   görünür olmasıdır: kör bir paydada hesaplanan "%100 ölçüldü" oranı,
   ölçülmemiş bir iddiadan daha tehlikelidir — çünkü bakmayı bitirir.

   ── ÖLÇÜT ─────────────────────────────────────────────────────────────
   Her vaka, cümleyi UYGULAYAN kodun gerçek yolunu sürer. Cümlenin
   doğru, kodun doğru olması BAĞI kurmuş saymaz (R-F). Vakaların çoğu
   KARŞI TANIK taşır: "reddedildi" ölçümü, hiçbir şey çalışmadıysa da
   yeşil yanardı.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-tanik-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');

const damga = Date.now();
type Yetki = {
  rol: string; modul: string | null; kapsamOgesiId: string | null;
  surecId: string | null; regulasyonId: string | null;
};
const oturum = {
  id: '', adSoyad: 'Kurgusal Tanık', eposta: `tanik-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});
const rol = (r: string, kapsamOgesiId: string | null = null): Yetki[] =>
  [{ rol: r, modul: null, kapsamOgesiId, surecId: null, regulasyonId: null }];

beforeAll(async () => {
  const k = await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: oturum.adSoyad, aktif: true },
  });
  oturum.id = k.id;
  oturum.yetkiler = rol('yonetici');
});
afterAll(async () => { await db.$disconnect(); await rm(dizin, { recursive: true, force: true }); });

const izSayisi = () => db.aktiviteKaydi.count();

/** Yorumsuz kaynak — yorumdaki bir örnek kusur değildir. */
function kaynakOku(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/* ═══ POL-201 · "Ad … ile başlamıyor — kayıt bu tesise bağlanmaz" ═════ */

describe('POL-201 · yedekleme politikası ↔ kapsam ögesi bağı ADLADIR [SIS-POL-002]', () => {
  it('ÖNEKSİZ ad HİÇBİR ögeye bağlanmaz; önek eklenince bağlanır [SIS-POL-002]', async () => {
    const { politikaEslemesi } = await import('@/lib/yedekleme/politikaEslemesi');
    const ogeler = [{ id: 'A', ad: 'Kurgusal Saha' }];

    /* Ekranın cümlesi: ad öge adıyla başlamazsa kayıt BAĞLANMAZ. */
    const oneksiz = politikaEslemesi(ogeler, [{ ad: 'Kontrol sistemi yedeklemesi' }]);
    expect(oneksiz.get('A'), 'öneksiz politika bir ögeye bağlandı').toBeUndefined();

    /* KARŞI TANIK: eşleme çalışıyor — önekli ad BAĞLANIYOR. Yoksa
       "bağlanmadı" ölçümü, fonksiyon hiç eşleşme yapmasa da yeşildi. */
    const onekli = politikaEslemesi(ogeler,
      [{ ad: 'Kurgusal Saha — kontrol sistemi yedeklemesi' }]);
    expect(onekli.get('A')?.ad).toBe('Kurgusal Saha — kontrol sistemi yedeklemesi');
  });

  it('UZUN AD ÖNCE denenir — kısa adlı öge uzun adlının kaydını KAPMAZ [SIS-POL-002]', async () => {
    const { politikaEslemesi } = await import('@/lib/yedekleme/politikaEslemesi');
    const h = politikaEslemesi(
      [{ id: 'kisa', ad: 'Kurgusal' }, { id: 'uzun', ad: 'Kurgusal B' }],
      [{ ad: 'Kurgusal B — yedekleme' }, { ad: 'Kurgusal — yedekleme' }],
    );
    expect(h.get('uzun')?.ad).toBe('Kurgusal B — yedekleme');
    expect(h.get('kisa')?.ad).toBe('Kurgusal — yedekleme');
  });

  it('EKRAN ve SAYFA aynı kuralı kullanır — cümle ile bağ AYNI YERDEN [SIS-POL-002]', () => {
    /* R-F'nin ölçtüğü BAĞ budur: ekran `startsWith` diye uyarıyor,
       sayfa da eşlemeyi `politikaEslemesi` ile kuruyor. İkisi ayrı
       kural olsaydı ekran doğru, davranış başka olurdu. */
    const ekran = kaynakOku('app/(kabuk)/(operasyonel)/yedekleme/Eylemler.tsx');
    expect(ekran).toMatch(/v\.ad\.startsWith\(tesis\.ad\)/);
    const sayfa = kaynakOku('app/(kabuk)/(operasyonel)/yedekleme/page.tsx');
    expect(sayfa).toMatch(/politikaEslemesi\(/);
    const kural = kaynakOku('lib/yedekleme/politikaEslemesi.ts');
    expect(kural).toMatch(/p\.ad\.startsWith\(t\.ad\)/);
  });
});

/* ═══ POL-202 · "Adım tanımlanmadı — … varlık da bağlanamaz" ══════════ */

describe('POL-202 · adımsız süreçte zincir kurulmaz [SIS-POL-002]', () => {
  it('ADIMI OLMAYAN sürece varlık BAĞLANAMAZ; adım açılınca bağlanır [SIS-POL-002]', async () => {
    const { isSureciKaydet, prosesAdimiKaydet, adimVarligiAta } =
      await import('@/lib/eylemler2/varlikYonetisim');

    const kod = `TNK-SRC-${damga}`;
    expect((await isSureciKaydet({ kod, ad: 'Kurgusal süreç', tesisId: null })).ok).toBe(true);
    const surec = await db.isSureci.findFirst({ where: { kod }, select: { id: true } });
    expect(surec, 'süreç kurulamadı').not.toBeNull();

    /* Ekranın cümlesi: kırılım yoksa zincir HİÇ KURULMADI. */
    expect(await db.prosesAdimi.count({ where: { surecId: surec!.id } })).toBe(0);

    const varlik = await db.varlik.findFirst({ select: { id: true } });
    expect(varlik, 'varlık fikstürü yok').not.toBeNull();

    /* Bağlanacak bir adım YOKTUR: olmayan adıma atama reddedilir. */
    const ret = await adimVarligiAta({
      adimId: `${surec!.id}-olmayan-adim`, varlikId: varlik!.id, rol: 'kontrol',
    });
    expect(ret.ok, 'adımsız süreçte varlık bağlandı').toBe(false);

    /* KARŞI TANIK: adım açılınca AYNI çağrı geçer — ret "her şey
       reddediliyor"dan değil, zincirin kurulmamış olmasından geliyordu. */
    expect((await prosesAdimiKaydet({
      surecId: surec!.id, kod: `${kod}-A1`, ad: 'Kurgusal adım', sira: 1,
    })).ok).toBe(true);
    const adim = await db.prosesAdimi.findFirst({
      where: { surecId: surec!.id }, select: { id: true },
    });
    expect((await adimVarligiAta({
      adimId: adim!.id, varlikId: varlik!.id, rol: 'kontrol',
    })).ok).toBe(true);
  });
});

/* ═══ POL-206 · "dosyayı saklamaz ve bu adrese istek atmaz" ═══════════ */

describe('POL-206 · belge kütüğü DOSYA SAKLAMAZ, adrese İSTEK ATMAZ [SIS-POL-002]', () => {
  it('ŞEMADA belge İÇERİĞİ için alan YOKTUR — olmayan alan doldurulamaz [SIS-POL-002]', () => {
    const sema = readFileSync('prisma/schema.prisma', 'utf8');
    const model = sema.slice(sema.indexOf('\nmodel Dokuman {'));
    const govde = model.slice(0, model.indexOf('\n}\n'));
    /* İçerik alanı olsaydı "saklamaz" bir ekran kararı olurdu; alan
       yoksa kalıcıdır. */
    for (const yasak of [/\bicerik\s+(String|Bytes)/, /\bdosya\s+(String|Bytes)/,
      /\bgovde\s+(String|Bytes)/, /\bveri\s+Bytes/]) {
      expect(govde, `Dokuman modelinde içerik alanı var: ${yasak}`).not.toMatch(yasak);
    }
    /* KARŞI TANIK: ADRES alanı VAR — doğru modeli okuyoruz. */
    expect(govde).toMatch(/\bdisKaynak\s+String\?/);
  });

  it('KOD hiçbir yerde `disKaynak`a istek ATMAZ [SIS-POL-002]', () => {
    /* "İstek atmaz" ancak kaynağın TAMAMINDA ölçülür: tek bir dosyaya
       bakan bir vaka, ikinci bir çağıranı görmezdi. */
    /* grep EŞLEŞME YOKSA 1 ile çıkar ve fırlatır: yutulan bir hata,
       "hiçbir şey bulunamadı" ile "komut hiç koşmadı"yı aynı gösterirdi.
       Bu yüzden önce ARANAN dizenin BULUNDUĞU bir çağrı ile aracın
       çalıştığı kanıtlanır (karşı tanık), sonra yasak kalıp aranır. */
    const ara = (kalip: string) => {
      try {
        return execFileSync('grep', ['-rn', '--include=*.ts', '--include=*.tsx',
          '-E', kalip, 'app', 'lib'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch (e) {
        const h = e as { status?: number };
        if (h.status === 1) return '';      // eşleşme yok
        throw e;                            // 2 = gerçek hata; yutulmaz
      }
    };
    expect(ara('disKaynak'), 'grep hiç çalışmadı — vaka bir şey ölçmüyor').not.toBe('');
    const cikti = ara('(fetch|axios|got|request)\\s*\\(.*disKaynak');
    expect(cikti, `disKaynak adresine istek atan kod:\n${cikti}`).toBe('');
  }, 30_000);
});

/* ═══ POL-207 · "Kararsız bir kayıt 'yapıldı' işaretlenemez" ══════════ */

describe('POL-207 · gözden geçirmenin değeri KARARLARDIR [SIS-POL-002]', () => {
  it('KARARSIZ kayıt tamamlanamaz; karar eklenince tamamlanır [SIS-POL-002]', async () => {
    const { gozdenGecirmeKaydet, gozdenGecirmeKarariEkle, gozdenGecirmeTamamla } =
      await import('@/lib/eylemler2/gozdenGecirme');

    const baslik = `Kurgusal gözden geçirme ${damga}`;
    const dun = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    expect((await gozdenGecirmeKaydet({ baslik, tarih: dun })).ok).toBe(true);
    const gg = await db.yonetimGozdenGecirme.findFirst({
      where: { baslik }, select: { id: true },
    });
    expect(gg, 'gözden geçirme kurulamadı').not.toBeNull();

    const oncekiIz = await izSayisi();
    const ret = await gozdenGecirmeTamamla({ id: gg!.id, ozet: 'Özet metni yazıldı.' });
    expect(ret.ok, 'kararsız kayıt "yapıldı" işaretlendi').toBe(false);
    /* Yan etki de yok: reddedilen bir tamamlama iz de bırakmaz. */
    expect(await izSayisi()).toBe(oncekiIz);
    expect((await db.yonetimGozdenGecirme.findUnique({
      where: { id: gg!.id }, select: { durum: true } }))!.durum).toBe('planli');

    /* KARŞI TANIK: KARAR eklenince aynı çağrı geçer. */
    expect((await gozdenGecirmeKarariEkle({
      gozdenGecirmeId: gg!.id, karar: 'Kurgusal karar',
      sorumluId: oturum.id,
      sonTarih: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    })).ok).toBe(true);
    expect((await gozdenGecirmeTamamla({
      id: gg!.id, ozet: 'Özet metni yazıldı.' })).ok).toBe(true);
    expect((await db.yonetimGozdenGecirme.findUnique({
      where: { id: gg!.id }, select: { durum: true } }))!.durum).toBe('yapildi');
  });
});

/* ═══ POL-208 · "ürün bunları hesaplamaz" (tek nokta · RTO/RPO) ═══════ */

describe('POL-208 · tek nokta, yedeklilik ve RTO/RPO İNSAN değerlendirmesidir [SIS-POL-002]', () => {
  it('HİÇBİR MOTOR bu alanları yazmaz; insan eylemi YAZAR [SIS-POL-002]', async () => {
    const ara = (kalip: string, ...dizinler: string[]) => {
      try {
        return execFileSync('grep', ['-rn', '--include=*.ts', '-E', kalip, ...dizinler],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch (e) {
        const h = e as { status?: number };
        if (h.status === 1) return '';
        throw e;
      }
    };
    /* Karşı tanık: aynı kalıp EYLEM katmanında BULUNUYOR — araç çalışıyor
       ve alanlar gerçekten var; motor katmanında olmaması bir ölçümdür. */
    expect(ara('(rtoSaat|rpoSaat)\\s*:', 'lib/eylemler2'),
      'grep hiç çalışmadı — vaka bir şey ölçmüyor').not.toBe('');
    const cikti = ara('(rtoSaat|rpoSaat|tekNokta)\\s*:', 'lib/motorlar', 'lib/entegrasyon');
    expect(cikti, `motor katmanı RTO/RPO/tek nokta yazıyor:\n${cikti}`).toBe('');

    /* KARŞI TANIK: alanlar VAR ve İNSAN eylemi onları yazıyor — ölçüm
       "böyle bir alan yok" diye değil, doğru yerde olduğu için yeşil. */
    const { prosesAdimiKaydet } = await import('@/lib/eylemler2/varlikYonetisim');
    const surec = await db.isSureci.findFirst({ select: { id: true } });
    const kod = `TNK-RTO-${damga}`;
    const sira = (await db.prosesAdimi.count({ where: { surecId: surec!.id } })) + 900;
    expect((await prosesAdimiKaydet({
      surecId: surec!.id, kod, ad: 'Kurgusal RTO adımı', sira, rtoSaat: 4, rpoSaat: 2,
    })).ok).toBe(true);
    const yazilan = await db.prosesAdimi.findFirst({
      where: { kod }, select: { rtoSaat: true, rpoSaat: true },
    });
    expect(yazilan).toMatchObject({ rtoSaat: 4, rpoSaat: 2 });
  }, 30_000);
});

/* ═══ POL-210 · "bağlı olduğu HEPSİNDE uyum yazma yetkisi ister" ══════ */

describe('POL-210 · çok bağlı kanıt HER kapsamda yetki ister [SIS-POL-002]', () => {
  it('İKİ kapsama bağlı kanıt, TEK kapsamlı rolle düzenlenemez [SIS-POL-002]', async () => {
    const { kanitKaydet } = await import('@/lib/eylemler2/kanit');

    /* İki FARKLI kapsam ögesine düşen iki madde durumu bulunur. */
    const durumlar = await db.maddeDurumu.findMany({
      select: { id: true, kapsamOgesiId: true }, take: 400,
    });
    const ilk = durumlar[0];
    const ikinci = durumlar.find((d) => d.kapsamOgesiId !== ilk?.kapsamOgesiId);
    expect(ilk, 'madde durumu fikstürü yok').toBeTruthy();
    expect(ikinci, 'ikinci kapsamda madde durumu yok — vaka kurulamıyor').toBeTruthy();

    const kanit = await db.kanit.create({
      data: { ad: `Kurgusal çok bağlı kanıt ${damga}`, tip: 'politika', durum: 'gecerli' },
    });
    await db.kanitBaglantisi.createMany({ data: [
      { kanitId: kanit.id, maddeDurumuId: ilk!.id },
      { kanitId: kanit.id, maddeDurumuId: ikinci!.id },
    ] });

    const onceki = oturum.yetkiler;
    try {
      /* YALNIZ BİR kapsamda yetkili rol. */
      oturum.yetkiler = rol('tesis_yoneticisi', ilk!.kapsamOgesiId);
      const ret = await kanitKaydet({
        id: kanit.id, ad: 'Yeni ad', tip: 'politika', durum: 'gecerli',
      });
      expect(ret.ok, 'tek kapsamlı rol çok bağlı kanıdı düzenledi').toBe(false);
      expect((await db.kanit.findUnique({
        where: { id: kanit.id }, select: { ad: true } }))!.ad)
        .toBe(`Kurgusal çok bağlı kanıt ${damga}`);

      /* KARŞI TANIK: İKİ kapsamda da yetkili rol GEÇER. */
      oturum.yetkiler = [...rol('tesis_yoneticisi', ilk!.kapsamOgesiId),
        ...rol('tesis_yoneticisi', ikinci!.kapsamOgesiId)];
      expect((await kanitKaydet({
        id: kanit.id, ad: 'Yeni ad', tip: 'politika', durum: 'gecerli' })).ok).toBe(true);
    } finally { oturum.yetkiler = onceki; }
  });

  it('BAĞI OLMAYAN kanıt yalnız KAPSAMSIZ yetkiyle düzenlenir [SIS-POL-002]', async () => {
    const { kanitKaydet } = await import('@/lib/eylemler2/kanit');
    const oksuz = await db.kanit.create({
      data: { ad: `Kurgusal öksüz kanıt ${damga}`, tip: 'politika', durum: 'gecerli' },
    });
    const onceki = oturum.yetkiler;
    try {
      const tesis = await db.kapsamOgesi.findFirst({ select: { id: true } });
      oturum.yetkiler = rol('tesis_yoneticisi', tesis!.id);
      expect((await kanitKaydet({
        id: oksuz.id, ad: 'Yeni ad', tip: 'politika', durum: 'gecerli' })).ok,
      'kapsama kısıtlı rol öksüz kanıdı düzenledi').toBe(false);

      oturum.yetkiler = rol('yonetici');
      expect((await kanitKaydet({
        id: oksuz.id, ad: 'Yeni ad', tip: 'politika', durum: 'gecerli' })).ok).toBe(true);
    } finally { oturum.yetkiler = onceki; }
  });
});

/* ═══ POL-211 · "yalnız son 300 kayıt tarandı" ═══════════════════════ */

describe('POL-211 · konsol iz penceresi 300 KAYITTIR [SIS-POL-002]', () => {
  it('PENCERE gerçekten 300: daha fazla iz varken 300 satır dönüyor [SIS-POL-002]', async () => {
    const { konsolVerisi } = await import(
      '@/app/(kabuk)/(operasyonel)/yonetim-tezgahi/konsolVerisi');

    /* Pencereyi gerçekten doldur: kaynak kodu okuyan bir vaka, sabit
       300 yazıp `take`i kaldırmayı GÖRMEZDİ. */
    const hedef = 320;
    const mevcut = await db.aktiviteKaydi.count({
      where: { varlikTipi: { in: ['Yapilandirma'] } },
    });
    if (mevcut < hedef) {
      await db.aktiviteKaydi.createMany({ data: Array.from(
        { length: hedef - mevcut }, (_, i) => ({
          aktorId: oturum.id, varlikTipi: 'Yapilandirma',
          varlikId: `tanik-${damga}-${i}`, eylem: 'guncelleme',
        })) });
    }
    const toplam = await db.aktiviteKaydi.count({
      where: { varlikTipi: { in: ['Yapilandirma'] } },
    });
    expect(toplam, 'pencere dolmadı — vaka hiçbir şey ölçmezdi')
      .toBeGreaterThan(300);

    const v = await konsolVerisi(
      { ...oturum, yetkiler: rol('yonetici') } as never, Date.now());
    expect(v.gecmis.length, 'iz penceresi 300 değil').toBe(300);
  }, 60_000);
});

/* ═══ POL-213 · "Kapsam boş bırakılamaz" ════════════════════════════ */

describe('POL-213 · dış denetçi daveti KAPSAMSIZ açılamaz [SIS-POL-002]', () => {
  it('BOŞ kapsamla davet REDDEDİLİR ve HİÇBİR yetki satırı yazılmaz [SIS-POL-002]', async () => {
    const { denetciDavetEt } = await import('@/lib/eylemler2/denetciErisimi');
    const denetci = await db.kullanici.create({
      data: { eposta: `denetci-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Denetçi', aktif: true },
    });
    const bitis = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    const ret = await denetciDavetEt({
      kullaniciId: denetci.id, firma: 'Kurgusal Denetim A.Ş.', bitis, tesisIdler: [],
    });
    expect(ret.ok, 'kapsamsız davet açıldı').toBe(false);
    expect(await db.yetki.count({ where: { kullaniciId: denetci.id } }),
      '"boş kapsam = her şey" davranışı: yetki satırı yazıldı').toBe(0);

    /* KARŞI TANIK: BİR öge seçilince davet geçer ve TAM BİR satır yazar —
       ret kapsamdan geliyordu, tarihten ya da yetkiden değil. */
    const oge = await db.kapsamOgesi.findFirst({ select: { id: true, tesisId: true } });
    expect(oge?.tesisId, 'tesise bağlı kapsam ögesi yok').toBeTruthy();
    expect((await denetciDavetEt({
      kullaniciId: denetci.id, firma: 'Kurgusal Denetim A.Ş.', bitis,
      tesisIdler: [oge!.tesisId!] })).ok).toBe(true);
    expect(await db.yetki.count({
      where: { kullaniciId: denetci.id, rol: 'dis_denetci' } })).toBe(1);
  });
});

/* ═══ POL-214 · "Kapsam dışı kontrol paydaya girmez ama AYRI raporlanır" */

describe('POL-214 · hazırlık paydası ve kapsam dışı [SIS-POL-002]', () => {
  it('KAPSAM DIŞI paydadan düşer ama SAYISI ayrıca durur [SIS-POL-002]', async () => {
    const { kapsamaOzeti, eksikDagilimi } = await import('@/lib/uyum/kapsama');
    const satir = (durum: string, ek: Partial<{
      gecerliKanit: number; kanitBayat: boolean; dogrulandi: boolean;
    }> = {}) => ({
      durum, gecerliKanit: 0, kanitBayat: false, dogrulandi: false,
      guven: null as string | null, ...ek,
    });
    const satirlar = [
      satir('uyumlu', { gecerliKanit: 1, dogrulandi: true }),
      satir('degerlendirilmedi'),
      satir('kapsamdisi'), satir('kapsamdisi'), satir('kapsamdisi'),
    ];
    const o = kapsamaOzeti(satirlar as never);
    expect(o.kapsamda, 'kapsam dışı paydaya girdi').toBe(2);
    expect(o.kapsamDisi, 'kapsam dışı ayrıca raporlanmıyor').toBe(3);
    expect(o.hazirlikOrani, 'oran 2 kontrol üzerinden hesaplanmalı').toBe(50);

    /* PAYDAYI KÜÇÜLTMEK ORANI YÜKSELTİR — cümlenin uyardığı şey budur.
       Aynı iki kontrolden eksik olanı kapsam dışına alınca oran %100
       olur ve kapsam dışı sayısı 3 → 4 çıkar: iyileşme GÖRÜNÜR olmaz. */
    const daraltilmis = kapsamaOzeti([
      satir('uyumlu', { gecerliKanit: 1, dogrulandi: true }),
      satir('kapsamdisi'), satir('kapsamdisi'), satir('kapsamdisi'), satir('kapsamdisi'),
    ] as never);
    expect(daraltilmis.hazirlikOrani).toBe(100);
    expect(daraltilmis.kapsamDisi).toBe(4);

    /* "Tek bir hazırlık puanı üretilmez": eksikler DÖRT AYRI sayaçtır
       ve hepsi kapsamdakiler üzerinden sayılır. */
    const eksik = eksikDagilimi(satirlar as never);
    expect(Object.keys(eksik).sort())
      .toEqual(['degerlendirilmedi', 'dogrulanmadi', 'kanitBayat', 'kanitYok']);
    expect(eksik.degerlendirilmedi).toBe(1);
  });
});

/* ═══ POL-218 · "reddedildi ama sebebi yazılmamış" ═══════════════════ */

describe('POL-218 · sebebi yazılmamış ret SESSİZCE geçilmez [SIS-POL-002]', () => {
  it('SEBEPSİZ ret bayrağı YANAR; sebep yazılınca söner [SIS-POL-002]', async () => {
    /* `kosuSatiri` dışa açık DEĞİLDİR ve öyle kalmalı: bayrağı ekranın
       gerçekten okuduğu yoldan — `connectorSagligi` → `gecmis[]` —
       ölçüyoruz. Dışa açmak, ölçmek için ürünü değiştirmek olurdu. */
    const { connectorSagligi } = await import('@/lib/entegrasyon/saglikOzeti');
    const connector = {
      id: 'c1', ad: 'Kurgusal connector', tip: 'edr', durum: 'aktif',
      etkin: true, sirReferansi: 'env:KURGUSAL', periyotDk: 60,
    };
    const kosu = {
      id: 'k1', durum: 'basarili', tetikleyen: 'zamanlanmis',
      baslangic: new Date(), bitis: new Date(), sureMs: 10,
      alinan: 3, kabulEdilen: 1, reddedilen: 2, yinelenen: 0, denemeNo: 1,
      imlecOnce: null, imlecSonra: null, hata: null, ayrinti: null,
      kuruKosu: false, kuruOzetJson: null,
    };
    const bayrak = (k: Record<string, unknown>) =>
      connectorSagligi(connector as never, [k as never]).gecmis[0].reddSebebiEksik;

    expect(bayrak(kosu), 'sebepsiz ret bayrağı yanmadı').toBe(true);

    /* KARŞI TANIK: sebep yazılınca bayrak SÖNER (iki ayrı alan da sayılır). */
    expect(bayrak({ ...kosu, ayrinti: 'Şema dışı üç kayıt' })).toBe(false);
    expect(bayrak({ ...kosu, hata: 'bağlantı koptu' })).toBe(false);
    /* Ret YOKSA bayrak da yanmaz — "her koşuda yanan" bir bayrak
       hiçbir şey söylemezdi. */
    expect(bayrak({ ...kosu, reddedilen: 0, alinan: 1 })).toBe(false);
  });
});

/* ═══ POL-221 · "motor yalnız bağı KAYITLI olanları sayabilir" ════════ */

describe('POL-221 · ölçülebilir bağ = KAYITLI bağ [SIS-POL-002]', () => {
  it('KAYITSIZ bağ sayılmaz — ve bu "etkisi yok" DİYE yazılmaz [SIS-POL-002]', async () => {
    const { etkiHesapla } = await import('@/lib/eylemler2/yonetim');

    const grup = await db.grup.create({
      data: { kod: `TNK-GRP-${damga}`, ad: `Kurgusal grup ${damga}` },
    });
    const ilk = await etkiHesapla({ hedefTipi: 'grup', hedefId: grup.id });
    expect(ilk.ok).toBe(true);
    if (!ilk.ok) return;
    /* Bağ kaydı yok: motorun sayabildiği sıfır. Ekranın cümlesi bunu
       "etkisi yok" diye değil, "ölçülebilir bağlı kayıt bulunmadı"
       diye söylüyor — ölçtüğümüz şey motorun SINIRI. */
    expect(ilk.etki.find((e) => e.baslik === 'Tüzel kişi')?.deger).toBe(0);

    /* KARŞI TANIK: bağ KAYDEDİLİNCE motor sayıyor. */
    await db.tuzelKisi.create({
      data: { kod: `TNK-TK-${damga}`, ad: `Kurgusal tüzel kişi ${damga}`, grupId: grup.id },
    });
    const sonra = await etkiHesapla({ hedefTipi: 'grup', hedefId: grup.id });
    expect(sonra.ok).toBe(true);
    if (!sonra.ok) return;
    expect(sonra.etki.find((e) => e.baslik === 'Tüzel kişi')?.deger).toBe(1);
  });
});

/* ═══ POL-223 · "Risk/bulgu adayı yalnız KRİTİK sapmada doğar" ════════ */

describe('POL-223 · aday YALNIZ kritik sapmadan doğar [SIS-POL-002]', () => {
  it('KRİTİK OLMAYAN sapma aday ÜRETMEZ; kritik üretir [SIS-POL-002]', async () => {
    const { sapmaAdayi } = await import('@/lib/entegrasyon/topoloji');
    const oncekiRisk = await db.risk.count();
    const oncekiBulgu = await db.bulgu.count();
    const temel = {
      id: `tnk-sapma-${damga}`, tip: 'yeni_gecit', aciklama: 'Kurgusal sapma',
      tesisId: null as string | null,
    };
    for (const siddet of ['dusuk', 'orta', 'yuksek']) {
      expect(sapmaAdayi({ ...temel, siddet }),
        `"${siddet}" şiddetinde aday doğdu`).toBeNull();
    }
    /* KARŞI TANIK: kritik sapma aday ÜRETİR — null "fonksiyon hep null
       döndürüyor" demek değil. */
    const aday = sapmaAdayi({ ...temel, siddet: 'kritik' });
    expect(aday, 'kritik sapma aday üretmedi').not.toBeNull();
    expect(aday!.onemDerecesi).toBe('kritik');
    expect(aday!.kaynakRef).toBe(temel.id);
    /* "Kayıt gerekiyorsa ELLE açılır": aday bir ÖNERİDİR, kayıt DEĞİL —
       kritik sapmada bile hiçbir risk/bulgu satırı doğmaz. */
    expect(await db.risk.count(), 'aday üretimi risk kaydı açtı').toBe(oncekiRisk);
    expect(await db.bulgu.count(), 'aday üretimi bulgu kaydı açtı').toBe(oncekiBulgu);
  });
});

/* ═══ POL-224 · "Süreç kodu değişmez · grup çapındaki süreç" ══════════ */

describe('POL-224 · süreç kodu DEĞİŞMEZ, grup çapındaki süreç KISITLI role kapalı [SIS-POL-002]', () => {
  it('KOD güncellemede YAZILMAZ — ad değişir, kod durur [SIS-POL-002]', async () => {
    const { isSureciKaydet } = await import('@/lib/eylemler2/varlikYonetisim');
    const kod = `TNK-KOD-${damga}`;
    expect((await isSureciKaydet({ kod, ad: 'İlk ad', tesisId: null })).ok).toBe(true);
    const s = await db.isSureci.findFirst({ where: { kod }, select: { id: true } });

    /* Aynı kayda BAŞKA bir kod gönderilir; ürün onu yazmamalıdır. */
    expect((await isSureciKaydet({
      id: s!.id, kod: `${kod}-DEGISTI`, ad: 'İkinci ad', tesisId: null })).ok).toBe(true);
    const sonra = await db.isSureci.findUnique({
      where: { id: s!.id }, select: { kod: true, ad: true } });
    expect(sonra!.kod, 'süreç kodu değişti').toBe(kod);
    /* KARŞI TANIK: güncelleme GERÇEKTEN koştu — ad değişti. */
    expect(sonra!.ad).toBe('İkinci ad');
  });

  it('TESİSE KISITLI rol, grup çapındaki süreci DÜZENLEYEMEZ [SIS-POL-002]', async () => {
    const { isSureciKaydet } = await import('@/lib/eylemler2/varlikYonetisim');
    const kod = `TNK-GRUPCAP-${damga}`;
    expect((await isSureciKaydet({ kod, ad: 'Grup çapında', tesisId: null })).ok).toBe(true);
    const s = await db.isSureci.findFirst({ where: { kod }, select: { id: true } });

    const onceki = oturum.yetkiler;
    try {
      const oge = await db.kapsamOgesi.findFirst({ select: { id: true } });
      oturum.yetkiler = rol('tesis_yoneticisi', oge!.id);
      const ret = await isSureciKaydet({
        id: s!.id, kod, ad: 'Kısıtlı rol yazdı', tesisId: null });
      expect(ret.ok, 'tesise kısıtlı rol grup çapındaki süreci düzenledi').toBe(false);
      expect((await db.isSureci.findUnique({
        where: { id: s!.id }, select: { ad: true } }))!.ad).toBe('Grup çapında');
    } finally { oturum.yetkiler = onceki; }
  });
});

/* ═══ POL-227 · "Uygulama geri alınamaz: değer yazılır, iz oluşur" ════ */

describe('POL-227 · uygulama GERİ ALINAMAZ [SIS-POL-002]', () => {
  it('DEĞER yazılır, İZ oluşur ve AYNI talep ikinci kez uygulanamaz [SIS-POL-002]', async () => {
    const { degisiklikOner, degisiklikOnayla, degisiklikUygula } =
      await import('@/lib/eylemler2/yonetim');
    const anahtar = 'motor.son_tarih.bulgu_gun';
    const once = await db.yapilandirma.findUnique({ where: { anahtar } });
    const eskiDeger = once ? JSON.parse(once.degerJson) as number : null;
    const yeniDeger = (typeof eskiDeger === 'number' ? eskiDeger : 14) + 3;

    const oner = await degisiklikOner({
      hedefTipi: 'ayar', hedefId: anahtar,
      sonra: { anahtar, deger: yeniDeger },
      gerekce: `Kurgusal tazelik değişikliği ${damga}`,
    });
    expect(oner.ok, 'talep açılamadı').toBe(true);
    const talep = await db.degisiklikTalebi.findFirst({
      where: { gerekce: `Kurgusal tazelik değişikliği ${damga}` },
      select: { id: true },
    });
    /* DÖRT GÖZ: talebi açan onaylayamaz. İkinci kişi olmadan bu vaka
       kurulamaz — ve bu kuralın kendisi de burada ölçülmüş olur. */
    expect((await degisiklikOnayla({ id: talep!.id })).ok,
      'dört göz kuralı delindi: talebi açan onayladı').toBe(false);
    const ikinciKisi = await db.kullanici.create({
      data: { eposta: `onay-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Onaycı', aktif: true },
    });
    const benimId = oturum.id;
    oturum.id = ikinciKisi.id;
    try {
      expect((await degisiklikOnayla({ id: talep!.id })).ok).toBe(true);
    } finally { oturum.id = benimId; }

    const oncekiIz = await izSayisi();
    expect((await degisiklikUygula({ id: talep!.id })).ok).toBe(true);

    /* "değer yazılır" */
    expect(JSON.parse((await db.yapilandirma.findUnique({
      where: { anahtar } }))!.degerJson)).toBe(yeniDeger);
    /* "iz oluşur" */
    expect(await izSayisi(), 'uygulama iz bırakmadı').toBeGreaterThan(oncekiIz);
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Yapilandirma', varlikId: anahtar },
      orderBy: { zaman: 'desc' }, select: { yeniDeger: true, gerekce: true },
    });
    expect(iz!.gerekce).toContain(`Kurgusal tazelik değişikliği ${damga}`);

    /* "geri alınamaz": aynı talep ikinci kez uygulanamaz ve bir GERİ ALMA
       eylemi YOKTUR — geri dönüş ancak YENİ bir taleple olur. */
    const tekrar = await degisiklikUygula({ id: talep!.id });
    expect(tekrar.ok, 'uygulanmış talep ikinci kez uygulandı').toBe(false);
    const eylemler = kaynakOku('lib/eylemler2/yonetim.ts');
    expect(eylemler, 'bir "geri al" eylemi var — cümle yanlış')
      .not.toMatch(/export async function (degisiklikGeriAl|uygulamayiGeriAl)/);
  });
});

/* ═══ POL-229 · "hiçbir siteye kendiliğinden bağlanmaz" ══════════════ */

describe('POL-229 · resmî kaynak takibi BAĞLI DEĞİL [SIS-POL-002]', () => {
  it('EKRANIN cümlesi SAĞLAYICI SABİTİNDEN gelir ve sağlayıcı BAĞLI DEĞİLDİR [SIS-POL-002]', async () => {
    const { mevzuatSaglayici, etkinKaynakSaglayici } =
      await import('@/lib/uyum/mevzuatKaynagi');
    expect(mevzuatSaglayici.bagli, 'sağlayıcı bağlı görünüyor').toBe(false);
    expect(etkinKaynakSaglayici(), 'etkin sağlayıcı var').toBeNull();
    expect(mevzuatSaglayici.bagliDegilkenDavranis)
      .toContain('"değişiklik yok" DEMEZ');
    /* BAĞ: ekran bu sabiti RENDER EDİYOR — cümle elle kopyalanmış
       olsaydı sabit değişince ekran eski sözü söylemeye devam ederdi. */
    const ekran = kaynakOku('app/(kabuk)/(operasyonel)/regulasyonlar/RegulasyonlarIstemci.tsx');
    expect(ekran).toMatch(/mevzuatSaglayici\.bagliDegilkenDavranis/);
  });

  it('ETKİN KAYNAK YOKKEN radar AĞA HİÇ ÇIKMAZ [SIS-POL-002]', async () => {
    const { mevzuatRadariniKos } = await import('@/lib/uyum/mevzuatRadariKosumu');
    await db.mevzuatKaynagi.updateMany({ data: { etkin: false } });
    let cagri = 0;
    const k = await mevzuatRadariniKos(db as never, {
      getir: async () => { cagri += 1; return { ok: false, httpKodu: null, hata: 'olmamalı' }; },
    });
    expect(cagri, 'etkin kaynak yokken ağa çıkıldı').toBe(0);
    expect(k.taranan).toBe(0);
  });
});
