#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { anlik } from './test-envanteri.mjs';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function dosyalar(kok, uyar, atla = new Set(['node_modules', '.next', 'prisma-client'])) {
  const cikti = [];
  const gez = (d) => {
    let girisler;
    try {
      girisler = readdirSync(d);
    } catch {
      return;
    }
    for (const ad of girisler) {
      if (atla.has(ad)) continue;
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (uyar(tam)) cikti.push(tam);
    }
  };
  gez(kok);
  return cikti;
}

function nesneAnahtarlari(dosya, degisken) {
  const s = readFileSync(dosya, 'utf8');
  const basla = s.indexOf(`${degisken} = {`);
  if (basla < 0) throw new Error(`${degisken} bulunamadı: ${dosya}`);

  let i = s.indexOf('{', basla);
  let derinlik = 0;
  let son = i;
  for (; i < s.length; i += 1) {
    if (s[i] === '{') derinlik += 1;
    else if (s[i] === '}') {
      derinlik -= 1;
      if (derinlik === 0) {
        son = i;
        break;
      }
    }
  }

  return s.slice(s.indexOf('{', basla) + 1, son)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(l) && !l.startsWith('//'))
    .length;
}

export function sayimlar() {
  const envanter = anlik();
  const sema = readFileSync(path.join(WEB, 'prisma', 'schema.prisma'), 'utf8');
  const eylemModulleri = dosyalar(path.join(WEB, 'lib'), (f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.demo.ts'))
    .filter((f) => /^\s*['"]use server['"]/m.test(readFileSync(f, 'utf8')));

  return {
    'test dosyası': envanter.dosya,
    'test vakası': envanter.vaka,
    'atlanan test': envanter.atlanan,
    'ekran (rota)': dosyalar(path.join(WEB, 'app'), (f) => path.basename(f) === 'page.tsx').length,
    'API ucu': dosyalar(path.join(WEB, 'app', 'api'), (f) => path.basename(f) === 'route.api.ts').length,
    'otomasyon motoru': nesneAnahtarlari(path.join(WEB, 'lib', 'motorlar', 'kayit.ts'), 'MOTORLAR'),
    'connector adaptörü': nesneAnahtarlari(
      path.join(WEB, 'lib', 'entegrasyon', 'adaptorler', 'index.ts'),
      'ADAPTORLER',
    ),
    'sunucu eylemi modülü': eylemModulleri.length,
    'Prisma modeli': (sema.match(/^model /gm) ?? []).length,
    'uygulanmış göç': readdirSync(path.join(WEB, 'prisma', 'migrations'))
      .filter((d) => /^\d{14}_/.test(d)).length,
  };
}

if (process.argv[1]?.endsWith('sayimlar.mjs')) {
  console.log(JSON.stringify(sayimlar(), null, 2));
}
