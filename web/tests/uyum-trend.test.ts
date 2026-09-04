import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   C15 · Eğilim şeridi — `uyumTrendiYukle` sunucu birleştirmesi

   Saf katman (anlikSayimi/trendGeometrisi) ekran-mantik-72'de sınanır; bu
   dosya VERİ katmanını sınar: aynı gün süreç geneli + santral kaydı → yalnız
   genel; yalnız santral kayıtları → toplanır; 13 gün → 12 nokta, eskiden
   yeniye; süreç başına pencere başka sürecin yoğun yazımından etkilenmez.
   Kurulum: dev.db kopyası, TEST_DB importlardan ÖNCE (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-trend-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { uyumTrendiYukle } = await import('@/app/(kabuk)/(operasyonel)/uyum/veri');

const ozet = (uyumlu: number, uyumsuz: number) =>
  JSON.stringify({ durumlar: { uyumlu, uyumsuz }, guvenler: {} });
const gun = (n: number) => new Date(Date.UTC(2031, 0, 1 + n, 12, 0, 0)); // gelecek: seed'le çakışmaz

let surecId = '';
let baskaSurecId = '';
let tesisler: string[] = [];

beforeAll(async () => {
  const s = await db.uyumSureci.findMany({ select: { id: true }, take: 2 });
  expect(s.length).toBeGreaterThanOrEqual(2);
  [surecId, baskaSurecId] = [s[0].id, s[1].id];
  tesisler = (await db.tesis.findMany({ select: { id: true }, take: 2 })).map((t) => t.id);
  expect(tesisler.length).toBe(2);
  // Temiz zemin: iki sürecin test dönemindeki kayıtları
  await db.uyumAnlik.deleteMany({ where: { surecId: { in: [surecId, baskaSurecId] }, tarih: { gte: gun(0) } } });
});

const noktalar = async (sid: string, kapsam: string[] | null = null) =>
  (await uyumTrendiYukle(kapsam)).filter((n) => n.surecId === sid && n.tarih >= gun(0).toISOString());

describe('uyumTrendiYukle — birleştirme', () => {
  it('aynı gün süreç geneli varsa santral kayıtları SAYILMAZ; yoksa toplanır [UYU-TRN-001]', async () => {
    // gün 0: genel (10/0 → %100) + santral (0/10) → yalnız genel
    await db.uyumAnlik.createMany({ data: [
      { surecId, tesisId: null, tarih: gun(0), ozetJson: ozet(10, 0) },
      { surecId, tesisId: tesisler[0], tarih: new Date(gun(0).getTime() + 60_000), ozetJson: ozet(0, 10) },
      // gün 1: yalnız santraller → toplanır: 5/5 → %50
      { surecId, tesisId: tesisler[0], tarih: gun(1), ozetJson: ozet(5, 0) },
      { surecId, tesisId: tesisler[1], tarih: gun(1), ozetJson: ozet(0, 5) },
    ] });
    const n = await noktalar(surecId);
    expect(n.map((x) => x.yuzde)).toEqual([100, 50]);
    expect(n[1].degerlendirilen).toBe(10);
    await db.uyumAnlik.deleteMany({ where: { surecId, tarih: { gte: gun(0) } } });
  });

  it('13 gün → en yeni 12 nokta, eskiden yeniye; öteki sürecin yoğun yazımı pencereyi daraltmaz', async () => {
    await db.uyumAnlik.createMany({ data: Array.from({ length: 13 }, (_, i) => ({
      surecId, tesisId: null, tarih: gun(i), ozetJson: ozet(i, 13 - i),
    })) });
    // Başka süreç aynı günlerde santral başına 20 satır yazsın (eski tek `take` bunu ezerdi).
    await db.uyumAnlik.createMany({ data: Array.from({ length: 13 * 20 }, (_, i) => ({
      surecId: baskaSurecId, tesisId: tesisler[i % 2], tarih: new Date(gun(i % 13).getTime() + i),
      ozetJson: ozet(1, 1),
    })) });
    const n = await noktalar(surecId);
    expect(n).toHaveLength(12);
    expect(n[0].tarih.slice(0, 10)).toBe(gun(1).toISOString().slice(0, 10)); // gün 0 pencere dışı
    expect(n[11].tarih.slice(0, 10)).toBe(gun(12).toISOString().slice(0, 10));
    for (let i = 1; i < n.length; i++) expect(n[i].tarih >= n[i - 1].tarih).toBe(true);
  });

  it('kapsam daraltılmış kullanıcı: süreç geneli nokta kalır, başka santralin satırı girmez', async () => {
    await db.uyumAnlik.deleteMany({ where: { surecId, tarih: { gte: gun(0) } } });
    await db.uyumAnlik.createMany({ data: [
      { surecId, tesisId: tesisler[0], tarih: gun(2), ozetJson: ozet(4, 0) },   // izinli
      { surecId, tesisId: tesisler[1], tarih: gun(2), ozetJson: ozet(0, 4) },   // izinsiz
      { surecId, tesisId: null, tarih: gun(3), ozetJson: ozet(1, 1) },          // genel
    ] });
    const n = await noktalar(surecId, [tesisler[0]]);
    expect(n.map((x) => x.yuzde)).toEqual([100, 50]);
  });
});
