/**
 * Sinematik girişin zaman ve kamera modeli — saf matematik, DOM yok.
 *
 * Dört onaylı kare ayrı slaytlar değil, TEK bir optik eksende dizilmiş
 * pencerelerdir. Komşu iki karede aynı fiziksel hedef (kontrol binası,
 * sonra video duvarı, sonra ana ekran) ölçülmüştür; bu ölçüm iç kareyi
 * dış karenin dünya koordinatına yerleştirir (`dunyaKur`). Kamera tek bir
 * logaritmik zoom eğrisi üzerinde ilerler; bir kare görüntü alanını
 * kapladığı anda öndeki kareye çözünür ve iki kare çözünme boyunca AYNI
 * hedefi AYNI piksel dikdörtgeninde tutar. "Fotoğraf değişti" değil,
 * "aynı hedefe yaklaştım" hissi buradan gelir.
 */
export const SAHNELER = ['Dışarıdan yaklaşma', 'Kontrol binasına yaklaşma', 'Kontrol odasına giriş', 'Yönetim ekranı'] as const;
export const KARELER = ['uzak', 'yaklasma', 'bina', 'ekran'] as const;
export type Kare = (typeof KARELER)[number];
/** Görüntü alanı yüksekliğinin kaç katı kaydırma mesafesi ayrılır. */
export function kaydirmaKatsayisi(genislik: number) {
  return genislik < 700 ? 7.4 : genislik < 1100 ? 8.2 : 9.2;
}

export const sinirla = (n: number) => Math.min(1, Math.max(0, n));
export function aralik(p: number, a: number, b: number) {
  const t = sinirla((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Kare içinde normalize sınırlar: yatay değerler genişliğin, dikey değerler yüksekliğin oranı. */
export type Cerceve = { sol: number; sag: number; ust: number; alt: number };
/** Kare en-boy oranı; dört kare de 1600×900. */
export const KARE_ORANI = 9 / 16;

/** Son karedeki ana ekranın ölçülmüş sınırları (x 365–1235 · y 268–520 piksel). */
export const EKRAN: Cerceve = { sol: .228, sag: .772, ust: .298, alt: .578 };

/**
 * Komşu karelerde AYNI fiziksel hedefin ölçülmüş sınırları. `dis` dış (uzak)
 * karede, `ic` bir sonraki (yakın) karede aynı nesnedir. Piksel ölçümleri
 * 1600×900 kaynaktan alındı; sayılar `docs/SINEMATIK_GIRIS.md`de.
 */
export const BAGLAR: readonly { hedef: string; dis: Cerceve; ic: Cerceve }[] = [
  { hedef: 'kontrol binası', dis: { sol: .405, sag: .606, ust: .389, alt: .522 }, ic: { sol: .359, sag: .644, ust: .322, alt: .506 } },
  { hedef: 'kontrol binası', dis: { sol: .359, sag: .644, ust: .322, alt: .506 }, ic: { sol: .191, sag: .812, ust: .239, alt: .656 } },
  { hedef: 'video duvarı', dis: { sol: .409, sag: .597, ust: .394, alt: .472 }, ic: EKRAN },
];

type Nokta = { x: number; y: number };
/** Bir çözünme bandının başından sonuna iç karenin kaç kat büyüdüğü. */
export const COZUNME_BANDI = 1.45;
/** Son çözünme bitince canlı arayüzün ekran yüzeyinde belirdiği büyüme aralığı. */
export const ARAYUZ_BANDI = 1.42;
/** Arayüz tamamen görünür olduktan sonra ekran çerçevesinin görüntü alanını doldurduğu büyüme aralığı. */
export const IRIS_BANDI = 1.32;
const merkez = (c: Cerceve): Nokta => ({ x: (c.sol + c.sag) / 2, y: ((c.ust + c.alt) / 2) * KARE_ORANI });

export type Dunya = {
  /** Her karenin dünya ölçeği; ilk kare 1, sonrakiler küçülür. */
  olcek: number[];
  /** Her karenin sol üst köşesinin dünya konumu. */
  koken: Nokta[];
  /** Kamera odağının duraklama noktaları: ilk kare merkezi, sonra her bağın hedefi. */
  odaklar: Nokta[];
  /** Her bağın çözünme bandı: iç karenin kaplama ölçeği cinsinden [başlangıç, bitiş]. */
  bantlar: [number, number][];
};

/**
 * Dört kareyi tek dünya koordinatına diker. İç karenin ölçeği hedefin iki
 * karedeki genişlik ve yükseklik oranlarının geometrik ortalamasıdır;
 * konumu, hedef merkezlerini üst üste getirir.
 *
 * Çözünme bandı iç karenin görüntü alanını KAPLADIĞI andan başlar. Hedef
 * kare merkezinde değilse kare önce biraz daha büyümelidir: kenar payı
 * `(a-1)/(2a)` kadar, hedef sapması `d` ise `a ≥ 1/(1-2d)`.
 */
export function dunyaKur(baglar = BAGLAR): Dunya {
  const olcek = [1], koken: Nokta[] = [{ x: 0, y: 0 }];
  const odaklar: Nokta[] = [{ x: .5, y: KARE_ORANI / 2 }];
  const bantlar: [number, number][] = [];
  for (const bag of baglar) {
    const j = olcek.length - 1;
    const en = (bag.dis.sag - bag.dis.sol) / (bag.ic.sag - bag.ic.sol);
    const boy = (bag.dis.alt - bag.dis.ust) / (bag.ic.alt - bag.ic.ust);
    const s = olcek[j] * Math.sqrt(en * boy);
    const dis = merkez(bag.dis), ic = merkez(bag.ic);
    const hedef = { x: koken[j].x + olcek[j] * dis.x, y: koken[j].y + olcek[j] * dis.y };
    olcek.push(s);
    koken.push({ x: hedef.x - s * ic.x, y: hedef.y - s * ic.y });
    odaklar.push(hedef);
    const sapma = Math.max(Math.abs(ic.x - .5), Math.abs(ic.y / KARE_ORANI - .5));
    const a = Math.max(1.08, 1 / (1 - 2 * sapma)) * 1.03;
    bantlar.push([a, a * COZUNME_BANDI]);
  }
  return { olcek, koken, odaklar, bantlar };
}

export const DUNYA = dunyaKur();

/** Kamera hızı: yavaş başlar, ortada kontrollü hızlanır, sonda yine yavaşlar. */
export function hizEgrisi(p: number) {
  p = sinirla(p);
  return .76 * (1 - Math.cos(Math.PI * p)) / 2 + .24 * p;
}

/** Yolculuğun bittiği an: son karenin kaplama ölçeği (cihazdan bağımsız). */
export function bitisOlcegi(dunya: Dunya = DUNYA) {
  const [, sonBant] = dunya.bantlar[dunya.bantlar.length - 1];
  return sonBant * ARAYUZ_BANDI * IRIS_BANDI;
}

export type KareYeri = { x: number; y: number; en: number; boy: number; opaklik: number };
export type Poz = {
  p: number;
  /** Logaritmik yol üzerindeki normalize ilerleme. */
  yol: number;
  zoom: number;
  odak: Nokta;
  kareler: Record<Kare, KareYeri>;
  /** Son karenin ana ekranının piksel dikdörtgeni. */
  ekran: Cerceve;
  /** Canlı arayüzün ekran yüzeyinde görünürlüğü. */
  arayuz: number;
  /** Arayüz görünür olduktan sonra ekran çerçevesinin görüntü alanına açılma payı. */
  iris: number;
  metin: number;
  asama: number;
};

function odakSec(L: number, dunya: Dunya, sonL: number): Nokta {
  // Duraklar: her bağın bandı boyunca odak o bağın hedefidir; aralarda yumuşak geçiş.
  const duraklar: { bas: number; bit: number; nokta: Nokta }[] = [{ bas: -Infinity, bit: 0, nokta: dunya.odaklar[0] }];
  dunya.bantlar.forEach(([a, b], i) => {
    const s = dunya.olcek[i + 1];
    duraklar.push({ bas: Math.log(a / s), bit: Math.log(b / s), nokta: dunya.odaklar[i + 1] });
  });
  duraklar[duraklar.length - 1].bit = Math.max(duraklar[duraklar.length - 1].bit, sonL);
  for (let i = 0; i < duraklar.length - 1; i++) {
    const su = duraklar[i], sonra = duraklar[i + 1];
    if (L <= su.bit) return su.nokta;
    if (L < sonra.bas) {
      const t = aralik(L, su.bit, sonra.bas);
      return { x: su.nokta.x + (sonra.nokta.x - su.nokta.x) * t, y: su.nokta.y + (sonra.nokta.y - su.nokta.y) * t };
    }
  }
  return duraklar[duraklar.length - 1].nokta;
}

/**
 * Kaydırma oranı `p` için kameranın tam durumu. `w`/`h` sahne boyutudur;
 * dönen konumlar sahne pikselidir. İleri ve geri aynı `p` aynı pozu verir.
 */
export function poz(p: number, w = 1600, h = 900, dunya: Dunya = DUNYA): Poz {
  p = sinirla(p);
  const B = Math.max(w, h / KARE_ORANI); // 1 dünya birimi = kaplayan ilk karenin genişliği (px)
  const sonZoom = bitisOlcegi(dunya) / dunya.olcek[dunya.olcek.length - 1];
  const sonL = Math.log(sonZoom);
  const yol = hizEgrisi(p);
  const L = sonL * yol, zoom = Math.exp(L), ZB = zoom * B;

  // Katman opaklıkları: her bağ, iç karenin kaplama ölçeğine göre çözünür.
  const agirlik = dunya.olcek.map(() => 0);
  let kalan = 1;
  for (let i = dunya.bantlar.length - 1; i >= 0; i--) {
    const [a, b] = dunya.bantlar[i];
    const ic = aralik(Math.log(zoom * dunya.olcek[i + 1]), Math.log(a), Math.log(b));
    agirlik[i + 1] = kalan * ic; kalan *= 1 - ic;
  }
  agirlik[0] = kalan;

  // Odak: görünür karelerin tümünün görüntü alanını kapladığı aralığa sıkıştırılır.
  let odak = odakSec(L, dunya, sonL);
  let minX = -Infinity, maxX = Infinity, minY = -Infinity, maxY = Infinity;
  dunya.olcek.forEach((s, i) => {
    if (agirlik[i] <= 0) return;
    const o = dunya.koken[i];
    minX = Math.max(minX, o.x + w / (2 * ZB)); maxX = Math.min(maxX, o.x + s - w / (2 * ZB));
    minY = Math.max(minY, o.y + h / (2 * ZB)); maxY = Math.min(maxY, o.y + s * KARE_ORANI - h / (2 * ZB));
  });
  odak = {
    x: minX <= maxX ? Math.min(maxX, Math.max(minX, odak.x)) : (minX + maxX) / 2,
    y: minY <= maxY ? Math.min(maxY, Math.max(minY, odak.y)) : (minY + maxY) / 2,
  };

  const kareler = {} as Record<Kare, KareYeri>;
  KARELER.forEach((ad, i) => {
    const s = dunya.olcek[i], o = dunya.koken[i];
    kareler[ad] = {
      x: (o.x - odak.x) * ZB + w / 2, y: (o.y - odak.y) * ZB + h / 2,
      en: s * ZB, boy: s * ZB * KARE_ORANI, opaklik: agirlik[i],
    };
  });
  const son = kareler.ekran;
  const fiziksel = { sol: son.x + son.en * EKRAN.sol, sag: son.x + son.en * EKRAN.sag, ust: son.y + son.boy * EKRAN.ust, alt: son.y + son.boy * EKRAN.alt };

  // Arayüz, son kare TEK BAŞINA kaldıktan sonra ekran yüzeyinde belirir; üç katman asla üst üste gelmez.
  const [, sonBant] = dunya.bantlar[dunya.bantlar.length - 1];
  const ekranOlcegi = Math.log(zoom * dunya.olcek[dunya.olcek.length - 1]);
  const arayuz = aralik(ekranOlcegi, Math.log(sonBant * 1.02), Math.log(sonBant * ARAYUZ_BANDI));
  // Arayüz tamamen görününce ekran yüzeyi görüntü alanına açılır: çerçeve
  // dışarıda kalan bezel değil, kullanıcının görüş alanını dolduran ekrandır.
  const iris = aralik(ekranOlcegi, Math.log(sonBant * ARAYUZ_BANDI), Math.log(sonBant * ARAYUZ_BANDI * IRIS_BANDI));
  const ekran = {
    sol: Math.min(fiziksel.sol, fiziksel.sol * (1 - iris)), sag: Math.max(fiziksel.sag, fiziksel.sag + (w - fiziksel.sag) * iris),
    ust: Math.min(fiziksel.ust, fiziksel.ust * (1 - iris)), alt: Math.max(fiziksel.alt, fiziksel.alt + (h - fiziksel.alt) * iris),
  };
  let asama = 0;
  agirlik.forEach((a, i) => { if (a > agirlik[asama]) asama = i; });
  return { p, yol, zoom, odak, kareler, ekran, arayuz, iris, metin: 1 - aralik(yol, .035, .13), asama };
}

export const kaydirmaTamam = (offset: number, mesafe: number) => mesafe > 0 && offset >= mesafe - 1;

/** Fiziksel ekran yüzeyini canlı DOM arayüzüne bozmadan teslim eder. */
export function ekranYerlestir(rect: Cerceve, w: number, h: number) {
  const k = Math.min(1, Math.max((rect.sag - rect.sol) / w, (rect.alt - rect.ust) / h));
  const x = k === 1 ? 0 : (rect.sol + rect.sag - w * k) / 2;
  const y = k === 1 ? 0 : (rect.ust + rect.alt - h * k) / 2;
  return { k, x, y, sol: Math.max(0, (rect.sol - x) / k),
    sag: Math.max(0, (x + w * k - rect.sag) / k),
    ust: Math.max(0, (rect.ust - y) / k), boy: Math.min(h, (rect.alt - y) / k) };
}

/** Alt kare tam opak kalır: ortada iki yarım saydam katmanın ışık kaybı oluşmaz.
 * Üst kare hedef merkezinden açılır; yalnız yumuşak sınırda iki mimari görülür.
 * Koordinatlar görselin taban kutusundadır, kamera ölçeği maskeyi de taşır. */
export function gecisMaskesi(pay: number, merkezX: number, merkezY: number, en: number, boy: number) {
  const t = sinirla(pay);
  if (t >= 1) return 'none';
  const uzak = Math.hypot(Math.max(merkezX, en - merkezX), Math.max(merkezY, boy - merkezY));
  const kenar = uzak * .17;
  const yaricap = -kenar + t * (uzak + 2 * kenar);
  const ic = Math.max(0, yaricap - kenar), dis = Math.max(.01, yaricap + kenar);
  return `radial-gradient(circle at ${merkezX}px ${merkezY}px, #000 ${ic}px, transparent ${dis}px)`;
}
