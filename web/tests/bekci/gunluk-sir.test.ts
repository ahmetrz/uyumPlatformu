import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { GIZLI, maskele, satir, sirAnahtari, SIR_ANAHTARLARI } from '@/lib/gunluk';

/* ═══════════════════════════════════════════════════════════════════════
   GÜNLÜKTE SIR YOK · ÇIPLAK console.* YOK [URN-KUR-010]

   İki ayrı kusur, tek bekçi:

   1. SIR SIZINTISI. Bir hata nesnesini olduğu gibi günlüğe basmak, içinde
      `parola`, `token`, `Authorization` ya da bağlantı dizesi taşıyan bir
      nesneyi diske ve toplayıcıya yazar. Kurulumda günlükler saklanır ve
      genelde uygulamadan DAHA UZUN yaşar.
   2. ÇIPLAK `console.*`. Serbest metin satırı toplayıcı tarafından
      ayrıştırılamaz; olay ARANAMAZ hâle gelir. Ürün kodu tek yerden
      (`lib/gunluk.ts`) yazar.

   Maskeleme AD tabanlıdır, değer tabanlı sezgi DEĞİL: "bu dize sır gibi
   duruyor" kuralı hem yanlış pozitif üretir hem gerçek sırrı kaçırır.
   ═══════════════════════════════════════════════════════════════════════ */

const WEB = process.cwd();

/** Ürün kodu: `lib/` · `app/` · `components/` ve kök `instrumentation.ts`.
    Araçlar (`arac/`) ve testler kapsam dışıdır — onlar bir insana konuşur,
    toplayıcıya değil.

    Kapsam `components/` ve `instrumentation.ts` ile büyütüldü (bağımsız
    inceleme bulgusu): ikisi de ürün kodudur, taranmıyorlardı ve
    `instrumentation.ts` gerçekten çıplak bir `console.error` taşıyordu —
    yani bekçi sınıfı kapatmıyordu, örneği kapatıyordu. */
function urunDosyalari(): string[] {
  const cikti = execFileSync('git', ['ls-files', 'lib', 'app', 'components', 'instrumentation.ts'],
    { cwd: WEB, encoding: 'utf8' });
  return cikti.split('\n').filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'));
}

/** İstemci bileşenleri tarayıcıda koşar: orada `console.error` tek yoldur. */
const istemci = (kaynak: string) => /^\s*['"]use client['"]/m.test(kaynak);

describe('ürün kodu yapısal günlük yazar [URN-KUR-010]', () => {
  it('sunucu kodunda çıplak console.* çağrısı yok [URN-KUR-010]', () => {
    const dosyalar = urunDosyalari();
    expect(dosyalar.length, 'ürün dosyası bulunamadı — tarama boş bakıyor').toBeGreaterThan(200);
    const suclu: string[] = [];
    for (const f of dosyalar) {
      if (f === 'lib/gunluk.ts') continue;                       // yazan modülün kendisi
      const kaynak = readFileSync(path.join(WEB, f), 'utf8');
      if (istemci(kaynak)) continue;
      kaynak.split('\n').forEach((satirMetni, i) => {
        if (/(^|[^.\w])console\.(log|error|warn|info|debug)\s*\(/.test(satirMetni)) suclu.push(`${f}:${i + 1}`);
      });
    }
    expect(suclu, 'çıplak console.* — `lib/gunluk.ts` üzerinden yazın').toEqual([]);
  });
});

describe('sır günlüğe girmez [URN-KUR-010]', () => {
  it('sır kokan anahtarın DEĞERİ yazılmaz, adı yazılır [URN-KUR-010]', () => {
    const s = satir('hata', 'deneme', {
      kullanici: 'ayse',
      parola: 'gizli-parola',
      Authorization: 'Bearer abc.def',
      ayarlar: { DATABASE_URL: 'postgresql://u:p@h/db', port: 5432 },
      liste: [{ apiKey: 'k-1' }, { ad: 'açık' }],
    });
    const metin = JSON.stringify(s);
    expect(metin).not.toContain('gizli-parola');
    expect(metin).not.toContain('Bearer abc.def');
    expect(metin).not.toContain('postgresql://u:p@h/db');
    expect(metin).not.toContain('k-1');
    /* Anahtarın KENDİSİ kalır: hangi alanın gizlendiği görünmezse operatör
       neyin eksik olduğunu bilemez. */
    expect(s.parola).toBe(GIZLI);
    expect(s.kullanici).toBe('ayse');
    expect((s.ayarlar as Record<string, unknown>).port).toBe(5432);
    expect((s.liste as Record<string, unknown>[])[1].ad).toBe('açık');
  });

  it('anahtar tanıma büyük/küçük harf ve ayraç duyarsızdır [URN-KUR-010]', () => {
    for (const a of ['parola', 'PAROLA', 'kullanici_parolasi', 'apiKey', 'API-KEY', 'x_token', 'Authorization', 'DATABASE_URL', 'oturumJetonu']) {
      expect(sirAnahtari(a), `sır sayılmadı: ${a}`).toBe(true);
    }
    for (const a of ['ad', 'kod', 'durum', 'tesisId', 'sayfa']) {
      expect(sirAnahtari(a), `yanlışlıkla sır sayıldı: ${a}`).toBe(false);
    }
    expect(SIR_ANAHTARLARI.length, 'sır anahtarı listesi boş').toBeGreaterThanOrEqual(10);
  });

  it('hata nesnesi yığın izi olmadan yazılır — iz iç yol sızdırır [URN-KUR-010]', () => {
    const e = new Error('bir şey oldu');
    const m = maskele({ hata: e }) as { hata: Record<string, unknown> };
    expect(m.hata).toEqual({ ad: 'Error', mesaj: 'bir şey oldu' });
    expect(JSON.stringify(m)).not.toContain('at ');
  });

  it('derin nesne sonsuza inmez [URN-KUR-010]', () => {
    let d: Record<string, unknown> = { son: 'deger' };
    for (let i = 0; i < 12; i += 1) d = { ic: d };
    expect(JSON.stringify(maskele(d))).toContain('[derin]');
  });
});
