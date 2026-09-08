import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fark } from '../arac/kapi-farki.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   KAPI FARKI — "yerelde koşan ama CI'da koşmayan" ölçüsünün kuralları

   Ölçünün kendisi bir kapı; bu dosya ONUN kararlarını sabitler. Kararlar
   saf: girdi iki metin (betik tablosu + iş akışı), çıktı üç durumdan biri
   (`adıyla` · `kapsanıyor` · `koşmuyor`). Tarayıcı, sunucu, disk yok.

   Neden var: iki kapı (`rota:duman` · `gezinme:test`) aylarca CI dışında
   kaldı, KIRIK hâlde main'e girdi ve hiçbir şey söylemedi. Bu ölçü o
   sessizliği kapatıyor — o yüzden ölçünün kendi kaçış yolları da vaka
   olarak kapalı tutulur.
   ═══════════════════════════════════════════════════════════════════════ */

const durum = (satirlar: ReturnType<typeof fark>, ad: string) =>
  satirlar.find((s) => s.ad === ad)?.durum;

describe('kapı farkı · koşma kararı', () => {
  it('iş akışında ADI GEÇEN betik koşuyor sayılır', () => {
    const s = fark({
      betikler: { 'a:kapi': 'node arac/a.mjs' },
      isAkisiMetni: 'run: npm run a:kapi',
    });
    expect(durum(s, 'a:kapi')).toBe('adıyla');
  });

  it('BÜTÜN araçları CI\'da koşan betik KAPSANIYOR sayılır', () => {
    /* `tasarim:kontrast` · `tasarim:font` · `tasarim:iz` üçü de
       `tasarim:kapi` içinde koşar. Ayrıca beyan edilmeleri gereksiz bir
       ikinci nüsha olurdu; beyan listesi ancak gerçek borcu göstermeli. */
    const s = fark({
      betikler: {
        'birlesik': 'node arac/a.mjs && node arac/b.mjs',
        'parca': 'node arac/a.mjs',
      },
      isAkisiMetni: 'run: npm run birlesik',
    });
    expect(durum(s, 'parca')).toBe('kapsanıyor');
  });

  it('araçlarından BİRİ bile eksikse KOŞMUYOR', () => {
    const s = fark({
      betikler: { 'genis': 'node arac/a.mjs && node arac/b.mjs', 'dar': 'node arac/a.mjs' },
      isAkisiMetni: 'run: npm run dar',
    });
    expect(durum(s, 'genis')).toBe('koşmuyor');
  });

  it('ARAÇSIZ betik boş küme diye kapsanmış SAYILMAZ', () => {
    /* Boş küme her kümenin alt kümesidir. Bu kural yazılmasaydı
       `next build` · `vitest run` gibi araçsız betikler, iş akışında adı
       hiç geçmese bile "koşuyor" görünürdü — kapının içinde bir bypass. */
    const s = fark({
      betikler: { 'derle': 'next build', 'a:kapi': 'node arac/a.mjs' },
      isAkisiMetni: 'run: npm run a:kapi',
    });
    expect(durum(s, 'derle')).toBe('koşmuyor');
  });

  it('BAYRAK kimliğin parçası — aynı dosya, başka iş', () => {
    /* ÖLÇÜLDÜ: `sayimlar:yenile` (`--yaz`) envanteri YAZAR,
       `sayimlar:denetle` (`--denetle`) DENETLER. Yalnız dosya adına bakan
       ilk kural, denetleyici CI'ya bağlandığı anda yazıcıyı da "koşuyor"
       saydı — kapsama kuralının kendi yanlış pozitifi. */
    const s = fark({
      betikler: { yaz: 'node arac/e.mjs --yaz', denetle: 'node arac/e.mjs --denetle' },
      isAkisiMetni: 'run: npm run denetle',
    });
    expect(durum(s, 'yaz')).toBe('koşmuyor');
  });

  it('`npm run` zinciri ÇÖZÜLÜR — dolaylı çağrı da koşmadır', () => {
    const s = fark({
      betikler: { dis: 'npm run ic && node arac/b.mjs', ic: 'node arac/a.mjs', tek: 'node arac/a.mjs' },
      isAkisiMetni: 'run: npm run dis',
    });
    expect(durum(s, 'tek')).toBe('kapsanıyor');
  });

  it('döngüsel `npm run` zinciri ölçümü KİLİTLEMEZ', () => {
    const s = fark({
      betikler: { a: 'npm run b', b: 'npm run a' },
      isAkisiMetni: 'run: echo yok',
    });
    expect(durum(s, 'a')).toBe('koşmuyor');
  });

  it('YORUM SATIRINA alınmış adım koşuyor SAYILMAZ', () => {
    /* Yorumlanmış bir `npm run` satırı "koşuyor" sayılsaydı, bir kapıyı
       yorum içine alıp beyandan da kaçırmak mümkün olurdu. Bu vaka o
       kaçışı kapalı tutuyor — yorum ayıklaması gerçek iş akışı metni
       üzerinde koşan `isAkisiKomutlari` ile aynı kuraldır. */
    const s = fark({
      betikler: { 'a:kapi': 'node arac/a.mjs' },
      isAkisiMetni: '        # run: npm run a:kapi\n        run: echo yok',
    });
    expect(durum(s, 'a:kapi')).toBe('adıyla');
    const temiz = fark({
      betikler: { 'a:kapi': 'node arac/a.mjs' },
      isAkisiMetni: ['        # run: npm run a:kapi', '        run: echo yok']
        .filter((l) => !l.trimStart().startsWith('#')).join('\n'),
    });
    expect(durum(temiz, 'a:kapi')).toBe('koşmuyor');
  });

  it('`npm test` betiği ADIYLA çağrılmasa da `test`i koşturur', () => {
    const s = fark({ betikler: { test: 'vitest run' }, isAkisiMetni: 'run: npm test' });
    expect(durum(s, 'test')).toBe('adıyla');
  });
});

/* ── Gerçek depoya karşı ────────────────────────────────────────────────
   Aynı işlevi kapı da çağırıyor; ikinci bir kural nüshası değil, aynı
   kuralın daha erken (ve daha okunur) raporlanması. `npm test` CI'da
   tarayıcı kurulmadan önce koşar. */
const PAKET = fileURLToPath(new URL('../package.json', import.meta.url));
const AKIS = fileURLToPath(new URL('../../.github/workflows/pr-kapisi.yml', import.meta.url));

describe('kapı farkı · gerçek depo', () => {
  const satirlar = () => fark({
    betikler: JSON.parse(readFileSync(PAKET, 'utf8')).scripts,
    isAkisiMetni: readFileSync(AKIS, 'utf8').split('\n')
      .filter((l) => !l.trimStart().startsWith('#')).join('\n'),
  });

  it('BEYANSIZ betik yok — her betik ya koşar ya gerekçesiyle beyan edilir', () => {
    const beyansiz = satirlar().filter((s) => s.durum === 'koşmuyor' && !s.beyan).map((s) => s.ad);
    expect(beyansiz, `beyansız betik: ${beyansiz.join(', ')}`).toEqual([]);
  });

  it('BAYAT beyan yok — CI\'ya bağlanan betiğin beyan satırı silinmeli', () => {
    const bayat = satirlar().filter((s) => s.durum !== 'koşmuyor' && s.beyan).map((s) => s.ad);
    expect(bayat, `bayat beyan: ${bayat.join(', ')}`).toEqual([]);
  });

  it('iki duman kapısı CI\'da koşuyor — bu dalın kapattığı kusur', () => {
    const s = satirlar();
    expect(durum(s, 'rota:duman')).toBe('adıyla');
    expect(durum(s, 'gezinme:test')).toBe('adıyla');
  });
});
