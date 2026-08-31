/* Sunucu başlangıcında kayıt olur (Next.js instrumentation).

   Burada İŞ MANTIĞI YOKTUR: tek sorumluluğu zamanlayıcı tikini periyodik
   çağırmaktır. Neyin vadesi geldiğine `lib/is/zamanlayici.ts` karar verir
   ve kararını veritabanından TÜRETİR.

   ── Neden burada bir motor listesi yok ─────────────────────────────────
   Bir zamanlar burada ELLE yazılmış bir motor listesi vardı ve sekiz
   motorun yalnız beşini içeriyordu; sonradan eklenen üçü zamanlayıcıya
   hiç girmemişti. Sonra o liste kayıt defterine taşındı. Şimdi listenin
   kendisi de burada değil: ne koşulacağı bir sorgudur, bir kopya değil.

   ── Neden saatlik değil, dakikalık tik ─────────────────────────────────
   Motorlar saatte bir koşar ama connector'lar kendi `pollAralikDk`
   değerine göre koşar; 15 dakikalık bir connector saatlik tikte üç periyot
   kaçırırdı. Tik yalnız ÇÖZÜNÜRLÜKTÜR: vadesi gelmemiş hiçbir şey
   koşmaz, tik ucuzdur (birkaç indeksli sorgu). */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PUBLIC_DEMO === '1') return;
  if (process.env.ISLER_OTOMATIK === '0') return; // kapatma anahtarı

  const { zamanlayiciTiki, TIK_ARALIK_MS } = await import('./lib/is/zamanlayici');

  const tik = async () => {
    try {
      await zamanlayiciTiki();
    } catch (e) {
      /* Tik FIRLATMAMALI. Fırlatırsa yakalanmamış reddedilmiş söz olur ve
         süreç düşer; bir veritabanı kilidi yüzünden tüm uygulamanın
         ölmesi, kaçırılan bir tikten çok daha kötüdür. Tikin kendi
         hatasının kaydı yok (henüz koşu satırı açılmamıştır), bu yüzden
         tek yer stderr'dir. */
      console.error('[zamanlayıcı] tik başarısız:', e instanceof Error ? e.message : e);
    }
  };

  // Açılıştan 30 sn sonra ilk tik (göç ve seed'in oturması için), sonra periyodik.
  setTimeout(() => { void tik(); }, 30_000);
  setInterval(() => { void tik(); }, TIK_ARALIK_MS);
}
