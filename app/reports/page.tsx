import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ ticketType?: string; status?: string; city?: string; source?: string }> 
}) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  const resolvedSearchParams = await searchParams;

  let tickets: any[] = [];
  let callLogs: any[] = [];
  let savedReports: any[] = [];

  try {
    const dbTicket = (prisma as any).ticket || (prisma as any).Ticket;
    if (dbTicket) {
      const filters: any = {};
      if (resolvedSearchParams?.ticketType) filters.type = resolvedSearchParams.ticketType;
      if (resolvedSearchParams?.status) filters.status = resolvedSearchParams.status;
      if (resolvedSearchParams?.city) filters.city = resolvedSearchParams.city;
      if (resolvedSearchParams?.source) filters.source = resolvedSearchParams.source;

      tickets = await dbTicket.findMany({
        where: filters,
        orderBy: { createdAt: 'desc' },
      });
    }

    const dbCall = (prisma as any).callLog || (prisma as any).CallLog || (prisma as any).liveCallSession;
    if (dbCall) {
      callLogs = await dbCall.findMany();
    }

    const dbReport = (prisma as any).customReport || (prisma as any).CustomReport;
    if (dbReport) {
      savedReports = await dbReport.findMany({ orderBy: { createdAt: 'desc' } });
    }
  } catch (err) {
    console.error('Reports fetch error:', err);
  }

  const totalTickets = tickets.length;
  const totalCalls = callLogs.length;
  const totalOpenTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'PENDING').length;
  const totalClosedTickets = tickets.filter(t => t.status === 'CLOSED').length;
  const fcrClosedCount = tickets.filter(t => t.closedBy === 'FCR').length;
  const fcrPercentage = totalClosedTickets > 0 ? Math.round((fcrClosedCount / totalClosedTickets) * 100) : 0;

  async function handleSaveCustomReport(formData: FormData) {
    'use server';
    const reportName = formData.get('reportName') as string;
    const ticketType = formData.get('ticketType') as string;
    const status = formData.get('status') as string;
    const city = formData.get('city') as string;
    const source = formData.get('source') as string;

    if (!reportName) return;

    try {
      const dbReport = (prisma as any).customReport || (prisma as any).CustomReport;
      if (dbReport) {
        await dbReport.create({
          data: {
            reportName,
            filterCriteria: JSON.stringify({ ticketType, status, city, source }),
          },
        });
      }
    } catch (e) {
      console.error('Save report error:', e);
    }

    revalidatePath('/reports');
  }

  const saudiCities = ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Tabuk', 'Abha', 'Taif', 'Buraydah', 'Jizan'];
  const channels = ['CALL_CENTER', 'WHATSAPP', 'INSTAGRAM', 'X', 'GOOGLE_REVIEWS', 'FACEBOOK', 'SNAPCHAT', 'TIKTOK', 'LINKEDIN'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-stone-900">
      {/* Page Header */}
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            ENTERPRISE REPORTS & ANALYTICS
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">{t.reportsTitle}</h1>
          <p className="text-stone-300 text-sm mt-1">
            {t.reportsSubtitle}
          </p>
        </div>
      </div>

      {/* Top 5 Metrics Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
          <span className="text-stone-400 text-xs font-semibold uppercase block">{t.totalTickets}</span>
          <span className="text-3xl font-black text-stone-900 mt-2 block">{totalTickets}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
          <span className="text-stone-400 text-xs font-semibold uppercase block">{t.totalCalls}</span>
          <span className="text-3xl font-black text-[#FF7A00] mt-2 block">{totalCalls}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
          <span className="text-stone-400 text-xs font-semibold uppercase block">{t.openTickets}</span>
          <span className="text-3xl font-black text-amber-600 mt-2 block">{totalOpenTickets}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
          <span className="text-stone-400 text-xs font-semibold uppercase block">{t.closedTickets}</span>
          <span className="text-3xl font-black text-emerald-600 mt-2 block">{totalClosedTickets}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center col-span-2 md:col-span-1">
          <span className="text-stone-400 text-xs font-semibold uppercase block">{t.fcrPercentage}</span>
          <span className="text-3xl font-black text-blue-600 mt-2 block">{fcrPercentage}%</span>
        </div>
      </div>

      {/* Custom Report Builder & Filter Form */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-lg font-bold text-stone-900">{t.customReportBuilder}</h3>
          <a
            href="/api/reports/tickets"
            target="_blank"
            className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-4 py-2 rounded-xl transition text-xs shadow flex items-center gap-1.5"
          >
            📥 {lang === 'ar' ? 'تحميل التقرير (CSV)' : 'Download Filtered Data (CSV)'}
          </a>
        </div>

        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.ticketType}</label>
            <select name="ticketType" defaultValue={resolvedSearchParams?.ticketType || ''} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="">{lang === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
              <option value="INQUIRY">{lang === 'ar' ? 'استفسار' : 'Inquiry'}</option>
              <option value="COMPLAINT">{lang === 'ar' ? 'شكوى' : 'Complaint'}</option>
              <option value="FOLLOW_UP">{lang === 'ar' ? 'متابعة' : 'Follow Up'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.status}</label>
            <select name="status" defaultValue={resolvedSearchParams?.status || ''} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="OPEN">{lang === 'ar' ? 'مفتوح' : 'Open'}</option>
              <option value="PENDING">{lang === 'ar' ? 'معلق' : 'Pending'}</option>
              <option value="CLOSED">{lang === 'ar' ? 'مغلق' : 'Closed'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.city}</label>
            <select name="city" defaultValue={resolvedSearchParams?.city || ''} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="">{lang === 'ar' ? 'جميع المدن' : 'All Cities'}</option>
              {saudiCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.sourceChannel}</label>
            <select name="source" defaultValue={resolvedSearchParams?.source || ''} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="">{lang === 'ar' ? 'جميع المصادر' : 'All Sources'}</option>
              {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 pt-2">
            <button type="submit" className="bg-[#2D2D2D] hover:bg-stone-800 text-white font-medium px-5 py-2 rounded-xl text-xs transition">
              {t.applyFilters}
            </button>
          </div>
        </form>

        <form action={handleSaveCustomReport} className="flex gap-3 pt-2 items-center">
          <input type="hidden" name="ticketType" value={resolvedSearchParams?.ticketType || ''} />
          <input type="hidden" name="status" value={resolvedSearchParams?.status || ''} />
          <input type="hidden" name="city" value={resolvedSearchParams?.city || ''} />
          <input type="hidden" name="source" value={resolvedSearchParams?.source || ''} />

          <input type="text" name="reportName" required placeholder={lang === 'ar' ? 'أدخل اسم التقرير (مثال: شكاوى الرياض)' : 'Enter custom report name (e.g. Riyadh VIP Complaints)'} className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-5 py-2 rounded-xl text-xs transition shadow">
            {t.saveCustomReport}
          </button>
        </form>
      </div>

      {/* Saved Custom Reports & Filtered Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-900 text-sm border-b border-stone-100 pb-3">
            {t.savedCustomReports} ({savedReports.length})
          </h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {savedReports.map((r: any) => (
              <div key={r.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-xs">{r.reportName}</h4>
                  <span className="text-[10px] text-stone-400 font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <a href="/reports" className="text-[#FF7A00] hover:underline text-xs font-semibold">{lang === 'ar' ? 'تحميل' : 'Load'}</a>
              </div>
            ))}
            {savedReports.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-6">{lang === 'ar' ? 'لا توجد تقارير محفوظة بعد.' : 'No custom reports saved yet.'}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-900 text-sm border-b border-stone-100 pb-3">
            {t.filteredResultsPreview} ({tickets.length})
          </h3>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase">
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'العنوان' : 'Title'}</th>
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'المدينة' : 'City'}</th>
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="py-2.5 px-3">{t.status}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'ar' ? 'بواسطة' : 'Closed By'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{t.title}</td>
                    <td className="py-2.5 px-3 text-stone-700">{t.customerName}</td>
                    <td className="py-2.5 px-3 text-stone-600">{t.city}</td>
                    <td className="py-2.5 px-3 text-stone-600">{t.type}</td>
                    <td className="py-2.5 px-3"><span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">{t.status}</span></td>
                    <td className="py-2.5 px-3 text-right"><span className="font-mono text-stone-600">{t.closedBy || 'OPEN'}</span></td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-stone-400">{lang === 'ar' ? 'لا توجد تذاكر تطابق العوامل المحددة.' : 'No tickets match the selected filters.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}