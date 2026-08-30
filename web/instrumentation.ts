/* Sunucu başlangıcında kayıt olur (Next.js instrumentation).
   Gerçek dağıtımda motorları saatte bir koşturur; her koşu IsKosusu'na
   yazılır (sessiz hata yasak). Statik demo derlemesinde devre dışıdır. */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PUBLIC_DEMO === '1') return;
  if (process.env.ISLER_OTOMATIK === '0') return; // kapatma anahtarı

  const { isKos } = await import('./lib/motorlar/isKosucu');
  const { kanitTazeligiIsle } = await import('./lib/motorlar/kanitTazelik');
  const { sonTarihleriIsle } = await import('./lib/motorlar/sonTarih');
  const { gapAksiyonIsle } = await import('./lib/motorlar/gapAksiyon');
  const { veriKalitesiniIsle } = await import('./lib/motorlar/veriKalitesi');

  const hepsi = async () => {
    await isKos('kanit_tazelik', kanitTazeligiIsle);
    await isKos('son_tarih', sonTarihleriIsle);
    await isKos('gap_to_action', gapAksiyonIsle);
    await isKos('veri_kalitesi', veriKalitesiniIsle);
  };

  // açılıştan 30 sn sonra ilk koşu, ardından saatlik
  setTimeout(() => { void hepsi(); }, 30_000);
  setInterval(() => { void hepsi(); }, 3_600_000);
}
