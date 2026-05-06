import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  CreditCard, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Clock,
  Search,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

export default function Layout() {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: Object.values(UserRole) },
    { name: 'Patients', icon: Users, path: '/patients', roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE] },
    { name: 'Visits & Queue', icon: Calendar, path: '/visits', roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE] },
    { name: 'Pharmacy', icon: Pill, path: '/pharmacy', roles: [UserRole.ADMIN, UserRole.PHARMACIST] },
    { name: 'Laboratory', icon: FlaskConical, path: '/laboratory', roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE] },
    { name: 'Billing', icon: CreditCard, path: '/billing', roles: [UserRole.ADMIN, UserRole.ACCOUNTANT] },
    { name: 'Staff Control', icon: UserPlus, path: '/staff', roles: [UserRole.ADMIN] },
    { name: 'Attendance', icon: Clock, path: '/attendance', roles: Object.values(UserRole) },
    { name: 'Admin Panels', icon: Settings, path: '/admin', roles: [UserRole.ADMIN] },
  ];

  const filteredMenu = menuItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-200">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">D</div>
            <div className="leading-tight">
              <h1 className="text-white font-bold text-sm tracking-tight uppercase">Divine Love</h1>
              <p className="text-blue-400 text-[10px] font-semibold tracking-widest uppercase">Medical System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 px-2">Main Menu</div>
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-blue-600/10 text-blue-400" 
                    : "text-slate-400 hover:bg-slate-800"
                )}
              >
                {isActive && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                {!isActive && <Icon className="h-4 w-4 text-slate-500" />}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
              {profile?.name?.[0]}
            </div>
            <div className="text-xs">
              <p className="text-white font-medium truncate w-32">{profile?.name}</p>
              <p className="text-slate-500 uppercase font-bold tracking-tighter text-[9px]">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-slate-400 rounded-lg hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 h-full w-4 ml-3" />
            <input 
              type="text" 
              placeholder="Search patients, staff, or drugs..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <span className="text-lg">🔔</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Action
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
