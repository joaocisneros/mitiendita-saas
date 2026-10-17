import { toAddress, toCatalogName, toSentence } from './text.util';

describe('toCatalogName', () => {
  it('corrige nombres escritos todo en mayúsculas', () => {
    expect(toCatalogName('CREMAS')).toBe('Cremas');
    expect(toCatalogName('PRODUCTO DE ASEOS')).toBe('Producto de Aseos');
    expect(toCatalogName('  POLO   PARA NIÑOS ')).toBe('Polo para Niños');
  });

  it('corrige nombres escritos todo en minúsculas', () => {
    expect(toCatalogName('crema nivea 200ml')).toBe('Crema Nivea 200ml');
  });

  it('respeta el formato propio y las palabras con números', () => {
    expect(toCatalogName('iPhone 15 Pro')).toBe('iPhone 15 Pro');
    expect(toCatalogName('Perfumes')).toBe('Perfumes');
    expect(toCatalogName('CREMA NIVEA 200ML')).toBe('Crema Nivea 200ML');
    expect(toCatalogName('POLO TALLA XL1')).toBe('Polo Talla XL1');
    expect(toCatalogName('COCA-COLA 3L')).toBe('Coca-Cola 3L');
  });
});

describe('toAddress / toSentence', () => {
  it('separa las abreviaturas y da formato a la dirección', () => {
    expect(toAddress('jr.areanles 368')).toBe('Jr. Areanles 368');
    expect(toAddress('AV. GIRÁLDEZ 450, HUANCAYO')).toBe(
      'Av. Giráldez 450, Huancayo',
    );
    expect(toAddress('Mz.B Lt.5 Urb. Los Pinos')).toBe(
      'Mz. B Lt. 5 Urb. Los Pinos',
    );
  });

  it('pone la nota con mayúscula inicial sin tocar el resto', () => {
    expect(toSentence('cobrar cuando puede')).toBe('Cobrar cuando puede');
    expect(toSentence('llamar a Rosa el sábado')).toBe(
      'Llamar a Rosa el sábado',
    );
  });
});
