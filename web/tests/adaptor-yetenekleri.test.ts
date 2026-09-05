import { describe, expect, it } from 'vitest';
import { ADAPTORLER, ADAPTOR_TIPLERI } from '@/lib/entegrasyon/adaptorler';
import {
  YETENEKLER, type Adaptor, type Yetenek,
} from '@/lib/entegrasyon/sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   OT-21b · Adaptör yetenek beyanı

   "Bu kaynak bağlanınca hangi ekran canlanır" sorusunun cevabı yorumda
   değil VERİDE durur. Bu dosyanın çivilediği kurallar:

     · her adaptör yeteneklerini AÇIKÇA beyan eder,
     · beyan edilen her yetenek kütükte tanımlıdır,
     · beyan bir BAĞLANTI İDDİASI DEĞİLDİR — yeteneği olan adaptör bile
       bağlı değilse ekran "kaynak bağlı değil" yazar,
     · dosya aktarımı bir AKIŞ değildir: `asset_state` beyan etmez,
     · pasif keşif yeteneği aktif tarama anlamına GELMEZ.
   ═══════════════════════════════════════════════════════════════════════ */

const adaptor = (tip: string) => ADAPTORLER[tip as keyof typeof ADAPTORLER] as Adaptor;

describe('Yetenek kütüğü', () => {
  it('her adaptör en az bir yetenek beyan eder', () => {
    for (const tip of ADAPTOR_TIPLERI) {
      expect(adaptor(tip).yetenekler.length, tip).toBeGreaterThan(0);
    }
  });

  it('beyan edilen her yetenek kütükte TANIMLIDIR', () => {
    for (const tip of ADAPTOR_TIPLERI) {
      for (const y of adaptor(tip).yetenekler) {
        expect(YETENEKLER, `${tip}/${y}`).toContain(y);
      }
    }
  });

  it('aynı yetenek bir adaptörde iki kez yazılmaz', () => {
    for (const tip of ADAPTOR_TIPLERI) {
      const y = adaptor(tip).yetenekler;
      expect(new Set(y).size, tip).toBe(y.length);
    }
  });

  it('her yeteneğin en az bir adaptörü vardır — ölü kod yok', () => {
    for (const y of YETENEKLER) {
      const sahipler = ADAPTOR_TIPLERI.filter((t) => adaptor(t).yetenekler.includes(y));
      expect(sahipler.length, y).toBeGreaterThan(0);
    }
  });
});

describe('Yetenek beyanı bir BAĞLANTI iddiası değildir', () => {
  it('canlı duruş besleyebilecek adaptörlerin hiçbiri BAĞLI DEĞİL', () => {
    /* Bu ürünün en pahalı yalanı, bağlı olmayan bir kaynağın önüne
       "canlı" yazmaktır. Yetenek beyanı yalnız "bağlanırsa ne olur"
       sorusunu cevaplar; bağlantının kendisi kurulum işidir. */
    const durusVerenler = ADAPTOR_TIPLERI
      .filter((t) => adaptor(t).yetenekler.includes('asset_state'));
    expect(durusVerenler.length).toBeGreaterThan(0);
    for (const tip of durusVerenler) {
      expect(adaptor(tip).baglanabilir, tip).toBe(false);
    }
  });

  it('elle aktarım bir AKIŞ değildir: canlı duruş beyan etmez', () => {
    /* Bir dışa aktarım dosyası ne kadar yeni olursa olsun anlık ölçüm
       değildir; `asset_state` beyan etseydi ekran ona tazelik eşiği
       uygular ve elle yüklenen bir dosyayı "canlı" gösterebilirdi. */
    expect(adaptor('manual_import').yetenekler).not.toContain('asset_state');
    expect(adaptor('manual_import').baglanabilir).toBe(true);
  });

  it('dizin ürünü canlı duruş beyan etmez — hesabı bilir, cihazın içini bilmez', () => {
    expect(adaptor('ad_entra').yetenekler).not.toContain('asset_state');
    expect(adaptor('ad_entra').yetenekler).toContain('access_observation');
  });
});

describe('Pasif keşif yeteneği AKTİF TARAMA anlamına gelmez', () => {
  it('pasif keşif beyan eden adaptörler vardır', () => {
    const pasifler = ADAPTOR_TIPLERI
      .filter((t) => adaptor(t).yetenekler.includes('passive_asset_discovery'));
    expect(pasifler.length).toBeGreaterThan(0);
  });

  it('hiçbir adaptör aktif tarama yeteneği beyan EDEMEZ — kütükte yoktur [KES-YSK-002]', () => {
    /* OT emniyeti: port tarama, SNMP deneme, Modbus sorgusu ve PLC
       yoklaması ürünün yetenek kütüğünde YOKTUR. Bir adaptörün böyle bir
       şey beyan edebilmesi için önce bu listenin değişmesi gerekir ve
       o değişiklik bu testi düşürür. */
    const yasak = ['active_scan', 'port_scan', 'snmp_probe', 'modbus_scan', 'plc_probe'];
    for (const y of yasak) {
      expect(YETENEKLER as readonly string[]).not.toContain(y);
    }
    for (const tip of ADAPTOR_TIPLERI) {
      for (const y of adaptor(tip).yetenekler as readonly Yetenek[]) {
        expect(yasak, `${tip}/${y}`).not.toContain(y);
      }
    }
  });
});
