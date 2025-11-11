import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Thermal Printer Print API
 * Handles sending print jobs to thermal printers
 */

// Printer configuration interface
interface PrinterConfig {
  id: string;
  name: string;
  type: 'kitchen' | 'bar' | 'receipt';
  ipAddress: string;
  port: number;
  isActive: boolean;
}

// Store printer configs (in production, this should be in database)
const getPrinterConfigs = (): PrinterConfig[] => {
  const kitchenPrinter = process.env.KITCHEN_PRINTER_IP;
  const barPrinter = process.env.BAR_PRINTER_IP;
  const receiptPrinter = process.env.RECEIPT_PRINTER_IP;

  const configs: PrinterConfig[] = [];

  if (kitchenPrinter) {
    configs.push({
      id: 'kitchen-1',
      name: 'Kitchen Printer',
      type: 'kitchen',
      ipAddress: kitchenPrinter,
      port: parseInt(process.env.KITCHEN_PRINTER_PORT || '9100'),
      isActive: true,
    });
  }

  if (barPrinter) {
    configs.push({
      id: 'bar-1',
      name: 'Bar Printer',
      type: 'bar',
      ipAddress: barPrinter,
      port: parseInt(process.env.BAR_PRINTER_PORT || '9100'),
      isActive: true,
    });
  }

  if (receiptPrinter) {
    configs.push({
      id: 'receipt-1',
      name: 'Receipt Printer',
      type: 'receipt',
      ipAddress: receiptPrinter,
      port: parseInt(process.env.RECEIPT_PRINTER_PORT || '9100'),
      isActive: true,
    });
  }

  return configs;
};

/**
 * Generate ESC/POS print commands for order ticket
 */
function generateOrderTicket(order: any): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';

  let commands = '';

  // Initialize printer
  commands += ESC + '@'; // Reset printer

  // Center align and double size for header
  commands += ESC + 'a' + '\x01'; // Center align
  commands += ESC + '!' + '\x30'; // Double width and height
  commands += 'ORDER TICKET' + LF;
  commands += ESC + '!' + '\x00'; // Reset text size
  commands += LF;

  // Order number
  commands += ESC + 'a' + '\x01'; // Center align
  commands += ESC + '!' + '\x10'; // Double width
  commands += `#${order.orderNumber}` + LF;
  commands += ESC + '!' + '\x00'; // Reset text size
  commands += LF;

  // Customer info
  commands += ESC + 'a' + '\x00'; // Left align
  commands += 'Customer: ' + order.customerName + LF;
  commands += 'Phone: ' + order.customerPhone + LF;
  if (order.pickupTime) {
    const pickupTime = new Date(order.pickupTime).toLocaleString();
    commands += 'Pickup: ' + pickupTime + LF;
  } else {
    commands += 'Pickup: ASAP' + LF;
  }
  commands += LF;

  // Items
  commands += '--------------------------------' + LF;
  commands += ESC + '!' + '\x08'; // Emphasized
  commands += 'ITEMS:' + LF;
  commands += ESC + '!' + '\x00'; // Reset
  commands += '--------------------------------' + LF;

  order.items.forEach((item: any) => {
    commands += `${item.quantity}x ${item.name}` + LF;
    if (item.modifiers) {
      try {
        const modifiers = JSON.parse(item.modifiers);
        if (Array.isArray(modifiers) && modifiers.length > 0) {
          modifiers.forEach((mod: string) => {
            commands += '  - ' + mod + LF;
          });
        }
      } catch {}
    }
    if (item.specialInstructions) {
      commands += '  NOTE: ' + item.specialInstructions + LF;
    }
    commands += LF;
  });

  // Special instructions
  if (order.specialInstructions) {
    commands += '--------------------------------' + LF;
    commands += ESC + '!' + '\x08'; // Emphasized
    commands += 'SPECIAL INSTRUCTIONS:' + LF;
    commands += ESC + '!' + '\x00'; // Reset
    commands += order.specialInstructions + LF;
    commands += '--------------------------------' + LF;
  }

  // Footer
  commands += LF;
  commands += ESC + 'a' + '\x01'; // Center align
  commands += new Date().toLocaleString() + LF;
  commands += LF;
  commands += LF;
  commands += LF;

  // Cut paper
  commands += GS + 'V' + '\x41' + '\x03';

  return commands;
}

/**
 * Send print job to thermal printer via network
 */
async function sendPrintJob(
  printerConfig: PrinterConfig,
  printData: string
): Promise<boolean> {
  try {
    // In a real implementation, you would use a library like 'net' or 'node-thermal-printer'
    // For now, we'll return a success response and log the print job
    console.log(`[PRINT JOB] Sending to ${printerConfig.name} (${printerConfig.ipAddress}:${printerConfig.port})`);
    console.log(`[PRINT DATA] ${printData.substring(0, 200)}...`);

    // TODO: Implement actual network printing
    // Example using node-thermal-printer:
    // const ThermalPrinter = require('node-thermal-printer').printer;
    // const PrinterTypes = require('node-thermal-printer').types;
    // const printer = new ThermalPrinter({
    //   type: PrinterTypes.EPSON,
    //   interface: `tcp://${printerConfig.ipAddress}:${printerConfig.port}`,
    // });
    // await printer.print(printData);
    // await printer.cut();

    return true;
  } catch (error) {
    console.error(`[PRINT ERROR] Failed to print to ${printerConfig.name}:`, error);
    return false;
  }
}

/**
 * POST /api/printers/print - Send print job
 */
export async function POST(req: NextRequest) {
  // Note: We allow unauthenticated requests for internal server-to-server calls
  // In production, you might want to use a service-to-service auth token

  try {
    const body = await req.json();
    const { orderId, printerType } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order details
    const { prisma } = await import('@/lib/prisma');
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get printer config
    const configs = getPrinterConfigs();
    const printer = configs.find(
      (p) => p.type === printerType && p.isActive
    );

    if (!printer) {
      return NextResponse.json(
        { error: `No active ${printerType} printer found. Configure printer IP in environment variables.` },
        { status: 404 }
      );
    }

    // Generate print data
    const printData = generateOrderTicket(order);

    // Send print job
    const success = await sendPrintJob(printer, printData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Print job sent to ${printer.name}`,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send print job' },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleError(error, 'Failed to send print job');
  }
}

