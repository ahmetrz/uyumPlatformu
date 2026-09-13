-- Atlas Faz 4 · additive migration
-- Santral fotoğrafı eşlemesi bileşen kodunda değil veride yaşar
-- (05-photography.md §5). Nullable: fotoğrafı olmayan santral tipografik
-- fallback alır; mevcut satırlar etkilenmez.
ALTER TABLE "Tesis" ADD COLUMN "gorselAnahtari" TEXT;
