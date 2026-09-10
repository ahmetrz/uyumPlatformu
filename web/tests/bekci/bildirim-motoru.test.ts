import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { MOTORUN_YAZABILECEGI } from '@/lib/uyum/bildirimKaydi';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · MOTOR "GÖNDERİLDİ" YAZAMAZ [OLY-BIL-003] · URN-OLY-001

   Kural saf katmanda yazılı (`motorunKarari` yalnız `suresi_gecti`
   döndürür) ve motor onu çağırıyor. Ama kural ile KODUN kendisi ayrı
   şeylerdir: yarın biri motora tek satır `db.bildirimKaydi.update({ data:
   { durum: 'gonderildi' } })` yazsa, saf katman hâlâ doğru olurdu ve
   hiçbir test kırmızı yanmazdı — çünkü o satır saf katmandan geçmiyor.

   Bu bekçi kodu METİN olarak okur: `lib/motorlar/` altındaki hiçbir dosya
   yasak durumları bir dize sabiti olarak taşıyamaz. Motor bir gün böyle
   bir satır kazanırsa kırmızı yanar.

   Yasak liste TÜRETİLİR (`MOTORUN_YAZABILECEGI`nin tümleyeni): durum
   kümesine yeni bir insan kararı eklendiğinde bekçi onu kendiliğinden
   korur; elle yazılmış ikinci bir liste, bir gün birinciden ayrışırdı.
   ═══════════════════════════════════════════════════════════════════════ */

/* TARANAN DOSYA KÜMESİ TÜRETİLİR, elle yazılmaz.

   Kural "motorlar dizini temiz olsun" değil: "BildirimKaydi'na yazan
   hiçbir OTOMASYON dosyası insan kararı yazmasın". Döngü bir gün başka
   bir dosyaya taşınırsa (taşındı da — `lib/uyum/bildirimKaydiAcma.ts`,
   tohum da onu çağırabilsin diye), sabit bir dizin listesi bekçiyi
   sessizce boşa düşürürdü. Bu yüzden küme, `bildirimKaydi.create(` ya da
   `bildirimKaydi.update(` çağıran dosyalardan TÜRETİLİR.

   `lib/eylemler2/` HARİÇTİR ve bu muafiyet ilkeseldir: insan kararını
   yazan yer orasıdır ve `gonderildi`yi yazması GEREKİR. */
const LIB = path.join(process.cwd(), 'lib');
const MUAF = ['eylemler2', 'prisma-client'];

function tsDosyalari(dizin: string): string[] {
  const cikti: string[] = [];
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    if (g.isDirectory()) {
      if (MUAF.includes(g.name)) continue;
      cikti.push(...tsDosyalari(path.join(dizin, g.name)));
    } else if (g.name.endsWith('.ts')) {
      cikti.push(path.join(dizin, g.name));
    }
  }
  return cikti;
}

/** BildirimKaydi'na YAZAN otomasyon dosyaları — türetilmiş küme. */
function yazanDosyalar(): string[] {
  return tsDosyalari(LIB)
    .filter((f) => /bildirimKaydi\.(create|update|updateMany|upsert)\s*\(/.test(
      readFileSync(f, 'utf8'),
    ))
    .map((f) => path.relative(LIB, f))
    .sort();
}

/** İnsan kararı olan durumlar — motorun yazabileceklerinin TÜMLEYENİ. */
const INSAN_KARARI = ['gonderildi', 'teyit_alindi', 'uygulanmaz']
  .filter((d) => !(MOTORUN_YAZABILECEGI as readonly string[]).includes(d));

/** Satır ve blok yorumlarını düşürür: yasak sözcük AÇIKLAMADA geçebilir. */
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('motor bildirim kaydına insan kararı YAZAMAZ [URN-OLY-001]', () => {
  it('ölçüm boş bakmıyor: yazan dosya var ve yasak liste dolu', () => {
    /* Sıfır dosya tarayıp "kusur yok" demek, hiçbir şeye bakmadan temiz
       raporlamaktır. Küme türetildiği için boş çıkması, kuralın değil
       ÖLÇÜMÜN kaybolduğu anlamına gelir. */
    const yazanlar = yazanDosyalar();
    expect(yazanlar.length, yazanlar.join(', ')).toBeGreaterThan(0);
    expect(INSAN_KARARI).toEqual(['gonderildi', 'teyit_alindi', 'uygulanmaz']);
  });

  it('yazan hiçbir dosya yasak durumu dize olarak taşımıyor', () => {
    const kusurlar: string[] = [];
    for (const ad of yazanDosyalar()) {
      const kaynak = yorumsuz(readFileSync(path.join(LIB, ad), 'utf8'));
      for (const yasak of INSAN_KARARI) {
        const kalip = new RegExp(`['"\`]${yasak}['"\`]`);
        kaynak.split('\n').forEach((satir, i) => {
          if (kalip.test(satir)) kusurlar.push(`${ad}:${i + 1} → "${yasak}"`);
        });
      }
    }
    expect(kusurlar, kusurlar.join('\n')).toEqual([]);
  });

  it('SABOTAJ: yasak durum motora yazılırsa bekçi görür', () => {
    /* Bekçinin kendi yürüyüşü ölçülür: kural gerçekten metinde mi
       arıyor, yoksa başka bir sebeple mi susuyor. */
    const sahte = "await db.bildirimKaydi.update({ data: { durum: 'gonderildi' } });";
    const kalip = new RegExp(`['"\`]gonderildi['"\`]`);
    expect(kalip.test(yorumsuz(sahte))).toBe(true);
  });

  it('SABOTAJ: yasak sözcük YORUMDA geçerse bekçi susar (yanlış alarm yok)', () => {
    const yorum = "/* motor 'gonderildi' yazamaz */\nconst x = 1;";
    const kalip = new RegExp(`['"\`]gonderildi['"\`]`);
    expect(kalip.test(yorumsuz(yorum))).toBe(false);
  });

  it('yazan dosya kaydı GERÇEKTEN açıyor ve izin listesinden geçiyor', () => {
    /* BOŞLUK KONTROLÜ: yukarıdaki yasak-durum taraması, hiçbir şey YAZMAYAN
       bir dosyada da yeşil yanar. Burada otomasyonun gerçekten kayıt
       açtığı ve yazdığı her durumun izin listesinden geçtiği ölçülür.

       KALIP NEDEN ATAMA BİÇİMİNE BAKMIYOR: ilk hâli `durum: 'taslak'`
       arıyordu — yani kodun ŞEKLİNİ dondurmuştu. Açılış durumu sabit
       atamadan hesaplanan değere (`durum: acilis`) dönünce bekçi DOĞRU bir
       değişiklikte kırmızı yandı; ölçtüğü özellik ("kayıt açılıyor")
       bozulmamıştı. Bugün özelliğin kendisi ölçülür: otomasyonun açılış
       durumu metinde geçiyor mu ve yazılan durum karar/izin kapısından mı
       geliyor. */
    const kaynaklar = yazanDosyalar()
      .map((ad) => yorumsuz(readFileSync(path.join(LIB, ad), 'utf8')));
    expect(kaynaklar.some((k) => /['"`]taslak['"`]/.test(k))).toBe(true);
    expect(kaynaklar.some((k) => /motorunKarari/.test(k))).toBe(true);
    expect(kaynaklar.some((k) => /motorYazabilirMi/.test(k))).toBe(true);
  });

  it('SABOTAJ: kayıt açmayan bir motor bu boşluk kontrolünde KIRMIZI', () => {
    /* Bekçinin kendi yürüyüşü: kural gerçekten "açılış durumu var mı" diye
       bakıyor mu, yoksa her metinde mi yeşil yanıyor. */
    const acan = "const acilis = motorunKarari(x) ?? 'taslak';";
    const acmayan = 'await istemci.bildirimKaydi.update({ where, data });';
    expect(/['"`]taslak['"`]/.test(acan)).toBe(true);
    expect(/['"`]taslak['"`]/.test(acmayan)).toBe(false);
  });

  it('EKRAN ham durumu geçmez — geri sayımla uzlaştırır', () => {
    /* Bağımsız inceleme bulgusu (P1, #47 turu 1) buradan geri gelebilir:
       `durum: b.durum` yazmak tek karakterlik bir geri adımdır ve saf
       katmandaki vakalar yeşil kalmaya devam ederdi — `gorunenDurum`
       doğru çalışır, ekran onu ÇAĞIRMAZ. Yapısal diş bu yüzden var.

       Ekran neden ham durumu gösteremez: `durum`u yalnız motor yazar ve
       motor periyodik koşar; geri sayım her istekte canlıdır. İkisi
       uzlaştırılmazsa satır aynı anda "Taslak hazır" ve "GECİKME" der. */
    const ekran = readFileSync(
      path.join(LIB, '..', 'app', '(kabuk)', '(operasyonel)', 'olaylar', 'page.tsx'), 'utf8');
    const kayitBlogu = yorumsuz(ekran).slice(ekran.indexOf('bildirimKayitlari:'));
    expect(/gorunenDurum\(/.test(kayitBlogu),
      'ekran geri sayımla uzlaştırmıyor').toBe(true);
    expect(/durum: b\.durum/.test(kayitBlogu),
      'ekran HAM durumu geçiriyor — çelişen satır geri geldi').toBe(false);
  });

  it('bildirim eylemleri UYUM/ONAY ekseninden yetkilenir', () => {
    /* Bağımsız inceleme bulgusu (P2, #47 turu 1): düğmelerin görünürlüğü
       `envanter/yazma`ya bağlıydı, sunucu eylemi `uyum/onay` istiyordu.
       Üç rol birincisini taşıyıp ikincisini taşımıyor — kullanıcı düğmeyi
       görüyor, dolduruyor, sunucu reddediyor. */
    const ekran = yorumsuz(readFileSync(
      path.join(LIB, '..', 'app', '(kabuk)', '(operasyonel)', 'olaylar', 'page.tsx'), 'utf8'));
    expect(/bildirimYetkili:\s*kapsamdaYetkili\([^)]*'uyum',\s*'onay'/.test(ekran)).toBe(true);
    const istemci = yorumsuz(readFileSync(
      path.join(LIB, '..', 'app', '(kabuk)', '(operasyonel)', 'olaylar', 'OlaylarIstemci.tsx'), 'utf8'));
    const blok = istemci.slice(istemci.indexOf('BildirimKaydiEylemleri kayitId'));
    expect(/yazabilir=\{o\.bildirimYetkili\}/.test(blok),
      'bildirim eylemleri hâlâ envanter/yazma bayrağına bağlı').toBe(true);
  });

  it('SABOTAJ: ham durumu geçiren ekran metni KIRMIZI', () => {
    const sahte = 'bildirimKayitlari: x.map((b) => ({ durum: b.durum }))';
    expect(/durum: b\.durum/.test(sahte)).toBe(true);
    const dogru = 'bildirimKayitlari: x.map((b) => ({ durum: gorunenDurum({ ... }) }))';
    expect(/durum: b\.durum/.test(dogru)).toBe(false);
  });

  it('döngü taşınsa da bekçi onu İZLER — küme türetiliyor', () => {
    /* Kusur sınıfı: kural "şu dizin temiz olsun" diye yazılırsa, kod başka
       bir dizine taşındığı gün bekçi sessizce boşa düşer. Ölçüldü: döngü
       `lib/motorlar/`ten `lib/uyum/`a taşındı (tohum da çağırabilsin diye)
       ve sabit dizinli bir bekçi bunu göremezdi. */
    expect(yazanDosyalar()).toContain(path.join('uyum', 'bildirimKaydiAcma.ts'));
  });
});
