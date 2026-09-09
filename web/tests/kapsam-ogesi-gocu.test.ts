import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CEKIRDEK_KAPSAM_TURLERI } from '@/lib/kapsam/oge';
import {
  ENERJI_PROFIL_OZNITELIKLERI, TEIAS_SERI_OLMAYAN_KOSULU, profiliAyir,
} from '../prisma/kapsam-ogesi';
import { ENERJI_OZNITELIK_ETIKETLERI } from '../prisma/sozlukler';

/* ═══════════════════════════════════════════════════════════════════════
   B1 · B2 — TOHUM İLE GÖÇ AYNI ŞEYİ SÖYLER (URN-KAP-003)

   Taze kurulum tohumdan, yükseltme göçten geçer; ikisi AYNI satırları
   yazmak zorundadır (kimlikler, tür kataloğu, kurum eşlemesi, öznitelik
   şeması, etiketler, profil→öznitelik taşıması, kural bileşimi). Göç
   SQL'dir ve TypeScript okuyamaz; iki nüsha kaçınılmazdır. Kaçınılmaz
   olmayan, SESSİZCE ayrışmalarıdır — bu dosya onu engeller.

   K3 (veri kaybı yok) kanıtı da burada: göç öncesi/sonrası sayım
   dosyaları (`arac/goc-sayimlari/`) ortak anahtarlarda EŞİT olmalı ve
   sonrası tesis sayısı kadar öğe taşımalı.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8');
const GOC = oku('prisma/migrations/20260908180000_b1_b2_kapsam_ogesi/migration.sql');
const sqlDize = (s: string) => `'${s.replace(/'/g, "''")}'`;

describe('B1 · tür kataloğu ve öğe kimliği — tohum ↔ göç [URN-KAP-003]', () => {
  it('çekirdek türler göçte aynı kimlik, kod, ad, etiket, sıra ile yazılır [URN-KAP-003]', () => {
    for (const t of Object.values(CEKIRDEK_KAPSAM_TURLERI)) {
      const satir = `'kot-${t.kod}', '${t.kod}', '${t.ad}', ${t.etiketAnahtari ? `'${t.etiketAnahtari}'` : 'NULL'}, NULL, ${t.tesiseBagli}, ${t.sira}, true`;
      expect(GOC, `göçte tür satırı yok ya da farklı: ${satir}`).toContain(satir);
      expect(GOC).toContain(`WHERE NOT EXISTS (SELECT 1 FROM "KapsamOgesiTuru" WHERE "kod" = '${t.kod}')`);
    }
  });

  it('öğe kimlik kuralı `ko-<tesisId>` dört yerde aynı: göç · tohum · sunucu · test yardımcısı [URN-KAP-003]', () => {
    expect(GOC).toContain(`'ko-' || t."id"`);
    expect(oku('prisma/kapsam-ogesi.ts')).toContain('`ko-${t.id}`');
    expect(oku('lib/kapsam/db.ts')).toContain('`ko-${tesis.id}`');
    expect(oku('tests/yardim/kapsam.ts')).toContain('`ko-${tesisId}`');
    expect(oku('tests/yardim/kapsam.ts')).toContain('`ko-${tesis.id}`');
  });

  it('kurum eşlemesi: MERKEZ ve SU-MERKEZ tipleri göçte ve tohumda `kurum` türüne gider [URN-KAP-003]', () => {
    expect(GOC).toContain(`CASE WHEN tt."kod" IN ('MERKEZ', 'SU-MERKEZ') THEN 'kot-kurum' ELSE 'kot-tesis' END`);
    expect(oku('prisma/seed.ts')).toMatch(/kod === 'MERKEZ' \? kapsamTuru\.kurum\.id : kapsamTuru\.tesis\.id/);
    expect(oku('prisma/seed-su.ts')).toMatch(/kod === 'SU-MERKEZ' \? turler\.kurum\.id : turler\.tesis\.id/);
  });

  it('kapalı tesisin öğesi pasif — göç ve tohum aynı kararı verir [URN-KAP-003]', () => {
    expect(GOC).toContain(`CASE WHEN t."durum" = 'kapali' THEN 'pasif' ELSE 'aktif' END`);
    expect(oku('prisma/kapsam-ogesi.ts')).toContain("durum: t.durum === 'kapali' ? 'pasif' : 'aktif'");
  });
});

describe('B2 · enerji profil öznitelikleri — tohum ↔ göç [URN-KAP-003]', () => {
  /* Göçteki UNION bloğu satır satır ayrıştırılır; tohum sabitiyle alan
     alan karşılaştırılır. */
  const blok = /INSERT INTO "SektorOznitelikSemasi"[\s\S]*?\) v\n/.exec(GOC)?.[0] ?? '';
  const satirlar = [...blok.matchAll(
    /SELECT '(\w+)'(?: AS anahtar)?, '(\w+)'(?: AS tip)?, (true|false)(?: AS kuralda)?, (\d+)(?: AS sira)?, (NULL|'\w+')(?: AS rol)?, '([^']+)'(?: AS grup)?,\s*(NULL|'[^']*')/g,
  )].map((m) => ({
    anahtar: m[1], tip: m[2], kuraldaKullanilir: m[3] === 'true', sira: Number(m[4]),
    rol: m[5] === 'NULL' ? null : m[5].slice(1, -1), grup: m[6],
    secenekler: m[7] === 'NULL' ? null : m[7].slice(1, -1),
  }));

  it('şema satırları alan alan aynı (anahtar · tip · kuralda · sıra · rol · grup · seçenekler) [URN-KAP-003]', () => {
    expect(satirlar.map((s) => s.anahtar)).toEqual(ENERJI_PROFIL_OZNITELIKLERI.map((o) => o.anahtar));
    for (const o of ENERJI_PROFIL_OZNITELIKLERI) {
      const g = satirlar.find((s) => s.anahtar === o.anahtar);
      expect(g, `göçte şema satırı yok: ${o.anahtar}`).toBeTruthy();
      expect({ ...g }, o.anahtar).toEqual({
        anahtar: o.anahtar, tip: o.tip, kuraldaKullanilir: o.kuraldaKullanilir, sira: o.sira,
        rol: o.rol, grup: o.grup, secenekler: o.secenekler,
      });
    }
    /* NOT EXISTS koruması UNION bloğunun ardındaki WHERE'dedir: göç elle
       yeniden koşulursa `(sektorId, anahtar)` tekilliği kırılmasın. */
    expect(GOC).toContain('AND NOT EXISTS (SELECT 1 FROM "SektorOznitelikSemasi" x WHERE x."sektorId" = s."id" AND x."anahtar" = v."anahtar")');
  });

  it('kapasite ROLÜ: göç rolsüz kapasite satırını işaretler, tohum rolle yazar [URN-KAP-003]', () => {
    expect(GOC).toContain(`UPDATE "SektorOznitelikSemasi" SET "rol" = 'kapasite'\nWHERE "etiketAnahtari" = 'kapasite' AND "rol" IS NULL;`);
    /* 2.5: tohumun kapasite satırları DEMO paketlerinin öznitelik şemasındadır
       (enerji `kuruluGuc` · su `gunlukDebi`); tohum onları paketten kurar. */
    const paketSatirlari = ['DEMO-TR-ENERJI', 'DEMO-TR-SU']
      .flatMap((kod) => JSON.parse(oku(`paketler/${kod}/oznitelikler.json`)) as { etiketAnahtari: string; rol: string | null }[])
      .filter((o) => o.etiketAnahtari === 'kapasite');
    expect(paketSatirlari.map((o) => o.rol), 'demo paketinde kapasite satırı rolsüz').toEqual(['kapasite', 'kapasite']);
  });

  it('kritiklik ROLÜ tek anahtarda ve iki kaynakta aynı [URN-KAP-003]', () => {
    const tohum = ENERJI_PROFIL_OZNITELIKLERI.filter((o) => o.rol === 'kritiklik').map((o) => o.anahtar);
    expect(tohum).toEqual(['kritiklikSinifi']);
    expect(satirlar.filter((s) => s.rol === 'kritiklik').map((s) => s.anahtar)).toEqual(tohum);
  });

  it('etiketler: altı hâlin hepsi göçte, yalnız enerji sektörüne, NOT EXISTS korumalı [URN-KAP-003]', () => {
    expect(ENERJI_OZNITELIK_ETIKETLERI.map((e) => e.anahtar))
      .toEqual(ENERJI_PROFIL_OZNITELIKLERI.map((o) => o.anahtar));
    const etiketBlogu = /INSERT INTO "SektorSozlugu"[\s\S]*?AND x\."dil" = 'tr'\);/.exec(GOC)?.[0] ?? '';
    expect(etiketBlogu).toContain(`WHERE s."kod" = 'ELEKTRIK-URETIM'`);
    for (const e of ENERJI_OZNITELIK_ETIKETLERI) {
      for (const hal of [e.tekil, e.cogul, e.iyelik, e.belirtme, e.bulunma, e.yonelme]) {
        expect(etiketBlogu, `göçte etiket hâli yok: ${e.anahtar} → ${hal}`).toContain(sqlDize(hal!));
      }
    }
  });

  it('profil kolonları öznitelik satırına aynı kuralla taşınır: mantık → sayısal 0/1, kalanı metin, NULL satır açmaz [URN-KAP-003]', () => {
    for (const o of ENERJI_PROFIL_OZNITELIKLERI) {
      expect(GOC).toContain(`'ozl-' || p."tesisId" || '-${o.anahtar}'`);
      expect(GOC).toContain(`WHERE p."${o.anahtar}" IS NOT NULL`);
      const beklenen = o.tip === 'mantik'
        ? `'${o.anahtar}', p."${o.anahtar}", NULL, NULL, 'goc:B2'`
        : `'${o.anahtar}', NULL, p."${o.anahtar}", NULL, 'goc:B2'`;
      expect(GOC, `${o.anahtar}: taşıma biçimi tipe uymuyor`).toContain(beklenen);
    }
    /* Tohumun ayırıcısı aynı kuralı uygular. */
    const { ozellikler, kalan } = profiliAyir({
      blackStart: false, kabulTarihi: new Date('2021-03-15T00:00:00.000Z'), lisansNo: 'L-1',
      kritiklikSinifi: null, iotVar: true,
    });
    expect(ozellikler).toEqual([
      { anahtar: 'blackStart', sayisalDeger: 0 },
      { anahtar: 'kabulTarihi', metinDeger: '2021-03-15T00:00:00.000Z' },
      { anahtar: 'lisansNo', metinDeger: 'L-1' },
    ]);
    expect(kalan).toEqual({ iotVar: true });
  });

  it('türetilmiş alan kuraldan çıkar: göçün REPLACE hedefi tohumun bileşik koşuluyla birebir [URN-KAP-003]', () => {
    expect(GOC).toContain(`'{"alan":"teiasScadaEmsSeriOlmayan","islec":"=","deger":true}'`);
    expect(GOC).toContain(`'${JSON.stringify(TEIAS_SERI_OLMAYAN_KOSULU)}'`);
    expect(oku('prisma/seed.ts')).toContain('TEIAS_SERI_OLMAYAN_KOSULU');
  });
});

describe('K3 · göç öncesi/sonrası sayım — veri kaybı yok [URN-KAP-003]', () => {
  const duz = (d: Record<string, unknown>, onek = ''): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, duz(v as Record<string, unknown>, `${onek}${k}.`));
      else out[`${onek}${k}`] = v;
    }
    return out;
  };
  const onceki = duz(JSON.parse(oku('arac/goc-sayimlari/onceki-kapsam-ogesi.json')));
  const sonraki = duz(JSON.parse(oku('arac/goc-sayimlari/sonraki-kapsam-ogesi.json')));

  it('ortak sayısal anahtarların hepsi eşit; ölçüm dosyaları boş değil [URN-KAP-003]', () => {
    const ortak = Object.keys(onceki).filter((k) => k in sonraki && k !== 'zaman');
    expect(ortak.length).toBeGreaterThan(40);
    const fark = ortak.filter((k) => JSON.stringify(onceki[k]) !== JSON.stringify(sonraki[k]));
    expect(fark.map((k) => `${k}: ${String(onceki[k])} → ${String(sonraki[k])}`)).toEqual([]);
  });

  it('her tesis bir öğe aldı; tür dağılımı öğe sayısına toplanır [URN-KAP-003]', () => {
    const tesis = Number(onceki['tesis'] ?? onceki['tesis.toplam']);
    expect(Number.isFinite(tesis) && tesis > 0).toBe(true);
    expect(sonraki['kapsamOgesi']).toBe(tesis);
    const turToplam = Object.entries(sonraki)
      .filter(([k]) => k.startsWith('kapsamOgesiTur.'))
      .reduce((a, [, v]) => a + Number(v), 0);
    expect(turToplam).toBe(tesis);
  });
});
