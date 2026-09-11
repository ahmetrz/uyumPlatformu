import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   ÖLÜ BAĞ BEKÇİSİ — ekranın gösterdiği çıkış GERÇEK OLMALI [SIS-BAG-001]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   ÖLÇÜLDÜ (bağımsız inceleme, Brief L · tur 1): R0-21 kapatılırken on iki
   bölüm notuna "çıkış" eklendi ve bunların ÜÇÜ olmayan bir rotaya
   gidiyordu (`/entegrasyonlar` ×2 · `/varliklar/<id>`). Kodun yanındaki
   yorum "kullanıcıyı çözüme götürür" diyordu; kullanıcı 404 görüyordu.

   Bu, boş durum kuralının (R-G) kendi kendini yiyen hâlidir: "eylemsiz
   boş durum yasak" kuralı, eylemi OLMAYAN bir boşluğa SAHTE eylem
   uydurma baskısı yaratır. Kural yetmedi, kapı gerekti — R-C'de olduğu
   gibi.

   Hiçbir kapı bunu göremiyordu: `rota:duman` envanterdeki rotaları
   gezer, ekranların İÇİNDEKİ bağları değil.

   ── NE ÖLÇÜLÜR ────────────────────────────────────────────────────────
   Kaynakta yazılı her SABİT iç bağ (`href="/..."`), rota envanterinde
   var olan bir yola çözülmelidir. Dinamik bağlar (`href={...}`) bu dişin
   dışındadır ve bu BEYANLI bir sınırdır: değeri çalışma anında doğar,
   statik okuma onu bilemez.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = path.resolve(__dirname, '../..');

/** Rota envanteri — `arac/rotalar.json` tek kaynaktır, elle liste yok. */
function rotalar(): Set<string> {
  const ham = JSON.parse(readFileSync(path.join(KOK, 'arac/rotalar.json'), 'utf8'));
  const liste: unknown[] = Array.isArray(ham) ? ham : (ham.rotalar ?? []);
  const kume = new Set<string>();
  for (const r of liste) {
    const yol = typeof r === 'string' ? r : (r as { yol?: string }).yol;
    if (yol) kume.add(yol);
  }
  return kume;
}

/** `app/` ve `components/` altındaki tüm kaynak dosyalar. */
function kaynaklar(): { yer: string; kod: string }[] {
  const cikan: { yer: string; kod: string }[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d, { withFileTypes: true })) {
      const tam = path.join(d, ad.name);
      if (ad.isDirectory()) { gez(tam); continue; }
      if (!/\.tsx?$/.test(ad.name)) continue;
      cikan.push({ yer: path.relative(KOK, tam), kod: readFileSync(tam, 'utf8') });
    }
  };
  for (const d of ['app', 'components']) gez(path.join(KOK, d));
  return cikan;
}

/** Yorum ayıklanmış kod — yorumdaki örnek bir yol kusur değildir. */
function yorumsuz(kod: string): string {
  return kod
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Dinamik parçası olmayan bir yolun kök segmenti — `?`/`#` atılır. */
function kokYol(yol: string): string {
  return yol.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

/** Rota envanterinde var mı? Dinamik segment (`[id]`) tek seviye eşleşir. */
function cozulur(yol: string, kume: Set<string>): boolean {
  const y = kokYol(yol);
  if (y === '/' || kume.has(y)) return true;
  /* `/tesisler/<id>` gibi: üst yol envanterde varsa ve altında dinamik
     segment tanımlıysa çözülür. Envanter üst yolu taşır. */
  const parcalar = y.split('/').filter(Boolean);
  for (let i = parcalar.length - 1; i > 0; i -= 1) {
    const ust = `/${parcalar.slice(0, i).join('/')}`;
    if (kume.has(ust)) return true;
  }
  return false;
}

const ROTALAR = rotalar();
const KAYNAKLAR = kaynaklar();

describe('ÖLÜ BAĞ YOKTUR [SIS-BAG-001]', () => {
  it('POPÜLASYON BOŞ DEĞİL — envanter ya da tarama bozulursa vaka hiçbir şey ölçmezdi [SIS-BAG-001]', () => {
    expect(ROTALAR.size, 'rota envanteri boş okundu').toBeGreaterThan(30);
    expect(KAYNAKLAR.length, 'kaynak dosyası bulunamadı').toBeGreaterThan(100);
  });

  it('SABİT iç bağların HEPSİ gerçek bir rotaya çözülür [SIS-BAG-001]', () => {
    const olu: string[] = [];
    let sayilan = 0;
    for (const { yer, kod } of KAYNAKLAR) {
      for (const m of yorumsuz(kod).matchAll(/href="(\/[^"]*)"/g)) {
        sayilan += 1;
        if (!cozulur(m[1], ROTALAR)) olu.push(`${yer} → ${m[1]}`);
      }
    }
    /* Sayım da yazılır: sıfır bağ tarayan bir diş, sıfır ölü bağ bulur. */
    expect(sayilan, 'hiç sabit iç bağ bulunamadı — tarama kalıbı bozuk')
      .toBeGreaterThan(20);
    expect(olu, `OLMAYAN rotaya giden bağ:\n  ${olu.join('\n  ')}`).toEqual([]);
  });

  it('ÇÖZÜMLEYİCİ SAFTIR ve yanlış pozitif üretmez — sentetik vakalar [SIS-BAG-001]', () => {
    /* Kuralın kendisi sentetik kütükle sınanır: ölçüm ortamı değil,
       KARAR sabote edilebilsin. */
    const k = new Set(['/envanter', '/tesisler', '/raporlar/karne']);
    expect(cozulur('/envanter', k), 'düz rota çözülmedi').toBe(true);
    expect(cozulur('/envanter?sec=abc', k), 'sorgulu rota çözülmedi').toBe(true);
    expect(cozulur('/tesisler/cm123', k), 'dinamik segment çözülmedi').toBe(true);
    expect(cozulur('/raporlar/karne', k), 'iki seviyeli rota çözülmedi').toBe(true);
    expect(cozulur('/entegrasyonlar', k), 'OLMAYAN rota çözüldü — diş kör').toBe(false);
    expect(cozulur('/varliklar/cm123', k), 'OLMAYAN kök çözüldü — diş kör').toBe(false);
  });
});
