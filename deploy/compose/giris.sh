#!/bin/sh
# Kurulum girişi: GÖÇ ÖNCE, sunucu SONRA.
#
# Göç uygulanmadan açılan bir sunucu ilk istekte tablo bulamaz ve kusur
# "uygulama bozuk" diye görünür. Göç başarısızsa sunucu HİÇ AÇILMAZ: yarım
# şemada çalışan bir uyum ürünü, sessizce yanlış cevap veren bir üründür.
#
# Zincir BAĞLANTIDAN seçilir (`arac/goc-uygula.mjs`): PostgreSQL taban göçü
# ya da SQLite zinciri. Kurulum hangisiyse o.
set -eu

echo "[giriş] göç uygulanıyor…"
node arac/goc-uygula.mjs

echo "[giriş] sunucu başlıyor (port ${PORT:-3000})"
exec ./node_modules/.bin/next start -p "${PORT:-3000}"
