import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const dbCustomer = (prisma as any).customer || (prisma as any).Customer;
    let customers = [];

    if (dbCustomer) {
      try {
        customers = await dbCustomer.findMany({
          include: { tickets: true, socialAccounts: true },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        // Fallback if relations don't exist yet
        customers = await dbCustomer.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    let csvHeader = 'Name,Mobile,Email,AssignedTo,SocialAccounts,TotalTickets,CreatedAt\n';
    let csvRows = customers.map((c: any) => {
      const name = c.name || '';
      const mobile = c.mobile || '';
      const email = c.email || '';
      const assignedTo = c.assignedTo || 'Unassigned';
      const socials = c.socialAccounts?.map((s: any) => `${s.platform}:${s.handle}`).join(';') || 'None';
      const ticketsCount = c.tickets?.length || 0;
      const createdAt = new Date(c.createdAt || Date.now()).toISOString();
      return `"${name}","${mobile}","${email}","${assignedTo}","${socials}","${ticketsCount}","${createdAt}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="customer-360-report.csv"',
      },
    });
  } catch (error) {
    console.error('Customer CSV export error:', error);
    return new NextResponse('Error generating customer report', { status: 500 });
  }
}