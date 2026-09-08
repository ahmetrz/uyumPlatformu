/* ═══════════════════════════════════════════════════════════════════════
   ÖZNİTELİK OKUMA — sektör niteliklerine tek kapı (P1 · URN-ALN)

   Nitelikler `TesisOzellik` / `BirimOzellik` satırlarında yaşar. Bu dosya
   yalnız OKUMA yardımcısı verir; veritabanı ve React bilmez.

   ── SATIRIN YOKLUĞU ÖLÇÜMÜN YOKLUĞUDUR ────────────────────────────────
   `sayisalOzellik` bulamadığında `null` döner ve çağıran bunu 0 ile
   karıştırmamalıdır. Kolon devrinde bu ayrımı şema tutuyordu (`Float?`);
   satır devrinde tutan şey, arayanın `?? 0` yazmamasıdır. Bu yüzden
   yardımcı `varsayilan` parametresi ALMAZ — kolaylık olsun diye eklenen
   böyle bir parametre, "bilinmeyen ≠ sıfır" kuralını sessizce delerdi.

   ── ANAHTARLAR NEDEN BURADA SABİT ─────────────────────────────────────
   `KURULU_GUC` GEÇİCİDİR. §0.5 çekirdeğin sektör terimi taşımamasını
   ister; nihai hâlde ekran, tesiste HANGİ öznitelikler varsa onları
   sektör şemasından gelen etiketle çizer ve hiçbir anahtarı adıyla
   bilmez. Bugün ekranlar hâlâ "kurulu güç" diye özel bir alan çiziyor;
   o ekranlar sözlük katmanına geçtiğinde (P1 · Aşama D/E) bu sabit
   düşer. Kolon adı zaten aynıydı — bu sabit yeni bir bağımlılık
   getirmiyor, mevcut olanı tek yere topluyor.
   ═══════════════════════════════════════════════════════════════════════ */

export type OzellikSatiri = {
  anahtar: string;
  sayisalDeger: number | null;
  metinDeger?: string | null;
  /** Değerin birimi — ekranda yazılan şey budur, koda gömülü sabit değil.

      İSTEĞE BAĞLI DEĞİL, ZORUNLU: `select`ten düşünce `undefined` gelir,
      `birimliOzellik` `null` döner ve ekran sayıyı BİRİMSİZ yazar —
      sessizce. Gerçekten oldu (7 Eyl 2026): portföy toplamı birimiyle
      değil çıplak sayı olarak çıktı ve hiçbir kapı görmedi; ekranı açınca fark
      edildi. Alan zorunlu olunca `birim: true` yazmayan her `select`
      DERLEME hatası verir — kusur sessiz olmaktan çıkar. */
  birim: string | null;
};

/** GEÇİCİ — Aşama D/E'de sözlük katmanına devredilecek. */
export const KURULU_GUC = 'kuruluGuc';

/** Sayısal öznitelik; satır yoksa ya da sayısal değilse `null` (ÖLÇÜLMEDİ). */
export function sayisalOzellik(
  ozellikler: readonly OzellikSatiri[] | null | undefined,
  anahtar: string,
): number | null {
  const o = ozellikler?.find((x) => x.anahtar === anahtar);
  return o?.sayisalDeger ?? null;
}

/** Sayısal öznitelik + BİRİMİ — birim satırda saklanır, ekranda yazılmaz.

    ── NİÇİN ─────────────────────────────────────────────────────────────
    Ekranlar birimi kendi dizelerine gömüyordu (`${g} <enerji birimi>`) ve
    bu iki kusur üretiyordu:

      1. SEKTÖR SIZINTISI. Enerji birimi çekirdek koda gömülüydü; su
         kiracısının tesisinde kurulu güç m³/gün olabilir. Birim sabiti,
         §0.5'in yasakladığı şeyin ta kendisi.
      2. AYNI VERİ İKİ TÜRLÜ OKUNUYORDU. Aynı satır bir ekranda elektrik
         eki taşıyan biçimle, başka ekranda eksiz biçimle yazılıyordu
         (ölçüldü: `tesisler/[id]` ve `yonetim-tezgahi`). Kaynak tekti,
         yazım ikiydi.

    Birim ARTIK VERİDEN gelir: `TesisOzellik.birim` / `BirimOzellik.birim`
    (ölçüldü: 43 satırın 43'ünde dolu). Satırda birim yoksa
    UYDURULMAZ — sayı birimsiz yazılır; bilinmeyen bir birimi varsaymak
    "bilinmeyen ≠ sıfır" kuralının birim tarafındaki karşılığı olurdu. */
export function birimliOzellik(
  ozellikler: readonly OzellikSatiri[] | null | undefined,
  anahtar: string,
): { deger: number | null; birim: string | null } {
  const o = ozellikler?.find((x) => x.anahtar === anahtar);
  return { deger: o?.sayisalDeger ?? null, birim: o?.birim ?? null };
}

/** Ekran yazısı: `120 <birim>` · birimsiz satırda `120` · ölçülmemişte `null`.

    `null` dönüşü çağıranın kendi "—" ya da "ölçülmedi" sözcüğünü
    seçmesi içindir; buradan bir yer tutucu dönmek, ölçülmemiş değeri
    ekranda ölçülmüş gibi gösterme riskini araca taşırdı. */
const SAYI = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export function olculenYazi(o: { deger: number | null; birim: string | null }): string | null {
  if (o.deger === null) return null;
  /* Sayı TÜRKÇE biçimlenir: binlik ayracı nokta, ondalık virgül. Ölçüldü
     (8 Eyl 2026): su portföyü toplamı ekranda `342700 m³/gün` diye
     çıkıyordu — okunabilir bir büyüklük değil, bir rakam dizisi. Enerji
     tarafında sayılar üç haneli olduğu için kusur görünmüyordu; ikinci
     sektör onu görünür yaptı. Biçimleme BURADA yapılır çünkü "ölçülen
     değerin ekran yazısı" tek kaynaktır; her çağıranda tekrarlansaydı
     biri unutulurdu. */
  const s = SAYI.format(o.deger);
  return o.birim ? `${s} ${o.birim}` : s;
}

/** Metin özniteliği; satır yoksa `null`. */
export function metinOzellik(
  ozellikler: readonly OzellikSatiri[] | null | undefined,
  anahtar: string,
): string | null {
  const o = ozellikler?.find((x) => x.anahtar === anahtar);
  return o?.metinDeger ?? null;
}

export type BirimliToplam = {
  /** Ölçülmüşlerin toplamı; `null` = hiç ölçüm yok YA DA birim karışık. */
  toplam: number | null;
  /** Toplamın birimi — satırlardan gelir. */
  birim: string | null;
  /** Ölçülen satırlar tek birimde değil (ya da birimsiz var). */
  karisikBirim: boolean;
  olculen: number;
  toplamKayit: number;
};

/** Birimli değerlerin toplamı — FARKLI BİRİMLER TOPLANMAZ.

    ── NİÇİN BÖYLE ───────────────────────────────────────────────────────
    Ölçülmemişler atlanır; toplam ölçülmüş olanların toplamıdır ve
    eksikler sıfır sayılmaz (`olculen` kaç kayıttan geldiğini söyler ki
    ekran "17 tesisin 16'sı" diyebilsin).

    Birim ise sektöre göre değişir (elektrik gücü · debi · kütle akışı).
    Önceki hâl
    birimi hiç sormadan topluyordu; iki sektörlü bir kiracıda bu, anlamsız
    bir sayıyı anlamlı gibi gösterirdi. Ekranların bir kısmı bu tuzağı
    kendi içinde çözmüştü (`/portfoy` satır birimlerini karşılaştırıyordu)
    ama toplamı yine de üretiyor, sadece BİRİMİ gizliyordu — yanlış sayı
    ekranda kalıyordu. Karar tek yere taşındı: karışıksa SAYI DA YOK.

    Birimsiz ölçüm (birimi kaydedilmemiş satır) da karışık sayılır: onu
    birimli bir toplama katmak, o satırın birimini UYDURMAK olurdu. */
export function birimliToplam(
  degerler: readonly { deger: number | null; birim: string | null }[],
): BirimliToplam {
  let toplam = 0;
  let olculen = 0;
  const birimler = new Set<string | null>();
  for (const d of degerler) {
    if (d.deger !== null) { toplam += d.deger; olculen += 1; birimler.add(d.birim); }
  }
  const tek = birimler.size === 1 ? [...birimler][0] : null;
  const karisik = olculen > 0 && (birimler.size > 1 || tek === null);
  return {
    toplam: olculen === 0 || karisik ? null : toplam,
    birim: karisik ? null : tek,
    karisikBirim: karisik,
    olculen,
    toplamKayit: degerler.length,
  };
}

/** `birimliToplam`ın öznitelik satırları üzerinden hâli. */
export function ozellikToplami(
  kayitlar: readonly { ozellikler: readonly OzellikSatiri[] }[],
  anahtar: string,
): BirimliToplam {
  return birimliToplam(kayitlar.map((k) => birimliOzellik(k.ozellikler, anahtar)));
}

/** Sayısal özniteliğe göre AZALAN, eşitlikte ada göre artan sıralama.

    Kolon devrinde bunu veritabanı yapıyordu:
    kurulu güç bir KOLONDU ve `orderBy` doğrudan ona bakabiliyordu.
    Öznitelik bir
    ilişki olduğu için `orderBy` ona bakamıyor; sıra JS'e taşındı ve
    SQLite'ın davranışı BİREBİR korundu: `DESC` NULL'ları sona koyar,
    burada da ölçülmemiş olan sona iner. Ölçülmemişi başa almak, onu
    "en büyük" göstermek olurdu. */
export function ozelligeGoreSirala<T extends { ad: string; ozellikler: readonly OzellikSatiri[] }>(
  kayitlar: readonly T[],
  anahtar: string,
): T[] {
  return [...kayitlar].sort((a, b) => {
    const x = sayisalOzellik(a.ozellikler, anahtar);
    const y = sayisalOzellik(b.ozellikler, anahtar);
    if (x === null && y === null) return a.ad.localeCompare(b.ad, 'tr');
    if (x === null) return 1;
    if (y === null) return -1;
    if (x !== y) return y - x;
    return a.ad.localeCompare(b.ad, 'tr');
  });
}
