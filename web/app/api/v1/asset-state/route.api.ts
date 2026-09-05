/* Route dosyalari `route.api.ts` adini tasir: 'api.ts' uzantisi yalnizca
   normal derlemenin pageExtensions listesinde vardir. Demo (statik disa
   aktarim) derlemesinde bu dosya route SAYILMAZ. */

export { POST } from '@/lib/api/uclar/durusGozlemleri';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
