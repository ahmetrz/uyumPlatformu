/* Sunucu başlangıcında kayıt olur (Next.js instrumentation).
   Gerçek dağıtımda motorları saatte bir koşturur; her koşu IsKosusu'na
   yazılır (sessiz hata yasak). Statik demo derlemesinde devre dışıdır. */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PUBLIC_DEMO === '1') return;
  if (process.env.ISLER_OTOMATIK === '0') return; // kapatma anahtarı

  const { isKos } = await import('./lib/motorlar/isKosucu');
  /* Motor listesi kayıt defterinden okunur. Eskiden burada ELLE yazılmış
     bir kopya vardı ve sekiz motorun yalnız beşini içeriyordu: sonradan
     eklenen yedek_dogrulama, olay_etki ve topoloji_sapma zamanlayıcıya
     hiç girmemişti, yani kimse ekrandaki düğmeye basmazsa o üç motor HİÇ
     koşmuyordu. Defter tek yerde durunca bu bir daha olamaz. */
  const { MOTORLAR } = await import('./lib/motorlar/kayit');

  const hepsi = async () => {
    for (const [ad, motor] of Object.entries(MOTORLAR)) await isKos(ad, motor);
  };

  // açılıştan 30 sn sonra ilk koşu, ardından saatlik
  setTimeout(() => { void hepsi(); }, 30_000);
  setInterval(() => { void hepsi(); }, 3_600_000);
}
