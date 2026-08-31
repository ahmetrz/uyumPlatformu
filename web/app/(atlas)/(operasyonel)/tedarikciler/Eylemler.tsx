'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/atlas/temel';
import { CekmeceEylemler } from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { tedarikciKaydet, sertifikaKaydet } from '@/lib/eylemler2/operasyon';
import { oturumKarariKaydet } from '@/lib/eylemler2/tedarikciOturum';
import { tarihTR } from '@/lib/sabitler';
import { UFUK, type OturumSatiri, type SertifikaOzeti, type T } from './ortak';

/* O16 yazma yüzeyleri. MODAL YOK (06 §B4), SNACKBAR YOK: onay iki adımlı ve
   çekmecenin içinde kalır. İki mutasyon da lib/eylemler2/operasyon.ts'ten
   AYNEN çağrılır — imza değiştirilmez, yeni server action yazılmaz. */

const GUN = 86_400_000;

/** ISO tarihten <input type="date"> değeri. */
const girdiTarihi = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** Yenileme önerisi: mevcut bitişin bir yıl sonrası. */
const biryilSonra = (iso: string) =>
  new Date(new Date(iso).getTime() + 365 * GUN).toISOString().slice(0, 10);

export function TedarikciEylemleri({
  tedarikci, yazabilir,
}: { tedarikci: T; yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [onayBekliyor, setOnayBekliyor] = useState(false);

  /* Yetki yoksa eylemler yerine yetkisiz bloğu gelir (03-screens M2).
     Metin ekranın değil EYLEMİN kapısını anlatır — ekran okunabilir. */
  if (!yazabilir) {
    return (
      <div className="cekmece-blok" style={{ marginTop: 'var(--s26)' }}>
        <div className="blok yetkisiz">
          <p className="t-caption" style={{ margin: 0 }}>Yetkisiz</p>
          <p className="cumle">Erişimi kısıtlamak envanter yazma yetkisi ister.</p>
        </div>
      </div>
    );
  }

  /* tedarikciKaydet yalnız ad/tip/uzaktanErisimVar/kritiklik yazar; yöntem ve
     oturum kaydı alanlarına dokunmaz — kısıtlamadan sonra da kayıtlı yöntem
     tarihçe olarak durur, çekmece bunu açıkça söyler. */
  const kisitla = () => calistir(
    () => tedarikciKaydet({
      id: tedarikci.id,
      ad: tedarikci.ad,
      tip: tedarikci.tip,
      uzaktanErisimVar: false,
      kritiklik: tedarikci.kritiklik,
    }),
    () => setOnayBekliyor(false),
  );

  if (!tedarikci.uzaktanErisimVar) {
    return (
      <CekmeceEylemler
        dipNot="Uzaktan erişim kapalı — kısıtlanacak bağlantı yok."
      />
    );
  }

  return (
    <CekmeceEylemler
      birincil={onayBekliyor ? (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
            {tedarikci.ad} için uzaktan erişim kaydı kapatılacak.
            {tedarikci.varlikSayisi > 0
              && ` ${tedarikci.varlikSayisi} varlıktaki bağlantı hattı ayrıca saha tarafında kesilmelidir.`}
          </p>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" onClick={kisitla} disabled={bekliyor}>
              {bekliyor ? 'Kaydediliyor…' : 'Onayla'}
            </Dugme>
            <Dugme tur="ret" onClick={() => setOnayBekliyor(false)} disabled={bekliyor}>
              Vazgeç
            </Dugme>
          </div>
        </div>
      ) : (
        <Dugme tur="cekmece" onClick={() => setOnayBekliyor(true)}>Erişimi kısıtla</Dugme>
      )}
      dipNot={hata
        ?? 'Kısıtlama tedarikçi kaydını günceller; kayıtlı erişim yöntemi tarihçe olarak korunur.'}
    />
  );
}

/** Ufuktaki ya da süresi dolmuş sertifikanın bitişini ileri taşır. */
export function SertifikaYenile({ sertifika }: { sertifika: SertifikaOzeti }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [bitis, setBitis] = useState(() => biryilSonra(sertifika.bitis));

  if (sertifika.kalanGun > UFUK) return null;

  if (!acik) {
    return (
      <Dugme onClick={() => setAcik(true)}>Bitişi güncelle</Dugme>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s10)' }}>
      <Alan etiket="Yeni bitiş" zorunlu hata={hata}>
        <input type="date" className="gr" value={bitis} min={girdiTarihi(sertifika.bitis)}
          onChange={(e) => setBitis(e.target.value)} />
      </Alan>
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !bitis}
          onClick={() => calistir(
            () => sertifikaKaydet({
              id: sertifika.id,
              ad: sertifika.ad,
              // Varlık ve veren bağı taşınmazsa kayıt koparılır — imza gereği
              // bu alanlar her çağrıda yeniden yazılır.
              varlikId: sertifika.varlikId,
              veren: sertifika.veren,
              bitis,
            }),
            () => setAcik(false),
          )}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </Dugme>
        <Dugme tur="ret" onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Mevcut bitiş {tarihTR(sertifika.bitis)}
        {sertifika.varlikEtiketi ? ` · ${sertifika.varlikEtiketi}` : ''}
      </p>
    </div>
  );
}

/* ── Erişim oturumları · ÖNERİ → İNSAN KARARI ────────────────────────────

   BU BLOK OTURUM KAPATMAZ. Platform PAM/VPN değildir: bağlantıyı kesemez,
   kesmemelidir de. Uyumsuz oturum burada bir ÖNERİdir; ekran ihlali ve
   dayanağını yazar, insan üç karardan birini verir ve karar denetim izine
   düşer (`lib/eylemler2/tedarikciOturum.ts`).

   "Kapatma talebi" bile bir görev açar — erişimi saha keser. Bir düğmenin
   gerçekten oturumu kapattığını sanmak, kapanmadığını fark etmemekten
   daha tehlikelidir.

   Ölçülmemiş alan (null) İHLAL DEĞİLDİR ve ayrı gösterilir: "MFA yok" ile
   "MFA'sı olup olmadığını bilmiyoruz" farklı iki iş emridir. */

const KARAR_SECENEKLERI = [
  { id: 'kapatma_talebi', ad: 'Kapatma talebi aç',
    not: 'Erişimin sahada kesilmesi için görev açılır; platform kesmez.' },
  { id: 'istisna', ad: 'İstisna kaydet',
    not: 'Uyumsuzluk gerekçeli olarak kabul edilir; oturum kaydı değişmez.' },
  { id: 'yanlis_pozitif', ad: 'Kaynak verisi hatalı',
    not: 'Kaynak sistemin raporu yanlış; veri düzeltilmeli.' },
] as const;

function OturumKarari({ oturum }: { oturum: OturumSatiri }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [karar, setKarar] = useState<string | null>(null);
  const [gerekce, setGerekce] = useState('');

  if (!oturum.kararVerebilir) {
    return (
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Bu oturumun santral kapsamında karar yetkiniz yok.
      </p>
    );
  }

  if (karar === null) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s10)' }}>
        {KARAR_SECENEKLERI.map((s) => (
          <button key={s.id} type="button" className="dg dg-satir"
            onClick={() => { setKarar(s.id); setGerekce(''); }}>
            {s.ad}
          </button>
        ))}
      </div>
    );
  }

  const secim = KARAR_SECENEKLERI.find((s) => s.id === karar);
  return (
    <div style={{ display: 'grid', gap: 'var(--s10)' }}>
      <p className="cekmece-dip" style={{ margin: 0 }}>{secim?.not}</p>
      <Alan etiket="Karar gerekçesi" zorunlu hata={hata}>
        <textarea className="gr" rows={2} value={gerekce}
          placeholder="Hangi kanıta dayanıyor, kim onayladı? (en az 10 karakter)"
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || gerekce.trim().length < 10}
          onClick={() => calistir(
            () => oturumKarariKaydet({ oturumId: oturum.id, karar, gerekce }),
            () => { setKarar(null); setGerekce(''); },
          )}>
          {bekliyor ? 'Kaydediliyor…' : 'Kararı kaydet'}
        </Dugme>
        <Dugme tur="ret" disabled={bekliyor} onClick={() => setKarar(null)}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

export function ErisimOturumlari({ t }: { t: T }) {
  const o = t.oturum;

  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>
        Erişim oturumları · ölçüm
      </p>

      {/* Kapsam cümlesi her hâlde yazılır; "oturum yok" ASLA denmez. */}
      <p style={{ margin: '0 0 var(--s12)', display: 'flex', alignItems: 'flex-start',
        gap: 'var(--s8)', fontSize: 'var(--t-field)',
        color: o.kapsam === 'kayit_var' ? 'var(--i2)' : 'var(--unk)' }}>
        {o.kapsam !== 'kayit_var'
          && <span style={{ paddingTop: 2 }}><Im durum="unk" ad="Ölçüm yok" /></span>}
        <span>{o.gerekce}</span>
      </p>

      {o.kapsam === 'kayit_var' && (
        <div style={{ display: 'grid', gap: 'var(--s6)', marginBottom: 'var(--s14)' }}>
          {/* Kanıtlı olumsuz ile ölçülmemiş AYRI SATIRDA: toplanmaz. */}
          <SayacSatiri etiket="Kanıtlı ihlal" durum="bd" parcalar={[
            [`${o.sayaclar.onaysiz} onaysız`, o.sayaclar.onaysiz],
            [`${o.sayaclar.mfasiz} MFA'sız`, o.sayaclar.mfasiz],
            [`${o.sayaclar.izlenmeyen} izlenmemiş`, o.sayaclar.izlenmeyen],
          ]} />
          <SayacSatiri etiket="Ölçülmemiş" durum="unk" parcalar={[
            [`${o.sayaclar.onayBilinmiyor} onay`, o.sayaclar.onayBilinmiyor],
            [`${o.sayaclar.mfaBilinmiyor} MFA`, o.sayaclar.mfaBilinmiyor],
            [`${o.sayaclar.izlemeBilinmiyor} izleme`, o.sayaclar.izlemeBilinmiyor],
          ]} />
          <span style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
            {o.uyumluSayisi} uyumlu · {o.suren} süren oturum
            {o.kaynakSistemler.length > 0 && ` · kaynak ${o.kaynakSistemler.join(', ')}`}
          </span>
        </div>
      )}

      {o.tutarsizliklar.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--s8)', marginBottom: 'var(--s14)' }}>
          {o.tutarsizliklar.map((x) => (
            <div key={x} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
              alignItems: 'start', gap: 'var(--s8)' }}>
              <span style={{ paddingTop: 3 }}><Im durum="md" ad="Beyan ile ölçüm çelişiyor" /></span>
              <span style={{ fontSize: 'var(--t-field)' }}>{x}</span>
            </div>
          ))}
        </div>
      )}

      {t.oturumlar.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--s14)' }}>
          {t.oturumlar.map((s) => (
            <div key={s.id} style={{ background: 'var(--card)',
              border: 'var(--bw-hair) solid var(--hr2)', padding: 'var(--s12) var(--s14)',
              display: 'grid', gap: 'var(--s8)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s8)' }}>
                <Im durum={s.ihlaller.length > 0 ? 'bd' : 'unk'}
                  ad={s.ihlaller.length > 0 ? 'Kanıtlı ihlal' : 'Ölçülmemiş alan'} />
                <span className="mono" style={{ fontSize: 'var(--t-label)' }}>
                  {tarihTR(s.baslangic)}
                </span>
                <span style={{ fontSize: 'var(--t-label)', color: 'var(--i3)',
                  marginLeft: 'auto' }}>
                  {s.tesisKod ?? 'santral kaydı yok'} · {s.kaynakSistem} · {s.durum}
                </span>
              </div>

              {s.ihlaller.length > 0 && (
                <span style={{ fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
                  {s.ihlaller.join(' · ')}
                </span>
              )}
              {s.bilinmeyenler.length > 0 && (
                <span style={{ fontSize: 'var(--t-label)', color: 'var(--unk)' }}>
                  ölçülmemiş: {s.bilinmeyenler.join(' · ')}
                </span>
              )}
              <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {s.hesapId ? `hesap ${s.hesapId}` : 'hesap kaydı yok'}
                {s.talepReferansi ? ` · talep ${s.talepReferansi}` : ' · talep referansı yok'}
                {s.kayitReferansi ? ` · kayıt ${s.kayitReferansi}` : ''}
              </span>

              <OturumKarari oturum={s} />
            </div>
          ))}
        </div>
      )}

      <p className="cekmece-dip" style={{ margin: 'var(--s12) 0 0' }}>
        Uyumsuz oturum bir ÖNERİdir. Bu ekran oturumu kapatmaz, erişimi kesmez;
        karar insanındır ve gerekçesiyle birlikte denetim izine yazılır.
      </p>
    </div>
  );
}

function SayacSatiri({ etiket, durum, parcalar }: {
  etiket: string; durum: 'bd' | 'unk'; parcalar: [string, number][];
}) {
  const dolu = parcalar.filter(([, n]) => n > 0);
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s8)',
      fontSize: 'var(--t-label)' }}>
      <Im durum={durum} ad={etiket} />
      <span style={{ color: 'var(--i3)' }}>{etiket}</span>
      <span style={{ color: dolu.length > 0 ? `var(--${durum})` : 'var(--i3)',
        fontWeight: dolu.length > 0 ? 600 : 400 }}>
        {dolu.length > 0 ? dolu.map(([m]) => m).join(' · ') : 'yok'}
      </span>
    </span>
  );
}
