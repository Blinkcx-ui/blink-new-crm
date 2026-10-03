import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { translations } from '@/lib/translations';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const userEmail = cookieStore.get('USER_SESSION')?.value;
  const isAr = lang === 'ar';
  const t = translations[lang] || translations.en;

  let currentUser: any = null;
  if (userEmail) {
    try {
      const dbUser = (prisma as any).user || (prisma as any).User;
      if (dbUser) {
        currentUser = await dbUser.findFirst({ where: { email: userEmail } });
      }
    } catch (e) {
      console.error('Layout user fetch error:', e);
    }
  }

  // If no user session exists, render children directly (e.g. Login Page) without sidebar/header
  if (!currentUser) {
    return (
      <html lang={lang} dir={isAr ? 'rtl' : 'ltr'}>
        <body className="bg-stone-900 text-stone-100 font-sans antialiased" suppressHydrationWarning>
          {children}
        </body>
      </html>
    );
  }

  const role = currentUser?.role || 'AGENT';

  // Flexible role mapping for SUPER_ADMIN, ADMIN, SUPERVISOR, AGENT
  const isAdminOrSuper = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OWNer';
  const canViewWorkspaceAndTickets = isAdminOrSuper || role === 'AGENT';
  const canViewMonitoringAndReports = isAdminOrSuper || role === 'SUPERVISOR';

  return (
    <html lang={lang} dir={isAr ? 'rtl' : 'ltr'}>
      <body className="bg-stone-100 text-stone-900 font-sans antialiased" suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden">
          
          {/* Sidebar Navigation */}
          <aside className={`w-72 bg-[#2D2D2D] text-stone-300 flex flex-col justify-between border-${isAr ? 'l' : 'r'} border-stone-800`}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-white tracking-wider">BLINK <span className="text-[#FF7A00]">ENTERPRISE</span></h1>
              </div>
              <p className="text-[10px] text-stone-400 mt-1 uppercase font-mono">Role: {role}</p>

              <nav className="mt-8 space-y-1.5 text-xs font-semibold">
                <a href="/" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">📊 {t.dashboard}</a>
                
                {canViewWorkspaceAndTickets && (
                  <>
                    <a href="/workspace" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">💬 {t.workspace}</a>
                    <a href="/tickets" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">🎫 {t.tickets}</a>
                    <a href="/customers" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">👥 {t.customers}</a>
                  </>
                )}

                {canViewMonitoringAndReports && (
                  <>
                    <a href="/call-logs" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">📞 {t.callLogs}</a>
                    <a href="/monitoring" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">🟢 {t.monitoring}</a>
                    <a href="/reports" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">📈 {t.reports}</a>
                  </>
                )}

                {isAdminOrSuper && (
                  <a href="/settings" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition text-stone-300">⚙ {t.settings}</a>
                )}
              </nav>
            </div>

            {/* Language & Logout Footer */}
            <div className="p-4 border-t border-stone-800 bg-[#252525] flex items-center justify-between">
              <div className="flex gap-1">
                <a href="/api/lang?loc=en" className={`px-2 py-1 rounded font-bold text-xs ${!isAr ? 'bg-[#FF7A00] text-white' : 'text-stone-400'}`}>EN</a>
                <a href="/api/lang?loc=ar" className={`px-2 py-1 rounded font-bold text-xs ${isAr ? 'bg-[#FF7A00] text-white' : 'text-stone-400'}`}>عربي</a>
              </div>
              <form action={async () => {
                'use server';
                const cs = await cookies();
                cs.delete('USER_SESSION');
                redirect('/login');
              }}>
                <button type="submit" className="text-[10px] text-stone-400 hover:text-white underline bg-transparent border-0 cursor-pointer">Logout</button>
              </form>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-y-auto">
            <header className="h-16 bg-white border-b border-stone-200 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                {t.enterpriseContactCenter}
              </span>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#FF7A00] text-white font-bold flex items-center justify-center text-xs shadow">
                  {currentUser?.name?.[0] || 'SA'}
                </span>
              </div>
            </header>

            <div className="p-8">
              {children}
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}