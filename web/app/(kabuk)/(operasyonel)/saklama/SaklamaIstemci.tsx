'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import {
  imhaKarariniOnayla, imhaKarariniReddet, imhaKarariniUygula, imhaOnerisiAc,
  legalHoldKaldir, legalHoldKoy, saklamaPolitikasiKaydet,
} from '@/lib/eylemler2/saklama';
import {
  POLITIKA_SINIFI, POLITIKA_SOZU, SAKLANABILIR_TIPLER, SURE_SONU_SECENEKLERI,
  SURE_SONU_SOZU, TIP_ETIKETI, degismezMi, politikaDurumu, saklamaCumlesi,
  type SaklamaOzeti, type SaklanabilirTip,
} from '@/lib/uyum/saklama';
import { tarihTR } from '@/lib/sabitler';
import type { Durum } from '@/components/kabuk/temel';

/* ═══ UY-56 · Saklama ekranı ══════════════════════════════════════════

   Üç kütük, bu sırayla: POLİTİKA (ne kadar tutuyoruz) → HOLD (neyi
   dondurduk) → İMHA KARARI (ne siliyoruz). Sıra bilinçli: imha kararı
   politikadan doğar ve hold onu durdurur; tersten okunduğunda hiçbiri
   anlaşılmaz.

   ── SİLME DÜĞMESİ EN SONDA VE EN ZOR ──────────────────────────────────
   İmha kararı önce açılır, sonra BAŞKA biri onaylar, sonra uygulanır. Üç
   adımı tek düğmeye indirmek, bu ekranın var olma sebebini ortadan
   kaldırırdı. */

type Politika = {
  id: string; varlikTipi: string; saklamaGun: number | null; sureSonu: string;
  dayanak: string; aktif: boolean; guncelleyen: string | null;
};
type Hold = {
  id: string; ad: string; varlikTipi: string; varlikId: string | null;
  tesisKod: string | null; gerekce: string; durum: string; koyan: string;
  konuldu: string;
};
type Karar = {
  id: string; varlikTipi: string; kapsananSayi: number; silinenSayi: number | null;
  durum: string; gerekce: string; oneren: string; onaylayan: string | null;
  olusturuldu: string; donemBaslangic: string | null; donemBitis: string | null;
};

const KARAR_IM: Record<string, Durum> = {
  oneri: 'md', onaylandi: 'bd', uygulandi: 'tamam', reddedildi: 'pl',
};
const KARAR_SOZU: Record<string, string> = {
  oneri: 'öneri — onay bekliyor',
  onaylandi: 'ONAYLANDI — uygulanmayı bekliyor',
  uygulandi: 'uygulandı',
  reddedildi: 'reddedildi',
};

const POLITIKA_KOLONLARI = [
  { baslik: 'Süre', genislik: '132px' },
  { baslik: 'Süre sonu', genislik: '230px' },
  { baslik: 'Dayanak', genislik: '1fr' },
];
const HOLD_KOLONLARI = [
  { baslik: 'Kapsam', genislik: '210px' },
  { baslik: 'Koyan', genislik: '150px' },
  { baslik: 'Konuldu', genislik: '104px', sag: true, ikincil: true },
];
const KARAR_KOLONLARI = [
  { baslik: 'Kayıt', genislik: '150px', sag: true },
  { baslik: 'Dönem', genislik: '210px' },
  { baslik: 'Öneren · onaylayan', genislik: '1fr' },
];

export default function SaklamaIstemci({
  ozet, politikalar, holdlar, kararlar, tesisler, yonetebilir,
}: {
  ozet: SaklamaOzeti;
  politikalar: Politika[];
  holdlar: Hold[];
  kararlar: Karar[];
  tesisler: { id: string; kod: string; ad: string }[];
  yonetebilir: boolean;
}) {
  const [form, setForm] = useState<'politika' | 'hold' | 'imha' | null>(null);

  const idx = new Map(politikalar.map((p) => [p.varlikTipi, p]));

  /* Payda kayıt ailelerinin kendisidir: politikası olmayan aile de
     satır olarak GÖRÜNÜR. Yalnız tanımlı politikaları listelemek,
     eksikliği görünmez kılardı. */
  const politikaSatirlari: Satir[] = SAKLANABILIR_TIPLER.map((tip) => {
    const p = idx.get(tip) ?? null;
    const d = politikaDurumu(p ? { saklamaGun: p.saklamaGun, aktif: p.aktif } : null);
    return {
      id: tip,
      durum: POLITIKA_SINIFI[d],
      konu: TIP_ETIKETI[tip],
      alt: `${POLITIKA_SOZU[d]}${degismezMi(tip) ? ' · DEĞİŞMEZ aile, imha edilemez' : ''}`,
      hucreler: [
        p === null ? '—' : p.saklamaGun === null ? 'süresiz' : `${p.saklamaGun} gün`,
        p === null ? '—' : SURE_SONU_SOZU[p.sureSonu as keyof typeof SURE_SONU_SOZU] ?? p.sureSonu,
        p?.dayanak ?? 'dayanak yazılmadı',
      ],
    };
  });

  const holdSatirlari: Satir[] = holdlar.map((h) => ({
    id: h.id,
    durum: h.durum === 'aktif' ? 'bd' : 'pl',
    konu: h.ad,
    alt: `${h.durum === 'aktif' ? 'AKTİF' : 'kaldırıldı'} · ${h.gerekce}`,
    hucreler: [
      `${TIP_ETIKETI[h.varlikTipi as SaklanabilirTip] ?? h.varlikTipi}`
      + `${h.varlikId ? ` #${h.varlikId.slice(0, 8)}…` : ' (aile geneli)'}`
      + `${h.tesisKod ? ` · ${h.tesisKod}` : ''}`,
      h.koyan,
      tarihTR(h.konuldu),
    ],
  }));

  const kararSatirlari: Satir[] = kararlar.map((r) => ({
    id: r.id,
    durum: KARAR_IM[r.durum] ?? 'unk',
    konu: TIP_ETIKETI[r.varlikTipi as SaklanabilirTip] ?? r.varlikTipi,
    alt: `${KARAR_SOZU[r.durum] ?? r.durum} · ${r.gerekce}`,
    hucreler: [
      /* Öneri anındaki ölçüm ile uygulama anındaki ölçüm AYRI yazılır:
         ikisi farklıysa arada bir şey olmuştur ve bu görünmelidir. */
      r.silinenSayi === null
        ? `${r.kapsananSayi} kayıt`
        : `${r.silinenSayi} silindi / ${r.kapsananSayi} ölçülmüştü`,
      r.donemBaslangic && r.donemBitis
        ? `${tarihTR(r.donemBaslangic)} – ${tarihTR(r.donemBitis)}`
        : 'dönem ölçülmedi',
      `${r.oneren}${r.onaylayan ? ` · ${r.onaylayan}` : ' · onay yok'}`,
    ],
  }));

  return (
    /* Kabuk `<main>` BASMAZ (components/kabuk/Kabuk.tsx): ana bölgeyi
       ekranın kendisi çizer. Unutulursa sayfanın hiç ana bölgesi olmaz
       ve "içeriğe atla" bağı bir yere varmaz; axe'ın wcag2a/aa kümesi
       bunu GÖRMEZ, `rota:duman` görür. */
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow="Saklama ve kontrollü imha"
        baslik="kayıt ailesinin saklama politikası tanımlı"
        vurgu={`${ozet.tanimli + ozet.suresiz}/${ozet.tanimlanabilir}`}
        vurguDurumu={ozet.tanimsiz > 0 ? 'bd' : 'ok'}
        metrikler={[
          { deger: String(ozet.tanimli + ozet.suresiz), payda: String(ozet.tanimlanabilir),
            yazi: 'politika tanımlı' },
          { deger: String(ozet.suresiz), yazi: 'süresiz saklama' },
          { deger: String(ozet.aktifHold), yazi: 'aktif hold',
            durum: ozet.aktifHold > 0 ? 'bd' : undefined },
          { deger: String(ozet.bekleyenImha), yazi: 'imha kararı bekliyor',
            durum: ozet.bekleyenImha > 0 ? 'md' : undefined },
        ]}
        sag={yonetebilir ? (
          <div style={{ display: 'flex', gap: 'var(--s8)' }}>
            <Dugme onClick={() => setForm(form === 'politika' ? null : 'politika')}>
              Politika
            </Dugme>
            <Dugme onClick={() => setForm(form === 'hold' ? null : 'hold')}>Hold koy</Dugme>
            <Dugme onClick={() => setForm(form === 'imha' ? null : 'imha')}>İmha önerisi</Dugme>
          </div>
        ) : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        {saklamaCumlesi(ozet)} Ürün hiçbir kaydı KENDİLİĞİNDEN silmez:
        politika bir öneri üretir, imha kararını insan verir ve öneren ile
        onaylayan aynı kişi olamaz.
      </p>

      {form === 'politika' && <PolitikaFormu kapat={() => setForm(null)} />}
      {form === 'hold' && <HoldFormu tesisler={tesisler} kapat={() => setForm(null)} />}
      {form === 'imha' && <ImhaFormu kapat={() => setForm(null)} />}

      <Bolum baslik="Saklama politikaları">
        <Tablo kolonlar={POLITIKA_KOLONLARI} satirlar={politikaSatirlari} />
      </Bolum>

      <Bolum baslik="Hukuki muhafaza">
        {holdSatirlari.length === 0
          ? (
            <BosIlk cumle="Tanımlı hukuki muhafaza yok."
              eylem={yonetebilir
                ? <Dugme tur="birincil" onClick={() => setForm('hold')}>Muhafaza aç</Dugme>
                : undefined} />
          )
          : <Tablo kolonlar={HOLD_KOLONLARI} satirlar={holdSatirlari} />}
        {yonetebilir && holdlar.some((h) => h.durum === 'aktif') && (
          <HoldKaldirma holdlar={holdlar.filter((h) => h.durum === 'aktif')} />
        )}
      </Bolum>

      <Bolum baslik="İmha kararları">
        {kararSatirlari.length === 0
          ? (
            <BosIlk cumle="Hiç imha kararı açılmadı."
              eylem={yonetebilir
                ? <Dugme tur="birincil" onClick={() => setForm('imha')}>İmha kararı aç</Dugme>
                : undefined} />
          )
          : <Tablo kolonlar={KARAR_KOLONLARI} satirlar={kararSatirlari} />}
        {yonetebilir && <KararEylemleri kararlar={kararlar} />}
      </Bolum>
    </main>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>{baslik}</p>
      {children}
    </section>
  );
}

function PolitikaFormu({ kapat }: { kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tip, setTip] = useState<string>(SAKLANABILIR_TIPLER[0]);
  const [suresiz, setSuresiz] = useState(false);
  const [gun, setGun] = useState('2555');
  const [sureSonu, setSureSonu] = useState<string>('oner');
  const [dayanak, setDayanak] = useState('');

  const degismez = degismezMi(tip);

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Saklama politikası</p>
      <Alan etiket="Kayıt ailesi" zorunlu>
        <select className="ab-gr" value={tip} onChange={(e) => {
          setTip(e.target.value);
          if (degismezMi(e.target.value) && sureSonu === 'imha_oner') setSureSonu('oner');
        }}>
          {SAKLANABILIR_TIPLER.map((t) => (
            <option key={t} value={t}>
              {TIP_ETIKETI[t]}{degismezMi(t) ? ' (değişmez)' : ''}
            </option>
          ))}
        </select>
      </Alan>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
        <input type="checkbox" checked={suresiz}
          onChange={(e) => setSuresiz(e.target.checked)} />
        <span>Süresiz sakla — bilinçli karar, dayanağı yazılı</span>
      </label>
      {!suresiz && (
        <Alan etiket="Saklama süresi · gün" zorunlu>
          <input className="ab-gr" type="number" min={1} max={36500} value={gun}
            onChange={(e) => setGun(e.target.value)} />
        </Alan>
      )}
      <Alan etiket="Süre sonunda" zorunlu>
        <select className="ab-gr" value={sureSonu}
          onChange={(e) => setSureSonu(e.target.value)}>
          {SURE_SONU_SECENEKLERI.filter((s) => !(degismez && s === 'imha_oner')).map((s) => (
            <option key={s} value={s}>{SURE_SONU_SOZU[s]}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Dayanak" zorunlu>
        <textarea className="ab-gr" rows={2} value={dayanak}
          placeholder="Hangi mevzuat ya da kurum kararı bu süreyi gerektiriyor?"
          onChange={(e) => setDayanak(e.target.value)} />
      </Alan>
      {degismez && (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Bu aile DEĞİŞMEZDİR: veritabanı tetikleyicisi silmeyi reddeder.
          Saklama süresi yazılabilir — &quot;ne kadar tutuyoruz&quot; denetimin
          sorusudur — ama imha kararı uygulanamaz.
        </p>
      )}
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !dayanak.trim()}
          onClick={() => calistir(async () => {
            const s = await saklamaPolitikasiKaydet({
              varlikTipi: tip,
              saklamaGun: suresiz ? null : Number(gun),
              sureSonu, dayanak,
            });
            if (s.ok) kapat();
            return s;
          })}>
          Kaydet
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

function HoldFormu({ tesisler, kapat }: {
  tesisler: { id: string; kod: string; ad: string }[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [ad, setAd] = useState('');
  const [tip, setTip] = useState<string>(SAKLANABILIR_TIPLER[0]);
  const [tesisId, setTesisId] = useState('');
  const [gerekce, setGerekce] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Hukuki muhafaza koy</p>
      <Alan etiket="Hold adı" zorunlu>
        <input className="ab-gr" value={ad} placeholder="Örn. 2026-04 soruşturması"
          onChange={(e) => setAd(e.target.value)} />
      </Alan>
      <Alan etiket="Kayıt ailesi" zorunlu>
        <select className="ab-gr" value={tip} onChange={(e) => setTip(e.target.value)}>
          {SAKLANABILIR_TIPLER.map((t) => (
            <option key={t} value={t}>{TIP_ETIKETI[t]}</option>
          ))}
        </select>
      </Alan>
      {/* Santral seçimi İSTEĞE BAĞLIDIR ve boş bırakılırsa hold BÜTÜN
          santralleri kapsar. Burada "boş = hiçbiri" olsaydı, en sık
          ihtiyaç olan kurum çapında muhafaza yazılamazdı. */}
      <Alan etiket="Santral · boş = bütün santraller">
        <select className="ab-gr" value={tesisId} onChange={(e) => setTesisId(e.target.value)}>
          <option value="">bütün santraller</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} · {t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Gerekçe" zorunlu>
        <textarea className="ab-gr" rows={2} value={gerekce}
          placeholder="Hangi dava, soruşturma ya da denetim?"
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !ad.trim() || !gerekce.trim()}
          onClick={() => calistir(async () => {
            const s = await legalHoldKoy({
              ad, varlikTipi: tip, tesisId: tesisId || null, gerekce,
            });
            if (s.ok) kapat();
            return s;
          })}>
          Hold koy
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

function ImhaFormu({ kapat }: { kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tip, setTip] = useState<string>(SAKLANABILIR_TIPLER[0]);
  const [gerekce, setGerekce] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>İmha önerisi aç</p>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Öneri hiçbir şey silmez: kapsanan kayıt sayısı ÖLÇÜLÜR ve karara
        yazılır. Silme, başka biri onayladıktan sonra ayrı bir adımdır.
      </p>
      <Alan etiket="Kayıt ailesi" zorunlu>
        <select className="ab-gr" value={tip} onChange={(e) => setTip(e.target.value)}>
          {SAKLANABILIR_TIPLER.filter((t) => !degismezMi(t)).map((t) => (
            <option key={t} value={t}>{TIP_ETIKETI[t]}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Gerekçe" zorunlu>
        <textarea className="ab-gr" rows={2} value={gerekce}
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gerekce.trim()}
          onClick={() => calistir(async () => {
            const s = await imhaOnerisiAc({ varlikTipi: tip, gerekce });
            if (s.ok) kapat();
            return s;
          })}>
          Öneriyi aç
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

function HoldKaldirma({ holdlar }: { holdlar: Hold[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [id, setId] = useState(holdlar[0]?.id ?? '');
  const [gerekce, setGerekce] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Hold kaldır</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {holdlar.map((h) => <option key={h.id} value={h.id}>{h.ad}</option>)}
      </select>
      <textarea className="ab-gr" rows={2} value={gerekce}
        placeholder="Muhafaza neden kaldırılıyor?"
        onChange={(e) => setGerekce(e.target.value)} />
      <Dugme tur="ret" disabled={bekliyor || !gerekce.trim() || !id}
        onClick={() => calistir(() => legalHoldKaldir({ id, gerekce }))}>
        Kaldır
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kayıt silinmez, durumu değişir: bir muhafazanın ne zaman konduğu ve
        ne zaman kalktığı denetimin sorusudur.
      </p>
    </div>
  );
}

function KararEylemleri({ kararlar }: { kararlar: Karar[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');
  const bekleyen = kararlar.filter((r) => r.durum === 'oneri' || r.durum === 'onaylandi');
  const [id, setId] = useState(bekleyen[0]?.id ?? '');
  const secili = bekleyen.find((r) => r.id === id) ?? null;

  if (bekleyen.length === 0) return null;

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Karar</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {bekleyen.map((r) => (
          <option key={r.id} value={r.id}>
            {TIP_ETIKETI[r.varlikTipi as SaklanabilirTip] ?? r.varlikTipi}
            {' · '}{r.kapsananSayi} kayıt · {KARAR_SOZU[r.durum]}
          </option>
        ))}
      </select>
      {secili?.durum === 'oneri' && (
        <>
          <textarea className="ab-gr" rows={2} value={gerekce}
            placeholder="Onay ya da ret notu"
            onChange={(e) => setGerekce(e.target.value)} />
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(() => imhaKarariniOnayla({ id, gerekce }))}>
              Onayla
            </Dugme>
            <Dugme tur="ret" disabled={bekliyor || !gerekce.trim()}
              onClick={() => calistir(() => imhaKarariniReddet({ id, gerekce }))}>
              Reddet
            </Dugme>
          </div>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Öneren kendi önerisini onaylayamaz — dört göz. Onay bu kaydı
            silmez; silme ayrı ve son adımdır.
          </p>
        </>
      )}
      {secili?.durum === 'onaylandi' && (
        <>
          <Dugme tur="ret" disabled={bekliyor}
            onClick={() => calistir(() => imhaKarariniUygula({ id }))}>
            İmhayı uygula — {secili.kapsananSayi} kayıt silinecek
          </Dugme>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Geri alınamaz. Hukuki muhafaza uygulama anında YENİDEN sorulur:
            onaydan sonra hold konmuşsa imha durur. Silinen kayıt sayısı
            yeniden ölçülür ve karara yazılır; denetim izi silinmez.
          </p>
        </>
      )}
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}
