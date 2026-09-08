'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { t, tBas, type Bicim, type Sozluk, type TerimAnahtari } from './terimler';

/* ═══════════════════════════════════════════════════════════════════════
   SÖZLÜK SAĞLAYICI — istemci tarafı (P1 · Aşama E)

   Aşama C/D'de sözlük tek ekrana PROP olarak indi ve sağlayıcı bilerek
   yazılmadı: tek tüketici için context kurmak, kullanılmayan altyapıdır.
   Aşama E ile tüketici sayısı 165 ekrana çıkıyor; sözlüğü her birine
   prop olarak taşımak, taşındığı her katmanda unutulabilecek bir zincir
   kurardı. Sağlayıcı ŞİMDİ gerekli oldu.

   ── HİDRASYON ─────────────────────────────────────────────────────────
   Değer sunucuda çözülür (`kabukVerisi`), kabuğa veriyle iner ve
   sağlayıcıya AYNI nesne olarak verilir. Sunucu render'ı ile istemci
   hidrasyonu aynı girdiyi görür; `t()` zaten saf. Sağlayıcı hiçbir şey
   ölçmez, hiçbir şey getirmez.

   ── HANGİ SÖZLÜK ──────────────────────────────────────────────────────
   Kabuk PAYLAŞILAN katmandır ve tek bir kaydın değil, kullanıcının
   KAPSAMININ dilini konuşur. Kapsamdaki tesisler tek bir sektöre aitse o
   sektörün sözlüğü iner; birden çok sektör varsa `null` iner ve çekirdek
   sözcük kullanılır — iki sektörlü bir kiracıda kabuğun sektörlerden
   birinin sözcüğünü seçmesi, portföyün öbür yarısı için yanlış olurdu.

   Konusu TEK bir kayıt olan ekran (örn. `/tesisler/[id]`) kendi
   sözlüğünü sunucuda çözer ve doğrudan `t(sozluk, …)` çağırır; o daha
   dar ve daha doğru bağlamdır, sağlayıcıyı beklemez.
   ═══════════════════════════════════════════════════════════════════════ */

const SozlukBaglami = createContext<Sozluk | null>(null);

export function SozlukSaglayici({ sozluk, children }: {
  sozluk: Sozluk | null; children: ReactNode;
}) {
  return <SozlukBaglami.Provider value={sozluk}>{children}</SozlukBaglami.Provider>;
}

/** Ham sözlük — genelde `useTerim()` daha kullanışlı. */
export function useSozluk(): Sozluk | null {
  return useContext(SozlukBaglami);
}

/** Bağlama bağlanmış `t` / `tBas`.

    Sağlayıcı yoksa `null` sözlükle çalışır: bileşen çekirdek sözcüğü
    yazar, patlamaz. Sağlayıcı zorunlu kılınsaydı kabuk dışında render
    edilen her bileşen (hata sayfası, e-posta şablonu, test) kırılırdı. */
export function useTerim(): {
  t: (anahtar: TerimAnahtari, bicim?: Bicim) => string;
  tBas: (anahtar: TerimAnahtari, bicim?: Bicim) => string;
} {
  const sozluk = useContext(SozlukBaglami);
  return {
    t: (anahtar, bicim) => t(sozluk, anahtar, bicim),
    tBas: (anahtar, bicim) => tBas(sozluk, anahtar, bicim),
  };
}
