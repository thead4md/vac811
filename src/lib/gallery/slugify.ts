// Hungarian-aware slug: folds accented vowels (á é í ó ö ő ú ü ű) before the
// generic strip, so event folder/caption names like "Nyári tábor" or "Őrsi
// gyűlés" don't collapse into an empty or mangled slug.
const HU_FOLD: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o', ú: 'u', ü: 'u', ű: 'u',
};

export function slugify(input: string): string {
  const folded = input
    .toLowerCase()
    .replace(/[áéíóöőúüű]/g, (ch) => HU_FOLD[ch] ?? ch);
  return folded
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'egyeb';
}
