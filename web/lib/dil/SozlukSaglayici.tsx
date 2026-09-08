'use client';
import {
  createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode,
} from 'react';
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

/** Kapsamda geçen bir sektör ve sözcükleri. */
export type SektorSecenegi = { id: string; kod: string; ad: string; sozluk: Sozluk };

type SecimBaglami = {
  secenekler: SektorSecenegi[];
  etkinId: string | null;
  sec: (id: string | null) => void;
};

const SektorBaglami = createContext<SecimBaglami>({
  secenekler: [], etkinId: null, sec: () => {},
});

/* Seçim tarayıcıda hatırlanır: statik demoda sert yenileme (F5) tüm React
   durumunu siler ve kullanıcı her yenilemede enerjiye düşerdi. Anahtar
   kurulum başına tekildir; değer yalnız bir sektör KİMLİĞİDİR, veri
   değil. Okuma/yazma try/catch içinde: gizli sekmede ve site verisi
   kapalıyken `localStorage` erişimin KENDİSİ atar. */
const ANAHTAR = 'uyum.sektorMercegi';
const OLAY = 'uyum:sektor-mercegi';

/* ── NİÇİN `useSyncExternalStore` ──────────────────────────────────────
   `localStorage` React'in DIŞINDA bir kaynaktır ve iki tuzağı vardır:

     1. Render sırasında okunursa sunucu onu göremez, istemci görür ve
        hidrasyon uyuşmazlığı basar — ekran bir an yanlış sözcük yazar.
     2. `useEffect` + `setState` ile okunursa fazladan bir render turu
        olur ve kural gereği yasaktır (`react-hooks/set-state-in-effect`).

   `useSyncExternalStore` ikisini birden çözer: sunucu anlık görüntüsü
   `null`dur (mercek yok), istemci ilk boyamadan hemen sonra gerçek
   değere geçer ve React geçişi kendisi yönetir. Aynı sekmede açık iki
   kabuk da (`storage` olayı sekmeler arası, `OLAY` sekme içi) aynı
   merceği gösterir. */
function abone(f: () => void): () => void {
  window.addEventListener('storage', f);
  window.addEventListener(OLAY, f);
  return () => {
    window.removeEventListener('storage', f);
    window.removeEventListener(OLAY, f);
  };
}

function anlikIstemci(): string | null {
  try { return window.localStorage.getItem(ANAHTAR); } catch { return null; }
}

/* Sunucuda mercek YOKTUR: kapsamın kendi kararı geçerlidir. */
const anlikSunucu = (): string | null => null;

export function SozlukSaglayici({ sozluk, sektorler = [], children }: {
  /** Kapsamdan sunucuda çözülen sözlük; çok sektörlü kapsamda `null`. */
  sozluk: Sozluk | null;
  /** Kapsamda geçen sektörler — boşsa seçici hiç çizilmez. */
  sektorler?: SektorSecenegi[];
  children: ReactNode;
}) {
  const hatirlanan = useSyncExternalStore(abone, anlikIstemci, anlikSunucu);

  /* Hatırlanan sektör artık kapsamda değilse (yetki değişti, tesis
     kapandı, sektör paketi kaldırıldı) mercek DÜŞER. Olmayan bir merceği
     uygulamak, kullanıcının göremediği bir sektörün sözcüğünü yazmak
     olurdu. Süzme her render'da yapılır, bir kereye mahsus değil:
     kapsam gezinme sırasında değişebilir. */
  const etkinId = hatirlanan !== null && sektorler.some((s) => s.id === hatirlanan)
    ? hatirlanan : null;

  const sec = useCallback((id: string | null) => {
    try {
      if (id === null) window.localStorage.removeItem(ANAHTAR);
      else window.localStorage.setItem(ANAHTAR, id);
    } catch { /* site verisi kapalı — mercek bu oturumda da uygulanamaz */ }
    /* `storage` olayı YALNIZ ÖBÜR sekmelerde tetiklenir; kendi sekmemizi
       kendimiz uyandırırız, yoksa tıklayan kişi değişikliği görmez. */
    window.dispatchEvent(new Event(OLAY));
  }, []);

  /* Etkin sözlük: kullanıcının merceği > sunucunun kapsam kararı.
     Mercek seçilmemişse davranış AYNEN eskisi gibidir. */
  const etkinSozluk = useMemo(() => {
    if (etkinId === null) return sozluk;
    return sektorler.find((s) => s.id === etkinId)?.sozluk ?? sozluk;
  }, [etkinId, sektorler, sozluk]);

  const secim = useMemo(
    () => ({ secenekler: sektorler, etkinId, sec }),
    [sektorler, etkinId, sec],
  );

  return (
    <SektorBaglami.Provider value={secim}>
      <SozlukBaglami.Provider value={etkinSozluk}>{children}</SozlukBaglami.Provider>
    </SektorBaglami.Provider>
  );
}

/** Sektör merceği — seçenekler, etkin olan ve değiştirici. */
export function useSektorSecimi(): SecimBaglami {
  return useContext(SektorBaglami);
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
