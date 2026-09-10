import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ogeKimligi } from './yardim/kapsam';

/* ═══════════════════════════════════════════════════════════════════════
   R10 · OLAY → MEVZUAT BİLDİRİMİ — MOTOR VE İNSAN KARARI [OLY-BIL]

   Saf kurallar `bildirim-kaydi.test.ts`te. Burada ölçülen şey ZİNCİRİN
   KENDİSİ: gerçek bir olaydan gerçek taslaklar doğuyor mu, motor ikinci
   koşuda ikinci taslak açıyor mu, süresiz yükümlülük geri sayım
   üretmiyor mu, gönderim referanssız reddediliyor mu ve her karar
   denetim izine düşüyor mu.

   Motor SAHTELENMEZ: gerçek veritabanına karşı koşar. Sahtelenmiş bir
   motor, kendi iddiasını kendisi doğrulardı.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-r10-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; kapsamOgesiId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, kapsamOgesiId: ogeKimligi(tesisId), tesisId,
  tuzelKisiId: null, regulasyonId: null, modul: null,
});

const oturum = {
  id: '', adSoyad: 'R10 Testi', eposta: 'r10@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { bildirimSurelerini } = await import('@/lib/motorlar/bildirimSuresi');
const {
  bildirimGonderildiIsaretle, bildirimTeyitIsaretle,
  bildirimUygulanmazIsaretle, bildirimTaslakDuzenle,
} = await import('@/lib/eylemler2/bildirimKaydi');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

const SAAT = 3_600_000;
const damga = Date.now();

let tesisId = '';
let olayId = '';
let sureliId = '';
let suresizId = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({
    where: { aktif: true }, select: { id: true, eposta: true },
  });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;

  const v = await db.varlik.findFirst({
    where: { silindi: null, tesisId: { not: null } }, select: { tesisId: true },
  });
  tesisId = v!.tesisId!;

  /* Fikstürdeki kurallar bu turu etkilemesin: ölçüm kendi iki kuralını
     kurar ve kalanları susturur. */
  await db.bildirimYukumlulugu.updateMany({ data: { aktif: false } });

  const sureli = await db.bildirimYukumlulugu.create({
    data: {
      kod: `R10-SURELI-${damga}`, ad: 'Süreli yükümlülük (72 saat)',
      asgariSiddet: 'yuksek', sureSaat: 72,
      dayanak: 'Kurgusal dayanak — ölçüm için', merci: 'Kurgusal Merci A',
      kanalNotu: 'Kurumun kendi bildirim formu üzerinden',
    },
  });
  sureliId = sureli.id;

  /* SÜRESİZ yükümlülük: mevzuat saat vermemiş. Ürün buraya bir sayı
     yazmaz; kayıt açılır ama geri sayım OLMAZ. */
  const suresiz = await db.bildirimYukumlulugu.create({
    data: {
      kod: `R10-SURESIZ-${damga}`, ad: 'Süresiz yükümlülük (gecikmeksizin)',
      asgariSiddet: 'yuksek', sureSaat: null,
      dayanak: 'Kurgusal dayanak — süre ikincil düzenlemeye bırakılmış',
      merci: 'Kurgusal Merci B',
    },
  });
  suresizId = suresiz.id;

  const olay = await db.olay.create({
    data: {
      kod: `R10-OLAY-${damga}`, baslik: 'Süresi geçmiş kurgusal olay',
      siddet: 'kritik', durum: 'acik', tesisId,
      baslangic: new Date(Date.now() - 100 * SAAT),
    },
  });
  olayId = olay.id;
});

afterAll(async () => { await rm(dizin, { recursive: true, force: true }); });

describe('motor: olaydan TASLAK doğar [OLY-BIL-001]', () => {
  /* İLK koşu ayrı tutulur: aşağıdaki iddiaların bir kısmı motorun
     KAYIT AÇTIĞI an ne yazdığını ölçer ve o an yalnız bir kez yaşanır. */
  let ilkKosu: Awaited<ReturnType<typeof bildirimSurelerini>>;
  beforeAll(async () => { ilkKosu = await bildirimSurelerini(); });

  it('uyan HER yükümlülük için ayrı taslak açılır [OLY-BIL-001]', async () => {
    expect(ilkKosu.kuralYok).toBe(false);
    expect(ilkKosu.acilanTaslak).toBeGreaterThanOrEqual(2);

    const kayitlar = await db.bildirimKaydi.findMany({
      where: { olayId },
      select: { durum: true, sonTarih: true, yukumlulukId: true },
      orderBy: { yukumlulukId: 'asc' },
    });
    expect(kayitlar).toHaveLength(2);
    expect(kayitlar.every((x) => x.durum === 'taslak' || x.durum === 'suresi_gecti')).toBe(true);
  });

  /* AÇILIŞ DURUMU DA HESAPLANIR — ölçüldü (tarayıcı kanıtı, ilk koşum):
     süresi çoktan geçmiş bir olayın kaydı `taslak` açılıyordu ve ekran
     aynı satırda "Taslak hazır — gönderilmedi · 6 gün 0 saat GECİKME"
     diyordu. İki söz aynı satırda çelişiyordu. Kaydın süresi geçmiş
     DOĞDUĞU bu vaka olmadan, kusur ancak İKİNCİ koşuda düzelir ve
     birinci koşuyu kimse ölçmez. */
  it('süresi ÇOKTAN geçmiş olayın kaydı taslak DEĞİL, suresi_gecti DOĞAR', async () => {
    const sureli = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: sureliId } },
      select: { durum: true },
    });
    expect(sureli.durum).toBe('suresi_gecti');
    /* Kayıt hem AÇILDI hem GEÇTİ sayılır: açılış sayacı "kaç kayıt
       doğdu"yu, gecikme sayacı "kaçı gecikmeli"yi söyler ve biri
       öbürünün yerine geçmez. */
    expect(ilkKosu.acilanTaslak).toBeGreaterThanOrEqual(2);
    expect(ilkKosu.suresiGecen).toBeGreaterThanOrEqual(1);
  });

  it('SÜRESİZ yükümlülük süresi geçmiş DOĞMAZ — geçecek bir süre yok', async () => {
    const suresiz = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: suresizId } },
      select: { durum: true },
    });
    expect(suresiz.durum).toBe('taslak');
    expect(ilkKosu.suresiz).toBeGreaterThanOrEqual(1);
  });

  it('SÜRESİZ yükümlülüğün kaydında son tarih YOKTUR [OLY-BIL-002]', async () => {
    const k = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: suresizId } },
    });
    expect(k.sonTarih).toBeNull();
  });

  it('SÜRELİ yükümlülüğün son tarihi olayın BAŞLANGICINDAN hesaplanır', async () => {
    const olay = await db.olay.findUniqueOrThrow({ where: { id: olayId } });
    const k = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: sureliId } },
    });
    expect(k.sonTarih).not.toBeNull();
    expect(k.sonTarih!.getTime()).toBe(olay.baslangic.getTime() + 72 * SAAT);
  });

  it('İKİNCİ koşuda ikinci taslak AÇILMAZ — idempotent [OLY-BIL-001]', async () => {
    const once = await db.bildirimKaydi.count({ where: { olayId } });
    const k = await bildirimSurelerini();
    expect(k.acilanTaslak).toBe(0);
    expect(await db.bildirimKaydi.count({ where: { olayId } })).toBe(once);
  });

  it('süresi geçen SÜRELİ kayıt suresi_gecti olur; SÜRESİZ olan OLMAZ [OLY-BIL-002]', async () => {
    await bildirimSurelerini();
    const sureli = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: sureliId } },
    });
    const suresiz = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: suresizId } },
    });
    expect(sureli.durum).toBe('suresi_gecti');
    /* Süre yoksa geçecek bir şey de yoktur: 100 saat geçmiş olması
       süresiz yükümlülüğü GECİKMİŞ yapmaz. */
    expect(suresiz.durum).toBe('taslak');
  });

  it('motor HİÇBİR kayda gonderildi yazmadı [OLY-BIL-003]', async () => {
    const gonderilmis = await db.bildirimKaydi.count({
      where: { olayId, durum: { in: ['gonderildi', 'teyit_alindi', 'uygulanmaz'] } },
    });
    expect(gonderilmis).toBe(0);
  });
});

describe('insan kararı: gönderim referans ister [OLY-BIL-004]', () => {
  let kayitId = '';
  beforeAll(async () => {
    const k = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: sureliId } },
    });
    kayitId = k.id;
  });

  it('REFERANSSIZ gönderim REDDEDİLİR ve kayıt DEĞİŞMEZ [OLY-BIL-004]', async () => {
    const once = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(hataMetni(await bildirimGonderildiIsaretle({ kayitId, referansNo: '   ' })))
      .toMatch(/referans numarası zorunlu/i);
    const sonra = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(sonra.durum).toBe(once.durum);
    expect(sonra.gonderimZamani).toBeNull();
  });

  it('teyit GÖNDERİLMEDEN işlenemez', async () => {
    expect(hataMetni(await bildirimTeyitIsaretle({ kayitId })))
      .toMatch(/önce gönderimi/);
  });

  it('referansla gönderim geçer, gönderen ve zaman kaydedilir', async () => {
    expect(hataMetni(await bildirimGonderildiIsaretle({
      kayitId, referansNo: `KURGU-${damga}`,
    }))).toBe('');
    const k = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(k.durum).toBe('gonderildi');
    expect(k.referansNo).toBe(`KURGU-${damga}`);
    expect(k.gonderenId).toBe(oturum.id);
    expect(k.gonderimZamani).not.toBeNull();
  });

  it('gönderim DENETİM İZİNE düşer ve izde referans numarası vardır [OLY-BIL-004]', async () => {
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'BildirimKaydi', varlikId: kayitId, alan: 'durum' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz).not.toBeNull();
    expect(iz!.gerekce ?? '').toContain(`KURGU-${damga}`);
    expect(iz!.yeniDeger ?? '').toMatch(/Gönderildi/);
  });

  it('gönderilmiş kayıt İKİNCİ kez gönderilemez', async () => {
    expect(hataMetni(await bildirimGonderildiIsaretle({ kayitId, referansNo: 'BASKA-1' })))
      .toMatch(/zaten gönderilmiş/);
  });

  it('gönderilmiş kaydın TASLAĞI değiştirilemez', async () => {
    expect(hataMetni(await bildirimTaslakDuzenle({ kayitId, taslakMetin: 'yeni metin' })))
      .toMatch(/kanıt olmaktan çıkar/);
  });

  it('MOTOR gönderilmiş kaydı suresi_gecti yapamaz [OLY-BIL-003]', async () => {
    /* Süre çoktan geçmiş bir kayıt; motor yine de dokunmamalı. */
    await bildirimSurelerini();
    const k = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(k.durum).toBe('gonderildi');
  });

  it('teyit gönderimden SONRA işlenir', async () => {
    expect(hataMetni(await bildirimTeyitIsaretle({ kayitId }))).toBe('');
    const k = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(k.durum).toBe('teyit_alindi');
    expect(k.teyitZamani).not.toBeNull();
  });
});

describe('insan kararı: "uygulanmaz" gerekçe ister', () => {
  let kayitId = '';
  beforeAll(async () => {
    const k = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: suresizId } },
    });
    kayitId = k.id;
  });

  it('GEREKÇESİZ karar reddedilir', async () => {
    expect(hataMetni(await bildirimUygulanmazIsaretle({ kayitId, gerekce: 'yok' })))
      .toMatch(/Gerekçe zorunlu/);
  });

  it('gerekçeli karar geçer; kayıt SİLİNMEZ, gerekçesiyle durur', async () => {
    const gerekce = 'Olay kişisel veri içermiyor; bu mercinin kapsamı doğmuyor.';
    expect(hataMetni(await bildirimUygulanmazIsaretle({ kayitId, gerekce }))).toBe('');
    const k = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(k.durum).toBe('uygulanmaz');
    expect(k.uygulanmazGerekcesi).toBe(gerekce);
  });

  it('MOTOR "uygulanmaz" kaydı yeniden taslağa döndürmez', async () => {
    await bildirimSurelerini();
    const k = await db.bildirimKaydi.findUniqueOrThrow({ where: { id: kayitId } });
    expect(k.durum).toBe('uygulanmaz');
  });
});

/* ═══ BAĞIMSIZ İNCELEME BULGULARI · #47 turu 1 ═══════════════════════ */

describe('durum ve denetim izi TEK İŞLEMDE yazılır [OLY-BIL-004]', () => {
  /* P1 · Sınıf 1. İki ayrı çağrı, aradaki çöküşte kaydı "gönderildi ·
     referans dolu" bırakıp izi düşürebilirdi. Emsal aynı depoda vardı
     (`olay.ts` → `etkiDogrula`) ve izlenmemişti. */
  it('kaynak dosyada durum yazımı ile iz AYNI transaction bloğunda', () => {
    const kaynak = readFileSync('lib/eylemler2/bildirimKaydi.ts', 'utf8');
    /* Dört eylemin dördü de işlem açar. */
    expect((kaynak.match(/db\.\$transaction\(/g) ?? []).length).toBe(4);
    /* İŞLEM DIŞINDA kalan bir `bildirimKaydi.update` KALMADI: kalsaydı
       kural yazılı olur, kod eskisi gibi çalışırdı. */
    expect(/\bdb\.bildirimKaydi\.update\(/.test(kaynak)).toBe(false);
    /* İz de işlem istemcisiyle yazılır — `iz(...)` ikinci argümansız
       çağrılırsa varsayılan `db`ye düşer ve işlem dışında kalır. */
    expect(/izYaz\(tx,/.test(kaynak)).toBe(true);
  });

  it('gönderim izi kaydın YANINDA duruyor (yazma ve iz birlikte)', async () => {
    /* Kayıt bu dosyada önce `gonderildi`, sonra `teyit_alindi` oluyor;
       aranan şey durum değil GÖNDERİM İZİ — referansı olan kayıt. */
    const kayit = await db.bildirimKaydi.findFirstOrThrow({
      where: { olayId, referansNo: { not: null } }, select: { id: true, referansNo: true },
    });
    const iz = await db.aktiviteKaydi.findFirst({
      where: {
        varlikTipi: 'BildirimKaydi', varlikId: kayit.id, alan: 'durum',
        yeniDeger: 'Gönderildi',
      },
    });
    expect(iz, 'gönderilmiş kaydın izi yok').not.toBeNull();
    expect(iz!.gerekce).toContain(kayit.referansNo!);
  });
});

describe('MOTORUN yazdığı da iz bırakır [OLY-BIL-003]', () => {
  /* P2 · Sınıf 1. Bir yükümlülüğün DOĞDUĞU ve SÜRESİNİN GEÇTİĞİ anlar
     bu özelliğin en denetim-kritik olaylarıdır; hiçbir iz yoktu. */
  it('taslak açılışı AKTÖRSÜZ bir ize düşer — kararı insan vermedi', async () => {
    const kayit = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: suresizId } },
      select: { id: true },
    });
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'BildirimKaydi', varlikId: kayit.id, eylem: 'olusturma' },
    });
    expect(iz, 'motorun açtığı kaydın izi yok').not.toBeNull();
    expect(iz!.aktorId, 'motor kararı bir insana yazılamaz').toBeNull();
    expect(iz!.gerekce).toContain('motor');
    /* Süresiz yükümlülükte iz de "süre yok" der — sayı uydurmaz. */
    expect(iz!.gerekce).toContain('Süre mevzuatta belirlenmedi');
  });

  it('süresi geçmiş açılan kaydın izi bunu ADIYLA söyler', async () => {
    const kayit = await db.bildirimKaydi.findUniqueOrThrow({
      where: { olayId_yukumlulukId: { olayId, yukumlulukId: sureliId } },
      select: { id: true },
    });
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'BildirimKaydi', varlikId: kayit.id, eylem: 'olusturma' },
    });
    expect(iz!.yeniDeger).toBe('Süresi geçmiş açıldı');
  });
});

describe('gönderim KANITI imha süpürmesinden korunur', () => {
  /* P1 · Sınıf 2. `kanitId` ON DELETE SET NULL taşıyor; salt tarihe
     bakan saklama süpürmesi bağı SESSİZCE koparıyordu. */
  it('bildirim kaydına bağlı Kanit toplu silmeye GİRMEZ', async () => {
    const kanit = await db.kanit.findFirstOrThrow({ select: { id: true } });
    const kayit = await db.bildirimKaydi.findFirstOrThrow({
      where: { olayId }, select: { id: true },
    });
    await db.bildirimKaydi.update({ where: { id: kayit.id }, data: { kanitId: kanit.id } });

    /* Süpürmenin KENDİ koşulu koşulur: gelecekteki bir eşikle HER kanıt
       aday olur; bağlı olan yine de dışarıda kalmalı. */
    const adaylar = await db.kanit.findMany({
      where: { olusturuldu: { lt: new Date(Date.now() + 10 * 365 * 24 * SAAT) },
        bildirimKayitlari: { none: {} } },
      select: { id: true },
    });
    expect(adaylar.map((x) => x.id)).not.toContain(kanit.id);

    /* Kaynak dosyada da koşul duruyor: sorgu buradan kopyalandığı için
       kod değişirse bu vaka yeşil kalıp yanıltmasın. */
    const kaynak = readFileSync('lib/eylemler2/saklama.ts', 'utf8');
    expect(/case 'Kanit':[\s\S]{0,900}?bildirimKayitlari: \{ none: \{\} \}/.test(kaynak)).toBe(true);

    await db.bildirimKaydi.update({ where: { id: kayit.id }, data: { kanitId: null } });
  });
});

describe('kapsam: başka tesisin olayına dokunulamaz', () => {
  it('kapsam dışı yetkiyle gönderim REDDEDİLİR', async () => {
    const kayit = await db.bildirimKaydi.findFirstOrThrow({ where: { olayId } });
    const baska = await db.tesis.findFirst({
      where: { id: { not: tesisId }, durum: 'aktif' }, select: { id: true },
    });
    if (!baska) return;
    const onceki = oturum.yetkiler;
    oturum.yetkiler = [yetki('uyum_yoneticisi', baska.id)];
    try {
      const s = await bildirimGonderildiIsaretle({ kayitId: kayit.id, referansNo: 'X-123' });
      expect(s.ok).toBe(false);
    } finally {
      oturum.yetkiler = onceki;
    }
  });
});
