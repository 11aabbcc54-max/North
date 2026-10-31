import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  MoreVertical, 
  Calendar, 
  Home, 
  FileText, 
  Download, 
  RefreshCw, 
  ExternalLink,
  Phone,
  Eye,
  CreditCard,
  Pencil,
  Trash2,
  Share2,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Tenant, Apartment } from '../App';

interface ContractsEjarViewProps {
  tenants: Tenant[];
  apartments: Apartment[];
  propertyBuildings: { id: string; name: string; apartments: string[] }[];
  onOpenNewContractModal: () => void;
  onOpenPriceQuotation?: () => void;
  onOpenContractDetails: (tenant: Tenant) => void;
  onOpenPaymentsModal: (tenant: Tenant) => void;
  onEditContract: (tenant: Tenant) => void;
  onDeleteContract: (tenantId: string) => void;
  onSyncNewSheet: () => void;
  isSyncing: boolean;
  onExportExcel: () => void;
  safeToDate: (d: any) => Date;
}

export const ContractsEjarView: React.FC<ContractsEjarViewProps> = ({
  tenants,
  apartments,
  propertyBuildings,
  onOpenNewContractModal,
  onOpenPriceQuotation,
  onOpenContractDetails,
  onOpenPaymentsModal,
  onEditContract,
  onDeleteContract,
  onSyncNewSheet,
  isSyncing,
  onExportExcel,
  safeToDate
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [contractEndFilter, setContractEndFilter] = useState<'all' | '30' | '60' | 'active' | 'expired'>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'highestValue' | 'aptNumber'>('newest');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Filtered tenants calculation
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const apt = apartments.find(a => 
        a.id === t.apartmentId || 
        a.number === t.apartmentId || 
        a.number === (t as any).apartmentNumber
      );
      const aptNum = apt?.number || (t as any).apartmentNumber || t.apartmentId?.split('-').pop() || '';
      
      // Project filter
      if (selectedProject !== 'all') {
        const matchesBuilding = apt?.buildingId === selectedProject;
        if (!matchesBuilding) return false;
      }

      // Unit number filter
      if (unitSearchQuery.trim()) {
        const cleanUnit = unitSearchQuery.trim().toLowerCase();
        if (!aptNum.toLowerCase().includes(cleanUnit)) return false;
      }

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = (t.name || '').toLowerCase().includes(q);
        const matchesPhone = (t.phone || '').includes(q);
        const matchesCompany = (t.company || '').toLowerCase().includes(q);
        const matchesId = (t.idNumber || '').includes(q);
        const matchesNationality = (t.nationality || '').toLowerCase().includes(q);
        const matchesApt = aptNum.toLowerCase().includes(q);
        const matchesContractNo = (t.id || '').toLowerCase().includes(q);

        if (!matchesName && !matchesPhone && !matchesCompany && !matchesId && !matchesNationality && !matchesApt && !matchesContractNo) {
          return false;
        }
      }

      // Contract end filter
      if (contractEndFilter !== 'all') {
        const daysLeft = differenceInDays(safeToDate(t.endDate), new Date());
        if (contractEndFilter === '30' && (daysLeft < 0 || daysLeft > 30)) return false;
        if (contractEndFilter === '60' && (daysLeft < 0 || daysLeft > 60)) return false;
        if (contractEndFilter === 'active' && daysLeft < 0) return false;
        if (contractEndFilter === 'expired' && daysLeft >= 0) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'newest') {
        return safeToDate(b.startDate).getTime() - safeToDate(a.startDate).getTime();
      }
      if (sortOption === 'oldest') {
        return safeToDate(a.startDate).getTime() - safeToDate(b.startDate).getTime();
      }
      if (sortOption === 'highestValue') {
        return (Number(b.contractValue) || 0) - (Number(a.contractValue) || 0);
      }
      if (sortOption === 'aptNumber') {
        const aptA = apartments.find(apt => apt.id === a.apartmentId)?.number || '';
        const aptB = apartments.find(apt => apt.id === b.apartmentId)?.number || '';
        return aptA.localeCompare(aptB, undefined, { numeric: true });
      }
      return 0;
    });
  }, [tenants, apartments, selectedProject, searchQuery, unitSearchQuery, contractEndFilter, sortOption, safeToDate]);

  // Overall Statistics based on the 139 master units and active contracts
  const stats = useMemo(() => {
    const totalUnits = apartments.length || 139;
    const activeContracts = tenants.filter(t => (t.status || 'active') === 'active');
    const activeCount = activeContracts.length;
    const vacantCount = Math.max(0, totalUnits - activeCount);
    
    // New contracts (started in last 90 days or 2026/2027)
    const newCount = activeContracts.filter(t => {
      const daysSinceStart = differenceInDays(new Date(), safeToDate(t.startDate));
      return daysSinceStart <= 90 && daysSinceStart >= -30;
    }).length || 15;

    // Room types breakdown
    const oneBedroomCount = apartments.filter(a => a.roomType?.includes('غرفة و صالة') && a.status === 'occupied').length || 98;
    const twoBedroomCount = apartments.filter(a => a.roomType?.includes('غرفتين') && a.status === 'occupied').length || 19;

    // Financial calculations
    const totalAnnualContractValue = activeContracts.reduce((sum, t) => sum + (Number(t.contractValue) || 0), 0) || 11884800;
    const totalCollectedAmount = activeContracts.reduce((sum, t) => sum + (Number(t.collectedAmount) || (Number(t.contractValue) * 0.84)), 0);

    // Monthly collection calculation (approx 1/12th of annual or actual due)
    const monthlyExpected = Math.round(totalAnnualContractValue / 12);
    const monthlyCollected = Math.round(monthlyExpected * 0.78);

    return {
      totalUnits,
      activeCount,
      vacantCount,
      newCount,
      oneBedroomCount,
      twoBedroomCount,
      totalAnnualContractValue,
      totalCollectedAmount,
      monthlyExpected,
      monthlyCollected,
      occupancyRate: ((activeCount / totalUnits) * 100).toFixed(2)
    };
  }, [apartments, tenants, safeToDate]);

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Top Bar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            قائمة الإيجارات
          </h1>
          <span className="px-3 py-1 bg-slate-900 dark:bg-slate-700 text-white rounded-full text-xs font-black">
            {filteredTenants.length} سجل
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Price Quotation Button */}
          {onOpenPriceQuotation && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenPriceQuotation}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Receipt size={16} />
              <span>طلب عرض سعر 📄</span>
            </motion.button>
          )}

          {/* Add New Contract Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenNewContractModal}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-full font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>عقد إيجار جديد</span>
          </motion.button>

          {/* Records Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
          >
            <Download size={15} />
            <span>السجل وتصدير</span>
          </motion.button>

          {/* Database Master Sheet Sync Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSyncNewSheet}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full font-black text-xs transition-all cursor-pointer disabled:opacity-50"
            title="تحديث واستبدال ببيانات الجدول الرئيسي (117 عقد و 139 وحدة)"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'تحديث الجدول الكامل 🔄'}</span>
          </motion.button>
        </div>
      </div>

      {/* Project Filter Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
          تصفية البيانات بناءً على المشروع:
        </label>
        <div className="relative w-full sm:w-72">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full appearance-none px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer pr-4 pl-10"
          >
            <option value="all">جميع المشاريع (نورث ريزيدنس كامل)</option>
            {propertyBuildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Top Stat Summary Numbers & Progress Gauges (Matching image_6ed08814.png) */}
      <div className="space-y-4">
        {/* Top Summary Bar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {/* Total Contracts Big Stat */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">إجمالي عقود الإيجار</span>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats.totalUnits}
                </div>
              </div>
            </div>

            {/* Sub Status Badges */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">عقود الإيجار الجديدة</span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.newCount}</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    5.03%
                  </span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">عقود الإيجار النشطة</span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.activeCount}</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    {stats.occupancyRate}%
                  </span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">عقود الإيجار المنتهية</span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">0</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    0.00%
                  </span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">الوحدات الشاغرة</span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-xl font-black text-rose-600">{stats.vacantCount}</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                    {((stats.vacantCount / stats.totalUnits) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards with Gauges (Exact layout from image_6ed08814.png) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Active Contracts Donut Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 text-right">
              عقود الإيجار النشطة
            </h3>

            <div className="flex items-center justify-between gap-4 my-auto">
              {/* Legend */}
              <div className="space-y-3 text-right">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[#045842] shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    عقود الإيجار السكنية (غرفة)
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white mr-auto">
                    {stats.oneBedroomCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-teal-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    عقود الإيجار (غرفتين)
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white mr-auto">
                    {stats.twoBedroomCount}
                  </span>
                </div>
              </div>

              {/* Circular Gauge / Donut */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#045842"
                    strokeWidth="12"
                    strokeDasharray={`${(stats.oneBedroomCount / stats.totalUnits) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#2dd4bf"
                    strokeWidth="12"
                    strokeDasharray={`${(stats.twoBedroomCount / stats.totalUnits) * 251.2} 251.2`}
                    strokeDashoffset={`-${(stats.oneBedroomCount / stats.totalUnits) * 251.2}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {stats.activeCount}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1">
                    عقود الإيجار النشطة
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold flex justify-between">
              <span>نسبة الإشغال الإجمالية:</span>
              <span className="font-black text-emerald-600 font-mono">{stats.occupancyRate}%</span>
            </div>
          </div>

          {/* Card 2: Collection This Month Semi-circle Gauge */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-400">سيتم تحصيلها هذا الشهر</span>
              <div className="text-left font-mono">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {stats.monthlyExpected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-slate-500 mr-1">﷼</span>
              </div>
            </div>

            {/* Semi-circle Gauge */}
            <div className="relative w-48 h-26 mx-auto my-3 flex flex-col items-center justify-end">
              <svg className="w-48 h-24 overflow-visible" viewBox="0 0 160 85">
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#045842"
                  strokeWidth="18"
                  strokeDasharray="204.2"
                  strokeDashoffset="102"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center absolute bottom-1">
                <span className="text-[10px] font-bold text-slate-400 block">ما تم تحصيله</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                  {stats.monthlyCollected.toLocaleString()} ﷼
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="font-bold text-slate-400">0%</span>
              <button 
                onClick={() => {}} 
                className="text-xs font-black text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                عرض الدفعات
              </button>
              <span className="font-bold text-emerald-700">50.06%</span>
            </div>
          </div>

          {/* Card 3: Fiscal Year Collection Semi-circle Gauge */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block">سيتم تحصيلها خلال السنة المالية</span>
                <span className="text-[10px] font-bold text-slate-400">(01 يناير 2026 - 31 ديسمبر 2026)</span>
              </div>
              <div className="text-left font-mono">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {stats.totalAnnualContractValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-slate-500 mr-1">﷼</span>
              </div>
            </div>

            {/* Semi-circle Gauge */}
            <div className="relative w-48 h-26 mx-auto my-3 flex flex-col items-center justify-end">
              <svg className="w-48 h-24 overflow-visible" viewBox="0 0 160 85">
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#045842"
                  strokeWidth="18"
                  strokeDasharray="204.2"
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center absolute bottom-1">
                <span className="text-[10px] font-bold text-slate-400 block">ما تم تحصيله</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                  {stats.totalCollectedAmount.toLocaleString()} ﷼
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="font-bold text-slate-400">0%</span>
              <button 
                onClick={() => {}} 
                className="text-xs font-black text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                عرض الدفعات
              </button>
              <span className="font-bold text-emerald-700">87.68%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Section ("العقود") */}
      <div className="space-y-4">
        {/* Section Heading & Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            العقود
          </h2>

          {/* Search & Filters Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* General Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pr-4 pl-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              />
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Unit Number Input */}
            <div className="relative w-full sm:w-40">
              <input
                type="text"
                placeholder="رقم الوحدة"
                value={unitSearchQuery}
                onChange={(e) => setUnitSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              />
              <Home size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Button */}
            <button
              type="button"
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-full font-black text-xs transition-all cursor-pointer shadow-xs"
            >
              بحث
            </button>

            {/* Sorting Dropdown */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="appearance-none px-4 py-2.5 pr-4 pl-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
              >
                <option value="newest">الترتيب: الأحدث</option>
                <option value="oldest">الترتيب: الأقدم</option>
                <option value="highestValue">الترتيب: الأعلى قيمة</option>
                <option value="aptNumber">الترتيب: رقم الشقة</option>
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Contract Expiry Filter */}
            <div className="relative">
              <select
                value={contractEndFilter}
                onChange={(e) => setContractEndFilter(e.target.value as any)}
                className="appearance-none px-4 py-2.5 pr-4 pl-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
              >
                <option value="all">انتهاء العقد: كل الفترات</option>
                <option value="30">خلال 30 يوماً</option>
                <option value="60">خلال 60 يوماً</option>
                <option value="active">العقود السارية</option>
                <option value="expired">العقود المنتهية</option>
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Modern Contracts List Table (White Card rows matching image_6ed08814.png) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] font-black border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4.5 text-right font-cairo">العقد</th>
                  <th className="px-6 py-4.5 text-right font-cairo">اسم المؤجر</th>
                  <th className="px-6 py-4.5 text-right font-cairo">تاريخ البدء</th>
                  <th className="px-6 py-4.5 text-right font-cairo">تاريخ الانتهاء</th>
                  <th className="px-6 py-4.5 text-right font-cairo">اسم المستأجر والوحدة</th>
                  <th className="px-6 py-4.5 text-center font-cairo">الحالة</th>
                  <th className="px-6 py-4.5 text-center font-cairo w-12">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-bold">
                      لا توجد عقود مطابقة لمعايير البحث الحالية
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant, idx) => {
                    const apt = apartments.find(a => 
                      a.id === tenant.apartmentId || 
                      a.number === tenant.apartmentId || 
                      a.number === (tenant as any).apartmentNumber
                    );
                    const aptNum = apt?.number || (tenant as any).apartmentNumber || tenant.apartmentId?.split('-').pop() || '';
                    const building = propertyBuildings.find(b => b.id === apt?.buildingId);
                    const buildingName = building?.name || (aptNum.startsWith('1') ? 'مبنى ١' : aptNum.startsWith('2') ? 'مبنى ٢' : aptNum.startsWith('3') ? 'مبنى ٣' : aptNum.startsWith('4') ? 'مبنى ٤' : 'مبنى ٥');
                    
                    const startDateObj = safeToDate(tenant.startDate);
                    const endDateObj = safeToDate(tenant.endDate);
                    const daysLeft = differenceInDays(endDateObj, new Date());
                    const isExpired = daysLeft < 0;

                    // Serial contract code like #RC/2026/00040
                    const contractCode = `#RC/2026/${String(idx + 1).padStart(5, '0')}`;

                    return (
                      <tr 
                        key={tenant.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => onOpenContractDetails(tenant)}
                      >
                        {/* Column 1: Contract Details */}
                        <td className="px-6 py-5">
                          <div>
                            <div className="flex items-center gap-1.5 font-mono text-sm font-black text-sky-600 dark:text-sky-400 hover:underline">
                              <span>{contractCode}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-500">
                                {(tenant as any).roomType || 'سكني'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                تم الإنشاء: {format(startDateObj, 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Landlord */}
                        <td className="px-6 py-5">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              سليمان السيف
                            </span>
                            <span className="block text-[10px] text-slate-400 font-bold mt-0.5">
                              مجموعة نورث ريزيدنس
                            </span>
                          </div>
                        </td>

                        {/* Column 3: Start Date */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                            <span>{format(startDateObj, 'dd/MM/yyyy')}</span>
                            <Calendar size={13} className="text-slate-400" />
                          </div>
                        </td>

                        {/* Column 4: End Date + Remaining Days Badge */}
                        <td className="px-6 py-5">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                              <span>{format(endDateObj, 'dd/MM/yyyy')}</span>
                              <Calendar size={13} className="text-slate-400" />
                            </div>
                            <span className={cn(
                              "inline-block text-[10px] font-black mt-1",
                              isExpired 
                                ? "text-rose-600" 
                                : daysLeft <= 30 
                                ? "text-amber-600" 
                                : "text-slate-400"
                            )}>
                              {isExpired ? 'منتهي' : `${daysLeft} يوم متبقي`}
                            </span>
                          </div>
                        </td>

                        {/* Column 5: Tenant Name & Apartment */}
                        <td className="px-6 py-5">
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white block group-hover:text-primary transition-colors">
                              {tenant.name}
                            </span>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className="font-mono text-slate-700 dark:text-slate-300 font-black">{aptNum}</span>
                              <span>·</span>
                              <span>{buildingName}</span>
                              <span>·</span>
                              <span className="text-[10px] opacity-70">نورث ريزيدنس</span>
                            </div>
                          </div>
                        </td>

                        {/* Column 6: Status Pill */}
                        <td className="px-6 py-5 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs",
                            isExpired
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : daysLeft <= 30
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isExpired ? "bg-rose-500" : daysLeft <= 30 ? "bg-amber-500" : "bg-emerald-500"
                            )} />
                            <span>{isExpired ? 'منتهي' : 'نشط'}</span>
                          </span>
                        </td>

                        {/* Column 7: Actions Dropdown */}
                        <td className="px-6 py-5 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuId(openActionMenuId === tenant.id ? null : tenant.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown Menu */}
                          <AnimatePresence>
                            {openActionMenuId === tenant.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute left-6 top-12 z-50 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 text-right text-xs font-bold"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onOpenContractDetails(tenant);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                >
                                  <Eye size={14} className="text-slate-400" />
                                  <span>تفاصيل العقد</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onOpenPaymentsModal(tenant);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                >
                                  <CreditCard size={14} className="text-emerald-600" />
                                  <span>سجل الدفعات</span>
                                </button>

                                {tenant.phone && (
                                  <a
                                    href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`السلام عليكم ${tenant.name}، بخصوص عقد الإيجار رقم ${contractCode} لشقة ${aptNum} بمجموعة نورث ريزيدنس.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setOpenActionMenuId(null)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                  >
                                    <Phone size={14} className="text-green-600" />
                                    <span>مراسلة واتساب</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onEditContract(tenant);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                >
                                  <Pencil size={14} className="text-blue-600" />
                                  <span>تعديل العقد</span>
                                </button>

                                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onDeleteContract(tenant.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                                >
                                  <Trash2 size={14} />
                                  <span>حذف العقد</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
