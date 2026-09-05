'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import {
  denetciDavetEt, denetciErisimiIptal, denetciSureleriniIsle,
} from '@/lib/eylemler2/denetciErisimi';
import {
  AZAMI_SURE_GUN, YASAYAN_SINIFI, YASAYAN_SOZU, denetciCumlesi,
  type DenetciOzeti, type YasayanDurum,
} from '@/lib/uyum/denetciErisimi';
import { tarihTR } from '@/lib/sabitler';

/* ═══ UY-57 · Dış denetçi erişimi ekranı ══════════════════════════════

   Kütük "kim, hangi denetim için, ne zamana kadar, hangi santralleri"
   sorusunu tek satırda yanıtlar. Süresi dolan erişim listeden DÜŞMEZ:
   denetim bittikten sonra kimin baktığı da bir kayıttır.

   ── SÜRESİ GEÇMİŞ AMA HÂLÂ AÇIK GÖRÜNENLER ────────────────────────────
   Kayıt veritabanında `aktif` yazıp bitiş tarihi geçmiş olabilir. Ekran
   bunu ÖLÇER ve düğmesini çıkarır; `yasayanDurum` da o satırı zaten
   "süresi doldu" gösterir. Ekranın gösterdiğiyle yetki katmanının
   uyguladığı arasında fark kalmasın diye düğme yetkileri de kapatır. */

type Erisim = {
  id: string; kisi: string; eposta: string; firma: string;
  denetim: string | null; davetEden: string;
  baslangic: string; bitis: string;
  durum: YasayanDurum; kayitDurumu: string;
  kapsam: string[]; sonErisim: string | null; iptalGerekcesi: string | null;
};

const KOLONLAR = [
  { baslik: 'Firma', genislik: '170px' },
  { baslik: 'Kapsam', genislik: '190px' },
  { baslik: 'Son erişim', genislik: '112px', sag: true },
  { baslik: 'Bitiş', genislik: '104px', sag: true, ikincil: true },
];

export default function DenetciErisimiIstemci({
  satirlar, ozet, adaylar, denetimler, tesisler, yonetebilir, isleneceklerSayisi,
}: {
  satirlar: Erisim[];
  ozet: DenetciOzeti;
  adaylar: { id: string; adSoyad: string; eposta: string }[];
  denetimler: { id: string; ad: string; kod: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
  yonetebilir: boolean;
  isleneceklerSayisi: number;
}) {
  const [formAcik, setFormAcik] = useState(false);

  const tablo: Satir[] = satirlar.map((e) => ({
    id: e.id,
    durum: YASAYAN_SINIFI[e.durum],
    konu: e.kisi,
    alt: `${YASAYAN_SOZU[e.durum]}${e.denetim ? ` · ${e.denetim}` : ' · denetime bağlı değil'}`
      + `${e.iptalGerekcesi ? ` · ${e.iptalGerekcesi}` : ''}`,
    hucreler: [
      e.firma,
      /* Boş kapsam "—" ile geçiştirilmez: hesabın açık olup hiçbir şey
         görmüyor olması bir kurulum eksiğidir ve yazıyla söylenir. */
      e.kapsam.length === 0 ? 'kapsam yok' : e.kapsam.join(', '),
      e.sonErisim ? tarihTR(e.sonErisim) : 'hiç girmedi',
      tarihTR(e.bitis),
    ],
  }));

  return (
    /* Kabuk `<main>` BASMAZ (components/kabuk/Kabuk.tsx): ana bölgeyi
       ekranın kendisi çizer. Unutulursa sayfanın hiç ana bölgesi olmaz
       ve "içeriğe atla" bağı bir yere varmaz; axe'ın wcag2a/aa kümesi
       bunu GÖRMEZ, `rota:duman` görür. */
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow={`Dış denetçi erişimi · ${ozet.toplam} kayıt`}
        baslik={ozet.aktif + ozet.hicKullanilmayan + ozet.bitmekUzere > 0
          ? 'erişim şu anda açık'
          : 'Şu anda açık dış denetçi erişimi yok'}
        vurgu={ozet.aktif + ozet.hicKullanilmayan + ozet.bitmekUzere > 0
          ? `${ozet.aktif + ozet.hicKullanilmayan + ozet.bitmekUzere}`
          : undefined}
        vurguDurumu={ozet.kapsamsiz > 0 ? 'bd' : ozet.bitmekUzere > 0 ? 'md' : 'ok'}
        metrikler={[
          { deger: String(ozet.toplam), yazi: 'kayıtlı erişim' },
          { deger: String(ozet.bitmekUzere), yazi: 'süresi bitmek üzere',
            durum: ozet.bitmekUzere > 0 ? 'md' : undefined },
          { deger: String(ozet.hicKullanilmayan), yazi: 'hiç kullanılmadı',
            durum: ozet.hicKullanilmayan > 0 ? 'unk' : undefined },
          { deger: String(ozet.suresiDolan + ozet.iptal), yazi: 'kapandı' },
        ]}
        sag={yonetebilir
          ? <Dugme tur="birincil" onClick={() => setFormAcik(!formAcik)}>Denetçi davet et</Dugme>
          : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        {denetciCumlesi(ozet)} Süresiz dış erişim yoktur: bitiş tarihi
        zorunludur ve en çok {AZAMI_SURE_GUN} gün olabilir. Erişim
        kapandığında `dis_denetci` yetki satırları da kaldırılır — ekranın
        yazdığı ile kapının yaptığı aynıdır.
      </p>

      {yonetebilir && isleneceklerSayisi > 0 && (
        <SureIsleme sayi={isleneceklerSayisi} />
      )}

      {formAcik && (
        <DavetFormu adaylar={adaylar} denetimler={denetimler} tesisler={tesisler}
          kapat={() => setFormAcik(false)} />
      )}

      {tablo.length === 0
        ? (
          <BosIlk cumle="Tanımlı dış denetçi erişimi yok."
            eylem={yonetebilir
              ? <Dugme tur="birincil" onClick={() => setFormAcik(true)}>Denetçi davet et</Dugme>
              : undefined} />
        )
        : <Tablo kolonlar={KOLONLAR} satirlar={tablo} />}

      {yonetebilir && satirlar.some((e) => e.kayitDurumu === 'aktif') && (
        <IptalKutusu erisimler={satirlar.filter((e) => e.kayitDurumu === 'aktif')} />
      )}
    </main>
  );
}

function SureIsleme({ sayi }: { sayi: number }) {
  const { bekliyor, hata, calistir } = useEylem();
  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginBottom: 'var(--s16)' }}>
      <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>
        {sayi} erişimin bitiş tarihi geçmiş ama kaydı hâlâ &quot;aktif&quot;: yetki
        satırları duruyor olabilir.
      </p>
      <Dugme tur="birincil" disabled={bekliyor}
        onClick={() => calistir(() => denetciSureleriniIsle())}>
        Süresi dolanları kapat
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}

function DavetFormu({ adaylar, denetimler, tesisler, kapat }: {
  adaylar: { id: string; adSoyad: string; eposta: string }[];
  denetimler: { id: string; ad: string; kod: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [kullaniciId, setKullaniciId] = useState(adaylar[0]?.id ?? '');
  const [denetimId, setDenetimId] = useState('');
  const [firma, setFirma] = useState('');
  const [bitis, setBitis] = useState('');
  /* Kapsam BOŞ BAŞLAR. Bütün santralleri işaretli getirmek, "sonra
     daraltırım" denip hiç daraltılmayan bir kapsam bırakırdı. */
  const [secili, setSecili] = useState<string[]>([]);

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Dış denetçi davet et</p>
      <Alan etiket="Kullanıcı" zorunlu>
        <select className="ab-gr" value={kullaniciId}
          onChange={(e) => setKullaniciId(e.target.value)}>
          {adaylar.map((a) => (
            <option key={a.id} value={a.id}>{a.adSoyad} · {a.eposta}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Firma" zorunlu>
        <input className="ab-gr" value={firma}
          placeholder="Denetçinin bağlı olduğu firma"
          onChange={(e) => setFirma(e.target.value)} />
      </Alan>
      <Alan etiket="Denetim · erişimin sebebi">
        <select className="ab-gr" value={denetimId}
          onChange={(e) => setDenetimId(e.target.value)}>
          <option value="">bir denetime bağlı değil</option>
          {denetimler.map((d) => (
            <option key={d.id} value={d.id}>{d.kod} · {d.ad}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Bitiş tarihi" zorunlu>
        <input className="ab-gr" type="date" value={bitis}
          onChange={(e) => setBitis(e.target.value)} />
      </Alan>
      <Alan etiket="Görebileceği santraller" zorunlu>
        <div style={{ display: 'grid', gap: 'var(--s6)', maxHeight: 220, overflow: 'auto' }}>
          {tesisler.map((t) => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center',
              gap: 'var(--s8)' }}>
              <input type="checkbox" checked={secili.includes(t.id)}
                onChange={(e) => setSecili(e.target.checked
                  ? [...secili, t.id]
                  : secili.filter((x) => x !== t.id))} />
              <span>{t.kod} · {t.ad}</span>
            </label>
          ))}
        </div>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil"
          disabled={bekliyor || !firma.trim() || !bitis || secili.length === 0}
          onClick={() => calistir(async () => {
            const s = await denetciDavetEt({
              kullaniciId, denetimId: denetimId || null, firma,
              bitis: new Date(`${bitis}T23:59:59`).toISOString(),
              tesisIdler: secili,
            });
            if (s.ok) kapat();
            return s;
          })}>
          Daveti aç
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Davet, seçilen her santral için bir `dis_denetci` yetki satırı yazar.
        Kapsam boş bırakılamaz: &quot;boş kapsam = her şey&quot; DEĞİLDİR ve bir dış
        denetçiye kurumun tamamını açmak olurdu.
      </p>
    </div>
  );
}

function IptalKutusu({ erisimler }: { erisimler: Erisim[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [id, setId] = useState(erisimler[0]?.id ?? '');
  const [gerekce, setGerekce] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: 0 }}>Erişimi iptal et</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {erisimler.map((e) => (
          <option key={e.id} value={e.id}>{e.kisi} · {e.firma}</option>
        ))}
      </select>
      <textarea className="ab-gr" rows={2} value={gerekce}
        placeholder="Erişim neden kapatılıyor?"
        onChange={(e) => setGerekce(e.target.value)} />
      <Dugme tur="ret" disabled={bekliyor || !gerekce.trim() || !id}
        onClick={() => calistir(() => denetciErisimiIptal({ id, gerekce }))}>
        İptal et
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kayıt silinmez, durumu değişir ve `dis_denetci` yetki satırları
        kaldırılır. Bir dış denetçinin ne zaman girip ne zaman çıktığı
        denetimin kendisi kadar kayda değerdir.
      </p>
    </div>
  );
}
