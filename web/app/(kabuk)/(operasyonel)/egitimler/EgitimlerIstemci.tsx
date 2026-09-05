'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import {
  egitimKaydet, egitimKaydiEkle, egitimMaddeBagla,
} from '@/lib/eylemler2/egitim';
import { YENILEME_UYARI_GUN, type EgitimKapsamasi } from '@/lib/uyum/egitim';

/* ═══ UY-66 · Eğitim kütüğü ekranı ════════════════════════════════════

   "Eğitim kaydı" ürüne zaten bir KANIT TİPİ olarak girmişti; eksik olan
   kütüktü: kimin hangi eğitimi ne zaman aldığı ve ne zaman geçerliliğini
   yitirdiği. Tek bir katılım listesi PDF'i "bu kontrol karşılanıyor mu"
   sorusunu yanıtlamaz. */

const KOLONLAR = [
  { baslik: 'Kapsama', genislik: '150px', sag: true },
  { baslik: 'Geçerlilik', genislik: '124px' },
  { baslik: 'Bağlı kontrol', genislik: '170px' },
  { baslik: 'Kayıt', genislik: '92px', sag: true, ikincil: true },
];

type Egitim = {
  id: string; kod: string; ad: string; gecerlilikAy: number | null;
  zorunlu: boolean; aciklama: string | null; aktif: boolean;
  kapsama: EgitimKapsamasi;
  maddeler: { bagId: string; kod: string; baslik: string }[];
  kayitSayisi: number;
};

export default function EgitimlerIstemci({
  satirlar, kisiler, maddeler, yazabilir, yonetebilir,
}: {
  satirlar: Egitim[];
  kisiler: { id: string; adSoyad: string }[];
  maddeler: { id: string; kod: string; baslik: string }[];
  yazabilir: boolean;
  yonetebilir: boolean;
}) {
  const [form, setForm] = useState<'egitim' | 'kayit' | 'baglanti' | null>(null);

  const eksikKayit = satirlar.reduce((n, e) => n + e.kapsama.kaydiOlmayan, 0);
  const suresiDolan = satirlar.reduce((n, e) => n + e.kapsama.suresiDolan, 0);
  const yenilenmeli = satirlar.reduce((n, e) => n + e.kapsama.yenilenmeli, 0);
  const zorunlu = satirlar.filter((e) => e.zorunlu && e.aktif);

  const tablo: Satir[] = satirlar.map((e) => ({
    id: e.id,
    durum: !e.aktif ? 'pl'
      : e.kapsama.kaydiOlmayan > 0 || e.kapsama.suresiDolan > 0 ? 'bd'
        : e.kapsama.yenilenmeli > 0 ? 'md' : 'ok',
    konu: e.ad,
    alt: `${e.kod}${e.zorunlu ? ' · ZORUNLU' : ' · isteğe bağlı'}`
      + (e.aktif ? '' : ' · pasif')
      + (e.aciklama ? ` · ${e.aciklama.slice(0, 100)}` : ''),
    hucreler: [
      /* Kapsamı sıfır olan eğitim "%100" DEĞİL "ölçülmedi" der. */
      e.kapsama.oran === null
        ? 'ölçülmedi'
        : `${e.kapsama.gecerli + e.kapsama.yenilenmeli}/${e.kapsama.kapsam} · %${e.kapsama.oran}`,
      e.gecerlilikAy === null ? 'süresiz' : `${e.gecerlilikAy} ay`,
      e.maddeler.length === 0
        ? 'kontrole bağlı değil'
        : e.maddeler.map((m) => m.kod).join(', ').slice(0, 60),
      String(e.kayitSayisi),
    ],
  }));

  return (
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow={`Eğitim kütüğü · ${satirlar.length} tanımlı eğitim`}
        baslik={eksikKayit > 0 ? 'kişinin eğitim kaydı yok' : 'Kapsamdaki herkesin eğitim kaydı var'}
        vurgu={eksikKayit > 0 ? `${eksikKayit} kişi` : undefined}
        vurguDurumu={eksikKayit > 0 || suresiDolan > 0 ? 'bd' : 'ok'}
        metrikler={[
          { deger: String(satirlar.length), yazi: 'tanımlı eğitim' },
          { deger: String(zorunlu.length), yazi: 'zorunlu eğitim' },
          { deger: String(suresiDolan), yazi: 'geçerliliği doldu',
            durum: suresiDolan > 0 ? 'bd' : undefined },
          { deger: String(yenilenmeli), yazi: `${YENILEME_UYARI_GUN} gün içinde bitiyor`,
            durum: yenilenmeli > 0 ? 'md' : undefined },
        ]}
        sag={yonetebilir ? (
          <div style={{ display: 'flex', gap: 'var(--s8)' }}>
            <Dugme onClick={() => setForm(form === 'egitim' ? null : 'egitim')}>
              Eğitim tanımla
            </Dugme>
            <Dugme onClick={() => setForm(form === 'baglanti' ? null : 'baglanti')}>
              Kontrole bağla
            </Dugme>
          </div>
        ) : yazabilir ? (
          <Dugme onClick={() => setForm(form === 'kayit' ? null : 'kayit')}>
            Katılım kaydet
          </Dugme>
        ) : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        Zorunlu eğitimin paydası AKTİF kullanıcılardır; kaydı olmayan kişi
        eğitimi almamış sayılır. İsteğe bağlı eğitimin paydası yalnız kaydı
        olanlardır — kimsenin almadığı bir seçmeli eğitimi %0 göstermek
        yanıltıcı olurdu.
      </p>

      {form === 'egitim' && <EgitimFormu kapat={() => setForm(null)} />}
      {form === 'baglanti' && (
        <BaglantiFormu egitimler={satirlar} maddeler={maddeler}
          kapat={() => setForm(null)} />
      )}
      {(form === 'kayit' || (yazabilir && form === null && satirlar.length > 0)) && (
        <KatilimFormu egitimler={satirlar.filter((e) => e.aktif)} kisiler={kisiler} />
      )}

      {tablo.length === 0
        ? (
          <BosIlk cumle="Tanımlı eğitim yok."
            eylem={yazabilir
              ? <Dugme tur="birincil" onClick={() => setForm('egitim')}>Eğitim tanımla</Dugme>
              : undefined} />
        )
        : <Tablo kolonlar={KOLONLAR} satirlar={tablo} />}
    </main>
  );
}

function EgitimFormu({ kapat }: { kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ kod: '', ad: '', aciklama: '' });
  const [zorunlu, setZorunlu] = useState(true);
  /* Süresiz eğitim BİLİNÇLİ bir karardır; "ölçülmedi" değildir. Bu
     yüzden ayrı bir onay kutusu, sayı alanının boşluğu değil. */
  const [suresiz, setSuresiz] = useState(false);
  const [ay, setAy] = useState('12');
  const g = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Yeni eğitim tanımı</p>
      <Alan etiket="Eğitim kodu" zorunlu>
        <input className="ab-gr" value={f.kod} onChange={g('kod')} />
      </Alan>
      <Alan etiket="Eğitim adı" zorunlu>
        <input className="ab-gr" value={f.ad} onChange={g('ad')}
          placeholder="Örn. Siber güvenlik farkındalığı" />
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={2} value={f.aciklama} onChange={g('aciklama')} />
      </Alan>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
        <input type="checkbox" checked={zorunlu}
          onChange={(e) => setZorunlu(e.target.checked)} />
        <span>Zorunlu — kapsamdaki herkesin kaydı beklenir</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
        <input type="checkbox" checked={suresiz}
          onChange={(e) => setSuresiz(e.target.checked)} />
        <span>Süresiz — yenilenmesi gerekmiyor</span>
      </label>
      {!suresiz && (
        <Alan etiket="Geçerlilik süresi · ay" zorunlu>
          <input className="ab-gr" type="number" min={1} max={120} value={ay}
            onChange={(e) => setAy(e.target.value)} />
        </Alan>
      )}
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.kod.trim() || !f.ad.trim()}
          onClick={() => calistir(async () => {
            const s = await egitimKaydet({
              kod: f.kod, ad: f.ad,
              aciklama: f.aciklama || null,
              zorunlu,
              gecerlilikAy: suresiz ? null : Number(ay),
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

function KatilimFormu({ egitimler, kisiler }: {
  egitimler: Egitim[]; kisiler: { id: string; adSoyad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [egitimId, setEgitimId] = useState(egitimler[0]?.id ?? '');
  const [kullaniciId, setKullaniciId] = useState(kisiler[0]?.id ?? '');
  const [tamamlanma, setTamamlanma] = useState('');
  const [belgeNo, setBelgeNo] = useState('');

  if (egitimler.length === 0) return null;

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Katılım kaydet</p>
      <div style={{ display: 'flex', gap: 'var(--s12)', flexWrap: 'wrap' }}>
        <Alan etiket="Eğitim" zorunlu>
          <select className="ab-gr" value={egitimId}
            onChange={(e) => setEgitimId(e.target.value)}>
            {egitimler.map((e) => <option key={e.id} value={e.id}>{e.kod} · {e.ad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Kişi" zorunlu>
          <select className="ab-gr" value={kullaniciId}
            onChange={(e) => setKullaniciId(e.target.value)}>
            {kisiler.map((x) => <option key={x.id} value={x.id}>{x.adSoyad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Tamamlanma tarihi" zorunlu>
          <input className="ab-gr" type="date" value={tamamlanma}
            onChange={(e) => setTamamlanma(e.target.value)} />
        </Alan>
        <Alan etiket="Belge no">
          <input className="ab-gr" value={belgeNo}
            onChange={(e) => setBelgeNo(e.target.value)} />
        </Alan>
      </div>
      <Dugme tur="birincil" disabled={bekliyor || !egitimId || !kullaniciId || !tamamlanma}
        onClick={() => calistir(async () => {
          const s = await egitimKaydiEkle({
            egitimId, kullaniciId,
            tamamlanma: new Date(tamamlanma).toISOString(),
            belgeNo: belgeNo || null,
          });
          if (s.ok) { setTamamlanma(''); setBelgeNo(''); }
          return s;
        })}>
        Kaydet
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Geçerlilik bitişi TAMAMLANMA tarihinden hesaplanır, kaydın girildiği
        tarihten değil: geçmişe dönük girilen bir eğitim, bugün alınmış gibi
        geçerlilik kazanmaz.
      </p>
    </div>
  );
}

function BaglantiFormu({ egitimler, maddeler, kapat }: {
  egitimler: Egitim[];
  maddeler: { id: string; kod: string; baslik: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [egitimId, setEgitimId] = useState(egitimler[0]?.id ?? '');
  const [maddeId, setMaddeId] = useState(maddeler[0]?.id ?? '');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Eğitimi kontrol maddesine bağla</p>
      <Alan etiket="Eğitim" zorunlu>
        <select className="ab-gr" value={egitimId}
          onChange={(e) => setEgitimId(e.target.value)}>
          {egitimler.map((e) => <option key={e.id} value={e.id}>{e.kod} · {e.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Kontrol maddesi" zorunlu>
        <select className="ab-gr" value={maddeId} onChange={(e) => setMaddeId(e.target.value)}>
          {maddeler.map((m) => (
            <option key={m.id} value={m.id}>{m.kod} · {m.baslik.slice(0, 70)}</option>
          ))}
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !egitimId || !maddeId}
          onClick={() => calistir(async () => {
            const s = await egitimMaddeBagla({ egitimId, maddeId });
            if (s.ok) kapat();
            return s;
          })}>
          Bağla
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Eğitim yükümlülüğü çoğu çerçevede bir kontrol maddesidir; bağ kurulunca
        eğitim kapsaması o kontrolün kanıtı olur.
      </p>
    </div>
  );
}
