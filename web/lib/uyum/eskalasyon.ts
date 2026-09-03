/* ═══════════════════════════════════════════════════════════════════════
   UY-36 · Eskalasyon matrisi — SAF KARAR

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   `Bildirim.tip` sözlüğünde `eskalasyon` değeri vardı; bildirim ekranı
   onun için ayrı bir mercek ve ayrı bir renk taşıyordu
   (`bildirimler/mantik.ts`). Ürün kodunda o değeri YAZAN HİÇBİR YER
   YOKTU: tek bildirim yazıcısı `motorlar/sonTarih.ts` ve o daima
   `tip: 'uyari'` yazıyordu. Mercek boş bir kovayı süzüyordu.

   Eskalasyon bir BİLDİRİM TÜRÜ değildir, bir KADEMEDİR: gecikme
   büyüdükçe haber daha yukarı gider. Kademeler ayrı satırlar olarak
   tutulur çünkü her kademenin kendi gecikmesi ve kendi hedefi vardır.

   Bu dosya veritabanı ve React bilmez. */

export const HEDEF_TURLERI = ['sorumlu', 'rol', 'kullanici'] as const;
export type HedefTuru = (typeof HEDEF_TURLERI)[number];

export const HEDEF_SOZU: Record<HedefTuru, string> = {
  sorumlu: 'Kaydın kendi sorumlusu',
  rol: 'Bir roldeki herkes',
  kullanici: 'Belirli bir kullanıcı',
};

export const ESKALASYON_KAYNAKLARI = ['bulgu', 'aksiyon', 'gorev'] as const;
export type EskalasyonKaynagi = (typeof ESKALASYON_KAYNAKLARI)[number];

export const KAYNAK_SOZU: Record<EskalasyonKaynagi, string> = {
  bulgu: 'Bulgu', aksiyon: 'Aksiyon', gorev: 'Görev',
};

export type Kural = {
  id: string;
  kaynakTipi: string;
  /** `null` = her önem derecesine uygulanır. */
  onemDerecesi: string | null;
  kademe: number;
  gecikmeGun: number;
  hedefTuru: string;
  hedefDeger: string | null;
  aktif: boolean;
};

/* ── Kural seçimi ────────────────────────────────────────────────────── */

/**
 * Bu kayda hangi kurallar uygulanır?
 *
 * ÖZEL KURAL GENELİ EZER: bir kaynak tipi için hem "kritik" hem de
 * (önem derecesi boş) genel bir kademe tanımlıysa, kritik bulguda yalnız
 * özel olan uygulanır. İkisini birden uygulamak, aynı gecikme için iki
 * bildirim yazardı ve kullanıcı ikisini de okumazdı.
 */
export function gecerliKurallar(o: {
  kurallar: readonly Kural[];
  kaynakTipi: string;
  onemDerecesi: string | null;
}): Kural[] {
  const aday = o.kurallar.filter((k) => k.aktif && k.kaynakTipi === o.kaynakTipi);
  const ozel = aday.filter((k) => k.onemDerecesi !== null
    && k.onemDerecesi === o.onemDerecesi);
  const genel = aday.filter((k) => k.onemDerecesi === null);

  /* Kademe numarası başına tek kural: özel varsa o, yoksa genel. */
  const kademeler = new Map<number, Kural>();
  for (const k of genel) kademeler.set(k.kademe, k);
  for (const k of ozel) kademeler.set(k.kademe, k);
  return [...kademeler.values()].sort((a, b) => a.kademe - b.kademe);
}

/* ── Tetikleme ───────────────────────────────────────────────────────── */

export type TetikKarari =
  | { tetikle: true; kural: Kural; gecikmeGun: number }
  | { tetikle: false; sebep: string };

/**
 * Bu kayıt için hangi kademe tetiklenmeli?
 *
 * En YÜKSEK hak edilmiş kademe seçilir ve daha aşağıdakiler ATLANIR.
 * Sebebi: motor ilk kez 40 gün gecikmiş bir kayda rastladığında,
 * 7/14/30 günlük üç kademeyi arka arkaya yazmak üç bildirim üretir ve
 * hiçbiri okunmaz. Doğru davranış, bugün hak edilen kademeyi yazmaktır.
 *
 * Hedef tarihi OLMAYAN kayıt eskale EDİLMEZ: gecikme, olmayan bir
 * tarihe göre ölçülemez. "Tarihi yok, demek ki gecikmiş" varsayımı
 * ölçülmemiş bir şeyi kusur saymak olurdu.
 */
export function tetikKarari(o: {
  kurallar: readonly Kural[];
  kaynakTipi: string;
  onemDerecesi: string | null;
  hedefTarih: number | null;
  simdi: number;
  /** Bu kayıt için DAHA ÖNCE tetiklenmiş kademeler. */
  tetiklenmisKademeler: readonly number[];
}): TetikKarari {
  if (o.hedefTarih === null) {
    return {
      tetikle: false,
      sebep: 'Hedef tarih girilmemiş — gecikme ölçülemez, eskalasyon yapılmaz.',
    };
  }
  const gecikmeGun = Math.floor((o.simdi - o.hedefTarih) / 86_400_000);
  if (gecikmeGun <= 0) {
    return { tetikle: false, sebep: 'Hedef tarih henüz geçmedi.' };
  }
  const kurallar = gecerliKurallar({
    kurallar: o.kurallar, kaynakTipi: o.kaynakTipi, onemDerecesi: o.onemDerecesi,
  });
  if (kurallar.length === 0) {
    return { tetikle: false, sebep: 'Bu kaynak tipi için tanımlı eskalasyon kuralı yok.' };
  }
  const yapilmis = new Set(o.tetiklenmisKademeler);
  const hakEdilen = kurallar.filter((k) => gecikmeGun >= k.gecikmeGun);
  if (hakEdilen.length === 0) {
    return {
      tetikle: false,
      sebep: `${gecikmeGun} gün gecikme, ilk kademenin eşiğinin (`
        + `${kurallar[0].gecikmeGun} gün) altında.`,
    };
  }
  const enUst = hakEdilen[hakEdilen.length - 1];
  if (yapilmis.has(enUst.kademe)) {
    return {
      tetikle: false,
      sebep: `Kademe ${enUst.kademe} bu kayıt için zaten tetiklenmiş.`,
    };
  }
  return { tetikle: true, kural: enUst, gecikmeGun };
}

/* ── Hedef çözümü ────────────────────────────────────────────────────── */

export type HedefCozumu =
  | { bulundu: true; kullaniciIdleri: string[] }
  | { bulundu: false; sebep: string };

/**
 * Kural kime haber verecek?
 *
 * Hedef bulunamazsa bu SESSİZCE geçilmez: kayıt yine yazılır ve
 * `sebep` alanı "kime haber verilemediğini" söyler. Bir eskalasyonun
 * hedefsiz kalması, kurumun eskalasyon matrisindeki bir boşluktur ve
 * ekranda görünmesi gerekir — "kimseye haber verilemedi" bir başarı
 * değildir.
 */
export function hedefiCoz(o: {
  hedefTuru: string;
  hedefDeger: string | null;
  kaydinSorumlusu: string | null;
  /** `rol` hedefinde: o rolü taşıyan AKTİF kullanıcılar. */
  roldekiler: readonly string[];
  /** `kullanici` hedefinde: kullanıcı aktif mi (yoksa `null`). */
  kullaniciAktif: boolean | null;
}): HedefCozumu {
  if (o.hedefTuru === 'sorumlu') {
    if (o.kaydinSorumlusu === null) {
      return { bulundu: false, sebep: 'Kaydın sorumlusu atanmamış; haber verilecek kişi yok.' };
    }
    return { bulundu: true, kullaniciIdleri: [o.kaydinSorumlusu] };
  }
  if (o.hedefTuru === 'rol') {
    if (o.roldekiler.length === 0) {
      return {
        bulundu: false,
        sebep: `"${o.hedefDeger ?? 'tanımsız'}" rolünde aktif kullanıcı yok.`,
      };
    }
    return { bulundu: true, kullaniciIdleri: [...o.roldekiler] };
  }
  if (o.hedefTuru === 'kullanici') {
    if (o.hedefDeger === null) {
      return { bulundu: false, sebep: 'Kuralda hedef kullanıcı belirtilmemiş.' };
    }
    if (o.kullaniciAktif === null) {
      return { bulundu: false, sebep: 'Hedef kullanıcı kaydı bulunamadı.' };
    }
    if (!o.kullaniciAktif) {
      return { bulundu: false, sebep: 'Hedef kullanıcı PASİF; bildirim okunmayacaktı.' };
    }
    return { bulundu: true, kullaniciIdleri: [o.hedefDeger] };
  }
  return { bulundu: false, sebep: `Tanımsız hedef türü: ${o.hedefTuru}` };
}

/* ── Bildirim metni ──────────────────────────────────────────────────── */

export function eskalasyonBasligi(o: {
  kaynakTipi: string; kademe: number; gecikmeGun: number; baslik: string;
}): string {
  const ad = KAYNAK_SOZU[o.kaynakTipi as EskalasyonKaynagi] ?? o.kaynakTipi;
  return `Eskalasyon (kademe ${o.kademe}) · ${ad} ${o.gecikmeGun} gün gecikti: ${o.baslik}`;
}

/* ── Matrisin bütünlüğü ──────────────────────────────────────────────── */

export type MatrisKusuru = { kural: string; sebep: string };

/**
 * Eskalasyon matrisinin kendi kusurları.
 *
 * Bir eskalasyon matrisi sessizce bozulabilir: kademe 2'nin gecikmesi
 * kademe 1'inkinden küçükse kademe 1 hiç tetiklenmez ve kimse fark
 * etmez. Ekran bunu KUSUR olarak gösterir.
 */
export function matrisKusurlari(kurallar: readonly Kural[]): MatrisKusuru[] {
  const kusurlar: MatrisKusuru[] = [];
  const gruplar = new Map<string, Kural[]>();
  for (const k of kurallar.filter((x) => x.aktif)) {
    const anahtar = `${k.kaynakTipi}|${k.onemDerecesi ?? '*'}`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), k]);
  }
  for (const [anahtar, grup] of gruplar) {
    const sirali = [...grup].sort((a, b) => a.kademe - b.kademe);
    for (let i = 1; i < sirali.length; i++) {
      if (sirali[i].gecikmeGun <= sirali[i - 1].gecikmeGun) {
        kusurlar.push({
          kural: anahtar,
          sebep: `Kademe ${sirali[i].kademe} (${sirali[i].gecikmeGun} gün), kademe `
            + `${sirali[i - 1].kademe} (${sirali[i - 1].gecikmeGun} gün) ile aynı ya da `
            + 'ondan önce tetikleniyor; alt kademe hiç çalışmaz.',
        });
      }
    }
    for (const k of sirali) {
      if (k.hedefTuru === 'rol' && !k.hedefDeger) {
        kusurlar.push({ kural: anahtar, sebep: `Kademe ${k.kademe}: rol hedefi boş.` });
      }
      if (k.hedefTuru === 'kullanici' && !k.hedefDeger) {
        kusurlar.push({ kural: anahtar, sebep: `Kademe ${k.kademe}: kullanıcı hedefi boş.` });
      }
      if (k.gecikmeGun < 0) {
        kusurlar.push({
          kural: anahtar,
          sebep: `Kademe ${k.kademe}: gecikme negatif — hedef tarihten ÖNCE tetiklenir.`,
        });
      }
    }
  }
  return kusurlar;
}
