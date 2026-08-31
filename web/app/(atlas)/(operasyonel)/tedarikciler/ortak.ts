import type { Durum } from '@/components/atlas/temel';

/* O16 · Tedarikçiler / üçüncü taraf — paylaşılan tipler ve SAF türetmeler.
   Aynı kural hem sunucuda (metrik, sıralama) hem istemcide (satır, çekmece)
   koşsun diye burada durur; içinde db, erişim ya da JSX yoktur.

   İki sözleşme maddesi bu dosyanın biçimini belirliyor:
   · 06 §A2 — satırda durum SÖZCÜĞÜ geçemez. Kritiklik bu yüzden satırda
     harf kademesiyle (A/B/C/D) yazılır; sözcük karşılığı yalnız çekmecede.
   · 06 §A3 — unknown ≠ zero. `oturumKaydiVar` ÜÇ değerlidir ve üçü ayrı
     gösterilir: true kayıt var · false izlenmiyor · null bilinmiyor.
   Gün sayıları sunucuda bir kez hesaplanıp taşınır (istemcide `Date.now()`
   çağrılmaz) — böylece hidrasyon sapması olmaz. */

/** "bitiyor / doluyor" ufku. Metrik de satır da bu tek eşiği kullanır. */
export const UFUK = 30;

/** Görünür satır bütçesi (06 §A2: 5–9 satır); kalan sağlıklı kuyruk toplanır. */
export const GORUNUR_TAVAN = 9;

/** Uzaktan erişim yöntemi — satırda küçük harf (olgu), çekmecede cümle içinde. */
export const YONTEM_ETIKET: Record<string, string> = {
  vpn: 'VPN',
  jump_host: 'aracılı',
  saticiya_ozel: 'satıcıya özel',
  yok: 'yok',
};

/** Kritiklik kademesi — satırda harf. Sözcük karşılığı çekmecede yazılır. */
export const KADEME: Record<string, string> = {
  kritik: 'A', yuksek: 'B', orta: 'C', dusuk: 'D',
};

/* ── Taşınan biçimler ─────────────────────────────────────────────────── */

export type SantralBagi = {
  id: string; kod: string; ad: string; varlikSayisi: number;
};

export type SozlesmeOzeti = {
  id: string; kod: string; ad: string;
  baslangic: string | null; bitis: string | null;
  /** bitişe kalan gün; negatif = geçmiş. Sözleşmede bitiş yoksa null. */
  kalanGun: number | null;
  slaOzeti: string | null;
  guvenlikSartlariVar: boolean | null;
};

export type SertifikaOzeti = {
  id: string; ad: string; veren: string | null;
  bitis: string; kalanGun: number;
  varlikId: string | null; varlikEtiketi: string | null;
};

export type Bag = { id: string; kod: string; alt: string; yol: string };

export type T = {
  id: string;
  ad: string;
  tip: string | null;
  kritiklik: string;
  uzaktanErisimVar: boolean;
  uzaktanErisimYontemi: string | null;
  /** true kayıt var · false izlenmiyor · null bilinmiyor — üçü ayrı gösterilir. */
  oturumKaydiVar: boolean | null;
  santraller: SantralBagi[];
  varlikSayisi: number;
  kritikVarlikSayisi: number;
  sozlesmeler: SozlesmeOzeti[];
  sertifikalar: SertifikaOzeti[];
  riskler: Bag[];
  kontroller: Bag[];
};

/* ── Türetmeler ───────────────────────────────────────────────────────── */

/** Desteğin gerçekte bittiği tarihi taşıyan sözleşme = en geç bitişli olan. */
export function asilSozlesme(t: T): SozlesmeOzeti | null {
  if (t.sozlesmeler.length === 0) return null;
  return t.sozlesmeler.reduce((a, b) => {
    if (a.kalanGun === null) return b;
    if (b.kalanGun === null) return a;
    return b.kalanGun > a.kalanGun ? b : a;
  });
}

/** Ufuktaki ilk sertifika (dolmuşlar hariç). */
export function yakinSertifika(t: T): SertifikaOzeti | null {
  const ileri = t.sertifikalar.filter((s) => s.kalanGun >= 0);
  return ileri.length ? ileri.reduce((a, b) => (b.kalanGun < a.kalanGun ? b : a)) : null;
}

export function dolmusSertifikalar(t: T): SertifikaOzeti[] {
  return t.sertifikalar.filter((s) => s.kalanGun < 0);
}

export type Bayraklar = {
  destekBitti: boolean;
  izlenmiyor: boolean;
  sertifikaDoldu: boolean;
  destekBitiyor: boolean;
  sertifikaDoluyor: boolean;
  oturumBilinmiyor: boolean;
  sozlesmeYok: boolean;
};

export function bayraklar(t: T): Bayraklar {
  const soz = asilSozlesme(t);
  const yakin = yakinSertifika(t);
  return {
    destekBitti: soz !== null && soz.kalanGun !== null && soz.kalanGun < 0,
    izlenmiyor: t.uzaktanErisimVar && t.oturumKaydiVar === false,
    sertifikaDoldu: dolmusSertifikalar(t).length > 0,
    destekBitiyor: soz !== null && soz.kalanGun !== null
      && soz.kalanGun >= 0 && soz.kalanGun <= UFUK,
    sertifikaDoluyor: yakin !== null && yakin.kalanGun <= UFUK,
    oturumBilinmiyor: t.uzaktanErisimVar && t.oturumKaydiVar === null,
    sozlesmeYok: t.sozlesmeler.length === 0,
  };
}

export type Degerlendirme = {
  durum: Durum;
  /** Süresi dolmuş destek sıralamadan bağımsız üste sabitlenir (06 §A2). */
  sabit: boolean;
  /** Çekmece kimlik bloğu — durumun kelimeyle yazıldığı TEK yer. */
  soz: string;
  /** Çekmecenin tek bağlam cümlesi: neden bu durumda. */
  cumle: string;
  /** Satır alt satırındaki ek olgu — yalnız kolonlarda görünmeyen sürükleyici. */
  olgu: string | null;
  bayrak: Bayraklar;
};

const gunMetni = (n: number) => `${Math.abs(n)} gün`;

export function degerlendir(t: T): Degerlendirme {
  const b = bayraklar(t);
  const soz = asilSozlesme(t);
  const yakin = yakinSertifika(t);
  const dolmus = dolmusSertifikalar(t);
  const yontem = YONTEM_ETIKET[t.uzaktanErisimYontemi ?? 'yok'] ?? 'kayıtsız';

  const nedenler: string[] = [];
  if (b.destekBitti && soz) {
    nedenler.push(`${soz.kod} sözleşmesi ${gunMetni(soz.kalanGun ?? 0)} önce bitti, yenilenmedi`);
  }
  if (b.izlenmiyor) {
    nedenler.push(`${yontem} uzaktan erişim açık, oturum kaydı alınmıyor`);
  }
  if (b.sertifikaDoldu) {
    nedenler.push(`${dolmus[0].ad} ${gunMetni(dolmus[0].kalanGun)} önce doldu`);
  }
  if (b.destekBitiyor && soz) {
    nedenler.push(`${soz.kod} sözleşmesi ${gunMetni(soz.kalanGun ?? 0)} sonra bitiyor`);
  }
  if (b.sertifikaDoluyor && yakin && !b.sertifikaDoldu) {
    nedenler.push(`${yakin.ad} ${gunMetni(yakin.kalanGun)} sonra doluyor`);
  }
  if (b.oturumBilinmiyor) {
    nedenler.push(`${yontem} uzaktan erişim var, oturum kaydı alınıp alınmadığı kayıtlı değil`);
  }
  if (b.sozlesmeYok) {
    nedenler.push('bu tedarikçi için sözleşme kaydı yok');
  }

  const durum: Durum =
    b.destekBitti || b.izlenmiyor || b.sertifikaDoldu ? 'bd'
      : b.destekBitiyor || b.sertifikaDoluyor ? 'md'
        : b.oturumBilinmiyor || b.sozlesmeYok ? 'unk'
          : 'ok';

  const soz_ = durum === 'bd' ? 'Açıkta'
    : durum === 'md' ? 'Yaklaşıyor'
      : durum === 'unk' ? 'Değerlendirilmedi'
        : 'Açık yok';

  /* Satırı yukarı çeken olgu alt satıra iner. Sözleşme hücresi yalnız AY-YIL
     taşıdığı için "bitti" olgusu orada görünmez; bu yüzden en önce o yazılır.
     Sertifika ve sözleşme yokluğunun hiç kolonu yok. */
  const olgu = b.destekBitti && soz
    ? `destek ${gunMetni(soz.kalanGun ?? 0)} önce bitti`
    : b.sertifikaDoldu
      ? `sertifika ${gunMetni(dolmus[0].kalanGun)} önce doldu`
      : b.sertifikaDoluyor && yakin ? `sertifika ${yakin.kalanGun}g`
        : b.sozlesmeYok ? 'sözleşme kaydı yok'
          : null;

  const cumle = nedenler.length > 0
    ? nedenler.slice(0, 2).join(' · ').replace(/^./, (c) => c.toLocaleUpperCase('tr-TR')) + '.'
    : soz && soz.kalanGun !== null
      ? `Sözleşme ${soz.kalanGun} gün daha geçerli; bilinen açık yok.`
      : 'Bilinen açık yok.';

  return { durum, sabit: b.destekBitti, soz: soz_, cumle, olgu, bayrak: b };
}

/* ── Sıralama ─────────────────────────────────────────────────────────── */

const DURUM_SIRA: Record<Durum, number> = { bd: 0, md: 1, unk: 2, pl: 3, ok: 4, tamam: 5 };
const KRITIKLIK_SIRA: Record<string, number> = {
  kritik: 0, yuksek: 1, orta: 2, dusuk: 3, bilinmiyor: 4,
};

/** Süresi dolmuş destek en üstte; sonra durum, sonra kritiklik, sonra ad. */
export function sirala(kayitlar: T[]): T[] {
  return [...kayitlar].sort((a, b) => {
    const da = degerlendir(a), dbb = degerlendir(b);
    if (da.sabit !== dbb.sabit) return da.sabit ? -1 : 1;
    const fark = DURUM_SIRA[da.durum] - DURUM_SIRA[dbb.durum];
    if (fark !== 0) return fark;
    const kf = (KRITIKLIK_SIRA[a.kritiklik] ?? 9) - (KRITIKLIK_SIRA[b.kritiklik] ?? 9);
    if (kf !== 0) return kf;
    return a.ad.localeCompare(b.ad, 'tr');
  });
}

/* ── Biçimleyiciler ───────────────────────────────────────────────────── */

const AY_YIL = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: 'numeric' });

/** `Eyl 2026` — sözleşme hücresinin dar biçimi. */
export function ayYil(iso: string | null): string {
  if (!iso) return '—';
  return AY_YIL.format(new Date(iso)).replace('.', '');
}

/** Santral hücresi: birden fazlası `Kızıldere III JES +14` biçiminde kısalır.
    Tamamı ipucunda ve çekmecede — kısaltma bilgi saklamaz, taşır.
    Üç ad 190px kolona sığmıyor ve üçü birden kırpılıyordu; en çok varlığı
    olan santral yazılır, kalanı sayıya iner. */
export function santralOzeti(santraller: SantralBagi[]): {
  gorunen: SantralBagi[]; ekSayi: number; tam: string;
} {
  const sirali = [...santraller].sort((a, b) =>
    b.varlikSayisi - a.varlikSayisi || a.ad.localeCompare(b.ad, 'tr'));
  const gorunen = sirali.length > 1 ? sirali.slice(0, 1) : sirali;
  return {
    gorunen,
    ekSayi: sirali.length - gorunen.length,
    tam: sirali.map((s) => s.ad).join(' · '),
  };
}

/** `izlenmiyor` ve `bilinmiyor` popover metni: boşluğu anlatır, riski bağlar. */
export function erisimAciklamasi(t: T): string {
  const yontem = YONTEM_ETIKET[t.uzaktanErisimYontemi ?? 'yok'] ?? 'kayıtsız';
  const parcalar: string[] = [];
  if (t.oturumKaydiVar === false) {
    parcalar.push(`${yontem} bağlantı açık, oturum kaydı alınmıyor`);
    parcalar.push('kimin ne yaptığı geriye dönük gösterilemiyor');
  } else {
    parcalar.push(`${yontem} bağlantı açık`);
    parcalar.push('oturum kaydı alınıp alınmadığı kayıtlı değil — doğrulanmadan kapalı sayılmaz');
  }
  parcalar.push(t.riskler.length > 0
    ? t.riskler.slice(0, 2).map((r) => r.kod).join(', ')
    : 'bu boşluk için açılmış risk kaydı yok');
  const yakin = yakinSertifika(t);
  if (yakin && yakin.kalanGun <= UFUK) parcalar.push(`${yakin.ad} ${yakin.kalanGun} gün`);
  return parcalar.join(' · ');
}
