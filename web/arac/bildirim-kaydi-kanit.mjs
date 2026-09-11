/* R10 · OLAY → MEVZUAT BİLDİRİMİ · TARAYICI KANITI (OLY-BIL)

   Saf kurallar testte, zincir veritabanı testinde. Burada ölçülen şey
   EKRANIN KENDİSİ: geri sayım gerçekten görünüyor mu, süresiz yükümlülük
   sayaç göstermiyor mu, ve en pahalı iddia — REFERANSSIZ GÖNDERİM
   TARAYICIDA REDDEDİLİYOR MU.

   Bu son iddia bir birim testiyle kanıtlanamaz: kapı sunucu eyleminde
   ama düğme istemcide ve ikisi arasında bir sunucu eylemi sınırı var.
   R12'de tam bu sınırda bir kusur ölçüldü (`'use server'` dosyası nesne
   ihraç ediyordu; tsc · lint · derleme · rota duman temizdi, düğme 500
   döndü). O yüzden burada TIKLANIR.

   ── KAPI KENDİ FİKSTÜRÜNÜ KURAR (gözden geçiren kararı · düzeltme turu)
   Bu betik bir taslağı "gönderildi" yapar; yani KENDİ FİKSTÜRÜNÜ TÜKETİR.
   Eski hâli bunu bir kullanım notuyla geçiştiriyordu ("yerelde ikinci
   koşumdan önce `npm run db:hazirla` gerekir") ve bu, kapıyı DURUMA
   BAĞIMLI yapıyordu:

     · CI'da veritabanı her koşumda yeniden kurulduğu için kapı hep
       yeşildi — ama YANLIŞ SEBEPLE yeşildi: tüketilebilir bir fikstüre
       yaslanan ölçüm, o fikstür varken doğruyu, yokken hiçbir şeyi
       ölçer. Yerelde ikinci koşumda "ÖLÇÜM YETERSİZ" verdi ve kusur
       ancak orada göründü.
     · Aynı sınıf POL-084'te de çıktı: tablo geneline bakan bir sayaç,
       vaka sırasına göre farklı sonuç veriyordu.

   Bugün kapı kendi kaydını AÇAR ve koşum sonunda KENDİ KAPATIR. Taze
   veritabanı varsayımı yoktur; ikinci, üçüncü, onuncu koşum da aynı
   şeyi ölçer. Kayıt kapının kendi damgasını taşır (`KANIT-FIKSTUR-…`)
   ve temizlik SON KOŞULUNU DOĞRULAR: silinmediyse betik kırmızı yanar.

   SINIR (beyanlı): fikstür SQLite `dev.db`ye doğrudan yazılır. Bu kapı
   `kapi-rota` işinde yerel kurulumla koşar; compose/PostgreSQL kurulumu
   yalnız `rota:duman` koşturur ve oraya bu betik girmez.

   Kullanım: PORT=3210 node arac/bildirim-kaydi-kanit.mjs   (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import Database from 'better-sqlite3';
import { KOK, WEB, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const DB_YOL = process.env.DB_YOL || path.join(WEB, 'prisma', 'dev.db');

/* ── FİKSTÜR ───────────────────────────────────────────────────────────
   Kapının süreceği AÇIK bildirim kaydını kendisi açar. Var olan bir
   taslağı ödünç almaz: ödünç alınan kayıt tüketilir ve bir sonraki koşum
   yine fikstürsüz kalırdı — düzeltilmek istenen kusur tam olarak budur. */
function fiksturKur() {
  const db = new Database(DB_YOL);
  try {
    const yuk = db.prepare(
      "select id, kod from BildirimYukumlulugu where aktif = 1 and sureSaat is not null"
      + ' order by kod limit 1').get();
    if (!yuk) return { hata: 'aktif ve süreli bildirim yükümlülüğü yok (tohum eksik)' };

    /* Tekillik kısıtı (olayId + yukumlulukId): bu yükümlülük için kaydı
       OLMAYAN bir olay seçilir. Yoksa kapı sessizce başka bir kaydı
       ölçmeye kaymaz, sebebiyle kırmızı yanar. */
    const olay = db.prepare(
      'select o.id, o.kod from Olay o where o.silindi is null'
      + ' and not exists (select 1 from BildirimKaydi b'
      + '   where b.olayId = o.id and b.yukumlulukId = ?)'
      + ' order by o.kod limit 1').get(yuk.id);
    if (!olay) return { hata: `"${yuk.kod}" için kaydı olmayan olay kalmadı` };

    const id = `kanit-fikstur-${randomUUID()}`;
    const simdi = new Date();
    const sonTarih = new Date(simdi.getTime() + 36 * 3_600_000);
    db.prepare(
      'insert into BildirimKaydi (id, olayId, yukumlulukId, durum, sonTarih,'
      + ' taslakMetin, acildi, guncellendi) values (?,?,?,?,?,?,?,?)',
    ).run(id, olay.id, yuk.id, 'taslak', sonTarih.toISOString(),
      'KANIT-FIKSTUR · kapının kendi açtığı taslak; koşum sonunda silinir.',
      simdi.toISOString(), simdi.toISOString());
    return { id, olayId: olay.id, olayKodu: olay.kod, yukumlulukKodu: yuk.kod };
  } finally { db.close(); }
}

/* TEMİZLİK SON KOŞULUNU DOĞRULAR: "sildim" diyen bir adım, sildiğini
   ÖLÇMELİDİR. Başarısız olamayan bir adım, adım değildir. */
function fiksturSil(id) {
  const db = new Database(DB_YOL);
  try {
    db.prepare('delete from BildirimKaydi where id = ?').run(id);
    const kalan = db.prepare('select count(*) c from BildirimKaydi where id = ?').get(id).c;
    return kalan === 0 ? { ok: true } : { ok: false, hata: `${kalan} satır kaldı` };
  } finally { db.close(); }
}

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900, tiklar: true },
  { ad: '1024×768', width: 1024, height: 768, tiklar: false },
];

/* TÜRKÇE BÜYÜK HARF TUZAĞI: `innerText` CSS `text-transform` sonucunu
   döndürür ve `İ` (U+0130) varsayılan case-fold ile `i`ye inmez. */
const kucuk = (m) => m.toLocaleLowerCase('tr');
const icerir = (govde, parca) => kucuk(govde).includes(kucuk(parca));

const iddialar = [];
const kaydet = (bant, ad, ok, not = '') => {
  iddialar.push({ bant, ad, ok, not });
  console.log(`  ${ok ? 'geçti  ' : 'KIRMIZI'} ${bant} · ${ad}${not ? ` — ${not}` : ''}`);
};

const fikstur = fiksturKur();
if (fikstur.hata) {
  console.error(`\nFİKSTÜR KURULAMADI: ${fikstur.hata}`);
  console.error('  Kapı kendi kaydını açamadı; ölçüm yapılmadı ve "geçti" YAZILMAZ.');
  process.exit(1);
}
console.log(`  fikstür kuruldu: ${fikstur.yukumlulukKodu} · olay ${fikstur.olayKodu}`);

const browser = await chromium.launch({
  executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
});
try {
  for (const bant of BANTLAR) {
    const context = await browser.newContext({ viewport: { width: bant.width, height: bant.height } });
    const page = await context.newPage();
    await girisYap(page);
    await page.goto(`${KOK}/olaylar`, { waitUntil: 'networkidle' });

    const baslik = await page.locator('h1').first().innerText();
    kaydet(bant.ad, 'ekran başlığı', icerir(baslik, 'Olay'), baslik.replace(/\s+/g, ' ').trim());

    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma === 0, `${tasma}px`);

    /* BİLDİRİM KAYDI OLAN olayı bul: her satır tıklanır, çekmecede blok
       aranır. Blok hiçbir olayda yoksa bu bir EKRAN kusuru değil fikstür
       kusurudur — ama sessiz geçilmez, aşağıdaki taban kırmızı yakar. */
    const satirlar = page.locator('[role="row"], .vt-satir, tbody tr');
    const sayi = await satirlar.count();
    kaydet(bant.ad, 'liste dolu', sayi > 0, `${sayi} satır`);

    let cekmece = null;
    let blokMetni = '';
    for (let i = 0; i < sayi; i += 1) {
      await satirlar.nth(i).click();
      const c = page.locator('.ab-panel, [role="dialog"], aside').first();
      await c.waitFor({ timeout: 5000 });
      const metin = await c.innerText();
      /* KAPININ KENDİ kaydını taşıyan çekmece aranır: yalnız "blok var mı"
         demek, fikstürü başka bir olayda olan bir koşumda yanlış kaydı
         ölçmeye açıktı. */
      if (icerir(metin, 'Bildirim yükümlülükleri')
        && icerir(metin, fikstur.yukumlulukKodu)) { cekmece = c; blokMetni = metin; break; }
    }

    kaydet(bant.ad, 'bildirim yükümlülükleri bloğu var', cekmece !== null);
    if (!cekmece) { await context.close(); continue; }

    /* İKİ DURUM AYNI EKRANDA: geri sayımı OLAN ve OLMAYAN. */
    kaydet(bant.ad, 'merci adı yazılı', icerir(blokMetni, 'Kurgusal Merci'));
    /* Kalıp DAR: yalnız "3 gün 4 saat kaldı" biçimi sayılır. Yalın
       `kaldı` sözcüğü ilk turda olay BAŞLIĞINDAKİ "kayıt dışı kaldı"
       ifadesine takıldı ve kanıt kendi kendini yanlış doğruladı. */
    const GERI_SAYIM = /\d+\s+(gün|saat|dakika)\s+.*?(kaldı|GECİKME)/;
    kaydet(bant.ad, 'geri sayım görünüyor',
      GERI_SAYIM.test(blokMetni),
      blokMetni.match(new RegExp(`[^\n]*${GERI_SAYIM.source}[^\n]*`))?.[0]?.trim() ?? 'bulunamadı');
    kaydet(bant.ad, 'SÜRESİZ yükümlülükte sayaç YOK, mevzuatın hâli yazılı',
      icerir(blokMetni, 'Süre mevzuatta belirlenmedi'));

    /* AYNI SATIRDA İKİ SÖZ ÇELİŞEMEZ. Ölçüldü (bu betiğin ilk koşumu):
       motor kaydı her zaman `taslak` açıyordu ve süresi ÇOKTAN geçmiş bir
       olay için ekran "Taslak hazır — gönderilmedi · 6 gün 0 saat GECİKME"
       diyordu. İki cümlenin ikisi de doğru biçimliydi, ikisi de dolu
       veriydi ve HİÇBİR kapı göremiyordu — kusuru rapordaki satırı okuyan
       insan gördü. Kapının kendisi göremediği bir kusuru kanıtlamış
       sayılmaz; iddia bu yüzden buraya YAZILDI ve gecikmiş bir kaydın
       "Taslak hazır" DEMEDİĞİ ölçülür. */
    const gecikmeSatirlari = blokMetni.split('\n').filter((r) => r.includes('GECİKME'));
    const celisen = gecikmeSatirlari.filter((r) => icerir(r, 'Taslak hazır'));
    kaydet(bant.ad, 'gecikmiş kayıt "Taslak hazır" DEMİYOR — çelişen satır yok',
      gecikmeSatirlari.length > 0 && celisen.length === 0,
      celisen.length > 0
        ? `çelişen: ${celisen[0].trim().slice(0, 90)}`
        : `${gecikmeSatirlari.length} gecikme satırı, çelişen 0`);
    kaydet(bant.ad, 'kanal notu yazılı (adres değil)', icerir(blokMetni, 'Kanal:'));
    /* Kanal notu bir ADRES DEĞİLDİR: ekranda uç nokta görünmemeli. */
    kaydet(bant.ad, 'ekranda uç nokta/adres yok',
      !/https?:\/\/|vault:|env:|dosya:/i.test(blokMetni));

    if (!bant.tiklar) { await context.close(); continue; }

    /* ── EN PAHALI İDDİA: REFERANSSIZ GÖNDERİM REDDEDİLİR ───────────── */

    /* İDDİALAR BLOĞA DEĞİL, ÜSTÜNDE İŞLEM YAPILAN SATIRA BAKAR.
       Ölçüldü (parti kapanışı, ikinci yerel koşum): blok BİRDEN ÇOK kayıt
       taşır ve betik bloğun TAMAMINI okuyordu. Bir önceki koşumda
       gönderilmiş komşu kayıt bloğa "Referans: …" satırını bırakınca,
       daha düğmeye basılmadan `kayıt "Gönderildi" olmadı` iddiası
       kırmızı yandı — kod kusursuz, kapı yanlış yere bakıyordu. CI'da
       veritabanı her koşumda yeniden kurulduğu için bu hiç görünmezdi:
       kapı YANLIŞ SEBEPLE yeşildi. Bugün eylem düğmesini TAŞIYAN satır
       bulunur ve bütün tıklama iddiaları o satırın metnine bakar. */
    /* SATIR KAPININ KENDİ KAYDIDIR. Eskiden "gönderim düğmesi olan İLK
       satır" seçiliyordu ve bu, komşu bir kaydı ölçmeye açıktı; bugün
       fikstürün yükümlülük KODU ile daraltılıyor. */
    const satir = cekmece.locator('.ab-panel-satir')
      .filter({ hasText: fikstur.yukumlulukKodu })
      .filter({ has: page.getByRole('button', { name: /Gönderildi olarak işaretle/ }) })
      .first();
    const acikVar = await satir.count() > 0;
    kaydet(bant.ad, 'gönderim düğmesi olan AÇIK kayıt var', acikVar,
      acikVar ? (await satir.innerText()).split('\n')[0].trim().slice(0, 60)
        : 'açık kayıt yok — fikstür tüketilmiş olabilir: npm run db:hazirla');
    if (!acikVar) { await context.close(); continue; }

    /* Satırın kimliği: ilk satırdaki yükümlülük kodu. Yeniden yüklemeden
       sonra AYNI kaydı bulmanın tek yolu budur; "ilk satır" demek,
       sıralama değiştiği gün başka bir kaydı ölçmek olurdu. */
    const kod = (await satir.innerText()).split('·')[0].trim();

    await satir.getByRole('button', { name: /Gönderildi olarak işaretle/ }).first().click();
    const alan = satir.locator('input.ab-girdi').first();
    await alan.waitFor({ timeout: 5000 });
    kaydet(bant.ad, 'referans alanı açıldı', true);

    /* Boş referansla gönder: sunucu REDDETMELİ ve kayıt DEĞİŞMEMELİ. */
    const gonder = satir.getByRole('button', { name: /Gönderildi olarak işaretle/ }).first();
    await gonder.click();
    await page.waitForTimeout(1500);
    const bosSonra = await satir.innerText();
    kaydet(bant.ad, 'REFERANSSIZ gönderim reddedildi',
      icerir(bosSonra, 'referans numarası zorunlu'),
      /* Not alanı HATA satırını gösterir, alan ETİKETİNİ değil: ilk turda
         etiketi ("Merciden alınan referans numarası") yazıyordu ve rapor
         okuyan, kapının çalıştığını değil formun açıldığını görüyordu. */
      bosSonra.match(/[^\n]*referans numarası zorunlu[^\n]*/i)?.[0]?.trim().slice(0, 110)
        ?? 'hata mesajı bulunamadı');
    kaydet(bant.ad, 'BU KAYIT "Gönderildi" olmadı', !icerir(bosSonra, 'Referans:'),
      `${kod} · ${bosSonra.split('\n')[1]?.trim().slice(0, 60) ?? ''}`);

    /* Referansla gönder: geçmeli ve referans ekranda kalmalı. */
    const referans = `KANIT-${Date.now()}`;
    await alan.fill(referans);
    await gonder.click();
    /* Başarılı yazma `revalidatePath` tetikler ve çekmece KAPANABİLİR;
       ilk turda betik kapanan çekmeceyi okumaya çalışıp zaman aşımına
       düştü. Kayıt SUNUCUDAN yeniden okunur: ekranın kalıcı hâli budur,
       çekmecenin o anki DOM'u değil. */
    await page.waitForTimeout(2500);
    await page.goto(`${KOK}/olaylar`, { waitUntil: 'networkidle' });
    let doluSonra = '';
    const yeniSatirlar = page.locator('[role="row"], .vt-satir, tbody tr');
    for (let i = 0; i < await yeniSatirlar.count(); i += 1) {
      await yeniSatirlar.nth(i).click();
      const c = page.locator('.ab-panel, [role="dialog"], aside').first();
      await c.waitFor({ timeout: 5000 });
      if (!icerir(await c.innerText(), 'Bildirim yükümlülükleri')) continue;
      /* AYNI kaydı bul: kod eşleşmesi. Bloğun tamamını okumak, komşu
         kaydın "Gönderildi"sini bu kaydınki sanmaya açıktı. */
      const ayni = c.locator('.ab-panel-satir').filter({ hasText: kod }).first();
      if (await ayni.count() === 0) continue;
      cekmece = c; doluSonra = await ayni.innerText(); break;
    }
    kaydet(bant.ad, 'referansla gönderim geçti', icerir(doluSonra, 'Gönderildi'),
      doluSonra.match(/[^\n]*Gönderildi[^\n]*/)?.[0]?.trim().slice(0, 90) ?? 'bulunamadı');
    kaydet(bant.ad, 'referans numarası ekranda kalıyor', icerir(doluSonra, referans));
    kaydet(bant.ad, 'gönderim sonrası TEYİT eylemi çıkıyor',
      icerir(doluSonra, 'Merci teyidini işle'));

    await context.close();
  }
} finally {
  await browser.close();
  const t = fiksturSil(fikstur.id);
  if (!t.ok) {
    console.error(`\nFİKSTÜR TEMİZLENEMEDİ: ${t.hata}`);
    console.error('  "Sildim" diyen bir adım, sildiğini ÖLÇMELİDİR;');
    console.error('  başarısız olamayan bir adım adım değildir.');
    process.exit(1);
  }
  console.log('  fikstür silindi ve silindiği doğrulandı');
}

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Fikstürde bildirim kaydı yoksa betik yalnız üç iddia sayıp "geçti"
   derdi — hiçbir şeye bakmadan temiz raporlamak tam olarak budur.
   Ölçüldü: tam koşum 27 iddia üretiyor; taban onun altına düşmeye izin
   vermez ve düşerse SEBEBİNİ yazar. Taban 24: iki bant da bloğu bulup
   ekran iddialarını ölçmeden bu sayıya ulaşılamaz. */
const ASGARI_IDDIA = 24;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Kapı kendi kaydını açıyor; "fikstür tükendi" artık bir sebep');
  console.error('  DEĞİLDİR. Blok bulunamadıysa EKRAN kaydı göstermiyor demektir —');
  console.error('  ölçülmemiş bir kapı "geçti" diye yazılmaz.');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nBildirim kaydı kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
