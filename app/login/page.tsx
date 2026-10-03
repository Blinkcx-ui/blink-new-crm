import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { translations } from '@/lib/translations';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const t = translations[lang] || translations.en;
  const isAr = lang === 'ar';

  // Ensure a default admin exists in PostgreSQL so you can log in immediately
  try {
    const dbUser = (prisma as any).user || (prisma as any).User;
    if (dbUser) {
      const count = await dbUser.count();
      if (count === 0) {
        await dbUser.create({
          data: { name: 'Super Admin', email: 'admin@blink.com', role: 'ADMIN' }
        });
      }
    }
  } catch (e) {
    console.error('Auto-seed admin error:', e);
  }

  async function handleLogin(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;

    if (!email) return;

    try {
      const dbUser = (prisma as any).user || (prisma as any).User;
      if (dbUser) {
        const user = await dbUser.findFirst({ where: { email } });
        if (user) {
          const cookieStore = await cookies();
          cookieStore.set('USER_SESSION', user.email, { path: '/', maxAge: 86400 * 7 });
          redirect('/');
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('NEXT_REDIRECT')) throw err;
      console.error('Login error:', err);
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-8 space-y-8 text-stone-900">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-wider text-stone-900">
            BLINK <span className="text-[#FF7A00]">ENTERPRISE</span>
          </h1>
          <p className="text-xs text-stone-500 font-mono uppercase">
            {isAr ? 'تسجيل دخول موظفي مركز الاتصال' : 'Contact Center Agent Portal'}
          </p>
        </div>

        <form action={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                name="email"
                required
                defaultValue="admin@blink.com"
                placeholder="admin@blink.com"
                className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm bg-stone-50 text-stone-900 focus:outline-none focus:border-[#FF7A00]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#FF7A00] hover:bg-[#e06c00] text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-orange-500/20"
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="text-center text-xs text-stone-400 font-mono">
          {isAr ? 'اضغط تسجيل الدخول (الافتراضي: admin@blink.com)' : 'Click Sign In (Default: admin@blink.com)'}
        </div>

      </div>
    </div>
  );
}