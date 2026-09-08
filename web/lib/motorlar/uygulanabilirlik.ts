import 'server-only';
import { db } from '../db';

/* Uygulanabilirlik motoru (§5): tesis profilinden kural bazlı kapsam kararı.
   Kural JSON'u: { herhangi?: Kosul[], hepsi?: Kosul[] }
   Kosul: { alan, islec: '='|'!='|'>='|'<='|'>'|'<', deger } */

type Kosul = { alan: string; islec: string; deger: unknown };
type Kural = { herhangi?: Kosul[]; hepsi?: Kosul[] };

/** Kuralın okuyabileceği bir tesis özniteliği. */
export type Oznitelik = {
  anahtar: string;
  sayisalDeger: number | null;
  metinDeger: string | null;
};

/** Profil + ÖZNİTELİKLERDEN kural değerlendirme bağlamı üretir.

    P1 · §0.5: "kurulu güç" bir sektör niteliğidir ve artık kolon değil,
    `TesisOzellik` satırıdır. Kural bir öznitelik ANAHTARI okur; hangi
    anahtarların var olduğunu sektör paketi söyler, çekirdek bilmez.

    ÖZNİTELİK YOKSA BAĞLAMDA DA YOKTUR: anahtarı `undefined` bırakırız ve
    `kosulSagla` onu `null` (bilinmiyor) sayar. Anahtarı `null` değerle
    eklemek de aynı sonucu verirdi ama bir şey daha söylerdi — "bu
    niteliği tanıyoruz, ölçülmedi". Oysa çekirdek o niteliği tanımıyor;
    ayrımı bağlamda da korumak, ileride "tanınmayan anahtar" ile
    "ölçülmemiş nitelik" ayrı raporlanmak istendiğinde işi kolaylaştırır. */
/** Bağlam kurulurken düşürülen çakışmalar — çağıran raporlayabilsin. */
export type BaglamCakismasi = { anahtar: string; sebep: 'profil' | 'turetilmis' };

/** Türetilmiş alan adları: öznitelik bunları da ezemez. */
const TURETILMIS_ALANLAR = new Set(['teiasScadaEmsSeriOlmayan']);

/* Dışa AÇILMADI: çakışma davranışı `kuralDegerlendir`in gerekçesinden
   sınanır. Yalnız test için genel yüzeyi büyütmek, ters kapsama ölçüsüne
   gerekçesiz bir "davranış" ekler ve kütük şişer. */
function baglamKur(ozellikler: readonly Oznitelik[],
  profil: Record<string, unknown> | null,
): { baglam: Record<string, unknown>; cakismalar: BaglamCakismasi[] } {
  const p = profil ?? {};

  /* ── SIRA · ÖLÇÜLMÜŞ KUSUR (Codex incelemesi · #30, P1) ──────────────
     Eski hâl `{ ...p, ...nitelikler }` idi: ÖZNİTELİKLER PROFİLDEN SONRA
     yayılıyordu. Öznitelik anahtarı serbest bir dizedir (sektör paketi
     ya da içe aktarım yazar); `blackStart` gibi bir profil alanıyla
     çakışan tek bir anahtar, otoriter profil değerini SESSİZCE değiştirir
     ve uygulanabilirlik kuralı yanlış tesis kümesi üretir — bir tesis
     düzenleyici kapsama girer ya da kapsamdan düşer.

     Profil çekirdeğin kendi alanıdır ve doğruluğu şemayla korunur;
     öznitelik dışarıdan gelir. Dışarıdan gelen içeridekini ezemez:
     sıra tersine çevrildi, önce öznitelikler yayılır, profil ÜSTÜNE
     yazar. Türetilmiş alanlar da aynı korumayı taşır — onlar bu
     fonksiyonun kendi hesabıdır, veri değildir.

     Çakışma SESSİZ DE OLAMAZ: düşürülen her anahtar döndürülür, çağıran
     gerekçeye yazar. "Değeri kullanmadım" ile "böyle bir değer yoktu"
     aynı şey değildir. */
  const nitelikler: Record<string, unknown> = {};
  const cakismalar: BaglamCakismasi[] = [];
  for (const o of ozellikler) {
    const deger = o.sayisalDeger ?? o.metinDeger;
    if (deger === null) continue;
    if (TURETILMIS_ALANLAR.has(o.anahtar)) {
      cakismalar.push({ anahtar: o.anahtar, sebep: 'turetilmis' });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(p, o.anahtar)) {
      cakismalar.push({ anahtar: o.anahtar, sebep: 'profil' });
      continue;
    }
    nitelikler[o.anahtar] = deger;
  }
  return {
    baglam: {
      ...nitelikler,
      ...p,
      // türetilmiş alan: TEİAŞ SCADA/EMS bağlantısı seri OLMAYAN haberleşmeyle
      teiasScadaEmsSeriOlmayan:
        p['teiasScadaEms'] === true && p['seriHaberlesme'] !== true,
    },
    cakismalar,
  };
}

function kosulSagla(baglam: Record<string, unknown>, k: Kosul): boolean | null {
  const deger = baglam[k.alan];
  if (deger === null || deger === undefined) return null; // BİLİNMİYOR — false değil
  switch (k.islec) {
    case '=': return deger === k.deger;
    case '!=': return deger !== k.deger;
    case '>=': return typeof deger === 'number' && deger >= (k.deger as number);
    case '<=': return typeof deger === 'number' && deger <= (k.deger as number);
    case '>': return typeof deger === 'number' && deger > (k.deger as number);
    case '<': return typeof deger === 'number' && deger < (k.deger as number);
    default: return null;
  }
}

export type KuralSonucu = {
  uygulanabilir: boolean | null; // null = profil eksik, karar verilemedi
  gerekce: string;
};

export function kuralDegerlendir(kuralJson: string, ozellikler: readonly Oznitelik[],
  profil: Record<string, unknown> | null): KuralSonucu {
  const kural = JSON.parse(kuralJson) as Kural;
  const { baglam, cakismalar } = baglamKur(ozellikler, profil);
  /* Düşürülen öznitelik gerekçeye yazılır: karar aynı kalsa bile okuyan
     kişi hangi verinin KULLANILMADIĞINI görmeli. */
  const cakismaNotu = cakismalar.length === 0 ? ''
    : ` [öznitelik yok sayıldı — ${cakismalar
      .map((c) => `${c.anahtar} (${c.sebep === 'profil' ? 'profil alanı' : 'türetilmiş alan'})`)
      .join(', ')}]`;
  const acikla = (k: Kosul, s: boolean | null) =>
    `${k.alan}${k.islec}${JSON.stringify(k.deger)}=${s === null ? 'bilinmiyor' : s ? 'sağlandı' : 'sağlanmadı'}`;

  if (kural.herhangi) {
    const sonuclar = kural.herhangi.map((k) => ({ k, s: kosulSagla(baglam, k) }));
    const saglanan = sonuclar.find((x) => x.s === true);
    if (saglanan) return { uygulanabilir: true, gerekce: `Koşul sağlandı: ${acikla(saglanan.k, true)}${cakismaNotu}` };
    if (sonuclar.some((x) => x.s === null))
      return { uygulanabilir: null,
        gerekce: `Profil eksik — karar verilemedi: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}${cakismaNotu}` };
    return { uygulanabilir: false,
      gerekce: `Hiçbir koşul sağlanmadı: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}${cakismaNotu}` };
  }
  if (kural.hepsi) {
    const sonuclar = kural.hepsi.map((k) => ({ k, s: kosulSagla(baglam, k) }));
    if (sonuclar.every((x) => x.s === true))
      return { uygulanabilir: true, gerekce: `Tüm koşullar sağlandı${cakismaNotu}` };
    if (sonuclar.some((x) => x.s === null))
      return { uygulanabilir: null,
        gerekce: `Profil eksik: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}${cakismaNotu}` };
    return { uygulanabilir: false,
      gerekce: `Sağlanmayan koşul var: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}${cakismaNotu}` };
  }
  return { uygulanabilir: null, gerekce: `Kural boş${cakismaNotu}` };
}

/** Bir tesis için tüm aktif kuralları çalıştırır; kararları upsert eder.
    El ile değiştirilmiş (override) kararlara DOKUNMAZ. */
export async function tesisKapsaminiHesapla(tesisId: string, aktorId?: string | null):
  Promise<{ hesaplanan: number; atlanianOverride: number }> {
  const tesis = await db.tesis.findUniqueOrThrow({
    where: { id: tesisId }, include: { profil: true, ozellikler: true } });
  const kurallar = await db.uygulanabilirlikKurali.findMany({ where: { aktif: true } });
  let hesaplanan = 0, atlanianOverride = 0;
  for (const kural of kurallar) {
    const mevcut = await db.uygulanabilirlikKarari.findUnique({
      where: { tesisId_regulasyonId: { tesisId, regulasyonId: kural.regulasyonId } } });
    if (mevcut?.elIleDegistirildi) { atlanianOverride++; continue; }
    const profilKaydi = tesis.profil
      ? JSON.parse(JSON.stringify(tesis.profil)) as Record<string, unknown> : null;
    const sonuc = kuralDegerlendir(kural.kosulJson, tesis.ozellikler, profilKaydi);
    if (sonuc.uygulanabilir === null && !mevcut) {
      /* Karar verilemiyor: uygulanabilirlik kaydı AÇILMAZ (bilinmeyen bir
         karar uydurulamaz), veri kalitesi bulgusu düşülür.

         Açık aynı bulgu varsa yenisi üretilmez. Bu kontrol yoktu ve motor
         her koşuda aynı tesis+kural için yeni satır açıyordu: üç ardışık
         koşuda bulgu sayısı 4 → 6 → 8 ölçüldü, yani koşu başına sabit
         artış ve sınırsız büyüme. Entegrasyon zinciri motoru her yeni veri
         geldiğinde tetiklediği için bu, sağlık ekranındaki açık bulgu
         listesini kalıcı olarak şişiriyordu.
         veriKalitesi.ts aynı kalıbı zaten uyguluyor (satır 74-78). */
      const acikVarMi = await db.veriKalitesiBulgusu.findFirst({
        where: { kural: 'eksik_profil', kaynakTipi: 'Tesis', kaynakId: tesisId,
          durum: 'acik' },
      });
      if (!acikVarMi) {
        await db.veriKalitesiBulgusu.create({ data: {
          kural: 'eksik_profil', kaynakTipi: 'Tesis', kaynakId: tesisId,
          aciklama: `Uygulanabilirlik hesaplanamadı (${kural.ad}): ${sonuc.gerekce}` } });
      }
      continue;
    }
    if (sonuc.uygulanabilir === null) continue;
    await db.uygulanabilirlikKarari.upsert({
      where: { tesisId_regulasyonId: { tesisId, regulasyonId: kural.regulasyonId } },
      update: { uygulanabilir: sonuc.uygulanabilir, gerekce: sonuc.gerekce,
        kuralId: kural.id, kuralSurumu: kural.surum, hesaplandi: new Date() },
      create: { tesisId, regulasyonId: kural.regulasyonId,
        uygulanabilir: sonuc.uygulanabilir, gerekce: sonuc.gerekce,
        kuralId: kural.id, kuralSurumu: kural.surum },
    });
    hesaplanan++;
    await db.aktiviteKaydi.create({ data: {
      aktorId: aktorId ?? null, varlikTipi: 'UygulanabilirlikKarari', varlikId: tesisId,
      eylem: 'guncelleme', alan: kural.ad,
      yeniDeger: sonuc.uygulanabilir ? 'kapsamda' : 'kapsam dışı',
      gerekce: sonuc.gerekce, kaynak: 'is_kosusu' } });
  }
  return { hesaplanan, atlanianOverride };
}
