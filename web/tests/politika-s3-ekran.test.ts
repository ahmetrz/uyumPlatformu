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
    const bilinmeyen: Parameters<typeof S.kokensizYazisi>[0] = {
      varlikTipi: 'Kurgusal', manuel: null, otomatik: 0, dogrulanmis: 0,
      reddedildi: 0, kokenli: 0, toplam: null,
    };

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
    const kokensiz: Parameters<typeof S.kokenImi>[0] = {
      varlikTipi: 'Kurgusal', manuel: 7, otomatik: 0, dogrulanmis: 0,
      reddedildi: 0, kokenli: 0, toplam: 7,
    };
    expect(S.kokenImi(kokensiz), 'kökensiz kayıt taşıyan satır "ok" göründü')
      .not.toBe('ok');
  });
});

describe('POL-045 · "hiçbirine yazamaz DEĞİL, SINIR YOK" [SIS-EKR-001]', () => {
  it('BOŞ kapsam seçimi "sınır yok" diye uyarır — sessiz geçmez [SIS-EKR-001]', async () => {
    /* Boş seçimi "kimseye yazamaz" sanmak, kapsamı açık bir bağlantıyı
       kapalı sanmaktır — yetki yüzeyinde en pahalı yanılgı. */
    const S = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
    const g: Parameters<typeof S.kapsamUyarilari>[1] = {
      varsayilanTesisKodu: null, mirasKodlari: [], kodlar: [],
      kaynak: 'yok', secenekler: [],
    };
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
  it('TABANSIZ cihaz "uyumlu" SAYILMAZ — karar GERÇEK motordan okunur [SIS-EKR-001]', async () => {
    /* ── NEDEN YENİDEN YAZILDI (inceleme bulgusu · Brief L tur 1) ──────
       Eski hâli yalnız `kararVerilemedi` dizesinin kaynakta GEÇTİĞİNİ
       ölçüyordu. Bir dizenin varlığı, kararın doğru verildiğini
       göstermez: motor `uyumlu` döndürse bile o diş yeşil kalırdı.
       Bugün karar GERÇEK motordan okunur, ekranın işareti de onun
       sayacından türetilir. */
    const { firmwareKarariVer } = await import('@/lib/varlik/firmwareKarari');
    const { tabanImi, tabanSozu } = await import(
      '@/app/(kabuk)/(operasyonel)/tabanlar/mantik');

    /* (1) MOTOR · taban YOKKEN karar `uyumlu` OLAMAZ. */
    const tabansiz = firmwareKarariVer('1.2.3', null);
    expect(tabansiz.durum, 'tabansız cihaz "uyumlu" sayıldı').not.toBe('uyumlu');
    expect(tabansiz.durum, 'taban yokluğu ayrı bir hâl değil').toBe('taban_yok');

    /* (2) SÜRÜM okunamayınca da `uyumlu` olmaz — ikinci bilinmeyen yol. */
    const surumsuz = firmwareKarariVer(null, {
      onayliSurum: '2.0.0', asgariSurum: null, bilinenKotuSurumler: null,
    });
    expect(surumsuz.durum, 'sürümü okunamayan cihaz "uyumlu" sayıldı')
      .toBe('karar_verilemedi');

    /* (3) KARŞI TANIK · gerçekten uyumlu cihaz `uyumlu` DÖNER. Olmasaydı
       üstteki iki diş, hiçbir zaman `uyumlu` dönmeyen bir motorla da
       yeşil kalırdı. */
    expect(firmwareKarariVer('2.0.0', {
      onayliSurum: '2.0.0', asgariSurum: null, bilinenKotuSurumler: null,
    }).durum, 'uyumlu cihaz da uyumlu sayılmıyor — motor hep kırmızı').toBe('uyumlu');

    /* (4) EKRAN · kararı verilemeyen cihazı taşıyan taban "unk" çizilir
       ve sözü "uyumlu" demez. Cümlenin ekran yarısı budur. */
    const taban = {
      id: 'x', turId: null, turAdi: null, uretici: null, model: null,
      onayliSurum: '2.0.0', asgariSurum: null, hedefSurum: null,
      bilenenKotu: null, advisoryReferansi: null, aciklama: null,
      aktif: true, guncellendi: '', uyumlu: 3, eski: 0, bilinenKotu: 0,
      kararVerilemedi: 1,
    };
    expect(tabanImi(taban), 'kararı verilemeyen cihaz taşıyan taban yeşil çizildi')
      .toBe('unk');
    expect(tabanSozu(taban), 'ekran sözü karar borcunu gizledi')
      .toContain('karar verilemedi');
    expect(tabanImi({ ...taban, kararVerilemedi: 0 }),
      'karar borcu yokken de yeşil değil — diş hep "unk" diyor').toBe('ok');
  });
});

/* ═══ 2 · SUNUCU EYLEMİ — "SİLİNMEZ" SÖZÜ ════════════════════════════ */

describe('POL-138 · POL-087 · POL-037 · "Kayıt SİLİNMEZ" [SIS-EKR-001]', () => {
  it('KARARA BAĞLANAN veri koruma başvurusu SİLİNMEZ — satır durur [SIS-EKR-001]', async () => {
    /* Bir uyum ürününün en temel vaadi: karar verilen kayıt yok olmaz.
       Ekran bunu yazıyor; burada EYLEM sürülüyor.

       ── FİKSTÜR KOŞULSUZ KURULUR (inceleme bulgusu · Brief L tur 1) ──
       Eski hâli `if (!basvuru) { expect(basvuru).toBeDefined(); return; }`
       yazıyordu. Vitest'te `expect(null).toBeDefined()` GEÇER (yalnız
       `undefined` kırmızı yakar) — yani fikstür yoksa vaka hiçbir şey
       ölçmeden yeşil yanıyordu. Kendi kaydımızı kurarız; "fikstür yok"
       bir atlama sebebi değildir.

       Kayıt SİLİNMEZ sözü ham `update` ile değil, ekranın GERÇEK
       eylemiyle (`basvuruyuYanitla`) sürülür: sözü tutması gereken kod
       odur. */
    const { basvuruyuYanitla } = await import('@/lib/eylemler2/veriKoruma');
    const basvuru = await db.veriSahibiBasvurusu.create({ data: {
      kod: `KVK-S3E-${damga}`, alinma: new Date(), konu: 'bilgi_talebi',
      ozet: 'Kurgusal veri sahibi başvurusu', durum: 'yeni',
    } });
    const once = await db.veriSahibiBasvurusu.count();

    const s = await basvuruyuYanitla({
      basvuruId: basvuru.id,
      yanitMetni: 'Kurgusal yanıt metni — başvuru sahibine yazılan cevap.',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `başvuru karara bağlanamadı: ${s.hata ?? ''}`).toBe(true);

    expect(await db.veriSahibiBasvurusu.count(),
      'karara bağlanan başvuru SİLİNDİ').toBe(once);
    const sonra = await db.veriSahibiBasvurusu.findUnique({ where: { id: basvuru.id } });
    expect(sonra, 'karara bağlanan başvuru kayboldu').not.toBeNull();
    expect(sonra?.durum, 'karar yazılmadı — vaka yanlış kaydı ölçüyor').toBe('yanitlandi');
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
       kaçırmanın en sessiz yoludur. Cümle bunu önlemek için var.

       ── NEDEN YENİDEN YAZILDI (inceleme bulgusu · Brief L tur 1) ──────
       Eski hâli yalnız `/sorumlu/i` kalıbının motor kaynağında GEÇTİĞİNİ
       ölçüyordu: motor sorumlusuz kayda bildirim yazsa bile diş yeşil
       kalırdı. Bugün motor GERÇEKTEN koşturulur ve İKİ sayaç birden
       okunur — görev açıldı mı, bildirim açılmadı mı. */
    const { sonTarihleriIsle } = await import('@/lib/motorlar/sonTarih');

    /* SORUMLUSUZ kaynak: denetim kaydının sorumlusu YOKTUR (motor
       `sorumluId: null` geçer) ve plan başlangıcı ufkun içindedir. */
    /* ── SAYIM KAYDA GÖRE DARALTILIR (CI kırmızısı · bf0b58c) ─────────
       İlk yazımda `db.bildirim.count()` TABLONUN TAMAMINI sayıyordu ve
       motor aynı koşuda BAŞKA kaynaklar için de (sorumlusu olan bulgu,
       aksiyon, sertifika) bildirim yazıyor. Yerelde vaka yeşildi çünkü
       o görevler dosyanın önceki vakalarında zaten açılmıştı ve
       `gorevGuvenceyeAl` ikinci kez yazmıyordu; CI'da sıra farklıydı ve
       sayaç 0 yerine 11 geldi. Ölçüm SIRAYA bağlıydı — cümlenin iddiası
       ise tek bir kayıt hakkında. Sayım artık O KAYDA bağlanıyor. */
    const d = await db.denetim.create({ data: {
      kod: `DEN-S3E-${damga}`, ad: 'Kurgusal yaklaşan denetim', tip: 'ic_denetim',
      durum: 'plan', planBaslangic: new Date(Date.now() + 7 * 86_400_000),
    } });
    const bildirimi = () => db.bildirim.count({
      where: { kaynakTipi: 'Denetim', kaynakId: d.id },
    });
    expect(await bildirimi(), 'fikstür kirli doğdu').toBe(0);

    await sonTarihleriIsle();

    const gorev = await db.gorev.findFirst({
      where: { tip: 'son_tarih', kaynakTipi: 'Denetim', kaynakId: d.id },
    });
    expect(gorev, 'sorumlusuz kayıt için GÖREV de açılmadı — sessiz kalındı')
      .not.toBeNull();
    expect(gorev?.sorumluId, 'sorumlusuz kayda sorumlu UYDURULDU').toBeNull();
    expect(await bildirimi(),
      'sorumlusuz kayıt için BİLDİRİM üretildi — kime yazıldığı belirsiz')
      .toBe(0);

    /* KARŞI TANIK · SORUMLUSU OLAN kayıt için bildirim ÜRETİLİR. Olmazsa
       üstteki sıfır, "motor hiç bildirim yazmıyor" demek olurdu. Bu sayım
       da KENDİ kaydına bağlanır. */
    const varlik = await db.varlik.findFirst({
      where: { silindi: null }, select: { id: true },
    });
    expect(varlik, 'varlık fikstürü yok — karşı tanık kurulamıyor').not.toBeNull();
    await db.varlik.update({
      where: { id: varlik!.id }, data: { sahipId: oturum.id },
    });
    const sertifika = await db.sertifika.create({ data: {
      ad: `Kurgusal sertifika ${damga}`, varlikId: varlik!.id,
      bitis: new Date(Date.now() + 5 * 86_400_000),
    } });
    await sonTarihleriIsle();
    expect(await db.bildirim.count({
      where: { kaynakTipi: 'Sertifika', kaynakId: sertifika.id },
    }), 'sorumlusu OLAN kayıt için de bildirim yazılmadı — motor hiç yazmıyor')
      .toBeGreaterThan(0);
  });
});

describe('POL-135 · "Öneri etki DEĞİLDİR — alanlar yalnız doğrulamayla dolar" [SIS-EKR-001]', () => {
  it('MOTOR ÖNERİSİ etki alanlarını KENDİLİĞİNDEN doldurmaz [SIS-EKR-001]', async () => {
    /* "Motor önerir, insan karar verir"in olay tarafı. Öneri bir alanı
       doldurursa, doğrulanmamış bir sayı denetim dosyasına girer.

       ── NEDEN YENİDEN YAZILDI (inceleme bulgusu · Brief L tur 1) ──────
       Eski hâli olay eylem modülünün kaynağında bir kalıbın GEÇMEDİĞİNİ
       ölçüyordu. Ama alanları dolduran yer eylem değil MOTORDUR; motor
       yazsa bile diş yeşil kalırdı — üstelik kalıp hiçbir şeye
       eşleşmediği için "geçmiyor" koşulu bedavaydı. Bugün motor gerçekten
       koşturulur ve alanların BOŞ kaldığı ölçülür. */
    const { olayEtkileriniIsle, ETKI_ALANLARI } = await import('@/lib/motorlar/olayEtki');

    /* Etki alanları boş bir olay: motorun önerisi buraya YAZILAMAZ. */
    const olay = await db.olay.create({ data: {
      kod: `OLY-S3E-${damga}`, baslik: 'Kurgusal etki önerisi olayı',
      tip: 'olay', siddet: 'orta', durum: 'acik', tespitKaynagi: 'siem',
    } });

    await olayEtkileriniIsle();

    const sonra = await db.olay.findUnique({ where: { id: olay.id } });
    expect(sonra, 'olay kaydı kayboldu').not.toBeNull();
    for (const alan of ETKI_ALANLARI) {
      expect(sonra?.[alan], `motor "${alan}" alanını KENDİ doldurdu — öneri etki sayıldı`)
        .toBeNull();
    }
    expect(sonra?.etkiDogrulayanId, 'motor kendini doğrulayan olarak yazdı').toBeNull();
    expect(sonra?.etkiDogrulamaZamani, 'motor doğrulama damgası bastı').toBeNull();

    /* KARŞI TANIK · motor ÖNERİSİNİ gerçekten üretti. Üretmeseydi
       yukarıdaki "alanlar boş" ölçümü hiçbir şey ölçmezdi: koşmayan bir
       motor da alanları boş bırakır. */
    expect(sonra?.etkiOnerisiJson, 'motor hiç öneri üretmedi — vaka boşa koştu')
      .not.toBeNull();
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

describe('PAYLAŞILAN TABLO BOŞLUĞU · varsayılan cümle [SIS-EKR-001]', () => {
  it('PAYLAŞILAN TABLO KENDİ boş durumunu YAZMAZ — ya arketip ya HİÇBİR ŞEY [SIS-EKR-001]', async () => {
    /* ── ÖLÇÜLEN KUSUR (düzeltme turu · tur 2 · P1-2) ─────────────────
       Bu vaka ÖNCE `VeriTablosu`nun varsayılan boşluk cümlesinin VAR
       olmasını istiyordu ("Bu süzgeçte kayıt yok —  …" + `{bosEylem}`
       yuvası). İki kusuru birden kilitliyordu:

       (a) `bosEylem` bir YUVAYDI ve hiçbir çağıran onu DOLDURMUYORDU —
           ölçüldü: sıfır çağrı. Doldurulmayan bir uzantı noktası sınır
           değildir; üstünde yorum olan EYLEMSİZ bir boş durumdur.
       (b) Paylaşılan bir tablo, boşluğun SEBEBİNİ bilmez: süzgeç mi
           daralttı, kurulum mu yeni, yetki mi kesti? Bilmediği bir
           boşluğa cümle uyduran bileşen, R-G'nin yasakladığı şeyi
           merkezîleştirir.

       Bugünkü sözleşme: `bosTemizle` verildiyse ürünün KENDİ arketipi
       (`BosFiltre` — sebebi ve çıkışı onda yazılı), verilmediyse HİÇBİR
       ŞEY. Ölçüm ayrıca boş durum kütüğünde de görünür: popülasyon
       126 → 125'e indi ve düşüş gerekçesiyle `olcum-tabani.json`a
       işlendi. */
    const kod = kaynakOku('components/kabuk/tablo.tsx');
    expect(/Bu süzgeçte kayıt yok/.test(kod),
      'paylaşılan tablo yine KENDİ boşluk cümlesini yazıyor').toBe(false);
    /* Süzgeç boşluğunda ürünün arketipi çizilir. */
    expect(kod, 'süzgeç boşluğunda ürünün arketipi çizilmiyor')
      .toContain('if (bosTemizle) return <BosFiltre temizle={bosTemizle} />;');
    /* ── ÇAĞIRAN BOŞ BIRAKTIĞINDA: CÜMLE YOK, İŞARET VAR (Brief M) ──
       Eski sözleşme `return null` idi ve doğruydu — ama bir delik
       açıyordu: ortada bir `<table>` bile kalmadığı için DOM tanığı
       "burada bir veri yüzeyi vardı" diyemiyor, kaynak türeticisi de
       okuyacak metin bulamıyordu. Ekran hiçbir cümle söylemeden boş
       kalabiliyor ve İKİ ÖLÇÜM MEKANİZMASI DA bunu göremiyordu.

       Bugün bileşen görünmez bir İŞARET basıyor: sıfır boyutlu, ekran
       okuyucudan gizli, hiçbir metin taşımayan bir düğüm. Bu bir cümle
       DEĞİLDİR — tanığa "bu kapsamda boş bir veri yüzeyi var, cümlesini
       ara" der ve kapı cümleyi ÇAĞIRANIN yerinde arar. */
    expect(kod, 'çağıran boş bıraktığında tablo yine bir CÜMLE çiziyor')
      .toContain('if (!bosCumle && !bosEylem) return <BosYuzeyIsareti />;');
    expect(kod, 'işaret görünür bir metin taşıyor — cümle uydurmuş olurdu')
      .toMatch(/data-bos-yuzey="tablo" aria-hidden="true" \/>/);
    /* Kapsayıcı sınıfı ÇAĞIRANIN olduğunu söyler: `ab-vt-bos` adı,
       bileşenin kendi boş durumu varmış gibi okunuyordu. */
    expect(kod, 'kapsayıcı hâlâ bileşenin kendi boş durumu gibi adlandırılmış')
      .not.toContain('ab-vt-bos');
  });
});

/* ═══ 4 · GENİŞLETİLEN TÜRETİCİNİN AÇTIĞI EKRAN CÜMLELERİ ═══════════
   Bağımsız inceleme (Brief L · tur 1) türeticinin düz JSX metnini hiç
   görmediğini ölçtü (131 → 184 cümle). Aşağıdaki sekiz cümle o
   genişlemeyle kütüğe girdi ve ölçüt değişmedi: iddiayı UYGULAYAN
   kodun gerçek yolu sürülür. */

describe('POL-192 · POL-176 · "Platform yedek almaz · geri yükleme BAŞLATMAZ" [SIS-EKR-001]', () => {
  it('YEDEKLEME POLİTİKASI hiçbir İŞ başlatmaz ve ağa çıkmaz [SIS-EKR-001]', async () => {
    const { yedeklemePolitikasiKaydet } = await import('@/lib/eylemler2/operasyon');
    const asilFetch = globalThis.fetch;
    let agDenemesi = 0;
    globalThis.fetch = (() => { agDenemesi += 1; throw new Error('POL-192 ihlali'); }) as typeof fetch;
    const onceKosu = await db.yedeklemeKosusu.count();
    try {
      const s = await yedeklemePolitikasiKaydet({
        ad: `Kurgusal yedekleme politikası ${damga}`, siklik: 'gunluk', saklamaGun: 30,
      }) as { ok: boolean; hata?: string };
      expect(s.ok, `politika kaydedilemedi: ${s.hata ?? ''}`).toBe(true);
    } finally { globalThis.fetch = asilFetch; }

    /* Politika bir TAAHHÜT kaydıdır: ne koşu açar, ne ağa çıkar. */
    expect(await db.yedeklemeKosusu.count(), 'politika kaydı bir yedekleme İŞİ başlattı')
      .toBe(onceKosu);
    expect(agDenemesi, 'politika kaydı dış sisteme bağlandı').toBe(0);
    expect(await db.yedeklemePolitikasi.findFirst({
      where: { ad: `Kurgusal yedekleme politikası ${damga}` },
    }), 'politika yazılmadı — vaka boşa koştu').not.toBeNull();
  });

  it('GERİ YÜKLEME TESTİ kaydı son koşuya asılır, izi düşer; platform geri yükleme BAŞLATMAZ [SIS-EKR-001]', async () => {
    const { restoreTestiKaydet } = await import('@/lib/eylemler2/operasyon');
    const kosu = await db.yedeklemeKosusu.findFirst({ select: { id: true } });
    expect(kosu, 'yedekleme koşusu fikstürü yok — vaka kurulamıyor').not.toBeNull();

    const asilFetch = globalThis.fetch;
    let agDenemesi = 0;
    globalThis.fetch = (() => { agDenemesi += 1; throw new Error('POL-176 ihlali'); }) as typeof fetch;
    const onceIz = await db.aktiviteKaydi.count();
    try {
      const s = await restoreTestiKaydet({
        kosuId: kosu!.id, sonuc: 'basarili', sureDk: 12, not: 'Kurgusal saha testi notu',
      }) as { ok: boolean; hata?: string };
      expect(s.ok, `test kaydedilemedi: ${s.hata ?? ''}`).toBe(true);
    } finally { globalThis.fetch = asilFetch; }

    /* (1) KAYIT SON KOŞUYA ASILDI. */
    const test = await db.geriYuklemeTesti.findFirst({
      where: { kosuId: kosu!.id }, orderBy: { id: 'desc' },
    });
    expect(test, 'geri yükleme testi kaydı yazılmadı').not.toBeNull();
    expect(test?.kosuId, 'kayıt koşuya asılmadı').toBe(kosu!.id);
    /* (2) İZ DÜŞTÜ. */
    expect(await db.aktiviteKaydi.count(), 'geri yükleme testi ize düşmedi')
      .toBeGreaterThan(onceIz);
    /* (3) PLATFORM GERİ YÜKLEME BAŞLATMADI — ağa hiç çıkılmadı. */
    expect(agDenemesi, 'platform geri yükleme BAŞLATTI').toBe(0);
  });
});

describe('POL-185 · "Künye değişikliği SÜRÜM AÇMAZ" [SIS-EKR-001]', () => {
  it('KÜNYE güncellemesi kanıt SÜRÜMÜNÜ artırmaz ve sürüm satırı doğmaz [SIS-EKR-001]', async () => {
    const { kanitKaydet } = await import('@/lib/eylemler2/kanit');
    const kanit = await db.kanit.findFirst({
      where: { silindi: null }, select: { id: true, surum: true, tip: true, durum: true },
    });
    expect(kanit, 'kanıt fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const onceSurumSatiri = await db.kanitSurumu.count({ where: { kanitId: kanit!.id } });

    const s = await kanitKaydet({
      id: kanit!.id, ad: `Kurgusal künye ${damga}`, tip: kanit!.tip,
      kaynakSistem: 'Kurgusal kaynak',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `künye güncellenemedi: ${s.hata ?? ''}`).toBe(true);

    const sonra = await db.kanit.findUnique({ where: { id: kanit!.id } });
    expect(sonra?.ad, 'künye yazılmadı — vaka boşa koştu').toBe(`Kurgusal künye ${damga}`);
    /* SÜRÜM AÇILMADI: ne sayaç arttı ne sürüm satırı doğdu. */
    expect(sonra?.surum, 'künye değişikliği SÜRÜM AÇTI').toBe(kanit!.surum);
    expect(await db.kanitSurumu.count({ where: { kanitId: kanit!.id } }),
      'künye değişikliği sürüm satırı yazdı').toBe(onceSurumSatiri);
  });
});

describe('POL-189 · POL-184 · "JIT kapalıyken tanınmayan kimlik reddedilir" [SIS-EKR-001]', () => {
  /* Sağlayıcı GERÇEK bir satır olmalı: JIT açık dalda `KimlikBagi`
     yazılır ve yabancı anahtar uydurma bir id'yi kabul etmez — vaka
     yanlış sebeple kırmızı yanardı. */
  const saglayiciKur = async (jitAcik: boolean) => db.kimlikSaglayici.create({
    data: {
      ad: `Kurgusal sağlayıcı ${jitAcik ? 'jit' : 'kapali'} ${damga}`,
      tur: 'oidc', jitAcik, rolIddiasi: 'roles',
    },
  });

  it('JIT KAPALI · tanınmayan kurum hesabı REDDEDİLİR, hesap AÇILMAZ [SIS-EKR-001]', async () => {
    const { kullaniciyaEsle } = await import('@/lib/kimlik/oidcAkis');
    const once = await db.kullanici.count();
    const s = await kullaniciyaEsle({
      saglayici: (await saglayiciKur(false)) as never,
      govde: { sub: `kurgusal-sub-${damga}`, email: `jit-${damga}@kurgusal.local` } as never,
      rolIddiasi: null,
    });
    expect(s.ok, 'JIT KAPALIYKEN tanınmayan kimlik kabul edildi').toBe(false);
    expect(s.ok === false ? s.ret.tur : '', 'ret tanınmama sebebinden değil')
      .toBe('taninmayan_kullanici');
    expect(await db.kullanici.count(), 'JIT kapalıyken HESAP AÇILDI').toBe(once);
  });

  it('JIT AÇIK · açılan hesap YETKİSİZ doğar — kimlik sağlayıcı yetki vermez [SIS-EKR-001]', async () => {
    /* ── SAĞLAYICI GERÇEKTEN ROL EŞLİYOR OLMALI (sabotaj bulgusu S159) ──
       İlk yazımda sağlayıcının `rolEslemesiJson`u boştu ve jetondaki
       grup hiçbir role çözülmüyordu: `roller` HER HÂLDE boş kalıyordu,
       yani "yetkisiz doğar" ölçümü bedavaydı. Sabotaj (açılan hesaba
       `roller`i yaz) KIRMIZI YAKMADI ve kusuru gösterdi.

       Bugün sağlayıcı bir grubu GERÇEKTEN bir ürün rolüne eşliyor,
       jeton o grubu taşıyor ve motor rolü ÖNERİYOR — hesap yine de
       yetkisiz doğuyor. Ölçülen şey budur: öneri ile yetki ayrı. */
    const { kullaniciyaEsle } = await import('@/lib/kimlik/oidcAkis');
    const eposta = `jit-acik-${damga}@kurgusal.local`;
    const saglayici = await db.kimlikSaglayici.create({ data: {
      ad: `Kurgusal sağlayıcı eşlemeli ${damga}`, tur: 'oidc', jitAcik: true,
      rolIddiasi: 'roles',
      rolEslemesiJson: JSON.stringify({ 'kurgusal-grup': 'yonetici' }),
    } });
    const s = await kullaniciyaEsle({
      saglayici: saglayici as never,
      govde: {
        sub: `kurgusal-sub-acik-${damga}`, email: eposta, name: 'Kurgusal JIT',
        roles: ['kurgusal-grup'],
      } as never,
      rolIddiasi: 'roles',
    });
    expect(s.ok, `JIT açıkken hesap açılamadı: ${s.ok === false ? s.ret.mesaj : ''}`).toBe(true);

    /* (1) MOTOR ÖNERDİ — öneri gerçekten üretildi. Üretilmeseydi
       aşağıdaki "yetkisiz doğdu" ölçümü hiçbir şey ölçmezdi. */
    expect(s.ok === true ? s.rolOnerileri : [],
      'sağlayıcı rol ÖNERMEDİ — vaka yetki dağıtımını hiç sürmüyor')
      .toEqual(['yonetici']);

    /* (2) YETKİ VERİLMEDİ — öneri yetki değildir. */
    const k = await db.kullanici.findUnique({
      where: { eposta }, include: { yetkiler: true },
    });
    expect(k, 'JIT açıkken hesap yazılmadı — vaka boşa koştu').not.toBeNull();
    expect(k!.yetkiler, 'JIT ile açılan hesap YETKİLİ doğdu — sağlayıcı yetki dağıttı')
      .toEqual([]);
  });
});

describe('POL-166 · POL-167 · "boş DEĞİL, OKUNAMADI" [SIS-EKR-001]', () => {
  it('HAM KAYIT saklanmamışsa bile SEBEP daima okunur — kayıt boşluğu sessiz değil [SIS-EKR-001]', async () => {
    /* Cümlenin iddiası: ham kayıt yoksa kaydın neden düştüğü YALNIZ
       sebep metninden okunabilir. Bu ancak `sebep` HER reddedilen kayıtta
       dolu ise doğrudur — şema bunu zorlar, kayıt yolu da öyle. */
    const { readFileSync } = await import('node:fs');
    const sema = readFileSync('prisma/schema.prisma', 'utf8');
    const model = sema.slice(sema.indexOf('model ReddedilenKayit')).slice(0, 1200);
    expect(model, 'sebep alanı OPSİYONEL — ham kayıt yoksa sebep de boş kalabilirdi')
      .toMatch(/\bsebep\s+String(?!\?)/);
    expect(model, 'hamJson zorunlu — cümle olmayan bir hâli anlatıyor olurdu')
      .toMatch(/\bhamJson\s+String\?/);

    /* GERÇEK KAYITLAR da ölçülür: sebebi boş bir reddedilen kayıt yoksa
       ekranın cümlesi tutuyordur. */
    const sebepsiz = await db.reddedilenKayit.count({ where: { sebep: '' } });
    expect(sebepsiz, 'sebebi BOŞ reddedilen kayıt var — cümle yalan').toBe(0);
    const hamsiz = await db.reddedilenKayit.count({ where: { hamJson: null } });
    const toplam = await db.reddedilenKayit.count();
    expect(toplam, 'reddedilen kayıt evreni boş — vaka hiçbir şey ölçmezdi')
      .toBeGreaterThan(0);
    /* ── HER ZAMAN GEÇEN İDDİA KALDIRILDI (düzeltme turu · P3-13) ────
       `toBeGreaterThanOrEqual(0)` bir `count()` üzerinde HİÇBİR ZAMAN
       düşmez: satır rapora "ölçüldü" yazıyor, ölçtüğü şey ise sayının
       negatif olmadığıydı. "Sayı yazılır, şart koşulmaz" doğru bir
       karardır — ama o zaman satır bir İDDİA değil bir GÖZLEMDİR ve
       öyle yazılır. Ölçülebilir olan şudur: hamsız satır sayısı toplamı
       AŞAMAZ ve sayı gerçekten okunmuştur. */
    expect(Number.isInteger(hamsiz), 'hamsız satır sayısı okunamadı').toBe(true);
    expect(hamsiz, 'hamsız satır sayısı toplamı aşıyor — sayım bozuk')
      .toBeLessThanOrEqual(toplam);
    console.log(`reddedilen kayıt: ${toplam} · ham kaydı olmayan: ${hamsiz}`);
  });

  it('SÖZLÜK OKUNAMAYINCA ekran "boş" demez, "okunamadı" der — demo ikizi gerçekten boş döner [SIS-EKR-001]', async () => {
    /* Ekran `sozluk.hedefAlanlar.length === 0` ile karar veriyor
       (`EslemeIstemci.tsx`). O hâlin GERÇEKTEN doğabildiği tek yer demo
       ikizidir; ikiz boş dönmeseydi cümle hiç görünmezdi. */
    const ikiz = await import('@/lib/eylemler2/esleme.demo');
    const sozluk = await ikiz.eslemeSozlugu();
    expect(sozluk.hedefAlanlar, 'demo ikizi dolu sözlük döndü — "okunamadı" hâli hiç doğmaz')
      .toEqual([]);

    /* KARŞI TANIK · GERÇEK sözlük DOLU döner. Dönmeseydi ekran canlı
       kurulumda da "okunamadı" derdi ve cümle yanlış olurdu. */
    const gercek = await (await import('@/lib/eylemler2/esleme')).eslemeSozlugu();
    expect(gercek.hedefAlanlar.length, 'GERÇEK sözlük de boş — cümle canlıda da görünürdü')
      .toBeGreaterThan(0);

    /* Ekranın kararı bu iki değerden türetiliyor; koşul kaynakta duruyor. */
    expect(kaynakOku('app/(kabuk)/(operasyonel)/esleme/EslemeIstemci.tsx'),
      'ekran "okunamadı" kararını sözlüğün uzunluğundan vermiyor')
      .toContain('sozlukOkunamadi={sozluk.hedefAlanlar.length === 0}');
  });
});

describe('POL-177 · "biri başarısız olursa diğerleri geri alınmaz" [SIS-EKR-001]', () => {
  it('TOPLU KEŞİF KARARI kayıt başına AYRI iz yazar; biri düşerse diğerleri DURUR [SIS-EKR-001]', async () => {
    const { kesifYetkiKarari } = await import('@/lib/eylemler2/varlikYonetisim');
    const kesifler = await db.kesifKaydi.findMany({ select: { id: true }, take: 2 });
    expect(kesifler.length, 'iki keşif kaydı fikstürü yok — vaka kurulamıyor').toBe(2);
    const onceIz = await db.aktiviteKaydi.count();

    /* İlki GERÇEK, ikincisi OLMAYAN bir id: ekran "biri başarısız olursa
       diğerleri geri alınmaz" diyor — tam da bu. */
    /* Durum SÖZLÜKTEN alınır; uydurma bir değer zod'da düşer ve vaka
       "geri alınmaz" iddiasını hiç sürmemiş olurdu. */
    const { YETKI_DURUMLARI } = await import('@/lib/varlik/kesifYetkisi');
    const durum = YETKI_DURUMLARI.find((d) => d !== 'karar_verilmedi')!;
    const iyi = await kesifYetkiKarari({
      kesifId: kesifler[0].id, yetkiDurumu: durum, gerekce: 'Kurgusal keşif gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(iyi.ok, `ilk karar reddedildi: ${iyi.hata ?? ''}`).toBe(true);

    const kotu = await kesifYetkiKarari({
      kesifId: `olmayan-${damga}`, yetkiDurumu: durum, gerekce: 'Kurgusal keşif gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(kotu.ok, 'olmayan kayıt için karar kabul edildi').toBe(false);

    /* (1) BAŞARILI olan GERİ ALINMADI. */
    const k0 = await db.kesifKaydi.findUnique({ where: { id: kesifler[0].id } });
    expect(k0?.yetkiDurumu, 'başarısız ikinci karar BİRİNCİYİ geri aldı').toBe(durum);
    /* (2) HER KAYIT KENDİ iz satırını bıraktı — tek toplu satır değil. */
    expect(await db.aktiviteKaydi.count(), 'kayıt başına iz yazılmadı')
      .toBe(onceIz + 1);
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikId: kesifler[0].id }, orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce, 'keşif kararı gerekçesiz ize düştü')
      .toBe('Kurgusal keşif gerekçesi');
  });
});
