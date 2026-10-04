import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;

    if (callSid && recordingUrl) {
      // Attach recording URL and duration to employee notes or a dedicated log field
      await prisma.ticket.updateMany({
        where: { ticketRef: { contains: callSid.slice(-6) } },
        data: {
          employeeNotes: `Recording URL: ${recordingUrl}. Duration: ${recordingDuration}s`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recording callback error:', error);
    return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
  }
}