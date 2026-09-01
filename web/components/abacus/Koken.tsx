import type { DogrulamaDurumu, KokenTipi } from '@/lib/entegrasyon/koken';
import { zamanTR } from '@/lib/sabitler';

/* Veri kökeni göstergesi — "bu satırı nereden biliyoruz?"

   Bu bir DURUM rozeti değildir: durum kelimesi kütükte tekrarlanmaz,
   hap/rozet kalabalığı yoktur — Abacus prototiplerinin hiçbirinde yok.
   Buradaki işaret
   kaydın DOĞRULUĞUNU değil KÖKENİNİ söyler; zemini, kenarlığı ve yarıçapı
   yoktur — 9.5px mono etiket + kaynak sistem adından ibarettir.

   Üç kural:
   - Kökeni olmayan kayıt manueldir; bileşen boş dönmez, "Elle girildi" der.
   - `guven === null` ÖLÇÜLMEDİ demektir; "%0" ya da "0" olarak gösterilmez.
   - İnsanın reddettiği bir köken "otomatik" gibi gösterilmez — reddedilmiş
     doğrulamayı yutmak, kaydı olduğundan güvenilir göstermek olurdu. */

export type KokenGorunumu = {
  kokenTipi: KokenTipi;
  kaynakSistem: string;
  /** 0–1; null = ÖLÇÜLMEDİ (sıfır güven değil). */
  guven: number | null;
  dogrulamaDurumu: DogrulamaDurumu;
  /** Kaynak sistemin veriyi topladığı an; null = kaynak söylemedi. */
  toplanma?: Date | string | null;
  /** Platforma en son yazıldığı an. */
  aktarim?: Date | string | null;
  /** Doğrulayanın görünen adı (kimlik değil). */
  dogrulayan?: string | null;
  dogrulamaZamani?: Date | string | null;
};

type Gorunum = {
  etiket: string;
  kaynak: string | null;
  renk: string;
  baslik: string;
};

/** Görünür etiket + renk + açıklama. Ekranlar bu kararı tekrar üretmesin. */
export function kokenGorunumu(koken?: KokenGorunumu | null): Gorunum {
  if (!koken) {
    return {
      etiket: 'ELLE GİRİLDİ',
      kaynak: null,
      renk: 'var(--i3)',
      baslik: 'Elle girildi — bu kaydı besleyen bir kaynak sistem yok.',
    };
  }
  if (koken.dogrulamaDurumu === 'reddedildi') {
    return {
      etiket: 'REDDEDİLDİ',
      kaynak: koken.kaynakSistem,
      renk: 'var(--bd)',
      baslik: `${koken.kaynakSistem} kaydı incelendi ve reddedildi — bu veri doğru kabul edilmiyor.`,
    };
  }
  if (koken.dogrulamaDurumu === 'dogrulandi' || koken.kokenTipi === 'dogrulanmis') {
    return {
      etiket: 'DOĞRULANMIŞ',
      kaynak: koken.kaynakSistem,
      renk: 'var(--ok)',
      baslik: `${koken.kaynakSistem} kaynağından geldi, bir kullanıcı doğruladı.`,
    };
  }
  if (koken.kokenTipi === 'manuel') {
    return {
      etiket: 'ELLE GİRİLDİ',
      kaynak: null,
      renk: 'var(--i3)',
      baslik: 'Elle girildi — bu kaydı besleyen bir kaynak sistem yok.',
    };
  }
  return {
    etiket: 'OTOMATİK',
    kaynak: koken.kaynakSistem,
    renk: 'var(--i3)',
    baslik: `${koken.kaynakSistem} kaynağından otomatik geldi — henüz doğrulanmadı.`,
  };
}

/**
 * Güven metni. `null` ölçülmedi demektir: "%0" yazmak, ölçülmemiş veriye
 * "tamamen güvenilmez" damgası vurmak olurdu. Gerçek sıfır ölçüm ise "%0"
 * olarak yazılır — ikisi asla aynı görünmez.
 */
export function guvenYazisi(guven: number | null | undefined): string {
  if (guven == null) return 'ölçülmedi';
  return `%${Math.round(guven * 100)}`;
}

function zamanYazisi(d: Date | string | null | undefined): string {
  // Köken satırında '—' yerine 'bilinmiyor': bu bileşenin işi tam olarak
  // bilinmeyeni sıfırdan/boştan ayırmaktır.
  return d == null ? 'bilinmiyor' : zamanTR(d);
}

function dogrulamaYazisi(koken: KokenGorunumu): string {
  const kim = koken.dogrulayan?.trim() || null;
  const ne = koken.dogrulamaZamani ? ` · ${zamanTR(koken.dogrulamaZamani)}` : '';
  if (koken.dogrulamaDurumu === 'dogrulandi')
    return `Doğrulandı · ${kim ?? 'doğrulayan kaydı yok'}${ne}`;
  if (koken.dogrulamaDurumu === 'reddedildi')
    return `Reddedildi · ${kim ?? 'reddeden kaydı yok'}${ne}`;
  return 'Doğrulanmadı';
}

/**
 * Satır/tablo içinde kullanılan sessiz köken işareti. Zemin, kenarlık ve
 * yarıçap YOK — pill değildir.
 */
export function KokenRozeti({ koken }: { koken?: KokenGorunumu | null }) {
  const g = kokenGorunumu(koken);
  return (
    <span className="ab-koken" aria-label={g.baslik} style={{ color: g.renk }}>
      <span>{g.etiket}</span>
      {g.kaynak && <span className="kaynak">· {g.kaynak}</span>}
    </span>
  );
}

/**
 * Çekmecede kullanılan tam köken satırı: kaynak sistem · toplanma zamanı ·
 * güven · doğrulama durumu + doğrulayan. Kökeni olmayan kayıt için de bir
 * şey söyler — sessizce kaybolmaz.
 */
export function KokenSatiri({ koken }: { koken?: KokenGorunumu | null }) {
  const g = kokenGorunumu(koken);

  if (!koken || koken.kokenTipi === 'manuel') {
    return (
      <dl className="ab-panel-ciftler">
        <div>
          <dt>Veri kökeni</dt>
          <dd className="d-unk">Elle girildi</dd>
        </div>
      </dl>
    );
  }

  const alanlar: { etiket: string; deger: string; renk?: string }[] = [
    { etiket: 'Kaynak sistem', deger: koken.kaynakSistem },
    { etiket: 'Toplanma', deger: zamanYazisi(koken.toplanma ?? koken.aktarim) },
    { etiket: 'Güven', deger: guvenYazisi(koken.guven),
      renk: koken.guven == null ? 'var(--i3)' : undefined },
    { etiket: 'Doğrulama', deger: dogrulamaYazisi(koken), renk: g.renk },
  ];

  return (
    <dl className="ab-panel-ciftler">
      {alanlar.map((a) => (
        <div key={a.etiket}>
          <dt>{a.etiket}</dt>
          <dd style={a.renk ? { color: a.renk } : undefined}>{a.deger}</dd>
        </div>
      ))}
    </dl>
  );
}
