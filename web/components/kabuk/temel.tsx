import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════
   TEMEL PRİMİTİFLER

   Bu dosya önceki arayüz katmanının temel primitiflerinin YENİDEN
   RENKLENDİRİLMİŞ hâli DEĞİLDİR: işaretleme, yoğunluk, tipografi ve
   etkileşim modeli on iki orijinal tasarım prototipinden gelir
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §2–§5).

   AYNI KALAN tek şey SEMANTİK SÖZLEŞMEDİR — `Durum` kümesi, "durum yalnız
   renkle anlatılmaz", "bilinmeyen ≠ sıfır", "kritik bilgi ipucunda
   yaşayamaz". Bunlar tasarım tercihi değil, ürünün doğruluk kuralları;
   yeni sunum katmanı onları devralır.

   Tek kabuk, tek palet (UX denetimi 2026-09): yoğunluk farkı
   (`[data-yogunluk]`) CSS'te ölçüyü ayarlar, malzemeyi değil. */

export type Durum = 'ok' | 'md' | 'bd' | 'pl' | 'unk' | 'tamam';

export const DURUM_SOZU: Record<Durum, string> = {
  ok: 'Uyumlu',
  md: 'Kısmi',
  bd: 'Uyumsuz',
  pl: 'Planlı',
  unk: 'Değerlendirilmedi',
  tamam: 'Tamamlandı',
};

/** Durum → glif sınıfı. Glif ailesi yöne göre değişir (A kare, C daire). */
export const GLIF: Record<Durum, string> = {
  ok: 'g-uygun', tamam: 'g-uygun', md: 'g-kismi',
  bd: 'g-uygunsuz', pl: 'g-planli', unk: 'g-yok',
};

/* ── Durum işareti ────────────────────────────────────────────────────
   Renk İKİNCİ kanaldır: şekil ve ağırlık birincidir. Yanında durum
   SÖZCÜĞÜ bulunmaz; sözcük yalnız detay panelinin kimlik bloğunda geçer. */
export function Im({ durum, enKotu = false, ad }: {
  durum: Durum;
  /** Satırın en kötü hücresi bir kademe büyür (prototip matris grameri). */
  enKotu?: boolean;
  ad?: string;
}) {
  return (
    <span
      className={`ab-glif ${GLIF[durum]}${enKotu ? ' enkotu' : ''}`}
      role="img"
      aria-label={ad ?? DURUM_SOZU[durum]}
    />
  );
}

/* ── Ölçüt satırı ─────────────────────────────────────────────────────
   Prototiplerde ETİKET ÜSTTE, değer altta; kart yok, kenarlık yok, ikon
   yok. Renk yalnız sayının kendisi alarm olduğunda. */

export type Metrik = {
  deger: ReactNode;
  payda?: ReactNode;
  yazi: string;
  durum?: Durum;
};

export function Metrikler({ metrikler }: { metrikler: Metrik[] }) {
  return (
    <div className="ab-olcutler">
      {metrikler.map((m, i) => (
        <div key={i} className={m.durum ? `d-${m.durum}` : undefined}>
          <span className="etiket">{m.yazi}</span>
          <span className="deger">
            {m.deger}
            {m.payda != null && <span className="payda"> / {m.payda}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── İlerleme: bar · segment · kesir ──────────────────────────────────
   Donut, radyal gösterge, yüzde halkası YOK — prototiplerin hiçbirinde
   yok ve bir oranı en kötü okutan biçimler onlar. */

export function Bar({ oran, durum = 'ok', deger }: {
  oran: number; durum?: Durum; deger?: string;
}) {
  const y = Math.max(0, Math.min(100, oran));
  return (
    <span className="ab-bar">
      <span className="iz">
        <span className="dolgu" style={{ width: `${y}%`, background: `var(--${durum})` }} />
      </span>
      {deger != null && <span className="mono deger">{deger}</span>}
    </span>
  );
}

/** Bitişik segmentler. BİLİNMEYEN daima sonda ve TARAMALI — düz gri
    tonun içinde kaybolup "uygun"a katılamaz. */
export function Segment({ ok = 0, md = 0, bd = 0, unk = 0 }: {
  ok?: number; md?: number; bd?: number; unk?: number;
}) {
  const toplam = ok + md + bd + unk;
  if (toplam <= 0) {
    return (
      <span className="ab-b-yigin bos">
        <span className="mono">değerlendirilmemiş</span>
      </span>
    );
  }
  const y = (n: number) => `${(n / toplam) * 100}%`;
  return (
    <span className="ab-b-yigin" role="img"
      aria-label={`Uyumlu ${ok}, kısmi ${md}, uyumsuz ${bd}, değerlendirilmedi ${unk}`}>
      {ok > 0 && <span className="uygun" style={{ width: y(ok) }} />}
      {md > 0 && <span className="kismi" style={{ width: y(md) }} />}
      {bd > 0 && <span className="uygunsuz" style={{ width: y(bd) }} />}
      {unk > 0 && <span className="bilinmeyen" style={{ width: y(unk) }} />}
    </span>
  );
}

/* ── Tik şeridi ───────────────────────────────────────────────────────
   Dolgu YOK: bir ORANI değil, bir DİZİ ÖLÇÜMÜ ya da bir eşik üzerindeki
   AĞIRLIĞI anlatır. `null` tik = o sırada kayıt yok; sıfır değil. */
export function TikSeridi({
  dolu, toplam = 5, durum = 'ok', etiket, olculmedi = false, tikler,
}: {
  dolu?: number;
  toplam?: number;
  durum?: Durum;
  etiket: string;
  olculmedi?: boolean;
  tikler?: (Durum | null)[];
}) {
  if (tikler) {
    return (
      <span className="ab-tik" role="img" aria-label={etiket}>
        {tikler.map((t, i) => (
          <span key={i} className={t ? `tik dolu d-${t}` : 'tik'} />
        ))}
      </span>
    );
  }
  const n = olculmedi ? 0 : Math.max(0, Math.min(toplam, dolu ?? 0));
  return (
    <span className={`ab-tik${olculmedi ? ' olculmedi' : ''}`} role="img" aria-label={etiket}>
      {Array.from({ length: toplam }, (_, i) => (
        <span key={i} className={i < n ? `tik dolu d-${durum}` : 'tik'} />
      ))}
    </span>
  );
}

export function Kesir({ pay, payda }: { pay: number; payda: number }) {
  return <span className="mono ab-kesir">{pay}<span className="payda">/{payda}</span></span>;
}

/* ── İpucu ────────────────────────────────────────────────────────────
   Hover VE odakla açılır. SÖZLEŞME: kritik hiçbir bilgi yalnız burada
   yaşayamaz (harita §7 kusur 1 — prototipin en büyük kusuru buydu). */
export function Ipucu({ metin, genis = false, children }: {
  metin: string; genis?: boolean; children: ReactNode;
}) {
  return (
    <span className="ab-ipucu-sar">
      {children}
      <span className={`ab-ipucu${genis ? ' genis' : ''}`} role="tooltip">{metin}</span>
    </span>
  );
}

/* ── Düğme ────────────────────────────────────────────────────────── */

type DugmeTuru = 'birincil' | 'ikincil' | 'ret' | 'satir' | 'tam' | 'bilesen';

export function Dugme({ tur = 'ikincil', children, className, ...kalan }: {
  tur?: DugmeTuru; children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button"
      className={`ab-dugme${tur === 'ikincil' ? '' : ` ${tur}`}${className ? ` ${className}` : ''}`}
      {...kalan}>
      {children}
    </button>
  );
}

export const Ok = () => <span className="ab-ok" aria-hidden>→</span>;

/* ── Form alanı ───────────────────────────────────────────────────────
   Kök `<label>`: içindeki TEK kontrol (input · select · textarea) etiketi
   örtük olarak alır — `htmlFor`/`id` eşlemesi gerekmez, axe `label`
   kuralı geçer. Sözleşme: bir Alan en fazla BİR kontrol sarar (label
   birden çok etiketlenebilir öğe içeremez). */
export function Alan({ etiket, zorunlu = false, hata, children }: {
  etiket: string; zorunlu?: boolean; hata?: string | null; children: ReactNode;
}) {
  return (
    <label className="ab-alan">
      <span className="etiket">{etiket}{zorunlu && ' · zorunlu'}</span>
      {children}
      {hata && <p className="hata" role="alert">{hata}</p>}
    </label>
  );
}

/* ── Yükleniyor · boş · hata · yetkisiz ───────────────────────────────
   İllüstrasyon yok, cesaretlendirici üç cümle yok: bir etiket, bir
   cümle, bir eylem. Kısmi veri asla sıfır uydurmaz. */

export function Iskelet({ sinif = '', stil }: { sinif?: string; stil?: CSSProperties }) {
  return <span className={`ab-iskelet ${sinif}`} style={stil} aria-hidden />;
}

export function BosIlk({ cumle, eylem }: { cumle: string; eylem?: ReactNode }) {
  return (
    <div className="ab-blok">
      <span className="etiket">Boş · ilk kurulum</span>
      <p className="cumle">{cumle}</p>
      {eylem && <div className="eylem">{eylem}</div>}
    </div>
  );
}

export function BosFiltre({ temizle }: { temizle: () => void }) {
  return (
    <div className="ab-blok">
      <span className="etiket">Süzgeç</span>
      <p className="cumle">Bu süzgeçle kayıt yok.</p>
      <div className="eylem">
        <Dugme onClick={temizle}>Süzgeci temizle</Dugme>
      </div>
    </div>
  );
}

export function Hata({ cumle, teknik, yenidenDene }: {
  cumle: string; teknik?: string; yenidenDene?: () => void;
}) {
  return (
    <div className="ab-blok hata" role="alert">
      <span className="etiket">Hata</span>
      <p className="cumle">{cumle}</p>
      <div className="eylem">
        {yenidenDene && <Dugme tur="birincil" onClick={yenidenDene}>Yeniden dene</Dugme>}
        {/* Teknik ayrıntı ipucunda DEĞİL, açılır blokta: hata mesajı
            kritik bilgidir ve hover'a bağlanamaz. */}
        {teknik && (
          <details className="ab-teknik">
            <summary>Teknik ayrıntı</summary>
            <p className="mono">{teknik}</p>
          </details>
        )}
      </div>
    </div>
  );
}

/* 403 — kabuğun İÇİNDE çizilir, ayrı rota yok: kullanıcı nerede olduğunu
   ve nereye gidebileceğini görmeye devam eder. Sorunun adı (hangi yetki)
   ve çıkış yolu (kim verir, nereye dönülür) yan yana. */
/* ── Bilinmeyen ≠ sıfır ≠ sağlıklı ≠ ölçülmedi ─────────────────────────
   Dört ayrı hâl, dört ayrı cümle. "Veri yok" tek kutuya toplanınca
   okuyucu sıfır sanır (Eylül 2026 denetimi, §5). Üçü de `role="status"`
   taşır; `.taramali` sol kenar 45° tarama = bilinmeyen dilimiyle aynı
   şekil kodu. */

/** Kaynak var, ölçüm hiç YAPILMAMIŞ (denetlenmemiş santral, sorgulanmamış cihaz). */
export function Olculmedi({ ne, neden, eylem }: { ne: string; neden?: string; eylem?: ReactNode }) {
  return (
    <div className="ab-blok taramali" role="status">
      <span className="etiket">Ölçülmedi</span>
      <p className="cumle"><b>{ne}</b> için henüz ölçüm yok{neden ? ` — ${neden}` : ''}. Bu sıfır değildir.</p>
      {eylem && <div className="eylem">{eylem}</div>}
    </div>
  );
}

/** Ölçüm yapılacaktı, bağlayıcı ULAŞAMADI; son bilinen değer varsa yaşı yazılır. */
export function BaglantiYok({ kaynak, sonBasarili, eylem }: {
  kaynak: string; sonBasarili?: string; eylem?: ReactNode;
}) {
  return (
    <div className="ab-blok taramali" role="status">
      <span className="etiket">Bağlantı yok</span>
      <p className="cumle">
        <b>{kaynak}</b> bağlayıcısına ulaşılamadı.
        {sonBasarili ? <> Son başarılı okuma: <span className="mono">{sonBasarili}</span>; gösterilen değer o kesittir.</> : ' Daha önce başarılı okuma yok; değer gösterilmez.'}
      </p>
      {eylem && <div className="eylem">{eylem}</div>}
    </div>
  );
}

/** Kümenin bir kısmı ölçüldü; toplam, ölçülmeyenleri SAYMAZ ve bunu söyler. */
export function KismiVeri({ olculen, toplam, birim = 'kayıt', eylem }: {
  olculen: number; toplam: number; birim?: string; eylem?: ReactNode;
}) {
  const eksik = Math.max(0, toplam - olculen);
  return (
    <div className="ab-blok taramali" role="status">
      <span className="etiket">Kısmi veri · {olculen}/{toplam}</span>
      <p className="cumle">
        {toplam} {birim}ın {olculen}&apos;i ölçüldü; <b>{eksik}</b> {birim} ölçülmedi ve toplama katılmaz.
        Oranlar yalnız ölçülen kümeye aittir.
      </p>
      {eylem && <div className="eylem">{eylem}</div>}
    </div>
  );
}

export function Yetkisiz({ rol }: { rol: string }) {
  return (
    <div className="ab-blok" role="status">
      <span className="etiket">403 · Yetkisiz</span>
      <p className="cumle">
        Bu ekran <b>{rol}</b> yetkisi gerektiriyor; hesabınızda bu yetki tanımlı değil.
        Yetkiyi kurum yöneticiniz Yetki ekranından tanımlar; talebinizi ona iletin.
      </p>
      <div className="eylem">
        <Link href="/" className="ab-dugme">Ana ekrana dön</Link>
      </div>
    </div>
  );
}
