# Ürünün kendi verisinin yedeklenmesi ve geri yüklenmesi

> Bu belge ürünün **kendi** verisi içindir. Ürünün müşterinin yedekleme
> platformunu izlemesi ayrı bir konudur (`/yedekleme` ekranı) ve gerçek bir
> yedekleme ürününe bağlanılmaz.

Ürün, `restoreTestiKaydet` eylemiyle kullanıcıya şunu dayatıyor: **geri
yüklenebildiği kanıtlanmamış yedek, yedek değildir** (§12). Aynı kural
ürünün kendisi için de geçerli olmak zorundadır; aksi hâlde ürün kendi
söylediğini yapmıyor demektir.

Bu yüzden prosedür düz metin değil, **koşulan bir araçtır**:
`web/arac/yedek.mjs`. Testi `web/tests/yedek-araci.test.ts` içindedir
(17 vaka) ve kalite kapılarında koşar.

---

## 1. Neyi yedekliyoruz — ölçülmüş envanter

9 Eylül 2026 ölçümü (R3 turu):

| Ne | Nerede | Bugünkü durum |
| --- | --- | --- |
| Bütün ürün verisi | SQLite: `web/prisma/dev.db` · PostgreSQL: kurulum veritabanı | **158 tablo · 52 göç** · SQLite yedeği 3,44 MB |
| Kanıt dosyaları | `KANIT_DEPO_KOKU` altındaki içerik adresli depo | **VAR ve yedeğe DÂHİL** (R3 ile) |
| Yapılandırma ve sırlar | `web/.env` · kurulumda `deploy/compose/.env` | `.gitignore`'da · **yedeğe DAHİL DEĞİL** (bilerek) |
| Tesis görselleri | `web/public/tesisler/` | depoda sürümlü, ayrıca yedek istemez |

**Kanıt dosyaları R3 ile yedeğe girdi.** Bu belgenin eski cümlesi ("araç
onları ALMIYOR") 9 Eylül 2026'ya kadar doğruydu ve o gün kapandı: yedek
artık bir DİZİNDİR ve üç parça taşır —

```
<yedek>/veritabani.db  |  veritabani.dump    veri
<yedek>/kanit/<aa>/<bb>/<özet>               kanıt dosyaları (içerik adresli)
<yedek>/manifest.json                        anahtar · boyut · özet
```

Manifest olmadan "yedek tam mı" sorusu **sorulamaz**: dosya sisteminde
dosya saymak, veritabanının hangi dosyayı beklediğini söylemez. Bütünlük
ölçümü bu yüzden `Kanit.depoAnahtari` ve `KanitSurumu.depoAnahtari`
listesine karşı yapılır — diskteki dosyalara karşı değil.

**`.env` bilerek dışarıdadır.** Sır niteliğindeki yapılandırma, veri
yedeğiyle aynı yerde durmamalıdır: veri yedeğine erişebilen herkes
bağlantı dizesine de erişmiş olurdu. Ayrı ve erişimi dar bir yerde
saklanır; nerede saklanacağı bu belgenin değil, kurumun kararıdır.

---

## 2. İki sağlayıcı, iki yol

Kurulum PostgreSQL'dir; geliştirme ve demo SQLite'tır (R5 · P7). Araç
sağlayıcıyı **`DATABASE_URL`den çözer**, tahmin etmez:

| Sağlayıcı | Yedek | Geri yükleme | Gerektirdiği |
| --- | --- | --- | --- |
| SQLite | `VACUUM INTO` | dosya kopyası (+ `-wal`/`-shm` temizliği) | — |
| PostgreSQL | `pg_dump --format=custom` | `pg_restore` | `postgresql-client` |

PostgreSQL istemci araçları yoksa araç **adıyla söyler ve durur**;
"yedek alındı" demez. Kurulum imajında bu araçlar bulunur
(`deploy/compose/Dockerfile`).

### Neden `cp` değil

Canlı SQLite dosyasını kopyalamak güvenli değildir: kopyanın ortasında bir
yazma commit'lenirse dosya tutarsız çıkar ve bunu ancak **geri yüklerken**
fark edersiniz — yani ihtiyacınız olan anda. `VACUUM INTO` yedeği kendi
kilit düzeniyle, tutarlı bir anlık görüntü olarak yazar.

Yan etkisi bilinmelidir: `VACUUM INTO` boş sayfaları atarak yazdığı için
**yedek dosyası canlıdan bayt bayt farklıdır.** Bu bozukluk değildir. Bu
yüzden araç iki ayrı özet raporlar:

- **bayt özeti** — yedeğin kendi bütünlüğünü doğrular (manifest ↔ dosya),
- **içerik özeti** — her tablonun satır sayısından türer; "bu yedek
  canlıyla aynı veriyi mi taşıyor" sorusunun cevabı budur.

---

## 3. Yedek alma

```bash
cd web
npm run yedek                       # yedek/uyum-<zaman-damgası>/
node arac/yedek.mjs --al /güvenli/yol/uyum-2026-09-09
```

Kurulumda (compose):

```bash
docker compose exec uygulama node arac/yedek.mjs --al /veri/yedek/uyum-2026-09-09
```

Araç yedeği alır **ve aynı komutta doğrular**; ayrı bir "doğrula" adımı
unutulabilir olurdu. Hedef dizin varsa ve boş değilse **yazmaz**: var olan
bir yedeğin üstüne yazmak, bir yedeği sessizce yok etmektir.

Ölçülen çıktı (9 Eylül 2026, geliştirme ortamı):

```
YEDEK ALINDI ve DOĞRULANDI

  sağlayıcı    : sqlite
  veritabanı   : veritabani.db · 3.44 MB · 2872340cb9fa82b2…
  tablo        : 158
  göç          : 52 (son: 20260909180000_surum_paket_notu_temsili)
  içerik özeti : 2c0e42dd6da68991
  kullanıcı    : 5 · iz kaydı: 38
  kanıt dosyası: 0 · 0.0 KB · depo kökü: …/web/veri/kanit
```

**`kanıt dosyası: 0` bir ÖLÇÜMDÜR, "kanıt dosyası yok" değil.** İkincisi
bir iddiadır ve depo okunamadığında da aynı cümleyi kurar. Deponun
dizininin hiç olmaması ayrı bir olgudur ve ayrı yazılır (`depo dizini
YOKTU — ölçüm yapılamadı`).

---

## 4. Kanıt bütünlüğü — `--karsilastir`

```bash
node arac/yedek.mjs --karsilastir /güvenli/yol/uyum-2026-09-09
```

Üç şeyi birden ölçer:

1. **Yedeğin kendi bütünlüğü** — manifestteki her özet, yedekteki dosyayla
   tutuyor mu.
2. **Canlıyla fark** — içerik özeti, göç farkı, iz farkı.
3. **Kanıt bütünlüğü** — veritabanının beklediği her depo anahtarı yedekte
   var mı, özeti `dosyaHash` ile tutuyor mu.

Eksik ya da çürük dosya **adıyla** listelenir ve araç **sıfır dışı** kodla
döner:

```
  EKSİK · Kanit ckx… · "Yıllık Sızma Testi Raporu" · anahtar a1/b2/c3d4…
  ÇÜRÜK · KanitSurumu ckz… · "eski.pdf" · anahtar a1/b2/… · yedekteki … ≠ beklenen …
```

`dosyaHash` boş olan eski kayıtta doğrulama **anahtarın kendisinden**
yapılır: depo içerik adreslidir, anahtar zaten özettir. Karşılaştıracak
bir şey olmadığında "geçti" demek, hiçbir şeye bakmadan temiz
raporlamaktır.

**Sahipsiz dosya kusur değildir** ve sayı olarak raporlanır: içerik
adresli depoda aynı içerik birden çok kayıt tarafından paylaşılır ve
arşivlenen kayıt dosyayı bırakmaz.

---

## 5. Geri yükleme

> Geri yükleme **veri kaybettirir**: yedekten sonra yazılan her şey gider.
> Adım 1 bu yüzden vardır ve atlanmaz.

```bash
cd web

# 1. MEVCUT hâli önce yedekle — yanlış yedeği geri yüklediğinizi
#    anlarsanız dönecek bir yeriniz olsun.
node arac/yedek.mjs --al yedek/geri-yukleme-oncesi

# 2. Geri yükleyeceğiniz yedeği DOĞRULAYIN ve canlıyla karşılaştırın.
node arac/yedek.mjs --karsilastir /güvenli/yol/uyum-2026-09-09

# 3. Ürünü durdurun (çalışırken dosya değiştirilmez).

# 4. Geri yükleyin. Hedef DOLUYSA araç durur; üstüne yazmak bir İNSAN
#    kararıdır ve açıkça istenir.
node arac/yedek.mjs --geri-yukle /güvenli/yol/uyum-2026-09-09
node arac/yedek.mjs --geri-yukle /güvenli/yol/uyum-2026-09-09 --ustune-yaz

# 5. ŞEMAYI KODLA HİZALAYIN — atlanırsa ürün açılışta değil, ilk o
#    tabloya dokunulduğunda patlar; yani saatler sonra ve alakasız bir
#    ekranda.
node arac/goc-uygula.mjs

# 6. Ürünü başlatın ve doğrulayın.
npm run test
```

Geri yükleme **iki parçayı da** getirir: veritabanı ve kanıt deposu.
Yazılan her kanıt dosyası okunarak doğrulanır — "kopyaladım" bir iddia,
"özeti tuttu" bir ölçümdür.

**Adım 5 neden şart:** `--karsilastir` çıktısındaki `göç farkı` sıfırdan
büyükse yedek koddan eskidir ve şema eksik gelir. Sıfırdan küçükse yedek
koddan **yeni** demektir — bu durumda geri yükleme yapmayın, önce kodu
güncelleyin; ileri göçü geri almanın güvenli bir yolu yoktur.

**Sağlayıcılar arası geri yükleme YAPILMAZ.** SQLite yedeği PostgreSQL'e
açılmaz ve araç bunu reddeder; denemek yarım bir şema ve "çalışıyor gibi
görünen" bir kurulum bırakırdı.

---

## 6. Doğrulama tatbikatı — prosedürün kendisi test edilir

Yazılıp bir daha koşulmayan prosedür, olmayan prosedürden **daha
kötüdür**: yokluğu bilinir, bayatlığı bilinmez.

Tatbikat, ürünün kendi kuralıyla aynıdır — yedeği almak yetmez, geri
dönebildiği gösterilir:

```bash
cd web
node arac/yedek.mjs --al /tmp/tatbikat                 # 1. al
mv prisma/dev.db /tmp/onceki.db && rm -rf veri/kanit   # 2. ortamı BOŞALT
node arac/yedek.mjs --geri-yukle /tmp/tatbikat         # 3. geri yükle
node arac/yedek.mjs --karsilastir /tmp/tatbikat        # 4. SAĞLAM mı
npm run test                                           # 5. tam küme yeşil mi
```

### Ölçülen tatbikat — 9 Eylül 2026

| Adım | Sonuç |
| --- | --- |
| `--al` | çıkış 0 · 158 tablo · 52 göç · içerik özeti `2c0e42dd6da68991` |
| Ortam boşaltıldı | `prisma/dev.db` taşındı, `veri/kanit` silindi |
| `--geri-yukle` | çıkış 0 · `veritabani.db` · kanıt dosyası 0 |
| `--karsilastir` | çıkış 0 · **SONUÇ: SAĞLAM** · içerik özeti aynı, göç farkı 0, iz farkı 0 |
| `npm run test` | **193 dosya · 3 518 vaka geçti · 1 atlandı · çıkış 0** — küme, GERİ YÜKLENEN veritabanına karşı koştu |

Kanıt dosyalı gidiş-dönüş (dosya yaz → yedekle → boş ortama geri yükle →
özet tut) `tests/yedek-araci.test.ts` içinde ölçülür: geliştirme
ortamının deposu bugün boştur ve **boş bir depoyla yapılan tatbikat, dosya
taşıyan bir yedeği kanıtlamaz**.

### Politika — karara bağlandı 03.09.2026

| | Kural | Gerekçe |
| --- | --- | --- |
| **Saklama** | Günlük 14 gün · haftalık 3 ay · aylık **24 ay** | Veritabanı 3,44 MB; kırk kopya bile 150 MB'ın altında. Bağlayıcı kısıt depolama değil, **denetim izinin delil ömrü**. 24 ay "geçen yılın denetimi + bu yılın denetimi"ni kapsar. Kanıt deposu büyüdükçe bu sayı yeniden ölçülmelidir; dosyalar veritabanından hızlı büyür. |
| **Yer** | En az iki yer, **biri ürünün koştuğu makinenin dışında** | Tek yerdeki yedek, makineyi kaybettiğinizde yedek değildir. Depoya konmaz (`yedek/` `.gitignore`'da). |
| **Tatbikat** | Üç ayda bir **+ her göçten sonra ZORUNLU** | Takvimden önemlisi ikincisidir: ölçülen asıl kırılma noktası göç uyuşmazlığıdır — koddan eski bir yedek geri yüklenirse ürün açılışta değil, saatler sonra alakasız bir ekranda patlar. Şema her değiştiğinde bir tatbikat, üç aylık takvimden çok iş görür. |

**Bu politikayı ezecek tek şey:** EPDK ya da iç denetim politikası denetim
kayıtları için bir asgari saklama süresi dayatıyorsa, o süre 24 ayı ezer.
Bugün elimizde böyle yazılı bir gereklilik yok; çıkarsa bu tablo ona göre
yeniden yazılır ve sayı **buradan** değil, o gereklilikten gelir.

---

## 7. Bilinen sınırlar

| Sınır | Sonuç |
| --- | --- |
| `.env` yedeğe dâhil değil | Bilinçli; ayrı saklanmalı, aksi hâlde tek yerde toplanır |
| Otomatik zamanlama yok | Yedek elle ya da kurumun zamanlayıcısıyla alınır |
| Şifreleme yok | Yedek düz dosyadır; şifreleme saklama katmanının işidir |
| PostgreSQL yolu istemci aracı ister | `pg_dump`/`pg_restore` yoksa araç durur ve **adıyla** söyler; sessiz düşüş yok |
| Nesne deposu (S3) yok | Bugünkü kanıt sağlayıcısı `yerel_dosya`dır; S3 sağlayıcısı yazıldığı gün bu araç büyütülmelidir |
| Yedek dizini artımlı değil | Her yedek tam kopyadır; kanıt deposu büyüdükçe saklama politikası yeniden ölçülmelidir |

Son iki satır önemlidir: sağlayıcı değişikliği bu prosedürü sessizce
geçersiz kılabilir. Yeni bir kanıt sağlayıcısı ya da veritabanı eklendiği
gün burası yeniden yazılmadan geçiş tamamlanmış sayılmamalıdır.
