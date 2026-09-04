'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import {
  medyaDurumu, medyaKaydet, medyaKullanimKaydet, medyaTaramaKaydet,
} from '@/lib/eylemler2/tasinabilirMedya';
import {
  HAL_SINIFI, HAL_SOZU, MEDYA_TIPLERI, MEDYA_TIP_ETIKETI,
  medyaCumlesi, medyaOzeti, type MedyaHali,
} from '@/lib/varlik/tasinabilirMedya';
import { tarihTR } from '@/lib/sabitler';

/* ═══ OT-57 · Taşınabilir medya ekranı ════════════════════════════════

   OT ortamında bulaşmanın en bilinen yolu ağ değil, elden ele dolaşan
   bir USB bellektir. Bu ekran o belleği görünür kılar; engellemez. */

const KOLONLAR = [
  { baslik: 'Tip', genislik: '150px' },
  { baslik: 'Şifreleme', genislik: '124px' },
  { baslik: 'Son tarama', genislik: '116px', sag: true },
  { baslik: 'Son kullanım', genislik: '190px' },
];

type Medya = {
  id: string; kod: string; ad: string; tip: string; seriNo: string | null;
  tesisKod: string | null; sahibi: string | null; durum: string;
  sifreli: boolean | null; sonTarama: string | null; hal: MedyaHali;
  sonKullanimlar: { varlik: string; kritiklik: string; baslangic: string; onayli: boolean }[];
};

export default function TasinabilirMedyaIstemci({
  medyalar, tesisler, kisiler, varliklar, onaysizKullanim, yazabilir,
}: {
  medyalar: Medya[];
  tesisler: { id: string; kod: string; ad: string }[];
  kisiler: { id: string; adSoyad: string }[];
  varliklar: { id: string; ad: string; kritiklik: string }[];
  onaysizKullanim: number;
  yazabilir: boolean;
}) {
  const [form, setForm] = useState<'medya' | 'kullanim' | null>(null);
  const ozet = medyaOzeti({
    haller: medyalar.map((m) => m.hal), onaysizKullanim,
  });

  const tablo: Satir[] = medyalar.map((m) => {
    const son = m.sonKullanimlar[0];
    return {
      id: m.id,
      durum: HAL_SINIFI[m.hal],
      konu: m.ad,
      alt: `${m.kod} · ${HAL_SOZU[m.hal]}`
        + (m.tesisKod ? ` · ${m.tesisKod}` : '')
        + (m.sahibi ? ` · ${m.sahibi}` : ' · sahibi yok'),
      hucreler: [
        MEDYA_TIP_ETIKETI[m.tip as keyof typeof MEDYA_TIP_ETIKETI] ?? m.tip,
        /* Üç değerli: ölçülmemiş şifreleme "şifresiz" DEĞİLDİR. */
        m.sifreli === null ? 'ölçülmedi' : m.sifreli ? 'şifreli' : 'ŞİFRESİZ',
        m.sonTarama ? tarihTR(m.sonTarama) : 'hiç taranmadı',
        son
          ? `${son.varlik}${son.onayli ? '' : ' · ONAYSIZ'}`
          : 'kullanım kaydı yok',
      ],
    };
  });

  return (
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow="OT-57 · Taşınabilir"
        baslik="medya"
        vurgu={ozet.kayip > 0 ? `${ozet.kayip} medya kayıp` : undefined}
        vurguDurumu={ozet.kayip > 0 || ozet.taranmayan > 0 ? 'bd' : 'ok'}
        metrikler={[
          { deger: String(ozet.toplam), yazi: 'kayıtlı medya' },
          { deger: String(ozet.taranmayan), yazi: 'hiç taranmadı',
            durum: ozet.taranmayan > 0 ? 'bd' : undefined },
          { deger: String(ozet.sifrelemeOlculmedi), yazi: 'şifreleme ölçülmedi',
            durum: ozet.sifrelemeOlculmedi > 0 ? 'unk' : undefined },
          { deger: String(ozet.onaysizKullanim), yazi: 'onaysız kullanım',
            durum: ozet.onaysizKullanim > 0 ? 'md' : undefined },
        ]}
        sag={yazabilir ? (
          <div style={{ display: 'flex', gap: 'var(--s8)' }}>
            <Dugme onClick={() => setForm(form === 'medya' ? null : 'medya')}>
              Medya ekle
            </Dugme>
            <Dugme onClick={() => setForm(form === 'kullanim' ? null : 'kullanim')}>
              Kullanım kaydet
            </Dugme>
          </div>
        ) : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        {medyaCumlesi(ozet)} Ürün medyayı ENGELLEMEZ — engelleme uç nokta koruma
        ürününün işidir. Burada tutulan şey kayıttır: kayıtsız medya, envanterin
        göremediği tek taşıyıcıdır.
      </p>

      {form === 'medya' && (
        <MedyaFormu tesisler={tesisler} kisiler={kisiler} kapat={() => setForm(null)} />
      )}
      {form === 'kullanim' && (
        <KullanimFormu medyalar={medyalar} varliklar={varliklar}
          kapat={() => setForm(null)} />
      )}

      {tablo.length === 0
        ? <BosIlk cumle="Kayıtlı taşınabilir medya yok." />
        : <Tablo kolonlar={KOLONLAR} satirlar={tablo} />}

      {yazabilir && medyalar.length > 0 && <MedyaIslemleri medyalar={medyalar} />}
    </main>
  );
}

function MedyaFormu({ tesisler, kisiler, kapat }: {
  tesisler: { id: string; kod: string; ad: string }[];
  kisiler: { id: string; adSoyad: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ kod: '', ad: '', tip: 'usb_bellek', seriNo: '', tesisId: '', sahibiId: '' });
  /* Şifreleme ÜÇ değerlidir; tek bir onay kutusu "ölçülmedi" hâlini
     kaybederdi ve ölçülmemiş her medya "şifresiz" görünürdü. */
  const [sifreleme, setSifreleme] = useState<'olculmedi' | 'evet' | 'hayir'>('olculmedi');
  const g = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Yeni medya kaydı</p>
      <Alan etiket="Medya kodu" zorunlu>
        <input className="ab-gr" value={f.kod} onChange={g('kod')}
          placeholder="Etiket numarası" />
      </Alan>
      <Alan etiket="Adı" zorunlu>
        <input className="ab-gr" value={f.ad} onChange={g('ad')} />
      </Alan>
      <Alan etiket="Tip" zorunlu>
        <select className="ab-gr" value={f.tip} onChange={g('tip')}>
          {MEDYA_TIPLERI.map((t) => (
            <option key={t} value={t}>{MEDYA_TIP_ETIKETI[t]}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Seri numarası">
        <input className="ab-gr" value={f.seriNo} onChange={g('seriNo')} />
      </Alan>
      <Alan etiket="Santral">
        <select className="ab-gr" value={f.tesisId} onChange={g('tesisId')}>
          <option value="">havuz (santrale bağlı değil)</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} · {t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Zimmetli kişi">
        <select className="ab-gr" value={f.sahibiId} onChange={g('sahibiId')}>
          <option value="">zimmetsiz</option>
          {kisiler.map((x) => <option key={x.id} value={x.id}>{x.adSoyad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Şifreleme" zorunlu>
        <select className="ab-gr" value={sifreleme}
          onChange={(e) => setSifreleme(e.target.value as typeof sifreleme)}>
          <option value="olculmedi">ölçülmedi</option>
          <option value="evet">şifreli</option>
          <option value="hayir">şifresiz</option>
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.kod.trim() || !f.ad.trim()}
          onClick={() => calistir(async () => {
            const s = await medyaKaydet({
              kod: f.kod, ad: f.ad, tip: f.tip,
              seriNo: f.seriNo || null,
              tesisId: f.tesisId || null,
              sahibiId: f.sahibiId || null,
              sifreli: sifreleme === 'olculmedi' ? null : sifreleme === 'evet',
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

function KullanimFormu({ medyalar, varliklar, kapat }: {
  medyalar: Medya[];
  varliklar: { id: string; ad: string; kritiklik: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [medyaId, setMedyaId] = useState(medyalar[0]?.id ?? '');
  const [varlikId, setVarlikId] = useState(varliklar[0]?.id ?? '');
  const [baslangic, setBaslangic] = useState('');
  const [amac, setAmac] = useState('');
  const [onaylandi, setOnaylandi] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Medya kullanımı kaydet</p>
      <Alan etiket="Medya" zorunlu>
        <select className="ab-gr" value={medyaId} onChange={(e) => setMedyaId(e.target.value)}>
          {medyalar.map((m) => <option key={m.id} value={m.id}>{m.kod} · {m.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Takıldığı varlık" zorunlu>
        <select className="ab-gr" value={varlikId} onChange={(e) => setVarlikId(e.target.value)}>
          {varliklar.map((v) => (
            <option key={v.id} value={v.id}>{v.ad} ({v.kritiklik})</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Kullanım zamanı" zorunlu>
        <input className="ab-gr" type="datetime-local" value={baslangic}
          onChange={(e) => setBaslangic(e.target.value)} />
      </Alan>
      <Alan etiket="Amaç" zorunlu>
        <input className="ab-gr" value={amac} onChange={(e) => setAmac(e.target.value)}
          placeholder="Örn. firmware güncellemesi" />
      </Alan>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
        <input type="checkbox" checked={onaylandi}
          onChange={(e) => setOnaylandi(e.target.checked)} />
        <span>Kullanım öncesi onay alındı</span>
      </label>
      {uyari && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{uyari}</p>}
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil"
          disabled={bekliyor || !medyaId || !varlikId || !baslangic || !amac.trim()}
          onClick={() => calistir(async () => {
            const s = await medyaKullanimKaydet({
              medyaId, varlikId,
              baslangic: new Date(baslangic).toISOString(),
              amac, onaylandi,
            });
            if (s.ok) { setUyari(s.uyari ?? null); if (!s.uyari) kapat(); }
            return s;
          })}>
          Kaydet
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Kapat</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Onaysız kullanım REDDEDİLMEZ, uyarıyla kaydedilir: kaydı zorlaştırmak
        kayıtsızlık üretir ve kayıtsız kullanım hiç görünmez.
      </p>
    </div>
  );
}

function MedyaIslemleri({ medyalar }: { medyalar: Medya[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [id, setId] = useState(medyalar[0]?.id ?? '');
  const [gerekce, setGerekce] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: 0 }}>Medya işlemleri</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {medyalar.map((m) => <option key={m.id} value={m.id}>{m.kod} · {m.ad}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
        <Dugme disabled={bekliyor || !id}
          onClick={() => calistir(() => medyaTaramaKaydet({ id, temiz: true }))}>
          Tarama: temiz
        </Dugme>
        <Dugme tur="ret" disabled={bekliyor || !id}
          onClick={() => calistir(() => medyaTaramaKaydet({ id, temiz: false }))}>
          Tarama: zararlı bulundu
        </Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Zararlı bulunan medya kendiliğinden KARANTİNAYA alınır: temiz olmadığı
        bilinen bir belleğin kullanımda kalması, kaydı anlamsız kılardı.
      </p>
      <textarea className="ab-gr" rows={2} value={gerekce}
        placeholder="Durum değişikliği gerekçesi"
        onChange={(e) => setGerekce(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
        <Dugme disabled={bekliyor || !id || !gerekce.trim()}
          onClick={() => calistir(() => medyaDurumu({ id, durum: 'kayitli', gerekce }))}>
          Karantinadan çıkar
        </Dugme>
        <Dugme tur="ret" disabled={bekliyor || !id || !gerekce.trim()}
          onClick={() => calistir(() => medyaDurumu({ id, durum: 'kayip', gerekce }))}>
          Kayıp bildir
        </Dugme>
        <Dugme tur="ret" disabled={bekliyor || !id || !gerekce.trim()}
          onClick={() => calistir(() => medyaDurumu({ id, durum: 'imha', gerekce }))}>
          İmha edildi
        </Dugme>
      </div>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}
