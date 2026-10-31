import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Repeat,
  User,
  SlidersHorizontal,
  Gamepad2,
  Calendar,
  Droplets,
  Wrench,
  Home,
  Car,
  CalendarPlus,
  Building2,
  FileText,
  Users,
  Settings,
  LogOut,
  X,
  Hotel
} from 'lucide-react';
import { cn } from './lib/utils';

export interface AssetsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  appName?: string;
  appLogo?: string | null;
  isAdmin: boolean;
  setIsBrandingModalOpen?: (open: boolean) => void;
  user: any;
  logout: () => void;
  getExpiringContracts?: (days: number) => any[];
  BUILDINGS?: string[];
  isMobile?: boolean;
}

interface MenuItemDef {
  id: string;
  label: string;
  icon: any;
  targetTab: string;
  badge?: number | string;
}

export const AssetsSidebar: React.FC<AssetsSidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen: _isSidebarOpen,
  setIsSidebarOpen,
  appName = 'North Residence',
  appLogo,
  isAdmin: _isAdmin,
  setIsBrandingModalOpen,
  user,
  logout,
  getExpiringContracts,
  BUILDINGS = ['نظافة نورث'],
  isMobile = false,
}) => {
  const expiringCount = getExpiringContracts ? getExpiringContracts(30).length : 0;
  const contractsBadge = expiringCount > 0 ? expiringCount : undefined;

  // The 15 items in exact order as shown in image_1e72482e.png
  const items: MenuItemDef[] = [
    {
      id: 'daily-tasks',
      label: 'المهام اليومية',
      icon: CalendarCheck,
      targetTab: 'daily-tasks',
    },
    {
      id: 'تكرار الطلبات',
      label: 'تكرار الطلبات',
      icon: Repeat,
      targetTab: 'تكرار الطلبات',
    },
    {
      id: 'staff',
      label: 'إدارة العمالة',
      icon: User,
      targetTab: 'staff',
    },
    {
      id: 'club-subscriptions',
      label: 'اشتراكات النادي',
      icon: SlidersHorizontal,
      targetTab: 'club-subscriptions',
    },
    {
      id: 'طلبات الماء',
      label: 'إدارة المياه والمخزون',
      icon: Droplets,
      targetTab: 'طلبات الماء',
    },
    {
      id: 'طلبات الصيانة',
      label: 'طلبات الصيانة',
      icon: Wrench,
      targetTab: 'طلبات الصيانة',
    },
    // Building tab: نظافة نورث
    {
      id: 'نظافة نورث',
      label: 'نظافة نورث',
      icon: Home,
      targetTab: 'نظافة نورث',
    },
    // Any extra buildings in BUILDINGS if not already included
    ...BUILDINGS.filter(b => b !== 'نظافة نورث').map(b => ({
      id: b,
      label: b,
      icon: Home,
      targetTab: b,
    })),
    {
      id: 'تنظيف سيارات',
      label: 'تنظيف السيارات',
      icon: Car,
      targetTab: 'تنظيف سيارات',
    },
    {
      id: 'car-subscriptions',
      label: 'اشتراكات السيارات',
      icon: CalendarPlus,
      targetTab: 'car-subscriptions',
    },
    {
      id: 'property-units',
      label: 'إدارة الوحدات',
      icon: Home,
      targetTab: 'property-units',
    },
    {
      id: 'tenants',
      label: 'العقود',
      icon: FileText,
      targetTab: 'tenants',
      badge: contractsBadge,
    },
    {
      id: 'users',
      label: 'إدارة المستخدمين',
      icon: Users,
      targetTab: 'users',
    },
    {
      id: 'settings',
      label: 'إعدادات الهوية',
      icon: Settings,
      targetTab: 'settings',
    },
  ];

  const handleItemClick = (item: MenuItemDef) => {
    if (item.id === 'settings') {
      if (setIsBrandingModalOpen) {
        setIsBrandingModalOpen(true);
      } else {
        setActiveTab('settings');
      }
    } else {
      setActiveTab(item.targetTab);
    }
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Fyozr';
  const displayRole = user?.role || 'مسؤول النظام';
  const initialLetter = (displayName?.[0] || 'F').toUpperCase();

  return (
    <div
      dir="rtl"
      className="w-full h-full flex flex-col bg-white text-slate-800 font-cairo select-none"
    >
      {/* Top Header: North Residence */}
      <div className="pt-6 pb-4 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          {/* Dark Navy Residence Icon Squircle */}
          <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="w-7 h-7 object-contain" />
            ) : (
              <Hotel className="w-6 h-6 stroke-[1.9]" />
            )}
          </div>
          {/* Title */}
          <div className="text-right select-none">
            <h1 className="text-xl font-black text-[#0f172a] leading-none tracking-tight">North</h1>
            <p className="text-xl font-black text-[#0f172a] leading-tight tracking-tight mt-0.5">Residence</p>
          </div>
        </div>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Top Divider */}
      <div className="w-full h-px bg-slate-200/80 mb-3 shrink-0" />

      {/* Navigation Pills List */}
      <div className="flex-1 overflow-y-auto px-4 py-1 space-y-2.5 custom-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.targetTab ||
            activeTab === item.id ||
            (item.id === 'property-units' && activeTab === 'apartments');

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleItemClick(item)}
              className={cn(
                "w-full flex items-center justify-between px-5 py-3 rounded-full text-sm font-bold transition-all duration-150 cursor-pointer group",
                isActive
                  ? "bg-[#121a2d] text-white shadow-md shadow-slate-900/15"
                  : "bg-white border border-slate-200/85 text-slate-700 hover:border-pink-200/80 hover:bg-gradient-to-l hover:from-pink-50/40 hover:to-white hover:text-slate-900 shadow-[0_2px_5px_rgba(0,0,0,0.03)]"
              )}
            >
              {/* Right side in RTL (Text & Icon) */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tracking-normal">{item.label}</span>
              </div>

              {/* Left side in RTL (Badge if any + Icon) */}
              <div className="flex items-center gap-2.5">
                {item.badge !== undefined && (
                  <span className="w-6 h-6 rounded-full bg-[#f43f5e] text-white text-xs font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-all group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-600 group-hover:text-teal-700"
                  )}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom Divider */}
      <div className="w-full h-px bg-slate-200/80 mt-2 shrink-0" />

      {/* Bottom User Profile Card */}
      <div className="p-3.5 mx-3.5 my-3 rounded-[1.85rem] bg-[#f4f7fb] border border-[#e1eaf2] text-center shadow-xs shrink-0">
        {/* User Info Row */}
        <div className="flex items-center justify-between px-1">
          <div className="text-right">
            <div className="font-bold text-slate-800 text-sm leading-tight">{displayName}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{displayRole}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
            {initialLetter}
          </div>
        </div>

        {/* Pink Logout Button */}
        <button
          onClick={logout}
          className="w-full mt-3 py-2.5 px-4 rounded-2xl bg-[#fff0f3] text-[#e11d48] border border-[#ffe4e6] hover:bg-[#ffe4e6] flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer shadow-xs active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};
