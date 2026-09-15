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
  font-family: var(--gorunum); font-size: 20px; line-height: 1.1;`,
    yaz: `  /* cümle düzeni — tesis adı veridir, kaş değil (SIS-KBK-031) */
  font-family: var(--gorunum); font-size: 20px; line-height: 1.1; text-transform: uppercase;`,
    testler: ['tests/bekci/buyuk-harf.test.ts', 'tests/odak-yayma.test.ts'],
  },
  {
    ad: 'Portföy kimlik başlığı yeniden BÜYÜK HARF',
    kural: 'h2 başlığı hiçbir boyda büyük harf olmaz',
    dosya: 'app/kabuk.css',
    ara: `  margin: 12px 0 0; font-family: var(--gorunum); font-weight: 600;
  font-size: 34px; line-height: 1.1;
}`,
    yaz: `  margin: 12px 0 0; font-family: var(--gorunum); font-weight: 600;
  font-size: 34px; line-height: 1.1; text-transform: uppercase;
}`,
    testler: ['tests/bekci/buyuk-harf.test.ts'],
  },
  {
    ad: 'Bir kaş kuralı büyük harfi bıraktı — tarama daha az şey görüyor',
    kural: 'Büyük harf kuralı sayısı ölçüm tabanının altına sessizce inemez',
    dosya: 'app/kabuk.css',
    ara: `  font-family: var(--veri); font-size: 11px; letter-spacing: .1em;
  text-transform: uppercase; text-decoration: none;
}
.ab-atla:focus, .ab-atla:focus-visible {`,
    yaz: `  font-family: var(--veri); font-size: 11px; letter-spacing: .1em;
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
    ara: '- **Bakır** (`--aksan` `#C2703E`)',
    yaz: '- **Bakır** (`--aksan` `#C2703F`)',
    testler: ['tests/tasarim-belgesi.test.ts'],
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
