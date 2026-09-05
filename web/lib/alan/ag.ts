/* ═══ IP · subnet · CIDR — SAF MANTIK ══════════════════════════════════

   Ağ bölgesi tutarlılığı (OT-11) ve envanter veri kalitesi (OT-44) aynı
   matematiği sorar: **bu IP bu subnet'in içinde mi, bu iki subnet
   çakışıyor mu?** Tek cevap burada.

   ── NİÇİN ELLE YAPILMAZ ───────────────────────────────────────────────
   "IP'nin ilk üç sekizlisi aynıysa aynı ağdadır" sezgisi /24 dışında
   her maskede yanlıştır ve OT ağlarında /22, /23, /25, /30 sıradandır.
   Yanlış maske, "zone dışı IP" kusurunu ya hiç görmez ya da olmayan
   kusur üretir; ikisi de kural motorunu güvenilmez yapar.

   ── ÇÖZÜMLENEMEZ ≠ UYUMSUZ ────────────────────────────────────────────
   Çözümlenemeyen bir adres `null` döner, `false` DEĞİL. `false`
   "bu IP bu ağda değil" demektir; çözümlenemeyen bir kayıt için bunu
   söylemek, bilinmeyeni bir bulguya çevirmektir.

   IPv4 ve IPv6 aynı çatı altında BigInt ile ölçülür; iki aile
   birbiriyle KIYASLANMAZ (null döner). */

export type IpAilesi = 'ipv4' | 'ipv6';

export type Adres = { aile: IpAilesi; deger: bigint; ham: string };

export type Subnet = {
  aile: IpAilesi;
  /** Ağ adresi (maske uygulanmış). */
  ag: bigint;
  /** Önek uzunluğu (IPv4: 0–32 · IPv6: 0–128). */
  uzunluk: number;
  /** Aralığın ilk ve son adresi (ağ ve yayın adresleri DAHİL). */
  ilk: bigint;
  son: bigint;
  ham: string;
};

const IPV4_BIT = 32;
const IPV6_BIT = 128;

/* BigInt DEĞİŞMEZLERİ (`0n`, `255n`) kullanılmıyor: `tsconfig.json`
   hedefi ES2017 ve TypeScript o hedefte `0n` sözdizimini reddeder
   (TS2737). Tüm projenin hedefini bu dosya için yükseltmek, tek bir
   modül uğruna derleme çıktısını değiştirmek olurdu; `BigInt()`
   çağrısı aynı değeri üretir ve her hedefte çalışır. */
const SIFIR = BigInt(0);
const BIR = BigInt(1);
const SEKIZ = BigInt(8);
const ONALTI = BigInt(16);
const OTUZIKI = BigInt(32);
const SEKIZLI_MASKE = BigInt(255);
const GRUP_MASKE = BigInt(0xffff);

/* ── IPv4 ──────────────────────────────────────────────────────────── */
function ipv4Cozumle(ham: string): bigint | null {
  const parcalar = ham.split('.');
  if (parcalar.length !== 4) return null;
  let deger = SIFIR;
  for (const p of parcalar) {
    /* Başında sıfır olan sekizli reddedilir: "010" bazı yığınlarda
       sekizlik okunur ve 8 eder. Belirsiz girdiyi kabul etmek yerine
       çözümlenemez saymak dürüsttür. */
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    deger = (deger << SEKIZ) | BigInt(n);
  }
  return deger;
}

/* ── IPv6 ──────────────────────────────────────────────────────────── */
function ipv6Cozumle(ham: string): bigint | null {
  const metin = ham.trim();
  if (!/^[0-9a-fA-F:.]+$/.test(metin)) return null;
  if ((metin.match(/::/g) ?? []).length > 1) return null;

  /* Kuyruğunda IPv4 gösterimi olabilir (::ffff:192.0.2.1). */
  let govde = metin;
  let kuyruk: bigint | null = null;
  const sonIki = govde.lastIndexOf(':');
  const sonParca = sonIki >= 0 ? govde.slice(sonIki + 1) : '';
  if (sonParca.includes('.')) {
    kuyruk = ipv4Cozumle(sonParca);
    if (kuyruk === null) return null;
    govde = govde.slice(0, sonIki + 1);
    if (govde.endsWith('::')) govde = govde.slice(0, -1);
    else govde = govde.slice(0, -1);
  }

  const [solHam, sagHam] = govde.includes('::') ? govde.split('::') : [govde, null];
  const sol = solHam ? solHam.split(':').filter((s) => s !== '') : [];
  const sag = sagHam ? sagHam.split(':').filter((s) => s !== '') : [];
  const kuyrukGrup = kuyruk === null ? 0 : 2;
  const toplam = sol.length + sag.length + kuyrukGrup;
  if (toplam > 8) return null;
  if (sagHam === null && kuyruk === null && sol.length !== 8) return null;
  if (sagHam === null && kuyruk !== null && toplam !== 8) return null;

  const bosluk = 8 - toplam;
  const gruplar = [...sol, ...Array(bosluk).fill('0'), ...sag];
  let deger = SIFIR;
  for (const g of gruplar) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    deger = (deger << ONALTI) | BigInt(parseInt(g, 16));
  }
  if (kuyruk !== null) deger = (deger << OTUZIKI) | kuyruk;
  return deger;
}

/** IP adresini çözümler; çözemezse null (uydurulmaz). */
export function adresCozumle(ham: string | null | undefined): Adres | null {
  if (typeof ham !== 'string') return null;
  const temiz = ham.trim();
  if (!temiz) return null;
  if (temiz.includes(':')) {
    const d = ipv6Cozumle(temiz);
    return d === null ? null : { aile: 'ipv6', deger: d, ham: temiz };
  }
  const d = ipv4Cozumle(temiz);
  return d === null ? null : { aile: 'ipv4', deger: d, ham: temiz };
}

/** `10.0.0.0/22` biçimini çözümler; çözemezse null. */
export function subnetCozumle(ham: string | null | undefined): Subnet | null {
  if (typeof ham !== 'string') return null;
  const temiz = ham.trim();
  const egik = temiz.lastIndexOf('/');
  if (egik < 0) return null;
  const adres = adresCozumle(temiz.slice(0, egik));
  const uzunlukHam = temiz.slice(egik + 1);
  if (!adres || !/^\d{1,3}$/.test(uzunlukHam)) return null;
  const uzunluk = Number(uzunlukHam);
  const bit = adres.aile === 'ipv4' ? IPV4_BIT : IPV6_BIT;
  if (uzunluk > bit) return null;

  const kayma = BigInt(bit - uzunluk);
  const maske = uzunluk === 0 ? SIFIR : ((BIR << BigInt(uzunluk)) - BIR) << kayma;
  const ag = adres.deger & maske;
  const son = ag | ((BIR << kayma) - BIR);
  return { aile: adres.aile, ag, uzunluk, ilk: ag, son, ham: temiz };
}

/**
 * IP bu subnet'in içinde mi?
 * `null` = çözümlenemedi ya da aileler farklı — "değil" DEĞİL.
 */
export function icindeMi(ip: string | null | undefined, subnet: string | null | undefined): boolean | null {
  const a = adresCozumle(ip);
  const s = subnetCozumle(subnet);
  if (!a || !s) return null;
  if (a.aile !== s.aile) return null;
  return a.deger >= s.ilk && a.deger <= s.son;
}

/**
 * İki subnet çakışıyor mu? Çakışma OT ağında yönlendirme kusurudur ve
 * envanterde çift IP'nin en sık sebebidir.
 * `null` = çözümlenemedi ya da aileler farklı.
 */
export function cakisirMi(a: string | null | undefined, b: string | null | undefined): boolean | null {
  const x = subnetCozumle(a);
  const y = subnetCozumle(b);
  if (!x || !y) return null;
  if (x.aile !== y.aile) return false;   // farklı aile çakışamaz
  return x.ilk <= y.son && y.ilk <= x.son;
}

/** Subnet'teki adreslenebilir aralık — /31 ve /32 özel durumdur. */
export function adresSayisi(subnet: string | null | undefined): bigint | null {
  const s = subnetCozumle(subnet);
  if (!s) return null;
  return s.son - s.ilk + BIR;
}

/** Adresi kanonik biçime getirir (IPv6 kısaltmaları tekilleşsin diye). */
export function adresMetni(a: Adres): string {
  if (a.aile === 'ipv4') {
    const p: string[] = [];
    for (let i = 3; i >= 0; i -= 1) p.push(String((a.deger >> BigInt(i * 8)) & SEKIZLI_MASKE));
    return p.join('.');
  }
  const gruplar: string[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    gruplar.push(((a.deger >> BigInt(i * 16)) & GRUP_MASKE).toString(16));
  }
  return gruplar.join(':');
}

/**
 * İki adres AYNI cihazı mı gösteriyor? Çift IP kontrolü metin
 * karşılaştırmasıyla yapılamaz: `10.0.0.1` ile `010.0.0.1` farklı
 * dizelerdir, `::1` ile `0:0:0:0:0:0:0:1` de öyle. Karşılaştırma
 * sayısal değer üzerinden yapılır.
 * `null` = biri çözümlenemedi.
 */
export function ayniAdresMi(a: string | null | undefined, b: string | null | undefined): boolean | null {
  const x = adresCozumle(a);
  const y = adresCozumle(b);
  if (!x || !y) return null;
  return x.aile === y.aile && x.deger === y.deger;
}

/** Özel (RFC1918 / ULA) adres mi? Internet maruziyeti kuralının girdisi. */
export function ozelAdresMi(ip: string | null | undefined): boolean | null {
  const a = adresCozumle(ip);
  if (!a) return null;
  if (a.aile === 'ipv4') {
    for (const blok of ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '169.254.0.0/16']) {
      if (icindeMi(a.ham, blok)) return true;
    }
    return false;
  }
  return icindeMi(a.ham, 'fc00::/7') === true || icindeMi(a.ham, 'fe80::/10') === true
    || a.deger === BIR;
}
