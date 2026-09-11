import { describe, expect, it } from 'vitest';
import {
  katalogBoslugu, katalogBoslukCumlesi, type Reg, type Surum,
} from '@/app/(kabuk)/(operasyonel)/regulasyonlar/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   KATALOG BOŞLUĞUNUN SEBEBİ SÖYLENİR [REG-BOS-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası (10 Eylül 2026): TR-ENERJI paketi kuruldu, `/paketler`
   ekranı "8 çerçeve (3803 madde) kuruldu — çerçeve sürümleri TASLAK:
   aktifleştirme Regülasyonlar ekranında" dedi. Regülasyonlar ekranı
   açıldı ve sekiz çerçevenin sekizi için de şunu yazdı:

     KATALOG BOŞ · İLK KURULUM
     EPDK-SGYM-EK3 kataloğu henüz yüklenmedi.   [Katalog içe aktar]

   Veritabanında o anda EK3 için 578 madde vardı. Ürün kendi talimatını
   kendi yalanlıyor, müşteri yolu burada çıkmaza giriyor ve önerilen
   eylem ZATEN YÜKLÜ kataloğu ikinci kez yazmaya götürüyordu.

   ── NE DEĞİŞTİ, NE DEĞİŞMEDİ ──────────────────────────────────────────
   Maddeleri yalnız AKTİF sürümden saymak DOĞRUDUR ve değişmedi. Kusur
   sayımda değil, sayı sıfır çıkınca söylenen CÜMLEDEYDİ: "yüklenmedi"
   bir eksiği, "yüklendi ve kararınızı bekliyor" bir GÖREVİ anlatır.
   İkisini aynı cümleyle söylemek, bilineni bilinmeyen gibi göstermektir
   — "bilinmeyen ≠ sıfır" kuralının ters yüzü.
   ═══════════════════════════════════════════════════════════════════════ */

const surum = (ek: Partial<Surum> & { id: string }): Surum => ({
  etiket: 'RG-2025-11-25-33088', durum: 'taslak', maddeSayisi: 0,
  yururluk: null, farklar: [], ...ek,
});

const reg = (ek: Partial<Reg> = {}): Reg => ({
  id: 'r1', kod: 'EPDK-SGYM-EK3', ad: 'Ek-3', surum: null, aktif: true,
  surecSayisi: 0, maddeler: [], surumler: [], kaynaklar: [], ...ek,
} as Reg);

describe('katalog boşluğu · üç ayrı hâl [REG-BOS-001]', () => {
  it('DOLU katalogda boşluk YOKTUR — ayrım çağıranda değil burada [REG-BOS-001]', () => {
    const r = reg({ maddeler: [{ id: 'm1' }] as unknown as Reg['maddeler'] });
    expect(katalogBoslugu(r)).toBeNull();
  });

  it('HİÇ SÜRÜM YOKSA "henüz yüklenmedi" DOĞRUDUR [REG-BOS-001]', () => {
    /* Eski cümle bu hâlde doğruydu; kaldırılmadı, DARALTILDI. */
    const b = katalogBoslugu(reg());
    expect(b).toEqual({ hal: 'katalog_yok' });
    expect(katalogBoslukCumlesi(reg(), b!)).toMatch(/henüz yüklenmedi/);
  });

  it('TASLAKTA MADDE VARSA "yüklenmedi" DENMEZ — provanın kusuru [REG-BOS-001]', () => {
    /* Provanın gerçek hâli: aktif sürüm yok, taslakta 578 madde. */
    const r = reg({ surumler: [surum({ id: 's1', maddeSayisi: 578 })] });
    const b = katalogBoslugu(r);
    expect(b?.hal).toBe('taslakta_bekliyor');
    if (b?.hal !== 'taslakta_bekliyor') return;
    expect(b.madde).toBe(578);
    expect(b.surumId).toBe('s1');

    const c = katalogBoslukCumlesi(r, b);
    expect(c, 'yanlış cümle hâlâ kuruluyor').not.toMatch(/henüz yüklenmedi/);
    expect(c).toMatch(/YÜKLÜ/);
    expect(c).toMatch(/578 madde/);
    /* R-F: ekranın politika cümlesi. Bu ekran kendiliğinden yürürlüğe
       almaz ve bunu SÖYLER. */
    expect(c).toMatch(/insan kararıdır/);
    expect(c).toMatch(/kendiliğinden yürürlüğe almaz/);
  });

  it('BOŞ TASLAK maddeli taslakla karışmaz [REG-BOS-001]', () => {
    /* Açılmış ama içi doldurulmamış bir taslak, "kararınızı bekliyor"
       demez: karar verilecek bir şey yoktur. */
    const r = reg({ surumler: [surum({ id: 's1', maddeSayisi: 0 })] });
    expect(katalogBoslugu(r)).toEqual({ hal: 'surum_bos' });
    expect(katalogBoslukCumlesi(r, katalogBoslugu(r)!))
      .toMatch(/sürüm açılmış ama içinde madde yok/);
  });

  it('ÇOK TASLAK: toplam sayılır, hedef EN ÇOK maddeli olandır [REG-BOS-001]', () => {
    /* Kullanıcıyı boş ya da küçük bir taslağa göndermek yolu uzatırdı. */
    const r = reg({ surumler: [
      surum({ id: 'kucuk', maddeSayisi: 12 }),
      surum({ id: 'buyuk', maddeSayisi: 578, etiket: 'RG-2026' }),
      surum({ id: 'bos', maddeSayisi: 0 }),
    ] });
    const b = katalogBoslugu(r);
    expect(b?.hal).toBe('taslakta_bekliyor');
    if (b?.hal !== 'taslakta_bekliyor') return;
    expect(b.madde, 'dolu taslakların TOPLAMI').toBe(590);
    expect(b.surumId, 'hedef en çok maddeli taslak').toBe('buyuk');
    expect(b.etiket).toBe('RG-2026');
  });

  it('ARŞİV sürüm "bekliyor" saymaz ama "İÇİ BOŞ" da DEMEZ [REG-BOS-001]', () => {
    /* ── ÖLÇÜLEN KUSUR (bağımsız inceleme, PR #51 tur 1) ───────────────
       Arşiv sürüm doğru şekilde "bekliyor" sayılmıyordu — ama kalan dal
       her sürümü `surum_bos` yapıyordu ve ekran 400 MADDELİ bir arşiv
       için "sürüm açılmış ama içinde madde yok" diyordu. Cümle yanlıştı:
       boşluğun sebebi maddenin YOKLUĞU değil, sürümün DURUMUDUR. */
    const r = reg({ surumler: [surum({ id: 'a', durum: 'arsiv', maddeSayisi: 400, etiket: 'RG-2024' })] });
    const b = katalogBoslugu(r);
    expect(b?.hal).toBe('arsivde');
    if (b?.hal !== 'arsivde') return;
    expect(b.madde).toBe(400);
    expect(b.etiket).toBe('RG-2024');
    const c = katalogBoslukCumlesi(r, b);
    expect(c, 'arşivdeki maddeler "yok" sayıldı').not.toMatch(/içinde madde yok/);
    expect(c).toMatch(/400 madde/);
    expect(c).toMatch(/ARŞİVDE/);
    /* Aktifleştirme yine İNSAN KARARIDIR ve cümle bunu söyler. */
    expect(c).toMatch(/insan tarafından verilir/);
    /* ── CÜMLE İLE EYLEM BAĞI (R-F) ────────────────────────────────────
       Ekran bu hâlde `/ice-aktarim`a gönderir (`RegulasyonlarIstemci`
       `taslakta_bekliyor` dışındaki her hâlde o düğmeyi çizer). Cümle
       başka bir yol anlatırsa — ilk yazımda "yeni bir sürüm açılır"
       diyordu — kullanıcı söylenenle götürüldüğü yer arasında kalır.
       İddia ile onu uygulayan yolun ayrı ayrı doğru olması, aradaki
       BAĞI kurmuş saymaz. */
    expect(c, 'cümle, ekranın açtığı yolu (içe aktarım) SÖYLEMİYOR')
      .toMatch(/içe aktarım/i);
  });

  it('GERÇEKTEN BOŞ sürüm hâlâ "içi boş" der — arşiv dişi hâli yutmaz [REG-BOS-001]', () => {
    /* Sabotaj yüzeyi: arşiv dalı her sürümü yutarsa bu vaka kırmızı yanar. */
    const r = reg({ surumler: [surum({ id: 'a', durum: 'arsiv', maddeSayisi: 0 })] });
    expect(katalogBoslugu(r)).toEqual({ hal: 'surum_bos' });
    const b = katalogBoslugu(r)!;
    expect(katalogBoslukCumlesi(r, b)).toMatch(/içinde madde yok/);
  });

  it('AKTİF sürüm maddesizken taslak doluysa yine BEKLİYOR [REG-BOS-001]', () => {
    /* Aktif sürüm var ama boş (maddeleri henüz taşınmamış) ve taslak
       dolu: kullanıcının işi yine aktifleştirmedir. */
    const r = reg({ surumler: [
      surum({ id: 'aktif', durum: 'aktif', maddeSayisi: 0 }),
      surum({ id: 'taslak', maddeSayisi: 23 }),
    ] });
    const b = katalogBoslugu(r);
    expect(b?.hal).toBe('taslakta_bekliyor');
    if (b?.hal === 'taslakta_bekliyor') expect(b.surumId).toBe('taslak');
  });
});
