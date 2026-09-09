/* Tohumun KİRACI KATMANI (2.5): madde → kapsam alanı (BT/OT) eşlemesi.
   Paket kalemi değildir (kapsam alanı kiracının kararı); tohum, demo
   paketleri kurulduktan sonra her maddeyi alanına bağlar. Üretildi:
   2.5 öncesi tohum ağaçlarından (seed.ts · seed-uyum.ts) birebir. */
export const MADDE_ALANLARI: Record<string, ('BT' | 'OT')[]> = {
  'CBDDO-3.1': [
    'BT',
    'OT'
  ],
  'CBDDO-3.2': [
    'BT'
  ],
  'CBDDO-4.1': [
    'BT'
  ],
  'CBDDO-4.2': [
    'BT'
  ],
  'ISO-27001-A.5.9': [
    'BT'
  ],
  'ISO-27001-A.8.9': [
    'BT',
    'OT'
  ],
  'ISO-27001-A.8.16': [
    'BT',
    'OT'
  ],
  'ISO-27001-A.5.24': [
    'BT'
  ],
  'SPK-BS-11': [
    'BT'
  ],
  'SPK-BS-14': [
    'BT'
  ],
  'SPK-BS-19': [
    'BT'
  ],
  'EPDK-SYM-4': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-4.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-4.1.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-4.1.2': [
    'OT'
  ],
  'EPDK-SYM-4.2': [
    'OT'
  ],
  'EPDK-SYM-4.2.1': [
    'OT'
  ],
  'EPDK-SYM-4.2.2': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-5': [
    'BT'
  ],
  'EPDK-SYM-5.1': [
    'BT'
  ],
  'EPDK-SYM-5.1.1': [
    'BT'
  ],
  'EPDK-SYM-5.1.2': [
    'BT'
  ],
  'EPDK-SYM-6': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-6.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-6.1.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-6.1.2': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-6.2': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-6.2.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-7': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-7.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-7.1.4': [
    'OT'
  ],
  'EPDK-SYM-7.2': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-8': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-8.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-8.1.1': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-8.1.2': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-8.2': [
    'BT',
    'OT'
  ],
  'EPDK-SYM-8.2.1': [
    'BT',
    'OT'
  ]
};
