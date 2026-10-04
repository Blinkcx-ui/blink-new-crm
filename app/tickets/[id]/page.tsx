import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';
import Link from 'next/link';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  const resolvedParams = await params;
  const ticketId = resolvedParams.id;

  let ticket: any = null;
  let users: any[] = [];

  try {
    ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { customer: true, assignedAgent: true, client: true },
    });
    users = await prisma.user.findMany();
  } catch (err) {
    console.error('Fetch ticket detail error:', err);
  }

  async function handleUpdateTicket(formData: FormData) {
    'use server';
    const status = formData.get('status') as string;
    const assignedAgentId = formData.get('assignedAgentId') as string;
    const solution = formData.get('solution') as string;

    try {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: status as any,
          assignedAgentId: assignedAgentId && assignedAgentId !== 'Unassigned' ? assignedAgentId : null,
          employeeNotes: solution ? solution : undefined,
          closeDate: status === 'CLOSED' || status === 'SOLVED' ? new Date() : null,
        },
      });
    } catch (e) {
      console.error('Update ticket error:', e);
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath('/tickets');
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-stone-500">
        <h2 className="text-xl font-bold">{lang === 'ar' ? 'التذكرة غير موجودة' : 'Ticket Not Found'}</h2>
        <Link href="/tickets" className="text-[#FF7A00] underline text-sm mt-2 inline-block">
          {lang === 'ar' ? 'العودة إلى التذاكر' : 'Back to Tickets'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 text-stone-900">
      <div className="flex items-center justify-between">
        <Link href="/tickets" className="text-xs font-semibold text-stone-500 hover:text-[#FF7A00] transition">
          ← {lang === 'ar' ? 'العودة لقائمة التذاكر' : 'Back to Tickets'}
        </Link>
        <span className="bg-orange-100 text-[#FF7A00] text-xs font-mono font-bold px-3 py-1 rounded-full">
          {ticket.ticketRef}
        </span>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="border-b border-stone-100 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-stone-900">{ticket.description || ticket.mainCategory}</h1>
            <p className="text-xs text-stone-500 mt-1">
              {lang === 'ar' ? 'تم الإنشاء في:' : 'Created at:'} {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="bg-stone-100 text-stone-800 text-xs font-bold px-3 py-1 rounded-lg">
            {ticket.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
            <h3 className="text-xs font-bold text-[#FF7A00] uppercase">{lang === 'ar' ? 'معلومات العميل' : 'Customer Info'}</h3>
            <p><strong className="text-stone-500">Name:</strong> {ticket.customer?.name}</p>
            <p><strong className="text-stone-500">Mobile:</strong> {ticket.customer?.mobile}</p>
            <p><strong className="text-stone-500">City:</strong> {ticket.customer?.city || 'Riyadh'}</p>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
            <h3 className="text-xs font-bold text-[#FF7A00] uppercase">{lang === 'ar' ? 'التوجيه والإسناد' : 'Routing & Assignment'}</h3>
            <p><strong className="text-stone-500">Source:</strong> {ticket.source}</p>
            <p><strong className="text-stone-500">Type:</strong> {ticket.ticketType}</p>
            <p><strong className="text-stone-500">Assigned Agent:</strong> {ticket.assignedAgent?.name || 'Unassigned'}</p>
          </div>
        </div>

        <form action={handleUpdateTicket} className="border-t border-stone-100 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-stone-900">{lang === 'ar' ? 'تحديث حالة وحل التذكرة' : 'Update Ticket Status & Solution'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.status}</label>
              <select name="status" defaultValue={ticket.status} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                <option value="OPEN">Open</option>
                <option value="PENDING">Pending</option>
                <option value="SOLVED">Solved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.assignedTo}</label>
              <select name="assignedAgentId" defaultValue={ticket.assignedAgentId || 'Unassigned'} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
                <option value="Unassigned">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{lang === 'ar' ? 'ملاحظات وحل التذكرة' : 'Solution / Notes'}</label>
            <textarea name="solution" rows={3} defaultValue={ticket.employeeNotes || ''} placeholder="Type resolution notes..." className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-6 py-2.5 rounded-xl transition text-sm shadow">
              {lang === 'ar' ? 'حفظ التحديثات' : 'Save Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}