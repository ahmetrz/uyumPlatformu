import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { durdurmaKarari, sunucuYasamDongusu } from '../arac/kapi-farki.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   SUNUCU DURDURMA — "başarısız olamayan temizlik adımı" sınıfı

   DOĞURAN KUSUR (ölçüldü · 8 Eylül 2026): PR kapısının "Sunucuyu durdur"
   adımı `pkill -f 'next start' || true` idi ve HİÇBİR ŞEYİ öldürmüyordu.
   `next start` açılıştan sonra süreç adını `next-server (vX.Y.Z)` yapar;
   kalıp eşleşmez, `|| true` sessizleştirir. Parti kapanışından sonra
   sunucu PID 5777 · PPID 1 olarak 3210'da AYAKTA kaldı ve
   `pgrep -af 'next start'` sıfır eşleşme döndü.

   CI'da maskeliydi (runner atılıyor). Yerelde `kapi:parti` aynı adımı iş
   akışından TÜRETİP koştuğu için her parti kapanışı bayat bir sunucu
   bırakıyordu — ölçüm aracı, devir kaydının 1 numaralı yanlış alarm
   tuzağını kendisi üretiyordu.

   Kararlar SAF tutuldu ki sabotaj mümkün olsun: kusurun ESKİ hâli aşağıda
   fikstür olarak duruyor ve kapının onda hâlâ kırmızı yandığı sınanıyor.
   Düzeltilmiş kapı, kusurun eski hâlinde hâlâ kırmızı yanmazsa düzeltme
   değil, delik açılmıştır.
   ═══════════════════════════════════════════════════════════════════════ */

const DEPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PR_KAPISI = path.join(DEPO, '.github/workflows/pr-kapisi.yml');

/** İş akışı metni — yorum satırları atılır (araçların okuduğu hâl). */
const isAkisi = readFileSync(PR_KAPISI, 'utf8')
  .split('\n').filter((s) => !s.trimStart().startsWith('#')).join('\n');

/* Kusurun ESKİ hâli. Silinmez: sabotaj vakası budur. */
const ESKI_HALI = "pkill -f 'next start' || true";

describe('durdurma kararı · sabotaj vakası', () => {
  it('KUSURUN ESKİ HÂLİ hâlâ KIRMIZI yanar', () => {
    const k = durdurmaKarari(ESKI_HALI);
    expect(k.saglam).toBe(false);
    expect(k.kusurlar).toHaveLength(3);
  });

  it('süreç ADIYLA öldürme tek başına yeterli kusurdur', () => {
    /* `|| true` olmasa ve son koşul doğrulansa bile: ad yabancı bir
       detaydır. Bugün eşleşse yarın sürüm değişince sessizce kayar. */
    const k = durdurmaKarari('pkill -f "next start"\ncurl -s localhost:3210/ && exit 1');
    expect(k.saglam).toBe(false);
    expect(k.kusurlar.some((s) => /ADIYLA/.test(s))).toBe(true);
  });

  it('`|| true` tek başına yeterli kusurdur', () => {
    const k = durdurmaKarari('fuser -k -n tcp 3210 || true\ncurl -s x && exit 1');
    expect(k.saglam).toBe(false);
    expect(k.kusurlar.some((s) => /yutuyor/.test(s))).toBe(true);
  });

  it('SON KOŞULU doğrulamayan adım — öldürse bile kusurludur', () => {
    /* Porttan öldürüyor, sonucu da yutmuyor; ama öldüremediğinde bunu
       söyleyeceği bir yol yok. Kırmızı yakamayan adım kapı değildir. */
    const k = durdurmaKarari('fuser -k -n tcp 3210');
    expect(k.saglam).toBe(false);
    expect(k.kusurlar.some((s) => /SON KOŞULU/.test(s))).toBe(true);
  });

  it('porttan öldüren + son koşulu doğrulayan adım SAĞLAMDIR', () => {
    const k = durdurmaKarari([
      'fuser -k -n tcp 3210 || echo "yok"',
      'for i in $(seq 1 10); do',
      '  if ! curl -s -o /dev/null --max-time 2 http://localhost:3210/; then exit 0; fi',
      '  sleep 1',
      'done',
      'echo "acik"; exit 1',
    ].join('\n'));
    expect(k.saglam).toBe(true);
    expect(k.kusurlar).toEqual([]);
  });
});

describe('PR kapısının GERÇEK durdurma adımı', () => {
  it('iş akışındaki adım sağlamdır', () => {
    const { durur, adimlar } = sunucuYasamDongusu(isAkisi);
    expect(durur).toBeGreaterThanOrEqual(0);
    const k = durdurmaKarari(adimlar[durur].komut);
    expect(k.kusurlar).toEqual([]);
  });

  it('iş akışının HİÇBİR adımı süreç adıyla öldürmez', () => {
    /* Sınıfın ikinci örneği başka bir adımda doğmasın diye küme geneli
       taranır — tek satır düzeltmek sınıfı kapatmaz. */
    const { adimlar } = sunucuYasamDongusu(isAkisi);
    const suclu = adimlar.filter((a) => /\b(pkill|killall)\b/.test(a.komut));
    expect(suclu.map((a) => a.ad)).toEqual([]);
  });

  it('durdurma adımı başlatma adımından SONRA gelir', () => {
    const { baslar, durur } = sunucuYasamDongusu(isAkisi);
    expect(baslar).toBeGreaterThanOrEqual(0);
    expect(durur).toBeGreaterThan(baslar);
  });
});

describe('yaşam döngüsü tespiti · sessiz düşüş yok', () => {
  it('BAŞLATAN var da DURDURAN tanınmıyorsa ATAR — sessiz -1 dönmez', () => {
    /* Doğuran kusur tam buydu: tanıma dizgesi bayatlayınca `findIndex`
       sessizce -1 döndü, çağıran durdurmayı hiç koşmadı ve sunucu ayakta
       kaldı. Sessiz düşüş, kusurun kendisinden daha pahalıydı. */
    const metin = [
      '    - name: Sunucuyu başlat',
      '      run: npx next start -p 3210',
      '    - name: Sunucuyu durdur',
      "      run: pkill -f 'next start' || true",
    ].join('\n');
    expect(() => sunucuYasamDongusu(metin)).toThrow(/durduran adım tanınamadı/);
  });

  it('durduran BAŞLATANDAN önce gelirse ATAR', () => {
    const metin = [
      '    - name: Sunucuyu durdur',
      '      run: fuser -k -n tcp 3210',
      '    - name: Sunucuyu başlat',
      '      run: npx next start -p 3210',
    ].join('\n');
    expect(() => sunucuYasamDongusu(metin)).toThrow(/ÖNCE geliyor/);
  });

  it('sunucu hiç başlatmayan bir iş akışında atmaz', () => {
    const metin = ['    - name: Lint', '      run: npm run lint'].join('\n');
    expect(sunucuYasamDongusu(metin).baslar).toBe(-1);
  });
});
