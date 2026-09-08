/* `dizustu.mjs` ikinci ölçüsünün YÜRÜYÜŞÜ: "bu öğeyi hangi ata kırpıyor?"
   Karar sayfa bağlamında koşar (DOM ister), bu yüzden ayrı modüle
   taşınamaz — ikinci nüsha yaratmadan sınamanın yolu KAYNAĞI okumaktır.
   Test, aracın kendi kaynağından `kirpanAta`yı çıkarır ve sahte ata
   zincirleriyle koşturur; ölçüt tek yerde kalır.

   Neden var: bu yürüyüş bir kez YANLIŞ düzeltildi. "Kaydıran ataya
   rastlayınca dur" demek yetmiyor — `overflow-y: auto` yazan ama
   içeriğine kadar gerilmiş, dolayısıyla KAYMAYAN bir kap hiçbir şeyi
   kurtarmaz. O ayrımı yalnız `scrollHeight > clientHeight` verir. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const KAYNAK = readFileSync(path.resolve(__dirname, '../arac/dizustu.mjs'), 'utf8');

/** Aracın kaynağından `kirpanAta` gövdesini çıkarır (tek nüsha kalsın diye). */
function kirpanAtaKaynagi(): string {
  const bas = KAYNAK.indexOf('function kirpanAta(e) {');
  expect(bas, '`kirpanAta` dizustu.mjs içinde bulunamadı — ad değiştiyse test de değişmeli').toBeGreaterThan(-1);
  let derinlik = 0;
  for (let i = KAYNAK.indexOf('{', bas); i < KAYNAK.length; i++) {
    if (KAYNAK[i] === '{') derinlik++;
    else if (KAYNAK[i] === '}' && --derinlik === 0) return KAYNAK.slice(bas, i + 1);
  }
  throw new Error('`kirpanAta` gövdesi kapanmıyor');
}

type Ata = { ad: string; oy: string; sh: number; ch: number };

/** Zinciri çocuktan köke doğru kurar; son halkanın atası `body`dir. */
function kos(zincir: Ata[]) {
  const govde = { ad: 'body', parentElement: null } as Record<string, unknown>;
  let ust: Record<string, unknown> = govde;
  const dugumler: Record<string, unknown>[] = [];
  for (const a of [...zincir].reverse()) {
    ust = { ad: a.ad, parentElement: ust, scrollHeight: a.sh, clientHeight: a.ch, __oy: a.oy };
    dugumler.unshift(ust);
  }
  const cocuk = { ad: 'çocuk', parentElement: dugumler[0] ?? govde };
  const yap = new Function(
    'getComputedStyle', 'document',
    `${kirpanAtaKaynagi()}; return kirpanAta;`,
  )((e: Record<string, unknown>) => ({ overflowY: e.__oy }), { body: govde });
  const sonuc = yap(cocuk) as Record<string, unknown> | null;
  return sonuc === null ? null : (sonuc.ad as string);
}

describe('kirpanAta — kırpan atayı bulur, kaydıranı suçlamaz', () => {
  it('GERÇEKTEN kayan ata: içerik erişilebilir, kırpan ata yok', () => {
    expect(kos([
      { ad: 'panel', oy: 'auto', sh: 471, ch: 427 },
      { ad: 'alan', oy: 'hidden', sh: 427, ch: 427 },
    ])).toBeNull();
  });

  it('`auto` ama KAYMAYAN ata yürüyüşü durdurmaz — asıl kusur buydu', () => {
    /* Panel `overflow-y: auto` taşıyor ama içeriğine kadar gerilmiş:
       kaymıyor, dolayısıyla kurtarmıyor. Kırpan `alan` bildirilmeli. */
    expect(kos([
      { ad: 'panel', oy: 'auto', sh: 471, ch: 471 },
      { ad: 'alan', oy: 'hidden', sh: 427, ch: 427 },
    ])).toBe('alan');
  });

  it('`scroll` yazan ve kayan ata da durdurur', () => {
    expect(kos([
      { ad: 'panel', oy: 'scroll', sh: 500, ch: 400 },
      { ad: 'alan', oy: 'hidden', sh: 400, ch: 400 },
    ])).toBeNull();
  });

  it('doğrudan kırpan ata bildirilir', () => {
    expect(kos([{ ad: 'alan', oy: 'hidden', sh: 427, ch: 427 }])).toBe('alan');
  });

  it('`visible` ata şeffaftır — yürüyüş yukarı sürer', () => {
    expect(kos([
      { ad: 'sarmal', oy: 'visible', sh: 471, ch: 471 },
      { ad: 'alan', oy: 'hidden', sh: 427, ch: 427 },
    ])).toBe('alan');
  });

  it('kırpan ata yoksa null', () => {
    expect(kos([{ ad: 'sarmal', oy: 'visible', sh: 100, ch: 100 }])).toBeNull();
  });

  it('EN YAKIN karar kazanır: kayan panel, üstündeki hidden’ı gölgeler', () => {
    expect(kos([
      { ad: 'panel', oy: 'auto', sh: 471, ch: 427 },
      { ad: 'ara', oy: 'hidden', sh: 427, ch: 427 },
      { ad: 'kok', oy: 'hidden', sh: 427, ch: 427 },
    ])).toBeNull();
  });
});
