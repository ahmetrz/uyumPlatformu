'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/atlas/temel';
import { CekmeceEylemler } from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { zamanTR } from '@/lib/sabitler';
import { etkiDogrula, etkiDogrulamaGeriAl, etkiOnerisiYenile } from '@/lib/eylemler2/olay';
import {
  ETKI_ALAN_ETIKET, SEVIYE_KUMESI, dogrulanmisAlanlar, seviyeSozu,
  type EtkiAlani, type OlayKaydi,
} from './mantik';

/* Etki doğrulama yüzeyi — otomasyonun İNSAN KAPISIdır.

   · Motor önerir; bu form olmadan hiçbir etki alanı dolmaz.
   · Gerekçe zorunludur (boş gerekçe sunucuda da reddedilir).
   · Öneri kutuda ÖN SEÇİLİ gelir ama insan başka değer seçebilir —
     kabul mü değiştirme mi olduğu denetim izine yazılır.
   · "Bilinmiyor" seçilemez: değerlendirme yapılmadıysa alan boş kalır.
   MODAL YOK, SNACKBAR YOK: onay çekmecenin içinde iki adımda kapanır. */

export function EtkiDogrulama({
  olay, bekleyen, dogrulayabilir,
}: { olay: OlayKaydi; bekleyen: EtkiAlani[]; dogrulayabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acikAlan, setAcikAlan] = useState<EtkiAlani | null>(null);
  const [deger, setDeger] = useState('');
  const [gerekce, setGerekce] = useState('');
  const [geriAlinan, setGeriAlinan] = useState<EtkiAlani | null>(null);

  const dogrulanmis = dogrulanmisAlanlar(olay);

  if (!dogrulayabilir) {
    return (
      <div className="cekmece-blok" style={{ marginTop: 'var(--s26)' }}>
        <div className="blok yetkisiz">
          <p className="t-caption" style={{ margin: 0 }}>Yetkisiz</p>
          <p className="cumle">
            Etki doğrulama yönetim onay yetkisi ister. Öneri okunabilir,
            etki alanına yazılamaz.
          </p>
        </div>
      </div>
    );
  }

  const ac = (alan: EtkiAlani) => {
    setAcikAlan(alan);
    setGeriAlinan(null);
    const onerilen = olay.oneri?.degerler[alan];
    setDeger(onerilen && onerilen !== 'bilinmiyor' ? onerilen : '');
    setGerekce('');
  };

  const kaydet = () => calistir(
    () => etkiDogrula({ olayId: olay.id, alan: acikAlan as string, deger, gerekce }),
    () => { setAcikAlan(null); setGerekce(''); },
  );

  const geriAl = (alan: EtkiAlani) => calistir(
    () => etkiDogrulamaGeriAl({ olayId: olay.id, alan, gerekce }),
    () => { setGeriAlinan(null); setGerekce(''); },
  );

  /* Doldurulmamış HER alan açılabilir: motor "bilinmiyor" dediği için insanın
     değerlendirme yapamaması saçma olurdu. Motorun bir şey önerdiği alanlar
     (bekleyen) öne çıkar; kalanlar ikincil kalır. */
  const acilabilir = (Object.keys(SEVIYE_KUMESI) as EtkiAlani[])
    .filter((a) => olay.etki[a] === null)
    .sort((a, b) => Number(bekleyen.includes(b)) - Number(bekleyen.includes(a)));

  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s26)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Etki doğrulama</p>

      {acikAlan === null && geriAlinan === null && (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {acilabilir.length === 0 ? (
            <p className="cekmece-dip" style={{ margin: 0 }}>
              Dört etki alanı da doğrulanmış.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s8)' }}>
              {/* Çekmecede TEK birincil eylem: sırada bekleyen ilk öneri. */}
              {acilabilir.map((a, i) => (
                <Dugme key={a} tur={i === 0 && bekleyen.includes(a) ? 'cekmece' : 'ikincil'}
                  onClick={() => ac(a)}>
                  {ETKI_ALAN_ETIKET[a]} doğrula
                </Dugme>
              ))}
            </div>
          )}

          {dogrulanmis.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--s6)', marginTop: 'var(--s6)' }}>
              {dogrulanmis.map((a) => (
                <div key={a} style={{ display: 'flex', alignItems: 'baseline',
                  gap: 'var(--s10)', fontSize: 'var(--t-label)' }}>
                  <span style={{ color: 'var(--i2)' }}>
                    {ETKI_ALAN_ETIKET[a]} · {seviyeSozu(olay.etki[a])}
                  </span>
                  <button type="button" className="dg dg-satir" style={{ marginLeft: 'auto' }}
                    onClick={() => { setGeriAlinan(a); setGerekce(''); }}>
                    Doğrulamayı geri al
                  </button>
                </div>
              ))}
            </div>
          )}

          {hata && <p className="gr-hata" style={{ margin: 0 }}>{hata}</p>}
        </div>
      )}

      {acikAlan !== null && (
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)' }}>
              <Im durum="unk" ad="Motor önerisi" />
              Motor önerisi: {seviyeSozu(olay.oneri?.degerler[acikAlan])}
            </span>
          </p>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            {olay.oneri?.dayanaklar[acikAlan] ?? 'Öneri dayanağı yok.'}
          </p>

          <Alan etiket={`${ETKI_ALAN_ETIKET[acikAlan]} etkisi`} zorunlu>
            <select className="gr" value={deger} onChange={(e) => setDeger(e.target.value)}>
              <option value="">Seçiniz…</option>
              {SEVIYE_KUMESI[acikAlan].map((d) => (
                <option key={d} value={d}>{seviyeSozu(d)}</option>
              ))}
            </select>
          </Alan>

          <Alan etiket="Doğrulama gerekçesi" zorunlu hata={hata}>
            <textarea className="gr" rows={3} value={gerekce}
              placeholder="Bu kararın dayanağı — hangi kanıt, hangi gözlem?"
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>

          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !deger || gerekce.trim().length < 3}
              onClick={kaydet}>
              {bekliyor ? 'Kaydediliyor…' : 'Doğrula'}
            </Dugme>
            <Dugme tur="ret" onClick={() => setAcikAlan(null)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Doğrulama denetim izine düşer; önerinin kabul mü edildiği,
            değiştirildi mi olduğu izde yazılıdır.
          </p>
        </div>
      )}

      {geriAlinan !== null && (
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
            {ETKI_ALAN_ETIKET[geriAlinan]} doğrulaması kaldırılacak — alan BOŞA
            döner, &quot;yok&quot; olmaz.
          </p>
          <Alan etiket="Geri alma gerekçesi" zorunlu hata={hata}>
            <textarea className="gr" rows={2} value={gerekce}
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || gerekce.trim().length < 3}
              onClick={() => geriAl(geriAlinan)}>
              {bekliyor ? 'Kaydediliyor…' : 'Geri al'}
            </Dugme>
            <Dugme tur="ret" onClick={() => setGeriAlinan(null)} disabled={bekliyor}>
              Vazgeç
            </Dugme>
          </div>
        </div>
      )}
    </div>
  );
}

/** Öneriyi tazeler. Yalnız `etkiOnerisiJson` yazılır — etki alanlarına
    bu düğme de dokunmaz. */
export function OneriYenile({
  olayId, yazabilir, uretilme,
}: { olayId: string; yazabilir: boolean; uretilme: string | null }) {
  const { bekliyor, hata, calistir } = useEylem();
  if (!yazabilir) {
    return (
      <CekmeceEylemler dipNot={uretilme
        ? `Öneri ${zamanTR(uretilme)} üretildi.`
        : 'Etki önerisi henüz üretilmedi.'} />
    );
  }
  return (
    <CekmeceEylemler
      birincil={
        <Dugme tur="ikincil" disabled={bekliyor}
          onClick={() => calistir(() => etkiOnerisiYenile(olayId))}>
          {bekliyor ? 'Zincir yürünüyor…' : 'Öneriyi yeniden üret'}
        </Dugme>
      }
      dipNot={hata ?? (uretilme
        ? `Öneri ${zamanTR(uretilme)} üretildi · yeniden üretmek etki alanlarına yazmaz.`
        : 'Etki önerisi henüz üretilmedi.')}
    />
  );
}
