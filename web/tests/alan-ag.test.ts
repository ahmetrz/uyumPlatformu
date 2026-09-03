import { describe, expect, it } from 'vitest';
import {
  adresCozumle, adresMetni, adresSayisi, ayniAdresMi, cakisirMi, icindeMi,
  ozelAdresMi, subnetCozumle,
} from '@/lib/alan/ag';

/* Ağ bölgesi tutarlılığı (OT-11) ve envanter veri kalitesi (OT-44) bu
   matematiğe dayanır. Kusur burada olursa kural motoru ya olmayan bulgu
   üretir ya da gerçek bulguyu hiç görmez. */

describe('IP çözümleme', () => {
  it('geçerli IPv4 adresleri çözümlenir', () => {
    for (const ip of ['0.0.0.0', '10.0.0.1', '192.168.1.254', '255.255.255.255']) {
      expect(adresCozumle(ip)?.aile, ip).toBe('ipv4');
    }
  });

  it('geçersiz IPv4 REDDEDİLİR', () => {
    for (const ip of ['256.0.0.1', '1.2.3', '1.2.3.4.5', '1.2.3.-1', 'a.b.c.d', '', '1.2.3.']) {
      expect(adresCozumle(ip), ip).toBeNull();
    }
  });

  it('baştaki sıfırlı sekizli REDDEDİLİR — belirsiz girdi kabul edilmez', () => {
    /* "010" bazı yığınlarda sekizlik okunur ve 8 eder. İki farklı okuma
       varsa doğru davranış tahmin etmek değil, reddetmektir. */
    expect(adresCozumle('010.0.0.1')).toBeNull();
    expect(adresCozumle('192.168.01.1')).toBeNull();
  });

  it('IPv6 adresleri, kısaltmalar dahil çözümlenir', () => {
    for (const ip of ['::1', '::', 'fe80::1', '2001:db8::8a2e:370:7334',
      '2001:0db8:0000:0000:0000:8a2e:0370:7334']) {
      expect(adresCozumle(ip)?.aile, ip).toBe('ipv6');
    }
  });

  it('IPv6 kısaltması ile açık yazım AYNI adrestir', () => {
    expect(ayniAdresMi('2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(true);
    expect(ayniAdresMi('::1', '0:0:0:0:0:0:0:1')).toBe(true);
  });

  it('iki kez "::" içeren IPv6 REDDEDİLİR', () => {
    expect(adresCozumle('2001::db8::1')).toBeNull();
  });

  it('kanonik metin gösterimi girdi biçiminden bağımsızdır', () => {
    const a = adresCozumle('10.0.0.1');
    expect(a && adresMetni(a)).toBe('10.0.0.1');
    const b = adresCozumle('::1');
    expect(b && adresMetni(b)).toBe('0:0:0:0:0:0:0:1');
  });
});

describe('Subnet çözümleme · /24 dışındaki maskeler', () => {
  it('ağ adresi maske uygulanarak bulunur', () => {
    /* "İlk üç sekizli aynıysa aynı ağ" sezgisinin yanlış olduğu yer. */
    const s = subnetCozumle('10.1.2.130/25');
    expect(s?.ag).toBe(subnetCozumle('10.1.2.128/25')?.ag);
  });

  it('aralık uçları doğru hesaplanır', () => {
    expect(adresSayisi('10.0.0.0/24')).toBe(BigInt(256));
    expect(adresSayisi('10.0.0.0/22')).toBe(BigInt(1024));
    expect(adresSayisi('10.0.0.0/30')).toBe(BigInt(4));
    expect(adresSayisi('10.0.0.1/32')).toBe(BigInt(1));
    expect(adresSayisi('0.0.0.0/0')).toBe(BigInt(4294967296));
  });

  it('geçersiz önek uzunluğu REDDEDİLİR', () => {
    for (const c of ['10.0.0.0/33', '10.0.0.0/-1', '10.0.0.0/', '10.0.0.0', '10.0.0.0/abc']) {
      expect(subnetCozumle(c), c).toBeNull();
    }
    expect(subnetCozumle('::/129')).toBeNull();
    expect(subnetCozumle('::/128')).not.toBeNull();
  });
});

describe('IP ⊂ subnet · zone dışı IP kuralının çekirdeği', () => {
  it('/24 sınırları', () => {
    expect(icindeMi('10.0.0.1', '10.0.0.0/24')).toBe(true);
    expect(icindeMi('10.0.0.255', '10.0.0.0/24')).toBe(true);
    expect(icindeMi('10.0.1.0', '10.0.0.0/24')).toBe(false);
  });

  it('/22 sınırları — sezginin yanıldığı yer', () => {
    /* 10.0.0.0/22 = 10.0.0.0 – 10.0.3.255. "İlk üç sekizli" sezgisi
       10.0.1.5'i dışarıda sanırdı; değil. */
    expect(icindeMi('10.0.1.5', '10.0.0.0/22')).toBe(true);
    expect(icindeMi('10.0.3.255', '10.0.0.0/22')).toBe(true);
    expect(icindeMi('10.0.4.0', '10.0.0.0/22')).toBe(false);
  });

  it('/25 ikiye böler', () => {
    expect(icindeMi('10.1.2.127', '10.1.2.0/25')).toBe(true);
    expect(icindeMi('10.1.2.128', '10.1.2.0/25')).toBe(false);
    expect(icindeMi('10.1.2.128', '10.1.2.128/25')).toBe(true);
  });

  it('IPv6 kapsama çalışır', () => {
    expect(icindeMi('2001:db8::5', '2001:db8::/32')).toBe(true);
    expect(icindeMi('2001:db9::5', '2001:db8::/32')).toBe(false);
  });

  it('ÇÖZÜMLENEMEZ ve AİLE UYUŞMAZLIĞI null döner — "değil" DEĞİL', () => {
    /* Bu ayrım kural motorunun dürüstlüğüdür: çözümlenemeyen bir kaydı
       "zone dışı" diye bulguya çevirmek, bilinmeyeni kusura çevirmektir. */
    expect(icindeMi('bilinmiyor', '10.0.0.0/24')).toBeNull();
    expect(icindeMi(null, '10.0.0.0/24')).toBeNull();
    expect(icindeMi('10.0.0.1', 'bozuk')).toBeNull();
    expect(icindeMi('2001:db8::1', '10.0.0.0/24')).toBeNull();  // aile farkı
  });
});

describe('Subnet çakışması · çift IP\'nin en sık sebebi', () => {
  it('iç içe ve kesişen aralıklar çakışır', () => {
    expect(cakisirMi('10.0.0.0/24', '10.0.0.0/25')).toBe(true);
    expect(cakisirMi('10.0.0.0/22', '10.0.2.0/24')).toBe(true);
    expect(cakisirMi('10.0.0.0/24', '10.0.0.128/25')).toBe(true);
  });

  it('komşu ama ayrık aralıklar çakışmaz', () => {
    expect(cakisirMi('10.0.0.0/24', '10.0.1.0/24')).toBe(false);
    expect(cakisirMi('10.1.2.0/25', '10.1.2.128/25')).toBe(false);
  });

  it('çakışma bakışımlıdır', () => {
    const ciftler: [string, string][] = [
      ['10.0.0.0/24', '10.0.0.0/25'], ['10.0.0.0/24', '10.0.1.0/24'],
      ['10.0.0.0/22', '10.0.2.0/24'], ['0.0.0.0/0', '10.0.0.0/8'],
    ];
    for (const [a, b] of ciftler) {
      expect(cakisirMi(a, b), `${a} ↔ ${b}`).toBe(cakisirMi(b, a));
    }
  });

  it('farklı aileler çakışmaz, çözümlenemeyen null döner', () => {
    expect(cakisirMi('10.0.0.0/8', '2001:db8::/32')).toBe(false);
    expect(cakisirMi('bozuk', '10.0.0.0/8')).toBeNull();
  });
});

describe('Çift IP · metin karşılaştırması yetmez', () => {
  it('aynı adresin farklı yazımları AYNI sayılır', () => {
    expect(ayniAdresMi('10.0.0.1', '10.0.0.1')).toBe(true);
    expect(ayniAdresMi(' 10.0.0.1 ', '10.0.0.1')).toBe(true);
  });

  it('farklı adresler ayrılır', () => {
    expect(ayniAdresMi('10.0.0.1', '10.0.0.2')).toBe(false);
  });

  it('çözümlenemeyen taraf null döner', () => {
    expect(ayniAdresMi('bilinmiyor', '10.0.0.1')).toBeNull();
  });
});

describe('Özel adres · internet maruziyetinin girdisi', () => {
  it('RFC1918 blokları özeldir', () => {
    for (const ip of ['10.0.0.1', '172.16.0.1', '172.31.255.254', '192.168.1.1', '127.0.0.1']) {
      expect(ozelAdresMi(ip), ip).toBe(true);
    }
  });

  it('genel adresler özel değildir', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1']) {
      expect(ozelAdresMi(ip), ip).toBe(false);
    }
  });

  it('IPv6 ULA ve link-local özeldir', () => {
    expect(ozelAdresMi('fd00::1')).toBe(true);
    expect(ozelAdresMi('fe80::1')).toBe(true);
    expect(ozelAdresMi('2001:db8::1')).toBe(false);
  });

  it('çözümlenemeyen adres null döner', () => {
    expect(ozelAdresMi('bilinmiyor')).toBeNull();
    expect(ozelAdresMi(null)).toBeNull();
  });
});
