import 'server-only';
import type { Adaptor } from './sozlesme';
import { ADAPTORLER } from './adaptorler';

/* Adaptör kayıt defteri.

   Çekirdek (cekirdek.ts) hiçbir adaptörü ismen tanımaz; yalnız burada
   kayıtlı olanı `tip` üzerinden çözer. Böylece bir connector tipinin
   adaptörü henüz yazılmamışsa çekirdek "boş sonuç" ile devam etmez,
   AÇIK HATA verir.

   SAHTE ADAPTÖR YASAK: kayıtlı olmak "çalışıyor" demek değildir.
   Bağlanamayan (kimlik bilgisi bekleyen) bir tip `BaglanmamisAdaptor`'ı
   genişleterek KAYITLI olur — çekirdek onu koşturmaz, koşuyu
   `kimlik_bekleniyor` ile kapatır. "Kayıtlı değil" ise bambaşka bir
   şeydir ve koşuyu `basarisiz` kapatır. */

const KAYIT = new Map<string, Adaptor>();

/* ─── Adaptör kayıtları ──────────────────────────────────────────────
   `adaptorler/index.ts` tip → adaptör haritasını tutar; kayıt defteri
   onu yükler. Yeni bir adaptör o haritaya eklenince burada iş yoktur.
   ─────────────────────────────────────────────────────────────────── */
for (const [tip, adaptor] of Object.entries(ADAPTORLER as Record<string, Adaptor>)) {
  if (adaptor.tip !== tip) {
    // Harita anahtarı ile adaptörün kendi tipi ayrışırsa connector'lar
    // yanlış adaptöre gider — sessiz kalmak yerine yüklemede patlar.
    throw new Error(`Adaptör kayıt tutarsızlığı: '${tip}' anahtarı '${adaptor.tip}' tipini taşıyor`);
  }
  KAYIT.set(tip, adaptor);
}

/** Kayıtlı connector tipleri (alfabetik). */
export function kayitliTipler(): string[] {
  return [...KAYIT.keys()].sort();
}

/** Bir tip için adaptör var mı — çözmeden sorar (ekranlar için). */
export function adaptorVarMi(tip: string): boolean {
  return KAYIT.has(tip);
}

/**
 * Adaptörü kaydeder. Aynı tip iki kez kaydedilirse SESSİZCE üzerine
 * yazılmaz — çakışma bir yapılandırma hatasıdır. Bilinçli değiştirme
 * (hot reload, test fikstürü) `ustuneYaz` ile açıkça istenir.
 */
export function adaptorKaydet(adaptor: Adaptor, ustuneYaz = false): void {
  if (!adaptor?.tip) throw new Error('adaptorKaydet: adaptörün `tip` alanı zorunlu');
  const mevcut = KAYIT.get(adaptor.tip);
  if (mevcut && mevcut !== adaptor && !ustuneYaz) {
    throw new Error(
      `adaptorKaydet: '${adaptor.tip}' tipi için zaten bir adaptör kayıtlı — ` +
      'üzerine yazmak için ustuneYaz=true verin',
    );
  }
  KAYIT.set(adaptor.tip, adaptor);
}

/** Kaydı kaldırır; kaldırıldıysa true. */
export function adaptorSil(tip: string): boolean {
  return KAYIT.delete(tip);
}

/**
 * Tipin adaptörünü çözer. Bilinmeyen tip için AÇIK hata verir: eksik
 * adaptör "kayıt yok" gibi görünmemeli, koşu bunun üzerine `basarisiz`
 * kapanmalıdır.
 */
export function adaptorCoz(tip: string): Adaptor {
  const adaptor = KAYIT.get(tip);
  if (!adaptor) {
    const kayitli = kayitliTipler();
    throw new Error(
      `Bu connector tipi için adaptör kayıtlı değil: '${tip}'. ` +
      `Kayıtlı tipler: ${kayitli.length ? kayitli.join(', ') : '(hiçbiri)'}`,
    );
  }
  return adaptor;
}
