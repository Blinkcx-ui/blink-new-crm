import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

async function handleCreateCustomer(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const mobile = formData.get('mobile') as string;
  const email = formData.get('email') as string;
  const assignedTo = formData.get('assignedTo') as string;
  const socialPlatform = formData.get('socialPlatform') as string;
  const socialHandle = formData.get('socialHandle') as string;

  if (!name || !mobile) return;

  try {
    const dbCustomer = (prisma as any).customer || (prisma as any).Customer;
    if (dbCustomer) {
      const existing = await dbCustomer.findFirst({ where: { mobile } });
      if (existing) {
        console.error('Customer with this mobile number already exists.');
        return;
      }

      await dbCustomer.create({
        data: {
          name,
          mobile,
          email: email || '',
          assignedTo: assignedTo || 'Unassigned',
        },
      });
    }
  } catch (e) {
    console.error('Create customer error:', e);
  }

  revalidatePath('/customers');
}

export default async function CustomersPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;

  let customers: any[] = [];
  let users: any[] = [];

  try {
    const dbCustomer = (prisma as any).customer || (prisma as any).Customer;
    if (dbCustomer) {
      customers = await dbCustomer.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    const dbUser = (prisma as any).user || (prisma as any).User;
    if (dbUser) {
      users = await dbUser.findMany();
    }
  } catch (err) {
    console.error('Fetch customers error:', err);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-stone-900">
      {/* Page Header */}
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            CUSTOMER 360 DIRECTORY
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">{t.customerTitle}</h1>
          <p className="text-stone-300 text-sm mt-1">
            {t.customerSubtitle}
          </p>
        </div>
        <div>
          <a
            href="/api/reports/customers"
            target="_blank"
            className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-5 py-2.5 rounded-xl transition text-sm shadow flex items-center gap-2"
          >
            {t.downloadCustomerCsv}
          </a>
        </div>
      </div>

      {/* Customer Creation Form */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {t.createNewCustomer}
        </h3>

        <form action={handleCreateCustomer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.customerName}</label>
            <input type="text" name="name" required placeholder="Full Name" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.mobileNumber}</label>
            <input type="text" name="mobile" required placeholder="+966 50 000 0000" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.emailAddress}</label>
            <input type="email" name="email" placeholder="customer@domain.com" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.assignedAgent}</label>
            <select name="assignedTo" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="Unassigned" className="text-stone-900">Unassigned</option>
              {users.map((u: any) => <option key={u.id} value={u.name} className="text-stone-900">{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.socialPlatform}</label>
            <select name="socialPlatform" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="" className="text-stone-900">None</option>
              <option value="WhatsApp" className="text-stone-900">WhatsApp</option>
              <option value="Instagram" className="text-stone-900">Instagram</option>
              <option value="X" className="text-stone-900">X (Twitter)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.socialHandle}</label>
            <input type="text" name="socialHandle" placeholder="@handle" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-6 py-2.5 rounded-xl transition text-sm shadow">
              {t.saveCustomer}
            </button>
          </div>
        </form>
      </div>

      {/* Customers Directory Table */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {t.customerDirectory} ({customers.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase">
                <th className="py-3 px-3">{t.customerName}</th>
                <th className="py-3 px-3">{t.mobileNumber}</th>
                <th className="py-3 px-3">{t.email}</th>
                <th className="py-3 px-3">{t.assignedAgent}</th>
                <th className="py-3 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="py-3 px-3 font-semibold text-stone-900">{c.name}</td>
                  <td className="py-3 px-3 font-mono text-xs text-stone-900">{c.mobile}</td>
                  <td className="py-3 px-3 text-stone-600 text-xs">{c.email || 'N/A'}</td>
                  <td className="py-3 px-3 text-stone-700">{c.assignedTo}</td>
                  <td className="py-3 px-3 text-right">
                    <button className="text-[#FF7A00] font-medium hover:underline text-xs">View Profile</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-stone-400 text-xs">
                    No customer records in PostgreSQL yet. Create your first customer above.
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