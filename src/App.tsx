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
  ChevronDown,
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
  Gamepad2,
  Pencil,
  ListTodo,
  CalendarCheck,
  CalendarPlus,
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
  MessageSquare,
  Send,
  Link as LinkIcon,
  Settings,
  XCircle,
  CheckCircle,
  Check,
  Palette,
  Edit2,
  Sun,
  Moon,
  TrendingUp,
  History,
  Wrench,
  Globe,
  Users,
  Ban,
  Bell,
  BellRing,
  ArrowRightLeft,
  Mic,
  MicOff,
  UserCheck,
  Sparkles,
  Home as HomeIcon,
  RotateCcw,
  Key,
  Lock,
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
  isBefore,
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
  isSubscription?: boolean;
  subscriptionEndDate?: Timestamp;
  subscriptionStartDate?: Timestamp;
  subscriptionSchedule?: number[]; // [0,1,2,3,4,5,6]
  subscriptionFrequency?: string;
  completedDates?: string[]; // array of 'YYYY-MM-DD'
  unitPrice?: number;
  car?: string;
  apartment?: string;
  subscriptionPayments?: {
    monthKey: string;     // e.g "2026-06"
    monthName: string;    // e.g "يونيو 2026"
    isPaid: boolean;
    amount: number;
    paidDate?: string;    // YYYY-MM-DD
  }[];
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
  phone?: string;
  notes?: string;
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
  secretCode?: string;
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
  { name: 'توصيل مياه', price: 10 },
  { name: 'حجز غرفة الألعاب', price: 50 }
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
  if (!timestamp) return new Date();
  if (typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (e) {
      // fallback
    }
  }
  if (typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

const getApartmentNum = (sub: CleaningRequest) => {
  if (sub.apartment) return sub.apartment;
  if (!sub.notes) return 'غير محدد';
  const match = sub.notes.match(/الشقة:\s*([^\s|]+)/);
  if (match) return match[1];
  return 'غير محدد';
};

const getCarName = (sub: CleaningRequest) => {
  if (sub.car) return sub.car;
  if (!sub.notes) return 'سيارة غير محددة';
  const match = sub.notes.match(/السيارة:\s*([^|]+)/);
  if (match) return match[1].trim();
  return sub.notes;
};

const getScheduleDaysArabic = (schedule?: number[]) => {
  if (!schedule || schedule.length === 0) return 'جميع الأيام';
  if (schedule.length === 7) return 'يومياً';
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return schedule.map(d => dayNames[d]).join(' - ');
};

// --- Components ---

const PublicBookingForm = ({ appName, logo }: { appName: string, logo: string | null }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [adminPhone, setAdminPhone] = useState('');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
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

  useEffect(() => {
    getDoc(doc(db, 'settings', 'branding')).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminPhone) {
          setAdminPhone(data.adminPhone);
        }
        if (data.whatsappGroupLink) {
          setWhatsappGroupLink(data.whatsappGroupLink);
        }
      }
    }).catch(err => console.error("Error loading branding in PublicBookingForm:", err));
  }, []);

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
      title: 'حجز الخدمات والمرافق',
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
      title: 'Service & Facility Booking',
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
    const handleNotifyAdmin = () => {
      const msg = lang === 'ar' 
        ? `*طلب حجز جديد 🔔*\n\n` +
          `• *الاسم:* ${formData.customerName}\n` +
          `• *رقم الجوال:* ${formData.customerPhone}\n` +
          `• *العقار:* ${formData.buildingName} - شقة ${formData.apartmentNumber}\n` +
          `• *الخدمة:* ${formData.serviceType}\n` +
          `• *التاريخ والوقت:* ${formData.date} في تمام الساعة ${formData.time}\n\n` +
          `[ تم تأكيد إرسال الطلب والدفع ]`
        : `*New Booking Request 🔔*\n\n` +
          `• *Name:* ${formData.customerName}\n` +
          `• *Phone:* ${formData.customerPhone}\n` +
          `• *Unit:* ${formData.buildingName} - Unit ${formData.apartmentNumber}\n` +
          `• *Service:* ${formData.serviceType}\n` +
          `• *Date/Time:* ${formData.date} at ${formData.time}\n\n` +
          `[ Request & Payment submitted successfully ]`;
      
      const cleanPhone = adminPhone.replace(/\s+/g, '').replace('+', '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleNotifyGroup = () => {
      const msg = lang === 'ar' 
        ? `*تأكيد دفع حجز جديد 🔔💰*\n\n` +
          `• *الاسم:* ${formData.customerName}\n` +
          `• *رقم الجوال:* ${formData.customerPhone}\n` +
          `• *العقار:* ${formData.buildingName} - شقة ${formData.apartmentNumber}\n` +
          `• *الخدمة:* ${formData.serviceType}\n` +
          `• *التاريخ والوقت:* ${formData.date} في تمام الساعة ${formData.time}\n\n` +
          `[ تم تأكيد إرسال الطلب وإرفاق إشعار الدفع ]`
        : `*Payment Confirmation for New Booking 🔔💰*\n\n` +
          `• *Name:* ${formData.customerName}\n` +
          `• *Phone:* ${formData.customerPhone}\n` +
          `• *Unit:* ${formData.buildingName} - Unit ${formData.apartmentNumber}\n` +
          `• *Service:* ${formData.serviceType}\n` +
          `• *Date/Time:* ${formData.date} at ${formData.time}\n\n` +
          `[ Request & Payment proof submitted successfully ]`;
      
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
          <div className="bg-green-100 p-5 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="text-green-500 w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black mb-4">{t.success}</h2>
          
          {whatsappGroupLink && (
            <div className="space-y-3 mb-4">
              <a 
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15"
              >
                <Users size={20} />
                {lang === 'ar' ? 'الانضمام لمجموعة تتبع الدفع (واتساب)' : 'Join Payment Tracking Group'}
              </a>
              
              <button 
                onClick={handleNotifyGroup} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                <MessageCircle size={20} />
                {lang === 'ar' ? 'أرسل إشعار الدفع إلى المجموعة' : 'Send Payment Message to Group'}
              </button>
            </div>
          )}

          {adminPhone && (
            <button 
              onClick={handleNotifyAdmin} 
              className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors text-white py-4 px-6 rounded-2xl font-black text-sm mb-4 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15"
            >
              <MessageCircle size={20} />
              {lang === 'ar' ? 'إرسال إشعار الدفع للمدير عبر الواتساب' : 'Notify Manager via WhatsApp'}
            </button>
          )}

          <button onClick={() => setIsSuccess(false)} className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-800 dark:text-slate-200 py-3 rounded-xl font-bold cursor-pointer">{t.newBooking}</button>
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

const PublicClubRenewalForm = ({ appName, logo, subId }: { appName: string, logo: string | null, subId: string | null }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [adminPhone, setAdminPhone] = useState('');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [monthsCount, setMonthsCount] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'branding')).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminPhone) {
          setAdminPhone(data.adminPhone);
        }
        if (data.whatsappGroupLink) {
          setWhatsappGroupLink(data.whatsappGroupLink);
        }
      }
    }).catch(err => console.error("Error loading branding in PublicClubRenewalForm:", err));
  }, []);

  useEffect(() => {
    async function fetchSub() {
      if (!subId) {
        setError(lang === 'ar' ? 'رابط تجديد غير صالح' : 'Invalid renewal link');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'clubSubscriptions', subId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ClubSubscription;
          setSubscription({ id: docSnap.id, ...data });
          
          setPhone(data.phone || '');
          
          const prevEndDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
          const tomorrowOfEnd = addDays(prevEndDate, 1);
          const today = new Date();
          const defaultStart = tomorrowOfEnd > today ? tomorrowOfEnd : today;
          setStartDate(format(defaultStart, 'yyyy-MM-dd'));
        } else {
          setError(lang === 'ar' ? 'الاشتراك غير موجود' : 'Subscription not found');
        }
      } catch (err) {
        console.error(err);
        setError(lang === 'ar' ? 'حدث خطأ أثناء تحميل بيانات الاشتراك' : 'Error loading subscription data');
      } finally {
        setLoading(false);
      }
    }
    fetchSub();
  }, [subId, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;
    setIsSubmitting(true);
    try {
      const pricePerMonth = 300;
      const amount = monthsCount * pricePerMonth;
      const start = new Date(startDate);
      const end = addMonths(start, monthsCount);
      
      await addDoc(collection(db, 'clubSubscriptions'), {
        name: subscription.name,
        workplace: subscription.workplace,
        phone: phone,
        monthsCount: monthsCount,
        totalPrice: amount,
        collectedAmount: 0,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        status: 'active',
        paymentStatus: 'unpaid',
        notes: lang === 'ar' ? 'طلب تجديد تلقائي عبر الرابط' : 'Automatic renewal request via link',
        createdAt: Timestamp.now(),
        userId: subscription.userId || ''
      });
      setIsSuccess(true);
      toast.success(lang === 'ar' ? 'تم إرسال طلب التجديد بنجاح' : 'Renewal request sent successfully');
    } catch (err) {
      console.error(err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تقديم الطلب' : 'Error submitting renewal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    ar: {
      title: 'تجديد اشتراك النادي الرياضي',
      submitting: 'جاري تسليم الطلب...',
      submit: 'تقديم طلب التجديد',
      loading: 'جاري تحميل تفاصيل اشتراكك...',
      notFound: 'الاشتراك غير موجود أو الرابط غير صالح.',
      welcome: 'أهلاً بك،',
      subDetails: 'تفاصيل اشتراكك الحالي:',
      prevEnd: 'تاريخ انتهاء الاشتراك السابق',
      newDuration: 'مدة التجديد المطلوبة',
      newStart: 'تاريخ بدء الاشتراك الجديد',
      phone: 'رقم الجوال لتأكيد التواصل',
      totalPrice: 'المبلغ الإجمالي المستحق الدفع',
      successMsg: 'تم تقديم طلب تجديد اشتراكك بنجاح! سيتم مراجعة الطلب وتفعيل اشتراكك فور سداد الرسوم لدى الإدارة. شكراً لك!',
      months: 'أشهر',
      month: 'شهر واحد',
      sar: 'ريال',
    },
    en: {
      title: 'Renew Club Subscription',
      submitting: 'Submitting request...',
      submit: 'Submit Renewal Request',
      loading: 'Loading subscription details...',
      notFound: 'Subscription not found or link is invalid.',
      welcome: 'Welcome,',
      subDetails: 'Current subscription details:',
      prevEnd: 'Previous subscription end date',
      newDuration: 'Requested renewal duration',
      newStart: 'New subscription start date',
      phone: 'Contact phone number',
      totalPrice: 'Total price to pay',
      successMsg: 'Your renewal request has been submitted successfully! It will be reviewed and activated once fees are paid at the administration office. Thank you!',
      months: 'months',
      month: '1 month',
      sar: 'SAR',
    }
  }[lang];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full text-center">
          <div className="bg-rose-100 p-5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <X className="text-rose-500 w-10 h-10" />
          </div>
          <h2 className="text-xl font-black mb-4">{error || t.notFound}</h2>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold">
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    const handleNotifyAdmin = () => {
      const pricePerMonth = 300;
      const amount = monthsCount * pricePerMonth;
      const msg = lang === 'ar'
        ? `*طلب تجديد اشتراك نادي 🏋️‍♂️*\n\n` +
          `• *المشترك:* ${subscription?.name || ''}\n` +
          `• *رقم الجوال:* ${phone}\n` +
          `• *المدة:* ${monthsCount} أشهر\n` +
          `• *المبلغ الإجمالي:* ${amount} ريال\n` +
          `• *تاريخ بدء الاشتراك المقترح:* ${startDate}\n\n` +
          `[ تم تأكيد إرسال طلب التجديد عبر البوابة ]`
        : `*Club Subscription Renewal Request 🏋️‍♂️*\n\n` +
          `• *Member:* ${subscription?.name || ''}\n` +
          `• *Phone:* ${phone}\n` +
          `• *Duration:* ${monthsCount} months\n` +
          `• *Total Price:* ${amount} SAR\n` +
          `• *Start Date:* ${startDate}\n\n` +
          `[ Subscription renewal request details submitted ]`;

      const cleanPhone = adminPhone.replace(/\s+/g, '').replace('+', '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleNotifyGroup = () => {
      const pricePerMonth = 300;
      const amount = monthsCount * pricePerMonth;
      const msg = lang === 'ar'
        ? `*تأكيد دفع تجديد اشتراك نادي 🏋️‍♂️💰*\n\n` +
          `• *المشترك:* ${subscription?.name || ''}\n` +
          `• *رقم الجوال:* ${phone}\n` +
          `• *المدة:* ${monthsCount} أشهر\n` +
          `• *المبلغ المحول:* ${amount} ريال\n` +
          `• *تاريخ بدء الاشتراك:* ${startDate}\n\n` +
          `[ تم تأكيد الدفع وإرفاق إشعار التحويل لتتبع الحالة ]`
        : `*Payment proof for Club Subscription Renewal 🏋️‍♂️💰*\n\n` +
          `• *Member:* ${subscription?.name || ''}\n` +
          `• *Phone:* ${phone}\n` +
          `• *Duration:* ${monthsCount} months\n` +
          `• *Amount Paid:* ${amount} SAR\n` +
          `• *Start Date:* ${startDate}\n\n` +
          `[ Payment verification and tracking required ]`;

      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
          <div className="bg-green-100 p-5 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="text-green-500 w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black mb-4">{lang === 'ar' ? 'تم استلام طلب التجديد!' : 'Renewal request received!'}</h2>
          <p className="text-gray-500 font-bold mb-8 leading-relaxed text-center">{t.successMsg}</p>
          
          {whatsappGroupLink && (
            <div className="space-y-3 mb-4">
              <a 
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15"
              >
                <Users size={20} />
                {lang === 'ar' ? 'الانضمام لمجموعة تتبع الدفع (واتساب)' : 'Join Payment Tracking Group'}
              </a>
              
              <button 
                onClick={handleNotifyGroup} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                <MessageCircle size={20} />
                {lang === 'ar' ? 'أرسل إشعار الدفع إلى المجموعة' : 'Send Payment Message to Group'}
              </button>
            </div>
          )}

          {adminPhone && (
            <button 
              onClick={handleNotifyAdmin} 
              className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15"
            >
              <MessageCircle size={20} />
              {lang === 'ar' ? 'تأكيد وإرسال إشعار التجديد للمدير عبر واتساب' : 'Confirm & Notify Manager via WhatsApp'}
            </button>
          )}
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
            <p className="text-gray-500 font-bold mt-2">{t.welcome} {subscription.name}</p>
          </div>

          <div className="bg-primary/5 p-4 rounded-2xl mb-6 border border-primary/10 space-y-2 text-sm text-right">
            <p className="font-bold text-gray-400">{t.subDetails}</p>
            <div className="flex justify-between font-black text-gray-700">
              <span>{lang === 'ar' ? 'مكان العمل:' : 'Workplace:'}</span>
              <span>{subscription.workplace === 'other' ? (subscription as any).customWorkplace || 'أخرى' : subscription.workplace}</span>
            </div>
            <div className="flex justify-between font-black text-gray-700 font-mono">
              <span>{t.prevEnd}:</span>
              <span>{format(safeToDate(subscription.endDate), 'yyyy/MM/dd')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.newDuration}</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonthsCount(m)}
                    className={cn(
                      "py-3 rounded-xl font-black text-xs transition-all border-2",
                      monthsCount === m
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-gray-50 text-gray-500 border-transparent hover:border-primary/20 border-gray-100 dark:border-slate-800"
                    )}
                  >
                    {m} {m === 1 ? t.month : `${m} ${t.months}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.newStart}</label>
              <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold" />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.phone}</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold text-right" dir="ltr" />
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center text-sm font-black text-emerald-800">
              <span>{t.totalPrice}:</span>
              <span className="text-lg">{monthsCount * 300} {t.sar}</span>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
              {isSubmitting ? t.submitting : t.submit}
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

const ClubSubscriptionForm = React.forwardRef<HTMLDivElement, { subscription: ClubSubscription, tenants: Tenant[] }>(({ subscription, tenants }, ref) => {
  const matchingTenant = tenants.find(t => 
    t.name === subscription.name || 
    t.name.includes(subscription.name) || 
    subscription.name.includes(t.name)
  );
  const phone = matchingTenant?.phone || '';

  return (
    <div ref={ref} className="p-16 bg-white text-black font-sans dir-rtl max-w-[800px] mx-auto text-right leading-loose" dir="rtl" style={{ fontSize: '16px' }}>
      {/* Title */}
      <div className="text-center mb-12 mt-4">
        <h1 className="text-3xl font-black text-black pb-4 inline-block px-12 tracking-wide">
          تعهد وإقرار اشتراك
        </h1>
      </div>

      {/* Subscriber Information Section */}
      <div className="space-y-6 mb-12">
        <h2 className="text-xl font-bold text-black border-r-4 border-black pr-3 mb-6">
          بيانات المشترك
        </h2>
        
        <div className="space-y-5 pr-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold whitespace-nowrap min-w-[120px] text-gray-700">الاسم:</span>
            <span className="border-b border-dashed border-gray-400 flex-1 pb-1 font-bold text-lg pr-2">
              {subscription.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold whitespace-nowrap min-w-[120px] text-gray-700">رقم الجوال:</span>
            <span className="border-b border-dashed border-gray-400 flex-1 pb-1 font-bold text-lg pr-2">
              {phone || '_____________________'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold whitespace-nowrap min-w-[120px] text-gray-700">مكان العمل:</span>
            <span className="border-b border-dashed border-gray-400 flex-1 pb-1 font-bold text-lg pr-2">
              {subscription.workplace || '_____________________'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold whitespace-nowrap min-w-[120px] text-gray-700">مدة الاشتراك:</span>
            <span className="border-b border-dashed border-gray-400 flex-1 pb-1 font-bold text-lg pr-2">
              {subscription.monthsCount} {subscription.monthsCount === 1 ? 'شهر واحد' : subscription.monthsCount === 3 ? 'ثلاثة أشهر' : subscription.monthsCount === 6 ? 'ستة أشهر' : `${subscription.monthsCount} شهراً`} (من {format(safeToDate(subscription.startDate), 'yyyy/MM/dd')} إلى {format(safeToDate(subscription.endDate), 'yyyy/MM/dd')})
            </span>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 my-10" />

      {/* Declarations and Pledge */}
      <div className="space-y-6 text-justify">
        <h2 className="text-xl font-bold text-black border-r-4 border-black pr-3 mb-6">
          الإقرار والتعهد
        </h2>
        
        <p className="text-black leading-loose text-base" style={{ textIndent: '2rem' }}>
          أقر أنا الموقع أدناه، وبكامل أهليتي القانونية، بأن جميع البيانات المدونة أعلاه صحيحة، وأنني اطلعت على أنظمة وتعليمات وشروط الاشتراك الخاصة بالمجمع، وأتعهد بالالتزام بها طوال مدة الاشتراك.
        </p>

        <p className="text-black leading-loose text-base" style={{ textIndent: '2rem' }}>
          كما أقر وأوافق بأنه في حال صدور أي مخالفة أو حدوث أي مشكلة أو تصرف غير لائق من جانبي، أو الإخلال بأي من الأنظمة والتعليمات أو الشروط المعتمدة لدى المجمع، فإنه يحق لإدارة المجمع إنهاء أو فسخ الاشتراك بشكل فوري، وإنهاء المدة المتبقية من الاشتراك دون الرجوع إليّ، ودون المطالبة بأي تعويض أو استرداد للرسوم أو المبالغ المدفوعة.
        </p>

        <p className="text-black leading-loose text-base" style={{ textIndent: '2rem' }}>
          وبهذا أوقع على هذا التعهد والإقرار بمحض إرادتي، وأتحمل كامل المسؤولية المترتبة على مخالفتي للأنظمة والتعليمات المعمول بها.
        </p>
      </div>

      <hr className="border-gray-200 my-10" />

      {/* Signature Area */}
      <div className="mt-14 space-y-6 w-3/4 mr-auto pl-6">
        <div className="flex items-center gap-2">
          <span className="font-extrabold whitespace-nowrap min-w-[130px] text-gray-700">اسم المشترك:</span>
          <span className="border-b border-dashed border-gray-400 flex-1 pb-1 font-bold text-lg pr-2">
            {subscription.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-extrabold whitespace-nowrap min-w-[130px] text-gray-700">التوقيع:</span>
          <span className="border-b border-dashed border-gray-400 flex-1 pb-1 pr-2 text-gray-400 text-sm">
            ____________________________________
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-extrabold whitespace-nowrap min-w-[130px] text-gray-700">التاريخ:</span>
          <span className="border-b border-dashed border-gray-400 flex-1 pb-1 font-bold text-lg pr-2 text-right" dir="rtl">
            {format(new Date(), 'yyyy / MM / dd')} م
          </span>
        </div>
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

const CarSubscriptionModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  editingRequest,
  tenants = [],
  apartments = []
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void,
  editingRequest?: CleaningRequest | null,
  tenants?: Tenant[],
  apartments?: Apartment[]
}) => {
  const [formData, setFormData] = useState({
    apartmentNumber: '', 
    apartment: '',
    car: '',
    price: 300,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    durationMonths: 1,
    frequency: 'daily',
    selectedDays: [0, 1, 2, 3, 4, 5, 6],
    notes: '',
    workerName: ''
  });

  useEffect(() => {
    if (editingRequest && isOpen) {
      setFormData({
        apartmentNumber: editingRequest.apartmentNumber || '',
        apartment: editingRequest.apartment || getApartmentNum(editingRequest) || '',
        car: editingRequest.car || getCarName(editingRequest) || '',
        price: editingRequest.price || 300,
        startDate: format(safeToDate(editingRequest.subscriptionStartDate || editingRequest.date), 'yyyy-MM-dd'),
        durationMonths: editingRequest.monthsCount || 1,
        frequency: editingRequest.subscriptionFrequency || 'daily',
        selectedDays: editingRequest.subscriptionSchedule || [0,1,2,3,4,5,6],
        notes: editingRequest.notes || '',
        workerName: editingRequest.workerName || ''
      });
    } else if (isOpen) {
      // Reset for new entry
      setFormData({
        apartmentNumber: '',
        apartment: '',
        car: '',
        price: 300,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        durationMonths: 1,
        frequency: 'daily',
        selectedDays: [0, 1, 2, 3, 4, 5, 6],
        notes: '',
        workerName: ''
      });
    }
  }, [editingRequest, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(formData.startDate);
    const endDate = addMonths(startDate, formData.durationMonths);
    
    const data: any = {
      serviceType: 'تنظيف سيارات',
      apartmentNumber: formData.apartmentNumber,
      apartment: formData.apartment,
      car: formData.car,
      price: Number(formData.price),
      date: Timestamp.fromDate(startDate),
      subscriptionStartDate: Timestamp.fromDate(startDate),
      subscriptionEndDate: Timestamp.fromDate(endDate),
      subscriptionSchedule: formData.selectedDays,
      subscriptionFrequency: formData.frequency,
      monthsCount: formData.durationMonths,
      isSubscription: true,
      workerName: formData.workerName,
      notes: formData.notes || `السيارة: ${formData.car} | الشقة: ${formData.apartment}`,
      updatedAt: serverTimestamp()
    };

    if (!editingRequest) {
      data.createdAt = serverTimestamp();
      data.status = 'completed';
      data.paymentStatus = 'unpaid';
    }
    
    onSave(data);
    onClose();
  };

  const activeApartment = apartments.find(apt => apt.number === formData.apartment);
  const activeTenant = activeApartment 
    ? tenants.find(t => t.id === activeApartment.tenantId || t.apartmentId === activeApartment.id)
    : tenants.find(t => {
        const apt = apartments.find(a => a.id === t.apartmentId);
        return apt && apt.number === formData.apartment;
      });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden font-cairo"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <CalendarCheck className="text-primary" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">اشتراك غسيل شهري</h2>
                <p className="text-sm font-bold text-gray-500">إضافة اشتراك جديد لفترة محددة</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">رقم اللوحة</label>
              <input 
                required 
                type="text" 
                value={formData.apartmentNumber} 
                onChange={e => setFormData({...formData, apartmentNumber: e.target.value})} 
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white text-center text-xl" 
                placeholder="أ ب ج 1 2 3 4"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">رقم الشقة</label>
                <input 
                  required 
                  type="text" 
                  list="apartments-list"
                  value={formData.apartment} 
                  onChange={e => setFormData({...formData, apartment: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                  placeholder="أدخل رقم الشقة"
                />
                <datalist id="apartments-list">
                  {apartments.map(apt => (
                    <option key={apt.id} value={apt.number}>
                      {apt.buildingName} - شقة {apt.number}
                    </option>
                  ))}
                </datalist>
                {activeTenant && (
                  <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-right">
                    <p className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 flex items-center justify-start gap-1.5 leading-none">
                      <UserIcon size={12} className="shrink-0" />
                      المستأجر: {activeTenant.name}
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                      الهاتف: {activeTenant.phone} • {activeTenant.company}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">نوع السيارة</label>
                <input 
                  required 
                  type="text" 
                  value={formData.car} 
                  onChange={e => setFormData({...formData, car: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                  placeholder="أدخل نوع وموديل السيارة"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">تاريخ البدء</label>
                <input 
                  required 
                  type="date" 
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">مبلغ الاشتراك</label>
                <input 
                  required 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">مدة الاشتراك (بالأشهر)</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({...formData, durationMonths: m})}
                    className={cn(
                      "py-3 rounded-xl font-black text-sm transition-all",
                      formData.durationMonths === m 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {m} {m === 1 ? 'شهر' : m === 2 ? 'شهرين' : 'أشهر'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">تكرار الغسيل</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { id: 'daily', label: 'يومياً' },
                  { id: 'twice_a_week', label: 'يومين في الأسبوع' },
                  { id: 'weekly', label: 'أيام محددة' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      const days = f.id === 'daily' ? [0,1,2,3,4,5,6] : f.id === 'twice_a_week' ? [0,3] : [0,2,4];
                      setFormData({...formData, frequency: f.id, selectedDays: days});
                    }}
                    className={cn(
                      "py-3 rounded-xl font-black text-[11px] sm:text-xs transition-all",
                      formData.frequency === f.id 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {(formData.frequency === 'weekly' || formData.frequency === 'twice_a_week') && (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-1">
                    {['ج', 'س', 'ح', 'ن', 'ث', 'ر', 'خ'].map((day, idx) => {
                      // map idx to JS day: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
                      const dayMap = [5, 6, 0, 1, 2, 3, 4]; // Friday, Saturday, Sunday...
                      const realDayIdx = dayMap[idx];
                      const isSelected = formData.selectedDays.includes(realDayIdx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            let newDays;
                            if (formData.frequency === 'twice_a_week') {
                              if (isSelected) {
                                newDays = formData.selectedDays.filter(d => d !== realDayIdx);
                              } else {
                                if (formData.selectedDays.length >= 2) {
                                  newDays = [formData.selectedDays[formData.selectedDays.length - 1], realDayIdx];
                                } else {
                                  newDays = [...formData.selectedDays, realDayIdx];
                                }
                              }
                            } else {
                              newDays = isSelected 
                                ? formData.selectedDays.filter(d => d !== realDayIdx)
                                : [...formData.selectedDays, realDayIdx];
                            }
                            setFormData({...formData, selectedDays: newDays});
                          }}
                          className={cn(
                            "h-10 rounded-lg font-bold text-[10px] transition-all",
                            isSelected 
                              ? "bg-primary text-white" 
                              : "bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {formData.frequency === 'twice_a_week' && formData.selectedDays.length !== 2 && (
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 text-right">
                      * يرجى تحديد يومين في الأسبوع (المحدد حالياً: {formData.selectedDays.length})
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">العامل المسؤول</label>
              <input 
                type="text" 
                value={formData.workerName} 
                onChange={e => setFormData({...formData, workerName: e.target.value})} 
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                placeholder="اسم العامل"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ملاحظات</label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white h-24" 
              />
            </div>
          </div>

          <div className="p-8 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 bg-white dark:bg-slate-800 text-gray-500 rounded-2xl font-black border border-gray-200 dark:border-slate-700"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="flex-2 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20"
            >
              تفعيل الاشتراك
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const SubscriptionDetailsModal = ({ 
  isOpen, 
  onClose, 
  subscription 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  subscription: CleaningRequest | null 
}) => {
  if (!isOpen || !subscription) return null;

  const startDate = safeToDate(subscription.subscriptionStartDate || subscription.date);
  const endDate = safeToDate(subscription.subscriptionEndDate);
  const schedule = subscription.subscriptionSchedule || [0,1,2,3,4,5,6];
  const completed = subscription.completedDates || [];

  // Generate all scheduled dates
  const allDates: Date[] = [];
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const final = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (current <= final) {
    if (schedule.includes(current.getDay())) {
      allDates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  // Group by month
  const groupedByMonth: Record<string, Date[]> = {};
  allDates.forEach(date => {
    const monthKey = format(date, 'MMMM yyyy', { locale: ar });
    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
    groupedByMonth[monthKey].push(date);
  });

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden font-cairo max-h-[85vh] flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <History className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">تفاصيل جدول الاشتراك</h2>
              <p className="text-xs font-bold text-gray-500">لوحة: {subscription.apartmentNumber} · {subscription.monthsCount} أشهر</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {Object.entries(groupedByMonth).map(([month, dates]) => (
            <div key={month} className="space-y-4">
              <h3 className="text-sm font-black text-primary flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                {month}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dates.map((date, idx) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isDone = completed.includes(dateStr);
                  const isPast = isBefore(date, startOfDay(new Date()));
                  
                  return (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                        isDone 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                          : isPast 
                            ? "bg-gray-50 border-gray-100 text-gray-400"
                            : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300"
                      )}
                    >
                      <span className="text-[10px] font-black opacity-60">
                        {format(date, 'EEEE', { locale: ar })}
                      </span>
                      <span className="text-sm font-black">
                        {format(date, 'dd MMMM', { locale: ar })}
                      </span>
                      <div className={cn(
                        "mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                        isDone ? "bg-emerald-200 text-emerald-800" : "bg-gray-200 text-gray-600"
                      )}>
                        {isDone ? '✓ تم' : 'قيد الانتظار'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const GameRoomBookingModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  editingBooking
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void,
  editingBooking?: Booking | null
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    buildingName: '',
    apartmentNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00'
  });

  useEffect(() => {
    if (editingBooking && isOpen) {
      setFormData({
        customerName: editingBooking.customerName || '',
        customerPhone: editingBooking.customerPhone || '',
        buildingName: editingBooking.buildingName || '',
        apartmentNumber: editingBooking.apartmentNumber || '',
        date: format(safeToDate(editingBooking.date), 'yyyy-MM-dd'),
        time: editingBooking.time || '10:00'
      });
    } else if (isOpen) {
      setFormData({
        customerName: '',
        customerPhone: '',
        buildingName: '',
        apartmentNumber: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00'
      });
    }
  }, [editingBooking, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      ...formData,
      serviceType: 'حجز غرفة الألعاب',
      date: Timestamp.fromDate(new Date(formData.date)),
      updatedAt: serverTimestamp()
    };

    if (!editingBooking) {
      data.createdAt = serverTimestamp();
      data.status = 'confirmed';
      data.language = 'ar';
    }
    
    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden font-cairo"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Gamepad2 className="text-primary" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">حجز غرفة الألعاب</h2>
                <p className="text-sm font-bold text-gray-500">{editingBooking ? 'تعديل حجز' : 'إضافة حجز جديد'}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">اسم العميل</label>
              <input 
                required 
                type="text" 
                value={formData.customerName} 
                onChange={e => setFormData({...formData, customerName: e.target.value})} 
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">رقم الجوال</label>
              <input 
                required 
                type="tel" 
                value={formData.customerPhone} 
                onChange={e => setFormData({...formData, customerPhone: e.target.value})} 
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">المبنى</label>
                <input 
                  type="text" 
                  value={formData.buildingName} 
                  onChange={e => setFormData({...formData, buildingName: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">رقم الشقة</label>
                <input 
                  type="text" 
                  value={formData.apartmentNumber} 
                  onChange={e => setFormData({...formData, apartmentNumber: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">التاريخ</label>
                <input 
                  required 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">الوقت</label>
                <input 
                  required 
                  type="time" 
                  value={formData.time} 
                  onChange={e => setFormData({...formData, time: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold dark:text-white" 
                />
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 bg-white dark:bg-slate-800 text-gray-500 rounded-2xl font-black border border-gray-200 dark:border-slate-700"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="flex-2 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20"
            >
              حفظ الحجز
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const GroupHistoryModal = ({ 
  isOpen, 
  onClose, 
  requests,
  onUpdateStatus,
  onEdit,
  onDelete
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  requests: CleaningRequest[] | null,
  onUpdateStatus: (id: string, field: 'status' | 'paymentStatus', value: string) => void,
  onEdit: (req: CleaningRequest) => void,
  onDelete: (id: string) => void
}) => {
  if (!isOpen || !requests) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden font-cairo max-h-[80vh] flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <History className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">تفاصيل الطلبات المجمعة</h2>
              <p className="text-sm font-bold text-gray-500">شقة {requests[0]?.apartmentNumber} - {requests[0]?.serviceType}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 text-xs font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-2">التاريخ</th>
                <th className="py-4 px-2">المبلغ</th>
                <th className="py-4 px-2">الحالة</th>
                <th className="py-4 px-2">الدفع</th>
                <th className="py-4 px-2">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="py-4 px-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-300">
                      {format(safeToDate(req.date), 'yyyy/MM/dd HH:mm')}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <span className="text-sm font-black text-primary">{req.price} ريال</span>
                  </td>
                  <td className="py-4 px-2">
                    <button 
                      onClick={() => onUpdateStatus(req.id, 'status', req.status === 'completed' ? 'pending' : 'completed')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                        req.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}
                    >
                      {req.status === 'completed' ? 'منفذة' : 'قيد الانتظار'}
                    </button>
                  </td>
                  <td className="py-4 px-2">
                    <button 
                      onClick={() => onUpdateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                        req.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}
                    >
                      {req.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                    </button>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(req)} className="text-gray-400 hover:text-primary"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(req.id)} className="text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

const WhatsAppMessageModal = ({ 
  isOpen, 
  onClose, 
  tenant, 
  apartment, 
  cleaningRequests 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  tenant: Tenant | null, 
  apartment: Apartment | null,
  cleaningRequests: CleaningRequest[] 
}) => {
  if (!isOpen || !tenant) return null;

  const apartmentCleaningCount = cleaningRequests.filter(r => 
    r.apartmentNumber === (apartment?.number || tenant.id) && // Assuming apartmentNumber if available
    r.serviceType === 'تنظيف شقة' &&
    r.paymentStatus === 'unpaid'
  ).length;

  const carCleaningCount = cleaningRequests.filter(r => 
    r.apartmentNumber === (apartment?.number || tenant.id) && 
    r.serviceType === 'تنظيف سيارة' &&
    r.paymentStatus === 'unpaid'
  ).length;

  const nextPaymentDateStr = tenant.nextPaymentDate ? format(safeToDate(tenant.nextPaymentDate), 'PPP', { locale: ar }) : 'غير محدد';

  const templates = [
    {
      id: 'welcome_rent',
      title: 'ترحيب وتذكير بالإيجار',
      icon: <Calendar className="text-blue-500" size={20} />,
      message: `مرحباً ${tenant.name}، يسعدنا تواجدكم معنا. نود تذكيركم بموعد استحقاق الإيجار القادم بتاريخ ${nextPaymentDateStr}. شكراً لتفهمكم.`,
      color: 'blue'
    },
    {
      id: 'apartment_cleaning',
      title: 'تذكير بدفعة تنظيف الشقة',
      icon: <Sparkles className="text-emerald-500" size={20} />,
      message: `مرحباً ${tenant.name}، نود تذكيركم بوجود عدد (${apartmentCleaningCount}) طلبات تنظيف شقة لم يتم سدادها بعد. يرجى التكرم بالسداد في أقرب وقت. شكراً لكم.`,
      color: 'emerald',
      disabled: apartmentCleaningCount === 0
    },
    {
      id: 'car_cleaning',
      title: 'تذكير بدفعة تنظيف السيارة',
      icon: <Car className="text-orange-500" size={20} />,
      message: `مرحباً ${tenant.name}، نود تذكيركم بوجود عدد (${carCleaningCount}) طلبات تنظيف سيارة لم يتم سدادها بعد. يرجى التكرم بالسداد في أقرب وقت. شكراً لكم.`,
      color: 'orange',
      disabled: carCleaningCount === 0
    }
  ];

  const handleSend = (message: string) => {
    const phone = tenant.phone.replace(/\s+/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden font-cairo"
      >
        <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
              <MessageSquare className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">إرسال رسالة واتساب</h2>
              <p className="text-sm font-bold text-gray-500">اختر نموذج الرسالة المراد إرسالها لـ {tenant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          {templates.map((template) => (
            <motion.button
              key={template.id}
              disabled={template.disabled}
              whileHover={template.disabled ? {} : { scale: 1.02, x: -5 }}
              whileTap={template.disabled ? {} : { scale: 0.98 }}
              onClick={() => handleSend(template.message)}
              className={cn(
                "w-full p-6 rounded-3xl border text-right transition-all flex items-center gap-4 group text-right",
                template.disabled 
                  ? "bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 opacity-50 cursor-not-allowed" 
                  : `bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-green-500/30 hover:shadow-xl shadow-gray-200/50`
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                template.disabled ? "bg-gray-200 dark:bg-slate-700" : `bg-gray-50 dark:bg-slate-800`
              )}>
                {template.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{template.title}</h3>
                  {!template.disabled && <Send size={16} className={`text-green-500 opacity-0 group-hover:opacity-100 transition-all`} />}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {template.message}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="p-8 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
            سيتم فتح تطبيق الواتساب مباشرة مع الرسالة النصية المختارة<br />
            يرجى التأكد من أن رقم الهاتف ({tenant.phone}) صحيح ومسجل عليه واتساب
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const ApartmentCodesModal = ({
  isOpen,
  onClose,
  apartments,
  tenants
}: {
  isOpen: boolean;
  onClose: () => void;
  apartments: Apartment[];
  tenants: Tenant[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [localCodes, setLocalCodes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Initialize local codes when modal opens
  useEffect(() => {
    if (isOpen) {
      const codes: Record<string, string> = {};
      apartments.forEach(apt => {
        codes[apt.id] = apt.secretCode || '';
      });
      setLocalCodes(codes);
    }
  }, [isOpen, apartments]);

  if (!isOpen) return null;

  const handleCodeChange = (aptId: string, val: string) => {
    setLocalCodes(prev => ({ ...prev, [aptId]: val }));
  };

  const handleSaveCode = async (aptId: string) => {
    setSavingId(aptId);
    try {
      const codeValue = localCodes[aptId]?.trim() || '';
      await updateDoc(doc(db, 'apartments', aptId), {
        secretCode: codeValue,
        updatedAt: serverTimestamp()
      });
      toast.success('تم حفظ الرمز السري بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ الرمز السري');
    } finally {
      setSavingId(null);
    }
  };

  const handleGenerateRandom = (aptId: string) => {
    // Generate a beautiful 4-digit code
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    handleCodeChange(aptId, pin);
  };

  const handleBulkGenerate = async () => {
    const emptyOrMissingCount = apartments.filter(a => !a.secretCode).length;
    if (emptyOrMissingCount === 0) {
      toast.info('جميع الشقق تمتلك رموزاً سرية بالفعل');
      return;
    }

    if (window.confirm(`هل تريد إنشاء رموز سرية عشوائية تلقائياً لـ ${emptyOrMissingCount} شقة لا تمتلك رمزاً؟`)) {
      toast.loading('جاري توليد الرموز السرية...');
      let successCount = 0;
      try {
        for (const apt of apartments) {
          if (!apt.secretCode) {
            const pin = Math.floor(1000 + Math.random() * 9000).toString();
            await updateDoc(doc(db, 'apartments', apt.id), {
              secretCode: pin,
              updatedAt: serverTimestamp()
            });
            successCount++;
          }
        }
        toast.dismiss();
        toast.success(`تم بنجاح توليد ${successCount} رمز سري عشوائي!`);
      } catch (error) {
        toast.dismiss();
        console.error(error);
        toast.error('حدث خطأ أثناء التوليد التلقائي للرموز السريّة');
      }
    }
  };

  const filteredApartments = apartments.filter(apt => {
    const b = PROPERTY_BUILDINGS.find(pb => pb.id === apt.buildingId);
    const text = searchTerm.toLowerCase();
    const matchesSearch = apt.number.toLowerCase().includes(text) || 
                         (b?.name || '').toLowerCase().includes(text);
    const matchesBuilding = buildingFilter === 'all' || apt.buildingId === buildingFilter;
    return matchesSearch && matchesBuilding;
  }).sort((a, b) => {
    const b1 = PROPERTY_BUILDINGS.findIndex(pb => pb.id === a.buildingId);
    const b2 = PROPERTY_BUILDINGS.findIndex(pb => pb.id === b.buildingId);
    if (b1 !== b2) return b1 - b2;
    return a.number.localeCompare(b.number);
  });

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
          {/* Header */}
          <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-primary/5 dark:bg-primary/10 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/20 dark:shadow-none">
                <Key size={24} />
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الرموز السرية للشقق</h2>
                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mt-1">تخصيص وتوليد رموز المرور السرية لجميع الوحدات السكنية</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBulkGenerate}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-amber-500 to-amber-600 border-t border-t-white/10 border-b-[3px] border-b-amber-800 text-white hover:opacity-90 rounded-xl transition-all font-bold text-xs shadow-sm cursor-pointer"
              >
                <Sparkles size={16} />
                <span>توليد تلقائي للجميع</span>
              </button>
              
              <button 
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="بحث برقم الشقة أو اسم المبنى..."
                  className="w-full pr-12 pl-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700/80 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={buildingFilter}
                onChange={e => setBuildingFilter(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700/80 rounded-xl text-sm font-black focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="all">كل المباني</option>
                {PROPERTY_BUILDINGS.map(pb => (
                  <option key={pb.id} value={pb.id}>{pb.name}</option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredApartments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-bold">
                  لا توجد وحدات مطابقة للبحث
                </div>
              ) : (
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                  {filteredApartments.map(apt => {
                    const b = PROPERTY_BUILDINGS.find(pb => pb.id === apt.buildingId);
                    const tenant = (apt.tenantId ? tenants.find(t => t.id === apt.tenantId) : null) || tenants.find(t => t.apartmentId === apt.id);
                    const code = localCodes[apt.id] || '';
                    const isSaving = savingId === apt.id;

                    return (
                      <div key={apt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-primary/10 dark:bg-primary/5 text-primary rounded-xl flex items-center justify-center font-bold text-sm border border-primary/10">
                            {apt.number}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-slate-250 text-sm">شقة {apt.number} <span className="text-xs text-slate-400 font-medium">({b?.name || 'مبنى'})</span></p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {tenant ? `المستأجر: ${tenant.company || tenant.name}` : 'شاغرة حالياً'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <Lock size={14} />
                            </span>
                            <input 
                              type="text"
                              value={code}
                              maxLength={12}
                              placeholder="الرمز السري"
                              onChange={e => handleCodeChange(apt.id, e.target.value)}
                              className="w-44 pr-10 pl-4 py-2.5 bg-slate-55 dark:bg-slate-800 border border-slate-250 dark:border-slate-700/80 rounded-xl text-center font-mono font-bold text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleGenerateRandom(apt.id)}
                            className="p-2.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl cursor-pointer"
                            title="توليد رمز تلقائي"
                          >
                            <Sparkles size={16} />
                          </motion.button>

                          <motion.button 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={isSaving}
                            onClick={() => handleSaveCode(apt.id)}
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border-b-[3px]",
                              isSaving 
                                ? "bg-slate-300 text-slate-500" 
                                : "bg-gradient-to-b from-primary to-primary-dark border-b-primary-dark text-white shadow-sm hover:opacity-95"
                            )}
                          >
                            {isSaving ? '...' : 'حفظ'}
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const CarSubscriptionPaymentsModal = ({
  isOpen,
  onClose,
  subscription
}: {
  isOpen: boolean;
  onClose: () => void;
  subscription: CleaningRequest | null;
}) => {
  const [payments, setPayments] = useState<{
    monthKey: string;
    monthName: string;
    isPaid: boolean;
    amount: number;
    paidDate?: string;
  }[]>([]);
  const [saving, setSaving] = useState(false);

  // Load existing payments or generate default months based on subscription period
  useEffect(() => {
    if (!subscription || !isOpen) return;

    if (subscription.subscriptionPayments !== undefined && subscription.subscriptionPayments !== null) {
      setPayments([...subscription.subscriptionPayments]);
    } else {
      // Generate subscription months for the first time
      const start = safeToDate(subscription.subscriptionStartDate || subscription.date);
      const end = safeToDate(subscription.subscriptionEndDate);
      const monthsList: { monthKey: string; monthName: string; defaultAmount: number }[] = [];
      
      let current = startOfMonth(start);
      const targetEnd = startOfMonth(end);
      
      // Calculate typical monthly amount: total price / monthsCount
      const perMonthAmount = Math.round(subscription.price / (subscription.monthsCount || 1));

      while (current <= targetEnd) {
        const monthKey = format(current, 'yyyy-MM');
        const monthName = format(current, 'MMMM yyyy', { locale: ar });
        monthsList.push({ monthKey, monthName, defaultAmount: perMonthAmount });
        current = addMonths(current, 1);
      }

      const merged = monthsList.map(item => ({
        monthKey: item.monthKey,
        monthName: item.monthName,
        isPaid: false,
        amount: item.defaultAmount,
        paidDate: ''
      }));

      setPayments(merged);
    }
  }, [subscription, isOpen]);

  if (!isOpen || !subscription) return null;

  const handleTogglePaid = (index: number) => {
    setPayments(prev => {
      const updated = [...prev];
      const target = updated[index];
      const newIsPaid = !target.isPaid;
      updated[index] = {
        ...target,
        isPaid: newIsPaid,
        paidDate: newIsPaid ? format(new Date(), 'yyyy-MM-dd') : ''
      };
      return updated;
    });
  };

  const handleAmountChange = (index: number, val: number) => {
    setPayments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: val };
      return updated;
    });
  };

  const handleDateChange = (index: number, dateStr: string) => {
    setPayments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], paidDate: dateStr };
      return updated;
    });
  };

  const handleDeleteMonth = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
    toast.success('تم حذف الشهر من القائمة');
  };

  const handleAddCustomMonth = () => {
    // Generate next month after the last element or next month from today
    let baseDate = new Date();
    if (payments.length > 0) {
      const lastKey = payments[payments.length - 1].monthKey;
      const [y, m] = lastKey.split('-').map(Number);
      baseDate = new Date(y, m, 1); // JS months are 0-indexed, so passing index `m` automatically gives next month!
    }
    const monthKey = format(baseDate, 'yyyy-MM');
    const monthName = format(baseDate, 'MMMM yyyy', { locale: ar });
    const perMonthAmount = Math.round(subscription.price / (subscription.monthsCount || 1));

    // Check if it already exists
    if (payments.some(p => p.monthKey === monthKey)) {
      toast.info('هذا الشهر متواجد بالفعل في القائمة');
      return;
    }

    setPayments(prev => [
      ...prev,
      {
        monthKey,
        monthName,
        isPaid: false,
        amount: perMonthAmount,
        paidDate: ''
      }
    ]);
    toast.success(`تمت إضافة ${monthName} للقائمة`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedPayments = payments.map(p => ({
        monthKey: p.monthKey,
        monthName: p.monthName,
        isPaid: p.isPaid,
        amount: Number(p.amount) || 0,
        paidDate: p.paidDate || ''
      }));

      // Calculate total paid so far
      const isTotallyPaid = cleanedPayments.every(p => p.isPaid);

      // In Firestore, save payments and also update general paymentStatus
      await updateDoc(doc(db, 'requests', subscription.id), {
        subscriptionPayments: cleanedPayments,
        paymentStatus: isTotallyPaid ? 'paid' : 'unpaid',
        updatedAt: serverTimestamp()
      });

      toast.success('تمت حفظ معلومات الدفع والشهور بنجاح');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ معلومات الدفع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden font-cairo border border-slate-100 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary/5 dark:bg-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20 dark:shadow-none">
                <CreditCard size={22} />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">سجل الدفعيات والشهور</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-bold">
                  شقة {subscription.apartmentNumber || subscription.apartment} • لوحة {subscription.apartmentNumber}
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="text-right bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-dashed border-slate-250 dark:border-slate-805 text-xs text-slate-500 space-y-1">
              <p>🚗 السيارة: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{subscription.car || 'غير محددة'}</span></p>
              <p>📅 مدة الاشتراك: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{format(safeToDate(subscription.subscriptionStartDate || subscription.date), 'dd/MM/yyyy')} إلى {format(safeToDate(subscription.subscriptionEndDate), 'dd/MM/yyyy')}</span></p>
              <p>💰 القيمة الكلية: <span className="text-emerald-600 dark:text-emerald-400 font-black">{subscription.price} ريال</span></p>
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-gray-400">قائمة الشهور المستحقة والمدفوعة</span>
              
              <button
                type="button"
                onClick={handleAddCustomMonth}
                className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1 rounded-lg"
              >
                <Plus size={12} />
                إضافة شهر إضافي
              </button>
            </div>

            <div className="space-y-2.5">
              {payments.map((p, idx) => (
                <div 
                  key={p.monthKey}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-3 text-right",
                    p.isPaid 
                      ? "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10" 
                      : "bg-slate-50/50 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3 justify-between sm:justify-start">
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(idx)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 border-b-[3px]",
                        p.isPaid
                          ? "bg-gradient-to-b from-emerald-500 to-emerald-600 border-b-emerald-800 text-white shadow-sm"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500 border-b-slate-400 dark:border-b-slate-950 hover:bg-slate-300"
                      )}
                    >
                      {p.isPaid ? '✓ مدفوع' : '✗ غير مدفوع'}
                    </button>

                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">{p.monthName}</p>
                      {p.isPaid && p.paidDate && (
                        <p className="text-[10px] text-slate-400 mt-0.5">بتاريخ: {p.paidDate}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-xl">
                      <input 
                        type="number"
                        value={p.amount}
                        onChange={e => handleAmountChange(idx, Number(e.target.value))}
                        className="w-16 bg-transparent text-center text-xs font-black focus:outline-none dark:text-white"
                        placeholder="المبلغ"
                      />
                      <span className="text-[10px] font-bold text-gray-400">ريال</span>
                    </div>

                    {p.isPaid && (
                      <input 
                        type="date"
                        value={p.paidDate || ''}
                        onChange={e => handleDateChange(idx, e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary h-[32px] sm:w-28 text-center"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف شهر ${p.monthName} من قائمة المدفوعات؟`)) {
                          handleDeleteMonth(idx);
                        }
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-rose-500/10"
                      title="حذف الشهر"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/40">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={saving}
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-b from-primary to-primary-dark border-b-[3px] border-b-primary-dark text-white font-black text-xs rounded-xl hover:opacity-95 transition-all shadow-md shadow-primary/10 cursor-pointer"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات ✓'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const ApartmentDetailsModal = ({ 
  isOpen, 
  onClose, 
  apartment, 
  requests,
  tenants,
  apartments,
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
  tenants: Tenant[],
  apartments: Apartment[],
  onEdit: (req: CleaningRequest) => void,
  onUpdateStatus: (id: string, field: 'status' | 'paymentStatus' | 'price', value: string | number) => void,
  onPrint: (req: CleaningRequest) => void,
  onPrintStatement: (filteredRequests: CleaningRequest[]) => void,
  onBulkPrint?: (requests: CleaningRequest[]) => void,
  onDelete: (id: string) => void
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'history'>('requests');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!isOpen || !apartment) return null;

  const targetApartment = apartments.find(a => a.number === apartment.apartment && PROPERTY_BUILDINGS.find(b => b.id === a.buildingId)?.name === apartment.building);
  
  const historyTenants = tenants
    .filter(t => t.apartmentId === targetApartment?.id && t.status === 'archived')
    .sort((a, b) => safeToDate(b.endDate).getTime() - safeToDate(a.endDate).getTime());

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
            <div className="flex items-center gap-4 mb-6 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit font-cairo">
              <button 
                onClick={() => setActiveSubTab('requests')}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black transition-all",
                  activeSubTab === 'requests' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                الطلبات والخدمات
              </button>
              <button 
                onClick={() => setActiveSubTab('history')}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                  activeSubTab === 'history' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <History size={14} />
                سجل العقود السابقة
              </button>
            </div>

            {activeSubTab === 'requests' ? (
              <>
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
                            onClick={() => onUpdateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
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
            </>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                العقود المؤرشفة والسابقة
              </h3>
              
              {historyTenants.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {historyTenants.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="font-black text-gray-900 dark:text-white text-lg">{t.name}</div>
                        <div className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1"><IdCard size={12} /> {t.idNumber}</span>
                          <span className="flex items-center gap-1"><Phone size={12} /> {t.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الفترة</p>
                          <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                            {format(safeToDate(t.startDate), 'yyyy/MM/dd')} - {format(safeToDate(t.endDate), 'yyyy/MM/dd')}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">قيمة العقد</p>
                          <p className="text-xs font-black text-emerald-600 uppercase">{t.contractValue?.toLocaleString()} ر.س</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={async () => {
                            if (confirm('هل أنت متأكد من استعادة هذا العقد؟ سيتم تفعيل العقد مرة أخرى.')) {
                              try {
                                await updateDoc(doc(db, 'tenants', t.id), { status: 'active' });
                                const aptSnap = await getDoc(doc(db, 'apartments', t.apartmentId));
                                if (aptSnap.exists() && aptSnap.data().status === 'vacant') {
                                  await updateDoc(doc(db, 'apartments', t.apartmentId), { 
                                    status: 'occupied',
                                    tenantId: t.id
                                  });
                                }
                                toast.success('تمت استعادة العقد بنجاح');
                              } catch (error) {
                                console.error(error);
                                toast.error('حدث خطأ أثناء الاستعادة');
                              }
                            }
                          }}
                          className="bg-primary/10 text-primary p-3 rounded-2xl flex items-center gap-2 hover:bg-primary/20 transition-all font-bold text-xs"
                        >
                          <RotateCcw size={16} />
                          استعادة العقد
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center opacity-20 font-cairo">
                  <History size={48} className="mx-auto mb-3" />
                  <p className="text-sm font-black">لا يوجد تاريخ عقود مسجل لهذه الوحدة</p>
                </div>
              )}
            </div>
          )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const MonthlyListModal = ({
  isOpen,
  onClose,
  requests,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  requests: CleaningRequest[];
  onGenerate: (targetDateString: string, sourceDateString: string | null, mode: 'blank' | 'copy') => Promise<void>;
}) => {
  const [mode, setMode] = useState<'copy' | 'blank'>('copy');
  const [targetYearMonth, setTargetYearMonth] = useState('');
  const [sourceYearMonth, setSourceYearMonth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 12 months for target choice
  const targetMonthOptions = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      // Show from current month and next 11 months
      return addMonths(new Date(), i);
    });
  }, []);

  // Find all months that currently have requests in state
  const sourceMonthOptions = React.useMemo(() => {
    const monthsMap = new Map<string, Date>();
    requests.forEach(req => {
      const d = safeToDate(req.date);
      const key = format(d, 'yyyy-MM');
      if (!monthsMap.has(key)) {
        monthsMap.set(key, d);
      }
    });
    return Array.from(monthsMap.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [requests]);

  // Set initial defaults
  useEffect(() => {
    if (isOpen) {
      // Default target month to next month
      const nextMonth = addMonths(new Date(), 1);
      setTargetYearMonth(format(nextMonth, 'yyyy-MM'));
      
      // Default source to current month (or latest month with requests)
      if (sourceMonthOptions.length > 0) {
        setSourceYearMonth(format(sourceMonthOptions[0], 'yyyy-MM'));
      } else {
        setSourceYearMonth(format(new Date(), 'yyyy-MM'));
      }
      setMode('copy');
    }
  }, [isOpen, sourceMonthOptions]);

  if (!isOpen) return null;

  // Let's compute how many requests of chosen source exist
  const getSourceRequestsCount = () => {
    if (!sourceYearMonth) return 0;
    const sourceDate = new Date(sourceYearMonth + '-01');
    return requests.filter(req => isSameMonth(safeToDate(req.date), sourceDate)).length;
  };

  const selectedSourceCount = getSourceRequestsCount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetYearMonth) {
      toast.error('يرجى اختيار الشهر المستهدف');
      return;
    }
    setIsSubmitting(true);
    try {
      await onGenerate(targetYearMonth, mode === 'copy' ? sourceYearMonth : null, mode);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-black text-xl text-gray-900 dark:text-white">إضافة قائمة تشغيلية لشهر جديد</h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">تسهيل عملية جدولة وإعداد المهام شهرياً</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-500 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Target Month */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 dark:text-slate-550 block">الشهر المستهدف (القائمة الجديدة)</label>
            <select
              required
              value={targetYearMonth}
              onChange={e => setTargetYearMonth(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-250/60 dark:border-slate-700/60 rounded-2xl text-sm font-black focus:ring-4 focus:ring-primary/10 hover:border-gray-350 outline-none transition-all dark:text-white"
            >
              <option value="" disabled>اختر الشهر...</option>
              {targetMonthOptions.map(m => {
                const value = format(m, 'yyyy-MM');
                const label = format(m, 'MMMM yyyy', { locale: ar });
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </div>

          {/* Creation Method */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 dark:text-slate-550 block">طريقة إنشاء القائمة الجديدة</label>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Option 1: Copy from another month */}
              <div 
                onClick={() => setMode('copy')}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-2",
                  mode === 'copy' 
                    ? "border-primary bg-primary/5 text-primary dark:bg-primary/10" 
                    : "border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30 text-gray-500 dark:text-slate-400"
                )}
              >
                <Repeat size={22} className={mode === 'copy' ? 'text-primary' : 'text-gray-400'} />
                <span className="font-black text-xs">نسخ قائمة شهر سابق</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">تكرار المهام مع تحديث التواريخ</span>
              </div>

              {/* Option 2: Blank list */}
              <div 
                onClick={() => setMode('blank')}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-2",
                  mode === 'blank' 
                    ? "border-primary bg-primary/5 text-primary dark:bg-primary/10" 
                    : "border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30 text-gray-500 dark:text-slate-400"
                )}
              >
                <Calendar size={22} className={mode === 'blank' ? 'text-primary' : 'text-gray-400'} />
                <span className="font-black text-xs">قائمة فارغة جديدة</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">البدء بجدول فارغ تماماً</span>
              </div>
            </div>
          </div>

          {/* Source Month (Only if mode is copy) */}
          <AnimatePresence>
            {mode === 'copy' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-black text-gray-400 dark:text-slate-550 block">نسخ من قائمة شهر:</label>
                  <select
                    value={sourceYearMonth}
                    onChange={e => setSourceYearMonth(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-250/60 dark:border-slate-700/60 rounded-2xl text-sm font-black focus:ring-4 focus:ring-primary/10 hover:border-gray-350 outline-none transition-all dark:text-white"
                  >
                    {sourceMonthOptions.map(m => {
                      const value = format(m, 'yyyy-MM');
                      const label = format(m, 'MMMM yyyy', { locale: ar });
                      const count = requests.filter(req => isSameMonth(safeToDate(req.date), m)).length;
                      return (
                        <option key={value} value={value}>
                          {label} ({count} طلب مجدول)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedSourceCount > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="text-emerald-500 shrink-0">
                      <CheckCircle size={18} />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-400 font-black leading-relaxed">
                      تم العثور على <span className="text-primary font-extrabold">{selectedSourceCount}</span> طلب جاهز للنسخ. سيقوم النظام بنقلها إلى الشهر الجديد مع الحفاظ على نفس اليوم والوقت لكل طلب بشكل منسق.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-all rounded-2xl font-black text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'copy' && selectedSourceCount === 0)}
              className="flex-1 py-3.5 bg-primary text-white hover:bg-primary/95 transition-all rounded-2xl font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/15 dark:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري إنشاء القائمة...</span>
                </>
              ) : mode === 'copy' ? (
                <span>إنشاء ونسخ المهام ({selectedSourceCount})</span>
              ) : (
                <span>إنشاء قائمة فارغة</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
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
    unitPrice: SERVICES.find(s => s.name === (defaultService || SERVICES[0].name))?.price || 100,
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
        const uPrice = initialData.unitPrice || (initialData.price / (initialData.monthsCount || 1));
        setFormData({
          buildingName: initialData.buildingName || BUILDINGS[0] || '',
          apartmentNumber: initialData.apartmentNumber || '',
          serviceType: initialData.serviceType || SERVICES[0].name || '',
          monthsCount: initialData.monthsCount || 1,
          unitPrice: uPrice,
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
        const uPrice = serviceData?.price || 100;
        setFormData({
          buildingName: defaultBuilding || BUILDINGS[0] || '',
          apartmentNumber: '',
          serviceType: service,
          monthsCount: 1,
          unitPrice: uPrice,
          price: uPrice,
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
      unitPrice: Number(formData.unitPrice),
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
                  const uPrice = service?.price || 100;
                  const datesCount = formData.dates.length || 1;
                  const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                  const gallons = e.target.value === 'توصيل مياه' ? formData.waterGallons : 1;
                  const factor = e.target.value === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                  setFormData({
                    ...formData, 
                    serviceType: e.target.value, 
                    unitPrice: uPrice,
                    price: uPrice * factor * recurringCount
                  });
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
                value={formData.unitPrice}
                onChange={e => {
                  const uPrice = Number(e.target.value);
                  const datesCount = formData.dates.length || 1;
                  const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                  const gallons = formData.serviceType === 'توصيل مياه' ? formData.waterGallons : 1;
                  const factor = formData.serviceType === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                  setFormData({
                    ...formData, 
                    unitPrice: uPrice, 
                    price: uPrice * factor * recurringCount
                  });
                }}
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
                    const uPrice = service?.price || 10;
                    const datesCount = formData.dates.length || 1;
                    const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                    setFormData({
                      ...formData, 
                      waterGallons: gallons, 
                      unitPrice: uPrice,
                      price: uPrice * gallons * datesCount * recurringCount
                    });
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
                    const datesCount = formData.dates.length || 1;
                    const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                    const factor = datesCount > 1 ? datesCount : months;
                    setFormData({
                      ...formData, 
                      monthsCount: months, 
                      price: formData.unitPrice * factor * recurringCount
                    });
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
                      const datesCount = newDates.length || 1;
                      const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                      const gallons = formData.serviceType === 'توصيل مياه' ? (formData.waterGallons || 1) : 1;
                      const factor = formData.serviceType === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                      const newTotal = formData.unitPrice * factor * recurringCount;
                      setFormData({...formData, dates: newDates, price: newTotal});
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
                  onClick={() => {
                    const newDates = [...formData.dates, format(new Date(), "yyyy-MM-dd'T'HH:mm")];
                    const datesCount = newDates.length;
                    const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                    const gallons = formData.serviceType === 'توصيل مياه' ? (formData.waterGallons || 1) : 1;
                    const factor = formData.serviceType === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                    const newTotal = formData.unitPrice * factor * recurringCount;
                    setFormData({...formData, dates: newDates, price: newTotal});
                  }}
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
                onChange={e => {
                  const totalPrice = Number(e.target.value);
                  const datesCount = formData.dates.length || 1;
                  const recurringCount = formData.isRecurring ? (formData.selectedMonths.length + 1) : 1;
                  const gallons = formData.serviceType === 'توصيل مياه' ? (formData.waterGallons || 1) : 1;
                  const factor = formData.serviceType === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                  const denominator = factor * recurringCount;
                  setFormData({
                    ...formData, 
                    price: totalPrice,
                    unitPrice: denominator > 0 ? (totalPrice / denominator) : totalPrice
                  });
                }}
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
              onChange={e => {
                const checked = e.target.checked;
                const datesCount = formData.dates.length || 1;
                const recurringCount = checked ? (formData.selectedMonths.length + 1) : 1;
                const gallons = formData.serviceType === 'توصيل مياه' ? (formData.waterGallons || 1) : 1;
                const factor = formData.serviceType === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                const newTotal = formData.unitPrice * factor * recurringCount;
                setFormData({...formData, isRecurring: checked, price: newTotal});
              }}
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
                      const datesCount = formData.dates.length || 1;
                      const recurringCount = newMonths.length + 1;
                      const gallons = formData.serviceType === 'توصيل مياه' ? (formData.waterGallons || 1) : 1;
                      const factor = formData.serviceType === 'توصيل مياه' ? (gallons * datesCount) : (datesCount > 1 ? datesCount : formData.monthsCount);
                      const newTotal = formData.unitPrice * factor * recurringCount;
                      setFormData({...formData, selectedMonths: newMonths, price: newTotal});
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
                    التكلفة الإجمالية: {formData.price} ريال
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

const ClubSubPrintModal = ({ 
  isOpen, 
  onClose, 
  subscriptions, 
  onPrint 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  subscriptions: ClubSubscription[]; 
  onPrint: (sub: ClubSubscription) => void;
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string>('');

  React.useEffect(() => {
    if (subscriptions.length > 0 && !selectedSubId) {
      setSelectedSubId(subscriptions[0].id);
    }
  }, [subscriptions, selectedSubId]);

  const selectedSub = subscriptions.find(s => s.id === selectedSubId);

  const handlePrintSubmit = () => {
    if (selectedSub) {
      onPrint(selectedSub);
      onClose();
    } else {
      toast.error('يرجى تحديد مشترك لطباعة التعهد له');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">طباعة تعهد الاشتراك</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 text-right">اختر المشترك من القائمة</label>
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="w-full h-14 px-5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-right dir-rtl dark:text-white"
                    dir="rtl"
                  >
                    <option value="">-- يرجى تحديد مشترك --</option>
                    {subscriptions.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} - {sub.workplace}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSub && (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-right dir-rtl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 dark:text-slate-400 font-bold">اسم المشترك</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{selectedSub.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 dark:text-slate-400 font-bold">المبنى/الموضع</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{selectedSub.workplace}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 dark:text-slate-400 font-bold">مدة الاشتراك</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{selectedSub.monthsCount} أشهر</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-14 bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-2xl font-black text-sm transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintSubmit}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={18} />
                    طباعة التعهد
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const WhatsAppAlertsModal = ({
  isOpen,
  onClose,
  subscriptions,
  tenants
}: {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: ClubSubscription[];
  tenants: Tenant[];
}) => {
  const [localPhones, setLocalPhones] = useState<{ [subId: string]: string }>({});

  const getDaysRemaining = (endDateTs: any) => {
    if (!endDateTs) return 0;
    const endDate = endDateTs instanceof Timestamp ? endDateTs.toDate() : new Date(endDateTs);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiringSubs = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return subscriptions.filter(sub => {
      if (!sub.endDate || sub.status === 'locked') return false;
      const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : new Date(sub.endDate);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
  };

  const expiringSubs = getExpiringSubs();

  React.useEffect(() => {
    if (isOpen) {
      const phones: { [subId: string]: string } = {};
      expiringSubs.forEach(sub => {
        const matchingTenant = tenants.find(t => 
          t.name === sub.name || 
          t.name.includes(sub.name) || 
          sub.name.includes(t.name)
        );
        phones[sub.id] = sub.phone || matchingTenant?.phone || '';
      });
      setLocalPhones(phones);
    }
  }, [isOpen, subscriptions, tenants]);

  const handlePhoneChange = (subId: string, val: string) => {
    setLocalPhones(prev => ({ ...prev, [subId]: val }));
  };

  const savePhoneToFirestore = async (subId: string, phone: string) => {
    try {
      await updateDoc(doc(db, 'clubSubscriptions', subId), { phone });
    } catch (err) {
      console.error('Error saving phone number:', err);
    }
  };

  const handleSendWhatsAppWeb = async (sub: ClubSubscription) => {
    const phoneNumber = localPhones[sub.id] || '';
    if (!phoneNumber.trim()) {
      toast.error('يرجى تحديد أو إدخال رقم الجوال للمشترك أولاً');
      return;
    }

    if (phoneNumber !== sub.phone) {
      await savePhoneToFirestore(sub.id, phoneNumber);
    }

    let cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
      cleanPhone = '966' + cleanPhone;
    }

    const endFormatted = format(sub.endDate instanceof Timestamp ? sub.endDate.toDate() : new Date(sub.endDate), 'yyyy/MM/dd');
    const daysLeft = getDaysRemaining(sub.endDate);
    
    const renewalUrl = `${window.location.origin}${window.location.pathname}?view=renew-club&subId=${sub.id}`;
    
    const text = `السلام عليكم ورحمة الله وبركاته،
نفيدكم شريكنا العزيز *${sub.name}* بقرب انتهاء اشتراككم في نادي المجمع خلال *${daysLeft}* أيام (بتاريخ ${endFormatted}).
نسعد بدوام مرافقتكم معنا وتجديد اشتراككم عبر الرابط التالي:
${renewalUrl}

طاب يومكم بكل خير 🌸`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    toast.success('تم فتح الواتساب لإرسال التنبيه');
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
          className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8 border-b pb-6 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
                  <BellRing size={24} />
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">تنبيهات انتهاء الاشتراكات (7 أيام)</h3>
                  <p className="text-gray-500 dark:text-slate-400 font-bold text-xs mt-1">تنبيه المشتركين الذين أوشكت اشتراكاتهم على الانتهاء عبر الواتساب ورابط التجديد.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {expiringSubs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500 animate-pulse" />
                  <h4 className="font-black text-lg text-emerald-600 dark:text-emerald-400">نظام المتابعة مكتمل!</h4>
                  <p className="text-xs font-bold mt-1">لا توجد اشتراكات نشطة تنتهي خلال الـ 7 أيام القادمة.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse dir-rtl" dir="rtl">
                    <thead>
                      <tr className="border-b dark:border-slate-800 text-gray-400 text-xs">
                        <th className="pb-4 font-black">الاسم والعمل</th>
                        <th className="pb-4 font-black">تاريخ الانتهاء</th>
                        <th className="pb-4 font-black">الأيام المتبقية</th>
                        <th className="pb-4 font-black">رقم الجوال (واتساب)</th>
                        <th className="pb-4 font-black text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {expiringSubs.map((sub) => {
                        const daysLeft = getDaysRemaining(sub.endDate);
                        let badgeColor = "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
                        if (daysLeft <= 1) {
                          badgeColor = "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400";
                        } else if (daysLeft <= 3) {
                          badgeColor = "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
                        }

                        return (
                          <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors text-sm font-semibold">
                            <td className="py-4">
                              <p className="font-black text-sm text-gray-900 dark:text-white">{sub.name}</p>
                              <p className="text-xs font-bold text-gray-400 mt-0.5">{sub.workplace === 'other' ? (sub as any).customWorkplace || 'أخرى' : sub.workplace}</p>
                            </td>
                            <td className="py-4 font-mono text-xs text-gray-700 dark:text-slate-300">
                              {format(sub.endDate instanceof Timestamp ? sub.endDate.toDate() : new Date(sub.endDate), 'yyyy/MM/dd')}
                            </td>
                            <td className="py-4">
                              <span className={cn("px-3 py-1 rounded-full text-[11px] font-black", badgeColor)}>
                                {daysLeft === 0 ? 'ينتهي اليوم' : daysLeft === 1 ? 'ينتهي غداً' : `متبقي ${daysLeft} أيام`}
                              </span>
                            </td>
                            <td className="py-4">
                              <input 
                                type="tel" 
                                value={localPhones[sub.id] || ''} 
                                onChange={(e) => handlePhoneChange(sub.id, e.target.value)}
                                placeholder="رقم الجوال 05xxxxxxxx"
                                className="w-48 px-3 py-2 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/50 dark:text-white rounded-xl text-xs font-bold focus:outline-none text-right"
                                dir="ltr"
                              />
                            </td>
                            <td className="py-4 text-center">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSendWhatsAppWeb(sub)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 cursor-pointer"
                              >
                                <MessageSquare size={14} />
                                تنبيه واتساب تلقائي
                              </motion.button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t dark:border-slate-800 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-white rounded-xl font-black text-sm transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">رقم الجوال</label>
              <input 
                type="tel"
                value={newClubSub.phone || ''}
                onChange={(e) => setNewClubSub(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none font-bold text-right"
                placeholder="05xxxxxxxx"
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
  initialAdminPhone,
  initialWhatsappGroupLink,
  isDarkMode,
  setIsDarkMode
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (name: string, logo: string | null, background: string | null, color: string, opacity: number, adminPhone: string, whatsappGroupLink: string) => void;
  initialName: string;
  initialLogo: string | null;
  initialBackground: string | null;
  initialThemeColor: string;
  initialBgOpacity: number;
  initialAdminPhone?: string;
  initialWhatsappGroupLink?: string;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}) => {
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [background, setBackground] = useState<string | null>(initialBackground);
  const [color, setColor] = useState(initialThemeColor);
  const [opacity, setOpacity] = useState(initialBgOpacity);
  const [adminPhone, setAdminPhone] = useState(initialAdminPhone || '');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(initialWhatsappGroupLink || '');

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setLogo(initialLogo);
      setBackground(initialBackground);
      setColor(initialThemeColor);
      setOpacity(initialBgOpacity);
      setAdminPhone(initialAdminPhone || '');
      setWhatsappGroupLink(initialWhatsappGroupLink || '');
    }
  }, [isOpen, initialName, initialLogo, initialBackground, initialThemeColor, initialBgOpacity, initialAdminPhone, initialWhatsappGroupLink]);

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
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">رقم جوال المدير (لتلقي إشعارات الحجز والدفع عبر واتساب)</label>
                <input 
                  type="tel" 
                  value={adminPhone}
                  onChange={e => setAdminPhone(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-gray-900 dark:text-white text-right placeholder-gray-400"
                  placeholder="مثال: 9665xxxxxxxx"
                />
                <span className="text-[10px] text-gray-450 mt-1 block">يرجى كتابة الرقم بالصيغة الدولية بدون رمز الزائد (مثال: 966555555555)</span>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">رابط مجموعة واتساب لمتابعة وتتبع الدفع</label>
                <input 
                  type="url" 
                  value={whatsappGroupLink}
                  onChange={e => setWhatsappGroupLink(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-gray-900 dark:text-white placeholder-gray-400 text-left"
                  placeholder="https://chat.whatsapp.com/..."
                  dir="ltr"
                />
                <span className="text-[10px] text-gray-450 mt-1 block">يمكنك نسخ رابط الـ QR المرسل أو أي مجموعة واتساب خاصة بتتبع المدفوعات لمشاركتها مع الأعضاء والعملاء</span>
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



              <div className="pt-4">
                <button 
                  onClick={() => onSave(name, logo, background, color, opacity, adminPhone, whatsappGroupLink)}
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
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedWhatsAppTenant, setSelectedWhatsAppTenant] = useState<Tenant | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isListeningApt, setIsListeningApt] = useState(false);

  const cleanSpokenArabicText = (text: string): string => {
    return text
      .replace(/شقة\s*/g, '')
      .replace(/شقه\s*/g, '')
      .replace(/ابحث\s*عن\s*/g, '')
      .replace(/رقم\s*/g, '')
      .trim();
  };

  const convertSpokenArabicToDigits = (text: string): string => {
    let cleaned = text.trim();
    
    const arabicDigits: { [key: string]: string } = {
      'صفر': '0', 'واحد': '1', 'اثنان': '2', 'اثنين': '2', 'إثنين': '2',
      'ثلاثة': '3', 'ثلاثه': '3', 'اربعة': '4', 'أربعة': '4', 'خمسة': '5', 'خمسه': '5',
      'ستة': '6', 'سته': '6', 'سبعة': '7', 'سبعه': '7', 'ثمانية': '8', 'ثمانيه': '8',
      'تسعة': '9', 'تسعه': '9', 'شقة': '', 'شقه': '', 'رقم': ''
    };

    const words = cleaned.split(/\s+/);
    const mappedWords = words.map(w => {
      const cleanWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      if (arabicDigits[cleanWord] !== undefined) {
        return arabicDigits[cleanWord];
      }
      if (/^\d+$/.test(cleanWord)) {
        return cleanWord;
      }
      return w;
    });

    const joinedStr = mappedWords.join(' ').replace(/\s+/g, '');
    if (/^\d+$/.test(joinedStr)) {
      return joinedStr;
    }
    
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length > 0) {
      return digitsOnly;
    }

    return cleanSpokenArabicText(cleaned);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("متصفحك لا يدعم ميزة التعرف على الكلام. يرجى استخدام متصفح Chrome أو Safari.");
      return;
    }

    if (isListening) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ar-SA';

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("جاري الاستماع... تحدث برقم الشقة أو الكلمات المراد البحث عنها");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error("تم رفض إذن الميكروفون. يرجى تفعيل الإذن، وإذا كنت تستخدم المعاينة داخل AI Studio يرجى فتح التطبيق في نافذة جديدة لاستخدام البحث الصوتي.");
        } else if (event.error === 'no-speech') {
          toast("لم يتم سماع أي صوت. يرجى المحاولة مرة أخرى.");
        } else {
          toast.error("حدث خطأ أثناء التعرف على الصوت.");
        }
      };

      recognition.onresult = (event: any) => {
        const resultString = event.results[0][0].transcript;
        if (resultString) {
          const converted = convertSpokenArabicToDigits(resultString);
          setSearchTerm(converted);
          toast.success(`تم التعرف الصوتي: ${converted}`);
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      toast.error("خطأ في تشغيل ميزة البحث الصوتي");
    }
  };

  const startVoiceSearchApt = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("متصفحك لا يدعم ميزة التعرف على الكلام. يرجى استخدام متصفح Chrome أو Safari.");
      return;
    }

    if (isListeningApt) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ar-SA';

      recognition.onstart = () => {
        setIsListeningApt(true);
        toast.info("جاري الاستماع... تحدث برقم الشقة أو المبنى");
      };

      recognition.onend = () => {
        setIsListeningApt(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsListeningApt(false);
        if (event.error === 'not-allowed') {
          toast.error("تم رفض إذن الميكروفون. يرجى تفعيل الإذن، وإذا كنت تستخدم المعاينة داخل AI Studio يرجى فتح التطبيق في نافذة جديدة لاستخدام البحث الصوتي.");
        } else if (event.error === 'no-speech') {
          toast("لم يتم سماع أي صوت. يرجى المحاولة مرة أخرى.");
        } else {
          toast.error("حدث خطأ أثناء التعرف على الصوت.");
        }
      };

      recognition.onresult = (event: any) => {
        const resultString = event.results[0][0].transcript;
        if (resultString) {
          const converted = convertSpokenArabicToDigits(resultString);
          setAptSearch(converted);
          toast.success(`تم التعرف الصوتي: ${converted}`);
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListeningApt(false);
      toast.error("خطأ في تشغيل ميزة البحث الصوتي");
    }
  };

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
  const [isMonthlyListModalOpen, setIsMonthlyListModalOpen] = useState(false);
  const [confirmDuplicatePrevMonth, setConfirmDuplicatePrevMonth] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmDeleteClubSubId, setConfirmDeleteClubSubId] = useState<string | null>(null);
  const [confirmDeleteAptRequests, setConfirmDeleteAptRequests] = useState<{ building: string; apartment: string } | null>(null);
  const [confirmSaveData, setConfirmSaveData] = useState<any | null>(null);
  const [customPhoneInput, setCustomPhoneInput] = useState<{ [key: string]: string }>({});
  const [activePhoneInputId, setActivePhoneInputId] = useState<string | null>(null);
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
  const [adminPhone, setAdminPhone] = useState('');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('https://chat.whatsapp.com/GiYTHd978eMJ3o2oEDb2JC');
  const [clubSubscriptions, setClubSubscriptions] = useState<ClubSubscription[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [workerForm, setWorkerForm] = useState({ name: '', phone: '' });
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const gameRoomBookings = React.useMemo(() => 
    bookings.filter(b => b.serviceType === 'حجز غرفة الألعاب'), 
  [bookings]);
  const [isGameRoomModalOpen, setIsGameRoomModalOpen] = useState(false);
  const [editingGameRoomBooking, setEditingGameRoomBooking] = useState<Booking | null>(null);
  const [isClubSubscriptionModalOpen, setIsClubSubscriptionModalOpen] = useState(false);
  const [isClubSubPrintModalOpen, setIsClubSubPrintModalOpen] = useState(false);
  const [isWhatsAppAlertsModalOpen, setIsWhatsAppAlertsModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', displayName: '' });
  const [loginMethod, setLoginMethod] = useState<'username' | 'phone'>('username');
  const [isPublicBookingView, setIsPublicBookingView] = useState(false);
  const [isOverduePanelExpanded, setIsOverduePanelExpanded] = useState(false);
  const [publicView, setPublicView] = useState<'book' | 'renew-club' | null>(null);
  const [renewalSubId, setRenewalSubId] = useState<string | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isFinancialDashboardOpen, setIsFinancialDashboardOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aptFileInputRef = useRef<HTMLInputElement>(null);
  const requestsFileInputRef = useRef<HTMLInputElement>(null);
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
  const [isAptCodesModalOpen, setIsAptCodesModalOpen] = useState(false);
  const [selectedSubscriptionForPayments, setSelectedSubscriptionForPayments] = useState<CleaningRequest | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const inventoryReportRef = useRef<HTMLDivElement>(null);
  const staffReportRef = useRef<HTMLDivElement>(null);
  const bulkInvoicesRef = useRef<HTMLDivElement>(null);
  const clubSubscriptionFormRef = useRef<HTMLDivElement>(null);
  const [selectedClubSubForPrint, setSelectedClubSubForPrint] = useState<ClubSubscription | null>(null);
  const isAdmin = user?.uid === 'fyozr-admin-user' || user?.email === '11aabbcc54@gmail.com' || (user as any)?.role === 'admin';

  const exportAnyToExcel = (dataList: any[], fields: { id: string; label: string }[], filename: string) => {
    if (!dataList || dataList.length === 0) {
      toast.error('لا توجد بيانات لتصديرها');
      return;
    }
    try {
      const exportData = dataList.map((item) => {
        const row: any = {};
        fields.forEach(field => {
          let value = item[field.id];
          if (value && typeof value === 'object' && value.toDate) {
            try {
              value = format(value.toDate(), 'yyyy-MM-dd HH:mm');
            } catch (e) {
              value = String(value);
            }
          } else if (value instanceof Date) {
            value = format(value, 'yyyy-MM-dd HH:mm');
          }
          
          // Localization maps
          if (value === 'paid') value = 'مدفوع';
          if (value === 'unpaid') value = 'معلق';
          if (value === 'completed') value = 'تم التنفيذ';
          if (value === 'pending') value = 'قيد التنفيذ';
          if (value === 'active') value = 'نشط';
          if (value === 'expired') value = 'منتهي';
          if (value === 'vacant') value = 'شاغر';
          if (value === 'occupied') value = 'مأهول';
          if (value === 'confirmed') value = 'مؤكد';
          if (value === 'cancelled') value = 'ملغي';

          row[field.label] = value ?? '';
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      saveAs(dataBlob, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('تم تصدير البيانات بنجاح كملف Excel');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'daily-tasks', label: 'المهام اليومية', icon: CalendarCheck },
    { id: 'تكرار الطلبات', label: 'تكرار الطلبات', icon: Repeat },
    { id: 'staff', label: 'إدارة العمالة', icon: UserIcon },
    { id: 'club-subscriptions', label: 'اشتراكات النادي', icon: ListTodo },
    { id: 'game-room-bookings', label: 'حجز غرفة الألعاب', icon: Gamepad2 },
    { id: 'bookings', label: 'إدارة الحجوزات', icon: Calendar },
    { id: 'طلبات الماء', label: 'إدارة المياه والمخزون', icon: Droplets },
    { id: 'طلبات الصيانة', label: 'طلبات الصيانة', icon: Wrench },
    ...BUILDINGS.map(b => ({ id: b, label: b, icon: Home })),
    { id: 'تنظيف سيارات', label: 'تنظيف السيارات', icon: Car },
    { id: 'car-subscriptions', label: 'اشتراكات السيارات', icon: CalendarPlus },
    { id: 'property-units', label: 'إدارة الوحدات', icon: Home },
    { id: 'tenants', label: 'العقود', icon: FileCheck },
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
        if (data.adminPhone !== undefined) setAdminPhone(data.adminPhone);
        if (data.whatsappGroupLink !== undefined) setWhatsappGroupLink(data.whatsappGroupLink);
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



  const updateBranding = async (name: string, logo: string | null, background: string | null, color: string, opacity: number, phoneStr: string, groupLinkStr: string) => {
    try {
      await setDoc(doc(db, 'settings', 'branding'), { name, logo, background, themeColor: color, bgOpacity: opacity, adminPhone: phoneStr, whatsappGroupLink: groupLinkStr }, { merge: true });
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

  const saveGameRoomBooking = async (data: any) => {
    try {
      if (editingGameRoomBooking) {
        await updateDoc(doc(db, 'bookings', editingGameRoomBooking.id), data);
        toast.success('تم تحديث الحجز بنجاح');
      } else {
        await addDoc(collection(db, 'bookings'), data);
        toast.success('تم إضافة الحجز بنجاح');
      }
      setIsGameRoomModalOpen(false);
      setEditingGameRoomBooking(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bookings');
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
      const isPaidStatus = paymentStatus === 'paid';
      if (isPaidStatus && sub) {
        updateData.collectedAmount = sub.totalPrice;
        updateData.paymentDate = Timestamp.now();
      } else if (paymentStatus === 'unpaid') {
        updateData.collectedAmount = 0;
        updateData.paymentDate = null;
      }
      await updateDoc(doc(db, 'clubSubscriptions', id), updateData);
      toast.success(paymentStatus === 'paid' ? 'تم تحصيل المبلغ بنجاح' : 'تم إلغاء التحصيل');

      if (sub) {
        const statusTxt = isPaidStatus ? '✅ تم التحصيل' : '❌ ملغى / غير مدفوع';
        const collectMsg = `*تحديث دفع اشتراك النادي الرياضي 🏋️‍♂️💸*\n\n` +
          `• *المشترك:* ${sub.name}\n` +
          `• *رقم الجوال:* ${sub.phone || 'غير محدد'}\n` +
          `• *المدة:* ${sub.monthsCount} أشهر\n` +
          `• *قيمة الاشتراك:* ${sub.totalPrice} ريال\n` +
          `• *حالة الدفع:* ${statusTxt}\n` +
          (isPaidStatus ? `• *تاريخ التحصيل:* ${format(new Date(), 'yyyy/MM/dd - hh:mm a')}\n` : '') +
          `\n• *مجموعة تتبع دفعات الخدمة والدعم وتأكيد الحالة (واتساب) 👇:* \n${whatsappGroupLink || 'https://chat.whatsapp.com/GiYTHd978eMJ3o2oEDb2JC'}`;
          
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(collectMsg)}`, '_blank');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clubSubscriptions/${id}`);
    }
  };

  const deleteClubSubscription = async (id: string) => {
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

  const handlePrintClubSub = useReactToPrint({
    contentRef: clubSubscriptionFormRef,
    onAfterPrint: () => setSelectedClubSubForPrint(null),
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

  useEffect(() => {
    let active = true;
    let retryCount = 0;

    if (selectedClubSubForPrint) {
      const checkAndPrint = () => {
        if (!active) return;
        if (clubSubscriptionFormRef.current) {
          handlePrintClubSub();
        } else if (retryCount < 10) {
          retryCount++;
          setTimeout(checkAndPrint, 100);
        } else {
          setSelectedClubSubForPrint(null);
          toast.error('حدث خطأ أثناء تهيئة نموذج الطباعة. يرجى المحاولة مرة أخرى.');
        }
      };

      const timer = setTimeout(checkAndPrint, 250);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [selectedClubSubForPrint, handlePrintClubSub]);

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

  const handleImportRequests = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        toast.loading('جاري استيراد الطلبات...');

        let importedCount = 0;
        let errorCount = 0;

        for (const row of data) {
          try {
            const apartmentNumber = String(row['رقم الشقة'] || row['الشقة'] || row['Apartment Number'] || row['Apartment'] || '').trim();
            const buildingName = String(row['اسم المبنى'] || row['المبنى'] || row['Building Name'] || row['Building'] || '').trim();
            const serviceType = String(row['الخدمة'] || row['نوع الخدمة'] || row['Service Type'] || row['Service'] || '').trim();
            
            let dateVal = row['التاريخ'] || row['Date'] || '';
            let date = Timestamp.now();
            if (dateVal) {
              if (typeof dateVal === 'number') {
                const dateObj = new Date((dateVal - 25569) * 86400 * 1000);
                date = Timestamp.fromDate(dateObj);
              } else {
                const parsedDate = new Date(dateVal);
                if (!isNaN(parsedDate.getTime())) {
                  date = Timestamp.fromDate(parsedDate);
                } else if (typeof dateVal === 'string' && dateVal.includes('/')) {
                  const parts = dateVal.split('/');
                  if (parts.length === 3) {
                    const d = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const y = parseInt(parts[2], 10);
                    const parsed = new Date(y, m, d);
                    if (!isNaN(parsed.getTime())) date = Timestamp.fromDate(parsed);
                  }
                }
              }
            }

            const price = Number(row['السعر'] || row['المبلغ'] || row['Price'] || row['Amount'] || 0);
            const monthsCount = Number(row['عدد الأشهر'] || row['العدد'] || row['Months Count'] || 1);
            const notes = String(row['ملاحظات'] || row['Notes'] || '').trim();
            const workerName = String(row['اسم العامل'] || row['Worker Name'] || row['Worker'] || '').trim();
            
            const rawStatus = String(row['الحالة'] || row['Status'] || '').trim();
            const status = (rawStatus === 'منفذة ' || rawStatus === 'منفذ' || rawStatus === 'تم التنفيذ' || rawStatus.toLowerCase() === 'completed') ? 'completed' : 'pending';

            const rawPaymentStatus = String(row['حالة الدفع'] || row['Payment Status'] || '').trim();
            const paymentStatus = (rawPaymentStatus === 'تم الدفع' || rawPaymentStatus === 'مدفوع' || rawPaymentStatus.toLowerCase() === 'paid') ? 'paid' : 'unpaid';

            if (!apartmentNumber || !serviceType) {
              errorCount++;
              continue;
            }

            await addDoc(collection(db, 'requests'), {
              apartmentNumber,
              buildingName,
              serviceType,
              date,
              price,
              monthsCount,
              notes,
              workerName,
              status,
              paymentStatus,
              userId: user?.uid || 'anonymous',
              createdAt: Timestamp.now()
            });

            importedCount++;
          } catch (err) {
            console.error('Error importing request:', row, err);
            errorCount++;
          }
        }

        toast.dismiss();
        if (importedCount > 0) {
          toast.success(`تم استيراد ${importedCount} طلب بنجاح`);
        } else {
          toast.info('لم يتم العثور على بيانات صالحة للاستيراد');
        }
        if (errorCount > 0) {
          toast.error(`فشل استيراد ${errorCount} سجل. تأكد من صحة الأعمدة.`);
        }
      } catch (error) {
        console.error(error);
        toast.dismiss();
        toast.error('حدث خطأ أثناء استيراد البيانات');
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

  const importCarSubscriptionsFromImage = async () => {
    const loadingId = toast.loading('جاري استيراد اشتراكات غسيل السيارات من الصورة...');
    try {
      const CAR_IMAGE_DATA = [
        {
          apartmentNumber: "23-28029",
          apartment: "134",
          car: "toyota prado",
          startDate: "2026-01-01",
          workerName: "سيف ، عبدالله",
          price: 600,
          monthsCount: 3,
          schedule: [2, 5],
        },
        {
          apartmentNumber: "5901- AVR",
          apartment: "522",
          car: "Jetour T2",
          startDate: "2026-04-01",
          workerName: "قلم ، شميم",
          price: 600,
          monthsCount: 3,
          schedule: [0, 4],
        },
        {
          apartmentNumber: "TTU-77",
          apartment: "327",
          car: "jeep wrangler",
          startDate: "2026-03-01",
          workerName: "عراف وعارفور",
          price: 600,
          monthsCount: 3,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "AJS-20",
          apartment: "327",
          car: "Range rover",
          startDate: "2026-03-01",
          workerName: "عراف وعارفور",
          price: 600,
          monthsCount: 3,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "LTR-3100",
          apartment: "517",
          car: "kiea stranger",
          startDate: "2026-01-01",
          workerName: "قلم ، شميم",
          price: 300,
          monthsCount: 2,
          schedule: [0, 4],
        },
        {
          apartmentNumber: "1724 VJD",
          apartment: "422",
          car: "Merceds",
          startDate: "2026-03-02",
          workerName: "منصور، شهاب",
          price: 400,
          monthsCount: 2,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "klr-7132",
          apartment: "313",
          car: "geely white",
          startDate: "2026-05-01",
          workerName: "عراف وعارفور",
          price: 300,
          monthsCount: 2,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "htr 1729",
          apartment: "227",
          car: "audi s3",
          startDate: "2026-04-01",
          workerName: "شوهاد، حسن",
          price: 300,
          monthsCount: 2,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "tgr-1078",
          apartment: "217",
          car: "nissan patrol",
          startDate: "2026-04-01",
          workerName: "شوهاد، حسن",
          price: 600,
          monthsCount: 3,
          schedule: [0, 3],
        },
        {
          apartmentNumber: "Bahrain",
          apartment: "204",
          car: "nissan patrol",
          startDate: "2026-06-01",
          workerName: "شوهاد، حسن",
          price: 600,
          monthsCount: 3,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "LDE 151",
          apartment: "135",
          car: "BMW",
          startDate: "2026-07-01",
          workerName: "سيف ، عبدالله",
          price: 450,
          monthsCount: 3,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "GSR 1846",
          apartment: "135",
          car: "FORD TERRITOR",
          startDate: "2026-07-01",
          workerName: "سيف ، عبدالله",
          price: 600,
          monthsCount: 3,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "ajs-3315",
          apartment: "407",
          car: "toyota",
          startDate: "2026-06-01",
          workerName: "منصور، شهاب",
          price: 400,
          monthsCount: 2,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "no. 683163",
          apartment: "219",
          car: "Nissan extrail",
          startDate: "2026-08-01",
          workerName: "شوهاد، حسن",
          price: 700,
          monthsCount: 4,
          schedule: [1, 4],
        },
        {
          apartmentNumber: "lvd-1290",
          apartment: "224",
          car: "lexus es",
          startDate: "2026-10-01",
          workerName: "شوهاد، حسن",
          price: 450,
          monthsCount: 3,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "بدون لوحة - 403",
          apartment: "403",
          car: "alfa romio",
          startDate: "2026-01-17",
          workerName: "منصور، شهاب",
          price: 600,
          monthsCount: 3,
          schedule: [1, 4],
        },
        {
          apartmentNumber: "THD - 2660",
          apartment: "316",
          car: "mini coper",
          startDate: "2026-12-01",
          workerName: "عراف وعارفور",
          price: 600,
          monthsCount: 4,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "lkr-5466",
          apartment: "526",
          car: "genss- gray",
          startDate: "2026-01-06",
          workerName: "قلم ، شميم",
          price: 450,
          monthsCount: 3,
          schedule: [2, 5],
        },
        {
          apartmentNumber: "5509 BZD",
          apartment: "425",
          car: "merceds suv",
          startDate: "2026-01-13",
          workerName: "منصور، شهاب",
          price: 400,
          monthsCount: 2,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "tkr-6545",
          apartment: "424",
          car: "nissan",
          startDate: "2026-01-19",
          workerName: "منصور، شهاب",
          price: 400,
          monthsCount: 4,
          schedule: [1],
        },
        {
          apartmentNumber: "68217",
          apartment: "411",
          car: "أبو ظبي tandra",
          startDate: "2026-01-21",
          workerName: "منصور، شهاب",
          price: 200,
          monthsCount: 1,
          schedule: [0, 3],
        },
        {
          apartmentNumber: "ksr-7171",
          apartment: "233",
          car: "defender",
          startDate: "2026-01-21",
          workerName: "شوهاد، حسن",
          price: 520,
          monthsCount: 1,
          schedule: [1, 2, 3, 4, 5],
        },
        {
          apartmentNumber: "DAR-5454",
          apartment: "322",
          car: "merceds cope",
          startDate: "2026-01-26",
          workerName: "عراف وعارفور",
          price: 600,
          monthsCount: 4,
          schedule: [2, 5],
        },
        {
          apartmentNumber: "ahd-5570",
          apartment: "1110",
          car: "porche",
          startDate: "2026-01-31",
          workerName: "شاهين، عبدالله",
          price: 600,
          monthsCount: 3,
          schedule: [0, 3],
        },
        {
          apartmentNumber: "BDR-5197",
          apartment: "1110",
          car: "toress",
          startDate: "2026-01-31",
          workerName: "شاهين، عبدالله",
          price: 450,
          monthsCount: 3,
          schedule: [0, 3],
        },
        {
          apartmentNumber: "NXR 3612",
          apartment: "419",
          car: "FORD TERRITOR",
          startDate: "2026-02-24",
          workerName: "منصور، شهاب",
          price: 400,
          monthsCount: 2,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "NZR 5978",
          apartment: "125",
          car: "Jetour",
          startDate: "2026-02-25",
          workerName: "سيف ، عبدالله",
          price: 400,
          monthsCount: 2,
          schedule: [3, 6],
        },
        {
          apartmentNumber: "قطر proche",
          apartment: "107",
          car: "proche",
          startDate: "2026-03-07",
          workerName: "سيف ، عبدالله",
          price: 400,
          monthsCount: 2,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "بدون لوحة - 106",
          apartment: "106",
          car: "lexus es",
          startDate: "2026-04-07",
          workerName: "سيف ، عبدالله",
          price: 150,
          monthsCount: 1,
          schedule: [2, 6],
        },
        {
          apartmentNumber: "٢٣٤٨ س د ل",
          apartment: "106",
          car: "Jeep 212",
          startDate: "2026-04-26",
          workerName: "سيف ، عبدالله",
          price: 200,
          monthsCount: 1,
          schedule: [0, 3],
        }
      ];

      let importedCount = 0;
      for (const item of CAR_IMAGE_DATA) {
        const alreadyExists = requests.some(r => 
          r.serviceType === 'تنظيف سيارات' && 
          r.isSubscription && 
          r.apartmentNumber === item.apartmentNumber &&
          (r.notes || '').includes(item.car)
        );

        if (alreadyExists) continue;

        const start = new Date(item.startDate);
        const end = addMonths(start, item.monthsCount);

        const docData = {
          serviceType: 'تنظيف سيارات',
          apartmentNumber: item.apartmentNumber,
          apartment: item.apartment,
          car: item.car,
          price: item.price,
          date: Timestamp.fromDate(start),
          subscriptionStartDate: Timestamp.fromDate(start),
          subscriptionEndDate: Timestamp.fromDate(end),
          subscriptionSchedule: item.schedule,
          subscriptionFrequency: 'weekly',
          monthsCount: item.monthsCount,
          isSubscription: true,
          workerName: item.workerName,
          notes: `السيارة: ${item.car} | الشقة: ${item.apartment}`,
          userId: user?.uid || 'anonymous',
          createdAt: Timestamp.now(),
          status: 'completed',
          paymentStatus: 'paid',
          buildingName: 'نظافة سيارات'
        };

        await addDoc(collection(db, 'requests'), docData);
        importedCount++;
      }

      toast.dismiss(loadingId);
      if (importedCount > 0) {
        toast.success(`تم استيراد ${importedCount} اشتراك سيارة بنجاح`);
      } else {
        toast.info('جميع الاشتراكات موجودة مسبقاً في النظام');
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingId);
      toast.error('حدث خطأ أثناء استيراد اشتراكات الصورة');
    }
  };

  const handleUploadAndAnalyzeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingId = toast.loading('جاري رفع وتحليل الصورة بواسطة الذكاء الاصطناعي... يرجى الانتظار');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          
          const response = await fetch('/api/gemini/analyze-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64String,
              mimeType: file.type
            })
          });

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error('Received HTML instead of JSON. Snippet:', htmlText.substring(0, 300));
            // Try to extract an error from the HTML if it's an Express/Vite error page
            const match = htmlText.match(/<pre>(.*?)<\/pre>/s) || htmlText.match(/<title>(.*?)<\/title>/s);
            const errorInHtml = match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
            throw new Error(`استجابة غير صالحة من السيرفر (HTML). رمز الحالة: ${response.status}${errorInHtml ? ` - الخطأ: ${errorInHtml.substring(0, 100)}` : ''}`);
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `خطأ من السيرفر: ${response.status}`);
          }

          const { data } = await response.json();
          if (!data || !Array.isArray(data)) {
            throw new Error('لم يتمكن الذكاء الاصطناعي من استخراج الاشتراكات من هذه الصورة بشكل صحيح.');
          }

          if (data.length === 0) {
            toast.dismiss(loadingId);
            toast.warning('لم يتم العثور على أي بيانات اشتراكات سيارات في الصورة.');
            return;
          }

          let importedCount = 0;
          for (const item of data) {
            const alreadyExists = requests.some(r => 
              r.serviceType === 'تنظيف سيارات' && 
              r.isSubscription && 
              r.apartmentNumber === item.apartmentNumber &&
              (r.notes || '').includes(item.car)
            );

            if (alreadyExists) continue;

            const start = item.startDate ? new Date(item.startDate) : new Date();
            const end = addMonths(start, item.monthsCount || 1);

            const docData = {
              serviceType: 'تنظيف سيارات',
              apartmentNumber: item.apartmentNumber || 'بدون لوحة',
              apartment: item.apartment || 'غير محدد',
              car: item.car || 'غير محدد',
              price: Number(item.price || 300),
              date: Timestamp.fromDate(start),
              subscriptionStartDate: Timestamp.fromDate(start),
              subscriptionEndDate: Timestamp.fromDate(end),
              subscriptionSchedule: item.schedule || [0, 3],
              subscriptionFrequency: 'weekly',
              monthsCount: Number(item.monthsCount || 1),
              isSubscription: true,
              workerName: item.workerName || 'غير معين',
              notes: `السيارة: ${item.car || 'غير محدد'} | الشقة: ${item.apartment || 'غير محدد'}`,
              userId: user?.uid || 'anonymous',
              createdAt: Timestamp.now(),
              status: 'completed',
              paymentStatus: 'paid',
              buildingName: 'نظافة سيارات'
            };

            await addDoc(collection(db, 'requests'), docData);
            importedCount++;
          }

          toast.dismiss(loadingId);
          if (importedCount > 0) {
            toast.success(`تم بنجاح استخراج واستيراد ${importedCount} اشتراك سيارة من الصورة!`);
          } else {
            toast.info('جميع الاشتراكات الموجودة في الصورة مسجلة مسبقاً في النظام.');
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          toast.dismiss(loadingId);
          toast.error(`خطأ في تحليل الصورة: ${innerErr.message || innerErr}`);
        }
      };

      reader.onerror = () => {
        toast.dismiss(loadingId);
        toast.error('حدث خطأ أثناء قراءة ملف الصورة من الجهاز.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      toast.dismiss(loadingId);
      toast.error('حدث خطأ في معالجة الملف.');
    } finally {
      e.target.value = '';
    }
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

        const promises = dates.map((date: any) => {
          const isRecurring = dates.length > 1;
          const finalPrice = isRecurring && rest.unitPrice ? (rest.unitPrice * (rest.serviceType === 'توصيل مياه' ? (rest.waterGallons || 1) : 1)) : rest.price;
          const finalMonthsCount = isRecurring ? 1 : rest.monthsCount; // keep the count per date

          return addDoc(collection(db, 'requests'), {
            ...rest,
            date: date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date)),
            price: Number(finalPrice),
            monthsCount: Number(finalMonthsCount),
            userId: user.uid,
            createdAt: rest.createdAt || Timestamp.now(),
            status: rest.status || 'pending',
            paymentStatus: 'unpaid'
          });
        });
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

  const updateStatus = async (id: string, field: 'status' | 'paymentStatus' | 'price', value: string | number, skipWhatsApp = false) => {
    try {
      const requestRef = doc(db, 'requests', id);
      const updateData: any = { [field]: value };
      if (field === 'paymentStatus') {
        if (value === 'paid') {
          updateData.paymentDate = Timestamp.now();
        } else {
          updateData.paymentDate = null;
        }
      }
      await updateDoc(requestRef, updateData);
      if (field !== 'price') {
        toast.success('تم تحديث الحالة بنجاح');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
  };
  
  const toggleDailyCompletion = async (req: CleaningRequest, date: Date) => {
    if (!req.isSubscription) {
      const nextStatus = req.status === 'pending' ? 'completed' : 'pending';
      return updateStatus(req.id, 'status', nextStatus);
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentCompleted = req.completedDates || [];
    const isCompleted = currentCompleted.includes(dateStr);
    
    const newCompleted = isCompleted 
      ? currentCompleted.filter(d => d !== dateStr)
      : [...currentCompleted, dateStr];
      
    try {
      await updateDoc(doc(db, 'requests', req.id), {
        completedDates: newCompleted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحديث حالة التنفيذ');
    }
  };

  const duplicatePreviousMonthSchedule = async () => {
    const prevMonth = subMonths(selectedMonth, 1);
    const prevMonthRequests = requests.filter(req => isSameMonth(safeToDate(req.date), prevMonth));
    
    if (prevMonthRequests.length === 0) {
      toast.error('لا توجد طلبات في الشهر السابق لنسخها');
      return;
    }

    setConfirmDuplicatePrevMonth(true);
  };

  const executeDuplicatePreviousMonthSchedule = async () => {
    const prevMonth = subMonths(selectedMonth, 1);
    const prevMonthRequests = requests.filter(req => isSameMonth(safeToDate(req.date), prevMonth));
    
    if (prevMonthRequests.length === 0) return;

    const loadingToast = toast.loading('جاري نسخ الجدول...');
    
    try {
      const promises = prevMonthRequests.map(req => {
        const sourceDate = safeToDate(req.date);
        let targetDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), sourceDate.getDate());
        
        // Handle month day overflow
        if (targetDate.getMonth() !== selectedMonth.getMonth()) {
          targetDate = endOfMonth(selectedMonth);
        }

        // Keep the original time if possible
        const hours = sourceDate.getHours();
        const minutes = sourceDate.getMinutes();
        targetDate.setHours(hours, minutes, 0, 0);

        const { id, ...newReqData } = req;
        return addDoc(collection(db, 'requests'), {
          ...newReqData,
          date: targetDate,
          createdAt: serverTimestamp(),
          status: 'pending',
          paymentStatus: 'unpaid',
          receiptUrl: null,
          beforePhotoUrl: null,
          afterPhotoUrl: null,
          completedDates: [] // clear completion arrays for next month
        });
      });

      await Promise.all(promises);
      toast.success('تم نسخ الجدول بنجاح', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء نسخ الجدول', { id: loadingToast });
    }
  };

  const generateMonthlyList = async (targetDateString: string, sourceDateString: string | null, mode: 'blank' | 'copy') => {
    const targetDate = new Date(targetDateString + '-01'); // e.g. '2026-07' -> '2026-07-01'
    
    if (mode === 'blank') {
      // Just switch global view
      setSelectedMonth(targetDate);
      toast.success(`تم الانتقال إلى شهر ${format(targetDate, 'MMMM yyyy', { locale: ar })}. يمكنك البدء بإضافة طلبات جديدة.`);
      return;
    }

    if (!sourceDateString) {
      toast.error('يرجى تحديد الشهر المصدر للنسخ منه');
      return;
    }

    const sourceDate = new Date(sourceDateString + '-01');
    const sourceRequests = requests.filter(req => isSameMonth(safeToDate(req.date), sourceDate));

    if (sourceRequests.length === 0) {
      toast.error('لا توجد طلبات في الشهر المصدر لنسخها');
      return;
    }

    const toastId = toast.loading('جاري إنشاء القائمة ونسخ المهام...');

    try {
      const promises = sourceRequests.map(req => {
        const reqDate = safeToDate(req.date);
        
        let targetReqDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), reqDate.getDate());
        if (targetReqDate.getMonth() !== targetDate.getMonth()) {
          targetReqDate = endOfMonth(targetDate);
        }
        targetReqDate.setHours(reqDate.getHours(), reqDate.getMinutes(), 0, 0);

        const { id, ...newReqData } = req;
        return addDoc(collection(db, 'requests'), {
          ...newReqData,
          date: targetReqDate,
          createdAt: serverTimestamp(),
          status: 'pending',
          paymentStatus: 'unpaid',
          receiptUrl: null,
          beforePhotoUrl: null,
          afterPhotoUrl: null,
          completedDates: []
        });
      });

      await Promise.all(promises);
      setSelectedMonth(targetDate);
      toast.success(`تم إنشاء قائمة جديدة لشهر ${format(targetDate, 'MMMM yyyy', { locale: ar })} ونسخ ${sourceRequests.length} طلب بنجاح!`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء نسخ وإنشاء القائمة', { id: toastId });
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

  // Sync globalSelectedDate with selectedMonth
  React.useEffect(() => {
    if (!isSameMonth(globalSelectedDate, selectedMonth)) {
      setGlobalSelectedDate(startOfMonth(selectedMonth));
    }
  }, [selectedMonth]);

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
      activeTab === 'طلبات الصيانة' ||
      (serviceFilter === 'cars' ? req.serviceType === 'تنظيف سيارات' : req.serviceType !== 'تنظيف سيارات' && req.serviceType !== 'توصيل مياه');
    
    let matchesTab = activeTab === 'dashboard' || activeTab === 'daily-tasks';
    if (activeTab === 'تكرار الطلبات') {
      matchesTab = req.isRecurring === true;
    } else if (activeTab === 'تنظيف سيارات') {
      matchesTab = req.serviceType === 'تنظيف سيارات';
    } else if (activeTab === 'طلبات الماء') {
      matchesTab = req.serviceType === 'توصيل مياه';
    } else if (activeTab === 'طلبات الصيانة') {
      matchesTab = req.serviceType.includes('صيانة');
    } else if (BUILDINGS.includes(activeTab)) {
      matchesTab = req.buildingName === activeTab && req.serviceType !== 'توصيل مياه';
    }

    return matchesMonth && matchesSearch && matchesTab && matchesPayment && matchesService && matchesStatus;
  }).sort((a, b) => safeToDate(b.date).getTime() - safeToDate(a.date).getTime());

  const [selectedHistoryGroup, setSelectedHistoryGroup] = useState<CleaningRequest[] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedSubscriptionDetail, setSelectedSubscriptionDetail] = useState<CleaningRequest | null>(null);

  const groupedFilteredRequests = React.useMemo(() => {
    const groups: Record<string, { 
      latest: CleaningRequest, 
      count: number, 
      totalPrice: number, 
      totalWaterGallons: number,
      totalMonthsCount: number,
      allCompleted: boolean, 
      allPaid: boolean,
      ids: string[]
    }> = {};

    filteredRequests.forEach(req => {
      const reqDate = safeToDate(req.date);
      const monthStr = format(reqDate, 'yyyy-MM');
      const key = `${req.buildingName}-${req.apartmentNumber}-${req.serviceType}-${monthStr}`;
      if (!groups[key]) {
        groups[key] = {
          latest: req,
          count: 0,
          totalPrice: 0,
          totalWaterGallons: 0,
          totalMonthsCount: 0,
          allCompleted: true,
          allPaid: true,
          ids: []
        };
      }
      
      groups[key].count += 1;
      groups[key].totalPrice += req.price;
      groups[key].totalWaterGallons += (req.waterGallons || 0);
      groups[key].totalMonthsCount += (req.monthsCount || 0);
      groups[key].ids.push(req.id);
      
      if (req.status !== 'completed') groups[key].allCompleted = false;
      if (req.paymentStatus !== 'paid') groups[key].allPaid = false;
      
      // Keep most recent as representative
      if (safeToDate(req.date) > safeToDate(groups[key].latest.date)) {
        groups[key].latest = req;
      }
    });

    return Object.values(groups).sort((a, b) => safeToDate(b.latest.date).getTime() - safeToDate(a.latest.date).getTime());
  }, [filteredRequests]);

  const carCleaningDailyRequests = React.useMemo(() => {
    return requests.filter(req => {
      if (req.serviceType !== 'تنظيف سيارات') return false;
      
      const reqDate = safeToDate(req.date);
      if (req.isSubscription) {
        const start = safeToDate(req.subscriptionStartDate || req.date);
        const end = safeToDate(req.subscriptionEndDate);
        const dayOfWeek = globalSelectedDate.getDay();
        
        const checkDate = new Date(globalSelectedDate.getFullYear(), globalSelectedDate.getMonth(), globalSelectedDate.getDate());
        const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        return checkDate >= startDate && checkDate <= endDate && (req.subscriptionSchedule?.includes(dayOfWeek));
      }
      
      return isSameDay(reqDate, globalSelectedDate);
    }).sort((a, b) => safeToDate(a.date).getTime() - safeToDate(b.date).getTime());
  }, [requests, globalSelectedDate]);

  const groupedRequests = React.useMemo(() => {
    const groups: Record<string, CleaningRequest[]> = {};
    filteredRequests.forEach(req => {
      const reqDate = safeToDate(req.date);
      const monthStr = format(reqDate, 'yyyy-MM');
      const key = `${req.buildingName}-${req.apartmentNumber}-${req.serviceType}-${monthStr}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(req);
    });
    return groups;
  }, [filteredRequests]);

  const stats = {
    total: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth)).length + 
           clubSubscriptions.filter(s => isSameMonth(safeToDate(s.startDate || s.createdAt), selectedMonth)).length,
    paid: requests.filter(r => r.paymentStatus === 'paid' && isSameMonth(safeToDate(r.paymentDate || r.date), selectedMonth)).reduce((s, r) => s + Number(r.price || 0), 0) +
          clubSubscriptions.filter(s => s.paymentStatus === 'paid' && isSameMonth(safeToDate(s.paymentDate || s.startDate || s.createdAt), selectedMonth)).reduce((sum, s) => sum + Number(s.collectedAmount || s.totalPrice || 0), 0),
    totalMonthly: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth)).length +
                  clubSubscriptions.filter(s => isSameMonth(safeToDate(s.startDate || s.createdAt), selectedMonth)).length,
    unpaid: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid').reduce((s, r) => s + Number(r.price || 0), 0) +
            clubSubscriptions.filter(s => isSameMonth(safeToDate(s.startDate || s.createdAt), selectedMonth) && s.paymentStatus === 'unpaid').reduce((sum, s) => sum + Number(s.totalPrice - (s.collectedAmount || 0)), 0),
    unpaidCount: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid').length +
                 clubSubscriptions.filter(s => isSameMonth(safeToDate(s.startDate || s.createdAt), selectedMonth) && s.paymentStatus === 'unpaid').length,
    unpaidApartments: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid' && r.serviceType !== 'تنظيف سيارات').length,
    unpaidCars: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.paymentStatus === 'unpaid' && r.serviceType === 'تنظيف سيارات').length,
    completed: requests.filter(r => isSameMonth(safeToDate(r.date), selectedMonth) && r.status === 'completed').length,
    paidCount: requests.filter(r => r.paymentStatus === 'paid' && isSameMonth(safeToDate(r.paymentDate || r.date), selectedMonth)).length +
               clubSubscriptions.filter(s => s.paymentStatus === 'paid' && isSameMonth(safeToDate(s.paymentDate || s.startDate || s.createdAt), selectedMonth)).length,
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
    const viewParam = params.get('view');
    if (viewParam === 'book') {
      setPublicView('book');
      setIsPublicBookingView(true);
    } else if (viewParam === 'renew-club') {
      setPublicView('renew-club');
      setRenewalSubId(params.get('subId'));
    }
  }, []);

  if (publicView === 'book') {
    return <PublicBookingForm appName={appName} logo={appLogo} />;
  }
  if (publicView === 'renew-club') {
    return <PublicClubRenewalForm appName={appName} logo={appLogo} subId={renewalSubId} />;
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
            const isAlertTab = item.id === 'tenants';
            const alertCount = isAlertTab ? getExpiringContracts(30).length : 0;
            
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: -6, y: -2, scale: 1.015 }}
                whileTap={{ y: 2, scale: 0.985 }}
                onClick={() => {
                  if (item.id === 'settings') {
                    setIsBrandingModalOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-4 rounded-[1.5rem] font-cairo font-bold text-sm transition-all duration-150 cursor-pointer relative",
                  activeTab === item.id
                    ? "bg-gradient-to-b from-primary to-primary-dark text-white border-t border-t-white/30 border-x border-x-white/10 border-b-[5px] border-b-primary-dark shadow-[0_8px_16px_rgba(0,0,0,0.18)]"
                    : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800/85 border-b-[4px] border-b-slate-250 dark:border-b-slate-950 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.04)] hover:bg-slate-50/80 dark:hover:bg-slate-850/60 hover:text-primary dark:hover:text-primary hover:border-b-[5px]"
                )}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={22} className={cn(activeTab === item.id ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-primary")} />
                  <span>{item.label}</span>
                </div>
                {alertCount > 0 && (
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-b-[2px]",
                    activeTab === item.id 
                      ? "bg-white text-primary border-b-slate-200" 
                      : "bg-rose-500 text-white border-b-rose-700"
                  )}>
                    {alertCount}
                  </span>
                )}
              </motion.button>
            );
          })}
          </nav>
          
          <div className="p-6 border-t dark:border-slate-800">
            <div className="bg-slate-100/60 dark:bg-slate-950/40 p-5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800/85 border-b-[5px] border-b-slate-300 dark:border-b-slate-950/90 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center text-white font-black text-lg border-t border-t-white/20 border-b-[4px] border-b-primary-dark shadow-lg shadow-black/10">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="font-cairo font-black text-sm text-gray-900 dark:text-white leading-tight">{user.displayName}</p>
                    <p className="font-cairo font-bold text-[10px] text-gray-400 dark:text-slate-500 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">


                <motion.button 
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98, y: 1 }}
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/35 border-b-[3px] border-b-rose-200 dark:border-b-rose-950/70 hover:bg-rose-100/40 dark:hover:bg-rose-900/30 font-bold text-xs hover:border-b-[4px] hover:shadow-[0_4px_8px_rgba(244,63,94,0.06)] transition-all duration-150 cursor-pointer"
                >
                  <LogOut size={16} />
                  تسجيل الخروج
                </motion.button>
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
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              </div>
              
              <nav className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {NAV_ITEMS.map((item) => {
                  const isAlertTab = item.id === 'tenants';
                  const alertCount = isAlertTab ? getExpiringContracts(30).length : 0;

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: -4, y: -1, scale: 1.01 }}
                      whileTap={{ y: 2, scale: 0.98 }}
                      onClick={() => {
                        if (item.id === 'settings') {
                          setIsBrandingModalOpen(true);
                        } else {
                          setActiveTab(item.id);
                        }
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3.5 rounded-[1.25rem] font-bold text-sm transition-all duration-150 cursor-pointer relative",
                        activeTab === item.id
                          ? "bg-gradient-to-b from-primary to-primary-dark text-white border-t border-t-white/30 border-x border-x-white/10 border-b-[5px] border-b-primary-dark shadow-[0_6px_12px_rgba(0,0,0,0.15)]"
                          : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800/80 border-b-[3.5px] border-b-slate-300 dark:border-b-slate-950 shadow-[0_3px_5px_-2px_rgba(0,0,0,0.03)] hover:bg-slate-50/80 dark:hover:bg-slate-850/60 hover:text-primary dark:hover:text-primary hover:border-b-[4.5px]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                        <span>{item.label}</span>
                      </div>
                      {alertCount > 0 && (
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-b-[2px]",
                          activeTab === item.id 
                            ? "bg-white text-primary border-b-slate-200" 
                            : "bg-rose-500 text-white border-b-rose-700"
                        )}>
                          {alertCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </nav>
              
              <div className="p-4 border-t dark:border-slate-800 space-y-3">


                <div className="bg-slate-100/60 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/85 border-b-[4px] border-b-slate-300 dark:border-b-slate-950/90 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center text-white font-black text-sm border-t border-t-white/20 border-b-[3px] border-b-primary-dark shadow-md">
                      {user.displayName?.[0] || 'U'}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.displayName}</p>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -0.5 }}
                    whileTap={{ scale: 0.98, y: 0.5 }}
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/35 border-b-[3px] border-b-rose-200 dark:border-b-rose-950/70 hover:bg-rose-100/40 dark:hover:bg-rose-900/30 font-bold text-xs hover:border-b-[4px] hover:shadow-[0_4px_8px_rgba(244,63,94,0.06)] transition-all duration-150 cursor-pointer"
                  >
                    <LogOut size={16} />
                    تسجيل الخروج
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
          <div className="w-full max-w-none px-4 sm:px-6 lg:px-12">
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-600 dark:text-slate-300 rounded-xl transition-colors border border-gray-100 dark:border-slate-700/50"
                >
                  <Menu size={20} />
                </motion.button>
              )}

              {/* Profile Card (Hidden as requested) */}
              {/*
              <div className="hidden sm:flex items-center gap-3 bg-gray-50 dark:bg-slate-800/40 px-4 py-2 rounded-2xl border border-gray-150/60 dark:border-slate-700/50 hover:bg-gray-100/50 dark:hover:bg-slate-800/60 transition-all duration-300 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs shadow-inner shrink-0">
                  {user.displayName?.[0] || 'U'}
                </div>
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.displayName}</p>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
                </div>
              </div>
              */}

              {/* Modern Theme Switch Toggle (Hidden as requested) */}
              {/*
              <div 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 px-4 py-2 rounded-2xl border border-gray-150/60 dark:border-slate-700/50 transition-all duration-300 shadow-xs cursor-pointer select-none group"
                title={isDarkMode ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
              >
                <div className="relative w-9 h-5 bg-gray-200 dark:bg-primary rounded-full transition-colors duration-250 shrink-0">
                  <div className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-250",
                    isDarkMode ? "translate-x-4" : "translate-x-0"
                  )} />
                </div>
                <em className="text-xs font-black text-gray-600 dark:text-slate-300 not-italic group-hover:text-primary dark:group-hover:text-white transition-colors">
                  الوضع الداكن
                </em>
              </div>
              */}

              {/* Share Button (Modern glass styling) */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareSite}
                className="p-2.5 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-primary-light rounded-xl transition-all border border-primary/10"
                title="مشاركة الموقع"
              >
                <Share2 size={18} />
              </motion.button>

              {/* Logout Button (High contrast soft-red styling) */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-500 rounded-xl transition-all border border-rose-100/30 dark:border-rose-900/20"
                title="تسجيل الخروج"
              >
                <LogOut size={18} />
              </motion.button>
            </div>
            </div>
          </div>
        </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-none p-4 sm:p-6 lg:p-12">
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

              {/* Overdue Unpaid Requests Alert Banner for Admin */}
              {isAdmin && (() => {
                const overdueUnpaid = requests.filter(req => {
                  return req.paymentStatus === 'unpaid' && isBefore(safeToDate(req.date), startOfDay(new Date()));
                });
                if (overdueUnpaid.length === 0) return null;

                return (
                  <div className="mb-8 p-6 bg-red-50/80 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-[2rem] shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl">
                          <BellRing size={24} className="animate-bounce" />
                        </div>
                        <div>
                          <h3 className="font-cairo text-lg font-black text-red-800 dark:text-red-300">
                            تنبيه: طلبات متأخرة لم يتم تحصيل قيمتها!
                          </h3>
                          <p className="font-cairo text-sm font-bold text-red-700/80 dark:text-red-400/80 mt-0.5">
                            يوجد {overdueUnpaid.length} طلب تجاوزت تاريخ الاستحقاق المطلوب وهي لا تزال غير مدفوعة.
                          </p>
                        </div>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOverduePanelExpanded(!isOverduePanelExpanded)}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-800 dark:hover:bg-red-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {isOverduePanelExpanded ? 'إخفاء الطلبات المتأخرة' : 'عرض وتذكير العملاء بالواتس'}
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isOverduePanelExpanded ? 'rotate-180' : ''}`} />
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {isOverduePanelExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-6 pt-6 border-t border-red-200/40 dark:border-red-900/40"
                        >
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {overdueUnpaid.map((req) => {
                              const apt = apartments.find(a => a.buildingName === req.buildingName && a.number === req.apartmentNumber);
                              const tenant = apt ? tenants.find(t => t.id === apt.tenantId) : null;
                              const delayDays = differenceInDays(new Date(), safeToDate(req.date));
                              
                              return (
                                <div key={req.id} className="p-4 bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center font-bold">
                                      {req.serviceType === 'تنظيف سيارات' ? <Car size={18} /> : <HomeIcon size={18} />}
                                    </div>
                                    <div>
                                      <p className="font-cairo text-sm font-black text-gray-900 dark:text-white">
                                        شقة {req.apartmentNumber} {req.buildingName ? `(${req.buildingName})` : ''} - <span className="text-primary">{req.serviceType}</span>
                                      </p>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                                        {tenant && (
                                          <span className="font-bold text-gray-500 dark:text-slate-400">
                                            المستأجر: {tenant.name}
                                          </span>
                                        )}
                                        <span className="font-black text-rose-600 dark:text-rose-400">
                                          المبلغ: {req.price} ريال
                                        </span>
                                        <span className="font-black text-amber-600 dark:text-amber-400">
                                          تاريخ الاستحقاق: {format(safeToDate(req.date), 'yyyy/MM/dd')}
                                        </span>
                                        <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg font-black shrink-0">
                                          متأخر {delayDays} يوم
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => updateStatus(req.id, 'paymentStatus', 'paid')}
                                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 rounded-xl font-black text-xs transition-colors cursor-pointer"
                                    >
                                      تأكيد كمدفوع
                                    </motion.button>

                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => {
                                        const dueDateStr = format(safeToDate(req.date), 'yyyy/MM/dd');
                                        const msg = `تذكير بسداد مستحقات متأخرة 🔔💸\n\n` +
                                          `السلام عليكم ورحمة الله وبركاته،\n` +
                                          `نفيدكم بوجود مستحقات لم يتم سدادها في النظام لـ:\n` +
                                          `• رقم الشقة: شقة ${req.apartmentNumber} ${req.buildingName ? `(${req.buildingName})` : ''}\n` +
                                          (tenant ? `• المستأجر: ${tenant.name}\n` : '') +
                                          `• الخدمة: ${req.serviceType || 'خدمة النظافة'}\n` +
                                          `• المبلغ المستحق: ${req.price} ريال\n` +
                                          `• تاريخ الاستحقاق: ${dueDateStr}\n` +
                                          `• الحالة: ⏳ غير مدفوع\n\n` +
                                          `نرجو التكرم بالسداد في أقرب وقت ومشاركتنا إيصال التحويل عبر مجموعة تتبع الدفع والدعم 👇:\n` +
                                          `🔗 ${whatsappGroupLink || 'https://chat.whatsapp.com/GiYTHd978eMJ3o2oEDb2JC?mode=gi_t'}`;
                                          
                                        if (tenant && tenant.phone) {
                                          let cleanPhone = tenant.phone.trim();
                                          if (cleanPhone.startsWith('0')) {
                                            cleanPhone = '966' + cleanPhone.substring(1);
                                          } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('966')) {
                                            cleanPhone = '966' + cleanPhone;
                                          }
                                          window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                                        } else {
                                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                                        }
                                      }}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                      title="تذكير المستأجر بالواتس"
                                    >
                                      <MessageCircle size={14} />
                                      <span>تذكير بالواتس</span>
                                    </motion.button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

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

                <div className="flex items-center gap-3 relative">
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-2xl font-black text-sm shadow-sm transition-all focus:outline-none cursor-pointer"
                    >
                      <ChevronDown size={18} className={`transition-transform duration-200 ${isActionsDropdownOpen ? 'rotate-180' : ''}`} />
                      <span>خيارات إضافية</span>
                    </motion.button>

                    {isActionsDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setIsActionsDropdownOpen(false)}
                        />
                        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                          <button
                            onClick={() => {
                              setBulkPrintRequests(filteredRequests);
                              setIsPrintingBulk(true);
                              setIsActionsDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-right text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 font-black text-sm transition-colors cursor-pointer"
                          >
                            <FileText size={18} className="text-primary" />
                            <span>طباعة فواتير</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsPrintingReport(true);
                              setIsActionsDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-right text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 font-black text-sm transition-colors cursor-pointer"
                          >
                            <Printer size={18} className="text-gray-500" />
                            <span>طباعة تقرير</span>
                          </button>

                          <div className="border-t border-gray-100 dark:border-slate-700 my-1" />

                          <button
                            onClick={() => {
                              setIsExportModalOpen(true);
                              setIsActionsDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-start gap-3 px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 font-black text-sm transition-colors cursor-pointer"
                          >
                            <Download size={18} />
                            <span>تصدير البيانات</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
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
          {activeTab !== 'staff' && activeTab !== 'car-subscriptions' && (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm mb-10 space-y-6">
              {/* Row 1: Month navigation and Search */}
              <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
                {/* Month Navigator */}
                <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-slate-800/30 p-2 rounded-3xl border border-gray-100/10 dark:border-slate-800/50 w-full xl:w-auto">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                    className="p-2 sm:p-2.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-slate-800"
                  >
                    <ChevronRight size={20} />
                  </motion.button>
                  <div className="relative flex items-center gap-3 px-4 min-w-[160px] justify-center flex-1 sm:flex-initial cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-2xl py-1 transition-all">
                    <Calendar className="text-primary" size={20} />
                    <span className="font-black text-base sm:text-lg text-gray-900 dark:text-white underline decoration-dotted decoration-primary/50 underline-offset-4">
                      {format(selectedMonth, 'MMMM yyyy', { locale: ar })}
                    </span>
                    <input 
                      type="month" 
                      value={format(selectedMonth, 'yyyy-MM')} 
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month] = e.target.value.split('-').map(Number);
                          setSelectedMonth(new Date(year, month - 1, 1));
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                    className="p-2 sm:p-2.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-slate-800"
                  >
                    <ChevronLeft size={20} />
                  </motion.button>
                  
                  <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-slate-800 mx-1" />
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={duplicatePreviousMonthSchedule}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-primary/10 text-primary rounded-2xl transition-all font-black text-xs"
                    title="نسخ جدول الشهر السابق"
                  >
                    <Repeat size={16} />
                    <span>نسخ جدول الشهر السابق</span>
                  </motion.button>

                  <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-slate-800 mx-1" />

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsMonthlyListModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl transition-all font-black text-xs shadow-md shadow-primary/10 hover:bg-primary/95"
                    title="إضافة قائمة شهر جديد"
                  >
                    <Plus size={16} />
                    <span>إضافة قائمة شهر جديد</span>
                  </motion.button>
                </div>

                {/* Search Input Bar */}
                <div className="flex-1 relative w-full xl:max-w-md">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold" size={20} />
                  <input 
                    type="text"
                    placeholder={
                      activeTab === 'تنظيف سيارات' || serviceFilter === 'cars' 
                        ? "البحث برقم اللوحة..." 
                        : "البحث برقم الشقة أو المبنى..."
                    }
                    className="w-full pr-12 pl-12 py-3.5 bg-gray-50 dark:bg-slate-800/30 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 hover:border-gray-300 dark:hover:border-slate-700 outline-none transition-all font-black text-sm dark:text-white dark:placeholder-gray-600"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={startVoiceSearch}
                    className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all flex items-center justify-center",
                      isListening 
                        ? "bg-rose-500 text-white animate-pulse" 
                        : "text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    )}
                    title="البحث الصوتي"
                  >
                    {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Row 2: Categorized Micro-filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                {/* Service Filter */}
                {(activeTab === 'dashboard' || activeTab === 'daily-tasks' || activeTab === 'تكرار الطلبات') ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mr-2">فلتر الخدمات</span>
                    <div className="flex bg-gray-50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-800/50 h-fit">
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setServiceFilter('all')}
                        className={cn(
                          "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5",
                          serviceFilter === 'all' 
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" 
                            : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/50"
                        )}
                      >
                        الكل
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setServiceFilter('apartments')}
                        className={cn(
                          "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5",
                          serviceFilter === 'apartments' 
                            ? "bg-primary text-white shadow-md shadow-primary/10 dark:shadow-none" 
                            : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/50"
                        )}
                      >
                        <Home size={14} />
                        الشقق
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setServiceFilter('cars')}
                        className={cn(
                          "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5",
                          serviceFilter === 'cars' 
                            ? "bg-primary text-white shadow-md shadow-primary/10 dark:shadow-none" 
                            : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/50"
                        )}
                      >
                        <Car size={14} />
                        السيارات
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}

                {/* Payment Filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mr-2">حالة الدفع</span>
                  <div className="flex bg-gray-50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-800/50 h-fit">
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setPaymentFilter('all')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5",
                        paymentFilter === 'all' 
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" 
                          : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/50"
                      )}
                    >
                      الكل
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setPaymentFilter('paid')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400",
                        paymentFilter === 'paid' 
                          ? "bg-emerald-600 dark:bg-emerald-500 !text-white shadow-md shadow-emerald-500/10 dark:shadow-none" 
                          : "hover:bg-white dark:hover:bg-slate-800/50"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full block", paymentFilter === 'paid' ? "bg-white" : "bg-emerald-500")} />
                      المدفوع
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setPaymentFilter('unpaid')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400",
                        paymentFilter === 'unpaid' 
                          ? "bg-rose-600 dark:bg-rose-500 !text-white shadow-md shadow-rose-500/10 dark:shadow-none" 
                          : "hover:bg-white dark:hover:bg-slate-800/50"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full block", paymentFilter === 'unpaid' ? "bg-white" : "bg-rose-500")} />
                      غير المدفوع
                    </motion.button>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mr-2">حالة التنفيذ</span>
                  <div className="flex bg-gray-50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-800/50 h-fit overflow-x-auto no-scrollbar">
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStatusFilter('all')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5",
                        statusFilter === 'all' 
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" 
                          : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/50"
                      )}
                    >
                      الكل
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStatusFilter('completed')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400",
                        statusFilter === 'completed' 
                          ? "bg-primary !text-white shadow-md shadow-primary/10 dark:shadow-none" 
                          : "hover:bg-white dark:hover:bg-slate-800/50"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full block", statusFilter === 'completed' ? "bg-white" : "bg-blue-500")} />
                      منفذة
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStatusFilter('pending')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400",
                        statusFilter === 'pending' 
                          ? "bg-amber-500 border border-amber-200 !text-white shadow-sm" 
                          : "hover:bg-white dark:hover:bg-slate-800/50"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full block", statusFilter === 'pending' ? "bg-white animate-pulse" : "bg-amber-500")} />
                      قيد التنفيذ
                    </motion.button>
                  </div>
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
                        {dayRequests.map(req => {
                          const reqDate = safeToDate(req.date);
                          const isMidnight = format(reqDate, 'HH:mm') === '00:00';
                          const timeText = isMidnight ? 'طوال اليوم (مرن)' : format(reqDate, 'hh:mm a', { locale: ar });

                          // Find tenant
                          let requestTenant = tenants.find(t => t.id === apartments.find(a => a.buildingName === req.buildingName && a.number === req.apartmentNumber)?.tenantId);
                          if (!requestTenant) {
                            requestTenant = tenants.find(t => {
                              const apt = apartments.find(a => a.id === t.apartmentId);
                              return apt && apt.buildingName === req.buildingName && apt.number === req.apartmentNumber;
                            });
                          }

                          // Icon chooser
                          const getServiceIcon = (type: string) => {
                            const name = type.toLowerCase();
                            if (name.includes('سيار') || name.includes('car')) {
                              return <Car size={20} className="text-blue-500 dark:text-blue-400" />;
                            }
                            if (name.includes('ماء') || name.includes('water') || name.includes('جالون')) {
                              return <Droplets size={20} className="text-sky-500 dark:text-sky-400" />;
                            }
                            if (name.includes('صيانة') || name.includes('maintenance') || name.includes('تصليح')) {
                              return <Wrench size={20} className="text-amber-500 dark:text-amber-400" />;
                            }
                            if (name.includes('نظاف') || name.includes('clean') || name.includes('كنس')) {
                              return <Sparkles size={20} className="text-indigo-500 dark:text-indigo-400" />;
                            }
                            return <Home size={20} className="text-primary" />;
                          };

                          return (
                            <motion.div 
                              key={req.id}
                              whileHover={{ y: -6, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)' }}
                              onClick={() => {
                                setEditingRequest(req);
                                setIsModalOpen(true);
                              }}
                              className="bg-white dark:bg-slate-800/80 p-6 rounded-[2.5rem] border border-gray-100/80 dark:border-slate-800/60 shadow-xs flex flex-col justify-between group cursor-pointer relative overflow-hidden transition-all duration-350 min-h-[230px]"
                            >
                              {/* Background ambient bubble */}
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-all duration-500 pointer-events-none" />

                              {/* Card Header: Icon & Status Badges */}
                              <div className="flex items-center justify-between mb-5 relative z-10">
                                <div className="flex items-center gap-3">
                                  <div className="bg-gray-50 dark:bg-slate-700/50 p-3.5 rounded-[1.25rem] text-primary shadow-xs group-hover:scale-105 transition-transform duration-300">
                                    {getServiceIcon(req.serviceType)}
                                  </div>
                                  <div>
                                    <span className="inline-block text-[10px] font-black tracking-widest text-primary bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-lg">
                                      {req.serviceType}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {/* Payment Button */}
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid');
                                    }}
                                    className={cn(
                                      "p-2 rounded-xl transition-all shadow-xs border",
                                      req.paymentStatus === 'paid' 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100/30 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/10" 
                                        : "bg-rose-50 text-rose-600 border-rose-100/30 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/10"
                                    )}
                                    title={req.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                  >
                                    <CreditCard size={15} />
                                  </motion.button>
                                  
                                  {/* Status Toggle Badge */}
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      updateStatus(req.id, 'status', req.status === 'pending' ? 'completed' : 'pending');
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-xs border",
                                      req.status === 'completed' 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/20" 
                                        : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/20"
                                    )}
                                  >
                                    {req.status === 'completed' ? 'تم ✓' : 'معلق ✕'}
                                  </motion.button>
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="mb-6 space-y-2 relative z-10 text-right">
                                <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight flex items-baseline justify-start gap-1.5 direction-rtl">
                                  <span>شقة {req.apartmentNumber}</span>
                                  {req.buildingName && (
                                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 font-cairo">
                                      {req.buildingName}
                                    </span>
                                  )}
                                </h4>
                                
                                {requestTenant ? (
                                  <p className="text-xs font-bold text-gray-700 dark:text-slate-350 flex items-center justify-start gap-1.5 direction-rtl">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-gray-400">المستأجر:</span>
                                    <span className="font-extrabold text-gray-900 dark:text-white">{requestTenant.name}</span>
                                  </p>
                                ) : (
                                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 flex items-center justify-start gap-1.5 direction-rtl">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
                                    <span>المستأجر: غير مسجل</span>
                                  </p>
                                )}

                                {/* Timing Info Box */}
                                <div className="flex items-center justify-start gap-2 text-xs font-bold text-gray-500 dark:text-slate-450 mt-3 bg-gray-55/60 dark:bg-slate-800/20 px-3 py-1.5 rounded-xl border border-gray-100/50 dark:border-slate-800/10 w-fit direction-rtl ml-auto">
                                  <Clock size={13} className="text-primary-light" />
                                  <span>توقيت المهمة:</span>
                                  <span className="font-extrabold text-gray-800 dark:text-slate-200">{timeText}</span>
                                </div>
                              </div>

                              {/* Card Footer: WhatsApp Integration */}
                              <div className="pt-4 border-t border-gray-100/50 dark:border-slate-800/60 mt-auto flex items-center justify-between gap-3 relative z-10" onClick={(e) => e.stopPropagation()}>
                                {requestTenant?.phone ? (
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                      const cleanedPhone = requestTenant.phone.replace(/\s+/g, '');
                                      const formattedMsg = `السلام عليكم ورحمة الله وبركاته، عزيزي المستأجر ${requestTenant.name} لـ شقة ${req.apartmentNumber} في ${req.buildingName}. نود إفادتكم بوجود مهمة مجدولة لـ (${req.serviceType}) بتاريخ اليوم ${format(reqDate, 'yyyy/MM/dd')}. تفضلوا بقبول وافر الاحترام والتقدير.`;
                                      window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(formattedMsg)}`, '_blank');
                                    }}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-white dark:text-emerald-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-black shadow-lg shadow-emerald-500/10 dark:shadow-none transition-all cursor-pointer border border-emerald-500/20 dark:border-emerald-550/20"
                                  >
                                    <MessageCircle size={16} />
                                    <span>مراسلة المستأجر عبر واتساب</span>
                                  </motion.button>
                                ) : activePhoneInputId === req.id ? (
                                  <div className="w-full flex items-center gap-2 bg-gray-50 dark:bg-slate-850 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-750 animate-fadeIn text-right">
                                    <input
                                      type="tel"
                                      placeholder="أدخل رقم الجوال (مثال: 05xxxxxxxx)"
                                      value={customPhoneInput[req.id] || ''}
                                      onChange={(e) => setCustomPhoneInput({ ...customPhoneInput, [req.id]: e.target.value })}
                                      className="flex-1 bg-transparent border-none text-xs font-bold text-gray-950 dark:text-white px-3 focus:outline-none focus:ring-0 text-right direction-rtl"
                                      autoFocus
                                    />
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={async () => {
                                        const inputNum = customPhoneInput[req.id]?.trim();
                                        if (!inputNum) {
                                          toast.error('يرجى إدخال رقم هاتف صحيح');
                                          return;
                                        }
                                        const cleanedPhone = inputNum.replace(/\s+/g, '');
                                        
                                        // Save/update phone number in Firestore if a tenant exists!
                                        if (requestTenant) {
                                          try {
                                            await updateDoc(doc(db, 'tenants', requestTenant.id), { phone: cleanedPhone });
                                            toast.success('تم حفظ وتحديث رقم جوال المستأجر بنجاح');
                                          } catch (err) {
                                            console.error("Error updating phone:", err);
                                          }
                                        }

                                        const formattedMsg = `السلام عليكم ورحمة الله وبركاته، عزيزي المستأجر لـ شقة ${req.apartmentNumber} في ${req.buildingName}. نود إفادتكم بوجود مهمة مجدولة لـ (${req.serviceType}) بتاريخ اليوم ${format(reqDate, 'yyyy/MM/dd')}. تفضلوا بقبول وافر الاحترام والتقدير.`;
                                        window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(formattedMsg)}`, '_blank');
                                        
                                        setActivePhoneInputId(null);
                                      }}
                                      className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0"
                                      title="تواصل وحفظ الرقم"
                                    >
                                      <MessageCircle size={15} />
                                    </motion.button>
                                    <button
                                      onClick={() => setActivePhoneInputId(null)}
                                      className="p-2.5 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 flex items-center justify-center shrink-0"
                                      title="إلغاء"
                                    >
                                      <X size={15} />
                                    </button>
                                  </div>
                                ) : (
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                      setActivePhoneInputId(req.id);
                                    }}
                                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer border border-dashed border-indigo-200 dark:border-indigo-900/30"
                                  >
                                    <Plus size={16} />
                                    <span>إدخال رقم وتواصل واتساب</span>
                                  </motion.button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
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
                {filteredRequests
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

                {filteredRequests.length === 0 && (
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
                  <p className="text-[10px] font-black text-primary/60 dark:text-primary/60 uppercase tracking-widest font-cairo">تم التوصيل في {format(globalSelectedDate, 'dd/MM')}</p>
                  <h3 className="text-3xl font-black text-primary dark:text-white mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && r.status === 'completed' && isSameDay(safeToDate(r.date), globalSelectedDate)).length}
                  </h3>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-2xl flex items-center justify-center mb-4">
                    <CreditCard className="text-amber-600 dark:text-amber-400" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest font-cairo">طلبات غير مدفوعة للشهر</p>
                  <h3 className="text-3xl font-black text-amber-900 dark:text-amber-100 mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && r.paymentStatus === 'unpaid' && isSameMonth(safeToDate(r.date), selectedMonth)).length}
                  </h3>
                </div>

                <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-3xl border border-primary/20 dark:border-primary/30">
                  <div className="w-10 h-10 bg-primary/20 dark:bg-primary/30 rounded-2xl flex items-center justify-center mb-4">
                    <DollarSign className="text-primary dark:text-primary" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-primary/60 dark:text-primary/60 uppercase tracking-widest font-cairo">المبالغ المحصلة للشهر</p>
                  <h3 className="text-3xl font-black text-primary dark:text-white mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && r.paymentStatus === 'paid' && isSameMonth(safeToDate(r.date), selectedMonth)).reduce((acc, r) => acc + (Number(r.price) || 0), 0)}
                    <span className="text-sm font-bold mr-1 opacity-60">ريال</span>
                  </h3>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-2xl flex items-center justify-center mb-4">
                    <PieChart className="text-indigo-600 dark:text-indigo-400" size={20} />
                  </div>
                  <p className="text-[10px] font-black text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-widest font-cairo">إجمالي مبيعات الشهر</p>
                  <h3 className="text-3xl font-black text-indigo-900 dark:text-indigo-100 mt-1">
                    {requests.filter(r => r.serviceType === 'توصيل مياه' && isSameMonth(safeToDate(r.date), selectedMonth)).reduce((acc, r) => acc + (Number(r.price) || 0), 0)}
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
                        {filteredRequests
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
                          <div className="relative cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl px-3 py-1 transition-all">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white min-w-[150px] text-center underline decoration-dotted decoration-primary/50 underline-offset-4">
                              {format(selectedMonth, 'MMMM yyyy', { locale: ar })}
                            </h3>
                            <input 
                              type="month" 
                              value={format(selectedMonth, 'yyyy-MM')} 
                              onChange={(e) => {
                                if (e.target.value) {
                                  const [year, month] = e.target.value.split('-').map(Number);
                                  setSelectedMonth(new Date(year, month - 1, 1));
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </div>
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
                                    { id: 'game-room-bookings', label: 'حجز غرفة الألعاب' },
                                    { id: 'bookings', label: 'إدارة الحجوزات' },
                                    { id: 'طلبات الماء', label: 'إدارة المياه والمخزون' },
                                    { id: 'طلبات الصيانة', label: 'طلبات الصيانة' },
                                    { id: 'تنظيف سيارات', label: 'تنظيف السيارات' },
                                    { id: 'car-subscriptions', label: 'اشتراكات السيارات' },
                                    { id: 'property-units', label: 'إدارة الوحدات' },
                                    { id: 'tenants', label: 'العقود والمدفوعات' },
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

                  <div className="flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsClubSubPrintModalOpen(true)}
                      className="flex items-center gap-3 px-6 py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer"
                    >
                      <Printer size={18} />
                      طباعة التعهد
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsWhatsAppAlertsModalOpen(true)}
                      className="flex items-center gap-3 px-6 py-4 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer relative"
                    >
                      <BellRing size={18} />
                      تنبيهات الانتهاء (7 أيام)
                      {clubSubscriptions.filter(sub => {
                        if (!sub.endDate || sub.status === 'locked') return false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const end = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : new Date(sub.endDate);
                        const diffTime = end.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 7;
                      }).length > 0 && (
                        <span className="absolute -top-1.5 -left-1.5 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                          {clubSubscriptions.filter(sub => {
                            if (!sub.endDate || sub.status === 'locked') return false;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const end = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : new Date(sub.endDate);
                            const diffTime = end.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays >= 0 && diffDays <= 7;
                          }).length}
                        </span>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const fields = [
                          { id: 'name', label: 'اسم المشترك' },
                          { id: 'phone', label: 'رقم الجوال' },
                          { id: 'workplace', label: 'المبنى/الموضع' },
                          { id: 'monthsCount', label: 'عدد الأشهر' },
                          { id: 'totalPrice', label: 'المبلغ الإجمالي' },
                          { id: 'collectedAmount', label: 'المبلغ المحصل' },
                          { id: 'paymentStatus', label: 'حالة الدفع' },
                          { id: 'startDate', label: 'تاريخ البدء' },
                          { id: 'endDate', label: 'تاريخ الانتهاء' },
                          { id: 'status', label: 'الحالة' }
                        ];
                        const activeList = clubSubscriptions.filter(sub => {
                          if (clubSubBuildingFilter === 'all') return true;
                          if (clubSubBuildingFilter === 'other') return !BUILDINGS.includes(sub.workplace);
                          return sub.workplace === clubSubBuildingFilter;
                        });
                        exportAnyToExcel(activeList, fields, 'club_subscriptions');
                      }}
                      className="flex items-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-750 text-white rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer border border-emerald-500/20"
                    >
                      <Download size={18} />
                      تصدير إلى Excel
                    </motion.button>

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
                          onClick={() => setSelectedClubSubForPrint(sub)}
                          className="w-10 h-10 flex items-center justify-center rounded-[1.1rem] text-emerald-600 border border-emerald-50 bg-emerald-50/40 hover:bg-emerald-100 hover:border-emerald-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700 cursor-pointer"
                          title="طباعة التعهد وإقرار الاشتراك"
                        >
                          <Printer size={16} strokeWidth={2.5} />
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
                          onClick={() => setConfirmDeleteClubSubId(sub.id)}
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
          {activeTab === 'game-room-bookings' && (
            <div className="space-y-8 mb-10">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                      <Gamepad2 className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        حجز غرفة الألعاب
                      </h2>
                      <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">إدارة حجوزات غرفة الألعاب والترفيه</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const fields = [
                          { id: 'customerName', label: 'اسم العميل' },
                          { id: 'customerPhone', label: 'رقم الجوال' },
                          { id: 'buildingName', label: 'المبنى' },
                          { id: 'apartmentNumber', label: 'رقم الشقة' },
                          { id: 'serviceType', label: 'نوع الخدمة' },
                          { id: 'date', label: 'التاريخ' },
                          { id: 'time', label: 'الوقت' },
                          { id: 'status', label: 'الحالة' }
                        ];
                        exportAnyToExcel(gameRoomBookings, fields, 'game_room_bookings');
                      }}
                      className="flex items-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-750 text-white rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer border border-emerald-500/20"
                    >
                      <Download size={18} />
                      تصدير إلى Excel
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsGameRoomModalOpen(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all font-cairo"
                    >
                      <Plus size={20} />
                      إضافة حجز جديد
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const bookingUrl = `${window.location.origin}${window.location.pathname}?view=book`;
                        navigator.clipboard.writeText(bookingUrl);
                        toast.success('تم نسخ رابط الحجز لمشاركته');
                        window.open(`https://wa.me/?text=${encodeURIComponent('رابط حجز مرافق المجمع:\n' + bookingUrl)}`, '_blank');
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-2xl font-black text-sm shadow-xl shadow-green-200 dark:shadow-none hover:bg-[#128C7E] transition-all"
                    >
                      <Share2 size={20} />
                      رابط الحجز
                    </motion.button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-gray-400 text-xs font-black uppercase tracking-widest">
                        <th className="px-6 py-4">العميل</th>
                        <th className="px-6 py-4">الموقع</th>
                        <th className="px-6 py-4">الموعد</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameRoomBookings.map((booking) => (
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
                          <td className="px-6 py-5 rounded-l-3xl">
                            <div className="flex items-center gap-2">
                              {booking.status === 'pending' ? (
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
                              ) : (
                                <button 
                                  onClick={() => {
                                    setEditingGameRoomBooking(booking);
                                    setIsGameRoomModalOpen(true);
                                  }}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                                  title="تعديل"
                                >
                                  <Pencil size={16} />
                                </button>
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
                  {gameRoomBookings.length === 0 && (
                    <div className="py-20 text-center opacity-20">
                      <Gamepad2 size={48} className="mx-auto mb-3" />
                      <p className="text-sm font-black">لا توجد حجوزات حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                              <h4 className="font-black text-gray-900 dark:text-white">
                                {request.serviceType === 'تنظيف سيارات' 
                                  ? `شقة ${getApartmentNum(request)}` 
                                  : `شقة ${request.apartmentNumber}`}
                              </h4>
                              {request.serviceType === 'تنظيف سيارات' && (
                                <p className="text-[10px] text-indigo-500 font-bold">اللوحة: {request.apartmentNumber} | {getCarName(request)}</p>
                              )}
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{request.buildingName}</p>
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
                                        const aptNoStr = request.serviceType === 'تنظيف سيارات' ? getApartmentNum(request) : request.apartmentNumber;
                                        const plateStr = request.serviceType === 'تنظيف سيارات' ? ` | لوحة: ${request.apartmentNumber}` : '';
                                        const text = `📸 صورة "قبل التنظيف" لشقة ${aptNoStr}${plateStr}:\n${request.beforePhotoUrl}`;
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
                                        const aptNoStr = request.serviceType === 'تنظيف سيارات' ? getApartmentNum(request) : request.apartmentNumber;
                                        const plateStr = request.serviceType === 'تنظيف سيارات' ? ` | لوحة: ${request.apartmentNumber}` : '';
                                        const text = `📸 صورة "بعد التنظيف" لشقة ${aptNoStr}${plateStr}:\n${request.afterPhotoUrl}`;
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
                              const aptNoStr = request.serviceType === 'تنظيف سيارات' ? getApartmentNum(request) : request.apartmentNumber;
                              const carInfoStr = request.serviceType === 'تنظيف سيارات' ? `\n🚗 السيارة: ${getCarName(request)}\n🏷️ اللوحة: ${request.apartmentNumber}` : '';
                              const text = `🚗 تفاصيل مهمة غسيل سيارة:\n\n🏢 المبنى: ${request.buildingName}\n🏠 الشقة: ${aptNoStr}${carInfoStr}\n📊 الحالة: ${statusText}${beforePhoto}${afterPhoto}\n\n📝 ملاحظات: ${request.notes || 'لا يوجد'}`;
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
            <div className="space-y-6 mb-10 w-full max-w-none">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                          className="w-64 pr-12 pl-12 py-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary transition-all outline-none shadow-sm"
                          value={aptSearch}
                          onChange={(e) => setAptSearch(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={startVoiceSearchApt}
                          className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all flex items-center justify-center",
                            isListeningApt 
                              ? "bg-rose-500 text-white animate-pulse" 
                              : "text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-700/50"
                          )}
                          title="البحث الصوتي"
                        >
                          {isListeningApt ? <Mic size={16} /> : <MicOff size={16} />}
                        </button>
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
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all font-cairo"
                    >
                      <Download size={18} />
                      نموذج الوحدات
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => aptFileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all font-cairo cursor-pointer"
                    >
                      <Upload size={18} />
                      <span>استيراد وحدات</span>
                    </motion.button>
                    <input 
                      type="file" 
                      ref={aptFileInputRef} 
                      onChange={handleImportApartments} 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                    />

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsAptCodesModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 rounded-xl font-bold text-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all font-cairo cursor-pointer"
                    >
                      <Key size={18} />
                      <span>الرموز السرية للشقق</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const fields = [
                          { id: 'buildingName', label: 'المبنى' },
                          { id: 'number', label: 'رقم الشقة' },
                          { id: 'status', label: 'الحالة' },
                          { id: 'roomType', label: 'نوع الوحدة' }
                        ];
                        const activeList = apartments.filter(apt => {
                          const b = PROPERTY_BUILDINGS.find(pb => pb.id === apt.buildingId);
                          const searchLower = aptSearch.toLowerCase();
                          const matchesSearch = apt.number.toLowerCase().includes(searchLower) || 
                                               apt.buildingName.toLowerCase().includes(searchLower) ||
                                               (b && b.name.toLowerCase().includes(searchLower));
                          const matchesBuilding = aptBuildingFilter === 'all' || apt.buildingId === aptBuildingFilter;
                          const matchesStatus = aptStatusFilter === 'all' || apt.status === aptStatusFilter;
                          return matchesSearch && matchesBuilding && matchesStatus;
                        });
                        exportAnyToExcel(activeList, fields, 'apartments_units');
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      <Download size={18} />
                      تصدير الوحدات (Excel)
                    </motion.button>

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
              </div>

              {/* Seamless Full-Width Cards Grid (6 Columns on Desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
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
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ 
                        y: -6, 
                        scale: 1.02,
                        boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5), 0 10px 15px -10px rgba(0,0,0,0.3)',
                        borderColor: 'rgba(20, 184, 166, 0.25)'
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
                        "relative rounded-[2rem] p-4 flex flex-col items-center justify-between transition-all cursor-pointer border min-h-[352px] select-none",
                        "bg-gradient-to-b from-[#1b253b] to-[#111828] dark:from-[#0d1322] dark:to-[#05080e]",
                        "border-t border-t-white/10 border-x border-x-white/5 border-b-[6px] border-b-[#0b0f19] dark:border-b-[#020407] shadow-xl overflow-hidden group"
                      )}
                    >
                      {/* Hover Actions Panel (Top Left) */}
                      <div className="absolute top-4 left-4 flex gap-1.5 z-30 transition-all opacity-0 group-hover:opacity-100">
                        {/* Delete Unit */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteApartment(apt.id, apt.number);
                          }}
                          className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/35 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="حذف الوحدة"
                        >
                          <Trash2 size={12} />
                        </motion.button>
                        
                        {/* Selector/Pencil toggle */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAptSelection(apt.id);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full border flex items-center justify-center transition-all shadow-sm",
                            selectedAptIds.includes(apt.id) 
                              ? "bg-teal-500 border-teal-500 text-white" 
                              : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                          )}
                          title="تحديد الوحدة"
                        >
                          <Pencil size={11} />
                        </motion.button>
                      </div>

                      {/* Status Pill (Top Right) */}
                      <div className="absolute top-4 right-4 z-20">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
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
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                            apt.status === 'occupied' 
                              ? "bg-teal-500/10 text-[#0d9488] border-teal-500/20 shadow-[0_2px_8px_rgba(20,184,166,0.1)]" 
                              : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_2px_8px_rgba(99,102,241,0.1)]"
                          )}
                        >
                          {apt.status === 'occupied' ? 'مشغولة' : 'شاغرة'}
                        </motion.button>
                      </div>

                      {/* Building/Icon Header */}
                      <div className="flex flex-col items-center gap-1 select-none mt-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800/40 border border-white/5 flex items-center justify-center shadow-inner">
                          <HomeIcon size={16} className="text-slate-400 group-hover:text-teal-400 transition-colors duration-300" />
                        </div>
                        <div className="text-center mt-1">
                          <h4 className="text-[9px] font-black tracking-wide text-slate-500 uppercase">North Residence</h4>
                          <p className="text-[8px] font-bold text-slate-400 mt-0">{b?.name || 'مبنى 1'}</p>
                        </div>
                      </div>

                      {/* Giant Number */}
                      <div className="relative my-2 select-none">
                        <span 
                          style={{ 
                            textShadow: '0 4px 10px rgba(0,0,0,0.5), 0 10px 20px rgba(59,130,246,0.15)'
                          }}
                          className="text-5xl sm:text-6xl font-black text-white tracking-tight hover:scale-105 transition-transform duration-300 leading-none block"
                        >
                          {num}
                        </span>
                        {/* Subtle Ambient Glow */}
                        <div className="absolute inset-0 bg-teal-500/5 blur-[35px] rounded-full -z-10" />
                      </div>

                      {/* Floor/Type Badges Side-By-Side */}
                      <div className="flex items-center gap-1.5 justify-center mb-1 bg-slate-900/40 px-2.5 py-1 rounded-full border border-white/5">
                        <span className="text-[8px] text-slate-400 font-bold">الدور {floor}</span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span className="text-[8px] text-slate-400 font-bold">شقة</span>
                      </div>

                      {/* Secret Code Badge if present */}
                      {apt.secretCode && (
                        <div className="mt-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center gap-1 rounded-lg">
                          <Lock size={10} className="text-amber-400" />
                          <span>رمز: {apt.secretCode}</span>
                        </div>
                      )}

                      {/* Tenant Info */}
                      <div className="w-full text-center h-5 flex items-center justify-center mt-1">
                        {tenant ? (
                          <span className="text-[10px] font-black text-slate-300 truncate tracking-wide max-w-full px-2" title={tenant.name}>
                            {tenant.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600/40">شاغرة</span>
                        )}
                      </div>

                      {/* Action Icons Row (Circular, layout correct to image) */}
                      <div className="flex items-center justify-center gap-2.5 mt-2.5 w-full">
                        {/* WhatsApp / DND notification */}
                        <div className="flex flex-col items-center">
                          <motion.div 
                            whileHover={tenant?.phone ? { y: -1, scale: 1.05 } : {}}
                            whileTap={tenant?.phone ? { y: 1, scale: 0.95 } : {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (tenant?.phone) {
                                setSelectedWhatsAppTenant(tenant);
                                setIsWhatsAppModalOpen(true);
                              } else {
                                toast.error('لا يوجد رقم هاتف مسجل لهذا الساكن');
                              }
                            }}
                            className={cn(
                              "w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-xs",
                              tenant?.phone 
                                ? "bg-slate-800/40 border-slate-700 text-slate-300 hover:border-green-500/40 hover:text-green-400 hover:shadow-green-500/5" 
                                : "bg-slate-800/20 border-slate-800 text-slate-600 opacity-30 pointer-events-none"
                            )}
                            title={tenant?.phone ? `واتساب: ${tenant.phone}` : "لا يوجد رقم هاتف"}
                          >
                            <MessageCircle size={14} />
                          </motion.div>
                          <span className="text-[6.5px] font-black text-slate-500 mt-1 select-none">DND</span>
                        </div>

                        {/* Check-In */}
                        <div className="flex flex-col items-center">
                          <motion.div 
                            whileHover={{ y: -1, scale: 1.05 }}
                            whileTap={{ y: 1, scale: 0.95 }}
                            className={cn(
                              "w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md cursor-pointer",
                              tenant 
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            )}
                          >
                            <UserCheck size={15} />
                          </motion.div>
                          <span className="text-[6.5px] font-black text-slate-500 mt-0.5 select-none">CHECK IN</span>
                        </div>

                        {/* Clean status */}
                        <div className="flex flex-col items-center">
                          <motion.div 
                            whileHover={{ y: -1, scale: 1.05 }}
                            whileTap={{ y: 1, scale: 0.95 }}
                            className="w-9 h-9 rounded-full bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-amber-500/40 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <Sparkles size={13} />
                          </motion.div>
                          <span className="text-[6.5px] font-black text-slate-500 mt-1 select-none">CLEAN</span>
                        </div>
                      </div>

                      {/* Interactive tactile push Doorbell */}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ y: 1, scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success("🔔 تم رن جرس الباب!");
                        }} 
                        className="w-full mt-3 py-2 px-4 rounded-full bg-slate-800/40 hover:bg-slate-800 border border-white/5 active:translate-y-[1px] transition-all flex items-center justify-center gap-2 group/door cursor-pointer shadow-sm"
                      >
                        <span className="text-[9px] font-black tracking-widest text-slate-400 group-hover/door:text-white transition-colors uppercase">Doorbell</span>
                        <Bell size={13} className="text-slate-500 group-hover/door:text-white transition-colors" />
                      </motion.button>
                    </motion.div>
                  );
                })}
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

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const fields = [
                          { id: 'name', label: 'اسم المستأجر' },
                          { id: 'phone', label: 'الجوال' },
                          { id: 'nationality', label: 'الجنسية' },
                          { id: 'idNumber', label: 'رقم الهوية' },
                          { id: 'company', label: 'الجهة/الشركة' },
                          { id: 'contractValue', label: 'قيمة العقد' },
                          { id: 'collectedAmount', label: 'المبلغ المحصل' },
                          { id: 'paymentFrequency', label: 'طريقة الدفع/التكرار' },
                          { id: 'paymentMethod', label: 'وسيلة الدفع' },
                          { id: 'startDate', label: 'بداية العقد' },
                          { id: 'endDate', label: 'نهاية العقد' }
                        ];
                        const filteredTenants = tenants
                          .filter(t => t.status === tenantFilter)
                          .filter(t => {
                            const aptDetails = apartments.find(a => a.id === t.apartmentId);
                            const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                              t.phone.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                              (aptDetails && aptDetails.number.toLowerCase().includes(tenantSearch.toLowerCase()));
                            const matchesBuilding = tenantBuildingFilter === 'all' || 
                              (aptDetails && aptDetails.buildingId === tenantBuildingFilter);
                            return matchesSearch && matchesBuilding;
                          });
                        exportAnyToExcel(filteredTenants, fields, 'tenants_contracts');
                      }}
                      className="flex items-center gap-3 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm border-2 border-emerald-500/20 shadow-md transition-all font-cairo cursor-pointer"
                    >
                      <Download size={20} />
                      تصدير العقود (Excel)
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
                                
                                {tenant.status === 'archived' && (
                                  <motion.button
                                    whileHover={{ scale: 1.1, translateY: -2 }}
                                    onClick={async () => {
                                      if (confirm('هل أنت متأكد من استعادة هذا العقد؟ سيتم تفعيل العقد مرة أخرى.')) {
                                        try {
                                          await updateDoc(doc(db, 'tenants', tenant.id), { status: 'active' });
                                          // Check if the apartment is vacant and re-assign if so
                                          if (tenant.apartmentId) {
                                            const aptSnap = await getDoc(doc(db, 'apartments', tenant.apartmentId));
                                            if (aptSnap.exists() && aptSnap.data().status === 'vacant') {
                                              await updateDoc(doc(db, 'apartments', tenant.apartmentId), { 
                                                status: 'occupied',
                                                tenantId: tenant.id
                                              });
                                            }
                                          }
                                          toast.success('تمت استعادة العقد بنجاح');
                                        } catch (error) {
                                          console.error(error);
                                          toast.error('حدث خطأ أثناء الاستعادة');
                                        }
                                      }
                                    }}
                                    className="w-11 h-11 flex items-center justify-center rounded-[1.25rem] text-emerald-600 border border-emerald-50 bg-emerald-50/40 hover:bg-emerald-100 hover:border-emerald-200 transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
                                    title="استعادة"
                                  >
                                    <RotateCcw size={18} strokeWidth={2.5} />
                                  </motion.button>
                                )}

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
                      جدول غسيل السيارات (المهام اليومية)
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      {format(globalSelectedDate, 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
              </div>
              
              {carCleaningDailyRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carCleaningDailyRequests.map((req) => {
                    const isTaskCompleted = req.isSubscription 
                      ? (req.completedDates || []).includes(format(globalSelectedDate, 'yyyy-MM-dd'))
                      : req.status === 'completed';
                      
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={req.id}
                        className={cn(
                          "p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all",
                          isTaskCompleted 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400" 
                            : "bg-amber-50 border-amber-100 text-amber-800 shadow-lg shadow-amber-100/50 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400 dark:shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            isTaskCompleted ? "bg-emerald-200 text-emerald-700" : "bg-amber-600 text-white"
                          )}>
                            <Car size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold opacity-70 mb-0.5">رقم اللوحة</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-black tracking-wider">{req.apartmentNumber}</p>
                              <span className="text-xs font-black bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-lg">
                                {req.isSubscription ? (
                                  <div className="flex items-center gap-1">
                                    <CalendarCheck size={10} />
                                    <span>اشتراك</span>
                                  </div>
                                ) : format(safeToDate(req.date), 'p', { locale: ar })}
                              </span>
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
                              toggleDailyCompletion(req, globalSelectedDate);
                            }}
                            className="text-left"
                          >
                            <p className="text-[10px] font-bold opacity-70 uppercase mb-1">الحالة</p>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all",
                              isTaskCompleted ? "bg-green-200 text-green-800" : "bg-orange-200 text-orange-800"
                            )}>
                              {isTaskCompleted ? '✓ تم التنفيذ' : '✕ لم يتم التنفيذ'}
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
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-[2rem] border border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 font-bold">لا توجد سيارات مجدولة للغسيل اليوم</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'car-subscriptions' && (
            <div className="mb-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-none">
                    <CalendarPlus className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      إدارة اشتراكات غسيل السيارات
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 font-bold mt-1">
                      متابعة وإضافة اشتراكات غسيل السيارات الشهرية
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={importCarSubscriptionsFromImage}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-2xl font-bold text-sm transition-all focus:outline-none cursor-pointer"
                  >
                    <ImageIcon size={18} />
                    <span>تغذية الصورة (محاكاة)</span>
                  </motion.button>

                  <label className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 dark:shadow-none transition-all focus:outline-none cursor-pointer">
                    <ImageIcon size={18} />
                    <span>تحليل وإدخال من صورة 📸</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadAndAnalyzeImage} 
                      className="hidden" 
                    />
                  </label>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsSubscriptionModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all focus:outline-none"
                  >
                    <CalendarPlus size={18} />
                    <span>طلب اشتراك جديد</span>
                  </motion.button>
                </div>
              </div>

              {/* Monthly Subscriptions Section */}
              <div className="space-y-4 mb-10">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  الاشتراكات النشطة حالياً
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requests
                    .filter(req => req.serviceType === 'تنظيف سيارات' && req.isSubscription && safeToDate(req.subscriptionEndDate) > new Date())
                    .map(sub => {
                      const totalDays = differenceInDays(safeToDate(sub.subscriptionEndDate), safeToDate(sub.subscriptionStartDate || sub.date));
                      const daysLeft = differenceInDays(safeToDate(sub.subscriptionEndDate), new Date());
                      const durationMonths = sub.monthsCount || 1;
                      
                      return (
                        <motion.div 
                          key={sub.id}
                          layout
                          className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                  <Car size={20} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-gray-900 dark:text-white truncate">شقة {getApartmentNum(sub)}</h4>
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 text-[10px] font-black rounded-lg whitespace-nowrap" dir="ltr">
                                      لوحة: {sub.apartmentNumber}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-black text-gray-500 mt-1 truncate">
                                    {getCarName(sub)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[9px] font-black whitespace-nowrap",
                                  daysLeft <= 3 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                                )}>
                                  {daysLeft <= 0 ? 'منتهي' : `متبقي ${daysLeft} يوم`}
                                </span>
                                <div className="flex items-center gap-1">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      setEditingRequest(sub);
                                      setIsSubscriptionModalOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                                    title="تعديل"
                                  >
                                    <Edit2 size={14} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setConfirmDeleteId(sub.id)}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 size={14} />
                                  </motion.button>
                                </div>
                              </div>
                            </div>

                            {/* Details list */}
                            <div className="space-y-2 mt-4 mb-4 border-t border-b border-gray-50 dark:border-slate-700/50 py-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-400 font-bold">العامل المسؤول:</span>
                                <span className="text-gray-900 dark:text-white font-black">{sub.workerName || 'غير معين'}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-400 font-bold">جدول الأيام:</span>
                                <span className="text-gray-900 dark:text-white font-black truncate max-w-[180px]" title={getScheduleDaysArabic(sub.subscriptionSchedule)}>
                                  {getScheduleDaysArabic(sub.subscriptionSchedule)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-400 font-bold">قيمة الاشتراك:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">{sub.price} ريال ({sub.monthsCount} أشهر)</span>
                              </div>
                            </div>

                            {/* Monthly Payment Status Box */}
                            <div className="mt-3 mb-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 text-right">الأشهر المدفوعة ومتابعة السداد:</p>
                              <div className="flex flex-wrap gap-1.5 justify-start text-right" dir="rtl">
                                {(() => {
                                  let displayPayments = sub.subscriptionPayments;
                                  if (displayPayments === undefined || displayPayments === null) {
                                    // Generate on the fly for old entries without saved payments
                                    const start = safeToDate(sub.subscriptionStartDate || sub.date);
                                    const end = safeToDate(sub.subscriptionEndDate);
                                    const generated: { monthKey: string; monthName: string; isPaid: boolean; amount: number; paidDate?: string }[] = [];
                                    let curr = startOfMonth(start);
                                    const tEnd = startOfMonth(end);
                                    const perMonthAmount = Math.round(sub.price / (sub.monthsCount || 1));
                                    while (curr <= tEnd) {
                                      generated.push({
                                        monthKey: format(curr, 'yyyy-MM'),
                                        monthName: format(curr, 'MMMM yyyy', { locale: ar }),
                                        isPaid: false,
                                        amount: perMonthAmount,
                                        paidDate: ''
                                      });
                                      curr = addMonths(curr, 1);
                                    }
                                    displayPayments = generated;
                                  }

                                  return displayPayments.map(p => {
                                    const shortName = p.monthName.split(' ')[0] || p.monthKey;
                                    return (
                                      <div 
                                        key={p.monthKey}
                                        className={cn(
                                          "px-2.5 py-1 rounded-xl text-[9px] font-black flex items-center gap-1 border-b-[2px] transition-all cursor-pointer",
                                          p.isPaid 
                                            ? "bg-emerald-500/10 text-emerald-600 border-b-emerald-800 border border-emerald-500/20" 
                                            : "bg-rose-500/10 text-rose-600 border-b-rose-800 border border-rose-500/20 hover:bg-rose-500/20"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedSubscriptionForPayments(sub);
                                        }}
                                        title={`${p.monthName}: ${p.amount} ريال (${p.isPaid ? 'مدفوع' : 'غير مدفوع'})`}
                                      >
                                        <span>{shortName}</span>
                                        <span className="opacity-80">({p.amount}ر)</span>
                                        <span className="font-sans font-black">{p.isPaid ? '✓' : '✗'}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black">
                              <div className="flex flex-col">
                                <span className="text-gray-400">تاريخ الانتهاء</span>
                                <span className="text-gray-700 dark:text-slate-300 font-black">
                                  {format(safeToDate(sub.subscriptionEndDate), 'dd/MM/yyyy')}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubscriptionForPayments(sub);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-650 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-[10px] flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                                >
                                  <CreditCard size={11} />
                                  <span>من دفع؟</span>
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setSelectedSubscriptionDetail(sub)}
                                  className="px-2.5 py-1.5 bg-primary/10 text-primary rounded-xl font-black text-[10px] flex items-center gap-1 hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer"
                                >
                                  <ListTodo size={12} />
                                  <span>جدول الغسيل</span>
                                </motion.button>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(0, Math.min(100, (daysLeft / totalDays) * 100))}%` }}
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  daysLeft <= 3 ? "bg-rose-500" : "bg-emerald-500"
                                )}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  {requests.filter(req => req.serviceType === 'تنظيف سيارات' && req.isSubscription && safeToDate(req.subscriptionEndDate) > new Date()).length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50/50 dark:bg-slate-800/10 rounded-[2rem] border border-dashed border-gray-100 dark:border-slate-800">
                      <CalendarPlus size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-400 text-sm font-bold">لا توجد اشتراكات شهرية نشطة حالياً</p>
                    </div>
                  )}
                </div>
              </div>
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
                            <p className="text-xs font-bold opacity-70 mb-0.5">بيانات الشقة والسيارة</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-lg font-black tracking-wider">
                                شقة {req.serviceType === 'تنظيف سيارات' ? getApartmentNum(req) : req.apartmentNumber}
                              </p>
                              <span className="text-xs font-black bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-lg">{format(safeToDate(req.date), 'p', { locale: ar })}</span>
                            </div>
                            {req.serviceType === 'تنظيف سيارات' && (
                              <p className="text-[11px] font-bold text-indigo-500 mt-0.5">
                                اللوحة: {req.apartmentNumber} | السيارة: {getCarName(req)}
                              </p>
                            )}
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
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-100/10 dark:shadow-none border border-gray-100/80 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <div className="p-8 border-b border-gray-100 dark:border-slate-800/80 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <h3 className="text-xl font-black text-gray-900 dark:text-white font-cairo">
                  {viewMode === 'list' ? 'سجل الطلبات التفصيلي' : viewMode === 'summary' ? 'ملخص الشقق' : 'تقويم الطلبات'}
                </h3>
                <div className="flex bg-gray-50 dark:bg-slate-800 p-1.5 rounded-[1.25rem] border border-gray-100 dark:border-slate-700/50 w-fit">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all",
                      viewMode === 'list' 
                        ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm" 
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                    )}
                  >
                    عرض القائمة
                  </button>
                  <button 
                    onClick={() => setViewMode('summary')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all",
                      viewMode === 'summary' 
                        ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm" 
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                    )}
                  >
                    ملخص الشقق
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all",
                      viewMode === 'calendar' 
                        ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm" 
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                    )}
                  >
                    التقويم
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => requestsFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer border border-emerald-500/20 mr-1"
                >
                  <Upload size={14} />
                  <span>استرداد البيانات من Excel</span>
                </motion.button>
                <input 
                  type="file" 
                  ref={requestsFileInputRef} 
                  onChange={handleImportRequests} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-black border border-emerald-100/30">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                  <span>مدفوع: {stats.paid} ريال</span>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-2xl text-xs font-black border border-amber-100/30">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
                  <span>معلق: {stats.unpaid} ريال</span>
                </div>
              </div>
            </div>
 
            <div className="overflow-x-auto custom-scrollbar">
              {viewMode === 'list' ? (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-gray-100 dark:border-slate-800/50">
                      <th className="px-6 py-5 text-right font-cairo">رقم الشقة</th>
                      <th className="px-6 py-5 text-right font-cairo">الخدمة</th>
                      <th className="px-6 py-5 text-right font-cairo">التاريخ</th>
                      <th className="px-6 py-5 text-center font-cairo">العدد</th>
                      <th className="px-6 py-5 text-center font-cairo">المبلغ</th>
                      <th className="px-6 py-5 text-center font-cairo">الحالة</th>
                      <th className="px-6 py-5 text-center font-cairo">التحصيل</th>
                      <th className="px-6 py-5 text-center font-cairo">الإيصال</th>
                      <th className="px-6 py-5 text-center font-cairo">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-slate-800/50">
                    <AnimatePresence mode="popLayout">
                      {groupedFilteredRequests.length > 0 ? (
                        groupedFilteredRequests.map((group) => {
                          const displayReq = group.latest;
                          const hasMultiple = group.count > 1;
 
                          // Custom color palettes for services
                          let serviceBadgeClass = "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                          if (displayReq.serviceType.includes('سيارات')) {
                            serviceBadgeClass = "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/20";
                          } else if (displayReq.serviceType.includes('عادي') || displayReq.serviceType.includes('شقق')) {
                            serviceBadgeClass = "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100/30 dark:border-sky-900/20";
                          } else if (displayReq.serviceType.includes('صيانة')) {
                            serviceBadgeClass = "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/20";
                          } else if (displayReq.serviceType.includes('مياه')) {
                            serviceBadgeClass = "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/20";
                          } else if (displayReq.serviceType.includes('ألعاب')) {
                            serviceBadgeClass = "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100/30 dark:border-purple-900/20";
                          }
 
                          return (
                            <motion.tr 
                              key={displayReq.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.4)" }}
                              className="transition-colors text-center cursor-pointer border-b border-gray-100/50 dark:border-slate-800/40 relative group/row"
                              onClick={() => {
                                if (hasMultiple) {
                                  const groupRequests = filteredRequests.filter(r => 
                                    r.buildingName === displayReq.buildingName && 
                                    r.apartmentNumber === displayReq.apartmentNumber && 
                                    r.serviceType === displayReq.serviceType &&
                                    isSameMonth(safeToDate(r.date), safeToDate(displayReq.date))
                                  );
                                  setSelectedHistoryGroup(groupRequests);
                                }
                              }}
                            >
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center gap-3">
                                  <div className="bg-primary/5 dark:bg-primary/20 p-2.5 rounded-2xl text-primary transition-transform group-hover/row:scale-110">
                                    <Home size={18} />
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-gray-900 dark:text-white text-sm font-cairo">
                                      {displayReq.serviceType === 'تنظيف سيارات' 
                                        ? `شقة ${getApartmentNum(displayReq)}` 
                                        : `شقة ${displayReq.apartmentNumber}`}
                                    </p>
                                    {displayReq.serviceType === 'تنظيف سيارات' && (
                                      <p className="text-[10px] text-indigo-500 font-bold mt-0.5">
                                        اللوحة: {displayReq.apartmentNumber} | {getCarName(displayReq)}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mt-0.5">{displayReq.buildingName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn("px-3 py-1.5 rounded-xl font-black text-xs inline-block", serviceBadgeClass)}>
                                  {displayReq.serviceType}
                                </span>
                                {hasMultiple && (
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black mt-1">
                                    {group.count} طلبات مجمعة
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-1">
                                  وقت الطلب: {displayReq.createdAt ? format(safeToDate(displayReq.createdAt), 'p', { locale: ar }) : '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className="text-xs font-bold text-gray-800 dark:text-slate-300">
                                  {format(safeToDate(displayReq.date), 'PPP', { locale: ar })}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">{format(safeToDate(displayReq.date), 'p', { locale: ar })}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-700/55 rounded-xl font-bold text-xs inline-block min-w-8">
                                  {displayReq.serviceType === 'توصيل مياه' ? group.totalWaterGallons : (hasMultiple ? group.count : displayReq.monthsCount)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="inline-flex items-baseline gap-1 font-cairo">
                                  <span className="text-base font-black text-slate-850 dark:text-white">
                                    {group.totalPrice}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ريال</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasMultiple) {
                                      // Toggle all in group
                                      const nextStatus = group.allCompleted ? 'pending' : 'completed';
                                      group.ids.forEach(id => updateStatus(id, 'status', nextStatus));
                                    } else {
                                      const nextStatus = displayReq.status === 'pending' ? 'completed' : 'pending';
                                      updateStatus(displayReq.id, 'status', nextStatus);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black shadow-sm transition-all mx-auto border",
                                    group.allCompleted 
                                      ? "bg-emerald-500 text-white border-emerald-600/20" 
                                      : "bg-amber-500 text-white border-amber-600/20"
                                  )}
                                >
                                  {group.allCompleted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                  <span>{group.allCompleted ? 'منفذة ' : 'قيد التنفيذ'}</span>
                                </motion.button>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5 mx-auto">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (hasMultiple) {
                                        const nextStatus = group.allPaid ? 'unpaid' : 'paid';
                                        for (const id of group.ids) {
                                          await updateStatus(id, 'paymentStatus', nextStatus, true);
                                        }
                                      } else {
                                        updateStatus(displayReq.id, 'paymentStatus', displayReq.paymentStatus === 'paid' ? 'unpaid' : 'paid');
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black shadow-sm transition-all border shrink-0",
                                      group.allPaid 
                                        ? "bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border-teal-200/50" 
                                        : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 border-rose-200/50"
                                    )}
                                  >
                                    <CreditCard size={13} />
                                    <span>{group.allPaid ? 'تم الدفع' : 'لم يدفع'}</span>
                                  </motion.button>

                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const aptNum = displayReq.serviceType === 'تنظيف سيارات' ? getApartmentNum(displayReq) : displayReq.apartmentNumber;
                                      const apt = apartments.find(a => a.buildingName === displayReq.buildingName && a.number === aptNum);
                                      const tenant = apt ? tenants.find(t => t.id === apt.tenantId) : null;
                                      
                                      const dateStr = format(safeToDate(displayReq.date), 'yyyy/MM/dd');
                                      const msg = `أهلاً بك، تم تأكيد وصول دفعتك بمبلغ ${group.totalPrice} ريال لطلب ${displayReq.serviceType} بتاريخ ${dateStr}`;
                                      
                                      if (tenant && tenant.phone) {
                                        let cleanPhone = tenant.phone.trim();
                                        if (cleanPhone.startsWith('0')) {
                                          cleanPhone = '966' + cleanPhone.substring(1);
                                        } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('966')) {
                                          cleanPhone = '966' + cleanPhone;
                                        }
                                        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                                      } else {
                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                                      }
                                    }}
                                    className="p-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full transition-all border border-emerald-200/30 shrink-0"
                                    title="إرسال تأكيد الدفع عبر الواتساب"
                                  >
                                    <MessageCircle size={13} />
                                  </motion.button>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {!hasMultiple && (
                                    <>
                                      <label className="cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm rounded-xl text-slate-400 hover:text-primary dark:text-slate-500 dark:hover:text-primary transition-all border border-gray-100 dark:border-slate-800">
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleReceiptUpload(displayReq.id, file);
                                          }}
                                        />
                                        <Upload size={16} />
                                      </label>
                                      {displayReq.receiptUrl && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(displayReq.receiptUrl, '_blank');
                                          }}
                                          className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 rounded-xl transition-all border border-emerald-100 dark:border-emerald-900/40"
                                          title="عرض الإيصال"
                                        >
                                          <FileText size={16} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {hasMultiple ? (
                                    <motion.button 
                                      whileHover={{ scale: 1.05 }}
                                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-primary dark:text-slate-300 font-extrabold text-[10px] rounded-lg border border-gray-150 dark:border-slate-700"
                                    >
                                      عرض التفاصيل ({group.count})
                                    </motion.button>
                                  ) : (
                                    <>
                                      <motion.button 
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingRequest(displayReq);
                                          setIsModalOpen(true);
                                        }}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-600 rounded-xl transition-all border border-blue-100/50 dark:border-blue-900/20"
                                        title="تعديل"
                                      >
                                        <Pencil size={15} />
                                      </motion.button>
                                      <motion.button 
                                        whileHover={{ scale: 1.1, rotate: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRequest(displayReq);
                                        }}
                                        className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/85 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-gray-100 dark:border-slate-750"
                                        title="طباعة"
                                      >
                                        <Printer size={15} />
                                      </motion.button>
                                      <motion.button 
                                        whileHover={{ scale: 1.1, color: "#ef4444" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(displayReq.id);
                                        }}
                                        className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 rounded-xl transition-all border border-rose-100/50 dark:border-rose-900/20"
                                        title="حذف"
                                      >
                                        <Trash2 size={15} />
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
                                  setIsPrintingStatement(true);
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
                                  setConfirmDeleteAptRequests({ building: apt.building, apartment: apt.apartment });
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
      <GameRoomBookingModal 
        isOpen={isGameRoomModalOpen}
        onClose={() => {
          setIsGameRoomModalOpen(false);
          setEditingGameRoomBooking(null);
        }}
        editingBooking={editingGameRoomBooking}
        onSave={saveGameRoomBooking}
      />

      <CarSubscriptionModal 
        isOpen={isSubscriptionModalOpen}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
          setEditingRequest(null);
        }}
        editingRequest={editingRequest}
        tenants={tenants}
        apartments={apartments}
        onSave={async (data) => {
          const loadingToast = toast.loading(editingRequest ? 'جاري تحديث الاشتراك...' : 'جاري إضافة الاشتراك...');
          try {
            if (editingRequest) {
              await updateDoc(doc(db, 'requests', editingRequest.id), data);
              toast.success('تم تحديث الاشتراك بنجاح', { id: loadingToast });
            } else {
              await addDoc(collection(db, 'requests'), {
                ...data,
                userId: user?.uid || 'anonymous',
                buildingName: 'نظافة سيارات', // Fixed building for car subscriptions
              });
              toast.success('تمت إضافة الاشتراك بنجاح', { id: loadingToast });
            }
          } catch (error) {
            console.error(error);
            toast.error(editingRequest ? 'حدث خطأ أثناء تحديث الاشتراك' : 'حدث خطأ أثناء إضافة الاشتراك', { id: loadingToast });
          }
        }}
      />

      <GroupHistoryModal 
        isOpen={!!selectedHistoryGroup}
        onClose={() => setSelectedHistoryGroup(null)}
        requests={selectedHistoryGroup}
        onUpdateStatus={updateStatus}
        onEdit={(req) => {
          setEditingRequest(req);
          setIsModalOpen(true);
          setSelectedHistoryGroup(null);
        }}
        onDelete={(id) => {
          setConfirmDeleteId(id);
        }}
      />

      <SubscriptionDetailsModal 
        isOpen={!!selectedSubscriptionDetail}
        onClose={() => setSelectedSubscriptionDetail(null)}
        subscription={selectedSubscriptionDetail}
      />

      <WhatsAppMessageModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setSelectedWhatsAppTenant(null);
        }}
        tenant={selectedWhatsAppTenant}
        apartment={apartments.find(a => a.id === selectedWhatsAppTenant?.apartmentId) || null}
        cleaningRequests={requests}
      />

      <ApartmentDetailsModal 
        isOpen={!!selectedApartment}
        onClose={() => setSelectedApartment(null)}
        apartment={selectedApartment}
        requests={requests}
        tenants={tenants}
        apartments={apartments}
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

      <ApartmentCodesModal
        isOpen={isAptCodesModalOpen}
        onClose={() => setIsAptCodesModalOpen(false)}
        apartments={apartments}
        tenants={tenants}
      />

      <CarSubscriptionPaymentsModal
        isOpen={!!selectedSubscriptionForPayments}
        onClose={() => setSelectedSubscriptionForPayments(null)}
        subscription={selectedSubscriptionForPayments}
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

      <MonthlyListModal
        isOpen={isMonthlyListModalOpen}
        onClose={() => setIsMonthlyListModalOpen(false)}
        requests={requests}
        onGenerate={generateMonthlyList}
      />

      <ConfirmModal 
        isOpen={confirmDuplicatePrevMonth}
        onClose={() => setConfirmDuplicatePrevMonth(false)}
        onConfirm={() => {
          setConfirmDuplicatePrevMonth(false);
          executeDuplicatePreviousMonthSchedule();
        }}
        title="نسخ جدول الشهر السابق"
        message={`هل أنت متأكد من نسخ طلبات الشهر السابق إلى الشهر الحالي (${format(selectedMonth, 'MMMM yyyy', { locale: ar })})؟ سيتم نقل التواريخ ومزامنتها تلقائياً للشهر الجديد.`}
        confirmText="تأكيد النسخ والمزامنة"
        variant="primary"
        icon={Repeat}
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

      {/* Hidden Club Subscription Pledge Form for Printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {selectedClubSubForPrint && (
          <ClubSubscriptionForm
            ref={clubSubscriptionFormRef}
            subscription={selectedClubSubForPrint}
            tenants={tenants}
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
        isOpen={!!confirmDeleteClubSubId}
        onClose={() => setConfirmDeleteClubSubId(null)}
        onConfirm={() => {
          if (confirmDeleteClubSubId) {
            deleteClubSubscription(confirmDeleteClubSubId);
            setConfirmDeleteClubSubId(null);
          }
        }}
        title="تأكيد حذف الاشتراك"
        message="هل أنت متأكد من رغبتك في حذف هذا الاشتراك؟ لا يمكن التراجع عن هذا الإجراء."
      />

      <ConfirmModal 
        isOpen={!!confirmDeleteAptRequests}
        onClose={() => setConfirmDeleteAptRequests(null)}
        onConfirm={() => {
          if (confirmDeleteAptRequests) {
            const { building, apartment } = confirmDeleteAptRequests;
            const aptReqs = requests.filter(r => r.buildingName === building && r.apartmentNumber === apartment);
            aptReqs.forEach(r => deleteRequest(r.id));
            toast.success('تم حذف جميع طلبات الشقة بنجاح');
            setConfirmDeleteAptRequests(null);
          }
        }}
        title="تأكيد حذف جميع سجلات الشقة"
        message={confirmDeleteAptRequests ? `هل أنت متأكد من حذف جميع طلبات شقة ${confirmDeleteAptRequests.apartment} في ${confirmDeleteAptRequests.building}؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
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
        initialAdminPhone={adminPhone}
        initialWhatsappGroupLink={whatsappGroupLink}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      <ClubSubPrintModal 
        isOpen={isClubSubPrintModalOpen}
        onClose={() => setIsClubSubPrintModalOpen(false)}
        subscriptions={clubSubscriptions}
        onPrint={(sub) => setSelectedClubSubForPrint(sub)}
      />

      <WhatsAppAlertsModal 
        isOpen={isWhatsAppAlertsModalOpen}
        onClose={() => setIsWhatsAppAlertsModalOpen(false)}
        subscriptions={clubSubscriptions}
        tenants={tenants}
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
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedApartment({ 
                        building: selectedHistoryGroup[0].buildingName, 
                        apartment: selectedHistoryGroup[0].apartmentNumber 
                      });
                      setIsPrintingStatement(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:opacity-90 rounded-xl transition-all font-bold text-sm shadow-sm"
                  >
                    <Printer size={18} />
                    <span>طباعة الكشف</span>
                  </button>
                  <button 
                    onClick={() => setSelectedHistoryGroup(null)}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
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
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(req.id, 'status', req.status === 'pending' ? 'completed' : 'pending')}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                              req.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            )}>
                            {req.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                          </motion.button>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الدفع</p>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                              req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                            )}>
                            {req.paymentStatus === 'paid' ? 'مدفوع' : 'لم يدفع'}
                          </motion.button>
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
