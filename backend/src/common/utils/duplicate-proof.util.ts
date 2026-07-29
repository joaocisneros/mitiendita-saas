import { PrismaService } from '../../prisma/prisma.service';

/**
 * Busca si un N° de operación ya fue usado en otro pedido/cita/suscripción de
 * la misma empresa — para detectar a alguien reutilizando el mismo comprobante.
 */
export async function findDuplicateOperation(
  prisma: PrismaService,
  companyId: string,
  operationNumber: string,
  exclude: { paymentOrderId?: string; appointmentId?: string; subscriptionId?: string } = {},
): Promise<boolean> {
  const [payment, appointment, subscription] = await Promise.all([
    prisma.payment.findFirst({
      where: {
        companyId,
        operationNumber,
        ...(exclude.paymentOrderId ? { orderId: { not: exclude.paymentOrderId } } : {}),
      },
      select: { id: true },
    }),
    prisma.appointment.findFirst({
      where: {
        companyId,
        operationNumber,
        ...(exclude.appointmentId ? { id: { not: exclude.appointmentId } } : {}),
      },
      select: { id: true },
    }),
    prisma.subscription.findFirst({
      where: {
        companyId,
        operationNumber,
        ...(exclude.subscriptionId ? { id: { not: exclude.subscriptionId } } : {}),
      },
      select: { id: true },
    }),
  ]);
  return Boolean(payment || appointment || subscription);
}
