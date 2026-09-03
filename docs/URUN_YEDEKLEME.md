# Ürünün kendi verisinin yedeklenmesi ve geri yüklenmesi

> Bu belge ürünün **kendi** verisi içindir. Ürünün müşterinin yedekleme
> platformunu izlemesi ayrı bir konudur (`/yedekleme` ekranı) ve gerçek bir
> yedekleme ürününe bağlanılmaz.

Ürün, `restoreTestiKaydet` eylemiyle kullanıcıya şunu dayatıyor: **geri
yüklenebildiği kanıtlanmamış yedek, yedek değildir** (§12). Aynı kural
ürünün kendisi için de geçerli olmak zorundadır; aksi hâlde ürün kendi
söylediğini yapmıyor demektir.

Bu yüzden prosedür düz metin değil, **koşulan bir araçtır**:
`web/arac/yedek.mjs`. Testi `web/tests/yedek-araci.test.ts` içindedir ve
kalite kapılarında koşar.

---

## 1. Neyi yedekliyoruz — ölçülmüş envanter

2026-09-03 ölçümü:

| Ne | Nerede | Bugünkü durum |
| --- | --- | --- |
| Bütün ürün verisi | `web/prisma/dev.db` | tek SQLite dosyası · 99 tablo · 19 uygulanmış göç |
| Yapılandırma ve sırlar | `web/.env` | `.gitignore`'da · **yedeğe DAHİL DEĞİL** |
| Kanıt dosyaları | — | **bugün yok** (aşağıya bakın) |
| Santral görselleri | `web/public/santraller/` | depoda sürümlü, ayrıca yedek istemez |

**Kanıt dosyaları bugün yoktur ve bu bilinçli olarak yazılmıştır.**
`Kanit.dosyaYolu` kolonu şemada duruyor ama hiçbir kod ona yazmıyor; API
ucu bilerek döndürmüyor bile. Dosya yükleme geldiği gün bu prosedür ve
`arac/yedek.mjs` **eksik kalır** ve araç bunu kendiliğinden söyleyemez.
Bugün olmayan bir dizini yedekliyormuş gibi yazmak, olmayan bir güvence
satmak olurdu.

**`.env` bilerek dışarıdadır.** Sır niteliğindeki yapılandırma, veri
yedeğiyle aynı yerde durmamalıdır: veri yedeğine erişebilen herkes
bağlantı dizesine de erişmiş olurdu. Ayrı ve erişimi dar bir yerde
saklanır; nerede saklanacağı bu belgenin değil, kurumun kararıdır.

---

## 2. Yedek alma

```bash
cd web
npm run yedek            # yedek/uyum-<zaman-damgası>.db
# ya da hedefi kendiniz verin:
node arac/yedek.mjs --al /güvenli/yol/uyum-2026-09-03.db
```

Araç yedeği alır **ve aynı komutta doğrular**; ayrı bir "doğrula" adımı
unutulabilir olurdu.

### Neden `cp` değil

Canlı SQLite dosyasını kopyalamak güvenli değildir: kopyanın ortasında bir
yazma commit'lenirse dosya tutarsız çıkar ve bunu ancak **geri yüklerken**
fark edersiniz — yani ihtiyacınız olan anda. Araç `VACUUM INTO` kullanır;
SQLite yedeği kendi kilit düzeniyle, tutarlı bir anlık görüntü olarak
yazar.

Yan etkisi bilinmelidir: `VACUUM INTO` boş sayfaları atarak yazdığı için
**yedek dosyası canlıdan bayt bayt farklıdır.** Bu bozukluk değildir. Bu
yüzden araç iki ayrı özet raporlar:

- **bayt özeti** — aynı yedeğin iki kopyasını ayırt eder,
- **içerik özeti** — her tablonun satır sayısından türetilir; "bu yedek
  canlıyla aynı veriyi mi taşıyor" sorusunun cevabı budur.

---

## 3. Geri yükleme

> Geri yükleme **veri kaybettirir**: yedekten sonra yazılan her şey gider.
> Adım 1 bu yüzden vardır ve atlanmaz.

```bash
cd web

# 1. MEVCUT hâli önce yedekle — yanlış yedeği geri yüklediğinizi
#    anlarsanız dönecek bir yeriniz olsun.
node arac/yedek.mjs --al yedek/geri-yukleme-oncesi.db

# 2. Geri yükleyeceğiniz yedeği DOĞRULAYIN ve canlıyla karşılaştırın.
node arac/yedek.mjs --karsilastir /güvenli/yol/uyum-2026-09-03.db

# 3. Ürünü durdurun (çalışırken dosya değiştirilmez).

# 4. Dosyayı yerine koyun.
cp /güvenli/yol/uyum-2026-09-03.db prisma/dev.db

# 5. ŞEMAYI KODLA HİZALAYIN — atlanırsa ürün açılışta değil, ilk o
#    tabloya dokunulduğunda patlar; yani saatler sonra ve alakasız bir
#    ekranda.
npx prisma migrate deploy

# 6. Ürünü başlatın ve doğrulayın.
npm run test
```

**Adım 5 neden şart:** `--karsilastir` çıktısındaki `göç farkı` sıfırdan
büyükse yedek koddan eskidir ve şema eksik gelir. Sıfırdan küçükse yedek
koddan **yeni** demektir — bu durumda geri yükleme yapmayın, önce kodu
güncelleyin; ileri göçü geri almanın güvenli bir yolu yoktur.

---

## 4. Doğrulama tatbikatı — prosedürün kendisi test edilir

Yazılıp bir daha koşulmayan prosedür, olmayan prosedürden **daha
kötüdür**: yokluğu bilinir, bayatlığı bilinmez.

Tatbikat, ürünün kendi kuralıyla aynıdır — yedeği almak yetmez, geri
dönebildiği gösterilir:

```bash
cd web
node arac/yedek.mjs --al /tmp/tatbikat.db      # 1. al
node arac/yedek.mjs --dogrula /tmp/tatbikat.db # 2. bütünlüğünü göster
node arac/yedek.mjs --karsilastir /tmp/tatbikat.db  # 3. içerik aynı mı
npx vitest run tests/yedek-araci.test.ts       # 4. aracın kendisi sağlam mı
```

**Tatbikat sıklığı ve yedeklerin nerede/ne kadar saklanacağı bu belgede
YAZMAZ.** Saklama süresi, saklama yeri ve tatbikat takvimi kurumun
kararıdır; buraya bir sayı yazmak, kimsenin taahhüt etmediği bir politikayı
belgelemiş gibi görünmek olurdu. Karar verildiğinde bu bölüme yazılır.

---

## 5. Bilinen sınırlar

| Sınır | Sonuç |
| --- | --- |
| Kanıt dosyaları yedeklenmiyor | Bugün dosya yok; yükleme geldiğinde bu araç **eksik kalır** |
| `.env` yedeğe dâhil değil | Bilinçli; ayrı saklanmalı, aksi hâlde tek yerde toplanır |
| Otomatik zamanlama yok | Yedek elle ya da kurumun zamanlayıcısıyla alınır |
| Şifreleme yok | Yedek düz dosyadır; şifreleme saklama katmanının işidir |
| Postgres'e geçilirse | Bu araç **çalışmaz**; `pg_dump` tabanlı karşılığı yazılmalıdır (bkz. `docs/POSTGRES_READINESS.md`) |

Son satır önemlidir: veritabanı geçişi bu prosedürü sessizce geçersiz
kılar. Geçiş yapıldığı gün burası yeniden yazılmadan geçiş tamamlanmış
sayılmamalıdır.
