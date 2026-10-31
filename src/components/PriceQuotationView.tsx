import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  Calendar, 
  Home, 
  User, 
  Phone, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Share2, 
  Trash2, 
  ExternalLink, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  X, 
  FileCheck, 
  Eye, 
  ShieldCheck, 
  Sparkles,
  Percent,
  Copy,
  Receipt,
  ArrowRightLeft
} from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { Apartment, Tenant } from '../App';

export interface PriceQuotation {
  id: string;
  quotationNumber: string;
  clientName: string;
  clientPhone: string;
  clientIdNumber?: string;
  clientCompany?: string;
  clientEmail?: string;
  apartmentId: string;
  apartmentNumber: string;
  buildingName: string;
  roomType?: string;
  floor?: string;
  issueDate: any;
  startDate: any;
  endDate: any;
  validUntil: any;
  durationMonths: number;
  annualRent: number;
  paymentFrequency: 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
  installmentsCount: number;
  installmentAmount: number;
  securityDeposit: number;
  serviceFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  features: string[];
  terms: string[];
  notes?: string;
  status: 'active' | 'accepted' | 'expired' | 'contracted' | 'cancelled';
  createdAt: any;
}

interface PriceQuotationViewProps {
  apartments: Apartment[];
  tenants: Tenant[];
  propertyBuildings: { id: string; name: string; apartments: string[] }[];
  onConvertToContract?: (quotation: PriceQuotation) => void;
  onBackToContracts?: () => void;
  safeToDate: (d: any) => Date;
}

const DEFAULT_TERMS = [
  'هذا العرض سارٍ ومحدد الصلاحية وفق التاريخ الموضح أعلاه، وتعتبر الأسعار خاضعة للتحديث بعد انتهاء المدة.',
  'يعتبر حجز الوحدة مؤكداً فقط بعد سداد العربون / الدفعة الأولى وتوقيع عقد الإيجار الرسمي عبر منصة إيجار.',
  'مبلغ التأمين مسترد بالكامل عند انتهاء مدة العقد وتسليم الوحدة السكنية بحالتها الأصلية.',
  'تشمل القيمة الإيجارية الصيانة الدورية للأجهزة والتكييف وفق بنود العقد المعتمد.',
  'يلتزم المستأجر باللائحة الداخلية للمجمع السكني والمحافظة على الممتلكات والهدوء العام.'
];

const AVAILABLE_FEATURES = [
  'موقف سيارة خاص ومظلل',
  'أجهزة كهربائية متكاملة ومطبخ مجهز',
  'تكييف سبليت راكب ومفحوص',
  'صيانة شاملة دورية طوال مدة العقد',
  'إنترنت ألياف بصرية فائق السرعة',
  'دخول مجاني للنادي الصحي والمسبح',
  'أمن وحراسة وكاميرات مراقبة 24/7',
  'مصاعد حديثة وبطاقات دخول ذكية'
];

export const PriceQuotationView: React.FC<PriceQuotationViewProps> = ({
  apartments,
  tenants,
  propertyBuildings,
  onConvertToContract,
  onBackToContracts,
  safeToDate
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'list'>('create');
  const [quotations, setQuotations] = useState<PriceQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'contracted' | 'expired'>('all');

  // Print modal state
  const [previewQuotation, setPreviewQuotation] = useState<PriceQuotation | null>(null);
  const quotationPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientIdNumber, setClientIdNumber] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [selectedApartmentNumber, setSelectedApartmentNumber] = useState('101');
  const [buildingName, setBuildingName] = useState('مبنى ١');
  const [roomType, setRoomType] = useState('غرفة و صالة فاخرة');
  const [floor, setFloor] = useState('الدور الأول');

  // Dates
  const [startDateStr, setStartDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [validityDays, setValidityDays] = useState<number>(14);

  // Financials
  const [annualRent, setAnnualRent] = useState<number>(45000);
  const [paymentFrequency, setPaymentFrequency] = useState<'annual' | 'semi-annual' | 'quarterly' | 'monthly'>('quarterly');
  const [securityDeposit, setSecurityDeposit] = useState<number>(2000);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(0); // 0% for residential, 15% for commercial
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'موقف سيارة خاص ومظلل',
    'أجهزة كهربائية متكاملة ومطبخ مجهز',
    'صيانة شاملة دورية طوال مدة العقد',
    'إنترنت ألياف بصرية فائق السرعة',
    'أمن وحراسة وكاميرات مراقبة 24/7'
  ]);
  const [customTerms, setCustomTerms] = useState<string[]>(DEFAULT_TERMS);
  const [notes, setNotes] = useState('');

  // Load Quotations from Firestore
  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PriceQuotation[];
      setQuotations(items);
    } catch (e) {
      console.warn('Could not load quotations from Firestore, using local cache', e);
      // Fallback local storage
      try {
        const local = localStorage.getItem('north_residence_quotations');
        if (local) setQuotations(JSON.parse(local));
      } catch (err) {
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // Update building & room type when apartment changes
  const handleSelectApartment = (aptNum: string) => {
    setSelectedApartmentNumber(aptNum);
    const foundApt = apartments.find(a => 
      a.number === aptNum || 
      a.id?.endsWith(`-${aptNum}`) || 
      a.number?.toLowerCase() === aptNum.toLowerCase()
    );

    if (foundApt) {
      if (foundApt.buildingName) setBuildingName(foundApt.buildingName);
      if (foundApt.roomType) setRoomType(foundApt.roomType);
      if (foundApt.floor) setFloor(foundApt.floor);
      if (foundApt.price && Number(foundApt.price) > 0) {
        setAnnualRent(Number(foundApt.price));
      }
    } else {
      // Find building by prefix
      if (aptNum.startsWith('1')) setBuildingName('مبنى ١');
      else if (aptNum.startsWith('2')) setBuildingName('مبنى ٢');
      else if (aptNum.startsWith('3')) setBuildingName('مبنى ٣');
      else if (aptNum.startsWith('4')) setBuildingName('مبنى ٤');
      else if (aptNum.startsWith('5')) setBuildingName('مبنى ٥');
    }
  };

  // Calculations
  const calculatedEndDate = useMemo(() => {
    try {
      const d = new Date(startDateStr);
      return addMonths(d, durationMonths);
    } catch {
      return new Date();
    }
  }, [startDateStr, durationMonths]);

  const calculatedValidUntil = useMemo(() => {
    return addDays(new Date(), validityDays);
  }, [validityDays]);

  const installmentsCount = useMemo(() => {
    switch (paymentFrequency) {
      case 'annual': return 1;
      case 'semi-annual': return 2;
      case 'quarterly': return 4;
      case 'monthly': return 12;
      default: return 1;
    }
  }, [paymentFrequency]);

  const installmentAmount = useMemo(() => {
    return Math.round((annualRent / installmentsCount) * 100) / 100;
  }, [annualRent, installmentsCount]);

  const vatAmount = useMemo(() => {
    return Math.round((annualRent * (vatRate / 100)) * 100) / 100;
  }, [annualRent, vatRate]);

  const totalAmount = useMemo(() => {
    return annualRent + securityDeposit + serviceFee + vatAmount;
  }, [annualRent, securityDeposit, serviceFee, vatAmount]);

  // Toggle features
  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== feat));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  // Generate Quotation Number
  const generateQuotationNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `QT-${year}-${selectedApartmentNumber}-${rand}`;
  };

  // Save Quotation Handler
  const handleSaveQuotation = async (andPrint = false) => {
    if (!clientName.trim()) {
      toast.error('يرجى كتابة اسم العميل / المستأجر المحتمل');
      return;
    }
    if (!selectedApartmentNumber.trim()) {
      toast.error('يرجى تحديد رقم الشقة');
      return;
    }
    if (!annualRent || annualRent <= 0) {
      toast.error('يرجى تحديد قيمة الإيجار السنوي');
      return;
    }

    const qNum = generateQuotationNumber();
    const newQuote: Omit<PriceQuotation, 'id'> = {
      quotationNumber: qNum,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientIdNumber: clientIdNumber.trim(),
      clientCompany: clientCompany.trim(),
      clientEmail: clientEmail.trim(),
      apartmentId: `${buildingName}-${selectedApartmentNumber}`,
      apartmentNumber: selectedApartmentNumber.trim(),
      buildingName,
      roomType,
      floor,
      issueDate: new Date(),
      startDate: new Date(startDateStr),
      endDate: calculatedEndDate,
      validUntil: calculatedValidUntil,
      durationMonths,
      annualRent,
      paymentFrequency,
      installmentsCount,
      installmentAmount,
      securityDeposit,
      serviceFee,
      vatRate,
      vatAmount,
      totalAmount,
      features: selectedFeatures,
      terms: customTerms,
      notes: notes.trim(),
      status: 'active',
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'quotations'), newQuote);
      const savedObj: PriceQuotation = {
        id: docRef.id,
        ...newQuote,
        createdAt: new Date()
      };

      const updatedList = [savedObj, ...quotations];
      setQuotations(updatedList);
      try {
        localStorage.setItem('north_residence_quotations', JSON.stringify(updatedList));
      } catch (err) {}

      toast.success(`تم حفظ عرض السعر رقم ${qNum} بنجاح ✓`);

      if (andPrint) {
        setPreviewQuotation(savedObj);
      } else {
        setActiveSubTab('list');
      }
    } catch (e: any) {
      console.error(e);
      // Fallback local save
      const fallbackObj: PriceQuotation = {
        id: `local-${Date.now()}`,
        ...newQuote,
        createdAt: new Date()
      };
      const updatedList = [fallbackObj, ...quotations];
      setQuotations(updatedList);
      try {
        localStorage.setItem('north_residence_quotations', JSON.stringify(updatedList));
      } catch (err) {}

      toast.success(`تم حفظ عرض السعر محلياً رقم ${qNum} ✓`);
      if (andPrint) {
        setPreviewQuotation(fallbackObj);
      } else {
        setActiveSubTab('list');
      }
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف عرض السعر؟')) return;
    try {
      if (!id.startsWith('local-')) {
        await deleteDoc(doc(db, 'quotations', id));
      }
      const updated = quotations.filter(q => q.id !== id);
      setQuotations(updated);
      localStorage.setItem('north_residence_quotations', JSON.stringify(updated));
      toast.success('تم حذف عرض السعر بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء حذف عرض السعر');
    }
  };

  // Convert to Contract Action
  const handleConvertQuotationToContract = (q: PriceQuotation) => {
    if (onConvertToContract) {
      onConvertToContract(q);
      toast.success(`جاري تحويل عرض السعر لشقة ${q.apartmentNumber} إلى عقد إيجار رسمي...`);
    } else {
      toast.info('يمكنك تسجيل العقد الآن من نافذة العقود');
    }
  };

  // WhatsApp Share Quotation
  const handleShareWhatsApp = (q: PriceQuotation) => {
    const text = `السلام عليكم ورحمة الله وبركاته،
أهلاً بك أستاذ ${q.clientName}،
يسر إدارة *مجمع نورث ريزيدنس السكني* تزويدكم بعرض السعر التالي:

📄 *رقم العرض:* ${q.quotationNumber}
🏢 *الوحدة:* شقة ${q.apartmentNumber} (${q.buildingName})
📐 *النوع:* ${q.roomType || 'شقة سكنية فاخرة'}
📅 *بداية الإيجار المقترحة:* ${format(safeToDate(q.startDate), 'dd/MM/yyyy')}
⏱️ *المدة:* ${q.durationMonths} شهراً
💰 *الإيجار السنوي:* ${q.annualRent.toLocaleString('en-US')} ر.س
💳 *نظام الدفعات:* ${q.installmentsCount === 1 ? 'دفعة سنوية' : q.installmentsCount === 2 ? 'دفعتان نصف سنوية' : q.installmentsCount === 4 ? '4 دفعات ربع سنوية' : 'شهري'} (${q.installmentAmount.toLocaleString('en-US')} ر.س / دفعة)
🔒 *التأمين المسترد:* ${q.securityDeposit.toLocaleString('en-US')} ر.س
💵 *الإجمالي الكلي:* ${q.totalAmount.toLocaleString('en-US')} ر.س
⏳ *صلاحية العرض:* حتى ${format(safeToDate(q.validUntil), 'dd/MM/yyyy')}

نسعد بخدمتكم وتأكيد حجزكم في أي وقت.`;

    const cleanPhone = q.clientPhone.replace(/\D/g, '');
    let waPhone = cleanPhone;
    if (waPhone.startsWith('05')) waPhone = '966' + waPhone.substring(1);
    else if (waPhone.startsWith('5')) waPhone = '966' + waPhone;

    const url = waPhone 
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Print quotation using react-to-print
  const handleReactToPrint = useReactToPrint({
    contentRef: quotationPrintRef,
    documentTitle: previewQuotation ? `عرض_سعر_${previewQuotation.quotationNumber}` : 'عرض_سعر_نورث_ريزيدنس',
    onAfterPrint: () => {
      toast.success('تمت عملية الطباعة بنجاح');
    },
    onPrintError: (location, err) => {
      console.error('react-to-print error:', location, err);
      toast.error('تعذر استدعاء نافذة الطباعة المباشرة، جاري التبديل للطباعة الاحتياطية...');
      fallbackIframePrint();
    }
  });

  // Isolated Fallback iframe print (works inside sandboxed iframes & webviews)
  const fallbackIframePrint = () => {
    if (!quotationPrintRef.current) return;
    try {
      const printNode = quotationPrintRef.current;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        toast.error('تعذر إنشاء إطار الطباعة');
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8">
            <title>عرض سعر - نورث ريزيدنس</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { 
                font-family: 'Cairo', sans-serif; 
                direction: rtl; 
                margin: 0; 
                padding: 18px; 
                background: #ffffff; 
                color: #0f172a; 
              }
              @page { 
                size: A4; 
                margin: 10mm; 
              }
              @media print {
                body { 
                  -webkit-print-color-adjust: exact !important; 
                  print-color-adjust: exact !important; 
                }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div>${printNode.innerHTML}</div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Fallback print error:', e);
          toast.info('يمكنك الضغط على زر "تحميل صورة / PDF" لحفظ المستند وطباعته مباشرة.');
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 600);
    } catch (err) {
      console.error('Fallback iframe print failed:', err);
    }
  };

  // Main Print Action
  const handlePrintAction = () => {
    toast.info('جاري فتح خيارات الطباعة...');
    try {
      if (handleReactToPrint) {
        handleReactToPrint();
      } else {
        fallbackIframePrint();
      }
    } catch (err) {
      console.error('Trigger print error:', err);
      fallbackIframePrint();
    }
  };

  // Direct High-Resolution Document Download (HD PNG / PDF)
  const handleDownloadQuotationImage = async () => {
    if (!quotationPrintRef.current || !previewQuotation) return;
    setIsExportingImage(true);
    const toastId = toast.loading('جاري تجهيز وتحميل المستند بدقة فائقة (A4)...');
    try {
      await new Promise(r => setTimeout(r, 250));
      const dataUrl = await toPng(quotationPrintRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `عرض_سعر_${previewQuotation.quotationNumber}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('تم تحميل عرض السعر بجودة عالية جاهز للحفظ أو الطباعة!', { id: toastId });
    } catch (err) {
      console.error('Error generating image:', err);
      toast.error('حدث خطأ أثناء تحميل عرض السعر', { id: toastId });
    } finally {
      setIsExportingImage(false);
    }
  };

  // Filtered quotations list
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = 
        (q.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.apartmentNumber || '').includes(searchQuery) ||
        (q.quotationNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.clientPhone || '').includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter !== 'all' && q.status !== statusFilter) return false;

      return true;
    });
  }, [quotations, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                عروض الأسعار
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold font-mono">
                {quotations.length} عرض
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              إصدار عروض أسعار رسمية معتمدة للوحدات السكنية مع الطباعة والربط المباشر بقائمة العقود
            </p>
          </div>
        </div>

        {/* SubTab Switcher & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {onBackToContracts && (
            <button
              type="button"
              onClick={onBackToContracts}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowRight size={15} />
              <span>العودة لقائمة العقود</span>
            </button>
          )}

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('create')}
              className={cn(
                "px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'create'
                  ? "bg-amber-500 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              <Plus size={14} />
              <span>طلب عرض سعر جديد</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('list')}
              className={cn(
                "px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'list'
                  ? "bg-slate-900 dark:bg-slate-700 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              <FileText size={14} />
              <span>سجل العروض ({quotations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: CREATE NEW QUOTATION FORM */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck size={19} className="text-amber-500" />
                <span>بيانات طلب عرض السعر</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {format(new Date(), 'dd/MM/yyyy')}
              </span>
            </div>

            <div className="space-y-6">
              {/* SECTION 1: Client Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                  <User size={14} className="text-amber-500" />
                  <span>١. بيانات العميل / المستأجر المقترح</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم العميل أو الشركة *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد بن سعد القحطاني / شركة ..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم الجوال (واتساب) *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="05XXXXXXXX"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم الهوية الوطنية / الإقامة / السجل التجاري (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="10XXXXXXXX أو 70XXXXXXXX"
                      value={clientIdNumber}
                      onChange={(e) => setClientIdNumber(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      جهة العمل / الشركة (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="اسم جهة العمل أو الشركة"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Apartment Selection */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                  <Home size={14} className="text-amber-500" />
                  <span>٢. تحديد الوحدة السكنية والمشروع</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Apartment Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم الشقة *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="مثال: 101 أو 205"
                        value={selectedApartmentNumber}
                        onChange={(e) => handleSelectApartment(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <Home size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Building */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      المبنى
                    </label>
                    <select
                      value={buildingName}
                      onChange={(e) => setBuildingName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="مبنى ١">مبنى ١</option>
                      <option value="مبنى ٢">مبنى ٢</option>
                      <option value="مبنى ٣">مبنى ٣</option>
                      <option value="مبنى ٤">مبنى ٤</option>
                      <option value="مبنى ٥">مبنى ٥</option>
                    </select>
                  </div>

                  {/* Room Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      نوع الوحدة والتأثيث
                    </label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="غرفة و صالة فاخرة ومفروشة">غرفة وصالة (مفروشة فاخرة)</option>
                      <option value="غرفتين و صالة فاخرة ومفروشة">غرفتان وصالة (مفروشة فاخرة)</option>
                      <option value="استوديو مؤثث بالكامل">استوديو فاخر</option>
                      <option value="شقة غير مفروشة">شقة بدون أثاث</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Dates & Duration */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                  <Calendar size={14} className="text-amber-500" />
                  <span>٣. التواريخ ومدة العقد وصلاحية العرض</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      تاريخ بداية الإيجار المقترح *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Duration in months */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      مدة العقد
                    </label>
                    <select
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value={12}>سنة كاملة (12 شهر)</option>
                      <option value={6}>6 أشهر</option>
                      <option value={24}>سنتان (24 شهر)</option>
                      <option value={3}>3 أشهر (تجريبي)</option>
                    </select>
                  </div>

                  {/* Quotation Validity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      صلاحية عرض السعر
                    </label>
                    <select
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value={7}>7 أيام من تاريخ اليوم</option>
                      <option value={14}>14 يوماً (أسبوعان)</option>
                      <option value={30}>30 يوماً (شهر كامل)</option>
                      <option value={3}>3 أيام فقط</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-bold">
                  <span>تاريخ نهاية العقد المحسوب: <b className="text-amber-600">{format(calculatedEndDate, 'dd/MM/yyyy')}</b></span>
                  <span>العرض صالح لغاية: <b className="text-emerald-600">{format(calculatedValidUntil, 'dd/MM/yyyy')}</b></span>
                </div>
              </div>

              {/* SECTION 4: Financials & Payments */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-amber-500" />
                  <span>٤. المبالغ والجدول المالي لطريقة الدفع</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Annual Rent */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      قيمة الإيجار السنوي (ر.س) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={annualRent}
                      onChange={(e) => setAnnualRent(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Payment Frequency */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      نظام سداد الدفعات
                    </label>
                    <select
                      value={paymentFrequency}
                      onChange={(e) => setPaymentFrequency(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="annual">دفعة واحدة سنوية (1 قسط)</option>
                      <option value="semi-annual">دفعتان نصف سنوية (قسطان)</option>
                      <option value="quarterly">4 دفعات ربع سنوية (كل 3 أشهر)</option>
                      <option value="monthly">شهري (12 قسط)</option>
                    </select>
                  </div>

                  {/* Security Deposit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      مبلغ التأمين المسترد (ر.س)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Service Fee */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رسوم الخدمات / السعي (ر.س)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={serviceFee}
                      onChange={(e) => setServiceFee(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Features Included */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>٥. الخدمات والمميزات المشمولة في العرض</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_FEATURES.map((feat) => {
                    const isChecked = selectedFeatures.includes(feat);
                    return (
                      <div
                        key={feat}
                        onClick={() => toggleFeature(feat)}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-2",
                          isChecked
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0",
                          isChecked ? "bg-amber-500 text-white" : "border border-slate-300"
                        )}>
                          {isChecked && <Check size={12} />}
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveQuotation(true)}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                >
                  <Printer size={18} />
                  <span>حفظ وطباعة عرض السعر فوراً 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotation(false)}
                  className="py-3.5 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus size={16} />
                  <span>حفظ في السجل فقط</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary Card (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400">
                  <Receipt size={18} />
                  <span className="text-xs font-black">الملخص المالي للعرض</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-amber-300">
                  شقة {selectedApartmentNumber}
                </span>
              </div>

              {/* Apartment details */}
              <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>المشروع:</span>
                  <b className="text-white">{buildingName} - نورث ريزيدنس</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>الوحدة:</span>
                  <b className="text-white">شقة رقم {selectedApartmentNumber}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>نوع الوحدة:</span>
                  <b className="text-amber-200">{roomType}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>المدة:</span>
                  <b className="text-white">{durationMonths} شهراً</b>
                </div>
              </div>

              {/* Payments breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>الإيجار السنوي:</span>
                  <span className="font-mono font-bold text-white">{annualRent.toLocaleString('en-US')} ر.س</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>نظام الأقساط:</span>
                  <span className="font-mono text-amber-300">
                    {installmentsCount} دفعة ({installmentAmount.toLocaleString('en-US')} ر.س / قسط)
                  </span>
                </div>

                {securityDeposit > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>مبلغ التأمين (مسترد):</span>
                    <span className="font-mono text-white">{securityDeposit.toLocaleString('en-US')} ر.س</span>
                  </div>
                )}

                {serviceFee > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>رسوم الخدمات:</span>
                    <span className="font-mono text-white">{serviceFee.toLocaleString('en-US')} ر.س</span>
                  </div>
                )}

                {vatAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>ضريبة القيمة المضافة ({vatRate}%):</span>
                    <span className="font-mono text-white">{vatAmount.toLocaleString('en-US')} ر.س</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                  <span className="text-amber-400">الإجمالي الكلي:</span>
                  <span className="font-mono text-lg text-emerald-400">
                    {totalAmount.toLocaleString('en-US')} ر.س
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>جاهز للطباعة والتحويل لعقد:</span>
                </p>
                <p className="text-slate-300 leading-relaxed">
                  يمكنك حفظ العرض وطباعته بنسخة A4 فاخرة رسمية، أو تحويله مباشرة لعقد إيجار مسجل بضغطة زر.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: QUOTATIONS LIST */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="بحث برقم الشقة، اسم العميل، أو رقم العرض..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-4 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/60 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn("px-3 py-1 rounded-full transition-all", statusFilter === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs" : "text-slate-500")}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={cn("px-3 py-1 rounded-full transition-all", statusFilter === 'active' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs" : "text-slate-500")}
                >
                  ساري
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('contracted')}
                  className={cn("px-3 py-1 rounded-full transition-all", statusFilter === 'contracted' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-2xs" : "text-slate-500")}
                >
                  تم التعاقد
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('create')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer mr-auto"
            >
              <Plus size={16} />
              <span>طلب عرض سعر جديد</span>
            </button>
          </div>

          {/* Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuotations.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-black">لا توجد عروض أسعار مسجلة</p>
                <p className="text-xs text-slate-400 mt-1">اضغط على زر "طلب عرض سعر جديد" لإصدار عرض سعر وطباعته فوراً.</p>
              </div>
            ) : (
              filteredQuotations.map((q) => {
                const issueDateObj = safeToDate(q.issueDate);
                const startDateObj = safeToDate(q.startDate);
                const validUntilObj = safeToDate(q.validUntil);
                const isContracted = q.status === 'contracted';

                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 transition-all shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                            <Home size={16} />
                          </span>
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              شقة {q.apartmentNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {q.buildingName} • {q.roomType || 'شقة سكنية'}
                            </span>
                          </div>
                        </div>

                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black",
                          isContracted 
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        )}>
                          {isContracted ? 'تم التعاقد ✓' : 'عرض ساري'}
                        </span>
                      </div>

                      {/* Quotation Number & Client */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-right space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>{q.quotationNumber}</span>
                          <span>{format(issueDateObj, 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
                          <User size={13} className="text-amber-500 shrink-0" />
                          <span className="truncate">{q.clientName}</span>
                        </div>
                        {q.clientPhone && (
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Phone size={11} />
                            <span>{q.clientPhone}</span>
                          </div>
                        )}
                      </div>

                      {/* Financial info */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">الإيجار السنوي</span>
                          <b className="font-mono text-amber-600 dark:text-amber-400">
                            {q.annualRent.toLocaleString('en-US')} ر.س
                          </b>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">نظام الدفع</span>
                          <b className="text-slate-700 dark:text-slate-300">
                            {q.installmentsCount === 1 ? 'سنوي' : q.installmentsCount === 2 ? 'نصف سنوي' : q.installmentsCount === 4 ? 'ربع سنوي' : 'شهري'}
                          </b>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                        <span>بداية الإيجار: {format(startDateObj, 'dd/MM/yyyy')}</span>
                        <span className="text-rose-500">صالح لـ: {format(validUntilObj, 'dd/MM')}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      {/* Print button */}
                      <button
                        type="button"
                        onClick={() => setPreviewQuotation(q)}
                        className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="معاينة وطباعة عرض السعر"
                      >
                        <Printer size={14} />
                        <span>طباعة 🖨️</span>
                      </button>

                      {/* Convert to contract button */}
                      {!isContracted && (
                        <button
                          type="button"
                          onClick={() => handleConvertQuotationToContract(q)}
                          className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="تحويل العرض لعقد إيجار رسمي"
                        >
                          <FileCheck size={14} className="text-emerald-400" />
                          <span>تحويل لعقد</span>
                        </button>
                      )}

                      {/* WhatsApp share */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(q)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all cursor-pointer"
                        title="إرسال عبر الواتساب"
                      >
                        <Share2 size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuotation(q.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE QUOTATION MODAL */}
      <AnimatePresence>
        {previewQuotation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto font-cairo" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white text-slate-900 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto"
            >
              {/* Modal Top Control Bar (Hidden when printing) */}
              <div className="no-print p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-amber-400" />
                  <span className="font-black text-sm">معاينة عرض السعر للطباعة الرسمية (A4)</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePrintAction}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    title="طباعة عرض السعر مباشرة"
                  >
                    <Printer size={15} />
                    <span>طباعة الآن 🖨️</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExportingImage}
                    onClick={handleDownloadQuotationImage}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                    title="تحميل عرض السعر بصيغة صورة / PDF عالية الدقة"
                  >
                    <Download size={14} />
                    <span>{isExportingImage ? 'جاري التحميل...' : 'تحميل صورة / PDF 📥'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(previewQuotation)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    title="مشاركة تفاصيل العرض عبر الواتساب"
                  >
                    <Share2 size={14} />
                    <span>مشاركة بالواتساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewQuotation(null)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="إغلاق المعاينة"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* PRINTABLE OFFICIAL DOCUMENT (A4 Format) */}
              <div 
                ref={quotationPrintRef} 
                className="quotation-print-container p-8 sm:p-12 overflow-y-auto custom-scrollbar bg-white text-slate-900 space-y-6"
              >
                {/* Official Header */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-lg">
                        NR
                      </div>
                      <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-950">
                          نورث ريزيدنس | NORTH RESIDENCE
                        </h1>
                        <p className="text-[11px] font-bold text-slate-500">
                          مجمع سكني راقٍ متكامل الخدمات • الرياض، المملكة العربية السعودية
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-left font-mono space-y-1 text-xs">
                    <div className="bg-slate-100 px-3 py-1 rounded-lg font-black text-slate-900 border border-slate-200">
                      عرض سعر: {previewQuotation.quotationNumber}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      التاريخ: {format(safeToDate(previewQuotation.issueDate), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-[11px] text-rose-600 font-bold">
                      صالح لغاية: {format(safeToDate(previewQuotation.validUntil), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <h2 className="text-base font-black text-slate-900">
                    عــرض سـعـر إيـجـار وحـدة سـكـنـيـة (PRICE QUOTATION)
                  </h2>
                </div>

                {/* Client & Unit Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* Client Card */}
                  <div className="p-4 rounded-xl border border-slate-300 space-y-2">
                    <h3 className="font-black text-slate-900 pb-1 border-b border-slate-200">
                      بيانات العميل / المستأجر المقترح:
                    </h3>
                    <div className="flex justify-between">
                      <span className="text-slate-500">الاسم / الجهة:</span>
                      <b className="text-slate-900">{previewQuotation.clientName}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">رقم الجوال:</span>
                      <b className="font-mono text-slate-900">{previewQuotation.clientPhone || '---'}</b>
                    </div>
                    {previewQuotation.clientIdNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">الهوية / السجل:</span>
                        <b className="font-mono text-slate-900">{previewQuotation.clientIdNumber}</b>
                      </div>
                    )}
                    {previewQuotation.clientCompany && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">الشركة:</span>
                        <b className="text-slate-900">{previewQuotation.clientCompany}</b>
                      </div>
                    )}
                  </div>

                  {/* Unit Card */}
                  <div className="p-4 rounded-xl border border-slate-300 space-y-2">
                    <h3 className="font-black text-slate-900 pb-1 border-b border-slate-200">
                      بيانات ومواصفات الوحدة السكنية:
                    </h3>
                    <div className="flex justify-between">
                      <span className="text-slate-500">المشروع / المبنى:</span>
                      <b className="text-slate-900">{previewQuotation.buildingName} - نورث ريزيدنس</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">رقم الوحدة:</span>
                      <b className="text-slate-950 font-black">شقة رقم {previewQuotation.apartmentNumber}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">نوع وتأثيث الوحدة:</span>
                      <b className="text-slate-900">{previewQuotation.roomType || 'شقة فاخرة'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">مدة العقد:</span>
                      <b className="text-slate-900">{previewQuotation.durationMonths} شهراً</b>
                    </div>
                  </div>
                </div>

                {/* Lease Period */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>تاريخ بداية الإيجار المقترح: <b>{format(safeToDate(previewQuotation.startDate), 'dd/MM/yyyy')}</b></span>
                  <span>تاريخ نهاية الإيجار المقترح: <b>{format(safeToDate(previewQuotation.endDate), 'dd/MM/yyyy')}</b></span>
                </div>

                {/* Financial Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black">
                      <tr>
                        <th className="p-3">البيان المالي</th>
                        <th className="p-3">نظام الدفع</th>
                        <th className="p-3 text-left">المبلغ بالريال السعودي (SAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-3 font-bold">قيمة الإيجار السنوي للوحدة السكنية</td>
                        <td className="p-3 text-slate-600">
                          {previewQuotation.installmentsCount === 1 ? 'دفعة واحدة سنوية' : previewQuotation.installmentsCount === 2 ? 'دفعتان نصف سنوية' : previewQuotation.installmentsCount === 4 ? '4 دفعات ربع سنوية' : 'شهري'}
                          {' '}({previewQuotation.installmentAmount.toLocaleString('en-US')} ر.س / دفعة)
                        </td>
                        <td className="p-3 text-left font-mono font-black">{previewQuotation.annualRent.toLocaleString('en-US')} ر.س</td>
                      </tr>
                      {previewQuotation.securityDeposit > 0 && (
                        <tr>
                          <td className="p-3 font-bold">مبلغ التأمين المسترد</td>
                          <td className="p-3 text-slate-600">يسدد لمرة واحدة ومسترد عند تسليم الشقة</td>
                          <td className="p-3 text-left font-mono font-black">{previewQuotation.securityDeposit.toLocaleString('en-US')} ر.س</td>
                        </tr>
                      )}
                      {previewQuotation.serviceFee > 0 && (
                        <tr>
                          <td className="p-3 font-bold">رسوم الخدمات / السعي</td>
                          <td className="p-3 text-slate-600">خدمات المجمع وإدارة الأملاك</td>
                          <td className="p-3 text-left font-mono font-black">{previewQuotation.serviceFee.toLocaleString('en-US')} ر.س</td>
                        </tr>
                      )}
                      {previewQuotation.vatAmount > 0 && (
                        <tr>
                          <td className="p-3 font-bold">ضريبة القيمة المضافة ({previewQuotation.vatRate}%)</td>
                          <td className="p-3 text-slate-600">الضريبة المطبقة</td>
                          <td className="p-3 text-left font-mono font-black">{previewQuotation.vatAmount.toLocaleString('en-US')} ر.س</td>
                        </tr>
                      )}
                      <tr className="bg-slate-100/80 font-black text-sm">
                        <td className="p-3 text-slate-900" colSpan={2}>
                          الإجمالي الكلي المطلوب لعرض السعر:
                        </td>
                        <td className="p-3 text-left font-mono text-base text-slate-950">
                          {previewQuotation.totalAmount.toLocaleString('en-US')} ر.س
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Features Included */}
                {previewQuotation.features && previewQuotation.features.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <h3 className="font-black text-slate-900">المميزات والخدمات المشمولة في العرض:</h3>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                      {previewQuotation.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <Check size={12} className="text-emerald-600" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                  <h3 className="font-black text-slate-900 text-xs">الشروط والأحكام العامة:</h3>
                  <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                    {(previewQuotation.terms || DEFAULT_TERMS).map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ol>
                </div>

                {/* Signature and Stamp Row */}
                <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
                  <div className="space-y-8">
                    <p className="font-black text-slate-900">إدارة مجمع نورث ريزيدنس (المؤجر)</p>
                    <div className="h-14 flex items-center justify-center">
                      <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center text-[10px] text-slate-400 rotate-12">
                        الختم الرسمي
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">التوقيع: .......................................</p>
                  </div>

                  <div className="space-y-8">
                    <p className="font-black text-slate-900">العميل بالموافقة على العرض (المستأجر)</p>
                    <div className="h-14"></div>
                    <p className="text-[11px] text-slate-500">الاسم والتوقيع: .......................................</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
