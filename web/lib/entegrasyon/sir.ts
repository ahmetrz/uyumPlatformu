import 'server-only';

/* Sır sağlayıcı soyutlaması.

   Değişmez: connector kimlik bilgisi VERİTABANINDA TUTULMAZ. Connector
   kaydı yalnız bir REFERANS taşır (`sirReferansi`); değerin kendisi bu
   katmandan çözülür ve asla serileştirilmez, loglanmaz, istemciye gitmez.

   Referans biçimi:  <sağlayıcı>:<yol>[#alan]
     env:AD_BIND_PAROLA          → process.env.AD_BIND_PAROLA
     dosya:/run/secrets/ad#parola → dosyadaki JSON'un `parola` alanı
     vault:ot/ad#parola           → henüz bağlı değil; açıkça hata verir

   Vault/KMS gerçek bir dış sisteme bağlanmadan uygulanmaz. Bağlanmamış
   sağlayıcı SESSİZCE boş dönmez — yapılandırma hatası olarak fırlatır,
   çünkü "sır yok" ile "sır okunamadı" aynı şey değildir. */

export type SirCozumu =
  | { ok: true; deger: string }
  | { ok: false; hata: string };

/** Maskeli gösterim — ekranda ve logda yalnız bu görünebilir. */
export function sirMaskesi(referans: string | null): string {
  if (!referans) return 'tanımsız';
  const [saglayici, ...kalan] = referans.split(':');
  const yol = kalan.join(':');
  if (!yol) return `${saglayici}: (geçersiz referans)`;
  // Yol bir sır değil, sırra giden adres — açık gösterilebilir.
  return `${saglayici}: ${yol}`;
}

/** Referansın biçimsel geçerliliği — değeri çözmeden doğrulanabilir. */
export function referansGecerli(referans: string): boolean {
  return /^(env|dosya|vault):[^\s]+$/.test(referans);
}

async function dosyadanOku(yol: string, alan: string | null): Promise<SirCozumu> {
  try {
    const { readFile } = await import('node:fs/promises');
    const ham = await readFile(yol, 'utf8');
    if (!alan) return { ok: true, deger: ham.trim() };
    const nesne = JSON.parse(ham) as Record<string, unknown>;
    const deger = nesne[alan];
    if (typeof deger !== 'string' || !deger) {
      return { ok: false, hata: `Sır dosyasında '${alan}' alanı yok ya da boş` };
    }
    return { ok: true, deger };
  } catch (e) {
    // Hata metni dosya YOLUNU taşıyabilir ama İÇERİĞİNİ asla taşımaz.
    return { ok: false, hata: `Sır dosyası okunamadı (${yol}): ${(e as Error).message}` };
  }
}

/**
 * Sır referansını çözer. Değer yalnız çağıranın belleğinde yaşar.
 * Dönen değeri LOGLAMA, denetim izine YAZMA, yanıt gövdesine KOYMA.
 */
export async function siriCoz(referans: string | null | undefined): Promise<SirCozumu> {
  if (!referans) return { ok: false, hata: 'Sır referansı tanımlı değil' };
  if (!referansGecerli(referans)) {
    return { ok: false, hata: `Geçersiz sır referansı biçimi: ${sirMaskesi(referans)}` };
  }
  const ayrac = referans.indexOf(':');
  const saglayici = referans.slice(0, ayrac);
  const kalan = referans.slice(ayrac + 1);
  const kare = kalan.indexOf('#');
  const yol = kare >= 0 ? kalan.slice(0, kare) : kalan;
  const alan = kare >= 0 ? kalan.slice(kare + 1) : null;

  switch (saglayici) {
    case 'env': {
      const deger = process.env[yol];
      if (!deger) return { ok: false, hata: `Ortam değişkeni tanımsız: ${yol}` };
      return { ok: true, deger };
    }
    case 'dosya':
      return dosyadanOku(yol, alan);
    case 'vault':
      /* Gerçek bir vault bağlanmadan uygulanmaz. Sahte bir değer döndürmek
         ya da sessizce env'e düşmek, çalıştığı sanılan ama çalışmayan bir
         entegrasyon üretir. */
      return {
        ok: false,
        hata: 'Vault sağlayıcısı bu kurulumda bağlı değil — ' +
          'HashiCorp Vault/AWS KMS bağlanana kadar env: ya da dosya: kullanın',
      };
    default:
      return { ok: false, hata: `Bilinmeyen sır sağlayıcısı: ${saglayici}` };
  }
}

/** Bir metnin içinde sır geçip geçmediğini kabaca denetler — log yazmadan
    önce kullanılır. Tam güvence vermez; savunma katmanıdır, tek hat değil. */
export function sirSizintisiVarMi(metin: string, sir: string | null): boolean {
  if (!sir || sir.length < 6) return false;
  return metin.includes(sir);
}
