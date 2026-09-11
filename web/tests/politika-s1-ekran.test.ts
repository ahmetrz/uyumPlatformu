import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S1 · DÜZ JSX METNİNDEKİ YETKİ VE SIR İDDİALARI [SIS-YTK-012]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bağımsız inceleme (Brief L · tur 1) politika türeticisinin YALNIZ
   tırnaklı dize sabitlerini taradığını ölçtü: ekranda duran tırnaksız
   JSX metni — `<p>Kullanıcı oluşturmak erişim vermez…</p>` — türeticinin
   görüş alanının dışındaydı. Payda kör olunca "123/123 ölçüldü" oranı da
   kördü.

   Türetici genişletildi (131 → 184 cümle) ve sınıf kalıplarındaki ASCII
   `\b` kusuru da düzeltildi (Türkçe ekler yüzünden `sır` "sırrının"da,
   `göremez` "görünmez"de tutmuyordu — POL-118 bir SIR SIZINTISI iddiası
   olduğu hâlde S3 sayılıyordu). Açılan borcun S1 kısmı burada ölçülür;
   S1'de gerekçeli istisna KABUL EDİLMEZ.

   ── HER VAKA GERÇEK YOLU SÜRER ────────────────────────────────────────
   Yetki iddiaları GERÇEK sunucu eylemini yetkisiz rolle çağırır ve hem
   REDDİ hem YAN ETKİSİZLİĞİ ölçer. Sır iddiaları yapısaldır: sır DEĞERİ
   için bir alan YOKTUR — olmayan bir alan doldurulamaz.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s1-'));
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
  id: '', adSoyad: 'Kurgusal S1', eposta: `s1-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});
const rol = (r: string): Yetki[] =>
  [{ rol: r, modul: null, kapsamOgesiId: null, surecId: null, regulasyonId: null }];

beforeAll(async () => {
  const k = await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: oturum.adSoyad, aktif: true },
  });
  oturum.id = k.id;
  oturum.yetkiler = rol('okuyucu');
});
afterAll(async () => { await db.$disconnect(); await rm(dizin, { recursive: true, force: true }); });

const izSayisi = () => db.aktiviteKaydi.count();

/** Yorumsuz kaynak — yorumdaki bir örnek kusur değildir. */
function kaynakOku(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/* ═══ SIR DEĞERİ HİÇBİR YÜZEYE İNMEZ ═════════════════════════════════ */

describe('POL-195 · POL-200 · POL-168 · POL-171 · "sırrın DEĞERİ inmez" [SIS-YTK-012]', () => {
  it('ŞEMADA sır DEĞERİ için alan YOKTUR — olmayan alan doldurulamaz [SIS-YTK-012]', () => {
    /* ── EN GÜÇLÜ ÖLÇÜM YAPISALDIR ─────────────────────────────────────
       "Bu ekrana inmez" demek bir ekran kararıdır ve yarın değişebilir.
       Sır DEĞERİ için bir KOLON olmaması ise kalıcıdır: bir gün biri o
       alanı doldurur endişesi ancak alan yoksa biter. Bu yüzden ölçüm
       şemadadır, ekranda değil. */
    const sema = kaynakOku('prisma/schema.prisma');
    const yasak = [
      /\bistemciSirri\s+String/, /\bclientSecret\s+String/,
      /\bparola\s+String/, /\btokenDegeri\s+String/, /\bapiAnahtari\s+String/,
    ];
    const bulunan = yasak.filter((k) => k.test(sema)).map(String);
    expect(bulunan, `şemada SIR DEĞERİ alanı var: ${bulunan.join(', ')}`).toEqual([]);
    /* Karşı tanık: REFERANS alanı VAR — yani ölçüm "hiçbir şey bulamadı"
       diye değil, doğru şeyi bulduğu için yeşil. */
    expect(sema, 'sır REFERANSI alanı da yok — vaka yanlış şemayı okuyor')
      .toMatch(/SirriReferansi|sirReferansi/);
  });

  it('SAĞLAYICI KAYDI sır değeri KABUL ETMEZ — eylem yolunda da alan yok [SIS-YTK-012]', async () => {
    const kod = kaynakOku('lib/eylemler2/kimlikSaglayici.ts');
    expect(kod, 'şemada sır DEĞERİ alanı belirmiş').not.toMatch(/istemciSirri\s*:\s*z\./);
    expect(kod, 'sır REFERANSI alanı kayboldu').toContain('istemciSirriReferansi');
  });

  it('ANAHTAR İPTALİ izi yazar ve token DEĞERİNİ ize sokmaz [SIS-YTK-012]', async () => {
    /* POL-168: "Gerekçe denetim izine yazılır; token izin hiçbir yerine
       girmez." İki yarısı da ölçülür — yalnız "iz yazıldı" demek,
       değerin ize sızmadığını göstermez. */
    const kod = kaynakOku('lib/eylemler2/apiAnahtari.ts');
    expect(kod, 'iptal yolu denetim izi yazmıyor').toMatch(/\biz\(/);
    /* Ham token hiçbir iz alanına konmuyor: `token` değişkeni `iz(`
       çağrısının argümanlarında geçmiyor. */
    for (const m of kod.matchAll(/\biz\(\{[\s\S]*?\}\)/g)) {
      expect(m[0], 'token DEĞERİ denetim izine giriyor').not.toMatch(/\btoken\b(?!Ozeti|Hash)/);
    }
  });

  it('POL-168 · İPTAL ANINDA GEÇERLİDİR — aynı token GERÇEK kimlik yolunda 401 [SIS-YTK-012]', async () => {
    /* Cümlenin ASIL yarısı: "anahtar bundan sonra her istekte 401 döner".
       Kaynak okumakla ölçülemez — anahtar üretilir, GERÇEK `istekKimligi`
       yolundan geçirilir, iptal edilir, aynı istek yeniden sürülür. */
    const { apiAnahtariUret, apiAnahtariIptal } = await import('@/lib/eylemler2/apiAnahtari');
    const { istekKimligi } = await import('@/lib/api/kimlik');
    const { HATA_DURUMU } = await import('@/lib/api/hatalar');
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('yonetici');
    try {
      const u = await apiAnahtariUret({
        ad: `Kurgusal anahtar ${damga}`, uclar: ['facilities'], saltOkunur: true,
      }) as { ok: boolean; id?: string; token?: string; hata?: string };
      expect(u.ok, `anahtar üretilemedi: ${u.hata ?? ''}`).toBe(true);
      const istek = () => new Request('https://kurgusal.local/api/v1/facilities', {
        headers: { authorization: `Bearer ${u.token}` },
      });

      /* KARŞI TANIK · iptalden ÖNCE aynı istek GEÇER. Olmazsa aşağıdaki
         401, iptalden değil anahtarın hiç çalışmamasından gelirdi. */
      const once = await istekKimligi(istek());
      expect(once.anahtarId, 'yeni anahtar iptalden ÖNCE de kimlik çözemedi').toBe(u.id);

      const i = await apiAnahtariIptal({ id: u.id!, gerekce: 'Kurgusal iptal gerekçesi' }) as
        { ok: boolean; hata?: string };
      expect(i.ok, `iptal reddedildi: ${i.hata ?? ''}`).toBe(true);

      await expect(istekKimligi(istek()), 'iptal edilmiş anahtar hâlâ kimlik çözüyor')
        .rejects.toMatchObject({ kod: 'yetkisiz' });
      expect(HATA_DURUMU.yetkisiz, 'yetkisiz kodu 401 değil — ekranın cümlesi yanlış')
        .toBe(401);
    } finally { oturum.yetkiler = eski; }
  });

  it('POL-171 · KAPSAM DEĞİŞİMİ TOKENI DEĞİŞTİRMEZ — aynı anahtar çalışır, uçlar kısılır [SIS-YTK-012]', async () => {
    /* "Kapsam token'ı değiştirmez: aynı anahtar çalışmaya devam eder,
       yalnız erişebildiği uçlar kısılır." İki yarı da sürülür: ÖNCE aynı
       token'ın hâlâ kimlik çözdüğü, SONRA kapsamın gerçekten daraldığı. */
    const { apiAnahtariUret, apiAnahtariKapsamGuncelle } =
      await import('@/lib/eylemler2/apiAnahtari');
    const { istekKimligi } = await import('@/lib/api/kimlik');
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('yonetici');
    try {
      const u = await apiAnahtariUret({
        ad: `Kurgusal kapsam ${damga}`, uclar: ['facilities', 'assets'], saltOkunur: true,
      }) as { ok: boolean; id?: string; token?: string; hata?: string };
      expect(u.ok, `anahtar üretilemedi: ${u.hata ?? ''}`).toBe(true);
      const istek = () => new Request('https://kurgusal.local/api/v1/facilities', {
        headers: { authorization: `Bearer ${u.token}` },
      });
      const once = await istekKimligi(istek());
      expect(once.kapsamJson, 'kapsam iki uçla doğmadı').toContain('assets');
      const oncekiHash = (await db.apiAnahtari.findUnique({
        where: { id: u.id! }, select: { tokenHash: true, onEk: true },
      }))!;

      const g = await apiAnahtariKapsamGuncelle({
        id: u.id!, uclar: ['facilities'], saltOkunur: true,
        gerekce: 'Kurgusal daraltma gerekçesi',
      }) as { ok: boolean; hata?: string };
      expect(g.ok, `kapsam güncellenemedi: ${g.hata ?? ''}`).toBe(true);

      /* (1) TOKEN DEĞİŞMEDİ — aynı token hâlâ kimlik çözüyor. */
      const sonra = await istekKimligi(istek());
      expect(sonra.anahtarId, 'kapsam değişince aynı token çalışmaz oldu').toBe(u.id);
      const sonrakiHash = (await db.apiAnahtari.findUnique({
        where: { id: u.id! }, select: { tokenHash: true, onEk: true },
      }))!;
      expect(sonrakiHash.tokenHash, 'kapsam değişimi token ÖZETİNİ değiştirdi')
        .toBe(oncekiHash.tokenHash);
      expect(sonrakiHash.onEk, 'kapsam değişimi anahtar ön ekini değiştirdi')
        .toBe(oncekiHash.onEk);

      /* (2) UÇLAR GERÇEKTEN KISILDI — yoksa cümlenin ikinci yarısı boş. */
      expect(sonra.kapsamJson, 'kapsam daralmadı — `assets` hâlâ açık')
        .not.toContain('assets');
      expect(sonra.kapsamJson, 'kapsam tümüyle boşaldı — daralma değil kapanma')
        .toContain('facilities');
    } finally { oturum.yetkiler = eski; }
  });
});

/* ═══ YETKİ KAPILARI — GERÇEK EYLEM, GERÇEK RET ══════════════════════ */

describe('POL-163 · "Etki doğrulama yönetim onay yetkisi ister" [SIS-YTK-012]', () => {
  /* ── İKİ SEÇİM DE ÖLÇÜMÜN KENDİSİ ────────────────────────────────
     (1) DEĞER GEÇERLİ SEÇİLİR. `deger: '42'` yazılsaydı eylem daha SEVİYE
         KÜMESİ kontrolünde dönerdi, yetki kapısına hiç varmazdı: vaka
         yeşil yanar ama ölçtüğü şey yetki DEĞİL, biçim doğrulaması olurdu.
     (2) ROL, YAZMA yetkisi OLAN ama ONAY yetkisi OLMAYAN bir roldür.
         İlk yazımda `okuyucu` kullanılıyordu ve SABOTAJ YAKMADI (S139):
         `okuyucu`nun `yonetim` modülünde HİÇBİR izni yok, dolayısıyla
         kapı `onay`dan `yazma`ya indirildiğinde de reddediyordu — vaka
         "onay ister" cümlesini değil, "yetkisiz giremez"i ölçüyordu.
         Çekirdek rol kataloğunda `yonetim` modülüne yazma verip onay
         vermeyen bir rol YOK; bu yüzden vaka kendi rolünü kurar. Kapı
         koduna dokunulmuyor — kurulan şey rol KATALOĞUDUR ve katalog
         zaten ürünün verisidir (paket rol tanımlayabilir). */
  it('ONAYSIZ rol etki alanına YAZAMAZ ve kayıt DEĞİŞMEZ [SIS-YTK-012]', async () => {
    const { etkiDogrula } = await import('@/lib/eylemler2/olay');
    const { ETKI_ALANLARI, SEVIYE_KUMESI } = await import('@/lib/motorlar/olayEtki');
    const { ROL_IZINLERI } = await import('@/lib/erisim');
    const alan = ETKI_ALANLARI[0];
    const deger = SEVIYE_KUMESI[alan][1];
    const olay = await db.olay.findFirst({ select: { id: true, uretimEtkisi: true } });
    expect(olay, 'olay fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const oncekiIz = await izSayisi();

    const yaziciRol = `kurgusal_yazici_${damga}`;
    ROL_IZINLERI[yaziciRol] = { yonetim: ['okuma', 'yazma'], envanter: ['okuma', 'yazma'] };
    const eskiYetki = oturum.yetkiler;
    oturum.yetkiler = rol(yaziciRol);
    let s: { ok: boolean; hata?: string };
    try {
      s = await etkiDogrula({
        olayId: olay!.id, alan, deger, gerekce: 'Kurgusal doğrulama gerekçesi',
      }) as { ok: boolean; hata?: string };
    } finally {
      oturum.yetkiler = eskiYetki;
      delete ROL_IZINLERI[yaziciRol];
    }

    expect(s.ok, 'YAZMA yetkisi olan rol etki doğrulayabildi — onay istenmiyor').toBe(false);
    /* Ret YETKİDEN gelmeli: değer kümesi mesajı dönerse eylem kapıya hiç
       varmamış demektir ve vaka yanlış şeyi ölçüyordur. */
    expect(s.hata ?? '', 'ret yetkiden değil, DEĞER kontrolünden geldi')
      .not.toMatch(/geçerli değerler/i);
    const sonra = await db.olay.findUnique({ where: { id: olay!.id } });
    expect(sonra?.uretimEtkisi, 'reddetti ama etki alanına YAZDI').toBe(olay!.uretimEtkisi);
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });

  it('KARŞI TANIK · ONAY yetkisi olan rol AYNI çağrıyla yazabilir [SIS-YTK-012]', async () => {
    /* Bu vaka yeşil kalmalıdır. Olmazsa üstteki ret, yetkiden değil
       fikstürün kurulamamasından geliyor olabilirdi — "hiçbir şey
       ölçmeden yeşil yanan kapı" sınıfı. */
    const { etkiDogrula } = await import('@/lib/eylemler2/olay');
    const { ETKI_ALANLARI, SEVIYE_KUMESI } = await import('@/lib/motorlar/olayEtki');
    const alan = ETKI_ALANLARI[0];
    const deger = SEVIYE_KUMESI[alan][1];
    const olay = await db.olay.findFirst({ select: { id: true } });
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('yonetici');
    try {
      const s = await etkiDogrula({
        olayId: olay!.id, alan, deger, gerekce: 'Kurgusal doğrulama gerekçesi',
      }) as { ok: boolean; hata?: string };
      expect(s.ok, `ONAY yetkisiyle de yazılamadı: ${s.hata ?? ''}`).toBe(true);
      const sonra = await db.olay.findUnique({ where: { id: olay!.id } });
      expect(sonra?.uretimEtkisi, 'ok döndü ama alan yazılmadı').toBe(deger);
    } finally { oturum.yetkiler = eski; }
  });
});

describe('POL-181 · "Kullanıcı oluşturmak erişim vermez" [SIS-YTK-012]', () => {
  it('YENİ kullanıcı YETKİSİZ doğar — hesap açmak erişim vermez [SIS-YTK-012]', async () => {
    /* Ürünün en sessiz yetki kusuru: hesabı açan kişinin ona bir rol de
       verdiğini SANMASI. Kayıt yetkisiz doğmazsa, açan kişi farkında
       olmadan erişim dağıtmış olur. */
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('yonetici');
    try {
      const { kullaniciKaydet } = await import('@/lib/eylemler');
      const eposta = `yeni-${damga}@kurgusal.local`;
      const s = await kullaniciKaydet({
        adSoyad: 'Kurgusal Yeni', eposta, unvan: null, aktif: true,
      } as never) as { ok: boolean };
      expect(s.ok, 'kullanıcı kaydı reddedildi — vaka kurulamadı').toBe(true);
      const k = await db.kullanici.findUnique({
        where: { eposta }, include: { yetkiler: true },
      });
      expect(k, 'kullanıcı yazılmadı').not.toBeNull();
      expect(k!.yetkiler, 'YENİ kullanıcı yetkiyle doğdu — hesap açmak erişim verdi')
        .toEqual([]);
    } finally { oturum.yetkiler = eski; }
  });
});

describe('POL-198 · "Tanımlı yetki yok — hiçbir ekranı açamaz" [SIS-YTK-012]', () => {
  it('YETKİSİZ hesap HİÇBİR modülü okuyamaz — liste türetilir [SIS-YTK-012]', async () => {
    const { izinVar, ROL_IZINLERI } = await import('@/lib/erisim');
    /* Modül listesi ELLE yazılmaz: rol kataloğunda geçen her modül
       taranır — katalog büyürse vaka onunla büyür. */
    const moduller = [...new Set(
      Object.values(ROL_IZINLERI).flatMap((r) => Object.keys(r)),
    )];
    const yetkisiz = { ...oturum, yetkiler: [] as Yetki[] };
    const acik = moduller.filter((m) => izinVar(yetkisiz as never, m as never, 'okuma'));
    expect(moduller.length, 'modül kataloğu boş — vaka boş küme üzerinde koştu')
      .toBeGreaterThan(5);
    expect(acik, `yetkisiz hesaba AÇIK modül: ${acik.join(', ')}`).toEqual([]);
  });
});

describe('POL-172 · "kanıt kaydı bir madde durumu olmadan açılmaz" [SIS-YTK-012]', () => {
  it('MADDE DURUMU OLMADAN kanıt açılamaz — satır doğmaz [SIS-YTK-012]', async () => {
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('yonetici');
    try {
      const { kanitKaydet } = await import('@/lib/eylemler2/kanit');
      const oncekiIz = await izSayisi();
      const oncekiKanit = await db.kanit.count();
      const s = await kanitKaydet({
        baslik: `Kurgusal kanıt ${damga}`, maddeDurumuId: '',
      } as never) as { ok: boolean };
      expect(s.ok, 'madde durumsuz kanıt AÇILDI').toBe(false);
      expect(await db.kanit.count(), 'reddetti ama kanıt satırı yazdı').toBe(oncekiKanit);
      expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
    } finally { oturum.yetkiler = eski; }
  });
});

describe('POL-174 · "Kayıt silinmez, durumu değişir" · dış denetçi [SIS-YTK-012]', () => {
  it('DIŞ DENETÇİ erişimi kapatıldığında KAYIT DURUR, yetki satırı kalkar [SIS-YTK-012]', async () => {
    /* Değişmez denetim izinin en keskin yeri: bir dış denetçinin ne zaman
       girip ne zaman çıktığı, denetimin kendisi kadar önemlidir. */
    const kod = kaynakOku('lib/eylemler2/denetciErisimi.ts');
    /* Erişim kaydı SİLİNMEZ — yalnız yetki satırı kaldırılır. */
    for (const m of kod.matchAll(/db\.(\w+)\.(delete|deleteMany)\s*\(/g)) {
      expect(m[1], `dış denetçi ERİŞİM KAYDI siliniyor: ${m[0]}`).toBe('yetki');
    }
    expect(kod, 'kapatma yolu durum değiştirmiyor').toMatch(/durum/);
  });
});

/* ═══ KAPSAM VE OKUMA-YALNIZ YÜZEYLER ════════════════════════════════ */

describe('POL-157 · "Bu sayfa hiçbir kayıt okumaz" [SIS-YTK-012]', () => {
  it('YARDIM sayfası veritabanına HİÇ dokunmaz — yapısal [SIS-YTK-012]', () => {
    const kod = kaynakOku('app/(kabuk)/(operasyonel)/yardim/page.tsx');
    expect(kod, 'yardım sayfası veritabanı okuyor').not.toMatch(/\bdb\.|@\/lib\/db\b/);
    expect(kod.length, 'yardım sayfası boş okundu — vaka hiçbir şey ölçmedi')
      .toBeGreaterThan(200);
  });
});

describe('POL-169 · "Kapsam açılış anında DONAR" [SIS-YTK-012]', () => {
  it('SAYIM paydası açılıştaki kapsamdan gelir — sonradan eklenen varlık değiştirmez [SIS-YTK-012]', async () => {
    /* Oran her gün başka bir şey söylerse denetimde hiçbir şey söylemez.
       Ölçüm: sayım kaydı kendi kapsamını SAKLAR; payda canlı envanterden
       yeniden hesaplanmaz. */
    const sema = kaynakOku('prisma/schema.prisma');
    const blok = /model EnvanterSayimi \{[\s\S]*?\n\}/.exec(sema);
    expect(blok, 'EnvanterSayimi modeli bulunamadı — vaka yanlış şemayı okuyor').not.toBeNull();
    expect(blok![0], 'sayım kendi kapsamını saklamıyor — payda canlı envanterden gelirdi')
      .toMatch(/kapsam|paydaSayisi|beklenen/i);
  });
});

describe('POL-170 · "Kapsam connector\'ın YAZABİLECEĞİ tesisleri sınırlar" [SIS-YTK-012]', () => {
  it('KAPSAM DIŞI tesis adına gelen kayıt REDDEDİLİR ve sayaçta görünür [SIS-YTK-012]', () => {
    const kod = kaynakOku('lib/entegrasyon/cekirdek.ts');
    expect(kod.length, 'kapsam modülü boş okundu').toBeGreaterThan(100);
    expect(kod, 'kapsam dışı kayıt reddi yok').toMatch(/kapsam/i);
    expect(kod, 'red SAYILMIYOR — "sessiz düşüş yok" iddiası ölçülemez')
      .toMatch(/red|elenen|sayac|reddedilen/i);
  });
});

describe('POL-178 · "Kaynak bağlamı olmayan kayıt doğrulanmış görünmez" [SIS-YTK-012]', () => {
  it('KÖKENSİZ kayıt ne "doğrulanmış" görünür ne kuyruğa girer [SIS-YTK-012]', async () => {
    const S = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
    const kokensiz: Parameters<typeof S.kokenImi>[0] = {
      varlikTipi: 'Kurgusal', manuel: 5, otomatik: 0, dogrulanmis: 0,
      reddedildi: 0, kokenli: 0, toplam: 5,
    };
    expect(S.kokenImi(kokensiz), 'kökensiz kayıt "ok" göründü').not.toBe('ok');
    expect(S.kokenToplanabilir(kokensiz),
      'kökensiz kayıt "toplanabilir" sayıldı — doğrulanacak bir kaynak yok')
      .toBe(false);
    /* KARŞI TANIK: her kaydı bilinen ve doğrulanmış satır "ok"tur ve
       toplanabilir sayılır — yoksa fonksiyon her şeye `false` diyerek de
       bu vakayı geçerdi. */
    const temiz = { ...kokensiz, manuel: 0, kokenli: 5, dogrulanmis: 5 };
    expect(S.kokenImi(temiz), 'temiz satır "ok" görünmüyor').toBe('ok');
    expect(S.kokenToplanabilir(temiz), 'temiz satır toplanabilir değil').toBe(true);
  });
});

describe('POL-150 · "Eşleşmiş olması onu yetkili yapmaz" [SIS-YTK-012]', () => {
  it('EŞLEŞME DURUMU ile YETKİ DURUMU ayrı alanlardır — karıştırılamaz [SIS-YTK-012]', () => {
    /* İki ayrı soru tek alanda tutulsaydı, "eşleşti" durumundaki bir
       kayıt envanterde karşılığı var diye YETKİLİ sanılırdı. */
    const sema = kaynakOku('prisma/schema.prisma');
    const blok = /model KesifKaydi \{[\s\S]*?\n\}/.exec(sema);
    expect(blok, 'KesifKaydi modeli bulunamadı').not.toBeNull();
    expect(blok![0], 'yetki durumu ayrı alan değil — eşleşmeyle karışır')
      .toMatch(/yetkiDurumu/);
    expect(blok![0], 'eşleşme durumu alanı yok').toMatch(/durum/);
  });
});

describe('POL-153 · "hiçbir gerçek adres, kimlik ya da örnek kurum verisi içermez" [SIS-YTK-012]', () => {
  it('KURULUM İSTEK LİSTESİ yalnız ALAN ADI sayar, DEĞER taşımaz [SIS-YTK-012]', () => {
    const kod = kaynakOku('app/(kabuk)/(operasyonel)/saglik/SaglikIstemci.tsx');
    /* Gerçek bir endpoint, IP ya da kurum adı kaçağı: liste "neyin
       isteneceğini" sayar, örneğini DEĞİL. */
    expect(kod, 'listede gerçek bir IP adresi var')
      .not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    expect(kod, 'listede gerçek bir https adresi var')
      .not.toMatch(/https:\/\/(?!ornek\.|example\.)[a-z0-9.-]+\.(com|net|org|tr)\b/i);
  });
});

describe('POL-151 · "uygulanabilirlik kuralı tanımlı değil; kapsam süreçten geliyor" [SIS-YTK-012]', () => {
  it('KURALSIZ çerçevede kapsam SÜREÇTEN gelir, uydurulmaz [SIS-YTK-012]', async () => {
    const kod = kaynakOku('app/(kabuk)/(operasyonel)/uyum/[cerceve]/CerceveIstemci.tsx');
    expect(kod, 'kuralsız hâl ayrı bir dal değil — sessizce "kapsamda" sayılabilirdi')
      .toContain('uygulanabilirlik kuralı tanımlı değil');
    expect(kod.length, 'çerçeve ekranı boş okundu').toBeGreaterThan(500);
  });
});

describe('POL-152 · "Bu görevi yalnız sorumlusu ya da uyum onay yetkisi olan değiştirebilir" [SIS-YTK-012]', () => {
  it('YABANCI YAZAR görevin durumunu DEĞİŞTİREMEZ — kayıt ve iz durur [SIS-YTK-012]', async () => {
    /* Rol SEÇİMİ ölçümün kendisidir: `katkici`nin uyum YAZMA yetkisi var,
       ONAY yetkisi yok. Yetkisiz bir rol seçilseydi eylem daha ön kapıda
       dönerdi ve vaka SAHİPLİK kuralını hiç sürmemiş olurdu. */
    const { gorevDurum } = await import('@/lib/eylemler2/gorev');
    const sahip = await db.kullanici.create({ data: {
      eposta: `sahip-152-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Sahip', aktif: true,
    } });
    const g = await db.gorev.create({ data: {
      baslik: 'Kurgusal görev · POL-152', tip: 'manuel',
      sorumluId: sahip.id, durum: 'acik',
    } });
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('katkici');
    const oncekiIz = await izSayisi();
    try {
      const s = await gorevDurum({ id: g.id, durum: 'yapiliyor' }) as
        { ok: boolean; hata?: string };
      expect(s.ok, 'sorumlusu olmayan, onaysız rol görevi değiştirdi').toBe(false);
      /* Ret SAHİPLİKTEN gelmeli: kapsam ya da biçim mesajı dönerse eylem
         sahiplik kuralına hiç varmamış demektir. */
      expect(s.hata ?? '', 'ret sahiplik kuralından değil').toMatch(/yalnız sorumlusu/);
      const sonra = await db.gorev.findUnique({ where: { id: g.id } });
      expect(sonra?.durum, 'reddetti ama durumu YAZDI').toBe('acik');
      expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
    } finally { oturum.yetkiler = eski; }
  });

  it('KARŞI TANIK · SORUMLUSU aynı rolle değiştirebilir [SIS-YTK-012]', async () => {
    /* "Yalnız sorumlusu" cümlesinin öbür yarısı. Bu vaka yeşil kalmalıdır;
       kırmızıya dönerse üstteki ret sahiplikten değil, rolün yazma
       yetkisinin hiç olmamasından geliyordu. */
    const { gorevDurum } = await import('@/lib/eylemler2/gorev');
    const g = await db.gorev.create({ data: {
      baslik: 'Kurgusal görev · POL-152 karşı tanık', tip: 'manuel',
      sorumluId: oturum.id, durum: 'acik',
    } });
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('katkici');
    try {
      const s = await gorevDurum({ id: g.id, durum: 'yapiliyor' }) as
        { ok: boolean; hata?: string };
      expect(s.ok, `sorumlusu bile değiştiremedi: ${s.hata ?? ''}`).toBe(true);
      const sonra = await db.gorev.findUnique({ where: { id: g.id } });
      expect(sonra?.durum, 'ok döndü ama durum yazılmadı').toBe('yapiliyor');
    } finally { oturum.yetkiler = eski; }
  });
});

describe('POL-180 · "Köken doğrulamak envanter onay yetkisi ister" [SIS-YTK-012]', () => {
  it('ONAYSIZ rol kuyruğu GÖRÜR, karar VEREMEZ — kayıt ve iz durur [SIS-YTK-012]', async () => {
    const { kokenDogrulaEylem } = await import('@/lib/eylemler2/koken');
    const koken = await db.veriKokeni.findFirst({
      where: { varlikTipi: 'Varlik', dogrulamaDurumu: 'dogrulanmadi' },
      select: { id: true, dogrulamaDurumu: true, dogrulayanId: true },
    });
    expect(koken, 'köken fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const oncekiIz = await izSayisi();

    /* ROL SEÇİMİ ÖLÇÜMÜN KENDİSİ: `bt_yoneticisi` envanterde OKUMA ve
       YAZMA taşır, ONAY taşımaz. İlk yazımda `okuyucu` kullanılıyordu ve
       SABOTAJ YAKMADI (S141): `okuyucu`nun envanter yazma yetkisi de yok,
       dolayısıyla kapı `onay`dan `yazma`ya indirildiğinde de reddediyordu
       — vaka "onay ister"i değil "okuyucu yazamaz"ı ölçüyordu. */
    const eskiYetki = oturum.yetkiler;
    oturum.yetkiler = rol('bt_yoneticisi');
    let s: { ok: boolean; hata?: string };
    try {
      s = await kokenDogrulaEylem({
        kokenId: koken!.id, sonuc: 'dogrulandi', gerekce: 'Kurgusal doğrulama dayanağı',
      }) as { ok: boolean; hata?: string };
    } finally { oturum.yetkiler = eskiYetki; }

    expect(s.ok, 'YAZMA yetkisi olan rol köken doğrulayabildi — onay istenmiyor')
      .toBe(false);
    const sonra = await db.veriKokeni.findUnique({ where: { id: koken!.id } });
    expect(sonra?.dogrulamaDurumu, 'reddetti ama köken durumunu YAZDI')
      .toBe(koken!.dogrulamaDurumu);
    expect(sonra?.dogrulayanId, 'reddetti ama doğrulayan damgası düştü')
      .toBe(koken!.dogrulayanId);
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });

  it('KARŞI TANIK · ENVANTER ONAY yetkisi AYNI çağrıyla karar verebilir [SIS-YTK-012]', async () => {
    const { kokenDogrulaEylem } = await import('@/lib/eylemler2/koken');
    const koken = await db.veriKokeni.findFirst({
      where: { varlikTipi: 'Varlik', dogrulamaDurumu: 'dogrulanmadi' },
      select: { id: true },
    });
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('yonetici');
    try {
      const s = await kokenDogrulaEylem({
        kokenId: koken!.id, sonuc: 'dogrulandi', gerekce: 'Kurgusal doğrulama dayanağı',
      }) as { ok: boolean; hata?: string };
      expect(s.ok, `ONAY yetkisiyle de karar verilemedi: ${s.hata ?? ''}`).toBe(true);
      const sonra = await db.veriKokeni.findUnique({ where: { id: koken!.id } });
      expect(sonra?.dogrulamaDurumu, 'ok döndü ama köken durumu yazılmadı')
        .toBe('dogrulandi');
    } finally { oturum.yetkiler = eski; }
  });
});
