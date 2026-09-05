/* Route dosyalari `route.api.ts` adini tasir: 'api.ts' uzantisi yalnizca
   normal derlemenin pageExtensions listesinde vardir. Demo (statik disa
   aktarim) derlemesinde bu dosya route SAYILMAZ ve API demo yayinina hic
   girmez - statik disa aktarim yalnizca GET + dynamic='force-static'
   kaldirir, bizimkiler Request'e bagli ve POST kabul ediyor. */

export { POST } from '@/lib/api/uclar/varlikYazma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
