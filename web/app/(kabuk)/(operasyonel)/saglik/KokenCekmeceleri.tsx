'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { CekmeceAlanlar, CekmeceKimlik } from '@/components/kabuk/panel';
import { KokenRozeti, KokenSatiri, guvenYazisi } from '@/components/kabuk/Koken';
import { useEylem } from '@/components/useEylem';
import { kokenDogrulaEylem, kokenTopluDogrula } from '@/lib/eylemler2/koken';
import { etiketle, zamanTR } from '@/lib/sabitler';
import {
  BEKLEYEN_SINIRI, dogrulamaPasif, kaynakImi, kokenCumlesi, kokenImi,
  kokenSozu, kokensizYazisi, ortalamaGuvenYazisi,
  type BayatSatiri, type BekleyenSatiri, type KaynakSatiri, type KokenOzeti,
  type KokenSayimSatiri,
} from './mantik';

/* Veri kökeni çekmeceleri — "bu kaydı nereden biliyoruz?" (§12 + §18)

   Köken katmanı yazılmıştı ama hiçbir ekrana monte edilmemişti:
   `components/atlas/Koken.tsx` bileşenlerini kimse import etmiyordu,
   `lib/entegrasyon/kokenRapor.ts` yalnız testlerde koşuyordu ve
   `lib/eylemler2/koken.ts` eylemlerinin çağıranı yoktu. Burası o üç
   katmanın buluştuğu yer.

   DEĞİŞMEZ: kaynak bağlamı olmayan bir kayıt 'doğrulanmış' görünemez.
   Kökeni olmayan kayıt gizlenmez — kendi hücresinde sayılır ve
   `KokenRozeti` onu "ELLE GİRİLDİ" diye işaretler.

   DOĞRULAMA İNSANIN İŞİDİR: seçim + gerekçe olmadan hiçbir düğme açılmaz;
   sunucu da (lib/eylemler2/koken.ts) aynısını uygular. */

const pasifStil = (pasif: boolean) =>
  (pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined);

/* ── Çekmece · kayıt tipi ───────────────────────────────────────────── */

export function KokenTipiOzeti({ s }: { s: KokenSayimSatiri }) {
  const im = kokenImi(s);
  return (
    <>
      <CekmeceKimlik durum={im} soz={kokenSozu(s)} baslik={etiketle(s.varlikTipi)}
        cumle={kokenCumlesi(s)} />

      <CekmeceAlanlar alanlar={[
        // "Kökeni yok" GİZLENMEZ ve bilinmeyen sıfıra çevrilmez.
        { etiket: 'Kökeni yok (elle girildi)', deger: kokensizYazisi(s),
          durum: s.manuel === null || s.manuel > 0 ? 'unk' : undefined },
        { etiket: 'Doğrulama bekleyen', deger: String(s.otomatik),
          durum: s.otomatik > 0 ? 'md' : undefined },
        { etiket: 'İnsan doğrulamış', deger: String(s.dogrulanmis) },
        { etiket: 'Reddedilmiş', deger: String(s.reddedildi),
          durum: s.reddedildi > 0 ? 'bd' : undefined },
        { etiket: 'Kayıt evreni', deger: s.toplam === null ? 'bilinmiyor' : String(s.toplam),
          durum: s.toplam === null ? 'unk' : undefined },
      ]} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Kökeni olmayan kayıt nasıl görünür
        </p>
        {/* Kural bir cümle olarak değil, ÖRNEK olarak gösterilir: kökeni
            olmayan kayıt ekranın her yerinde bu işareti taşır. */}
        <KokenRozeti koken={null} />
        <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
          Kaynak bağlamı olmayan kayıt hiçbir ekranda &quot;doğrulanmış&quot;
          görünmez; elle girilmiş sayılır ve doğrulama kuyruğuna da girmez —
          doğrulanacak bir kaynak yoktur.
        </p>
      </div>
    </>
  );
}

/* ── Çekmece · kaynak sistem ────────────────────────────────────────── */

export function KaynakOzeti({
  k, ozet,
}: { k: KaynakSatiri; ozet: KokenOzeti }) {
  const im = kaynakImi(k);
  const bekleyenler = ozet.bekleyenler.filter((b) => b.kaynakSistem === k.kaynakSistem);
  const bayatlar = ozet.bayatlar.filter((b) => b.kaynakSistem === k.kaynakSistem);
  const enUzun = bekleyenler[0] ?? null;

  return (
    <>
      <CekmeceKimlik
        durum={im}
        soz={k.reddedildi > 0 ? 'Reddedilmiş kayıt var'
          : k.dogrulanmadi > 0 ? 'Doğrulama bekliyor'
            : k.bayat > 0 ? 'Kayıtların bir kısmı tazelenmiyor'
              : 'Bu kaynağın kayıtları doğrulanmış'}
        baslik={k.kaynakSistem}
        cumle={`Bu kaynak ${k.kayit} kaydı besliyor. `
          + `${k.guveniOlculmemis} köken satırının güveni ölçülmemiş — `
          + 'ölçülmemiş güven sıfır güven değildir.'}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Beslediği kayıt', deger: String(k.kayit) },
        { etiket: 'Doğrulama bekleyen', deger: String(k.dogrulanmadi),
          durum: k.dogrulanmadi > 0 ? 'md' : undefined },
        { etiket: 'Reddedilmiş', deger: String(k.reddedildi),
          durum: k.reddedildi > 0 ? 'bd' : undefined },
        { etiket: `Bayat (${ozet.esikGun} gün+)`, deger: String(k.bayat),
          durum: k.bayat > 0 ? 'unk' : undefined },
        { etiket: 'Ortalama güven', deger: ortalamaGuvenYazisi(k.ortalamaGuven),
          durum: k.ortalamaGuven === null ? 'unk' : undefined },
        { etiket: 'Son aktarım', deger: zamanTR(k.sonAktarim) },
      ]} />

      {enUzun && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
            En uzun bekleyen kayıt
          </p>
          {/* Köken satırı bileşeni: kaynak · toplanma · güven · doğrulama. */}
          <KokenSatiri koken={{
            kokenTipi: 'otomatik', kaynakSistem: enUzun.kaynakSistem,
            guven: enUzun.guven, dogrulamaDurumu: 'dogrulanmadi',
            aktarim: enUzun.aktarim,
          }} />
        </div>
      )}

      <DogrulamaKuyrugu bekleyenler={bekleyenler} ozet={ozet} />
      <BayatListesi bayatlar={bayatlar} esikGun={ozet.esikGun} />
    </>
  );
}

/* ── Doğrulama kuyruğu (insan onayı) ────────────────────────────────── */

function DogrulamaKuyrugu({
  bekleyenler, ozet,
}: { bekleyenler: BekleyenSatiri[]; ozet: KokenOzeti }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [secim, setSecim] = useState<string[]>([]);
  const [gerekce, setGerekce] = useState('');

  if (bekleyenler.length === 0) {
    return (
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Doğrulama kuyruğu</p>
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Bu kaynaktan doğrulama bekleyen kayıt yok.
        </p>
      </div>
    );
  }

  const cevir = (id: string) =>
    setSecim((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const pasif = dogrulamaPasif(secim, gerekce, ozet.dogrulayabilir, bekliyor);

  /* Tek kayıt için `kokenDogrulaEylem`, birden çoğu için `kokenTopluDogrula`
     çağrılır. İkisi de her kayıt için AYRI denetim izi bırakır; toplu işlem
     tek satıra indirgenmez. */
  function karar(sonuc: 'dogrulandi' | 'reddedildi') {
    calistir(
      () => (secim.length === 1
        ? kokenDogrulaEylem({ kokenId: secim[0], sonuc, gerekce: gerekce.trim() })
        : kokenTopluDogrula({ kokenIdler: secim, sonuc, gerekce: gerekce.trim() })),
      () => { setSecim([]); setGerekce(''); },
    );
  }

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Doğrulama kuyruğu · {bekleyenler.length}
      </p>

      <div style={{ display: 'grid', gap: 'var(--s10)' }}>
        {bekleyenler.slice(0, 8).map((b) => (
          <label key={b.kokenId} style={{ display: 'grid',
            gridTemplateColumns: '18px 1fr', gap: 'var(--s8)', alignItems: 'start',
            cursor: ozet.dogrulayabilir ? 'pointer' : 'not-allowed' }}>
            <input type="checkbox" checked={secim.includes(b.kokenId)}
              disabled={!ozet.dogrulayabilir}
              onChange={() => cevir(b.kokenId)} style={{ marginTop: 3 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                {etiketle(b.varlikTipi)} · {b.bekleyenGun} gündür bekliyor
              </span>
              <span className="mono" style={{ display: 'block', marginTop: 2,
                fontSize: 'var(--t-label)', color: 'var(--i3)', wordBreak: 'break-all' }}>
                {b.kaynakKayitId} · güven {guvenYazisi(b.guven)}
              </span>
              <span style={{ display: 'block', marginTop: 2 }}>
                <KokenRozeti koken={{
                  kokenTipi: 'otomatik', kaynakSistem: b.kaynakSistem,
                  guven: b.guven, dogrulamaDurumu: 'dogrulanmadi',
                }} />
              </span>
            </span>
          </label>
        ))}
      </div>

      {bekleyenler.length > 8 && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          +{bekleyenler.length - 8} kayıt daha bekliyor; en uzun bekleyen sekizi
          gösteriliyor. Kuyruk {BEKLEYEN_SINIRI} kayıtta kırpılır.
        </p>
      )}

      {ozet.dogrulayabilir ? (
        <>
          <div style={{ marginTop: 'var(--s14)' }}>
            <Alan etiket="Gerekçe" zorunlu>
              <textarea className="ab-gr" rows={2} value={gerekce}
                onChange={(e) => setGerekce(e.target.value)}
                placeholder="Doğrulamanın dayanağı — denetim izine bu metin yazılır"
                style={{ resize: 'vertical' }} />
            </Alan>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap',
            marginTop: 'var(--s12)' }}>
            <Dugme tur="tam" disabled={pasif} style={pasifStil(pasif)}
              onClick={() => karar('dogrulandi')}>
              {bekliyor ? 'Yazılıyor…' : `Doğrula · ${secim.length}`}
            </Dugme>
            <Dugme className="ab-dugme ret" disabled={pasif} style={pasifStil(pasif)}
              onClick={() => karar('reddedildi')}>
              Reddet
            </Dugme>
          </div>
          {hata && (
            <p role="alert" style={{ margin: 'var(--s12) 0 0',
              fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{hata}</p>
          )}
          <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
            Doğrulama insanın işidir: hiçbir motor bu kuyruğu boşaltamaz.
            Reddedilen kayıt silinmez — reddin kendisi de saklanan bir bilgidir.
          </p>
        </>
      ) : (
        <p className="ab-panel-dip" style={{ margin: 'var(--s14) 0 0' }}>
          Köken doğrulamak envanter onay yetkisi ister. Kuyruğu görebilirsiniz,
          karar veremezsiniz.
        </p>
      )}
    </div>
  );
}

/* ── Bayat kökenler ─────────────────────────────────────────────────── */

function BayatListesi({ bayatlar, esikGun }: { bayatlar: BayatSatiri[]; esikGun: number }) {
  if (bayatlar.length === 0) return null;
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Bayat köken · {esikGun} gündür tazelenmedi
      </p>
      <div style={{ display: 'grid', gap: 'var(--s10)' }}>
        {bayatlar.slice(0, 6).map((b) => (
          <div key={b.kokenId} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
            gap: 'var(--s8)', alignItems: 'start' }}>
            <span style={{ paddingTop: 3 }}>
              <Im durum="unk" ad="Kaydın güncelliği bilinmiyor" />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                {etiketle(b.varlikTipi)} · {b.gecenGun} gündür tazelenmedi
              </span>
              <span className="mono" style={{ display: 'block', marginTop: 2,
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                son aktarım {zamanTR(b.sonAktarim)} · güven {guvenYazisi(b.guven)}
              </span>
            </span>
          </div>
        ))}
      </div>
      {bayatlar.length > 6 && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          +{bayatlar.length - 6} bayat köken daha.
        </p>
      )}
      <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
        Bayat köken yanlış veri demek değildir: kaynak bu kaydı artık
        doğrulamıyor, yani güncelliği BİLİNMİYOR.
      </p>
    </div>
  );
}
