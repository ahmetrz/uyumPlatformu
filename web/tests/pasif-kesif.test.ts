import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  AKTIF_ISLEM_YASAKLARI, GORUNMEZ_GUN_VARSAYILAN, KESIF_ADIMLARI,
  KESIF_GRUPLARI, KESIF_GRUP_ACIKLAMASI, KESIF_GRUP_ADI, KESIF_GRUP_SINIFI,
  KESIF_KAYNAKLARI, KESIF_KAYNAK_KODLARI, KESIF_KAYNAK_SOZU,
  isBekleyen, kesifCumlesi, kesifDagilimi, kesifGrubu,
  type KesifDurusu,
} from '@/lib/varlik/pasifKesif';
import { ANAHTAR_GUCU, TEK_BASINA_ESLESMEZ } from '@/lib/entegrasyon/kesif';
import {
  KESIF_DISA_BASLIKLARI, kesifDisaAktarimi, type KesifSatiri,
} from '@/app/(kabuk)/(operasyonel)/kesif/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   OT-16b · Pasif cihaz keşfi

   Bu dosyanın çivilediği kurallar:
     · ürün ağa aktif paket ATMAZ ve bu kütükte yazılıdır,
     · kaynak kütüğünde hiçbir ürün/satıcı adı geçmez,
     · eşleşme sırası seri > etiket > MAC > hostname'dir; IP TEK BAŞINA
       eşleşme kurmaz,
     · yedi grup dışlayıcıdır ve sayımları toplama eşittir,
     · keşfedilen cihaz kendiliğinden envantere GİRMEZ.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Kaynak kütüğü — kategori, ürün adı DEĞİL', () => {
  it('spesifikasyondaki bütün kaynak aileleri karşılanıyor', () => {
    for (const kod of ['siem', 'ag_izleme', 'firewall', 'switch_arp', 'arp',
      'dhcp', 'nac', 'edr', 'ot_discovery', 'historian']) {
      expect(KESIF_KAYNAK_KODLARI, kod).toContain(kod);
    }
  });

  it('her kaynağın ne VERDİĞİ ve ürünün ne YAPMADIĞI yazılıdır', () => {
    for (const k of KESIF_KAYNAKLARI) {
      expect(k.ad.length, k.kod).toBeGreaterThan(3);
      expect(k.verdigi.length, k.kod).toBeGreaterThan(20);
      expect(k.not.length, k.kod).toBeGreaterThan(20);
    }
  });

  it('kaynak kodları tekildir ve sözlük tam kapsar', () => {
    expect(new Set(KESIF_KAYNAK_KODLARI).size).toBe(KESIF_KAYNAK_KODLARI.length);
    for (const kod of KESIF_KAYNAK_KODLARI) expect(KESIF_KAYNAK_SOZU[kod]).toBeTruthy();
  });

  it('kütükte hiçbir SATICI ya da ÜRÜN adı geçmez', () => {
    /* Marka adı gömmek ürünü tek bir satıcıya çivilemek ve olmayan bir
       entegrasyonu varmış gibi göstermek olurdu. Kurum hangi ürünü
       kullanıyorsa çıktısı ilgili KATEGORİYE bağlanır. */
    const metin = KESIF_KAYNAKLARI
      .map((k) => `${k.ad} ${k.verdigi} ${k.not}`).join(' ').toLowerCase();
    const markalar = ['splunk', 'qradar', 'sentinel', 'crowdstrike', 'defender',
      'nessus', 'qualys', 'tenable', 'claroty', 'nozomi', 'dragos', 'forescout',
      'cisco', 'fortinet', 'palo alto', 'servicenow', 'solarwinds', 'zabbix'];
    for (const marka of markalar) expect(metin, marka).not.toContain(marka);
  });
});

describe('Aktif tarama yasağı — gerekçe teknik değil EMNİYET', () => {
  it('beş aktif işlem açıkça yasaklıdır ve her birinin gerekçesi vardır', () => {
    expect(AKTIF_ISLEM_YASAKLARI.length).toBeGreaterThanOrEqual(5);
    for (const y of AKTIF_ISLEM_YASAKLARI) {
      expect(y.islem.length).toBeGreaterThan(3);
      expect(y.neden.length).toBeGreaterThan(30);
    }
  });

  it('port taraması, SNMP denemesi, OT protokol sorgusu ve PLC yoklaması listede [KES-YSK-001]', () => {
    const metin = AKTIF_ISLEM_YASAKLARI.map((y) => y.islem).join(' ').toLowerCase();
    expect(metin).toContain('port tarama');
    expect(metin).toContain('snmp');
    expect(metin).toContain('modbus');
    expect(metin).toContain('plc');
  });

  it('keşif çekirdeği ağa çıkmadığını KODDA da beyan eder', () => {
    /* Bu bir yorum testi değil bir niyet testidir: dosya bir gün ağ
       çağrısı yapacak hâle gelirse, önce bu satırın silinmesi gerekir. */
    const kaynak = readFileSync(
      path.join(process.cwd(), 'lib/entegrasyon/kesif.ts'), 'utf8');
    expect(kaynak).toContain('bu dosya ağa çıkmaz');
  });
});

describe('İnsan onayı akışı', () => {
  it('beş adım tanımlıdır ve son adım ENVANTERdir', () => {
    expect(KESIF_ADIMLARI.map((a) => a.ad))
      .toEqual(['Tespit', 'Eşleştirme', 'Öneri', 'İnsan onayı', 'Envanter']);
  });

  it('öneri ile envanter arasında İNSAN ONAYI vardır [KES-ONY-001]', () => {
    const i = KESIF_ADIMLARI.findIndex((a) => a.ad === 'İnsan onayı');
    const oneri = KESIF_ADIMLARI.findIndex((a) => a.ad === 'Öneri');
    const envanter = KESIF_ADIMLARI.findIndex((a) => a.ad === 'Envanter');
    expect(oneri).toBeLessThan(i);
    expect(i).toBeLessThan(envanter);
  });
});

describe('Eşleşme sırası — IP tek başına kimlik DEĞİLDİR', () => {
  it('güç sırası seri > etiket > MAC > hostname > IP', () => {
    expect(ANAHTAR_GUCU.seri).toBeGreaterThan(ANAHTAR_GUCU.etiket);
    expect(ANAHTAR_GUCU.etiket).toBeGreaterThan(ANAHTAR_GUCU.mac);
    expect(ANAHTAR_GUCU.mac).toBeGreaterThan(ANAHTAR_GUCU.hostname);
    expect(ANAHTAR_GUCU.hostname).toBeGreaterThan(ANAHTAR_GUCU.ip);
  });

  it('IP ve üretici+model TEK BAŞINA eşleşme kuramaz [KES-ESL-001]', () => {
    /* DHCP adresi gezer: iki hafta önce bir kontrolörün olan adres bugün
       bir dizüstünde olabilir. */
    expect(TEK_BASINA_ESLESMEZ).toContain('ip');
    expect(TEK_BASINA_ESLESMEZ).toContain('uretici_model');
    expect(TEK_BASINA_ESLESMEZ).not.toContain('seri');
    expect(TEK_BASINA_ESLESMEZ).not.toContain('mac');
  });
});

/* ── Yedi grup ───────────────────────────────────────────────────────── */

function d(ek: Partial<KesifDurusu> = {}): KesifDurusu {
  return {
    cakisma: false,
    yetkiDurumu: 'bilinen',
    eslesenVar: true,
    eslesenSahipVar: true,
    tesisBilinen: true,
    gunGorulmedi: 0,
    gorunmezEsikGun: GORUNMEZ_GUN_VARSAYILAN,
    ...ek,
  };
}

describe('Yedi grup', () => {
  it('her grubun adı, açıklaması ve sınıfı vardır', () => {
    for (const g of KESIF_GRUPLARI) {
      expect(KESIF_GRUP_ADI[g]).toBeTruthy();
      expect(KESIF_GRUP_ACIKLAMASI[g].length).toBeGreaterThan(40);
      expect(KESIF_GRUP_SINIFI[g]).toBeTruthy();
    }
    expect(KESIF_GRUPLARI).toHaveLength(7);
  });

  it('yalnız "envanterde var + sahibi belli" iyi durumdur', () => {
    const iyiler = KESIF_GRUPLARI.filter((g) => KESIF_GRUP_SINIFI[g] === 'ok');
    expect(iyiler).toEqual(['envanterde_sahipli']);
  });

  it('temiz kayıt "envanterde sahipli" grubuna düşer', () => {
    expect(kesifGrubu(d())).toBe('envanterde_sahipli');
  });

  it('envanterde karşılığı olmayan cihaz ayrı gruptur [KES-GRP-001]', () => {
    expect(kesifGrubu(d({ eslesenVar: false, eslesenSahipVar: null })))
      .toBe('envanterde_yok');
  });

  it('envanterde var ama SAHİBİ YOK ayrı bir gruptur [KES-GRP-002]', () => {
    expect(kesifGrubu(d({ eslesenSahipVar: false }))).toBe('sahipsiz');
  });

  it('yetkisiz cihaz, envanterde karşılığı OLSA BİLE yetkisizdir', () => {
    /* "Eşleşti" bir cihazın ağda olması gerektiğini KANITLAMAZ; iki soru
       ayrıdır ve karıştırılırsa en tehlikeli hâl doğar. */
    expect(kesifGrubu(d({ yetkiDurumu: 'yetkisiz' }))).toBe('yetkisiz');
  });

  it('kimlik çakışması diğer bütün tariflerin ÖNÜNE geçer [KES-GRP-003]', () => {
    /* Kimliği belirsiz bir kayıt üzerinde verilen her karar yanlış cihazı
       vurabilir. */
    expect(kesifGrubu(d({
      cakisma: true, yetkiDurumu: 'yetkisiz', eslesenVar: false,
      eslesenSahipVar: null, tesisBilinen: false, gunGorulmedi: 999,
    }))).toBe('kimlik_cakismasi');
  });

  it('eşik aşılınca "görülmüyor" — ama sahipsizlik önce gelir', () => {
    expect(kesifGrubu(d({ gunGorulmedi: 45 }))).toBe('gorulmuyor');
    expect(kesifGrubu(d({ gunGorulmedi: 45, eslesenSahipVar: false })))
      .toBe('sahipsiz');
  });

  it('eşik tam sınırda "görülmüyor" sayılır, bir gün altında sayılmaz', () => {
    expect(kesifGrubu(d({ gunGorulmedi: 30 }))).toBe('gorulmuyor');
    expect(kesifGrubu(d({ gunGorulmedi: 29 }))).toBe('envanterde_sahipli');
  });

  it('eşik konsoldan gelir — 30 gün koda gömülü değildir [KES-GRP-004]', () => {
    expect(kesifGrubu(d({ gunGorulmedi: 10, gorunmezEsikGun: 7 })))
      .toBe('gorulmuyor');
    expect(kesifGrubu(d({ gunGorulmedi: 10, gorunmezEsikGun: 90 })))
      .toBe('envanterde_sahipli');
  });

  it('santrali çözülemeyen kayıt gizlenmez, kendi grubuna düşer [KES-GRP-005]', () => {
    expect(kesifGrubu(d({ tesisBilinen: false }))).toBe('yeri_belirsiz');
  });

  it('gruplar DIŞLAYICIDIR: dağılım toplama eşittir', () => {
    const kayitlar = [
      d(), d(), d({ cakisma: true }), d({ yetkiDurumu: 'yetkisiz' }),
      d({ eslesenVar: false, eslesenSahipVar: null }),
      d({ eslesenSahipVar: false }), d({ gunGorulmedi: 99 }),
      d({ tesisBilinen: false }),
    ];
    const dag = kesifDagilimi(kayitlar);
    const toplam = KESIF_GRUPLARI.reduce((t, g) => t + dag[g], 0);
    expect(toplam).toBe(kayitlar.length);
    expect(dag.envanterde_sahipli).toBe(2);
    expect(isBekleyen(dag)).toBe(6);
  });

  it('boş kümede hiçbir grup sayılmaz ve cümle "her şey yolunda" der', () => {
    const dag = kesifDagilimi([]);
    expect(isBekleyen(dag)).toBe(0);
    expect(kesifCumlesi(dag)).toMatch(/örtüşüyor/);
  });

  it('özet cümlesi ÖNCE en acil grubu söyler', () => {
    expect(kesifCumlesi(kesifDagilimi([d({ cakisma: true }), d({ eslesenSahipVar: false })])))
      .toMatch(/çakışma çözülmeden/);
    expect(kesifCumlesi(kesifDagilimi([d({ yetkiDurumu: 'yetkisiz' })])))
      .toMatch(/yetkisiz/);
    expect(kesifCumlesi(kesifDagilimi([d({ eslesenVar: false, eslesenSahipVar: null })])))
      .toMatch(/kendiliğinden eklenmez/);
    expect(kesifCumlesi(kesifDagilimi([d({ eslesenSahipVar: false })])))
      .toMatch(/sorumlusu yok/);
  });
});

/* ── Dışa aktarım ────────────────────────────────────────────────────── */

const ornekSatir = (ek: Partial<KesifSatiri> = {}): KesifSatiri => ({
  id: 'k1', kaynak: 'switch_arp', kaynakKayitId: 'port-3/14',
  durum: 'inceleme_bekliyor', connectorAd: null,
  konu: 'PLC-HAT2', alt: 'mac 00:1B:1B:00:00:01',
  guvenSkoru: null, kaynakGuveni: null, eslestirilmedi: false,
  eslesmeAnahtari: null, eslesen: null, adaylar: [], cakisma: false,
  gerekce: 'Eşleşme bulunamadı.', gozlemAlanlari: [],
  ilkGorulme: '2026-08-01T09:00:00.000Z',
  sonGorulme: '2026-08-20T09:00:00.000Z',
  gunGorulmedi: 3, inceleyen: null, incelemeZamani: null, incelemeNotu: null,
  kararVerilebilir: false, yetkiDurumu: 'karar_verilmedi', yetkiGerekcesi: null,
  yetkiKararVeren: null, yetkiKararZamani: null,
  ouiOnEki: null, ouiUretici: null, otProtokolu: null,
  tesisId: null, tesisKod: null,
  ...ek,
});

describe('Keşif dışa aktarımı', () => {
  it('başlık satırı + kayıt başına bir satır', () => {
    const tablo = kesifDisaAktarimi([ornekSatir(), ornekSatir({ id: 'k2' })], 30);
    expect(tablo).toHaveLength(3);
    expect(tablo[0]).toEqual([...KESIF_DISA_BASLIKLARI]);
    expect(tablo[1]).toHaveLength(KESIF_DISA_BASLIKLARI.length);
  });

  it('grup adı dosyanın İLK sütunudur', () => {
    const t = kesifDisaAktarimi([ornekSatir()], 30);
    expect(t[0]![0]).toBe('Grup');
    expect(t[1]![0]).toBe(KESIF_GRUP_ADI.envanterde_yok);
  });

  it('"ölçülmedi" dosyaya SIFIR olarak yazılmaz', () => {
    const t = kesifDisaAktarimi([ornekSatir({ guvenSkoru: null })], 30);
    const i = KESIF_DISA_BASLIKLARI.indexOf('Eşleşme güveni');
    expect(t[1]![i]).toBe('ölçülmedi');
    expect(t[1]![i]).not.toBe(0);
  });

  it('sahipsiz eşleşme dosyada AÇIKÇA "SAHİPSİZ" yazar', () => {
    const t = kesifDisaAktarimi([ornekSatir({
      eslesen: { id: 'v1', etiket: 'VAR-1', ad: 'Kontrolör', tesisId: 't1',
        sahipVar: false, sahipAd: null },
    })], 30);
    const i = KESIF_DISA_BASLIKLARI.indexOf('Sahip');
    expect(t[1]![i]).toBe('SAHİPSİZ');
    expect(t[1]![0]).toBe(KESIF_GRUP_ADI.sahipsiz);
  });

  it('eşik dosyaya da yansır: aynı kayıt farklı eşikte farklı gruba düşer', () => {
    const s = ornekSatir({
      gunGorulmedi: 10,
      eslesen: { id: 'v1', etiket: 'VAR-1', ad: 'Kontrolör', tesisId: 't1',
        sahipVar: true, sahipAd: 'Bir Kişi' },
      tesisId: 't1', tesisKod: 'SAN-1',
    });
    expect(kesifDisaAktarimi([s], 7)[1]![0]).toBe(KESIF_GRUP_ADI.gorulmuyor);
    expect(kesifDisaAktarimi([s], 90)[1]![0]).toBe(KESIF_GRUP_ADI.envanterde_sahipli);
  });
});
