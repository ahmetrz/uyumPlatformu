'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import {
  gozdenGecirmeKarariDurum, gozdenGecirmeKarariEkle, gozdenGecirmeKaydet,
  gozdenGecirmeTamamla,
} from '@/lib/eylemler2/gozdenGecirme';
import {
  PERIYOT_GUN, YASAYAN_SINIFI, YASAYAN_SOZU, ggCumlesi, type GgOzeti,
  type YasayanDurum,
} from '@/lib/uyum/gozdenGecirme';
import { tarihTR } from '@/lib/sabitler';

/* ═══ UY-65 · Yönetim gözden geçirme ekranı ═══════════════════════════

   En sinsi hâl "yapıldı işaretli ama hiç kararı yok"tur ve tablo onu
   kırmızı gösterir: denetimde boş bir sayfa, hiç kayıt olmamasından
   daha kötüdür. */

const KOLONLAR = [
  { baslik: 'Kapsam', genislik: '150px' },
  { baslik: 'Karar', genislik: '150px', sag: true },
  { baslik: 'Yürüten', genislik: '150px' },
  { baslik: 'Tarih', genislik: '104px', sag: true, ikincil: true },
];

type Karar = {
  id: string; karar: string; sorumlu: string | null; sonTarih: string | null;
  durum: string; gorevVar: boolean; gecikti: boolean;
};
type Gg = {
  id: string; kod: string; baslik: string; tarih: string; durum: string;
  regulasyonKod: string | null; yuruten: string; katilimcilar: string | null;
  gundem: string | null; ozet: string | null; yasayan: YasayanDurum;
  kararlar: Karar[];
};

export default function GozdenGecirmeIstemci({
  satirlar, regulasyonlar, kisiler, ozet, yonetebilir,
}: {
  satirlar: Gg[];
  regulasyonlar: { id: string; kod: string; ad: string }[];
  kisiler: { id: string; adSoyad: string }[];
  ozet: GgOzeti;
  yonetebilir: boolean;
}) {
  const [formAcik, setFormAcik] = useState(false);
  const planlilar = satirlar.filter((s) => s.durum === 'planli');
  const acikKararlar = satirlar.flatMap((s) => s.kararlar.filter((c) => c.durum === 'acik'));

  const tablo: Satir[] = satirlar.map((s) => ({
    id: s.id,
    durum: YASAYAN_SINIFI[s.yasayan],
    konu: s.baslik,
    alt: `${s.kod} · ${YASAYAN_SOZU[s.yasayan]}`
      + (s.ozet ? ` · ${s.ozet.slice(0, 120)}` : ''),
    hucreler: [
      s.regulasyonKod ?? 'kurum geneli',
      s.kararlar.length === 0
        ? 'karar yok'
        : `${s.kararlar.filter((c) => c.durum === 'acik').length} açık / ${s.kararlar.length}`,
      s.yuruten,
      tarihTR(s.tarih),
    ],
  }));

  return (
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow="UY-65 · Yönetim"
        baslik="gözden geçirme"
        vurgu={ozet.sonYapilanGun === null
          ? 'hiç yapılmadı'
          : `${ozet.sonYapilanGun} gün önce`}
        vurguDurumu={ozet.kararsiz > 0 ? 'bd'
          : ozet.sonYapilanGun === null || ozet.sonYapilanGun > PERIYOT_GUN ? 'md' : 'ok'}
        metrikler={[
          { deger: String(ozet.yapildi), payda: String(ozet.toplam), yazi: 'yapıldı' },
          { deger: String(ozet.acikKarar), yazi: 'açık karar' },
          { deger: String(ozet.gecikmisKarar), yazi: 'geciken karar',
            durum: ozet.gecikmisKarar > 0 ? 'bd' : undefined },
          { deger: String(ozet.kararsiz), yazi: 'kararsız kayıt',
            durum: ozet.kararsiz > 0 ? 'bd' : undefined },
        ]}
        sag={yonetebilir
          ? <Dugme tur="birincil" onClick={() => setFormAcik(!formAcik)}>Toplantı planla</Dugme>
          : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        {ggCumlesi(ozet)} Bir gözden geçirmenin denetimdeki değeri ürettiği
        KARARLARDIR; özet metni değil. Kararsız bir kayıt &quot;yapıldı&quot;
        işaretlenemez.
      </p>

      {formAcik && (
        <PlanFormu regulasyonlar={regulasyonlar} kapat={() => setFormAcik(false)} />
      )}

      {tablo.length === 0
        ? <BosIlk cumle="Hiç yönetim gözden geçirmesi kaydı yok." />
        : <Tablo kolonlar={KOLONLAR} satirlar={tablo} />}

      {yonetebilir && planlilar.length > 0 && (
        <KararEkleme planlilar={planlilar} kisiler={kisiler} />
      )}
      {yonetebilir && acikKararlar.length > 0 && (
        <KararKapatma kararlar={acikKararlar} />
      )}
    </main>
  );
}

function PlanFormu({ regulasyonlar, kapat }: {
  regulasyonlar: { id: string; kod: string; ad: string }[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [baslik, setBaslik] = useState('');
  const [tarih, setTarih] = useState('');
  const [regulasyonId, setRegulasyonId] = useState('');
  const [katilimcilar, setKatilimcilar] = useState('');
  const [gundem, setGundem] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Gözden geçirme planla</p>
      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={baslik} onChange={(e) => setBaslik(e.target.value)}
          placeholder="Örn. 2026 birinci yarı yönetim gözden geçirmesi" />
      </Alan>
      <Alan etiket="Tarih" zorunlu>
        <input className="ab-gr" type="date" value={tarih}
          onChange={(e) => setTarih(e.target.value)} />
      </Alan>
      <Alan etiket="Kapsam · boş = kurum geneli">
        <select className="ab-gr" value={regulasyonId}
          onChange={(e) => setRegulasyonId(e.target.value)}>
          <option value="">kurum geneli</option>
          {regulasyonlar.map((r) => <option key={r.id} value={r.id}>{r.kod} · {r.ad}</option>)}
        </select>
      </Alan>
      {/* Katılımcılar serbest metindir: kurum dışı katılımcıyı (denetçi,
          danışman) kullanıcı kütüğüne bağlamak kaydedilemez kılardı. */}
      <Alan etiket="Katılımcılar">
        <textarea className="ab-gr" rows={2} value={katilimcilar}
          placeholder="Kimler katılacak? Kurum dışı katılımcılar da yazılabilir."
          onChange={(e) => setKatilimcilar(e.target.value)} />
      </Alan>
      <Alan etiket="Gündem">
        <textarea className="ab-gr" rows={3} value={gundem}
          onChange={(e) => setGundem(e.target.value)} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !baslik.trim() || !tarih}
          onClick={() => calistir(async () => {
            const s = await gozdenGecirmeKaydet({
              baslik, tarih: new Date(tarih).toISOString(),
              regulasyonId: regulasyonId || null,
              katilimcilar: katilimcilar || null,
              gundem: gundem || null,
            });
            if (s.ok) kapat();
            return s;
          })}>
          Planla
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

function KararEkleme({ planlilar, kisiler }: {
  planlilar: Gg[]; kisiler: { id: string; adSoyad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [ggId, setGgId] = useState(planlilar[0]?.id ?? '');
  const [karar, setKarar] = useState('');
  const [sorumluId, setSorumluId] = useState(kisiler[0]?.id ?? '');
  const [sonTarih, setSonTarih] = useState('');
  const [gorevAc, setGorevAc] = useState(true);
  const [ozet, setOzet] = useState('');
  const secili = planlilar.find((p) => p.id === ggId) ?? null;

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: 0 }}>Karar ekle ve toplantıyı tamamla</p>
      <select className="ab-gr" value={ggId} onChange={(e) => setGgId(e.target.value)}>
        {planlilar.map((p) => (
          <option key={p.id} value={p.id}>
            {p.baslik} · {p.kararlar.length} karar
          </option>
        ))}
      </select>
      <Alan etiket="Karar" zorunlu>
        <textarea className="ab-gr" rows={2} value={karar}
          placeholder="Ne yapılacak? (en az 10 karakter)"
          onChange={(e) => setKarar(e.target.value)} />
      </Alan>
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Alan etiket="Sorumlu" zorunlu>
          <select className="ab-gr" value={sorumluId}
            onChange={(e) => setSorumluId(e.target.value)}>
            {kisiler.map((x) => <option key={x.id} value={x.id}>{x.adSoyad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Son tarih" zorunlu>
          <input className="ab-gr" type="date" value={sonTarih}
            onChange={(e) => setSonTarih(e.target.value)} />
        </Alan>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
        <input type="checkbox" checked={gorevAc}
          onChange={(e) => setGorevAc(e.target.checked)} />
        <span>Karardan görev aç — iş kuyruğuna düşsün</span>
      </label>
      <Dugme disabled={bekliyor || !ggId || karar.trim().length < 10 || !sorumluId || !sonTarih}
        onClick={() => calistir(async () => {
          const s = await gozdenGecirmeKarariEkle({
            gozdenGecirmeId: ggId, karar, sorumluId,
            sonTarih: new Date(sonTarih).toISOString(), gorevAc,
          });
          if (s.ok) setKarar('');
          return s;
        })}>
        Karar ekle
      </Dugme>

      <Alan etiket="Toplantı özeti">
        <textarea className="ab-gr" rows={3} value={ozet}
          placeholder="Neler görüşüldü?"
          onChange={(e) => setOzet(e.target.value)} />
      </Alan>
      <Dugme tur="birincil"
        disabled={bekliyor || !ggId || !ozet.trim() || (secili?.kararlar.length ?? 0) === 0}
        onClick={() => calistir(() => gozdenGecirmeTamamla({ id: ggId, ozet }))}>
        Toplantıyı &quot;yapıldı&quot; işaretle
      </Dugme>
      {secili && secili.kararlar.length === 0 && (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Henüz karar girilmedi; kararsız bir toplantı &quot;yapıldı&quot;
          işaretlenemez.
        </p>
      )}
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}

function KararKapatma({ kararlar }: { kararlar: Karar[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [id, setId] = useState(kararlar[0]?.id ?? '');
  const [gerekce, setGerekce] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: 0 }}>Açık kararlar</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {kararlar.map((c) => (
          <option key={c.id} value={c.id}>
            {c.karar.slice(0, 90)}{c.gecikti ? ' · GECİKTİ' : ''}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !id}
          onClick={() => calistir(() => gozdenGecirmeKarariDurum({ id, durum: 'tamamlandi' }))}>
          Tamamlandı
        </Dugme>
        <Dugme tur="ret" disabled={bekliyor || !id || !gerekce.trim()}
          onClick={() => calistir(() => gozdenGecirmeKarariDurum({
            id, durum: 'iptal', gerekce,
          }))}>
          İptal et
        </Dugme>
      </div>
      <textarea className="ab-gr" rows={2} value={gerekce} placeholder="İptal gerekçesi"
        onChange={(e) => setGerekce(e.target.value)} />
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Karar kapanınca bağlı görev de kapanır: iki yerde ayrı ayrı kapatılması
        gereken bir iş, bir yerde açık kalır.
      </p>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}
