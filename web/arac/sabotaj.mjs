#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   SABOTAJ — testin gerçekten ölçüp ölçmediğini ölçer

   Geçen bir test iki şeyden biri olabilir: kuralın çalıştığının kanıtı
   ya da hiçbir şey ölçmeyen bir süs. İkisini ayıran tek yol kuralı
   BOZUP testin kırılıp kırılmadığına bakmaktır.

   Her sabotaj için:
     1. hedef dosyanın SHA-256 özeti alınır,
     2. kural bozulur,
     3. ilgili testler koşturulur — KIRMIZI olmaları BEKLENİR,
     4. dosya geri yüklenir,
     5. özet yeniden alınır ve BİREBİR aynı olduğu doğrulanır.

   Beşinci adım pazarlık konusu değildir: sabotajdan sonra kaynakta tek
   bayt fark kalırsa araç kendi kendine bir kusur bırakmış olur.

   Kullanım: node arac/sabotaj.mjs [--json]
   ═══════════════════════════════════════════════════════════════════════ */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KOK = process.cwd();
const ozet = (metin) => createHash('sha256').update(metin).digest('hex');

/* Sabotaj kütüğü. Her satır bir İŞ KURALINI bozar; `ara` metni kaynakta
   birebir bir kez geçmelidir — geçmiyorsa kural taşınmış demektir ve
   araç bunu sessizce atlamak yerine kusur sayar. */
const SABOTAJLAR = [
  {
    ad: 'RBAC kapısı kaldırıldı',
    kural: 'Yetkisiz kullanıcı yazma yapamaz',
    dosya: 'lib/erisim.ts',
    ara: `  if (!izinVar(k, modul, islem, kapsam))
    throw new Error(\`Bu işlem için yetkiniz yok (\${modul}/\${islem})\`);`,
    yaz: '  // SABOTAJ: yetki kapısı kaldırıldı',
    testler: ['tests/yetki-kapisi.test.ts', 'tests/erisim.test.ts'],
  },
  {
    ad: 'Kapsam kapısı kaldırıldı',
    kural: 'Kullanıcı başka santralin kaydına yazamaz',
    dosya: 'lib/erisim.ts',
    ara: '  if (!izinVar(k, modul, islem, soru)) throw new Error(mesaj);',
    yaz: '  // SABOTAJ: kapsam kapısı kaldırıldı',
    testler: ['tests/kapsam-kapisi.test.ts', 'tests/envanter-eylem.test.ts'],
  },
  {
    ad: 'Dört göz kuralı kaldırıldı',
    kural: 'Aksiyonun sorumlusu kendi aksiyonunu doğrulayamaz',
    dosya: 'lib/eylemler.ts',
    ara: `    if (eski.sorumluId === k.id)
      return { ok: false, hata: 'Görev ayrılığı: aksiyonun sorumlusu kendi aksiyonunu doğrulayamaz' };`,
    yaz: '    // SABOTAJ: görev ayrılığı kaldırıldı',
    testler: ['tests/capa-dogrulama.test.ts'],
  },
  {
    ad: 'Zimmet kimlik kapısı kaldırıldı',
    kural: 'Bir zimmeti yalnız zimmetlenen kişi cevaplayabilir',
    dosya: 'lib/varlik/zimmet.ts',
    ara: '  if (o.cevaplayanId !== o.atananId) {',
    yaz: '  if (false) {',
    testler: ['tests/zimmet.test.ts', 'tests/zimmet-eylem.test.ts'],
  },
  {
    ad: 'Zimmet süre kontrolü kaldırıldı',
    kural: 'Süresi geçmiş talep cevaplanamaz',
    dosya: 'lib/varlik/zimmet.ts',
    ara: '  if (o.simdi > o.sonTarih) {',
    yaz: '  if (false) {',
    testler: ['tests/zimmet.test.ts'],
  },
  {
    ad: 'Red gerekçesi zorunluluğu kaldırıldı',
    kural: 'Gerekçesiz red kabul edilmez',
    dosya: 'lib/varlik/zimmet.ts',
    ara: '  if (!o.kabul && !o.cevapNotu?.trim()) {',
    yaz: '  if (false) {',
    testler: ['tests/zimmet.test.ts', 'tests/zimmet-eylem.test.ts'],
  },
  {
    ad: 'Denetim izi yazımı kaldırıldı',
    kural: 'Her yazma eylemi denetim izine düşer',
    dosya: 'lib/eylemler2/ortak.ts',
    ara: `  await istemci.aktiviteKaydi.create({ data: {`,
    yaz: `  if (Boolean(veri)) return; // SABOTAJ: iz yazımı kaldırıldı
  await istemci.aktiviteKaydi.create({ data: {`,
    testler: ['tests/envanter-eylem.test.ts', 'tests/zimmet-eylem.test.ts'],
  },
  {
    ad: 'Bilinmeyen sağlıklıya çevrildi',
    kural: 'Ölçülmemiş değer sağlıklı sayılmaz',
    dosya: 'lib/varlik/canliDurus.ts',
    ara: `  bayat: 'md',`,
    yaz: `  bayat: 'ok',`,
    testler: ['tests/canli-durus.test.ts'],
  },
  {
    ad: 'Bağlı olmayan kaynak CANLI sayıldı',
    kural: '"Canlı" yalnız bağlı kaynakta yazılır',
    dosya: 'lib/varlik/canliDurus.ts',
    ara: "  if (!o.bagli) return { durum: 'kaynak_yok', yasDk: null, canliEsikDk: null };",
    yaz: "  if (!o.bagli) return { durum: 'canli', yasDk: 0, canliEsikDk: null };",
    testler: ['tests/canli-durus.test.ts'],
  },
  {
    ad: 'Bayat paket kontrolü kaldırıldı',
    kural: 'Eski ölçüm yeniyi ezmez',
    dosya: 'lib/api/uclar/durusGozlemleri.ts',
    ara: `          if (onceki?.kaynakZamani && g.kaynakZamani
            && g.kaynakZamani.getTime() < onceki.kaynakZamani.getTime()) {`,
    yaz: '          if (false) {',
    testler: ['tests/api.test.ts'],
  },
  {
    ad: 'Yinelenen talep kontrolü kaldırıldı',
    kural: 'Bir varlık için tek aktif zimmet talebi olur',
    dosya: 'lib/varlik/zimmet.ts',
    ara: '  if (o.acikTalepVar) {',
    yaz: '  if (false) {',
    testler: ['tests/zimmet.test.ts'],
  },
  {
    ad: 'IP tek başına eşleşme kurar hâle getirildi',
    kural: 'IP tek başına kimlik değildir',
    dosya: 'lib/entegrasyon/kesif.ts',
    ara: "export const TEK_BASINA_ESLESMEZ: readonly AnahtarAlani[] = ['ip', 'uretici_model'];",
    yaz: "export const TEK_BASINA_ESLESMEZ: readonly AnahtarAlani[] = [];",
    testler: ['tests/kesif.test.ts', 'tests/pasif-kesif.test.ts'],
  },
  {
    ad: 'Aktif tarama yeteneği kütüğe eklendi',
    kural: 'Ürün OT ağına aktif paket atmaz',
    dosya: 'lib/entegrasyon/sozlesme.ts',
    ara: "  'access_observation', 'topology', 'passive_asset_discovery',",
    yaz: "  'access_observation', 'topology', 'passive_asset_discovery', 'port_scan',",
    testler: ['tests/adaptor-yetenekleri.test.ts'],
  },
  {
    ad: 'Bulgu gecikmesi sıfıra çevrildi',
    kural: 'Hedefi olmayan bulgunun gecikmesi ölçülemez',
    dosya: 'app/(kabuk)/(operasyonel)/bulgular/mantik.ts',
    ara: "  if (!b.hedef || !acikMi(b.durum)) return null;\n  const fark = bugunAn()",
    yaz: "  if (!b.hedef || !acikMi(b.durum)) return 0;\n  const fark = bugunAn()",
    testler: ['tests/senaryo-uyum.test.ts'],
  },
  {
    ad: 'Formül kalkanı kaldırıldı',
    kural: 'Dışa aktarılan dosyada formül çalışmaz',
    dosya: 'lib/disaAktarim/csv.ts',
    ara: '  if (!TEHLIKELI_BAS.includes(m[0]!)) return m;',
    yaz: '  return m;',
    testler: ['tests/disa-aktarim-csv.test.ts'],
  },
  {
    ad: 'Bilinmeyen uyum paydasına katıldı',
    kural: 'Değerlendirilmemiş madde yüzdenin paydasına girmez',
    dosya: 'lib/sabitler.ts',
    ara: '    yuzde: degerlendirilen === 0 ? null : Math.round(((u + k * 0.5) / degerlendirilen) * 100),',
    yaz: '    yuzde: kapsam === 0 ? 0 : Math.round(((u + k * 0.5) / kapsam) * 100),',
    testler: ['tests/semantik.test.ts', 'tests/uyum-grubu-mantik.test.ts'],
  },
  /* ── UX kapıları (FAZ F–M) ────────────────────────────────────────
     Dördü de denetimde ÖLÇÜLEN bir kusuru donduran kurallardır. Bir
     kural "artık gerekmiyor" diye kaldırılırsa testin bunu görmesi
     gerekir; görmezse kural bir yorumdan ibarettir. */
  {
    ad: 'Gezinme sırası yeniden gizli kaydırmaya döndü',
    kural: 'Geniş ekranda gezinme sırası sarar, kırpmaz',
    dosya: 'app/kabuk.css',
    ara: `.ab-ikincil {
  display: flex; align-items: stretch; flex-wrap: wrap;
  min-height: 36px; padding: 0 12px;`,
    yaz: `.ab-ikincil {
  display: flex; align-items: stretch; height: 36px;
  overflow-x: auto; scrollbar-width: none; padding: 0 12px;`,
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Dar bantta sıra artık katlanmıyor',
    kural: 'Üçten çok bağ taşıyan ikincil sıra dar bantta katlanır',
    dosya: 'components/kabuk/yonler.ts',
    ara: 'export const DAR_BANT_BAG_TAVANI = 4;',
    yaz: 'export const DAR_BANT_BAG_TAVANI = 500;',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Katlama eşiği gerçek bir sıranın tam üstüne çekildi',
    kural: 'Eşik hiçbir sıranın tam üstünde durmaz — bir bağ eklenince davranış sessizce değişmez',
    dosya: 'components/kabuk/yonler.ts',
    ara: 'export const DAR_BANT_BAG_TAVANI = 4;',
    yaz: 'export const DAR_BANT_BAG_TAVANI = 2;',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Aktif bölüm grubunu değil ilk grubu döndürüyor',
    kural: 'Bölüm seçici düğmesi BULUNULAN grubu yazar',
    dosya: 'components/kabuk/yonler.ts',
    ara: `  for (const grup of gruplar) {
    const oge = grup.ogeler.find((o) => ogeAktif(o, patika));
    if (oge) return { grup, oge };
  }
  return null;`,
    yaz: `  for (const grup of gruplar) {
    const oge = grup.ogeler.find((o) => ogeAktif(o, patika));
    if (oge) return { grup: gruplar[0], oge };
  }
  return null;`,
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Katlanan sıranın grupları dar bantta yeniden görünüyor',
    kural: 'Katlanan sıra dar bantta gizlenir; iki yüzey birden çizilmez',
    dosya: 'app/kabuk.css',
    ara: '  .ab-ikincil[data-katlanir] > .grup { display: none; }',
    yaz: '  .ab-ikincil[data-katlanir] > .grup { display: flex; }',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Bölüm seçici geniş ekranda da çiziliyor',
    kural: 'Seçici YALNIZ dar bantta görünür',
    dosya: 'app/kabuk.css',
    ara: '.ab-bolum { display: none; }',
    yaz: '.ab-bolum { display: flex; }',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Üçüncül sıra yine sıfırdan açılıyor',
    kural: 'Aktif alt ekran sıranın görünür penceresinde açılır',
    dosya: 'components/kabuk/Kabuk.tsx',
    ara: '    if (sol < sira.scrollLeft) sira.scrollLeft = Math.max(0, sol - 20);',
    yaz: '    if (false) sira.scrollLeft = Math.max(0, sol - 20);',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Üçüncül sıra sayfanın kendisini kaydırıyor',
    kural: 'Sıra KENDİ kutusunda kayar, sayfayı itmez',
    dosya: 'components/kabuk/Kabuk.tsx',
    ara: `    if (sol < sira.scrollLeft) sira.scrollLeft = Math.max(0, sol - 20);
    else if (sag > sira.scrollLeft + sira.clientWidth) {
      sira.scrollLeft = sag - sira.clientWidth + 20;
    }`,
    yaz: '    aktif.scrollIntoView({ inline: \'center\' });',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: '"+N diğer" bağı yine eşiğin altına indi',
    kural: 'Bağ kutusu WCAG 2.2 AA 24px eşiğinin altına inmez',
    dosya: 'app/kabuk.css',
    ara: '  display: block; box-sizing: border-box; height: 24px; line-height: 16px; padding-top: 4px;',
    yaz: '  display: block; box-sizing: border-box; height: 20px; line-height: 16px; padding-top: 4px;',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Bütçe sabiti CSS’ten ayrıştı',
    kural: 'Satır yüksekliği iki kaynakta AYNI sayıyı taşır',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: 'const KALAN_SATIR_PX = 24;',
    yaz: 'const KALAN_SATIR_PX = 20;',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Axe kapısı WCAG 2.2 etiketini bıraktı',
    kural: 'Ürünün beyan ettiği dokunma hedefi eşiği ÖLÇÜLÜR',
    dosya: 'arac/erisim-axe.mjs',
    ara: "const ETIKETLER = ['wcag2a', 'wcag2aa', 'wcag22aa'];",
    yaz: "const ETIKETLER = ['wcag2a', 'wcag2aa'];",
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  /* ── Odak ve hiyerarşi turu (15 Eyl 2026) ────────────────────────
     Kullanıcı geri bildirimiyle ölçülen kusur: "her tarafta metin,
     nereye odaklanacağımı anlamıyorum". Aşağıdaki her sabotaj, ekranı
     ESKİ hâline döndüren tek bir değişikliktir; kırmızı yakmıyorsa test
     kararı sabitlememiş demektir. */
  {
    ad: 'Uyum üçüncül sırasından bir rota düştü',
    kural: 'Yeniden gruplama ulaşım yolunu değiştirir, kapsamı değil — on dokuz rota on dokuz kalır',
    dosya: 'components/kabuk/yonler.ts',
    ara: "        { ad: 'Eğitim kütüğü', yol: '/egitimler' },",
    yaz: '        // SABOTAJ: rota sıradan düştü',
    testler: ['tests/uyum-odak.test.ts'],
  },
  {
    ad: 'Ekran başlığı yeniden BÜYÜK HARF',
    kural: 'Başlık cümle düzenindedir; 74 büyük harfli etiketten ayrı sesle konuşur',
    dosya: 'app/kabuk.css',
    ara: `.ab-lede h1 {
  margin: 0; font-family: var(--gorunum); font-weight: 500;`,
    yaz: `.ab-lede h1 {
  margin: 0; font-family: var(--gorunum); font-weight: 500; text-transform: uppercase;`,
    testler: ['tests/uyum-odak.test.ts'],
  },
  {
    ad: 'Matris yeniden kod sırasında açılıyor',
    kural: 'Varsayılan sıra ÖNEMDİR: uygunsuz satır kalabalığın içinden çıkar',
    dosya: 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx',
    ara: "  const [sira, setSira] = useState<'onem' | 'kod'>('onem');",
    yaz: "  const [sira, setSira] = useState<'onem' | 'kod'>('kod');",
    testler: ['tests/uyum-odak.test.ts'],
  },
  {
    ad: 'Okuma anahtarı yeniden hep açık',
    kural: 'Lejant varsayılan kapalıdır; her açılışta dört durum çizerek dikkat çalmaz',
    dosya: 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx',
    ara: '        <details className="bolum anahtar-kutu">',
    yaz: '        <details className="bolum anahtar-kutu" open>',
    testler: ['tests/uyum-odak.test.ts'],
  },
  {
    ad: 'Eğilim şeridi matrisin altından kaldırıldı',
    kural: 'Matris ekranın ilk gövdesidir; eğilim ondan SONRA gelir ve silinmez',
    dosya: 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx',
    ara: '        <EgilimSeridi noktalar={egilim} surecVar={surecId !== null} bugun={m.endeks} />',
    yaz: '        {/* SABOTAJ: şerit kaldırıldı */}',
    testler: ['tests/uyum-odak.test.ts'],
  },
  {
    ad: 'Tekdüze kapsam kolonu yeniden çiziliyor',
    kural: 'Bir şey söylemeyen kolon çizilmez; ölçüt veriden gelir',
    dosya: 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx',
    ara: '  const kapsamTekduze = satirlar.every((s) => s.kapsamda === tesisler.length);',
    yaz: '  const kapsamTekduze = false;',
    testler: ['tests/uyum-odak.test.ts'],
  },
  {
    ad: 'Kusurun doğduğu bağ tarayıcı kapısından düştü',
    kural: '`/egitimler` katlanan sıradan üçüncül sıraya taşındı, ölçümden DÜŞMEDİ',
    dosya: 'arac/gezinme-testi.mjs',
    ara: "const UCUNCUL_ROTALARI = ['/tedarikciler', '/esleme', '/envanter', '/egitimler'];",
    yaz: "const UCUNCUL_ROTALARI = ['/tedarikciler', '/esleme', '/envanter'];",
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  /* ── Odak turu · yayma (15 Eyl 2026) ─────────────────────────────
     Büyük harf yapısal kaşa aittir; veri, ad, başlık, cümle cümle
     düzenindedir. Her sabotaj ölçülen kusurun ESKİ hâlini geri getirir. */
  {
    ad: 'Tesis kartının adı yeniden BÜYÜK HARF',
    kural: '13px ve üstü büyük harf yalnız gezinme ve koddur; tesis adı veridir',
    dosya: 'app/kabuk.css',
    ara: `  /* cümle düzeni — tesis adı veridir, kaş değil (SIS-KBK-031) */
  font-family: var(--gorunum); font-size: var(--t-bolum); line-height: var(--lh-manset);`,
    yaz: `  /* cümle düzeni — tesis adı veridir, kaş değil (SIS-KBK-031) */
  font-family: var(--gorunum); font-size: var(--t-bolum); line-height: var(--lh-manset); text-transform: uppercase;`,
    testler: ['tests/bekci/buyuk-harf.test.ts', 'tests/odak-yayma.test.ts'],
  },
  {
    ad: 'Portföy kimlik başlığı yeniden BÜYÜK HARF',
    kural: 'h2 başlığı hiçbir boyda büyük harf olmaz',
    dosya: 'app/kabuk.css',
    ara: `  margin: 12px 0 0; font-family: var(--gorunum); font-weight: 600;
  font-size: var(--t-manset); line-height: var(--lh-manset);
}`,
    yaz: `  margin: 12px 0 0; font-family: var(--gorunum); font-weight: 600;
  font-size: var(--t-manset); line-height: var(--lh-manset); text-transform: uppercase;
}`,
    testler: ['tests/bekci/buyuk-harf.test.ts'],
  },
  {
    ad: 'Bir kaş kuralı büyük harfi bıraktı — tarama daha az şey görüyor',
    kural: 'Büyük harf kuralı sayısı ölçüm tabanının altına sessizce inemez',
    dosya: 'app/kabuk.css',
    ara: `  font-family: var(--veri); font-size: var(--t-veri); letter-spacing: var(--tr-etiket);
  text-transform: uppercase; text-decoration: none;
}
.ab-atla:focus, .ab-atla:focus-visible {`,
    yaz: `  font-family: var(--veri); font-size: var(--t-veri); letter-spacing: .1em;
  text-decoration: none;
}
.ab-atla:focus, .ab-atla:focus-visible {`,
    testler: ['tests/bekci/buyuk-harf.test.ts'],
  },
  {
    ad: 'Portföy yeniden kapasite sırasıyla açılıyor',
    kural: 'Portföy en zayıftan açılır; ilk açılışta cevap vardır',
    dosya: 'app/(tam)/portfoy/Portfoy.tsx',
    ara: "  const [anahtar, setAnahtar] = useState<SiralamaAnahtari>('uyum');",
    yaz: "  const [anahtar, setAnahtar] = useState<SiralamaAnahtari>('guc');",
    testler: ['tests/odak-yayma.test.ts'],
  },
  {
    ad: 'Portföy paneli yeniden sırasız listenin ilkini gösteriyor',
    kural: 'Kimlik paneli sıralı listenin ilkini (en zayıfı) gösterir',
    dosya: 'app/(tam)/portfoy/Portfoy.tsx',
    ara: '  const [seciliId, setSeciliId] = useState<string | null>(null);',
    yaz: '  const [seciliId, setSeciliId] = useState<string | null>(satirlar[0]?.id ?? null);',
    testler: ['tests/odak-yayma.test.ts'],
  },
  {
    ad: 'Tesis adı JS ile yeniden büyük harfe çevriliyor',
    kural: 'Tesis dosyası başlığı cümle düzenindedir — CSS de JS de büyük harf yapmaz',
    dosya: 'app/(kabuk)/(flagship)/tesisler/[id]/Tesis360.tsx',
    ara: `          <h1>
            {ilkKelime}`,
    yaz: `          <h1>
            {ilkKelime.toLocaleUpperCase('tr-TR')}`,
    testler: ['tests/odak-yayma.test.ts'],
  },
  {
    ad: 'Uyum altbilgisi yeniden kaş etiketi',
    kural: 'Cümle ve sayı taşıyan satır dip nottur, kaş değil',
    dosya: 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx',
    ara: '        <p className="ab-dip satir" style={{ marginTop: 26 }}>',
    yaz: '        <p className="etiket" style={{ marginTop: 26, display: \'flex\', gap: 24, flexWrap: \'wrap\' }}>',
    testler: ['tests/odak-yayma.test.ts'],
  },
  {
    ad: 'Kapsam kolonunda istisna yine ayırt edilemiyor',
    kural: 'Eksik kapsamlı satır tam kapsamlıdan ayrılır',
    dosya: 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx',
    ara: "className={`mono kapsam${s.kapsamda < tesisler.length ? ' eksik' : ''}`}",
    yaz: 'className="mono kapsam"',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Eksik kapsam vurgusu temel kuralla aynı renge çekildi',
    kural: 'İki hâl GERÇEKTEN ayrılır; aynı rengi yazan ayrım ayrım değildir',
    dosya: 'app/kabuk.css',
    ara: '.ab-mtx .satir .kapsam.eksik { color: var(--murekkep); font-weight: 600; }',
    yaz: '.ab-mtx .satir .kapsam.eksik { color: var(--i3); font-weight: 600; }',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Harita vuruş alanı yine kullanıcı biriminde',
    kural: 'İşaretin vuruş alanı ekranda 24 CSS pikselidir',
    dosya: 'app/(tam)/harita/HaritaIstemci.tsx',
    ara: '  const vurusR = 12 * olcek;',
    yaz: '  const vurusR = 11;',
    testler: ['tests/harita-dokunma.test.ts'],
  },
  {
    ad: 'Harita listesi kaldırıldı — küçük hedef yine TEK yol',
    kural: 'İşarete ulaşmanın dokunulabilir bir karşılığı vardır',
    dosya: 'app/(tam)/harita/HaritaIstemci.tsx',
    ara: '            <ul className="ab-harita-liste secilir">',
    yaz: '            <ul className="ab-harita-liste secilir" hidden>',
    testler: ['tests/harita-dokunma.test.ts'],
  },
  {
    ad: 'Ölü dar bant kuralı geri geldi',
    kural: 'Dar bant için yazılan bir kural gerçekten uygulanır',
    dosya: 'app/kabuk.css',
    ara: `@media (max-width: 620px) {
  .ab-mercek-dar select { max-width: 118px; }
}`,
    yaz: `@media (max-width: 620px) {
  .ab-mercek-dar select { max-width: 118px; }
  .ab-hesap-dugme .kisi { display: none; }
}`,
    testler: ['tests/bekci/olu-bant-kurali.test.ts'],
  },
  {
    ad: 'Bir ekran rota envanterinden düştü',
    kural: 'app/ altındaki her kabuklu sayfa kalite kapılarının listesinde',
    dosya: 'arac/rotalar.json',
    /* Çapa dosyanın GERÇEK biçimini izler: `rotalar.json` satır başına
       tek rota yazar. Eski çapa virgülden sonra boşluk bekliyordu ve
       biçim değişince HİÇBİR ŞEYE eşleşmiyordu — sabotaj "hedef yok"
       diyordu, yani bu kural ölçülmüyordu (mobil audit turunda ölçüldü). */
    ara: '  "/degerlendirme-aktarim",\n',
    yaz: '',
    testler: ['tests/kabuk-gezinme.test.ts'],
  },
  {
    ad: 'Ekran başlığı yeniden cümle parçası',
    kural: 'Vurgusuz kalabilen başlık tek başına okunur',
    dosya: 'app/(kabuk)/(operasyonel)/sayim/SayimIstemci.tsx',
    ara: `        baslik={acik.length > 0 ? 'sayım turu açık' : 'Açık sayım turu yok'}`,
    yaz: '        baslik="sayımı"',
    testler: ['tests/ekran-basligi.test.ts'],
  },
  {
    ad: 'Seçilemeyen tablo yeniden grid diyor',
    kural: 'role="grid" yalnız gezinen odağı olan tabloda basılır',
    dosya: 'components/kabuk/tablo.tsx',
    ara: "role={sec ? 'grid' : undefined}",
    yaz: 'role="grid"',
    testler: ['tests/senaryo-platform.test.ts'],
  },

  /* ── Bu programın kurduğu üç kapı ────────────────────────────────────
     Yeni bir kapı, kırılmadığı sürece bir kapı değildir. */
  {
    ad: 'Kütükten bir davranış düştü',
    kural: 'Koddaki her kullanıcı davranışı senaryo kütüğünde yazılıdır',
    dosya: 'lib/senaryo/kutuk.ts',
    ara: '  ...KAPSAMA_SENARYOLARI,\n',
    yaz: '',
    testler: ['tests/ters-kapsam.test.ts'],
  },
  {
    ad: 'Boş durum yeniden "ne yapabilirim" demiyor',
    kural: 'Her bozuk durum bloğu eylem ya da beklenen-durum taşır',
    dosya: 'app/(kabuk)/(operasyonel)/sayim/SayimIstemci.tsx',
    /* Cümle R-G ile UZADI ("sebebini söyler") ve çapa güncellenmedi;
       kural o günden beri ölçülmüyordu. Çapa artık eylem yuvasını
       hedefler, cümlenin kendisini değil — cümle yeniden uzarsa sabotaj
       ayakta kalır, kural ölçülmeye devam eder. */
    ara: `            eylem={yazabilir
              ? <Dugme tur="birincil" onClick={() => setFormAcik(true)}>Sayım aç</Dugme>
              : undefined} />`,
    yaz: '            />',
    testler: ['tests/eylem-dili.test.ts'],
  },
  {
    ad: 'Firmware istisnası cihazı uyumlu ilan etti',
    kural: 'İstisna "biliniyor ve kabul edildi" der, "artık uyumlu" DEMEZ',
    dosya: 'lib/eylemler2/varlikDurusu.ts',
    ara: '      data: { istisnaGerekcesi: v.gerekce, yukseltmePlani: v.yukseltmePlani ?? null },',
    yaz: "      data: { istisnaGerekcesi: v.gerekce, yukseltmePlani: v.yukseltmePlani ?? null, durum: 'uyumlu' },",
    testler: ['tests/ters-kapsam-eylem.test.ts'],
  },
  {
    ad: 'Kapanış yolu sunucu kapısından ayrıştı',
    kural: 'Ekranın "kapanışa hazır" dediği yerde sunucu kapısı da açıktır',
    dosya: 'lib/uyum/kapanisYolu.ts',
    ara: `  const kapi = kapanisKapisi({
    onemDerecesi: g.onemDerecesi,
    tekrarMi: g.tekrarMi,
    analiz: g.analiz,
    acikAksiyon: g.aksiyonAcik,
  });`,
    yaz: '  const kapi = { ok: true } as const;',
    testler: ['tests/kapanis-yolu.test.ts'],
  },
  {
    ad: 'Sektör terimi izin listesi dışında bir dosyaya sızdı',
    kural: 'Çekirdek kod sektör terimi taşımaz; borç kütüğü YALNIZ erir',
    dosya: 'lib/alan/ag.ts',
    ara: '/* ═══ IP · subnet · CIDR — SAF MANTIK ══════════════════════════════════',
    yaz: '/* ═══ IP · subnet · CIDR — SAF MANTIK (santral ağı) ════════════════════',
    testler: ['tests/bekci/sektor-terimi.test.ts'],
  },
  {
    /* Bekçinin GÖREMEDİĞİ kusur: sektör sözcüğü gitti ama yerine sözlük
       değil ÇEKİRDEK SÖZCÜK çakıldı. Dosya bekçiye temiz görünür; ekran
       her kiracıda aynı sözcüğü gösterir. Gerçekten oldu (7 Eyl 2026). */
    ad: 'Zincir halkası çekirdek sözcüğe çakıldı',
    kural: 'Ekrandaki sektör sözcüğü sözlükten gelir, sabit değildir',
    dosya: 'app/(kabuk)/(operasyonel)/envanter/EnvanterIstemci.tsx',
    ara: "  tBas(sozluk, 'tesis'), 'Sistem / servis', 'Varlık', 'Zafiyet', 'Risk',",
    yaz: "  'Tesis', 'Sistem / servis', 'Varlık', 'Zafiyet', 'Risk',",
    testler: ['tests/envanter-mantik.test.ts'],
  },
  {
    ad: 'Türkçe arama tek katlamaya düşürüldü',
    kural: 'Türkçe metin İKİ küçültmenin birleşiminde aranır',
    dosya: 'arac/turkce-arama.mjs',
    ara: "  return [metin.toLocaleLowerCase('tr-TR'), metin.toLowerCase()];",
    yaz: "  return [metin.toLowerCase()];",
    testler: ['tests/bekci/katlama-korlugu.test.ts'],
  },
  {
    ad: 'Terimin kırılma fırsatı garantisi kaldırıldı',
    kural: 'Kırılamayan bir terim düzeni BOZMAZ, yalnız çirkin görünür',
    dosya: 'app/kabuk.css',
    ara: '.ab .terim-sar { min-width: 0; overflow-wrap: anywhere; }',
    yaz: '.ab .terim-sar { min-width: auto; }',
    testler: ['tests/senaryo-platform.test.ts'],
  },
  {
    ad: 'Tasarım belgesindeki jeton değeri koddan sapıyor',
    kural: 'DESIGN.md jeton değerleri kabuk.css\'ten SAPAMAZ',
    dosya: 'DESIGN.md',
    ara: '- **Bakır** (`--aksan` `#D29771`)',
    yaz: '- **Bakır** (`--aksan` `#D29772`)',
    testler: ['tests/tasarim-belgesi.test.ts'],
  },
  /* ── Saha sadeleştirme turu (15 Eyl 2026) ─────────────────────────── */
  {
    ad: 'Şerit kartı fotoğrafı yeniden boydan boya (perdeli düzen)',
    kural: 'Fotoğraf sabit bant, metin bandın altında; kart boydan boya fotoğraf değil',
    dosya: 'app/kabuk.css',
    ara: '  display: block; width: 100%; height: 100%; min-height: 0; object-fit: cover;',
    yaz: '  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Şerit kartı ızgarası düz akışa döndü',
    kural: 'Kart iki satırlık ızgaradır: fotoğraf bandı + metin bloğu',
    dosya: 'app/kabuk.css',
    ara: '  display: grid; grid-template-rows: minmax(0, 1fr) auto; background: var(--panel);',
    yaz: '  background: var(--panel);',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Uygunsuz kartın kırmızı iç çerçevesi geri geldi',
    kural: 'Şerit kartında çerçeve yok; uygunsuzluk yığın çubuğu + skor rengi + sözcük',
    dosya: 'app/kabuk.css',
    ara: '.ab-b-serit .kart.uyari .skor { color: var(--bd); }',
    yaz: '.ab-b-serit .kart.uyari { box-shadow: inset 0 0 0 1.5px var(--bd); }',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Kart bağ başlığı uygunsuzluğu sözcükle söylemiyor',
    kural: 'Renk tek kanal olamaz: uygunsuz sayısı bağın başlığında sözcükle durur',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: "      title={`${s.ad} · ${tipAdi(s.tipKod, s.tipAd)} · ${kartGucu(s) ?? 'güç ölçülmedi'} · ${skorSozu}${uygunsuz > 0 ? ` · ${uygunsuz} uygunsuz` : ''}`}>",
    yaz: "      title={`${s.ad} · ${tipAdi(s.tipKod, s.tipAd)} · ${kartGucu(s) ?? 'güç ölçülmedi'} · ${skorSozu}`}>",
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Katman kalan satırı yeniden tip adlarını sayıyor',
    kural: 'Kalan tipler sayıyla; adlar title\'ta, karar yüzeyinde değil',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: '                    Diğer {tipler.length - KATMAN_TAVANI} tip',
    yaz: "                    {tipler.slice(KATMAN_TAVANI).map((t) => tipAdi(t.kod, t.ad)).join(' · ')}",
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Kalan tiplerin adları yeniden yalnız title\'a saklandı',
    kural: 'Adlar klavye ve dokunmayla erişilir listede; title fareye açıktır',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: '                  <summary className="mono kalan">',
    yaz: '                  <summary className="mono kalan" title={tipler.slice(KATMAN_TAVANI).map((t) => tipEtiketi.get(t.kod) ?? tipAdi(t.kod, t.ad)).join(\' · \')}>',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Kart kimlik satırı sessizce kesiliyor (üç nokta yok)',
    kural: 'Sığmayan tip · güç üç noktayla kırpılır; tam etiket bağ başlığında',
    dosya: 'app/kabuk.css',
    ara: '.ab-b-serit .kart .kimlik { display: block; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    yaz: '.ab-b-serit .kart .kimlik { display: flex; gap: 6px; min-width: 0; white-space: nowrap; overflow: hidden; }',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Gücü ölçülmemiş şeridinin yöntem notu ekrana geri döndü',
    kural: 'Yöntem notu title\'ta; şeridin görünür metni ad + sayıdır',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: "                Kurulu güç ölçülmedi · {gucsuz.length} {terim('tesis')}",
    yaz: "                Kurulu güç ölçülmedi · {gucsuz.length} {terim('tesis')} — uyum endeksi ölçüldü, dikey eksende yeri yok",
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Risk yoğunluğu "ölçülemedi"yi yeniden her durumda yazıyor',
    kural: 'Aynı sayı iki KPI\'da tekrar etmez; bilinmeyen sözcüğü yalnız kritik=yüksek=0 iken',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: `          {risk.kritik === 0 && risk.yuksek === 0 && olculemeyenRisk > 0
            && <> · <span className="unk">{olculemeyenRisk} ölçülemedi</span></>}`,
    yaz: `          {olculemeyenRisk > 0
            && <> · <span className="unk">{olculemeyenRisk} ölçülemedi</span></>}`,
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Aynı adlı iki tip sektörle ayrılmıyor',
    kural: 'Görünen ad çakışırsa etiket sektör adını taşır',
    dosya: 'app/(kabuk)/(flagship)/tipEtiketi.ts',
    ara: '      aday = sektorAyiriyor ? `${ad} · ${t.sektorAd}` : `${ad} · ${t.kod}`;',
    yaz: '      aday = ad;',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  /* ── Kaydırma çubuğu kararı (15 Eyl 2026) ─────────────────────────── */
  {
    ad: 'Kaydırma çubuğu kararı kabuk kökünden kaldırıldı',
    kural: 'Çubuk kararı `.ab`te bir kez verilir ve kalıtımla her kayan kaba iner',
    dosya: 'app/kabuk.css',
    ara: '  scrollbar-color: var(--cubuk) transparent;',
    yaz: '  /* karar kaldırıldı */',
    testler: ['tests/bekci/kaydirma-cubugu.test.ts'],
  },
  {
    /* ÖLÇÜLDÜ: `scrollbar-width` kalıtımsızdır; kural yalnız `.ab`te
       kalırsa şeridin hesaplanan değeri `auto` döner — çubuk işletim
       sisteminin kalınlığında çizilir ve kusur geri gelir. */
    ad: 'Çubuk inceliği yalnız kabuk köküne yazıldı (kalıtımsız özellik)',
    kural: '`scrollbar-width` kalıtımsızdır: kabuğun altındaki her öğeye yazılır',
    dosya: 'app/kabuk.css',
    ara: '.ab, .ab * { scrollbar-width: thin; }',
    yaz: '.ab { scrollbar-width: thin; }',
    testler: ['tests/bekci/kaydirma-cubugu.test.ts'],
  },
  {
    ad: 'Belge kökünün çubuk rengi jetondan saptı',
    kural: 'Belge kökündeki literal `--cubuk` jetonuyla AYNIDIR',
    dosya: 'app/globals.css',
    ara: '  scrollbar-color: #78878A transparent;',
    yaz: '  scrollbar-color: #8D9497 transparent;',
    testler: ['tests/bekci/kaydirma-cubugu.test.ts'],
  },
  {
    ad: 'İçerik kabının çubuğu gizlendi',
    kural: 'Çubuk yalnız gezinme sıralarında gizlenir; içerik kabında tek affordanstır',
    dosya: 'app/kabuk.css',
    ara: '  display: flex; overflow-x: auto; scroll-snap-type: x proximity;',
    yaz: '  display: flex; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none;',
    testler: ['tests/bekci/kaydirma-cubugu.test.ts'],
  },
  {
    ad: 'Çubuk rengi kontrol eşiğinin altına çekildi',
    kural: 'Çubuk başparmağı bir kontroldür: dört zeminde 3:1',
    dosya: 'app/kabuk.css',
    /* 3:1 eşiğini `arac/kontrast.mjs` (CLI, `tasarim:kapi`) ölçer; sabotaj
       koşucusu vitest koştuğu için burada belge sapması ve jeton eşitliği
       dişleri yakalar — ikisi de aynı değişikliği kırmızı yakar. */
    ara: '  --cubuk: #78878A;',
    yaz: '  --cubuk: #3A4245;',
    testler: ['tests/tasarim-belgesi.test.ts', 'tests/bekci/kaydirma-cubugu.test.ts'],
  },
  {
    ad: 'Etiketin küresel benzersizlik güvencesi kaldırıldı',
    kural: 'İki tip hiçbir zaman aynı etiketle çizilmez — kiracı adı üretilen etiketle çakışsa da',
    dosya: 'app/(kabuk)/(flagship)/tipEtiketi.ts',
    ara: '    for (let n = 2; kullanilan.has(etiket); n += 1) etiket = `${aday} (${n})`;',
    yaz: '    /* güvence kaldırıldı */',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Eksen penceresi sabit sınıra çakıldı (eski %0-100 ekseni)',
    kural: 'Takımyıldız ekseni ÇİZİLEN kümeden türetilir; sabit eksende dört nokta tuvalin yüzde on dördüne sıkışıyordu',
    dosya: 'app/(kabuk)/(flagship)/eksenPenceresi.ts',
    ara: `  let alt = Math.floor(enAz / adim) * adim;
  let ust = Math.ceil(enCok / adim) * adim;`,
    yaz: `  /* SABOTAJ: pencere veriden değil sınırdan gelsin — eski sabit eksen */
  let alt = taban ?? Math.floor(enAz / adim) * adim;
  let ust = tavan ?? Math.ceil(enCok / adim) * adim;`,
    testler: ['tests/eksen-penceresi.test.ts'],
  },
  {
    ad: 'Pencerenin asgari genişliği kaldırıldı (yakınlaştırma yalanı)',
    kural: 'Bir puan farkla ayrılan iki tesis tuvalin iki ucuna düşemez — pencere en az iki adım geniştir',
    dosya: 'app/(kabuk)/(flagship)/eksenPenceresi.ts',
    ara: '  const { taban, tavan, asgariAdim = 2 } = secenek;',
    yaz: '  const { taban, tavan, asgariAdim = 1 } = secenek;  /* SABOTAJ */',
    testler: ['tests/eksen-penceresi.test.ts'],
  },
  {
    ad: 'Künye çakışma çözücüsü dikeyde YÖNSÜZ hâle döndürüldü',
    kural: 'Künye noktanın merkezinde değil, yönüne göre altında ya da üstünde durur; zıt yönlere açılan iki künye merkezleri uzak olsa bile örtüşür',
    dosya: 'app/(kabuk)/(flagship)/kunyeYolu.ts',
    ara: `  return n.yukari
    ? [n.y + yol * boy, n.y + (yol + 1) * boy]
    : [n.y - (yol + 1) * boy, n.y - yol * boy];`,
    yaz: `  /* SABOTAJ: eski MERKEZ modeli — künyenin yönü yok sayılır */
  const merkez = n.y + (n.yukari ? 1 : -1) * yol * boy;
  return [merkez - boy / 2, merkez + boy / 2];`,
    testler: ['tests/kunye-yolu.test.ts'],
  },
  {
    ad: 'Dizüstü bandı kapısı iş akışından çıkarıldı',
    kural: 'Kapı TAŞIYAN bir iş kümenin dışında kalamaz; beyansız düşen kapı kırmızı yakar',
    dosya: '../.github/workflows/pr-kapisi.yml',
    ara: `      - name: Dizüstü bandı kapısı (1366×768 kırpılma)
        working-directory: web
        run: npm run tasarim:dizustu`,
    yaz: '      # SABOTAJ: dizüstü kapısı sessizce düştü',
    testler: ['tests/kapi-is-kapsami.test.ts'],
  },
  {
    ad: 'Tuval tabanı CSS ile model arasında ayrıştırıldı',
    kural: 'Künye yüzdesi tuval TABANINDAN türer; CSS tabanı ile model tabanı aynı sayıdır',
    dosya: 'app/kabuk.css',
    ara: '  margin-top: 0; min-height: 245px; flex: 1;',
    yaz: '  margin-top: 0; min-height: 300px; flex: 1;  /* SABOTAJ */',
    testler: ['tests/kunye-yolu.test.ts'],
  },
  {
    ad: 'Künye yüzdesi yeniden ELLE yazıldı (türetme kaldırıldı)',
    kural: 'Piksel bir kutuyu değişken bir tuvale ölçen sabit yüzde, dar bantta çakışmayı geçirir',
    dosya: 'app/(kabuk)/(flagship)/kunyeYolu.ts',
    ara: 'export const KUNYE_BOY = Math.ceil((KUNYE_BOY_PX / TUVAL_TABAN_PX) * 100);',
    yaz: 'export const KUNYE_BOY = 11;  /* SABOTAJ: eski elle yazılan yüzde */',
    testler: ['tests/kunye-yolu.test.ts'],
  },
  {
    ad: 'İki jeton aynı değere çakıştı (--t-code-lg sınıfı)',
    kural: 'Aynı değeri taşıyan iki jeton, olmayan bir ayrımı vaat eder',
    dosya: 'app/kabuk.css',
    ara: '  --t-ekran: 28px;',
    yaz: '  --t-ekran: 21px;',
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },
  {
    ad: 'Komşu kademe ayırt edilemez hâle geldi (üç pikselde altı kademe)',
    kural: 'Komşu kademeler arasındaki oran %8\'in altına inemez',
    dosya: 'app/kabuk.css',
    ara: '  --t-baslik: 16px;',
    yaz: '  --t-baslik: 14px;',
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },
  {
    ad: 'Bir bildirim jeton katmanını yeniden ATLADI',
    kural: 'Her font-size ya jetondan geçer ya izin listesinde beyanlıdır',
    dosya: 'app/kabuk.css',
    /* Hedef `.ab-lede h1`e daraltıldı: jeton adları sadeleşince aynı üç
       bildirimlik dizge İKİ kuralda birden geçer oldu ve araç tekillik
       ister. Ekran başlığı arketiptir; jeton katmanını orada atlamak,
       kusurun en görünür hâlidir. */
    ara: `  margin: 0; font-family: var(--gorunum); font-weight: 500;
  font-size: var(--t-ekran); line-height: var(--lh-manset); letter-spacing: var(--tr-manset);`,
    yaz: `  margin: 0; font-family: var(--gorunum); font-weight: 500;
  font-size: 26px; line-height: var(--lh-manset); letter-spacing: var(--tr-manset);`,
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },
  {
    ad: 'Satır içi stil TANIMSIZ jetona başvurdu (ekran sessizce kalıtıma düşer)',
    kural: 'Başvurulan her --t-* jetonu TANIMLI olmalıdır',
    dosya: 'app/(kabuk)/(operasyonel)/envanter/Formlar.tsx',
    ara: "<span style={{ display: 'block', fontSize: 'var(--t-govde)', fontWeight: 600 }}>",
    yaz: "<span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>",
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },
  {
    ad: 'Durum manşeti yeniden eylemli satırı eziyor (ölçekten 68px\'e)',
    kural: 'Ekranın birincil işi müdahaledir; ölçek karar değerini izler',
    dosya: 'app/kabuk.css',
    ara: '  font-family: var(--gorunum); font-weight: 600; font-size: var(--t-manset); line-height: var(--lh-sikisik);',
    yaz: '  font-family: var(--gorunum); font-weight: 600; font-size: 68px; line-height: .8;  /* SABOTAJ */',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Ray karar sırasını bıraktı (uygunsuz öne alınmıyor)',
    kural: 'Ray karar sırasına dizilir: açık uygunsuzluğu olan tesis ilk ekranda',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: `          {[...tesisler]
            .filter((s) => s.endeks !== null)
            .sort((a, b) => ((b.sayim.uyumsuz ?? 0) > 0 ? 1 : 0) - ((a.sayim.uyumsuz ?? 0) > 0 ? 1 : 0))
            .map((s) => <SahaKarti key={s.id} s={s} />)}`,
    yaz: '          {tesisler.map((s) => <SahaKarti key={s.id} s={s} />)}',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },
  {
    ad: 'Panel etiketi yeniden koşulsuz "Grup durumu"',
    kural: 'Kapsamı daraltılmış kullanıcıya "grup" demek, sayıların kapsamını yanlış beyan eder',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: '          <p className="etiket">{durumEtiketi} · {bugun}</p>',
    yaz: '          <p className="etiket">Grup durumu · {bugun}</p>  {/* SABOTAJ */}',
    testler: ['tests/saha-sadelestirme.test.ts'],
  },

  /* ── ÜÇ EKSENLİ TİPOGRAFİ KAPISI · iz ve satır aralığı ────────────── */
  {
    ad: 'İki harf aralığı jetonu aynı değeri taşısın (ad ayrım vaat eder, değer vermez)',
    kural: 'Ad, değerin vermediği bir ayrımı vaat ettiğinde en sinsi kusuru üretir: değeri okuyan kimse yoktur, ADI okunur',
    dosya: 'app/kabuk.css',
    ara: '  --tr-gezinme: .06em;   /* gezinme · düğme büyük harfi — hafif */',
    yaz: '  --tr-gezinme: .09em;   /* SABOTAJ — etiket jetonuyla çakışıyor */',
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },
  {
    ad: 'Satır aralığı bildirimini jeton katmanından kaçır',
    kural: 'Üç eksenin de ekran değeri jetondan gelir; kaçan bildirim izin listesinde EKSENİYLE ve gerekçesiyle durmalı',
    dosya: 'app/kabuk.css',
    ara: '.ab-a-panel .kimlik .cumle { margin: 12px 0 0; font-size: var(--t-govde); line-height: var(--lh-govde); color: var(--i2); }',
    yaz: '.ab-a-panel .kimlik .cumle { margin: 12px 0 0; font-size: var(--t-govde); line-height: 1.55; color: var(--i2); }  /* SABOTAJ */',
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },
  {
    ad: 'Ayırt edilemez satır aralığı kademesi ekle (1,2 ile 1,25 arası %4)',
    kural: '%8\'in altında bir adım ekranda ayırt edilmez ve hiyerarşi değil TEKRAR üretir — 1,15 ile 1,2 bu yüzden tek role indi',
    dosya: 'app/kabuk.css',
    ara: '  --lh-baslik: 1.4;      /* satır ve kart başlığı */',
    yaz: '  --lh-baslik: 1.25;     /* SABOTAJ — manşetle arası %4 */',
    testler: ['tests/bekci/tipografi-olcegi.test.ts'],
  },

  /* ── TABLO GRAMERİ KAPISI ─────────────────────────────────────────── */
  {
    ad: 'Paylaşılan sınıfı taşıyan iskelet yapısal sözleşmesini kaybetsin',
    kural: 'ab-vt sınıfı paylaşılan grameri VAAT EDER; kolon kaşı düşen kopya ekranda doğru görünür, ekran okuyucuda sütun başlığı kalmaz',
    dosya: 'app/(kabuk)/(operasyonel)/tedarikciler/loading.tsx',
    ara: '                  <th key={b} scope="col"><span className="kolonbas">{b}</span></th>',
    yaz: '                  <th key={b} scope="col"><span>{b}</span></th>  {/* SABOTAJ */}',
    testler: ['tests/bekci/tablo-grameri.test.ts'],
  },
  {
    ad: 'Beyansız yedinci ham tablo ekle',
    kural: 'Paylaşılan bileşen dışındaki her ham <table> dosyasıyla, sınıfıyla ve gerekçesiyle beyanlıdır; sayısı yalnız küçülür',
    dosya: 'app/(kabuk)/(operasyonel)/yardim/page.tsx',
    ara: '        <div className="ab-yardim-tablo-sar">',
    yaz: '        <table className="ab-kacak-tablo"><tbody><tr><td>SABOTAJ</td></tr></tbody></table>\n        <div className="ab-yardim-tablo-sar">',
    testler: ['tests/bekci/tablo-grameri.test.ts'],
  },
  {
    ad: 'Matris ızgarasının tablo rolünü düşür',
    kural: 'Matris <table> DEĞİLDİR; tabloluğu YALNIZ ARIA rollerinde durur — rol düşerse ekranda hiçbir şey değişmez, ekran okuyucuda her şey değişir',
    dosya: 'components/kabuk/tablo.tsx',
    ara: '        <span className="kolonbas" role="columnheader">{konuBasligi}</span>',
    yaz: '        <span className="kolonbas">{konuBasligi}</span>  {/* SABOTAJ */}',
    testler: ['tests/bekci/tablo-grameri.test.ts'],
  },
  {
    ad: 'Tablo sarmalayıcısını kendi <table>\'ına kaçır',
    kural: 'Tablo bir SARMALAYICIDIR; kendi çizimine geçerse 46 ekran sessizce ikinci bir gramere düşer, dosya başlığı "tek semantik çekirdek" demeye devam ederken',
    dosya: 'components/kabuk/tablo.tsx',
    ara: '    <VeriTablosu<Satir>\n      etiket={etiket ?? `${konuBasligi} kütüğü`}',
    yaz: '    <VeriTabloSABOTAJ<Satir>\n      etiket={etiket ?? `${konuBasligi} kütüğü`}',
    testler: ['tests/bekci/tablo-grameri.test.ts'],
  },

  /* ── KABUK KROMU · başlık ve ayak ─────────────────────────────────── */
  {
    ad: 'Gezinme sekmesini markayla aynı kademeye geri çıkar',
    kural: 'Marka barın TEK 16px nesnesidir; sekme aynı kademeye çıkınca altı eşit ağırlıklı nesne olur ve hiyerarşi kaybolur',
    dosya: 'app/kabuk.css',
    ara: '  font-family: var(--gorunum); font-size: var(--t-govde); font-weight: 600;\n  letter-spacing: var(--tr-gezinme); text-transform: uppercase;\n  color: var(--i3); border-bottom: 2px solid transparent;',
    yaz: '  font-family: var(--gorunum); font-size: var(--t-baslik); font-weight: 600;  /* SABOTAJ */\n  letter-spacing: var(--tr-gezinme); text-transform: uppercase;\n  color: var(--i3); border-bottom: 2px solid transparent;',
    testler: ['tests/bekci/kabuk-kromu.test.ts'],
  },
  {
    ad: 'Ayak telifini koda göm (kiracı adı yapılandırmadan gelmesin)',
    kural: 'Kiracı adı koda gömülürse su kiracısı kurunca başlıkta kendi adını, ayakta "Demo Enerji" görür; üstelik "Enerji" çekirdekte duran bir SEKTÖR sözcüğü olur',
    dosya: 'components/kabuk/Kabuk.tsx',
    ara: '      <span className="telif">© {new Date().getFullYear()} {veri.kiraciAd}</span>',
    yaz: '      <span className="telif">© 2026 Demo Enerji</span>  {/* SABOTAJ */}',
    testler: ['tests/bekci/kabuk-kromu.test.ts'],
  },
  {
    ad: 'Ayakta telifi bağ kümesinin arkasına geri at',
    kural: 'Telif bir künye satırıdır, gezinme değil; bağ kümesinin içine düşünce dört bağla tek küme gibi okunur',
    dosya: 'components/kabuk/Kabuk.tsx',
    ara: '      <span className="telif">© {new Date().getFullYear()} {veri.kiraciAd}</span>\n      {/* ── GEZİNME KÜMESİ · sağda ───────────────────────────────────',
    yaz: '      {/* SABOTAJ — telif bağların ardına atıldı */}\n      {/* ── GEZİNME KÜMESİ · sağda ───────────────────────────────────',
    testler: ['tests/bekci/kabuk-kromu.test.ts'],
  },
  {
    ad: 'Sektör ADLARINI yeniden büyük harf yap (değer kaş sesiyle konuşsun)',
    kural: 'Büyük harf YAPISAL KAŞA aittir; sektör adı içerik paketinden gelen bir DEĞERDİR ve kaşla aynı sesle konuşunca kaşı işlevsiz kılar',
    dosya: 'app/kabuk.css',
    ara: `.ab-mercek button {
  display: inline-flex; align-items: center; padding: 0 10px;
  font-family: var(--veri); font-size: var(--t-veri); letter-spacing: var(--tr-gezinme);
  color: var(--i3);`,
    yaz: `.ab-mercek button {
  display: inline-flex; align-items: center; padding: 0 10px;
  font-family: var(--veri); font-size: var(--t-veri); letter-spacing: var(--tr-gezinme);
  text-transform: uppercase; color: var(--i3);  /* SABOTAJ */`,
    testler: ['tests/bekci/kabuk-kromu.test.ts'],
  },
  {
    ad: 'Kaydırma çubuğunu üçüncül metinden yüksek sesli yap',
    kural: 'Bir KONTROL, ayırdığı içerikten daha okunaklı çizilemez — üst sınır --i3',
    dosya: 'app/kabuk.css',
    ara: '  --cubuk: #78878A;',
    yaz: '  --cubuk: #A6AEB1;  /* SABOTAJ — üçüncül metnin üstüne çıktı */',
    testler: ['tests/bekci/kabuk-kromu.test.ts'],
  },
  {
    ad: 'Kaydırma çubuğunu erişilebilirlik tabanının altına indir',
    kural: 'Çubuk metin değil KONTROLDÜR; WCAG 1.4.11 metin dışı kontrast eşiği 3:1 ve bu taban görsel bir şikâyetle düşürülemez',
    dosya: 'app/kabuk.css',
    ara: '  --cubuk: #78878A;',
    yaz: '  --cubuk: #343B3E;  /* SABOTAJ — 1,72:1, tabanın altı */',
    testler: ['tests/bekci/kabuk-kromu.test.ts'],
  },

  /* ── SAHA ŞERİDİ · süzgeç ölçütü ──────────────────────────────────── */
  {
    ad: 'Şerit süzgecini uygunsuzluğa çevir (bir uygunsuz gizlenebilir)',
    kural: 'Süzgeç ölçütü yalnız ÖLÇÜLMÜŞLÜKTÜR; uygunsuzluğa göre süzmek karar gerektiren bir tesisi sessizce düşürebilir',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: '            .filter((s) => s.endeks !== null)',
    yaz: '            .filter((s) => (s.sayim.uyumsuz ?? 0) > 0)  /* SABOTAJ */',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'Süzülen kümeyi takımyıldızdan da kopar (16 tesis ekrandan silinir)',
    kural: 'Süzülen küme BAŞKA bir yüzeyde adıyla durmalı — yoksa "bilinmeyen ≠ sıfır" çiğnenir',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: '          serit={olculmemisSerit} panelAcik={olculmemisAcik} setPanelAcik={setOlculmemisAcik}',
    yaz: '          serit={[]} panelAcik={olculmemisAcik} setPanelAcik={setOlculmemisAcik}  /* SABOTAJ */',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'Şeridi gizleyen bant kuralı kaldırıldı',
    kural: 'Ray künye çizilen bantta gizlenir; 1101px’te ekrana sıfır yeni ad katıyordu',
    dosya: 'app/kabuk.css',
    ara: `@media (min-width: 1101px) {
  .ab-b-genel .ab-b-serit { display: none; }
}`,
    yaz: '/* SABOTAJ: bant kuralı kaldırıldı — ray her bantta çizilir */',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'İki eşik ayrıştırıldı (ad kaybı penceresi açılır)',
    kural: 'Künyeyi susturan eşik ile rayı gizleyen eşik BİTİŞİKTİR; ayrışırsa arada dört tesisin adı ekrandan tümüyle kaybolur',
    dosya: 'app/kabuk.css',
    ara: '@media (min-width: 1101px) {',
    yaz: '@media (min-width: 1200px) {',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'Portföy özeti takımyıldızdan alındı',
    kural: 'Şerit geniş bantta gizli olduğu için portföyün sayısı ve güç toplamı takımyıldızın başlığında durur',
    dosya: 'app/(kabuk)/(flagship)/Genel.tsx',
    ara: `          portfoy={{ sayi: ozet.tesisSayisi, gucYazi: ozet.gucYazi }} />`,
    yaz: '          portfoy={{ sayi: 0, gucYazi: null }} />',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'Tuval adsız hâline döndürüldü (künye susuyor, nokta çiziliyor)',
    kural: 'Tuval künyesiyle AYNI eşikte susar; adı okunmayan bir nokta "hangi tesis güçlü ve uyumlu" sorusunu yanıtlayamaz',
    dosya: 'app/kabuk.css',
    ara: '  .ab-b-takim .ab-tuval { display: none; }',
    yaz: '  /* SABOTAJ: tuval dar bantta da çiziliyor — adsız nokta */',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'Devralan portföy özeti ray görünen bantta da çiziliyor',
    kural: 'Ray gizlenince özeti takımyıldız devralır; ray geri gelince devralan ÇEKİLİR — yoksa aynı iki sayı ekranda iki kez durur',
    dosya: 'app/kabuk.css',
    ara: '  .ab-b-genel .ab-b-takim .ab-takim-bas > .etiket.ust { display: none; }',
    yaz: '  /* SABOTAJ: devralan özet çekilmiyor — portföy künyesi iki kez */',
    testler: ['tests/bekci/saha-serit.test.ts'],
  },
  {
    ad: 'Yüzey kademesi düzleştirildi',
    kural: 'Koyu temada zemin → panel adımı algılanabilir olmalı; 1,10:1 altı ayrışma sayılmaz',
    dosya: 'app/kabuk.css',
    ara: '  --panel: #292C2D;',
    yaz: '  --panel: #191C1D;',
    testler: ['tests/bekci/yuzey-kademesi.test.ts'],
  },
  {
    ad: 'Yüzey kademesi tersine çevrildi',
    kural: 'Panel zeminin ÜSTÜNDEDİR; sıra tersine dönerse "bir kademe üstü" beyanı yalan olur',
    dosya: 'app/kabuk.css',
    ara: '  --panel2: #373A3B;',
    yaz: '  --panel2: #141617;',
    testler: ['tests/bekci/yuzey-kademesi.test.ts'],
  },
  {
    ad: 'Saç çizgisi en parlak yüzeyin altına indirildi',
    kural: 'Ayraç, üstüne çizildiği en parlak yüzeyden parlaktır; yoksa panel üstündeki kenarlıklar görünmez olur',
    dosya: 'app/kabuk.css',
    ara: '  --hr: #484A4C;',
    yaz: '  --hr: #1C2123;',
    testler: ['tests/bekci/yuzey-kademesi.test.ts'],
  },
  {
    ad: 'DESIGN.md kademe sayısı koddan ayrıştırıldı',
    kural: 'Belgenin yazdığı kademe ÖLÇÜLENLE aynıdır — bu kapının doğum sebebi o ayrışmaydı',
    dosya: 'DESIGN.md',
    ara: 'zemin → panel `1,244:1`',
    yaz: 'zemin → panel `1,400:1`',
    testler: ['tests/bekci/yuzey-kademesi.test.ts'],
  },
];

function testKos(testler) {
  try {
    execFileSync('npx', ['vitest', 'run', ...testler, '--reporter=dot'], {
      cwd: KOK, stdio: 'pipe', timeout: 600_000,
    });
    return { kirildi: false };
  } catch (e) {
    const cikti = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    return { kirildi: true, cikti: cikti.slice(-400) };
  }
}

const sonuclar = [];

for (const s of SABOTAJLAR) {
  if (s.atla) {
    sonuclar.push({ ad: s.ad, kural: s.kural, durum: 'atlandi', not: s.atla });
    continue;
  }
  const yol = path.join(KOK, s.dosya);
  const asil = readFileSync(yol, 'utf8');
  const asilOzet = ozet(asil);

  const adet = asil.split(s.ara).length - 1;
  if (adet !== 1) {
    sonuclar.push({
      ad: s.ad, kural: s.kural, durum: 'hedef_yok',
      not: `"${s.ara.slice(0, 40)}…" ${s.dosya} içinde ${adet} kez geçiyor`,
    });
    continue;
  }

  writeFileSync(yol, asil.replace(s.ara, s.yaz));
  let sonuc;
  try {
    sonuc = testKos(s.testler);
  } finally {
    writeFileSync(yol, asil);
  }

  const geriOzet = ozet(readFileSync(yol, 'utf8'));
  sonuclar.push({
    ad: s.ad, kural: s.kural,
    durum: sonuc.kirildi ? 'yakalandi' : 'KACIRILDI',
    testler: s.testler,
    geriYuklendi: geriOzet === asilOzet,
  });
  process.stderr.write(
    `${sonuc.kirildi ? '✓' : '✗'} ${s.ad}${geriOzet === asilOzet ? '' : ' · GERİ YÜKLEME BOZUK'}\n`);
}

/* ── HER TANIM BİR SONUÇ ÜRETİR ─────────────────────────────────────────
   Ölçüldü (19 Eyl 2026): yedi sabotaj tanımı, `SABOTAJLAR` yerine
   `sonuclar` dizisinin İÇİNE yazılmıştı — dizi `const sonuclar = [ {…} ]`
   diye açılıyordu. Tanımlar hiç koşmadı; `durum` alanları boştu, iki
   süzgeç de (`atlandi` · `hedef_yok`) onları ELEMEDİ, yani ÖLÇÜLEN
   sayısına girip YAKALANAN sayısına girmediler. Araç "kaçırılan: 8"
   diyordu ve sekizin yedisi hiç koşmamış bir tanımdı; yüzey kademesinin
   dört sabotajı da o yedinin içindeydi.

   Sabotaj aracının kendisi de bir kapıdır ve bu, kapının kendi
   "hiçbir şey ölçmeden yeşil yanma" hâliydi. Bugün iki kimlik tutulur:
   her tanım bir sonuç üretir ve her sonuç BİLİNEN bir durum taşır. */
const DURUMLAR = new Set(['yakalandi', 'KACIRILDI', 'hedef_yok', 'atlandi']);
if (sonuclar.length !== SABOTAJLAR.length) {
  throw new Error(`SABOTAJ ARACI KUSURLU: ${SABOTAJLAR.length} tanım var, `
    + `${sonuclar.length} sonuç üretildi. Koşmayan bir sabotaj, kaçırılan `
    + 'bir sabotajdan daha sessizdir.');
}
for (const s of sonuclar) {
  if (!DURUMLAR.has(s.durum)) {
    throw new Error(`SABOTAJ ARACI KUSURLU: "${s.ad}" sonucu durumsuz `
      + `(${s.durum}). Durumsuz bir satır ölçülen sayısına girer, yakalanan `
      + 'sayısına girmez — araç kendi kusurunu "test yetersiz" diye raporlar.');
  }
}

const olculen = sonuclar.filter((s) => s.durum !== 'atlandi' && s.durum !== 'hedef_yok');
const yakalanan = olculen.filter((s) => s.durum === 'yakalandi');
const bozukGeri = sonuclar.filter((s) => s.geriYuklendi === false);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ sonuclar, olculen: olculen.length, yakalanan: yakalanan.length }, null, 2));
} else {
  console.log('');
  for (const s of sonuclar) {
    const im = s.durum === 'yakalandi' ? 'YAKALANDI'
      : s.durum === 'KACIRILDI' ? 'KAÇIRILDI  ← TEST YETERSİZ'
        : s.durum === 'hedef_yok' ? 'HEDEF YOK  ← kural taşınmış'
          : 'atlandı';
    console.log(`  ${im.padEnd(28)} ${s.ad}`);
    if (s.not) console.log(`  ${' '.repeat(28)} ${s.not}`);
  }
  console.log('');
  console.log(`sabotaj: ${olculen.length} · yakalanan: ${yakalanan.length}`
    + ` · kaçırılan: ${olculen.length - yakalanan.length}`
    + ` · geri yükleme bozuk: ${bozukGeri.length}`);
}

process.exit(
  (olculen.length === yakalanan.length && bozukGeri.length === 0
    && sonuclar.every((s) => s.durum !== 'hedef_yok')) ? 0 : 1);
