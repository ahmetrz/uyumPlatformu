import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════════
   UY-13 · Kanıt dosyası deposu — gerçek dosya sistemine karşı

   Bu test depoyu SAHTELEMEZ: içerik adresli bir deponun bütün vaadi
   (yol geçişi imkânsız, aynı içerik iki kez yazılmaz, bozulma
   yakalanır) dosya sistemine dokunmadan doğrulanamaz. Depo kökü geçici
   bir dizindir ve test bitince silinir; üründen bir şey okunmaz,
   ürüne bir şey yazılmaz.

   `KANIT_DEPO_KOKU` ortam değişkeni modül YÜKLENMEDEN önce kurulur:
   `depoKoku()` her çağrıda okur, ama alışkanlık olarak önce kurulur. */

const kok = await mkdtemp(path.join(tmpdir(), 'kanit-deposu-'));
process.env.KANIT_DEPO_KOKU = kok;

const {
  SAGLAYICI_ADI, anahtarUret, depoKoku, dosyayiOku, dosyayiYaz,
} = await import('@/lib/uyum/kanitDeposu');

const bayt = (metin: string) => new TextEncoder().encode(metin);
const ozetle = (metin: string) =>
  createHash('sha256').update(bayt(metin)).digest('hex');

afterAll(async () => {
  await rm(kok, { recursive: true, force: true });
});

describe('UY-13 · depo kökü', () => {
  it('ortamdan okunur', () => {
    expect(depoKoku()).toBe(kok);
  });

  it('sağlayıcı adı OT-48 kütüğüyle aynı sözcüktür', () => {
    expect(SAGLAYICI_ADI).toBe('yerel_dosya');
  });
});

describe('UY-13 · yazma', () => {
  it('dosya yazılır ve anahtar İÇERİKTEN türetilir', async () => {
    const icerik = `politika metni ${randomUUID()}`;
    const s = await dosyayiYaz({ icerik: bayt(icerik), mimeTipi: 'text/plain' });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    const beklenen = ozetle(icerik);
    expect(s.ozet).toBe(beklenen);
    expect(s.anahtar).toBe(anahtarUret(beklenen));
    expect(s.zatenVardi).toBe(false);

    /* Dosya gerçekten diskte ve baytı birebir. */
    const diskten = await readFile(path.join(kok, s.anahtar), 'utf8');
    expect(diskten).toBe(icerik);
  });

  it('aynı içerik iki kez yazılmaz — bu bir hata DEĞİLDİR', async () => {
    /* İki kontrol aynı politika belgesini kanıt gösterebilir. */
    const icerik = `paylaşılan belge ${randomUUID()}`;
    const a = await dosyayiYaz({ icerik: bayt(icerik), mimeTipi: 'text/plain' });
    const b = await dosyayiYaz({ icerik: bayt(icerik), mimeTipi: 'text/plain' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.zatenVardi).toBe(true);
    expect(b.anahtar).toBe(a.anahtar);
  });

  it('kullanıcı girdisi yola HİÇ girmez: anahtar yalnız onaltılık', async () => {
    const s = await dosyayiYaz({
      icerik: bayt(`../../etc/passwd ${randomUUID()}`), mimeTipi: 'text/plain',
    });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.anahtar).toMatch(/^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}$/);
  });

  it('boş dosya REDDEDİLİR — denetçi açtığında hiçbir şey bulamaz', async () => {
    const s = await dosyayiYaz({ icerik: new Uint8Array(0), mimeTipi: 'text/plain' });
    expect(s.ok).toBe(false);
    expect(s.ok === false && s.hata).toContain('boş');
  });

  it('izin listesi dışındaki tip reddedilir ve izinliler yazılır', async () => {
    const s = await dosyayiYaz({ icerik: bayt('PK'), mimeTipi: 'application/zip' });
    expect(s.ok).toBe(false);
    expect(s.ok === false && s.hata).toContain('kabul edilmiyor');
  });

  it('sınırı aşan dosya reddedilir', async () => {
    const { DOSYA_SINIRI } = await import('@/lib/uyum/kanitDosyaKurali');
    const s = await dosyayiYaz({
      icerik: new Uint8Array(DOSYA_SINIRI + 1), mimeTipi: 'application/pdf',
    });
    expect(s.ok).toBe(false);
    expect(s.ok === false && s.hata).toContain('sınırını aşıyor');
  });
});

describe('UY-13 · okuma ve bütünlük', () => {
  it('yazılan dosya okunur ve özeti DOĞRULANIR', async () => {
    const icerik = `denetim raporu ${randomUUID()}`;
    const y = await dosyayiYaz({ icerik: bayt(icerik), mimeTipi: 'text/plain' });
    expect(y.ok).toBe(true);
    if (!y.ok) return;

    const o = await dosyayiOku(y.anahtar);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.ozetDogru).toBe(true);
    expect(o.icerik.toString('utf8')).toBe(icerik);
  });

  it('diskte DEĞİŞTİRİLMİŞ dosya sessizce sağlam dönmez [KNT-DEP-001]', async () => {
    /* Bozulmuş bir kanıtı denetçiye sağlam diye vermek, bu katmanın
       engellemek için var olduğu şeydir. */
    const icerik = `değişecek ${randomUUID()}`;
    const y = await dosyayiYaz({ icerik: bayt(icerik), mimeTipi: 'text/plain' });
    expect(y.ok).toBe(true);
    if (!y.ok) return;

    await writeFile(path.join(kok, y.anahtar), 'başka bir içerik');
    const o = await dosyayiOku(y.anahtar);
    expect(o.ok).toBe(true);
    expect(o.ok === true && o.ozetDogru).toBe(false);
  });

  it('yol geçişi taşıyan anahtar okuma yolunda REDDEDİLİR', async () => {
    /* Anahtar veritabanından gelse bile biçim denetlenir: veritabanı da
       bir gün yanlış veri taşıyabilir. */
    for (const kotu of [
      '../../../etc/passwd',
      'ab/cd/../../../../etc/passwd',
      '/etc/passwd',
      'ab/cd/ZZ',
      'abcd',
    ]) {
      const o = await dosyayiOku(kotu);
      expect(o.ok).toBe(false);
      expect(o.ok === false && o.hata).toContain('biçimi geçersiz');
    }
  });

  it('olmayan dosya açık hata döner — boş içerik uydurulmaz', async () => {
    const yok = anahtarUret('0'.repeat(64));
    const o = await dosyayiOku(yok);
    expect(o.ok).toBe(false);
    expect(o.ok === false && o.hata).toContain('okunamadı');
  });
});
