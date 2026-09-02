'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import {
  yedeklemePolitikasiKaydet, yedeklemeKosusuKaydet, restoreTestiKaydet,
} from '@/lib/eylemler2/operasyon';
import {
  yedegiDogrula, sonBilinenIyiIsaretle, yedekBulgusunuIsle, varlikYedekDurumu,
} from '@/lib/eylemler2/konfigYedek';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import { BULGU_SOZU, bulguDurumu, type EksikVarlik, type Santral, type YedekBulgusu } from './mantik';

/* O14 yazma yüzeyleri.

   MODAL YOK, SNACKBAR YOK (06 §B4): her onay çekmecenin içinde iki adımda
   kapanır. Hiçbir eylem burada TETİKLENMEZ — platform yedek almaz, geri
   yükleme başlatmaz, cihaza bağlanmaz. Kaydedilen şey SONUÇ'tur: dışarıda
   olmuş bir koşunun, yapılmış bir testin, verilmiş bir insan kararının izi.

   Bu ayrım ekranın var oluş sebebidir: "Restore testi kaydet" düğmesi bir
   restore BAŞLATSAYDI, ürün kendi kanıtını üretiyor olurdu ve o kanıt
   denetimde hiçbir şey ifade etmezdi. */

/* ── varlık yedek detayı (tembel yükleme) ─────────────────────────────── */

type Detay = Awaited<ReturnType<typeof varlikYedekDurumu>>;
type DetayVerisi = Extract<Detay, { ok: true }>['veri'];

const UC_DEGER_SOZU: Record<string, string> = {
  var: 'var', yok: 'yok', bilinmiyor: 'ölçülmedi',
};

/** Üç değerli sonucun görsel karşılığı: `yok` kırmızı, `bilinmiyor` GRİ. */
const ucDurum = (s: string) => (s === 'var' ? 'ok' : s === 'yok' ? 'bd' : 'unk');

/**
 * Kritik bir varlığın yedek detayı ve iki insan kararı:
 * okunabilirlik doğrulaması ve "son bilinen iyi" işareti.
 *
 * Detay ÇEKMECE AÇILINCA değil, SATIR AÇILINCA çekilir: 17 santralin her
 * kritik varlığı için bu sorguları peşin koşturmak ekranı bir tarayıcıya
 * çevirirdi.
 */
export function VarlikYedegi({ varlik, kaynakBagli }: {
  varlik: EksikVarlik; kaynakBagli: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [veri, setVeri] = useState<DetayVerisi | null>(null);
  const [okumaHatasi, setOkumaHatasi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [acikYedek, setAcikYedek] = useState<string | null>(null);

  async function ac() {
    setAcik(true);
    if (veri || yukleniyor) return;
    setYukleniyor(true);
    setOkumaHatasi(null);
    const sonuc = await varlikYedekDurumu(varlik.varlikId);
    setYukleniyor(false);
    if (sonuc.ok) setVeri(sonuc.veri);
    else setOkumaHatasi(sonuc.hata);
  }

  /* Kararlardan sonra detay BAYATLADI: yeniden okunur. `router.refresh()`
     sunucu bileşenini tazeler ama bu blok tembel yüklendiği için ona
     dahil değil — kendi verisini kendisi yeniler. */
  async function tazele() {
    const sonuc = await varlikYedekDurumu(varlik.varlikId);
    if (sonuc.ok) setVeri(sonuc.veri);
    setAcikYedek(null);
    setGerekce('');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
      alignItems: 'start', gap: 'var(--s8)' }}>
      <span style={{ paddingTop: 3 }}>
        <Im durum={kaynakBagli && varlik.kayitSayisi > 0 ? 'bd' : 'unk'}
          ad={varlik.kayitSayisi > 0 ? 'Kullanılabilir yedeği yok' : 'Yedek durumu ölçülmedi'} />
      </span>
      <span style={{ minWidth: 0 }}>
        <button type="button" className="ab-dugme satir"
          style={{ display: 'block', textAlign: 'left', fontSize: 'var(--t-field)' }}
          onClick={() => (acik ? setAcik(false) : ac())}>
          {varlik.ad}
        </button>
        <span className="mono" style={{ display: 'block', marginTop: 2,
          fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
          {varlik.etiket} · {varlik.kritiklik} · envanter beyanı &quot;{varlik.beyan}&quot;
        </span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 'var(--t-label)',
          color: 'var(--i2)' }}>
          {varlik.gerekce}
        </span>

        {acik && (
          <div style={{ marginTop: 'var(--s10)', borderLeft: 'var(--bw-edge) solid var(--hr2)',
            paddingLeft: 'var(--s12)', display: 'grid', gap: 'var(--s10)' }}>
            {yukleniyor && (
              <span style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                Yedek kayıtları okunuyor…
              </span>
            )}
            {okumaHatasi && <p className="ab-gr-hata" style={{ margin: 0 }}>{okumaHatasi}</p>}

            {veri && (
              <>
                <p style={{ margin: 0, fontSize: 'var(--t-label)', color: 'var(--i2)' }}>
                  Yedek: <b style={{ color: `var(--${ucDurum(veri.varlik.sonuc)})` }}>
                    {UC_DEGER_SOZU[veri.varlik.sonuc]}</b> · son bilinen iyi:{' '}
                  <b style={{ color: `var(--${ucDurum(veri.iyi.sonuc)})` }}>
                    {UC_DEGER_SOZU[veri.iyi.sonuc]}</b> · konfigürasyon değişimi:{' '}
                  <b style={{ color: `var(--${ucDurum(veri.degisim.sonuc)})` }}>
                    {UC_DEGER_SOZU[veri.degisim.sonuc]}</b>
                </p>
                <p className="ab-panel-dip" style={{ margin: 0 }}>{veri.iyi.gerekce}</p>

                {veri.kayitlar.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 'var(--t-label)', color: 'var(--unk)' }}>
                    Hiç yedek kaydı yok — bu &quot;yedek alınmıyor&quot; değil,
                    &quot;ölçülmedi&quot; demektir.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--s8)' }}>
                    {veri.kayitlar.map((y) => (
                      <div key={y.id} style={{ display: 'grid', gap: 'var(--s4)' }}>
                        <span style={{ display: 'flex', alignItems: 'baseline',
                          gap: 'var(--s8)', fontSize: 'var(--t-label)' }}>
                          <Im durum={y.basarili ? (y.dogrulandi ? 'ok' : 'unk') : 'bd'}
                            ad={!y.basarili ? 'Başarısız yedek'
                              : y.dogrulandi ? 'Okunabilirliği doğrulanmış'
                                : 'Okunabilirliği doğrulanmamış'} />
                          <span className="mono">{tarihTR(y.yedekZamani)}</span>
                          <span style={{ color: 'var(--i3)' }}>
                            {y.surum ?? 'sürümsüz'} · {y.kaynakSistem}
                            {y.sonBilinenIyi ? ' · son bilinen iyi' : ''}
                          </span>
                        </span>
                        {y.hata && (
                          <span style={{ fontSize: 'var(--t-label)', color: 'var(--bd)' }}>
                            {y.hata}
                          </span>
                        )}
                        {veri.yazabilir && acikYedek !== y.id && (
                          <span style={{ display: 'flex', gap: 'var(--s10)' }}>
                            <button type="button" className="ab-dugme satir" disabled={bekliyor}
                              onClick={() => { setAcikYedek(y.id); setGerekce(''); }}>
                              {y.dogrulandi ? 'Doğrulamayı kaldır' : 'Okunabilirliği doğrula'}
                            </button>
                            {!y.sonBilinenIyi && y.basarili && (
                              <button type="button" className="ab-dugme satir" disabled={bekliyor}
                                onClick={() => calistir(
                                  () => sonBilinenIyiIsaretle({ yedekId: y.id }), tazele)}>
                                Son bilinen iyi işaretle
                              </button>
                            )}
                          </span>
                        )}
                        {veri.yazabilir && acikYedek === y.id && (
                          <div style={{ display: 'grid', gap: 'var(--s8)' }}>
                            <Alan etiket="Gerekçe">
                              <textarea className="ab-gr" rows={2} value={gerekce}
                                placeholder="Yedek nasıl açıldı, ne gözlendi?"
                                onChange={(e) => setGerekce(e.target.value)} />
                            </Alan>
                            <span style={{ display: 'flex', gap: 'var(--s10)' }}>
                              <Dugme tur="birincil" disabled={bekliyor}
                                onClick={() => calistir(() => yedegiDogrula({
                                  yedekId: y.id,
                                  dogrulandi: !y.dogrulandi,
                                  gerekce: gerekce || null,
                                }), tazele)}>
                                {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
                              </Dugme>
                              <Dugme tur="ret" disabled={bekliyor}
                                onClick={() => setAcikYedek(null)}>Vazgeç</Dugme>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {veri.kontroller.length > 0 && (
                  <div style={{ display: 'grid', gap: 'var(--s6)' }}>
                    <span className="mono" style={{ fontSize: 'var(--t-label)',
                      color: 'var(--i3)' }}>Uyum bağı · ÖNERİ</span>
                    {veri.kontroller.map((c) => (
                      <span key={c.maddeKodu} style={{ fontSize: 'var(--t-label)',
                        color: 'var(--i2)' }}>
                        <b className="mono">{c.maddeKodu}</b> · {c.katki === 'destekler' ? 'destekler'
                          : c.katki === 'zayiflatir' ? 'zayıflatır' : 'kanıt yok'} — {c.oneri}
                      </span>
                    ))}
                    <span className="ab-panel-dip">
                      Bu bağ madde durumuna KENDİLİĞİNDEN yazılmaz; kanıt olarak
                      bağlanması ayrı bir insan onayı ister.
                    </span>
                  </div>
                )}
              </>
            )}
            {hata && <p className="ab-gr-hata" style={{ margin: 0 }}>{hata}</p>}
          </div>
        )}
      </span>
    </div>
  );
}

/* ── veri kalitesi bulgusu ────────────────────────────────────────────── */

/** Motor bulguyu kapatamaz; koşul düzelirse kendisi 'cozuldu' yapar.
    "Yok sayma" kararı insanındır ve GEREKÇESİZ VERİLEMEZ. */
export function BulguIsle({ bulgu, yetkili }: { bulgu: YedekBulgusu; yetkili: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [karar, setKarar] = useState<'cozuldu' | 'yok_sayildi' | null>(null);
  const [gerekce, setGerekce] = useState('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
      alignItems: 'start', gap: 'var(--s8)' }}>
      <span style={{ paddingTop: 3 }}>
        <Im durum={bulguDurumu(bulgu.kural)} ad={BULGU_SOZU[bulgu.kural] ?? bulgu.kural} />
      </span>
      <span style={{ minWidth: 0, display: 'grid', gap: 'var(--s4)' }}>
        <span style={{ fontSize: 'var(--t-field)' }}>
          {BULGU_SOZU[bulgu.kural] ?? bulgu.kural}
        </span>
        <span style={{ fontSize: 'var(--t-label)', color: 'var(--i2)' }}>{bulgu.aciklama}</span>
        <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
          {zamanTR(bulgu.olusturuldu)} tarihinde motor tarafından açıldı
        </span>

        {!yetkili ? (
          <span className="ab-panel-dip">
            Bulguyu işlemek yönetim yazma yetkisi ister.
          </span>
        ) : karar === null ? (
          <span style={{ display: 'flex', gap: 'var(--s10)', marginTop: 'var(--s4)' }}>
            <button type="button" className="ab-dugme satir"
              onClick={() => { setKarar('cozuldu'); setGerekce(''); }}>Çözüldü işaretle</button>
            <button type="button" className="ab-dugme satir"
              onClick={() => { setKarar('yok_sayildi'); setGerekce(''); }}>Yok say</button>
          </span>
        ) : (
          <span style={{ display: 'grid', gap: 'var(--s8)', marginTop: 'var(--s4)' }}>
            <Alan etiket="Gerekçe" zorunlu hata={hata}>
              <textarea className="ab-gr" rows={2} value={gerekce}
                placeholder={karar === 'yok_sayildi'
                  ? 'Neden yok sayılıyor? Gerekçesiz susturma denetimde savunulamaz.'
                  : 'Hangi kanıtla çözüldü sayılıyor?'}
                onChange={(e) => setGerekce(e.target.value)} />
            </Alan>
            <span style={{ display: 'flex', gap: 'var(--s10)' }}>
              <Dugme tur="birincil" disabled={bekliyor || !gerekce.trim()}
                onClick={() => calistir(
                  () => yedekBulgusunuIsle({ bulguId: bulgu.id, karar, gerekce }),
                  () => { setKarar(null); setGerekce(''); },
                )}>
                {bekliyor ? 'Kaydediliyor…' : karar === 'cozuldu' ? 'Çözüldü' : 'Yok say'}
              </Dugme>
              <Dugme tur="ret" disabled={bekliyor} onClick={() => setKarar(null)}>Vazgeç</Dugme>
            </span>
          </span>
        )}
      </span>
    </div>
  );
}

/* ── politika ─────────────────────────────────────────────────────────── */

const SIKLIKLAR = ['gunluk', 'haftalik', 'aylik', 'degisiklik_sonrasi'];
const HEDEFLER = ['yerel', 'uzak', 'immutable'];

/** Politika kaydı. RPO/RTO ve kapsam dışı liste bu formda YOKTUR:
    `yedeklemePolitikasiKaydet` o alanları imzasında taşımıyor ve imzayı
    ekran değiştiremez (bkz. rapor). Yarım bir form, olmayan bir alanı
    "girilmedi" gibi göstermekten iyidir. */
export function PolitikaFormu({ santral, kapat }: { santral: Santral; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const p = santral.politika;
  const [v, setV] = useState({
    // Politika ↔ santral bağı ADLA kuruluyor (bkz. page.tsx notu); yeni
    // kayıt santral adıyla başlamazsa hiçbir santrale bağlanmaz.
    ad: p?.ad ?? `${santral.ad} — kontrol sistemi yedeklemesi`,
    kapsam: p?.kapsam ?? '',
    siklik: p?.siklik ?? '',
    saklamaGun: p?.saklamaGun != null ? String(p.saklamaGun) : '',
    hedef: p?.hedef ?? '',
  });

  const adUyari = !v.ad.startsWith(santral.ad);

  return (
    <div style={{ display: 'grid', gap: 'var(--s14)' }}>
      <Alan etiket="Politika adı" zorunlu>
        <input className="ab-gr" value={v.ad} onChange={(e) => setV({ ...v, ad: e.target.value })} />
      </Alan>
      {adUyari && (
        <p style={{ margin: 0, fontSize: 'var(--t-label)', color: 'var(--md)' }}>
          Ad &quot;{santral.ad}&quot; ile başlamıyor — kayıt bu santrale bağlanmaz.
        </p>
      )}
      <Alan etiket="Kapsam">
        <input className="ab-gr" value={v.kapsam} placeholder="PLC/DCS konfigürasyonları, tarihçe sunucusu"
          onChange={(e) => setV({ ...v, kapsam: e.target.value })} />
      </Alan>
      <Alan etiket="Sıklık">
        <select className="ab-gr" value={v.siklik} onChange={(e) => setV({ ...v, siklik: e.target.value })}>
          <option value="">girilmedi</option>
          {SIKLIKLAR.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </Alan>
      <Alan etiket="Saklama (gün)">
        <input className="ab-gr" type="number" min={1} value={v.saklamaGun}
          onChange={(e) => setV({ ...v, saklamaGun: e.target.value })} />
      </Alan>
      <Alan etiket="Hedef">
        <select className="ab-gr" value={v.hedef} onChange={(e) => setV({ ...v, hedef: e.target.value })}>
          <option value="">girilmedi</option>
          {HEDEFLER.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !v.ad.trim()}
          onClick={() => calistir(() => yedeklemePolitikasiKaydet({
            id: p?.id,
            ad: v.ad,
            kapsam: v.kapsam || null,
            siklik: v.siklik || null,
            saklamaGun: v.saklamaGun ? Number(v.saklamaGun) : null,
            hedef: v.hedef || null,
          }), kapat)}>
          {bekliyor ? 'Kaydediliyor…' : p ? 'Kaydet' : 'Politikayı oluştur'}
        </Dugme>
        <Dugme tur="ret" onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Politika kaydı bir yedekleme İŞİ başlatmaz; platform yedek almaz.
        Kayıt yalnız &quot;bu santral için neyi, ne sıklıkta, ne kadar
        saklamayı taahhüt ettik&quot; sorusunu cevaplar.
      </p>
    </div>
  );
}

/* ── koşu ve restore testi sonucu ─────────────────────────────────────── */

export function KosuKaydet({ santral }: { santral: Santral }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [v, setV] = useState({ durum: 'basarili', boyutMb: '', hata: '' });
  const p = santral.politika;
  if (!p) return null;

  if (!acik) {
    return <Dugme onClick={() => setAcik(true)}>Koşu sonucu kaydet</Dugme>;
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--s10)' }}>
      <Alan etiket="Koşu sonucu" zorunlu>
        <select className="ab-gr" value={v.durum} onChange={(e) => setV({ ...v, durum: e.target.value })}>
          <option value="basarili">Başarılı</option>
          <option value="kismi">Kısmi</option>
          <option value="basarisiz">Başarısız</option>
        </select>
      </Alan>
      <Alan etiket="Boyut (MB)">
        <input className="ab-gr" type="number" min={0} value={v.boyutMb}
          onChange={(e) => setV({ ...v, boyutMb: e.target.value })} />
      </Alan>
      {v.durum !== 'basarili' && (
        <Alan etiket="Hata">
          <input className="ab-gr" value={v.hata} onChange={(e) => setV({ ...v, hata: e.target.value })} />
        </Alan>
      )}
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor}
          onClick={() => calistir(() => yedeklemeKosusuKaydet({
            politikaId: p.id,
            durum: v.durum,
            boyutMb: v.boyutMb ? Number(v.boyutMb) : null,
            hata: v.hata || null,
          }), () => { setAcik(false); setV({ durum: 'basarili', boyutMb: '', hata: '' }); })}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </Dugme>
        <Dugme tur="ret" onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Dışarıda koşmuş bir yedeklemenin SONUCU kaydedilir; bu düğme yedek almaz.
      </p>
    </div>
  );
}

export function RestoreTestiKaydet({ santral }: { santral: Santral }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [v, setV] = useState({ sonuc: 'basarili', sureDk: '', not: '' });

  /* Test kaydı bir KOŞUYA asılır (şema: GeriYuklemeTesti.kosuId). Koşu yoksa
     testin bağlanacağı bir kanıt da yoktur; "test var ama neyin testi
     bilinmiyor" kaydı üretmektense yüzeyi kapatıp sebebini yazıyoruz. */
  if (!santral.sonKosuId) {
    return (
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Restore testi bir yedekleme koşusuna bağlanır; bu santralde kayıtlı koşu
        yok. Önce koşu sonucu kaydedin.
      </p>
    );
  }

  if (!acik) {
    return <Dugme tur="tam" onClick={() => setAcik(true)}>Restore testi sonucu kaydet</Dugme>;
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--s10)' }}>
      <Alan etiket="Test sonucu" zorunlu>
        <select className="ab-gr" value={v.sonuc} onChange={(e) => setV({ ...v, sonuc: e.target.value })}>
          <option value="basarili">Başarılı</option>
          <option value="basarisiz">Başarısız</option>
        </select>
      </Alan>
      <Alan etiket="Süre (dk)">
        <input className="ab-gr" type="number" min={0} value={v.sureDk}
          onChange={(e) => setV({ ...v, sureDk: e.target.value })} />
      </Alan>
      <Alan etiket="Not">
        <textarea className="ab-gr" rows={2} value={v.not} style={{ resize: 'vertical' }}
          placeholder="Ne geri yüklendi, hangi sistemde doğrulandı?"
          onChange={(e) => setV({ ...v, not: e.target.value })} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor}
          onClick={() => calistir(() => restoreTestiKaydet({
            kosuId: santral.sonKosuId as string,
            sonuc: v.sonuc,
            sureDk: v.sureDk ? Number(v.sureDk) : null,
            not: v.not || null,
          }), () => { setAcik(false); setV({ sonuc: 'basarili', sureDk: '', not: '' }); })}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </Dugme>
        <Dugme tur="ret" onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kayıt son koşuya asılır ve denetim izine düşer. Platform geri yükleme
        BAŞLATMAZ — testi saha yapar, sonucunu burası taşır.
      </p>
    </div>
  );
}
