import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { artefaktKapisi, gomulenler, isBloklari, karsilastir } from '../arac/derleme-artefakti.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   PAYLAŞILAN DERLEME ARTEFAKTI — ORTAM BEYANI

   Üretim derlemesi CI'da bir kez koşup dört tarayıcılı işe artefakt
   olarak iniyor. Paylaşılan bir derleme ORTAMI DA paylaşır ve ortam
   sessizdir: `NEXT_PUBLIC_*` istemci paketine DERLEME ANINDA gömülür,
   yani artefaktı indiren iş kendi değerini verirse o değer HİÇBİR ŞEY
   yapmaz — ekran derleyenin değerini gösterir, iş akışını okuyan ise
   kendi verdiğini sanır. Sessiz ve inandırıcı.

   Ölçüldü, iki kez: `NEXT_PUBLIC_DEMO` (statik demo derlemesi) ve
   `TEST_PG_URL` (kabuktan sızan bağlantı dizesi).
   ═══════════════════════════════════════════════════════════════════════ */

const damga = (ortam: string, gomulu: Record<string, string> = {}) =>
  ({ ortam, gomulenler: gomulu, yazildi: '2026-09-09T00:00:00.000Z' });

describe('beyan · damga karşılaştırması', () => {
  it('aynı beyan ve aynı gömülü değerler TEMİZ', () => {
    expect(karsilastir({ beyan: 'uretim', damga: damga('uretim'), cevre: {} })).toEqual([]);
  });

  it('BEYANSIZ tüketim kusurdur', () => {
    const k = karsilastir({ beyan: null, damga: damga('uretim'), cevre: {} });
    expect(k.join(' ')).toContain('BEYANSIZ TÜKETİM');
  });

  it('DAMGASIZ artefakt "ölçülemedi" der — "temiz" demez', () => {
    const k = karsilastir({ beyan: 'uretim', damga: null, cevre: {} });
    expect(k).toHaveLength(1);
    expect(k[0]).toContain('DAMGA YOK');
  });

  it('beyan FARKLIYSA artefakt tüketilemez', () => {
    const k = karsilastir({ beyan: 'demo', damga: damga('uretim'), cevre: {} });
    expect(k.join(' ')).toContain('ORTAM UYUŞMUYOR');
  });

  it('GÖMÜLÜ değer farklıysa kusurdur — o değer hiçbir şey yapmaz', () => {
    const k = karsilastir({
      beyan: 'uretim', damga: damga('uretim'), cevre: { NEXT_PUBLIC_DEMO: '1' },
    });
    expect(k.join(' ')).toContain('NEXT_PUBLIC_DEMO');
    expect(k.join(' ')).toContain('HİÇBİR');
  });

  it('yalnız `NEXT_PUBLIC_` önekli değerler gömülü sayılır', () => {
    expect(gomulenler({ NEXT_PUBLIC_A: '1', GIZLI: '2', PORT: '3210' }))
      .toEqual({ NEXT_PUBLIC_A: '1' });
  });
});

const TUKETICI_BASI = `  kapi-rota:
    runs-on: ubuntu-latest
    env:
      DERLEME_ORTAMI: uretim`;

const AKIS = (ek = '') => `jobs:
  derleme:
    runs-on: ubuntu-latest
    env:
      DERLEME_ORTAMI: uretim
    steps:
      - name: Derlemeyi yükle
        uses: actions/upload-artifact@v4
        with:
          name: derleme-uretim
          path: |
            web/.next
          include-hidden-files: true
          if-no-files-found: error
${TUKETICI_BASI}
    steps:
      - name: Derlemeyi indir
        uses: actions/download-artifact@v4
${ek}`;

describe('iş akışı kapısı', () => {
  it('beyanlı üretici ve tüketici TEMİZ', () => {
    expect(artefaktKapisi(AKIS()).kusurlar).toEqual([]);
  });

  it('iş blokları `jobs:` altından çıkarılır, iş düzeyi env okunur', () => {
    const b = isBloklari(AKIS());
    expect([...b.keys()]).toEqual(['derleme', 'kapi-rota']);
    expect(b.get('kapi-rota')?.cevre.DERLEME_ORTAMI).toBe('uretim');
  });

  it('BEYANSIZ tüketici kırmızı', () => {
    const bozuk = AKIS().replace(TUKETICI_BASI, '  kapi-rota:\n    runs-on: ubuntu-latest');
    expect(artefaktKapisi(bozuk).kusurlar.join(' ')).toContain('beyan etmiyor');
  });

  it('ÜRETİLMEYEN bir ortamı isteyen tüketici kırmızı', () => {
    const bozuk = AKIS().replace(
      `${TUKETICI_BASI}`,
      '  kapi-rota:\n    runs-on: ubuntu-latest\n    env:\n      DERLEME_ORTAMI: demo',
    );
    expect(artefaktKapisi(bozuk).kusurlar.join(' ')).toContain('ortamı üreten');
  });

  it('artefakt indirip KENDİ derlemesini de yapan iş kırmızı', () => {
    const bozuk = `${AKIS()}      - name: Kendi derlemesi
        run: npm run build
`;
    expect(artefaktKapisi(bozuk).kusurlar.join(' ')).toContain('hangisini ölçtüğü belirsiz');
  });

  it('NOKTAYLA başlayan yol `include-hidden-files` olmadan kırmızı', () => {
    /* Ölçüldü (CI, `eb2cdeb`): `upload-artifact@v4` `.next` yolunu
       varsayılan olarak dışladı ve adım "No files were found" ile düştü. */
    const bozuk = AKIS().replace('          include-hidden-files: true\n', '');
    expect(artefaktKapisi(bozuk).kusurlar.join(' ')).toContain('include-hidden-files');
  });

  it('`if-no-files-found: error` yoksa kırmızı — sessiz boş artefakt', () => {
    const bozuk = AKIS().replace('if-no-files-found: error', 'if-no-files-found: warn');
    expect(artefaktKapisi(bozuk).kusurlar.join(' ')).toContain('boş artefakt');
  });
});

describe('gömülü değer karşılaştırması İKİ YÖNLÜ [bağımsız inceleme · PR #46]', () => {
  it('DAMGADA olup tüketicide HİÇ bahsi geçmeyen değer KIRMIZI', () => {
    /* Asıl tehlikeli hâl: tüketici değişkenin varlığından habersizdir,
       "yok" sanır ve ekranı derleyenin değeriyle ölçer. Döngü bir tur
       yalnız tüketicinin anahtarlarını geziyordu ve bu hâl hiç ziyaret
       edilmiyordu. */
    const k = karsilastir({
      beyan: 'uretim',
      damga: { ortam: 'uretim', gomulenler: { NEXT_PUBLIC_DEMO: '1' } },
      cevre: {},
    });
    expect(k).toHaveLength(1);
    expect(k[0]).toMatch(/NEXT_PUBLIC_DEMO/);
    expect(k[0]).toMatch(/bu işte "\(yok\)"/);
  });

  it('TÜKETİCİDE olup damgada olmayan değer de KIRMIZI (eski yön korunuyor)', () => {
    const k = karsilastir({
      beyan: 'uretim',
      damga: { ortam: 'uretim', gomulenler: {} },
      cevre: { NEXT_PUBLIC_DEMO: '1' },
    });
    expect(k).toHaveLength(1);
    expect(k[0]).toMatch(/derlemede "\(yok\)"/);
  });

  it('iki taraf da boşsa kusur yok — yanlış alarm üretmez', () => {
    expect(karsilastir({
      beyan: 'uretim', damga: { ortam: 'uretim', gomulenler: {} }, cevre: {},
    })).toEqual([]);
  });
});

describe('iş adı kalıbı TEK NÜSHA [bağımsız inceleme turu 2 · PR #46]', () => {
  it('yorumlu TÜKETİCİ işi blok ayrıştırıcıya görünür', () => {
    /* Bir tur boyunca bu dosyanın KENDİ kopyası vardı; `kapi-farki`
       düzeltilirken bu geride kaldı. Ölçülen sonuç: yorumlu tüketici iş
       adı hiç görünmüyor, adımları bir ÖNCEKİ işe yazılıyor ve BEYANSIZ
       TÜKETİCİ kapıya görünmez oluyordu — kapının kapatmak için var
       olduğu sessiz hâlin ta kendisi. */
    const y = 'jobs:\n'
      + '  derleme:\n    env:\n      DERLEME_ORTAMI: uretim\n    steps:\n'
      + '      - name: Derle\n        run: npm run build\n'
      + '  kapi-rota:  # bant\n    steps:\n'
      + '      - name: İndir\n        uses: actions/download-artifact@v4\n';
    expect([...isBloklari(y).keys()]).toEqual(['derleme', 'kapi-rota']);
  });

  it('yorumlu BEYANSIZ tüketici kapıyı KIRMIZI yakar', () => {
    const y = 'jobs:\n'
      + '  derleme:\n    env:\n      DERLEME_ORTAMI: uretim\n    steps:\n'
      + '      - name: Derle\n        run: npm run build\n'
      + '      - name: Yükle\n        uses: actions/upload-artifact@v4\n'
      + '        with:\n          name: derleme\n          path: web/.next\n'
      + '          if-no-files-found: error\n          include-hidden-files: true\n'
      + '  kapi-rota:  # bant\n    steps:\n'
      + '      - name: İndir\n        uses: actions/download-artifact@v4\n';
    const s = artefaktKapisi(y);
    expect(s.tuketen.map((t) => t.is)).toContain('kapi-rota');
    expect(s.kusurlar.join('\n')).toMatch(/kapi-rota/);
  });

  it('kalıp `kapi-farki.mjs` ile AYNI nesnedir — ikinci kopya yok', async () => {
    const { IS_ADI_KALIBI } = await import('../arac/kapi-farki.mjs');
    const kaynak = readFileSync(
      path.join(process.cwd(), 'arac', 'derleme-artefakti.mjs'), 'utf8',
    );
    /* Elle yazılmış ikinci bir iş-adı regexi dosyada DURMAMALI: "tek
       nüsha" bir yorum cümlesi değil, ölçülen bir olgudur. */
    expect(kaynak).not.toMatch(/\/\^ \{2\}\(\[a-z\]/);
    expect(kaynak).toContain('IS_ADI_KALIBI');
    expect(IS_ADI_KALIBI.test('  kapi-rota:  # bant')).toBe(true);
  });
});
