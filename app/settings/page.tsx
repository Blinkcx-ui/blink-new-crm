import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;
  const isAr = lang === 'ar';

  let clients: any[] = [];
  let connectedChannels: any[] = [];
  let users: any[] = [];
  let ticketConfigs: any[] = [];

  try {
    const dbClient = (prisma as any).client || (prisma as any).Client || (prisma as any).tenant;
    if (dbClient) {
      clients = await dbClient.findMany({ orderBy: { createdAt: 'desc' } });
    }

    const dbChannel = (prisma as any).channelAccount || (prisma as any).channel || (prisma as any).integration;
    if (dbChannel) {
      connectedChannels = await dbChannel.findMany({ orderBy: { createdAt: 'desc' } });
    }

    const dbUser = (prisma as any).user || (prisma as any).User;
    if (dbUser) {
      users = await dbUser.findMany({ orderBy: { createdAt: 'desc' } });
    }

    const dbTicketConfig = (prisma as any).ticketConfig || (prisma as any).TicketConfig;
    if (dbTicketConfig) {
      ticketConfigs = await dbTicketConfig.findMany();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  }

  async function handleAddChannel(formData: FormData) {
    'use server';
    const platform = formData.get('platform') as string;
    const accountName = formData.get('accountName') as string;
    const identifier = formData.get('identifier') as string;
    const accessToken = formData.get('accessToken') as string;

    if (!platform || !identifier) return;

    try {
      const dbChannel = (prisma as any).channelAccount || (prisma as any).channel || (prisma as any).integration;
      if (dbChannel) {
        await dbChannel.create({
          data: { platform, accountName: accountName || platform, identifier, accessToken: accessToken || '', status: 'CONNECTED' },
        });
      }
    } catch (e) {
      console.error(e);
    }
    revalidatePath('/settings');
  }

  async function handleCreateUser(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;

    if (!email || !name) return;

    try {
      const dbUser = (prisma as any).user || (prisma as any).User;
      if (dbUser) {
        await dbUser.create({
          data: { name, email, role: role || 'AGENT', passwordHash: 'secure_placeholder' },
        });
      }
    } catch (e) {
      console.error(e);
    }
    revalidatePath('/settings');
  }

  const platforms = [
    { key: 'WHATSAPP', name: 'WhatsApp Business', icon: '💬' },
    { key: 'INSTAGRAM', name: 'Instagram', icon: '📸' },
    { key: 'X', name: 'X (Twitter)', icon: '✖️' },
    { key: 'GOOGLE_REVIEWS', name: 'Google Reviews', icon: '⭐' },
    { key: 'FACEBOOK', name: 'Facebook Messenger', icon: '👥' },
    { key: 'SNAPCHAT', name: 'Snapchat', icon: '👻' },
    { key: 'TIKTOK', name: 'TikTok', icon: '🎵' },
    { key: 'LINKEDIN', name: 'LinkedIn', icon: '💼' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 text-stone-900">
      {/* Page Header */}
      <div className="bg-[#2D2D2D] border-l-4 border-[#FF7A00] rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="bg-[#FF7A00]/20 text-[#FF7A00] text-xs font-semibold px-3 py-1 rounded-full border border-[#FF7A00]/30">
            ENTERPRISE PROVISIONING ENGINE
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-white">
            {isAr ? 'إعدادات النظام والمستأجرين' : 'System Settings & Tenants'}
          </h1>
          <p className="text-stone-300 text-sm mt-1">
            {isAr ? 'التحكم في العملاء، المستخدمين، القنوات، الاتصال، والتذاكر.' : 'Complete multi-tenant control center: clients, users, omnichannel accounts, telephony, tickets, and reports.'}
          </p>
        </div>
      </div>

      {/* Section 1: Provision New Client Tenant */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {isAr ? '1. إنشاء نسخة للنظام / مستأجر جديد' : '1. Create Entire System Copy / New Client Tenant'}
        </h3>
        <form action={async (formData) => {
          'use server';
          const name = formData.get('name') as string;
          const slug = formData.get('slug') as string;
          const logoUrl = formData.get('logoUrl') as string;
          if (!name || !slug) return;
          try {
            const dbClient = (prisma as any).client || (prisma as any).Client || (prisma as any).tenant;
            if (dbClient) {
              await dbClient.create({ data: { name, slug, logoUrl: logoUrl || null } });
            }
          } catch (e) {
            console.error(e);
          }
          revalidatePath('/settings');
        }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{isAr ? 'اسم الشركة' : 'Client Company Name'}</label>
            <input type="text" name="name" required placeholder="e.g. Acme Corp" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{isAr ? 'معرف الرابط الفرعي' : 'Unique Subdomain Slug'}</label>
            <input type="text" name="slug" required placeholder="e.g. acme-corp" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{isAr ? 'رابط الشعار' : 'Logo Asset URL'}</label>
            <input type="url" name="logoUrl" placeholder="https://..." className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-6 py-2.5 rounded-xl transition text-sm">
              {isAr ? 'إنشاء العميل واستنساخ القوالب' : 'Provision Client & Clone Templates'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: User Provisioning & RBAC */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {isAr ? '2. إدارة المستخدمين والصلاحيات (RBAC)' : '2. User Provisioning & RBAC Management'}
        </h3>
        <form action={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.customerName}</label>
            <input type="text" name="name" placeholder="John Doe" required className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{t.emailAddress}</label>
            <input type="email" name="email" placeholder="john@client.com" required className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">{isAr ? 'دور الصلاحيات' : 'Access Role'}</label>
            <select name="role" className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              <option value="ADMIN" className="text-stone-900">ADMIN (Full Access)</option>
              <option value="SUPERVISOR" className="text-stone-900">SUPERVISOR (Monitoring & Reports)</option>
              <option value="AGENT" className="text-stone-900">AGENT (Workspace & Tickets)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#2D2D2D] hover:bg-stone-800 text-white font-medium py-2 rounded-xl text-xs transition">
              {isAr ? '+ إنشاء مستخدم' : '+ Create User'}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase">
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-stone-50">
                  <td className="py-2.5 px-3 font-semibold text-stone-900">{u.name}</td>
                  <td className="py-2.5 px-3 text-stone-600 font-mono text-xs">{u.email}</td>
                  <td className="py-2.5 px-3"><span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded font-bold">{u.role}</span></td>
                  <td className="py-2.5 px-3 text-right"><span className="text-red-500 hover:underline text-xs cursor-pointer">Revoke</span></td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center py-4 text-stone-400 text-xs">No users provisioned yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Omnichannel Social Accounts Manager */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          {isAr ? '3. إدارة حسابات التواصل الاجتماعي متعددة القنوات' : '3. Omnichannel Social Accounts Manager (Multi-Account Support)'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {platforms.map((p) => {
            const count = connectedChannels.filter((c: any) => c.platform === p.key).length;
            return (
              <div key={p.key} className="border border-stone-200 rounded-xl p-4 flex flex-col justify-between bg-stone-50/50">
                <div>
                  <span className="text-xl">{p.icon}</span>
                  <h4 className="font-bold text-stone-900 text-sm mt-2">{p.name}</h4>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">{count} connected</p>
                </div>
                <div className="mt-4 text-xs font-semibold text-[#FF7A00] bg-orange-50 py-1.5 px-2 rounded text-center border border-orange-100">
                  Ready to link
                </div>
              </div>
            );
          })}
        </div>

        <form action={handleAddChannel} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Platform</label>
            <select name="platform" required className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]">
              {platforms.map(p => <option key={p.key} value={p.key} className="text-stone-900">{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Account Label</label>
            <input type="text" name="accountName" placeholder="Support Line 1" required className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Identifier / Number</label>
            <input type="text" name="identifier" placeholder="+19995550192" required className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">API Token</label>
            <input type="password" name="accessToken" placeholder="Token" required className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:border-[#FF7A00]" />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="bg-[#FF7A00] hover:bg-[#e06c00] text-white font-medium px-6 py-2 rounded-xl text-xs transition">
              + Save & Connect Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}