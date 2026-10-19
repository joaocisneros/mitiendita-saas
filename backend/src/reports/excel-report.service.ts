import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

type Section = 'tienda' | 'credito';
type Row = Record<string, string | number | null>;
type ProductTotal = {
  producto: string;
  variante: string;
  units: number;
  sold: number;
  cost: number;
  noCost: boolean;
};
type Column = {
  header: string;
  key: string;
  width: number;
  money?: boolean;
  percent?: boolean;
};

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const METHOD: Record<string, string> = {
  cash: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
};
// Colores de la marca para cada reporte.
const THEME: Record<Section, { main: string; soft: string; title: string }> = {
  tienda: { main: 'FF7C3AED', soft: 'FFF5F3FF', title: '🛒 Tienda virtual' },
  credito: {
    main: 'FFD97706',
    soft: 'FFFFFBEB',
    title: '🤝 Ventas al crédito',
  },
};
const MONEY = '"S/ "#,##0.00';
const round2 = (value: number) => Math.round(value * 100) / 100;
/** Hora de Lima (UTC-5, sin horario de verano). */
const limaDate = (date: Date) =>
  new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dayLabel = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * Excel del mes completo, con diseño: uno para la tienda virtual y otro para
 * las ventas al crédito. Muestra lo vendido, lo cobrado y la ganancia (solo
 * donde hay costo; lo demás queda marcado "sin costo").
 */
@Injectable()
export class ExcelReportService {
  constructor(private readonly prisma: PrismaService) {}

  async build(companyId: string, section: string, month: string) {
    if (section !== 'tienda' && section !== 'credito') {
      throw new BadRequestException('Reporte inválido.');
    }
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      throw new BadRequestException('El mes debe tener el formato AAAA-MM.');
    }
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    // Mes completo en hora de Lima.
    const from = new Date(Date.UTC(year, monthIndex, 1, 5));
    const to = new Date(Date.UTC(year, monthIndex + 1, 1, 5) - 1);
    const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const monthLabel = `${MONTHS[monthIndex]} ${year}`;

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
      select: { storeName: true },
    });
    const storeName = settings?.storeName ?? 'Mi tienda';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MiTiendita';
    workbook.created = new Date();

    if (section === 'tienda') {
      await this.storeWorkbook(
        workbook,
        companyId,
        from,
        to,
        days,
        year,
        monthIndex,
      );
    } else {
      await this.creditWorkbook(
        workbook,
        companyId,
        from,
        to,
        days,
        year,
        monthIndex,
      );
    }
    // Encabezado común en cada hoja.
    workbook.eachSheet((sheet) => {
      sheet.getCell('A1').value = `${THEME[section].title} · ${storeName}`;
      sheet.getCell('A2').value =
        `Reporte de ${monthLabel} · generado el ${dayLabel(limaDate(new Date()))}`;
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const slug = storeName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const fileName = `${section === 'tienda' ? 'tienda-virtual' : 'ventas-al-credito'}-${slug || 'tienda'}-${month}.xlsx`;
    return { buffer, fileName };
  }

  // ───────────────────────── Tienda virtual ─────────────────────────

  private async storeWorkbook(
    workbook: ExcelJS.Workbook,
    companyId: string,
    from: Date,
    to: Date,
    days: number,
    year: number,
    monthIndex: number,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        paymentStatus: 'approved',
        confirmedAt: { gte: from, lte: to },
      },
      orderBy: { confirmedAt: 'asc' },
      include: { items: { include: { product: { select: { cost: true } } } } },
    });

    let missingCost = 0;
    const lineCost = (item: (typeof orders)[number]['items'][number]) => {
      const unit =
        item.unitCost !== null
          ? Number(item.unitCost)
          : item.product?.cost !== null && item.product?.cost !== undefined
            ? Number(item.product.cost)
            : null;
      if (unit === null) missingCost++;
      return unit === null ? null : round2(unit * item.quantity);
    };

    const orderRows: Row[] = [];
    const products = new Map<string, ProductTotal>();
    const customers = new Map<
      string,
      { name: string; phone: string; orders: number; total: number }
    >();
    const byDay = new Map<
      string,
      { orders: number; sold: number; profit: number }
    >();
    let totalSold = 0;
    let productSales = 0;
    let delivery = 0;
    let knownSales = 0;
    let knownCost = 0;

    for (const order of orders) {
      let orderCost = 0;
      let orderHasCost = true;
      let orderKnownSales = 0;
      for (const item of order.items) {
        const cost = lineCost(item);
        const lineTotal = Number(item.lineTotal);
        if (cost === null) orderHasCost = false;
        else {
          orderCost += cost;
          orderKnownSales += lineTotal;
        }
        const key = `${item.name}\u0000${item.variant ?? ''}`;
        const row = products.get(key) ?? {
          producto: item.name,
          variante: item.variant ?? '—',
          units: 0,
          sold: 0,
          cost: 0,
          noCost: false,
        };
        row.units += item.quantity;
        row.sold += lineTotal;
        if (cost === null) row.noCost = true;
        else row.cost += cost;
        products.set(key, row);
      }
      const subtotal = Number(order.subtotal);
      const total = Number(order.total);
      totalSold += total;
      productSales += subtotal;
      delivery += Number(order.deliveryFee);
      knownSales += orderKnownSales;
      knownCost += orderCost;
      const profit = orderKnownSales - orderCost;
      const day = limaDate(order.confirmedAt ?? order.createdAt);
      const dayRow = byDay.get(day) ?? { orders: 0, sold: 0, profit: 0 };
      dayRow.orders++;
      dayRow.sold += total;
      dayRow.profit += profit;
      byDay.set(day, dayRow);
      const customer = customers.get(order.customerPhone) ?? {
        name: order.customerName,
        phone: order.customerPhone,
        orders: 0,
        total: 0,
      };
      customer.orders++;
      customer.total += total;
      customers.set(order.customerPhone, customer);
      orderRows.push({
        fecha: dayLabel(day),
        codigo: order.publicCode,
        cliente: order.customerName,
        celular: order.customerPhone,
        entrega:
          order.deliveryMethod === 'delivery' ? 'Delivery' : 'Recojo en tienda',
        productos: order.items
          .map(
            (i) =>
              `${i.quantity}× ${i.name}${i.variant ? ` (${i.variant})` : ''}`,
          )
          .join(', '),
        subtotal,
        envio: Number(order.deliveryFee),
        total,
        costo: orderHasCost ? round2(orderCost) : null,
        ganancia: orderHasCost ? round2(subtotal - orderCost) : null,
      });
    }

    const profit = knownSales - knownCost;
    this.summarySheet(
      workbook,
      'tienda',
      [
        ['Total cobrado en la tienda virtual', totalSold, true],
        ['Pedidos con pago aprobado', orders.length, false],
        [
          'Ticket promedio por pedido',
          orders.length ? totalSold / orders.length : 0,
          true,
        ],
        ['Venta de productos', productSales, true],
        ['Envíos cobrados', delivery, true],
        ['Costo de los productos vendidos', knownCost, true],
        ['💰 Ganancia del mes', profit, true],
        ['Margen de ganancia', knownSales ? profit / knownSales : 0, 'percent'],
      ],
      missingCost,
    );

    this.tableSheet(
      workbook,
      'tienda',
      'Pedidos',
      [
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Código', key: 'codigo', width: 13 },
        { header: 'Cliente', key: 'cliente', width: 24 },
        { header: 'Celular', key: 'celular', width: 14 },
        { header: 'Entrega', key: 'entrega', width: 16 },
        { header: 'Productos', key: 'productos', width: 46 },
        { header: 'Subtotal', key: 'subtotal', width: 13, money: true },
        { header: 'Envío', key: 'envio', width: 11, money: true },
        { header: 'Total', key: 'total', width: 13, money: true },
        { header: 'Costo', key: 'costo', width: 13, money: true },
        { header: 'Ganancia', key: 'ganancia', width: 13, money: true },
      ],
      orderRows,
      ['subtotal', 'envio', 'total', 'costo', 'ganancia'],
    );

    this.productsSheet(workbook, 'tienda', 'Productos vendidos', products);

    this.tableSheet(
      workbook,
      'tienda',
      'Clientes',
      [
        { header: 'Cliente', key: 'cliente', width: 28 },
        { header: 'Celular', key: 'celular', width: 16 },
        { header: 'Pedidos', key: 'pedidos', width: 11 },
        { header: 'Total comprado', key: 'total', width: 16, money: true },
      ],
      [...customers.values()]
        .sort((a, b) => b.total - a.total)
        .map((c) => ({
          cliente: c.name,
          celular: c.phone,
          pedidos: c.orders,
          total: round2(c.total),
        })),
      ['pedidos', 'total'],
    );

    const dayRows: Row[] = [];
    for (let d = 1; d <= days; d++) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const row = byDay.get(iso);
      dayRows.push({
        fecha: dayLabel(iso),
        pedidos: row?.orders ?? 0,
        ventas: round2(row?.sold ?? 0),
        ganancia: round2(row?.profit ?? 0),
      });
    }
    this.tableSheet(
      workbook,
      'tienda',
      'Por día',
      [
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Pedidos', key: 'pedidos', width: 11 },
        { header: 'Ventas', key: 'ventas', width: 14, money: true },
        { header: 'Ganancia', key: 'ganancia', width: 14, money: true },
      ],
      dayRows,
      ['pedidos', 'ventas', 'ganancia'],
    );
  }

  // ───────────────────────── Ventas al crédito ─────────────────────────

  private async creditWorkbook(
    workbook: ExcelJS.Workbook,
    companyId: string,
    from: Date,
    to: Date,
    days: number,
    year: number,
    monthIndex: number,
  ) {
    const [sales, payments, open] = await Promise.all([
      this.prisma.creditSale.findMany({
        where: {
          companyId,
          status: { not: 'cancelled' },
          soldAt: { gte: from, lte: to },
        },
        orderBy: { soldAt: 'asc' },
        include: {
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          items: { include: { product: { select: { cost: true } } } },
        },
      }),
      this.prisma.creditPayment.findMany({
        where: { companyId, paidAt: { gte: from, lte: to } },
        orderBy: { paidAt: 'asc' },
        include: {
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          sale: { select: { code: true } },
        },
      }),
      // Lo que se debe hoy (no depende del mes).
      this.prisma.creditSale.findMany({
        where: { companyId, status: 'pending' },
        select: { creditCustomerId: true, total: true, paidAmount: true },
      }),
    ]);
    const debtNow = new Map<string, number>();
    for (const s of open) {
      debtNow.set(
        s.creditCustomerId,
        (debtNow.get(s.creditCustomerId) ?? 0) +
          Number(s.total) -
          Number(s.paidAmount),
      );
    }

    let missingCost = 0;
    const saleRows: Row[] = [];
    const products = new Map<string, ProductTotal>();
    const clients = new Map<
      string,
      { name: string; phone: string; sold: number; paid: number }
    >();
    const byDay = new Map<string, { sold: number; paid: number }>();
    let delivered = 0;
    let discounts = 0;
    let knownSales = 0;
    let knownCost = 0;
    const fullName = (c: { firstName: string; lastName: string }) =>
      `${c.firstName} ${c.lastName}`;

    for (const sale of sales) {
      let saleCost = 0;
      let saleHasCost = true;
      let saleKnown = 0;
      let saleList = 0;
      for (const item of sale.items) {
        const unit =
          item.unitCost !== null
            ? Number(item.unitCost)
            : item.product?.cost !== null && item.product?.cost !== undefined
              ? Number(item.product.cost)
              : null;
        const lineTotal = Number(item.lineTotal);
        const list =
          item.listPrice !== null
            ? Number(item.listPrice) * item.quantity
            : lineTotal;
        // Rebaja = lo que se bajó del precio normal (vender más caro no resta).
        saleList += Math.max(list, lineTotal);
        const cost = unit === null ? null : unit * item.quantity;
        if (cost === null) {
          saleHasCost = false;
          missingCost++;
        } else {
          saleCost += cost;
          saleKnown += lineTotal;
        }
        const key = `${item.name}\u0000${item.variant ?? ''}`;
        const row = products.get(key) ?? {
          producto: item.name,
          variante: item.variant ?? '—',
          units: 0,
          sold: 0,
          cost: 0,
          noCost: false,
        };
        row.units += item.quantity;
        row.sold += lineTotal;
        if (cost === null) row.noCost = true;
        else row.cost += cost;
        products.set(key, row);
      }
      const total = Number(sale.total);
      const paid = Number(sale.paidAmount);
      delivered += total;
      discounts += saleList - total;
      knownSales += saleKnown;
      knownCost += saleCost;
      const day = limaDate(sale.soldAt);
      const dayRow = byDay.get(day) ?? { sold: 0, paid: 0 };
      dayRow.sold += total;
      byDay.set(day, dayRow);
      const client = clients.get(sale.creditCustomerId) ?? {
        name: fullName(sale.customer),
        phone: sale.customer.phone,
        sold: 0,
        paid: 0,
      };
      client.sold += total;
      clients.set(sale.creditCustomerId, client);
      saleRows.push({
        fecha: dayLabel(day),
        codigo: sale.code,
        clienta: fullName(sale.customer),
        celular: sale.customer.phone,
        productos: sale.items
          .map(
            (i) =>
              `${i.quantity}× ${i.name}${i.variant ? ` (${i.variant})` : ''}`,
          )
          .join(', '),
        normal: round2(saleList),
        rebaja: round2(Math.max(0, saleList - total)),
        total,
        abonado: paid,
        debe: round2(total - paid),
        costo: saleHasCost ? round2(saleCost) : null,
        ganancia: saleHasCost ? round2(total - saleCost) : null,
        estado: sale.status === 'paid' ? 'Pagada' : 'Por pagar',
      });
    }

    let collected = 0;
    const paymentRows: Row[] = payments.map((p) => {
      const amount = Number(p.amount);
      collected += amount;
      const day = limaDate(p.paidAt);
      const dayRow = byDay.get(day) ?? { sold: 0, paid: 0 };
      dayRow.paid += amount;
      byDay.set(day, dayRow);
      const client = clients.get(p.creditCustomerId) ?? {
        name: fullName(p.customer),
        phone: p.customer.phone,
        sold: 0,
        paid: 0,
      };
      client.paid += amount;
      clients.set(p.creditCustomerId, client);
      return {
        fecha: dayLabel(day),
        clienta: fullName(p.customer),
        celular: p.customer.phone,
        venta: p.sale?.code ?? 'A su deuda',
        metodo: METHOD[p.method] ?? p.method,
        monto: amount,
        nota: p.note ?? '',
      };
    });

    const receivable = [...debtNow.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const profit = knownSales - knownCost;
    this.summarySheet(
      workbook,
      'credito',
      [
        ['Entregado al crédito en el mes', delivered, true],
        ['Ventas al crédito', sales.length, false],
        ['Cobrado en abonos en el mes', collected, true],
        ['Falta cobrar (hoy, todas las clientas)', receivable, true],
        ['Rebajas dadas', discounts, true],
        ['Costo de lo entregado', knownCost, true],
        ['💰 Ganancia del mes (sobre lo entregado)', profit, true],
        ['Margen de ganancia', knownSales ? profit / knownSales : 0, 'percent'],
      ],
      missingCost,
    );

    this.tableSheet(
      workbook,
      'credito',
      'Ventas al crédito',
      [
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Código', key: 'codigo', width: 13 },
        { header: 'Clienta', key: 'clienta', width: 26 },
        { header: 'Celular', key: 'celular', width: 14 },
        { header: 'Productos', key: 'productos', width: 44 },
        { header: 'Precio normal', key: 'normal', width: 14, money: true },
        { header: 'Rebaja', key: 'rebaja', width: 12, money: true },
        { header: 'Total', key: 'total', width: 13, money: true },
        { header: 'Abonado', key: 'abonado', width: 13, money: true },
        { header: 'Debe', key: 'debe', width: 13, money: true },
        { header: 'Costo', key: 'costo', width: 13, money: true },
        { header: 'Ganancia', key: 'ganancia', width: 13, money: true },
        { header: 'Estado', key: 'estado', width: 12 },
      ],
      saleRows,
      ['normal', 'rebaja', 'total', 'abonado', 'debe', 'costo', 'ganancia'],
    );

    this.tableSheet(
      workbook,
      'credito',
      'Abonos',
      [
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Clienta', key: 'clienta', width: 26 },
        { header: 'Celular', key: 'celular', width: 14 },
        { header: 'Venta', key: 'venta', width: 14 },
        { header: 'Método', key: 'metodo', width: 15 },
        { header: 'Monto', key: 'monto', width: 13, money: true },
        { header: 'Nota', key: 'nota', width: 30 },
      ],
      paymentRows,
      ['monto'],
    );

    this.tableSheet(
      workbook,
      'credito',
      'Clientas',
      [
        { header: 'Clienta', key: 'clienta', width: 28 },
        { header: 'Celular', key: 'celular', width: 14 },
        { header: 'Sacó en el mes', key: 'saco', width: 16, money: true },
        { header: 'Abonó en el mes', key: 'abono', width: 16, money: true },
        { header: 'Debe hoy', key: 'debe', width: 14, money: true },
      ],
      [...clients.entries()]
        .map(([id, c]) => ({
          clienta: c.name,
          celular: c.phone,
          saco: round2(c.sold),
          abono: round2(c.paid),
          debe: round2(debtNow.get(id) ?? 0),
        }))
        .sort((a, b) => Number(b.saco) - Number(a.saco)),
      ['saco', 'abono', 'debe'],
    );

    this.productsSheet(workbook, 'credito', 'Productos entregados', products);

    const dayRows: Row[] = [];
    for (let d = 1; d <= days; d++) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const row = byDay.get(iso);
      dayRows.push({
        fecha: dayLabel(iso),
        entregado: round2(row?.sold ?? 0),
        cobrado: round2(row?.paid ?? 0),
      });
    }
    this.tableSheet(
      workbook,
      'credito',
      'Por día',
      [
        { header: 'Fecha', key: 'fecha', width: 12 },
        {
          header: 'Entregado al crédito',
          key: 'entregado',
          width: 20,
          money: true,
        },
        { header: 'Cobrado en abonos', key: 'cobrado', width: 20, money: true },
      ],
      dayRows,
      ['entregado', 'cobrado'],
    );
  }

  // ───────────────────────── Diseño de las hojas ─────────────────────────

  /** Hoja "Resumen": tarjetas grandes con los totales del mes. */
  private summarySheet(
    workbook: ExcelJS.Workbook,
    section: Section,
    items: Array<[string, number, boolean | 'percent']>,
    missingCost: number,
  ) {
    const theme = THEME[section];
    const sheet = workbook.addWorksheet('Resumen', {
      views: [{ showGridLines: false }],
    });
    sheet.columns = [{ width: 44 }, { width: 22 }];
    this.titleRows(sheet, section, 2);
    sheet.addRow([]);
    items.forEach(([label, value, kind], index) => {
      const row = sheet.addRow([
        label,
        kind === 'percent' ? round2(value) : round2(value),
      ]);
      row.height = 26;
      const isProfit = label.includes('Ganancia');
      row.eachCell((cell, col) => {
        cell.font = {
          bold: col === 2 || isProfit,
          size: col === 2 ? 13 : 11,
          color: { argb: isProfit ? 'FF047857' : 'FF0F172A' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: isProfit ? 'FFECFDF5' : index % 2 ? 'FFFFFFFF' : theme.soft,
          },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: col === 2 ? 'right' : 'left',
          indent: 1,
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
      row.getCell(2).numFmt = kind === 'percent' ? '0.0%' : kind ? MONEY : '0';
    });
    sheet.addRow([]);
    const note = sheet.addRow([
      missingCost
        ? `⚠ ${missingCost} ${missingCost === 1 ? 'producto vendido no tiene' : 'productos vendidos no tienen'} costo registrado: no entran en la ganancia. Agrega el costo en Productos → Editar.`
        : '✓ Todos los productos vendidos tienen costo: la ganancia está completa.',
    ]);
    sheet.mergeCells(`A${note.number}:B${note.number}`);
    note.getCell(1).font = {
      italic: true,
      size: 10,
      color: { argb: missingCost ? 'FFB45309' : 'FF047857' },
    };
    note.getCell(1).alignment = { wrapText: true, vertical: 'middle' };
    note.height = 32;
  }

  /** Tabla con encabezado de color, filas intercaladas, montos en S/ y fila de totales. */
  private tableSheet(
    workbook: ExcelJS.Workbook,
    section: Section,
    name: string,
    columns: Column[],
    rows: Row[],
    totals: string[],
  ) {
    const theme = THEME[section];
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    });
    sheet.columns = columns.map((c) => ({ key: c.key, width: c.width + 3 }));
    this.titleRows(sheet, section, columns.length);
    sheet.addRow([]);
    const header = sheet.addRow(columns.map((c) => c.header));
    header.height = 24;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: theme.main },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
    });
    if (!rows.length) {
      const empty = sheet.addRow(['Sin movimientos en este mes.']);
      sheet.mergeCells(
        `A${empty.number}:${sheet.getColumn(columns.length).letter}${empty.number}`,
      );
      empty.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
      return;
    }
    rows.forEach((data, index) => {
      const row = sheet.addRow(
        columns.map((c) => data[c.key] ?? (c.money ? 'sin costo' : '')),
      );
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const column = columns[col - 1];
        if (column?.money && typeof cell.value === 'number')
          cell.numFmt = MONEY;
        if (column?.money && cell.value === 'sin costo')
          cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
        if (column?.key === 'ganancia' && typeof cell.value === 'number') {
          cell.font = {
            bold: true,
            color: { argb: cell.value < 0 ? 'FFDC2626' : 'FF047857' },
          };
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index % 2 ? 'FFFFFFFF' : 'FFF8FAFC' },
        };
        cell.alignment = {
          vertical: 'middle',
          wrapText: column?.key === 'productos',
          horizontal: column?.money ? 'right' : 'left',
        };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        };
      });
    });
    // Fila de totales.
    const sums = columns.map((c, i) => {
      if (i === 0) return 'TOTAL';
      if (!totals.includes(c.key)) return '';
      return round2(
        rows.reduce(
          (sum, r) =>
            sum + (typeof r[c.key] === 'number' ? (r[c.key] as number) : 0),
          0,
        ),
      );
    });
    const total = sheet.addRow(sums);
    total.height = 22;
    total.eachCell({ includeEmpty: true }, (cell, col) => {
      const column = columns[col - 1];
      if (column?.money && typeof cell.value === 'number') cell.numFmt = MONEY;
      cell.font = { bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: theme.soft },
      };
      cell.border = { top: { style: 'medium', color: { argb: theme.main } } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: column?.money ? 'right' : 'left',
      };
    });
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: columns.length },
    };
  }

  /** Productos agrupados por talla/color con unidades, vendido, costo, ganancia y margen. */
  private productsSheet(
    workbook: ExcelJS.Workbook,
    section: Section,
    name: string,
    products: Map<string, ProductTotal>,
  ) {
    const rows: Row[] = [...products.values()]
      .sort((a, b) => b.sold - a.sold)
      .map((p) => ({
        producto: p.producto,
        variante: p.variante,
        unidades: p.units,
        vendido: round2(p.sold),
        costo: p.noCost ? null : round2(p.cost),
        ganancia: p.noCost ? null : round2(p.sold - p.cost),
        margen:
          p.noCost || !p.sold
            ? ''
            : `${Math.round(((p.sold - p.cost) / p.sold) * 100)}%`,
      }));
    this.tableSheet(
      workbook,
      section,
      name,
      [
        { header: 'Producto', key: 'producto', width: 34 },
        { header: 'Talla / color', key: 'variante', width: 18 },
        { header: 'Unidades', key: 'unidades', width: 11 },
        { header: 'Vendido', key: 'vendido', width: 14, money: true },
        { header: 'Costo', key: 'costo', width: 14, money: true },
        { header: 'Ganancia', key: 'ganancia', width: 14, money: true },
        { header: 'Margen', key: 'margen', width: 10 },
      ],
      rows,
      ['unidades', 'vendido', 'costo', 'ganancia'],
    );
  }

  /** Filas 1 y 2: título con el color del reporte (el texto lo pone build()). */
  private titleRows(sheet: ExcelJS.Worksheet, section: Section, width: number) {
    const theme = THEME[section];
    const last = sheet.getColumn(Math.max(width, 2)).letter;
    sheet.addRow(['']);
    sheet.addRow(['']);
    sheet.mergeCells(`A1:${last}1`);
    sheet.mergeCells(`A2:${last}2`);
    sheet.getRow(1).height = 30;
    sheet.getCell('A1').font = {
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: theme.main },
    };
    sheet.getCell('A1').alignment = { vertical: 'middle', indent: 1 };
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF475569' } };
    sheet.getCell('A2').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: theme.soft },
    };
    sheet.getCell('A2').alignment = { vertical: 'middle', indent: 1 };
  }
}
