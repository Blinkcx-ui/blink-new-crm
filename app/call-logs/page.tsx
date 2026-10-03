import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function CallLogsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  const resolvedSearchParams = await searchParams;
  const filterEvent = resolvedSearchParams?.event;

  let callLogs: any[] = [];

  try {
    const dbCall = (prisma as any).callLog || (prisma as any).CallLog || (prisma as any).liveCallSession;
    if (dbCall) {
      const whereClause = filterEvent ? { event: filterEvent } : {};
      callLogs = await dbCall.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    }
  } catch (err) {
    console.error('Fetch call logs error:', err);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-stone-900">
      {/* Page Header */}
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            ENTERPRISE TELEPHONY ARCHIVE
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">{t.callLogsTitle}</h1>
          <p className="text-stone-300 text-sm mt-1">
            {t.callLogsSubtitle}
          </p>
        </div>
        <div>
          <a
            href={`/api/reports/calls${filterEvent ? `?event=${filterEvent}` : ''}`}
            target="_blank"
            className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-5 py-2.5 rounded-xl transition text-sm shadow flex items-center gap-2"
          >
            {t.downloadCallReport}
          </a>
        </div>
      </div>

      {/* Filters & Statistics Bar */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-500 uppercase">{t.filterByEvent}</span>
          <div className="flex gap-2">
            <a href="/call-logs" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!filterEvent ? 'bg-[#FF7A00] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {t.allEvents}
            </a>
            <a href="/call-logs?event=completed_by_agent" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterEvent === 'completed_by_agent' ? 'bg-[#FF7A00] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {t.completedByAgent}
            </a>
            <a href="/call-logs?event=completed_by_caller" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterEvent === 'completed_by_caller' ? 'bg-[#FF7A00] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {t.completedByCaller}
            </a>
            <a href="/call-logs?event=abandon" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterEvent === 'abandon' ? 'bg-[#FF7A00] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {t.abandon}
            </a>
          </div>
        </div>
        <div className="text-xs font-mono text-stone-500">
          Total Records Found: <strong className="text-stone-900">{callLogs.length}</strong>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase">
                <th className="py-3 px-3">{t.date}</th>
                <th className="py-3 px-3">{t.queue}</th>
                <th className="py-3 px-3">{t.agent}</th>
                <th className="py-3 px-3">{t.number}</th>
                <th className="py-3 px-3">{t.event}</th>
                <th className="py-3 px-3">{t.waitTime}</th>
                <th className="py-3 px-3">{t.talkTime}</th>
                <th className="py-3 px-3">{t.uniqueid}</th>
                <th className="py-3 px-3 text-right">{t.recordingPlayback}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {callLogs.map((log: any) => (
                <tr key={log.id || log.uniqueid} className="hover:bg-stone-50">
                  <td className="py-3 px-3 text-stone-600 text-xs">
                    {new Date(log.createdAt || log.date || Date.now()).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-semibold text-stone-800">{log.queue || 'Support Queue'}</td>
                  <td className="py-3 px-3 text-stone-700">{log.agent || 'Unassigned'}</td>
                  <td className="py-3 px-3 font-mono text-xs text-stone-900">{log.number || log.customerMobile}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                      log.event === 'completed_by_agent' ? 'bg-emerald-100 text-emerald-800' :
                      log.event === 'completed_by_caller' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.event || 'completed_by_agent'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-stone-600">{log.waitTime || '00:12'}</td>
                  <td className="py-3 px-3 font-mono text-xs text-stone-600">{log.talkTime || '02:45'}</td>
                  <td className="py-3 px-3 font-mono text-xs text-stone-500">{log.uniqueid || log.id.slice(0, 8)}</td>
                  <td className="py-3 px-3 text-right">
                    {log.recordingUrl ? (
                      <div className="flex items-center justify-end gap-2">
                        <audio controls className="h-8 w-32">
                          <source src={log.recordingUrl} type="audio/mpeg" />
                        </audio>
                        <a 
                          href={log.recordingUrl} 
                          download={`call-${log.uniqueid || log.id}.mp3`}
                          className="text-xs font-semibold text-[#FF7A00] hover:underline bg-orange-50 px-2 py-1 rounded border border-orange-200"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400 font-mono">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
              {callLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-stone-400 text-xs">
                    No call logs archived in database yet. Incoming calls via Twilio / 3CX with audio recordings will appear here automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}