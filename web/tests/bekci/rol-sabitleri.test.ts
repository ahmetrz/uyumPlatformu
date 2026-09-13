import { describe, expect, it } from 'vitest';
import { ROL_IZINLERI } from '@/lib/erisim';
import { CEKIRDEK_ROLLER, ISLEMLER, ISLEM_ONKOSULU, MODULLER } from '@/lib/paket/bicim';
import { ROLLER } from '@/lib/sabitler';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · PAKET BİÇİMİNİN ROL SABİTLERİ ÇEKİRDEKLE BİREBİR (2.3 · URN-PKT-013)

   `roller.json` şeması modül, işlem ve çekirdek rol kodlarını kendi
   sabitinden okur (`bicim.ts`; `erisim.ts` server-only olduğundan yazar
   aracı onu yükleyemez). İki kopya sessizce ayrışırsa doğrulayıcı ya
   çekirdeğin bilmediği bir modüle izin yazdırır ya çekirdek bir rolü
   "paket rolü" sanıp yeniden tanımlatır. Derleme `Record<Modul, true>`
   ile eksik/fazla modülü yakalar; bu bekçi çalışma zamanında ROL_IZINLERI
   anahtarlarına ve içeriğine karşı ölçer. Merdiven kuralının (onay →
   yazma → okuma) çekirdekte de geçerli olduğu burada kanıtlanır — kural
   paket yazarına dayatılıp çekirdeğe uygulanmıyorsa kural değil kapristir.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Bekçi · paket biçiminin rol sabitleri çekirdekle birebir [URN-PKT-013]', () => {
  const roller = Object.keys(ROL_IZINLERI);
  const kullanilanModuller = new Set(Object.values(ROL_IZINLERI).flatMap((r) => Object.keys(r)));
  const kullanilanIslemler = new Set(Object.values(ROL_IZINLERI).flatMap((r) => Object.values(r).flat()));

  it('ölçüm tabanı: çekirdek rol ve modül kümesi boş değil', () => {
    expect(roller.length).toBeGreaterThanOrEqual(5);
    expect(kullanilanModuller.size).toBeGreaterThanOrEqual(5);
  });

  it('CEKIRDEK_ROLLER = ROL_IZINLERI anahtarları [URN-PKT-013]', () => {
    expect([...CEKIRDEK_ROLLER].sort()).toEqual([...roller].sort());
  });

  it('MODULLER ve ISLEMLER çekirdeğin kullandığı kümeyle birebir — eksik de fazla da kırmızı [URN-PKT-013]', () => {
    expect([...MODULLER].sort()).toEqual([...kullanilanModuller].sort());
    expect([...ISLEMLER].sort()).toEqual([...kullanilanIslemler].sort());
  });

  it('çekirdek roller izin merdivenine uyar: onay yazma ister, yazma okuma ister [URN-PKT-013]', () => {
    const ihlal: string[] = [];
    for (const [rol, izinler] of Object.entries(ROL_IZINLERI)) {
      for (const [modul, islemler] of Object.entries(izinler)) {
        for (const [islem, onkosul] of Object.entries(ISLEM_ONKOSULU)) {
          if (onkosul && islemler.includes(islem as never) && !islemler.includes(onkosul as never)) ihlal.push(`${rol}.${modul}: ${islem} ${onkosul}sız`);
        }
      }
    }
    expect(ihlal).toEqual([]);
  });

  it('ekranın seçtirdiği roller (sabitler.ROLLER) çekirdek rol kümesinin alt kümesi [URN-PKT-013]', () => {
    expect(ROLLER.filter((r) => !(CEKIRDEK_ROLLER as readonly string[]).includes(r))).toEqual([]);
  });
});
