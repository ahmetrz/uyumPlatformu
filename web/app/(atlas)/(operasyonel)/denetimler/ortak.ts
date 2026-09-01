import type { Durum } from '@/components/abacus/temel';
import { DENETIM_ASAMALARI, DENETIM_ASAMA_ETIKET, DENETIM_TIP_ETIKET, etiketle } from '@/lib/sabitler';

/* O5/O6 · Denetim programı — sunucu ve istemcinin PAYLAŞTIĞI tipler ve saf
   hesaplar. Aşama sırası lib/eylemler2/denetim.ts ile aynı diziden okunur;
   ekran kendi sırasını kurarsa iki yerde iki farklı yaşam döngüsü olur.

   Zaman hesabı `simdi`yi PARAMETRE alır: sunucu isteği başında bir kez
   okur ve istemciye verir. Aksi hâlde metrik, zaman çizelgesi ve tablo
   aynı ekranda üç farklı "bugün" ile çizilir. */

export const GUN = 86_400_000;

export type Asama = (typeof DENETIM_ASAMALARI)[number];

/** Zaman çizelgesi ve tablo, aşamayı tek sözcükle taşır — rayda dokuz
    segment var, "Saha çalışması" gibi iki sözcük kolonu iki satıra kırar. */
export const KISA_ASAMA: Record<Asama, string> = {
  plan: 'Plan', kapsam: 'Kapsam', kanit_talebi: 'Kanıt', saha: 'Saha',
  bulgu: 'Bulgu', yanit: 'Yanıt', aksiyon: 'Aksiyon',
  dogrulama: 'Doğrulama', kapanis: 'Kapanış',
};

export type Kisi = { id: string; ad: string };
export type Kodlu = { id: string; kod: string; ad: string };
export type SurecSecenegi = { id: string; kod: string; ad: string; regKod: string };

/** Talep sayıları sunucuda `simdi`ye göre kapatılır; istemci yeniden saymaz. */
export type TalepSayimi = { acik: number; saglandi: number; toplam: number; gecikmis: number };

export type D = {
  id: string;
  kod: string;
  ad: string;
  tip: string;
  denetleyen: string | null;
  durum: string;
  planBaslangic: string | null;
  planBitis: string | null;
  surec: { id: string; kod: string; regKod: string } | null;
  tesisler: Kodlu[];
  maddeSayisi: number;
  talep: TalepSayimi;
  acikBulgu: number;
  toplamBulgu: number;
};

/* ── Aşama ──────────────────────────────────────────────────────────── */

export function asamaIndeksi(durum: string): number {
  return DENETIM_ASAMALARI.indexOf(durum as Asama);
}

export function asamaEtiketi(durum: string): string {
  return DENETIM_ASAMA_ETIKET[durum as Asama] ?? etiketle(durum);
}

export function tipEtiketi(tip: string): string {
  return DENETIM_TIP_ETIKET[tip] ?? etiketle(tip);
}

export function kapandiMi(d: Pick<D, 'durum'>): boolean {
  return d.durum === 'kapanis';
}

/* ── Zaman ──────────────────────────────────────────────────────────── */

function an(t: string | null): number | null {
  if (!t) return null;
  const z = new Date(t).getTime();
  return Number.isNaN(z) ? null : z;
}

/** Çizelgede denetimi yerleştiren tarih: saha başlangıcı, yoksa bitiş. */
export function capa(d: Pick<D, 'planBaslangic' | 'planBitis'>): number | null {
  return an(d.planBaslangic) ?? an(d.planBitis);
}

/** Plan bitişi geçti mi (kapanmamış denetimler için). */
export function bitisGecti(d: Pick<D, 'durum' | 'planBitis'>, simdi: number): boolean {
  const b = an(d.planBitis);
  return !kapandiMi(d) && b !== null && b < simdi;
}

/** Saha henüz başlamadı mı — plan aşamasındaki denetimin ileri tarihi. */
export function baslamadi(d: Pick<D, 'planBaslangic'>, simdi: number): boolean {
  const b = an(d.planBaslangic);
  return b !== null && b > simdi;
}

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const buyuk = (s: string) => s.toLocaleUpperCase('tr-TR');

export function ayYil(t: number): string {
  const d = new Date(t);
  return `${AYLAR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export function gunAy(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${AYLAR[d.getMonth()]}`;
}

/** Gün farkı — negatif geçmiş, pozitif gelecek. */
export function gunFarki(t: number, simdi: number): number {
  return Math.round((t - simdi) / GUN);
}

/* ── Durum işaretçisi ───────────────────────────────────────────────────
   İşaretçi "bu denetim takvimini tutuyor mu?" sorusunu yanıtlar; aşama
   ayrı bir kolonda kelimeyle yazılır, ikisi birbirini tekrar etmez. */

export function denetimImi(d: D, simdi: number): Durum {
  if (kapandiMi(d)) return 'tamam';
  if (d.talep.gecikmis > 0 || bitisGecti(d, simdi)) return 'bd';
  // Takvimi hiç girilmemiş denetim BİLİNMEYENDİR — "zamanında" sayılmaz.
  if (!d.planBaslangic && !d.planBitis) return 'unk';
  // Sahası başlamamış denetimin açık talebi henüz iş değil, plandır.
  if (baslamadi(d, simdi)) return 'pl';
  if (d.talep.acik > 0 || d.acikBulgu > 0) return 'md';
  return 'ok';
}

/** Çekmece kimlik cümlesi — durumun neden o renkte olduğunu bir cümlede söyler. */
export function kimlikCumlesi(d: D, simdi: number): string {
  if (kapandiMi(d)) {
    // Talep açılmamış denetimde "0/0" yazmak kanıt toplandığını ima eder.
    return d.talep.toplam === 0
      ? 'Denetim kapandı; hiç kanıt talebi açılmamıştı.'
      : `Denetim kapandı; ${d.talep.saglandi}/${d.talep.toplam} kanıt talebi karşılanmıştı.`;
  }
  if (d.talep.gecikmis > 0) {
    return `${d.talep.gecikmis} kanıt talebi son tarihini aştı; kapanışa geçiş reddedilir.`;
  }
  if (bitisGecti(d, simdi)) {
    const gecen = -gunFarki(an(d.planBitis) as number, simdi);
    return `Plan bitişi ${gecen} gün aşıldı; denetim hâlâ ${asamaEtiketi(d.durum).toLocaleLowerCase('tr-TR')} aşamasında.`;
  }
  if (!d.planBaslangic && !d.planBitis) {
    return 'Plan tarihi girilmedi — takvim bilinmiyor, gecikme ölçülemiyor.';
  }
  if (baslamadi(d, simdi)) {
    return `Saha çalışması ${gunFarki(an(d.planBaslangic) as number, simdi)} gün sonra başlıyor.`;
  }
  if (d.talep.acik > 0 && d.acikBulgu > 0) {
    return `${d.talep.acik} kanıt talebi ve ${d.acikBulgu} bulgu açık; kapanış ikisini de ister.`;
  }
  if (d.talep.acik > 0) return `${d.talep.acik} kanıt talebi açık; kapanışın önkoşulu.`;
  if (d.acikBulgu > 0) return `${d.acikBulgu} bulgu açık; kapanışın önkoşulu.`;
  return 'Açık kanıt talebi ve açık bulgu yok; denetim kapanışa hazır.';
}

/* ── Satır metinleri ────────────────────────────────────────────────────
   Satır alt satırı kayıt kimliği + EN FAZLA bir olgu taşır; durum sözcüğü
   canvasta tekrar edilmez (06 §A2). */

export function altSatir(d: D): string {
  if (d.talep.gecikmis > 0) return `${d.kod} · ${d.talep.gecikmis} talep gecikti`;
  if (d.denetleyen) return `${d.kod} · ${d.denetleyen}`;
  return `${d.kod} · ${tipEtiketi(d.tip).toLocaleLowerCase('tr-TR')}`;
}

/** Satırın santral hücresi: tek tesis · birden çoksa sayı · yoksa portföy. */
export function santralMetni(d: Pick<D, 'tesisler'>): string {
  if (d.tesisler.length === 1) return d.tesisler[0].ad;
  if (d.tesisler.length > 1) return `${d.tesisler.length} santral`;
  return 'portföy';
}

/** Plan hücresi: aşılmış bitiş gün olarak, aksi hâlde takvim penceresi. */
export function planMetni(d: D, simdi: number): { metin: string; durum?: Durum } {
  const bas = an(d.planBaslangic);
  const bit = an(d.planBitis);
  if (bitisGecti(d, simdi) && bit !== null) {
    return { metin: `+${-gunFarki(bit, simdi)} gün`, durum: 'bd' };
  }
  if (bas !== null && bit !== null) {
    const ayniAy = new Date(bas).getMonth() === new Date(bit).getMonth();
    return { metin: ayniAy ? `${new Date(bas).getDate()}–${gunAy(bit)}` : `${gunAy(bas)} – ${gunAy(bit)}` };
  }
  if (bas !== null) return { metin: gunAy(bas) };
  if (bit !== null) return { metin: gunAy(bit) };
  return { metin: 'tarih yok', durum: 'unk' };
}

/* ── Zaman çizelgesi ────────────────────────────────────────────────────
   Ufuk veriden gelir: en erken çapa ile en geç plan bitişi arasını, bugünü
   de kapsayacak biçimde gerer. Sabit bir pencere seçilirse seed değişince
   kartlar eksenin dışına düşer. */

export type Ufuk = { bas: number; son: number };

export function ufuk(kayitlar: D[], simdi: number): Ufuk {
  const anlar = kayitlar.flatMap((d) => [capa(d), an(d.planBitis)])
    .filter((t): t is number => t !== null);
  const bas = Math.min(simdi, ...(anlar.length ? anlar : [simdi]));
  const son = Math.max(simdi, ...(anlar.length ? anlar : [simdi]));
  // Tek noktaya çöken ufuk sıfıra bölünür; en az bir çeyrek gerilir.
  return son - bas < 90 * GUN ? { bas, son: bas + 90 * GUN } : { bas, son };
}

export function konum(t: number | null, u: Ufuk): number {
  if (t === null) return 0;
  return Math.max(0, Math.min(1, (t - u.bas) / (u.son - u.bas)));
}

/** Kart geri sayımı: geçmiş `geçti`, yakın gelecek gün, uzağı ay olarak. */
export function geriMetni(t: number | null, simdi: number): string {
  if (t === null) return 'tarih yok';
  const fark = gunFarki(t, simdi);
  if (fark < 0) return 'geçti';
  if (fark <= 60) return `${fark} g`;
  return ayYil(t);
}

/* Kart 208px; çekmece açıkken eksen ~680px'e iner, yani bir kart şeridin
   yaklaşık üçte birini kaplar. Primitif sağa taşan kartı `100% - 208px`e
   geri çeker — düzeltilmeyen konumlar bu yüzden çekmece açılınca komşunun
   üstüne biner. Bu yüzden konumlar hem asgari aralığa hem SAĞ SINIRA göre
   düzeltilir; sıra korunur ve kartın kendi tarih etiketi gerçek tarihi
   söylemeye devam eder (yerleşim düzeltmesi, veri değil). */


/** Eksen tırnakları: BUGÜN + ufka düşen ay başları. Birbirine yapışanlar
    elenir; tasarımda tırnak sayısı dörttür (02-components §14). */
export function donemler(u: Ufuk, simdi: number): { ad: string; konum: number }[] {
  const bugun = konum(simdi, u);
  const adaylar: { ad: string; konum: number }[] = [];
  const t = new Date(u.bas);
  t.setDate(1);
  t.setHours(0, 0, 0, 0);
  t.setMonth(t.getMonth() + 1);
  for (; t.getTime() <= u.son; t.setMonth(t.getMonth() + 1)) {
    adaylar.push({ ad: buyuk(ayYil(t.getTime())), konum: konum(t.getTime(), u) });
  }
  const ayrik: { ad: string; konum: number }[] = [{ ad: 'BUGÜN', konum: bugun }];
  for (const a of adaylar) {
    if (a.konum - ayrik[ayrik.length - 1].konum >= 0.14) ayrik.push(a);
  }
  return ayrik.slice(0, 4);
}

/* ── Sunucu → istemci eşlemesi ─────────────────────────────────────────
   Liste ve detay aynı `D` biçimini konuşur; iki rota alan adlarını
   ayrı ayrı uydurmaz. */

type HamDenetim = {
  id: string; kod: string; ad: string; tip: string; denetleyen: string | null;
  durum: string; planBaslangic: Date | null; planBitis: Date | null;
  surec: { id: string; kod: string; regulasyon: { kod: string } } | null;
  kapsamlar: { tesis: { id: string; kod: string; ad: string } | null; maddeId: string | null }[];
  talepler: { durum: string; sonTarih: Date | null }[];
  bulgular: { durum: string }[];
};

export function denetimeCevir(d: HamDenetim, simdi: number): D {
  const acikTalepler = d.talepler.filter((t) => t.durum === 'acik');
  return {
    id: d.id, kod: d.kod, ad: d.ad, tip: d.tip, denetleyen: d.denetleyen,
    durum: d.durum,
    planBaslangic: d.planBaslangic?.toISOString() ?? null,
    planBitis: d.planBitis?.toISOString() ?? null,
    surec: d.surec ? { id: d.surec.id, kod: d.surec.kod, regKod: d.surec.regulasyon.kod } : null,
    tesisler: d.kapsamlar.map((k) => k.tesis).filter((t): t is Kodlu => t !== null),
    maddeSayisi: d.kapsamlar.filter((k) => k.maddeId !== null).length,
    talep: {
      acik: acikTalepler.length,
      saglandi: d.talepler.filter((t) => t.durum === 'saglandi').length,
      toplam: d.talepler.length,
      gecikmis: acikTalepler.filter((t) => t.sonTarih !== null
        && t.sonTarih.getTime() < simdi).length,
    },
    acikBulgu: d.bulgular.filter((b) => b.durum === 'acik' || b.durum === 'aksiyonda').length,
    toplamBulgu: d.bulgular.length,
  };
}

/** Prisma include ağacı — liste ve detay aynı ağacı kullanır. */
export const DENETIM_ICERIK = {
  surec: { select: { id: true, kod: true, regulasyon: { select: { kod: true } } } },
  kapsamlar: { select: { tesis: { select: { id: true, kod: true, ad: true } }, maddeId: true } },
  talepler: { select: { durum: true, sonTarih: true } },
  bulgular: { where: { silindi: null }, select: { durum: true } },
} as const;

/* ── Kanıt talebi ───────────────────────────────────────────────────── */

export type Talep = {
  id: string;
  baslik: string;
  aciklama: string | null;
  durum: string;
  sonTarih: string | null;
  sorumlu: Kisi | null;
  kanit: { id: string; ad: string } | null;
};

/** Talebin geciken gün sayısı; açık değilse ya da tarihi yoksa null. */
export function talepGecikmesi(t: Pick<Talep, 'durum' | 'sonTarih'>, simdi: number): number | null {
  if (t.durum !== 'acik' || !t.sonTarih) return null;
  const fark = simdi - new Date(t.sonTarih).getTime();
  return fark > 0 ? Math.max(1, Math.floor(fark / GUN)) : null;
}

export function talepImi(t: Talep, simdi: number): Durum {
  if (t.durum === 'saglandi') return 'tamam';
  // Reddedilen talep kanıtsız kapanır: yeşil değil, elmas.
  if (t.durum === 'reddedildi') return 'unk';
  if (talepGecikmesi(t, simdi) !== null) return 'bd';
  if (!t.sonTarih) return 'unk';
  return 'md';
}

/** Talep sonucu hücresi — kanıt adı, red ya da henüz boş. */
export function talepSonucu(t: Talep): string {
  if (t.kanit) return t.kanit.ad;
  if (t.durum === 'saglandi') return 'kanıt bağlanmadı';
  if (t.durum === 'reddedildi') return 'talep reddedildi';
  return '—';
}

/* ── Bulgu özeti (denetim kaydında yalnız izlenir) ───────────────────── */

export type BulguOzeti = {
  id: string;
  baslik: string;
  onem: string;
  durum: string;
  maddeKod: string;
  tesisKod: string;
  sorumlu: string | null;
  hedef: string | null;
};

export function bulguImi(b: BulguOzeti, simdi: number): Durum {
  if (b.durum === 'kapali') return 'tamam';
  if (b.durum === 'kabul_edildi') return 'pl';
  if (b.hedef && new Date(b.hedef).getTime() < simdi) return 'bd';
  if (b.onem === 'kritik' || b.onem === 'yuksek') return 'bd';
  return 'md';
}
