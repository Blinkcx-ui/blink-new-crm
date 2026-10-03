import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  let tickets: any[] = [];
  let users: any[] = [];

  try {
    const dbTicket = (prisma as any).ticket || (prisma as any).Ticket;
    if (dbTicket) {
      tickets = await dbTicket.findMany({ 
        include: { customer: true, assignedAgent: true },
        orderBy: { createdAt: 'desc' } 
      });
    }
    const dbUser = (prisma as any).user || (prisma as any).User;
    if (dbUser) {
      users = await dbUser.findMany();
    }
  } catch (err) {
    console.error('Fetch tickets error:', err);
  }

  async function handleCreateTicket(formData: FormData) {
    'use server';
    const customerName = formData.get('customerName') as string;
    const customerMobile = formData.get('customerMobile') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const assignedAgentId = formData.get('assignedAgentId') as string;
    const ticketName = (formData.get('ticketName') as string) || 'New Ticket';
    const ticketType = formData.get('ticketType') as string;
    const city = formData.get('city') as string;
    const status = formData.get('status') as string;
    const category1 = formData.get('category1') as string;
    const category2 = formData.get('category2') as string;
    const category3 = formData.get('category3') as string;
    const category4 = formData.get('category4') as string;
    const source = formData.get('source') as string;
    const description = formData.get('description') as string;
    const closedBy = formData.get('closedBy') as string;
    const solution = formData.get('solution') as string;

    if (!customerName || !customerMobile) return;

    try {
      let client = await prisma.client.findFirst();
      if (!client) {
        client = await prisma.client.create({ data: { name: 'Default Enterprise', slug: 'default-enterprise-' + Date.now() } });
      }

      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({ 
          data: { name: 'Super Admin', email: `admin_${Date.now()}@blink.com`, password: 'placeholder', role: 'SUPER_ADMIN', clientId: client.id } 
        });
      }

      let customer = await prisma.customer.findFirst({
        where: { mobile: customerMobile, clientId: client.id }
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            mobile: customerMobile,
            email: customerEmail || null,
            city: city || 'Riyadh',
            clientId: client.id,
          }
        });
      }

      await prisma.ticket.create({
        data: {
          ticketRef: `TICK-${Date.now().toString().slice(-6)}`,
          source: source || 'CALL_CENTER',
          department: category1 || 'General Support',
          ticketType: ticketType || 'INQUIRY',
          mainCategory: category1 || 'General',
          subCategory: category2 ? `${category2} / ${category3 || ''} / ${category4 || ''}` : null,
          description: description ? `${ticketName}: ${description}` : ticketName,
          employeeNotes: solution ? `Solution: ${solution} | ClosedBy: ${closedBy}` : null,
          status: status || 'OPEN',
          customerId: customer.id,
          createdById: user.id,
          clientId: client.id,
          assignedAgentId: assignedAgentId && assignedAgentId !== 'Unassigned' ? assignedAgentId : null,
        },
      });
    } catch (e) {
      console.error('Create ticket error:', e);
    }

    revalidatePath('/tickets');
    revalidatePath('/customers');
  }

  const saudiCities = [
    'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 
    'Khobar', 'Tabuk', 'Abha', 'Khamis Mushait', 'Taif', 'Buraydah', 'Jizan'
  ];

  const channels = [
    { key: 'CALL_CENTER', name: 'Call Center' },
    { key: 'WHATSAPP', name: 'WhatsApp' },
    { key: 'INSTAGRAM', name: 'Instagram' },
    { key: 'X_TWITTER', name: 'X (Twitter)' },
    { key: 'GOOGLE_REVIEWS', name: 'Google Reviews' },
    { key: 'FACEBOOK', name: 'Facebook' },
    { key: 'SNAPCHAT', name: 'Snapchat' },
    { key: 'TIKTOK', name: 'TikTok' },
    { key: 'EMAIL', name: 'Email' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-stone-900">
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            ENTERPRISE TICKETING MODULE
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">
            {lang === 'ar' ? 'التذاكر والدعم الفني متعدد القنوات' : 'Omnichannel Tickets & Support'}
          </h1>
          <p className="text-stone-300 text-sm mt-1">
            {lang === 'ar' 
              ? 'إنشاء، تتبع، وحل التذاكر مع مستويات تصنيف متعددة وحفظ مباشر في قاعدة البيانات.' 
              : 'Create, track, and resolve tickets with multi-level category dependencies and live database persistence.'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {lang === 'ar' ? 'إنشاء تذكرة مؤسسية جديدة' : 'Create New Enterprise Ticket'}
        </h3>

        <form action={handleCreateTicket} className="space-y-6">
          <div>
            <h4 className="text-xs font-bold text-[#FF7A00] uppercase tracking-wider mb-3">
              {lang === 'ar' ? '1. معلومات العميل (يتم حفظه تلقائياً في قائمة العملاء)' : '1. Customer Information (Auto-saved to Customer 360)'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.customerName}</label>
                <input type="text" name="customerName" required placeholder="Full Name" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.mobile}</label>
                <input type="text" name="customerMobile" required placeholder="+966 50 000 0000" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.email}</label>
                <input type="email" name="customerEmail" placeholder="customer@domain.com" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#FF7A00] uppercase tracking-wider mb-3">
              {lang === 'ar' ? '2. تفاصيل التذكرة والتوجيه' : '2. Ticket Details & Routing'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'عنوان التذكرة' : 'Ticket Name'}</label>
                <input type="text" name="ticketName" defaultValue="New Ticket" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'نوع التذكرة' : 'Ticket Type'}</label>
                <select name="ticketType" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                  <option value="INQUIRY" className="text-stone-900">{lang === 'ar' ? 'استفسار' : 'Inquiry'}</option>
                  <option value="COMPLAINT" className="text-stone-900">{lang === 'ar' ? 'شكوى' : 'Complaint'}</option>
                  <option value="FOLLOW_UP" className="text-stone-900">{lang === 'ar' ? 'متابعة' : 'Follow Up'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'المدينة (المملكة العربية السعودية)' : 'City (Saudi Arabia)'}</label>
                <select name="city" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                  {saudiCities.map(c => <option key={c} value={c} className="text-stone-900">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.status}</label>
                <select name="status" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                  <option value="OPEN" className="text-stone-900">{lang === 'ar' ? 'مفتوح' : 'Open'}</option>
                  <option value="PENDING" className="text-stone-900">{lang === 'ar' ? 'معلق' : 'Pending'}</option>
                  <option value="WAITING_RESPONSE" className="text-stone-900">{lang === 'ar' ? 'بانتظار الرد' : 'Waiting Response'}</option>
                  <option value="CLOSED" className="text-stone-900">{lang === 'ar' ? 'مغلق' : 'Closed'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'التصنيف الأول' : 'Category 1'}</label>
                <input type="text" name="category1" placeholder="e.g. Technical" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'التصنيف الثاني (تابع)' : 'Category 2 (Dependency)'}</label>
                <input type="text" name="category2" placeholder="e.g. Network" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'التصنيف الثالث (تابع)' : 'Category 3 (Dependency)'}</label>
                <input type="text" name="category3" placeholder="e.g. Fiber" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'التصنيف الرابع (تابع)' : 'Category 4 (Dependency)'}</label>
                <input type="text" name="category4" placeholder="e.g. Outage" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'قناة التذكرة' : 'Ticket Source'}</label>
                <select name="source" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                  {channels.map(ch => <option key={ch.key} value={ch.key} className="text-stone-900">{ch.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.assignedTo}</label>
                <select name="assignedAgentId" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                  <option value="Unassigned" className="text-stone-900">{lang === 'ar' ? 'غير مسند' : 'Unassigned'}</option>
                  {users.map((u: any) => <option key={u.id} value={u.id} className="text-stone-900">{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'نوع الإغلاق (FCR / تصعيد)' : 'Closed By (Resolution Type)'}</label>
                <select name="closedBy" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                  <option value="OPEN" className="text-stone-900">{lang === 'ar' ? 'مفتوح / نشط' : 'Open / Active'}</option>
                  <option value="FCR" className="text-stone-900">{lang === 'ar' ? 'حل من أول اتصال (FCR)' : 'FCR (First Contact Resolution)'}</option>
                  <option value="ESCALATED" className="text-stone-900">{lang === 'ar' ? 'تم التصعيد' : 'Escalated'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                <textarea name="description" rows={3} placeholder="Detailed ticket description..." className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'حل التذكرة' : 'Ticket Solution'}</label>
                <textarea name="solution" rows={3} placeholder="Resolution notes..." className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-6 py-2.5 rounded-xl transition text-sm shadow">
              {lang === 'ar' ? 'إنشاء تذكرة وحفظ العميل' : 'Create Live Ticket & Save Customer'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {lang === 'ar' ? 'قاعدة بيانات التذاكر النشطة' : 'Active Tickets Database'} ({tickets.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase">
                <th className="py-3 px-3">Ref</th>
                <th className="py-3 px-3">{lang === 'ar' ? 'التذكرة / العنوان' : 'Ticket / Description'}</th>
                <th className="py-3 px-3">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                <th className="py-3 px-3">{lang === 'ar' ? 'المدينة' : 'City'}</th>
                <th className="py-3 px-3">{lang === 'ar' ? 'المصدر' : 'Source'}</th>
                <th className="py-3 px-3">{t.status}</th>
                <th className="py-3 px-3">{t.assignedTo}</th>
                <th className="py-3 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {tickets.map((t: any) => (
                <tr key={t.id} className="hover:bg-stone-50">
                  <td className="py-3 px-3 font-mono text-xs text-stone-500">{t.ticketRef}</td>
                  <td className="py-3 px-3 font-semibold text-stone-900">{t.description || t.mainCategory}</td>
                  <td className="py-3 px-3 text-stone-700">
                    {t.customer?.name || 'N/A'} <br />
                    <span className="text-xs font-mono text-stone-500">{t.customer?.mobile}</span>
                  </td>
                  <td className="py-3 px-3 text-stone-700">{t.customer?.city || 'Riyadh'}</td>
                  <td className="py-3 px-3">
                    <span className="bg-stone-100 text-stone-800 text-xs px-2 py-0.5 rounded font-medium">{t.source}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold">{t.status}</span>
                  </td>
                  <td className="py-3 px-3 text-stone-700">{t.assignedAgent?.name || 'Unassigned'}</td>
                  <td className="py-3 px-3 text-right">
                    <a 
                      href={`/customers?profile=${t.customer?.id || ''}`} 
                      className="text-[#FF7A00] font-medium hover:underline text-xs bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 inline-block"
                    >
                      {lang === 'ar' ? 'عرض الملف' : 'View Profile'}
                    </a>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-stone-400 text-xs">
                    {lang === 'ar' ? 'لا توجد تذاكر مسجلة في قاعدة البيانات بعد.' : 'No tickets recorded in PostgreSQL yet. Create your first ticket above.'}
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