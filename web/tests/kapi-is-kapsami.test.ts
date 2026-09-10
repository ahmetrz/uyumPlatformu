import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isler, kapiAdimlari, kapiliIsler } from '../arac/kapi-farki.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   İŞ KATMANI DA TÜRETİLİR — kapı kümesi gibi

   Kapı kümesi uzun süredir iş akışından türetiliyordu; türetilmeyen tek
   katman İŞ katmanıydı. `parti-kapanisi.mjs` dört iş adını SABİT
   yazıyordu:

     const ISLER = { hizli: 'kapi', yavas: 'kapi-yavas',
                     postgres: 'kapi-postgres', compose: 'kapi-compose' };

   Bu, türetmenin bütün gerekçesini bir katman yukarıda deliyordu: CI'ya
   beşinci bir iş eklendiği gün yerel kapanış onun kapılarını HİÇ
   koşmaz, üstelik raporun başında "TAM" yazdığı için tamamı koşmuş gibi
   görünürdü. Koşulmayan kapı "geçti" diye yazılmaz kuralının en sessiz
   ihlali budur: kapı listede bile görünmez.

   Bu dosya iki şeyi sabitler:
     1 · iş adları iş akışından türetilir (sabotaj: beşinci iş);
     2 · kapı kümesi bölünmeyle DEĞİŞMEZ (seri kümenin tabanı donuk).
   ═══════════════════════════════════════════════════════════════════════ */

const DEPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AKIS = readFileSync(path.join(DEPO, '.github/workflows/pr-kapisi.yml'), 'utf8');

/* SERİ KÜMENİN TABANI — CI matrisi paralelleştirilmeden ÖNCE ölçüldü
   (`5fe0cf7`, 23 kapı). Bölünme neyin NE ZAMAN koştuğunu değiştirir;
   NEYİN koştuğunu değiştirmez. Buraya bir satır eklemek ya da silmek
   bilinçli bir karardır ve bu yüzden elle yapılır. */
const TABAN_KAPILAR = [
  'node arac/erisim-axe.mjs',
  'node arac/yatay-tasma.mjs',
  'npm run build',
  'npm run demo:build',
  'npm run gerekce:tarama',
  'npm run gezinme:test',
  'npm run kapi:compose',
  'npm run kapi:farki',
  'npm run kapi:goc-zinciri',
  'npm run kapi:pg-goc',
  'npm run kapi:pg-taban',
  'npm run kapi:sema-sapmasi',
  'npm run lint',
  'npm run marka:kapi',
  'npm run rota:duman',
  'npm run sayimlar:denetle',
  'npm run sozluk:kip',
  'npm run tasarim:dil',
  'npm run tasarim:kapi',
  'npm run ters:kapsam',
  'npm run test:pg',
  'npm test',
  'npx tsc --noEmit',
];

describe('iş adları TÜRETİLİR', () => {
  it('gerçek iş akışının işlerini okur', () => {
    expect(isler(AKIS).length).toBeGreaterThan(0);
    expect(isler(AKIS)).toContain('kapi');
  });

  it('`on:` altındaki anahtarları İŞ SANMAZ', () => {
    /* `pull_request:` · `schedule:` · `workflow_dispatch:` de iki
       boşluklu ve değersiz anahtarlardır; `jobs:` bloğu takip
       edilmezse üçü de iş sayılır ve kapsam ölçüsü anlamsızlaşır. */
    for (const sahte of ['pull_request', 'schedule', 'workflow_dispatch']) {
      expect(isler(AKIS)).not.toContain(sahte);
    }
  });

  it('SABOTAJ: iş akışına eklenen BEŞİNCİ iş türetmeye girer', () => {
    /* Sabit ad listesi bu işi görmezdi — kapıları sessizce düşerdi. */
    const sahteAkis = `${AKIS}\n  kapi-yeni:\n    runs-on: ubuntu-latest\n`
      + '    steps:\n      - name: Yeni kapı\n        run: npm run yeni:kapi\n';
    expect(isler(sahteAkis)).toContain('kapi-yeni');
    expect([...kapiliIsler(sahteAkis)]).toContain('kapi-yeni');
    expect(kapiAdimlari(sahteAkis).map((a) => a.komut)).toContain('npm run yeni:kapi');
  });

  it('kapı TAŞIYAN her iş, türetilen iş listesinin İÇİNDEDİR', () => {
    /* İki türetme (`isler` · `adimlar`) aynı iş akışını aynı işlere
       bölmezse, birinin görmediği işin kapıları düşer. `kapi:parti`
       bu farkı KAPSAM DİŞİ olarak kırmızı yakar. */
    const tumIsler = new Set(isler(AKIS));
    for (const is of kapiliIsler(AKIS)) expect(tumIsler.has(is)).toBe(true);
  });
});

/* BÖLÜNMEYLE EKLENEN kapılar. Taban KÜÇÜLMEDİ, büyüdü — ve büyümesi de
   sessiz olmasın diye burada adıyla duruyor. Üçü de paylaşılan derleme
   artefaktının ortam beyanını ölçer: biri iş akışını (statik), biri
   artefakta damgayı yazar, biri indiren işte damgayı beyanla
   karşılaştırır. */
const EKLENEN_KAPILAR = [
  'node arac/derleme-artefakti.mjs --damgala',
  'node arac/derleme-artefakti.mjs --dogrula',
  'npm run kapi:derleme-artefakti',
  /* R12 · denetim formları ekranının iki bantta kanıtı. Formu GERÇEKTEN
     üretir (düğmeye basar, iki dosyanın indiğini doğrular); tsc ve lintin
     göremediği bir sınıfı yakaladığı için CI'da durur. */
  'npm run kanit:denetim-formu',
  /* Hızlı kümenin kör noktası: `arac/*.mjs` içe aktarım grafiği
     `tsc`in kapsamında değil. Ölçüldü — bir aracın ihracı yok
     olunca üç araç kırıldı ve hızlı küme görmedi. */
  'npm run kapi:ithal-zinciri',
  /* R10 · bildirim kaydı ekranının iki bantta kanıtı. Referanssız
     gönderimin REDDEDİLDİĞİNİ tarayıcıda ölçer; bu iddia birim testine
     sığmaz çünkü kapı sunucu eyleminde, düğme istemcidedir. */
  'npm run kanit:bildirim-kaydi',
  /* R10+ · takvim tetikli yükümlülüğün iki bantta kanıtı. Brifin 2.5'i:
     dönem açılıyor · geri sayım doğru · SÜRESİZ dönemde sayaç YOK ·
     motor "yapıldı" yazamıyor. Sonuncusu birim testine sığmaz: kapı
     sunucu eyleminde, düğme istemcidedir. */
  'npm run kanit:bildirim-donemi',
  /* P6 · kimlik ve SSO ekranlarının iki bantta kanıtı. SIR DEĞERİNİN
     hiçbir ekranda görünmediğini ve bağlı olmayan sağlayıcının giriş
     ekranında çıkmadığını tarayıcıda ölçer. */
  'npm run kanit:kimlik',
  /* R1 · mevzuat radarı ekranının iki bantta kanıtı. En pahalı iddia:
     ENGELLİ ile KARŞILAŞTIRILAMADI ekranda AYRI görünüyor. İkisi ayrı
     metriktir çünkü biri kaynağın kararıdır (ürün aşmaz), öbürü bizim
     bilgi eksiğimizdir — tek sayıya toplamak, bakılamamış bir kaynağı
     "temiz" göstermeye bir adım kalırdı. */
  'npm run kanit:mevzuat-radari',
  /* R15 · kişisel veri koruma ekranının iki bantta kanıtı. En pahalı
     iddia: ÜÇ AYRI "bilinmiyor" hâli tek sayıya toplanmıyor
     (değerlendirilmemiş faaliyet · tarihi girilmemiş aktarım · süre
     kuralı olmayan başvuru) ve AYDINLATMA METNİ üreten bir düğme YOK —
     metin kurumun hukuki beyanıdır, ürün kurumun adına beyanda
     bulunmaz. */
  'npm run kanit:veri-koruma',
];

describe('kapı kümesi bölünmeyle değişmez', () => {
  it('SERİ TABANDAKİ HİÇBİR KAPI KAYBOLMADI', () => {
    /* 2.5'in aslı bu: bölünme neyin NE ZAMAN koştuğunu değiştirir,
       NEYİN koştuğunu değiştirmez. Bir kapı sessizce düşerse burada
       adıyla görünür. */
    const bugun = new Set(kapiAdimlari(AKIS).map((a) => a.komut));
    const kaybolan = TABAN_KAPILAR.filter((k) => !bugun.has(k));
    expect(kaybolan, `bölünmede kaybolan kapı: ${kaybolan.join(', ')}`).toEqual([]);
  });

  it('kapı kümesi TABAN + BEYAN EDİLMİŞ EKLEMELER kadardır', () => {
    /* Eşitlik iki yönlü ısırır: kapı düşerse de, beyansız bir kapı
       eklenirse de kırmızı. Yeni bir kapı bilinçli bir karardır ve
       `EKLENEN_KAPILAR`a elle yazılır. */
    const bugun = [...new Set(kapiAdimlari(AKIS).map((a) => a.komut))].sort();
    expect(bugun).toEqual([...TABAN_KAPILAR, ...EKLENEN_KAPILAR].sort());
  });

  it('kapı sayısı taban sayısının ALTINA düşemez', () => {
    expect(new Set(kapiAdimlari(AKIS).map((a) => a.komut)).size)
      .toBeGreaterThanOrEqual(TABAN_KAPILAR.length);
  });

  it('tarayıcılı kapılar AYRI işlere bölündü ve HEPSİ sunucu ister', () => {
    /* Yaşam döngüsü İŞ BAŞINA ölçülmezse yalnız birinci işin kapısı
       "sunucu ister" diye işaretlenir; kalanlar yerel kapanışta sunucusuz
       koşar ve kırmızı yanar — kusur kodda değil araçta.

       Sayı 4 DEĞİL: `kapi-rota` işi aynı sunucuyla YEDİ kapı koşuyor
       (rota duman + denetim formları + bildirim kaydı + bildirim dönemi +
       kimlik + mevzuat radarı + kişisel veri koruma kanıtı). Bölünmenin
       ölçüsü kapı sayısı değil, kapıların KENDİ İŞİNDEKİ yaşam
       döngüsüne göre doğru sınıflanması. */
    const tarayicili = kapiAdimlari(AKIS).filter((a) => a.sunucuIster);
    expect(tarayicili).toHaveLength(10);
    expect(new Set(tarayicili.map((a) => a.is)).size).toBe(4);
  });

  it('yoruma alınmış kapı SAYILMAZ', () => {
    const sahte = 'jobs:\n  a:\n    steps:\n      - name: X\n'
      + '        run: npm run x:kapi\n      # - name: Y\n      #   run: npm run y:kapi\n';
    const komutlar = kapiAdimlari(sahte).map((a) => a.komut);
    expect(komutlar).toContain('npm run x:kapi');
    expect(komutlar).not.toContain('npm run y:kapi');
  });

  it('AYNI komut FARKLI ortamda iki ayrı kapıdır', () => {
    /* `demo:build` bunun canlı vakası: `NEXT_PUBLIC_DEMO=1` olmadan
       koşan `next build` başka bir şey ölçer. Tekilleştirme komut+ortam
       üstünden yapılır; yalnız komuda bakan bir tekilleştirme statik
       demo kapısını yutardı. */
    const sahte = 'jobs:\n  a:\n    steps:\n      - name: X\n'
      + '        run: npm run ayni\n  b:\n    steps:\n      - name: X2\n'
      + '        env:\n          NEXT_PUBLIC_DEMO: \'1\'\n        run: npm run ayni\n';
    expect(kapiAdimlari(sahte)).toHaveLength(2);
  });
});

describe('iş adı satırında SATIR-İÇİ YORUM [bağımsız inceleme · PR #46]', () => {
  it('`  kapi-yavas:  # toplayıcı` işi DÜŞMEZ', () => {
    /* Kalıp satırın tamamen boşlukla bitmesini şart koşuyordu; yorumlu
       bir iş adı satırı hiç eşleşmiyor ve o iş türetilen listeden
       SESSİZCE düşüyordu. İki sonuç birden: parti kapsamı eksilir ve
       adımlar bir önceki işe yazılır — kapanış yine "tamamı koştu" der. */
    const y = 'jobs:\n  kapi:\n    runs-on: ubuntu-latest\n'
      + '  kapi-yavas:  # toplayıcı\n    runs-on: ubuntu-latest\n';
    expect(isler(y)).toEqual(['kapi', 'kapi-yavas']);
  });

  it('adımlar da doğru işe yazılır — yorumlu iş adı kapsamı kaydırmaz', () => {
    const y = 'jobs:\n  kapi:\n    steps:\n      - name: Bir\n        run: npm run bir\n'
      + '  kapi-demo:  # kendi derlemesi\n    steps:\n'
      + '      - name: İki\n        run: npm run iki\n';
    const demo = kapiAdimlari(y, new Set(['kapi-demo']));
    expect(demo.map((a) => a.komut)).toEqual(['npm run iki']);
  });

  it('TAM SATIR yorumu hâlâ iş sayılmaz', () => {
    const y = 'jobs:\n  kapi:\n    runs-on: x\n#  kapi-hayalet:\n    runs-on: x\n';
    expect(isler(y)).toEqual(['kapi']);
  });
});
