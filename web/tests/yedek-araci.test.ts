import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
// @ts-expect-error — `better-sqlite3` tip bildirimi taşımıyor; ürün kodu
// ona Prisma adaptörü üzerinden dokunuyor, doğrudan yalnız bu test için
// gerekiyor (yedeğin veri değişince değiştiğini göstermek üzere).
import Database from 'better-sqlite3';
import { al, denetle, karsilastir, ozet } from '../arac/yedek.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   Ürünün kendi yedekleme aracı (P2-7)

   Ürün, `restoreTestiKaydet` ile müşteriye şunu dayatıyor: **geri
   yüklenebildiği kanıtlanmamış yedek, yedek değildir.** Aynı kural
   ürünün kendi yedekleme aracı için de geçerlidir — bu yüzden araç
   yazılıp bırakılmıyor, ölçülüyor.

   Ölçülen dört şey:
     · yedek TUTARLI ve BÜTÜNDÜR (integrity_check + yabancı anahtar),
     · MANTIKSAL karşılaştırma bayt karşılaştırması DEĞİLDİR — `VACUUM
       INTO` sıkıştırarak yazar, aynı veri farklı bayt üretir; bayt
       karşılaştırması "yedek bozuk" diye yanlış alarm verirdi,
     · var olan bir yedeğin ÜSTÜNE YAZILMAZ,
     · BOZUK bir yedek sessizce kabul edilmez.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yedek-'));

describe('yedek aracı', () => {
  it('yedek alır, doğrular ve göç durumunu raporlar', () => {
    const hedef = path.join(dizin, 'al.db');
    const r = al(hedef);
    expect(r.butunluk).toBe('ok');
    expect(r.yabanciAnahtarKusuru).toBe(0);
    expect(r.tablo).toBeGreaterThan(50);
    // Göç durumu raporlanmazsa, koddan eski bir yedek sessizce geri
    // yüklenir ve ürün saatler sonra alakasız bir ekranda patlar.
    expect(r.gocSayisi).toBeGreaterThan(0);
    expect(r.sonGoc).toBeTruthy();
    expect(r.kullanici).toBeGreaterThan(0);
  });

  it('var olan yedeğin ÜSTÜNE YAZMAZ', () => {
    const hedef = path.join(dizin, 'ustune.db');
    al(hedef);
    // Üstüne yazmak, bir yedeği sessizce yok etmektir.
    expect(() => al(hedef)).toThrow(/zaten var/i);
  });

  it('MANTIKSAL karşılaştırma bayt karşılaştırması değildir', () => {
    /* `VACUUM INTO` boş sayfaları atarak yazar: aynı veri, farklı bayt.
       Bayt karşılaştırması burada "yedek canlıdan farklı" derdi — doğru
       ama yanıltıcı bir cevap. */
    const hedef = path.join(dizin, 'mantik.db');
    const r = al(hedef);
    const k = karsilastir(hedef);
    expect(k.ayniIcerik).toBe(true);
    expect(k.gocFarki).toBe(0);
    expect(k.izFarki).toBe(0);
    expect(r.ozet).not.toBe(k.canli.ozet);       // bayt farkı BEKLENİR
    expect(r.icerikOzeti).toBe(k.canli.icerikOzeti);
  });

  it('içerik özeti VERİ DEĞİŞİNCE değişir — yoksa hiçbir şey ölçmezdi', () => {
    const hedef = path.join(dizin, 'degisim.db');
    const once = al(hedef).icerikOzeti;

    const kopya = path.join(dizin, 'degisim-kopya.db');
    copyFileSync(hedef, kopya);
    const d = new Database(kopya);
    d.prepare("insert into Kullanici (id, adSoyad, eposta) values (?, ?, ?)")
      .run('yedek-test-kisi', 'Yedek Testi', `yt-${Date.now()}@test`);
    d.close();

    expect(denetle(kopya).icerikOzeti).not.toBe(once);
  });

  it('BOZUK yedek sessizce kabul edilmez', () => {
    const bozuk = path.join(dizin, 'bozuk.db');
    writeFileSync(bozuk, 'bu bir SQLite dosyası değil');
    expect(() => denetle(bozuk)).toThrow();
  });

  it('olmayan yedek açıkça reddedilir', () => {
    expect(() => denetle(path.join(dizin, 'yok.db'))).toThrow(/bulunamadı/i);
  });

  it('bayt özeti aynı dosya için kararlıdır', () => {
    const hedef = path.join(dizin, 'kararli.db');
    al(hedef);
    expect(ozet(hedef)).toBe(ozet(hedef));
  });
});

// Geçici dizin bırakılmaz: test kendi çöpünü toplar.
process.on('exit', () => rmSync(dizin, { recursive: true, force: true }));
