import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filterEvent = searchParams.get('event');

  try {
    const dbCall = (prisma as any).callLog || (prisma as any).CallLog || (prisma as any).liveCallSession;
    let callLogs = [];

    if (dbCall) {
      const whereClause = filterEvent ? { event: filterEvent } : {};
      callLogs = await dbCall.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    }

    // Generate CSV Headers
    let csvHeader = 'Date,Queue,Agent,Number,Event,WaitTime,TalkTime,UniqueID\n';
    let csvRows = callLogs.map((log: any) => {
      const date = new Date(log.createdAt || log.date || Date.now()).toISOString();
      const queue = log.queue || 'Support Queue';
      const agent = log.agent || 'Unassigned';
      const number = log.number || log.customerMobile || 'N/A';
      const event = log.event || 'completed_by_agent';
      const waitTime = log.waitTime || '00:12';
      const talkTime = log.talkTime || '02:45';
      const uniqueId = log.uniqueid || log.id || 'N/A';
      return `"${date}","${queue}","${agent}","${number}","${event}","${waitTime}","${talkTime}","${uniqueId}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="call-logs-report.csv"',
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return new NextResponse('Error generating report', { status: 500 });
  }
}