# Zorlu Enerji Yönetişim Platformu

Türkiye'de elektrik üretimi yapan bir şirketler grubu için **IT/OT Governance,
Compliance & Transformation platformu**. Hedef mimari: `ENERJI_IT_OT_PLATFORM_HEDEF_MIMARI`
referansı. **Güncel durum ve yol haritası için tek kaynak:**
[PRE_INTERNAL_INTEGRATION_READINESS.md](PRE_INTERNAL_INTEGRATION_READINESS.md).
([ARCHITECTURE_GAP_ANALYSIS.md](ARCHITECTURE_GAP_ANALYSIS.md) ve
[ENTEGRASYON_GAP_MATRIX.md](ENTEGRASYON_GAP_MATRIX.md) tarihsel denetim
kayıtlarıdır ve bilerek güncellenmez.)

Çekirdek zincirler veri modelinde uçtan uca bağlıdır:
`Grup → Tüzel Kişi → Santral → Ünite → Sistem/Servis → Varlık` ve
`Framework → Sürüm → Kontrol → Uygulanabilirlik → Assessment → Kanıt → Bulgu → Risk → CAPA → Proje → Bütçe → Doğrulama → Kapanış`.

Modüller: Santral 360 (profil + gerekçeli uygulanabilirlik + birleşik eksikler),
uyum süreçleri, bulgular, risk kütüğü (çok boyutlu etki, süreli/onaylı kabul),
denetim yaşam döngüsü, IT/OT envanteri (CMDB), keşif kuyruğu, ağ topolojisi
sapma tezgâhı, olay → etki zinciri, yedek & DR, tedarikçi uzaktan erişimi,
görev & onay merkezi, projeler + adaylar, regülasyon sürüm/diff motoru,
otomasyon motorları + platform sağlığı, kanıt paketi dışa aktarımı, değişmez
denetim izi.

**Entegrasyon durumu:** ürün hiçbir gerçek kurum sistemine bağlı DEĞİLDİR.
Connector çatısı, kuru koşu, sürümlü eşleme profili, veri kökeni, dead-letter
ve sertifikasyon harness'ı hazırdır; adaptörlerin biri hariç tümü
`kimlik_bekleniyor` döndürür ve çekirdek onları koşturmaz. Sahte "başarılı
entegrasyon" üretilmez. Bağlantı günü sırası:
[INTEGRATION_DAY_RUNBOOK.md](INTEGRATION_DAY_RUNBOOK.md).

**Canlı demo:** https://ahmetrz.github.io/uyumPlatformu/
(statik yayın; yazma işlemleri demo uyarısı verir, gerçek dağıtımda tümü aktiftir)

## Depo yapısı

- `web/` — ürün: Next.js 16 + Prisma 7 (SQLite) + server actions. Tüm tanımlar
  (sektör, tesis kırılımı, tesis, regülasyon, kapsam alanı, süreç) panelden yönetilir.
- `docs/` — tasarım, model ve hazırlık dokümanları: [TASARIM_PLANI](docs/TASARIM_PLANI.md) ·
  [TASARIM_TOKENLARI](docs/TASARIM_TOKENLARI.md) · [ICERIK_MODELI](docs/ICERIK_MODELI.md) ·
  [POSTGRES_READINESS](docs/POSTGRES_READINESS.md) · [PERFORMANS_TABANI](docs/PERFORMANS_TABANI.md) · `tokens.css`
- `web/arac/` — doğrulama araçları: rota duman testi, tasarım denetimi, ekran
  görüntüsü, belge sayımları (`node arac/sayimlar.mjs`)
- `.github/workflows/publish.yml` — `main`'e push'ta ürünü derleyip (`NEXT_PUBLIC_DEMO=1`
  statik dışa aktarım) `gh-pages` dalına yayınlar. `gh-pages` elle düzenlenmez.

## Geliştirme

```bash
cd web
npm install
npm run db:hazirla   # migrasyon + prisma generate + örnek veri
npm run dev          # http://localhost:3000
# geliştirme girişi: ahmet.terzi@zorlu.com / Enerji!2026
#   (örnek veri beş kullanıcı açar; hepsi @zorlu.com ve aynı parola)
```

Güvenlik: oturum tabanlı kimlik doğrulama; RBAC + tesis/süreç kapsamı veri
seviyesinde uygulanır; denetim izi tabloları veritabanı tetikleyicileriyle
değiştirilemez. Sunucu açıkken bir zamanlayıcı dakikada bir tik atar ve NE
KOŞACAĞINI veritabanından TÜRETİR: motorlar saatlik, connector'lar kendi
`pollAralikDk` değerine göre. Vadesi gelmeyen hiçbir şey koşmaz ve koşmayan
her hedef SEBEBİYLE raporlanır (`ISLER_OTOMATIK=0` ile kapatılır); her koşu
Platform sağlığı ekranında izlenir.

Oturum iki eşikle düşer: mutlak 12 saat (etkinlikle uzamaz) ve atıl 2 saat.
Giriş ucunda hesap ve kaynak adres başına oran sınırı vardır; başarısız her
giriş denetim izine sebebiyle yazılır, parola hiçbir biçimde kaydedilmez.

Doğrulama:

```bash
cd web
npx tsc --noEmit && npx eslint . && npx vitest run
npx next build                                  # üretim derlemesi
NEXT_PUBLIC_DEMO=1 npm run demo:build           # statik demo derlemesi
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
node arac/sayimlar.mjs                          # belgelerdeki sayıların kaynağı
PORT=3000 node arac/rota-duman.mjs              # sunucu açıkken: her rota 200 mü
PORT=3000 node arac/denetim.mjs                 # sunucu açıkken: tasarım sözleşmesi
```
