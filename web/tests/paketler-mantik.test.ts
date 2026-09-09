import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { HAL_IMI, HAL_SOZU, eylemler, halCumlesi, paketHali, semverKarsilastir } from '@/app/(kabuk)/(operasyonel)/paketler/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.6 — /paketler EKRANI · SAF MANTIK (URN-PKT-016)

   Hâl disk ile veritabanının BİRLEŞİK kararıdır; kurulu ama diskte
   olmayan paket "güncel" değil "diskte yok"tur, doğrulanamayan kopya
   kurulamaz. Eylem düğmesi yetkisize de gösterilir, nedeni yanına yazılır.
   Ekranın kaynak metni "aktifleştirme insan kararı" cümlesini taşır ve
   hiçbir aktifleştirme eylemi çağırmaz.
   ═══════════════════════════════════════════════════════════════════════ */

describe('/paketler · hâl ve eylem mantığı [URN-PKT-016]', () => {
  it('SemVer karşılaştırma: sayısal, eksik parça sıfır', () => {
    expect(semverKarsilastir('0.2.0', '0.10.0')).toBe(-1);
    expect(semverKarsilastir('1.0.0', '0.9.9')).toBe(1);
    expect(semverKarsilastir('0.1', '0.1.0')).toBe(0);
  });

  it('hâl: disk × veritabanı birleşik karar — bilinmeyen kaynak başarı gibi görünmez [URN-PKT-016]', () => {
    const k = (diskSurum: string | null, diskHatalari: number, kuruluSurum: string | null, durum: 'kurulu' | 'arsiv' | null) =>
      paketHali({ diskSurum, diskHatalari, kuruluSurum, durum });
    expect(k('0.1.0', 0, '0.1.0', 'kurulu')).toBe('guncel');
    expect(k('0.2.0', 0, '0.1.0', 'kurulu')).toBe('guncelleme_var');
    expect(k('0.1.0', 0, '0.2.0', 'kurulu')).toBe('disk_eski');
    expect(k(null, 0, '0.1.0', 'kurulu')).toBe('disk_yok');
    expect(k('0.2.0', 3, '0.1.0', 'kurulu')).toBe('dogrulanamadi');
    expect(k('0.1.0', 0, null, null)).toBe('kurulu_degil');
    expect(k('0.1.0', 2, null, null)).toBe('dogrulanamadi');
    expect(k('0.1.0', 0, '0.1.0', 'arsiv')).toBe('arsiv');
    expect(k(null, 0, '0.1.0', 'arsiv')).toBe('arsiv');
    expect(HAL_IMI.disk_yok).toBe('unk');
    expect(HAL_IMI.guncel).toBe('ok');
    expect(HAL_IMI.dogrulanamadi).toBe('bd');
    for (const hal of Object.keys(HAL_SOZU) as (keyof typeof HAL_SOZU)[]) {
      expect(HAL_SOZU[hal].length).toBeGreaterThan(3);
      expect(halCumlesi(hal, { diskSurum: '0.2.0', kuruluSurum: '0.1.0', diskHatalari: 1 }).length).toBeGreaterThan(20);
    }
    expect(halCumlesi('kurulu_degil', { diskSurum: '0.1.0', kuruluSurum: null, diskHatalari: 0 })).toMatch(/TASLAK gelir, aktifleştirme insan kararıdır/);
  });

  it('eylemler: düğme yetkisize gösterilir ve nedeni yazılır; bağımlı ve aktif çerçeve kaldırmayı engeller; diskte yok kurmayı engeller, kaldırmayı değil [URN-PKT-016] [URN-PKT-018]', () => {
    const acik = { yazabilir: true, kurulu: true, bagimlilar: [] as string[], aktifCerceve: 0 };
    expect(eylemler('guncelleme_var', acik)).toEqual({ kur: { etiket: 'Güncelle', engel: null }, kaldir: { etiket: 'Kaldır (arşiv)', engel: null } });
    expect(eylemler('guncel', { ...acik, yazabilir: false }).kur.engel).toMatch(/yetki/);
    expect(eylemler('guncel', { ...acik, yazabilir: false }).kaldir.engel).toMatch(/yetki/);
    expect(eylemler('disk_yok', acik).kur.engel).toMatch(/diskte yok/);
    expect(eylemler('disk_yok', acik).kaldir.engel).toBeNull();
    expect(eylemler('dogrulanamadi', { ...acik, kurulu: false }).kur.engel).toMatch(/doğrulanamadı/);
    expect(eylemler('dogrulanamadi', { ...acik, kurulu: false }).kaldir.engel).toBe('kurulu değil');
    expect(eylemler('kurulu_degil', { ...acik, kurulu: false }).kur).toEqual({ etiket: 'Kur', engel: null });
    expect(eylemler('arsiv', { ...acik, kurulu: false }).kur.etiket).toBe('Geri kur');
    expect(eylemler('guncel', { ...acik, bagimlilar: ['DEMO-TR-SU'] }).kaldir.engel).toMatch(/bağımlı kurulu paket var: DEMO-TR-SU/);
    expect(eylemler('guncel', { ...acik, aktifCerceve: 2 }).kaldir.engel).toMatch(/2 aktif çerçeve/);
    expect(eylemler('disk_eski', acik).kur.engel).toMatch(/eski/);
  });

  it('ekran kaynağı: "aktifleştirme insan kararı" cümlesi kalıcı; hiçbir aktifleştirme eylemi çağrılmaz; kaldırma gerekçe ister [URN-PKT-016]', () => {
    const istemci = readFileSync('app/(kabuk)/(operasyonel)/paketler/PaketlerIstemci.tsx', 'utf8');
    expect(istemci).toMatch(/Aktifleştirme insan kararıdır/);
    expect(istemci).toMatch(/bu ekran hiçbir çerçeveyi\s+aktifleştirmez/);
    expect(istemci).not.toMatch(/surumAktiflestir/);
    expect(istemci).toMatch(/paketKaldir\(\{ kod, gerekce \}\)/);
    expect(istemci).toMatch(/gerekce\.trim\(\)\.length >= 10/);
    const sayfa = readFileSync('app/(kabuk)/(operasyonel)/paketler/page.tsx', 'utf8');
    expect(sayfa).toMatch(/izinVar\(kullanici, 'tanimlar', 'okuma'\)/);
    expect(sayfa).toMatch(/izinVar\(kullanici, 'tanimlar', 'yazma'\)/);
  });

  it('rota gezinmede ve envanterde: Uyum alanının ikincil sırasında Regülasyonlar\'ın yanında, rotalar.json\'da, rota haritasında [URN-PKT-016]', () => {
    const yonler = readFileSync('components/kabuk/yonler.ts', 'utf8');
    expect(yonler).toMatch(/'\/uyum', '\/regulasyonlar', '\/paketler'/);
    expect(yonler).toMatch(/\{ ad: 'Regülasyonlar', yol: '\/regulasyonlar' \},[\s\S]{0,240}\{ ad: 'İçerik paketleri', yol: '\/paketler' \}/);
    const rotalar: string[] = JSON.parse(readFileSync('arac/rotalar.json', 'utf8'));
    expect(rotalar).toContain('/paketler');
    expect(readFileSync('../docs/ROTA_HARITASI.md', 'utf8')).toMatch(/\| `\/paketler` \| zorunlu \| tanımlar \|/);
  });
});
