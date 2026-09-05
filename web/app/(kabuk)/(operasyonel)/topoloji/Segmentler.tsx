'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { Cekmece, CekmeceAlanlar, CekmeceKimlik } from '@/components/kabuk/panel';
import { Tablo, type Kolon } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import { agSegmentiKaydet } from '@/lib/eylemler2/varlikDurusu';
import { adresSayisi, subnetCozumle } from '@/lib/alan/ag';
import type { BolgeSatiri, SegmentSatiri } from './mantik';

/* ═══ OT-11 · Adresleme segmentleri ════════════════════════════════════

   Topoloji tezgâhının dördüncü kipi. Bölge kipi GÜVENLİK sınırını çizer
   (Purdue seviyesi, geçit kuralı); bu kip ADRESLEMEYİ yönetir — VLAN,
   CIDR, ağ geçidi. İkisi ayrı kayıtlardır çünkü tek bölgede beş VLAN
   yaşayabilir ve "bu IP hangi segmentte" sorusu bölge kaydından
   cevaplanamaz.

   ── ÜÇ AYRIM BURADA DA GEÇERLİ ────────────────────────────────────────
   VLAN `null` ise "VLAN yok" DEĞİL "VLAN bilinmiyor" yazılır. Yönetim
   ağı `null` ise "hayır" değil "ölçülmedi". Bir segmentin varlık sayısı
   sıfırsa "boş" denir — "sorunsuz" değil.

   ── CIDR BURADA DEĞİL SUNUCUDA DOĞRULANIR ────────────────────────────
   Form `lib/alan/ag.ts` ile ön izleme yapar (kaç adres, hangi aralık) ama
   kararı sunucu verir: `agSegmentiKaydet` çözümleyemediği CIDR'yi yazmaz.
   Ekranın ön izlemesi bir kolaylıktır, bir kapı değildir. */

function vlanSozu(v: number | null): string {
  return v === null ? 'bilinmiyor' : String(v);
}

function yonetimSozu(v: boolean | null): string {
  if (v === null) return 'ölçülmedi';
  return v ? 'bant dışı yönetim' : 'üretim ağı';
}

/** Segmentin durumu: açık bulgu > ölçülmemiş VLAN > varlıksız > sağlıklı. */
function segmentImi(s: SegmentSatiri): 'bd' | 'md' | 'unk' | 'ok' {
  if (s.acikBulgu > 0) return 'bd';
  if (s.vlanId === null) return 'unk';
  if (s.varlikSayisi === 0) return 'md';
  return 'ok';
}

const KOLONLAR: Kolon[] = [
  { baslik: 'CIDR', genislik: 'minmax(0, 1fr)' },
  { baslik: 'VLAN', genislik: '76px', sag: true },
  { baslik: 'Bölge', genislik: '120px' },
  { baslik: 'Varlık', genislik: '72px', sag: true },
  { baslik: 'Açık bulgu', genislik: '96px', sag: true },
];

type Form = {
  id?: string; bolgeId: string; kod: string; ad: string;
  vlan: string; cidr: string; gatewayIp: string;
  yonetimAgi: string; aciklama: string;
};

const BOS: Form = {
  bolgeId: '', kod: '', ad: '', vlan: '', cidr: '',
  gatewayIp: '', yonetimAgi: '', aciklama: '',
};

function formdan(s: SegmentSatiri): Form {
  return {
    id: s.id, bolgeId: s.bolgeId, kod: s.kod, ad: s.ad,
    vlan: s.vlanId === null ? '' : String(s.vlanId),
    cidr: s.cidr, gatewayIp: s.gatewayIp ?? '',
    yonetimAgi: s.yonetimAgi === null ? '' : s.yonetimAgi ? 'evet' : 'hayir',
    aciklama: s.aciklama ?? '',
  };
}

function SegmentFormu({ f, setF, bolgeler, kapat }: {
  f: Form; setF: (f: Form) => void; bolgeler: BolgeSatiri[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const cozum = subnetCozumle(f.cidr);
  const adres = adresSayisi(f.cidr);
  const vlanSayi = f.vlan.trim() === '' ? null : Number(f.vlan);
  const vlanGecerli = vlanSayi === null
    || (Number.isInteger(vlanSayi) && vlanSayi >= 1 && vlanSayi <= 4094);
  const gecerli = !!f.bolgeId && !!f.kod.trim() && !!f.ad.trim()
    && cozum !== null && vlanGecerli;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Ağ bölgesi" zorunlu>
        <select className="ab-gr" value={f.bolgeId}
          onChange={(e) => setF({ ...f, bolgeId: e.target.value })}>
          <option value="">seçin</option>
          {bolgeler.map((b) => (
            <option key={b.id} value={b.id}>{b.kod} · {b.ad}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Kod" zorunlu>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.kod}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="ab-gr" value={f.ad}
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="CIDR" zorunlu
        hata={f.cidr.trim() && cozum === null ? 'CIDR çözümlenemedi.' : null}>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          placeholder="10.20.0.0/22" value={f.cidr}
          onChange={(e) => setF({ ...f, cidr: e.target.value })} />
      </Alan>
      {cozum !== null && (
        <p className="ab-dip" style={{ margin: 0 }}>
          {adres === null
            ? 'Adres sayısı hesaplanamadı.'
            : `${adres.toLocaleString('tr')} adres · ${cozum.aile} · ön ek /${cozum.uzunluk}`}
          {' — son kararı sunucu verir.'}
        </p>
      )}
      <Alan etiket="VLAN (1–4094; boş = bilinmiyor)"
        hata={vlanGecerli ? null : 'VLAN 1 ile 4094 arasında olmalı.'}>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          inputMode="numeric" value={f.vlan}
          onChange={(e) => setF({ ...f, vlan: e.target.value })} />
      </Alan>
      <Alan etiket="Ağ geçidi IP">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.gatewayIp}
          onChange={(e) => setF({ ...f, gatewayIp: e.target.value })} />
      </Alan>
      <Alan etiket="Yönetim ağı">
        <select className="ab-gr" value={f.yonetimAgi}
          onChange={(e) => setF({ ...f, yonetimAgi: e.target.value })}>
          <option value="">Bilinmiyor</option>
          <option value="evet">Bant dışı yönetim ağı</option>
          <option value="hayir">Üretim ağı</option>
        </select>
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={2} value={f.aciklama}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => agSegmentiKaydet({
            id: f.id, bolgeId: f.bolgeId, kod: f.kod, ad: f.ad,
            cidr: f.cidr,
            // Boş VLAN null'a düşer: "VLAN yok" değil "bilinmiyor".
            vlanId: vlanSayi,
            gatewayIp: f.gatewayIp || null,
            yonetimAgi: f.yonetimAgi === '' ? null : f.yonetimAgi === 'evet',
            aciklama: f.aciklama || null,
          }), kapat)}>
          {f.id ? 'Kaydet' : 'Segment oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

export function SegmentGorunumu({ segmentler, bolgeler, yazabilir, secili, sec }: {
  segmentler: SegmentSatiri[];
  bolgeler: BolgeSatiri[];
  yazabilir: boolean;
  secili: string | null;
  sec: (id: string | null) => void;
}) {
  const [yeni, setYeni] = useState<Form | null>(null);

  const olcusuz = segmentler.filter((s) => s.vlanId === null).length;
  const bulgulu = segmentler.filter((s) => s.acikBulgu > 0).length;

  return (
    <div style={{ marginTop: 'var(--s18)' }}>
      {yazabilir && (
        <div style={{ marginBottom: 'var(--s12)' }}>
          <Dugme onClick={() => setYeni(yeni ? null : { ...BOS })}>
            {yeni ? 'Formu kapat' : 'Yeni segment'}
          </Dugme>
        </div>
      )}
      {yeni && (
        <div className="ab-blok" style={{ marginBottom: 'var(--s18)' }}>
          <SegmentFormu f={yeni} setF={setYeni} bolgeler={bolgeler}
            kapat={() => setYeni(null)} />
        </div>
      )}

      <Tablo
        konuBasligi="Segment"
        kolonlar={KOLONLAR}
        secili={secili}
        sec={(id) => sec(id === secili ? null : id)}
        dipNot={[
          `${segmentler.length} segment`,
          olcusuz > 0 ? `${olcusuz} segmentin VLAN'ı ölçülmedi` : null,
          bulgulu > 0 ? `${bulgulu} segmentte açık veri kalitesi bulgusu var` : null,
        ].filter(Boolean).join(' · ')}
        satirlar={segmentler.map((s) => ({
          id: s.id,
          durum: segmentImi(s),
          kenar: segmentImi(s),
          konu: s.kod,
          alt: s.ad,
          hucreler: [
            <span key="c" style={{ fontFamily: 'var(--veri)' }}>{s.cidr}</span>,
            <span key="v" style={s.vlanId === null ? { color: 'var(--unk)' } : undefined}>
              {vlanSozu(s.vlanId)}
            </span>,
            s.bolgeKodu,
            s.varlikSayisi,
            s.acikBulgu,
          ],
        }))}
      />
    </div>
  );
}

export function SegmentCekmecesi({ segment, bolgeler, kapat }: {
  segment: SegmentSatiri; bolgeler: BolgeSatiri[]; kapat: () => void;
}) {
  const [duzenle, setDuzenle] = useState<Form | null>(null);
  const adres = adresSayisi(segment.cidr);

  return (
    <Cekmece kod={segment.kod} kapat={kapat}>
      <CekmeceKimlik
        durum={segmentImi(segment)}
        soz={segment.acikBulgu > 0 ? 'Açık veri kalitesi bulgusu' : 'Adresleme segmenti'}
        baslik={segment.ad}
        cumle={`${segment.cidr} · ${segment.bolgeKodu} bölgesinde`}
      />
      <CekmeceAlanlar
        alanlar={[
          { etiket: 'CIDR', deger: <span className="mono">{segment.cidr}</span> },
          {
            etiket: 'Adres sayısı',
            deger: adres === null ? 'çözümlenemedi' : adres.toLocaleString('tr'),
            durum: adres === null ? 'unk' : undefined,
          },
          {
            etiket: 'VLAN', deger: vlanSozu(segment.vlanId),
            durum: segment.vlanId === null ? 'unk' : undefined,
          },
          {
            etiket: 'Ağ geçidi', deger: segment.gatewayIp ?? 'girilmedi',
            durum: segment.gatewayIp === null ? 'unk' : undefined,
          },
          {
            etiket: 'Yönetim ağı', deger: yonetimSozu(segment.yonetimAgi),
            durum: segment.yonetimAgi === null ? 'unk' : undefined,
          },
          { etiket: 'Bölge', deger: segment.bolgeKodu },
          {
            etiket: 'Santral', deger: segment.tesisKodu ?? 'tesissiz',
            durum: segment.tesisKodu ? undefined : 'unk',
          },
          {
            etiket: 'Atanmış varlık', deger: String(segment.varlikSayisi),
            /* Sıfır varlık BOŞ segment demektir, "sorunsuz" değil. */
            durum: segment.varlikSayisi === 0 ? 'md' : undefined,
          },
          {
            etiket: 'Açık bulgu', deger: String(segment.acikBulgu),
            durum: segment.acikBulgu > 0 ? 'bd' : undefined,
          },
        ]}
      />
      {segment.aciklama && <p className="ab-dip">{segment.aciklama}</p>}

      {segment.acikBulgu > 0 && (
        <p className="ab-dip">
          Bu segment hakkında {segment.acikBulgu} açık veri kalitesi bulgusu var;
          bulgular <Im durum="bd" /> Sağlık ekranının veri kalitesi kipinde
          görülür ve orada karara bağlanır.
        </p>
      )}

      {segment.yazilabilir && (
        duzenle ? (
          <SegmentFormu f={duzenle} setF={setDuzenle} bolgeler={bolgeler}
            kapat={() => setDuzenle(null)} />
        ) : (
          <Dugme onClick={() => setDuzenle(formdan(segment))}>Segmenti düzenle</Dugme>
        )
      )}
    </Cekmece>
  );
}
