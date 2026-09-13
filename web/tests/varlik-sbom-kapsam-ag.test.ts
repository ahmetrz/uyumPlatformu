import { describe, expect, it } from 'vitest';
import { bilesenleriTekillestir, sbomAyristir } from '@/lib/varlik/sbom';
import {
  acikMi, bayatMi, kapsamOzeti, olcumBorcuMu, tamKapsamListesi, type KapsamKaydi,
} from '@/lib/varlik/kapsam';
import { agiDenetle, segmentleriDenetle, varliklariDenetle } from '@/lib/varlik/agTutarliligi';

/* ═══ OT-26 · SBOM ═══════════════════════════════════════════════════ */

const CYCLONE = JSON.stringify({
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: 'urn:uuid:aaaa',
  metadata: { timestamp: '2026-09-01T00:00:00Z' },
  components: [
    {
      type: 'library', name: 'lodash', version: '4.17.21',
      purl: 'pkg:npm/lodash@4.17.21',
      supplier: { name: 'OpenJS' },
      licenses: [{ license: { id: 'MIT' } }],
      hashes: [{ alg: 'SHA-1', content: 'aaa' }, { alg: 'SHA-256', content: 'bbb' }],
      scope: 'required',
    },
    { type: 'library', name: 'sürümsüz-kütüphane' },
    { type: 'library', version: '1.0.0' },   // adsız — reddedilir
  ],
});

const SPDX = JSON.stringify({
  spdxVersion: 'SPDX-2.3',
  documentNamespace: 'https://ornek/spdx/1',
  creationInfo: { created: '2026-09-02T00:00:00Z' },
  packages: [
    {
      name: 'openssl', versionInfo: '3.0.8',
      supplier: 'Organization: OpenSSL Foundation',
      licenseConcluded: 'Apache-2.0',
      checksums: [{ algorithm: 'SHA256', checksumValue: 'ccc' }],
      externalRefs: [
        { referenceType: 'purl', referenceLocator: 'pkg:generic/openssl@3.0.8' },
        { referenceType: 'cpe23Type', referenceLocator: 'cpe:2.3:a:openssl:openssl:3.0.8' },
      ],
    },
    { name: 'belirsiz-lisans', versionInfo: '1.0', licenseConcluded: 'NOASSERTION', supplier: 'NOASSERTION' },
  ],
});

describe('SBOM · CycloneDX', () => {
  const s = sbomAyristir(CYCLONE);

  it('biçim İÇERİKTEN tanınır', () => {
    expect(s.ok).toBe(true);
    expect(s.bicim).toBe('cyclonedx');
    expect(s.bicimSurumu).toBe('1.5');
    expect(s.seriNo).toBe('urn:uuid:aaaa');
  });

  it('bileşen alanları çözümlenir, SHA-256 yeğlenir ve ÖNEKLE saklanır', () => {
    const l = s.bilesenler.find((b) => b.ad === 'lodash');
    expect(l?.surum).toBe('4.17.21');
    expect(l?.purl).toBe('pkg:npm/lodash@4.17.21');
    expect(l?.tedarikci).toBe('OpenJS');
    expect(l?.lisans).toBe('MIT');
    expect(l?.ozet).toBe('sha256:bbb');   // sha1 değil
    expect(l?.kapsam).toBe('gerekli');
    expect(l?.kimlikGucu).toBe('purl');
  });

  it('SÜRÜM UYDURULMAZ — yoksa null geçer [ENV-YAS-001]', () => {
    const b = s.bilesenler.find((x) => x.ad === 'sürümsüz-kütüphane');
    expect(b?.surum).toBeNull();
    expect(b?.surum).not.toBe('0');
    expect(b?.kimlikGucu).toBe('ad_surum');
  });

  it('KISMİ BAŞARI: okunamayan satır sebebiyle raporlanır, öbürleri atılmaz', () => {
    expect(s.bilesenler.length).toBe(2);
    expect(s.reddedilen).toEqual([{ sira: 2, sebep: 'bileşen adı yok' }]);
  });
});

describe('SBOM · SPDX', () => {
  const s = sbomAyristir(SPDX);

  it('biçim ve belge alanları çözümlenir', () => {
    expect(s.bicim).toBe('spdx');
    expect(s.bicimSurumu).toBe('SPDX-2.3');
  });

  it('purl ve CPE externalRefs içinden çıkarılır', () => {
    const o = s.bilesenler[0];
    expect(o.purl).toBe('pkg:generic/openssl@3.0.8');
    expect(o.cpe).toBe('cpe:2.3:a:openssl:openssl:3.0.8');
    expect(o.tedarikci).toBe('OpenSSL Foundation');  // "Organization:" öneki atıldı
    expect(o.ozet).toBe('sha256:ccc');
  });

  it('NOASSERTION "yok" DEĞİL "belirlenmedi" demektir — null geçer', () => {
    const b = s.bilesenler[1];
    expect(b.lisans).toBeNull();
    expect(b.tedarikci).toBeNull();
  });

  it('SPDX\'te kapsam alanı yoktur — uydurulmaz, bilinmiyor kalır', () => {
    expect(s.bilesenler.every((b) => b.kapsam === 'bilinmiyor')).toBe(true);
  });
});

describe('SBOM · ayrıştırıcı FIRLATMAZ', () => {
  it('bozuk JSON sebebiyle birlikte döner', () => {
    const s = sbomAyristir('{bu json değil');
    expect(s.ok).toBe(false);
    expect(s.hata).toContain('JSON');
  });

  it('tanınmayan biçim beklenen alanları söyler', () => {
    const s = sbomAyristir('{"foo":1}');
    expect(s.ok).toBe(false);
    expect(s.hata).toContain('CycloneDX');
  });

  it('boş bileşen listesi hata değildir', () => {
    const s = sbomAyristir('{"bomFormat":"CycloneDX","components":[]}');
    expect(s.ok).toBe(true);
    expect(s.bilesenler).toEqual([]);
  });
});

describe('SBOM · tekilleştirme', () => {
  it('aynı purl iki kez gelirse DAHA DOLU olan tutulur', () => {
    const a = sbomAyristir(CYCLONE).bilesenler;
    const eksik = { ...a[0], lisans: null, ozet: null, tedarikci: null };
    const t = bilesenleriTekillestir([eksik, a[0]]);
    expect(t.length).toBe(1);
    expect(t[0].lisans).toBe('MIT');
    expect(t[0].ozet).toBe('sha256:bbb');
  });

  it('purl yoksa (ad, sürüm) çifti kimliktir', () => {
    const t = bilesenleriTekillestir([
      { ad: 'x', surum: '1', purl: null, cpe: null, tedarikci: null, lisans: null, ozet: null, kapsam: 'bilinmiyor', kimlikGucu: 'ad_surum' },
      { ad: 'x', surum: '2', purl: null, cpe: null, tedarikci: null, lisans: null, ozet: null, kapsam: 'bilinmiyor', kimlikGucu: 'ad_surum' },
      { ad: 'x', surum: '1', purl: null, cpe: null, tedarikci: null, lisans: 'MIT', ozet: null, kapsam: 'bilinmiyor', kimlikGucu: 'ad_surum' },
    ]);
    expect(t.length).toBe(2);
  });
});

/* ═══ OT-27 · Güvenlik kapsaması ═════════════════════════════════════ */

describe('Kapsam · UYGULANAMAZ eksik DEĞİLDİR', () => {
  it('yalnız kapsanmayan ve kısmi AÇIKTIR', () => {
    expect(acikMi('kapsanmayan')).toBe(true);
    expect(acikMi('kismi')).toBe(true);
    expect(acikMi('uygulanamaz')).toBe(false);
    expect(acikMi('bilinmiyor')).toBe(false);
    expect(acikMi('kapsanan')).toBe(false);
  });

  it('bilinmiyor ÖLÇÜM BORCUDUR, uygulanamaz değildir', () => {
    expect(olcumBorcuMu('bilinmiyor')).toBe(true);
    expect(olcumBorcuMu('uygulanamaz')).toBe(false);
  });
});

describe('Kapsam · oran paydası', () => {
  const k = (tip: string, durum: string): KapsamKaydi =>
    ({ tip: tip as KapsamKaydi['tip'], durum: durum as KapsamKaydi['durum'], sonDogrulama: null });

  it('uygulanamaz ve bilinmiyor PAYDADAN düşer', () => {
    const o = kapsamOzeti([
      k('edr', 'kapsanan'), k('siem', 'kapsanan'),
      k('mfa', 'uygulanamaz'), k('ntp', 'bilinmiyor'),
    ]);
    /* Payda 2 (iki kapsanan); uygulanamaz olanı paydaya koymak
       ulaşılamayacak bir hedefe göre puan vermek olurdu. */
    expect(o.oran).toBe(100);
    expect(o.uygulanamaz).toBe(1);
    expect(o.borc).toBe(1);
  });

  it('kısmi YARIM sayılır', () => {
    expect(kapsamOzeti([k('edr', 'kapsanan'), k('siem', 'kismi')]).oran).toBe(75);
  });

  it('ölçülmüş hiçbir kalem yoksa oran NULL — %0 yalan olurdu', () => {
    expect(kapsamOzeti([k('edr', 'bilinmiyor'), k('mfa', 'uygulanamaz')]).oran).toBeNull();
    expect(kapsamOzeti([]).oran).toBeNull();
  });

  it('açık sayısı ölçüm borcunu İÇERMEZ', () => {
    const o = kapsamOzeti([k('edr', 'kapsanmayan'), k('siem', 'bilinmiyor')]);
    expect(o.acik).toBe(1);
    expect(o.borc).toBe(1);
  });
});

describe('Kapsam · tazelik ve tamamlama', () => {
  const simdi = new Date('2026-09-03T00:00:00Z');

  it('hiç doğrulanmamış kayıt BAYAT sayılır', () => {
    expect(bayatMi(null, 90, simdi)).toBe(true);
  });

  it('eşikten eski kayıt bayat, yeni kayıt taze', () => {
    expect(bayatMi(new Date('2026-01-01T00:00:00Z'), 90, simdi)).toBe(true);
    expect(bayatMi(new Date('2026-08-20T00:00:00Z'), 90, simdi)).toBe(false);
  });

  it('kaydı olmayan tip listeden DÜŞMEZ, bilinmiyor olarak gelir', () => {
    const tam = tamKapsamListesi([{ tip: 'edr', durum: 'kapsanan', sonDogrulama: null }]);
    expect(tam.length).toBe(11);
    expect(tam.find((t) => t.tip === 'mfa')?.durum).toBe('bilinmiyor');
  });
});

/* ═══ OT-11 · OT-44 · Ağ tutarlılığı ═════════════════════════════════ */

const SEGMENTLER = [
  { id: 's1', kod: 'OT-HAT1', cidr: '10.10.0.0/24', gatewayIp: '10.10.0.1', bolgeId: 'b1' },
  { id: 's2', kod: 'OT-HAT2', cidr: '10.10.1.0/24', gatewayIp: null, bolgeId: 'b1' },
];

describe('Ağ · segment tanımları', () => {
  it('temiz tanımlar bulgu üretmez', () => {
    const r = segmentleriDenetle(SEGMENTLER);
    expect(r.bulgular).toEqual([]);
    expect(r.borclar).toEqual([]);
  });

  it('geçersiz CIDR bulgudur', () => {
    const r = segmentleriDenetle([{ ...SEGMENTLER[0], cidr: '10.10.0.0/99' }]);
    expect(r.bulgular[0].kural).toBe('gecersiz_cidr');
  });

  it('kendi ağının dışındaki gateway bulgudur', () => {
    const r = segmentleriDenetle([{ ...SEGMENTLER[0], gatewayIp: '10.99.0.1' }]);
    expect(r.bulgular[0].kural).toBe('gateway_segment_disi');
  });

  it('çözümlenemeyen gateway BULGU değil ÖLÇÜM BORCUDUR', () => {
    const r = segmentleriDenetle([{ ...SEGMENTLER[0], gatewayIp: 'bilinmiyor' }]);
    expect(r.bulgular).toEqual([]);
    expect(r.borclar[0].kural).toBe('gateway_segment_disi');
  });

  it('çakışan segmentler ÇİFT BAŞINA BİR KEZ raporlanır', () => {
    const r = segmentleriDenetle([
      SEGMENTLER[0],
      { id: 's3', kod: 'GENIS', cidr: '10.10.0.0/16', gatewayIp: null, bolgeId: 'b1' },
    ]);
    const c = r.bulgular.filter((b) => b.kural === 'cakisan_segment');
    expect(c.length).toBe(1);
  });
});

describe('Ağ · varlık adresleri', () => {
  it('segmentinin içindeki IP temizdir', () => {
    const r = varliklariDenetle(
      [{ id: 'v1', etiket: 'PLC-1', ipAdresi: '10.10.0.50', segmentId: 's1' }], SEGMENTLER,
    );
    expect(r.bulgular).toEqual([]);
  });

  it('ZONE DIŞI IP bulgudur', () => {
    const r = varliklariDenetle(
      [{ id: 'v1', etiket: 'PLC-1', ipAdresi: '10.99.0.50', segmentId: 's1' }], SEGMENTLER,
    );
    expect(r.bulgular[0].kural).toBe('ip_segment_disi');
    expect(r.bulgular[0].siddet).toBe('yuksek');
  });

  it('çözümlenemeyen IP bulguya ÇEVRİLMEZ — ölçüm borcu olur', () => {
    const r = varliklariDenetle(
      [{ id: 'v1', etiket: 'PLC-1', ipAdresi: 'bilinmiyor', segmentId: 's1' }], SEGMENTLER,
    );
    expect(r.bulgular).toEqual([]);
    expect(r.borclar[0].kural).toBe('ip_segment_disi');
  });

  it('segmenti atanmamış IP\'li varlık borçtur, bulgu değil', () => {
    const r = varliklariDenetle(
      [{ id: 'v1', etiket: 'PLC-1', ipAdresi: '10.10.0.5', segmentId: null }], SEGMENTLER,
    );
    expect(r.bulgular).toEqual([]);
    expect(r.borclar[0].kural).toBe('segment_yok');
  });

  it('IP\'si olmayan varlık bu kuralın konusu değildir', () => {
    const r = varliklariDenetle(
      [{ id: 'v1', etiket: 'PLC-1', ipAdresi: null, segmentId: null }], SEGMENTLER,
    );
    expect(r.bulgular).toEqual([]);
    expect(r.borclar).toEqual([]);
  });

  it('ÇİFT IP metin farkına rağmen yakalanır', () => {
    /* `10.10.0.5` ile ` 10.10.0.5 ` farklı dizelerdir; aynı adrestir. */
    const r = varliklariDenetle([
      { id: 'v1', etiket: 'PLC-1', ipAdresi: '10.10.0.5', segmentId: 's1' },
      { id: 'v2', etiket: 'PLC-2', ipAdresi: ' 10.10.0.5 ', segmentId: 's1' },
    ], SEGMENTLER);
    const c = r.bulgular.filter((b) => b.kural === 'cift_ip');
    expect(c.length).toBe(1);
    expect(c[0].siddet).toBe('kritik');
  });

  it('birleşik tarama iki kaynağı da toplar', () => {
    const r = agiDenetle(
      [{ id: 'v1', etiket: 'PLC-1', ipAdresi: '10.99.0.1', segmentId: 's1' }],
      [{ ...SEGMENTLER[0], gatewayIp: '10.99.0.1' }],
    );
    expect(r.bulgular.map((b) => b.kural).sort())
      .toEqual(['gateway_segment_disi', 'ip_segment_disi']);
  });
});
