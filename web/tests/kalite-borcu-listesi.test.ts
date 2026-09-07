import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { borcAnahtari } from '../arac/kalite-kurallari.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BORÇ LİSTESİ OKUNABİLİYOR — muafiyet mantığından BAĞIMSIZ iddia

   Bu dosya bilerek ayrıdır ve bilerek `kalite-kurallari.mjs`'i içe
   AKTARMAZ. Sebebi ölçülmüş bir kusurdur: liste kontrolü cırcırın
   birim testleriyle aynı dosyadayken, listeyi silmek o dosyanın
   TOPLANMASINI kırıyordu — vitest "Tests: no tests" diyordu ve 36
   vakanın hepsi birden, adsız bir modül yükleme hatasına dönüşüyordu.
   Bir kaçış yolunun kapalı olduğunu, kapanışın kendi ADIYLA raporlanan
   bir iddia söylemeli.

   İddia iki katmanlıdır ve ikisi ayrı şeyler söyler:
     1 · Dosya VAR ve okunabilir  — hiçbir modül içe aktarılmadan, düz
         dosya okumasıyla. Muafiyet mantığı tümüyle bozuk olsa da bu
         iddia ayakta kalır.
     2 · Modül seviyesinde okunur — liste okunamıyorsa `kalite-borcu.mjs`
         İÇE AKTARILAMAZ. Kapıların bu modülü içe aktarması, listeyi
         silmenin kapıyı susturmak yerine yıkması demektir.
   ═══════════════════════════════════════════════════════════════════════ */

const LISTE = fileURLToPath(new URL('../arac/kalite-borcu.json', import.meta.url));

describe('borç listesi okunabiliyor', () => {
  it('1 · dosya VAR ve okunabilir', () => {
    expect(existsSync(LISTE), `${LISTE} yok — liste kapının parçasıdır, muafiyet defteri değil`)
      .toBe(true);
    expect(() => readFileSync(LISTE, 'utf8')).not.toThrow();
  });

  it('1 · geçerli JSON ve `bulgular` bir DİZİ', () => {
    const belge = JSON.parse(readFileSync(LISTE, 'utf8'));
    expect(Array.isArray(belge.bulgular)).toBe(true);
  });

  it('2 · modül seviyesinde okunur — liste yoksa kapı içe aktarılamaz', async () => {
    const m = await import('../arac/kalite-borcu.mjs');
    expect(Array.isArray(m.BORC)).toBe(true);
    expect(m.BORC).toEqual(JSON.parse(readFileSync(LISTE, 'utf8')).bulgular);
  });

  it('2 · okunamayan liste SESSİZCE boş listeye düşmez, ADIYLA atar', async () => {
    /* `bulgular` yoksa `?? []` deseydik bozuk bir dosya "borç yok" diye
       okunurdu; kapı da o turda her bulguyu yeni sayıp kırmızı yanardı
       ama sebebi yanlış yazardı. Bozukluk bozukluk olarak raporlanır. */
    /* Mesaj SORULAN yolu adlandırmalı: yalnız "OKUNAMADI" arasaydık,
       liste gerçekten silindiğinde bu vaka modülün KENDİ yükleme
       hatasıyla yanlış sebepten yeşil kalırdı. */
    await expect(borcOkuYolla('/olmayan/kalite-borcu.json'))
      .rejects.toThrow(/BORÇ LİSTESİ OKUNAMADI[\s\S]*olmayan\/kalite-borcu\.json/);
  });
});

/* Modülü test içinde çözer: üstteki `import` başarısız olursa 1. katman
   iddiaları yine de koşsun. */
async function borcOkuYolla(yol: string) {
  const m = await import('../arac/kalite-borcu.mjs');
  return m.borcOku(yol);
}

/* Liste TEST GÖVDESİNDE okunur, `describe` gövdesinde DEĞİL. Aradaki
   fark ölçüldü: `describe` gövdesinde okunduğunda liste silinince dosya
   TOPLANAMIYOR ve "1 · dosya VAR ve okunabilir" iddiası hiç
   raporlanmıyordu — kaçış yolunun kapalı olduğunu söyleyecek olan
   iddianın kendisi, kaçış denendiğinde susuyordu. */
const satirlar = () => JSON.parse(readFileSync(LISTE, 'utf8')).bulgular;

describe('borç listesi satır biçimi', () => {
  it('liste BOŞ OLABİLİR — borçsuz hâl cırcırın hedefidir', () => {
    /* `length > 0` beklemek, son satır düzelip silindiğinde `npm test`i
       kırardı: cırcırın kendi talimatı ("düzelen satırı SİLİN") ile
       çelişir ve sonsuza kadar yapay borç tutmayı zorunlu kılardı. */
    expect(Array.isArray(satirlar())).toBe(true);
  });

  it('her satır cırcırın anahtar alanlarını ve bir tavan taşır', () => {
    for (const b of satirlar()) {
      expect(['tasma', 'axe']).toContain(b.kapi);
      expect(typeof b.tur).toBe('string');
      expect(b.rota.startsWith('/')).toBe(true);
      expect([375, 768, 1440]).toContain(b.bant);
      expect(Number.isInteger(b.azami)).toBe(true);
      expect(b.azami).toBeGreaterThan(0);
      expect(b.not.length).toBeGreaterThan(0);
    }
  });

  it('aynı anahtar iki kez yazılamaz — ikinci satır ilkini gölgelerdi', () => {
    const anahtarlar = satirlar().map(borcAnahtari);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
  });
});
