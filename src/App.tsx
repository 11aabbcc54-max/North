/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
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
  doc, 
  deleteDoc, 
  Timestamp, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { 
  Building2, 
  Plus, 
  LogOut, 
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Share2, 
  Search,
  ChevronRight,
  ChevronLeft,
  Printer,
  X,
  Upload,
  LayoutDashboard,
  Menu,
  Home,
  User as UserIcon,
  PieChart,
  DollarSign,
  Car,
  Pencil,
  Sun,
  Moon,
  ListTodo,
  CalendarCheck,
  Save
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
  addMonths,
  subMonths
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
  status: 'pending' | 'in-progress' | 'completed';
  paymentStatus: 'unpaid' | 'paid';
  notes: string;
  receiptUrl?: string;
  createdAt: Timestamp;
}

const BUILDINGS = [
  "نظافة نورث"
];

const SERVICES = [
  { name: 'تنظيف عادي', price: 100 },
  { name: 'تنظيف عميق', price: 250 },
  { name: 'تنظيف سجاد', price: 150 },
  { name: 'تلميع أرضيات', price: 200 },
  { name: 'تنظيف واجهات', price: 300 },
  { name: 'تنظيف سيارات', price: 50 },
  { name: 'مدفوع من منصة إيجار', price: 0 },
  { name: 'مدفوع مع الإيجار', price: 0 }
];

// --- Components ---

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
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-2 border-red-100 dark:border-red-900/30">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <X className="text-red-600 dark:text-red-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">عذراً، حدث خطأ</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-bold leading-relaxed">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
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
          <h1 className="text-3xl font-bold text-blue-600">فاتورة خدمة نظافة</h1>
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
          <p>التاريخ: {format(request.date.toDate(), 'PPP', { locale: ar })}</p>
          <p>نوع الخدمة: {request.serviceType}</p>
          <p>عدد الطلبات: {request.monthsCount}</p>
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
            <td className="py-4">{request.serviceType} - شقة {request.apartmentNumber} ({request.monthsCount} شهر)</td>
            <td className="py-4 text-left">{request.price} ريال</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="py-4 font-bold text-lg">الإجمالي</td>
            <td className="py-4 text-left font-bold text-lg text-blue-600">{request.price} ريال</td>
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
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 p-8 text-center"
      >
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
          variant === "danger" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
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
              variant === "danger" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            )}
          >
            {confirmText}
          </button>
        </div>
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
    price: SERVICES.find(s => s.name === (defaultService || SERVICES[0].name))?.price || 100,
    dates: [format(new Date(), "yyyy-MM-dd'T'HH:mm")],
    notes: ''
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
          dates: [format(initialData.date.toDate(), "yyyy-MM-dd'T'HH:mm")],
          notes: initialData.notes || ''
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
          dates: [format(new Date(), "yyyy-MM-dd'T'HH:mm")],
          notes: ''
        });
      }
    }
  }, [isOpen, defaultBuilding, defaultService, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      dates: formData.dates.map(d => Timestamp.fromDate(new Date(d))),
      price: Number(formData.price),
      monthsCount: Number(formData.monthsCount),
      id: initialData?.id
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800"
      >
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {initialData ? 'تعديل طلب خدمة' : 'إضافة طلب جديد'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">يرجى تعبئة بيانات الخدمة بدقة</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-all shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">المبنى</label>
              <select 
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm text-gray-900 dark:text-white font-bold transition-all appearance-none"
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
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm text-gray-900 dark:text-white font-bold transition-all"
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
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm text-gray-900 dark:text-white font-bold transition-all appearance-none"
                value={formData.serviceType}
                onChange={e => {
                  const service = SERVICES.find(s => s.name === e.target.value);
                  setFormData({...formData, serviceType: e.target.value, price: (service?.price || 100) * formData.monthsCount});
                }}
              >
                {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">عدد الطلبات</label>
              <input 
                type="number"
                min="1"
                required
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm text-gray-900 dark:text-white font-bold transition-all"
                value={formData.monthsCount}
                onChange={e => {
                  const months = Number(e.target.value);
                  const service = SERVICES.find(s => s.name === formData.serviceType);
                  setFormData({...formData, monthsCount: months, price: (service?.price || 100) * months});
                }}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">التواريخ والمواعيد</label>
            <div className="space-y-2">
              {formData.dates.map((d, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="datetime-local"
                    required
                    className="flex-1 p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm text-gray-900 dark:text-white font-bold transition-all"
                    value={d}
                    onChange={e => {
                      const newDates = [...formData.dates];
                      newDates[idx] = e.target.value;
                      setFormData({...formData, dates: newDates});
                    }}
                  />
                  {formData.dates.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => {
                        const newDates = formData.dates.filter((_, i) => i !== idx);
                        setFormData({...formData, dates: newDates});
                      }}
                      className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {!initialData && (
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, dates: [...formData.dates, format(new Date(), "yyyy-MM-dd'T'HH:mm")]})}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <Plus size={16} />
                  إضافة تاريخ آخر
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">السعر الإجمالي (ريال)</label>
              <input 
                type="number"
                required
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white font-black text-lg transition-all"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">ملاحظات إضافية</label>
            <textarea 
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm text-gray-900 dark:text-white font-bold transition-all min-h-[80px]"
              placeholder="أي تفاصيل إضافية..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-base shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {initialData ? 'حفظ التعديلات' : 'تأكيد الطلب'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CleaningRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CleaningRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily-tasks' | string>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'summary' | 'calendar'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CleaningRequest | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSaveData, setConfirmSaveData] = useState<any | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const invoiceRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.email === '11aabbcc54@gmail.com';

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    onAfterPrint: () => setSelectedRequest(null),
  });

  useEffect(() => {
    if (selectedRequest && invoiceRef.current) {
      handlePrint();
    }
  }, [selectedRequest, handlePrint]);

  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedMonth));
    const end = endOfWeek(endOfMonth(selectedMonth));
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }

    const q = isAdmin 
      ? query(collection(db, 'requests'), orderBy('date', 'desc'))
      : query(collection(db, 'requests'), where('userId', '==', user.uid), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CleaningRequest[];
      setRequests(data);
    });

    return () => unsubscribe();
  }, [user]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const logout = () => signOut(auth);

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
        await updateDoc(doc(db, 'requests', id), { ...rest, date: dates[0] });
        toast.success('تم تحديث الطلب بنجاح');
      } else {
        const promises = dates.map((date: Timestamp) => 
          addDoc(collection(db, 'requests'), {
            ...rest,
            date,
            userId: user.uid,
            createdAt: Timestamp.now(),
            status: 'pending',
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

  const updateStatus = async (id: string, field: 'status' | 'paymentStatus', value: string) => {
    try {
      await updateDoc(doc(db, 'requests', id), { [field]: value });
      toast.success('تم تحديث الحالة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'requests', id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
    }
  };

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

  const shareSite = () => {
    if (navigator.share) {
      navigator.share({
        title: 'نظام إدارة النظافة',
        text: 'تابع طلبات النظافة لمبانينا!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ الرابط!');
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesMonth = isSameMonth(req.date.toDate(), selectedMonth);
    const matchesSearch = (req.apartmentNumber || '').includes(searchTerm) || (req.buildingName || '').includes(searchTerm);
    const matchesPayment = paymentFilter === 'all' || req.paymentStatus === paymentFilter;
    
    let matchesTab = activeTab === 'dashboard' || activeTab === 'daily-tasks';
    if (activeTab === 'تنظيف سيارات') {
      matchesTab = req.serviceType === 'تنظيف سيارات';
    } else if (BUILDINGS.includes(activeTab)) {
      matchesTab = req.buildingName === activeTab;
    }

    return matchesMonth && matchesSearch && matchesTab && matchesPayment;
  }).sort((a, b) => b.price - a.price);

  const stats = {
    total: filteredRequests.length,
    paid: filteredRequests.filter(r => r.paymentStatus === 'paid').reduce((s, r) => s + r.price, 0),
    unpaid: filteredRequests.filter(r => r.paymentStatus === 'unpaid').reduce((s, r) => s + r.price, 0),
    completed: filteredRequests.filter(r => r.status === 'completed').length,
    inProgress: filteredRequests.filter(r => r.status === 'in-progress').length,
    pending: filteredRequests.filter(r => r.status === 'pending').length,
  };

  const dailyTasks = React.useMemo(() => {
    const days = eachDayOfInterval({
      start: new Date(),
      end: addDays(new Date(), 7)
    });
    
    return days.map(day => ({
      date: day,
      requests: filteredRequests.filter(req => isSameDay(req.date.toDate(), day))
    }));
  }, [filteredRequests]);

  const apartmentSummary = React.useMemo(() => {
    const summary: Record<string, { count: number, total: number, paid: number, unpaid: number }> = {};
    filteredRequests.forEach(req => {
      if (!summary[req.apartmentNumber]) {
        summary[req.apartmentNumber] = { count: 0, total: 0, paid: 0, unpaid: 0 };
      }
      summary[req.apartmentNumber].count += 1;
      summary[req.apartmentNumber].total += req.price;
      if (req.paymentStatus === 'paid') {
        summary[req.apartmentNumber].paid += req.price;
      } else {
        summary[req.apartmentNumber].unpaid += req.price;
      }
    });
    return Object.entries(summary).map(([apt, data]) => ({ apartment: apt, ...data }))
      .sort((a, b) => a.apartment.localeCompare(b.apartment, undefined, { numeric: true }));
  }, [filteredRequests]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center"
        >
          <div className="bg-blue-100 p-5 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8">
            <Building2 className="text-blue-600 w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">نظام إدارة النظافة</h1>
          <p className="text-gray-500 mb-10 text-lg">إدارة ذكية لطلبات النظافة في مجمعاتنا السكنية</p>
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 py-4 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-blue-200 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            الدخول عبر جوجل
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex overflow-hidden transition-colors duration-300", darkMode ? "dark bg-slate-950" : "bg-slate-50")} dir="rtl">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white dark:bg-slate-900 border-l dark:border-slate-800 flex flex-col z-50 shadow-xl transition-colors duration-300"
      >
        <div className="p-6 flex items-center gap-3 border-b dark:border-slate-800 h-20">
          <div className="bg-blue-600 p-2.5 rounded-2xl shrink-0 shadow-lg shadow-blue-200 dark:shadow-none">
            <Building2 className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && <span className="font-black text-xl text-blue-900 dark:text-white truncate tracking-tight">إدارة النظافة</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group",
              activeTab === 'dashboard' 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" 
                : "text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
            )}
          >
            <LayoutDashboard size={22} className={cn(activeTab === 'dashboard' ? "text-white" : "group-hover:scale-110 transition-transform")} />
            {isSidebarOpen && <span className="font-bold">لوحة التحكم</span>}
          </button>

          <button 
            onClick={() => setActiveTab('daily-tasks')}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group",
              activeTab === 'daily-tasks' 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" 
                : "text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
            )}
          >
            <CalendarCheck size={22} className={cn(activeTab === 'daily-tasks' ? "text-white" : "group-hover:scale-110 transition-transform")} />
            {isSidebarOpen && <span className="font-bold">المهام اليومية</span>}
          </button>

          <div className="pt-6 pb-2 px-3">
            {isSidebarOpen && <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">المباني والخدمات</span>}
          </div>

          {BUILDINGS.map(b => (
            <button 
              key={b}
              onClick={() => setActiveTab(b)}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group",
                activeTab === b 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" 
                  : "text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
              )}
            >
              <Home size={22} className={cn(activeTab === b ? "text-white" : "group-hover:scale-110 transition-transform")} />
              {isSidebarOpen && <span className="font-bold truncate">{b}</span>}
            </button>
          ))}

          <button 
            onClick={() => setActiveTab('تنظيف سيارات')}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group",
              activeTab === 'تنظيف سيارات' 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" 
                : "text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
            )}
          >
            <Car size={22} className={cn(activeTab === 'تنظيف سيارات' ? "text-white" : "group-hover:scale-110 transition-transform")} />
            {isSidebarOpen && <span className="font-bold">تنظيف السيارات</span>}
          </button>
        </nav>

        <div className="p-4 border-t dark:border-slate-800">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all group"
          >
            {darkMode ? <Sun size={22} className="group-hover:rotate-90 transition-transform" /> : <Moon size={22} className="group-hover:-rotate-12 transition-transform" />}
            {isSidebarOpen && <span className="font-bold">{darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>}
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all group mt-1"
          >
            <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-bold">تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 h-20 flex items-center justify-between px-8 sticky top-0 z-40 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-500 dark:text-slate-400 transition-all"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {activeTab === 'dashboard' ? 'لوحة التحكم' : activeTab === 'daily-tasks' ? 'المهام اليومية' : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                {user.displayName?.[0] || 'U'}
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.displayName}</p>
                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mt-1">{isAdmin ? 'مسؤول النظام' : 'مستخدم'}</p>
              </div>
            </div>
            <button 
              onClick={shareSite}
              className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
            >
              <Share2 size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* Stats Cards */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {[
                { label: 'إجمالي الطلبات', value: stats.total, icon: FileText, color: 'blue', trend: '+12%' },
                { label: 'طلبات قيد التنفيذ', value: stats.inProgress, icon: Clock, color: 'blue', trend: '+5%' },
                { label: 'طلبات مكتملة', value: stats.completed, icon: CheckCircle2, color: 'indigo', trend: '+15%' },
                { label: 'المبالغ المحصلة', value: `${stats.paid} ريال`, icon: DollarSign, color: 'emerald', trend: '+8%' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "p-4 rounded-2xl transition-transform group-hover:scale-110",
                      stat.color === 'blue' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                      stat.color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                      stat.color === 'orange' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" :
                      "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <stat.icon size={26} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-lg",
                      stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
                    )}>
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Daily Tasks View */}
          {activeTab === 'daily-tasks' && (
            <div className="space-y-8 mb-10">
              {dailyTasks.map((day, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm",
                      isToday(day.date) ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-gray-900 dark:text-white border dark:border-slate-800"
                    )}>
                      <span className="text-[10px] uppercase leading-none mb-1">{format(day.date, 'EEE', { locale: ar })}</span>
                      <span className="text-lg leading-none">{format(day.date, 'd')}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        {isToday(day.date) ? 'اليوم' : format(day.date, 'EEEE', { locale: ar })}
                      </h3>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                        {format(day.date, 'MMMM yyyy', { locale: ar })} • {day.requests.length} مهام مجدولة
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {day.requests.length > 0 ? (
                      day.requests.map(req => (
                        <motion.div 
                          key={req.id}
                          whileHover={{ y: -4 }}
                          onClick={() => {
                            setEditingRequest(req);
                            setIsModalOpen(true);
                          }}
                          className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                              {req.serviceType === 'تنظيف سيارات' ? <Car size={22} /> : <Home size={22} />}
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
                              title={req.paymentStatus === 'paid' ? 'تم التحصيل' : 'تحصيل المبلغ'}
                            >
                              <CreditCard size={16} />
                            </button>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                              req.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : 
                              req.status === 'in-progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" :
                              "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                            )}>
                              {req.status === 'completed' ? 'مكتمل' : req.status === 'in-progress' ? 'قيد التنفيذ' : 'معلق'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center bg-gray-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-800">
                        <p className="text-gray-400 dark:text-slate-500 font-bold text-sm">لا توجد مهام مجدولة لهذا اليوم</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Today's Car Cleaning Notification */}
          {activeTab !== 'daily-tasks' && requests.filter(req => 
            req.serviceType === 'تنظيف سيارات' && 
            isSameDay(req.date.toDate(), new Date()) &&
            (req.status === 'pending' || req.status === 'in-progress')
          ).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl shadow-blue-200 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                  <Car size={32} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">تنبيه: جدول غسيل السيارات لليوم</h3>
                  <p className="text-blue-100 font-bold">
                    لديك {requests.filter(req => req.serviceType === 'تنظيف سيارات' && isSameDay(req.date.toDate(), new Date()) && (req.status === 'pending' || req.status === 'in-progress')).length} سيارات بانتظار الغسيل اليوم ({format(new Date(), 'EEEE', { locale: ar })})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('تنظيف سيارات')}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-lg relative z-10 whitespace-nowrap"
              >
                عرض الجدول الآن
              </button>
            </motion.div>
          )}

          {/* Top Bar: Month & Search */}
          <div className="flex flex-col lg:flex-row gap-6 mb-10">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
              <button 
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors dark:text-gray-400"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex items-center gap-3 px-4 min-w-[180px] justify-center">
                <Calendar className="text-blue-600 dark:text-blue-400" size={22} />
                <span className="font-black text-lg dark:text-white">{format(selectedMonth, 'MMMM yyyy', { locale: ar })}</span>
              </div>
              <button 
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors dark:text-gray-400"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={22} />
                <input 
                  type="text"
                  placeholder="البحث برقم الشقة أو المبنى..."
                  className="w-full pr-12 pl-6 py-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all font-medium dark:text-white dark:placeholder-gray-600"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
                <button 
                  onClick={() => setPaymentFilter('all')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm",
                    paymentFilter === 'all' 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  الكل
                </button>
                <button 
                  onClick={() => setPaymentFilter('paid')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm",
                    paymentFilter === 'paid' 
                      ? "bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  المدفوعات
                </button>
                <button 
                  onClick={() => setPaymentFilter('unpaid')}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl font-bold transition-all text-sm",
                    paymentFilter === 'unpaid' 
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  غير المدفوع
                </button>
              </div>
            </div>
          </div>

          {/* Daily Tasks Summary in Dashboard & Buildings */}
          {(activeTab === 'dashboard' || BUILDINGS.includes(activeTab)) && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="bg-blue-600 w-2 h-8 rounded-full" />
                  {activeTab === 'dashboard' ? 'المهام اليومية القادمة' : `مهام ${activeTab} القادمة`}
                </h3>
                <button 
                  onClick={() => setActiveTab('daily-tasks')}
                  className="text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline"
                >
                  عرض الكل
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {eachDayOfInterval({
                  start: new Date(),
                  end: addDays(new Date(), 3)
                }).map(day => {
                  const dayRequests = filteredRequests.filter(r => isSameDay(r.date.toDate(), day));
                  return (
                    <motion.div 
                      key={day.toISOString()} 
                      whileHover={{ scale: 1.02 }}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className={cn(
                          "font-black text-sm",
                          isToday(day) ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"
                        )}>
                          {format(day, 'EEEE', { locale: ar })}
                          {isToday(day) && " (اليوم)"}
                        </p>
                        <span className="text-[10px] font-bold text-gray-400">
                          {format(day, 'd MMMM', { locale: ar })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {dayRequests.length > 0 ? (
                          dayRequests.slice(0, 2).map(req => (
                            <div 
                              key={req.id} 
                              onClick={() => {
                                setEditingRequest(req);
                                setIsModalOpen(true);
                              }}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700 cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm">
                                  {req.serviceType === 'تنظيف سيارات' ? <Car className="text-blue-600" size={16} /> : <Home className="text-blue-600" size={16} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">شقة {req.apartmentNumber}</p>
                                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">{req.serviceType}</p>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'unpaid' ? 'paid' : 'unpaid');
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                )}
                              >
                                <CreditCard size={12} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-xs text-gray-400">لا توجد مهام</p>
                          </div>
                        )}
                        {dayRequests.length > 2 && (
                          <p className="text-[10px] text-center text-blue-600 font-bold">+ {dayRequests.length - 2} مهام أخرى</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Car Cleaning Alerts */}
          {activeTab === 'تنظيف سيارات' && (
            <div className="mb-10 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                  <div className="bg-blue-600 w-2 h-8 rounded-full" />
                  جدول غسيل السيارات لليوم ({format(new Date(), 'EEEE', { locale: ar })})
                </h3>
              </div>
              
              {filteredRequests.filter(req => isSameDay(req.date.toDate(), new Date())).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRequests
                    .filter(req => isSameDay(req.date.toDate(), new Date()))
                    .map((req) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={req.id}
                        className={cn(
                          "p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all",
                          req.status === 'completed' 
                            ? "bg-green-50 border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400" 
                            : "bg-blue-50 border-blue-100 text-blue-800 shadow-lg shadow-blue-100/50 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400 dark:shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            req.status === 'completed' ? "bg-green-200 text-green-700" : "bg-blue-600 text-white"
                          )}>
                            <Car size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold opacity-70 mb-0.5">رقم اللوحة</p>
                            <p className="text-lg font-black tracking-wider">{req.apartmentNumber}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold opacity-70 uppercase mb-1">الحالة</p>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                            req.status === 'completed' ? "bg-green-200" : "bg-blue-200"
                          )}>
                            {req.status === 'completed' ? 'تم الغسل' : 'بانتظار الغسل'}
                          </span>
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

          {/* Requests Table/List/Calendar */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
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
                      viewMode === 'list' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    عرض القائمة
                  </button>
                  <button 
                    onClick={() => setViewMode('summary')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'summary' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    ملخص الشقق
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'calendar' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    التقويم
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  مدفوع: {stats.paid}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  معلق: {stats.unpaid}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {viewMode === 'list' ? (
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest text-center">
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
                      {filteredRequests.length > 0 ? (
                        filteredRequests.map((req) => (
                          <motion.tr 
                            key={req.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors text-center"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg text-blue-600 dark:text-blue-400">
                                  <Home size={16} />
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm">شقة {req.apartmentNumber}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{req.buildingName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-700 dark:text-slate-300 text-sm">{req.serviceType}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-gray-600 dark:text-slate-400">{format(req.date.toDate(), 'PPP', { locale: ar })}</p>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500">{format(req.date.toDate(), 'p', { locale: ar })}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-700 dark:text-slate-300 text-sm">{req.monthsCount}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-base font-black text-blue-600 dark:text-blue-400">{req.price} ريال</span>
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => {
                                  const nextStatus = req.status === 'pending' ? 'in-progress' : req.status === 'in-progress' ? 'completed' : 'pending';
                                  updateStatus(req.id, 'status', nextStatus);
                                }}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all mx-auto",
                                  req.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : 
                                  req.status === 'in-progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" :
                                  "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                                )}
                              >
                                {req.status === 'completed' ? <CheckCircle2 size={12} /> : req.status === 'in-progress' ? <Clock size={12} /> : <Clock size={12} />}
                                {req.status === 'completed' ? 'مكتمل' : req.status === 'in-progress' ? 'قيد التنفيذ' : 'معلق'}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => updateStatus(req.id, 'paymentStatus', req.paymentStatus === 'unpaid' ? 'paid' : 'unpaid')}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all mx-auto",
                                  req.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                )}
                              >
                                <CreditCard size={12} />
                                {req.paymentStatus === 'paid' ? 'تم الدفع' : 'لم يدفع'}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <label className="cursor-pointer p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleReceiptUpload(req.id, file);
                                    }}
                                  />
                                  <Upload size={18} />
                                </label>
                                {req.receiptUrl && (
                                  <button 
                                    onClick={() => window.open(req.receiptUrl, '_blank')}
                                    className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-emerald-500 hover:text-emerald-600 transition-all"
                                  >
                                    <FileText size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingRequest(req);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedRequest(req);
                                  }}
                                  className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                >
                                  <Printer size={18} />
                                </button>
                                <button 
                                  onClick={() => setConfirmDeleteId(req.id)}
                                  className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-20 text-center">
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
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 text-sm font-black uppercase tracking-widest">
                      <th className="px-8 py-5">رقم الشقة</th>
                      <th className="px-8 py-5">عدد الطلبات</th>
                      <th className="px-8 py-5">إجمالي المبلغ</th>
                      <th className="px-8 py-5">المبالغ المدفوعة</th>
                      <th className="px-8 py-5">المبالغ المعلقة</th>
                      <th className="px-8 py-5">الحالة العامة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {apartmentSummary.length > 0 ? (
                      apartmentSummary.map((apt) => (
                        <tr key={apt.apartment} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                          <td className="px-8 py-6">
                            <span className="font-black text-gray-900 dark:text-white text-lg">شقة {apt.apartment}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-bold">
                              {apt.count} طلبات
                            </span>
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
                                مكتمل السداد
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold">
                                <Clock size={14} />
                                يوجد مبالغ معلقة
                              </span>
                            )}
                          </td>
                        </tr>
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
                      const dayRequests = filteredRequests.filter(req => isSameDay(req.date.toDate(), day));
                      const isCurrentMonth = isSameMonth(day, selectedMonth);
                      
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "bg-white dark:bg-slate-900 min-h-[140px] p-3 transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                            !isCurrentMonth && "bg-gray-50/50 dark:bg-slate-950/50 opacity-40"
                          )}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={cn(
                              "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                              isToday(day) ? "bg-blue-600 text-white" : "text-gray-500 dark:text-slate-400"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {dayRequests.length > 0 && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-black">
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
        </main>

        {/* FAB */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-10 left-10 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-blue-300 hover:bg-blue-700 transition-all hover:scale-105 flex items-center gap-2 z-50"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="font-black text-sm">طلب جديد</span>
        </button>
      </div>

      {/* Modal */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequest(null);
        }} 
        onSave={saveRequest}
        defaultBuilding={activeTab !== 'dashboard' && activeTab !== 'تنظيف سيارات' ? activeTab : undefined}
        defaultService={activeTab === 'تنظيف سيارات' ? 'تنظيف سيارات' : undefined}
        initialData={editingRequest}
      />

      {/* Hidden Invoice */}
      <div className="hidden">
        {selectedRequest && <Invoice ref={invoiceRef} request={selectedRequest} />}
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteRequest(confirmDeleteId)}
        title="تأكيد الحذف"
        message="هل أنت متأكد من رغبتك في حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
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

      <Toaster position="top-center" richColors />
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
