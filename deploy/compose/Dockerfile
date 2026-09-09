# ═══════════════════════════════════════════════════════════════════════
# ÜRÜN İMAJI (P7 · 2.2)
#
# İki aşama: derleme ve koşum. Koşum aşamasında kaynak yoktur.
#
# PRISMA İSTEMCİSİ SAĞLAYICIYA BAĞLIDIR (ölçüldü, R5): `@prisma/adapter-pg`,
# SQLite şemasından üretilmiş istemciyle ÇALIŞMAZ. Bu yüzden imaj
# `arac/pg-istemci.mjs` ile PostgreSQL istemcisini üretir; şema dosyası
# DEĞİŞMEZ, yalnız datasource satırı geçici kopyada çevrilir.
# ═══════════════════════════════════════════════════════════════════════
FROM node:22-bookworm-slim AS derleme
WORKDIR /kaynak

# YEREL EKLENTİ ARAÇ ZİNCİRİ — yalnız DERLEME aşamasında.
# `better-sqlite3` bir C++ eklentisidir. Hazır ikili (`prebuild-install`)
# indirilemediğinde kaynaktan derlenir ve node-gyp `python3` + `make` + `g++`
# ister; slim imajda üçü de yoktur ve npm bunu "gyp ERR! find Python" diye
# raporlar (ölçüldü). Araç zinciri KOŞUM aşamasına GEÇMEZ: koşum aşaması
# derlenmiş `.node` dosyasını `node_modules` ile devralır, derleyiciyi değil —
# üretim imajında derleyici bulundurmak saldırı yüzeyini gereksiz büyütür.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# `vendor/` ÖNCE: `xlsx` yerel bir tarball olarak sabitlenmiştir
# (`package.json` → `file:vendor/xlsx-0.20.3.tgz`). Kopyalanmazsa `npm ci`
# "tarball data … seems to be corrupted" der ve sebep görünmez (ölçüldü).
COPY web/package.json web/package-lock.json ./web/
COPY web/vendor ./web/vendor
# TLS KESEN VEKİL ARKASINDA DERLEME — isteğe bağlı CA sırrı.
# Ölçüldü (9 Eylül 2026): kapsayıcıdaki `npm ci`, kesici vekilin CA'sı
# güven zincirinde olmadığı için `SELF_SIGNED_CERT_IN_CHAIN` alıyor ve npm
# 10.9.8 bunu "Exit handler never called!" diye — yani KENDİ kusuru gibi —
# raporluyor. Sebep npm eşzamanlılığı DEĞİLDİR: aynı kapsayıcıda
# `NODE_EXTRA_CA_CERTS` verilince tek satırlık `npm view` da, bütün `npm ci`
# de geçiyor.
#
# CA bir BuildKit SIRRIDIR: katmana yazılmaz, imajda kalmaz. Sır verilmezse
# bağlama noktası hiç oluşmaz ve adım olduğu gibi koşar — kesici vekili
# olmayan müşteri makinesinde hiçbir şey değişmez:
#   docker build --secret id=ca_demeti,src=/yol/ca-bundle.crt …
RUN --mount=type=secret,id=ca_demeti,target=/tmp/ca-demeti.crt \
  cd web \
  && if [ -s /tmp/ca-demeti.crt ]; then export NODE_EXTRA_CA_CERTS=/tmp/ca-demeti.crt; fi \
  && npm ci --no-audit --no-fund

COPY web ./web
COPY .github ./.github

# PostgreSQL istemcisi + üretim derlemesi. Derleme sırasında veritabanı
# YOKTUR ve olmamalıdır: `instrumentation.ts` derleme fazında ortamı
# doğrulamaz (derleyen makine kurulum ortamı değildir).
RUN cd web \
  && node arac/pg-istemci.mjs \
  && npm run build

# ── koşum ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS kosum
WORKDIR /uygulama
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /uygulama uyum \
  && mkdir -p /veri/kanit && chown -R uyum:uyum /veri

COPY --from=derleme /kaynak/web/package.json ./package.json
COPY --from=derleme /kaynak/web/node_modules ./node_modules
COPY --from=derleme /kaynak/web/.next ./.next
COPY --from=derleme /kaynak/web/public ./public
COPY --from=derleme /kaynak/web/prisma ./prisma
COPY --from=derleme /kaynak/web/arac ./arac
COPY --from=derleme /kaynak/web/lib/prisma-client ./lib/prisma-client
COPY --from=derleme /kaynak/web/paketler ./paketler
COPY deploy/compose/giris.sh /giris.sh

# UYGULAMA ROOT DEĞİLDİR. Kök olarak koşan bir uygulama, kanıt deposundaki
# dosya izinlerini ve kapsayıcı kaçış yüzeyini gereksiz genişletir.
USER uyum
EXPOSE 3000
ENTRYPOINT ["/giris.sh"]
