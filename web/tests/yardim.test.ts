import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  KISAYOLLAR, YARDIM_AC, yardimTusuMu, yazmaAlanindaMi,
} from '@/app/(kabuk)/(operasyonel)/yardim/mantik';
import {
  IKINCIL, SAYAC_TAVANI, UST_BAGLAR, alanSec, sayacEtiketi, sayacMetni, yogunlukSec,
} from '@/components/kabuk/yonler';

/* ═══════════════════════════════════════════════════════════════════════
   KABUK · SAYAÇ, ATLA BAĞI, YARDIM (D30 · E35)

   Kabukta yapılan hata ürünün hatasıdır: rozet yanlış sayarsa her ekranda
   yanlış sayar, `?` yazı alanında açılırsa her arama kutusunda açılır.
   Saf mantık burada dondurulur; DOM'a bağımlı olan (odak tuzağı, dialog
   rolü) kaynak METNİ üzerinden doğrulanır — vitest ortamı `node`.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Okunmamış bildirim rozeti · sayacMetni / sayacEtiketi', () => {
  it('sıfırda ve geçersiz sayıda rozet ÇİZİLMEZ (null)', () => {
    // "0" yazmak boş kutuyu bir uyarıymış gibi gösterirdi.
    expect(sayacMetni(0)).toBeNull();
    expect(sayacMetni(-3)).toBeNull();
    expect(sayacMetni(Number.NaN)).toBeNull();
    expect(sayacMetni(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('1..99 olduğu gibi, 100 ve üstü "99+" olarak kırpılır', () => {
    expect(sayacMetni(1)).toBe('1');
    expect(sayacMetni(99)).toBe('99');
    expect(sayacMetni(100)).toBe('99+');
    expect(sayacMetni(3000)).toBe('99+');
    expect(SAYAC_TAVANI).toBe(99);
  });

  it('ekran okuyucu etiketi kırpılmaz — gerçek sayı okunur', () => {
    expect(sayacEtiketi(3)).toBe('3 okunmamış bildirim');
    expect(sayacEtiketi(300)).toBe('300 okunmamış bildirim');
    // Kesirli/negatif değer gelirse etiket saçmalamaz.
    expect(sayacEtiketi(-1)).toBe('0 okunmamış bildirim');
  });
});

describe('Yardım katmanı · tetikleme kuralı', () => {
  it('`?` karakteri katmanı açar; Ctrl/⌘/Alt ile basılınca açmaz', () => {
    // Karar KARAKTERE göre: TR-Q'da `?` Shift+_ ile gelir, `/` ile değil.
    expect(yardimTusuMu({ key: '?' })).toBe(true);
    expect(yardimTusuMu({ key: '/' })).toBe(false);
    expect(yardimTusuMu({ key: '?', ctrlKey: true })).toBe(false);
    expect(yardimTusuMu({ key: '?', metaKey: true })).toBe(false);
    expect(yardimTusuMu({ key: '?', altKey: true })).toBe(false);
  });

  it('yazı alanında TETİKLENMEZ: input/textarea/select/contentEditable [YRD-SOR-002]', () => {
    expect(yazmaAlanindaMi({ tagName: 'INPUT' })).toBe(true);
    expect(yazmaAlanindaMi({ tagName: 'input', type: 'search' })).toBe(true);
    expect(yazmaAlanindaMi({ tagName: 'TEXTAREA' })).toBe(true);
    expect(yazmaAlanindaMi({ tagName: 'SELECT' })).toBe(true);
    expect(yazmaAlanindaMi({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('yazı almayan öğelerde tetiklenir: düğme, onay kutusu, bağ, gövde', () => {
    expect(yazmaAlanindaMi({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(yazmaAlanindaMi({ tagName: 'INPUT', type: 'button' })).toBe(false);
    expect(yazmaAlanindaMi({ tagName: 'BUTTON' })).toBe(false);
    expect(yazmaAlanindaMi({ tagName: 'A' })).toBe(false);
    expect(yazmaAlanindaMi({ tagName: 'BODY' })).toBe(false);
    expect(yazmaAlanindaMi(null)).toBe(false);
    expect(yazmaAlanindaMi(undefined)).toBe(false);
  });

  it('pencere olayı KomutPaleti kalıbıyla aynı biçimde adlanır', () => {
    expect(YARDIM_AC).toBe('yardim:ac');
  });
});

describe('Kısayol listesi · yalnız gerçekten bağlı tuşlar', () => {
  it('her kısayol tek bir kez listelenir ve boş tuş yoktur', () => {
    const anahtarlar = KISAYOLLAR.map((k) => k.tuslar.join('+'));
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    for (const k of KISAYOLLAR) {
      expect(k.tuslar.length).toBeGreaterThan(0);
      expect(k.yapar.trim().length).toBeGreaterThan(0);
    }
  });

  it('listedeki genel kısayolların her biri kaynakta bağlıdır [YRD-SOR-001]', () => {
    /* Belgenin yapabileceği en kötü şey var olmayan bir tuşu öğretmektir:
       liste, dinleyicisi olan kaynak dosyalarla çapraz doğrulanır. */
    const palet = readFileSync('components/KomutPaleti.tsx', 'utf8');
    const yardim = readFileSync('components/YardimKatmani.tsx', 'utf8');
    const kabuk = readFileSync('components/kabuk/Kabuk.tsx', 'utf8');
    const tuslar = new Set(KISAYOLLAR.map((k) => k.tuslar.join('+')));
    expect(tuslar.has('Ctrl+K')).toBe(true);
    expect(palet).toContain("e.key.toLowerCase() === 'k'");
    expect(tuslar.has('?')).toBe(true);
    expect(yardim).toContain('yardimTusuMu(e)');
    expect(tuslar.has('Esc')).toBe(true);
    expect(palet).toContain("e.key === 'Escape'");
    expect(yardim).toContain("e.key === 'Escape'");
    expect(tuslar.has('Tab')).toBe(true);
    expect(kabuk).toContain('href="#icerik"');
    expect(tuslar.has('↑+↓')).toBe(true);
    expect(palet).toContain("e.key === 'ArrowDown'");
    // `/` süzgeç odağı hiçbir ekranda bağlı değil — listede de OLMAMALI.
    expect(tuslar.has('/')).toBe(false);
  });
});

describe('Yardım katmanı · erişilebilirlik sözleşmesi (kaynak metni)', () => {
  const yardim = readFileSync('components/YardimKatmani.tsx', 'utf8');
  it('dialog rolü, modal, başlık bağı ve odak tuzağı var [SIS-ERS-001]', () => {
    expect(yardim).toContain('role="dialog"');
    expect(yardim).toContain('aria-modal="true"');
    expect(yardim).toContain('aria-labelledby="yardim-katman-baslik"');
    expect(yardim).toContain('id="yardim-katman-baslik"');
    expect(yardim).toContain("e.key !== 'Tab'"); // tuzak dinleyicisi
  });
  it('Ctrl/⌘+K ve "Ara" olayı bu katmanı KAPATIR — iki katman üst üste binmez', () => {
    expect(yardim).toContain("e.key.toLowerCase() === 'k') setAcik(false)");
    expect(yardim).toContain('addEventListener(ARAMA_AC, kapat)');
  });
});

describe('Atla bağı + tek main', () => {
  const kabuk = readFileSync('components/kabuk/Kabuk.tsx', 'utf8');
  it('atla bağı kabuğun ilk çocuğu; tek kabukta TEK `#icerik` sarmalayıcısı var, kabuk main AÇMAZ [SIS-KBK-001]', () => {
    // Bağ, üst çubuktan ÖNCE gelmeli ki ilk Tab onu bulsun.
    const bag = kabuk.indexOf('href="#icerik"');
    const ust = kabuk.indexOf('<header className="ab-ust"');
    expect(bag).toBeGreaterThan(-1);
    expect(ust).toBeGreaterThan(-1);
    expect(bag).toBeLessThan(ust);
    // Yorum satırlarındaki `<main` sayılmaz: yalnız JSX satırı (satır başı).
    expect(kabuk.match(/^\s*<div id="icerik" tabIndex=\{-1\}/gm)?.length).toBe(1);
    // Kabuk HİÇ main taşımaz: ekranlar kendi main'ini çizer; kabukta bir
    // main daha olsa her belgede iki ana bölge olurdu (iç içe main).
    expect(kabuk.match(/^\s*<main\b/gm)).toBeNull();
  });
  it('/yardim ekranı kendi main\'ini çizer ve oturum kapısı taşır', () => {
    const sayfa = readFileSync('app/(kabuk)/(operasyonel)/yardim/page.tsx', 'utf8');
    expect(sayfa.match(/^\s*<main\b/gm)?.length).toBe(1); // yorumdaki anma sayılmaz
    expect(sayfa).toContain('await girisZorunlu();');
    // Salt sunum: veri katmanına dokunmaz (oturum kapısı veri okuması değildir).
    expect(sayfa).not.toMatch(/@\/lib\/db|prisma/);
  });
});

describe('Gezinme kayıtları · /kanitlar, /ayarlar, /yardim', () => {
  it('/kanitlar Uyum alanına düşer ve ikincil sıranın üçüncü (kayıt) grubunda durur', () => {
    expect(alanSec('/kanitlar')).toBe('/uyum');
    expect(alanSec('/kanitlar/abc')).toBe('/uyum');
    const kayit = IKINCIL['/uyum'][2];
    expect(kayit.ogeler).toContainEqual({ ad: 'Kanıt', yol: '/kanitlar' });
  });

  it('/ayarlar ve /yardim alansız yardımcı rotadır (operasyonel yoğunluk) ve ÜST ÇUBUK bağıdır', () => {
    expect(alanSec('/ayarlar')).toBeNull();
    expect(alanSec('/yardim')).toBeNull();
    expect(yogunlukSec('/ayarlar')).toBe('operasyonel');
    expect(yogunlukSec('/')).toBe('amiral');
    expect(UST_BAGLAR.map((o) => o.yol)).toEqual(['/ayarlar', '/yardim']);
  });

  it('her ikincil öğe bir alana bağlıdır ve Risk kendi alanıdır', () => {
    for (const [alan, gruplar] of Object.entries(IKINCIL)) {
      for (const g of gruplar) for (const o of g.ogeler) {
        // /bulgular Risk altında da listelenir ama rota sahibi Uyum'dur.
        const beklenen = alan === '/riskler' && o.yol === '/bulgular' ? '/uyum' : alan;
        expect(alanSec(o.yol)).toBe(beklenen);
      }
    }
    expect(alanSec('/riskler/x')).toBe('/riskler');
    expect(alanSec('/tesisler/abc')).toBe('/');
    expect(alanSec('/harita')).toBe('/portfoy');
  });

  it('üç rota da rota envanterinde (arac/rotalar.json) kayıtlı', () => {
    const rotalar: string[] = JSON.parse(readFileSync('arac/rotalar.json', 'utf8'));
    for (const r of ['/kanitlar', '/ayarlar', '/yardim']) expect(rotalar).toContain(r);
    // Liste sıralı tutulur; araçlar ikili arama yapmaz ama okunurluk
    // için düzen korunur.
    expect([...rotalar].sort()).toEqual(rotalar);
  });
});
