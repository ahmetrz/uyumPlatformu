import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  /* ── ARAÇLARDA `no-undef` AÇIK ─────────────────────────────────────────
     Ürün kodu TypeScript ve `tsc` tanımsız değişkeni zaten yakalar; bu
     yüzden `no-undef` TS dosyalarında kapalıdır (ve açık olsaydı yalnız
     gürültü üretirdi — tip bildirimlerini "tanımsız" sanar).

     `arac/*.mjs` ise `tsc`in kapsamında DEĞİLDİR. Ölçüldü (bağımsız
     inceleme, PR #46): `parti-kapanisi.mjs` bir küme seçimi yeniden
     yazıldıktan sonra dosyanın SONUNDA tanımsız kalmış bir `secilen`
     değişkenine bakıyordu ve tam da "bütün kapılar yeşil" satırında
     `ReferenceError` ile çöküyordu — yani parti kapanış aracı, kapanmaya
     en yakın anda kendi kusuruyla kırmızı oluyordu. `kapi:parti` kendini
     ölçemediği için (`kapi-farki` beyanında `kapi: false`) CI'da hiç
     koşmuyor ve kusur hiçbir kapıya görünmüyordu.

     `kapi:ithal-zinciri` içe aktarım grafiğini ölçer; bu kural DEĞİŞKEN
     kapsamını ölçer. İkisi ayrı kusur sınıfıdır ve ikisi de `tsc`in
     dışındadır. */
  {
    files: ["arac/**/*.mjs", "*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        AbortController: "readonly",
        structuredClone: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: { "no-undef": "error" },
  },
]);

export default eslintConfig;
