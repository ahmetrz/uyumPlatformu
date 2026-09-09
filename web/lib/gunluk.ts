/* ═══════════════════════════════════════════════════════════════════════
   YAPISAL GÜNLÜK — tek yer, tek biçim (P7 · 2.6)

   Kurulumda günlüğü bir insan değil bir toplayıcı okur. Serbest metin
   satırları (`console.error('[giris] … :', e)`) alan olarak ayrıştırılamaz;
   toplayıcı ya hepsini tek `message` alanına atar ya da düzenli ifadeyle
   tahmin eder. İkisi de bir uyum ürününde kabul edilemez: olay kaydı
   ARANABİLİR olmalıdır.

   Biçim: tek satır JSON. Alanlar sabittir — `zaman · duzey · olay · …ek`.

   ── SIR GÜNLÜĞE GİRMEZ ─────────────────────────────────────────────────
   Bu modül sızıntıyı ÖNLEMEZ, GÖRÜNÜR KILAR: anahtar adı sır kokan her
   alan (`parola · token · secret · anahtar · yetkilendirme · cerez …`)
   değerini `[gizlendi]` ile değiştirir. Değer bazlı tahmin YAPILMAZ —
   "bu dize sır gibi duruyor" sezgisi hem yanlış pozitif üretir hem de
   gerçek sırrı kaçırır; ad tabanlı kural okunabilir ve sınanabilirdir.

   Bekçi `tests/bekci/gunluk-sir.test.ts`: ürün kodunda çıplak `console.*`
   çağrısı ve maskesiz sır alanı KIRMIZIDIR.
   ═══════════════════════════════════════════════════════════════════════ */

export const DUZEYLER = ['hata', 'uyari', 'bilgi'] as const;
export type Duzey = (typeof DUZEYLER)[number];

/** Anahtar adı bu kalıplardan birini içeriyorsa DEĞER yazılmaz. */
export const SIR_ANAHTARLARI = [
  'parola', 'password', 'sifre', 'şifre',
  'token', 'jeton', 'secret', 'sir', 'sır',
  'anahtar', 'key', 'apikey',
  'authorization', 'yetkilendirme', 'auth',
  'cookie', 'cerez', 'çerez', 'oturum',
  'credential', 'kimlikbilgisi',
  'bind', 'dsn', 'connectionstring', 'databaseurl', 'database_url',
  /* Türkçe adlar da korunur: kaçırılan bir `baglantiDizesi`, korunmak
     istenen şeyin ta kendisidir (bağımsız inceleme bulgusu). */
  'baglantidizesi', 'bağlantıdizesi', 'dburl',
] as const;

export const GIZLI = '[gizlendi]';

/** Anahtar adı sır kokuyor mu — büyük/küçük harf ve ayraç duyarsız. */
export function sirAnahtari(ad: string): boolean {
  const a = ad.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g, '');
  return SIR_ANAHTARLARI.some((k) => a.includes(k.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g, '')));
}

/** Nesneyi güvenli hâle getirir: sır kokan anahtarın DEĞERİ yazılmaz. */
export function maskele(deger: unknown, derinlik = 0): unknown {
  if (derinlik > 6) return '[derin]';
  if (deger === null || typeof deger !== 'object') return deger;
  if (Array.isArray(deger)) return deger.map((x) => maskele(x, derinlik + 1));
  if (deger instanceof Error) return { ad: deger.name, mesaj: deger.message };
  const cikti: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(deger as Record<string, unknown>)) {
    cikti[k] = sirAnahtari(k) ? GIZLI : maskele(v, derinlik + 1);
  }
  return cikti;
}

export type GunlukSatiri = { zaman: string; duzey: Duzey; olay: string } & Record<string, unknown>;

/** Satırı ÜRETİR, yazmaz — test bunu okur, `yaz` çıktıya basar. */
export function satir(duzey: Duzey, olay: string, ek: Record<string, unknown> = {}): GunlukSatiri {
  return { zaman: new Date().toISOString(), duzey, olay, ...(maskele(ek) as Record<string, unknown>) };
}

/* Çıktı akışı: hata ve uyarı stderr'e, bilgi stdout'a. Kapsayıcı
   toplayıcıları ikisini ayrı sınıflar. */
export function yaz(duzey: Duzey, olay: string, ek: Record<string, unknown> = {}): void {
  const s = JSON.stringify(satir(duzey, olay, ek));
  if (duzey === 'bilgi') process.stdout.write(`${s}\n`);
  else process.stderr.write(`${s}\n`);
}

export const gunluk = {
  hata: (olay: string, ek?: Record<string, unknown>) => yaz('hata', olay, ek),
  uyari: (olay: string, ek?: Record<string, unknown>) => yaz('uyari', olay, ek),
  bilgi: (olay: string, ek?: Record<string, unknown>) => yaz('bilgi', olay, ek),
};
