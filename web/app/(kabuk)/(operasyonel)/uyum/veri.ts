import 'server-only';
import { db } from '@/lib/db';
import { uyumOzeti } from '@/lib/sabitler';
import { kuralDegerlendir } from '@/lib/motorlar/uygulanabilirlik';
import type { Durum } from '@/components/kabuk/temel';
import {
  DURUM_IM, anlikSayimi, cerceveAdi, guc, kisaAile, kisaKod, kisaTarih, tekCumle,
} from './mantik';
import type {
  Aile, CerceveVerisi, KapsamKaydi, Kontrol, KuruSatir, TesisSatiri, TrendNoktasi, Zincir,
} from './mantik';

/* O1 · O2 sunucu yükleyicisi.

   İki ekran AYNI kütüğü okur: O1 (santral × aile matrisi) ile O2 (çerçeve
   içinde aile → alt madde ağacı) tek `CerceveVerisi` üzerinden türetilir.
   Böylece bir hücrenin işaretçisi ile aynı kontrolün detaydaki işaretçisi
   ayrışamaz.

   KAPSAM KURALI (iş mantığı — ekran bunu ezmez):
   Bir santralin matriste satırı olması için (a) çerçevenin yürüyen uyum
   sürecinin kapsamında olması ve (b) `UygulanabilirlikKarari` ile kapsam
   dışına alınmamış olması gerekir. Motorun "kapsam dışı" kararı ekranda
   geçersiz kılınmaz; kapsam dışı ve kararsız tesisler ayrı ve sessiz
   gösterilir. */

const GUN = 86_400_000;

/* Zincir kotası: çekmece bir kayıt listesi değil, bir HİKÂYEDİR —
   risk → bulgu → proje üçlüsü okunur kalmalı (02-components §10). */
const ZINCIR_RISK = 2;
const ZINCIR_BULGU = 2;
const ZINCIR_PROJE = 2;

/* ── kural özeti ────────────────────────────────────────────────────── */

type Kosul = { alan: string; islec: string; deger: unknown };
type KuralJson = { herhangi?: Kosul[]; hepsi?: Kosul[] };

const ALAN_ADI: Record<string, string> = {
  kuruluGucMw: 'kurulu güç',
  blackStart: 'black-start',
  teiasScadaEmsSeriOlmayan: 'TEİAŞ SCADA/EMS (seri hariç)',
  teiasScadaEms: 'TEİAŞ SCADA/EMS',
  kritikAltyapiStatusu: 'kritik altyapı',
  seriHaberlesme: 'seri haberleşme',
};

function kosulYazisi(k: Kosul): string {
  const ad = ALAN_ADI[k.alan] ?? k.alan;
  if (typeof k.deger === 'boolean') return k.deger ? ad : `${ad} yok`;
  return `${ad} ${k.islec} ${k.deger}`;
}

function kuralOzeti(kosulJson: string): { satir: string; tam: string } {
  try {
    const kural = JSON.parse(kosulJson) as KuralJson;
    const liste = kural.herhangi ?? kural.hepsi ?? [];
    const baglac = kural.herhangi ? ' VEYA ' : ' VE ';
    return {
      satir: liste.map(kosulYazisi).join(' · '),
      tam: `EĞER ${liste.map(kosulYazisi).join(baglac)} → KAPSAMDA. `
        + `Değilse kapsam dışı; alanı bilinmeyen tesiste karar üretilmez.`,
    };
  } catch {
    return { satir: 'Kural okunamadı', tam: kosulJson.slice(0, 200) };
  }
}

/* ── yardımcılar ────────────────────────────────────────────────────── */

const SUREC_ONCELIGI: Record<string, number> = {
  aktif: 0, planlandi: 1, tamamlandi: 2, pasif: 3,
};

function tesisAlt(
  t: { kuruluGucMw: number | null; tip: { kod: string } | null; konum: string | null },
): string {
  const mw = guc(t.kuruluGucMw);
  if (mw) return mw;
  const yedek = [t.tip?.kod.toLocaleLowerCase('tr-TR'), t.konum].filter(Boolean).join(' · ');
  return yedek || '—';
}

/** Yaprak = alt maddesi olmayan madde. Kök maddenin alt maddesi yoksa kendisi yapraktır. */
function yapraklariTopla(
  kokId: string,
  cocuklar: Map<string, { id: string; kod: string; baslik: string; sira: number }[]>,
): { id: string; kod: string; baslik: string; sira: number }[] {
  const alt = cocuklar.get(kokId) ?? [];
  if (alt.length === 0) return [];
  const sonuc: { id: string; kod: string; baslik: string; sira: number }[] = [];
  for (const c of alt) {
    const torun = yapraklariTopla(c.id, cocuklar);
    if (torun.length === 0) sonuc.push(c);
    else sonuc.push(...torun);
  }
  return sonuc;
}

/* ── ana yükleyici ──────────────────────────────────────────────────── */

export async function cerceveleriYukle(
  izinliTesisler: string[] | null,
): Promise<CerceveVerisi[]> {
  const simdi = Date.now();

  const [regulasyonlar, tesisler, riskler, projeBaglantilari, eslestirmeler, denetimler] =
    await Promise.all([
      db.regulasyon.findMany({
        where: { aktif: true },
        orderBy: { kod: 'asc' },
        include: {
          maddeler: {
            where: { silindi: null, OR: [{ surum: { durum: 'aktif' } }, { surumId: null }] },
            orderBy: [{ sira: 'asc' }, { kod: 'asc' }],
          },
          surecler: { include: { kapsam: true } },
          kararlar: true,
          kurallar: { where: { aktif: true }, orderBy: { surum: 'desc' } },
          surumler: { where: { durum: 'aktif' }, take: 1 },
        },
      }),
      db.tesis.findMany({
        where: { durum: 'aktif' },
        include: { tip: true, profil: true },
        orderBy: [{ kuruluGucMw: 'desc' }, { ad: 'asc' }],
      }),
      db.risk.findMany({
        where: { silindi: null },
        select: {
          id: true, kod: true, baslik: true, durum: true, artikRisk: true,
          tesisId: true, bulguId: true, kontroller: { select: { maddeId: true } },
        },
      }),
      db.projeBaglantisi.findMany({
        where: { proje: { silindi: null } },
        select: {
          maddeId: true, bulguId: true, riskId: true,
          proje: { select: { id: true, kod: true, ad: true, durum: true, hedef: true } },
        },
      }),
      db.maddeEslestirmesi.findMany({
        include: {
          kaynak: { select: { regulasyonId: true } },
          hedef: { select: { regulasyonId: true } },
        },
      }),
      db.denetim.findMany({
        where: { silindi: null, durum: { not: 'kapanis' } },
        orderBy: { olusturuldu: 'desc' },
        select: { id: true, kod: true, ad: true, durum: true, surecId: true },
      }),
    ]);

  const regKodlari = new Map(regulasyonlar.map((r) => [r.id, r.kod]));

  /* Yürüyen süreçlerin madde durumları — sistemin en sık okunan tablosu,
     tek sorguda çekilip bellekte indekslenir. */
  const secilenSurecler = new Map<string, (typeof regulasyonlar)[number]['surecler'][number]>();
  for (const r of regulasyonlar) {
    const sirali = [...r.surecler].sort((a, b) => {
      const f = (SUREC_ONCELIGI[a.durum] ?? 9) - (SUREC_ONCELIGI[b.durum] ?? 9);
      if (f !== 0) return f;
      return (b.baslangic?.getTime() ?? 0) - (a.baslangic?.getTime() ?? 0);
    });
    if (sirali[0]) secilenSurecler.set(r.id, sirali[0]);
  }
  const surecIdleri = [...secilenSurecler.values()].map((s) => s.id);

  const durumlar = surecIdleri.length === 0 ? [] : await db.maddeDurumu.findMany({
    where: { surecId: { in: surecIdleri } },
    include: {
      sorumlu: { select: { adSoyad: true } },
      kanitBaglantilari: {
        include: {
          kanit: { select: { id: true, ad: true, gecerliBitis: true, silindi: true } },
        },
      },
      bulgular: {
        where: { silindi: null },
        select: {
          id: true, baslik: true, durum: true, onemDerecesi: true, hedefTarih: true,
        },
      },
    },
  });

  const durumHaritasi = new Map<string, (typeof durumlar)[number]>();
  for (const d of durumlar) durumHaritasi.set(`${d.tesisId}::${d.maddeId}`, d);

  /* Zincir indeksleri */
  const riskMaddeye = new Map<string, typeof riskler>();
  for (const r of riskler) {
    for (const k of r.kontroller) {
      const liste = riskMaddeye.get(k.maddeId) ?? [];
      liste.push(r);
      riskMaddeye.set(k.maddeId, liste);
    }
  }
  const riskBulguya = new Map<string, typeof riskler>();
  for (const r of riskler) {
    if (!r.bulguId) continue;
    const liste = riskBulguya.get(r.bulguId) ?? [];
    liste.push(r);
    riskBulguya.set(r.bulguId, liste);
  }
  type ProjeKaydi = (typeof projeBaglantilari)[number]['proje'];
  const projeMaddeye = new Map<string, ProjeKaydi[]>();
  const projeBulguya = new Map<string, ProjeKaydi[]>();
  const projeRiske = new Map<string, ProjeKaydi[]>();
  for (const b of projeBaglantilari) {
    if (b.maddeId) projeMaddeye.set(b.maddeId, [...(projeMaddeye.get(b.maddeId) ?? []), b.proje]);
    if (b.bulguId) projeBulguya.set(b.bulguId, [...(projeBulguya.get(b.bulguId) ?? []), b.proje]);
    if (b.riskId) projeRiske.set(b.riskId, [...(projeRiske.get(b.riskId) ?? []), b.proje]);
  }

  const sonuc = regulasyonlar.map((reg) => {
    const kisa = (kod: string) => kisaKod(kod, reg.kod);

    /* ── madde ağacı ─────────────────────────────────────────────── */
    const cocuklar = new Map<string, { id: string; kod: string; baslik: string; sira: number }[]>();
    for (const m of reg.maddeler) {
      if (!m.ustMaddeId) continue;
      const liste = cocuklar.get(m.ustMaddeId) ?? [];
      liste.push({ id: m.id, kod: m.kod, baslik: m.baslik, sira: m.sira });
      cocuklar.set(m.ustMaddeId, liste);
    }
    const maddeHaritasi = new Map(reg.maddeler.map((m) => [m.id, m]));
    const kokler = reg.maddeler.filter((m) => !m.ustMaddeId);

    const aileler: Aile[] = kokler.map((k) => {
      const ham = yapraklariTopla(k.id, cocuklar);
      const yapraklar = (ham.length > 0 ? ham : [{ id: k.id, kod: k.kod, baslik: k.baslik, sira: k.sira }])
        .sort((a, b) => a.sira - b.sira || a.kod.localeCompare(b.kod, 'tr'));
      return {
        id: k.id,
        kod: k.kod,
        kisaKod: kisa(k.kod),
        baslik: k.baslik,
        kisa: kisaAile(k.baslik),
        metin: k.metin,
        yapraklar: yapraklar.map((y) => ({
          id: y.id, kod: y.kod, kisaKod: kisa(y.kod), baslik: y.baslik,
        })),
      };
    });

    /* ── kapsam: motor kararı + süreç kapsamı ────────────────────── */
    const surec = secilenSurecler.get(reg.id) ?? null;
    const kararHaritasi = new Map(reg.kararlar.map((k) => [k.tesisId, k]));
    const surecKapsami = new Set((surec?.kapsam ?? []).map((k) => k.tesisId));

    const kapsam: KapsamKaydi[] = [];
    const kapsamdakiTesisler: typeof tesisler = [];
    for (const t of tesisler) {
      if (izinliTesisler && !izinliTesisler.includes(t.id)) continue;
      const karar = kararHaritasi.get(t.id);
      const alt = tesisAlt(t);
      const ortak = {
        tesisId: t.id, kod: t.kod, ad: t.ad, alt, yol: `/tesisler/${t.id}`,
        elIle: karar?.elIleDegistirildi ?? false,
      };
      if (karar?.uygulanabilir === false) {
        kapsam.push({ ...ortak, durum: 'disarida', gerekce: karar.gerekce });
        continue;
      }
      if (karar?.uygulanabilir === true || surecKapsami.has(t.id)) {
        kapsamdakiTesisler.push(t);
        kapsam.push({
          ...ortak,
          durum: 'kapsamda',
          gerekce: karar?.elIleDegistirildi
            ? (karar.degistirmeGerekcesi ?? karar.gerekce)
            : karar?.gerekce
              ?? (surec ? `${surec.kod} kapsamına alındı; motor kararı yok.` : 'Kapsam kararı yok.'),
        });
        continue;
      }
      kapsam.push({
        ...ortak,
        durum: 'kararsiz',
        gerekce: karar?.gerekce ?? 'Kapsam kararı üretilmedi — santral profili eksik.',
      });
    }

    /* ── satırlar: yalnız kapsamdaki tesisler ────────────────────── */
    const dolmusKanitlar = new Set<string>();   // metrik: geçerliliği bitmiş kanıt
    const satirlar: TesisSatiri[] = kapsamdakiTesisler.map((t) => {
      const kontroller: Kontrol[] = [];
      for (const aile of aileler) {
        for (const y of aile.yapraklar) {
          const d = durumHaritasi.get(`${t.id}::${y.id}`);
          const madde = maddeHaritasi.get(y.id);
          const ham = d?.durum ?? 'degerlendirilmedi';

          /* kanıt */
          const kanitlar = (d?.kanitBaglantilari ?? [])
            .map((kb) => kb.kanit).filter((k) => !k.silindi);
          const dolmusListe = kanitlar.filter(
            (k) => k.gecerliBitis != null && k.gecerliBitis.getTime() < simdi);
          for (const k of dolmusListe) dolmusKanitlar.add(k.id);
          const dolmus = dolmusListe.length;
          let kanitYazi: string;
          let kanitIm: Durum;
          if (kanitlar.length === 0) {
            kanitYazi = 'yok';
            kanitIm = ham === 'uyumlu' || ham === 'kismi' ? 'bd' : 'unk';
          } else if (dolmus > 0) {
            kanitYazi = `${kanitlar.length} · ${dolmus} süresi doldu`;
            kanitIm = 'bd';
          } else if (d?.kanitBayat) {
            kanitYazi = `${kanitlar.length} · yenilenmeli`;
            kanitIm = 'md';
          } else {
            kanitYazi = `${kanitlar.length}`;
            kanitIm = 'ok';
          }

          /* termin: önce bulgunun hedefi, yoksa bir sonraki inceleme */
          const acikBulgu = (d?.bulgular ?? [])
            .filter((b) => b.durum === 'acik' || b.durum === 'aksiyonda')
            .sort((a, b) => (a.hedefTarih?.getTime() ?? Infinity) - (b.hedefTarih?.getTime() ?? Infinity))[0];
          let termin = '—';
          let terminIm: Durum | null = 'unk';
          if (acikBulgu?.hedefTarih) {
            termin = `${kisaTarih(acikBulgu.hedefTarih)} · bulgu`;
            terminIm = acikBulgu.hedefTarih.getTime() < simdi ? 'bd' : 'md';
          } else if (d?.sonDegerlendirme) {
            const sonraki = d.sonDegerlendirme.getTime()
              + (madde?.varsayilanIncelemeGunu ?? 180) * GUN;
            termin = `${kisaTarih(new Date(sonraki))} · inceleme`;
            terminIm = sonraki < simdi ? 'md' : 'ok';
          }

          /* zincir: risk → bulgu → proje */
          const bulguIdleri = (d?.bulgular ?? []).map((b) => b.id);
          const riskAdaylari = [
            ...(riskMaddeye.get(y.id) ?? []),
            ...bulguIdleri.flatMap((b) => riskBulguya.get(b) ?? []),
          ].filter((r) => r.tesisId == null || r.tesisId === t.id);
          const riskGorulen = new Set<string>();
          const zincir: Zincir[] = [];
          for (const r of riskAdaylari) {
            if (riskGorulen.has(r.id) || zincir.length >= ZINCIR_RISK) continue;
            riskGorulen.add(r.id);
            zincir.push({
              id: `risk-${r.id}`, kod: r.kod, yol: `/riskler/${r.id}`,
              alt: `risk · ${r.artikRisk != null ? `artık ${r.artikRisk}` : 'skor yok'}`,
            });
          }
          for (const b of (d?.bulgular ?? []).slice(0, ZINCIR_BULGU)) {
            zincir.push({
              id: `bulgu-${b.id}`, kod: tekCumle(b.baslik, 46), yol: `/bulgular/${b.id}`,
              alt: `bulgu · ${b.onemDerecesi} · ${kisaTarih(b.hedefTarih)}`,
            });
          }
          /* Doğrudan bu kontrole/bulguya bağlı projeler önce gelir; risk
             üzerinden dolaylı bağlananlar zinciri şişirmesin diye kırpılır. */
          const projeler = [
            ...(projeMaddeye.get(y.id) ?? []),
            ...bulguIdleri.flatMap((b) => projeBulguya.get(b) ?? []),
            ...[...riskGorulen].flatMap((r) => projeRiske.get(r) ?? []),
          ];
          const projeGorulen = new Set<string>();
          let projeSayisi = 0;
          for (const p of projeler) {
            if (projeGorulen.has(p.id) || projeSayisi >= ZINCIR_PROJE) continue;
            projeGorulen.add(p.id);
            projeSayisi += 1;
            zincir.push({
              id: `proje-${p.id}`, kod: p.kod, yol: '/projeler',
              alt: `proje · ${p.ad}`,
              suren: p.durum === 'devam',
            });
          }

          /* tek cümle gerekçe */
          const gerekce = d?.not?.trim()
            || acikBulgu?.baslik
            || (madde?.metin ? tekCumle(madde.metin) : 'Bu kontrol için değerlendirme kaydı yok.');

          /* tek satırlık hücre ipucu — durum SÖZCÜĞÜ geçmez, olgu geçer */
          const olgu = acikBulgu ? tekCumle(acikBulgu.baslik, 42)
            : d?.not ? tekCumle(d.not, 42)
              : d?.sonDegerlendirme ? `son değerlendirme ${kisaTarih(d.sonDegerlendirme)}`
                : 'değerlendirme kaydı yok';
          const ilkProje = zincir.find((z) => z.id.startsWith('proje-'));
          const ipucu = ham === 'kapsamdisi'
            ? `${kisa(y.kod)} · bu tesiste kapsam dışı`
            : [
                kisa(y.kod), olgu,
                kanitlar.length === 0 ? 'kanıt yok' : `kanıt ${kanitYazi}`,
                ilkProje?.kod,
              ].filter(Boolean).join(' · ');

          kontroller.push({
            anahtar: `${t.id}::${y.id}`,
            maddeId: y.id,
            aileId: aile.id,
            kod: y.kod,
            kisaKod: y.kisaKod,
            baslik: y.baslik,
            ham,
            im: DURUM_IM[ham] ?? 'unk',
            maddeDurumuId: d?.id ?? null,
            gerekce,
            kanitYazi,
            kanitIm,
            sahip: d?.sorumlu?.adSoyad ?? null,
            termin,
            terminIm,
            guven: d?.guven ?? 'kanit_yok',
            sonDegerlendirme: d?.sonDegerlendirme?.toISOString() ?? null,
            zincir,
            ipucu,
          });
        }
      }
      return { id: t.id, kod: t.kod, ad: t.ad, alt: tesisAlt(t), kontroller };
    });

    /* ── metrikler: kapsam içi hücrelerden, kapsamdisi hariç ─────── */
    const tumKontroller = satirlar.flatMap((s) => s.kontroller);
    const sayilar: Record<string, number> = {};
    for (const k of tumKontroller) sayilar[k.ham] = (sayilar[k.ham] ?? 0) + 1;
    const ozet = uyumOzeti(sayilar);
    const degerlendirilebilir = tumKontroller.filter((k) => k.ham !== 'kapsamdisi');
    const kanitli = degerlendirilebilir.filter((k) => k.kanitYazi !== 'yok').length;
    const kanitDoldu = dolmusKanitlar.size;

    /* ── kural + kuru çalıştırma ─────────────────────────────────── */
    const kuralKaydi = reg.kurallar[0] ?? null;
    const ozetKural = kuralKaydi ? kuralOzeti(kuralKaydi.kosulJson) : null;
    const sonHesap = reg.kararlar.length
      ? new Date(Math.max(...reg.kararlar.map((k) => k.hesaplandi.getTime()))).toISOString()
      : null;

    let kuru: CerceveVerisi['kuru'] = null;
    if (kuralKaydi) {
      const kuruSatirlar: KuruSatir[] = tesisler.map((t) => {
        const mevcut = kararHaritasi.get(t.id);
        if (mevcut?.elIleDegistirildi) {
          return {
            tesisId: t.id, ad: t.ad, kod: t.kod, sonuc: 'override',
            yazi: mevcut.uygulanabilir ? 'kapsamda kalır' : 'kapsam dışı kalır',
            gerekce: mevcut.degistirmeGerekcesi ?? mevcut.gerekce,
          };
        }
        const profil = t.profil
          ? JSON.parse(JSON.stringify(t.profil)) as Record<string, unknown> : null;
        const sonuc = kuralDegerlendir(kuralKaydi.kosulJson, t, profil);
        if (sonuc.uygulanabilir === null) {
          return {
            tesisId: t.id, ad: t.ad, kod: t.kod, sonuc: 'kararsiz',
            yazi: 'karar üretilemez', gerekce: sonuc.gerekce,
          };
        }
        const hedef = sonuc.uygulanabilir ? 'kapsamda' : 'kapsam dışı';
        if (!mevcut) {
          return {
            tesisId: t.id, ad: t.ad, kod: t.kod, sonuc: 'yeni',
            yazi: `yeni karar · ${hedef}`, gerekce: sonuc.gerekce,
          };
        }
        if (mevcut.uygulanabilir !== sonuc.uygulanabilir) {
          return {
            tesisId: t.id, ad: t.ad, kod: t.kod, sonuc: 'degisir',
            yazi: `${mevcut.uygulanabilir ? 'kapsamda' : 'kapsam dışı'} → ${hedef}`,
            gerekce: sonuc.gerekce,
          };
        }
        return {
          tesisId: t.id, ad: t.ad, kod: t.kod, sonuc: 'ayni',
          yazi: `${hedef} · değişmez`, gerekce: sonuc.gerekce,
        };
      });
      const say = (s: KuruSatir['sonuc']) => kuruSatirlar.filter((x) => x.sonuc === s).length;
      kuru = {
        satirlar: kuruSatirlar,
        ozet: [
          `${say('yeni')} yeni`, `${say('degisir')} değişir`, `${say('ayni')} aynı`,
          `${say('kararsiz')} kararsız`, `${say('override')} el ile`,
        ].join(' · '),
      };
    }

    /* ── eşleştirme (crosswalk) özeti ────────────────────────────── */
    const eslesme = new Map<string, { sayi: number; denklikler: Set<string> }>();
    for (const e of eslestirmeler) {
      const karsi = e.kaynak.regulasyonId === reg.id ? e.hedef.regulasyonId
        : e.hedef.regulasyonId === reg.id ? e.kaynak.regulasyonId : null;
      if (!karsi) continue;
      const kod = regKodlari.get(karsi);
      if (!kod) continue;
      const kayit = eslesme.get(kod) ?? { sayi: 0, denklikler: new Set<string>() };
      kayit.sayi += 1;
      kayit.denklikler.add(e.denklik);
      eslesme.set(kod, kayit);
    }

    const denetim = surec
      ? denetimler.find((d) => d.surecId === surec.id) ?? null
      : null;

    return {
      id: reg.id,
      kod: reg.kod,
      gorunenAd: cerceveAdi(reg.kod),
      ad: reg.ad,
      surum: reg.surum,
      // Sürüm gösterimi: önce regülasyonun kendi sürümü (2024, VII-128.9),
      // sonra aktif FrameworkSurumu etiketi. "mevcut" gibi yer tutucular sona düşer.
      surumEtiketi: reg.surum ?? reg.surumler[0]?.surumEtiketi ?? null,
      yururluk: reg.yururlukTarih?.toISOString() ?? null,
      aileler,
      satirlar,
      kapsam,
      toplamAktifTesis: kapsam.length,
      surec: surec ? {
        id: surec.id, kod: surec.kod, ad: surec.ad, durum: surec.durum,
        baslangic: surec.baslangic?.toISOString() ?? null,
        bitis: surec.bitis?.toISOString() ?? null,
        kalanGun: surec.bitis
          ? Math.round((surec.bitis.getTime() - simdi) / GUN) : null,
      } : null,
      denetim,
      metrikler: {
        uyumYuzde: ozet.yuzde,
        bilinmeyenYuzde: ozet.bilinmeyenOran,
        kanitYuzde: degerlendirilebilir.length
          ? Math.round((kanitli / degerlendirilebilir.length) * 100) : null,
        kanitsiz: degerlendirilebilir.length - kanitli,
        kanitDoldu,
        uyumsuz: sayilar.uyumsuz ?? 0,
        kismi: sayilar.kismi ?? 0,
        uyumlu: sayilar.uyumlu ?? 0,
        acik: (sayilar.uyumsuz ?? 0) + (sayilar.kismi ?? 0) + ozet.bilinmeyen,
        bilinmeyen: ozet.bilinmeyen,
        degerlendirilen: ozet.degerlendirilen,
        maddeSayisi: reg.maddeler.length,
        yaprakSayisi: aileler.reduce((a, x) => a + x.yapraklar.length, 0),
        kapsamdakiTesis: satirlar.length,
      },
      kural: kuralKaydi && ozetKural ? {
        id: kuralKaydi.id, ad: kuralKaydi.ad, surum: kuralKaydi.surum,
        satir: ozetKural.satir, tam: ozetKural.tam, aciklama: kuralKaydi.aciklama,
        sonHesap, elIleSayisi: reg.kararlar.filter((k) => k.elIleDegistirildi).length,
      } : null,
      eslestirme: [...eslesme.entries()]
        .map(([hedef, v]) => ({
          hedef: cerceveAdi(hedef), sayi: v.sayi,
          denklik: [...v.denklikler].join('/'),
        }))
        .sort((a, b) => b.sayi - a.sayi),
      kuru,
    };
  });

  /* Filtre sırası = ağırlık sırası: en çok tesise dokunan çerçeve önce gelir,
     böylece varsayılan seçim de en canlı çerçeve olur (03-screens O1). */
  return sonuc.sort((a, b) =>
    b.satirlar.length - a.satirlar.length
    || b.metrikler.maddeSayisi - a.metrikler.maddeSayisi
    || a.kod.localeCompare(b.kod, 'tr'));
}

/** O2 tek çerçeve okur; O1 hepsini okur (dördü de küçük). */
export async function cerceveYukle(
  kod: string, izinliTesisler: string[] | null,
): Promise<CerceveVerisi | null> {
  const hepsi = await cerceveleriYukle(izinliTesisler);
  return hepsi.find((c) => c.kod === kod) ?? null;
}

/* ── C15 · Eğilim şeridi ────────────────────────────────────────────
   Her süreç için son TREND_ADET anlık görüntü, eskiden yeniye. Eğilim
   UYDURULMAZ: kayıt yoksa istemci "henüz anlık görüntü yok" satırı basar,
   boş bir grafik değil.

   KAPSAM: süreç geneli anlıklar (`tesisId: null`) ile izinli santralin
   kendi anlıkları okunur; kapsam daraltılmış kullanıcı için süreç geneli
   nokta yine de gösterilir — o bir toplamdır, başka bir santralin satırı
   değil (kök ekran da aynı kuralı uygular). Süreç + gün başına birden çok
   kayıt varsa (santral başına anlık) sayımlar TOPLANIR; böylece nokta
   "o günün kapsamı" olur, keyfi bir santralinki değil. */
const TREND_ADET = 12;

export async function uyumTrendiYukle(
  izinliTesisler: string[] | null,
): Promise<TrendNoktasi[]> {
  /* Pencere SÜREÇ BAŞINA açılır: tek ortak `take` olsaydı her gün çok
     santral yazan bir süreç ötekilerin eski noktalarını pencereden düşürür,
     şerit sessizce kısalırdı. Süreç başına gereken satır sayısı en çok
     TREND_ADET gün × (1 genel + izinli santral) kayıttır; aynı gün yinelenen
     koşular için iki kat pay bırakılır. */
  const kapsam = izinliTesisler === null ? {} : {
    OR: [{ tesisId: null }, { tesisId: { in: izinliTesisler } }],
  };
  const [surecler, tesisSayisi] = await Promise.all([
    db.uyumSureci.findMany({ select: { id: true } }),
    izinliTesisler === null ? db.tesis.count() : Promise.resolve(izinliTesisler.length),
  ]);
  const pencere = TREND_ADET * (1 + tesisSayisi) * 2;
  const kayitlar = (await Promise.all(surecler.map((s) => db.uyumAnlik.findMany({
    where: { surecId: s.id, ...kapsam },
    select: { surecId: true, tesisId: true, tarih: true, ozetJson: true },
    orderBy: { tarih: 'desc' },
    take: pencere,
  })))).flat();

  /* Süreç geneli kayıt (tesisId null) varsa o gün için santral kayıtları
     çift sayım olur — geneli olan günde yalnız genel alınır. */
  const gunler = new Map<string, { surecId: string; zaman: number; genel: boolean; sayim: Record<string, number> }>();
  for (const k of kayitlar) {
    const sayim = anlikSayimi(k.ozetJson);
    if (!sayim) continue;
    const gun = k.tarih.toISOString().slice(0, 10);
    const anahtar = `${k.surecId}|${gun}`;
    const genel = k.tesisId === null;
    const onceki = gunler.get(anahtar);
    if (!onceki) { gunler.set(anahtar, { surecId: k.surecId, zaman: k.tarih.getTime(), genel, sayim: { ...sayim } }); continue; }
    if (onceki.genel && !genel) continue;
    if (genel && !onceki.genel) { onceki.genel = true; onceki.sayim = { ...sayim }; onceki.zaman = k.tarih.getTime(); continue; }
    for (const [d, n] of Object.entries(sayim)) onceki.sayim[d] = (onceki.sayim[d] ?? 0) + n;
    onceki.zaman = Math.max(onceki.zaman, k.tarih.getTime());
  }

  const surecBasina = new Map<string, TrendNoktasi[]>();
  const sirali = [...gunler.values()].sort((a, b) => b.zaman - a.zaman);
  for (const g of sirali) {
    const liste = surecBasina.get(g.surecId) ?? [];
    if (liste.length >= TREND_ADET) continue;
    const ozet = uyumOzeti(g.sayim);
    const tarih = new Date(g.zaman);
    liste.push({
      surecId: g.surecId,
      tarih: tarih.toISOString(),
      etiket: kisaTarih(tarih),
      yuzde: ozet.yuzde,
      degerlendirilen: ozet.degerlendirilen,
      bilinmeyen: ozet.bilinmeyen,
    });
    surecBasina.set(g.surecId, liste);
  }
  // Eskiden yeniye: şerit soldan sağa zaman okur.
  return [...surecBasina.values()].flatMap((l) => l.reverse());
}

/** Sadece kod listesi — generateStaticParams için. */
export async function cerceveKodlari(): Promise<string[]> {
  const r = await db.regulasyon.findMany({ where: { aktif: true }, select: { kod: true } });
  return r.map((x) => x.kod);
}
