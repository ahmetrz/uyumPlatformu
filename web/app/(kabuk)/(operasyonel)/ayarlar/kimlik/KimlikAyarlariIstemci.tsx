'use client';
import { useState } from 'react';
import { useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { Alan, BosIlk, Dugme, Im } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import {
  kimlikSaglayiciAktiflik, kimlikSaglayiciBagla, kimlikSaglayiciKaydet,
  oturumPolitikasiKaydet,
} from '@/lib/eylemler2/kimlikSaglayici';
import {
  HAL_SINIFI, HAL_SOZU, kimlikCumlesi, mfaCumlesi, saglayiciHali,
  type KimlikVerisi, type SaglayiciOzeti,
} from './mantik';

/* P6 · KİMLİK VE OTURUM EKRANI

   ── ÜÇ SANİYE ─────────────────────────────────────────────────────────
   "Kurum hesabıyla giriş açık mı, değilse NEYİ eksik." Eksik listesi bir
   uyarı balonunda değil SATIRDA durur: yöneticinin ilk sorusu odur.

   ── SIR ALANI BİR METİN KUTUSU DEĞİL, BİR ADRES KUTUSU ────────────────
   Form istemci sırrının DEĞERİNİ istemez ve alamaz: alan bir referans
   ister (`env:AD` · `dosya:/yol#alan` · `vault:yol#alan`) ve etiketi de
   bunu söyler. Değeri buraya yapıştıran bir yönetici, sunucu kapısında
   "biçim geçersiz" cevabını alır — çünkü sır değerleri iki nokta üst
   üste ile başlamaz.

   ── ÜÇ AŞAMA AYRI DÜĞMEDİR ────────────────────────────────────────────
   Kaydet → Bağla → Aktif et. Tek düğmeye indirmek, üç ayrı kararı tek
   tıkla vermek olurdu; üçünün de ayrı denetim izi satırı var. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Issuer', genislik: '260px', ikincil: true },
  { baslik: 'Durum', genislik: '250px' },
  { baslik: 'Bağlı kullanıcı', genislik: '120px', sag: true },
];

export default function KimlikAyarlariIstemci({ veri, yazabilir }: {
  veri: KimlikVerisi; yazabilir: boolean;
}) {
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [yeniAcik, setYeniAcik] = useState(false);

  const secili = veri.saglayicilar.find((s) => s.id === seciliId) ?? null;
  const mfa = mfaCumlesi(veri);

  const satirlar: Satir[] = veri.saglayicilar.map((s): Satir => {
    const hal = saglayiciHali(s);
    return {
      id: s.id,
      durum: HAL_SINIFI[hal],
      konu: <span className="mono">{s.ad}</span>,
      alt: s.jitAcik ? 'Otomatik hesap açma AÇIK' : 'Otomatik hesap açma kapalı',
      hucreler: [
        <span key="i" className={s.issuer ? undefined : 'd-unk'}>
          {s.issuer ?? 'tanımsız'}
        </span>,
        <span key="d" className={`d-${HAL_SINIFI[hal]}`}>{HAL_SOZU[hal]}</span>,
        <span key="b">{s.bagSayisi}</span>,
      ],
    };
  });

  return (
    <>
      <main className="ab-canvas">
        <EkranBasligi
          eyebrow="Kimlik ve oturum"
          baslik="kurum hesabıyla giriş"
          vurgu={String(veri.saglayicilar.filter((s) => s.aktif).length)}
          vurguDurumu={veri.saglayicilar.some((s) => s.aktif) ? 'ok' : 'md'}
          metrikler={[
            { deger: veri.saglayicilar.length, yazi: 'Sağlayıcı' },
            { deger: veri.politika.mutlakSaat, yazi: 'Oturum (saat)',
              durum: veri.politikaKayitli ? undefined : 'unk' },
            { deger: veri.mfaKurulu, payda: veri.kullaniciSayisi, yazi: 'MFA kurulu',
              durum: mfa.durum },
          ]}
        />

        <section className="ab-modul">
          <p className="ikincil" style={{ margin: '0 0 var(--s16)' }}>
            {kimlikCumlesi(veri)}
          </p>

          {veri.saglayicilar.length === 0 ? (
            <BosIlk
              cumle={'Kurum kimlik sağlayıcısı tanımlı değil. Giriş yalnız yerel'
                + ' hesapla yapılır; bu bir kusur değil, kurulumun mevcut hâlidir.'}
              eylem={yazabilir
                ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Sağlayıcı tanımla</Dugme>
                : undefined}
            />
          ) : (
            <>
              <Tablo
                etiket="Kimlik sağlayıcıları"
                konuBasligi="Sağlayıcı"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={seciliId}
                sec={(id) => setSeciliId(id === seciliId ? null : id)}
                dipNot={'İstemci sırrının DEĞERİ hiçbir ekranda görünmez —'
                  + ' yalnız sırra giden adres.'}
              />
              {yazabilir && (
                <div style={{ marginTop: 'var(--s16)' }}>
                  <Dugme onClick={() => setYeniAcik(true)}>Yeni sağlayıcı tanımla</Dugme>
                </div>
              )}
            </>
          )}
        </section>

        <MfaBlogu veri={veri} cumle={mfa.cumle} durum={mfa.durum} />
        <PolitikaBlogu veri={veri} yazabilir={yazabilir} />
      </main>

      {yeniAcik && (
        <Cekmece kod="YENİ" etiket="Kimlik sağlayıcı" kapat={() => setYeniAcik(false)}>
          <SaglayiciFormu kapat={() => setYeniAcik(false)} />
        </Cekmece>
      )}

      {secili && !yeniAcik && (
        <Cekmece kod={secili.ad} etiket="Kimlik sağlayıcı" kapat={() => setSeciliId(null)}>
          <SaglayiciCekmecesi s={secili} yazabilir={yazabilir} />
        </Cekmece>
      )}
    </>
  );
}

function MfaBlogu({ veri, cumle, durum }: {
  veri: KimlikVerisi; cumle: string; durum: 'ok' | 'md' | 'bd' | 'pl' | 'unk' | 'tamam';
}) {
  return (
    <section className="ab-modul" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Çok adımlı doğrulama (TOTP)
      </p>
      <p className={`ikincil d-${durum}`} style={{ margin: '0 0 var(--s10)' }}>
        <Im durum={durum} ad="MFA durumu" /> {cumle}
      </p>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {/* SINIR EKRANDA YAZILI: kurum hesabında ikinci faktör IdP'nin
            işidir ve ürün onu tekrar etmez. */}
        Kurum hesabıyla girenlerde ikinci faktör kimlik sağlayıcıda uygulanır;
        ürün bilmediği bir kararı tekrar etmez. Kullanıcılar kendi kayıtlarını
        Ayarlar ekranından kurar. TOTP sırrı veritabanında ŞİFRELİ durur ve
        şifreleme anahtarı veritabanında YOKTUR.
        {veri.mfaAnahtariVar ? ` ${veri.mfaAnahtarNotu}` : ''}
      </p>
    </section>
  );
}

function PolitikaBlogu({ veri, yazabilir }: { veri: KimlikVerisi; yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [v, setV] = useState(veri.politika);

  return (
    <section className="ab-modul" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Oturum politikası</p>
      <p className={`ikincil${veri.politikaKayitli ? '' : ' d-unk'}`}
        style={{ margin: '0 0 var(--s10)' }}>
        {veri.politikaKayitli
          ? `Mutlak ${veri.politika.mutlakSaat} saat · atıl ${veri.politika.atilDakika} dakika`
            + ` · MFA ${veri.politika.mfaZorunlu ? 'ZORUNLU' : 'isteğe bağlı'}`
          /* KAYIT YOK ≠ SIFIR: varsayılan uygulanıyor ve bu AÇIKÇA yazılır. */
          : `Kayıt yok — VARSAYILAN uygulanıyor: mutlak ${veri.politika.mutlakSaat} saat`
            + ` · atıl ${veri.politika.atilDakika} dakika · MFA isteğe bağlı`}
      </p>

      {!yazabilir ? (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Politikayı değiştirmek yönetim onay yetkisi ister.
        </p>
      ) : !acik ? (
        <Dugme onClick={() => setAcik(true)}>Politikayı düzenle</Dugme>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s12)', maxWidth: 420 }}>
          <Alan etiket="Mutlak oturum süresi (saat)">
            <input className="ab-girdi" type="number" min={1} max={24} value={v.mutlakSaat}
              onChange={(e) => setV({ ...v, mutlakSaat: Number(e.target.value) })} />
          </Alan>
          <Alan etiket="Atıl süre (dakika)">
            <input className="ab-girdi" type="number" min={15} max={720} value={v.atilDakika}
              onChange={(e) => setV({ ...v, atilDakika: Number(e.target.value) })} />
          </Alan>
          <label style={{ display: 'flex', gap: 'var(--s8)', alignItems: 'center' }}>
            <input type="checkbox" checked={v.mfaZorunlu}
              onChange={(e) => setV({ ...v, mfaZorunlu: e.target.checked })} />
            <span className="ikincil">
              MFA zorunlu — TOTP kaydı olmayan YEREL hesap giriş yapamaz
            </span>
          </label>
          <CekmeceEylemler
            birincil={
              <Dugme tur="birincil" disabled={bekliyor}
                onClick={() => calistir(async () => {
                  const r = await oturumPolitikasiKaydet(v);
                  if (r.ok) setAcik(false);
                  return r;
                })}>
                {bekliyor ? 'İşleniyor…' : 'Politikayı kaydet'}
              </Dugme>
            }
            ikincil={<Dugme disabled={bekliyor} onClick={() => setAcik(false)}>Vazgeç</Dugme>}
            dipNot={hata ?? 'Atıl süre mutlak süreden büyük olamaz; tavan 24 saat.'}
          />
        </div>
      )}
    </section>
  );
}

function SaglayiciCekmecesi({ s, yazabilir }: { s: SaglayiciOzeti; yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [duzenle, setDuzenle] = useState(false);
  const hal = saglayiciHali(s);

  if (duzenle) {
    return <SaglayiciFormu mevcut={s} kapat={() => setDuzenle(false)} />;
  }

  return (
    <>
      <CekmeceKimlik
        durum={HAL_SINIFI[hal]}
        soz={HAL_SOZU[hal]}
        baslik={s.ad}
        cumle={s.eksikler.length > 0
          ? `Eksik: ${s.eksikler.join(', ')}. Bağlanmamış bir sağlayıcı giriş`
            + ' ekranında görünmez ve bu bir kusur değil, ürünün kuralıdır.'
          : undefined}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Issuer', deger: s.issuer ?? 'tanımsız', durum: s.issuer ? undefined : 'unk' },
        { etiket: 'İstemci kimliği', deger: s.clientId ?? 'tanımsız',
          durum: s.clientId ? undefined : 'unk' },
        /* SIRRA GİDEN ADRES — sırrın kendisi hiçbir ekranda görünmez. */
        { etiket: 'İstemci sırrı (adres)', deger: <span className="mono">{s.sirMaskeli}</span>,
          durum: s.sirMaskeli === 'tanımsız' ? 'unk' : undefined },
        { etiket: 'Yönlendirme adresi', deger: s.yonlendirmeUri ?? 'tanımsız',
          durum: s.yonlendirmeUri ? undefined : 'unk' },
        { etiket: 'Rol iddiası', deger: s.rolIddiasi ?? 'yok — rol eşlemesi yapılmaz',
          durum: s.rolIddiasi ? undefined : 'unk' },
        {
          etiket: 'Otomatik hesap açma',
          deger: s.jitAcik
            ? 'AÇIK — tanınmayan kimlik için hesap açılır (YETKİSİZ doğar)'
            : 'Kapalı — tanınmayan kimlik REDDEDİLİR, hesap açılmaz',
          durum: s.jitAcik ? 'md' : undefined,
        },
      ]} />

      {!yazabilir ? (
        <CekmeceEylemler dipNot="Kimlik yapılandırması yönetim onay yetkisi ister." />
      ) : (
        <CekmeceEylemler
          birincil={s.bagli
            ? (
              <Dugme tur={s.aktif ? 'ikincil' : 'birincil'} disabled={bekliyor}
                onClick={() => calistir(() => kimlikSaglayiciAktiflik({ id: s.id, aktif: !s.aktif }))}>
                {s.aktif ? 'Giriş ekranından kaldır' : 'Giriş ekranında göster'}
              </Dugme>
            )
            : (
              <Dugme tur="birincil" disabled={bekliyor || s.eksikler.length > 0}
                onClick={() => calistir(() => kimlikSaglayiciBagla({ id: s.id, bagli: true }))}>
                Bağla
              </Dugme>
            )}
          ikincil={
            <Dugme disabled={bekliyor} onClick={() => setDuzenle(true)}>Yapılandırmayı düzenle</Dugme>
          }
          dipNot={hata ?? (s.bagli
            ? 'Yapılandırma değişirse bağ ve aktiflik DÜŞER — yeniden bağlanmalı.'
            : 'Bağlamak ağ çağrısı yapmaz; yapılandırmanın bütünlüğünü ölçer.')}
        />
      )}
    </>
  );
}

function SaglayiciFormu({ mevcut, kapat }: { mevcut?: SaglayiciOzeti; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    ad: mevcut?.ad ?? '',
    issuer: mevcut?.issuer ?? '',
    clientId: mevcut?.clientId ?? '',
    istemciSirriReferansi: '',
    yetkilendirmeUcu: mevcut?.yetkilendirmeUcu ?? '',
    jetonUcu: mevcut?.jetonUcu ?? '',
    jwksUcu: mevcut?.jwksUcu ?? '',
    yonlendirmeUri: mevcut?.yonlendirmeUri ?? '',
    rolIddiasi: mevcut?.rolIddiasi ?? '',
    rolEslemesiJson: mevcut?.rolEslemesiJson ?? '',
    jitAcik: mevcut?.jitAcik ?? false,
  });

  const alan = (
    ad: keyof typeof v, etiket: string, ipucu?: string, tip: 'text' | 'url' = 'text',
  ) => (
    <Alan etiket={etiket}>
      <input className="ab-girdi" type={tip} value={String(v[ad])} disabled={bekliyor}
        onChange={(e) => setV({ ...v, [ad]: e.target.value })} />
      {ipucu && <span className="ab-panel-dip">{ipucu}</span>}
    </Alan>
  );

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p className="ikincil" style={{ margin: 0 }}>
        Uçlar ELLE girilir: keşif belgesini çekmek bir ağ çağrısıdır ve
        yapılandırma anında yapılmaz.
      </p>
      {alan('ad', 'Sağlayıcı adı')}
      {alan('issuer', 'Issuer', 'Jetondaki `iss` iddiasıyla BİREBİR aynı olmalı')}
      {alan('clientId', 'İstemci kimliği (client_id)')}
      {/* SIR DEĞERİ DEĞİL, ADRESİ. */}
      {alan('istemciSirriReferansi', 'İstemci sırrı ADRESİ',
        'Sırrın DEĞERİ değil adresi: env:AD · dosya:/yol#alan · vault:yol#alan.'
        + ' Değer bu ürünün veritabanına hiç girmez.')}
      {alan('yetkilendirmeUcu', 'Yetkilendirme ucu', undefined, 'url')}
      {alan('jetonUcu', 'Jeton ucu', undefined, 'url')}
      {alan('jwksUcu', 'JWKS ucu', undefined, 'url')}
      {alan('yonlendirmeUri', 'Yönlendirme adresi',
        'IdP tarafında da kayıtlı olmalı; yolu /kimlik/geri', 'url')}
      {alan('rolIddiasi', 'Rol iddiası', 'Örn. groups — boşsa rol eşlemesi yapılmaz')}
      <Alan etiket="Rol eşlemesi (JSON)">
        <textarea className="ab-girdi" rows={3} value={v.rolEslemesiJson} disabled={bekliyor}
          onChange={(e) => setV({ ...v, rolEslemesiJson: e.target.value })} />
        <span className="ab-panel-dip">
          {'{ "<IdP grubu>": "<ürün rolü>" } — eşlemesi olmayan grup ekranda adıyla görünür.'}
        </span>
      </Alan>
      <label style={{ display: 'flex', gap: 'var(--s8)', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={v.jitAcik} disabled={bekliyor}
          onChange={(e) => setV({ ...v, jitAcik: e.target.checked })} />
        <span className="ikincil">
          Otomatik hesap açma (JIT). KAPALI önerilir: tanınmayan bir kimlik
          reddedilir ve hesap açılmaz. Açıksa bile açılan hesap YETKİSİZ doğar.
        </span>
      </label>

      <CekmeceEylemler
        birincil={
          <Dugme tur="birincil" disabled={bekliyor}
            onClick={() => calistir(async () => {
              const r = await kimlikSaglayiciKaydet({ ...v, id: mevcut?.id ?? null });
              if (r.ok) kapat();
              return r;
            })}>
            {bekliyor ? 'İşleniyor…' : 'Kaydet'}
          </Dugme>
        }
        ikincil={<Dugme disabled={bekliyor} onClick={kapat}>Vazgeç</Dugme>}
        dipNot={hata ?? 'Kayıt BAĞLI DEĞİL doğar; bağlamak ayrı bir karardır.'}
      />
    </div>
  );
}
