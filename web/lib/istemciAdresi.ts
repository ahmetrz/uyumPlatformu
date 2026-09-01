import 'server-only';
import { headers } from 'next/headers';

/* ═══════════════════════════════════════════════════════════════════════
   İSTEMCİ ADRESİ — güvenilir vekil sözleşmesi

   ── KAPATILAN KUSUR ────────────────────────────────────────────────────
   Önceki `lib/girisKorumasi.ts:istemciAdresi()` `x-forwarded-for`ın İLK
   girdisini koşulsuz istemci sayıyordu ve kendi yorumunda bu değerin
   "istemci tarafından uydurulabileceğini" kabul ediyordu. Bu kabul bir
   uyarı değil, bir DELİKTİ: oran sınırı kovası doğrudan o değerden
   üretildiği için saldırgan her istekte başka bir `X-Forwarded-For`
   göndererek HER İSTEK İÇİN YENİ BİR KOVA açtırıyordu. Adres başına sınır
   hiç dolmuyordu; kimlik doldurma (credential stuffing) koruması —
   ki hesap sayacının hiç görmediği tek saldırı odur, çünkü her denemede
   BAŞKA hesap denenir — tamamen kâğıt üzerinde kalıyordu.

   Bir başlık, ancak onu YAZANIN kim olduğu biliniyorsa kanıttır. Dağıtım
   topolojisi (önde ters vekil var mı, kaç tane) bu depoda BİLİNMİYOR ve
   BURADA UYDURULMAZ. Bu yüzden modül bir topoloji varsaymaz; topolojiyi
   işletmeden `TRUST_PROXY` ile AÇIKÇA ister.

   ── SÖZLEŞME (TRUST_PROXY) ─────────────────────────────────────────────
   Değer                         Anlam
   ─────────────────────────────────────────────────────────────────────
   (tanımsız) | '' | 0 | off |   GÜVENME (VARSAYILAN). Forwarded başlıklarına
   false | no | hayir | kapali   HİÇ bakılmaz. Adres yalnız — varsa — çağrı
                                 yolunun verdiği uzak eş adresinden gelir;
                                 yoksa `null` (bilinmiyor) döner.
   1 | on | true | yes | evet |  Zincirin SONUNDAN 1 atla: en yakın vekile
   acik                          güven.
   n  (0 ≤ n ≤ 32 tam sayı)      Zincirin sonundan n atla. n = 0, güvenmemeye
                                 eşittir.
   IP / CIDR listesi             Yalnız bu kaynaklardan GELEN forwarded
   (virgülle ayrılmış)           başlığı kabul et; zincir sağdan sola
                                 taranır, listedeki vekiller atlanır, ilk
                                 güvenilmeyen giriş istemcidir.
   ─────────────────────────────────────────────────────────────────────
   TANINMAYAN değer SESSİZCE GÜVENMEYE DÖNÜŞMEZ: politika `hatali` işaretiyle
   GÜVENMEME moduna düşer ve süreç ömründe BİR KEZ `console.error` ile
   günlüğe yazılır. Yanlış yazılmış bir ortam değişkeni, sessizce açılmış bir
   spoof kapısından iyidir; ama fark edilmeden de kalmamalıdır.

   ── "ATLAMA" NEDEN ZİNCİRİN SONUNDAN SAYILIR ───────────────────────────
   `X-Forwarded-For`ı her vekil, bağlantıyı KİMDEN aldıysa onu EKLEYEREK
   büyütür. Yani en yakın vekilin kendi adresi başlıkta HİÇ GÖRÜNMEZ; o,
   zincirin görünmeyen son halkasıdır (uygulamanın uzak eşi). Kavramsal
   zincir şudur:

       [ xff[0] … xff[m-1] , uzakEş ]        (soldan sağa: uzak → yakın)

   n atlama, bu zincirin sonundan n halkayı atmak demektir; geriye kalan son
   halka istemcidir → `xff[m - n]`. Örnek: tek vekil (n = 1) `xff = [istemci]`
   yazar; sondan bir atlanınca `xff[0]` kalır. İki vekil (n = 2) için
   `xff = [istemci, vekil1]`; `xff[0]` yine istemcidir.

   Zincir beyan edilen atlamadan KISAYSA (m < n) adres çözülmez: topoloji "n
   vekil var" diyor ama başlık daha az halka gösteriyor — bu ya yanlış
   yapılandırmadır ya da zincirin kırpılmasıdır. İkisinde de doğru cevap
   "bilinmiyor"dur, tahmin değil.

   ── LİSTE MODUNUN SINIRI (dürüstçe) ────────────────────────────────────
   "Yalnız şu kaynaklardan gelen başlığı kabul et" koşulu, ancak bağlantının
   UZAK EŞİ biliniyorsa DEĞERLENDİRİLEBİLİR. Next.js'in `headers()` API'si
   soket düzeyindeki uzak eşi vermez ve bu depo gerçek bir vekil/yük
   dengeleyici ile konuşmaz. Bu yüzden liste modu, uzak eşi BİLMEYEN bir
   çağrı yolunda (bugün: `istemciAdresi()` ve `istekAdresi()`) koşulu
   doğrulayamaz ve GÜVENMEMEye düşer — bir kez uyararak. Uzak eşi taşıyan bir
   çağrı yolu eklendiğinde `adresCoz(oku, uzakAdres)` ile mod kendiliğinden
   devreye girer. Uzak eşi bir başlıktan "okuyormuş gibi" yapmak, tam da
   kapatılan deliği geri açmak olurdu.

   ── BİLİNMİYOR ≠ 0.0.0.0 ───────────────────────────────────────────────
   Çözülemeyen adres `null` döner. `'unknown'`, `'0.0.0.0'` ya da `'::'` gibi
   bir dize UYDURULMAZ: bunlar geçerli birer adres gibi görünür, günlükte ve
   denetim izinde gerçek bir kaynakmış gibi okunur. `null`, çağıranı "bu
   bilgi yok" durumunu AÇIKÇA ele almaya zorlar.
   ═══════════════════════════════════════════════════════════════════════ */

/** Ayrıştırılacak azami başlık baytı. Aşan başlık AYRIŞTIRMAYA HİÇ GİRMEZ
    (bellek şişmesin) ve güvenilmez sayılır: kesilmiş bir zincirin hangi
    halkasının istemci olduğu bilinemez, tahmin edilmez. */
export const AZAMI_BASLIK_BAYT = 2048;

/** Zincirdeki azami halka. Gerçek dağıtımlarda vekil sayısı bir avuçtur;
    otuz ikiyi aşan zincir ya saldırıdır ya da döngüdür. */
export const AZAMI_ATLAMA = 32;

/* ═══ 1 · IP ayrıştırma ═══════════════════════════════════════════════ */

/** Kesin IPv4: dört ondalık sekizli, baştaki sıfır YOK (`01.2.3.4` sekizlik
    okuma belirsizliği yaratır ve bazı ayrıştırıcılarda başka adrese çözülür). */
function ipv4Mi(s: string): boolean {
  const p = s.split('.');
  if (p.length !== 4) return false;
  return p.every((o) =>
    /^\d{1,3}$/.test(o) && Number(o) <= 255 && (o === '0' || !o.startsWith('0')));
}

/** IPv6 grupları (8 × 16 bit) — geçersizse null. `::` sıkıştırması ve
    gömülü IPv4 (`::ffff:192.0.2.1`) desteklenir; bölge kimliği (`%eth0`)
    reddedilir: bir vekil zincirinde yerel arayüz adı işi yoktur. */
function ipv6Gruplari(ham: string): number[] | null {
  if (ham === '' || ham.includes('%')) return null;
  const cift = ham.split('::');
  if (cift.length > 2) return null;
  const sikistirilmis = cift.length === 2;

  const parcala = (b: string): string[] => (b === '' ? [] : b.split(':'));
  const sol = parcala(cift[0]);
  const sag = sikistirilmis ? parcala(cift[1]) : [];
  const tum = [...sol, ...sag];
  if (tum.some((g) => g === '')) return null; // ':::' ya da 'a::b:' gibi

  /* Gömülü IPv4 yalnız TÜM adresin son grubunda olabilir. */
  const genislet = (liste: string[]): string[] | null => {
    if (liste.length === 0) return liste;
    const son = liste[liste.length - 1];
    if (!son.includes('.')) return liste;
    if (!ipv4Mi(son)) return null;
    const o = son.split('.').map(Number);
    return [...liste.slice(0, -1),
      (((o[0] << 8) | o[1]) >>> 0).toString(16), (((o[2] << 8) | o[3]) >>> 0).toString(16)];
  };
  // Sıkıştırma varsa IPv4 sağ tarafta olmalı; sol tarafta ise adres bozuktur.
  if (sikistirilmis && sol.some((g) => g.includes('.'))) return null;
  const solG = sikistirilmis ? sol : genislet(sol);
  const sagG = sikistirilmis ? genislet(sag) : [];
  if (solG === null || sagG === null) return null;
  if ([...solG, ...sagG].some((g) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return null;

  if (sikistirilmis) {
    const bosluk = 8 - solG.length - sagG.length;
    if (bosluk < 1) return null; // '::' en az bir grubu temsil eder
    return [...solG, ...Array<string>(bosluk).fill('0'), ...sagG].map((g) => parseInt(g, 16));
  }
  return solG.length === 8 ? solG.map((g) => parseInt(g, 16)) : null;
}

const ipv6Mi = (s: string): boolean => ipv6Gruplari(s) !== null;

/**
 * Zincirdeki bir öğeyi tek bir kanonik IP'ye indirger; ayrıştırılamayan öğe
 * için `null`. Port ekleyen vekiller vardır (`1.2.3.4:5678`, `[::1]:8080`);
 * port kimliğin parçası değildir, atılır. Öğede başka herhangi bir şey varsa
 * (obfuscated `_gizli`, `unknown`, boş dize) öğe GEÇERSİZDİR — tahmin edilmez.
 */
export function ipNormalize(ham: string): string | null {
  const s = ham.trim();
  if (s === '') return null;

  if (s.startsWith('[')) {
    const kapanis = s.indexOf(']');
    if (kapanis < 0) return null;
    const kalan = s.slice(kapanis + 1);
    if (kalan !== '' && !/^:\d{1,5}$/.test(kalan)) return null;
    const ic = s.slice(1, kapanis);
    return ipv6Mi(ic) ? ic.toLowerCase() : null;
  }

  // 'a.b.c.d:port' — tek iki nokta ve nokta içeriyorsa IPv4 + port
  const ilkIkiNokta = s.indexOf(':');
  if (ilkIkiNokta > 0 && s.indexOf(':', ilkIkiNokta + 1) === -1 && s.includes('.')) {
    const adres = s.slice(0, ilkIkiNokta);
    const port = s.slice(ilkIkiNokta + 1);
    return /^\d{1,5}$/.test(port) && ipv4Mi(adres) ? adres : null;
  }

  if (ipv4Mi(s)) return s;
  return ipv6Mi(s) ? s.toLowerCase() : null;
}

/* ═══ 2 · CIDR blokları ═══════════════════════════════════════════════ */

/* Blok, adresin SÖZCÜKLERİ (IPv4: 4 × 8 bit, IPv6: 8 × 16 bit) ve önek
   uzunluğu olarak tutulur. BigInt bilerek KULLANILMIYOR: projenin derleme
   hedefi ES2017 ve BigInt sabitleri orada yok — tek bir yardımcı uğruna
   tüm projenin hedefini yükseltmek, kapsamı aşan bir yan etki olurdu. */
type AgBlogu = { tur: 4 | 6; sozcukler: number[]; sozcukBiti: number; uzunluk: number };

function adresSozcukleri(ip: string): { tur: 4 | 6; sozcukler: number[]; sozcukBiti: number } | null {
  if (ipv4Mi(ip)) return { tur: 4, sozcukler: ip.split('.').map(Number), sozcukBiti: 8 };
  const g = ipv6Gruplari(ip);
  return g ? { tur: 6, sozcukler: g, sozcukBiti: 16 } : null;
}

/** İki sözcük dizisinin ilk `uzunluk` biti aynı mı. */
function onekEsit(a: number[], b: number[], sozcukBiti: number, uzunluk: number): boolean {
  let kalan = uzunluk;
  for (let i = 0; i < a.length && kalan > 0; i++) {
    const bit = Math.min(sozcukBiti, kalan);
    const kaydir = sozcukBiti - bit;
    if ((a[i] >>> kaydir) !== (b[i] >>> kaydir)) return false;
    kalan -= bit;
  }
  return true;
}

/** `10.0.0.0/8`, `192.0.2.1` (tek adres = tam uzunluk), `2001:db8::/32`. */
function blokAyristir(ham: string): AgBlogu | null {
  const s = ham.trim();
  if (s === '') return null;
  const egik = s.indexOf('/');
  const ip = ipNormalize(egik < 0 ? s : s.slice(0, egik));
  if (ip === null) return null;
  const a = adresSozcukleri(ip);
  if (!a) return null;
  const tamBoy = a.tur === 4 ? 32 : 128;
  if (egik < 0) return { ...a, uzunluk: tamBoy };
  const uzunlukHam = s.slice(egik + 1);
  if (!/^\d{1,3}$/.test(uzunlukHam)) return null;
  const uzunluk = Number(uzunlukHam);
  return uzunluk <= tamBoy ? { ...a, uzunluk } : null;
}

function blokIceriyorMu(blok: AgBlogu, ip: string): boolean {
  const a = adresSozcukleri(ip);
  if (!a || a.tur !== blok.tur) return false;
  return onekEsit(a.sozcukler, blok.sozcukler, blok.sozcukBiti, blok.uzunluk);
}

/* ═══ 3 · Politika ════════════════════════════════════════════════════ */

export type VekilPolitikasi =
  /** Forwarded başlıklarına hiç bakılmaz. `hatali` doluysa sebep budur. */
  | { mod: 'guvenme'; hatali: string | null }
  /** Zincirin sonundan `atlama` halka atılır (1 ≤ atlama ≤ AZAMI_ATLAMA). */
  | { mod: 'atlama'; atlama: number }
  /** Yalnız bu bloklardan gelen bağlantının forwarded başlığı kabul edilir. */
  | { mod: 'liste'; bloklar: AgBlogu[] };

const KAPALI = new Set(['0', 'off', 'false', 'no', 'hayir', 'hayır', 'kapali', 'kapalı']);
const ACIK = new Set(['1', 'on', 'true', 'yes', 'evet', 'acik', 'açık']);

/** Ortam değişkenini politikaya çevirir. Saf: girdi dışında hiçbir şeye
    bakmaz, günlüğe yazmaz — böylece testten doğrudan çağrılabilir. */
export function vekilPolitikasiCozumle(ham: string | undefined): VekilPolitikasi {
  const s = (ham ?? '').trim();
  if (s === '') return { mod: 'guvenme', hatali: null };
  const kucuk = s.toLowerCase();
  if (KAPALI.has(kucuk)) return { mod: 'guvenme', hatali: null };
  if (ACIK.has(kucuk)) return { mod: 'atlama', atlama: 1 };

  if (/^\d+$/.test(kucuk)) {
    const n = Number(kucuk);
    if (n === 0) return { mod: 'guvenme', hatali: null };
    if (n > AZAMI_ATLAMA) {
      return { mod: 'guvenme',
        hatali: `atlama sayısı ${n} > azami ${AZAMI_ATLAMA}` };
    }
    return { mod: 'atlama', atlama: n };
  }

  /* Kalan tek geçerli biçim IP/CIDR listesidir. Öğelerden BİRİ bile
     ayrıştırılamıyorsa listenin tamamı reddedilir: yarısı anlaşılmış bir
     güven listesi, anlaşılmamış yarısı kadar tehlikelidir. */
  const parcalar = s.split(',').map((p) => p.trim()).filter((p) => p !== '');
  if (parcalar.length === 0) return { mod: 'guvenme', hatali: `çözümlenemedi: "${s}"` };
  const bloklar: AgBlogu[] = [];
  for (const p of parcalar) {
    const b = blokAyristir(p);
    if (!b) return { mod: 'guvenme', hatali: `geçersiz IP/CIDR öğesi: "${p}"` };
    bloklar.push(b);
  }
  return { mod: 'liste', bloklar };
}

let onbellek: VekilPolitikasi | null = null;
let uyarildi = false;

/** Süreç ömründe BİR KEZ uyarır. Sessiz yanlış yapılandırma, sessiz spoof
    kapısına eşdeğerdir; ama her istekte bağıran bir günlük de gürültüdür. */
function hataliyiBirKezBildir(sebep: string): void {
  if (uyarildi) return;
  uyarildi = true;
  console.error(
    `[istemciAdresi] TRUST_PROXY değeri anlaşılmadı (${sebep}); `
    + 'iletilen adres başlıklarına GÜVENİLMİYOR. Geçerli değerler: '
    + "0/off (varsayılan), 1/on, 0-32 arası tam sayı, ya da IP/CIDR listesi.",
  );
}

/** Etkin politika (ilk çağrıda ortamdan okunur, sonra önbellekten). */
export function vekilPolitikasi(): VekilPolitikasi {
  if (onbellek === null) {
    onbellek = vekilPolitikasiCozumle(process.env.TRUST_PROXY);
    if (onbellek.mod === 'guvenme' && onbellek.hatali) hataliyiBirKezBildir(onbellek.hatali);
  }
  return onbellek;
}

/** Testler ve yapılandırma yenilemesi için: önbelleği (ve "bir kez uyar"
    kilidini) düşürür; sonraki çağrı ortamı yeniden okur. */
export function vekilPolitikasiniSifirla(): void {
  onbellek = null;
  uyarildi = false;
}

/* ═══ 4 · Zincir çözümü ═══════════════════════════════════════════════ */

export type BaslikOkuyucu = (ad: string) => string | null | undefined;

/** Zincir ayrıştırma sonucu: `null` = zincir güvenilmez/bozuk (öğe atılmaz,
    ZİNCİRİN TAMAMI reddedilir — tek bozuk halka, sonrasının anlamını yok eder). */
function zinciriAyristir(ham: string | null | undefined): string[] | null {
  if (ham === null || ham === undefined) return null;

  /* KESME, burada "ayrıştırmaya hiç sokmama" biçimindedir. 2 KB'ı aşan bir
     başlığı önce bölüp sonra reddetmek, saldırganın seçtiği uzunlukta bir
     dizi AYIRMAK demektir — tam da kaçınılmak istenen bellek baskısı. Uzun
     başlık zaten güvenilmez sayılacağı için tek bir dizi bile ayrılmaz;
     çağıran `null` (bilinmiyor) görür, süreç çökmez. */
  if (ham.length > AZAMI_BASLIK_BAYT) return null;

  // split'in limiti: AZAMI_ATLAMA + 1 öğe okunursa sınır aşılmış demektir.
  const parcalar = ham.split(',', AZAMI_ATLAMA + 1);
  if (parcalar.length > AZAMI_ATLAMA) return null;

  const zincir: string[] = [];
  for (const p of parcalar) {
    const ip = ipNormalize(p);
    if (ip === null) return null; // boş öğe, geçersiz IP, 'unknown' → tamamı red
    zincir.push(ip);
  }
  return zincir.length > 0 ? zincir : null;
}

/**
 * İstemci adresini çözer. Politikanın izin verdiği kadarına bakar, gerisini
 * yok sayar; çözülemezse `null`.
 *
 * @param oku        başlık okuyucu (büyük/küçük harf duyarsız olmalı)
 * @param uzakAdres  bağlantının uzak eşi — çağrı yolu biliyorsa. Bilinmiyorsa
 *                   `null`/atlanır. UYDURULMAZ ve BİR BAŞLIKTAN OKUNMAZ.
 */
export function adresCoz(oku: BaslikOkuyucu, uzakAdres?: string | null): string | null {
  const politika = vekilPolitikasi();
  const es = uzakAdres ? ipNormalize(uzakAdres) : null;

  /* GÜVENME: tek meşru kaynak, taklit edilemeyen uzak eştir. Başlıklara
     bakılmaz — bakılsaydı bu modülün varlık sebebi ortadan kalkardı. */
  if (politika.mod === 'guvenme') return es;

  if (politika.mod === 'liste') {
    /* Koşul "başlığı YAZAN kim" üzerinedir; yazanı bilmeden koşul
       değerlendirilemez → güvenme (bkz. dosya başı "LİSTE MODUNUN SINIRI"). */
    if (es === null) {
      hataliyiBirKezBildir(
        'liste modu bağlantının uzak eşini gerektirir; bu çağrı yolu onu bilmiyor');
      return null;
    }
    if (!politika.bloklar.some((b) => blokIceriyorMu(b, es))) {
      // Bağlantı güvenilen vekillerden gelmiyor: başlığı yazan istemcinin
      // kendisidir; tek gerçek bilgi eşin adresidir.
      return es;
    }
    const zincir = zinciriAyristir(oku('x-forwarded-for'));
    if (zincir === null) {
      // Başlık yok ya da bozuk. Eş güvenilen bir vekil; `x-real-ip` onun
      // yazdığı tek değerli alandır.
      const gercek = ipNormalize(oku('x-real-ip') ?? '');
      return gercek ?? es;
    }
    /* Sağdan sola tara: güvenilen vekilleri atla, ilk güvenilmeyen halka
       istemcidir. Zincirin TAMAMI güvenilen bloklardaysa en soldaki halka
       (bilinen en dış adres) istemcidir. */
    for (let i = zincir.length - 1; i >= 0; i--) {
      if (!politika.bloklar.some((b) => blokIceriyorMu(b, zincir[i]))) return zincir[i];
    }
    return zincir[0];
  }

  /* ATLAMA: kavramsal zincir [ ...xff, uzakEş ]; sondan `atlama` halka
     atılır, kalan son halka istemcidir → xff[m - atlama]. */
  const n = politika.atlama;
  const zincir = zinciriAyristir(oku('x-forwarded-for'));
  if (zincir === null) {
    /* Zincir yok/bozuk. `x-real-ip` YALNIZ tek vekilde anlamlıdır: onu en
       yakın vekil yazar ve o yalnız KENDİ eşini bilir. n > 1 iken bu değer
       istemci değil, bir ara vekildir — kullanılırsa yanlış kovaya yazarız. */
    if (n === 1) {
      const gercek = ipNormalize(oku('x-real-ip') ?? '');
      if (gercek) return gercek;
    }
    return es;
  }
  const idx = zincir.length - n;
  if (idx < 0) return null;   // zincir beyan edilen topolojiden kısa → bilinmiyor
  return zincir[idx];
}

/* ═══ 5 · Çağrı yolları ═══════════════════════════════════════════════ */

/**
 * Sunucu bileşeni / server action bağlamındaki istemci adresi.
 * İstek bağlamı yoksa (arka plan işi, test) `null`.
 */
export async function istemciAdresi(): Promise<string | null> {
  try {
    const b = await headers();
    return adresCoz((ad) => b.get(ad));
  } catch {
    /* `headers()` istek dışında fırlatır; bu bir hata değil, "adres yok"tur. */
    return null;
  }
}

/** API uçlarındaki (`Request` elde olan) istemci adresi. */
export function istekAdresi(istek: Request): string | null {
  return adresCoz((ad) => istek.headers.get(ad));
}

/* ═══ 6 · Oran sınırı kovası ══════════════════════════════════════════ */

/**
 * Adres bilinmiyorken kullanılan kova etiketi.
 *
 * ── KARAR VE GEREKÇE ───────────────────────────────────────────────────
 * Adres `null` iken kovayı NEYE göre seçeceğimizin üç seçeneği vardı:
 *
 *   (a) Kovayı yine de başlıktan üret. — REDDEDİLDİ. Kapatılan kusur tam
 *       olarak budur: saldırgan her istekte başka başlık göndererek sınırsız
 *       kova açar. "Güvenmiyoruz ama kovayı yine de ondan seçelim" demek,
 *       güvenmemenin tek pratik sonucunu geri almaktır.
 *
 *   (b) Adres bilinmiyorsa adres sayacını hiç uygulama. — REDDEDİLDİ.
 *       Varsayılan politika GÜVENMEME olduğu için bu, adres boyutunu
 *       tamamen kapatırdı: kimlik doldurma (her denemede başka hesap)
 *       hiçbir sayaca takılmazdı. "Ölçemiyorum" ile "sınırsız" aynı şey
 *       değildir.
 *
 *   (c) TEK PAYLAŞILAN KOVA. — SEÇİLDİ. Kimliği çözülemeyen tüm çağıranlar
 *       ortak bir tavanı paylaşır; taklit edilmiş başlık bu tavandan KAÇIŞ
 *       SAĞLAMAZ, çünkü kova seçimine hiç girmez.
 *
 * (c)'nin bilinen bedeli, tek bir saldırganın paylaşılan tavanı doldurup
 * diğer kimliksiz çağıranları 429'a düşürebilmesidir. Bu bedel üç yerden
 * hafifletilir, ORTADAN KALKMAZ ve kalktığı iddia edilmez:
 *   1. Paylaşılan kovanın eşiği AYRIDIR ve tek bir adresinkinden çok daha
 *      geniştir (`GIRIS_BILINMEYEN_SINIRI` / `API_BILINMEYEN_SINIRI`):
 *      bu kova bir adresi değil, bir POPÜLASYONU temsil eder.
 *   2. Kimliği ÇÖZÜLEN çağıranlar (API jetonu sahipleri) kendi kovalarında
 *      kalır; paylaşılan kovanın dolması onları etkilemez.
 *   3. Girişte hesap başına sayaç bağımsız çalışmaya devam eder.
 * Doğru kalıcı çözüm bir topoloji kararıdır: `TRUST_PROXY` yapılandırılınca
 * adres gerçekten çözülür ve bu kova neredeyse hiç kullanılmaz.
 */
export const ADRES_BILINMIYOR = 'bilinmiyor';

/** Kova anahtarındaki adres bölümü. `null` → paylaşılan tek etiket. */
export const adresEtiketi = (adres: string | null): string => adres ?? ADRES_BILINMIYOR;

/** Adres bilinmiyor mu (kova eşiğini seçmek için). */
export const adresBilinmiyor = (adres: string | null): boolean => adres === null;
