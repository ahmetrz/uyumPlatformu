import { describe, expect, it } from 'vitest';
import { esle } from '../arac/ters-kapsam.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   TERS KAPSAMA NÖBETÇİSİ

   `tests/senaryo-kutugu.test.ts` şunu bekler: yazdığım her senaryonun bir
   testi var (senaryo → test, GAP 0). Bu nöbetçi tersini bekler:

     üründe kullanıcının tetikleyebildiği her davranış kütükte YAZILI.

   İkisi ayrı kusur ailesini yakalar. Senaryo → test kapısı, kimsenin
   senaryo YAZMADIĞI bir eylemi göremez: olmayan senaryonun testi de
   yoktur, sayı yine sıfır çıkar. Bu yüzden yeni bir sunucu eylemi, motor
   ya da rota eklendiğinde bu test kırmızı olur ve kütüğe yazılmasını
   ister.

   Ölçüm `arac/ters-kapsam.mjs` içindedir; burada yalnız eşik durur.
   ═══════════════════════════════════════════════════════════════════ */

type Davranis = { tur: string; kimlik: string; senaryolar: string[] };

describe('ters kapsama — davranış → senaryo', () => {
  const { sonuc } = esle() as { sonuc: Davranis[] };
  const bosta = sonuc.filter((d) => d.senaryolar.length === 0);

  it('senaryosu olmayan kullanıcı davranışı YOKTUR', () => {
    /* Kırmızıysa: `node arac/ters-kapsam.mjs` listeyi verir. Çözüm testi
       susturmak değil, davranışı `lib/senaryo/` altına YAZMAKTIR —
       arkasından da o senaryonun testini. */
    expect(bosta.map((d) => `${d.tur} · ${d.kimlik}`)).toEqual([]);
  });

  it('envanter boş değil — araç sessizce kör kalmamış olmalı', () => {
    /* Bir yol değişikliği (dizin adı, dosya adı kalıbı) envanteri
       sıfırlasaydı yukarıdaki test de yeşil kalırdı: hiç davranış yoksa
       hiçbiri boşta olmaz. Alt sınır o sessiz körlüğü yakalar. */
    const say = (tur: string) => sonuc.filter((d) => d.tur === tur).length;
    expect(say('rota')).toBeGreaterThan(40);
    expect(say('sunucu eylemi')).toBeGreaterThan(150);
    expect(say('motor')).toBeGreaterThan(20);
    expect(say('API ucu')).toBeGreaterThan(5);
    expect(sonuc.filter((d) => d.tur.startsWith('arayüz')).length).toBeGreaterThan(50);
  });
});
