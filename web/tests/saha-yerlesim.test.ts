import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Saha modül görünürlüğü (moduleGorunurluk, A sınıfı, anahtar `saha.yerlesim`)

   Sözleşme:
     1. Beyaz liste kütüğü: yalnız kütükteki id; required gizlenemez;
        hideable değilse gizlenemez; KPI kalemi yalnız izinli konuma.
     2. Tek ekran sözleşmesi hesaplanır; ihlal eden yerleşim KAYDEDİLMEZ.
     3. Bozuk / eksik kayıt → kod varsayılanı (Saha asla boş kalmaz).
     4. Sunucu kapısı: okuyucu yazamaz; UI gizlemesi yetki değildir.
     5. A sınıfı: doğrudan yazılır ama izsiz yazılmaz (AktiviteKaydi).
     6. Sürükle-bırak yok: sıra yalnız izinli konum kümesi içinde değişir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-saha-yerlesim-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string): Yetki => ({
  rol, surecId: null, tesisId: null, tuzelKisiId: null, regulasyonId: null, modul: null,
});
const oturum = {
  id: '', adSoyad: 'Test Yöneticisi', eposta: 'yonetim@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { ayarKaydet, etkiHesapla, degisiklikOner } = await import('@/lib/eylemler2/yonetim');
const { ayar, ayarOku } = await import('@/lib/yapilandirma/oku');
const { AYAR_SOZLUGU } = await import('@/lib/yapilandirma/tanimlar');
const { ayarinModulu, MODUL_SOZLUGU, kapsamaOzeti, MODULLER } = await import('@/lib/yonetim/moduller');
const {
  SAHA_MODULLERI, SAHA_MODUL_SOZLUGU, KPI_MODULLERI, SAHA_YERLESIM_VARSAYILAN,
  yerlesimDogrula, yerlesimNormalle, sozlesmeKontrol, kpiSirasi, gorunur, yerlesimFarki, yerlesimMetni,
} = await import('@/lib/yonetim/sahaModulleri');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const ANAHTAR = 'saha.yerlesim';
const GEREKCE = 'Saha operasyon ekibi isteği: katman paneli bu dönem kullanılmıyor';
const VARSAYILAN_SIRA = SAHA_YERLESIM_VARSAYILAN.kpiSira;

async function kimlikle<T>(kim: { id?: string; yetkiler: Yetki[] }, is: () => Promise<T>): Promise<T> {
  const onceki = { id: oturum.id, yetkiler: oturum.yetkiler };
  if (kim.id) oturum.id = kim.id;
  oturum.yetkiler = kim.yetkiler;
  try { return await is(); } finally { oturum.id = onceki.id; oturum.yetkiler = onceki.yetkiler; }
}

let yoneticiA = '';
const temizle = async () => { await db.yapilandirma.deleteMany({ where: { anahtar: ANAHTAR } }); };

beforeAll(async () => {
  const k = await db.kullanici.findFirstOrThrow({ where: { aktif: true }, orderBy: { id: 'asc' } });
  yoneticiA = k.id; oturum.id = yoneticiA;
  await temizle();
});
afterAll(temizle);

/* ── 0 · Kütük: beyaz liste ve kritik yüzeyler ─────────────────────────── */
describe('kütük — beyaz liste, kritik yüzeyler required', () => {
  it('her modülde id/ad/alan/defaultVisible/allowedPositions/required/hideable/orderable var; id benzersiz', () => {
    const idler = new Set<string>();
    for (const m of SAHA_MODULLERI) {
      expect(m.id).toBeTruthy(); expect(m.ad).toBeTruthy();
      expect(['dikkat', 'alan', 'kpi', 'serit']).toContain(m.alan);
      expect(typeof m.defaultVisible).toBe('boolean');
      expect(typeof m.required).toBe('boolean');
      expect(typeof m.hideable).toBe('boolean');
      expect(typeof m.orderable).toBe('boolean');
      expect(m.allowedPositions === null || Array.isArray(m.allowedPositions)).toBe(true);
      expect(m.etkilenenEkran).toBe('Saha');
      expect(idler.has(m.id)).toBe(false); idler.add(m.id);
      // required ile hideable birlikte olamaz; required varsayılan görünür
      if (m.required) { expect(m.hideable).toBe(false); expect(m.defaultVisible).toBe(true); }
      // orderable yalnız KPI kaleminde ve izinli konum kümesiyle
      if (m.orderable) { expect(m.alan).toBe('kpi'); expect(m.allowedPositions?.length).toBeGreaterThan(0); }
    }
  });
  it('kritik karar yüzeyleri required: uyum endeksi, müdahale, takımyıldız, kritik risk, gecikmiş aksiyon, yaklaşan denetim, santral şeridi', () => {
    for (const id of ['uyumEndeksi', 'mudahale', 'takimyildizi', 'kpiKritikRisk', 'kpiGecikmisAksiyon', 'kpiYaklasanDenetim', 'santralSeridi']) {
      expect(SAHA_MODUL_SOZLUGU[id]?.required).toBe(true);
    }
  });
  it('yönetilemez alanlar kütükte yok: gezinme / semantik / RBAC / motor', () => {
    const idler = SAHA_MODULLERI.map((m) => m.id.toLowerCase()).join(' ');
    for (const yasak of ['nav', 'gezinme', 'rbac', 'yetki', 'motor', 'semantik', 'alert', 'uyari', 'unknown', 'bilinmiyor']) {
      expect(idler).not.toContain(yasak);
    }
  });
  it('varsayılan yerleşim geçerli ve KPI sırası 4 kalemi bir kez içerir', () => {
    expect(yerlesimDogrula(SAHA_YERLESIM_VARSAYILAN).ok).toBe(true);
    expect(SAHA_YERLESIM_VARSAYILAN.gizli).toEqual([]);
    expect([...VARSAYILAN_SIRA].sort()).toEqual(KPI_MODULLERI.map((m) => m.id).sort());
  });
  it('ayar A sınıfı, gorunum grubunda, moduleGorunurluk modülüne bağlı; modül konsolda', () => {
    expect(AYAR_SOZLUGU[ANAHTAR].sinif).toBe('A');
    expect(AYAR_SOZLUGU[ANAHTAR].grup).toBe('gorunum');
    expect(ayarinModulu(ANAHTAR)?.kod).toBe('moduleGorunurluk');
    expect(MODUL_SOZLUGU.moduleGorunurluk.sinif).toBe('A');
    expect(MODUL_SOZLUGU.moduleGorunurluk.yer).toBe('konsol');
  });
});

/* ── 1 · Saf doğrulama ────────────────────────────────────────────────── */
describe('yerlesimDogrula — saf kurallar', () => {
  it('izinli modül gizleme kabul (egilim, katman, kpiRiskYogunlugu)', () => {
    expect(yerlesimDogrula({ gizli: ['egilim'], kpiSira: VARSAYILAN_SIRA }).ok).toBe(true);
    expect(yerlesimDogrula({ gizli: ['katman'], kpiSira: VARSAYILAN_SIRA }).ok).toBe(true);
    const ucKpi = VARSAYILAN_SIRA.filter((id) => id !== 'kpiRiskYogunlugu');
    expect(yerlesimDogrula({ gizli: ['kpiRiskYogunlugu'], kpiSira: ucKpi }).ok).toBe(true);
  });
  it('required gizleme reddi', () => {
    for (const id of ['uyumEndeksi', 'mudahale', 'santralSeridi', 'kpiKritikRisk']) {
      const d = yerlesimDogrula({ gizli: [id], kpiSira: VARSAYILAN_SIRA });
      expect(d.ok).toBe(false);
      if (!d.ok) expect(d.hata).toMatch(/zorunlu/);
    }
  });
  it('invalid id reddi (gizli ve kpiSira)', () => {
    const a = yerlesimDogrula({ gizli: ['primaryNav'], kpiSira: VARSAYILAN_SIRA });
    expect(a.ok).toBe(false); if (!a.ok) expect(a.hata).toMatch(/Bilinmeyen/);
    const b = yerlesimDogrula({ gizli: [], kpiSira: [...VARSAYILAN_SIRA.slice(0, 3), 'kpiSahte'] });
    expect(b.ok).toBe(false); if (!b.ok) expect(b.hata).toMatch(/Bilinmeyen/);
  });
  it('şema dışı biçim reddi (nesne değil, dize dışı öğe)', () => {
    expect(yerlesimDogrula('abc').ok).toBe(false);
    expect(yerlesimDogrula(null).ok).toBe(false);
    expect(yerlesimDogrula({ gizli: [1], kpiSira: VARSAYILAN_SIRA }).ok).toBe(false);
    expect(yerlesimDogrula({ gizli: [] }).ok).toBe(false);
  });
  it('sıra değişimi: izinli konumda kabul, izinsiz konumda red (kritik risk ilk ikiden çıkamaz)', () => {
    const [kritik, gecikmis, denetim, yogunluk] = VARSAYILAN_SIRA;
    expect(yerlesimDogrula({ gizli: [], kpiSira: [gecikmis, kritik, denetim, yogunluk] }).ok).toBe(true);
    const r = yerlesimDogrula({ gizli: [], kpiSira: [gecikmis, denetim, kritik, yogunluk] });
    expect(r.ok).toBe(false); if (!r.ok) expect(r.hata).toMatch(/konum/);
  });
  it('kpiSira görünür KPI kalemlerinin tam permütasyonu olmalı; yineleme ve eksik red', () => {
    expect(yerlesimDogrula({ gizli: [], kpiSira: VARSAYILAN_SIRA.slice(0, 3) }).ok).toBe(false);
    expect(yerlesimDogrula({ gizli: [], kpiSira: [VARSAYILAN_SIRA[0], VARSAYILAN_SIRA[0], VARSAYILAN_SIRA[2], VARSAYILAN_SIRA[3]] }).ok).toBe(false);
    expect(yerlesimDogrula({ gizli: ['kpiRiskYogunlugu'], kpiSira: VARSAYILAN_SIRA }).ok).toBe(false); // gizli kalem sırada
    expect(yerlesimDogrula({ gizli: ['egilim', 'egilim'], kpiSira: VARSAYILAN_SIRA }).ok).toBe(false);
  });
  it('tek ekran sözleşmesi: varsayılan korunur; required gizli / şerit gizli ihlal', () => {
    const v = sozlesmeKontrol(SAHA_YERLESIM_VARSAYILAN);
    expect(v.ihlal).toBe(false);
    expect(v.alanYukseklik).not.toBeNull();
    expect(v.alanYukseklik!).toBeGreaterThanOrEqual(360);
    const i = sozlesmeKontrol({ gizli: ['santralSeridi'], kpiSira: VARSAYILAN_SIRA });
    expect(i.ihlal).toBe(true);
    expect(i.nedenler.length).toBeGreaterThan(0);
    // Doğrulama zinciri sözleşme ihlalini reddeder (required kapısı önce yakalar)
    expect(yerlesimDogrula({ gizli: ['santralSeridi'], kpiSira: VARSAYILAN_SIRA }).ok).toBe(false);
  });
  it('fallback: bozuk kayıt kod varsayılanına düşer; ekran boş kalmaz', () => {
    expect(yerlesimNormalle(undefined)).toEqual(SAHA_YERLESIM_VARSAYILAN);
    expect(yerlesimNormalle({ gizli: ['uyumEndeksi'], kpiSira: VARSAYILAN_SIRA })).toEqual(SAHA_YERLESIM_VARSAYILAN);
    expect(yerlesimNormalle('x')).toEqual(SAHA_YERLESIM_VARSAYILAN);
    for (const id of ['uyumEndeksi', 'santralSeridi']) expect(gorunur(yerlesimNormalle(null), id)).toBe(true);
  });
  it('kpiSirasi / yerlesimFarki / yerlesimMetni tutarlı', () => {
    const sonra = { gizli: ['katman', 'kpiRiskYogunlugu'], kpiSira: VARSAYILAN_SIRA.slice(0, 3) };
    expect(kpiSirasi(sonra)).toEqual(VARSAYILAN_SIRA.slice(0, 3));
    const f = yerlesimFarki(SAHA_YERLESIM_VARSAYILAN, sonra);
    expect(f.gizlenen).toEqual(['katman', 'kpiRiskYogunlugu']);
    expect(f.gosterilen).toEqual([]);
    expect(f.siraDegisti).toBe(true);
    expect(f.kpiSayisi).toBe(3);
    expect(yerlesimMetni(sonra)).toMatch(/gizli: /);
  });
});

/* ── 2 · Sunucu kapısı ve iz ───────────────────────────────────────────── */
describe('sunucu — RBAC, doğrudan kayıt, iz, Saha okuması', () => {
  const izinli = { gizli: ['katman', 'kpiRiskYogunlugu'], kpiSira: VARSAYILAN_SIRA.slice(0, 3) };

  it('kayıt yok → Saha kod varsayılanını okur', async () => {
    expect((await ayarOku(ANAHTAR)).kaynak).toBe('varsayilan');
    expect(yerlesimNormalle(await ayar(ANAHTAR))).toEqual(SAHA_YERLESIM_VARSAYILAN);
  });
  it('okuyucu yazamaz (sunucu kapısı); satır yazılmaz', async () => {
    const s = await kimlikle({ yetkiler: [yetki('okuyucu')] }, () => ayarKaydet({ anahtar: ANAHTAR, deger: izinli, gerekce: GEREKCE }));
    expect(hataMetni(s)).toMatch(/yetki/i);
    expect(await db.yapilandirma.count({ where: { anahtar: ANAHTAR } })).toBe(0);
  });
  it('bt_yoneticisi de yazamaz', async () => {
    const s = await kimlikle({ yetkiler: [yetki('bt_yoneticisi')] }, () => ayarKaydet({ anahtar: ANAHTAR, deger: izinli, gerekce: GEREKCE }));
    expect(hataMetni(s)).toMatch(/yetki/i);
  });
  it('required gizleme sunucuda reddedilir', async () => {
    const s = await ayarKaydet({ anahtar: ANAHTAR, deger: { gizli: ['mudahale'], kpiSira: VARSAYILAN_SIRA }, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/zorunlu/);
    expect(await db.yapilandirma.count({ where: { anahtar: ANAHTAR } })).toBe(0);
  });
  it('invalid id sunucuda reddedilir (JSON metni olarak da)', async () => {
    const s = await ayarKaydet({ anahtar: ANAHTAR, deger: JSON.stringify({ gizli: ['sidebar'], kpiSira: VARSAYILAN_SIRA }), gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/Bilinmeyen/);
  });
  it('izinsiz konum sunucuda reddedilir', async () => {
    const [kritik, gecikmis, denetim, yogunluk] = VARSAYILAN_SIRA;
    const s = await ayarKaydet({ anahtar: ANAHTAR, deger: { gizli: [], kpiSira: [gecikmis, denetim, yogunluk, kritik] }, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/konum/);
  });
  it('etki ön izlemesi: etkilenen ekran Saha, sözleşme satırı var', async () => {
    const e = await etkiHesapla({ hedefTipi: 'ayar', hedefId: ANAHTAR, sonra: { anahtar: ANAHTAR, deger: izinli } });
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const b = e.etki.map((x) => x.baslik);
    expect(b).toEqual(expect.arrayContaining(['Etkilenen ekran', 'Gizlenen modül', 'KPI sırası', 'Tek ekran sözleşmesi (1280×800 bütçesi)']));
    expect(e.etki.find((x) => x.baslik === 'Gizlenen modül')?.deger).toBe(2);
  });
  it('gerekçesiz kayıt reddi', async () => {
    expect(hataMetni(await ayarKaydet({ anahtar: ANAHTAR, deger: izinli, gerekce: 'kısa' }))).not.toBe('');
  });
  it('A sınıfı: izinli yerleşim doğrudan yazılır, iz düşer, Saha yeni yerleşimi okur', async () => {
    expect(hataMetni(await ayarKaydet({ anahtar: ANAHTAR, deger: izinli, gerekce: GEREKCE }))).toBe('');
    const o = await ayarOku(ANAHTAR);
    expect(o.kaynak).toBe('yapilandirma');
    expect(yerlesimNormalle(o.deger)).toEqual(izinli);
    expect(gorunur(yerlesimNormalle(o.deger), 'katman')).toBe(false);
    expect(kpiSirasi(yerlesimNormalle(o.deger))).toHaveLength(3);
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Yapilandirma', varlikId: ANAHTAR }, orderBy: { zaman: 'desc' } });
    expect(iz?.aktorId).toBe(yoneticiA);
    expect(iz?.gerekce).toBe(GEREKCE);
    expect(iz?.oncekiDeger ?? '').toMatch(/"gizli":\[\]/);
    expect(iz?.yeniDeger ?? '').toMatch(/katman/);
  });
  it('B akışı bu ayara uygulanmaz (A sınıfı: doğrudan)', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: ANAHTAR, sonra: { anahtar: ANAHTAR, deger: SAHA_YERLESIM_VARSAYILAN }, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/doğrudan/);
  });
  it('veritabanına elle yazılmış bozuk kayıt → Saha varsayılana düşer (gecersiz_kayit)', async () => {
    await db.yapilandirma.update({ where: { anahtar: ANAHTAR }, data: { degerJson: JSON.stringify({ gizli: ['uyumEndeksi'], kpiSira: VARSAYILAN_SIRA }) } });
    const o = await ayarOku(ANAHTAR);
    expect(o.kaynak).toBe('gecersiz_kayit');
    expect(yerlesimNormalle(o.deger)).toEqual(SAHA_YERLESIM_VARSAYILAN);
  });
  it('varsayılana geri dönüş kaydı da izlidir', async () => {
    expect(hataMetni(await ayarKaydet({ anahtar: ANAHTAR, deger: SAHA_YERLESIM_VARSAYILAN, gerekce: 'Dönem sonu: varsayılan yerleşime dönüş' }))).toBe('');
    expect(yerlesimNormalle(await ayar(ANAHTAR))).toEqual(SAHA_YERLESIM_VARSAYILAN);
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'Yapilandirma', varlikId: ANAHTAR } })).toBeGreaterThanOrEqual(2);
  });
});

/* ── 3 · 40/40 kapsama ────────────────────────────────────────────────── */
describe('kapsamaOzeti — A/B modüllerin tamamı yönetilir', () => {
  it('eksik 0; yönetilen === A+B; iki modül de artık eksik değil', () => {
    const o = kapsamaOzeti();
    expect(o.eksik).toBe(0);
    expect(o.eksikler).toEqual([]);
    expect(o.yonetilen).toBe(o.ab);
    expect(o.a + o.b).toBe(o.ab);
    expect(o.ab + o.c).toBe(o.toplam);
    expect(MODULLER.filter((m) => m.sinif !== 'C' && m.yer === 'eksik')).toEqual([]);
  });
});
