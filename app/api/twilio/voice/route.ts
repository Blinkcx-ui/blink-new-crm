import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const toNumber = formData.get('To') as string;
    const fromNumber = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;

    const twiml = new twilio.twiml.VoiceResponse();

    // Handle Outbound Call from Browser Softphone
    if (toNumber) {
      const dial = twiml.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER,
        record: 'record-from-answer-dual',
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`,
      });
      dial.number(toNumber);
    } else {
      // Handle Inbound Call to Twilio Number
      const gather = twiml.gather({
        numDigits: 1,
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/ivr`,
        method: 'POST',
      });
      gather.say('Welcome to Blink Enterprise Contact Center. Connecting you to an available agent.');
    }

    // Log or update call metadata in PostgreSQL
    try {
      let client = await prisma.client.findFirst();
      if (client && callSid) {
        // Upsert or log interaction/ticket log
        await prisma.ticket.createMany({
          data: [{
            ticketRef: `CALL-${callSid.slice(-6)}`,
            department: 'Voice Support',
            ticketType: 'INQUIRY',
            mainCategory: 'Telephony',
            description: `Inbound/Outbound call from ${fromNumber || 'Browser'} to ${toNumber || 'Customer'}`,
            status: 'OPEN',
            createdById: 'admin-1',
            clientId: client.id,
          }],
          skipDuplicates: true,
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.error('Database call logging error:', dbErr);
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Voice webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}