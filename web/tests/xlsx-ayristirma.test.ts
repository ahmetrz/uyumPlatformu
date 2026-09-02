import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   `.xlsx` AYRIŞTIRMA — kullanıcının yüklediği dosyayı okuyan yolun ağı

   İçe aktarım hattının iki okuyucusu da `.xlsx` ayrıştırıyor:
     · `lib/entegrasyon/varlikAktarim.ts · dosyayiAyristir` (matris kipi)
     · `lib/eylemler.ts · aktarimYukle`                     (nesne kipi)

   Bugüne kadar İKİSİNİN DE `.xlsx` dalı testsizdi: `varlik-aktarim`
   testleri yalnız CSV tamponu besliyordu. Yani ayrıştırıcı kütüphanesi
   değişince — sürüm yükseltmesi ya da paket takası — davranış sessizce
   kayabilirdi. Kullanıcının yüklediği dosyayı okuyan yolda bu en pahalı
   kör noktadır: hata vermez, yanlış veriyi envantere yazar.

   Fikstür DEPODA DONMUŞTUR (`tests/fixture/aktarim-ornek.xlsx`,
   üreteci `arac/xlsx-fikstur.mjs`). Testin kendi ürettiği bir tampon
   işe yaramazdı: yazıcı ve okuyucu aynı kütüphaneden gelir, ikisi
   birden yanlış olsa bile kendi içinde tutarlı görünür. Donmuş ikili
   ne yazıyorsa onu yazar; SONRADAN GELEN her okuyucu onu doğru çözmek
   zorundadır.

   Her iddia ölçülmüş bir davranıştır, hiçbiri süs değildir. En kritiği
   BOŞ HÜCRE: `hucreMetni` hiçbir koşulda `0` uydurmamalıdır — "bilinmeyen
   ≠ sıfır" ürünün en temel kuralıdır ve tam burada, ayrıştırıcının
   içinde yaşar.
   ═══════════════════════════════════════════════════════════════════════ */

const { dosyayiAyristir } = await import('@/lib/entegrasyon/varlikAktarim');

const FIKSTUR = path.join(process.cwd(), 'tests', 'fixture', 'aktarim-ornek.xlsx');
const tampon = () => readFileSync(FIKSTUR);

describe('dosyayiAyristir — donmuş .xlsx fikstürü', () => {
  it('kaynak tipini uzantıdan okur', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.kaynakTipi).toBe('xlsx');
  });

  it('boş başlığa `kolon N` adı verir, tekrarı `#2` ile ayırır', async () => {
    // Kolon eşleme ekranı başlıklarla çalışır; iki kolon aynı adı
    // taşırsa biri ötekinin üstüne yazılır ve VERİ SESSİZCE KAYBOLUR.
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.basliklar).toEqual([
      'Asset Tag', 'Site Code', 'Device Type', 'Firmware Version',
      'kolon 5', 'Asset Tag #2',
    ]);
  });

  it('tümü boş satırı DÜŞÜRÜR', async () => {
    // Excel dışa aktarımlarında araya boş satır girmesi olağandır;
    // boş satır bir varlık kaydı değildir.
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar).toHaveLength(3);
  });

  it('tarih hücresini ISO gününe indirir', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[0]['kolon 5']).toBe('2026-03-14');
  });

  it('sayı hücresini ondalığı kaybetmeden metne çevirir', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[0]['Firmware Version']).toBe('2.11');
  });

  it('mantıksal hücreyi evet/hayır yazar', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[0]['Asset Tag #2']).toBe('evet');
    expect(s.satirlar[1]['Asset Tag #2']).toBe('hayir');
  });

  it('BOŞ hücreye asla `0` uydurmaz', async () => {
    // Ürünün en temel kuralı burada, ayrıştırıcının içinde yaşar:
    // bilinmeyen ≠ sıfır. Boş bir firmware sürümü "0" olarak envantere
    // girerse, o varlık yamalanmış görünür.
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[1]['Firmware Version']).toBe('');
    expect(s.satirlar[1]['kolon 5']).toBe('');
  });

  it('GERÇEK sıfırı korur — boşlukla karıştırmaz', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[2]['Firmware Version']).toBe('0');
  });

  it('baştaki ve sondaki boşluğu kırpar', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[1]['Asset Tag']).toBe('GKC-PLC-04');
  });

  it('Türkçe karakterleri bozmaz', async () => {
    const s = await dosyayiAyristir(tampon(), 'envanter.xlsx');
    expect(s.satirlar[2]['Asset Tag']).toBe('ŞŞ-ÖLÇÜM-09');
    expect(s.satirlar[2]['Device Type']).toBe('Sıcaklık ölçer');
  });
});

describe('nesne kipi — `aktarimYukle`nin dayandığı sözleşme', () => {
  /* `aktarimYukle` yetki ve veritabanı ister, o yüzden uçtan uca burada
     koşulmaz; ama DAYANDIĞI ayrıştırma sözleşmesi burada çivilenir:
     `sheet_to_json` başlık satırını anahtar yapar ve `defval` boş hücreyi
     doldurur. Kütüphane değişirse bu iddia kırılır — sessiz kalmaz. */
  it('başlık satırını anahtar yapar ve boş hücreyi `defval` ile doldurur', async () => {
    const XLSX = await import('xlsx');
    const kitap = XLSX.read(tampon(), { type: 'buffer' });
    const sayfa = kitap.Sheets[kitap.SheetNames[0]];
    const ham = XLSX.utils.sheet_to_json<Record<string, unknown>>(sayfa, { defval: '' });

    expect(ham).toHaveLength(3);
    expect(ham[0]['Site Code']).toBe('KIZILDERE3');
    // Boş başlıklı kolona kütüphane kendi adını verir; `aktarimYukle`
    // yalnız adı bilinen kolonları okur, bu yüzden adın NE olduğu değil
    // boş hücrenin `''` gelmesi bağlayıcıdır.
    expect(Object.values(ham[1])).toContain('');
  });
});
