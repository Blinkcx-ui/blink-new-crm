import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';
import WorkspaceDialpadClient from '@/app/components/WorkspaceDialpadClient';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function WorkspacePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ threadId?: string; incomingCall?: string }> 
}) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  const resolvedSearchParams = await searchParams;
  const incomingCallMobile = resolvedSearchParams?.incomingCall;

  let channels: any[] = [];
  let threads: any[] = [];
  let activeThread: any = null;
  let messages: any[] = [];
  let callerProfile: any = null;

  try {
    const dbChannel = (prisma as any).channelAccount || (prisma as any).channel || (prisma as any).integration;
    if (dbChannel) channels = await dbChannel.findMany();

    const dbThread = (prisma as any).conversation || (prisma as any).thread || (prisma as any).ticket;
    if (dbThread) {
      threads = await dbThread.findMany({ orderBy: { updatedAt: 'desc' } });
      const selectedId = resolvedSearchParams?.threadId || threads[0]?.id;
      if (selectedId) {
        activeThread = threads.find((t: any) => t.id === selectedId) || threads[0];
      }
    }

    const dbMessage = (prisma as any).message || (prisma as any).chatMessage;
    if (dbMessage && activeThread) {
      messages = await dbMessage.findMany({
        where: { threadId: activeThread.id },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (incomingCallMobile) {
      const dbCustomer = (prisma as any).customer || (prisma as any).Customer;
      if (dbCustomer) {
        callerProfile = await dbCustomer.findFirst({
          where: { mobile: incomingCallMobile },
          include: { tickets: true, socialAccounts: true },
        });
      }
      if (!callerProfile) {
        callerProfile = {
          name: lang === 'ar' ? 'عميل مميز (مكالمة واردة)' : 'VIP Client (Inbound Call)',
          mobile: incomingCallMobile,
          socialAccounts: [{ platform: 'WhatsApp', handle: '@vip_saudi' }],
          tickets: [{ title: lang === 'ar' ? 'انقطاع شبكة الألياف' : 'Fiber Network Outage', status: 'OPEN' }],
          recentCasesSummary: lang === 'ar' ? 'اتصل العميل مرتين هذا الأسبوع بخصوص تعديل الفواتير.' : 'Customer called twice this week regarding billing adjustments.',
        };
      }
    }
  } catch (err) {
    console.error('Workspace fetch error:', err);
  }

  async function handleSendMessage(formData: FormData) {
    'use server';
    const threadId = formData.get('threadId') as string;
    const content = formData.get('content') as string;
    if (!content || !threadId) return;
    try {
      const dbMessage = (prisma as any).message || (prisma as any).chatMessage;
      if (dbMessage) {
        await dbMessage.create({
          data: { threadId, content, senderType: 'AGENT', senderName: 'Super Admin' },
        });
      }
    } catch (e) {
      console.error(e);
    }
    revalidatePath('/workspace');
  }

  return (
    <div className="relative h-[calc(100vh-7rem)] flex bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden text-stone-900">
      
      {/* 1. INBOUND CALL SCREEN-POP MODAL */}
      {incomingCallMobile && (
        <div className="absolute inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-4 border-[#FF7A00] shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="bg-orange-100 text-[#FF7A00] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  {lang === 'ar' ? '📞 مكالمة واردة مباشرة...' : '📞 LIVE INBOUND CALL RINGING...'}
                </span>
                <h3 className="text-2xl font-black text-stone-900 mt-2">{callerProfile?.name}</h3>
                <p className="text-sm font-mono text-stone-600">{callerProfile?.mobile || incomingCallMobile}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase">{lang === 'ar' ? 'حسابات التواصل الاجتماعي' : 'Saved Social Accounts'}</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {callerProfile?.socialAccounts?.map((acc: any, i: number) => (
                    <span key={i} className="bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium">
                      {acc.platform}: {acc.handle}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase">{lang === 'ar' ? 'ملخص الحالات الأخيرة' : 'Recent Cases Summary'}</h4>
                <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200 mt-1">
                  {callerProfile?.recentCasesSummary}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <a href="/workspace" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-center text-sm shadow transition">
                {lang === 'ar' ? 'قبول المكالمة' : 'Accept Call'}
              </a>
              <a href="/workspace" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-center text-sm shadow transition">
                {lang === 'ar' ? 'رفض / إنهاء' : 'Reject / End'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. Left Sidebar: Conversations List */}
      <div className="w-80 border-r border-stone-200 flex flex-col bg-stone-50/50">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">{lang === 'ar' ? 'صندوق الوارد متعدد القنوات' : 'Omnichannel Inbox'}</h3>
          <span className="bg-[#FF7A00]/10 text-[#FF7A00] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#FF7A00]/20">
            {threads.length} {lang === 'ar' ? 'نشط' : 'Active'}
          </span>
        </div>

        <div className="p-3 border-b border-stone-200 bg-white">
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث في المحادثات...' : 'Search chats or mobile...'}
            className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-xs bg-stone-50 focus:outline-none focus:border-[#FF7A00]"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {threads.map((thread: any) => (
            <a
              key={thread.id}
              href={`/workspace?threadId=${thread.id}`}
              className={`block p-4 hover:bg-stone-100 transition ${activeThread?.id === thread.id ? 'bg-orange-50/60 border-l-4 border-[#FF7A00]' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">{thread.customerName || thread.title || 'Customer Chat'}</h4>
                <span className="text-[10px] text-stone-400 font-mono">
                  {new Date(thread.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate mt-1">
                {thread.customerMobile || thread.description || 'Incoming message...'}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="bg-stone-200 text-stone-700 text-[10px] px-2 py-0.5 rounded font-medium">
                  {thread.source || 'WHATSAPP'}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                  {thread.status || 'OPEN'}
                </span>
              </div>
            </a>
          ))}
          {threads.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-xs">
              {lang === 'ar' ? 'لا توجد محادثات نشطة في قاعدة البيانات بعد.' : 'No live conversations in database yet.'}
            </div>
          )}
        </div>
      </div>

      {/* 3. Center: Active Chat Conversation Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeThread ? (
          <>
            <div className="h-16 border-b border-stone-200 px-6 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FF7A00] text-white font-bold flex items-center justify-center text-sm shadow">
                  {(activeThread.customerName || 'C')[0]}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{activeThread.customerName || 'Customer'}</h4>
                  <p className="text-xs text-stone-500">{activeThread.customerMobile || 'Verified Contact'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/workspace?incomingCall=+966501122334"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition shadow"
                >
                  {lang === 'ar' ? 'محاكاة مكالمة واردة 📞' : 'Simulate Inbound Call 📞'}
                </a>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-stone-50/30">
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 p-3.5 rounded-2xl max-w-md shadow-sm">
                  <p className="text-xs font-semibold text-[#FF7A00] mb-1">{activeThread.customerName || 'Customer'}</p>
                  <p className="text-sm text-stone-800">{activeThread.description || activeThread.title || 'Hello, I need assistance.'}</p>
                </div>
              </div>

              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.senderType === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3.5 rounded-2xl max-w-md shadow-sm ${msg.senderType === 'AGENT' ? 'bg-[#FF7A00] text-white' : 'bg-white border border-stone-200 text-stone-800'}`}>
                    <p className="text-xs font-semibold opacity-80 mb-1">{msg.senderName}</p>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-stone-200 bg-white">
              <form action={handleSendMessage} className="flex gap-3">
                <input type="hidden" name="threadId" value={activeThread.id} />
                <input
                  type="text"
                  name="content"
                  required
                  placeholder={lang === 'ar' ? 'اكتب ردك هنا...' : 'Type your reply...'}
                  className="flex-1 px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-[#FF7A00]"
                />
                <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-6 py-2.5 rounded-xl transition text-sm">
                  {lang === 'ar' ? 'إرسال الرد' : 'Send Reply'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <h3 className="text-base font-bold text-stone-700 mb-1">{lang === 'ar' ? 'لم يتم تحديد أي محادثة' : 'No conversation selected'}</h3>
            <p className="text-xs max-w-sm mb-4">{lang === 'ar' ? 'اختر محادثة من القائمة أو اختبر شاشة المكالمات الواردة.' : 'Select a chat from the left or test the live telephony screen-pop below.'}</p>
            <a
              href="/workspace?incomingCall=+966509998877"
              className="bg-[#FF7A00] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow hover:bg-[#e06c00] transition"
            >
              {lang === 'ar' ? 'اختبار منبه المكالمات الواردة 📞' : 'Test Inbound Call Pop-up 📞'}
            </a>
          </div>
        )}
      </div>

      {/* 4. Right Sidebar: Telephony WebRTC Dialpad System */}
      <WorkspaceDialpadClient lang={lang} />

    </div>
  );
}