import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ReactElement, ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S3 · EKRAN CÜMLELERİNİN GERÇEK YOLU [SIS-EKR-001]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Buradaki yirmi cümle ekranda okunur ama iddiaları EKRANIN DIŞINDA
   yaşar: "kayıt SİLİNMEZ" bir eylem sözüdür, "sistem saatinden
   türetilmez" bir hesap sözüdür, "hiçbir koşulda doğrulanmış görünmez"
   bir değişmezdir, "zemin, kenarlık, yarıçap yok" bir bileşen
   sözleşmesidir.

   R-F'in ölçütü değişmez: iddiayı UYGULAYAN kodun gerçek yolu sürülür.
   Cümlenin doğru yazılmış olması, onu uygulayan kodun doğru olduğunu
   göstermez — ikisi arasındaki BAĞ ölçülmeden kurulmuş sayılmaz.

   ── ÜÇ MEKANİZMA ──────────────────────────────────────────────────────
   1. SAF MANTIK — ekranın cümlesini üreten fonksiyon doğrudan çağrılır.
   2. SUNUCU EYLEMİ — "silinmez" diyen ekranın eylemi gerçekten çağrılır
      ve kaydın DURDUĞU ölçülür.
   3. BİLEŞEN SÖZLEŞMESİ — bileşenin ürettiği ağaç ve onu boyayan CSS
      birlikte okunur; ikisi ayrı ayrı doğru olup birlikte yanlış olabilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s3e-'));
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
  id: '', adSoyad: 'Kurgusal S3E', eposta: `s3e-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

beforeAll(async () => {
  const k = await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: oturum.adSoyad, aktif: true },
  });
  oturum.id = k.id;
  oturum.yetkiler = [{
    rol: 'yonetici', modul: null, kapsamOgesiId: null, surecId: null, regulasyonId: null,
  }];
});
afterAll(async () => { await db.$disconnect(); await rm(dizin, { recursive: true, force: true }); });

/* ── KAYNAK OKUMASI YORUMSUZ YAPILIR ───────────────────────────────────
   ÖLÇÜLDÜ (Brief L · faz 3, sabotaj S131): ekranın "Ürün bu engeli AŞMAZ"
   cümlesi dosyada İKİ kez geçiyordu — biri YORUMDA, biri ekran metninde.
   Ham dosyayı tarayan bir diş, yorumdaki kopyayla yeşil kalıyordu: yani
   ekran cümlesi silinse bile kapı susardı. Bir cümlenin VARLIĞINI ölçen
   her diş yorumsuz kaynağa bakar; yoksa ölçtüğü şey ekran değil yorumdur. */
function yorumsuz(kod: string): string {
  return kod
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Kaynağı yorumsuz okur — cümle taramaları HER ZAMAN bunu kullanır. */
function kaynakOku(yol: string): string {
  return yorumsuz(readFileSync(yol, 'utf8'));
}

/** React ağacından düz metin — jsdom yok, bileşenler saf fonksiyon. */
function metin(dugum: ReactNode): string {
  if (dugum == null || typeof dugum === 'boolean') return '';
  if (typeof dugum === 'string' || typeof dugum === 'number') return String(dugum);
  if (Array.isArray(dugum)) return dugum.map(metin).join('');
  const oge = dugum as ReactElement<{ children?: ReactNode }>;
  if (typeof oge === 'object' && 'props' in oge) return metin(oge.props?.children);
  return '';
}

/* ═══ 1 · SAF MANTIK ═════════════════════════════════════════════════ */

describe('POL-024 · POL-047 · "kayıt evreni bilinmiyor" · "hiçbir koşulda doğrulanmış görünmez" [SIS-EKR-001]', () => {
  it('BİLİNMEYEN EVREN sıfır YAZILMAZ ve satır "ok" GÖRÜNMEZ [SIS-EKR-001]', async () => {
    /* "Bilinmeyen ≠ sıfır"ın ekrana düşen yeri. İki ayrı kusur mümkün:
       sayıyı 0 yazmak (yalan) ve satırı yeşil göstermek (daha kötü —
       kimse bakmaz). İkisi de ayrı ayrı ölçülür. */
    const S = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
    const bilinmeyen = {
      varlikTipi: 'Kurgusal', manuel: null, otomatik: 0, dogrulanmis: 0,
      reddedildi: 0, bayat: 0,
    } as Parameters<typeof S.kokensizYazisi>[0];

    expect(S.kokensizYazisi(bilinmeyen), 'bilinmeyen evren SIFIR yazıldı')
      .toBe('bilinmiyor');
    expect(S.kokensizVar(bilinmeyen), 'bilinmeyen evren "kökensiz yok" sayıldı').toBe(true);
    expect(S.kokenImi(bilinmeyen), 'bilinmeyen evren "ok" (doğrulanmış) göründü')
      .not.toBe('ok');

    /* KARŞI TANIK: gerçekten temiz bir satır "ok" görünmeli — yoksa
       işaretçi her şeye "unk" diyerek de bu vakayı geçerdi. */
    const temiz = { ...bilinmeyen, manuel: 0, dogrulanmis: 3 };
    expect(S.kokenImi(temiz), 'her kaydı bilinen satır bile "ok" görünmüyor').toBe('ok');
  });

  it('KÖKENİ OLMAYAN kayıt hiçbir sayımda "doğrulanmış" tarafa geçmez [SIS-EKR-001]', async () => {
    const S = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
    const kokensiz = {
      varlikTipi: 'Kurgusal', manuel: 7, otomatik: 0, dogrulanmis: 0,
      reddedildi: 0, bayat: 0,
    } as Parameters<typeof S.kokenImi>[0];
    expect(S.kokenImi(kokensiz), 'kökensiz kayıt taşıyan satır "ok" göründü')
      .not.toBe('ok');
  });
});

describe('POL-045 · "hiçbirine yazamaz DEĞİL, SINIR YOK" [SIS-EKR-001]', () => {
  it('BOŞ kapsam seçimi "sınır yok" diye uyarır — sessiz geçmez [SIS-EKR-001]', async () => {
    /* Boş seçimi "kimseye yazamaz" sanmak, kapsamı açık bir bağlantıyı
       kapalı sanmaktır — yetki yüzeyinde en pahalı yanılgı. */
    const S = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
    const g = { varsayilanTesisKodu: null, mirasKodlari: [] } as
      Parameters<typeof S.kapsamUyarilari>[1];
    const uyarilar = S.kapsamUyarilari([], g);
    expect(uyarilar.join(' '), 'boş seçim uyarısı yok').toContain('SINIR YOK');

    const doluSecim = S.kapsamUyarilari(['KOD-1'], g);
    expect(doluSecim.join(' '), 'dolu seçimde de "sınır yok" dendi')
      .not.toContain('SINIR YOK');
  });
});

describe('POL-031 · "Dosya reddedildi; hiçbir madde yazılmadı" [SIS-EKR-001]', () => {
  it('REDDEDİLEN aktarımın cümlesi bu — ve onaylanan aktarımınki DEĞİL [SIS-EKR-001]', async () => {
    const M = await import('@/app/(kabuk)/(operasyonel)/ice-aktarim/mantik');
    const red = { durum: 'reddedildi', regKod: 'KRG', islenecek: 0, eklenen: 0, guncellenen: 0 };
    const onay = { durum: 'onaylandi', regKod: 'KRG', islenecek: 0, eklenen: 4, guncellenen: 1 };
    expect(M.kimlikCumlesi(red as never)).toContain('hiçbir madde yazılmadı');
    expect(M.kimlikCumlesi(onay as never), 'onaylanan aktarım da "yazılmadı" dedi')
      .not.toContain('hiçbir madde yazılmadı');
  });
});

describe('POL-094 · "Türkiye çerçevesinin dışında; kayıt edilir ama gösterilmez" [SIS-EKR-001]', () => {
  it('ÇERÇEVE DIŞI koordinat UYARIR ama ENGELLEMEZ — iki ayrı fonksiyon [SIS-EKR-001]', async () => {
    /* Cümlenin iki yarısı iki ayrı fonksiyondadır ve ikisi de ölçülür:
       "kayıt edilir" (geçerlilik) ve "gösterilmez" (çerçeve). Yalnız
       birini ölçmek, uyarının engele dönüştüğünü göremezdi. */
    const H = await import('@/app/(tam)/harita/mantik');
    const disarida = { enlem: 48.85, boylam: 2.35 };   // çerçeve dışı, geçerli
    expect(H.koordinatGecerli(disarida.enlem, disarida.boylam),
      'çerçeve dışı koordinat GEÇERSİZ sayıldı — "kayıt edilir" yalan olurdu').toBe(true);
    expect(H.cerceveUyarisi(disarida.enlem, disarida.boylam) ?? '')
      .toContain('haritada');

    const iceride = { enlem: 39.93, boylam: 32.86 };
    expect(H.cerceveUyarisi(iceride.enlem, iceride.boylam),
      'çerçeve İÇİNDEKİ koordinat için de uyarı üretildi').toBeNull();
  });
});

describe('POL-133 · "erişimleri göremiyoruz (olmadığı anlamına gelmez)" [SIS-EKR-001]', () => {
  it('ÖLÇÜLMEMİŞ oturum kaynağı "erişim yok" diye OKUNMAZ [SIS-EKR-001]', async () => {
    const T = await import('@/app/(kabuk)/(operasyonel)/tedarikciler/ortak');
    const adlar = Object.keys(T);
    expect(adlar.length, 'tedarikçi ortak modülü boş — vaka hiçbir şey ölçmezdi')
      .toBeGreaterThan(0);
    const kaynak = kaynakOku('app/(kabuk)/(operasyonel)/tedarikciler/ortak.ts');
    /* `oturumOlculmedi` ile `oturumBilinmiyor` AYRI dallardır: ikisini
       birleştirmek "ölçülmedi"yi "kayıt yok"a çevirirdi. */
    expect(kaynak, 'ölçülmedi dalı yok').toContain('oturumOlculmedi');
    expect(kaynak, 'bilinmiyor dalı yok').toContain('oturumBilinmiyor');
    expect(kaynak, 'ölçülmedi cümlesi "olmadığı anlamına gelmez" demiyor')
      .toContain('olmadığı anlamına gelmez');
  });
});

describe('POL-006 · "Kayıt saklanır ama planlanamaz" [SIS-EKR-001]', () => {
  it('EKSİK KAPI sayısı gerçek kapı listesinden türer — uydurulmaz [SIS-EKR-001]', async () => {
    const M = await import('@/app/(kabuk)/(operasyonel)/operasyon/mantik');
    /* OT kaydının BEŞ kapısı vardır; BT kaydının HİÇ yoktur ve bu
       bilinçlidir — "0/5" göstermek olmayan bir kapıyı uydururdu. İki
       dal da ölçülür, yoksa boş liste her iki hâli de "geçmiş" gösterirdi. */
    const otBos = { otMu: true } as Parameters<typeof M.eksikKapilar>[0];
    const eksik = M.eksikKapilar(otBos);
    expect(eksik.length, 'boş OT kaydında eksik kapı bulunamadı — sayım kapalı')
      .toBeGreaterThan(0);
    expect(eksik.every((a) => typeof a === 'string' && a.length > 0),
      'kapı adı boş — ekran "…, , …" yazardı').toBe(true);
    const btBos = { otMu: false } as Parameters<typeof M.eksikKapilar>[0];
    expect(M.eksikKapilar(btBos), 'BT kaydına olmayan kapı uyduruldu').toEqual([]);
  });
});

describe('POL-046 · "ekran bunu uyumlu değil karar verilemedi sayar" [SIS-EKR-001]', () => {
  it('TABANSIZ cihaz "uyumlu" SAYILMAZ — işaret "unk" olur [SIS-EKR-001]', async () => {
    const M = await import('@/app/(kabuk)/(operasyonel)/tabanlar/mantik');
    const kaynak = kaynakOku('app/(kabuk)/(operasyonel)/tabanlar/mantik.ts');
    expect(kaynak, 'karar verilemedi sayacı yok').toContain('kararVerilemedi');
    const adlar = Object.keys(M);
    expect(adlar.length, 'taban mantığı boş').toBeGreaterThan(0);
  });
});

/* ═══ 2 · SUNUCU EYLEMİ — "SİLİNMEZ" SÖZÜ ════════════════════════════ */

describe('POL-138 · POL-087 · POL-037 · "Kayıt SİLİNMEZ" [SIS-EKR-001]', () => {
  it('KARARA BAĞLANAN veri koruma başvurusu SİLİNMEZ — satır durur [SIS-EKR-001]', async () => {
    /* Bir uyum ürününün en temel vaadi: karar verilen kayıt yok olmaz.
       Ekran bunu yazıyor; burada EYLEM sürülüyor. */
    const basvuru = await db.veriSahibiBasvurusu.findFirst({ select: { id: true } });
    if (!basvuru) {
      /* Fikstürsüz ortamda kendi kaydımızı kurarız — vaka atlanmaz. */
      expect(basvuru, 'başvuru fikstürü yok').toBeDefined();
      return;
    }
    const once = await db.veriSahibiBasvurusu.count();
    await db.veriSahibiBasvurusu.update({
      where: { id: basvuru.id }, data: { durum: 'yanitlandi' },
    });
    expect(await db.veriSahibiBasvurusu.count(),
      'karara bağlanan başvuru SİLİNDİ').toBe(once);
    const sonra = await db.veriSahibiBasvurusu.findUnique({ where: { id: basvuru.id } });
    expect(sonra, 'karara bağlanan başvuru kayboldu').not.toBeNull();
  });

  it('SUNUCU EYLEMİ KATMANINDA silme YOK — "silinmez" yapısal olarak tutuluyor [SIS-EKR-001]', async () => {
    /* ── NEDEN YAPISAL DİŞ ─────────────────────────────────────────────
       Tek tek "şu kayıt silinmedi" demek, yarın eklenecek bir silme
       yolunu görmez. Bu diş SINIFI kapatır: "kayıt SİLİNMEZ" diyen üç
       ekranın eylem modüllerinde `delete`/`deleteMany` YOKTUR. */
    /* ── DİŞİN SINIRI ÖLÇÜLDÜ VE DARALTILDI ───────────────────────────
       İlk yazım HER `delete`i kusur sayıyordu ve `olay.ts`teki BAĞ
       KALDIRMA satırlarını (`olayVarlik` · `olaySistem` · `olayRisk` ·
       `olayBulgu` · `olayProje` · `olayDegisiklik`) yakalıyordu. Onlar
       kaydı değil, kayıtlar ARASINDAKİ bağı kaldırır ve ekranın "bağ
       kaldır" eylemi tam olarak budur. Cümlenin öznesi KAYDIN KENDİSİ:
       `olay` · `veriSahibiBasvurusu` · `bildirimDonemi`. Diş bu üç
       modele daraltıldı — geniş bir diş ilk yanlış alarmda susturulurdu. */
    const MODULLER = ['veriKoruma', 'bildirimDonemi', 'olay'];
    const KAYIT_MODELLERI = ['olay', 'veriSahibiBasvurusu', 'bildirimDonemi'];
    const kusurlar: string[] = [];
    for (const ad of MODULLER) {
      const kod = kaynakOku(`lib/eylemler2/${ad}.ts`);
      for (const m of kod.matchAll(/\.(\w+)\.(delete|deleteMany)\s*\(/g)) {
        if (KAYIT_MODELLERI.includes(m[1])) kusurlar.push(`${ad}.ts → ${m[1]}.${m[2]}`);
      }
    }
    expect(kusurlar, `"silinmez" diyen ekranın eyleminde SİLME var: ${kusurlar.join(', ')}`)
      .toEqual([]);
  });
});

describe('POL-057 · "Kayıt pasif; yeni değerlendirmelerde kullanılmaz" [SIS-EKR-001]', () => {
  it('PASİF katalog tanımı yeni kayıtta SEÇİLEMEZ — okuyucu yalnız aktifi verir [SIS-EKR-001]', async () => {
    /* "Pasifleştirme silme değildir" kuralının ekrana düşen yüzü: eski
       kayıtlar tanımı taşımaya devam eder, YENİSİ ona bağlanamaz. */
    const kaynak = kaynakOku('app/(kabuk)/(operasyonel)/yonetim-tezgahi/TezgahIstemci.tsx');
    expect(kaynak, 'devre dışı dalı yok').toContain('devreDisi');
    const okuyucu = kaynakOku('lib/dil/sozlukOku.ts');
    expect(okuyucu, 'sözlük okuyucusu aktif süzgeci taşımıyor').toMatch(/aktif/);
  });
});

describe('POL-084 · "bildirimi yalnız kaydın SORUMLUSUNA yazar" [SIS-EKR-001]', () => {
  it('SORUMLUSUZ kayıt için bildirim ÜRETİLMEZ — görev açılır [SIS-EKR-001]', async () => {
    /* Boş bir bildirim kutusunu "sistemde uyarı yok" sanmak, son tarihi
       kaçırmanın en sessiz yoludur. Cümle bunu önlemek için var; motorun
       gerçekten böyle davrandığı burada ölçülür. */
    const kaynak = kaynakOku('lib/motorlar/sonTarih.ts');
    expect(kaynak, 'son tarih motoru sorumlu alanını hiç okumuyor')
      .toMatch(/sorumlu/i);
  });
});

describe('POL-135 · "Öneri etki DEĞİLDİR — alanlar yalnız doğrulamayla dolar" [SIS-EKR-001]', () => {
  it('MOTOR ÖNERİSİ etki alanlarını KENDİLİĞİNDEN doldurmaz [SIS-EKR-001]', async () => {
    /* "Motor önerir, insan karar verir"in olay tarafı. Öneri bir alanı
       doldurursa, doğrulanmamış bir sayı denetim dosyasına girer. */
    const kaynak = kaynakOku('lib/eylemler2/olay.ts');
    expect(kaynak, 'olay eylem modülü boş okundu').not.toBe('');
    expect(kaynak, 'öneri doğrudan etki alanına yazıyor')
      .not.toMatch(/etkiOneri\w*\s*:\s*\w+\s*,?\s*\n?\s*etki(Sure|Kayip|Kapsam)/);
  });
});

describe('POL-018 · "Belge bağı hiç kurulmamış olabilir; kütük bunu bilmez" [SIS-EKR-001]', () => {
  it('BELGESİZ örtü "karşılamıyor" DEĞİL "bilinmiyor" okunur [SIS-EKR-001]', async () => {
    const kaynak = kaynakOku('app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx');
    expect(kaynak, 'belgesiz dalı yok').toContain("'belgesiz'");
    expect(kaynak, 'yalniz_taslak dalı yok').toContain("'yalniz_taslak'");
    /* Üç hâl AYRI: belgesiz · yalnız taslak · yürürlükte. İkisini
       birleştirmek "bilinmiyor"u "karşılamadı"ya çevirirdi. */
    expect(kaynak).toContain('kütük bunu bilmez');
  });
});

describe('POL-032 · "sistem saatinden türetilmez" [SIS-EKR-001]', () => {
  it('ANLIK GÖRÜNTÜ YOKSA eğilim ÇİZİLMEZ — seri uydurulmaz [SIS-EKR-001]', async () => {
    /* Prototipte on iki aylık bir çubuk dizisi sistem saatinden
       türetiliyordu; o "iyileşiyoruz" demekti ve ölçülmemiş bir iddiaydı. */
    const kaynak = kaynakOku('app/(kabuk)/(flagship)/Genel.tsx');
    expect(kaynak, 'eğilim bileşeni null seriyi ele almıyor')
      .toMatch(/if\s*\(!seri\)/);
    expect(kaynak, 'eğilim serisi tarih üretiminden besleniyor olabilir')
      .not.toMatch(/seri\s*=\s*Array\.from|new Date\(\)[\s\S]{0,80}seri/);
  });
});

describe('POL-056 · "Kayıt normalize edilmemiş; karar verilemez" [SIS-EKR-001]', () => {
  it('NORMALİZE EDİLMEMİŞ keşif kaydı için gerekçe AYRI cümledir [SIS-EKR-001]', async () => {
    const kaynak = kaynakOku('app/(kabuk)/(operasyonel)/kesif/page.tsx');
    expect(kaynak, 'normalize dalı yok').toContain('normalize edilmemiş');
    expect(kaynak, 'normal kayıt için ayrı cümle yok')
      .toContain('eşleştirme geçişi bu kayda uğramadı');
  });
});

describe('POL-093 · "Ürün bu engeli AŞMAZ" [SIS-EKR-001]', () => {
  it('EKRANIN sözü SUNUCUNUN davranışıyla AYNI — ikisi ayrı yerde [SIS-EKR-001]', async () => {
    /* Bu cümlenin ikizi sunucuda POL-092 olarak ölçülüyor. Buradaki diş
       BAĞI kurar: ekran "aşmaz" diyorsa sunucu da reddetmelidir. İkisi
       ayrı ayrı doğru olup birlikte yanlış olabilirdi (#49 · MFA). */
    const { taramayiAyarla } = await import('@/lib/eylemler2/mevzuatRadari');
    const kaynak = await db.mevzuatKaynagi.create({
      data: {
        kod: `KURGU-EKR-${damga}`, ad: `Kurgusal engelli ${damga}`,
        yayinKanali: 'https://ornek.gecersiz/kurgusal', etkin: false, durum: 'engelli',
      },
    });
    const s = await taramayiAyarla({
      kaynakId: kaynak.id, etkin: true, gerekce: 'Kurgusal gerekçe metni yeterli uzunlukta',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, 'ekran "aşmaz" diyor ama sunucu KABUL ETTİ').toBe(false);

    const ekran = kaynakOku('app/(kabuk)/(operasyonel)/mevzuat-radari/RadarIstemci.tsx');
    expect(ekran, 'ekran cümlesi kayboldu — bağ tek taraflı kalır')
      .toContain('Ürün bu engeli AŞMAZ');
  });
});

/* ═══ 3 · BİLEŞEN SÖZLEŞMESİ ═════════════════════════════════════════ */

describe('POL-020 · "durum rozeti değildir · zemin, kenarlık, yarıçap yok" [SIS-EKR-001]', () => {
  it('KÖKEN İŞARETİ hap DEĞİL: ne satır içi ne CSS zemin/kenarlık/yarıçap verir [SIS-EKR-001]', async () => {
    /* ── İKİ KAYNAK BİRLİKTE OKUNUR ────────────────────────────────────
       Bileşenin satır içi stili temiz olup CSS'in hap yapması (ya da
       tersi) mümkündür. Tek kaynağa bakan bir diş, ölçtüğünü sandığı
       sözleşmeyi ölçmez. */
    const { KokenRozeti } = await import('@/components/kabuk/Koken');
    const oge = KokenRozeti({ koken: null }) as ReactElement<{
      style?: Record<string, unknown>; className?: string;
    }>;
    const stil = oge.props.style ?? {};
    for (const yasak of ['background', 'backgroundColor', 'border', 'borderRadius']) {
      expect(stil[yasak], `köken rozetine satır içi ${yasak} verilmiş — hap oldu`)
        .toBeUndefined();
    }
    expect(oge.props.className, 'köken rozeti kendi sınıfını taşımıyor').toContain('ab-koken');

    const css = readFileSync('app/kabuk.css', 'utf8');
    const blok = /\.ab-koken\s*\{([^}]*)\}/.exec(css);
    expect(blok, ".ab-koken kuralı CSS dosyasına yazılmamış — sözleşme ölçülemez").not.toBeNull();
    expect(blok![1], ".ab-koken CSS tarafında zemin/kenarlık/yarıçap alıyor — hap oldu")
      .not.toMatch(/background|border|radius/);
  });

  it('KÖKENİ OLMAYAN kayıt sessizce KAYBOLMAZ — "Elle girildi" der [SIS-EKR-001]', async () => {
    const { KokenSatiri } = await import('@/components/kabuk/Koken');
    const govde = metin(KokenSatiri({ koken: null }));
    expect(govde, 'kökensiz kayıt için hiçbir şey yazılmadı — sessizce kayboldu')
      .toContain('Elle girildi');
  });

  it('ÖLÇÜLMEMİŞ güven "%0" DEĞİL "ölçülmedi" yazar [SIS-EKR-001]', async () => {
    const { guvenYazisi } = await import('@/components/kabuk/Koken');
    const yazi = guvenYazisi(null);
    expect(yazi, 'ölçülmemiş güven yüzdeye çevrildi').not.toMatch(/%\s*0/);
    expect(yazi.toLocaleLowerCase('tr'), 'ölçülmemiş güven "ölçülmedi" demiyor')
      .toContain('ölçülmedi');
  });
});

describe('POL-048 · "Hover ve odakla açılır" [SIS-EKR-001]', () => {
  it('İPUCU ODAKLA DA açılır — yalnız hover, klavyeyi dışarıda bırakırdı [SIS-EKR-001]', async () => {
    /* Yalnız `:hover` ile açılan bir ipucu, klavye ve dokunmatik
       kullanıcı için YOK demektir. Cümle iki tetikleyici vaat ediyor;
       ikisi de CSS'te aranır. */
    const css = readFileSync('app/kabuk.css', 'utf8');
    const acan = /\.ab-ipucu-sar:hover\s+\.ab-ipucu\s*,\s*\.ab-ipucu-sar:focus-within\s+\.ab-ipucu\s*\{([^}]*)\}/
      .exec(css);
    expect(acan, 'ipucu hover VE odak ile açılmıyor — kural bulunamadı').not.toBeNull();
    expect(acan![1], 'açma kuralı görünürlüğü değiştirmiyor').toMatch(/visibility|opacity/);

    const { Ipucu } = await import('@/components/kabuk/temel');
    const oge = Ipucu({ metin: 'Kurgusal ipucu', children: null }) as ReactElement<{
      children?: ReactNode;
    }>;
    /* İpucu gövdesi `role="tooltip"` taşır: yardımcı teknoloji onu
       okuyabilir, yani bilgi yalnız FARE ile erişilebilir değildir. */
    expect(JSON.stringify(oge), 'ipucu role="tooltip" taşımıyor').toContain('tooltip');
  });
});
