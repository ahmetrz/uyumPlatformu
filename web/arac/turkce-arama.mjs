/* TÜRKÇE METİN ARAMA — çift küçültme ve Unicode sözcük sınırı.

   ── NİÇİN AYRI BİR MODÜL ──────────────────────────────────────────────
   Bu mantık bekçi testinde (`tests/bekci/terimler.ts`) doğdu ve orada
   kalıcı vakalarla korunuyor (`katlama-korlugu.test.ts` · URN-ALN-007).
   Ama tuzak yalnız bekçiyi vurmuyor: ÖLÇÜM SONDALARINI da vuruyor ve
   onları hiçbir test korumuyor.

   Ölçüldü (7 Eyl 2026): `/tedarikciler` çekmecesini iki sözlükle
   karşılaştıran tek seferlik bir sonda `/arıtma/i` kalıbını kullandı ve
   ekranda AÇIKÇA duran "ARITMA TESİSİ · 7" satırını göremedi. Sonda
   "terim yok" dedi; oysa vardı. Kalıcı test bunu koruyamaz — sonda her
   ölçümde sıfırdan yazılıyor ve kalıbı yeniden türetiyor.

   Çare test değil ARAÇTIR: kalıp bir kez burada durur, sondalar onu
   çağırır. Türkçe metin ararken düz `/…/i` KULLANILMAZ.

   ── İKİ TUZAK ─────────────────────────────────────────────────────────
   1 · BÜYÜK HARF KATLAMASI — tek katlama her iki yönde de kör:

        sözcük     toLocaleLowerCase('tr-TR')   toLowerCase()
        ÜNİTE      ünite            ✓           üni̇te          ✗
        ARITMA     arıtma           ✓           arıtma?        ✗
        TERMIK     termık           ✗           termik         ✓
        BIRIM      bırım            ✗           birim          ✓

      Türkçe katlama `I`yı `ı` yapar; değişmez katlama `İ`yi `i` + ayrı
      birleşen noktaya böler. `/…/i` bayrağı Unicode BASİT katlama
      kullanır ve ikisini de yapmaz. Bu yüzden arama İKİ küçültmenin
      BİRLEŞİMİ üzerindedir: terim herhangi birinde görünüyorsa
      görünmüştür.

   2 · SÖZCÜK SINIRI — `\b` ASCII tanımlıdır. `Ü` `İ` `Ç` `ş` sözcük
      karakteri sayılmaz: `\bRES\b` "SÜRESİ" içinde eşleşir, `\bDGKÇ\b`
      gerçek `DGKÇ` kodunu hiç görmez. Sınır Unicode harflerine göre
      kurulur (`sinirKalibi`).

   ── HAM METİN NE ZAMAN ────────────────────────────────────────────────
   Büyük harfli KODLAR (`JES` · `RES` · `MW`) ham metinde aranır:
   küçültülmüşte `res` Türkçe sözcüklerin içine düşer ("süresi",
   "resim"). Küçültme yalnız sözcük arayan kalıplar içindir.
*/

/** Metnin iki küçültmesi — arama bunların BİRLEŞİMİ üzerinde yapılır. */
export function kucultmeler(metin) {
  return [metin.toLocaleLowerCase('tr-TR'), metin.toLowerCase()];
}

/** Unicode sözcük sınırlı kalıp: `\b` yerine bakış-çevresi.
    `sinirKalibi('DGKÇ|RES')` → `RES`i "SÜRESİ" içinde bulmaz. */
export function sinirKalibi(govde, bayraklar = 'gu') {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${govde})(?![\\p{L}\\p{N}_])`, bayraklar);
}

/** Kalıbın metindeki eşleşme sayısı. Kalıp `g` taşımalı. */
export function eslesmeSayisi(re, metin) {
  return metin.match(new RegExp(re.source, re.flags))?.length ?? 0;
}

/** Küçük harfli bir kalıbı İKİ küçültmede birden arar; büyük sayıyı döner.

    Toplamaz: aynı geçiş her iki kopyada da görüneceği için toplamak onu
    ikiye katlardı. İki farklı yazım (`ÜNİTE` ve `UNITE`) aynı metinde
    varsa sonuç ALT SINIRDIR — ama "var mı" kararı doğru kalır ve ölçülen
    şey odur. */
export function katlamaliSayi(re, metin) {
  return Math.max(...kucultmeler(metin).map((m) => eslesmeSayisi(re, m)));
}

/** Metin bu küçük harfli kalıbı taşıyor mu — Türkçe güvenli `test()`.

    Sondalarda `/…/i` YERİNE bunu kullanın:
      ✗ /arıtma/i.test(satir)        → "ARITMA TESİSİ"yi GÖRMEZ
      ✓ katlamaliVarMi(/arıtma/, satir)  → görür */
export function katlamaliVarMi(re, metin) {
  const k = new RegExp(re.source, re.flags.replace('g', ''));
  return kucultmeler(metin).some((m) => k.test(m));
}

/** Kalıbı taşıyan satırlar — çok satırlı ekran metnini süzmenin kısa yolu. */
export function katlamaliSatirlar(re, metin, ayrac = '\n') {
  return metin.split(ayrac).filter((s) => katlamaliVarMi(re, s));
}
