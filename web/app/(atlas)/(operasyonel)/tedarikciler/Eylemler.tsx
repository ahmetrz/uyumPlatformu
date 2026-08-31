'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/atlas/temel';
import { CekmeceEylemler } from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { tedarikciKaydet, sertifikaKaydet } from '@/lib/eylemler2/operasyon';
import { tarihTR } from '@/lib/sabitler';
import { UFUK, type SertifikaOzeti, type T } from './ortak';

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
