import 'server-only';
import { createHash } from 'node:crypto';

/* Adaptörlerin paylaştığı küçük yardımcılar.

   Bu dosya HİÇBİR dış sisteme bağlanmaz ve veri üretmez. Yalnız her
   adaptörün ihtiyaç duyduğu iki şeyi verir:

     1. kaynakKayitId üretimi — kaynağın kararlı bir kimliği yoksa
        (ör. başlıksız bir switch ARP dökümü) kimlik ALANLARINDAN
        deterministik bir özet üretilir. Rastgele/artan sayaç YASAK:
        idempotency buna dayanır, ikinci koşuda aynı satır aynı kimliği
        üretmezse keşif kuyruğu her koşuda çoğalır.
     2. "boş metin → null" dönüşümü — bilinmeyen ile boş string aynı
        değildir; boş string veritabanına yazılmaz. */

/** Boş/whitespace metni null'a indirir. `0` ya da `false` DOKUNULMAZ. */
export function bosNull(deger: unknown): string | null {
  if (deger === null || deger === undefined) return null;
  const s = String(deger).trim();
  return s.length > 0 ? s : null;
}

/**
 * Kimlik alanlarından deterministik kaynak kayıt kimliği üretir.
 *
 * Aynı parçalar → aynı kimlik, her koşuda. Parçaların hepsi boşsa kimlik
 * ÜRETİLMEZ (null döner) — kimliksiz kayıt idempotent olamaz, çağıran onu
 * reddetmelidir. Sessizce rastgele bir kimlik uydurmak, her koşuda yeni
 * keşif satırı açar ve kuyruğu çöpe çevirir.
 */
export function kararliKimlik(
  onEk: string,
  parcalar: (string | null | undefined)[],
): string | null {
  const temiz = parcalar
    .map((p) => bosNull(p))
    .filter((p): p is string => p !== null)
    .map((p) => p.toUpperCase());
  if (temiz.length === 0) return null;
  const ozet = createHash('sha256').update(temiz.join('')).digest('hex').slice(0, 32);
  return `${onEk}:${ozet}`;
}

/** İçerik parmak izi — delta imleci olarak kullanılır ("aynı dosya mı?"). */
export function icerikOzeti(icerik: string): string {
  return createHash('sha256').update(icerik).digest('hex').slice(0, 16);
}
