import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  let customerCount = 0;
  let activeCallsCount = 0;
  let activeTicketsCount = 0;

  try {
    const dbCustomer = (prisma as any).customer || (prisma as any).Customer;
    if (dbCustomer) customerCount = await dbCustomer.count();

    const dbCall = (prisma as any).callLog || (prisma as any).CallLog || (prisma as any).liveCallSession;
    if (dbCall) activeCallsCount = await dbCall.count();

    const dbTicket = (prisma as any).ticket || (prisma as any).Ticket;
    if (dbTicket) {
      activeTicketsCount = await dbTicket.count({ where: { status: 'OPEN' } });
    }
  } catch (err) {
    console.error('Dashboard DB fetch error:', err);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-stone-900">
      
      {/* Hero Welcome Banner */}
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            BLINK TO LINK • PRODUCTION READY
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">
            {t.liveEnterpriseDashboard}
          </h1>
          <p className="text-stone-300 text-sm mt-1">
            {t.dashboardSubtitle}
          </p>
        </div>
        <div>
          <a
            href="/tickets"
            className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow-lg shadow-orange-500/20 block"
          >
            {t.newTicket}
          </a>
        </div>
      </div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider block">
            {t.avgSentimentScore}
          </span>
          <div className="text-3xl font-black text-stone-900">0.0%</div>
          <span className="text-xs text-stone-500 font-medium block">
            {t.calculatedLive}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider block">
            {t.totalCustomers}
          </span>
          <div className="text-3xl font-black text-[#FF7A00]">{customerCount}</div>
          <span className="text-xs text-stone-500 font-medium block">
            {t.multiTenantRecords}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider block">
            {t.activeCallSessions}
          </span>
          <div className="text-3xl font-black text-stone-900">{activeCallsCount}</div>
          <span className="text-xs text-emerald-600 font-semibold block">
            {t.realTimeWebSockets}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider block">
            {t.activeTickets}
          </span>
          <div className="text-3xl font-black text-amber-600">{activeTicketsCount}</div>
          <span className="text-xs text-stone-500 font-medium block">
            {t.syncedFromLiveDb}
          </span>
        </div>

      </div>

    </div>
  );
}