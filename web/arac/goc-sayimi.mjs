#!/usr/bin/env node
/* GÖÇ SAYIMI — göç öncesi/sonrası SAYISAL EŞİTLİK (K3 · veri kaybı yok).

   Bir şema göçü "veri kaybetmedim" diyorsa bunu ÖLÇMELİDİR. Bu araç bir
   veritabanı dosyasında uyum zincirinin omurga tablolarını sayar ve
   sayımı JSON olarak yazar; göç öncesi ve sonrası çıktı karşılaştırılır.

   Sayılanlar tablo adına değil KAVRAMA bağlıdır: "madde durumu sayısı",
   "madde durumunun özne başına dağılımı". Göç kolon adını değiştirir
   (`tesisId` → `kapsamOgesiId`); sayım her iki şemada da aynı kavramı
   bulur, yoksa "ölçülmedi" der — sıfır yazmaz.

   Kullanım:  node arac/goc-sayimi.mjs <db.sqlite> [cikti.json]        */
import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';

const yol = process.argv[2];
if (!yol) { console.error('kullanım: node arac/goc-sayimi.mjs <db> [cikti.json]'); process.exit(2); }
const db = new Database(yol, { readonly: true });

const kolonVar = (tablo, kolon) =>
  db.prepare(`pragma table_info(${JSON.stringify(tablo)})`).all().some((k) => k.name === kolon);
const tabloVar = (tablo) =>
  !!db.prepare("select 1 from sqlite_master where type='table' and name=?").get(tablo);
const say = (sql) => db.prepare(sql).get().n;

/* Öznenin adı iki şemada farklı: eski `tesisId`, yeni `kapsamOgesiId`.
   Dağılım öğe KODUNA göre verilir ki iki taraf karşılaştırılabilsin —
   yeni şemada tesis öğesinin kodu tesisin koduyla aynıdır (göç böyle
   kurar). */
function ozneKodu(tablo) {
  if (kolonVar(tablo, 'kapsamOgesiId')) {
    return { join: `join KapsamOgesi o on o.id = t.kapsamOgesiId`, kod: 'o.kod' };
  }
  if (kolonVar(tablo, 'tesisId')) {
    return { join: `join Tesis o on o.id = t.tesisId`, kod: 'o.kod' };
  }
  return null;
}

/* Kanıt bağı tablosu göçle ad değiştirdi (KanitTesis → KanitKapsami);
   sayım KAVRAMI sayar, adı değil — iki ad aynı satıra yazılır. */
const ESAD = { KanitTesis: 'KanitKapsami' };
const OMURGA = ['SurecKapsami', 'MaddeDurumu', 'UygulanabilirlikKarari', 'Istisna',
  'KanitTesis', 'DenetciKapsami', 'DegerlendirmeAktarimi', 'UyumAnlik', 'Yetki'];
const gercekAd = (t) => (tabloVar(t) ? t : (ESAD[t] && tabloVar(ESAD[t]) ? ESAD[t] : t));

const sonuc = { db: yol, zaman: new Date().toISOString(), tablolar: {}, dagilim: {}, profil: {} };
for (const kavram of OMURGA) {
  const t = gercekAd(kavram);
  if (!tabloVar(t)) { sonuc.tablolar[kavram] = 'ölçülmedi (tablo yok)'; continue; }
  sonuc.tablolar[kavram] = say(`select count(*) n from ${JSON.stringify(t)}`);
  const oz = ozneKodu(t);
  if (!oz) { sonuc.dagilim[kavram] = 'ölçülmedi (özne kolonu yok)'; continue; }
  const rows = db.prepare(`select ${oz.kod} k, count(*) n from ${JSON.stringify(t)} t ${oz.join} group by ${oz.kod} order by ${oz.kod}`).all();
  sonuc.dagilim[kavram] = Object.fromEntries(rows.map((r) => [r.k, r.n]));
  /* Öznesi çözülemeyen satır = kayıp aday; sıfır olmalı. */
  const nullCol = kolonVar(t, 'kapsamOgesiId') ? 'kapsamOgesiId' : 'tesisId';
  sonuc.dagilim[`${kavram}·öznesiz`] = say(`select count(*) n from ${JSON.stringify(t)} where ${nullCol} is null`);
}

/* B2 · TesisProfili'nin enerji kolonları öznitelik olur: dolu değer
   sayısı iki tarafta eşit olmalı. Eski şema: profil kolonu; yeni şema:
   TesisOzellik satırı (aynı anahtar). */
const ENERJI_KOLONLARI = ['lisansTipi', 'lisansNo', 'kabulDurumu', 'kabulTarihi',
  'blackStart', 'teiasScadaEms', 'seriHaberlesme', 'kritiklikSinifi'];
for (const k of ENERJI_KOLONLARI) {
  if (tabloVar('TesisProfili') && kolonVar('TesisProfili', k)) {
    sonuc.profil[k] = say(`select count(*) n from TesisProfili where ${JSON.stringify(k)} is not null`);
  } else if (tabloVar('TesisOzellik')) {
    sonuc.profil[k] = say(`select count(*) n from TesisOzellik where anahtar = '${k}' and (sayisalDeger is not null or metinDeger is not null)`);
  } else sonuc.profil[k] = 'ölçülmedi';
}
sonuc.tesis = say('select count(*) n from Tesis');
if (tabloVar('KapsamOgesi')) {
  sonuc.kapsamOgesi = say('select count(*) n from KapsamOgesi');
  sonuc.kapsamOgesiTur = Object.fromEntries(db.prepare(
    'select tr.kod k, count(*) n from KapsamOgesi o join KapsamOgesiTuru tr on tr.id = o.turId group by tr.kod').all().map((r) => [r.k, r.n]));
}

const metin = JSON.stringify(sonuc, null, 2);
if (process.argv[3]) { writeFileSync(process.argv[3], metin); console.log(`yazıldı: ${process.argv[3]}`); }
else console.log(metin);
