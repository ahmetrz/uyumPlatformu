import type { CSSProperties, ReactNode } from 'react';

/* Atlas temel primitifleri — 02-components.md §3, §8, §13, §16, §17, §18.
   Sunucu bileşeni olarak da kullanılabilir (etkileşimli olanlar ayrı dosyada). */

/* ═══ 8 · StatusMarker ═══════════════════════════════════════════════════
   Boyut şiddeti, ŞEKİL bilinmeyeni kodlar. Renk tek başına asla yeterli
   değildir (erişilebilirlik sözleşmesi §9) ve yanında durum kelimesi
   BULUNMAZ — kelime yalnız çekmecenin kimlik bloğunda geçer. */

export type Durum = 'ok' | 'md' | 'bd' | 'pl' | 'unk' | 'tamam';

export const DURUM_SOZU: Record<Durum, string> = {
  ok: 'Uyumlu',
  md: 'Kısmi',
  bd: 'Uyumsuz',
  pl: 'Planlı',
  unk: 'Değerlendirilmedi',
  tamam: 'Tamamlandı',
};

export function Im({
  durum,
  enKotu = false,
  ad,
}: {
  durum: Durum;
  /** Satırın en kötü hücresi bir kademe büyür ve hale alır (§7). */
  enKotu?: boolean;
  /** Erişilebilir ad — zorunlu; verilmezse durumun Türkçe karşılığı. */
  ad?: string;
}) {
  return (
    <span
      className={`im im-${durum}${enKotu ? ' im-enkotu' : ''}`}
      role="img"
      aria-label={ad ?? DURUM_SOZU[durum]}
    />
  );
}

/* ═══ 3 · MetricRow ══════════════════════════════════════════════════════
   Üründeki TEK KPI muamelesi. Kart yok, kenarlık yok, ikon yok, içinde
   sparkline yok. Operasyonel ve flagship ekranlarda en fazla 4 metrik.
   Renk yalnız SAYININ KENDİSİ alarm olduğunda (gecikmiş/kritik/kalan gün). */

export type Metrik = {
  deger: ReactNode;
  payda?: ReactNode;
  yazi: string;
  durum?: Durum;
};

export function Metrikler({ metrikler }: { metrikler: Metrik[] }) {
  if (process.env.NODE_ENV !== 'production' && metrikler.length > 5) {
    // 02-components §3: operasyonelde 4, Executive şeridinde 5.
    console.warn(`Atlas: MetricRow bütçesi aşıldı (${metrikler.length} > 5)`);
  }
  return (
    <div className="metrikler">
      {metrikler.map((m, i) => (
        <div key={i} className={`metrik${m.durum ? ` d-${m.durum}` : ''}`}>
          <div className="deger">
            {m.deger}
            {m.payda != null && <span className="payda"> / {m.payda}</span>}
          </div>
          <span className="yazi t-caption">{m.yazi}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ 16 · ProgressIndicator ════════════════════════════════════════════
   Üç biçim: bar · segment · kesir. Donut, radyal gauge, yüzde halkası YOK. */

export function Bar({ oran, durum = 'ok', deger }: { oran: number; durum?: Durum; deger?: string }) {
  const y = Math.max(0, Math.min(100, oran));
  return (
    <div className="ilerleme">
      <span className="iz">
        <span className="dolgu" style={{ width: `${y}%`, background: `var(--${durum})` }} />
      </span>
      {deger != null && <span className="deger">{deger}</span>}
    </div>
  );
}

/** Bitişik segmentler: uyumlu / kısmi / uyumsuz / bilinmeyen.
    Bilinmeyen segmenti DAİMA sonda ve kendi gri tonunda (§16). */
export function Segment({
  ok = 0, md = 0, bd = 0, unk = 0,
}: { ok?: number; md?: number; bd?: number; unk?: number }) {
  const toplam = ok + md + bd + unk;
  if (toplam <= 0) return <div className="segment"><span className="s-unk" style={{ width: '100%' }} /></div>;
  const y = (n: number) => `${(n / toplam) * 100}%`;
  return (
    <div className="segment" role="img"
      aria-label={`Uyumlu ${ok}, kısmi ${md}, uyumsuz ${bd}, değerlendirilmedi ${unk}`}>
      {ok > 0 && <span style={{ width: y(ok), background: 'var(--ok)' }} />}
      {md > 0 && <span style={{ width: y(md), background: 'var(--md)' }} />}
      {bd > 0 && <span style={{ width: y(bd), background: 'var(--bd)' }} />}
      {unk > 0 && <span className="s-unk" style={{ width: y(unk) }} />}
    </div>
  );
}

export function Kesir({ pay, payda }: { pay: number; payda: number }) {
  return <span className="kesir">{pay}<span className="payda">/{payda}</span></span>;
}

/* ═══ 13 · Tooltip & Popover ════════════════════════════════════════════
   Hover VE odakla açılır (`:focus-within`), gizleme `display` ile değil
   opacity/visibility ile yapılır. Sözleşme: kritik hiçbir bilgi yalnız
   burada yaşayamaz. */

export function Ipucu({
  metin, genis = false, children,
}: { metin: string; genis?: boolean; children: ReactNode }) {
  return (
    <span className="ipucu-sar">
      {children}
      <span className={`ipucu${genis ? ' genis' : ''}`} role="tooltip">{metin}</span>
    </span>
  );
}

/* ═══ 17 · Buttons ══════════════════════════════════════════════════════ */

type DugmeTuru = 'birincil' | 'cekmece' | 'ikincil' | 'ret' | 'satir';

export function Dugme({
  tur = 'ikincil', children, ...kalan
}: { tur?: DugmeTuru; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`dg dg-${tur}`} {...kalan}>{children}</button>;
}

/** Satır sürükleme göstergesi — seçili satırda bakır olur. */
export const Ok = () => <span className="tbl-ok" aria-hidden>▸</span>;

/* ═══ 18 · Forms ════════════════════════════════════════════════════════ */

export function Alan({
  etiket, zorunlu = false, hata, children,
}: { etiket: string; zorunlu?: boolean; hata?: string | null; children: ReactNode }) {
  return (
    <div>
      <span className="gr-etiket">{etiket}{zorunlu && ' · zorunlu'}</span>
      {children}
      {hata && <p className="gr-hata">{hata}</p>}
    </div>
  );
}

/* ═══ 19 · Loading / Empty / Error / Unauthorised ═══════════════════════
   İllüstrasyon YOK, cesaretlendirici üç cümle YOK: bir etiket, bir cümle,
   bir eylem. Kısmi veri asla sıfır uydurmaz (§19). */

export function Iskelet({ sinif = '', stil }: { sinif?: string; stil?: CSSProperties }) {
  return <span className={`iskelet nabiz ${sinif}`} style={stil} aria-hidden />;
}

export function BosIlk({ cumle, eylem }: { cumle: string; eylem?: ReactNode }) {
  return (
    <div className="blok">
      <p className="t-caption" style={{ margin: 0 }}>Boş · ilk kurulum</p>
      <p className="cumle">{cumle}</p>
      {eylem && <div className="eylem">{eylem}</div>}
    </div>
  );
}

export function BosFiltre({ temizle }: { temizle: () => void }) {
  return (
    <div className="bos-filtre">
      <span>Bu filtreyle kayıt yok.</span>
      <button type="button" className="dg dg-satir" onClick={temizle}>Filtreleri temizle</button>
    </div>
  );
}

export function Hata({ cumle, teknik, yenidenDene }: {
  cumle: string; teknik?: string; yenidenDene?: () => void;
}) {
  return (
    <div className="blok hata" role="alert">
      <p className="t-caption" style={{ margin: 0, color: 'var(--bd)' }}>Hata</p>
      <p className="cumle">{cumle}</p>
      <div className="eylem" style={{ display: 'flex', gap: 'var(--s12)', alignItems: 'center' }}>
        {yenidenDene && <Dugme tur="birincil" onClick={yenidenDene}>Yeniden dene</Dugme>}
        {teknik && (
          <Ipucu metin={teknik} genis>
            <button type="button" className="acikla">Detay</button>
          </Ipucu>
        )}
      </div>
    </div>
  );
}

export function Yetkisiz({ rol }: { rol: string }) {
  return (
    <div className="blok yetkisiz">
      <p className="t-caption" style={{ margin: 0 }}>Yetkisiz</p>
      <p className="cumle">Bu ekran {rol} rolü gerektiriyor.</p>
    </div>
  );
}
