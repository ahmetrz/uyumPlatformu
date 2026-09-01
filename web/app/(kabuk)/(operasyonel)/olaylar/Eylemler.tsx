'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { CekmeceEylemler } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { zamanTR } from '@/lib/sabitler';
import {
  etkiDogrula, etkiDogrulamaGeriAl, etkiOnerisiYenile,
  olayGuncelle, olayBagla, olayBagKaldir,
} from '@/lib/eylemler2/olay';
import { olayKaydet } from '@/lib/eylemler2/operasyon';
import {
  BAG_ETIKET, BAG_TIPLERI, DURUMLAR, ETKI_ALAN_ETIKET, OLAY_DURUM_SOZU,
  SEVIYE_KUMESI, SIDDETLER, SIDDET_SOZU, TESPIT_KAYNAKLARI, TESPIT_SOZU,
  TIPLER, TIP_SOZU,
  baglar, bagSayisi, dogrulanmisAlanlar, seviyeSozu,
  type BagAdayi, type BagTipi, type EtkiAlani, type OlayKaydi, type Santral,
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
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s26)' }}>
        <div className="ab-blok">
          <p className="etiket" style={{ margin: 0 }}>Yetkisiz</p>
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
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s26)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Etki doğrulama</p>

      {acikAlan === null && geriAlinan === null && (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {acilabilir.length === 0 ? (
            <p className="ab-panel-dip" style={{ margin: 0 }}>
              Dört etki alanı da doğrulanmış.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s8)' }}>
              {/* Çekmecede TEK birincil eylem: sırada bekleyen ilk öneri. */}
              {acilabilir.map((a, i) => (
                <Dugme key={a} tur={i === 0 && bekleyen.includes(a) ? 'tam' : 'ikincil'}
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
                  <button type="button" className="ab-dugme satir" style={{ marginLeft: 'auto' }}
                    onClick={() => { setGeriAlinan(a); setGerekce(''); }}>
                    Doğrulamayı geri al
                  </button>
                </div>
              ))}
            </div>
          )}

          {hata && <p className="ab-gr-hata" style={{ margin: 0 }}>{hata}</p>}
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
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            {olay.oneri?.dayanaklar[acikAlan] ?? 'Öneri dayanağı yok.'}
          </p>

          <Alan etiket={`${ETKI_ALAN_ETIKET[acikAlan]} etkisi`} zorunlu>
            <select className="ab-gr" value={deger} onChange={(e) => setDeger(e.target.value)}>
              <option value="">Seçiniz…</option>
              {SEVIYE_KUMESI[acikAlan].map((d) => (
                <option key={d} value={d}>{seviyeSozu(d)}</option>
              ))}
            </select>
          </Alan>

          <Alan etiket="Doğrulama gerekçesi" zorunlu hata={hata}>
            <textarea className="ab-gr" rows={3} value={gerekce}
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
          <p className="ab-panel-dip" style={{ margin: 0 }}>
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
            <textarea className="ab-gr" rows={2} value={gerekce}
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

/* ── olay kaydı ─────────────────────────────────────────────────────────

   İKİ AYRI MUTASYON, İKİ AYRI İŞ — bilerek.

   · AÇILIŞ  → `olayKaydet` (lib/eylemler2/operasyon.ts). Kodu (`OLY-nnnn`)
     o üretir ve 'olusturma' izini o düşer. Ürünün içinde olay açmanın
     başka bir yolu yoktu; bu form o boşluğu kapatır.
   · GÜNCELLEME → `olayGuncelle` (lib/eylemler2/olay.ts). Müdahale ve
     öğrenme alanlarını yalnız o bilir, hedef santral kapsamını da yalnız o
     denetler (olay başka santrale taşınıyorsa İKİ tarafta yetki arar).

   `olayKaydet` güncelleme de yapabilir; kullanmıyoruz. İki yazma yolu aynı
   satıra dokunursa hangisinin hangi alanı ezdiği ekrandan okunamaz hâle
   gelir — açılış ile müdahale ayrı kapılardır.

   ETKİ ALANLARI BU FORMDA YOKTUR: onlar `etkiDogrula`ya aittir (yukarıdaki
   blok). Bir güncelleme formundan etki yazılabilseydi insan onayı kapısı
   yan kapıdan atlanmış olurdu. */

const BOS_YENI = {
  baslik: '', tip: 'olay', tesisId: '', siddet: 'orta', ozet: '',
};

export function YeniOlayFormu({
  santraller, kapat,
}: { santraller: Santral[]; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState(BOS_YENI);
  const gecerli = v.baslik.trim().length > 0;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={v.baslik} autoFocus
          placeholder="Örn. Kızıldere III DCS operatör istasyonunda yetkisiz oturum"
          onChange={(e) => setV({ ...v, baslik: e.target.value })} />
      </Alan>

      <Alan etiket="Şiddet" zorunlu>
        <select className="ab-gr" value={v.siddet}
          onChange={(e) => setV({ ...v, siddet: e.target.value })}>
          {SIDDETLER.map((s) => <option key={s} value={s}>{SIDDET_SOZU[s]}</option>)}
        </select>
      </Alan>

      <Alan etiket="Tip">
        <select className="ab-gr" value={v.tip}
          onChange={(e) => setV({ ...v, tip: e.target.value })}>
          {TIPLER.map((t) => <option key={t} value={t}>{TIP_SOZU[t]}</option>)}
        </select>
      </Alan>

      <Alan etiket="Santral">
        <select className="ab-gr" value={v.tesisId}
          onChange={(e) => setV({ ...v, tesisId: e.target.value })}>
          <option value="">santral kaydı yok</option>
          {santraller.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
        </select>
      </Alan>

      <Alan etiket="Özet">
        <textarea className="ab-gr" rows={3} value={v.ozet} style={{ resize: 'vertical' }}
          onChange={(e) => setV({ ...v, ozet: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => olayKaydet({
            baslik: v.baslik, tip: v.tip,
            tesisId: v.tesisId || null,
            siddet: v.siddet,
            ozet: v.ozet || null,
          }), kapat)}>
          {bekliyor ? 'Açılıyor…' : 'Olayı aç'}
        </Dugme>
        <Dugme tur="ret" onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Açılış denetim izine düşer. Etki alanları BOŞ açılır — etki motorun
        önerisiyle değil, insan doğrulamasıyla dolar. Santral seçilmezse
        kayıt &quot;etkisiz&quot; değil, &quot;santrali yazılmamış&quot; sayılır.
      </p>
    </div>
  );
}

/** Üç değerli bildirim alanının seçenekleri: boş = DEĞERLENDİRİLMEDİ. */
const BILDIRIM = [
  { id: '', ad: 'Değerlendirilmedi' },
  { id: 'evet', ad: 'Gerekli' },
  { id: 'hayir', ad: 'Gerekmiyor' },
];

export function OlayDuzenleFormu({ olay, santraller, kapat }: {
  olay: OlayKaydi; santraller: Santral[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    baslik: olay.baslik,
    tip: olay.tip,
    tesisId: olay.tesisId ?? '',
    siddet: olay.siddet,
    durum: olay.durum,
    ozet: olay.ozet ?? '',
    tespitKaynagi: olay.tespitKaynagi ?? '',
    kokNeden: olay.kokNeden ?? '',
    sinirlama: olay.sinirlama ?? '',
    kurtarma: olay.kurtarma ?? '',
    ogrenilenler: olay.ogrenilenler ?? '',
    bildirimGerekli: olay.bildirimGerekli === null ? '' : olay.bildirimGerekli ? 'evet' : 'hayir',
    bildirimTarihi: olay.bildirimTarihi?.slice(0, 10) ?? '',
  });

  const bildirimNull = v.bildirimGerekli === '';
  const gecerli = v.baslik.trim().length > 0;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={v.baslik}
          onChange={(e) => setV({ ...v, baslik: e.target.value })} />
      </Alan>

      <Alan etiket="Durum">
        <select className="ab-gr" value={v.durum}
          onChange={(e) => setV({ ...v, durum: e.target.value })}>
          {DURUMLAR.map((d) => <option key={d} value={d}>{OLAY_DURUM_SOZU[d]}</option>)}
        </select>
      </Alan>

      <Alan etiket="Şiddet">
        <select className="ab-gr" value={v.siddet}
          onChange={(e) => setV({ ...v, siddet: e.target.value })}>
          {SIDDETLER.map((s) => <option key={s} value={s}>{SIDDET_SOZU[s]}</option>)}
        </select>
      </Alan>

      <Alan etiket="Santral">
        <select className="ab-gr" value={v.tesisId}
          onChange={(e) => setV({ ...v, tesisId: e.target.value })}>
          <option value="">santral kaydı yok</option>
          {santraller.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
        </select>
      </Alan>

      <Alan etiket="Tespit kaynağı">
        <select className="ab-gr" value={v.tespitKaynagi}
          onChange={(e) => setV({ ...v, tespitKaynagi: e.target.value })}>
          <option value="">kaydedilmedi</option>
          {TESPIT_KAYNAKLARI.map((t) => <option key={t} value={t}>{TESPIT_SOZU[t]}</option>)}
        </select>
      </Alan>

      <Alan etiket="Özet">
        <textarea className="ab-gr" rows={2} value={v.ozet} style={{ resize: 'vertical' }}
          onChange={(e) => setV({ ...v, ozet: e.target.value })} />
      </Alan>

      <div style={{ display: 'grid', gap: 'var(--s14)',
        borderTop: 'var(--bw-edge) solid var(--hr2)', paddingTop: 'var(--s16)' }}>
        <p className="etiket" style={{ margin: 0 }}>Müdahale ve öğrenme</p>
        <Alan etiket="Kök neden">
          <textarea className="ab-gr" rows={2} value={v.kokNeden} style={{ resize: 'vertical' }}
            onChange={(e) => setV({ ...v, kokNeden: e.target.value })} />
        </Alan>
        <Alan etiket="Sınırlama">
          <textarea className="ab-gr" rows={2} value={v.sinirlama} style={{ resize: 'vertical' }}
            onChange={(e) => setV({ ...v, sinirlama: e.target.value })} />
        </Alan>
        <Alan etiket="Kurtarma">
          <textarea className="ab-gr" rows={2} value={v.kurtarma} style={{ resize: 'vertical' }}
            onChange={(e) => setV({ ...v, kurtarma: e.target.value })} />
        </Alan>
        <Alan etiket="Öğrenilenler">
          <textarea className="ab-gr" rows={2} value={v.ogrenilenler} style={{ resize: 'vertical' }}
            onChange={(e) => setV({ ...v, ogrenilenler: e.target.value })} />
        </Alan>
      </div>

      <div style={{ display: 'grid', gap: 'var(--s14)',
        borderTop: 'var(--bw-edge) solid var(--hr2)', paddingTop: 'var(--s16)' }}>
        <p className="etiket" style={{ margin: 0 }}>Regülasyon bildirimi</p>
        <Alan etiket="Bildirim">
          {/* Boş seçenek "gerekmiyor" DEĞİL, "değerlendirilmedi"dir. */}
          <select className="ab-gr" value={v.bildirimGerekli}
            onChange={(e) => setV({ ...v, bildirimGerekli: e.target.value,
              // Değerlendirilmemişe dönerken tarih de düşer: değerlendirilmemiş
              // bir bildirimin tarihi olamaz.
              bildirimTarihi: e.target.value === '' ? '' : v.bildirimTarihi })}>
            {BILDIRIM.map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
          </select>
        </Alan>
        {v.bildirimGerekli === 'evet' && (
          <Alan etiket="Bildirim tarihi">
            <input className="ab-gr" type="date" value={v.bildirimTarihi}
              onChange={(e) => setV({ ...v, bildirimTarihi: e.target.value })} />
          </Alan>
        )}
        {bildirimNull && (
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Değerlendirilmedi &quot;gerekmiyor&quot; demek değildir; raporlarda ölçülmemiş sayılır.
          </p>
        )}
      </div>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => olayGuncelle({
            id: olay.id,
            baslik: v.baslik,
            tip: v.tip,
            tesisId: v.tesisId || null,
            siddet: v.siddet,
            durum: v.durum,
            ozet: v.ozet || null,
            tespitKaynagi: v.tespitKaynagi || null,
            kokNeden: v.kokNeden || null,
            sinirlama: v.sinirlama || null,
            kurtarma: v.kurtarma || null,
            ogrenilenler: v.ogrenilenler || null,
            // Üç değerli: '' → null (değerlendirilmedi), 'hayir' → false.
            bildirimGerekli: v.bildirimGerekli === '' ? null : v.bildirimGerekli === 'evet',
            bildirimTarihi: v.bildirimTarihi || null,
          }), kapat)}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </Dugme>
        <Dugme tur="ret" onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Durum değişimi ve kök neden/sınırlama/kurtarma/öğrenilenler alanları
        ayrı ayrı denetim izine yazılır. Etki alanları bu formdan
        DEĞİŞTİRİLEMEZ — onlar yönetim onayına bağlıdır.
      </p>
    </div>
  );
}

/* ── zincir bağları ─────────────────────────────────────────────────────
   Bağ eklemek/kaldırmak etki önerisini yeniden ürettirir (varlık ve sistem
   için); etki ALANLARINA dokunmaz. Bağ ekranın değil zincirin gerçeğidir:
   "bağ yok" ile "öneri üretilmedi" ayrı ayrı yazılır. */

export function OlayBaglari({ olay, adaylar, yazilabilir }: {
  olay: OlayKaydi;
  adaylar: Record<BagTipi, BagAdayi[]>;
  yazilabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acikTip, setAcikTip] = useState<BagTipi | null>(null);
  const [hedef, setHedef] = useState('');
  const [rol, setRol] = useState('etkilenen');

  const toplam = bagSayisi(olay);

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Zincir bağları · {toplam}
      </p>

      <div style={{ display: 'grid', gap: 'var(--s14)' }}>
        {BAG_TIPLERI.map((tip) => {
          const mevcut = baglar(olay, tip);
          const bagliIdler = new Set(mevcut.map((b) => b.id));
          const secilebilir = adaylar[tip].filter((a) => !bagliIdler.has(a.id));
          return (
            <div key={tip} style={{ display: 'grid', gap: 'var(--s6)' }}>
              <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {BAG_ETIKET[tip]} · {mevcut.length}
              </span>

              {mevcut.length === 0 ? (
                <span style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  bağ yok
                </span>
              ) : mevcut.map((b) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'baseline',
                  gap: 'var(--s10)', fontSize: 'var(--t-cell)' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>{b.kod}</span>
                  <span style={{ color: 'var(--i3)', minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.alt}</span>
                  {yazilabilir && (
                    <button type="button" className="ab-dugme satir" style={{ marginLeft: 'auto' }}
                      disabled={bekliyor}
                      onClick={() => calistir(() => olayBagKaldir({
                        olayId: olay.id, tip, hedefId: b.id,
                      }))}>
                      Bağı kaldır
                    </button>
                  )}
                </div>
              ))}

              {yazilabilir && acikTip === tip && (
                <div style={{ display: 'grid', gap: 'var(--s10)', marginTop: 'var(--s4)' }}>
                  <Alan etiket={`Bağlanacak ${BAG_ETIKET[tip].toLocaleLowerCase('tr-TR')}`} zorunlu>
                    <select className="ab-gr" value={hedef}
                      onChange={(e) => setHedef(e.target.value)}>
                      <option value="">Seçiniz…</option>
                      {secilebilir.map((a) => (
                        <option key={a.id} value={a.id}>{a.kod} — {a.alt}</option>
                      ))}
                    </select>
                  </Alan>
                  {(tip === 'varlik' || tip === 'sistem') && (
                    <Alan etiket="Rol">
                      <select className="ab-gr" value={rol} onChange={(e) => setRol(e.target.value)}>
                        <option value="etkilenen">Etkilenen</option>
                        <option value="kaynak">Kaynak</option>
                        <option value="telafi_edici">Telafi edici</option>
                      </select>
                    </Alan>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--s10)' }}>
                    <Dugme tur="birincil" disabled={bekliyor || !hedef}
                      onClick={() => calistir(
                        () => olayBagla({ olayId: olay.id, tip, hedefId: hedef, rol }),
                        () => { setAcikTip(null); setHedef(''); },
                      )}>
                      {bekliyor ? 'Bağlanıyor…' : 'Bağla'}
                    </Dugme>
                    <Dugme tur="ret" disabled={bekliyor}
                      onClick={() => { setAcikTip(null); setHedef(''); }}>Vazgeç</Dugme>
                  </div>
                </div>
              )}

              {yazilabilir && acikTip !== tip && (
                <div>
                  <button type="button" className="ab-dugme satir" disabled={secilebilir.length === 0}
                    onClick={() => { setAcikTip(tip); setHedef(''); setRol('etkilenen'); }}>
                    {secilebilir.length === 0
                      ? 'bağlanabilecek kayıt kalmadı'
                      : `${BAG_ETIKET[tip]} bağla`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 'var(--s10) 0 0' }}>{hata}</p>}

      <p className="ab-panel-dip" style={{ margin: 'var(--s14) 0 0' }}>
        {yazilabilir
          ? 'Varlık ve sistem bağı etki önerisini besler; bağ değişince öneri '
            + 'yeniden üretilir. Öneri etki DEĞİLDİR — alanlar yalnız doğrulamayla dolar.'
          : 'Bağ kurmak envanter yazma yetkisi ister; bu olayın kapsamında yetkiniz yok.'}
      </p>
    </div>
  );
}
