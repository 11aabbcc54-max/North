/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toPng } from 'html-to-image';
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  auth, 
  db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithCustomToken,
  signInAnonymously,
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  setDoc,
  doc, 
  deleteDoc, 
  deleteField,
  Timestamp, 
  orderBy,
  limit,
  getDocFromServer,
  getDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Building2, 
  Plus, 
  LogOut, 
  Calendar, 
  CreditCard, 
  FileText, 
  FileCheck,
  CheckCircle2, 
  Clock, 
  Trash2, 
  Archive,
  Phone,
  IdCard,
  Share2, 
  Search,
  ChevronRight,
  ChevronLeft,
  Printer,
  X,
  Upload,
  Camera,
  LayoutDashboard,
  Package,
  Menu,
  Home,
  User as UserIcon,
  PieChart,
  DollarSign,
  Car,
  Pencil,
  ListTodo,
  CalendarCheck,
  Save,
  Repeat,
  AlertCircle,
  Droplets,
  Layout,
  PanelRight,
  MessageCircle,
  Image as ImageIcon,
  Download,
  Eye,
  Link as LinkIcon,
  Settings,
  XCircle,
  CheckCircle,
  Check,
  Palette,
  Sun,
  Moon,
  TrendingUp,
  History,
  Wrench,
  Globe,
  Users,
  Ban,
  Bell,
  ArrowRightLeft,
  MicOff,
  UserCheck,
  Sparkles,
  Home as HomeIcon
} from 'lucide-react';
import { 
  format, 
  isSameMonth, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addDays,
  subDays,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfDay,
  endOfDay,
  differenceInDays
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { toast, Toaster } from 'sonner';
import { cn } from './lib/utils';

// --- Types ---
interface CleaningRequest {
  id: string;
  userId: string;
  buildingName: string;
  apartmentNumber: string;
  serviceType: string;
  date: Timestamp;
  monthsCount: number;
  price: number;
  status: 'pending' | 'completed';
  paymentStatus: 'unpaid' | 'paid';
  notes: string;
  waterGallons?: number;
  receiptUrl?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  workerName?: string;
  createdAt: Timestamp;
  isRecurring?: boolean;
  selectedMonths?: number[];
  recurrenceDay?: number;
}

interface InventoryItem {
  id: string;
  itemName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  unit: string;
  lastUpdated: Timestamp;
}

interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  changeType: 'manual' | 'order' | 'restock' | 'delete';
  performedBy: string;
  performedByEmail: string;
  timestamp: Timestamp;
  notes?: string;
}

interface ClubSubscription {
  id: string;
  userId: string;
  name: string;
  workplace: string;
  monthsCount: number;
  totalPrice: number;
  collectedAmount?: number;
  startDate: Timestamp;
  endDate: Timestamp;
  idPhotoUrl?: string;
  status: 'active' | 'expired' | 'locked';
  paymentStatus: 'unpaid' | 'paid';
  createdAt: Timestamp;
}

interface Booking {
  id: string;
  customerName?: string;
  customerPhone?: string;
  buildingName: string;
  apartmentNumber: string;
  serviceType: string;
  date: Timestamp;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  language: 'ar' | 'en';
  createdAt: Timestamp;
}

interface Apartment {
  id: string;
  buildingId: string;
  buildingName: string;
  number: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  roomType?: string;
  tenantId?: string;
}

interface RentPayment {
  id: string;
  amount: number;
  dueDate: Timestamp;
  paymentDate?: Timestamp;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  createdAt: Timestamp;
}

interface Tenant {
  id: string;
  name: string;
  nationality: string;
  phone: string;
  company: string;
  idNumber?: string;
  internetRequest?: number;
  duration?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  contractValue: number;
  paymentFrequency: string;
  paymentMethod: string;
  nextPaymentDate: Timestamp;
  apartmentId: string;
  receiptUrl?: string;
  idImageUrl?: string;
  collectedAmount: number;
  status?: 'active' | 'archived';
}

const BUILDINGS = [
  "نظافة نورث"
];

const PROPERTY_BUILDINGS = [
  { id: 'b1', name: 'مبنى ١', apartments: ['102', '103', '105', '106', '107', '108', '109', '110', '112', '113', '114', '115', '116', '117', '118', '119', '120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '131', '132', '133', '134', '135'] },
  { id: 'b2', name: 'مبنى ٢', apartments: ['202', '203', '206', '207', '208', '211', '213', '214', '215', '217', '218', '219', '221', '222', '224', '225', '226', '227', '231', '232', '233'] },
  { id: 'b3', name: 'مبنى ٣', apartments: ['312', '313', '314', '315', '316', '317', '318', '321', '322', '324', '325', '326', '327'] },
  { id: 'b4', name: 'مبنى ٤', apartments: ['401', '402', '403', '404', '405', '406', '407', '409', '410', '411', '412', '414', '415', '416', '417', '418', '419', '421', '422', '423', '424', '425', '426', '427', '431', '432', '433'] },
  { id: 'b5', name: 'مبنى ٥', apartments: ['501', '502', '503', '504', '505', '506', '507', '509', '510', '511', '512', '513', '514', '515', '516', '517', '518', '519', '521', '522', '523', '524', '525', '526', '527'] }
];

const SERVICES = [
  { name: 'تنظيف عادي', price: 100 },
  { name: 'تنظيف عميق', price: 250 },
  { name: 'تنظيف سجاد', price: 150 },
  { name: 'تلميع أرضيات', price: 200 },
  { name: 'تنظيف واجهات', price: 300 },
  { name: 'تنظيف سيارات', price: 50 },
  { name: 'رش حشرات', price: 150 },
  { name: 'مدفوع من منصة إيجار', price: 0 },
  { name: 'مدفوع مع الإيجار', price: 0 },
  { name: 'توصيل مياه', price: 10 }
];

const MAINTENANCE_SERVICES = [
  { name: 'صيانة سباكة', price: 150 },
  { name: 'صيانة كهرباء', price: 150 },
  { name: 'صيانة مكيفات', price: 200 },
  { name: 'صيانة أجهزة كهربائية', price: 250 },
  { name: 'صيانة دهانات', price: 300 },
  { name: 'صيانة نجارة', price: 200 },
  { name: 'صيانة عامة', price: 100 }
];

const MAINTENANCE_WORKERS = [
  "أسامة",
  "ناصر"
];

// --- Helpers ---
const safeToDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (e) {
      return new Date();
    }
  }
  if (timestamp instanceof Date) return timestamp;
  return new Date();
};

// --- Components ---

const PublicBookingForm = ({ appName, logo }: { appName: string, logo: string | null }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    buildingName: '',
    apartmentNumber: '',
    serviceType: SERVICES[0].name,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        status: 'pending',
        language: lang,
        createdAt: Timestamp.now()
      });
      setIsSuccess(true);
      toast.success(lang === 'ar' ? 'تم إرسال طلب الحجز بنجاح' : 'Booking request sent successfully');
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error sending booking request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    ar: {
      title: 'حجز خدمة نظافة',
      name: 'الاسم',
      phone: 'رقم الجوال',
      building: 'اسم المبنى',
      apartment: 'رقم الشقة',
      service: 'نوع الخدمة',
      date: 'التاريخ',
      time: 'الوقت',
      submit: 'إرسال الطلب',
      success: 'تم استلام طلبك! سنتواصل معك قريباً.',
      newBooking: 'حجز جديد'
    },
    en: {
      title: 'Book Cleaning Service',
      name: 'Name',
      phone: 'Phone Number',
      building: 'Building Name',
      apartment: 'Apartment Number',
      service: 'Service Type',
      date: 'Date',
      time: 'Time',
      submit: 'Submit Request',
      success: 'Request received! We will contact you soon.',
      newBooking: 'New Booking'
    }
  }[lang];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
          <div className="bg-green-100 p-5 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="text-green-500 w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black mb-4">{t.success}</h2>
          <button onClick={() => setIsSuccess(false)} className="bg-primary text-white px-8 py-3 rounded-xl font-bold">{t.newBooking}</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-end mb-6">
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="bg-white px-4 py-2 rounded-xl shadow-sm font-bold text-sm flex items-center gap-2">
            <Globe size={16} />
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            {logo && <img src={logo} alt="Logo" className="h-16 mx-auto mb-4" />}
            <h1 className="text-2xl font-black text-gray-900">{t.title}</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.name}</label>
              <input required type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.phone}</label>
              <input required type="tel" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.building}</label>
              <select required value={formData.buildingName} onChange={e => setFormData({...formData, buildingName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold">
                <option value="">{lang === 'ar' ? 'اختر المبنى' : 'Select Building'}</option>
                {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.apartment}</label>
              <input required type="text" value={formData.apartmentNumber} onChange={e => setFormData({...formData, apartmentNumber: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.service}</label>
              <select required value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold">
                {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.date}</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.time}</label>
                <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold" />
              </div>
            </div>
            <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
              {isSubmitting ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      let errorMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = "ليس لديك الصلاحية الكافية للقيام بهذا الإجراء. يرجى التأكد من تسجيل الدخول بشكل صحيح.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-rose-950/20 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-2 border-rose-100 dark:border-rose-900/30">
            <div className="bg-rose-100 dark:bg-rose-900/30 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <X className="text-rose-600 dark:text-rose-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">عذراً، حدث خطأ</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-bold leading-relaxed">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 dark:shadow-none"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const Invoice = React.forwardRef<HTMLDivElement, { request: CleaningRequest }>(({ request }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans dir-rtl" dir="rtl">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">فاتورة خدمة نظافة</h1>
          <p className="text-gray-500">رقم الفاتورة: {request.id.slice(0, 8)}</p>
        </div>
        <div className="text-left">
          <QRCodeSVG value={`${window.location.origin}/invoice/${request.id}`} size={64} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">تفاصيل الموقع</h3>
          <p>المبنى: {request.buildingName}</p>
          <p>رقم الشقة: {request.apartmentNumber}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">تفاصيل الخدمة</h3>
          <p>التاريخ: {format(safeToDate(request.date), 'PPP', { locale: ar })}</p>
          <p>وقت الطلب: {request.createdAt ? format(safeToDate(request.createdAt), 'p', { locale: ar }) : '-'}</p>
          <p>نوع الخدمة: {request.serviceType}</p>
          {request.serviceType === 'توصيل مياه' ? (
            <p>كم جالون: {request.waterGallons || 0}</p>
          ) : (
            <p>عدد الطلبات: {request.monthsCount}</p>
          )}
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="py-2 text-right">الوصف</th>
            <th className="py-2 text-left">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-4">
              {request.serviceType} - {request.serviceType === 'تنظيف سيارات' ? `لوحة ${request.apartmentNumber}` : `شقة ${request.apartmentNumber}`} 
              {request.serviceType === 'توصيل مياه' ? ` (${request.waterGallons || 0} جالون)` : ` (${request.monthsCount} شهر)`}
            </td>
            <td className="py-4 text-left">{request.price} ريال</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="py-4 font-bold text-lg">الإجمالي</td>
            <td className="py-4 text-left font-bold text-lg text-primary">{request.price} ريال</td>
          </tr>
        </tfoot>
      </table>

      <div className="border-t pt-6 text-center text-gray-500 text-sm">
        <p>شكراً لثقتكم بنا!</p>
        <p>{window.location.host}</p>
      </div>
    </div>
  );
});

const Statement = React.forwardRef<HTMLDivElement, { apartment: { building: string, apartment: string }, requests: CleaningRequest[] }>(({ apartment, requests }, ref) => {
  const total = requests.reduce((sum, r) => sum + r.price, 0);
  const unpaid = requests.filter(r => r.paymentStatus === 'unpaid').reduce((sum, r) => sum + r.price, 0);
  
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans dir-rtl" dir="rtl">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">كشف حساب</h1>
          <p className="text-gray-500">المبنى: {apartment.building} - شقة: {apartment.apartment}</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">{format(new Date(), 'PPP', { locale: ar })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border p-4 rounded-lg">
          <p className="text-xs text-gray-500">إجمالي الطلبات</p>
          <p className="text-xl font-bold">{requests.length}</p>
        </div>
        <div className="border p-4 rounded-lg">
          <p className="text-xs text-gray-500">إجمالي المبلغ</p>
          <p className="text-xl font-bold">{total} ريال</p>
        </div>
        <div className="border p-4 rounded-lg bg-rose-50">
          <p className="text-xs text-rose-600">المبالغ المعلقة</p>
          <p className="text-xl font-bold text-rose-700">{unpaid} ريال</p>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="py-2 text-right">التاريخ</th>
            <th className="py-2 text-right">الخدمة</th>
            <th className="py-2 text-right">الحالة</th>
            <th className="py-2 text-left">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id} className="border-b">
              <td className="py-2 text-sm">{format(safeToDate(req.date), 'P', { locale: ar })}</td>
              <td className="py-2 text-sm">{req.serviceType}</td>
              <td className="py-2 text-sm">{req.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</td>
              <td className="py-2 text-left text-sm">{req.price} ريال</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-6 text-center text-gray-500 text-sm">
        <p>شكراً لتعاملكم معنا!</p>
        <p>{window.location.host}</p>
      </div>
    </div>
  );
});

const Report = React.forwardRef<HTMLDivElement, { requests: CleaningRequest[], title: string }>(({ requests, title }, ref) => {
  const total = requests.reduce((sum, r) => sum + r.price, 0);
  const paid = requests.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.price, 0);
  const unpaid = total - paid;

  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans dir-rtl" dir="rtl">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">{title}</h1>
          <p className="text-gray-500">تقرير ملخص العمليات</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">{format(new Date(), 'PPP', { locale: ar })}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border p-4 rounded-lg">
          <p className="text-xs text-gray-500">عدد الطلبات</p>
          <p className="text-xl font-bold">{requests.length}</p>
        </div>
        <div className="border p-4 rounded-lg">
          <p className="text-xs text-gray-500">إجمالي الدخل</p>
          <p className="text-xl font-bold">{total} ريال</p>
        </div>
        <div className="border p-4 rounded-lg bg-emerald-50">
          <p className="text-xs text-emerald-600">المحصل</p>
          <p className="text-xl font-bold text-emerald-700">{paid} ريال</p>
        </div>
        <div className="border p-4 rounded-lg bg-rose-50">
          <p className="text-xs text-rose-600">المتبقي</p>
          <p className="text-xl font-bold text-rose-700">{unpaid} ريال</p>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="py-2 text-right">الموقع</th>
            <th className="py-2 text-right">الخدمة</th>
            <th className="py-2 text-right">التاريخ</th>
            <th className="py-2 text-left">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id} className="border-b">
              <td className="py-2 text-sm">{req.buildingName} - {req.apartmentNumber}</td>
              <td className="py-2 text-sm">{req.serviceType}</td>
              <td className="py-2 text-sm">{format(safeToDate(req.date), 'P', { locale: ar })}</td>
              <td className="py-2 text-left text-sm">{req.price} ريال</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-6 text-center text-gray-500 text-sm">
        <p>تقرير آلي من نظام إدارة الخدمات</p>
        <p>{window.location.host}</p>
      </div>
    </div>
  );
});

const BulkInvoices = React.forwardRef<HTMLDivElement, { requests: CleaningRequest[] }>(({ requests }, ref) => {
  return (
    <div ref={ref} className="bg-white text-black font-sans dir-rtl" dir="rtl">
      {requests.map((req, index) => (
        <div key={req.id} className={cn("p-8", index < requests.length - 1 && "page-break-after-always")}>
          <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary">فاتورة خدمة نظافة</h1>
              <p className="text-gray-500">رقم الفاتورة: {req.id.slice(0, 8)}</p>
            </div>
            <div className="text-left">
              <QRCodeSVG value={`${window.location.origin}/invoice/${req.id}`} size={64} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">تفاصيل الموقع</h3>
              <p>المبنى: {req.buildingName}</p>
              <p>رقم الشقة: {req.apartmentNumber}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">تفاصيل الخدمة</h3>
              <p>التاريخ: {format(safeToDate(req.date), 'PPP', { locale: ar })}</p>
              <p>وقت الطلب: {req.createdAt ? format(safeToDate(req.createdAt), 'p', { locale: ar }) : '-'}</p>
              <p>نوع الخدمة: {req.serviceType}</p>
              {req.serviceType === 'توصيل مياه' ? (
                <p>كم جالون: {req.waterGallons || 0}</p>
              ) : (
                <p>عدد الطلبات: {req.monthsCount}</p>
              )}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="py-2 text-right">الوصف</th>
                <th className="py-2 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-4">
                  {req.serviceType} - {req.serviceType === 'تنظيف سيارات' ? `لوحة ${req.apartmentNumber}` : `شقة ${req.apartmentNumber}`} 
                  {req.serviceType === 'توصيل مياه' ? ` (${req.waterGallons || 0} جالون)` : ` (${req.monthsCount} شهر)`}
                </td>
                <td className="py-4 text-left">{req.price} ريال</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="py-4 font-bold text-lg">الإجمالي</td>
                <td className="py-4 text-left font-bold text-lg text-primary">{req.price} ريال</td>
              </tr>
            </tfoot>
          </table>

          <div className="border-t pt-6 text-center text-gray-500 text-sm">
            <p>شكراً لثقتكم بنا!</p>
            <p>{window.location.host}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

const InventoryReport = React.forwardRef<HTMLDivElement, { inventory: InventoryItem[], logs: InventoryLog[] }>(({ inventory, logs }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans dir-rtl" dir="rtl">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">تقرير المخزون والمستودع</h1>
          <p className="text-gray-500">حالة المخزون الحالية وسجل الحركات</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">{format(new Date(), 'PPP', { locale: ar })}</p>
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4">الأصناف الحالية</h3>
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="py-2 text-right">الصنف</th>
            <th className="py-2 text-right">الفئة</th>
            <th className="py-2 text-right">الكمية</th>
            <th className="py-2 text-right">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item.id} className="border-b">
              <td className="py-2 text-sm">{item.itemName}</td>
              <td className="py-2 text-sm">{item.category}</td>
              <td className="py-2 text-sm">{item.currentStock} {item.unit}</td>
              <td className="py-2 text-sm">
                {item.currentStock <= item.reorderPoint ? (
                  <span className="text-rose-600 font-bold">تحتاج طلب</span>
                ) : (
                  <span className="text-emerald-600">متوفر</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="font-bold text-lg mb-4">آخر الحركات</h3>
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="py-2 text-right">التاريخ</th>
            <th className="py-2 text-right">الصنف</th>
            <th className="py-2 text-right">النوع</th>
            <th className="py-2 text-right">الكمية</th>
          </tr>
        </thead>
        <tbody>
          {logs.slice(0, 20).map(log => (
            <tr key={log.id} className="border-b">
              <td className="py-2 text-xs">{format(safeToDate(log.timestamp), 'Pp', { locale: ar })}</td>
              <td className="py-2 text-sm">{log.itemName}</td>
              <td className="py-2 text-sm">{log.type === 'in' ? 'توريد' : 'صرف'}</td>
              <td className="py-2 text-sm">{log.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-6 text-center text-gray-500 text-sm">
        <p>تقرير آلي من نظام إدارة المخزون</p>
        <p>{window.location.host}</p>
      </div>
    </div>
  );
});

const StaffReport = React.forwardRef<HTMLDivElement, { requests: CleaningRequest[], title: string }>(({ requests, title }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans dir-rtl" dir="rtl">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">{title}</h1>
          <p className="text-gray-500">تقرير متابعة مهام العمالة</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">{format(new Date(), 'PPP', { locale: ar })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border p-4 rounded-lg">
          <p className="text-xs text-gray-500">إجمالي المهام</p>
          <p className="text-xl font-bold">{requests.length}</p>
        </div>
        <div className="border p-4 rounded-lg bg-emerald-50">
          <p className="text-xs text-emerald-600">المهام المنجزة</p>
          <p className="text-xl font-bold text-emerald-700">{requests.filter(r => r.status === 'completed').length}</p>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="py-2 text-right">الموقع</th>
            <th className="py-2 text-right">الحالة</th>
            <th className="py-2 text-right">قبل</th>
            <th className="py-2 text-right">بعد</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id} className="border-b">
              <td className="py-2 text-sm">{req.buildingName} - {req.apartmentNumber}</td>
              <td className="py-2 text-sm">{req.status === 'completed' ? 'تم' : 'قيد التنفيذ'}</td>
              <td className="py-2 text-sm">{req.beforePhotoUrl ? '✓' : '✕'}</td>
              <td className="py-2 text-sm">{req.afterPhotoUrl ? '✓' : '✕'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-6 text-center text-gray-500 text-sm">
        <p>تقرير آلي لمتابعة العمالة</p>
        <p>{window.location.host}</p>
      </div>
    </div>
  );
});

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  let userMessage = "حدث خطأ أثناء تنفيذ العملية.";
  if (errInfo.error.includes("Missing or insufficient permissions")) {
    userMessage = "ليس لديك الصلاحية الكافية للقيام بهذا الإجراء.";
  }
  
  toast.error(userMessage);
  // We don't throw here to avoid unhandled rejections, but we log it
}

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "تأكيد الحذف",
  variant = "danger",
  icon: Icon = Trash2
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  variant?: "danger" | "primary",
  icon?: any
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-box dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 p-8 text-center"
      >
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
          variant === "danger" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" : "bg-primary/10 dark:bg-primary/20 text-primary"
        )}>
          <Icon size={40} />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{title}</h3>
        <p className="text-gray-500 dark:text-slate-400 mb-8 font-bold leading-relaxed">{message}</p>
        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
          >
            إلغاء
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "flex-1 px-6 py-4 rounded-2xl font-black text-white transition-all shadow-lg dark:shadow-none",
              variant === "danger" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-primary hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const ApartmentDetailsModal = ({ 
  isOpen, 
  onClose, 
  apartment, 
  requests,
  onEdit,
  onUpdateStatus,
  onPrint,
  onPrintStatement,
  onBulkPrint,
  onDelete
} : { 
  isOpen: boolean, 
  onClose: () => void, 
  apartment: { building: string, apartment: string } | null,
  requests: CleaningRequest[],
  onEdit: (req: CleaningRequest) => void,
  onUpdateStatus: (id: string, field: 'status' | 'paymentStatus' | 'price', value: string | number) => void,
  onPrint: (req: CleaningRequest) => void,
  onPrintStatement: (filteredRequests: CleaningRequest[]) => void,
  onBulkPrint?: (requests: CleaningRequest[]) => void,
  onDelete: (id: string) => void
}) => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!isOpen || !apartment) return null;

  const aptRequests = requests
    .filter(r => r.buildingName === apartment.building && r.apartmentNumber === apartment.apartment)
    .filter(r => {
      const d = safeToDate(r.date);
      return d >= new Date(startDate) && d <= addDays(new Date(endDate), 1);
    })
    .sort((a, b) => safeToDate(b.date).getTime() - safeToDate(a.date).getTime());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
        >
          <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-primary/5 dark:bg-primary/10">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/20 dark:shadow-none">
                <Home size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">تفاصيل شقة {apartment.apartment}</h2>
                <p className="text-sm font-bold text-gray-500 dark:text-slate-400">{apartment.building}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onPrintStatement(aptRequests)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border dark:border-slate-700 rounded-xl transition-all text-gray-600 dark:text-slate-300 font-bold text-sm shadow-sm"
              >
                <Printer size={18} />
                <span>طباعة كشف حساب</span>
              </button>
              <button 
                onClick={() => {
                  // Trigger bulk print for these filtered requests
                  onBulkPrint?.(aptRequests);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:opacity-90 rounded-xl transition-all font-bold text-sm shadow-sm"
              >
                <FileText size={18} />
                <span>طباعة جميع الفواتير</span>
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-3xl mb-8 border border-gray-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">تصفية حسب التاريخ</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                    />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 flex-[2]">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">الطلبات</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{aptRequests.length}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">الإجمالي</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{aptRequests.reduce((sum, r) => sum + r.price, 0)}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">المعلق</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{aptRequests.filter(r => r.paymentStatus === 'unpaid').reduce((sum, r) => sum + r.price, 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                سجل الطلبات
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-xs font-black text-gray-500 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800">
                      <th className="px-4 py-3">الخدمة</th>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">المبلغ</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3">التحصيل</th>
                      <th className="px-4 py-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {aptRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{req.serviceType}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs font-medium text-gray-600 dark:text-slate-400">{format(safeToDate(req.date), 'PPP', { locale: ar })}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              value={req.price}
                              onChange={(e) => onUpdateStatus(req.id, 'price', Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-black text-primary focus:ring-1 focus:ring-primary outline-none"
                            />
                            <span className="text-[10px] font-bold text-gray-400">ريال</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button 
                            onClick={() => onUpdateStatus(req.id, 'status', req.status === 'pending' ? 'completed' : 'pending')}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold",
                              req.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                            )}
                          >
                            {req.status === 'completed' ? '✓ تم' : '✕ معلق'}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <button 
                            onClick={() => onUpdateStatus(req.id, 'paymentStatus', req.paymentStatus === 'unpaid' ? 'paid' : 'unpaid')}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold",
                              req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            {req.paymentStatus === 'paid' ? 'مدفوع' : 'لم يدفع'}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => {
                                onPrint(req);
                              }}
                              className="p-1.5 hover:bg-primary/5 dark:hover:bg-primary/20 rounded-lg text-primary transition-all"
                              title="طباعة الفاتورة"
                            >
                              <Printer size={16} />
                            </button>
                            <button 
                              onClick={() => onEdit(req)}
                              className="p-1.5 hover:bg-primary/5 dark:hover:bg-primary/20 rounded-lg text-primary transition-all"
                              title="تعديل الطلب"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => onDelete(req.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-500 transition-all"
                              title="حذف الطلب"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const BookingModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  defaultBuilding, 
  defaultService,
  initialData 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void, 
  defaultBuilding?: string, 
  defaultService?: string,
  initialData?: CleaningRequest | null
}) => {
  const [formData, setFormData] = useState({
    buildingName: defaultBuilding || BUILDINGS[0] || '',
    apartmentNumber: '',
    serviceType: defaultService || SERVICES[0].name || '',
    monthsCount: 1,
    price: SERVICES.find(s => s.name === (defaultService || SERVICES[0].name))?.price || 100,
    workerName: '',
    dates: [format(new Date(), "yyyy-MM-dd'T'HH:mm")],
    notes: '',
    waterGallons: 1,
    isRecurring: false,
    selectedMonths: [] as number[],
    recurrenceDay: new Date().getDate(),
    status: 'pending' as 'pending' | 'completed',
    createdAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          buildingName: initialData.buildingName || BUILDINGS[0] || '',
          apartmentNumber: initialData.apartmentNumber || '',
          serviceType: initialData.serviceType || SERVICES[0].name || '',
          monthsCount: initialData.monthsCount || 1,
          price: initialData.price || 0,
          workerName: initialData.workerName || '',
          dates: [format(safeToDate(initialData.date), "yyyy-MM-dd'T'HH:mm")],
          notes: initialData.notes || '',
          waterGallons: initialData.waterGallons || 1,
          isRecurring: initialData.isRecurring || false,
          selectedMonths: initialData.selectedMonths || [],
          recurrenceDay: initialData.recurrenceDay || safeToDate(initialData.date).getDate(),
          status: initialData.status || 'pending',
          createdAt: format(safeToDate(initialData.createdAt || initialData.date), "yyyy-MM-dd'T'HH:mm")
        });
      } else {
        const service = defaultService || SERVICES[0].name;
        const serviceData = SERVICES.find(s => s.name === service);
        setFormData({
          buildingName: defaultBuilding || BUILDINGS[0] || '',
          apartmentNumber: '',
          serviceType: service,
          monthsCount: 1,
          price: serviceData?.price || 100,
          workerName: '',
          dates: [format(new Date(), "yyyy-MM-dd'T'HH:mm")],
          notes: '',
          waterGallons: 1,
          isRecurring: false,
          selectedMonths: [],
          recurrenceDay: new Date().getDate(),
          status: 'pending',
          createdAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
        });
      }
    }
  }, [isOpen, defaultBuilding, defaultService, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDates = formData.dates.map(d => new Date(d));
    
    if (formData.isRecurring && formData.selectedMonths.length > 0) {
      const recurrenceDates: Date[] = [];
      
      formData.dates.forEach(dateStr => {
        const baseDate = new Date(dateStr);
        formData.selectedMonths.forEach(monthIndex => {
          const d = new Date(baseDate);
          d.setMonth(monthIndex);
          
          // Set the specific day requested by the user
          // Handle months with fewer days (e.g., Feb 30 -> Mar 2)
          d.setDate(formData.recurrenceDay);
          
          // If the selected month is earlier than the base date's month, assume next year
          if (monthIndex < baseDate.getMonth()) {
            d.setFullYear(baseDate.getFullYear() + 1);
          } else {
            d.setFullYear(baseDate.getFullYear());
          }
          
          // Check if this specific date (day/month/year) is already in finalDates or recurrenceDates
          const alreadyExists = finalDates.some(fd => 
            fd.getDate() === d.getDate() && 
            fd.getMonth() === d.getMonth() && 
            fd.getFullYear() === d.getFullYear()
          ) || recurrenceDates.some(rd => 
            rd.getDate() === d.getDate() && 
            rd.getMonth() === d.getMonth() && 
            rd.getFullYear() === d.getFullYear()
          );

          if (!alreadyExists) {
            recurrenceDates.push(d);
          }
        });
      });
      
      finalDates = [...finalDates, ...recurrenceDates];
    }

    onSave({
      ...formData,
      dates: finalDates.map(d => Timestamp.fromDate(d)),
      createdAt: Timestamp.fromDate(new Date(formData.createdAt)),
      price: Number(formData.price),
      monthsCount: Number(formData.monthsCount),
      id: initialData?.id
    });
    onClose();
  };

  if (!isOpen) return null;

  const isMaintenance = defaultService === 'صيانة' || formData.serviceType.includes('صيانة');
  const currentServices = isMaintenance ? MAINTENANCE_SERVICES : SERVICES;

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-start justify-end z-[70] p-4 backdrop-blur-sm" dir="rtl" onClick={onClose}>
      <motion.div 
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-[90vw] md:w-[448px] h-full max-h-[90vh] overflow-auto shadow-2xl border border-gray-100 dark:border-slate-800 relative"
      >
        <div className="absolute bottom-1 right-1 pointer-events-none opacity-20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <line x1="22" y1="2" x2="2" y2="22" />
            <line x1="22" y1="12" x2="12" y2="22" />
          </svg>
        </div>
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {initialData ? 'تعديل طلب خدمة' : 'إضافة طلب جديد'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">يرجى تعبئة بيانات الخدمة بدقة</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-all shadow-sm"
          >
            <X size={20} />
          </motion.button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" dir="rtl">
          <div className="bg-primary/5 dark:bg-primary/20 p-4 rounded-2xl border border-primary/10 dark:border-primary/30 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest px-1">وقت إنشاء الطلب</span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-primary/80">
                <Clock size={12} />
                <span>يمكنك تعديل وقت الطلب الأصلي هنا</span>
              </div>
            </div>
            <input 
              type="datetime-local"
              required
              className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
              value={formData.createdAt}
              onChange={e => setFormData({...formData, createdAt: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">المبنى</label>
              <select 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all appearance-none"
                value={formData.buildingName}
                onChange={e => setFormData({...formData, buildingName: e.target.value})}
              >
                {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">
                {formData.serviceType === 'تنظيف سيارات' ? 'رقم اللوحة' : 'رقم الشقة'}
              </label>
              <input 
                required
                className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.apartmentNumber}
                onChange={e => setFormData({...formData, apartmentNumber: e.target.value})}
                placeholder={formData.serviceType === 'تنظيف سيارات' ? 'أ ب ج 1234' : 'مثال: 101'}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">نوع الخدمة</label>
              <select 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all appearance-none"
                value={formData.serviceType}
                onChange={e => {
                  const service = currentServices.find(s => s.name === e.target.value);
                  setFormData({...formData, serviceType: e.target.value, price: (service?.price || 100) * formData.monthsCount});
                }}
              >
                {currentServices.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">المبلغ (ريال)</label>
              <input 
                type="number"
                required
                className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {isMaintenance ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">العامل المسؤول</label>
                <select 
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all appearance-none"
                  value={formData.workerName}
                  onChange={e => setFormData({...formData, workerName: e.target.value})}
                >
                  <option value="">اختر العامل...</option>
                  {MAINTENANCE_WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            ) : formData.serviceType === 'توصيل مياه' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">كم جالون</label>
                <input 
                  type="number"
                  min="1"
                  required
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                  value={formData.waterGallons}
                  onChange={e => {
                    const gallons = Number(e.target.value);
                    const service = SERVICES.find(s => s.name === formData.serviceType);
                    setFormData({...formData, waterGallons: gallons, price: (service?.price || 10) * gallons * formData.monthsCount});
                  }}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">عدد الطلبات</label>
                <input 
                  type="number"
                  min="1"
                  required
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                  value={formData.monthsCount}
                  onChange={e => {
                    const months = Number(e.target.value);
                    const service = SERVICES.find(s => s.name === formData.serviceType);
                    setFormData({...formData, monthsCount: months, price: (service?.price || 100) * months});
                  }}
                />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">التواريخ والمواعيد</label>
            <div className="space-y-2">
              {formData.dates.map((d, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="datetime-local"
                    required
                    className="flex-1 p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                    value={d}
                    onChange={e => {
                      const newDates = [...formData.dates];
                      newDates[idx] = e.target.value;
                      if (idx === 0) {
                        setFormData({...formData, dates: newDates, createdAt: e.target.value});
                      } else {
                        setFormData({...formData, dates: newDates});
                      }
                    }}
                  />
                  {formData.dates.length > 1 && (
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => {
                      const newDates = formData.dates.filter((_, i) => i !== idx);
                      setFormData({...formData, dates: newDates});
                    }}
                    className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-all"
                  >
                    <X size={18} />
                  </motion.button>
                  )}
                </div>
              ))}
              {!initialData && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setFormData({...formData, dates: [...formData.dates, format(new Date(), "yyyy-MM-dd'T'HH:mm")]})}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <Plus size={16} />
                  إضافة تاريخ آخر
                </motion.button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">السعر الإجمالي (ريال)</label>
              <input 
                type="number"
                required
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-black text-lg transition-all"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">حالة التنفيذ</label>
              <div className="flex bg-gray-50 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status: 'pending'})}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    formData.status === 'pending' ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm" : "text-gray-500 dark:text-slate-400"
                  )}
                >
                  لم يتم التنفيذ
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status: 'completed'})}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    formData.status === 'completed' ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-500 dark:text-slate-400"
                  )}
                >
                  تم التنفيذ
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary/5 dark:bg-primary/20 rounded-xl">
            <input 
              type="checkbox"
              id="isRecurring"
              className="w-4 h-4 text-primary rounded focus:ring-primary"
              checked={formData.isRecurring}
              onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
            />
            <label htmlFor="isRecurring" className="text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <Repeat size={16} />
              تكرار الطلب في أشهر محددة
            </label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">كرر لي اليوم بالشهر</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    className="w-20 p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                    value={formData.recurrenceDay}
                    onChange={e => setFormData({...formData, recurrenceDay: Number(e.target.value)})}
                  />
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-bold">من كل شهر مختار</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">اختر الأشهر للتكرار</label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        const baseDate = formData.dates[0] ? new Date(formData.dates[0]) : new Date();
                        const nextMonth = (baseDate.getMonth() + 1) % 12;
                        if (!formData.selectedMonths.includes(nextMonth)) {
                          setFormData({...formData, selectedMonths: [...formData.selectedMonths, nextMonth]});
                        }
                      }}
                      className="text-[10px] font-black text-primary hover:text-primary/80 dark:text-primary flex items-center gap-1"
                    >
                      <Plus size={12} />
                      تكرار للشهر القادم
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, selectedMonths: []})}
                      className="text-[10px] font-black text-gray-400 hover:text-gray-600 dark:text-slate-500"
                    >
                      مسح الكل
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {MONTHS_AR.map((month, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      const newMonths = formData.selectedMonths.includes(idx)
                        ? formData.selectedMonths.filter(m => m !== idx)
                        : [...formData.selectedMonths, idx];
                      setFormData({...formData, selectedMonths: newMonths});
                    }}
                    className={cn(
                      "py-2 px-1 rounded-xl text-[10px] font-bold transition-all border",
                      formData.selectedMonths.includes(idx)
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20 dark:shadow-none"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-transparent hover:border-primary/30"
                    )}
                  >
                    {month}
                  </motion.button>
                ))}
              </div>
              {formData.selectedMonths.length > 0 && (
                <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/10 dark:border-primary/30 mt-2">
                  <p className="text-[10px] font-bold text-primary">
                    سيتم إنشاء {formData.dates.length * (formData.selectedMonths.length + 1)} طلبات إجمالاً ({formData.dates.length} طلبات لكل شهر مختار)
                  </p>
                  <p className="text-xs font-black text-primary/80 dark:text-primary/90 mt-1">
                    التكلفة الإجمالية: {formData.price * formData.dates.length * (formData.selectedMonths.length + 1)} ريال
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">ملاحظات إضافية</label>
            <textarea 
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all min-h-[80px] resize-y"
              placeholder="أي تفاصيل إضافية..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="flex-1 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-black text-base shadow-lg shadow-primary/20 dark:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {initialData ? 'حفظ التعديلات' : 'تأكيد الطلب'}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
            >
              إلغاء
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const InventoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: InventoryItem | null;
}> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    currentStock: 0,
    reorderPoint: 5,
    unit: 'جالون'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        itemName: initialData.itemName,
        category: initialData.category,
        currentStock: initialData.currentStock,
        reorderPoint: initialData.reorderPoint,
        unit: initialData.unit
      });
    } else {
      setFormData({
        itemName: '',
        category: '',
        currentStock: 0,
        reorderPoint: 5,
        unit: 'جالون'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-primary/5">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              {initialData ? 'تعديل صنف' : 'إضافة صنف جديد'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-0.5">إدارة مخزون المستودع</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...formData, id: initialData?.id });
        }} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">اسم الصنف</label>
            <input 
              type="text"
              required
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
              value={formData.itemName}
              onChange={e => setFormData({...formData, itemName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">الكمية الحالية</label>
              <input 
                type="number"
                required
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.currentStock}
                onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">نقطة إعادة الطلب</label>
              <input 
                type="number"
                required
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.reorderPoint}
                onChange={e => setFormData({...formData, reorderPoint: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">الفئة</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">الوحدة</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="flex-1 bg-primary text-white py-3.5 rounded-xl font-black text-base shadow-lg shadow-primary/20 dark:shadow-none transition-all"
            >
              حفظ البيانات
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-3.5 rounded-xl font-black text-base transition-all"
            >
              إلغاء
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const FinancialDashboardModal = ({ isOpen, onClose, tenants, apartments }: any) => {
  if (!isOpen) return null;

  const totalAnnualValue = tenants.reduce((sum: number, t: any) => sum + (t.contractValue || 0), 0);
  const avgContractValue = tenants.length > 0 ? totalAnnualValue / tenants.length : 0;
  const occupancyRate = apartments.length > 0 ? (tenants.length / apartments.length) * 100 : 0;

  // Company breakdown
  const companies = tenants.reduce((acc: any, t: any) => {
    acc[t.company] = (acc[t.company] || 0) + 1;
    return acc;
  }, {});

  // Nationality breakdown
  const nationalities = tenants.reduce((acc: any, t: any) => {
    acc[t.nationality] = (acc[t.nationality] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-primary text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">لوحة المبالغ المالية</h2>
              <p className="text-white/70 font-bold">نظرة عامة على الإيرادات والإحصائيات المالية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">إجمالي القيمة السنوية</p>
              <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{totalAnnualValue.toLocaleString()} ر.س</h3>
            </div>
            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">متوسط قيمة العقد</p>
              <h3 className="text-3xl font-black text-blue-700 dark:text-blue-300">{Math.round(avgContractValue).toLocaleString()} ر.س</h3>
            </div>
            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-2">نسبة الإشغال</p>
              <h3 className="text-3xl font-black text-amber-700 dark:text-amber-300">{Math.round(occupancyRate)}%</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={20} className="text-primary" />
                توزيع الشركات
              </h4>
              <div className="space-y-3">
                {Object.entries(companies).sort((a: any, b: any) => b[1] - a[1]).map(([name, count]: any) => (
                  <div key={name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                    <span className="font-bold text-gray-700 dark:text-slate-300">{name}</span>
                    <span className="font-black text-primary bg-white dark:bg-slate-800 px-3 py-1 rounded-lg shadow-sm">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Globe size={20} className="text-primary" />
                توزيع الجنسيات
              </h4>
              <div className="space-y-3">
                {Object.entries(nationalities).sort((a: any, b: any) => b[1] - a[1]).map(([name, count]: any) => (
                  <div key={name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                    <span className="font-bold text-gray-700 dark:text-slate-300">{name}</span>
                    <span className="font-black text-primary bg-white dark:bg-slate-800 px-3 py-1 rounded-lg shadow-sm">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const RentPaymentsModal = ({ isOpen, onClose, tenant, payments, onAddPayment, onUpdateStatus, onDeletePayment, onGenerateSchedule }: any) => {
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !tenant) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !dueDate) {
      toast.error('يرجى إكمال البيانات المطلوبة');
      return;
    }
    onAddPayment(tenant.id, Number(amount), new Date(dueDate), notes);
    setAmount('');
    setDueDate('');
    setNotes('');
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-cairo"
        >
          <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <DollarSign size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">جدول مدفوعات المستأجر</h2>
                <p className="text-gray-500 font-bold text-sm">{tenant.name} • قيمة العقد: {tenant.contractValue?.toLocaleString()} ر.س</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">سجل الدفعات</h3>
                  {payments.length === 0 && (
                    <button 
                      onClick={() => onGenerateSchedule(tenant)}
                      className="text-primary font-black text-xs bg-primary/5 px-4 py-2 rounded-xl border border-primary/20 hover:bg-primary/10 transition-all"
                    >
                      توليد جدول ذكي
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 flex items-center justify-between group">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black",
                          payment.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {payment.status === 'paid' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <div className="font-black text-gray-900 dark:text-white text-lg">{payment.amount?.toLocaleString()} ر.س</div>
                          <div className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-2">
                             <span>تاريخ الاستحقاق: {format(safeToDate(payment.dueDate), 'yyyy/MM/dd')}</span>
                             {payment.paymentDate && (
                               <span className="text-emerald-500">• دفع في: {format(safeToDate(payment.paymentDate), 'yyyy/MM/dd')}</span>
                             )}
                          </div>
                          {payment.notes && <p className="text-[10px] text-gray-500 mt-1 italic opacity-70">"{payment.notes}"</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {payment.status === 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => onUpdateStatus(tenant.id, payment.id, 'paid')}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-200"
                          >
                            تحديد كمدفوع
                          </motion.button>
                        )}
                        {payment.status === 'paid' && (
                          <button
                            onClick={() => onUpdateStatus(tenant.id, payment.id, 'pending')}
                            className="text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-100 transition-all"
                          >
                            إلغاء التحصيل
                          </button>
                        )}
                        <button
                          onClick={() => onDeletePayment(tenant.id, payment.id)}
                          className="p-2 text-gray-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <div className="py-12 text-center bg-gray-50 dark:bg-slate-800/30 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-800">
                      <div className="text-gray-400 font-bold">لا توجد دفعات مسجلة بعد</div>
                      <p className="text-[10px] text-gray-400 mt-2">استخدم النموذج لإضافة دفعة أو الخيار الذكي لتوليد الجدول</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800">
                  <h3 className="font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <Plus size={18} className="text-emerald-500" />
                    إضافة دفعة يدوية
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">المبلغ</label>
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">تاريخ الاستحقاق</label>
                      <input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ملاحظات</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm font-bold h-24"
                        placeholder="اختياري..."
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all mt-4"
                    >
                      إضافة للجدول
                    </motion.button>
                  </form>
                </div>

                <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white">
                  <h3 className="font-black mb-6 flex items-center gap-3">
                    <PieChart size={18} className="text-primary" />
                    خلاصة الدفعات
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">إجمالي العقد</span>
                      <span className="font-black">{tenant.contractValue?.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">المبلغ المحصل</span>
                      <span className="font-black text-emerald-400">{tenant.collectedAmount?.toLocaleString()} ر.س</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${Math.min(100, (tenant.collectedAmount / (tenant.contractValue || 1)) * 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                      <span className="text-gray-400">المتبقي</span>
                      <span className="font-black text-rose-400">{Math.max(0, tenant.contractValue - tenant.collectedAmount).toLocaleString()} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const MoveTenantModal = ({ isOpen, onClose, tenant, apartments, onMove }: any) => {
  const [selectedAptId, setSelectedAptId] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');

  if (!isOpen || !tenant) return null;

  const currentApt = apartments.find((a: any) => a.id === tenant.apartmentId);

  const availableApts = apartments.filter((a: any) => 
    a.status === 'vacant' && 
    (selectedBuilding === 'all' || a.buildingId === selectedBuilding)
  );

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-cairo shadow-purple-500/10 border border-purple-100/20"
        >
          <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-900/10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200/50">
                <ArrowRightLeft size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">نقل المستأجر</h2>
                <p className="text-gray-500 font-bold text-sm">نقل من الشقة الحالية إلى شقة شاغرة</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-purple-100">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">المستأجر الحالي</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 text-white rounded-xl flex items-center justify-center font-black text-lg">
                  {tenant.name.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-gray-900 dark:text-white">{tenant.name}</div>
                  <div className="text-[10px] font-bold text-purple-500">الشقة الحالية: {currentApt?.number || 'غير محدد'} ({PROPERTY_BUILDINGS.find(b => b.id === currentApt?.buildingId)?.name || 'مبنى'})</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">اختر الشقة الجديدة</label>
                <select 
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="text-[10px] font-black text-purple-600 bg-purple-50 border-none rounded-lg px-3 py-1 outline-none"
                >
                  <option value="all">كل المباني</option>
                  {PROPERTY_BUILDINGS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {availableApts.map((apt: any) => (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAptId(apt.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                      selectedAptId === apt.id 
                        ? "bg-purple-500 border-purple-600 text-white shadow-lg shadow-purple-200" 
                        : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white hover:border-purple-300"
                    )}
                  >
                    <span className="text-sm font-black">{apt.number}</span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase",
                      selectedAptId === apt.id ? "text-purple-100" : "text-gray-400"
                    )}>{PROPERTY_BUILDINGS.find(b => b.id === apt.buildingId)?.name}</span>
                  </button>
                ))}
                {availableApts.length === 0 && (
                  <div className="col-span-3 py-10 text-center text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed">
                    لا توجد شقق شاغرة في هذا المبنى
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={!selectedAptId}
              onClick={() => onMove(tenant, selectedAptId)}
              className={cn(
                "w-full py-5 rounded-[2rem] font-black text-sm transition-all shadow-xl",
                selectedAptId 
                  ? "bg-purple-600 text-white shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] active:scale-[0.98]" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              تأكيد النقل الآن
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const TenantModal = ({ isOpen, onClose, onSave, initialData, apartments }: any) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    nationality: '',
    phone: '',
    company: '',
    idNumber: '',
    contractValue: 0,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    nextPaymentDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    paymentFrequency: 'monthly',
    paymentMethod: 'cash',
    apartmentId: '',
    receiptUrl: '',
    idImageUrl: ''
  });

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, receiptUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, idImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        startDate: format(safeToDate(initialData.startDate), 'yyyy-MM-dd'),
        endDate: format(safeToDate(initialData.endDate), 'yyyy-MM-dd'),
        nextPaymentDate: format(safeToDate(initialData.nextPaymentDate), 'yyyy-MM-dd'),
      });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      startDate: Timestamp.fromDate(new Date(formData.startDate)),
      endDate: Timestamp.fromDate(new Date(formData.endDate)),
      nextPaymentDate: Timestamp.fromDate(new Date(formData.nextPaymentDate)),
      contractValue: Number(formData.contractValue),
      collectedAmount: Number(formData.collectedAmount || 0),
      status: formData.status || 'active'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-primary text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{initialData ? 'تعديل بيانات العقد' : 'إضافة عقد جديد'}</h2>
              <p className="text-white/70 font-bold">يرجى إدخال كافة تفاصيل العقد والمستأجر</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">اسم المستأجر</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الجنسية</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                value={formData.nationality}
                onChange={e => setFormData({...formData, nationality: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رقم الجوال</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رقم الهوية / الإقامة</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                value={formData.idNumber}
                onChange={e => setFormData({...formData, idNumber: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الشركة</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رقم الشقة</label>
              <select 
                required
                disabled={!!initialData}
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all appearance-none"
                value={formData.apartmentId}
                onChange={e => {
                  const selectedApt = apartments.find((a: any) => a.id === e.target.value);
                  setFormData({
                    ...formData, 
                    apartmentId: e.target.value,
                    aptNumber: selectedApt?.number || '',
                    buildingName: selectedApt?.buildingName || ''
                  });
                }}
              >
                <option value="">اختر الشقة...</option>
                {apartments.filter((a: any) => a.status === 'vacant' || a.id === initialData?.apartmentId).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.buildingName} - شقة {a.number}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t dark:border-slate-800">
            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4">تفاصيل العقد والمالية</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">القيمة السنوية</label>
                <input 
                  type="number"
                  required
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                  value={formData.contractValue}
                  onChange={e => setFormData({...formData, contractValue: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">المبلغ المحصل</label>
                <input 
                  type="number"
                  className="w-full p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm font-bold transition-all"
                  value={formData.collectedAmount}
                  onChange={e => setFormData({...formData, collectedAmount: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">حالة العقد</label>
                <select 
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="active">نشط</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">بداية العقد</label>
                <input 
                  type="date"
                  required
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نهاية العقد</label>
                <input 
                  type="date"
                  required
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary text-sm font-bold transition-all"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">ارفاق الهوية</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer group">
                  <div className="w-full p-6 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl group-hover:border-primary group-hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3">
                    {formData.idImageUrl ? (
                      <img src={formData.idImageUrl} alt="ID" className="w-full max-h-48 object-contain rounded-xl" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-primary transition-all">
                          <CreditCard size={24} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-gray-700 dark:text-gray-300">اضغط لرفع الهوية</p>
                          <p className="text-[10px] text-gray-400">JPG, PNG (Max 800KB)</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleIdUpload} />
                </label>
                {formData.idImageUrl && (
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, idImageUrl: ''})}
                    className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all border border-rose-100"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">إيصال الدفع / العقد</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer group">
                  <div className="w-full p-6 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl group-hover:border-primary group-hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3">
                    {formData.receiptUrl ? (
                      <img src={formData.receiptUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-primary transition-all">
                          <Upload size={24} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-gray-700 dark:text-gray-300">اضغط لرفع الإيصال</p>
                          <p className="text-[10px] text-gray-400">JPG, PNG (Max 800KB)</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                </label>
                {formData.receiptUrl && (
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, receiptUrl: ''})}
                    className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all border border-rose-100"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-primary/20 transition-all"
            >
              حفظ بيانات العقد
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-4 rounded-2xl font-black text-base transition-all"
            >
              إلغاء
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ExportModal = ({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: any[] }) => {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'buildingName', 'apartmentNumber', 'serviceType', 'date', 'status', 'paymentStatus', 'price'
  ]);

  const FIELDS = [
    { id: 'buildingName', label: 'المبنى' },
    { id: 'apartmentNumber', label: 'رقم الشقة' },
    { id: 'serviceType', label: 'نوع الخدمة' },
    { id: 'date', label: 'التاريخ' },
    { id: 'status', label: 'الحالة' },
    { id: 'paymentStatus', label: 'حالة الدفع' },
    { id: 'price', label: 'السعر' },
    { id: 'notes', label: 'ملاحظات' },
    { id: 'workerName', label: 'اسم العامل' },
  ];

  const handleExport = () => {
    const exportData = data.map(item => {
      const row: any = {};
      selectedFields.forEach(field => {
        const fieldLabel = FIELDS.find(f => f.id === field)?.label || field;
        let value = item[field];
        if (field === 'date' && value) {
          try {
            value = format(value.toDate ? value.toDate() : new Date(value), 'yyyy-MM-dd');
          } catch (e) {
            value = String(value);
          }
        }
        if (field === 'status') value = value === 'completed' ? 'منفذ' : 'قيد الانتظار';
        if (field === 'paymentStatus') value = value === 'paid' ? 'تم الدفع' : 'لم يتم الدفع';
        row[fieldLabel] = value;
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(dataBlob, `requests_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    onClose();
    toast.success('تم تصدير البيانات بنجاح');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">تصدير البيانات</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-sm font-bold text-gray-500 dark:text-slate-400">اختر الخانات التي ترغب في تصديرها:</p>
              
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(field => (
                  <button
                    key={field.id}
                    onClick={() => {
                      if (selectedFields.includes(field.id)) {
                        setSelectedFields(selectedFields.filter(f => f !== field.id));
                      } else {
                        setSelectedFields([...selectedFields, field.id]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-right",
                      selectedFields.includes(field.id)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-500"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                      selectedFields.includes(field.id) ? "bg-primary border-primary" : "border-gray-300 dark:border-slate-600"
                    )}>
                      {selectedFields.includes(field.id) && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-xs font-black">{field.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExport}
                  disabled={selectedFields.length === 0}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-primary/20 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  تصدير إلى Excel
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ClubSubscriptionModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  newClubSub, 
  setNewClubSub,
  onIdUpload,
  isEditing = false
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: () => void;
  newClubSub: Partial<ClubSubscription>;
  setNewClubSub: React.Dispatch<React.SetStateAction<Partial<ClubSubscription>>>;
  onIdUpload: (file: File) => void;
  isEditing?: boolean;
}) => {
  if (!isOpen) return null;

  const monthOptions = [1, 3, 6, 12];
  const pricePerMonth = 300;

  const formatTimestampForInput = (ts: any) => {
    if (!ts) return '';
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
      >
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              {isEditing ? <Pencil className="text-white" size={24} /> : <Plus className="text-white" size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {isEditing ? 'تعديل بيانات المشترك' : 'إضافة مشترك جديد'}
              </h2>
              <p className="text-gray-500 dark:text-slate-400 font-bold text-xs mt-1">يرجى إدخال بيانات المشترك بدقة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">اسم المشترك</label>
              <input 
                type="text"
                value={newClubSub.name || ''}
                onChange={(e) => setNewClubSub(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold"
                placeholder="أدخل الاسم الثلاثي"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المبنى / مكان العمل</label>
              <select 
                value={newClubSub.workplace || ''}
                onChange={(e) => setNewClubSub(prev => ({ ...prev, workplace: e.target.value }))}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold appearance-none"
              >
                <option value="">اختر المبنى</option>
                {BUILDINGS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value="other">أخرى (إدخال يدوي)</option>
              </select>
              {newClubSub.workplace === 'other' && (
                <input 
                  type="text"
                  onChange={(e) => setNewClubSub(prev => ({ ...prev, workplace: e.target.value }))}
                  className="w-full mt-2 px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold"
                  placeholder="أدخل مكان العمل يدوياً"
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">مدة الاشتراك</label>
            <div className="grid grid-cols-4 gap-3">
              {monthOptions.map((months) => (
                <button
                  key={months}
                  onClick={() => setNewClubSub(prev => ({ 
                    ...prev, 
                    monthsCount: months,
                    totalPrice: months * pricePerMonth
                  }))}
                  className={cn(
                    "py-4 rounded-2xl font-black text-sm transition-all border-2",
                    newClubSub.monthsCount === months
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-500 border-transparent hover:border-primary/30"
                  )}
                >
                  {months} {months === 1 ? 'شهر' : 'أشهر'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">سعر الاشتراك (ريال)</label>
                <input 
                  type="number"
                  value={newClubSub.totalPrice || ''}
                  onChange={(e) => setNewClubSub(prev => ({ ...prev, totalPrice: Number(e.target.value) }))}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold"
                  placeholder="أدخل السعر"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المبلغ المحصل (ريال)</label>
                <input 
                  type="number"
                  value={newClubSub.collectedAmount || 0}
                  onChange={(e) => setNewClubSub(prev => ({ ...prev, collectedAmount: Number(e.target.value) }))}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold"
                  placeholder="أدخل المبلغ المحصل"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">تاريخ البداية</label>
              <input 
                type="date"
                value={formatTimestampForInput(newClubSub.startDate)}
                onChange={(e) => setNewClubSub(prev => ({ ...prev, startDate: Timestamp.fromDate(new Date(e.target.value)) }))}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">تاريخ النهاية</label>
              <input 
                type="date"
                value={formatTimestampForInput(newClubSub.endDate)}
                onChange={(e) => setNewClubSub(prev => ({ ...prev, endDate: Timestamp.fromDate(new Date(e.target.value)) }))}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">حالة التحصيل</label>
            <div className="grid grid-cols-2 gap-3">
              {(['unpaid', 'paid'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setNewClubSub(prev => ({ ...prev, paymentStatus: status }))}
                  className={cn(
                    "py-4 rounded-2xl font-black text-sm transition-all border-2",
                    newClubSub.paymentStatus === status
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-500 border-transparent hover:border-primary/30"
                  )}
                >
                  {status === 'paid' ? 'تم التحصيل' : 'لم يتم التحصيل'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">إرفاق الهوية</label>
            <div className="relative aspect-video bg-gray-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-700 overflow-hidden group">
              {newClubSub.idPhotoUrl ? (
                <>
                  <img src={newClubSub.idPhotoUrl} alt="ID" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="p-4 bg-white/20 backdrop-blur-md text-white rounded-2xl cursor-pointer hover:scale-110 transition-transform flex items-center gap-2 font-black text-sm">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onIdUpload(e.target.files[0])} />
                      <Upload size={20} />
                      تغيير الصورة
                    </label>
                  </div>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onIdUpload(e.target.files[0])} />
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center">
                    <Camera size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm text-gray-400">اضغط لرفع صورة الهوية</p>
                    <p className="text-[10px] font-bold text-gray-300 mt-1">PNG, JPG حتى 800 كيلوبايت</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 dark:bg-slate-800/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white dark:bg-slate-800 text-gray-500 font-black rounded-2xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 transition-all"
          >
            إلغاء
          </button>
          <button 
            onClick={onSave}
            className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} />
            حفظ الاشتراك
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const BrandingModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialName, 
  initialLogo, 
  initialBackground, 
  initialThemeColor, 
  initialBgOpacity,
  isDarkMode,
  setIsDarkMode
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (name: string, logo: string | null, background: string | null, color: string, opacity: number) => void;
  initialName: string;
  initialLogo: string | null;
  initialBackground: string | null;
  initialThemeColor: string;
  initialBgOpacity: number;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}) => {
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [background, setBackground] = useState<string | null>(initialBackground);
  const [color, setColor] = useState(initialThemeColor);
  const [opacity, setOpacity] = useState(initialBgOpacity);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setLogo(initialLogo);
      setBackground(initialBackground);
      setColor(initialThemeColor);
      setOpacity(initialBgOpacity);
    }
  }, [isOpen, initialName, initialLogo, initialBackground, initialThemeColor, initialBgOpacity]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') setLogo(reader.result as string);
        else setBackground(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const THEME_COLORS = [
    { id: 'emerald', label: 'زمردي', class: 'bg-[#10B981]' },
    { id: 'indigo', label: 'بنفسجي', class: 'bg-[#8B5CF6]' },
    { id: 'blue', label: 'أزرق', class: 'bg-[#3B82F6]' },
    { id: 'rose', label: 'وردي', class: 'bg-[#EC4899]' },
    { id: 'amber', label: 'كهرماني', class: 'bg-[#F59E0B]' },
    { id: 'slate', label: 'رمادي', class: 'bg-[#334155]' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">تعديل الهوية</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">اسم التطبيق</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-gray-900 dark:text-white"
                  placeholder="أدخل اسم التطبيق..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">شعار التطبيق</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-primary/5 dark:bg-primary/10 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/20 dark:border-primary/30">
                    {logo ? (
                      <img src={logo} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-primary/40" size={32} />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-black text-xs cursor-pointer hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 dark:shadow-none">
                      <Upload size={16} />
                      رفع شعار جديد
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'logo')} />
                    </label>
                    {logo && (
                      <button 
                        onClick={() => setLogo(null)}
                        className="w-full py-2 text-rose-500 font-bold text-[10px] hover:underline"
                      >
                        حذف الشعار واستخدام الافتراضي
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">صورة الخلفية</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-primary/5 dark:bg-primary/10 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/20 dark:border-primary/30">
                    {background ? (
                      <img src={background} alt="BG Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-primary/40" size={32} />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-black text-xs cursor-pointer hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 dark:shadow-none">
                      <Upload size={16} />
                      رفع خلفية جديدة
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'background')} />
                    </label>
                    {background && (
                      <button 
                        onClick={() => setBackground(null)}
                        className="w-full py-2 text-rose-500 font-bold text-[10px] hover:underline"
                      >
                        حذف الخلفية
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">نمط الألوان</label>
                <div className="grid grid-cols-3 gap-3">
                  {THEME_COLORS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setColor(t.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        color === t.id 
                          ? `border-current bg-current/10` 
                          : "border-transparent bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700"
                      )}
                      style={color === t.id ? { borderColor: t.class.match(/\[(.*)\]/)?.[1], backgroundColor: `${t.class.match(/\[(.*)\]/)?.[1]}1A`, color: t.class.match(/\[(.*)\]/)?.[1] } : {}}
                    >
                      <div className={cn("w-4 h-4 rounded-full", t.class)} />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">شفافية الخلفية ({opacity}%)</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-800">
                <div className="theme-switch-wrapper">
                  <label className="theme-switch" htmlFor="modal-checkbox">
                    <input 
                      type="checkbox" 
                      id="modal-checkbox" 
                      checked={isDarkMode}
                      onChange={() => setIsDarkMode(!isDarkMode)}
                    />
                    <div className="slider round"></div>
                  </label>
                  <em className="text-sm font-black text-gray-900 dark:text-white not-italic">الوضع الداكن</em>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => onSave(name, logo, background, color, opacity)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Real Estate Management Component ---
// --- Main App Component ---
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CleaningRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CleaningRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dailyTasksView, setDailyTasksView] = useState<'today' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily-tasks' | string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'dashboard';
  });
  const [aptSearch, setAptSearch] = useState('');
  const [aptStatusFilter, setAptStatusFilter] = useState<'all' | 'vacant' | 'occupied'>('all');
  const [aptBuildingFilter, setAptBuildingFilter] = useState<string>('all');
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([]);

  const deleteSelectedApartments = async () => {
    if (selectedAptIds.length === 0) return;
    
    toast(`هل أنت متأكد من حذف ${selectedAptIds.length} وحدات مختارة؟`, {
      description: 'سيتم حذف كافة الوحدات المحددة نهائياً.',
      action: {
        label: 'تأكيد حذف المحدد',
        onClick: async () => {
          const loadingToast = toast.loading(`جاري حذف ${selectedAptIds.length} وحدات...`);
          try {
            const batchSize = 10;
            for (let i = 0; i < selectedAptIds.length; i += batchSize) {
              const chunk = selectedAptIds.slice(i, i + batchSize);
              await Promise.all(chunk.map(id => deleteDoc(doc(db, 'apartments', id))));
            }
            setSelectedAptIds([]);
            toast.dismiss(loadingToast);
            toast.success('تم حذف الوحدات المختارة بنجاح');
          } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('حدث خطأ أثناء الحذف');
            console.error(error);
          }
        }
      },
      cancel: { label: 'إلغاء' }
    });
  };

  const toggleAptSelection = (id: string) => {
    setSelectedAptIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearAllApartments = async () => {
    if (apartments.length === 0) return toast.error('لا توجد وحدات لحذفها');
    
    toast(`هل أنت متأكد من حذف كافة الوحدات (${apartments.length})؟`, {
      description: 'سيتم مسح كافة الوحدات المسجلة حالياً. لا يمكن التراجع عن هذا الإجراء.',
      action: {
        label: 'تأكيد المسح الشامل',
        onClick: async () => {
          const loadingToast = toast.loading('جاري حذف كافة الوحدات...');
          try {
            const batchSize = 25;
            for (let i = 0; i < apartments.length; i += batchSize) {
              const chunk = apartments.slice(i, i + batchSize);
              await Promise.all(chunk.map(apt => deleteDoc(doc(db, 'apartments', apt.id))));
            }
            toast.dismiss(loadingToast);
            toast.success('تم إفراغ كافة الوحدات بنجاح');
          } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('حدث خطأ أثناء محاولة الحذف الجماعي');
            console.error(error);
          }
        }
      },
      cancel: { label: 'إلغاء' }
    });
  };

  const deleteApartment = async (id: string, number: string) => {
    toast(`هل أنت متأكد من حذف الشقة رقم ${number}؟`, {
      description: 'لا يمكن التراجع عن هذا الإجراء وسيتم حذف كافة بيانات الوحدة.',
      action: {
        label: 'تأكيد الحذف',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'apartments', id));
            toast.success(`تم حذف الشقة ${number} بنجاح`);
          } catch (error) {
            console.error('Error deleting apartment:', error);
            handleFirestoreError(error, OperationType.DELETE, `apartments/${id}`);
          }
        }
      },
      cancel: {
        label: 'إلغاء'
      }
    });
  };
  const [viewMode, setViewMode] = useState<'list' | 'summary' | 'calendar'>('list');
  const [selectedApartment, setSelectedApartment] = useState<{ building: string, apartment: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = 200;
      navRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const tasksScrollRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const scrollTasks = (direction: 'left' | 'right') => {
    if (tasksScrollRef.current) {
      const scrollAmount = 300;
      tasksScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const [selectedRequest, setSelectedRequest] = useState<CleaningRequest | null>(null);
  const [isPrintingStatement, setIsPrintingStatement] = useState(false);
  const [filteredStatementRequests, setFilteredStatementRequests] = useState<CleaningRequest[]>([]);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [isPrintingInventory, setIsPrintingInventory] = useState(false);
  const [isPrintingStaff, setIsPrintingStaff] = useState(false);
  const [isPrintingBulk, setIsPrintingBulk] = useState(false);
  const [bulkPrintRequests, setBulkPrintRequests] = useState<CleaningRequest[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmSaveData, setConfirmSaveData] = useState<any | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'apartments' | 'cars'>('all');
  const [showYesterdayIncomplete, setShowYesterdayIncomplete] = useState(false);
  const [summaryBoxDateOffset, setSummaryBoxDateOffset] = useState(1);
  const [waterStock, setWaterStock] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);
  const [globalSelectedDate, setGlobalSelectedDate] = useState(new Date());
  const [appName, setAppName] = useState('North Residence');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appBackground, setAppBackground] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(20);
  const [themeColor, setThemeColor] = useState('emerald');
  const [clubSubscriptions, setClubSubscriptions] = useState<ClubSubscription[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [workerForm, setWorkerForm] = useState({ name: '', phone: '' });
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isClubSubscriptionModalOpen, setIsClubSubscriptionModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', displayName: '' });
  const [loginMethod, setLoginMethod] = useState<'username' | 'phone'>('username');
  const [isPublicBookingView, setIsPublicBookingView] = useState(false);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isFinancialDashboardOpen, setIsFinancialDashboardOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aptFileInputRef = useRef<HTMLInputElement>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<'active' | 'archived'>('active');
  const [tenantSortField, setTenantSortField] = useState<keyof Tenant | 'aptNumber'>('name');
  const [tenantSortDirection, setTenantSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tenantBuildingFilter, setTenantBuildingFilter] = useState('all');
  const [selectedTenantForPayments, setSelectedTenantForPayments] = useState<Tenant | null>(null);
  const [movingTenant, setMovingTenant] = useState<Tenant | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [tenantPayments, setTenantPayments] = useState<RentPayment[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [tenantForm, setTenantForm] = useState<Partial<Tenant>>({
    name: '',
    nationality: '',
    phone: '',
    company: '',
    idNumber: '',
    contractValue: 0,
    collectedAmount: 0,
    paymentFrequency: 'monthly',
    paymentMethod: 'cash',
    status: 'active'
  });
  const [editingClubSub, setEditingClubSub] = useState<ClubSubscription | null>(null);
  const [clubSubBuildingFilter, setClubSubBuildingFilter] = useState('all');
  const [newClubSub, setNewClubSub] = useState<Partial<ClubSubscription>>({
    monthsCount: 1,
    status: 'active',
    paymentStatus: 'unpaid',
    collectedAmount: 0
  });
  const [clubSubIdFile, setClubSubIdFile] = useState<File | null>(null);

  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === null ? true : saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const inventoryReportRef = useRef<HTMLDivElement>(null);
  const staffReportRef = useRef<HTMLDivElement>(null);
  const bulkInvoicesRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.uid === 'fyozr-admin-user' || user?.email === '11aabbcc54@gmail.com' || (user as any)?.role === 'admin';

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'daily-tasks', label: 'المهام اليومية', icon: CalendarCheck },
    { id: 'تكرار الطلبات', label: 'تكرار الطلبات', icon: Repeat },
    { id: 'staff', label: 'إدارة العمالة', icon: UserIcon },
    { id: 'club-subscriptions', label: 'اشتراكات النادي', icon: ListTodo },
    { id: 'bookings', label: 'إدارة الحجوزات', icon: Calendar },
    { id: 'طلبات الماء', label: 'إدارة المياه والمخزون', icon: Droplets },
    { id: 'طلبات الصيانة', label: 'طلبات الصيانة', icon: Wrench },
    ...BUILDINGS.map(b => ({ id: b, label: b, icon: Home })),
    { id: 'تنظيف سيارات', label: 'تنظيف السيارات', icon: Car },
    { id: 'property-units', label: 'إدارة الوحدات', icon: Home },
    { id: 'tenants', label: 'العقود', icon: FileCheck },
    { id: 'property-alerts', label: 'تنبيهات العقود', icon: Bell },
    { id: 'users', label: 'إدارة المستخدمين', icon: Users },
    { id: 'settings', label: 'إعدادات الهوية', icon: Settings }
  ].filter(item => {
    if (isAdmin) return true;
    const userPerms = (user as any)?.permissions || [];
    return userPerms.includes(item.id);
  });

  useEffect(() => {
    if (selectedTenantForPayments) {
      const q = query(
        collection(db, 'tenants', selectedTenantForPayments.id, 'rentPayments'),
        orderBy('dueDate', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RentPayment[];
        setTenantPayments(payments);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `tenants/${selectedTenantForPayments.id}/rentPayments`);
      });
      return () => unsubscribe();
    }
  }, [selectedTenantForPayments]);

  useEffect(() => {
    if (searchTerm.trim() !== '') {
      setViewMode('summary');
    }
  }, [searchTerm]);

  useEffect(() => {
    if (NAV_ITEMS.length > 0 && !NAV_ITEMS.find(item => item.id === activeTab)) {
      setActiveTab(NAV_ITEMS[0].id);
    }
  }, [NAV_ITEMS, activeTab]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'branding'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.name) setAppName(data.name);
        if (data.logo) setAppLogo(data.logo);
        if (data.background) setAppBackground(data.background);
        if (data.bgOpacity !== undefined) setBgOpacity(data.bgOpacity);
        if (data.themeColor) setThemeColor(data.themeColor);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/branding');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeApts = onSnapshot(collection(db, 'apartments'), (snapshot) => {
      const apts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApartments(apts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'apartments');
    });
    const unsubscribeTenants = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTenants(t);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tenants');
    });
    return () => {
      unsubscribeApts();
      unsubscribeTenants();
    };
  }, [user]);

  useEffect(() => {
    if (user && tenants.length > 0) {
      const expiring = getExpiringContracts(30);
      if (expiring.length > 0) {
        toast.error(`تنبيه العقود: يوجد ${expiring.length} عقد منتهي أو يقترب من الانتهاء`, {
          description: 'يرجى مراجعة قسم تنبيهات العقود لاتخاذ الإجراءات اللازمة.',
          duration: 8000,
          action: {
            label: 'عرض التنبيهات',
            onClick: () => setActiveTab('property-alerts')
          },
        });
      }
    }
  }, [user, tenants.length > 0]);

  const updateBranding = async (name: string, logo: string | null, background: string | null, color: string, opacity: number) => {
    try {
      await setDoc(doc(db, 'settings', 'branding'), { name, logo, background, themeColor: color, bgOpacity: opacity }, { merge: true });
      toast.success('تم تحديث الهوية بنجاح');
      setIsBrandingModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/branding');
    }
  };

  const handleClubSubIdUpload = async (file: File) => {
    if (file.size > 800000) {
      toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setNewClubSub(prev => ({ ...prev, idPhotoUrl: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const addClubSubscription = async () => {
    if (!newClubSub.name || !newClubSub.workplace || !newClubSub.startDate || !newClubSub.endDate) {
      toast.error('يرجى إكمال جميع البيانات المطلوبة');
      return;
    }

    try {
      const pricePerMonth = 300;
      const finalTotalPrice = newClubSub.totalPrice || (newClubSub.monthsCount || 1) * pricePerMonth;

      if (editingClubSub) {
        await updateDoc(doc(db, 'clubSubscriptions', editingClubSub.id), {
          ...newClubSub,
          totalPrice: finalTotalPrice,
          updatedAt: Timestamp.now()
        });
        toast.success('تم تحديث الاشتراك بنجاح');
      } else {
        await addDoc(collection(db, 'clubSubscriptions'), {
          ...newClubSub,
          totalPrice: finalTotalPrice,
          userId: user.uid,
          paymentStatus: 'unpaid',
          createdAt: Timestamp.now()
        });
        toast.success('تم إضافة الاشتراك بنجاح');
      }
      setIsClubSubscriptionModalOpen(false);
      setEditingClubSub(null);
      setNewClubSub({ monthsCount: 1, status: 'active', paymentStatus: 'unpaid', collectedAmount: 0 });
    } catch (error) {
      handleFirestoreError(error, editingClubSub ? OperationType.UPDATE : OperationType.WRITE, 'clubSubscriptions');
    }
  };

  const updateClubSubStatus = async (id: string, status: 'active' | 'expired' | 'locked') => {
    try {
      await updateDoc(doc(db, 'clubSubscriptions', id), { status });
      toast.success('تم تحديث حالة الاشتراك');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clubSubscriptions/${id}`);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });
      toast.success('تم تحديث حالة الحجز');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      toast.success('تم حذف الحجز');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${bookingId}`);
    }
  };

  const updateClubSubPaymentStatus = async (id: string, paymentStatus: 'unpaid' | 'paid') => {
    try {
      const sub = clubSubscriptions.find(s => s.id === id);
      const updateData: any = { paymentStatus };
      if (paymentStatus === 'paid' && sub) {
        updateData.collectedAmount = sub.totalPrice;
      } else if (paymentStatus === 'unpaid') {
        updateData.collectedAmount = 0;
      }
      await updateDoc(doc(db, 'clubSubscriptions', id), updateData);
      toast.success(paymentStatus === 'paid' ? 'تم تحصيل المبلغ بنجاح' : 'تم إلغاء التحصيل');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clubSubscriptions/${id}`);
    }
  };

  const deleteClubSubscription = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return;
    try {
      await deleteDoc(doc(db, 'clubSubscriptions', id));
      toast.success('تم حذف الاشتراك بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clubSubscriptions/${id}`);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 800000) {
      toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setAppLogo(base64String);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!user) {
      setWaterStock(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'inventory', 'water'), (docSnap) => {
      if (docSnap.exists()) {
        setWaterStock(docSnap.data().currentStock);
      } else {
        setWaterStock(0);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory/water');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setInventory([]);
      return;
    }

    const q = query(collection(db, 'inventory'), orderBy('itemName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setInventoryLogs([]);
      return;
    }

    const q = query(collection(db, 'inventoryLogs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryLog[];
      setInventoryLogs(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventoryLogs');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setClubSubscriptions([]);
      return;
    }

    const q = query(collection(db, 'clubSubscriptions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClubSubscription[];
      setClubSubscriptions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clubSubscriptions');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    return () => unsubscribe();
  }, [user]);

  // Sync serviceFilter with activeTab
  useEffect(() => {
    if (activeTab === 'تنظيف سيارات') {
      setServiceFilter('cars');
    } else if (BUILDINGS.includes(activeTab)) {
      setServiceFilter('apartments');
    } else if (activeTab === 'dashboard' || activeTab === 'daily-tasks' || activeTab === 'تكرار الطلبات') {
      // Keep current serviceFilter or reset to all if it was specific to a tab we just left
      // For now, let's reset to 'all' when entering general views to start fresh
      setServiceFilter('all');
    }
  }, [activeTab]);

  // Test Firestore connection on boot
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          toast.error("يرجى التحقق من إعدادات الاتصال بقاعدة البيانات. يبدو أنك غير متصل.");
        }
      }
    };
    testConnection();
  }, []);

  // Sync user profile to Firestore
  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDocFromServer(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || 'Fyozr@system.local',
            displayName: user.displayName || 'Fyozr',
            photoURL: user.photoURL || '',
            role: (user.email === '11aabbcc54@gmail.com' || user.isAnonymous || user.uid === 'fyozr-admin-user') ? 'admin' : 'user',
            createdAt: Timestamp.now()
          });
        }
      } catch (error) {
        console.error("Error syncing profile:", error);
      }
    };
    syncProfile();
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    onAfterPrint: () => setSelectedRequest(null),
  });

  const handlePrintStatement = useReactToPrint({
    contentRef: statementRef,
    onAfterPrint: () => {
      setIsPrintingStatement(false);
      setFilteredStatementRequests([]);
    },
  });

  const handlePrintReport = useReactToPrint({
    contentRef: reportRef,
    onAfterPrint: () => setIsPrintingReport(false),
  });

  const handlePrintInventory = useReactToPrint({
    contentRef: inventoryReportRef,
    onAfterPrint: () => setIsPrintingInventory(false),
  });

  const handlePrintStaff = useReactToPrint({
    contentRef: staffReportRef,
    onAfterPrint: () => setIsPrintingStaff(false),
  });

  const handlePrintBulk = useReactToPrint({
    contentRef: bulkInvoicesRef,
    onAfterPrint: () => {
      setIsPrintingBulk(false);
      setBulkPrintRequests([]);
    },
  });

  useEffect(() => {
    if (selectedRequest) {
      // Small delay to ensure the Invoice component is rendered and QR code is generated
      const timer = setTimeout(() => {
        if (invoiceRef.current) {
          handlePrint();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedRequest, handlePrint]);

  useEffect(() => {
    if (isPrintingStatement) {
      const timer = setTimeout(() => {
        if (statementRef.current) {
          handlePrintStatement();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintingStatement, handlePrintStatement]);

  useEffect(() => {
    if (isPrintingReport) {
      const timer = setTimeout(() => {
        if (reportRef.current) {
          handlePrintReport();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintingReport, handlePrintReport]);

  useEffect(() => {
    if (isPrintingInventory) {
      const timer = setTimeout(() => {
        if (inventoryReportRef.current) {
          handlePrintInventory();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintingInventory, handlePrintInventory]);

  useEffect(() => {
    if (isPrintingStaff) {
      const timer = setTimeout(() => {
        if (staffReportRef.current) {
          handlePrintStaff();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintingStaff, handlePrintStaff]);

  useEffect(() => {
    if (isPrintingBulk) {
      const timer = setTimeout(() => {
        if (bulkInvoicesRef.current) {
          handlePrintBulk();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintingBulk, handlePrintBulk]);

  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedMonth));
    const end = endOfWeek(endOfMonth(selectedMonth));
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const fullUser = { ...u, ...userData, id: userSnap.id };
            setUser(fullUser as any);
          } else {
            setUser(u);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(u);
        }
      } else {
        const customUser = localStorage.getItem('fyozr_user');
        if (customUser) {
          try {
            setUser(JSON.parse(customUser));
          } catch (e) {
            setUser(null);
            localStorage.removeItem('fyozr_user');
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }

    const q = query(collection(db, 'requests'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CleaningRequest[];
      setRequests(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'requests');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  const toggleUserBlock = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !currentStatus });
      toast.success(!currentStatus ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'approved' });
      toast.success('تم تفعيل الحساب بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('تم تحديث صلاحيات المستخدم');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const toggleUserPermission = async (userId: string, permissionId: string, currentPermissions: any) => {
    try {
      const perms = Array.isArray(currentPermissions) ? currentPermissions : [];
      let newPermissions = [...perms];
      if (newPermissions.includes(permissionId)) {
        newPermissions = newPermissions.filter(p => p !== permissionId);
      } else {
        newPermissions.push(permissionId);
      }
      await updateDoc(doc(db, 'users', userId), { permissions: newPermissions });
      toast.success('تم تحديث صلاحيات الوصول');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const addWorker = async () => {
    if (!workerForm.name || !workerForm.phone) {
      toast.error('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    setIsAddingWorker(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', workerForm.phone));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast.error('رقم الجوال مسجل مسبقاً');
        setIsAddingWorker(false);
        return;
      }

      await addDoc(usersRef, {
        uid: 'worker-' + Date.now(),
        username: workerForm.phone,
        password: workerForm.phone, // Default password is phone number
        displayName: workerForm.name,
        email: `${workerForm.phone}@worker.local`,
        role: 'user',
        permissions: ['staff'],
        createdAt: Timestamp.now()
      });

      setWorkerForm({ name: '', phone: '' });
      toast.success('تم إضافة العامل بنجاح. يمكنه الدخول باستخدام رقم جواله كاسم مستخدم وكلمة مرور');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إضافة العامل');
    } finally {
      setIsAddingWorker(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('تم حذف المستخدم بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حذف المستخدم');
    }
  };

  const initializePropertyData = async () => {
    try {
      const aptsRef = collection(db, 'apartments');
      const tenantsRef = collection(db, 'tenants');
      
      const aptsSnap = await getDocs(aptsRef);
      if (!aptsSnap.empty) {
        toast.info('بيانات العقارات موجودة مسبقاً');
        return;
      }

      toast.loading('جاري تهيئة بيانات العقارات...');

      for (const b of PROPERTY_BUILDINGS) {
        for (const num of b.apartments) {
          const aptId = `${b.id}-${num}`;
          const isTwoBedroom = parseInt(num) % 4 === 0 || parseInt(num) % 7 === 0;
          
          await setDoc(doc(db, 'apartments', aptId), {
            buildingId: b.id,
            buildingName: b.name,
            number: num,
            status: 'vacant',
            roomType: isTwoBedroom ? 'غرفتين و صالة' : 'غرفة و صالة'
          });
        }
      }
      toast.success('تمت تهيئة بيانات العقارات بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تهيئة البيانات');
    }
  };

  const getExpiringContracts = (days: number) => {
    const now = startOfDay(new Date());
    const limitDate = addDays(now, days);
    return tenants.filter(t => {
      const end = safeToDate(t.endDate);
      // Include already expired AND those expiring within the next 'days' days
      return end <= limitDate;
    }).sort((a, b) => safeToDate(a.endDate).getTime() - safeToDate(b.endDate).getTime());
  };

  const deleteTenant = async (tenantId: string) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (tenant) {
        await updateDoc(doc(db, 'apartments', tenant.apartmentId), { status: 'vacant', tenantId: null });
      }
      await deleteDoc(doc(db, 'tenants', tenantId));
      toast.success('تم حذف العقد بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantId}`);
    }
  };

  const addRentPayment = async (tenantId: string, amount: number, dueDate: Date, notes: string = '') => {
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'rentPayments'), {
        amount,
        dueDate: Timestamp.fromDate(dueDate),
        status: 'pending',
        notes,
        createdAt: Timestamp.now()
      });
      toast.success('تم إضافة موعد الدفع بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/rentPayments`);
    }
  };

  const updateRentPaymentStatus = async (tenantId: string, paymentId: string, newStatus: 'paid' | 'pending' | 'overdue' | 'cancelled') => {
    try {
      const paymentRef = doc(db, 'tenants', tenantId, 'rentPayments', paymentId);
      const updateData: any = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paymentDate = Timestamp.now();
      } else {
        updateData.paymentDate = deleteField();
      }
      await updateDoc(paymentRef, updateData);
      
      const paymentsQuery = await getDocs(collection(db, 'tenants', tenantId, 'rentPayments'));
      const totalCollected = paymentsQuery.docs.reduce((sum, doc) => {
        const data = doc.data();
        return data.status === 'paid' ? sum + (data.amount || 0) : sum;
      }, 0);

      await updateDoc(doc(db, 'tenants', tenantId), { collectedAmount: totalCollected });
      toast.success('تم تحديث حالة الدفع');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tenants/${tenantId}/rentPayments/${paymentId}`);
    }
  };

  const deleteRentPayment = async (tenantId: string, paymentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'rentPayments', paymentId));
      const paymentsQuery = await getDocs(collection(db, 'tenants', tenantId, 'rentPayments'));
      const totalCollected = paymentsQuery.docs.reduce((sum, doc) => {
        const data = doc.data();
        return data.status === 'paid' ? sum + (data.amount || 0) : sum;
      }, 0);
      await updateDoc(doc(db, 'tenants', tenantId), { collectedAmount: totalCollected });
      toast.success('تم حذف السجل');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantId}/rentPayments/${paymentId}`);
    }
  };

  const generatePaymentSchedule = async (tenant: Tenant) => {
    if (!confirm('سيقوم هذا بإنشاء جدول دفعات بناءً على قيمة العقد. هل تريد المتابعة؟')) return;
    try {
      const { contractValue, paymentFrequency, startDate } = tenant;
      let monthInterval = 1;
      if (paymentFrequency === 'quarterly') monthInterval = 3;
      if (paymentFrequency === 'yearly') monthInterval = 12;
      const numPayments = Math.ceil(12 / monthInterval); 
      const perPaymentAmount = contractValue / numPayments;
      const baseDate = safeToDate(startDate);
      for (let i = 0; i < numPayments; i++) {
        const dueDate = addMonths(baseDate, i * monthInterval);
        await addDoc(collection(db, 'tenants', tenant.id, 'rentPayments'), {
          amount: perPaymentAmount,
          dueDate: Timestamp.fromDate(dueDate),
          status: 'pending',
          createdAt: Timestamp.now()
        });
      }
      toast.success('تم توليد جدول الدفعات بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء توليد الجدول');
    }
  };

  const moveTenantToApartment = async (tenant: Tenant, newApartmentId: string) => {
    try {
      const oldApartmentId = tenant.apartmentId;
      
      // Update Tenant
      await updateDoc(doc(db, 'tenants', tenant.id), { apartmentId: newApartmentId });
      
      // Update Old Apartment
      if (oldApartmentId) {
        await updateDoc(doc(db, 'apartments', oldApartmentId), { 
          status: 'vacant',
          tenantId: deleteField()
        });
      }
      
      // Update New Apartment
      await updateDoc(doc(db, 'apartments', newApartmentId), { 
        status: 'occupied',
        tenantId: tenant.id
      });

      toast.success('تم نقل المستأجر بنجاح');
      setIsMoveModalOpen(false);
      setMovingTenant(null);
    } catch (error) {
       console.error(error);
       toast.error('حدث خطأ أثناء نقل المستأجر');
    }
  };

  const saveTenant = async (data: Partial<Tenant>) => {
    try {
      if (editingTenant) {
        await updateDoc(doc(db, 'tenants', editingTenant.id), data);
        toast.success('تم تحديث بيانات العقد');
      } else {
        const docRef = await addDoc(collection(db, 'tenants'), data);
        // Update apartment status
        if (data.apartmentId) {
          await updateDoc(doc(db, 'apartments', data.apartmentId), { 
            status: 'occupied', 
            tenantId: docRef.id 
          });
        }
        toast.success('تم إضافة العقد بنجاح');
      }
      setIsTenantModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tenants');
    }
  };

  const handleImportTenants = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataBuffer = event.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        toast.loading('جاري استيراد البيانات...');

        let importedCount = 0;
        let errorCount = 0;

        for (const row of data) {
          try {
            const name = row['المستأجر'] || row['الاسم'] || row['Name'] || row['Full Name'];
            const nationality = row['الجنسية'] || row['Nationality'] || '';
            const phone = String(row['الجوال'] || row['الهاتف'] || row['Phone'] || '');
            const company = row['الشركة'] || row['Company'] || '';
            const idNumber = String(row['رقم الهوية'] || row['ID Number'] || row['ID'] || '');
            const aptNumber = String(row['الشقة'] || row['رقم الشقة'] || row['Apartment Number'] || row['Unit Number'] || '');
            const buildingName = row['المبنى'] || row['اسم المبنى'] || row['Building Name'] || '';
            const contractValue = Number(row['قيمة العقد'] || row['Contract Value'] || row['Amount'] || 0);
            const collectedAmount = Number(row['المبلغ المحصل'] || row['Collected Amount'] || 0);
            const status = row['الحالة'] === 'مؤرشف' ? 'archived' : 'active';
            const startDateStr = row['بداية العقد'] || row['Start Date'];
            const endDateStr = row['نهاية العقد'] || row['End Date'];
            const paymentFrequency = row['تكرار الدفع'] || row['Payment Frequency'] || 'monthly';
            const paymentMethod = row['طريقة الدفع'] || row['Payment Method'] || 'cash';

            if (!name || !aptNumber || !buildingName) {
              console.warn('Skipping row due to missing required fields:', row);
              continue;
            }

            // Map payment frequency to standardized values
            let freq = paymentFrequency.toString().toLowerCase();
            if (freq.includes('شهر') || freq === 'monthly') freq = 'monthly';
            else if (freq.includes('سنة') || freq === 'yearly' || freq === 'annual') freq = 'yearly';
            else if (freq.includes('ربع') || freq === 'quarterly') freq = 'quarterly';
            else if (freq.includes('نصف') || freq === 'half-yearly') freq = 'semi-annual';
            else freq = 'monthly';

            // Find matching apartment with normalized comparison
            const normalize = (s: any) => {
              if (s === undefined || s === null) return "";
              return String(s)
                .replace(/[\u0660-\u0669]/g, d => (d.charCodeAt(0) - 0x0660).toString()) // Arabic-Indic digits
                .replace(/[\u06F0-\u06F9]/g, d => (d.charCodeAt(0) - 0x06F0).toString()) // Eastern Arabic-Indic digits
                .replace(/[يى]/g, 'ى')
                .replace(/[أإآا]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/\s+/g, "")
                .trim()
                .toLowerCase();
            };

            const searchAptNum = normalize(aptNumber);
            const searchBuildingName = normalize(buildingName);

            let apt = apartments.find(a => {
              const dbAptNum = normalize(a.number);
              const dbBuildingName = normalize(a.buildingName);
              
              return dbAptNum === searchAptNum && 
                (dbBuildingName === searchBuildingName || 
                 dbBuildingName.includes(searchBuildingName) || 
                 searchBuildingName.includes(dbBuildingName));
            });

            // Fallback: If not found in current state, try to find in constant and create if valid
            if (!apt) {
              const buildingConst = PROPERTY_BUILDINGS.find(b => {
                const constName = normalize(b.name);
                const constId = normalize(b.id);
                return constName === searchBuildingName || 
                       searchBuildingName.includes(constName) || 
                       constName.includes(searchBuildingName) ||
                       searchBuildingName === constId;
              });

              if (buildingConst && buildingConst.apartments.includes(searchAptNum)) {
                const aptId = `${buildingConst.id}-${searchAptNum}`;
                const isTwoBedroom = ['105', '106', '110', '115', '116', '120', '125', '126', '129', '134', '135', '206', '210', '211', '221', '226', '227', '314', '315', '321', '325', '326', '327', '406', '410', '415', '416', '425', '426', '427', '501', '505', '511', '515', '521', '522'].includes(searchAptNum);
                
                const newApt = {
                  buildingId: buildingConst.id,
                  buildingName: buildingConst.name,
                  number: searchAptNum,
                  status: 'vacant',
                  roomType: isTwoBedroom ? 'غرفتين و صالة' : 'غرفة و صالة'
                };
                
                await setDoc(doc(db, 'apartments', aptId), newApt);
                apt = { id: aptId, ...newApt };
              }
            }

            if (!apt) {
              if (apartments.length === 0) {
                console.error("لا يوجد وحدات في النظام. يرجى تهيئة بيانات العقارات أولاً.");
                toast.error("يرجى تهيئة بيانات العقارات من قسم إدارة الوحدات قبل الاستيراد");
                errorCount = data.length;
                break;
              }
              console.error(`الشقة رقم ${aptNumber} في ${buildingName} غير موجودة`);
              errorCount++;
              continue;
            }

            const parseDate = (dateVal: any) => {
              if (!dateVal) return Timestamp.now();
              
              // Handle Excel serial dates
              if (typeof dateVal === 'number') {
                const date = new Date((dateVal - 25569) * 86400 * 1000);
                return Timestamp.fromDate(date);
              }
              
              // Handle string dates
              const date = new Date(dateVal);
              if (!isNaN(date.getTime())) {
                return Timestamp.fromDate(date);
              }

              // Try parsing common formats like DD/MM/YYYY
              if (typeof dateVal === 'string' && dateVal.includes('/')) {
                const parts = dateVal.split('/');
                if (parts.length === 3) {
                  const d = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  const y = parseInt(parts[2], 10);
                  const parsed = new Date(y, m, d);
                  if (!isNaN(parsed.getTime())) return Timestamp.fromDate(parsed);
                }
              }

              return Timestamp.now();
            };

            const startDate = parseDate(startDateStr);
            const endDate = parseDate(endDateStr);

            const tenantData: Omit<Tenant, 'id'> = {
              name,
              nationality,
              phone,
              company,
              idNumber,
              contractValue,
              collectedAmount,
              status,
              paymentFrequency: freq,
              paymentMethod,
              startDate,
              endDate,
              nextPaymentDate: startDate,
              apartmentId: apt.id
            };

            const tenantRef = await addDoc(collection(db, 'tenants'), tenantData);
            await updateDoc(doc(db, 'apartments', apt.id), {
              status: 'occupied',
              tenantId: tenantRef.id
            });

            importedCount++;
          } catch (err) {
            console.error('Error importing row:', row, err);
            errorCount++;
          }
        }

        toast.dismiss();
        if (importedCount > 0) {
          toast.success(`تم استيراد ${importedCount} مستأجر بنجاح`);
        } else if (errorCount === 0) {
          toast.info('لم يتم العثور على بيانات صالحة للاستيراد');
        }
        
        if (errorCount > 0) {
          toast.error(`فشل استيراد ${errorCount} سجل. تأكد من مطابقة أرقام الشقق والمباني.`);
        }
      } catch (error) {
        console.error(error);
        toast.dismiss();
        toast.error('حدث خطأ أثناء معالجة الملف. تأكد من صيغة الملف الصحيحة.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportApartments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataBuffer = event.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        toast.loading('جاري استيراد الوحدات...');

        let importedCount = 0;

        for (const row of data) {
          try {
            const number = String(row['رقم الشقة'] || row['Number'] || '');
            const buildingName = row['اسم المبنى'] || row['Building Name'] || '';
            const buildingId = row['معرف المبنى'] || row['Building ID'] || 'b1';
            const roomType = row['نوع الغرفة'] || row['Room Type'] || 'غرفة و صالة';
            const status = 'vacant';

            if (!number || !buildingName) continue;

            const aptId = `${buildingId}-${number}`;
            await setDoc(doc(db, 'apartments', aptId), {
              buildingId,
              buildingName,
              number,
              status,
              roomType
            });

            importedCount++;
          } catch (err) {
            console.error('Error importing apartment:', row, err);
          }
        }

        toast.dismiss();
        toast.success(`تم استيراد ${importedCount} وحدة بنجاح`);
      } catch (error) {
        console.error(error);
        toast.dismiss();
        toast.error('حدث خطأ أثناء استيراد الوحدات');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const downloadApartmentTemplate = () => {
    const template = [
      {
        'رقم الشقة': '101',
        'اسم المبنى': 'مبنى ١',
        'معرف المبنى': 'b1',
        'نوع الغرفة': 'غرفة و صالة'
      },
      {
        'رقم الشقة': '102',
        'اسم المبنى': 'مبنى ١',
        'معرف المبنى': 'b1',
        'نوع الغرفة': 'غرفتين و صالة'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Units Template");
    XLSX.writeFile(wb, "apartments_template.xlsx");
  };

  const downloadTenantTemplate = () => {
    const template = [
      {
        'الاسم': 'مثال: محمد احمد',
        'الجنسية': 'سعودي',
        'الهاتف': '0500000000',
        'الشركة': 'شركة مثال',
        'رقم الهوية': '1234567890',
        'رقم الشقة': '101',
        'اسم المبنى': 'مبنى ١',
        'قيمة العقد': 25000,
        'بداية العقد': '2024-01-01',
        'نهاية العقد': '2024-12-31',
        'تكرار الدفع': 'monthly',
        'طريقة الدفع': 'cash'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "tenants_template.xlsx");
  };

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoggingIn) return;
    
    const username = loginForm.username.trim().toLowerCase();
    const password = loginMethod === 'phone' ? loginForm.username.trim() : loginForm.password;

    if (!username || !password) {
      toast.error(loginMethod === 'phone' ? 'يرجى إدخال رقم الجوال' : 'يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    if (isRegisterMode && !loginForm.displayName) {
      toast.error('يرجى إدخال الاسم الكامل');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      const usersRef = collection(db, 'users');
      
      if (isRegisterMode) {
        // Registration Logic
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          toast.error('اسم المستخدم موجود مسبقاً');
          setIsLoggingIn(false);
          return;
        }

        const newUser = {
          uid: 'user-' + Date.now(),
          username: username,
          password: password, // In a real app, hash this
          displayName: loginForm.displayName,
          email: `${username}@fyozr.local`,
          role: 'user', // Changed from admin to user by default
          status: 'pending', // New accounts are pending by default
          createdAt: Timestamp.now()
        };

        await addDoc(usersRef, newUser);
        setUser(newUser as any);
        setLoading(false);
        toast.success('تم إنشاء الحساب بنجاح. يرجى انتظار موافقة المسؤول لتفعيل الحساب.');
      } else {
        // Login Logic
        // Fallback for hardcoded admin
        if (username === 'fyozr' && password === '5150') {
          const mockUser = {
            uid: 'fyozr-admin-user',
            email: 'Fyozr@system.local',
            displayName: 'Fyozr',
            isAnonymous: false,
            emailVerified: true,
            role: 'admin'
          } as any;
          setUser(mockUser);
          localStorage.setItem('fyozr_user', JSON.stringify(mockUser));
          setLoading(false);
          toast.success('تم تسجيل الدخول بنجاح');
          return;
        }

        const q = query(usersRef, 
          where('username', '==', username),
          where('password', '==', password)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast.error(loginMethod === 'phone' ? 'رقم الجوال غير مسجل أو غير صحيح' : 'اسم المستخدم أو كلمة المرور غير صحيحة');
          setIsLoggingIn(false);
          return;
        }

        const userData = querySnapshot.docs[0].data();
        const fullUser = {
          ...userData,
          id: querySnapshot.docs[0].id
        };
        
        if (userData.isBlocked) {
          toast.error('هذا الحساب محظور من دخول الموقع. يرجى التواصل مع الإدارة.');
          setIsLoggingIn(false);
          return;
        }

        if (userData.status === 'pending' && userData.role !== 'admin' && username !== 'fyozr') {
          toast.error('حسابك قيد المراجعة. يرجى انتظار موافقة المسؤول.');
          setIsLoggingIn(false);
          return;
        }

        setUser(fullUser as any);
        localStorage.setItem('fyozr_user', JSON.stringify(fullUser));
        setLoading(false);
        toast.success('تم تسجيل الدخول بنجاح');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('حدث خطأ أثناء العملية: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
    localStorage.removeItem('fyozr_user');
  };

  const logInventoryChange = async (
    itemId: string,
    itemName: string,
    previousStock: number,
    newStock: number,
    changeType: 'manual' | 'order' | 'restock' | 'delete',
    notes?: string
  ) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'inventoryLogs'), {
        itemId,
        itemName,
        previousStock,
        newStock,
        changeAmount: newStock - previousStock,
        changeType,
        performedBy: user.displayName || 'Fyozr',
        performedByEmail: user.email || 'Fyozr@system.local',
        timestamp: Timestamp.now(),
        notes: notes || ''
      });
    } catch (error) {
      console.error('Error logging inventory change:', error);
    }
  };

  const saveRequest = async (data: any) => {
    if (!user) return;
    
    // If editing, show confirmation first
    if (data.id && !confirmSaveData) {
      setConfirmSaveData(data);
      return;
    }

    try {
      const { id, dates, ...rest } = data;
      if (id) {
        const requestRef = doc(db, 'requests', id);
        const requestSnap = await getDoc(requestRef);
        const oldData = requestSnap.data() as CleaningRequest;

        // Handle stock change on edit for water delivery
        if (data.serviceType === 'توصيل مياه' && oldData.serviceType === 'توصيل مياه') {
          const diff = (data.waterGallons || 0) - (oldData.waterGallons || 0);
          if (diff !== 0) {
            const inventoryRef = doc(db, 'inventory', 'water');
            const inventorySnap = await getDoc(inventoryRef);
            if (inventorySnap.exists()) {
              const currentStock = inventorySnap.data().currentStock || 0;
              const newStock = Math.max(0, currentStock - diff);
              await updateDoc(inventoryRef, { 
                currentStock: newStock,
                lastUpdated: Timestamp.now()
              });
              await logInventoryChange(
                'water',
                'مياه',
                currentStock,
                newStock,
                'order',
                `تعديل طلب مياه لشقة ${data.apartmentNumber}`
              );
            }
          }
        }

        await updateDoc(requestRef, { ...rest, date: dates[0], status: data.status });
        toast.success('تم تحديث الطلب بنجاح');
      } else {
        // Subtract stock for new water delivery requests
        if (rest.serviceType === 'توصيل مياه') {
          const totalGallons = dates.length * (rest.waterGallons || 0);
          const inventoryRef = doc(db, 'inventory', 'water');
          const inventorySnap = await getDoc(inventoryRef);
          
          if (inventorySnap.exists()) {
            const currentStock = inventorySnap.data().currentStock || 0;
            const newStock = Math.max(0, currentStock - totalGallons);
            await updateDoc(inventoryRef, { 
              currentStock: newStock,
              lastUpdated: Timestamp.now()
            });
            await logInventoryChange(
              'water',
              'مياه',
              currentStock,
              newStock,
              'order',
              `طلب مياه جديد لشقة ${rest.apartmentNumber}`
            );
          } else {
            await setDoc(inventoryRef, {
              itemName: 'water',
              currentStock: 0,
              reorderPoint: 10,
              category: 'مياه',
              unit: 'جالون',
              lastUpdated: Timestamp.now()
            });
          }
        }

        const promises = dates.map((date: Timestamp) => 
          addDoc(collection(db, 'requests'), {
            ...rest,
            date,
            userId: user.uid,
            createdAt: rest.createdAt || Timestamp.now(),
            status: rest.status || 'pending',
            paymentStatus: 'unpaid'
          })
        );
        await Promise.all(promises);
        toast.success(dates.length > 1 ? `تم إضافة ${dates.length} طلبات بنجاح` : 'تم إضافة الطلب بنجاح');
      }
      setEditingRequest(null);
      setConfirmSaveData(null);
    } catch (error) {
      handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, 'requests');
    }
  };

  const saveInventoryItem = async (data: any) => {
    if (!user || !isAdmin) return;
    
    try {
      const { id, ...rest } = data;
      if (id) {
        const itemRef = doc(db, 'inventory', id);
        const itemSnap = await getDoc(itemRef);
        const previousStock = itemSnap.exists() ? itemSnap.data().currentStock : 0;
        
        await setDoc(itemRef, {
          ...rest,
          lastUpdated: Timestamp.now()
        }, { merge: true });
        
        if (previousStock !== rest.currentStock) {
          await logInventoryChange(
            id,
            rest.itemName,
            previousStock,
            rest.currentStock,
            rest.currentStock > previousStock ? 'restock' : 'manual',
            `تحديث يدوي للمخزون`
          );
        }
        toast.success('تم تحديث الصنف بنجاح');
      } else {
        const docRef = await addDoc(collection(db, 'inventory'), {
          ...rest,
          lastUpdated: Timestamp.now()
        });
        await logInventoryChange(
          docRef.id,
          rest.itemName,
          0,
          rest.currentStock,
          'restock',
          'إضافة صنف جديد للمخزون'
        );
        toast.success('تم إضافة الصنف بنجاح');
      }
      setIsInventoryModalOpen(false);
      setEditingInventoryItem(null);
    } catch (error) {
      handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, 'inventory');
    }
  };

  const updateStatus = async (id: string, field: 'status' | 'paymentStatus' | 'price', value: string | number) => {
    try {
      const requestRef = doc(db, 'requests', id);
      await updateDoc(requestRef, { [field]: value });
      if (field !== 'price') {
        toast.success('تم تحديث الحالة بنجاح');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
  };

  const deleteInventoryLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventoryLogs', id));
      toast.success('تم حذف السجل بنجاح');
      setConfirmDeleteLogId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventoryLogs/${id}`);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const requestRef = doc(db, 'requests', id);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        const data = requestSnap.data() as CleaningRequest;
        // Restore stock if deleting a water delivery request
        if (data.serviceType === 'توصيل مياه') {
          const gallons = data.waterGallons || 0;
          const inventoryRef = doc(db, 'inventory', 'water');
          const inventorySnap = await getDoc(inventoryRef);
          
          if (inventorySnap.exists()) {
            const currentStock = inventorySnap.data().currentStock || 0;
            const newStock = currentStock + gallons;
            await updateDoc(inventoryRef, { 
              currentStock: newStock,
              lastUpdated: Timestamp.now()
            });
            await logInventoryChange(
              'water',
              'مياه',
              currentStock,
              newStock,
              'delete',
              `حذف طلب مياه لشقة ${data.apartmentNumber}`
            );
          }
        }
      }

      await deleteDoc(requestRef);
      toast.success('تم حذف الطلب بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
    }
  };

  // Sync selectedMonth with globalSelectedDate
  React.useEffect(() => {
    if (!isSameMonth(globalSelectedDate, selectedMonth)) {
      setSelectedMonth(startOfMonth(globalSelectedDate));
    }
  }, [globalSelectedDate]);

  const handleReceiptUpload = async (id: string, file: File) => {
    if (file.size > 800000) { // ~800KB limit for base64 in Firestore
      toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, 'requests', id), { receiptUrl: base64String });
        toast.success('تم إرفاق الإيصال بنجاح');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async (id: string, file: File, type: 'before' | 'after') => {
    if (file.size > 800000) { // ~800KB limit for base64 in Firestore
      toast.error('حجم الملف كبير جداً. يرجى اختيار صورة أصغر من 800 كيلوبايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const field = type === 'before' ? 'beforePhotoUrl' : 'afterPhotoUrl';
        await updateDoc(doc(db, 'requests', id), { [field]: base64String });
        toast.success(type === 'before' ? 'تم إرفاق صورة قبل بنجاح' : 'تم إرفاق صورة بعد بنجاح');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShareAsImage = async () => {
    if (!scheduleRef.current) return;
    
    const toastId = toast.loading('جاري تحويل الجدول إلى صورة...');
    
    try {
      // Wait for any animations or images to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(scheduleRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          padding: '40px',
          borderRadius: '0',
        }
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `schedule-${format(new Date(), 'yyyy-MM-dd')}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'جدول غسيل السيارات',
          text: `جدول غسيل السيارات لليوم ${format(new Date(), 'EEEE', { locale: ar })} - ${format(new Date(), 'yyyy/MM/dd')}`,
        });
        toast.success('تمت المشاركة بنجاح', { id: toastId });
      } else {
        const link = document.createElement('a');
        link.download = `schedule-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('تم تحميل الجدول كصورة، يمكنك الآن مشاركتها عبر واتساب', { id: toastId });
      }
    } catch (error) {
      console.error('Error sharing as image:', error);
      toast.error('حدث خطأ أثناء محاولة مشاركة الجدول كصورة', { id: toastId });
    }
  };

  const shareSite = () => {
    if (navigator.share) {
      navigator.share({
        title: appName,
        text: 'تابع طلبات النظافة لمبانينا!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ الرابط!');
    }
  };

  const filteredRequests = requests.filter(req => {
    const reqDate = safeToDate(req.date);
    
    const isUpcoming = isWithinInterval(reqDate, {
      start: startOfDay(new Date()),
      end: endOfDay(addDays(new Date(), 7))
    });
    
    const matchesMonth = (activeTab === 'dashboard' || activeTab === 'daily-tasks') 
      ? (isUpcoming || isSameMonth(reqDate, selectedMonth))
      : isSameMonth(reqDate, selectedMonth);
      
    const matchesSearch = (req.apartmentNumber || '').includes(searchTerm) || (req.buildingName || '').includes(searchTerm);
    const matchesPayment = paymentFilter === 'all' || req.paymentStatus === paymentFilter;
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesService = serviceFilter === 'all' || 
      activeTab === 'تنظيف سيارات' || 
      activeTab === 'طلبات الماء' ||
      (serviceFilter === 'cars' ? req.serviceType === 'تنظيف سيارات' : req.serviceType !== 'تنظيف سيارات');
    
    let matchesTab = activeTab === 'dashboard' || activeTab === 'daily-tasks';
    if (activeTab === 'تكرار الطلبات') {
      matchesTab = req.isRecurring === true;
    } else if (activeTab === 'تنظيف سيارات') {
      matchesTab = req.serviceType === 'تنظيف سيارات';
    } else if (activeTab === 'طلبات الماء') {
      matchesTab = req.serviceType === 'توصيل مياه';
    } else if (BUILDINGS.includes(activeTab)) {
      matchesTab = req.buildingName === activeTab;
    }

    return matchesMonth && matchesSearch && matchesTab && matchesPayment && matchesService && matchesStatus;
  }).sort((a, b) => safeToDate(b.date).getTime() - safeToDate(a.date).getTime());

  const [selectedHistoryGroup, setSelectedHistoryGroup] = useState<CleaningRequest[] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const groupedRequests = React.useMemo(() => {
    const groups: Record<string, CleaningRequest[]> = {};
    filteredRequests.forEach(req => {
      const key = `${req.buildingName}-${req.apartmentNumber}-${req.serviceType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(req);
    });
    return groups;
  }, [filteredRequests]);

  const stats = {
    total: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth)).length + 
           clubSubscriptions.filter(s => isSameMonth(safeToDate(s.createdAt), selectedMonth)).length,
    paid: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'paid').reduce((s, r) => s + r.price, 0) +
          clubSubscriptions.filter(s => isSameMonth(safeToDate(s.createdAt), selectedMonth) && s.paymentStatus === 'paid').reduce((sum, s) => sum + s.totalPrice, 0),
    totalMonthly: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth)).length +
                  clubSubscriptions.filter(s => isSameMonth(safeToDate(s.createdAt), selectedMonth)).length,
    unpaid: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid').reduce((s, r) => s + r.price, 0) +
            clubSubscriptions.filter(s => isSameMonth(safeToDate(s.createdAt), selectedMonth) && s.paymentStatus === 'unpaid').reduce((sum, s) => sum + s.totalPrice, 0),
    unpaidCount: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid').length +
                 clubSubscriptions.filter(s => isSameMonth(safeToDate(s.createdAt), selectedMonth) && s.paymentStatus === 'unpaid').length,
    unpaidApartments: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid' && r.serviceType !== 'تنظيف سيارات').length,
    unpaidCars: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid' && r.serviceType === 'تنظيف سيارات').length,
    completed: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.status === 'completed').length,
    paidCount: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'paid').length +
               clubSubscriptions.filter(s => isSameMonth(safeToDate(s.createdAt), selectedMonth) && s.paymentStatus === 'paid').length,
    pending: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.status === 'pending').length,
    recurring: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.isRecurring).length,
  };

  const dailyTasks = React.useMemo(() => {
    const days = eachDayOfInterval({
      start: globalSelectedDate,
      end: addDays(globalSelectedDate, 7)
    });
    
    return days.map(day => ({
      date: day,
      requests: requests.filter(req => isSameDay(safeToDate(req.date), day))
    }));
  }, [requests, globalSelectedDate]);

  const apartmentSummary = React.useMemo(() => {
    const summary: Record<string, { count: number, total: number, paid: number, unpaid: number, completed: number, pending: number, building: string, apartment: string }> = {};
    filteredRequests.forEach(req => {
      const key = `${req.buildingName}-${req.apartmentNumber}`;
      if (!summary[key]) {
        summary[key] = { count: 0, total: 0, paid: 0, unpaid: 0, completed: 0, pending: 0, building: req.buildingName, apartment: req.apartmentNumber };
      }
      summary[key].count += 1;
      summary[key].total += req.price;
      if (req.paymentStatus === 'paid') {
        summary[key].paid += req.price;
      } else {
        summary[key].unpaid += req.price;
      }
      if (req.status === 'completed') {
        summary[key].completed += 1;
      } else {
        summary[key].pending += 1;
      }
    });
    return Object.values(summary).sort((a, b) => b.unpaid - a.unpaid);
  }, [filteredRequests]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
  }, [themeColor]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'book') {
      setIsPublicBookingView(true);
    }
  }, []);

  if (isPublicBookingView) {
    return <PublicBookingForm appName={appName} logo={appLogo} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-white/10 dark:border-slate-800"
        >
          <div className="mb-6">
            {appLogo ? (
              <img 
                src={appLogo} 
                alt={appName} 
                className="w-24 h-24 object-contain mx-auto rounded-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-primary/10 p-5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto border border-primary/30">
                <Building2 className="text-primary w-10 h-10" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{appName}</h1>
          <p className="text-gray-500 dark:text-slate-400 mb-8 text-sm">إدارة ذكية لطلبات النظافة في مجمعاتنا السكنية</p>
          
          <div className="flex items-center justify-center gap-2 mb-8 bg-gray-50 dark:bg-slate-800/50 p-1 rounded-2xl border dark:border-slate-800">
            <button 
              onClick={() => setLoginMethod('username')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black transition-all",
                loginMethod === 'username' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              )}
            >
              اسم المستخدم
            </button>
            <button 
              onClick={() => setLoginMethod('phone')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-black transition-all",
                loginMethod === 'phone' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              )}
            >
              رقم الجوال
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegisterMode && (
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mr-1">الاسم الكامل</label>
                <input 
                  type="text"
                  value={loginForm.displayName}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="أدخل اسمك الكامل"
                  required
                />
              </div>
            )}
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mr-1">
                {loginMethod === 'phone' ? 'رقم الجوال' : 'اسم المستخدم'}
              </label>
              <input 
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder={loginMethod === 'phone' ? 'أدخل رقم الجوال المسجل' : 'أدخل اسم المستخدم'}
                required
              />
            </div>
            {loginMethod === 'username' && (
              <div className="text-right">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mr-1">كلمة المرور</label>
                <input 
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
            )}
            {loginMethod === 'phone' && (
              <p className="text-[10px] font-bold text-gray-400 mt-2 mr-1 text-right">
                * سيتم تسجيل الدخول مباشرة باستخدام رقم الجوال المسجل من قبل الإدارة.
              </p>
            )}
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="rounded-full h-5 w-5 border-2 border-white border-t-transparent"
                />
              ) : (isRegisterMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
            </button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-primary hover:text-primary/80 text-sm font-bold transition-colors"
              >
                {isRegisterMode ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ سجل الآن'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex transition-colors duration-300 relative", isDarkMode ? "dark bg-slate-950" : "bg-site")} dir="rtl">
      
      {appBackground && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${appBackground})`,
            opacity: bgOpacity / 100
          }}
        />
      )}
      
      <div className="relative z-10 flex w-full">
      {/* Desktop Sidebar (Push Mode) */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 320 : 0,
          opacity: isSidebarOpen ? 1 : 0,
          marginLeft: isSidebarOpen ? 0 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden lg:flex flex-col glass border-l dark:border-slate-800 h-screen sticky top-0 overflow-hidden z-50 shadow-2xl"
      >
        <div className="w-80 flex flex-col h-full">
          <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4 group/sidebar-logo">
              {appLogo ? (
                <img 
                  src={appLogo} 
                  alt={appName} 
                  className="w-12 h-12 object-contain rounded-xl shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20 dark:shadow-none shrink-0">
                  <Building2 className="text-white w-6 h-6" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-cairo font-black text-2xl text-primary dark:text-white tracking-tight">{appName}</span>
                {isAdmin && (
                  <button 
                    onClick={() => setIsBrandingModalOpen(true)}
                    className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-gray-400 opacity-0 group-hover/sidebar-logo:opacity-100 transition-opacity"
                    title="تغيير الاسم"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isAlertTab = item.id === 'property-alerts';
            const alertCount = isAlertTab ? getExpiringContracts(30).length : 0;
            
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (item.id === 'settings') {
                    setIsBrandingModalOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-4 rounded-[1.5rem] font-cairo font-bold text-sm transition-all duration-300",
                  activeTab === item.id
                    ? "bg-primary text-white shadow-xl shadow-primary/20 dark:shadow-none"
                    : "text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={22} />
                  <span>{item.label}</span>
                </div>
                {alertCount > 0 && (
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                    activeTab === item.id ? "bg-white text-primary" : "bg-rose-500 text-white"
                  )}>
                    {alertCount}
                  </span>
                )}
              </motion.button>
            );
          })}
          </nav>
          
          <div className="p-6 border-t dark:border-slate-800">
            <div className="bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-5 rounded-[2rem] border border-white/20 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-xl shadow-primary/20">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="font-cairo font-black text-sm text-gray-900 dark:text-white leading-tight">{user.displayName}</p>
                    <p className="font-cairo font-bold text-[10px] text-gray-500 dark:text-slate-400 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
                  <div className="theme-switch-wrapper">
                    <label className="theme-switch" htmlFor="sidebar-checkbox">
                      <input 
                        type="checkbox" 
                        id="sidebar-checkbox" 
                        checked={isDarkMode}
                        onChange={() => setIsDarkMode(!isDarkMode)}
                      />
                      <div className="slider round"></div>
                    </label>
                    <em className="text-xs font-black text-gray-900 dark:text-white not-italic">الوضع الداكن</em>
                  </div>
                </div>

                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-rose-500 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                >
                  <LogOut size={16} />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar (Drawer Mode) */}
      <AnimatePresence>
        {isSidebarOpen && activeTab !== 'staff' && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-80 h-screen bg-white dark:bg-slate-900 border-l dark:border-slate-800 z-[60] shadow-2xl flex flex-col lg:hidden"
            >
              <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4 group/mobile-logo">
                  <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20 dark:shadow-none shrink-0">
                    <Building2 className="text-white w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xl text-primary dark:text-white tracking-tight">{appName}</span>
                    {isAdmin && (
                      <button 
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 opacity-0 group-hover/mobile-logo:opacity-100 transition-opacity"
                        title="تغيير الاسم"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                  title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              </div>
              
              <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {NAV_ITEMS.map((item) => {
                  const isAlertTab = item.id === 'property-alerts';
                  const alertCount = isAlertTab ? getExpiringContracts(30).length : 0;

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (item.id === 'settings') {
                          setIsBrandingModalOpen(true);
                        } else {
                          setActiveTab(item.id);
                        }
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200",
                        activeTab === item.id
                          ? "bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none"
                          : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} />
                        <span>{item.label}</span>
                      </div>
                      {alertCount > 0 && (
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                          activeTab === item.id ? "bg-white text-primary" : "bg-rose-500 text-white"
                        )}>
                          {alertCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </nav>
              
              <div className="p-4 border-t dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                  <div className="theme-switch-wrapper">
                    <label className="theme-switch" htmlFor="mobile-checkbox">
                      <input 
                        type="checkbox" 
                        id="mobile-checkbox" 
                        checked={isDarkMode}
                        onChange={() => setIsDarkMode(!isDarkMode)}
                      />
                      <div className="slider round"></div>
                    </label>
                    <em className="text-xs font-black text-gray-900 dark:text-white not-italic">الوضع الداكن</em>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-sm shadow-inner">
                      {user.displayName?.[0] || 'U'}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.displayName}</p>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-rose-500 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                  >
                    <LogOut size={16} />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative group">
                  <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20 dark:shadow-none overflow-hidden w-11 h-11 flex items-center justify-center">
                    {appLogo ? (
                      <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-white w-6 h-6" />
                    )}
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => setIsBrandingModalOpen(true)}
                      className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil size={10} className="text-primary" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl text-primary dark:text-white tracking-tight hidden md:block">{appName}</span>
                  {isAdmin && (
                    <button 
                      onClick={() => setIsBrandingModalOpen(true)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Main Navigation (Removed horizontal mode) */}

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Menu Toggle */}
              {activeTab !== 'staff' && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-xl"
                >
                  <Menu size={22} />
                </motion.button>
              )}

              <div className="hidden sm:flex items-center gap-3 bg-slate-100/50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-gray-200/50 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs shadow-inner">
                  {user.displayName?.[0] || 'U'}
                </div>
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.displayName}</p>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border dark:border-slate-700">
                <div className="theme-switch-wrapper">
                  <label className="theme-switch" htmlFor="header-checkbox">
                    <input 
                      type="checkbox" 
                      id="header-checkbox" 
                      checked={isDarkMode}
                      onChange={() => setIsDarkMode(!isDarkMode)}
                    />
                    <div className="slider round"></div>
                  </label>
                  <em className="text-xs font-black text-gray-600 dark:text-slate-400 not-italic">الوضع الداكن</em>
                </div>
              </div>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={shareSite}
                  className="p-2.5 bg-primary/5 dark:bg-primary/20 text-primary rounded-xl hover:bg-primary/10 dark:hover:bg-primary/30 transition-all"
                >
                  <Share2 size={20} />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={logout}
                  className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
                >
                  <LogOut size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {/* Active Tab Header (Optional, since it's in top bar now, but good for context) */}
          {activeTab !== 'staff' && (
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {activeTab === 'dashboard' ? 'لوحة التحكم' : activeTab === 'daily-tasks' ? 'المهام اليومية' : activeTab}
                </h1>
                <p className="text-gray-500 dark:text-slate-400 font-medium mt-1">
                  {activeTab === 'dashboard' ? 'نظرة عامة على أداء النظام والطلبات' : 'إدارة ومتابعة المهام المجدولة'}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div className="mb-10">
              {getExpiringContracts(30).length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-6 bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-900/20 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none shrink-0">
                      <Bell className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">تنبيه: عقود قاربت على الانتهاء</h3>
                      <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mt-1">يوجد {getExpiringContracts(30).length} عقد سينتهي خلال الـ 30 يوماً القادمة.</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('property-alerts')}
                    className="px-8 py-3 bg-rose-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all whitespace-nowrap"
                  >
                    عرض التفاصيل
                  </motion.button>
                </motion.div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <LayoutDashboard className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="font-cairo text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      إحصائيات اليوم
                    </h2>
                    <p className="font-cairo text-gray-500 dark:text-slate-400 font-bold mt-1">
                      {format(new Date(), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setBulkPrintRequests(filteredRequests);
                      setIsPrintingBulk(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-2xl font-black text-sm shadow-sm transition-all"
                  >
                    <FileText size={18} />
                    طباعة فواتير
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPrintingReport(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border dark:border-slate-700 rounded-2xl font-black text-sm shadow-sm transition-all"
                  >
                    <Printer size={18} />
                    طباعة تقرير
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
                  >
                    <Download size={18} />
                    تصدير البيانات
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 dark:shadow-none transition-all"
                  >
                    <Plus size={18} />
                    طلب جديد
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {[
                { 
                  label: 'إجمالي الطلبات (شهرياً)', 
                  value: stats.total, 
                  icon: FileText, 
                  color: 'primary', 
                  trend: '+12%',
                  onClick: () => {
                    setPaymentFilter('all');
                    setStatusFilter('all');
                    setServiceFilter('all');
                    setViewMode('list');
                  }
                },
                { 
                  label: 'لم يتم الدفع (شقق)', 
                  value: stats.unpaidApartments, 
                  icon: AlertCircle, 
                  color: 'primary', 
                  trend: stats.unpaidApartments > 0 ? '+!' : '0',
                  onClick: () => {
                    setPaymentFilter('unpaid');
                    setStatusFilter('all');
                    setServiceFilter('apartments');
                    setViewMode('summary');
                  }
                },
                { 
                  label: 'لم يتم الدفع (سيارات)', 
                  value: stats.unpaidCars, 
                  icon: Car, 
                  color: 'primary', 
                  trend: stats.unpaidCars > 0 ? '+!' : '0',
                  onClick: () => {
                    setPaymentFilter('unpaid');
                    setStatusFilter('all');
                    setServiceFilter('cars');
                    setViewMode('summary');
                  }
                },
                { 
                  label: 'طلبات منفذة (شهرياً)', 
                  value: stats.completed, 
                  icon: CheckCircle2, 
                  color: 'primary', 
                  trend: '+15%',
                  onClick: () => {
                    setPaymentFilter('all');
                    setStatusFilter('completed');
                    setServiceFilter('all');
                    setViewMode('list');
                  }
                },
                { 
                  label: 'المبالغ المحصلة (شهرياً)', 
                  value: `${stats.paid} ريال`, 
                  icon: DollarSign, 
                  color: 'emerald', 
                  trend: '+8%',
                  onClick: () => {
                    setPaymentFilter('paid');
                    setStatusFilter('all');
                    setServiceFilter('all');
                    setViewMode('list');
                  }
                },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={stat.onClick}
                  className={cn(
                    "bg-box dark:bg-slate-900 p-5 sm:p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 transition-all group",
                    stat.onClick && "cursor-pointer"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl transition-transform group-hover:scale-110",
                      stat.color === 'primary' ? "bg-primary/5 dark:bg-primary/20 text-primary" :
                      stat.color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                      stat.color === 'amber' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
                      "bg-primary/10 dark:bg-primary/20 text-primary"
                    )}>
                      <stat.icon size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-lg",
                      stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
                    )}>
                      {stat.trend}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-cairo text-[10px] sm:text-xs font-black text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wider truncate">{stat.label}</p>
                    <p className="font-cairo text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
              {/* Visual Chart Placeholder / Summary */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-box dark:bg-slate-900 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors" />
                <div className="relative z-10">
                  <h3 className="font-cairo text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-2 h-6 bg-primary rounded-full" />
                    ملخص الأداء الشهري
                  </h3>
                  <div className="space-y-6">
                    {[
                      { label: 'نسبة الإنجاز', value: Math.round((stats.completed / (stats.total || 1)) * 100), color: 'bg-primary' },
                      { label: 'نسبة التحصيل', value: Math.round((stats.paidCount / (stats.total || 1)) * 100), color: 'bg-primary' },
                      { label: 'الطلبات المتبقية', value: Math.round(((stats.total - stats.completed) / (stats.total || 1)) * 100), color: 'bg-amber-500' },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="font-cairo text-gray-500">{item.label}</span>
                          <span className="text-primary">{item.value}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 1, delay: 0.5 + (idx * 0.2) }}
                            className={cn("h-full rounded-full shadow-sm", item.color)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full -ml-32 -mb-32 blur-3xl" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-cairo text-xl font-black mb-2">إجمالي الإيرادات</h3>
                    <p className="font-cairo text-white/60 font-bold text-sm mb-8">إجمالي المبالغ المحصلة خلال هذا الشهر</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black tracking-tight">{stats.paid}</span>
                      <span className="font-cairo text-xl font-bold opacity-60">ريال</span>
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-xl">
                        <TrendingUp className="text-emerald-400" size={20} />
                      </div>
                      <span className="font-cairo text-sm font-bold text-emerald-400">+12% عن الشهر الماضي</span>
                    </div>
                    <button 
                      onClick={() => {
                        setPaymentFilter('paid');
                        setViewMode('list');
                      }}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

          {/* Today's Cleaning Notifications */}
          {(() => {
            const apartmentCount = requests.filter(req => 
              req.buildingName === 'نظافة نورث' && 
              req.serviceType !== 'تنظيف سيارات' && 
              req.serviceType !== 'توصيل مياه' && 
              isSameDay(safeToDate(req.date), new Date()) &&
              req.status === 'pending'
            ).length;

            const carCount = requests.filter(req => 
              req.serviceType === 'تنظيف سيارات' && 
              isSameDay(safeToDate(req.date), new Date()) &&
              req.status === 'pending'
            ).length;

            const maintenanceCount = requests.filter(req => 
              req.serviceType.includes('صيانة') && 
              isSameDay(safeToDate(req.date), new Date()) &&
              req.status === 'pending'
            ).length;

            const showApartment = (activeTab === 'dashboard' || activeTab === 'نظافة نورث') && apartmentCount > 0;
            const showCar = (activeTab === 'dashboard' || activeTab === 'تنظيف سيارات') && carCount > 0;
            const showMaintenance = (activeTab === 'dashboard' || activeTab === 'طلبات الصيانة') && maintenanceCount > 0;

            if (!showApartment && !showCar && !showMaintenance) return null;

            return (
              <div className="space-y-4 mb-8">
                {showApartment && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary text-white p-6 rounded-[2.5rem] shadow-xl shadow-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                        <Home size={32} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-1">تنبيه: جدول تنظيف الشقق لليوم</h3>
                        <p className="text-white/80 font-bold">
                          لديك {apartmentCount} شقق بانتظار التنظيف اليوم ({format(new Date(), 'EEEE', { locale: ar })})
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (activeTab !== 'نظافة نورث') setActiveTab('نظافة نورث');
                        setTimeout(() => {
                          const element = document.getElementById('daily-apartment-schedule');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="bg-white text-primary px-8 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-lg relative z-10 whitespace-nowrap"
                    >
                      عرض الجدول الآن
                    </button>
                  </motion.div>
                )}

                {showCar && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary text-white p-6 rounded-[2.5rem] shadow-xl shadow-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                        <Car size={32} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-1">تنبيه: جدول غسيل السيارات لليوم</h3>
                        <p className="text-white/80 font-bold">
                          لديك {carCount} سيارات بانتظار الغسيل اليوم ({format(new Date(), 'EEEE', { locale: ar })})
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('تنظيف سيارات')}
                      className="bg-white text-primary px-8 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-lg relative z-10 whitespace-nowrap"
                    >
                      عرض الجدول الآن
                    </button>
                  </motion.div>
                )}

                {showMaintenance && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500 text-white p-6 rounded-[2.5rem] shadow-xl shadow-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                        <Wrench size={32} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-1">تنبيه: جدول الصيانة لليوم</h3>
                        <p className="text-white/80 font-bold">
                          لديك {maintenanceCount} مهام صيانة بانتظار التنفيذ اليوم ({format(new Date(), 'EEEE', { locale: ar })})
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (activeTab !== 'طلبات الصيانة') setActiveTab('طلبات الصيانة');
                        setTimeout(() => {
                          const element = document.getElementById('maintenance-schedule');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="bg-white text-amber-600 px-8 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-lg relative z-10 whitespace-nowrap"
                    >
                      عرض الجدول الآن
                    </button>
                  </motion.div>
                )}
              </div>
            );
          })()}

          {/* Top Bar: Month & Search */}
          {activeTab !== 'staff' && (
            <div className="flex flex-col lg:flex-row gap-6 mb-10">
            <div className="flex items-center gap-3 bg-box dark:bg-slate-900 p-2 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors dark:text-gray-400"
              >
                <ChevronRight size={24} />
              </motion.button>
              <div className="flex items-center gap-3 px-4 min-w-[180px] justify-center">
                <Calendar className="text-primary" size={22} />
                <span className="font-black text-lg dark:text-white">{format(selectedMonth, 'MMMM yyyy', { locale: ar })}</span>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors dark:text-gray-400"
              >
                <ChevronLeft size={24} />
              </motion.button>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row gap-4">
              {/* Service Filter */}
              {(activeTab === 'dashboard' || activeTab === 'daily-tasks' || activeTab === 'تكرار الطلبات') && (
                <div className="flex bg-box dark:bg-slate-900 p-1.5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 h-fit">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setServiceFilter('all')}
                    className={cn(
                      "px-4 py-2.5 rounded-2xl font-bold transition-all text-xs",
                      serviceFilter === 'all' 
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" 
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    الكل
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setServiceFilter('apartments')}
                    className={cn(
                      "px-4 py-2.5 rounded-2xl font-bold transition-all text-xs flex items-center gap-2",
                      serviceFilter === 'apartments' 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none" 
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Home size={14} />
                    نظافة الشقق
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setServiceFilter('cars')}
                    className={cn(
                      "px-4 py-2.5 rounded-2xl font-bold transition-all text-xs flex items-center gap-2",
                      serviceFilter === 'cars' 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none" 
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Car size={14} />
                    تنظيف السيارات
                  </motion.button>
                </div>
              )}

              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={22} />
                <input 
                  type="text"
                  placeholder={
                    activeTab === 'تنظيف سيارات' || serviceFilter === 'cars' 
                      ? "البحث برقم اللوحة..." 
                      : "البحث برقم الشقة أو المبنى..."
                  }
                  className="w-full pr-12 pl-6 py-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium dark:text-white dark:placeholder-gray-600"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 h-fit">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentFilter('all')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm",
                    paymentFilter === 'all' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  الكل
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentFilter('paid')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm",
                    paymentFilter === 'paid' 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  المدفوعات
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentFilter('unpaid')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm",
                    paymentFilter === 'unpaid' 
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  غير المدفوع
                </motion.button>
              </div>

              <div className="flex items-center gap-2 bg-box dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm whitespace-nowrap",
                    statusFilter === 'all' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  كل الحالات
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStatusFilter('completed')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm whitespace-nowrap",
                    statusFilter === 'completed' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  منفذة
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStatusFilter('pending')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm whitespace-nowrap",
                    statusFilter === 'pending' 
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  قيد التنفيذ
                </motion.button>
              </div>
            </div>
          </div>
          )}

          {/* Historical Task Alert Box (Car Cleaning) */}
          {activeTab === 'dashboard' && (() => {
            const targetDate = globalSelectedDate;
            
            // Guard against invalid targetDate
            if (isNaN(targetDate.getTime())) {
              return null;
            }

            const dayRequests = requests.filter(req => 
              req.serviceType === 'تنظيف سيارات' && 
              isSameDay(safeToDate(req.date), targetDate)
            );
            
            if (dayRequests.length === 0) return null;
            
            const incompleteRequests = dayRequests.filter(r => r.status === 'pending');
            const completedCount = dayRequests.length - incompleteRequests.length;
            const totalCount = dayRequests.length;
            const isAllDone = incompleteRequests.length === 0;
            const isTodayAlert = isToday(targetDate);
            
            if (isAllDone && !isTodayAlert) return null; // Only show completed alert for today or if explicitly looking at it? 
            // Actually, if they selected a past date, maybe they want to see if it was finished.
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mb-10 p-6 rounded-[2.5rem] border-2 flex flex-col gap-6 overflow-hidden relative",
                  isAllDone 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400" 
                    : "bg-amber-50 border-amber-100 text-amber-900 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400"
                )}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "p-4 rounded-3xl backdrop-blur-md",
                      isAllDone ? "bg-emerald-200/50 dark:bg-emerald-800/50" : "bg-amber-200/50 dark:bg-amber-800/50"
                    )}>
                      {isAllDone ? <CheckCircle2 size={32} strokeWidth={3} /> : <AlertCircle size={32} strokeWidth={3} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black mb-1">
                        {isAllDone 
                          ? `تم إنجاز جميع مهام ${isTodayAlert ? 'اليوم' : 'ذلك اليوم'} بنجاح` 
                          : `تنبيه: توجد مهام غير مكتملة ${isTodayAlert ? 'اليوم' : 'من ذلك اليوم'}`}
                      </h3>
                      <p className="font-bold opacity-80">
                        {isAllDone 
                          ? `تم غسل جميع السيارات (${totalCount}) ليوم ${format(targetDate, 'EEEE (dd/MM)', { locale: ar })}`
                          : `تم غسل ${completedCount} من أصل ${totalCount} سيارات ليوم ${format(targetDate, 'EEEE (dd/MM)', { locale: ar })}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
                    {!isAllDone && (
                      <button 
                        onClick={() => setShowYesterdayIncomplete(!showYesterdayIncomplete)}
                        className={cn(
                          "px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-lg",
                          showYesterdayIncomplete 
                            ? "bg-white text-orange-600" 
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        )}
                      >
                        {showYesterdayIncomplete ? 'إخفاء المهام' : 'عرض المهام المتبقية'}
                        {showYesterdayIncomplete ? <ChevronLeft size={18} className="rotate-90" /> : <ChevronRight size={18} className="-rotate-90" />}
                      </button>
                    )}
                    
                    {!isAllDone && (
                      <div className="flex items-center gap-2 bg-amber-200/50 dark:bg-amber-800/50 px-4 py-3 rounded-2xl font-black text-sm">
                        <Clock size={18} />
                        {incompleteRequests.length} متبقية
                      </div>
                    )}
                  </div>
                </div>

                {/* Incomplete Tasks List */}
                {!isAllDone && showYesterdayIncomplete && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative z-10 border-t border-orange-200 dark:border-orange-900/30 pt-6 space-y-3"
                  >
                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">السيارات المتبقية:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {incompleteRequests.map(req => (
                        <div 
                          key={req.id}
                          className="bg-white/40 dark:bg-black/20 backdrop-blur-sm p-4 rounded-2xl border border-orange-200/50 dark:border-orange-900/30 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-600 text-white p-2 rounded-xl">
                              <Car size={18} />
                            </div>
                            <div>
                              <p className="font-black text-sm tracking-wider">{req.apartmentNumber}</p>
                              <p className="text-[10px] font-bold opacity-60">
                                {format(safeToDate(req.date), 'p', { locale: ar })}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => updateStatus(req.id, 'status', 'completed')}
                            className="bg-white dark:bg-slate-800 p-2 rounded-xl text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                            title="تحديد كمكتمل"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })()}

          {/* Daily Tasks Summary in Dashboard & Buildings */}
          {(activeTab === 'dashboard' || BUILDINGS.includes(activeTab)) && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="bg-primary w-2 h-8 rounded-full" />
                  {activeTab === 'dashboard' ? 'المهام اليومية القادمة' : `مهام ${activeTab} القادمة`}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => scrollTasks('right')}
                      className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:text-primary transition-colors"
                    >
                      <ChevronRight size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => scrollTasks('left')}
                      className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:text-primary transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </motion.button>
                  </div>
                  <button 
                    onClick={() => setActiveTab('daily-tasks')}
                    className="text-primary font-bold text-sm hover:underline"
                  >
                    عرض الكل
                  </button>
                </div>
              </div>
              
              <div 
                ref={tasksScrollRef}
                className="flex overflow-x-auto gap-6 pb-4 custom-scrollbar snap-x snap-mandatory"
              >
                {eachDayOfInterval({
                  start: globalSelectedDate,
                  end: addDays(globalSelectedDate, 7)
                }).map(day => {
                  const dayRequests = requests.filter(r => isSameDay(safeToDate(r.date), day));
                  return (
                    <motion.div 
                      key={day.toISOString()} 
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="min-w-[280px] sm:min-w-[320px] flex-shrink-0 snap-start bg-box dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-800 transition-all hover:shadow-xl hover:shadow-primary/5"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm",
                            isToday(day) ? "bg-primary text-white shadow-primary/20" : "bg-gray-50 dark:bg-slate-800 text-gray-400"
                          )}>
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className={cn(
                              "font-cairo font-black text-sm",
                              isToday(day) ? "text-primary" : "text-gray-900 dark:text-white"
                            )}>
                              {format(day, 'EEEE', { locale: ar })}
                              {isToday(day) && " (اليوم)"}
                            </p>
                            <span className="font-cairo text-[10px] font-bold text-gray-400">
                              {format(day, 'd MMMM', { locale: ar })}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-gray-500">
                          {dayRequests.length} مهام
                        </div>
                      </div>
                      <div className="space-y-4">
                        {dayRequests.length > 0 ? (
                          dayRequests.slice(0, 3).map(req => (
                            <div 
                              key={req.id} 
                              onClick={() => {
                                setEditingRequest(req);
                                setIsModalOpen(true);
                              }}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-gray-100 dark:border-slate-700 cursor-pointer group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                  {req.serviceType === 'تنظيف سيارات' ? <Car className="text-primary" size={18} /> : <Home className="text-primary" size={18} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-cairo text-xs font-black text-gray-900 dark:text-white truncate">شقة {req.apartmentNumber}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="font-cairo text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">{req.serviceType}</p>
                                    <span className="font-cairo text-[10px] text-primary font-black">{format(safeToDate(req.date), 'p', { locale: ar })}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid');
                                    }}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[8px] font-black cursor-pointer transition-all shadow-sm",
                                      req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                    )}
                                  >
                                    {req.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(req.id);
                                    }}
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                {req.isRecurring && (
                                  <div className="flex items-center gap-1 text-[9px] font-black text-primary">
                                    <Repeat size={10} />
                                    <span>مكرر</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-800">
                            <p className="font-cairo text-xs text-gray-400 font-bold">لا توجد مهام مجدولة</p>
                          </div>
                        )}
                        {dayRequests.length > 3 && (
                          <button 
                            onClick={() => setActiveTab('daily-tasks')}
                            className="w-full py-3 text-[10px] font-black text-gray-400 hover:text-primary transition-colors border-t border-gray-100 dark:border-slate-800 mt-2"
                          >
                            عرض {dayRequests.length - 3} مهام إضافية...
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Tasks View */}
          {activeTab === 'daily-tasks' && (
            <div className="space-y-10 mb-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      المهام اليومية
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      عرض جميع المهام المجدولة لليوم والأيام القادمة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <button 
                      onClick={() => setDailyTasksView('today')}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                        dailyTasksView === 'today' 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <Clock size={14} />
                      مهام اليوم
                    </button>
                    <button 
                      onClick={() => setDailyTasksView('all')}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                        dailyTasksView === 'all' 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <ListTodo size={14} />
                      الطلبات
                    </button>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareSite}
                    className="flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 dark:shadow-none hover:bg-primary/90 transition-all"
                  >
                    <Share2 size={20} />
                    <span>مشاركة الجدول</span>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-8">
                {eachDayOfInterval({
                  start: dailyTasksView === 'today' ? new Date() : startOfMonth(selectedMonth),
                  end: dailyTasksView === 'today' ? new Date() : endOfMonth(selectedMonth)
                }).map(day => {
                  const dayRequests = filteredRequests.filter(r => isSameDay(safeToDate(r.date), day));
                  if (dayRequests.length === 0) return null;

                  return (
                    <motion.div 
                      key={day.toISOString()}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-box dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-50 dark:border-slate-800">
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-16 h-16 rounded-3xl flex flex-col items-center justify-center shadow-sm",
                            isToday(day) ? "bg-primary text-white" : "bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                          )}>
                            <span className="text-[10px] uppercase font-black mb-1">{format(day, 'EEE', { locale: ar })}</span>
                            <span className="text-2xl font-black">{format(day, 'd')}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">
                              {isToday(day) ? 'اليوم' : format(day, 'EEEE', { locale: ar })}
                            </h3>
                            <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
                              {format(day, 'MMMM yyyy', { locale: ar })} • {dayRequests.length} مهام مجدولة
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dayRequests.map(req => (
                          <motion.div 
                            key={req.id}
                            whileHover={{ y: -5 }}
                            onClick={() => {
                              setEditingRequest(req);
                              setIsModalOpen(true);
                            }}
                            className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl text-primary shadow-sm group-hover:scale-110 transition-transform">
                                {req.serviceType === 'تنظيف سيارات' ? <Car size={24} /> : <Home size={24} />}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 dark:text-white">شقة {req.apartmentNumber}</p>
                                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">{req.serviceType}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'unpaid' ? 'paid' : 'unpaid');
                                }}
                                className={cn(
                                  "p-2 rounded-xl transition-all",
                                  req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                )}
                              >
                                <CreditCard size={18} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(req.id, 'status', req.status === 'pending' ? 'completed' : 'pending');
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-full text-xs font-black uppercase transition-all",
                                  req.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : 
                                  "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                )}
                              >
                                {req.status === 'completed' ? '✓ تم' : '✕ لم يتم'}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maintenance Requests Tab */}
          {activeTab === 'طلبات الصيانة' && (
            <div className="space-y-10 mb-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <Wrench className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      طلبات الصيانة
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      إدارة ومتابعة أعمال الصيانة الدورية والطارئة
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700 shadow-sm">
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-black transition-all",
                        statusFilter === 'all' ? "bg-primary text-white shadow-md" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      الكل
                    </button>
                    <button 
                      onClick={() => setStatusFilter('pending')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-black transition-all",
                        statusFilter === 'pending' ? "bg-amber-500 text-white shadow-md" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      قيد التنفيذ
                    </button>
                    <button 
                      onClick={() => setStatusFilter('completed')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-black transition-all",
                        statusFilter === 'completed' ? "bg-primary text-white shadow-md" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      مكتمل
                    </button>
                  </div>
                </div>
              </div>

              <div id="maintenance-schedule" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests
                  .filter(r => r.serviceType.includes('صيانة') && (statusFilter === 'all' || r.status === statusFilter))
                  .sort((a, b) => safeToDate(b.date).getTime() - safeToDate(a.date).getTime())
                  .map((req) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={req.id}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            req.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>
                            <Wrench size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-gray-900 dark:text-white text-lg">شقة {req.apartmentNumber}</h3>
                            <p className="text-xs font-bold text-gray-500 dark:text-slate-400">{req.serviceType}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black",
                          req.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {req.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-600 dark:text-slate-300">التاريخ واليوم</span>
                          </div>
                          <span className="text-xs font-black text-gray-900 dark:text-white">
                            {format(safeToDate(req.date), 'EEEE, dd MMMM', { locale: ar })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <UserIcon size={14} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-600 dark:text-slate-300">العامل المسؤول</span>
                          </div>
                          <span className="text-xs font-black text-primary">
                            {req.workerName || 'غير محدد'}
                          </span>
                        </div>

                        {req.notes && (
                          <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">ملاحظات</p>
                            <p className="text-xs font-bold text-gray-600 dark:text-slate-400 leading-relaxed">{req.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateStatus(req.id, 'status', req.status === 'completed' ? 'pending' : 'completed')}
                          className={cn(
                            "flex-1 py-3 rounded-2xl font-black text-xs transition-all",
                            req.status === 'completed' 
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none" 
                              : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                          )}
                        >
                          {req.status === 'completed' ? 'تم الإصلاح' : 'تحديد كمكتمل'}
                        </button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          onClick={() => {
                            setEditingRequest(req);
                            setIsModalOpen(true);
                          }}
                          className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-blue-600 border border-blue-50 bg-blue-50/40 hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                        >
                          <Pencil size={18} strokeWidth={2.5} />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          onClick={() => {
                            setConfirmDeleteId(req.id);
                          }}
                          className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-rose-600 border border-rose-50 bg-rose-50/40 hover:bg-rose-100 hover:border-rose-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                        >
                          <Trash2 size={18} strokeWidth={2.5} />
                        </motion.button>

                        <button
                          onClick={() => {
                            const statusText = req.status === 'completed' ? '✅ تم الإصلاح' : '⏳ قيد المتابعة';
                            const text = `🛠️ تفاصيل طلب صيانة:\n\n🏠 الشقة: ${req.apartmentNumber}\n🔧 الخدمة: ${req.serviceType}\n📅 التاريخ: ${format(safeToDate(req.date), 'EEEE, dd MMMM', { locale: ar })}\n👷 العامل: ${req.workerName || 'غير محدد'}\n📊 الحالة: ${statusText}\n\n📝 ملاحظات: ${req.notes || 'لا يوجد'}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="p-3 bg-[#25D366] text-white rounded-2xl shadow-lg hover:bg-[#128C7E] transition-all"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                {requests.filter(r => r.serviceType.includes('صيانة') && (statusFilter === 'all' || r.status === statusFilter)).length === 0 && (
                  <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-slate-800/50 rounded-[3.5rem] border-2 border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Wrench size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">لا توجد طلبات صيانة حالياً</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mt-2">سيتم عرض جميع طلبات الصيانة المجدولة هنا</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Water Orders & Inventory Tab */}
          {activeTab === 'طلبات الماء' && (
            <div className="space-y-10 mb-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <Droplets className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      طلبات المياه
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      {format(new Date(), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPrintingInventory(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border dark:border-slate-700 rounded-2xl font-black text-sm shadow-sm transition-all"
                  >
                    <Printer size={18} />
                    طباعة تقرير المخزون
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <div className="bg-primary/5 dark:bg-primary/20 p-6 rounded-3xl border border-primary/10 dark:border-primary/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-primary/10 dark:bg-primary/30 rounded-2xl flex items-center justify-center">
                      <Droplets className="text-primary" size={20} />
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          const waterItem = inventory.find(i => i.itemName === 'water' || i.id === 'water');
                          if (waterItem) {
                            setEditingInventoryItem(waterItem);
                          } else {
                            setEditingInventoryItem({
                              id: 'water',
                              itemName: 'water',
                              category: 'مياه',
                              currentStock: waterStock || 0,
                              reorderPoint: 10,
                              unit: 'جالون',
                              lastUpdated: Timestamp.now()
                            });
                          }
                          setIsInventoryModalOpen(true);
                        }}
                        className="p-2 hover:bg-primary/10 dark:hover:bg-primary/40 rounded-xl transition-colors"
                      >
                        <Pencil size={14} className="text-primary" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">المخزون الحالي</p>
                  <h3 className="text-3xl font-black text-primary dark:text-white mt-1">
                    {waterStock !== null ? waterStock : '...'}
                    <span className="text-sm font-bold mr-1 opacity-60">جالون</span>
                  </h3>
                </div>

                <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-3xl border border-primary/20 dark:border-primary/30">
                  <div className="w-10 h-10 bg-primary/20 dark:bg-primary/30 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="text-primary dark:text-primary" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-primary/60 dark:text-primary/60 uppercase tracking-widest">تم التوصيل في {format(globalSelectedDate, 'dd/MM')}</p>
                  <h3 className="text-3xl font-black text-primary dark:text-white mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && r.status === 'completed' && isSameDay(safeToDate(r.date), globalSelectedDate)).length}
                  </h3>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-2xl flex items-center justify-center mb-4">
                    <CreditCard className="text-amber-600 dark:text-amber-400" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">طلبات غير مدفوعة</p>
                  <h3 className="text-3xl font-black text-amber-900 dark:text-amber-100 mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && r.paymentStatus === 'unpaid').length}
                  </h3>
                </div>

                <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-3xl border border-primary/20 dark:border-primary/30">
                  <div className="w-10 h-10 bg-primary/20 dark:bg-primary/30 rounded-2xl flex items-center justify-center mb-4">
                    <DollarSign className="text-primary dark:text-primary" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-primary/60 dark:text-primary/60 uppercase tracking-widest">المبالغ المحصلة</p>
                  <h3 className="text-3xl font-black text-primary dark:text-white mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && r.paymentStatus === 'paid').reduce((acc, r) => acc + r.price, 0)}
                    <span className="text-sm font-bold mr-1 opacity-60">ريال</span>
                  </h3>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-2xl flex items-center justify-center mb-4">
                    <PieChart className="text-indigo-600 dark:text-indigo-400" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-widest">إجمالي المبيعات</p>
                  <h3 className="text-3xl font-black text-indigo-900 dark:text-indigo-100 mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه').reduce((acc, r) => acc + r.price, 0)}
                    <span className="text-sm font-bold mr-1 opacity-60">ريال</span>
                  </h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/5 dark:bg-primary/20 rounded-2xl flex items-center justify-center">
                      <Droplets className="text-primary" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white">جدول طلبات المياه</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 font-bold">إدارة طلبات توصيل المياه للمباني</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button 
                        onClick={() => setViewMode('list')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          viewMode === 'list' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        )}
                      >
                        عرض القائمة
                      </button>
                      <button 
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          viewMode === 'calendar' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        )}
                      >
                        التقويم
                      </button>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEditingRequest(null);
                        setIsModalOpen(true);
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-primary/20 dark:shadow-none hover:bg-primary/90 transition-all"
                    >
                      <Plus size={14} />
                      جدولة طلب مياه
                    </motion.button>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="بحث برقم الشقة..."
                        className="pr-10 pl-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary transition-all w-48"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {viewMode === 'list' ? (
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-gray-50 dark:border-slate-800">
                          <th className="pb-4 font-black text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-widest px-4 text-center">رقم الشقة</th>
                          <th className="pb-4 font-black text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-widest px-4 text-center">عدد الجالونات</th>
                          <th className="pb-4 font-black text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-widest px-4 text-center">حالة التوصيل</th>
                          <th className="pb-4 font-black text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-widest px-4 text-center">حالة الدفع</th>
                          <th className="pb-4 font-black text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-widest px-4 text-center">التاريخ</th>
                          <th className="pb-4 font-black text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-widest px-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        {requests
                          .filter(r => r.serviceType === 'توصيل مياه' && (searchTerm === '' || r.apartmentNumber.includes(searchTerm)))
                          .sort((a, b) => safeToDate(b.date).getTime() - safeToDate(a.date).getTime())
                          .map(request => (
                            <motion.tr 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              key={request.id} 
                              className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors text-center"
                            >
                              <td className="py-4 px-4">
                                <span className="text-sm font-black text-gray-900 dark:text-white">{request.apartmentNumber}</span>
                                <div className="text-[10px] font-bold text-gray-400">{request.buildingName}</div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm font-black text-primary">{request.waterGallons || 0} جالون</span>
                              </td>
                              <td className="py-4 px-4">
                                <button 
                                  onClick={() => updateStatus(request.id, 'status', request.status === 'completed' ? 'pending' : 'completed')}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all",
                                    request.status === 'completed' 
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                                      : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                  )}
                                >
                                  {request.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                  {request.status === 'completed' ? 'تم التوصيل' : 'قيد الانتظار'}
                                </button>
                              </td>
                              <td className="py-4 px-4">
                                <button 
                                  onClick={() => updateStatus(request.id, 'paymentStatus', request.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all",
                                    request.paymentStatus === 'paid' 
                                      ? "bg-primary/5 text-primary border border-primary/10" 
                                      : "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                                  )}
                                >
                                  {request.paymentStatus === 'paid' ? <DollarSign size={12} /> : <AlertCircle size={12} />}
                                  {request.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                </button>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{format(safeToDate(request.date), 'yyyy/MM/dd HH:mm')}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => setEditingRequest(request)}
                                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/20 rounded-lg transition-colors"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteId(request.id)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                          >
                            <ChevronRight size={20} />
                          </button>
                          <h3 className="text-lg font-black text-gray-900 dark:text-white min-w-[150px] text-center">
                            {format(selectedMonth, 'MMMM yyyy', { locale: ar })}
                          </h3>
                          <button 
                            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                          >
                            <ChevronLeft size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                        {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                          <div key={day} className="bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            {day}
                          </div>
                        ))}
                        {calendarDays.map((day, i) => {
                          const dayRequests = filteredRequests.filter(req => isSameDay(safeToDate(req.date), day));
                          const isCurrentMonth = isSameMonth(day, selectedMonth);
                          
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "bg-white dark:bg-slate-900 min-h-[120px] p-2 transition-colors hover:bg-primary/5 dark:hover:bg-primary/10",
                                !isCurrentMonth && "bg-gray-50/50 dark:bg-slate-950/50 opacity-40"
                              )}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={cn(
                                  "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                                  isToday(day) ? "bg-primary text-white" : "text-gray-500 dark:text-slate-400"
                                )}>
                                  {format(day, 'd')}
                                </span>
                                {dayRequests.length > 0 && (
                                  <span className="text-[9px] bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary px-1.5 py-0.5 rounded-full font-black">
                                    {dayRequests.length}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {dayRequests.slice(0, 2).map(req => (
                                  <div 
                                    key={req.id}
                                    onClick={() => {
                                      setEditingRequest(req);
                                      setIsModalOpen(true);
                                    }}
                                    className={cn(
                                      "text-[9px] p-1 rounded-md font-bold truncate border cursor-pointer",
                                      req.paymentStatus === 'paid' ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400"
                                    )}
                                  >
                                    شقة {req.apartmentNumber}
                                  </div>
                                ))}
                                {dayRequests.length > 2 && (
                                  <div className="text-[8px] text-center text-gray-400 dark:text-slate-500 font-bold">
                                    + {dayRequests.length - 2}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Activity Log */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center">
                    <ListTodo className="text-indigo-600 dark:text-indigo-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">سجل حركة المخزون</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-bold">تتبع عمليات السحب والإضافة للمستودع</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {inventoryLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        log.changeAmount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {log.changeAmount > 0 ? <Plus size={20} /> : <Trash2 size={20} />}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                            {log.changeAmount > 0 ? 'إضافة للمخزون' : 'سحب من المخزون'} - {log.itemName}
                          </h4>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setConfirmDeleteLogId(log.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                              title="حذف السجل"
                            >
                              <Trash2 size={14} />
                            </button>
                            <span className="text-[10px] font-bold text-gray-400">{format(safeToDate(log.timestamp), 'HH:mm - yyyy/MM/dd')}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-bold mb-2">{log.notes}</p>
                        <div className="flex items-center gap-4 justify-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الكمية:</span>
                            <span className={cn(
                              "text-xs font-black",
                              log.changeAmount > 0 ? "text-green-600" : "text-rose-600"
                            )}>{log.changeAmount > 0 ? '+' : ''}{log.changeAmount}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">بواسطة:</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{log.performedBy}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الرصيد الجديد:</span>
                            <span className="text-xs font-black text-primary">{log.newStock}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {inventoryLogs.length === 0 && (
                    <div className="py-12 text-center opacity-20">
                      <ListTodo size={48} className="mx-auto mb-3" />
                      <p className="text-sm font-black">لا يوجد سجل حركات حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Users Management Tab */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-8 mb-10">
              {/* Add Worker Form */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Plus className="text-primary" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">إضافة عامل جديد</h2>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400">إضافة عامل بصلاحية الدخول لخانة إدارة العمالة فقط</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase mr-2">اسم العامل</label>
                    <input 
                      type="text"
                      value={workerForm.name}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="أدخل اسم العامل"
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase mr-2">رقم الجوال (اسم المستخدم)</label>
                    <input 
                      type="text"
                      value={workerForm.phone}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="أدخل رقم الجوال"
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={addWorker}
                      disabled={isAddingWorker}
                      className="w-full bg-primary text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAddingWorker ? (
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                        />
                      ) : (
                        <>
                          <Plus size={18} />
                          إضافة العامل
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                      <Users className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        إدارة المستخدمين
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">التحكم في صلاحيات المستخدمين وحظرهم من الموقع</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-gray-400 text-xs font-black uppercase tracking-widest">
                        <th className="px-6 py-4">المستخدم</th>
                        <th className="px-6 py-4">اسم المستخدم</th>
                        <th className="px-6 py-4">تاريخ التسجيل</th>
                        <th className="px-6 py-4">الصلاحية</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u) => (
                        <motion.tr 
                          key={u.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group"
                        >
                          <td className="px-6 py-5 rounded-r-3xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                                {u.displayName?.[0] || 'U'}
                              </div>
                              <div className="font-black text-gray-900 dark:text-white">{u.displayName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-gray-700 dark:text-slate-300">{u.username}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-[10px] font-bold text-gray-400">
                              {u.createdAt ? format(safeToDate(u.createdAt), 'yyyy/MM/dd') : 'غير متوفر'}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <select 
                                value={u.role || 'user'}
                                onChange={(e) => updateUserRole(u.id, e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-primary mb-2"
                              >
                                <option value="user">مستخدم مخصص</option>
                                <option value="admin">مسؤول كامل (Admin)</option>
                              </select>
                              
                              {u.role !== 'admin' && (
                                <div className="grid grid-cols-2 gap-1 max-w-[300px]">
                                  {[
                                    { id: 'dashboard', label: 'لوحة التحكم' },
                                    { id: 'daily-tasks', label: 'المهام اليومية' },
                                    { id: 'تكرار الطلبات', label: 'تكرار الطلبات' },
                                    { id: 'staff', label: 'إدارة العمالة' },
                                    { id: 'club-subscriptions', label: 'اشتراكات النادي' },
                                    { id: 'bookings', label: 'إدارة الحجوزات' },
                                    { id: 'طلبات الماء', label: 'إدارة المياه والمخزون' },
                                    { id: 'طلبات الصيانة', label: 'طلبات الصيانة' },
                                    { id: 'تنظيف سيارات', label: 'تنظيف السيارات' },
                                    ...BUILDINGS.map(b => ({ id: b, label: b }))
                                  ].map(perm => (
                                    <label key={perm.id} className="flex items-center gap-1 cursor-pointer">
                                      <input 
                                        type="checkbox"
                                        checked={(u.permissions || []).includes(perm.id)}
                                        onChange={() => toggleUserPermission(u.id, perm.id, u.permissions)}
                                        className="w-3 h-3 accent-primary"
                                      />
                                      <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">{perm.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black",
                              u.isBlocked ? "bg-rose-100 text-rose-600" : 
                              u.status === 'pending' ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {u.isBlocked ? 'محظور' : u.status === 'pending' ? 'قيد الانتظار' : 'نشط'}
                            </span>
                          </td>
                          <td className="px-6 py-5 rounded-l-3xl">
                            <div className="flex items-center gap-2">
                              {u.status === 'pending' && (
                                <button 
                                  onClick={() => approveUser(u.id)}
                                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-200 transition-all"
                                >
                                  <Check size={14} />
                                  تفعيل الحساب
                                </button>
                              )}
                              <button 
                                onClick={() => toggleUserBlock(u.id, !!u.isBlocked)}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                                  u.isBlocked 
                                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                    : "bg-rose-500 text-white shadow-lg shadow-rose-200"
                                )}
                              >
                                {u.isBlocked ? <Check size={14} /> : <Ban size={14} />}
                                {u.isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
                              </button>
                              <button 
                                onClick={() => deleteUser(u.id)}
                                className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
                                title="حذف المستخدم"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {allUsers.length === 0 && (
                    <div className="py-20 text-center opacity-20">
                      <Users size={48} className="mx-auto mb-3" />
                      <p className="text-sm font-black">لا يوجد مستخدمون مسجلون حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Club Subscriptions Tab */}
          {activeTab === 'club-subscriptions' && (
            <div className="space-y-8 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary/5 dark:bg-primary/20 p-6 rounded-3xl border border-primary/10 dark:border-primary/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-primary/10 dark:bg-primary/30 rounded-2xl flex items-center justify-center">
                      <Users className="text-primary" size={20} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">إجمالي المشتركين</p>
                  <h3 className="text-3xl font-black text-primary dark:text-white mt-1">
                    {clubSubscriptions.length}
                    <span className="text-sm font-bold mr-1 opacity-60">مشترك</span>
                  </h3>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-2xl flex items-center justify-center mb-4">
                    <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">المبالغ المحصلة</p>
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {clubSubscriptions.reduce((sum, sub) => sum + (sub.collectedAmount || 0), 0)}
                    <span className="text-sm font-bold mr-1 opacity-60">ريال</span>
                  </h3>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="text-amber-600 dark:text-amber-400" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest">المبالغ المتبقية</p>
                  <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {clubSubscriptions.reduce((sum, sub) => sum + (sub.totalPrice - (sub.collectedAmount || 0)), 0)}
                    <span className="text-sm font-bold mr-1 opacity-60">ريال</span>
                  </h3>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                      <ListTodo className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        اشتراكات النادي
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">إدارة ومتابعة اشتراكات أعضاء النادي</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsClubSubscriptionModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 dark:shadow-none hover:bg-primary/90 transition-all"
                  >
                    <Plus size={20} />
                    إضافة مشترك جديد
                  </motion.button>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b dark:border-slate-800">
                  <button
                    onClick={() => setClubSubBuildingFilter('all')}
                    className={cn(
                      "px-6 py-3 rounded-xl font-black text-xs transition-all",
                      clubSubBuildingFilter === 'all'
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                    )}
                  >
                    الكل
                  </button>
                  {BUILDINGS.map(b => (
                    <button
                      key={b}
                      onClick={() => setClubSubBuildingFilter(b)}
                      className={cn(
                        "px-6 py-3 rounded-xl font-black text-xs transition-all",
                        clubSubBuildingFilter === b
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-gray-50 dark:bg-slate-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                  <button
                    onClick={() => setClubSubBuildingFilter('other')}
                    className={cn(
                      "px-6 py-3 rounded-xl font-black text-xs transition-all",
                      clubSubBuildingFilter === 'other'
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                    )}
                  >
                    أخرى
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clubSubscriptions
                    .filter(sub => {
                      if (clubSubBuildingFilter === 'all') return true;
                      if (clubSubBuildingFilter === 'other') return !BUILDINGS.includes(sub.workplace);
                      return sub.workplace === clubSubBuildingFilter;
                    })
                    .map((sub) => (
                    <motion.div 
                      key={sub.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-transparent hover:border-primary/30 transition-all group relative overflow-hidden"
                    >
                      {sub.status === 'locked' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl text-center shadow-2xl">
                            <XCircle className="text-rose-500 mx-auto mb-3" size={40} />
                            <h4 className="font-black text-rose-500">الاشتراك مقفل</h4>
                            <p className="text-xs font-bold text-gray-500 mt-1">تم قفل الاشتراك لانتهاء المدة</p>
                            <button 
                              onClick={() => updateClubSubStatus(sub.id, 'active')}
                              className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black"
                            >
                              إعادة تفعيل
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <UserIcon className="text-primary" size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 dark:text-white">{sub.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub.workplace}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black",
                            sub.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {sub.status === 'active' ? 'نشط' : sub.status === 'expired' ? 'منتهي' : 'مقفل'}
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black",
                            sub.paymentStatus === 'paid' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {sub.paymentStatus === 'paid' ? 'تم التحصيل' : 'لم يتم التحصيل'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                          <span className="text-xs font-bold text-gray-400">مدة الاشتراك</span>
                          <span className="text-xs font-black text-gray-900 dark:text-white">{sub.monthsCount} شهر</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                          <span className="text-xs font-bold text-gray-400">سعر الاشتراك</span>
                          <span className="text-xs font-black text-primary">{sub.totalPrice} ريال</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                          <span className="text-xs font-bold text-gray-400">المبلغ المحصل</span>
                          <span className="text-xs font-black text-emerald-500">{sub.collectedAmount || 0} ريال</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-gray-400 mb-1">تاريخ البداية</p>
                            <p className="text-xs font-black text-gray-900 dark:text-white">{format(safeToDate(sub.startDate), 'yyyy/MM/dd')}</p>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-gray-400 mb-1">تاريخ النهاية</p>
                            <p className="text-xs font-black text-gray-900 dark:text-white">{format(safeToDate(sub.endDate), 'yyyy/MM/dd')}</p>
                          </div>
                        </div>
                      </div>

                      {sub.idPhotoUrl && (
                        <div className="mb-6">
                          <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">الهوية المرفقة</p>
                          <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
                            <img src={sub.idPhotoUrl} alt="ID" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => window.open(sub.idPhotoUrl, '_blank')}
                              className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs"
                            >
                              عرض الهوية
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          onClick={() => {
                            setEditingClubSub(sub);
                            setNewClubSub(sub);
                            setIsClubSubscriptionModalOpen(true);
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-[1.1rem] text-blue-600 border border-blue-50 bg-blue-50/40 hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                          title="تعديل"
                        >
                          <Pencil size={16} strokeWidth={2.5} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          onClick={() => updateClubSubPaymentStatus(sub.id, sub.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-[1.1rem] transition-all border",
                            sub.paymentStatus === 'paid' 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-slate-50/40 text-slate-400 border-slate-100 hover:text-primary hover:bg-slate-50 hover:border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          )}
                          title={sub.paymentStatus === 'paid' ? "إلغاء التحصيل" : "تحصيل المبلغ"}
                        >
                          <DollarSign size={16} strokeWidth={2.5} />
                        </motion.button>
                        <button
                          onClick={() => updateClubSubStatus(sub.id, 'locked')}
                          className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                        >
                          <AlertCircle size={16} />
                          تنبيه قفل الاشتراك
                        </button>
                        <button
                          onClick={() => deleteClubSubscription(sub.id)}
                          className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-rose-500 rounded-2xl transition-all"
                          title="حذف"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {clubSubscriptions.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-700">
                      <ListTodo size={48} className="mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-black text-gray-400">لا توجد اشتراكات مسجلة حالياً</h3>
                      <p className="text-sm text-gray-400 font-bold mt-1">ابدأ بإضافة أول مشترك في النادي</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bookings Management Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-8 mb-10">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                      <Calendar className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        إدارة الحجوزات
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">متابعة طلبات الحجز المرسلة من العملاء</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const bookingUrl = `${window.location.origin}${window.location.pathname}?view=book`;
                      navigator.clipboard.writeText(bookingUrl);
                      toast.success('تم نسخ رابط الحجز لمشاركته');
                      window.open(`https://wa.me/?text=${encodeURIComponent('رابط حجز خدمة النظافة:\n' + bookingUrl)}`, '_blank');
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-2xl font-black text-sm shadow-xl shadow-green-200 dark:shadow-none hover:bg-[#128C7E] transition-all"
                  >
                    <Share2 size={20} />
                    مشاركة رابط الحجز (واتساب)
                  </motion.button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-gray-400 text-xs font-black uppercase tracking-widest">
                        <th className="px-6 py-4">العميل</th>
                        <th className="px-6 py-4">الموقع</th>
                        <th className="px-6 py-4">الخدمة</th>
                        <th className="px-6 py-4">الموعد</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">اللغة</th>
                        <th className="px-6 py-4">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <motion.tr 
                          key={booking.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group"
                        >
                          <td className="px-6 py-5 rounded-r-3xl">
                            <div className="font-black text-gray-900 dark:text-white">{booking.customerName || 'بدون اسم'}</div>
                            <div className="text-[10px] font-bold text-gray-400">{booking.customerPhone || 'بدون رقم'}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-gray-700 dark:text-slate-300">{booking.buildingName}</div>
                            <div className="text-[10px] font-black text-primary">شقة {booking.apartmentNumber}</div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black">
                              {booking.serviceType}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-gray-700 dark:text-slate-300">{format(safeToDate(booking.date), 'yyyy/MM/dd')}</div>
                            <div className="text-[10px] font-black text-gray-400">{booking.time}</div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black",
                              booking.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" :
                              booking.status === 'cancelled' ? "bg-rose-100 text-rose-600" :
                              "bg-amber-100 text-amber-600"
                            )}>
                              {booking.status === 'confirmed' ? 'مؤكد' : 
                               booking.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                            </span>
                          </td>
                          <td className="px-6 py-5 uppercase font-black text-[10px] text-gray-400">
                            {booking.language}
                          </td>
                          <td className="px-6 py-5 rounded-l-3xl">
                            <div className="flex items-center gap-2">
                              {booking.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                                    title="تأكيد"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button 
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-colors"
                                    title="إلغاء"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => deleteBooking(booking.id)}
                                className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-rose-600 rounded-xl transition-colors"
                                title="حذف"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {bookings.length === 0 && (
                    <div className="py-20 text-center opacity-20">
                      <Calendar size={48} className="mx-auto mb-3" />
                      <p className="text-sm font-black">لا توجد حجوزات حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Staff Management Tab */}
          {activeTab === 'staff' && (
            <div className="space-y-8 mb-10">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                      <UserIcon className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        إدارة العمالة
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">متابعة مهام العمالة وتوثيق العمل بالصور لليوم {format(new Date(), 'yyyy/MM/dd')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsPrintingStaff(true)}
                      className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border dark:border-slate-700 rounded-2xl font-black text-sm shadow-sm transition-all"
                    >
                      <Printer size={18} />
                      طباعة التقرير
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleShareAsImage}
                      className="flex items-center gap-3 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 dark:shadow-none hover:bg-primary/90 transition-all"
                    >
                      <ImageIcon size={18} />
                      مشاركة الجدول كصورة
                    </motion.button>
                  </div>
                </div>

                <div id="schedule-grid" ref={scheduleRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {requests
                    .filter(r => r.serviceType === 'تنظيف سيارات' && isSameDay(safeToDate(r.date), globalSelectedDate))
                    .sort((a, b) => safeToDate(a.date).getTime() - safeToDate(b.date).getTime())
                    .map((request) => (
                      <motion.div 
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-transparent hover:border-primary/30 dark:hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
                              <Car className="text-primary" size={20} />
                            </div>
                            <div>
                              <h4 className="font-black text-gray-900 dark:text-white">شقة {request.apartmentNumber}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{request.buildingName}</p>
                            </div>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black",
                            request.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {request.status === 'completed' ? 'تم التنفيذ' : 'قيد التنفيذ'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">قبل التنظيف</p>
                            <div className="relative aspect-video bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 overflow-hidden group/photo">
                              {request.beforePhotoUrl ? (
                                <>
                                  <img src={request.beforePhotoUrl} alt="Before" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <button 
                                      onClick={() => {
                                        const text = `📸 صورة "قبل التنظيف" لشقة ${request.apartmentNumber}:\n${request.beforePhotoUrl}`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                      }}
                                      className="p-2 bg-[#25D366] text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center gap-2 text-[10px] font-black"
                                    >
                                      <MessageCircle size={16} />
                                      مشاركة واتساب
                                    </button>
                                    <label className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl cursor-pointer hover:scale-110 transition-transform flex items-center gap-2 text-[10px] font-black">
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(request.id, e.target.files[0], 'before')}
                                      />
                                      <Upload size={16} />
                                      تغيير الصورة
                                    </label>
                                  </div>
                                </>
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(request.id, e.target.files[0], 'before')}
                                  />
                                  <Camera size={24} />
                                  <span className="text-[10px] font-bold">إضافة صورة</span>
                                </label>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">بعد التنظيف</p>
                            <div className="relative aspect-video bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 overflow-hidden group/photo">
                              {request.afterPhotoUrl ? (
                                <>
                                  <img src={request.afterPhotoUrl} alt="After" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <button 
                                      onClick={() => {
                                        const text = `📸 صورة "بعد التنظيف" لشقة ${request.apartmentNumber}:\n${request.afterPhotoUrl}`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                      }}
                                      className="p-2 bg-[#25D366] text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center gap-2 text-[10px] font-black"
                                    >
                                      <MessageCircle size={16} />
                                      مشاركة واتساب
                                    </button>
                                    <label className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl cursor-pointer hover:scale-110 transition-transform flex items-center gap-2 text-[10px] font-black">
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(request.id, e.target.files[0], 'after')}
                                      />
                                      <Upload size={16} />
                                      تغيير الصورة
                                    </label>
                                  </div>
                                </>
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(request.id, e.target.files[0], 'after')}
                                  />
                                  <Camera size={24} />
                                  <span className="text-[10px] font-bold">إضافة صورة</span>
                                </label>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateStatus(request.id, 'status', request.status === 'completed' ? 'pending' : 'completed')}
                            className={cn(
                              "flex-1 py-3 rounded-2xl font-black text-xs transition-all",
                              request.status === 'completed' 
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none" 
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                            )}
                          >
                            {request.status === 'completed' ? 'تم الانتهاء بنجاح' : 'تحديد كمكتمل'}
                          </button>
                          
                          <button
                            onClick={() => {
                              const statusText = request.status === 'completed' ? '✅ تم التنفيذ' : '⏳ قيد التنفيذ';
                              const beforePhoto = request.beforePhotoUrl ? `\n📸 صورة قبل: ${request.beforePhotoUrl}` : '';
                              const afterPhoto = request.afterPhotoUrl ? `\n📸 صورة بعد: ${request.afterPhotoUrl}` : '';
                              const text = `🚗 تفاصيل مهمة غسيل سيارة:\n\n🏢 المبنى: ${request.buildingName}\n🏠 الشقة: ${request.apartmentNumber}\n📊 الحالة: ${statusText}${beforePhoto}${afterPhoto}\n\n📝 ملاحظات: ${request.notes || 'لا يوجد'}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="p-3 bg-[#25D366] text-white rounded-2xl shadow-lg hover:bg-[#128C7E] transition-all flex items-center justify-center"
                            title="مشاركة المهمة عبر واتساب"
                          >
                            <MessageCircle size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  
                  {requests.filter(r => r.serviceType === 'تنظيف سيارات' && isSameDay(safeToDate(r.date), globalSelectedDate)).length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-700">
                      <Car size={48} className="mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-black text-gray-400">لا توجد سيارات مجدولة للغسيل في هذا اليوم</h3>
                      <p className="text-sm text-gray-400 font-bold mt-1">سيظهر جدول العمل هنا بمجرد إضافة طلبات جديدة</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Property Management Tabs */}
          {activeTab === 'property-units' && (
            <div className="space-y-8 mb-10">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                      <Home className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        إدارة الوحدات السكنية
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">متابعة حالة الشقق والمستأجرين في جميع المباني</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {selectedAptIds.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl mr-2"
                      >
                        <span className="text-[10px] font-black text-blue-500">{selectedAptIds.length} محددة</span>
                        <button 
                          onClick={() => setSelectedAptIds([])}
                          className="text-[10px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-white"
                        >
                          إلغاء
                        </button>
                        <div className="w-px h-4 bg-blue-500/20 mx-1" />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={deleteSelectedApartments}
                          className="text-[10px] font-black text-rose-500 hover:text-rose-600 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          حذف المحدد
                        </motion.button>
                      </motion.div>
                    )}

                    <div className="relative group mr-4 flex items-center gap-3">
                      {/* Building Filter */}
                      <select 
                        value={aptBuildingFilter}
                        onChange={(e) => setAptBuildingFilter(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-[10px] font-black focus:ring-2 focus:ring-primary outline-none shadow-sm cursor-pointer"
                      >
                        <option value="all">كل المباني</option>
                        {PROPERTY_BUILDINGS.map(pb => (
                          <option key={pb.id} value={pb.id}>{pb.name}</option>
                        ))}
                      </select>

                      {/* Status Filter */}
                      <select 
                        value={aptStatusFilter}
                        onChange={(e) => setAptStatusFilter(e.target.value as any)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-[10px] font-black focus:ring-2 focus:ring-primary outline-none shadow-sm cursor-pointer"
                      >
                        <option value="all">كل الحالات</option>
                        <option value="vacant">شاغرة</option>
                        <option value="occupied">مشغولة</option>
                      </select>

                      <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                          type="text"
                          placeholder="بحث برقم الشقة أو المبنى..."
                          className="w-64 pr-12 pl-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary transition-all outline-none shadow-sm"
                          value={aptSearch}
                          onChange={(e) => setAptSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearAllApartments}
                      className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      <span>حذف كافة الوحدات</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => downloadApartmentTemplate()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                    >
                      <Download size={18} />
                      نموذج الوحدات
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => aptFileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all"
                    >
                      <Upload size={18} />
                      استيراد وحدات
                    </motion.button>
                    <input 
                      type="file" 
                      ref={aptFileInputRef} 
                      onChange={handleImportApartments} 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                    />

                    {apartments.length === 0 && isAdmin && (
                      <button 
                        onClick={initializePropertyData}
                        className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                      >
                        تهيئة بيانات العقارات
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {apartments
                    .filter(apt => {
                      const b = PROPERTY_BUILDINGS.find(pb => pb.id === apt.buildingId);
                      const searchLower = aptSearch.toLowerCase();
                      
                      // Search check
                      const matchesSearch = apt.number.includes(aptSearch) || 
                                           (b?.name || '').toLowerCase().includes(searchLower);
                      
                      // Status check
                      const matchesStatus = aptStatusFilter === 'all' || apt.status === aptStatusFilter;
                      
                      // Building check
                      const matchesBuilding = aptBuildingFilter === 'all' || apt.buildingId === aptBuildingFilter;

                      return matchesSearch && matchesStatus && matchesBuilding;
                    })
                    .sort((a, b) => {
                      const b1 = PROPERTY_BUILDINGS.findIndex(pb => pb.id === a.buildingId);
                      const b2 = PROPERTY_BUILDINGS.findIndex(pb => pb.id === b.buildingId);
                      if (b1 !== b2) return b1 - b2;
                      return a.number.localeCompare(b.number);
                    }).map(apt => {
                    const b = PROPERTY_BUILDINGS.find(pb => pb.id === apt.buildingId);
                    const tenant = (apt.tenantId ? tenants.find(t => t.id === apt.tenantId) : null) || tenants.find(t => t.apartmentId === apt.id);
                    const num = apt.number;
                    const floor = Math.floor(parseInt(num) / 100);
                    
                    return (
                      <motion.div 
                        key={apt.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        onClick={() => {
                          if (apt.status === 'occupied' && tenant) {
                            setTenantSearch(tenant.name);
                            setActiveTab('tenants');
                          } else if (apt.status === 'vacant') {
                            setEditingTenant(null);
                            setTenantForm({
                              name: '',
                              nationality: '',
                              phone: '',
                              company: '',
                              idNumber: '',
                              contractValue: 0,
                              paymentFrequency: 'monthly',
                              paymentMethod: 'cash',
                              buildingName: b?.name || '',
                              apartmentId: apt.id,
                              aptNumber: num
                            } as any);
                            setIsTenantModalOpen(true);
                          }
                        }}
                        className={cn(
                          "relative rounded-[2.5rem] p-6 flex flex-col items-center justify-between transition-all cursor-pointer border min-h-[340px]",
                          "bg-[#111827] dark:bg-[#030712] border-slate-800 shadow-2xl overflow-hidden group"
                        )}
                      >
                        <motion.button
                          whileHover={{ scale: 1.2, backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteApartment(apt.id, apt.number);
                          }}
                          className="absolute top-6 left-6 z-30 p-2.5 text-rose-400 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:text-rose-500 transition-all shadow-lg backdrop-blur-sm"
                          title="حذف الوحدة"
                        >
                          <Trash2 size={18} />
                        </motion.button>

                        {/* Selection Checkbox */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAptSelection(apt.id);
                          }}
                          className={cn(
                            "absolute top-6 left-20 z-30 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer",
                            selectedAptIds.includes(apt.id) 
                              ? "bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                              : "bg-slate-800/50 border-slate-700/50 text-transparent hover:border-blue-500/50"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 transition-all",
                            selectedAptIds.includes(apt.id) ? "bg-white border-white scale-110" : "border-slate-600"
                          )} />
                        </div>

                        {/* Status Pill */}
                        <div className="absolute top-6 right-6 z-20">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const newStatus = apt.status === 'vacant' ? 'occupied' : 'vacant';
                              try {
                                await updateDoc(doc(db, 'apartments', apt.id), { 
                                  status: newStatus,
                                  updatedAt: serverTimestamp() 
                                });
                                toast.success(`تم تغيير الحالة إلى ${newStatus === 'vacant' ? 'شاغرة' : 'مشغولة'}`);
                              } catch (error) {
                                toast.error('خطأ في تحديث الحالة');
                              }
                            }}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg",
                              apt.status === 'occupied' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                              apt.status === 'maintenance' ? "bg-rose-500 text-white shadow-rose-500/20" :
                              "bg-blue-500 text-white shadow-blue-500/20"
                            )}
                          >
                            {apt.status === 'occupied' ? 'مشغولة' : apt.status === 'maintenance' ? 'صيانة' : 'شاغرة'}
                          </button>
                        </div>

                        {/* Buildling/Icon Header */}
                        <div className="flex flex-col items-center gap-2 mt-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                            <HomeIcon size={24} className="text-slate-400" />
                          </div>
                          <div className="text-center">
                            <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">North Residence</h4>
                            <p className="text-[10px] font-bold text-slate-600 mt-0.5">{b?.name || 'مبنى'}</p>
                          </div>
                        </div>

                        {/* Giant Unit Number */}
                        <div className="relative my-4">
                          <span className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] leading-none block">
                            {num}
                          </span>
                          {/* Subtle Glow Effect */}
                          <div className="absolute inset-0 bg-blue-500/5 blur-[40px] rounded-full -z-10" />
                        </div>

                        {/* Floor/Type Badges */}
                        <div className="flex gap-2">
                          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-slate-400">
                            شقة
                          </div>
                          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-slate-400">
                            الدور {floor}
                          </div>
                        </div>

                        {/* Tenant Info */}
                        <div className="w-full text-center mt-3">
                          <p className="text-[11px] font-bold text-slate-300 truncate h-4">
                            {tenant ? tenant.company || tenant.name : 'شاغرة حالياً'}
                          </p>
                        </div>

                        {/* Action Icons Row */}
                        <div className="flex items-center gap-4 mt-6">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (tenant?.phone) {
                                window.open(`https://wa.me/${tenant.phone.replace(/\s+/g, '')}`, '_blank');
                              } else {
                                toast.error('لا يوجد رقم هاتف مسجل لهذا الساكن');
                              }
                            }}
                            className={cn(
                              "w-10 h-10 rounded-2xl border flex flex-col items-center justify-center group/btn transition-all cursor-pointer",
                              tenant?.phone 
                                ? "bg-green-500/10 border-green-500/20 hover:bg-green-500/20" 
                                : "bg-white/5 border-white/5 opacity-40 grayscale"
                            )}
                            title={tenant?.phone ? `واتساب: ${tenant.phone}` : "لا يوجد رقم هاتف"}
                          >
                            <MessageCircle size={14} className={tenant?.phone ? "text-green-400" : "text-slate-500"} />
                            <span className={cn(
                              "text-[7px] font-black mt-1",
                              tenant?.phone ? "text-green-500/70" : "text-slate-600"
                            )}>WHATSAPP</span>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex flex-col items-center justify-center group/btn hover:bg-emerald-500/30 transition-colors">
                            <UserCheck size={18} className="text-emerald-400" />
                            <span className="text-[8px] font-black mt-1 text-emerald-500/70">CHECK IN</span>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center group/btn hover:bg-white/10 transition-colors">
                            <Sparkles size={14} className="text-slate-500 group-hover/btn:text-emerald-400 transition-colors" />
                            <span className="text-[7px] font-black mt-1 text-slate-600">CLEAN</span>
                          </div>
                        </div>

                        {/* Footer Button */}
                        <div onClick={(e) => {
                          e.stopPropagation();
                          // Simulated doorbell
                        }} className="w-full mt-6 py-4 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group/door">
                          <span className="text-[10px] font-black tracking-widest text-slate-400 group-hover/door:text-white transition-colors uppercase">Doorbell</span>
                          <div className="relative">
                            <Bell size={16} className="text-slate-500 group-hover/door:text-white transition-colors" />
                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tenants' && (
            <div className="space-y-8 mb-10">
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: 'إجمالي الوحدات', value: apartments.length || 150, icon: Home, color: 'slate' },
                  { label: 'المؤجرة', value: tenants.length, icon: Users, color: 'blue' },
                  { label: 'الشاغرة', value: apartments.filter(a => a.status === 'vacant').length, icon: AlertCircle, color: 'amber' },
                  { label: 'غرفة وصالة', value: apartments.filter(a => a.roomType === 'غرفة و صالة').length, icon: Layout, color: 'slate' },
                  { label: 'غرفتين وصالة', value: apartments.filter(a => a.roomType === 'غرفتين و صالة').length, icon: LayoutDashboard, color: 'slate' },
                  { label: 'نسبة الإشغال', value: `${apartments.length > 0 ? Math.round((tenants.length / apartments.length) * 100) : 0}%`, icon: PieChart, color: 'blue' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      stat.color === 'slate' ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" :
                      stat.color === 'blue' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                      stat.color === 'amber' ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" :
                      "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                    )}>
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">{stat.label}</p>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">{stat.value}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-primary/20 dark:shadow-none">
                    <Users className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">إدارة العقود</h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">قائمة بجميع العقود الحالية وتفاصيل المستأجرين</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex bg-gray-200 dark:bg-slate-800 p-1.5 rounded-[1.5rem] font-cairo">
                    <button 
                      onClick={() => setTenantFilter('active')}
                      className={cn(
                        "px-8 py-3 rounded-2xl font-black text-xs transition-all",
                        tenantFilter === 'active' ? "bg-white dark:bg-slate-700 text-primary shadow-lg shadow-gray-200/50" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      العقود النشطة
                    </button>
                    <button 
                      onClick={() => setTenantFilter('archived')}
                      className={cn(
                        "px-8 py-3 rounded-2xl font-black text-xs transition-all",
                        tenantFilter === 'archived' ? "bg-white dark:bg-slate-700 text-rose-500 shadow-lg shadow-gray-200/50" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      الأرشيف
                    </button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setEditingTenant(null);
                      setTenantForm({
                        name: '',
                        nationality: '',
                        phone: '',
                        company: '',
                        idNumber: '',
                        contractValue: 0,
                        collectedAmount: 0,
                        paymentFrequency: 'monthly',
                        paymentMethod: 'cash',
                        status: 'active'
                      } as any);
                      setIsTenantModalOpen(true);
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[2rem] font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all font-cairo"
                  >
                    <Plus size={20} />
                    <span>إضافة عقد جديد</span>
                  </motion.button>
                </div>
              </div>

                <div className="p-8 border-b dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/50 dark:bg-slate-900/50 rounded-t-[2.5rem]">
                  <div className="relative flex-1 max-w-xl">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                    <input 
                      type="text"
                      placeholder="البحث باسم المستأجر، رقم الشفة أو الجوال..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full pr-14 pl-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl text-base font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all shadow-sm font-cairo"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <select
                      value={tenantBuildingFilter}
                      onChange={(e) => setTenantBuildingFilter(e.target.value)}
                      className="px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-gray-700 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all shadow-sm font-cairo outline-none"
                    >
                      <option value="all">كل المباني</option>
                      {PROPERTY_BUILDINGS.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 px-6 py-3.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-2xl font-black text-sm border-2 border-emerald-100 dark:border-emerald-900/20 hover:bg-emerald-100 transition-all font-cairo"
                    >
                      <Upload size={20} />
                      استيراد
                    </motion.button>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-slate-800/30">
                        <th 
                          onClick={() => {
                            if (tenantSortField === 'name') setTenantSortDirection(tenantSortDirection === 'asc' ? 'desc' : 'asc');
                            else { setTenantSortField('name'); setTenantSortDirection('asc'); }
                          }}
                          className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] font-cairo cursor-pointer hover:text-primary transition-colors text-right"
                        >
                          <div className="flex items-center gap-2">
                             المستأجر
                             {tenantSortField === 'name' && (tenantSortDirection === 'asc' ? <ChevronRight size={14} className="-rotate-90" /> : <ChevronRight size={14} className="rotate-90" />)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (tenantSortField === 'aptNumber') setTenantSortDirection(tenantSortDirection === 'asc' ? 'desc' : 'asc');
                            else { setTenantSortField('aptNumber'); setTenantSortDirection('asc'); }
                          }}
                          className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] font-cairo cursor-pointer hover:text-primary transition-colors text-right"
                        >
                          <div className="flex items-center gap-2">
                             الوحدة
                             {tenantSortField === 'aptNumber' && (tenantSortDirection === 'asc' ? <ChevronRight size={14} className="-rotate-90" /> : <ChevronRight size={14} className="rotate-90" />)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (tenantSortField === 'contractValue') setTenantSortDirection(tenantSortDirection === 'asc' ? 'desc' : 'asc');
                            else { setTenantSortField('contractValue'); setTenantSortDirection('asc'); }
                          }}
                          className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] font-cairo cursor-pointer hover:text-primary transition-colors text-right"
                        >
                          <div className="flex items-center gap-2">
                             الوضع المالي
                             {tenantSortField === 'contractValue' && (tenantSortDirection === 'asc' ? <ChevronRight size={14} className="-rotate-90" /> : <ChevronRight size={14} className="rotate-90" />)}
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (tenantSortField === 'startDate') setTenantSortDirection(tenantSortDirection === 'asc' ? 'desc' : 'asc');
                            else { setTenantSortField('startDate'); setTenantSortDirection('asc'); }
                          }}
                          className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] font-cairo cursor-pointer hover:text-primary transition-colors text-right"
                        >
                          <div className="flex items-center gap-2">
                             تاريخ العقد
                             {tenantSortField === 'startDate' && (tenantSortDirection === 'asc' ? <ChevronRight size={14} className="-rotate-90" /> : <ChevronRight size={14} className="rotate-90" />)}
                          </div>
                        </th>
                        <th className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] font-cairo text-right">الحالة</th>
                        <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] text-center font-cairo">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {tenants
                        .filter(t => (t.status || 'active') === tenantFilter)
                        .filter(t => {
                          if (tenantBuildingFilter === 'all') return true;
                          const apt = apartments.find(a => a.id === t.apartmentId);
                          return apt?.buildingId === tenantBuildingFilter;
                        })
                        .filter(t => {
                          if (!tenantSearch) return true;
                          const search = tenantSearch.toLowerCase();
                          const apt = apartments.find(a => a.id === t.apartmentId);
                          return t.name.toLowerCase().includes(search) || 
                                 t.phone.includes(search) || 
                                 t.idNumber.includes(search) ||
                                 apt?.number.toString().includes(search);
                        })
                        .sort((a, b) => {
                          let valA: any = a[tenantSortField as keyof Tenant];
                          let valB: any = b[tenantSortField as keyof Tenant];

                          if (tenantSortField === 'aptNumber') {
                            const aptA = apartments.find(apt => apt.id === a.apartmentId);
                            const aptB = apartments.find(apt => apt.id === b.apartmentId);
                            valA = aptA?.number || 0;
                            valB = aptB?.number || 0;
                          }

                          if (valA < valB) return tenantSortDirection === 'asc' ? -1 : 1;
                          if (valA > valB) return tenantSortDirection === 'asc' ? 1 : -1;
                          return 0;
                        })
                        .map((tenant) => {
                        const apt = apartments.find(a => a.id === tenant.apartmentId);
                        const building = PROPERTY_BUILDINGS.find(b => b.id === apt?.buildingId);
                        const daysLeft = differenceInDays(safeToDate(tenant.endDate), new Date());
                        const collected = tenant.collectedAmount || 0;
                        const value = tenant.contractValue || 1;
                        const progress = Math.min(100, Math.max(0, (collected / value) * 100));
                        const statusColor = daysLeft < 0 ? "bg-rose-50 text-rose-600" : daysLeft <= 30 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600";

                        return (
                          <motion.tr 
                            key={tenant.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-all font-cairo border-b last:border-0"
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-6 justify-end">
                                <div className="text-right">
                                  <div className="font-black text-gray-900 dark:text-white text-xl leading-tight group-hover:text-primary transition-colors">{tenant.name}</div>
                                  <div className="text-[12px] font-bold text-gray-400 mt-2 flex items-center gap-2 justify-end">
                                    <Phone size={14} className="text-slate-300" />
                                    <span>{tenant.phone}</span>
                                    <span className="opacity-30 mx-1">•</span>
                                    <div className="w-5 h-5 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                                      <Sparkles size={10} />
                                    </div>
                                  </div>
                                </div>
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-primary font-black text-2xl shadow-sm border border-blue-100/50 dark:border-blue-900/30">
                                  {tenant.name.charAt(0)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex flex-col gap-2 items-end">
                                <div className="text-lg font-black text-gray-900 dark:text-white">شقة {apt?.number}</div>
                                <div className="text-[10px] font-black text-primary bg-primary/5 px-4 py-1.5 rounded-xl border border-primary/10 tracking-[0.1em]">{building?.name || 'مبنى'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-8">
                              <div className="w-56 space-y-3">
                                <div className="flex justify-between items-end">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">التحصيل {progress.toFixed(0)}%</span>
                                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800">
                                      {tenant.collectedAmount?.toLocaleString()} ر.س
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">التكلفة</span>
                                    <span className="text-xs font-black text-gray-600 dark:text-gray-400">
                                      {tenant.contractValue?.toLocaleString()} ر.س
                                    </span>
                                  </div>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className={cn(
                                      "h-full rounded-full transition-all duration-1000 relative",
                                      progress > 90 ? "bg-emerald-500" : progress > 50 ? "bg-primary" : "bg-amber-500"
                                    )}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                                  </motion.div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-8">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 bg-gray-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700 w-fit">
                                  <Calendar size={12} className="opacity-50" />
                                  <span>{format(safeToDate(tenant.startDate), 'yyyy/MM/dd')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/10 px-2.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/20 w-fit">
                                  <Calendar size={12} className="opacity-50" />
                                  <span>{format(safeToDate(tenant.endDate), 'yyyy/MM/dd')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-8">
                              <span className={cn("px-4 py-2.5 rounded-2xl text-[10px] font-black border tracking-widest uppercase flex items-center gap-2 w-fit", statusColor)}>
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", daysLeft < 0 ? "bg-rose-500" : daysLeft <= 30 ? "bg-amber-500" : "bg-emerald-500")} />
                                {daysLeft < 0 ? 'منتهي' : `${daysLeft} يوم متبقي`}
                              </span>
                            </td>
                            <td className="px-8 py-8">
                              <div className="flex items-center justify-center gap-3">
                                <motion.button
                                  whileHover={{ scale: 1.1, translateY: -2 }}
                                  onClick={() => {
                                    setEditingTenant(tenant);
                                    setTenantForm(tenant);
                                    setIsTenantModalOpen(true);
                                  }}
                                  className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-blue-600 border border-blue-50 bg-blue-50/40 hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                                  title="تعديل"
                                >
                                  <Pencil size={18} strokeWidth={2.5} />
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.1, translateY: -2 }}
                                  onClick={() => {
                                    setMovingTenant(tenant);
                                    setIsMoveModalOpen(true);
                                  }}
                                  className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-purple-600 border border-purple-50 bg-purple-50/40 hover:bg-purple-100 hover:border-purple-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                                  title="نقل إلى شقة أخرى"
                                >
                                  <ArrowRightLeft size={18} strokeWidth={2.5} />
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.1, translateY: -2 }}
                                  onClick={() => {
                                    setSelectedTenantForPayments(tenant);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-slate-600 border border-slate-100 bg-slate-50/40 hover:bg-slate-100 hover:border-slate-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                                  title="سجل المدفوعات"
                                >
                                  <DollarSign size={18} strokeWidth={2.5} />
                                </motion.button>
                                
                                {tenant.status !== 'archived' && (
                                  <motion.button
                                    whileHover={{ scale: 1.1, translateY: -2 }}
                                    onClick={async () => {
                                      if (confirm('هل أنت متأكد من أرشفة هذا العقد؟ سيتم إخلاء الشقة تلقائياً.')) {
                                        try {
                                          await updateDoc(doc(db, 'tenants', tenant.id), { status: 'archived' });
                                          if (tenant.apartmentId) {
                                            await updateDoc(doc(db, 'apartments', tenant.apartmentId), { 
                                              status: 'vacant',
                                              tenantId: deleteField()
                                            });
                                          }
                                          toast.success('تمت أرشفة العقد بنجاح');
                                        } catch (error) {
                                          console.error(error);
                                          toast.error('حدث خطأ أثناء الأرشفة');
                                        }
                                      }
                                    }}
                                    className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-amber-600 border border-amber-50 bg-amber-50/40 hover:bg-amber-100 hover:border-amber-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                                    title="أرشفة"
                                  >
                                    <Archive size={18} strokeWidth={2.5} />
                                  </motion.button>
                                )}

                                <motion.button
                                  whileHover={{ scale: 1.1, translateY: -2 }}
                                  onClick={async () => {
                                    if (confirm('هل أنت متأكد من حذف هذا المستأجر نهائياً؟')) {
                                      try {
                                        await deleteDoc(doc(db, 'tenants', tenant.id));
                                        if (tenant.apartmentId) {
                                          await updateDoc(doc(db, 'apartments', tenant.apartmentId), { 
                                            status: 'vacant', 
                                            tenantId: deleteField()
                                          });
                                        }
                                        toast.success('تم حذف البيانات بنجاح');
                                      } catch (error) {
                                        console.error(error);
                                        toast.error('حدث خطأ أثناء الحذف');
                                      }
                                    }
                                  }}
                                  className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-rose-600 border border-rose-50 bg-rose-50/40 hover:bg-rose-100 hover:border-rose-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                                  title="حذف"
                                >
                                  <Trash2 size={18} strokeWidth={2.5} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {tenants.filter(t => (t.status || 'active') === tenantFilter).length === 0 && (
                    <div className="py-20 text-center opacity-20 font-cairo">
                      <Archive size={48} className="mx-auto mb-3" />
                      <p className="text-sm font-black">لا توجد عقود مسجلة هنا</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'property-alerts' && (
            <div className="space-y-8 mb-10">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none">
                      <Bell className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        تنبيهات العقود
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">متابعة العقود التي قاربت على الانتهاء (خلال 30 يوم)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getExpiringContracts(30).map(tenant => {
                    const apt = apartments.find(a => a.id === tenant.apartmentId);
                    const building = PROPERTY_BUILDINGS.find(b => b.id === apt?.buildingId);
                    const daysLeft = differenceInDays(safeToDate(tenant.endDate), new Date());
                    const color = daysLeft < 0 ? "rose" : daysLeft <= 7 ? "rose" : "amber";

                    return (
                      <motion.div 
                        key={tenant.id}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 flex flex-col gap-4 transition-all",
                          color === 'rose' ? "bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/20" : "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            color === 'rose' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                          )}>
                            <AlertCircle size={20} />
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black",
                            color === 'rose' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {daysLeft < 0 ? 'منتهي' : `${daysLeft} يوم متبقي`}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="font-black text-gray-900 dark:text-white">{tenant.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">
                            {building?.name} • شقة {apt?.number}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="text-[10px] font-bold text-gray-500">تاريخ الانتهاء:</div>
                          <div className="text-xs font-black text-gray-700 dark:text-slate-300">
                            {format(safeToDate(tenant.endDate), 'yyyy/MM/dd')}
                          </div>
                        </div>

                        <button 
                          onClick={() => window.open(`https://wa.me/${tenant.phone}?text=${encodeURIComponent(`عزيزي ${tenant.name}، نود تذكيركم بأن عقد إيجار الشقة رقم ${apt?.number} في ${building?.name} سينتهي بتاريخ ${format(safeToDate(tenant.endDate), 'yyyy/MM/dd')}. يرجى التواصل معنا للتجديد.`)}`, '_blank')}
                          className={cn(
                            "w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2",
                            color === 'rose' ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-amber-500 text-white hover:bg-amber-600"
                          )}
                        >
                          <MessageCircle size={16} />
                          تذكير عبر واتساب
                        </button>
                      </motion.div>
                    );
                  })}

                  {getExpiringContracts(30).length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-20">
                      <Bell size={48} className="mx-auto mb-3" />
                      <p className="text-sm font-black">لا توجد تنبيهات حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Today's Car Cleaning Alerts */}
          {activeTab === 'تنظيف سيارات' && activeTab !== 'staff' && (
            <div className="mb-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <Car className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      جدول غسيل السيارات
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      {format(new Date(), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
              </div>
              
              {filteredRequests.filter(req => isSameDay(safeToDate(req.date), globalSelectedDate)).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRequests
                    .filter(req => isSameDay(safeToDate(req.date), globalSelectedDate))
                    .map((req) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={req.id}
                        className={cn(
                          "p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all",
                          req.status === 'completed' 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400" 
                            : "bg-amber-50 border-amber-100 text-amber-800 shadow-lg shadow-amber-100/50 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400 dark:shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            req.status === 'completed' ? "bg-emerald-200 text-emerald-700" : "bg-amber-600 text-white"
                          )}>
                            <Car size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold opacity-70 mb-0.5">رقم اللوحة</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-black tracking-wider">{req.apartmentNumber}</p>
                              <span className="text-xs font-black bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-lg">{format(safeToDate(req.date), 'p', { locale: ar })}</span>
                            </div>
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid');
                              }}
                              className={cn(
                                "mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all",
                                req.paymentStatus === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}
                            >
                              {req.paymentStatus === 'paid' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {req.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                            </motion.div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const nextStatus = req.status === 'pending' ? 'completed' : 'pending';
                              updateStatus(req.id, 'status', nextStatus);
                            }}
                            className="text-left"
                          >
                            <p className="text-[10px] font-bold opacity-70 uppercase mb-1">الحالة</p>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all",
                              req.status === 'completed' ? "bg-green-200 text-green-800" : "bg-orange-200 text-orange-800"
                            )}>
                              {req.status === 'completed' ? '✓ تم التنفيذ' : '✕ لم يتم التنفيذ'}
                            </span>
                          </motion.button>
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                setEditingRequest(req);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-white/50 rounded-lg text-gray-500 transition-all"
                            >
                              <Pencil size={14} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setConfirmDeleteId(req.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-all"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  }
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-[2rem] border border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 font-bold">لا توجد سيارات مجدولة للغسيل اليوم</p>
                </div>
              )}
            </div>
          )}

          {/* Today's Apartment Cleaning Alerts (for North Cleaning) */}
          {activeTab === 'نظافة نورث' && (
            <div id="daily-apartment-schedule" className="mb-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <Home className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      جدول تنظيف الشقق اليومي
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      {format(new Date(), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
              </div>
              
              {requests.filter(req => 
                req.buildingName === 'نظافة نورث' && 
                req.serviceType !== 'تنظيف سيارات' && 
                req.serviceType !== 'توصيل مياه' &&
                isSameDay(safeToDate(req.date), globalSelectedDate)
              ).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requests
                    .filter(req => 
                      req.buildingName === 'نظافة نورث' && 
                      req.serviceType !== 'تنظيف سيارات' && 
                      req.serviceType !== 'توصيل مياه' &&
                      isSameDay(safeToDate(req.date), globalSelectedDate)
                    )
                    .map((req) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={req.id}
                        className={cn(
                          "p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all",
                          req.status === 'completed' 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400" 
                            : "bg-amber-50 border-amber-100 text-amber-800 shadow-lg shadow-amber-100/50 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400 dark:shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            req.status === 'completed' ? "bg-emerald-200 text-emerald-700" : "bg-amber-600 text-white"
                          )}>
                            <Home size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold opacity-70 mb-0.5">رقم الشقة</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-black tracking-wider">{req.apartmentNumber}</p>
                              <span className="text-xs font-black bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-lg">{format(safeToDate(req.date), 'p', { locale: ar })}</span>
                            </div>
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid');
                              }}
                              className={cn(
                                "mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all",
                                req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              )}
                            >
                              {req.paymentStatus === 'paid' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {req.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                            </motion.div>
                            <p className="text-[10px] font-bold opacity-60">{req.serviceType}</p>
                          </div>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const nextStatus = req.status === 'pending' ? 'completed' : 'pending';
                            updateStatus(req.id, 'status', nextStatus);
                          }}
                          className="text-left"
                        >
                          <p className="text-[10px] font-bold opacity-70 uppercase mb-1">الحالة</p>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all",
                            req.status === 'completed' ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"
                          )}>
                            {req.status === 'completed' ? '✓ تم التنفيذ' : '✕ لم يتم التنفيذ'}
                          </span>
                        </motion.button>
                      </motion.div>
                    ))
                  }
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-700 text-center">
                  <p className="text-gray-400 font-bold">لا توجد شقق مجدولة للتنظيف اليوم</p>
                </div>
              )}
            </div>
          )}

          {/* Requests Table/List/Calendar */}
          {activeTab !== 'طلبات الماء' && activeTab !== 'staff' && (
            <div className="bg-box dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
            <div className="p-8 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {viewMode === 'list' ? 'سجل الطلبات التفصيلي' : viewMode === 'summary' ? 'ملخص الشقق' : 'تقويم الطلبات'}
                </h3>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'list' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    عرض القائمة
                  </button>
                  <button 
                    onClick={() => setViewMode('summary')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'summary' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    ملخص الشقق
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'calendar' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    التقويم
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  مدفوع: {stats.paid}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  معلق: {stats.unpaid}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {viewMode === 'list' ? (
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-500 text-xs font-black uppercase tracking-widest text-center">
                      <th className="px-4 py-3">رقم الشقة</th>
                      <th className="px-4 py-3">الخدمة</th>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">العدد</th>
                      <th className="px-4 py-3">المبلغ</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3">التحصيل</th>
                      <th className="px-4 py-3">الإيصال</th>
                      <th className="px-4 py-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    <AnimatePresence mode="popLayout">
                      {Object.keys(groupedRequests).length > 0 ? (
                        Object.entries(groupedRequests).map(([key, groupData]) => {
                          const group = groupData as CleaningRequest[];
                          const sortedGroup = [...group].sort((a, b) => safeToDate(b.date).getTime() - safeToDate(a.date).getTime());
                          const displayReq = sortedGroup[0];
                          const hasMultiple = group.length > 1;

                          return (
                            <motion.tr 
                              key={key}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              whileHover={{ scale: 1.01 }}
                              className={cn(
                                "hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors text-center cursor-pointer",
                                hasMultiple && "bg-gray-50/50 dark:bg-slate-800/30"
                              )}
                              onClick={() => {
                                if (hasMultiple) {
                                  setSelectedHistoryGroup(sortedGroup);
                                }
                              }}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="bg-primary/10 dark:bg-primary/20 p-1.5 rounded-lg text-primary">
                                    <Home size={16} />
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">شقة {displayReq.apartmentNumber}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{displayReq.buildingName}</p>
                                    {hasMultiple && (
                                      <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 mt-1">
                                        <ListTodo size={10} />
                                        <span>{group.length} طلبات مسجلة</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-gray-700 dark:text-slate-300 text-sm">{displayReq.serviceType}</span>
                                {hasMultiple ? (
                                  <div className="text-[10px] text-indigo-500 font-black mt-1">
                                    انقر لعرض السجل الكامل
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-primary font-black mt-1">
                                    وقت الطلب: {displayReq.createdAt ? format(safeToDate(displayReq.createdAt), 'p', { locale: ar }) : '-'}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-medium text-gray-600 dark:text-slate-400">
                                  {hasMultiple ? 'سجل الطلبات' : format(safeToDate(displayReq.date), 'PPP', { locale: ar })}
                                </p>
                                {!hasMultiple && (
                                  <p className="text-[10px] text-gray-400 dark:text-slate-500">{format(safeToDate(displayReq.date), 'p', { locale: ar })}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-gray-700 dark:text-slate-300 text-sm">
                                  {hasMultiple ? '-' : (displayReq.serviceType === 'توصيل مياه' ? (displayReq.waterGallons || 0) : displayReq.monthsCount)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-base font-black text-primary">
                                  {hasMultiple ? group.reduce((sum, r) => sum + r.price, 0) : displayReq.price} ريال
                                </span>
                                {hasMultiple && <p className="text-[10px] text-gray-400 font-bold">إجمالي المبالغ</p>}
                              </td>
                              <td className="px-4 py-3">
                                {hasMultiple ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-orange-600">
                                      {group.filter(r => r.status === 'pending').length} قيد التنفيذ
                                    </span>
                                    <span className="text-[10px] font-bold text-green-600">
                                      {group.filter(r => r.status === 'completed').length} مكتمل
                                    </span>
                                  </div>
                                ) : (
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextStatus = displayReq.status === 'pending' ? 'completed' : 'pending';
                                      updateStatus(displayReq.id, 'status', nextStatus);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all mx-auto",
                                      displayReq.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : 
                                      "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                    )}
                                  >
                                    {displayReq.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                    {displayReq.status === 'completed' ? '✓ تم التنفيذ' : '✕ لم يتم التنفيذ'}
                                  </motion.button>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {hasMultiple ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-rose-600">
                                      {group.filter(r => r.paymentStatus === 'unpaid').length} لم يدفع
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-600">
                                      {group.filter(r => r.paymentStatus === 'paid').length} مدفوع
                                    </span>
                                  </div>
                                ) : (
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(displayReq.id, 'paymentStatus', displayReq.paymentStatus === 'unpaid' ? 'paid' : 'unpaid');
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all mx-auto",
                                      displayReq.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                    )}
                                  >
                                    <CreditCard size={12} />
                                    {displayReq.paymentStatus === 'paid' ? 'تم الدفع' : 'لم يدفع'}
                                  </motion.button>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {!hasMultiple && (
                                  <div className="flex items-center justify-center gap-1">
                                    <label className="cursor-pointer p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-primary transition-all">
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleReceiptUpload(displayReq.id, file);
                                        }}
                                      />
                                      <Upload size={18} />
                                    </label>
                                    {displayReq.receiptUrl && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(displayReq.receiptUrl, '_blank');
                                        }}
                                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-emerald-500 hover:text-emerald-600 transition-all"
                                      >
                                        <FileText size={18} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {hasMultiple ? (
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => setSelectedHistoryGroup(sortedGroup)}
                                      className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl text-[10px] font-black hover:bg-primary/20 transition-all"
                                    >
                                      عرض التفاصيل
                                    </motion.button>
                                  ) : (
                                    <>
                                      <motion.button 
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingRequest(displayReq);
                                          setIsModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-primary transition-all"
                                      >
                                        <Pencil size={18} />
                                      </motion.button>
                                      <motion.button 
                                        whileHover={{ scale: 1.1, rotate: -5 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRequest(displayReq);
                                        }}
                                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-primary transition-all"
                                      >
                                        <Printer size={18} />
                                      </motion.button>
                                      <motion.button 
                                        whileHover={{ scale: 1.1, color: "#ef4444" }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(displayReq.id);
                                        }}
                                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                      >
                                        <Trash2 size={18} />
                                      </motion.button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-20 text-center">
                            <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Search className="text-gray-300 dark:text-slate-600" size={32} />
                            </div>
                            <p className="text-gray-400 dark:text-slate-500 font-bold">لا توجد سجلات مطابقة</p>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              ) : viewMode === 'summary' ? (
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-500 text-sm font-black uppercase tracking-widest">
                      <th className="px-8 py-5">المبنى / الشقة</th>
                      <th className="px-8 py-5">عدد الطلبات</th>
                      <th className="px-8 py-5">حالة التنفيذ</th>
                      <th className="px-8 py-5">إجمالي المبلغ</th>
                      <th className="px-8 py-5">المبالغ المدفوعة</th>
                      <th className="px-8 py-5">المبالغ المعلقة</th>
                      <th className="px-8 py-5">الحالة العامة</th>
                      <th className="px-8 py-5">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {apartmentSummary.length > 0 ? (
                      apartmentSummary.map((apt) => (
                        <motion.tr 
                          key={`${apt.building}-${apt.apartment}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.005 }}
                          className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                        >
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-gray-900 dark:text-white text-lg">شقة {apt.apartment}</span>
                              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold">{apt.building}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary rounded-full text-sm font-bold">
                              {apt.count} طلبات
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                {apt.completed} منفذة
                              </span>
                              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                <Clock size={12} />
                                {apt.pending} قيد التنفيذ
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-bold text-gray-700 dark:text-slate-300">{apt.total} ريال</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{apt.paid} ريال</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-rose-600 dark:text-rose-400 font-bold">{apt.unpaid} ريال</span>
                          </td>
                          <td className="px-8 py-6">
                            {apt.unpaid === 0 ? (
                              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                <CheckCircle2 size={14} />
                                تم السداد
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold">
                                <Clock size={14} />
                                يوجد مبالغ معلقة
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setSelectedApartment({ building: apt.building, apartment: apt.apartment });
                                }}
                                className="px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl text-xs font-black hover:opacity-80 transition-all flex items-center gap-2"
                              >
                                <Eye size={14} />
                                عرض السجل
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من حذف جميع طلبات شقة ${apt.apartment} في ${apt.building}؟`)) {
                                    const aptReqs = requests.filter(r => r.buildingName === apt.building && r.apartmentNumber === apt.apartment);
                                    aptReqs.forEach(r => deleteRequest(r.id));
                                    toast.success('تم حذف جميع طلبات الشقة بنجاح');
                                  }
                                }}
                                className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:opacity-80 transition-all"
                                title="حذف جميع سجلات الشقة"
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <p className="text-gray-400 dark:text-slate-500 font-bold">لا توجد بيانات ملخصة</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="p-8">
                  <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                      <div key={day} className="bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {day}
                      </div>
                    ))}
                    {calendarDays.map((day, i) => {
                      const dayRequests = filteredRequests.filter(req => isSameDay(safeToDate(req.date), day));
                      const isCurrentMonth = isSameMonth(day, selectedMonth);
                      
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "bg-white dark:bg-slate-900 min-h-[140px] p-3 transition-colors hover:bg-primary/5 dark:hover:bg-primary/10",
                            !isCurrentMonth && "bg-gray-50/50 dark:bg-slate-950/50 opacity-40"
                          )}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={cn(
                              "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                              isToday(day) ? "bg-primary text-white" : "text-gray-500 dark:text-slate-400"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {dayRequests.length > 0 && (
                              <span className="text-[10px] bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary px-2 py-0.5 rounded-full font-black">
                                {dayRequests.length} طلبات
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayRequests.slice(0, 3).map(req => (
                              <div 
                                key={req.id}
                                className={cn(
                                  "text-[10px] p-1.5 rounded-lg font-bold truncate border",
                                  req.paymentStatus === 'paid' ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-400"
                                )}
                              >
                                شقة {req.apartmentNumber} - {req.serviceType}
                              </div>
                            ))}
                            {dayRequests.length > 3 && (
                              <div className="text-[9px] text-center text-gray-400 dark:text-slate-500 font-bold">
                                + {dayRequests.length - 3} أخرى
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </main>

        {/* FAB */}
        {activeTab !== 'staff' && (
          <motion.button 
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-10 left-10 bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl shadow-primary/30 hover:opacity-90 transition-all hover:scale-105 flex items-center gap-2 z-50"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="font-black text-sm">طلب جديد</span>
          </motion.button>
        )}

      {/* Modal */}
      <ApartmentDetailsModal 
        isOpen={!!selectedApartment}
        onClose={() => setSelectedApartment(null)}
        apartment={selectedApartment}
        requests={requests}
        onEdit={(req) => {
          setEditingRequest(req);
          setIsModalOpen(true);
          setSelectedApartment(null);
        }}
        onUpdateStatus={updateStatus}
        onPrint={setSelectedRequest}
        onPrintStatement={(filtered) => {
          setFilteredStatementRequests(filtered);
          setIsPrintingStatement(true);
        }}
        onBulkPrint={(reqs) => {
          setBulkPrintRequests(reqs);
          setIsPrintingBulk(true);
        }}
        onDelete={(id) => setConfirmDeleteId(id)}
      />

      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequest(null);
        }} 
        onSave={saveRequest}
        defaultBuilding={activeTab !== 'dashboard' && activeTab !== 'تنظيف سيارات' && activeTab !== 'طلبات الماء' && activeTab !== 'طلبات الصيانة' ? activeTab : undefined}
        defaultService={activeTab === 'تنظيف سيارات' ? 'تنظيف سيارات' : activeTab === 'طلبات الماء' ? 'توصيل مياه' : activeTab === 'طلبات الصيانة' ? 'صيانة' : undefined}
        initialData={editingRequest}
      />

      {/* Hidden Invoice for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {selectedRequest && <Invoice ref={invoiceRef} request={selectedRequest} />}
      </div>

      {/* Hidden Statement for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {isPrintingStatement && selectedApartment && (
          <Statement 
            ref={statementRef} 
            apartment={selectedApartment} 
            requests={filteredStatementRequests.length > 0 ? filteredStatementRequests : requests.filter(r => r.buildingName === selectedApartment.building && r.apartmentNumber === selectedApartment.apartment)} 
          />
        )}
      </div>

      {/* Hidden Report for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {isPrintingReport && (
          <Report 
            ref={reportRef} 
            requests={filteredRequests} 
            title={activeTab === 'dashboard' ? 'تقرير لوحة التحكم' : `تقرير ${activeTab}`}
          />
        )}
      </div>

      {/* Hidden Inventory Report for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {isPrintingInventory && (
          <InventoryReport 
            ref={inventoryReportRef} 
            inventory={inventory} 
            logs={inventoryLogs}
          />
        )}
      </div>

      {/* Hidden Staff Report for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {isPrintingStaff && (
          <StaffReport 
            ref={staffReportRef} 
            requests={requests.filter(r => r.serviceType === 'تنظيف سيارات' && isSameDay(safeToDate(r.date), globalSelectedDate))} 
            title={`تقرير عمالة - ${format(globalSelectedDate, 'PPP', { locale: ar })}`}
          />
        )}
      </div>

      {/* Hidden Bulk Invoices for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {isPrintingBulk && (
          <BulkInvoices 
            ref={bulkInvoicesRef} 
            requests={bulkPrintRequests} 
          />
        )}
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteRequest(confirmDeleteId)}
        title="تأكيد الحذف"
        message="هل أنت متأكد من رغبتك في حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
      />

      <ConfirmModal 
        isOpen={!!confirmDeleteLogId}
        onClose={() => setConfirmDeleteLogId(null)}
        onConfirm={() => confirmDeleteLogId && deleteInventoryLog(confirmDeleteLogId)}
        title="تأكيد حذف السجل"
        message="هل أنت متأكد من رغبتك في حذف هذا السجل من حركة المخزون؟"
      />

      <ConfirmModal 
        isOpen={!!confirmSaveData}
        onClose={() => setConfirmSaveData(null)}
        onConfirm={() => confirmSaveData && saveRequest(confirmSaveData)}
        title="تأكيد التعديل"
        message="هل أنت متأكد من رغبتك في حفظ التغييرات على هذا الطلب؟"
        confirmText="حفظ التغييرات"
        variant="primary"
        icon={Save}
      />

      <InventoryModal 
        isOpen={isInventoryModalOpen}
        onClose={() => {
          setIsInventoryModalOpen(false);
          setEditingInventoryItem(null);
        }}
        onSave={saveInventoryItem}
        initialData={editingInventoryItem}
      />

      <BrandingModal 
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        onSave={updateBranding}
        initialName={appName}
        initialLogo={appLogo}
        initialBackground={appBackground}
        initialThemeColor={themeColor}
        initialBgOpacity={bgOpacity}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      <ClubSubscriptionModal 
        isOpen={isClubSubscriptionModalOpen}
        onClose={() => {
          setIsClubSubscriptionModalOpen(false);
          setEditingClubSub(null);
          setNewClubSub({ monthsCount: 1, status: 'active' });
        }}
        onSave={addClubSubscription}
        newClubSub={newClubSub}
        setNewClubSub={setNewClubSub}
        onIdUpload={handleClubSubIdUpload}
        isEditing={!!editingClubSub}
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={filteredRequests}
      />

      <FinancialDashboardModal 
        isOpen={isFinancialDashboardOpen}
        onClose={() => setIsFinancialDashboardOpen(false)}
        tenants={tenants}
        apartments={apartments}
      />

      <TenantModal 
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        onSave={saveTenant}
        initialData={editingTenant}
        apartments={apartments}
      />

      <RentPaymentsModal 
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedTenantForPayments(null);
        }}
        tenant={selectedTenantForPayments}
        payments={tenantPayments}
        onAddPayment={addRentPayment}
        onUpdateStatus={updateRentPaymentStatus}
        onDeletePayment={deleteRentPayment}
        onGenerateSchedule={generatePaymentSchedule}
      />

      <MoveTenantModal 
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setMovingTenant(null);
        }}
        tenant={movingTenant}
        apartments={apartments}
        onMove={moveTenantToApartment}
      />

      {/* History Modal */}
      <AnimatePresence>
        {selectedHistoryGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistoryGroup(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <History size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">سجل الطلبات التفصيلي</h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold">شقة {selectedHistoryGroup[0].apartmentNumber} - {selectedHistoryGroup[0].buildingName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedHistoryGroup(null)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-4">
                  {selectedHistoryGroup.map((req) => (
                    <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                          {req.serviceType === 'تنظيف سيارات' ? <Car className="text-primary" size={24} /> : <Home className="text-primary" size={24} />}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white">{req.serviceType}</p>
                          <p className="text-xs font-bold text-gray-500 dark:text-slate-400">تاريخ التنفيذ: {format(safeToDate(req.date), 'PPP', { locale: ar })}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">السعر</p>
                          <p className="text-sm font-black text-primary">{req.price} ريال</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الحالة</p>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black",
                            req.status === 'completed' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {req.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                          </span>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الدفع</p>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black",
                            req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {req.paymentStatus === 'paid' ? 'مدفوع' : 'لم يدفع'}
                          </span>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الكمية</p>
                          <p className="text-sm font-black text-gray-700 dark:text-slate-300">
                            {req.serviceType === 'توصيل مياه' ? (req.waterGallons || 0) : req.monthsCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setEditingRequest(req);
                            setIsModalOpen(true);
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-[1.1rem] text-blue-600 border border-blue-50 bg-blue-50/40 hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                        >
                          <Pencil size={18} strokeWidth={2.5} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedRequest(req)}
                          className="w-10 h-10 flex items-center justify-center rounded-[1.1rem] text-slate-600 border border-slate-50 bg-slate-50/40 hover:bg-slate-100 hover:border-slate-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                        >
                          <Printer size={18} strokeWidth={2.5} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1, translateY: -2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setConfirmDeleteId(req.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-[1.1rem] text-rose-600 border border-rose-50 bg-rose-50/40 hover:bg-rose-100 hover:border-rose-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                        >
                          <Trash2 size={18} strokeWidth={2.5} />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end">
                <button 
                  onClick={() => setSelectedHistoryGroup(null)}
                  className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
