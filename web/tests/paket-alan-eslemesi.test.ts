import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { GEREKCE_ASGARI } from '@/lib/paket/bicim';
import { cerceve, paketYaz } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   ALAN EŞLEME BEYANI — beyansız eşleme kırmızı [URN-PKT-022]

   Ölçülmüş kusur (bağımsız inceleme, PR #43 tur 2): EPDK Ek-3'ün "Seviye"
   kademesi ürünün HEDEF OLGUNLUK alanına (`seviye`) yazılmıştı. İki taraf
   da geçerli veriydi, biçim doğruydu, sayı aralıktaydı — hiçbir kapı
   göremedi; 508 zorunlu kontrolün hedefi ürünün en alt kademelerine
   çekildi ve ad-hoc uygulama "hedefte" göründü.

   Kapı ANLAM ölçemez. Ölçebildiği beyanın VARLIĞIDIR: dolu her sütun için
   "hangi kaynak alanından · hangi ürün alanına · hangi gerekçeyle". Bu
   kabul edilmiş sınırdır ve `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1/10'da
   yazılıdır — kapının yapamadığını okuyan insan yapar, ama okuyacağı bir
   beyan artık VARDIR.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const PAKETLER = path.join(KOK, 'paketler');
const siniflar = (dizin: string) => paketiDogrula(dizin).hatalar.map((h) => `${h.sinif}|${h.konum ?? ''}`);
const mesajlar = (dizin: string) => paketiDogrula(dizin).hatalar.map((h) => h.mesaj);

/** Gerçek (temsilî olmayan) çerçeve: metin taşıyor, kaynağını beyan ediyor — bu yüzden
    satırlar köken sütunlarını da doldurur (KAYNAK kuralı). */
const BASLIK = 'kod;ust_kod;baslik;metin;sira;seviye;zorunluluk_tipi;kaynak_url;erisim_tarihi';
const SATIR = 'A1;;Başlık;Metin;0;;REGULATION;https://ornek.gov.tr/belge;2026-09-09';
const CSV = `${BASLIK}\n${SATIR}\n`;

/** Gerçek (temsilî olmayan) çerçeveli asgari paket; `esleme` manifeste yazılır. */
function paket(esleme: unknown, csv = CSV, ek: Record<string, unknown> = {}) {
  return paketYaz(
    {
      'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: true }, {
        temsili: false, kaynakUrl: 'https://ornek.gov.tr/belge', ...ek,
      }),
      'cerceve/TEST-REG.csv': csv,
    },
    { alanEslemesi: esleme },
  );
}

const GEREKCE = 'Ürünün bu alanı maddenin çerçeve içindeki tekil kimliğidir; ekran ve eşleme ona bu kodla atıf yapar.';
/** Tek satırlık CSV'de dolu sütunlar: kod · baslik · metin · sira · zorunluluk_tipi · kaynak_url · erisim_tarihi. */
const TAM_BEYAN = [
  { kaynakAlan: 'Madde numarası', urunAlani: 'kod', gerekce: GEREKCE },
  { kaynakAlan: 'Madde başlığı', urunAlani: 'baslik', gerekce: 'Ürünün başlık alanı maddenin kısa adıdır; listede ve matriste maddeyi bu ad temsil eder.' },
  { kaynakAlan: 'Madde metni', urunAlani: 'metin', gerekce: 'Ürünün metin alanı maddenin tam metnidir; özet ya da yorum değildir, uyum gerekçesi buna dayanır.' },
  { kaynakAlan: null, urunAlani: 'sira', gerekce: 'Ürünün sıra alanı görüntülenme sırasıdır; önem sırası değildir ve hiçbir hesaba girmez.' },
  { kaynakAlan: null, urunAlani: 'zorunluluk_tipi', gerekce: 'Ürünün bu alanı yükümlülüğün hukuki dayanak türüdür; yaptırımın ağırlığı değildir.' },
  { kaynakAlan: 'Belgenin yayım adresi', urunAlani: 'kaynak_url', gerekce: 'Ürünün bu alanı metnin alındığı belgenin adresidir; doğrulayan kişi aynı metne buradan gider.' },
  { kaynakAlan: null, urunAlani: 'erisim_tarihi', gerekce: 'Ürünün bu alanı kaynağa bakılan gündür; maddenin yürürlüğü ya da belgenin yayımı değildir.' },
];

describe('alan eşleme beyanı — beyansız eşleme kırmızı [URN-PKT-022]', () => {
  it('tam beyan temizdir; kaynakta karşılığı olmayan alan null ile beyan edilir [URN-PKT-022]', () => {
    expect(paketiDogrula(paket({ 'TEST-REG': TAM_BEYAN })).hatalar.map(hataSatiri)).toEqual([]);
  });

  it('beyanı hiç olmayan çerçeve kırmızıdır ve dolu sütunları sayar [URN-PKT-022]', () => {
    expect(siniflar(paket(undefined))).toEqual(['ALAN EŞLEME|alanEslemesi.TEST-REG']);
    expect(mesajlar(paket(undefined))[0]).toMatch(/alan eşleme beyanı yok — dolu sütunlar: kod, baslik, metin, sira, zorunluluk_tipi, kaynak_url, erisim_tarihi/);
  });

  it('dolu ama BEYANSIZ sütun kırmızıdır — kusurun ölçülmüş hâli [URN-PKT-022]', () => {
    /* "Seviye" kademesi `seviye` sütununa yazılmış ve beyan edilmemiş: tam olarak
       PR #43'te yakalanan kusurun biçimi. Beyan yoksa kapı bunu artık görüyor. */
    const csv = `${BASLIK}\n${SATIR.replace(';;REGULATION', ';2;REGULATION')}\n`;
    const h = paketiDogrula(paket({ 'TEST-REG': TAM_BEYAN }, csv)).hatalar;
    expect(h.map((x) => `${x.sinif}|${x.konum}`)).toEqual(['ALAN EŞLEME|alanEslemesi.TEST-REG.seviye']);
    expect(h[0].mesaj).toMatch(/"seviye" sütunu dolu ama beyansız/);
  });

  it('dosyada boş kalan sütunun beyanı ÖLÜ beyandır [URN-PKT-022]', () => {
    const olu = [...TAM_BEYAN, { kaynakAlan: 'Seviye', urunAlani: 'seviye', gerekce: GEREKCE }];
    const h = paketiDogrula(paket({ 'TEST-REG': olu })).hatalar;
    expect(h.map((x) => `${x.sinif}|${x.konum}`)).toEqual(['ALAN EŞLEME|alanEslemesi.TEST-REG.seviye']);
    expect(h[0].mesaj).toMatch(/beyan edilmiş ama madde dosyasında hiçbir satırda dolu değil — ölü beyan/);
  });

  it('bir ürün alanı iki kez beyan edilemez — hangi kaynağın yazıldığı belirsiz kalır [URN-PKT-022]', () => {
    const cift = [...TAM_BEYAN, { kaynakAlan: 'Kontrol No', urunAlani: 'kod', gerekce: GEREKCE }];
    const h = paketiDogrula(paket({ 'TEST-REG': cift })).hatalar;
    expect(h.map((x) => `${x.sinif}|${x.konum}`)).toEqual(['ALAN EŞLEME|alanEslemesi.TEST-REG.kod']);
    expect(h[0].mesaj).toMatch(/2 kez beyan edilmiş/);
  });

  it('temsilî çerçeve beyan EDEMEZ (kaynak belgesi yok), beyansızlığı da kırmızı değildir [URN-PKT-022]', () => {
    const temsili = paketYaz(
      {
        'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: true }),
        'cerceve/TEST-REG.csv': CSV,
      },
      { alanEslemesi: { 'TEST-REG': TAM_BEYAN } },
    );
    const h = paketiDogrula(temsili).hatalar;
    expect(h.map((x) => `${x.sinif}|${x.konum}`)).toEqual(['ALAN EŞLEME|alanEslemesi.TEST-REG']);
    expect(h[0].mesaj).toMatch(/temsilî — kaynak belgesi yok/);
    const beyansiz = paketYaz({
      'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: true }),
      'cerceve/TEST-REG.csv': CSV,
    });
    expect(paketiDogrula(beyansiz).hatalar.map(hataSatiri)).toEqual([]);
  });

  it('pakette olmayan çerçeveye beyan ölü atıftır [URN-PKT-022]', () => {
    const h = paketiDogrula(paket({ 'TEST-REG': TAM_BEYAN, 'YOK-BOYLE': TAM_BEYAN })).hatalar;
    expect(h.map((x) => `${x.sinif}|${x.konum}`)).toEqual(['ALAN EŞLEME|alanEslemesi.YOK-BOYLE']);
    expect(h[0].mesaj).toMatch(/pakette olmayan bir çerçeveye yazılmış: YOK-BOYLE/);
  });

  it('ürün alanı sütun listesinin dışına yazılamaz; gerekçe kısaltılamaz [URN-PKT-022]', () => {
    /* Yazım hatası sessizce yutulmaz: `seviyye` bir sütun değildir, şema reddeder. */
    const yanlisAlan = [...TAM_BEYAN, { kaynakAlan: 'Seviye', urunAlani: 'seviyye', gerekce: GEREKCE }];
    expect(siniflar(paket({ 'TEST-REG': yanlisAlan }))).toEqual(['BIÇIM|alanEslemesi.TEST-REG.7.urunAlani']);
    const kisa = TAM_BEYAN.map((r, i) => (i === 0 ? { ...r, gerekce: 'kolaydı' } : r));
    expect(siniflar(paket({ 'TEST-REG': kisa }))).toEqual(['BIÇIM|alanEslemesi.TEST-REG.0.gerekce']);
    expect(GEREKCE_ASGARI).toBe(40);
  });

  it('boş beyan listesi beyan değildir [URN-PKT-022]', () => {
    expect(siniflar(paket({ 'TEST-REG': [] }))).toEqual(['BIÇIM|alanEslemesi.TEST-REG']);
  });
});

describe('diskteki paketler beyanlıdır ve EPDK kademesi hedef olgunluğa yazılmaz [URN-PKT-022]', () => {
  /* Kapı iki paketi adıyla ölçseydi, dizine bırakılan ÜÇÜNCÜ paket hiç
     ölçülmezdi. Ölçüm dizinin kendisinden yürür. */
  const dizinler = readdirSync(PAKETLER, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();

  it('paketler/ altındaki HER paket doğrulayıcıdan temiz geçer [URN-PKT-022]', () => {
    expect(dizinler.length, 'paket dizini boş — kapı hiçbir şeye bakmıyor').toBeGreaterThanOrEqual(5);
    for (const ad of dizinler) {
      expect(paketiDogrula(path.join(PAKETLER, ad)).hatalar.map(hataSatiri), ad).toEqual([]);
    }
  });

  it('EPDK "Seviye" kademesi gereksinim_tipi olarak beyanlıdır, seviye sütunu BOŞTUR [URN-PKT-022]', () => {
    const s = paketiDogrula(path.join(PAKETLER, 'TR-ENERJI'));
    const beyan = s.icerik!.manifest.alanEslemesi!['EPDK-SGYM-EK3'];
    const satir = beyan.find((r) => r.urunAlani === 'gereksinim_tipi');
    expect(satir?.kaynakAlan, 'kaynağın "Seviye" sütunu beyanda geçmiyor').toMatch(/Seviye/);
    /* Gerekçe İKİ alanın anlamını da söylemeli: yoksa okuyan insan farkı göremez. */
    expect(satir!.gerekce).toMatch(/gereksinim_tipi/);
    expect(satir!.gerekce).toMatch(/seviye/);
    expect(satir!.gerekce).toMatch(/hedef/i);
    const ek3 = s.icerik!.cerceveler.find((c) => c.kimlik.kod === 'EPDK-SGYM-EK3')!;
    expect(ek3.doluSutunlar, 'kademe yine hedef olgunluğa yazılmış').not.toContain('seviye');
    expect(ek3.maddeler.filter((m) => m.seviye !== null)).toEqual([]);
    expect(ek3.maddeler.filter((m) => m.gereksinimTipi !== null).length).toBe(565);
  });

  it('beyan yazan her paketin manifesti şemayı geçer ve gerekçeleri maliyet cümlesi değildir [URN-PKT-022]', () => {
    const beyanli = dizinler.filter((ad) => {
      const m = JSON.parse(readFileSync(path.join(PAKETLER, ad, 'manifest.json'), 'utf8')) as { alanEslemesi?: unknown };
      return m.alanEslemesi !== undefined;
    });
    expect(beyanli, 'hiçbir pakette beyan yok — ölçüm boş bakıyor').toEqual(['DEMO-TR-ORTAK', 'TR-BANKACILIK', 'TR-ENERJI']);
    for (const ad of beyanli) {
      const esleme = paketiDogrula(path.join(PAKETLER, ad)).icerik!.manifest.alanEslemesi!;
      for (const [kod, satirlar] of Object.entries(esleme)) {
        for (const r of satirlar) {
          expect(r.gerekce.length, `${ad}/${kod}/${r.urunAlani}`).toBeGreaterThanOrEqual(GEREKCE_ASGARI);
          /* "Kolaydı · zaten oradaydı · dönüştürmek zahmetliydi" gerekçe değildir:
             gerekçe ürün alanının ANLAMINI anlatır (CLAUDE.md · gerekçe kuralı). */
          expect(r.gerekce, `${ad}/${kod}/${r.urunAlani}: maliyet cümlesi`).not.toMatch(/kolay|zahmet|maliyet|uğraş/i);
        }
      }
    }
  });
});
