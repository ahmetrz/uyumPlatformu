/* ROTA → KAYNAK DİZİNİ eşlemesi, `app/` ağacından TÜRETİLİR.

   Elle tutulan bir tablo değil: `app/` ağacındaki her `page.tsx` gezilir
   ve Next.js App Router kuralı uygulanır — parantezli segmentler
   (`(kabuk)`, `(operasyonel)`) rotaya girmez, gerisi yoldur. Elle tablo
   tutmak, ekran taşındığında sessizce yanlışa dönerdi.

   `[id]` gibi dinamik segmentler olduğu gibi kalır; çağıran süzer. */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { WEB } from './kosu-ortak.mjs';

const APP = path.join(WEB, 'app');

/** Rota yolu → o rotanın kaynak dizini (depo köküne göre, `web/` hariç). */
export function rotaDizinleri() {
  const harita = new Map();
  const gez = (dizin, rota) => {
    for (const ad of readdirSync(dizin)) {
      const tam = path.join(dizin, ad);
      if (!statSync(tam).isDirectory()) continue;
      /* Parantezli segment YOL DEĞİL, yalnız düzen grubudur. */
      const yeni = ad.startsWith('(') && ad.endsWith(')') ? rota : `${rota}/${ad}`;
      const sayfaVar = readdirSync(tam).includes('page.tsx');
      if (sayfaVar) harita.set(yeni === '' ? '/' : yeni, path.relative(WEB, tam));
      gez(tam, yeni);
    }
  };
  if (readdirSync(APP).includes('page.tsx')) harita.set('/', 'app');
  gez(APP, '');
  return harita;
}
