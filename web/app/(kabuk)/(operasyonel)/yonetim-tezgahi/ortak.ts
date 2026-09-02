import type { Durum } from '@/components/kabuk/temel';
import { GOREV_TIP_ETIKET, etiketle, tarihTR } from '@/lib/sabitler';

/* M1/M2 · Yönetim tezgâhı — sunucu ve istemcinin PAYLAŞTIĞI tipler ve saf
   hesaplar. Eski /gorevler ve /tanimlar ekranlarının iş mantığı buraya
   taşındı; karar kuralları (yetki, doğrulama) sunucuda kaldı.

   BİRLEŞTİRME KARARI VE GEREKÇESİ
   ────────────────────────────────
   İki ekran tek CANVAS'a sığmıyor, bu yüzden KipDegistir ile ayrıldılar;
   tek tabloya indirilmediler. Gerekçe: iki ekran AYNI SORUYU sormuyor.

     · İş kuyruğu (M2) bozulabilir bir sorudur — "bugün kimin kararı
       bekleniyor?". Satırların ortak ekseni ZAMAN'dır (son tarih, bekleme).
     · Tanımlar (M1) bir yapılandırma sorusudur — "katalog doğru mu?".
       Satırların ortak ekseni KULLANIM'dır (kaça bağlı, zinciri kırıyor mu).

   Tek tabloya indirmek için ortak bir öncelik ekseni uydurmak gerekirdi:
   gecikmiş bir görev ile kırılımı atanmamış bir santral kaydını aynı
   sıralamaya sokan sayı yok. Yoğunluk sözleşmesi de (4 metrik, 5–9 satır)
   iki popülasyonu tek şeritte anlatmayı imkânsız kılıyor — metrik bütçesi
   tek başına dolardı. Bu yüzden kip ayrımı; buna karşılık HER KİPİN İÇİNDE
   gerçek bir birleştirme yapıldı:
     · İş kuyruğunda görev + onay talebi TEK tabloda (ikisi de "birinin
       eylemini bekleyen iş"; eski ekranda 2 tablo + 1 kart ızgarasıydı),
     · Tanımlarda beş katalog (santral, regülasyon, kapsam alanı, kırılım,
       sektör) TEK tabloda (eski ekranda 4 sekme + 2 kart ızgarası +
       2 tabloydu).
   Eski ekranların 9 <dialog> kipi ve 25 pill/kart kullanımı kalktı; yazma
   yüzeyleri 420px çekmeceye indi.

   ÜÇÜNCÜ KİP · API ANAHTARLARI (P1-3)
   ───────────────────────────────────
   Aynı gerekçe üçüncü kez geçerli: anahtarın ekseni ne ZAMAN ne KULLANIM,
   ERİŞİM'dir — "kim, hangi anahtarla, ne zamana kadar dışarıdan girebilir?".
   Bir anahtarı gecikmiş görevle ya da bağsız sektör kaydıyla aynı sıralamaya
   sokan sayı yok; metrik bütçesi de tek şeritte üç popülasyonu anlatamaz.
   Kipin kendi içinde birleştirme yine gerçek: anahtarın kimliği, sahipliği,
   ömrü ve trafiği (ApiIstegi sayacı) TEK tabloda okunur.

   Anahtar yönetimi yönetim tezgâhına ait, çünkü anahtar üretmek bir YETKİ
   kararıdır: anahtar kendi yetkisini taşımaz, SAHİBİNİN yetkilerini taşır. */

export type Kisi = { id: string; ad: string };
export type Kodlu = { id: string; kod: string; ad: string };

/* ═══ M2 · İş kuyruğu ═══════════════════════════════════════════════════ */

/** Görev ve onay talebi tek satır tipine indirgenir: ikisi de bir kişinin
    eylemini bekleyen iştir. `tur` hangi kütükten geldiğini söyler. */
export type Is = {
  /** 'g-<id>' | 'o-<id>' — iki kütüğün kimlikleri çakışmasın */
  id: string;
  kayitId: string;
  tur: 'gorev' | 'onay';
  baslik: string;
  tip: string;
  kaynakTipi: string | null;
  kaynakId: string | null;
  /** görevde sorumlu, onayda talebi açan */
  kisi: Kisi | null;
  tesis: Kodlu | null;
  sonTarih: string | null;
  durum: string;
  otomatik: boolean;
  olusturuldu: string;
  kapanis: string | null;
  gerekce: string | null;
  onaylayan: string | null;
  /** görevde durum değiştirebilir, onayda karar verebilir (sunucu hesabı) */
  yetkili: boolean;
};

/** Onay talebi tipleri — bu ekranın kendi sözlüğü (eylem katmanındaki
    eşlemenin görüntü kopyası). */
export const ONAY_TIP_ETIKET: Record<string, string> = {
  bulgu_kapanis: 'Bulgu kapanışı', risk_kabul: 'Risk kabulü', istisna: 'İstisna',
  proje_aday: 'Proje adayı', applicability_override: 'Uygulanabilirlik istisnası',
  proje_kapanis: 'Proje kapanışı',
};

export const GOREV_DURUMLARI = ['acik', 'yapiliyor', 'tamamlandi', 'iptal'] as const;
export const GOREV_DURUM_ETIKET: Record<string, string> = {
  acik: 'Açık', yapiliyor: 'Yapılıyor', tamamlandi: 'Tamamlandı', iptal: 'İptal',
};
export const ONAY_DURUM_ETIKET: Record<string, string> = {
  bekliyor: 'Karar bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi',
};

/** Son tarihe bu kadar ve daha az gün kalan görev "ufukta" sayılır. Sunucu
    tarafında karşılığı olan bir iş kuralı DEĞİL, yalnız görüntü eşiğidir. */
export const UFUK_GUN = 7;

export function isAcikMi(i: Is): boolean {
  return i.tur === 'gorev'
    ? i.durum === 'acik' || i.durum === 'yapiliyor'
    : i.durum === 'bekliyor';
}

/** Verilen ISO tarihe kalan gün; geçmişse negatif. */
export function kalanGun(t: string | null, simdi: number): number | null {
  if (!t) return null;
  const z = new Date(t).getTime();
  return Number.isNaN(z) ? null : Math.ceil((z - simdi) / 86_400_000);
}

/** Kaydın açıldığından beri geçen gün. */
export function gecenGun(t: string, simdi: number): number {
  return Math.max(0, Math.floor((simdi - new Date(t).getTime()) / 86_400_000));
}

export function gecikmisMi(i: Is, simdi: number): boolean {
  if (!isAcikMi(i) || i.tur !== 'gorev') return false;
  const g = kalanGun(i.sonTarih, simdi);
  return g !== null && g < 0;
}

/* İşaretçi: karara bağlanmış iş 'tamam'; bekleyen onay akışı durdurduğu
   için 'md'; görev son tarihine göre okunur. Son tarihi GİRİLMEMİŞ açık
   görev 'unk' — gecikmesi ölçülemez, "zamanında" sayılmaz (bilinmeyen ≠ 0). */
export function isImi(i: Is, simdi: number): Durum {
  if (!isAcikMi(i)) return 'tamam';
  if (i.tur === 'onay') return 'md';
  const g = kalanGun(i.sonTarih, simdi);
  if (g === null) return 'unk';
  if (g < 0) return 'bd';
  return g <= UFUK_GUN ? 'md' : 'pl';
}

/** Sabitlenen satır: taahhüdü aşmış görev, karar bekleyen onay ve son
    tarihi ölçülemeyen açık görev. Bunlar bütçe dışıdır ve ASLA toplanmaz. */
export function isSabit(i: Is, simdi: number): boolean {
  const im = isImi(i, simdi);
  return im === 'bd' || im === 'unk' || (i.tur === 'onay' && isAcikMi(i));
}

export function isTipEtiketi(i: Is): string {
  return i.tur === 'gorev'
    ? GOREV_TIP_ETIKET[i.tip] ?? etiketle(i.tip)
    : ONAY_TIP_ETIKET[i.tip] ?? etiketle(i.tip);
}

export function isDurumSozu(i: Is): string {
  return i.tur === 'gorev'
    ? GOREV_DURUM_ETIKET[i.durum] ?? etiketle(i.durum)
    : ONAY_DURUM_ETIKET[i.durum] ?? etiketle(i.durum);
}

/** Satır alt satırı: tip + EN FAZLA BİR olgu (referans ekranların kuralı).
    Görevde santral kapsamı olguyu hak eder; kapsamı yoksa kaydın kökeni
    (motor mu, elle mi) yazılır — ikisi birden değil. */
export function isAltSatiri(i: Is, simdi: number): string {
  if (i.tur === 'onay') {
    return isAcikMi(i)
      ? `${isTipEtiketi(i)} · ${gecenGun(i.olusturuldu, simdi)} gündür açık`
      : `${isTipEtiketi(i)} · talep ${i.kisi?.ad ?? 'sistem'}`;
  }
  const olgu = i.tesis ? i.tesis.kod : i.otomatik ? 'motor üretti' : 'elle açıldı';
  return `${isTipEtiketi(i)} · ${olgu}`;
}

/** Toplanan kuyruğun etiketi kuyruğun GERÇEK bileşimini söyler: kapanmış
    kayıt yokken "karara bağlanmış" yazmak yalan olurdu. */
export function isKuyrukEtiketi(toplanan: Is[]): string {
  const acik = toplanan.filter(isAcikMi).length;
  if (acik === 0) return `+${toplanan.length} iş · karara bağlanmış`;
  if (acik === toplanan.length) return `+${toplanan.length} iş · ufku uzak`;
  return `+${toplanan.length} iş daha`;
}

/** Tanım kuyruğunun etiketi de aynı kuralla üretilir: kuyrukta bağsız
    kayıt varsa etiket "kullanımda" diyemez. */
export function tanimKuyrukEtiketi(toplanan: Tanim[]): string {
  const bagsiz = toplanan.filter((t) => tanimImi(t) === 'md').length;
  const devre = toplanan.filter((t) => t.devreDisi).length;
  if (bagsiz > 0) return `+${toplanan.length} tanım daha`;
  if (devre === 0) return `+${toplanan.length} tanım · kullanımda`;
  if (devre === toplanan.length) return `+${toplanan.length} tanım · devre dışı`;
  return `+${toplanan.length} tanım · kullanımda ve devre dışı`;
}

/** Kaynağı olan ekrana bağlantı; ekranı olmayan tipler bağsız kalır. */
export function kaynakYolu(tipi: string | null, id: string | null): string | null {
  if (!tipi || !id) return null;
  if (tipi === 'Bulgu') return `/bulgular/${id}`;
  if (tipi === 'KanitTalebi') return '/denetimler';
  if (tipi === 'Risk') return `/riskler/${id}`;
  if (tipi === 'Proje') return '/projeler';
  if (tipi === 'Istisna') return '/uyum';
  return null;
}

export function isSirala(liste: Is[], simdi: number): Is[] {
  const agirlik = (i: Is) => {
    if (gecikmisMi(i, simdi)) return 0;
    if (i.tur === 'onay' && isAcikMi(i)) return 1;
    if (isImi(i, simdi) === 'unk') return 2;
    if (isAcikMi(i)) return 3;
    return 4;
  };
  return [...liste].sort((a, b) => {
    const f = agirlik(a) - agirlik(b);
    if (f !== 0) return f;
    // Aynı ağırlıkta önce son tarihi olan, sonra en eski açılış.
    const ga = kalanGun(a.sonTarih, simdi);
    const gb = kalanGun(b.sonTarih, simdi);
    if (ga !== null && gb !== null && ga !== gb) return ga - gb;
    if (ga !== null && gb === null) return -1;
    if (ga === null && gb !== null) return 1;
    return a.olusturuldu.localeCompare(b.olusturuldu);
  });
}

/* ═══ M1 · Tanım katalogları ════════════════════════════════════════════ */

export type Katalog = 'tesis' | 'regulasyon' | 'alan' | 'kirilim' | 'sektor';

export const KATALOG_ETIKET: Record<Katalog, string> = {
  tesis: 'Santral', regulasyon: 'Regülasyon', alan: 'Kapsam alanı',
  kirilim: 'Kırılım', sektor: 'Sektör',
};

/** Kataloğun kullanım biriminin adı — "12 süreç", "48 madde" … */
export const KATALOG_BIRIM: Record<Katalog, string> = {
  tesis: 'süreç', regulasyon: 'madde', alan: 'madde',
  kirilim: 'santral', sektor: 'kırılım',
};

/** Beş katalog tek satır tipine indirgenir; tablo bunu konuşur. */
export type Tanim = {
  /** '<katalog>-<id>' — kataloglar arası kimlik çakışmasın */
  id: string;
  kayitId: string;
  katalog: Katalog;
  kod: string;
  ad: string;
  /** bu tanıma bağlı kayıt sayısı (kataloğun kendi birimiyle) */
  kullanim: number;
  /** ikinci bir sayaç — regülasyonun süreçleri gibi; yoksa null */
  ikincilKullanim: { sayi: number; birim: string } | null;
  /** kasıtlı devre dışı: kapalı santral, pasif regülasyon */
  devreDisi: boolean;
  /** zinciri kıran eksik — kritik; yoksa null */
  eksik: string | null;
  /** tabloda ikincil kolona düşen kısa olgu */
  not: string;
  /* katalog alanları — çekmece formları bunları doldurur */
  tipId: string | null;
  guc: number | null;
  konum: string | null;
  kapanisNedeni: string | null;
  kapanisTarihi: string | null;
  surum: string | null;
  kaynakUrl: string | null;
  aciklama: string | null;
  sektorId: string | null;
};

/* İşaretçi: zinciri kıran eksik kritiktir; kasıtlı devre dışı bırakılan
   kayıt planlı; hiçbir yere bağlanmamış tanım kısmi (silinmeli ya da
   bağlanmalı); kullanımdaki tanım uyumlu. */
export function tanimImi(t: Tanim): Durum {
  if (t.eksik) return 'bd';
  if (t.devreDisi) return 'pl';
  if (t.kullanim === 0) return 'md';
  return 'ok';
}

export function tanimSozu(t: Tanim): string {
  if (t.eksik) return 'Zinciri kırıyor';
  if (t.devreDisi) return t.katalog === 'tesis' ? 'Kapalı' : 'Pasif';
  if (t.kullanim === 0) return 'Kullanılmıyor';
  return 'Kullanımda';
}

/** Bağlı kayıt hücresi — 0 gerçekten sıfırdır (sayaç Prisma'dan gelir). */
export function kullanimMetni(t: Tanim): string {
  return `${t.kullanim} ${KATALOG_BIRIM[t.katalog]}`;
}

export function tanimAltSatiri(t: Tanim): string {
  const parca = [t.kod];
  if (t.eksik) parca.push(t.eksik);
  else if (t.ikincilKullanim) parca.push(`${t.ikincilKullanim.sayi} ${t.ikincilKullanim.birim}`);
  return parca.join(' · ');
}

/** Silinebilirlik: bağlı kayıt varken silme sunucuda da reddedilir; düğme
    önceden pasifleşsin ki kullanıcı hataya çarpmasın. */
export function silinebilir(t: Tanim): boolean {
  return (t.katalog === 'alan' || t.katalog === 'kirilim' || t.katalog === 'sektor')
    && t.kullanim === 0;
}

export function tanimSirala(liste: Tanim[]): Tanim[] {
  const agirlik = (t: Tanim) => {
    const im = tanimImi(t);
    return im === 'bd' ? 0 : im === 'md' ? 1 : im === 'ok' ? 2 : 3;
  };
  return [...liste].sort((a, b) => (agirlik(a) - agirlik(b))
    || a.katalog.localeCompare(b.katalog)
    || a.kod.localeCompare(b.kod, 'tr'));
}

/** Sabitlenen tanım: zinciri kıran kayıt bütçeden bağımsız görünür kalır. */
export function tanimSabit(t: Tanim): boolean {
  return tanimImi(t) === 'bd';
}

/* ═══ P1-3 · Dış API anahtarları ═══════════════════════════════════════ */

/** Anahtar satırı. TAM TOKEN BU TİPTE YOKTUR ve olamaz: veritabanında
    yalnız SHA-256 özeti durur, özet de ekrana gönderilmez. Listeye giden
    tek tanıtıcı `onEk` (ilk 8 karakter) — kalanı ≈210 bit entropi. */
export type Anahtar = {
  id: string;
  ad: string;
  /** gösterim öneki; token'ı ele vermez */
  onEk: string;
  /** anahtar KENDİ yetkisini taşımaz, sahibinin yetkilerini taşır */
  sahip: Kisi;
  /** sahibi pasifken anahtar listede canlı görünür ama her istekte 401 döner */
  sahipAktif: boolean;
  olusturan: string | null;
  sonKullanim: string | null;
  bitis: string | null;
  iptalZamani: string | null;
  olusturuldu: string;
  /** ApiIstegi sayacı — Prisma COUNT'u */
  istekSayisi: number;
};

export function anahtarBittiMi(a: Anahtar, simdi: number): boolean {
  return !!a.bitis && new Date(a.bitis).getTime() <= simdi;
}

export function anahtarEtkinMi(a: Anahtar, simdi: number): boolean {
  return !a.iptalZamani && !anahtarBittiMi(a, simdi);
}

/* İşaretçi: iptal geri alınamaz bir SONLANDIRMADIR — karara bağlanmış iş
   gibi 'tamam'. Süresi dolan anahtar üretimde seçilen geçerlilikle KASITLI
   biter; tanım kataloğundaki devre dışı kayıt gibi 'pl'. Sahibi pasif olan
   anahtar listede etkin görünür ama her istekte 401 döner: bu sessiz
   bozukluk kritiktir, 'bd'. Bitişine az kalan anahtar 'md'.

   Hiç kullanılmamış anahtar 'unk' DEĞİLDİR: `sonKullanim` her başarılı
   kimlik doğrulamasında yazılır, boş olması ölçümün yapıldığını ve değerin
   henüz oluşmadığını söyler. Bilinmeyen ≠ sıfır kuralı burada sıfırı
   gizlemeyi değil, sıfırı ÖLÇÜLMÜŞ olarak yazmayı gerektirir. */
export function anahtarImi(a: Anahtar, simdi: number): Durum {
  if (a.iptalZamani) return 'tamam';
  if (anahtarBittiMi(a, simdi)) return 'pl';
  if (!a.sahipAktif) return 'bd';
  const g = kalanGun(a.bitis, simdi);
  return g !== null && g <= UFUK_GUN ? 'md' : 'ok';
}

/** Durum sözcüğü — YALNIZ çekmecenin kimlik bloğunda kullanılır (06 §A2). */
export function anahtarSozu(a: Anahtar, simdi: number): string {
  if (a.iptalZamani) return 'İptal edildi';
  if (anahtarBittiMi(a, simdi)) return 'Süresi doldu';
  if (!a.sahipAktif) return 'Sahibi pasif';
  const g = kalanGun(a.bitis, simdi);
  return g !== null && g <= UFUK_GUN ? 'Süresi doluyor' : 'Etkin';
}

/** Son kullanım hücresi. Null = "kullanılmadı"; "bilinmiyor" DEĞİL — alan
    ölçülüyor, değeri henüz oluşmadı. */
export function sonKullanimMetni(a: Anahtar): string {
  return a.sonKullanim ? tarihTR(a.sonKullanim) : 'kullanılmadı';
}

/** İstek sayacı. Buradaki 0 UYDURMA DEĞİLDİR: `_count` gerçek bir COUNT'tur,
    "istek yok" değil "0 istek" yazılır — sayım yapıldı, sonucu sıfır. */
export function istekMetni(a: Anahtar): string {
  return `${a.istekSayisi} istek`;
}

/** Alt satır: kayıt kimliği (ön ek) + EN FAZLA BİR olgu. */
export function anahtarAltSatiri(a: Anahtar): string {
  return `${a.onEk}… · ${a.olusturan ? `${a.olusturan} üretti` : 'üreteni kayıtta yok'}`;
}

/** Sabitlenen anahtar: sahibi pasif olduğu için sessizce 401 döndüren kayıt
    bütçenin dışındadır ve ASLA toplanmaz. */
export function anahtarSabit(a: Anahtar, simdi: number): boolean {
  return anahtarImi(a, simdi) === 'bd';
}

/** Kuyruk etiketi kuyruğun GERÇEK bileşimini söyler. */
export function anahtarKuyrukEtiketi(toplanan: Anahtar[], simdi: number): string {
  const etkin = toplanan.filter((a) => anahtarEtkinMi(a, simdi)).length;
  if (etkin === 0) return `+${toplanan.length} anahtar · sonlanmış`;
  if (etkin === toplanan.length) return `+${toplanan.length} anahtar · etkin`;
  return `+${toplanan.length} anahtar daha`;
}

export function anahtarSirala(liste: Anahtar[], simdi: number): Anahtar[] {
  const agirlik = (a: Anahtar) => {
    const im = anahtarImi(a, simdi);
    return im === 'bd' ? 0 : im === 'md' ? 1 : im === 'ok' ? 2 : 3;
  };
  return [...liste].sort((a, b) => (agirlik(a) - agirlik(b))
    // Aynı ağırlıkta en yeni üretim üstte: taze anahtar doğrulanmayı bekler.
    || b.olusturuldu.localeCompare(a.olusturuldu));
}

/* ═══ D32 · Son API istekleri ═══════════════════════════════════════════
   `ApiIstegi` hem idempotency defteri hem API denetim izidir; şimdiye
   dek yalnız SAYILIYORDU (anahtar başına `_count`), hiç LİSTELENMİYORDU.
   Anahtar tablosunun altında son N istek okunur: kim (anahtar adı), ne
   (yöntem · yol), sonuç (durum kodu), ne kadar sürdü.

   Satıra `yanitOzeti` ve `idempotencyAnahtari` HİÇ GELMEZ: ilki yanıt
   gövdesinin kopyasıdır (kapsamlı veri taşıyabilir), ikincisi istemcinin
   ürettiği gizli bir değerdir. Ekrana yalnız üst veri iner. */

export type SonIstek = {
  id: string;
  zaman: string;
  yontem: string;
  yol: string;
  /** 0 = ilk istek hâlâ işleniyor (idempotency rezervasyonu) */
  durumKodu: number;
  /** null = süre ölçülmedi (rezervasyon satırı ya da kesilen istek) */
  sureMs: number | null;
  hataKodu: string | null;
  /** anahtarsız istek (kimlik doğrulanamadı) null gelir */
  anahtar: { id: string; ad: string } | null;
};

/** Ekrana inen istek tavanı; sayaçlar bu pencerenin içindir, "tüm zamanlar"
    sayısı anahtar tablosundaki `istekSayisi`dir (COUNT). */
export const SON_ISTEK_TAVANI = 50;

/* İşaretçi: 2xx uyumlu; 4xx istemci hatası — kısmi (anahtar çalışıyor,
   istek kusurlu); 5xx sunucu hatası — kritik; 0 hâlâ işleniyor —
   sonucu BİLİNMİYOR, başarı ya da hata sayılmaz. */
export function istekImi(durumKodu: number): Durum {
  if (durumKodu === 0) return 'unk';
  if (durumKodu >= 500) return 'bd';
  if (durumKodu >= 400) return 'md';
  return 'ok';
}

/** Durum hücresi: kod + (varsa) hata kodu sözcüğü — renk tek kanal değil. */
export function istekDurumMetni(i: SonIstek): string {
  if (i.durumKodu === 0) return 'işleniyor';
  return i.hataKodu ? `${i.durumKodu} · ${i.hataKodu}` : String(i.durumKodu);
}

/** Süre hücresi. null "0 ms" DEĞİLDİR: ölçüm yapılmadı. */
export function sureMetni(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return 'ölçülmedi';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} sn` : `${ms} ms`;
}

/** Pencere içinde anahtar başına sayım — çoktan aza; eşitlikte adlı
    anahtarlar önce, "anahtarsız" kalemi en sonda. Anahtarsız istek
    gizlenmez: kimlik doğrulanamayan istek de trafiktir ve tam olarak
    görülmesi gereken şeydir. */
export function anahtarBasinaSayim(istekler: SonIstek[]): { ad: string; sayi: number }[] {
  const sayac = new Map<string, { ad: string; sayi: number; anahtarsiz: boolean }>();
  for (const i of istekler) {
    const k = i.anahtar?.id ?? '';
    const o = sayac.get(k);
    if (o) o.sayi += 1;
    else sayac.set(k, { ad: i.anahtar?.ad ?? 'anahtarsız', sayi: 1, anahtarsiz: !i.anahtar });
  }
  return [...sayac.values()]
    .sort((a, b) => b.sayi - a.sayi
      || Number(a.anahtarsiz) - Number(b.anahtarsiz)
      || a.ad.localeCompare(b.ad, 'tr'))
    .map(({ ad, sayi }) => ({ ad, sayi }));
}

/** Son istekler dip notu: pencere, anahtar başına dağılım, hata sayısı. */
export function sonIstekDipNotu(istekler: SonIstek[], tavan: number): string {
  if (istekler.length === 0) return 'Kayıtlı API isteği yok — sayım yapıldı, sonuç sıfır.';
  const parca = [istekler.length >= tavan
    ? `son ${tavan} istek görünüyor, öncekiler bu listede değil`
    : `${istekler.length} istek · kayıtların tamamı`];
  parca.push(anahtarBasinaSayim(istekler).map((k) => `${k.ad} ${k.sayi}`).join(', '));
  const hatali = istekler.filter((i) => istekImi(i.durumKodu) !== 'ok' && i.durumKodu !== 0).length;
  if (hatali > 0) parca.push(`${hatali} istek hata döndü`);
  const isleniyor = istekler.filter((i) => i.durumKodu === 0).length;
  if (isleniyor > 0) parca.push(`${isleniyor} isteğin sonucu henüz yazılmadı`);
  return parca.join(' · ');
}

/* ═══ Ortak ═════════════════════════════════════════════════════════════ */

/** 06 §A3: tabloda 5–9 satır görünür; sabitlenenler bütçenin dışındadır. */
export const GORUNUR_BUTCE = 7;
