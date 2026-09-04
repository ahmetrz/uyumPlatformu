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
