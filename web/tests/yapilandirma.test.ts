import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  AYARLAR, AYAR_SOZLUGU, GRUP_SIRASI, ayarCiftDogrula, ayarDogrula, ayarTanimi, degerMetni,
} from '@/lib/yapilandirma/tanimlar';
import { MODULLER, ayarinModulu, kapsamaOzeti, kutukTutarli } from '@/lib/yonetim/moduller';

/* ═══════════════════════════════════════════════════════════════════════
   Yapılandırma sözlüğü + okuma katmanı

   Kural: bir ayarın YOKLUĞU sıfır değil VARSAYILANDIR; bozuk kayıt da
   varsayılana düşer ama kaynağı "gecersiz_kayit" olarak işaretlenir —
   sessizce varsayılan gibi görünmez. Sözlük ile modül kütüğü birbirini
   eksiksiz göstermelidir (kutukTutarli).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yapilandirma-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { ayarOku, ayar, ayarlar, tumAyarlar } = await import('@/lib/yapilandirma/oku');

describe('Sözlük tutarlılığı', () => {
  it('her anahtar tek, her varsayılan kendi şemasını geçer', () => {
    const anahtarlar = AYARLAR.map((a) => a.anahtar);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    for (const a of AYARLAR) {
      const d = ayarDogrula(a.anahtar, a.varsayilan);
      expect(d.ok, `${a.anahtar} varsayılanı şemayı geçmeli`).toBe(true);
      expect(GRUP_SIRASI).toContain(a.grup);
      expect(['A', 'B']).toContain(a.sinif);
      expect(a.etki.length, `${a.anahtar} etki listesi boş olamaz`).toBeGreaterThan(0);
    }
  });

  it('her ayar bir konsol modülüne bağlı; kütük–sözlük çapraz kontrolü boş döner', () => {
    for (const a of AYARLAR) {
      const m = ayarinModulu(a.anahtar);
      expect(m, `${a.anahtar} modülsüz`).not.toBeNull();
      expect(m!.hedefTipi).toBe('ayar');
      expect(m!.sinif, `${a.anahtar} sınıfı modülüyle çelişiyor`).toBe(a.sinif);
    }
    expect(kutukTutarli()).toEqual([]);
  });

  it('modül kodları tek; kapsama özeti payda/pay tutarlı', () => {
    const kodlar = MODULLER.map((m) => m.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    const o = kapsamaOzeti();
    expect(o.toplam).toBe(MODULLER.length);
    expect(o.ab + o.c).toBe(o.toplam);
    expect(o.yonetilen + o.eksik).toBe(o.ab);
    expect(o.yonetilen).toBe(o.konsol + o.mevcutEkran);
    expect(o.eksikler.length).toBe(o.eksik);
    // Eksik kalan her modül nedenini yazar; sessiz eksik yok.
    for (const m of MODULLER.filter((x) => x.yer === 'eksik' || x.yer === 'kod')) {
      expect(m.neden, `${m.kod} nedeni yok`).toBeTruthy();
    }
    // Onay kuyruğu modülü konsolun kendi bölümüdür (hedef tipi yok); diğer her konsol modülü hedef tipi taşır.
    for (const m of MODULLER.filter((x) => x.yer === 'konsol' && x.kod !== 'degisiklikTalepleri')) {
      expect(m.hedefTipi, `${m.kod} konsolda ama hedef tipi yok`).toBeTruthy();
    }
    for (const m of MODULLER.filter((x) => x.yer === 'mevcut_ekran')) {
      expect(m.rota, `${m.kod} mevcut ekran ama rota yok`).toMatch(/^\//);
    }
  });

  it('şema: tip ve sınır dışı değerler reddedilir', () => {
    expect(ayarDogrula('motor.son_tarih.bulgu_gun', 'otuz').ok).toBe(false);
    expect(ayarDogrula('motor.son_tarih.bulgu_gun', -1).ok).toBe(false);
    expect(ayarDogrula('motor.son_tarih.bulgu_gun', 45).ok).toBe(true);
    expect(ayarDogrula('bilinmeyen.anahtar', 1).ok).toBe(false);
    expect(ayarDogrula('kabuk.kunye', 42).ok).toBe(false);
  });

  it('çift kısıt: yüksek eşik kritik eşiğin altında kalmalı', () => {
    expect(ayarCiftDogrula({ 'risk.esik.kritik': 20, 'risk.esik.yuksek': 12 })).toBeNull();
    expect(ayarCiftDogrula({ 'risk.esik.kritik': 12, 'risk.esik.yuksek': 12 })).toMatch(/kritik/i);
    expect(ayarCiftDogrula({ 'risk.esik.kritik': 10, 'risk.esik.yuksek': 15 })).toMatch(/kritik/i);
  });

  it('değer metni birimi taşır, mantık değeri sözcükle yazılır', () => {
    const t = ayarTanimi('motor.son_tarih.bulgu_gun')!;
    expect(degerMetni(t, 30)).toMatch(/30/);
    const bayrak = AYARLAR.find((a) => typeof a.varsayilan === 'boolean')!;
    expect(degerMetni(bayrak, true)).not.toBe('true');
  });
});

describe('Okuma katmanı — yokluk varsayılandır, bozuk kayıt işaretlenir', () => {
  const ANAHTAR = 'motor.son_tarih.bulgu_gun';
  const tanim = AYAR_SOZLUGU[ANAHTAR];

  beforeAll(async () => {
    await db.yapilandirma.deleteMany({ where: { anahtar: { in: [ANAHTAR, 'kabuk.kunye'] } } });
  });

  it('kayıt yokken varsayılan ve kaynak=varsayilan', async () => {
    const o = await ayarOku<number>(ANAHTAR);
    expect(o.deger).toBe(tanim.varsayilan);
    expect(o.kaynak).toBe('varsayilan');
    expect(o.guncellendi).toBeNull();
  });

  it('geçerli kayıt okunur ve kaynak=yapilandirma', async () => {
    await db.yapilandirma.create({ data: { anahtar: ANAHTAR, degerJson: JSON.stringify(45) } });
    const o = await ayarOku<number>(ANAHTAR);
    expect(o.deger).toBe(45);
    expect(o.kaynak).toBe('yapilandirma');
    expect(await ayar<number>(ANAHTAR)).toBe(45);
    const coklu = await ayarlar([ANAHTAR, 'kabuk.kunye'] as const);
    expect(coklu[ANAHTAR]).toBe(45);
    expect(coklu['kabuk.kunye']).toBe(AYAR_SOZLUGU['kabuk.kunye'].varsayilan);
  });

  it('şemayı geçmeyen kayıt varsayılana düşer ama gecersiz_kayit diye işaretlenir', async () => {
    await db.yapilandirma.update({ where: { anahtar: ANAHTAR }, data: { degerJson: JSON.stringify('bozuk') } });
    const o = await ayarOku<number>(ANAHTAR);
    expect(o.deger).toBe(tanim.varsayilan);
    expect(o.kaynak).toBe('gecersiz_kayit');
    expect(o.guncellendi).not.toBeNull();
  });

  it('JSON bile olmayan kayıt da gecersiz_kayit', async () => {
    await db.yapilandirma.update({ where: { anahtar: ANAHTAR }, data: { degerJson: '{bozuk' } });
    expect((await ayarOku(ANAHTAR)).kaynak).toBe('gecersiz_kayit');
    await db.yapilandirma.delete({ where: { anahtar: ANAHTAR } });
  });

  it('bilinmeyen anahtar fırlatır (sessiz undefined yok)', async () => {
    await expect(ayarOku('yok.boyle.anahtar')).rejects.toThrow(/Bilinmeyen/);
  });

  it('tumAyarlar sözlüğün tamamını, sözlük sırasıyla döner', async () => {
    const hepsi = await tumAyarlar();
    expect(hepsi.map((a) => a.anahtar)).toEqual(AYARLAR.map((a) => a.anahtar));
  });
});
