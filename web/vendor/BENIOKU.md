# `vendor/` — depoda duran bağımlılık

Buradaki tek dosya `xlsx-0.20.3.tgz`'dir ve **bilerek** depoda durur.

## Niçin

Ürün, kullanıcının yüklediği Excel dosyalarını `xlsx` (SheetJS) ile
ayrıştırır — `lib/eylemler.ts · aktarimYukle` ve
`lib/entegrasyon/varlikAktarim.ts · dosyayiAyristir`. Yani bu kütüphane
doğrudan saldırı yüzeyindedir.

SheetJS npm'e yayın yapmayı **0.18.5**'te bıraktı ve dağıtımını kendi
sitesine taşıdı. npm kayıt defterindeki en yeni sürüm hâlâ 0.18.5'tir ve
iki yüksek önemde açık taşır:

| Açık | Kapandığı sürüm |
|---|---|
| Prototype Pollution — GHSA-4r6h-8v6p-xvw6 | 0.19.3 |
| ReDoS — GHSA-5pgg-2g8v-p4x9 | 0.20.2 |

`npm audit` bu paket için "No fix available" diyordu ve **doğruydu**:
npm'de düzeltme yok. Üreticinin kendi dağıtımında var.

## Niçin uzak URL değil, depodaki dosya

`package.json` bir süre `https://cdn.sheetjs.com/...` tarball'ına işaret
etti. Bu, npm'i Nexus/Artifactory üzerinden proxy'leyen ve dışarı çıkışı
kısıtlı bir koşucuda **kurulumu kırar**. Depodaki dosya her yerde kurulur
ve kimseden ağ izni istemez.

Bedeli 2,3 MB'lık bir ikili ve elle yapılacak sürüm yükseltmesidir.

## Kökeni ve bütünlüğü

Dosya `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` adresinden
indirildi (2026-09-02). Lisans **Apache-2.0** (SheetJS Community Edition),
sürümle birlikte değişmedi.

```
sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==
```

Bu özet `package-lock.json` içinde de yazılıdır ve oraya npm tarafından,
dosya HENÜZ cdn.sheetjs.com'dan inerken yazıldı. Depodaki kopya sonradan
konuldu ve özeti aynı çıktı — yani buradaki dosya üreticinin yayımladığı
dosyanın aynısıdır.

`tests/bagimlilik-guvenligi.test.ts` bunu her koşuda yeniden ölçer:
diskteki dosyadan özeti hesaplar ve kilit dosyasındakiyle karşılaştırır.
Dosya sessizce takas edilirse test patlar.

## Sürüm yükseltmek

```bash
# 1. Yeni tarball'ı indir (sürümü değiştir)
curl -O https://cdn.sheetjs.com/xlsx-0.20.4/xlsx-0.20.4.tgz
mv xlsx-0.20.4.tgz web/vendor/

# 2. package.json'daki `file:vendor/...` yolunu yeni dosyaya çevir
# 3. Eskisini sil, kilidi tazele
rm web/vendor/xlsx-0.20.3.tgz
cd web && npm install

# 4. Nöbetçiyi ve ayrıştırma ağını koş
npx vitest run tests/bagimlilik-guvenligi.test.ts tests/xlsx-ayristirma.test.ts
```

`tests/bagimlilik-guvenligi.test.ts` içindeki `TABAN` sabiti de
yükseltilmelidir; o sabit "hangi sürümün altına düşülemez" der ve
düşülürse test kırılır.

## Buraya başka ne konur

Kural dar tutulmalıdır: **yalnız kayıt defterinden alınamayan ve
güvenlik gerekçesi olan bağımlılık.** Kolaylık olsun diye paket
kopyalamak depoyu şişirir ve güncelleme yolunu görünmez kılar.
