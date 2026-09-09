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
