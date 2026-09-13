import SistemSayfasi from './SistemSayfasi';

/* Bakım modu ekranı. İki yerden çizilir: `/bakim` rotası (önizleme ve
   yönlendirme hedefi) ve kök yerleşim `BAKIM_MODU=1` iken (tüm ekranlar).
   Eylem YOK: kullanıcının yapabileceği bir şey yoktur, düğme koymak
   yalan olur. Bitiş saati uydurulmaz; işletme `BAKIM_NOTU` ile yazar. */
export default function BakimEkrani() {
  const not = process.env.BAKIM_NOTU?.trim();
  return (
    <SistemSayfasi
      kod="503 · Bakım"
      baslik="Platform planlı bakımda."
      cumle={not || 'Kayıtlar ve denetim izi korunuyor; bakım bitince kaldığınız yerden devam edersiniz. Bu sayfayı bir süre sonra yenileyin.'}
      eylemler={<span className="etiket">Bakım süresince giriş kapalı</span>}
      dip="Bakım penceresi · BT/OT yönetişim platformu"
    />
  );
}
