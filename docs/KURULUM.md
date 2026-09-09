# Kurulum — sıfırdan tek sunucuya

**Bu belgedeki her komut koşturulmuştur.** Koşturulmamış bir adım
"ölçülmedi" diye işaretlidir; tahmin yoktur.

Hedef: boş bir Linux sunucuda, `docker compose` ile ayağa kalkan bir
kurulum. Kurulum PostgreSQL kullanır; SQLite geliştirme ve demo içindir.

---

## 0 · Ön koşullar

| Ne | Sürüm | Neden |
| --- | --- | --- |
| Docker Engine | 24+ | ölçülen: 29.3.1 |
| Docker Compose | v2+ | ölçülen: v5.1.1 |
| Disk | ≥ 10 GB | imaj + veritabanı + kanıt deposu |
| Bellek | ≥ 2 GB | derleme sırasında npm ve Next |

Kurulum **dışarıya paket çekmez** (imaj derlenirken çeker). Kapalı ağda
imaj bir kere derlenip taşınır: `docker save` / `docker load`.

---

## 1 · Kaynağı al ve sırları kur

```sh
git clone <depo> uyumPlatformu
cd uyumPlatformu/deploy/compose
cp ornek.env .env
```

`.env` dosyasını doldurun. **Boş bırakılan zorunlu değer kurulumu
başlatmaz**; sessiz varsayılan yoktur:

```sh
# parolayı ÜRETİN, seçmeyin
openssl rand -base64 32
```

| Anahtar | Zorunlu | Ne |
| --- | --- | --- |
| `PG_VERITABANI` · `PG_KULLANICI` · `PG_PAROLA` | evet | veritabanı kimliği |
| `KIRACI_AD` | evet | kurulumun adı (ekranda görünür) |
| `MARKA_AD` | hayır | ürün adını ezer; boşsa `web/lib/marka.ts` kazanır |
| `UYGULAMA_PORTU` | hayır | varsayılan 3000 |
| `TRUST_PROXY` | ters vekil varsa | kaç vekil atlanacak |
| `API_ORAN_SINIRI` · `GIRIS_ORAN_SINIRI` | hayır | boş = şemadaki yazılı varsayılan |

`.env` **depoya girmez** (`.gitignore`). Sır değerleri üründe de
saklanmaz: entegrasyon sırları yalnız `sirReferansi` ile taşınır
(`env:` · `dosya:` · `vault:`).

---

## 2 · Ayağa kaldır

```sh
docker compose --env-file .env up -d --build
```

Sıra bellidir ve compose bunu zorlar:

1. **veritabani** açılır; `pg_isready` geçene kadar uygulama BEKLER.
2. **uygulama** açılır; girişi (`giris.sh`) **önce göçü uygular**
   (`arac/goc-uygula.mjs`), sonra sunucuyu başlatır. Göç başarısızsa
   sunucu HİÇ AÇILMAZ — yarım şemada çalışan bir uyum ürünü, sessizce
   yanlış cevap veren bir üründür.

Göç zinciri **bağlantıdan** seçilir: `postgres(ql)://` ise
`prisma/postgres/migrations` (tek taban göçü), `file:` ise
`prisma/migrations` (SQLite zinciri).

---

## 3 · Kurulumun ayakta olduğunu ÖLÇ

```sh
curl -fsS http://localhost:3000/api/v1/health | jq
```

Beklenen (sağlıklı):

```json
{
  "durum": "saglikli",
  "kip": "hazir",
  "saglayici": "postgresql",
  "bagimliliklar": [
    { "ad": "ortam", "durum": "saglikli" },
    { "ad": "veritabani", "durum": "saglikli" },
    { "ad": "kanit_deposu", "durum": "saglikli" }
  ]
}
```

**`saglayici` alanını okuyun.** `sqlite` yazıyorsa `DATABASE_URL`
ulaşmamış demektir ve kurulum geliştirme veritabanına düşmüştür —
uygulama çalışır ama yanlış yerde çalışır.

Bağımlılık düştüğünde uç **503 + SEBEP** döner:

```sh
$ curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/v1/health
503
$ curl -s http://localhost:3000/api/v1/health | jq -r .sebep
kanit_deposu: depo kökü yok
```

İki kip ayrıdır:

| Uç | Ne ölçer | Orkestratörde |
| --- | --- | --- |
| `/api/v1/health` | readiness — veritabanı + kanıt deposu + ortam | trafik yönlendirme |
| `/api/v1/health?kip=canli` | liveness — yalnız süreç | yeniden başlatma |

Liveness'a bağımlılık koymak, veritabanı bir dakika düştüğünde sağlıklı
bir süreci öldürüp kesintiyi UZATIR; bu yüzden ayrıdır.

---

## 4 · Uygulama rolü tablo sahibi OLMAMALIDIR

Denetim izinin değişmezliği tetikleyicilerle korunur. **Tablo sahibi
`ALTER TABLE … DISABLE TRIGGER` diyebilir** — yani uygulama rolü sahip
olursa değişmezlik iddiası o an yalandır
(`docs/POSTGRES_READINESS.md` §a.2).

Compose tek rol açar (kurulumu basit tutmak için). Ayrımı yapmak için,
göç uygulandıktan SONRA:

```sh
docker compose exec veritabani psql -U "$PG_KULLANICI" -d "$PG_VERITABANI" -c "
  CREATE ROLE uygulama LOGIN PASSWORD '…';
  GRANT USAGE ON SCHEMA public TO uygulama;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO uygulama;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO uygulama;
"
```

sonra `.env` içindeki `DATABASE_URL` kullanıcısını `uygulama` yapın ve
`docker compose up -d` ile yeniden başlatın.

**ÖLÇÜLMEDİ:** bu adım bu kurulumda koşturulmadı; yukarıdaki SQL
PostgreSQL belgelerinden yazılmıştır ve doğrulanmamıştır. Kapanış
aşaması: ilk müşteri kurulumu.

---

## 5 · İçerik paketi kur

Kurulum boş gelir: hiçbir çerçeve aktif değildir. Paket kurmak insan
kararıdır ve `/paketler` ekranından yapılır. Kurulan çerçeve **TASLAK**
gelir; aktifleştirme ayrı bir insan kararıdır (Regülasyonlar ekranı).

TR-ENERJI paketi EPDK Yetkinlik Modeli yönetmeliğini ve yedi sektör ekini
taşır (3 691 kontrol, tam metin). Ayrıntı: `web/paketler/BENIOKU.md`.

---

## 6 · Yedek

Yedek alma ve geri yükleme `docs/URUN_YEDEKLEME.md`'dedir. Kısaca:

```sh
docker compose exec uygulama node arac/yedek.mjs --al --hedef /veri/yedek
docker compose exec uygulama node arac/yedek.mjs --karsilastir --kaynak /veri/yedek
```

`--karsilastir` manifest özetlerini `Kanit.dosyaHash` ile karşılaştırır;
eksik ya da çürük dosyayı ADIYLA listeler ve sıfır dışı çıkar.

---

## 7 · Kaldır

```sh
docker compose --env-file .env down          # kapsayıcılar gider, VERİ KALIR
docker compose --env-file .env down -v       # BİRİMLER DE GİDER — veri kaybı
```

İkinci komut veritabanını ve kanıt deposunu siler. Bir uyum ürününde bu
geri alınamaz: önce yedek alın.

---

## Ölçüm kaydı

| Adım | Durum |
| --- | --- |
| İmaj derlemesi (`docker build`) | ölçüldü |
| `docker compose up -d` | ölçüldü |
| Göç uygulanması (PostgreSQL taban göçü) | ölçüldü |
| Sağlık ucu — sağlıklı (200) | ölçüldü |
| Sağlık ucu — bağımlılık düştü (503 + sebep) | ölçüldü |
| `rota:duman` compose kurulumuna karşı | ölçüldü |
| Uygulama rolünün sahipten ayrılması (§4) | **ÖLÇÜLMEDİ** |
| Kapalı ağda `docker save`/`load` (§0) | **ÖLÇÜLMEDİ** |
