export const CATALOG_FAMILIES = {
  dwarf: 'Planeta enano',
  moon: 'Luna',
  asteroid: 'Asteroide',
  comet: 'Cometa',
} as const;

export const CATALOG_BODIES = [
  {
    id: 'ceres',
    label: 'Ceres',
    designation: '1 Ceres',
    family: 'dwarf',
    command: '1;',
    targetName: '1 Ceres (A801 AA)',
    stepDays: 4,
  },
  {
    id: 'titan',
    label: 'Titán',
    designation: '606',
    family: 'moon',
    command: '606',
    targetName: 'Titan (606)',
    stepDays: 1,
  },
  {
    id: 'vesta',
    label: 'Vesta',
    designation: '4 Vesta',
    family: 'asteroid',
    command: '4;',
    targetName: '4 Vesta (A807 FA)',
    stepDays: 4,
  },
  {
    id: '67p',
    label: '67P/Churyumov-Gerasimenko',
    designation: '67P',
    family: 'comet',
    command: 'DES=67P;CAP;NOFRAG',
    targetName: '67P/Churyumov-Gerasimenko',
    stepDays: 4,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  designation: string;
  family: keyof typeof CATALOG_FAMILIES;
  command: string;
  targetName: string;
  stepDays: number;
}[];

export type CatalogBody = (typeof CATALOG_BODIES)[number];
export type CatalogBodyId = CatalogBody['id'];

function searchKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function searchCatalog(query: string, family: string) {
  const key = searchKey(query);
  return CATALOG_BODIES.filter(
    (body) =>
      (!family || body.family === family) &&
      searchKey(body.label + ' ' + body.designation).includes(key),
  );
}
