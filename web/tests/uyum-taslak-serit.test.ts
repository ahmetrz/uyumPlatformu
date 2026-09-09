import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   /uyum · TASLAK çerçevede ölçüt şeridi de BİLİNMEYEN [URN-PKT-021]

   Bağımsız inceleme (PR #43, tur 2): URN-PKT-021 dizin sayacını ve matris
   gövdesini düzeltti ama ekranın EN GÖRÜNÜR öğesini — başlığın altındaki
   ölçüt şeridini — atladı. Aktif sürümü olmayan çerçevede satır yoktur;
   şerit "0 Uygun · 0 Kısmi · 0 Uygunsuz" basıyordu (iyi haber gibi okunan
   üç sıfır) ve iki satır aşağıdaki "kontroller ölçülmedi — sıfır değil"
   cümlesiyle çelişiyordu.

   Ölçüm KAYNAK üzerindedir: şeridi çizen kod bir React bileşenidir, veri
   katmanı testi onu göremez. Taslak dalında dört ölçütün de değeri "—" ve
   durumu `unk` olmalıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const KAYNAK = readFileSync(path.join(process.cwd(), 'app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx'), 'utf8');

/** `metrikler={…}` özniteliğinin dengeli kapanışa kadar olan gövdesi. */
function metriklerBlogu(): string {
  const i = KAYNAK.indexOf('metrikler={');
  expect(i, 'ölçüt şeridi bulunamadı — tarama boş bakıyor').toBeGreaterThan(-1);
  let derinlik = 0;
  for (let j = i + 'metrikler='.length; j < KAYNAK.length; j += 1) {
    if (KAYNAK[j] === '{') derinlik += 1;
    else if (KAYNAK[j] === '}') { derinlik -= 1; if (derinlik === 0) return KAYNAK.slice(i, j + 1); }
  }
  throw new Error('metrikler bloğu kapanmıyor');
}

describe('taslak çerçevede ölçüt şeridi sıfır basmaz [URN-PKT-021]', () => {
  const blok = metriklerBlogu();
  const taslakDali = () => blok.slice(blok.indexOf('cerceve.taslak'), blok.indexOf('] :'));

  it('şerit taslak dalını tanır ve dört ölçütü de bilinmeyene çevirir [URN-PKT-021]', () => {
    expect(blok, 'şerit taslak hâlini hiç sormuyor').toMatch(/cerceve\.taslak\s*\?/);
    const dal = taslakDali();
    for (const olcut of ['Uygun', 'Kısmi', 'Uygunsuz', 'Endeks']) {
      const satir = dal.split('\n').find((s) => s.includes(`yazi: '${olcut}'`));
      expect(satir, `${olcut} ölçütü taslak dalında yok`).toBeTruthy();
      expect(satir, `${olcut}: taslakta sayı basılıyor`).toMatch(/deger: '—'/);
      expect(satir, `${olcut}: taslakta durum bilinmeyen değil`).toMatch(/durum: 'unk'/);
    }
  });

  it('taslak dalı sayısal ölçüt taşımaz — "0 Uygunsuz" iyi haber gibi okunur [URN-PKT-021]', () => {
    expect(taslakDali(), 'taslak dalında sayaç değeri var').not.toMatch(/deger: m\./);
  });
});
