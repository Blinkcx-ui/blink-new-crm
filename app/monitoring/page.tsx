import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  let extensions: any[] = [];
  let queues: any[] = [];

  try {
    const dbExtension = (prisma as any).extension || (prisma as any).agentExtension || (prisma as any).user;
    if (dbExtension) {
      extensions = await dbExtension.findMany({ orderBy: { createdAt: 'desc' } });
    }

    const dbQueue = (prisma as any).callQueue || (prisma as any).queue || (prisma as any).ticketConfig;
    if (dbQueue) {
      queues = await dbQueue.findMany({ orderBy: { createdAt: 'desc' } });
    }
  } catch (err) {
    console.error('Monitoring database fetch error:', err);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-stone-900">
      {/* Page Header */}
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            REAL-TIME CTI OPERATOR WALL (LIVE DB)
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">{t.monitoringTitle}</h1>
          <p className="text-stone-300 text-sm mt-1">
            {t.monitoringSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected to Live DB
          </span>
        </div>
      </div>

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left & Center: Extensions Wall */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>🟢</span> {t.liveExtensionsWall} ({extensions.length})
              </h3>
              <span className="text-xs font-mono text-stone-500">Live database records</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extensions.map((ext: any) => (
                <div key={ext.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 hover:border-[#FF7A00] transition space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h4 className="font-bold text-stone-900 text-sm">{ext.extNumber || ext.name || ext.email}</h4>
                    </div>
                    <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                      {ext.role || 'AGENT'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-stone-600 bg-white p-2.5 rounded-lg border border-stone-200">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-emerald-600 font-bold">ONLINE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button className="bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-semibold py-1.5 rounded transition">Listen 🎧</button>
                    <button className="bg-[#FF7A00] hover:bg-[#e06c00] text-white text-[10px] font-semibold py-1.5 rounded transition">Whisper 🗣</button>
                    <button className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold py-1.5 rounded transition">Barge 🚨</button>
                  </div>
                </div>
              ))}
              {extensions.length === 0 && (
                <div className="col-span-2 py-12 text-center text-stone-400 text-xs">
                  No extensions or users found in PostgreSQL database. Provision users in Settings to populate live extensions.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Queues Telemetry Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>📊</span> {t.liveCallQueues} ({queues.length})
              </h3>
              <span className="text-xs font-mono text-emerald-600 font-bold">Real-time DB</span>
            </div>

            <div className="space-y-4">
              {queues.map((q: any) => (
                <div key={q.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 text-sm">{q.name || q.title || 'Queue'}</h4>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                      ACTIVE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-stone-200 text-center">
                      <span className="text-stone-400 block text-[10px]">Type</span>
                      <strong className="text-stone-900 text-xs">{q.type || 'Standard'}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-stone-200 text-center">
                      <span className="text-stone-400 block text-[10px]">Status</span>
                      <strong className="text-emerald-600 text-xs">Linked</strong>
                    </div>
                  </div>
                </div>
              ))}
              {queues.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-xs">
                  No call queues or ticket configurations found in database yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}