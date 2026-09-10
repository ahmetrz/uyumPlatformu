import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BOŞ DURUM CÜMLELERİNİN POLİTİKA İDDİALARI [SIS-BSD-002]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   R-G turunda on dokuz boş durum cümlesi "X yok" demekten çıkarılıp
   sebebini söyler hâle getirildi. Bunun BEKLENEN ve İSTENEN yan etkisi
   şu oldu: sebebi söyleyen bir cümle çoğu zaman bir POLİTİKA İDDİASI da
   taşır ("ürün onu kendiliğinden vermez", "hiçbir dış hesap kayıt
   göremez") ve R-F türeticisi beşini yakaladı.

   Altıncı diş burada kendi kuralını uyguladı: taban dalda olmayan yeni
   bir politika cümlesinin varsayılanı ÖLÇÜLÜ olmaktır. Bu dosya o beş
   iddianın ölçümüdür.

   Ölçümler ŞEMANIN KENDİSİNİ sürer: bir alanın NOT NULL olması, iddiayı
   veritabanı düzeyinde tutan şeydir ve uygulama katmanı atlansa bile
   ayakta kalır — deponun kendi kuralı (KVK-ENV-004'te ölçüldü).
   ═══════════════════════════════════════════════════════════════════════ */

const SEMA = readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

function model(ad: string): string {
  const m = new RegExp(`^model ${ad} \\{[\\s\\S]*?^\\}`, 'm').exec(SEMA);
  if (!m) throw new Error(`model yok: ${ad}`);
  return m[0];
}
/** Alan NOT NULL mı? (`?` taşımıyorsa zorunludur.) */
function zorunlu(modelAdi: string, alan: string): boolean {
  const s = new RegExp(`^\\s+${alan}\\s+(\\S+)`, 'm').exec(model(modelAdi));
  return s !== null && !s[1].endsWith('?');
}

describe('boş durum cümlelerinin iddiaları GERÇEKTEN tutuluyor [SIS-BSD-002]', () => {
  it('DENETİM açılmadan kanıt talebi kayda GEÇMEZ — şema düzeyinde [SIS-BSD-002]', () => {
    /* `/denetimler` boş durumu: "denetim açılmadan ikisi de kayda
       geçmez". İddiayı tutan şey uygulama kapısı değil, kolonun
       kendisidir: `denetimId` NOT NULL. */
    expect(zorunlu('KanitTalebi', 'denetimId'), 'kanıt talebi denetimsiz yazılabiliyor')
      .toBe(true);
    expect(model('KanitTalebi')).toMatch(/denetim\s+Denetim\s+@relation/);
  });

  it('İMHA bir İNSAN kararıdır — öneren ZORUNLU [SIS-BSD-002]', () => {
    /* `/saklama` boş durumu: "İmha bir insan kararıdır ve ürün onu
       kendiliğinden vermez". Ürünün kendiliğinden karar verebilmesi için
       öneren alanının boş bırakılabilir olması gerekirdi; değil. */
    expect(zorunlu('ImhaKarari', 'onerenId'), 'imha kararı önerensiz açılabiliyor')
      .toBe(true);
    /* Uygulama da kararı bir MOTORDAN almaz: motor defterinde imha yok. */
    const defter = readFileSync(path.join(process.cwd(), 'lib', 'motorlar', 'kayit.ts'), 'utf8');
    expect(defter, 'motor defterinde imha motoru var').not.toMatch(/imha/i);
  });

  it('YÖNETİM GÖZDEN GEÇİRMESİ motorla doğmaz — kayıt insan işidir [SIS-BSD-002]', () => {
    /* `/gozden-gecirme` boş durumu: "kayıt olmadan 'yönetim gördü'
       denemez". Ölçüsü: hiçbir motor bu tabloya yazmıyor. */
    const motorlar = path.join(process.cwd(), 'lib', 'motorlar');
    const yazanlar = readdirSync(motorlar)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /yonetimGozdenGecirme\s*\.\s*(create|update|upsert)/
        .test(readFileSync(path.join(motorlar, f), 'utf8')));
    expect(yazanlar, `yönetim gözden geçirmesine yazan motor: ${yazanlar.join(', ')}`)
      .toEqual([]);
  });

  it('DIŞ DENETÇİ erişimi TANIMSIZ olamaz — süre ve davet eden ZORUNLU [SIS-BSD-002]', () => {
    /* `/denetci-erisimi` boş durumu: "tanımlanmadan hiçbir dış hesap
       kayıt göremez". Erişim bir KAYITTIR ve o kaydın süresi ile davet
       edeni zorunludur: süresiz ya da sahipsiz bir dış erişim açılamaz. */
    expect(zorunlu('DenetciErisimi', 'bitis'), 'süresiz dış denetçi erişimi açılabiliyor')
      .toBe(true);
    expect(zorunlu('DenetciErisimi', 'davetEdenId'), 'davet edeni olmayan erişim açılabiliyor')
      .toBe(true);
    expect(zorunlu('DenetciErisimi', 'kullaniciId')).toBe(true);
  });

  it('DEĞİŞİKLİK ekranı YALNIZ kütüğü okur — başka kaynak karıştırmaz [SIS-BSD-002]', () => {
    /* `/operasyon` boş durumu: "yalnız kütüğe yazılan değişiklikler
       burada görünür". Ölçüsü ekranın SORGUSUDUR: değişiklik listesi tek
       modelden gelir. Karıştırılsaydı cümle yalan olurdu. */
    const sayfa = readFileSync(
      path.join(process.cwd(), 'app', '(kabuk)', '(operasyonel)', 'operasyon', 'page.tsx'), 'utf8');
    expect(sayfa).toMatch(/db\.degisiklik\.findMany/);
    /* Aynı ekran tesis ve olay da okur — ama DEĞİŞİKLİK listesi için
       ikinci bir kaynak yok. */
    const degisiklikKaynaklari = [...sayfa.matchAll(/db\.(\w*[Dd]egisiklik\w*)\./g)]
      .map((m) => m[1]);
    expect([...new Set(degisiklikKaynaklari)], 'değişiklik listesi birden çok kaynaktan geliyor')
      .toEqual(['degisiklik']);
  });
});
