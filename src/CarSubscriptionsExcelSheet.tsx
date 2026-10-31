import React, { useState, useMemo } from 'react';
import { 
  CalendarPlus, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Car, 
  Filter, 
  Sparkles,
  Layers,
  ArrowUpDown,
  CreditCard,
  Building,
  Check,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Info,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Timestamp, collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { db } from './firebase';

export interface CarSubscriptionRecord {
  id?: string;
  apartmentNumber: string;
  packageSize: 'كبيرة' | 'صغيرة';
  price: number;
  daysText: string;
  schedule: number[]; // 0: الأحد, 1: الاثنين, 2: الثلاثاء, 3: الأربعاء, 4: الخميس, 5: الجمعة, 6: السبت
  startDate: string;
  nextRenewalDate: string;
  paymentStatus: 'paid' | 'unpaid';
  statusText?: string;
  notes?: string;
  stopDate?: string;
  workerName?: string;
  carName?: string;
  existingReqId?: string;
}

export const INITIAL_CAR_SUBSCRIPTIONS_DATA: CarSubscriptionRecord[] = [
  {
    apartmentNumber: "522",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الأحد، الخميس",
    schedule: [0, 4],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "قلم ، شميم",
    carName: "Jetour T2"
  },
  {
    apartmentNumber: "327",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "عراف وعارفور",
    carName: "jeep wrangler"
  },
  {
    apartmentNumber: "327",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "عراف وعارفور",
    carName: "Range rover"
  },
  {
    apartmentNumber: "135",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "BMW"
  },
  {
    apartmentNumber: "135",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "FORD TERRITOR"
  },
  {
    apartmentNumber: "425",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "منصور، شهاب",
    carName: "merceds suv"
  },
  {
    apartmentNumber: "222",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "شوهاد، حسن",
    carName: "سيارة باقة كبيرة"
  },
  {
    apartmentNumber: "227",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "شوهاد، حسن",
    carName: "audi s3"
  },
  {
    apartmentNumber: "224",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "شوهاد، حسن",
    carName: "lexus es"
  },
  {
    apartmentNumber: "127",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "سيارة باقة كبيرة"
  },
  {
    apartmentNumber: "107",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "proche"
  },
  {
    apartmentNumber: "316",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "عراف وعارفور",
    carName: "mini coper"
  },
  {
    apartmentNumber: "313",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "عراف وعارفور",
    carName: "geely white"
  },
  {
    apartmentNumber: "1110",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الإثنين، الجمعة",
    schedule: [1, 5],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "شاهين، عبدالله",
    carName: "porche"
  },
  {
    apartmentNumber: "322",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الثلاثاء، الجمعة",
    schedule: [2, 5],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "عراف وعارفور",
    carName: "merceds cope"
  },
  {
    apartmentNumber: "219",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الإثنين، الخميس",
    schedule: [1, 4],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "شوهاد، حسن",
    carName: "Nissan extrail"
  },
  {
    apartmentNumber: "407",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الإثنين، الخميس",
    schedule: [1, 4],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "منصور، شهاب",
    carName: "toyota"
  },
  {
    apartmentNumber: "114",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الأحد، الخميس",
    schedule: [0, 4],
    startDate: "2026-11-01",
    nextRenewalDate: "2026-12-01",
    paymentStatus: "unpaid",
    statusText: "تبدأ في نوفمبر",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "سيارة باقة صغيرة"
  },
  {
    apartmentNumber: "106",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الأحد، الأربعاء",
    schedule: [0, 3],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "lexus es"
  },
  {
    apartmentNumber: "204",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "شوهاد، حسن",
    carName: "nissan patrol"
  },
  {
    apartmentNumber: "134",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، الجمعة",
    schedule: [2, 5],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "toyota prado"
  },
  {
    apartmentNumber: "526",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الثلاثاء، الجمعة",
    schedule: [2, 5],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "قلم ، شميم",
    carName: "genss- gray"
  },
  {
    apartmentNumber: "123",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الإثنين، الخميس",
    schedule: [1, 4],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "paid",
    statusText: "مدفوع",
    notes: "",
    workerName: "سيف ، عبدالله",
    carName: "سيارة باقة صغيرة"
  },
  {
    apartmentNumber: "1110",
    packageSize: "صغيرة",
    price: 150,
    daysText: "الإثنين، الجمعة",
    schedule: [1, 5],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "شاهين، عبدالله",
    carName: "toress"
  },
  {
    apartmentNumber: "422",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الأربعاء، السبت",
    schedule: [3, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "منصور، شهاب",
    carName: "Merceds"
  },
  {
    apartmentNumber: "419",
    packageSize: "كبيرة",
    price: 200,
    daysText: "الثلاثاء، السبت",
    schedule: [2, 6],
    startDate: "2026-10-01",
    nextRenewalDate: "2026-11-01",
    paymentStatus: "unpaid",
    statusText: "غير مدفوع",
    notes: "",
    workerName: "منصور، شهاب",
    carName: "FORD TERRITOR"
  }
];

const WEEK_DAYS = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الإثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' }
];

interface CarSubscriptionsExcelSheetProps {
  requests?: any[];
  user?: any;
  onRefreshRequests?: () => void;
  onOpenNewSubscriptionModal?: () => void;
  setActiveTab?: (tab: string) => void;
  onSelectDate?: (date: Date) => void;
  selectedMonth?: Date;
  onSelectMonth?: (date: Date) => void;
  deletedCarSubKeys?: string[];
  onDeleteAll?: () => Promise<void> | void;
  onRestoreDefaults?: () => void;
}

export const CarSubscriptionsExcelSheet: React.FC<CarSubscriptionsExcelSheetProps> = ({
  requests = [],
  user,
  onRefreshRequests,
  onOpenNewSubscriptionModal,
  setActiveTab,
  onSelectDate,
  selectedMonth: propSelectedMonth,
  onSelectMonth: propOnSelectMonth,
  deletedCarSubKeys: propDeletedCarSubKeys,
  onDeleteAll,
  onRestoreDefaults
}) => {
  // Local month state fallback to October 2026 (matching the user's base spreadsheet)
  const [internalMonth, setInternalMonth] = useState<Date>(new Date(2026, 9, 1));
  const activeMonth = propSelectedMonth || internalMonth;
  const currentMonthKey = format(activeMonth, 'yyyy-MM'); // e.g. "2026-10", "2026-11"

  const handleMonthChange = (newMonth: Date) => {
    setInternalMonth(newMonth);
    if (propOnSelectMonth) {
      propOnSelectMonth(newMonth);
    }
  };

  const [localDeletedKeys, setLocalDeletedKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fyozr_deleted_car_subs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const effectiveDeletedKeys = useMemo(() => {
    const fromProps = propDeletedCarSubKeys || [];
    return Array.from(new Set([...localDeletedKeys, ...fromProps]));
  }, [localDeletedKeys, propDeletedCarSubKeys]);

  const [records, setRecords] = useState<CarSubscriptionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fyozr_deleted_car_subs');
      const del: string[] = saved ? JSON.parse(saved) : [];
      if (del.includes('all')) return [];
      return INITIAL_CAR_SUBSCRIPTIONS_DATA.filter(r => !del.includes(r.apartmentNumber));
    } catch {
      return INITIAL_CAR_SUBSCRIPTIONS_DATA;
    }
  });

  const [recordToDelete, setRecordToDelete] = useState<CarSubscriptionRecord | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [packageFilter, setPackageFilter] = useState<'all' | 'كبيرة' | 'صغيرة'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Persistent per-month payment overrides map: { [monthKey]: { [aptNumber]: 'paid' | 'unpaid' } }
  const [monthlyPaymentOverrides, setMonthlyPaymentOverrides] = useState<Record<string, Record<string, 'paid' | 'unpaid'>>>(() => {
    try {
      const saved = localStorage.getItem('fyozr_car_sub_payments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save overrides to localStorage
  const updatePaymentOverride = (monthKey: string, aptNumber: string, status: 'paid' | 'unpaid') => {
    setMonthlyPaymentOverrides(prev => {
      const next = {
        ...prev,
        [monthKey]: {
          ...(prev[monthKey] || {}),
          [aptNumber]: status
        }
      };
      try {
        localStorage.setItem('fyozr_car_sub_payments', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Delete a single subscription record
  const handleDeleteSingleRecord = async (rec: CarSubscriptionRecord) => {
    try {
      if (rec.existingReqId) {
        try {
          await deleteDoc(doc(db, 'requests', rec.existingReqId));
        } catch (e) {
          console.error(e);
        }
      }
      const updatedKeys = Array.from(new Set([...effectiveDeletedKeys, rec.apartmentNumber, rec.id || '', rec.existingReqId || ''])).filter(Boolean);
      setLocalDeletedKeys(updatedKeys);
      localStorage.setItem('fyozr_deleted_car_subs', JSON.stringify(updatedKeys));
      setRecords(prev => prev.filter(r => r.apartmentNumber !== rec.apartmentNumber));
      if (onRefreshRequests) onRefreshRequests();
      toast.success(`تم حذف اشتراك سيارة شقة ${rec.apartmentNumber} بنجاح`);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حذف الاشتراك');
    } finally {
      setRecordToDelete(null);
    }
  };

  // Delete all subscriptions
  const handleDeleteAllRecords = async () => {
    setIsDeletingAll(true);
    const loadingToast = toast.loading('جاري حذف كافة اشتراكات تنظيف السيارات...');
    try {
      if (onDeleteAll) {
        await onDeleteAll();
      } else {
        const carReqs = requests.filter(r => r.serviceType === 'تنظيف سيارات');
        const batchSize = 25;
        for (let i = 0; i < carReqs.length; i += batchSize) {
          const chunk = carReqs.slice(i, i + batchSize);
          await Promise.all(chunk.map(r => deleteDoc(doc(db, 'requests', r.id))));
        }
      }

      const allAptKeys = INITIAL_CAR_SUBSCRIPTIONS_DATA.map(item => item.apartmentNumber);
      const newKeys = ['all', ...allAptKeys];
      setLocalDeletedKeys(newKeys);
      localStorage.setItem('fyozr_deleted_car_subs', JSON.stringify(newKeys));
      setRecords([]);
      if (onRefreshRequests) onRefreshRequests();
      toast.dismiss(loadingToast);
      toast.success('تم حذف كافة اشتراكات تنظيف السيارات بنجاح');
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error(error);
      toast.error('حدث خطأ أثناء حذف الاشتراكات');
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllModalOpen(false);
    }
  };

  // Restore default records
  const handleRestoreDefaults = () => {
    localStorage.removeItem('fyozr_deleted_car_subs');
    setLocalDeletedKeys([]);
    setRecords(INITIAL_CAR_SUBSCRIPTIONS_DATA);
    if (onRestoreDefaults) onRestoreDefaults();
    if (onRefreshRequests) onRefreshRequests();
    toast.success('تمت استعادة الاشتراكات الافتراضية بنجاح ↺');
  };

  // Determine which subscriptions are strictly active in the selected month
  const activeRecordsForMonth = useMemo(() => {
    if (effectiveDeletedKeys.includes('all')) return [];

    const mStart = startOfMonth(activeMonth);
    const mEnd = endOfMonth(activeMonth);

    return records.filter(rec => {
      if (effectiveDeletedKeys.includes(rec.apartmentNumber) || (rec.id && effectiveDeletedKeys.includes(rec.id))) {
        return false;
      }
      const recordStart = new Date(rec.startDate + 'T00:00:00');
      // If start date is after this month, not active yet (e.g. apt 114 in October)
      if (recordStart > mEnd) return false;
      // If stopped before this month
      if (rec.stopDate) {
        const recordStop = new Date(rec.stopDate + 'T23:59:59');
        if (recordStop < mStart) return false;
      }
      return true;
    });
  }, [records, activeMonth, effectiveDeletedKeys]);

  // Identify subscriptions scheduled for upcoming months (e.g., apartment 114 starting in November)
  const upcomingSubscriptions = useMemo(() => {
    if (effectiveDeletedKeys.includes('all')) return [];

    const mEnd = endOfMonth(activeMonth);
    return records.filter(rec => {
      if (effectiveDeletedKeys.includes(rec.apartmentNumber) || (rec.id && effectiveDeletedKeys.includes(rec.id))) {
        return false;
      }
      const recordStart = new Date(rec.startDate + 'T00:00:00');
      return recordStart > mEnd;
    });
  }, [records, activeMonth, effectiveDeletedKeys]);

  // Link existing requests in Firestore with local records and resolve monthly payment status
  const mergedRecords = useMemo(() => {
    if (effectiveDeletedKeys.includes('all')) return [];

    const firestoreCarReqs = requests.filter(r => 
      r.serviceType === 'تنظيف سيارات' && 
      r.isSubscription &&
      !effectiveDeletedKeys.includes(r.id) &&
      !effectiveDeletedKeys.includes(r.apartment || r.apartmentNumber)
    );
    const claimedIds = new Set<string>();

    return activeRecordsForMonth.map((rec, index) => {
      // Find matching request by apartment & index/car that hasn't been claimed yet
      const matched = firestoreCarReqs.find((r, rIdx) => {
        if (claimedIds.has(r.id)) return false;
        const aptNo = r.apartment || r.apartmentNumber;
        return (aptNo === rec.apartmentNumber && (r.price === rec.price || rIdx === index));
      }) || firestoreCarReqs.find(r => !claimedIds.has(r.id) && (r.apartment || r.apartmentNumber) === rec.apartmentNumber);

      if (matched?.id) {
        claimedIds.add(matched.id);
      }

      // Check payment status for the current active month:
      // 1. Local override for this month
      const localMonthStatus = monthlyPaymentOverrides[currentMonthKey]?.[rec.apartmentNumber];
      
      // 2. Firestore subscriptionPayments entry for this month
      let firestoreMonthStatus: 'paid' | 'unpaid' | undefined = undefined;
      if (matched && Array.isArray(matched.subscriptionPayments)) {
        const pEntry = matched.subscriptionPayments.find(p => p.monthKey === currentMonthKey);
        if (pEntry) {
          firestoreMonthStatus = pEntry.isPaid ? 'paid' : 'unpaid';
        }
      }

      // 3. Fallback: if it's the base month (2026-10), use default from table / matched; else default to unpaid
      let resolvedPaymentStatus: 'paid' | 'unpaid' = 'unpaid';
      if (localMonthStatus) {
        resolvedPaymentStatus = localMonthStatus;
      } else if (firestoreMonthStatus) {
        resolvedPaymentStatus = firestoreMonthStatus;
      } else if (currentMonthKey === '2026-10') {
        resolvedPaymentStatus = (matched?.paymentStatus || rec.paymentStatus) as 'paid' | 'unpaid';
      }

      return {
        ...rec,
        id: matched?.id || rec.id || `excel-rec-${index}-${rec.apartmentNumber}`,
        existingReqId: matched?.id,
        paymentStatus: resolvedPaymentStatus,
        statusText: resolvedPaymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'
      };
    });
  }, [activeRecordsForMonth, requests, currentMonthKey, monthlyPaymentOverrides]);

  // Dynamic KPI Calculations strictly isolated to activeMonth
  const kpis = useMemo(() => {
    const totalCount = mergedRecords.length;
    const totalMonthlyRevenue = mergedRecords.reduce((sum, r) => sum + (r.price || 0), 0);
    const paidRecords = mergedRecords.filter(r => r.paymentStatus === 'paid');
    const unpaidRecords = mergedRecords.filter(r => r.paymentStatus === 'unpaid');
    const paidRevenue = paidRecords.reduce((sum, r) => sum + (r.price || 0), 0);
    const unpaidRevenue = unpaidRecords.reduce((sum, r) => sum + (r.price || 0), 0);
    const currentWashesPerMonth = totalCount * 8; // 8 washes per month per subscriber

    return {
      totalCount,
      totalMonthlyRevenue,
      unpaidRevenue,
      paidRevenue,
      currentWashesPerMonth,
      paidCount: paidRecords.length,
      unpaidCount: unpaidRecords.length
    };
  }, [mergedRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return mergedRecords.filter(rec => {
      const matchesSearch = 
        rec.apartmentNumber.includes(searchQuery.trim()) ||
        rec.daysText.includes(searchQuery.trim()) ||
        (rec.carName && rec.carName.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
        (rec.workerName && rec.workerName.includes(searchQuery.trim()));

      const matchesStatus = 
        statusFilter === 'all' ? true : rec.paymentStatus === statusFilter;

      const matchesPackage = 
        packageFilter === 'all' ? true : rec.packageSize === packageFilter;

      return matchesSearch && matchesStatus && matchesPackage;
    });
  }, [mergedRecords, searchQuery, statusFilter, packageFilter]);

  // Toggle payment status for a record (strictly for this month)
  const handleTogglePaymentStatus = async (index: number, currentRecord: CarSubscriptionRecord) => {
    const newStatus = currentRecord.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    
    // Save locally for this month
    updatePaymentOverride(currentMonthKey, currentRecord.apartmentNumber, newStatus);

    // Update in Firestore if exists
    if (currentRecord.existingReqId) {
      try {
        const monthNameArabic = format(activeMonth, 'MMMM yyyy', { locale: ar });
        const existingDoc = requests.find(r => r.id === currentRecord.existingReqId);
        const prevPayments: any[] = Array.isArray(existingDoc?.subscriptionPayments) 
          ? [...existingDoc.subscriptionPayments] 
          : [];
        
        const existingIdx = prevPayments.findIndex(p => p.monthKey === currentMonthKey);
        const paymentObj = {
          monthKey: currentMonthKey,
          monthName: monthNameArabic,
          isPaid: newStatus === 'paid',
          amount: currentRecord.price,
          paidDate: newStatus === 'paid' ? format(new Date(), 'yyyy-MM-dd') : ''
        };

        if (existingIdx >= 0) {
          prevPayments[existingIdx] = paymentObj;
        } else {
          prevPayments.push(paymentObj);
        }

        await updateDoc(doc(db, 'requests', currentRecord.existingReqId), {
          paymentStatus: newStatus,
          subscriptionPayments: prevPayments
        });
        toast.success(`تم تحديث حالة سداد شقة ${currentRecord.apartmentNumber} لشهر (${monthNameArabic}) إلى: ${newStatus === 'paid' ? 'مدفوع ✓' : 'غير مدفوع ⏳'}`);
      } catch (e) {
        console.error('Error updating status in firestore', e);
      }
    } else {
      toast.info(`تم تحديث سداد شهر (${format(activeMonth, 'MMMM yyyy', { locale: ar })}) محلياً إلى (${newStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}). اضغط على "مزامنة البيانات" لحفظها سحابياً.`);
    }
  };

  // Sync / Seed all 26 records into Firestore
  const handleSyncToFirestore = async () => {
    setIsSyncing(true);
    const loadingToast = toast.loading('جاري حفظ ومزامنة جميع الاشتراكات الـ 26 في قاعدة البيانات...');
    try {
      let created = 0;
      let updated = 0;

      for (const item of mergedRecords) {
        const start = new Date(item.startDate);
        const end = new Date(item.nextRenewalDate);

        if (item.existingReqId) {
          // Update existing
          await updateDoc(doc(db, 'requests', item.existingReqId), {
            apartment: item.apartmentNumber,
            apartmentNumber: item.apartmentNumber,
            packageSize: item.packageSize,
            price: item.price,
            subscriptionSchedule: item.schedule,
            paymentStatus: item.paymentStatus,
            notes: `باقة: ${item.packageSize} | ${item.daysText}`,
            workerName: item.workerName || 'فريق غسيل السيارات',
            car: item.carName || `باقة ${item.packageSize}`
          });
          updated++;
        } else {
          // Create new record in requests collection
          const docData = {
            serviceType: 'تنظيف سيارات',
            apartmentNumber: item.apartmentNumber,
            apartment: item.apartmentNumber,
            car: item.carName || `باقة ${item.packageSize}`,
            price: item.price,
            date: Timestamp.fromDate(start),
            subscriptionStartDate: Timestamp.fromDate(start),
            subscriptionEndDate: Timestamp.fromDate(end),
            subscriptionSchedule: item.schedule,
            subscriptionFrequency: 'weekly',
            monthsCount: 1,
            isSubscription: true,
            workerName: item.workerName || 'فريق غسيل السيارات',
            notes: `باقة: ${item.packageSize} | ${item.daysText}`,
            userId: user?.uid || 'admin',
            createdAt: Timestamp.now(),
            status: 'completed',
            paymentStatus: item.paymentStatus,
            buildingName: 'نظافة سيارات',
            subscriptionPayments: [
              {
                monthKey: currentMonthKey,
                monthName: format(activeMonth, 'MMMM yyyy', { locale: ar }),
                isPaid: item.paymentStatus === 'paid',
                amount: item.price,
                paidDate: item.paymentStatus === 'paid' ? format(new Date(), 'yyyy-MM-dd') : ''
              }
            ]
          };

          await addDoc(collection(db, 'requests'), docData);
          created++;
        }
      }

      toast.dismiss(loadingToast);
      toast.success(`تمت المزامنة بنجاح! تم إنشاء ${created} اشتراك وتحديث ${updated} اشتراك.`);
      if (onRefreshRequests) onRefreshRequests();
    } catch (e: any) {
      toast.dismiss(loadingToast);
      toast.error('حدث خطأ أثناء المزامنة: ' + (e?.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Export to Excel XLSX
  const handleExportExcel = () => {
    try {
      const excelRows = mergedRecords.map(r => ({
        'رقم الشقة': r.apartmentNumber,
        'الباقة / الحجم': r.packageSize,
        'السعر شهرياً (ر.س)': r.price,
        'أيام الغسيل': r.daysText,
        'بداية الفترة': r.startDate,
        'التجديد التالي': r.nextRenewalDate,
        'حالة هذا الشهر': r.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع',
        'ملاحظة': r.notes || '',
        'الأحد': r.schedule.includes(0) ? '✓' : '',
        'الإثنين': r.schedule.includes(1) ? '✓' : '',
        'الثلاثاء': r.schedule.includes(2) ? '✓' : '',
        'الأربعاء': r.schedule.includes(3) ? '✓' : '',
        'الخميس': r.schedule.includes(4) ? '✓' : '',
        'الجمعة': r.schedule.includes(5) ? '✓' : '',
        'السبت': r.schedule.includes(6) ? '✓' : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `اشتراكات_${currentMonthKey}`);
      XLSX.writeFile(workbook, `اشتراكات_السيارات_${currentMonthKey}.xlsx`);
      toast.success('تم تصدير ملف الإكسيل بنجاح');
    } catch (e) {
      toast.error('فشل تصدير ملف الإكسيل');
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      
      {/* 0. PROMINENT MONTH SELECTOR BAR & ISOLATION BANNER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">عرض جدول الاشتراكات لشهر:</span>
                <span className="text-base font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-0.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  {format(activeMonth, 'MMMM yyyy', { locale: ar })}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-xl border border-emerald-200">
                  ✓ بيانات هذا الشهر مفصولة ومستقلة
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                كل شهر له بياناته وإيراداته وغسلاته وحالة سداده المستقلة دون جمع مع الأشهر الأخرى
              </p>
            </div>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Quick Month Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleMonthChange(new Date(2026, 9, 1))}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentMonthKey === '2026-10'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                أكتوبر 2026 (الجدول الأساسي)
              </button>
              <button
                type="button"
                onClick={() => handleMonthChange(new Date(2026, 10, 1))}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentMonthKey === '2026-11'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                نوفمبر 2026
              </button>
              <button
                type="button"
                onClick={() => handleMonthChange(new Date(2026, 11, 1))}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentMonthKey === '2026-12'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                ديسمبر 2026
              </button>
            </div>

            {/* Stepper & input type="month" */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleMonthChange(subMonths(activeMonth, 1))}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
                title="الشهر السابق"
              >
                <ChevronRight size={16} />
              </button>
              
              <div className="relative px-2 py-0.5 cursor-pointer">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {format(activeMonth, 'MM/yyyy')}
                </span>
                <input
                  type="month"
                  value={currentMonthKey}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m] = e.target.value.split('-').map(Number);
                      handleMonthChange(new Date(y, m - 1, 1));
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <button
                type="button"
                onClick={() => handleMonthChange(addMonths(activeMonth, 1))}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
                title="الشهر التالي"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Notice for upcoming subscriptions (e.g. Apt 114 in October) */}
        {upcomingSubscriptions.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-2.5 sm:p-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-amber-600 shrink-0" />
              <span>
                تنبيه: يوجد {upcomingSubscriptions.length} اشتراك مجدول لشهر قادم ({upcomingSubscriptions.map(s => `شقة ${s.apartmentNumber} تبدأ في ${s.startDate}`).join('، ')})، ومفصول تلقائياً عن جدول شهر {format(activeMonth, 'MMMM')}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleMonthChange(new Date(upcomingSubscriptions[0].startDate))}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer"
            >
              الانتقال لشهر نوفمبر 👈
            </button>
          </div>
        )}
      </div>

      {/* 1. TOP SUMMARY CARDS & PACKAGES (Exact Match to image_633025fe.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Top Right: Packages Table (كبيرة 200, صغيرة 150) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="bg-[#4338ca] text-white font-black">
                  <th className="py-2.5 px-3 rounded-r-xl">الباقة / الحجم</th>
                  <th className="py-2.5 px-3">السعر شهرياً (ر.س)</th>
                  <th className="py-2.5 px-3 rounded-l-xl">عدد الغسلات شهرياً</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-black">
                <tr className="bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-100">
                  <td className="py-2 px-3 text-right pr-4 font-extrabold text-[#4338ca] dark:text-indigo-400">كبيرة</td>
                  <td className="py-2 px-3 text-emerald-600 font-extrabold">200</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300">8</td>
                </tr>
                <tr className="bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-100">
                  <td className="py-2 px-3 text-right pr-4 font-extrabold text-teal-600 dark:text-teal-400">صغيرة</td>
                  <td className="py-2 px-3 text-emerald-600 font-extrabold">150</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300">8</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Left: 4 KPI Metrics matching the Image Header */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* 1. عدد الاشتراكات */}
          <div className="bg-[#4338ca] text-white p-3.5 rounded-3xl shadow-md flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold opacity-90">عدد الاشتراكات</span>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-black">{kpis.totalCount}</span>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">اشتراك نشط ({format(activeMonth, 'MMMM')})</span>
          </div>

          {/* 2. الإجمالي الشهري (الحالي) */}
          <div className="bg-[#3730a3] text-white p-3.5 rounded-3xl shadow-md flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold opacity-90">الإجمالي الشهري ({format(activeMonth, 'MMMM')})</span>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-black">{kpis.totalMonthlyRevenue.toLocaleString()}</span>
              <span className="text-[11px] font-bold mr-1">ر.س</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full">
              مدفوع: {kpis.paidRevenue.toLocaleString()} ر.س
            </span>
          </div>

          {/* 3. غير مدفوع هذا الشهر */}
          <div className="bg-[#312e81] text-white p-3.5 rounded-3xl shadow-md flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold opacity-90">غير مدفوع لشهر ({format(activeMonth, 'MMMM')})</span>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-black text-rose-300">{kpis.unpaidRevenue.toLocaleString()}</span>
              <span className="text-[11px] font-bold mr-1 text-rose-300">ر.س</span>
            </div>
            <span className="text-[10px] font-black bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded-full">
              {kpis.unpaidCount} اشتراك مستحق
            </span>
          </div>

          {/* 4. غسلات / شهر (الحالية) */}
          <div className="bg-[#1e1b4b] text-white p-3.5 rounded-3xl shadow-md flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold opacity-90">غسلات / شهر ({format(activeMonth, 'MMMM')})</span>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-300">{kpis.currentWashesPerMonth}</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full">
              8 غسلات لكل مشترك
            </span>
          </div>

        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS FROM EXCEL */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-black custom-scrollbar">
        <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200">
          الرئيسية 🏠 ملخص
        </span>
        <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200">
          الأشهر
        </span>
        <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200">
          انترنت
        </span>
        <span className="px-4 py-1.5 rounded-xl bg-[#4338ca] text-white shadow-sm whitespace-nowrap flex items-center gap-1.5">
          <Car size={13} />
          <span>نظافة (اشتراكات السيارات)</span>
        </span>
        <button
          type="button"
          onClick={() => setActiveTab?.('تنظيف سيارات')}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-1 font-black"
        >
          <span>🚗 المتابعة اليومية</span>
        </button>
        <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200">
          العمالة
        </span>
      </div>

      {/* 3. INSTRUCTION BANNER (Exact text from image + Direct Daily Followup Link) */}
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-2xl p-3 sm:p-4 text-xs font-bold text-sky-900 dark:text-sky-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
          <p>
            سجل الاشتراكات هنا (سطر لكل اشتراك، يستمر كل شهر حتى تاريخ الإيقاف). جميع مواعيد الغسيل مربوطة تلقائياً مع <strong>[تنظيف السيارات]</strong> للمتابعة اليومية.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('تنظيف سيارات')}
              className="px-3 py-1.5 bg-[#4338ca] hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Car size={13} />
              <span>متابعة الغسيل اليومي 👈</span>
            </button>
          )}
          <span className="text-[11px] font-black bg-sky-100 dark:bg-sky-900/60 px-2.5 py-1 rounded-xl shrink-0">
            {format(activeMonth, 'MMMM yyyy', { locale: ar })}
          </span>
        </div>
      </div>

      {/* 4. ACTIONS & FILTERS BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث برقم الشقة، السيارة، أو اليوم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            الكل ({mergedRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>مدفوع ({kpis.paidCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'unpaid'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <XCircle size={13} />
            <span>غير مدفوع ({kpis.unpaidCount})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleSyncToFirestore}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="حفظ ومزامنة كافة اشتراكات الصورة الـ 26 في قاعدة البيانات"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'جارِ المزامنة...' : 'حفظ ومزامنة في قاعدة البيانات 💾'}</span>
          </motion.button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs transition-all cursor-pointer"
            title="تصدير إلى ملف Excel"
          >
            <Download size={14} />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs transition-all cursor-pointer"
            title="طباعة الجدول"
          >
            <Printer size={14} />
          </button>

          {/* Delete All Button */}
          <button
            type="button"
            onClick={() => setIsDeleteAllModalOpen(true)}
            disabled={mergedRecords.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="حذف كافة اشتراكات تنظيف السيارات"
          >
            <Trash2 size={14} />
            <span>حذف الكل</span>
          </button>

          {/* Restore Defaults Button if wiped or any item deleted */}
          {(effectiveDeletedKeys.length > 0 || records.length === 0) && (
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs transition-all cursor-pointer"
              title="استعادة الاشتراكات الافتراضية"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">استعادة الافتراضي ↺</span>
            </button>
          )}

          {onOpenNewSubscriptionModal && (
            <button
              type="button"
              onClick={onOpenNewSubscriptionModal}
              className="flex items-center gap-1 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <CalendarPlus size={14} />
              <span>اشتراك جديد</span>
            </button>
          )}
        </div>

      </div>

      {/* 5. MAIN SPREADSHEET TABLE (Visual Replica of the Image) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center">
              <Car size={32} />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
              {effectiveDeletedKeys.includes('all') || records.length === 0 ? 'تم حذف كافة اشتراكات تنظيف السيارات' : 'لا توجد اشتراكات تطابق البحث'}
            </h4>
            <p className="text-xs font-bold text-slate-500 max-w-md mx-auto">
              {effectiveDeletedKeys.includes('all') || records.length === 0
                ? 'تم إفراغ جدول اشتراكات السيارات. يمكنك إضافة اشتراك جديد أو استعادة الاشتراكات الافتراضية في أي وقت.'
                : 'حاول تغيير شروط البحث أو الفلتر.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              {onOpenNewSubscriptionModal && (
                <button
                  type="button"
                  onClick={onOpenNewSubscriptionModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  + إضافة اشتراك جديد
                </button>
              )}
              {(effectiveDeletedKeys.length > 0 || records.length === 0) && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  استعادة الاشتراكات الافتراضية ↺
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-center border-collapse text-xs select-none">
              
              {/* Table Header with exact background colors */}
              <thead>
                <tr className="bg-[#384b8f] text-white font-black border-b border-indigo-950">
                  <th className="py-3 px-3 border-l border-indigo-700/60 w-16 bg-[#0088cc] text-white font-extrabold text-sm">
                    رقم الشقة
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[90px]">
                    الباقة / الحجم
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[80px]">
                    السعر (ر.س)
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[130px]">
                    أيام الغسيل (تلقائي)
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[95px]">
                    بداية الفترة
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[95px]">
                    التجديد التالي
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[110px]">
                    حالة هذا الشهر (تلقائي)
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[100px]">
                    ملاحظة
                  </th>
                  <th className="py-3 px-3 border-l border-indigo-700/60 min-w-[100px]">
                    تاريخ الإيقاف (اختياري)
                  </th>
                  <th className="py-3 px-2 border-l border-indigo-700/60 w-12 text-center">
                    حذف
                  </th>
                  
                  {/* 7 Days of the Week: Yellow header highlight */}
                  <th colSpan={7} className="py-1 px-3 border-b border-indigo-700/60 bg-[#28376d] text-amber-200 font-black text-[11px]">
                    اختر الأيام (ضع ✓ في كل يوم)
                  </th>
                </tr>

                {/* Sub-header for days */}
                <tr className="bg-[#2d3e7a] text-white font-bold border-b border-indigo-950 text-[11px]">
                  <th colSpan={10} className="border-l border-indigo-700/40"></th>
                  {[
                    { id: 0, name: 'الأحد' },
                    { id: 1, name: 'الإثنين' },
                    { id: 2, name: 'الثلاثاء' },
                    { id: 3, name: 'الأربعاء' },
                    { id: 4, name: 'الخميس' },
                    { id: 5, name: 'الجمعة' },
                    { id: 6, name: 'السبت' },
                  ].map(d => (
                    <th
                      key={d.id}
                      onClick={() => {
                        if (setActiveTab) setActiveTab('تنظيف سيارات');
                        if (onSelectDate) {
                          const now = new Date();
                          const currentDay = now.getDay();
                          const diff = (d.id - currentDay + 7) % 7;
                          const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
                          onSelectDate(target);
                        }
                      }}
                      title={`عرض ومتابعة مهام يوم ${d.name} في تنظيف السيارات`}
                      className={`py-1.5 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black cursor-pointer transition-colors ${
                        d.id < 6 ? 'border-l border-indigo-700/60' : ''
                      }`}
                    >
                      <span className="flex items-center justify-center gap-0.5">
                        <span>{d.name}</span>
                        <span className="text-[9px] opacity-70">↗</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                {filteredRecords.map((item, idx) => {
                  const isPaid = item.paymentStatus === 'paid';
                  const isFutureStart = item.startDate.startsWith('2026-11');

                  return (
                    <tr 
                      key={`${item.apartmentNumber}-${idx}`}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      
                      {/* رقم الشقة: Distinct Blue column as in spreadsheet */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 bg-[#e0f2fe] dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 font-black text-sm">
                        {item.apartmentNumber}
                      </td>

                      {/* الباقة / الحجم */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 font-black">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          item.packageSize === 'كبيرة'
                            ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                            : 'bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                        }`}>
                          {item.packageSize}
                        </span>
                      </td>

                      {/* السعر */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 font-black text-slate-900 dark:text-white">
                        {item.price}
                      </td>

                      {/* أيام الغسيل (تلقائي) */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-black text-[11px] whitespace-nowrap">
                        {item.daysText}
                      </td>

                      {/* بداية الفترة */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400" dir="ltr">
                        {item.startDate}
                      </td>

                      {/* التجديد التالي */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400" dir="ltr">
                        {item.nextRenewalDate}
                      </td>

                      {/* حالة هذا الشهر (تفاعلية بنقرة واحدة) */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(idx, item)}
                          className={`w-full py-1.5 px-2.5 rounded-xl font-black text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                            isPaid
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : isFutureStart
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-100'
                          }`}
                          title="انقر لتعديل حالة السداد"
                        >
                          {isPaid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{isPaid ? 'مدفوع' : isFutureStart ? 'تبدأ في نوفمبر' : 'غير مدفوع'}</span>
                        </button>
                      </td>

                      {/* ملاحظة */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 text-slate-400 text-[10px]">
                        {item.notes || '-'}
                      </td>

                      {/* تاريخ الإيقاف (اختياري) */}
                      <td className="py-2.5 px-3 border-l border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] font-mono" dir="ltr">
                        {item.stopDate || '-'}
                      </td>

                      {/* Delete action cell */}
                      <td className="py-2.5 px-2 border-l border-slate-200 dark:border-slate-800 text-center">
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(item)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="حذف هذا الاشتراك"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>

                      {/* 7 DAYS COLUMNS WITH CHECKMARKS (✓) & YELLOW/GREEN HIGHLIGHT */}
                      {WEEK_DAYS.map(day => {
                        const isWashDay = item.schedule.includes(day.id);
                        return (
                          <td
                            key={day.id}
                            className={`py-2 px-1 text-center border-l last:border-l-0 border-slate-200 dark:border-slate-800 transition-colors ${
                              isWashDay
                                ? 'bg-[#bbf7d0] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-extrabold text-sm'
                                : 'bg-yellow-100/70 dark:bg-amber-950/20 text-slate-300 dark:text-slate-700'
                            }`}
                          >
                            {isWashDay ? '✓' : ''}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Table Footer Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs font-black text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-4">
            <span>عدد الاشتراكات المعروضة: {filteredRecords.length} لشهر {format(activeMonth, 'MMMM yyyy', { locale: ar })}</span>
            <span className="text-emerald-600">مدفوع: {filteredRecords.filter(r => r.paymentStatus === 'paid').length}</span>
            <span className="text-rose-600">غير مدفوع: {filteredRecords.filter(r => r.paymentStatus === 'unpaid').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>الإجمالي: {filteredRecords.reduce((sum, r) => sum + r.price, 0).toLocaleString()} ريال سعودي</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Delete Single Record */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">حذف اشتراك سيارة</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold leading-relaxed">
                  هل أنت متأكد من حذف اشتراك تنظيف سيارة شقة <strong className="text-rose-600 font-black">({recordToDelete.apartmentNumber})</strong>؟
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteSingleRecord(recordToDelete)}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-600/20"
                >
                  نعم، حذف الاشتراك
                </button>
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Delete All Records */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-200 dark:border-rose-900 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">حذف كافة اشتراكات تنظيف السيارات</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold leading-relaxed">
                  تحذير: سيتم حذف جميع طلبات واشتراكات غسيل السيارات ({mergedRecords.length} اشتراك) نهائياً من قاعدة البيانات والتطبيق. لن تتمكن من التراجع عن هذه الخطوة إلا عبر خيار استعادة الافتراضي.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={handleDeleteAllRecords}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-600/20"
                >
                  {isDeletingAll ? 'جارِ الحذف...' : 'تأكيد حذف الكل 🗑️'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
