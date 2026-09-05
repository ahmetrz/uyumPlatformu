'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import { yedekParcaKaydet, yedekParcaSay } from '@/lib/eylemler2/yedekParca';
import {
  STOK_SINIFI, STOK_SOZU, maruziyet, parcaCumlesi, parcaOzeti,
} from '@/lib/varlik/yedekParca';
import { tarihTR } from '@/lib/sabitler';

/* ═══ OT-56 · Yedek parça ekranı ══════════════════════════════════════

   Kütük "bu kart bugün bozulursa ne olur" sorusuna göre sıralanır:
   stoğu tükenmiş ve kritik varlığa bağlı parçalar en üstte.

   Tedarik süresi ÖLÇÜLMEDİYSE hücre boş bırakılmaz, "ölçülmedi" yazar:
   boş hücre "hemen gelir" diye okunur. */

const KOLONLAR = [
  { baslik: 'Stok', genislik: '112px', sag: true },
  { baslik: 'Bağlı varlık', genislik: '170px' },
  { baslik: 'Tedarik', genislik: '120px', sag: true },
  { baslik: 'Son sayım', genislik: '104px', sag: true, ikincil: true },
];

type Parca = {
  id: string; kod: string; ad: string; ureticiParcaNo: string | null;
  turAd: string | null; tesisKod: string | null; konum: string | null;
  stokAdedi: number; kritikEsik: number; tedarikSuresiGun: number | null;
  tedarikciAd: string | null; sonSayim: string | null; aktif: boolean;
  bagliVarliklar: { bagId: string; ad: string; kritiklik: string }[];
};

export default function YedekParcaIstemci({
  parcalar, tesisler, turler, tedarikciler, yazabilir,
}: {
  parcalar: Parca[];
  tesisler: { id: string; kod: string; ad: string }[];
  turler: { id: string; ad: string }[];
  tedarikciler: { id: string; ad: string }[];
  yazabilir: boolean;
}) {
  const [formAcik, setFormAcik] = useState(false);

  const ozet = parcaOzeti(parcalar.map((p) => ({
    stokAdedi: p.stokAdedi, kritikEsik: p.kritikEsik, aktif: p.aktif,
    tedarikSuresiGun: p.tedarikSuresiGun,
    bagliKritiklikler: p.bagliVarliklar.map((v) => v.kritiklik),
  })));

  const tablo: Satir[] = parcalar.map((p) => {
    const m = maruziyet({
      stokAdedi: p.stokAdedi, kritikEsik: p.kritikEsik, aktif: p.aktif,
      tedarikSuresiGun: p.tedarikSuresiGun,
      bagliKritiklikler: p.bagliVarliklar.map((v) => v.kritiklik),
    });
    return {
      id: p.id,
      durum: m.acikRisk ? 'bd' : STOK_SINIFI[m.durum],
      konu: p.ad,
      alt: `${p.kod}${p.ureticiParcaNo ? ` · ${p.ureticiParcaNo}` : ''}`
        + ` · ${STOK_SOZU[m.durum]}`
        + (m.acikRisk ? ' · KRİTİK VARLIK AÇIKTA' : ''),
      hucreler: [
        `${p.stokAdedi} / eşik ${p.kritikEsik}`,
        m.agirVarlik > 0
          ? `${p.bagliVarliklar.length} varlık · ${m.agirVarlik} ağır kritik`
          : p.bagliVarliklar.length > 0
            ? `${p.bagliVarliklar.length} varlık`
            : 'bağ yok',
        /* Ölçülmemiş tedarik süresi boş bırakılmaz. */
        p.tedarikSuresiGun === null ? 'ölçülmedi' : `${p.tedarikSuresiGun} gün`,
        p.sonSayim ? tarihTR(p.sonSayim) : 'hiç sayılmadı',
      ],
    };
  });

  return (
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow={`Kritik yedek parça · ${ozet.toplam} kayıt`}
        baslik={ozet.acikRisk > 0 ? 'parçanın kritik varlığı açıkta' : 'Kritik varlıkta açık parça yok'}
        vurgu={ozet.acikRisk > 0 ? `${ozet.acikRisk}` : undefined}
        vurguDurumu={ozet.acikRisk > 0 ? 'bd' : ozet.esikte > 0 ? 'md' : 'ok'}
        metrikler={[
          { deger: String(ozet.aktif), payda: String(ozet.toplam), yazi: 'aktif kayıt' },
          { deger: String(ozet.tukenen), yazi: 'stok tükendi',
            durum: ozet.tukenen > 0 ? 'bd' : undefined },
          { deger: String(ozet.esikte), yazi: 'kritik eşikte',
            durum: ozet.esikte > 0 ? 'md' : undefined },
          { deger: String(ozet.suresizOlculmedi), yazi: 'tedarik süresi ölçülmedi',
            durum: ozet.suresizOlculmedi > 0 ? 'unk' : undefined },
        ]}
        sag={yazabilir
          ? <Dugme tur="birincil" onClick={() => setFormAcik(!formAcik)}>Parça ekle</Dugme>
          : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        {parcaCumlesi(ozet)} Kritiklik parçanın kendisinden değil, hizmet ettiği
        VARLIKTAN gelir: hiçbir kritik varlığa bağlanmamış bir parçanın stoğunun
        sıfır olması bir arıza değil, bir operasyon kararıdır.
      </p>

      {formAcik && (
        <ParcaFormu tesisler={tesisler} turler={turler} tedarikciler={tedarikciler}
          kapat={() => setFormAcik(false)} />
      )}

      {tablo.length === 0
        ? (
          <BosIlk cumle="Kayıtlı yedek parça yok."
            eylem={yazabilir
              ? <Dugme tur="birincil" onClick={() => setFormAcik(true)}>Parça ekle</Dugme>
              : undefined} />
        )
        : <Tablo kolonlar={KOLONLAR} satirlar={tablo} />}

      {yazabilir && parcalar.length > 0 && <StokSayimi parcalar={parcalar} />}
    </main>
  );
}

function ParcaFormu({ tesisler, turler, tedarikciler, kapat }: {
  tesisler: { id: string; kod: string; ad: string }[];
  turler: { id: string; ad: string }[];
  tedarikciler: { id: string; ad: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    kod: '', ad: '', ureticiParcaNo: '', turId: '', tesisId: '',
    konum: '', stokAdedi: '0', kritikEsik: '1', tedarikciId: '',
  });
  /* Tedarik süresi AYRI tutulur: "ölçüldü mü" ile "kaç gün" iki farklı
     sorudur ve tek bir sayı alanı ikisini karıştırır. */
  const [tedarikOlculdu, setTedarikOlculdu] = useState(false);
  const [tedarikGun, setTedarikGun] = useState('30');

  const g = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Yeni yedek parça</p>
      <Alan etiket="Parça kodu" zorunlu>
        <input className="ab-gr" value={f.kod} onChange={g('kod')} />
      </Alan>
      <Alan etiket="Parça adı" zorunlu>
        <input className="ab-gr" value={f.ad} onChange={g('ad')} />
      </Alan>
      <Alan etiket="Üretici parça numarası">
        <input className="ab-gr" value={f.ureticiParcaNo} onChange={g('ureticiParcaNo')} />
      </Alan>
      <Alan etiket="Uyduğu varlık türü">
        <select className="ab-gr" value={f.turId} onChange={g('turId')}>
          <option value="">tür eşleşmesi yok</option>
          {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Depo · boş = merkezî depo">
        <select className="ab-gr" value={f.tesisId} onChange={g('tesisId')}>
          <option value="">merkezî depo</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} · {t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Raf / konum">
        <input className="ab-gr" value={f.konum} onChange={g('konum')} />
      </Alan>
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Alan etiket="Stok adedi" zorunlu>
          <input className="ab-gr" type="number" min={0} value={f.stokAdedi}
            onChange={g('stokAdedi')} />
        </Alan>
        <Alan etiket="Kritik eşik" zorunlu>
          <input className="ab-gr" type="number" min={0} value={f.kritikEsik}
            onChange={g('kritikEsik')} />
        </Alan>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
        <input type="checkbox" checked={tedarikOlculdu}
          onChange={(e) => setTedarikOlculdu(e.target.checked)} />
        <span>Tedarik süresi ölçüldü</span>
      </label>
      {tedarikOlculdu && (
        <Alan etiket="Tedarik süresi · gün" zorunlu>
          <input className="ab-gr" type="number" min={1} value={tedarikGun}
            onChange={(e) => setTedarikGun(e.target.value)} />
        </Alan>
      )}
      <Alan etiket="Tedarikçi">
        <select className="ab-gr" value={f.tedarikciId} onChange={g('tedarikciId')}>
          <option value="">seçilmedi</option>
          {tedarikciler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.kod.trim() || !f.ad.trim()}
          onClick={() => calistir(async () => {
            const s = await yedekParcaKaydet({
              kod: f.kod, ad: f.ad,
              ureticiParcaNo: f.ureticiParcaNo || null,
              turId: f.turId || null,
              tesisId: f.tesisId || null,
              konum: f.konum || null,
              stokAdedi: Number(f.stokAdedi),
              kritikEsik: Number(f.kritikEsik),
              tedarikSuresiGun: tedarikOlculdu ? Number(tedarikGun) : null,
              tedarikciId: f.tedarikciId || null,
            });
            if (s.ok) kapat();
            return s;
          })}>
          Kaydet
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Tedarik süresi ölçülmediyse işaretlemeyin: sıfır gün yazmak
        &quot;hemen gelir&quot; demektir ve bu bir yalandır.
      </p>
    </div>
  );
}

function StokSayimi({ parcalar }: { parcalar: Parca[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [id, setId] = useState(parcalar[0]?.id ?? '');
  const [adet, setAdet] = useState('');
  const [not, setNot] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: 0 }}>Stok sayımı</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {parcalar.map((p) => (
          <option key={p.id} value={p.id}>{p.kod} · {p.ad} (şu an {p.stokAdedi})</option>
        ))}
      </select>
      <Alan etiket="Sayılan adet" zorunlu>
        <input className="ab-gr" type="number" min={0} value={adet}
          onChange={(e) => setAdet(e.target.value)} />
      </Alan>
      <textarea className="ab-gr" rows={2} value={not} placeholder="Not (isteğe bağlı)"
        onChange={(e) => setNot(e.target.value)} />
      <Dugme tur="birincil" disabled={bekliyor || !id || adet === ''}
        onClick={() => calistir(() => yedekParcaSay({
          id, stokAdedi: Number(adet), not: not || null,
        }))}>
        Sayımı kaydet
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}
