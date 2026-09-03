/* ═══ Saha modül kütüğü — dashboard görünürlük / sıra GÜVENLİ BEYAZ LİSTE ══

   Yönetim konsolu (`moduleGorunurluk`, A sınıfı, anahtar `saha.yerlesim`)
   Saha ekranının YALNIZ sunum katmanını yönetir: hangi izinli blok görünür,
   KPI kalemleri hangi sırada. Serbest sürükle-bırak YOK; bilgi mimarisi
   (`Genel.tsx` bölge düzeni) ve tek ekran sözleşmesi bu dosyayla korunur.

   Yönetilemez (buraya GİRMEZ): birincil gezinme, durum semantiği (renk /
   d-* sınıfları), kritik uyarı mantığı, bilinmiyor ≠ sıfır kuralları, veri
   erişim/kapsam kuralları, RBAC, motor davranışı.

   `required` modül gizlenemez — Saha'nın kritik karar yüzeyleri (uyum
   endeksi, müdahale gerektirenler, takımyıldız, kritik risk, gecikmiş
   aksiyon, yaklaşan denetim, santral şeridi) her yerleşimde vardır.
   `allowedPositions` KPI kalemine izinli konum kümesidir: kritik risk
   ilk iki konumdan çıkamaz (uyarı görünürlüğü).

   Bu dosya istemciye de gider: `db` yok, yalnız kütük ve saf fonksiyon.
   Doğrulama SUNUCUDA da aynı fonksiyonla yapılır (`tanimlar.ts` şeması);
   istemcinin hesapladığı ön izleme yetki değildir. */

export type SahaAlani = 'dikkat' | 'alan' | 'kpi' | 'serit';

export type SahaModulu = {
  id: string;
  ad: string;
  /** Ekran bölgesi — bölgeler arası taşıma YOK (bilgi mimarisi sabit). */
  alan: SahaAlani;
  defaultVisible: boolean;
  /** KPI kalemi için izinli konumlar (0 tabanlı); sıralanamayan modülde null. */
  allowedPositions: number[] | null;
  /** Kritik karar yüzeyi: gizlenemez. */
  required: boolean;
  hideable: boolean;
  orderable: boolean;
  etkilenenEkran: 'Saha';
  aciklama: string;
};

const KPI_KONUMLARI = [0, 1, 2, 3];

export const SAHA_MODULLERI: readonly SahaModulu[] = [
  { id: 'uyumEndeksi', ad: 'Uyum endeksi', alan: 'dikkat', defaultVisible: true, allowedPositions: null,
    required: true, hideable: false, orderable: false, etkilenenEkran: 'Saha',
    aciklama: 'Grup uyum yüzdesi ve bilinmeyen oranı — birincil karar sayısı.' },
  { id: 'egilim', ad: 'Uyum eğilimi (6 ay)', alan: 'dikkat', defaultVisible: true, allowedPositions: null,
    required: false, hideable: true, orderable: false, etkilenenEkran: 'Saha',
    aciklama: 'Aylık anlık çizgisi; bağlam bloğu, karar yüzeyi değil.' },
  { id: 'mudahale', ad: 'Müdahale gerektirenler', alan: 'dikkat', defaultVisible: true, allowedPositions: null,
    required: true, hideable: false, orderable: false, etkilenenEkran: 'Saha',
    aciklama: 'Odak kartı ve kuyruk — kritik uyarı yüzeyi.' },
  { id: 'takimyildizi', ad: 'Takımyıldız (endeks × güç)', alan: 'alan', defaultVisible: true, allowedPositions: null,
    required: true, hideable: false, orderable: false, etkilenenEkran: 'Saha',
    aciklama: 'Ana saha / dağılım alanı.' },
  { id: 'katman', ad: 'Üretim tipi · uyum katmanları', alan: 'alan', defaultVisible: true, allowedPositions: null,
    required: false, hideable: true, orderable: false, etkilenenEkran: 'Saha',
    aciklama: 'Sağ panel; gizlenince alan iki kolona iner, takımyıldız genişler.' },
  { id: 'kpiKritikRisk', ad: 'KPI · Kritik risk', alan: 'kpi', defaultVisible: true, allowedPositions: [0, 1],
    required: true, hideable: false, orderable: true, etkilenenEkran: 'Saha',
    aciklama: 'Kritik uyarı kalemi; yalnız ilk iki konuma yerleşebilir.' },
  { id: 'kpiGecikmisAksiyon', ad: 'KPI · Gecikmiş aksiyon', alan: 'kpi', defaultVisible: true, allowedPositions: KPI_KONUMLARI,
    required: true, hideable: false, orderable: true, etkilenenEkran: 'Saha',
    aciklama: 'Hedef tarihi geçmiş aksiyon sayısı.' },
  { id: 'kpiYaklasanDenetim', ad: 'KPI · Yaklaşan denetim', alan: 'kpi', defaultVisible: true, allowedPositions: KPI_KONUMLARI,
    required: true, hideable: false, orderable: true, etkilenenEkran: 'Saha',
    aciklama: 'En yakın planlı denetime kalan gün.' },
  { id: 'kpiRiskYogunlugu', ad: 'KPI · Risk yoğunluğu', alan: 'kpi', defaultVisible: true, allowedPositions: KPI_KONUMLARI,
    required: false, hideable: true, orderable: true, etkilenenEkran: 'Saha',
    aciklama: 'Kritik · yüksek · ölçülemedi özeti; matris /riskler’de.' },
  { id: 'santralSeridi', ad: 'Santral şeridi', alan: 'serit', defaultVisible: true, allowedPositions: null,
    required: true, hideable: false, orderable: false, etkilenenEkran: 'Saha',
    aciklama: 'Saha seçici; tek ekran sözleşmesinin ikinci yarısı.' },
];

export const SAHA_MODUL_SOZLUGU: Record<string, SahaModulu> =
  Object.fromEntries(SAHA_MODULLERI.map((m) => [m.id, m]));

export const KPI_MODULLERI = SAHA_MODULLERI.filter((m) => m.alan === 'kpi');

/** Saklanan yerleşim: gizli modül kimlikleri + GÖRÜNÜR KPI kalemlerinin sırası. */
export type SahaYerlesimi = { gizli: string[]; kpiSira: string[] };

export const SAHA_YERLESIM_VARSAYILAN: SahaYerlesimi = {
  gizli: SAHA_MODULLERI.filter((m) => !m.defaultVisible).map((m) => m.id),
  kpiSira: KPI_MODULLERI.filter((m) => m.defaultVisible).map((m) => m.id),
};

/* ── Tek ekran sözleşmesi bütçesi ──────────────────────────────────────
   `.ab-b-saha.ab-b-genel` ızgarası `minmax(0,1fr) auto auto`: fotoğrafik
   alan esner, KPI şeridi ve santral şeridi sabit yüksekliktedir. Sözleşme
   (scrollHeight === innerHeight) en küçük sözleşme ekranında (1280×800)
   sabit satırlar + alanın asgari kullanılabilir yüksekliği bütçeyi aşmazsa
   korunur. Sayılar 2026-09 kapanış ölçümünden (kabuk.css yorumları):
   üst bar 56 · KPI kalemi 62/satır · şerit 168 · durum/ayak bantları 40.
   Alan için 360px altı "kritik içerik görünür" sözünü tutmaz. */
export type SozlesmeButcesi = {
  viewportYukseklik: number; ustBar: number; bantlar: number; kpiSatirYukseklik: number;
  seritYukseklik: number; alanAsgari: number; kpiSutun: number;
};
export const SOZLESME_BUTCESI_1280x800: SozlesmeButcesi = {
  viewportYukseklik: 800, ustBar: 56, bantlar: 40, kpiSatirYukseklik: 62, seritYukseklik: 168, alanAsgari: 360, kpiSutun: 4,
};

export type SozlesmeSonucu = { ihlal: boolean; nedenler: string[]; alanYukseklik: number | null };

/** Yerleşim tek ekran sözleşmesini bozar mı? Saf hesap; ölçüm yerine geçmez,
    ölçümden ÖNCE kaydı reddetmek içindir. */
export function sozlesmeKontrol(y: SahaYerlesimi, butce: SozlesmeButcesi = SOZLESME_BUTCESI_1280x800): SozlesmeSonucu {
  const nedenler: string[] = [];
  const gizli = new Set(y.gizli);
  for (const m of SAHA_MODULLERI) {
    if (m.required && gizli.has(m.id)) nedenler.push(`"${m.ad}" kritik karar yüzeyidir; gizlenince sözleşme ("kritik içerik ve şerit aynı anda görünür") bozulur.`);
  }
  const kpiSayisi = KPI_MODULLERI.filter((m) => !gizli.has(m.id)).length;
  const kpiSatir = Math.ceil(kpiSayisi / butce.kpiSutun);
  if (kpiSatir > 1) nedenler.push(`KPI şeridi ${kpiSatir} satıra taşar; tek satır sözleşmesi bozulur.`);
  const serit = gizli.has('santralSeridi') ? 0 : butce.seritYukseklik;
  const alanYukseklik = butce.viewportYukseklik - butce.ustBar - butce.bantlar - kpiSatir * butce.kpiSatirYukseklik - serit;
  if (alanYukseklik < butce.alanAsgari) {
    nedenler.push(`Fotoğrafik alana ${alanYukseklik}px kalır; asgari ${butce.alanAsgari}px (1280×800).`);
  }
  return { ihlal: nedenler.length > 0, nedenler, alanYukseklik };
}

/** Şema + kütük doğrulaması. Hata mesajı Türkçe tek cümledir; sunucu ve istemci aynı yolu kullanır. */
export function yerlesimDogrula(deger: unknown): { ok: true; deger: SahaYerlesimi } | { ok: false; hata: string } {
  if (!deger || typeof deger !== 'object') return { ok: false, hata: 'Yerleşim bir nesne olmalı ({ gizli, kpiSira }).' };
  const d = deger as Record<string, unknown>;
  if (!Array.isArray(d.gizli) || !d.gizli.every((x) => typeof x === 'string')) return { ok: false, hata: '"gizli" dize listesi olmalı.' };
  if (!Array.isArray(d.kpiSira) || !d.kpiSira.every((x) => typeof x === 'string')) return { ok: false, hata: '"kpiSira" dize listesi olmalı.' };
  const gizli = d.gizli as string[]; const kpiSira = d.kpiSira as string[];

  for (const id of gizli) {
    const m = SAHA_MODUL_SOZLUGU[id];
    if (!m) return { ok: false, hata: `Bilinmeyen Saha modülü: ${id}` };
    if (m.required) return { ok: false, hata: `"${m.ad}" zorunlu modüldür; gizlenemez.` };
    if (!m.hideable) return { ok: false, hata: `"${m.ad}" gizlenebilir değil.` };
  }
  if (new Set(gizli).size !== gizli.length) return { ok: false, hata: '"gizli" listesinde yinelenen modül var.' };

  const gizliK = new Set(gizli);
  const beklenen = KPI_MODULLERI.filter((m) => !gizliK.has(m.id)).map((m) => m.id);
  for (const id of kpiSira) {
    const m = SAHA_MODUL_SOZLUGU[id];
    if (!m) return { ok: false, hata: `Bilinmeyen Saha modülü: ${id}` };
    if (!m.orderable || m.alan !== 'kpi') return { ok: false, hata: `"${m.ad}" sıralanabilir KPI kalemi değil.` };
    if (gizliK.has(id)) return { ok: false, hata: `"${m.ad}" gizliyken sırada yer alamaz.` };
  }
  if (new Set(kpiSira).size !== kpiSira.length) return { ok: false, hata: '"kpiSira" listesinde yinelenen kalem var.' };
  if (kpiSira.length !== beklenen.length || beklenen.some((id) => !kpiSira.includes(id))) {
    return { ok: false, hata: '"kpiSira" görünür KPI kalemlerinin tamamını, her birini bir kez içermeli.' };
  }
  for (let i = 0; i < kpiSira.length; i++) {
    const m = SAHA_MODUL_SOZLUGU[kpiSira[i]];
    if (m.allowedPositions && !m.allowedPositions.includes(i)) {
      return { ok: false, hata: `"${m.ad}" ${i + 1}. konuma yerleşemez; izinli konumlar: ${m.allowedPositions.map((p) => p + 1).join(', ')}.` };
    }
  }
  const s = sozlesmeKontrol({ gizli, kpiSira });
  if (s.ihlal) return { ok: false, hata: `Tek ekran sözleşmesi ihlali — ${s.nedenler[0]}` };
  return { ok: true, deger: { gizli: [...gizli], kpiSira: [...kpiSira] } };
}

/** Bozuk/eksik değerde kod varsayılanı; ekran asla boş kalmaz. */
export function yerlesimNormalle(deger: unknown): SahaYerlesimi {
  const d = yerlesimDogrula(deger);
  return d.ok ? d.deger : SAHA_YERLESIM_VARSAYILAN;
}

export function gorunur(y: SahaYerlesimi, id: string): boolean {
  return !y.gizli.includes(id);
}

/** Görünür KPI kimlikleri sırayla; sırada olmayan görünür kalem (eski kayıt) sona eklenir. */
export function kpiSirasi(y: SahaYerlesimi): string[] {
  const gorunen = KPI_MODULLERI.filter((m) => gorunur(y, m.id)).map((m) => m.id);
  const sirali = y.kpiSira.filter((id) => gorunen.includes(id));
  return [...sirali, ...gorunen.filter((id) => !sirali.includes(id))];
}

export type YerlesimFarki = { gizlenen: string[]; gosterilen: string[]; siraDegisti: boolean; kpiSayisi: number };

export function yerlesimFarki(once: SahaYerlesimi, sonra: SahaYerlesimi): YerlesimFarki {
  const o = new Set(once.gizli), s = new Set(sonra.gizli);
  return {
    gizlenen: sonra.gizli.filter((id) => !o.has(id)),
    gosterilen: once.gizli.filter((id) => !s.has(id)),
    siraDegisti: kpiSirasi(once).join('|') !== kpiSirasi(sonra).join('|'),
    kpiSayisi: kpiSirasi(sonra).length,
  };
}

/** Konsol listesi / fark tablosu için tek satır özet. */
export function yerlesimMetni(y: SahaYerlesimi): string {
  const gizli = y.gizli.length ? y.gizli.map((id) => SAHA_MODUL_SOZLUGU[id]?.ad ?? id).join(', ') : 'yok';
  const sira = kpiSirasi(y).map((id) => (SAHA_MODUL_SOZLUGU[id]?.ad ?? id).replace('KPI · ', '')).join(' → ');
  return `gizli: ${gizli} · KPI: ${sira}`;
}
