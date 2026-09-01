'use client';
import { AZAMI_ANAHTAR_GUN, VARSAYILAN_ANAHTAR_GUN } from '@/lib/apiAnahtariKurallari';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import {
  sektorKaydet, tesisTipiKaydet, tesisKaydet, tesisKapat, tesisAc,
  regulasyonKaydet, regulasyonAktifDegistir, alanKaydet, tanimSil,
} from '@/lib/eylemler';
import { gorevOlustur, gorevDurum, onayKarar } from '@/lib/eylemler2/gorev';
import { apiAnahtariUret, apiAnahtariIptal } from '@/lib/eylemler2/apiAnahtari';
import { GOREV_TIP_ETIKET, etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import {
  GOREV_DURUMLARI, GOREV_DURUM_ETIKET, KATALOG_ETIKET,
  type Anahtar, type Is, type Katalog, type Kisi, type Kodlu, type Tanim,
} from './ortak';

/* Yönetim tezgâhının yazma yüzeyleri — MODAL YOK (06 §B4). Eski iki ekranın
   dokuz <dialog> kipi buraya, 420px çekmecenin içine indi. Mutasyonlar
   lib/eylemler.ts, lib/eylemler2/gorev.ts ve lib/eylemler2/apiAnahtari.ts'ten
   AYNEN çağrılır; imza değiştirilmez, doğrulama ve yetki sunucuda kalır. */

/* ═══ M2 · İş kuyruğu ═══════════════════════════════════════════════════ */

const BOS_GOREV = { baslik: '', tip: 'manuel', sorumluId: '', tesisId: '', sonTarih: '' };

export function GorevFormu({ kullanicilar, tesisler, kapat }: {
  kullanicilar: Kisi[]; tesisler: Kodlu[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState(BOS_GOREV);

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={f.baslik}
          placeholder="Örn. UPS bakım sözleşmesi kanıtı toplansın"
          onChange={(e) => setF({ ...f, baslik: e.target.value })} />
      </Alan>
      <Alan etiket="Tip">
        <select className="ab-gr" value={f.tip}
          onChange={(e) => setF({ ...f, tip: e.target.value })}>
          {Object.entries(GOREV_TIP_ETIKET).map(([t, e]) => (
            <option key={t} value={t}>{e}</option>
          ))}
        </select>
      </Alan>
      <div style={{ display: 'grid', gap: 'var(--s12)',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Alan etiket="Sorumlu">
          <select className="ab-gr" value={f.sorumluId}
            onChange={(e) => setF({ ...f, sorumluId: e.target.value })}>
            <option value="">atanmadı</option>
            {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Son tarih">
          <input className="ab-gr" type="date" value={f.sonTarih}
            onChange={(e) => setF({ ...f, sonTarih: e.target.value })} />
        </Alan>
      </div>
      <Alan etiket="Santral">
        <select className="ab-gr" value={f.tesisId}
          onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
          <option value="">santral bağı yok</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
        </select>
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.baslik.trim()}
          onClick={() => calistir(() => gorevOlustur({
            baslik: f.baslik, tip: f.tip,
            sorumluId: f.sorumluId || null, tesisId: f.tesisId || null,
            sonTarih: f.sonTarih || null,
          }), kapat)}>
          Görevi aç
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Elle açılan görev motor görevlerinden ayrışır. Son tarihi girilmeyen
        görevin gecikmesi ölçülemez — kuyrukta bilinmeyen kalır.
      </p>
    </div>
  );
}

/** Görev yaşam döngüsü. İleri adım çekmecenin birincil eylemidir; diğer
    geçişler ikincil kalır. Yetkisiz kullanıcıda kural ÖNCEDEN söylenir. */
const ILERI: Record<string, string> = {
  acik: 'yapiliyor', yapiliyor: 'tamamlandi', tamamlandi: 'acik', iptal: 'acik',
};

export function GorevDurumEylemleri({ is }: { is: Is }) {
  const { bekliyor, hata, calistir } = useEylem();
  const ileri = ILERI[is.durum];
  const digerleri = GOREV_DURUMLARI.filter((d) => d !== is.durum && d !== ileri);

  if (!is.yetkili) {
    return (
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Bu görevi yalnız sorumlusu ya da uyum onay yetkisi olan değiştirebilir.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      {ileri && (
        <Dugme tur="tam" disabled={bekliyor}
          onClick={() => calistir(() => gorevDurum({ id: is.kayitId, durum: ileri }))}>
          {GOREV_DURUM_ETIKET[ileri]} olarak işaretle
        </Dugme>
      )}
      <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
        {digerleri.map((d) => (
          <Dugme key={d} tur={d === 'iptal' ? 'ret' : 'ikincil'} disabled={bekliyor}
            onClick={() => calistir(() => gorevDurum({ id: is.kayitId, durum: d }))}>
            {GOREV_DURUM_ETIKET[d]}
          </Dugme>
        ))}
      </div>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}

/** Onay kararı — red gerekçesiz verilemez (sunucu da reddeder), bu yüzden
    düğme gerekçe girilene kadar pasif kalır (06 §B7). */
export function OnayKarariFormu({ is }: { is: Is }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');

  if (!is.yetkili) {
    return (
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Karar yetkisi sizde değil: ilgili modülde onay yetkisi gerekir ve
        dört göz ilkesi gereği kendi açtığınız talebi siz karara bağlayamazsınız.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <Alan etiket="Gerekçe · red için zorunlu">
        <textarea className="ab-gr" rows={3} value={gerekce}
          placeholder="Karar neyin üzerine veriliyor?"
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>
      <Dugme tur="tam" disabled={bekliyor}
        onClick={() => calistir(() => onayKarar({
          id: is.kayitId, karar: 'onaylandi', gerekce: gerekce.trim() || null,
        }))}>
        Onayla
      </Dugme>
      <Dugme tur="ret" disabled={bekliyor || !gerekce.trim()}
        onClick={() => calistir(() => onayKarar({
          id: is.kayitId, karar: 'reddedildi', gerekce,
        }))}>
        Reddet
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Karar kaynak kaydı otomatik değiştirmez; uygulama ilgili modülün
        sorumluluğundadır. Her karar denetim izine yazılır.
      </p>
    </div>
  );
}

/* ═══ M1 · Tanım katalogları ════════════════════════════════════════════ */

/** Beş katalog TEK form bileşeninde toplandı: alanlar kataloğa göre açılır,
    kaydetme çağrısı kataloğun kendi eylemine dağıtılır. Böylece eski
    ekrandaki beş ayrı modal tek çekmece yüzeyine indi. */
export function TanimFormu({
  tanim, katalog, kirilimler, sektorler, katalogDegistir, kapat,
}: {
  /** düzenlenen kayıt; null ise yeni tanım */
  tanim: Tanim | null;
  katalog: Katalog;
  kirilimler: Kodlu[];
  sektorler: Kodlu[];
  /** yeni tanımda katalog seçimi çağırana bildirilir */
  katalogDegistir?: (k: Katalog) => void;
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    kod: tanim?.kod ?? '',
    ad: tanim?.ad ?? '',
    tipId: tanim?.tipId ?? '',
    guc: tanim?.guc?.toString() ?? '',
    konum: tanim?.konum ?? '',
    surum: tanim?.surum ?? '',
    kaynakUrl: tanim?.kaynakUrl ?? '',
    aciklama: tanim?.aciklama ?? '',
    sektorId: tanim?.sektorId ?? '',
  });
  const id = tanim?.kayitId;
  const gecerli = !!f.kod.trim() && !!f.ad.trim();

  function kaydet() {
    switch (katalog) {
      case 'tesis':
        return tesisKaydet({
          id, kod: f.kod, ad: f.ad, tipId: f.tipId || null,
          kuruluGucMw: f.guc ? Number(f.guc) : null, konum: f.konum || null,
        });
      case 'regulasyon':
        return regulasyonKaydet({
          id, kod: f.kod, ad: f.ad,
          surum: f.surum || null, kaynakUrl: f.kaynakUrl || null,
        });
      case 'alan':
        return alanKaydet({ id, kod: f.kod, ad: f.ad, aciklama: f.aciklama || null });
      case 'kirilim':
        return tesisTipiKaydet({ id, kod: f.kod, ad: f.ad, sektorId: f.sektorId || null });
      case 'sektor':
        return sektorKaydet({ id, kod: f.kod, ad: f.ad });
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      {katalogDegistir && (
        <Alan etiket="Katalog">
          <select className="ab-gr" value={katalog}
            onChange={(e) => katalogDegistir(e.target.value as Katalog)}>
            {(Object.keys(KATALOG_ETIKET) as Katalog[]).map((k) => (
              <option key={k} value={k}>{KATALOG_ETIKET[k]}</option>
            ))}
          </select>
        </Alan>
      )}

      <Alan etiket="Kod" zorunlu>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.kod}
          placeholder={ORNEK_KOD[katalog]}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="ab-gr" value={f.ad}
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>

      {katalog === 'tesis' && (
        <>
          <Alan etiket="Kırılım">
            <select className="ab-gr" value={f.tipId}
              onChange={(e) => setF({ ...f, tipId: e.target.value })}>
              <option value="">seçilmedi</option>
              {kirilimler.map((t) => (
                <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>
              ))}
            </select>
          </Alan>
          <div style={{ display: 'grid', gap: 'var(--s12)',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Alan etiket="Kurulu güç · MW">
              <input className="ab-gr" type="number" value={f.guc}
                placeholder="bilinmiyor"
                onChange={(e) => setF({ ...f, guc: e.target.value })} />
            </Alan>
            <Alan etiket="Konum">
              <input className="ab-gr" value={f.konum}
                onChange={(e) => setF({ ...f, konum: e.target.value })} />
            </Alan>
          </div>
        </>
      )}

      {katalog === 'regulasyon' && (
        <>
          <Alan etiket="Sürüm">
            <input className="ab-gr" value={f.surum} placeholder="bilinmiyor"
              onChange={(e) => setF({ ...f, surum: e.target.value })} />
          </Alan>
          <Alan etiket="Resmî kaynak · otomatik çekim">
            <input className="ab-gr" value={f.kaynakUrl} placeholder="https://…"
              onChange={(e) => setF({ ...f, kaynakUrl: e.target.value })} />
          </Alan>
        </>
      )}

      {katalog === 'alan' && (
        <Alan etiket="Açıklama">
          <textarea className="ab-gr" rows={2} value={f.aciklama}
            onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
        </Alan>
      )}

      {katalog === 'kirilim' && (
        <Alan etiket="Sektör">
          <select className="ab-gr" value={f.sektorId}
            onChange={(e) => setF({ ...f, sektorId: e.target.value })}>
            <option value="">seçilmedi</option>
            {sektorler.map((s) => <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>)}
          </select>
        </Alan>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(kaydet, kapat)}>Kaydet</Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>{DIP_NOT[katalog]}</p>
    </div>
  );
}

const ORNEK_KOD: Record<Katalog, string> = {
  tesis: 'ADANA-DGKC', regulasyon: 'NIS2', alan: 'OT',
  kirilim: 'JEO', sektor: 'ELEKTRIK-URETIM',
};

const DIP_NOT: Record<Katalog, string> = {
  tesis: 'Yeni santral kaydedilince uygulanabilirlik kuralları hemen değerlendirilir; profil yoksa karar bilinmiyor kalır.',
  regulasyon: 'Yeni uyum yükümlülüğü buradan eklenir; maddeler içe aktarımla gelir.',
  alan: 'Maddeler bu alanlarla eşleştirilir; içe aktarımda eşleşmeyen satır elenir.',
  kirilim: 'Kırılım santralin portföy kesitini belirler — sektörsüz kırılım kesite düşmez.',
  sektor: 'Yeni sektör yeni iş kolu demektir; kırılımlar sektöre bağlanır.',
};

/* ── Katalog durumu ─────────────────────────────────────────────────────
   Kapatma/pasifleştirme/silme tanimlar/onay ister; sunucu da arar. Silme
   bağlı kayıt varken önceden pasifleşir ki kullanıcı hataya çarpmasın. */

const KAPANIS_NEDENLERI = ['satis', 'kapanis', 'birlesme'] as const;

const SIL_TURU: Partial<Record<Katalog, 'sektor' | 'tesisTipi' | 'alan'>> = {
  alan: 'alan', kirilim: 'tesisTipi', sektor: 'sektor',
};

export function TanimEylemleri({ tanim, onaylayabilir }: {
  tanim: Tanim; onaylayabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [kapatmaAcik, setKapatmaAcik] = useState(false);
  const [neden, setNeden] = useState('satis');
  const silTuru = SIL_TURU[tanim.katalog];

  if (!onaylayabilir) {
    return (
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Katalog durumunu değiştirmek tanımlar onay yetkisi gerektiriyor.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      {tanim.katalog === 'tesis' && (tanim.devreDisi ? (
        <Dugme disabled={bekliyor}
          onClick={() => calistir(() => tesisAc({ id: tanim.kayitId }))}>
          Yeniden aç
        </Dugme>
      ) : kapatmaAcik ? (
        <>
          <Alan etiket="Kapanış nedeni" zorunlu>
            <select className="ab-gr" value={neden} onChange={(e) => setNeden(e.target.value)}>
              {KAPANIS_NEDENLERI.map((n) => (
                <option key={n} value={n}>{etiketle(n)}</option>
              ))}
            </select>
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="ret" disabled={bekliyor}
              onClick={() => calistir(() => tesisKapat({ id: tanim.kayitId, neden }),
                () => setKapatmaAcik(false))}>
              Santrali kapat
            </Dugme>
            <Dugme onClick={() => setKapatmaAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Uyum kayıtları tarihçe olarak saklanır; santral aktif süreç kapsamından düşer.
          </p>
        </>
      ) : (
        <Dugme tur="ret" onClick={() => setKapatmaAcik(true)}>Kapat / sat</Dugme>
      ))}

      {tanim.katalog === 'regulasyon' && (
        <Dugme tur={tanim.devreDisi ? 'ikincil' : 'ret'} disabled={bekliyor}
          onClick={() => calistir(() => regulasyonAktifDegistir({
            id: tanim.kayitId, aktif: tanim.devreDisi,
          }))}>
          {tanim.devreDisi ? 'Aktifleştir' : 'Pasifleştir'}
        </Dugme>
      )}

      {silTuru && (
        <>
          <Dugme tur="ret" disabled={bekliyor || tanim.kullanim > 0}
            onClick={() => calistir(() => tanimSil({ tur: silTuru, id: tanim.kayitId }))}>
            Sil
          </Dugme>
          {tanim.kullanim > 0 && (
            <p className="ab-panel-dip" style={{ margin: 0 }}>
              Bağlı kayıt varken silinemez — önce bağları çözün.
            </p>
          )}
        </>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      {tanim.katalog === 'tesis' && tanim.devreDisi && (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          {etiketle(tanim.kapanisNedeni, 'neden girilmedi')} · {tarihTR(tanim.kapanisTarihi)}
        </p>
      )}
    </div>
  );
}

/* ═══ P1-3 · API anahtarları ════════════════════════════════════════════ */

/* TAM TOKEN YALNIZ ÜRETİM YANITINDA BİR KEZ DÖNER.

   Bu bileşen token'ı tek bir yerel `useState`te tutar. Çekmece kapandığında
   ya da kip değiştiğinde bileşen sökülür ve token bellekten gider; hiçbir
   yere kopyalanmaz — localStorage/sessionStorage YOK, URL'de YOK, console'a
   yazılmıyor. Sunucu da yalnız SHA-256 özetini saklar ve denetim izine
   token değil ÖN EK yazar (lib/eylemler2/apiAnahtari.ts). Kaybedilen token
   geri getirilemez: tek çare yenisini üretip eskisini iptal etmektir. */

type Uretilen = { onEk: string; token: string; bitis: string | null };

/** Anahtar sahibi seçilirken bir GÜVENLİK kararı verilir: anahtar kendi
    yetkisini taşımaz, sahibinin yetkilerini taşır. Bu cümle formda yazılı
    durur, çünkü seçim geri alınamaz — sahip değiştirmek yeni anahtar
    üretmek demektir. */
export function ApiAnahtarFormu({ kullanicilar, aktifId, kapat }: {
  kullanicilar: Kisi[]; aktifId: string; kapat: () => void;
}) {
  const router = useRouter();
  const [bekliyor, baslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [f, setF] = useState({ ad: '', kullaniciId: aktifId, gun: '90' });
  const [uretilen, setUretilen] = useState<Uretilen | null>(null);

  if (uretilen) return <TokenTekSefer uretilen={uretilen} kapat={kapat} />;

  const sahip = kullanicilar.find((u) => u.id === f.kullaniciId);

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Anahtar adı" zorunlu>
        <input className="ab-gr" value={f.ad}
          placeholder="Örn. SIEM kanıt çekimi"
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Sahip" zorunlu>
        <select className="ab-gr" value={f.kullaniciId}
          onChange={(e) => setF({ ...f, kullaniciId: e.target.value })}>
          {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
        </select>
      </Alan>
      {/* Süresiz anahtar YOK: boş bırakılan alan sunucuda varsayılan ömre
          (365 gün) düşer, sonsuza değil. Alan metni de bunu söylemeli —
          "boş bırakılırsa süresiz" yazan eski yer tutucu, üreten kişi
          işten ayrıldıktan sonra da geçerli anahtarlar bırakıyordu. */}
      <Alan etiket="Geçerlilik · gün">
        <input className="ab-gr" type="number" min={1} max={AZAMI_ANAHTAR_GUN} value={f.gun}
          placeholder={`boş bırakılırsa ${VARSAYILAN_ANAHTAR_GUN} gün`}
          onChange={(e) => setF({ ...f, gun: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.ad.trim() || !f.kullaniciId}
          onClick={() => {
            setHata(null);
            baslat(async () => {
              const sonuc = await apiAnahtariUret({
                ad: f.ad,
                kullaniciId: f.kullaniciId,
                gecerlilikGun: f.gun ? Number(f.gun) : null,
              });
              if (!sonuc.ok) { setHata(sonuc.hata); return; }
              /* Token yanıttan doğrudan ekrana geçer; router.refresh listeyi
                 tazeler ama sunucu bu token'ı BİR DAHA döndürmez. */
              setUretilen({ onEk: sonuc.onEk, token: sonuc.token, bitis: sonuc.bitis });
              router.refresh();
            });
          }}>
          Anahtarı üret
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Anahtar kendi yetkisini taşımaz: {sahip ? sahip.ad : 'sahibi'} kimin
        verisini görüyorsa anahtar da onu görür, yetkisi daralınca anahtar da
        daralır. Tam token yalnız üretim yanıtında bir kez gösterilir.
      </p>
    </div>
  );
}

/** Token'ın görüldüğü TEK yüzey. Kapanınca bileşenle birlikte gider. */
function TokenTekSefer({ uretilen, kapat }: { uretilen: Uretilen; kapat: () => void }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Tam token · yalnız şimdi">
        <span className="ab-gr" style={{ display: 'block', fontFamily: 'var(--veri)',
          fontSize: 'var(--t-code-lg)', lineHeight: 1.6, wordBreak: 'break-all',
          userSelect: 'all' }}>
          {uretilen.token}
        </span>
      </Alan>
      <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>
        Bu token bir daha gösterilemez. Şimdi kopyalayın.
      </p>
      <Dugme tur="birincil" onClick={kapat}>Kopyaladım, kapat</Dugme>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Veritabanında yalnız SHA-256 özeti duruyor; ekran da denetim izi de
        yalnız {uretilen.onEk}… ön ekini tanıyor.{' '}
        {uretilen.bitis
          ? `Geçerlilik ${tarihTR(uretilen.bitis)} günü biter.`
          : 'Anahtar süresiz — bitiş girilmedi.'}{' '}
        Kaybedilirse geri getirilemez: yenisi üretilir, bu anahtar iptal edilir.
        Kullanım: Authorization: Bearer &lt;token&gt;.
      </p>
    </div>
  );
}

/** İptal geri alınamaz. Sunucu gerekçesiz iptali de kabul eder ama denetim
    izi gerekçesiz bir satırla işe yaramaz; düğme gerekçe girilene kadar
    pasif kalır (06 §B7 kalıbı, OnayKarariFormu ile aynı). */
export function ApiAnahtarIptal({ anahtar, yazabilir }: {
  anahtar: Anahtar; yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');

  if (anahtar.iptalZamani) {
    return (
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {zamanTR(anahtar.iptalZamani)} tarihinde iptal edildi; iptal geri
        alınamaz. Aynı erişim gerekiyorsa yeni anahtar üretilir.
      </p>
    );
  }

  if (!yazabilir) {
    return (
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Anahtar üretmek ve iptal etmek yönetim yazma yetkisi gerektiriyor.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <Alan etiket="Gerekçe" zorunlu>
        <textarea className="ab-gr" rows={2} value={gerekce}
          placeholder="Anahtar neden iptal ediliyor?"
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>
      <Dugme tur="ret" disabled={bekliyor || !gerekce.trim()}
        onClick={() => calistir(() => apiAnahtariIptal({ id: anahtar.id, gerekce }))}>
        Anahtarı iptal et
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        İptal anında geçerlidir: anahtar bundan sonra her istekte 401 döner.
        Gerekçe denetim izine yazılır; token izin hiçbir yerine girmez.
      </p>
    </div>
  );
}
