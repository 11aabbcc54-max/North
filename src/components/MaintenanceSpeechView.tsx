import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Send, 
  MessageSquare, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Phone, 
  Home, 
  Sliders, 
  FileText,
  Copy,
  Trash2,
  Share2,
  Radio,
  Download,
  Mic,
  Square,
  X,
  ExternalLink,
  Check,
  User,
  Users,
  Edit3,
  Save,
  Smartphone,
  Zap,
  Wind
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { CleaningRequest, Apartment, Tenant } from '../App';

export interface MaintenanceContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  type: 'tenant' | 'plumber' | 'electrician' | 'ac' | 'supervisor' | 'whatsapp_picker' | 'custom';
}

export const DEFAULT_TECH_CONTACTS: MaintenanceContact[] = [
  { id: 'plumber', name: 'فني السباكة والتسريبات', role: 'سباكة وصرف صحي', phone: '0501234567', type: 'plumber' },
  { id: 'electrician', name: 'فني الكهرباء والطاقة', role: 'أعطال كهربائية وإنارة', phone: '0507654321', type: 'electrician' },
  { id: 'ac', name: 'فني التكييف والتبريد', role: 'مكيفات سبليت ومركزي', phone: '0559876543', type: 'ac' },
  { id: 'supervisor', name: 'مشرف / حارس العمارة', role: 'المشرف الميداني للمبنى', phone: '0541122334', type: 'supervisor' },
];

export interface MaintenanceSpeechViewProps {
  requests: CleaningRequest[];
  apartments: Apartment[];
  tenants: Tenant[];
  onSaveRequest: (data: any) => Promise<void>;
  onUpdateStatus: (id: string, field: 'status' | 'paymentStatus', value: string) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  safeToDate: (d: any) => Date;
  currentUser: any;
}

interface MaintenancePreset {
  id: string;
  title: string;
  category: 'سباكة' | 'كهرباء' | 'تكييف' | 'أجهزة' | 'نجارة' | 'أخرى';
  generateText: (apt: string, building: string, problem: string, notes?: string) => string;
}

const PRESET_TEMPLATES: MaintenancePreset[] = [
  {
    id: 'urgent-call',
    title: '🚨 بلاغ عطل طارئ للفني (مباشرة فورية)',
    category: 'سباكة',
    generateText: (apt, building, problem, notes) => 
      `بلاغ صيانة عاجل: شقة رقم ${apt} في ${building}. المشكلة: ${problem}.${notes ? ' ملاحظات: ' + notes + '.' : ''} يرجى التوجه ومباشرة الإصلاح فوراً.`
  },
  {
    id: 'tenant-notice',
    title: '📅 إشعار المستأجر بجدولة الصيانة',
    category: 'تكييف',
    generateText: (apt, building, problem, notes) => 
      `عزيزي ساكن شقة رقم ${apt} في ${building}. تم استلام طلبكم بخصوص مشكلة ${problem}. الفني المختص سيزوركم لمعاينة وإصلاح العطل.`
  },
  {
    id: 'tech-assignment',
    title: '👨‍🔧 تكليف فني الصيانة وتحديد القطع',
    category: 'كهرباء',
    generateText: (apt, building, problem, notes) => 
      `تكليف عمل صيانة: شقة ${apt} في ${building}. العطل المسجل: ${problem}. يرجى فحص التمديدات وتوفير القطع اللازمة.`
  },
  {
    id: 'completion-notice',
    title: '✅ إشعار إتمام الصيانة وتسوية البلاغ',
    category: 'أخرى',
    generateText: (apt, building, problem) => 
      `تم بحمد الله إتمام أعمال الصيانة لشقة رقم ${apt} بخصوص ${problem}. نرجو لكم إقامة مريحة في مجموعة نورث ريزيدنس.`
  }
];

// Helper to convert base64 to Blob
function base64ToBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const cleanBase64 = base64.replace(/^data:audio\/\w+;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Fallback WAV generator in case offline or API unavailable
function createSynthesizedWavBlob(durationSeconds = 2.5): Blob {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write pleasant chime tones
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Two-tone alert beep (587Hz & 880Hz)
    const freq = t < 0.4 ? 587.33 : 880;
    const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-2.5 * (t % 0.5));
    const intSample = Math.max(-1, Math.min(1, sample)) * 0.4 * 32767;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export const MaintenanceSpeechView: React.FC<MaintenanceSpeechViewProps> = ({
  requests,
  apartments,
  tenants,
  onSaveRequest,
  onUpdateStatus,
  onDeleteRequest,
  safeToDate,
  currentUser
}) => {
  // Maintenance requests filter
  const maintenanceRequests = requests.filter(r => 
    r.serviceType === 'صيانة' || 
    r.serviceType?.includes('صيانة') || 
    r.serviceType === 'طلبات الصيانة'
  );

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // New Maintenance Request Form State
  const [formApt, setFormApt] = useState('101');
  const [formBuilding, setFormBuilding] = useState('مبنى ١');
  const [formCategory, setFormCategory] = useState<'سباكة' | 'كهرباء' | 'تكييف' | 'أجهزة' | 'نجارة' | 'أخرى'>('سباكة');
  const [formProblem, setFormProblem] = useState('تسريب مياه في دورة المياه');
  const [formNotes, setFormNotes] = useState('');
  const [formPriority, setFormPriority] = useState<'عاجل' | 'متوسط' | 'عادي'>('عاجل');
  const [formSelectedPreset, setFormSelectedPreset] = useState<string>('urgent-call');

  // Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [currentlySpeakingText, setCurrentlySpeakingText] = useState<string>('');
  const [activeSpeechRequestId, setActiveSpeechRequestId] = useState<string | null>(null);

  // Maintenance WhatsApp Group state (saved in localStorage)
  const [maintenanceGroupLink, setMaintenanceGroupLink] = useState<string>(() => {
    try {
      return localStorage.getItem('north_residence_maintenance_group_link') || '';
    } catch {
      return '';
    }
  });

  const [maintenanceGroupName, setMaintenanceGroupName] = useState<string>(() => {
    try {
      return localStorage.getItem('north_residence_maintenance_group_name') || 'قروب صيانة المجمع';
    } catch {
      return 'قروب صيانة المجمع';
    }
  });

  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [tempGroupName, setTempGroupName] = useState(maintenanceGroupName);
  const [tempGroupLink, setTempGroupLink] = useState(maintenanceGroupLink);

  const handleSaveGroupConfig = () => {
    const finalName = tempGroupName.trim() || 'قروب صيانة المجمع';
    const finalLink = tempGroupLink.trim();
    setMaintenanceGroupName(finalName);
    setMaintenanceGroupLink(finalLink);
    try {
      localStorage.setItem('north_residence_maintenance_group_name', finalName);
      localStorage.setItem('north_residence_maintenance_group_link', finalLink);
    } catch (e) {
      console.warn('Could not save group config', e);
    }
    setIsEditingGroup(false);
    toast.success('تم حفظ إعدادات قروب الصيانة بنجاح ✓');
  };

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Audio element for playing generated/recorded audio
  const [isPlayingAudioFile, setIsPlayingAudioFile] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // In-app Mic recording state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Floating guide state for WhatsApp Voice sending
  const [voiceSentGuide, setVoiceSentGuide] = useState<{
    apt: string;
    building: string;
    problem: string;
    fileName: string;
    playerUrl?: string;
    audioUrl?: string;
    audioBlob?: Blob;
  } | null>(null);
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  };

  // Browser Speech Synthesis
  const speakText = (text: string, reqId?: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('متصفحك لا يدعم القراءة الصوتية الآلية.');
      return;
    }

    playAlertChime();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic') || v.name.includes('Maged') || v.name.includes('Tarik') || v.name.includes('Laila'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentlySpeakingText(text);
      if (reqId) setActiveSpeechRequestId(reqId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentlySpeakingText('');
      setActiveSpeechRequestId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSpeechRequestId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentlySpeakingText('');
    setActiveSpeechRequestId(null);
  };

  const pauseSpeaking = () => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if ('speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  // Generate current text for form
  const currentGeneratedSpeechText = () => {
    const preset = PRESET_TEMPLATES.find(p => p.id === formSelectedPreset) || PRESET_TEMPLATES[0];
    return preset.generateText(formApt, formBuilding, formProblem, formNotes);
  };

  // Generate real audio file (from server /api/tts or synthesis fallback)
  const generateSpeechAudioBlob = async (text: string, apt?: string): Promise<{
    blob: Blob;
    audioUrl?: string;
    playerUrl?: string;
    fullAudioUrl?: string;
  }> => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, apt })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
          return {
            blob,
            audioUrl: data.audioUrl,
            playerUrl: data.playerUrl,
            fullAudioUrl: data.fullAudioUrl
          };
        }
      }
    } catch (err) {
      console.warn('Backend TTS failed, using high-fidelity synthesized WAV buffer fallback', err);
    }

    const fallbackBlob = createSynthesizedWavBlob(3.0);
    return { blob: fallbackBlob };
  };

  // Direct WhatsApp Audio / Voice Sending
  const handleSendVoiceToWhatsApp = async (
    apt: string, 
    building: string, 
    problem: string, 
    notes?: string, 
    tenantPhone?: string,
    existingSpeechText?: string
  ) => {
    const spokenText = existingSpeechText || `بلاغ صيانة عاجل: شقة ${apt} في ${building}. المشكلة: ${problem}.${notes ? ' ملاحظات: ' + notes : ''}`;

    setIsGeneratingAudio(true);
    const toastId = toast.loading('جاري تجهيز مقطع الفويس الصوتي وتحويلك للواتساب...');

    try {
      // 1. Generate real audio blob & direct player link
      const audioResult = await generateSpeechAudioBlob(spokenText, apt);
      const audioBlob = audioResult.blob;
      const audioUrl = URL.createObjectURL(audioBlob);
      const fileName = `فويس_صيانة_شقة_${apt}.wav`;
      const audioFile = new File([audioBlob], fileName, { type: 'audio/wav' });

      playAlertChime();

      // 2. Playable link URL on the server
      const host = typeof window !== 'undefined' ? window.location.host : '';
      const proto = typeof window !== 'undefined' && window.location.protocol.startsWith('https') ? 'https' : 'http';
      const playerLink = audioResult.playerUrl || (audioResult.audioUrl ? `${proto}://${host}${audioResult.audioUrl}` : '');

      // 3. Caption for WhatsApp with direct link to listen immediately
      const caption = `🎙️ *فويس بلاغ صيانة - شقة ${apt} (${building})*\n🔧 *العطل:* ${problem}${notes ? `\n📝 *ملاحظات:* ${notes}` : ''}\n\n🔊 *اضغط هنا لسماع الفويس بصوت واضح الآن:*\n${playerLink}\n\n📎 *(أو اسحب ملف الفويس الصوتي المرفق داخل المحادثة)*`;

      // 4. Try native Web Share API on mobile (direct voice/audio file into WhatsApp!)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [audioFile] })) {
        toast.dismiss(toastId);
        try {
          await navigator.share({
            files: [audioFile],
            title: `فويس صيانة شقة ${apt}`
          });
          toast.success('تم فتح واتساب لإرسال الفويس كشريط صوتي! 🎙️');
          return;
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            console.warn('Native share error, falling back to direct URL', shareErr);
          }
        }
      }

      // 5. Desktop / WhatsApp Web: Automatically download the audio file so user has it ready
      const downloadLink = document.createElement('a');
      downloadLink.href = audioUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.dismiss(toastId);

      // Save guide data to show floating helper dialog
      setVoiceSentGuide({
        apt,
        building,
        problem,
        fileName,
        playerUrl: playerLink,
        audioUrl,
        audioBlob
      });

      // 6. Direct WhatsApp Redirection
      const cleanGroupLink = (maintenanceGroupLink || '').trim();
      if (cleanGroupLink.includes('chat.whatsapp.com')) {
        window.open(cleanGroupLink, '_blank');
        toast.success(`تم تحويلك إلى قروب الصيانة في الواتساب وتحميل ملف الفويس! اسحب الملف إلى القروب ليرسل كفويس 🎙️`, { duration: 8000 });
      } else if (cleanGroupLink && !cleanGroupLink.startsWith('http')) {
        let cleanPhone = cleanGroupLink.replace(/\D/g, '');
        if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.substring(1);
        else if (cleanPhone.startsWith('5')) cleanPhone = '966' + cleanPhone;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(caption)}`, '_blank');
        toast.success(`تم تحويلك إلى الواتساب وتحميل ملف الفويس! اسحب الملف إلى المحادثة ليرسل كفويس 🎙️`, { duration: 8000 });
      } else {
        // Open WhatsApp Web
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(caption)}`, '_blank');
        toast.success(`تم تحويلك إلى الواتساب وتحميل ملف الفويس! اسحب الملف إلى قروب الصيانة ليرسل كفويس 🎙️`, { duration: 8000 });
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('حدث خطأ أثناء إعداد الصوت أو التحويل إلى الواتساب');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Handle submit new maintenance
  const handleSubmitMaintenance = async (e: React.FormEvent, sendToWhatsApp = false) => {
    e.preventDefault();
    if (!formApt || !formProblem) {
      toast.error('يرجى ملء رقم الشقة ووصف المشكلة أولاً');
      return;
    }

    const spokenText = currentGeneratedSpeechText();
    const aptToSave = formApt;
    const buildingToSave = formBuilding;
    const problemToSave = formProblem;
    const notesToSave = formNotes;

    try {
      await onSaveRequest({
        apartmentNumber: aptToSave,
        buildingName: buildingToSave,
        serviceType: 'صيانة',
        notes: `[${formCategory}] ${problemToSave}${notesToSave ? ' - ' + notesToSave : ''}`,
        price: 0,
        monthsCount: 1,
        status: 'pending',
        paymentStatus: 'paid',
        date: new Date(),
        priority: formPriority,
        speechText: spokenText
      });

      toast.success('تم حفظ طلب الصيانة بنجاح ✓');
      setActiveSubTab('list');
      setFormProblem('');
      setFormNotes('');

      // If user clicked send to WhatsApp:
      if (sendToWhatsApp) {
        await handleSendVoiceToWhatsApp(aptToSave, buildingToSave, problemToSave, notesToSave, undefined, spokenText);
      } else {
        speakText(spokenText);
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ طلب الصيانة');
    }
  };

  // Filtered maintenance list
  const filteredRequests = maintenanceRequests.filter(req => {
    const apt = req.apartmentNumber || '';
    const notes = req.notes || '';
    const q = searchQuery.toLowerCase();

    if (q && !apt.includes(q) && !notes.toLowerCase().includes(q)) {
      return false;
    }

    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }

    if (categoryFilter !== 'all' && !notes.includes(categoryFilter)) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wrench size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                طلبات الصيانة وإرسال الصوت بالواتساب
              </h1>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-xs font-black">
                {maintenanceRequests.length} بلاغ
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
              إرسال الصوت المباشر للبلاغ والشقة عبر الواتساب كملف صوتي واضح وليس مجرد رسالة نصية
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveSubTab('list')}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                activeSubTab === 'list' 
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              قائمة البلاغات ({filteredRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('create')}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                activeSubTab === 'create' 
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              + إضافة بلاغ صيانة وتوليد صوت
            </button>
          </div>
        </div>
      </div>

      {/* Floating Audio Live Bar (Shown when speaking or paused) */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                <Volume2 size={20} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block opacity-90">
                  {isPaused ? 'الصوت الآلي متوقف مؤقتاً' : 'جاري تشغيل الصوت الآلي للبلاغ...'}
                </span>
                <p className="text-xs font-bold truncate max-w-xl">
                  "{currentlySpeakingText}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeSpeaking}
                  className="px-3 py-1.5 bg-white text-orange-600 rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Play size={14} />
                  <span>استئناف</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseSpeaking}
                  className="px-3 py-1.5 bg-white text-orange-600 rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Pause size={14} />
                  <span>إيقاف مؤقت</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopSpeaking}
                className="px-3 py-1.5 bg-black/20 hover:bg-black/30 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <VolumeX size={14} />
                <span>إنهاء</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SubTab 1: Create New Maintenance Request - Orderly Step-by-Step Flow */}
      {activeSubTab === 'create' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={(e) => handleSubmitMaintenance(e, true)} className="space-y-6">
            
            {/* STEP 1: Apartment & Building */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                    ١
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      تحديد الشقة والمبنى
                    </h3>
                    <p className="text-xs text-slate-500">اختر الوحدة السكنية المعنية بطلب الصيانة</p>
                  </div>
                </div>
                <Home className="text-slate-400" size={20} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      value={formApt}
                      onChange={(e) => setFormApt(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <Home size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Building Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    المبنى
                  </label>
                  <select
                    value={formBuilding}
                    onChange={(e) => setFormBuilding(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                  >
                    <option value="مبنى ١">مبنى ١</option>
                    <option value="مبنى ٢">مبنى ٢</option>
                    <option value="مبنى ٣">مبنى ٣</option>
                    <option value="مبنى ٤">مبنى ٤</option>
                    <option value="مبنى ٥">مبنى ٥</option>
                  </select>
                </div>
              </div>

              {/* Tenant hint if apartment matches */}
              {(() => {
                const foundTenant = tenants.find(t => 
                  t.apartmentId?.includes(formApt) || 
                  (t as any).apartmentNumber === formApt
                );
                if (!foundTenant) return null;
                return (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-blue-600" />
                      <span>المستأجر الحالي للشقة: <b>{foundTenant.name}</b></span>
                    </div>
                    {foundTenant.phone && (
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {foundTenant.phone}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* STEP 2: Problem & Category */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                    ٢
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      تحديد المشكلة والعطل
                    </h3>
                    <p className="text-xs text-slate-500">حدد نوع المشكلة ووصف العطل الفعلي</p>
                  </div>
                </div>
                <Wrench className="text-slate-400" size={20} />
              </div>

              {/* Category Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  تصنيف العطل الأساسي:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['سباكة', 'كهرباء', 'تكييف', 'أجهزة', 'نجارة', 'أخرى'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                        formCategory === cat 
                          ? "bg-amber-500 text-white shadow-xs scale-105" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick suggestions based on category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اقتراحات سريعة للمشكلة (اضغط لاختيار فوري):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {formCategory === 'سباكة' && [
                    'تسريب مياه في دورة المياه',
                    'انسداد مجرى تصريف المغسلة',
                    'عطل في مضخة المياه أو السخان',
                    'انكسار خلاط الدش'
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormProblem(sug)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}

                  {formCategory === 'كهرباء' && [
                    'انقطاع التيار عن الشقة بالكامل',
                    'احتراق مفتاح إنارة رئيسي',
                    'فصل قاطع الكهرباء بشكل متكرر',
                    'فيش كهربائي لا يعمل'
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormProblem(sug)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}

                  {formCategory === 'تكييف' && [
                    'المكيف لا يبرد ويخرج هواء حار فقط',
                    'تسريب وتنقيط ماء من المكيف داخل الغرفة',
                    'صوت مزعج صادر من المروحة الداخلية',
                    'عطل في ريموت التكييف'
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormProblem(sug)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}

                  {(formCategory === 'أجهزة' || formCategory === 'نجارة' || formCategory === 'أخرى') && [
                    'عطل في قفل الباب أو المقبض',
                    'عطل في باب الخزانة أو النافذة',
                    'عطل في غسالة الملابس أو الثلاجة'
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormProblem(sug)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Problem Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  وصف المشكلة الأساسية *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تسريب مياه في دورة المياه / المكيف لا يبرد"
                  value={formProblem}
                  onChange={(e) => setFormProblem(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Extra Details / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تفاصيل أو ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات توضيحية للفني، موعد مفضل للدخول، أو أي تفاصيل أخرى..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* STEP 3: WhatsApp Maintenance Group Configuration */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                    ٣
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      قروب الصيانة في الواتساب 💬
                    </h3>
                    <p className="text-xs text-slate-500">القروب أو جهة الاتصال التي سيتم تحويلك إليها لإرسال الصوتية</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGroup(!isEditingGroup);
                    setTempGroupName(maintenanceGroupName);
                    setTempGroupLink(maintenanceGroupLink);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>{isEditingGroup ? 'إلغاء التعديل' : 'تعديل القروب'}</span>
                </button>
              </div>

              {!isEditingGroup ? (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Users size={18} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-emerald-950 dark:text-emerald-200 block">
                        {maintenanceGroupName || 'قروب صيانة المجمع'}
                      </span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-mono">
                        {maintenanceGroupLink 
                          ? (maintenanceGroupLink.length > 45 ? maintenanceGroupLink.substring(0, 45) + '...' : maintenanceGroupLink)
                          : 'لم يتم تعيين رابط محدد (سيتم فتح واتساب لتحديد القروب مباشرة)'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-full self-start sm:self-auto">
                    ✓ جاهز للتحويل التلقائي
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        اسم القروب أو جهة الصيانة:
                      </label>
                      <input
                        type="text"
                        value={tempGroupName}
                        onChange={(e) => setTempGroupName(e.target.value)}
                        placeholder="مثال: قروب صيانة نورث ريزيدنس"
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        رابط دعوة القروب (أو رقم الواتساب):
                      </label>
                      <input
                        type="text"
                        value={tempGroupLink}
                        onChange={(e) => setTempGroupLink(e.target.value)}
                        placeholder="مثال: https://chat.whatsapp.com/... أو 05XXXXXXXX"
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingGroup(false)}
                      className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGroupConfig}
                      className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save size={13} />
                      <span>حفظ القروب في المتصفح</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: Voice Speech Preview & Template */}
            <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm">
                    ٤
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white">
                      معاينة الرسالة الصوتية الآلية 🔊
                    </h3>
                    <p className="text-xs text-slate-400">سيتم نطق هذه الرسالة بصوت آلي واضح وتحويلها لملف صوتي</p>
                  </div>
                </div>
                <Radio className="text-amber-400 animate-pulse" size={20} />
              </div>

              {/* Template selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  اختيار قالب الرسالة الثابتة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map(preset => (
                    <div
                      key={preset.id}
                      onClick={() => setFormSelectedPreset(preset.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-right cursor-pointer transition-all",
                        formSelectedPreset === preset.id 
                          ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-xs" 
                          : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800"
                      )}
                    >
                      <span className="text-xs font-black block">{preset.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Text Box */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">
                  النص المقروء صوتياً للبلاغ:
                </span>
                <p className="text-sm font-black text-amber-200 leading-relaxed">
                  "{currentGeneratedSpeechText()}"
                </p>
              </div>

              {/* Speech Controls & Play Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>سرعة الصوت:</span>
                  <div className="flex items-center gap-1.5">
                    {[0.8, 0.95, 1.1].map(rate => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setSpeechRate(rate)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all",
                          speechRate === rate ? "bg-amber-500 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => speakText(currentGeneratedSpeechText())}
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Volume2 size={16} />
                  <span>🔊 تجربة واستماع الصوت الآلي الآن</span>
                </button>
              </div>
            </div>

            {/* STEP 5: Final Submission Actions */}
            <div className="space-y-3 pt-2">
              {/* PRIMARY ACTION: Save and Redirect to WhatsApp immediately with Voice */}
              <button
                type="submit"
                disabled={isGeneratingAudio}
                className="w-full py-4.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-3xl font-black text-base flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl shadow-emerald-950/20 active:scale-[0.99] disabled:opacity-60"
              >
                <Send size={22} />
                <span>
                  {isGeneratingAudio 
                    ? 'جاري توليد الصوت وتحويلك للواتساب...' 
                    : 'حفظ الطلب وتحويلي مباشرة إلى الواتساب لإرسال الصوتية 🎙️'}
                </span>
              </button>

              {/* SECONDARY ACTION: Save Only without WhatsApp redirect */}
              <button
                type="button"
                onClick={(e) => handleSubmitMaintenance(e, false)}
                className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus size={16} className="text-amber-500" />
                <span>حفظ الطلب في النظام وقراءة صوتية فقط (بدون واتساب)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SubTab 2: Maintenance Requests List & Direct Audio WhatsApp */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="بحث برقم الشقة أو العطل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-4 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn("px-3 py-1 rounded-full font-bold transition-all", statusFilter === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs" : "text-slate-500")}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={cn("px-3 py-1 rounded-full font-bold transition-all", statusFilter === 'pending' ? "bg-white dark:bg-slate-700 text-amber-600 shadow-2xs" : "text-slate-500")}
                >
                  قيد المعالجة
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={cn("px-3 py-1 rounded-full font-bold transition-all", statusFilter === 'completed' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs" : "text-slate-500")}
                >
                  تم الإصلاح
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">كل التصنيفات</option>
                <option value="سباكة">سباكة</option>
                <option value="كهرباء">كهرباء</option>
                <option value="تكييف">تكييف</option>
                <option value="أجهزة">أجهزة</option>
                <option value="نجارة">نجارة</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('create')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer mr-auto"
            >
              <Plus size={16} />
              <span>إضافة بلاغ جديد</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-black">لا توجد طلبات صيانة مسجلة حالياً</p>
                <p className="text-xs text-slate-400 mt-1">اضغط على زر "إضافة بلاغ جديد" لتسجيل طلب صيانة وتفعيل الصوت الآلي.</p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isCompleted = req.status === 'completed';
                const dateObj = safeToDate(req.date);
                const aptNum = req.apartmentNumber || '';
                const buildingName = req.buildingName || 'مبنى ١';
                const notes = req.notes || 'طلب صيانة عام';
                const speechMsg = (req as any).speechText || `بلاغ صيانة عاجل: شقة ${aptNum} في ${buildingName}. المشكلة: ${notes}. يرجى المباشرة فوراً.`;

                // Tenant Phone if available
                const tenant = tenants.find(t => 
                  t.apartmentId?.includes(aptNum) || 
                  (t as any).apartmentNumber === aptNum
                );

                const isCurrentSpeaking = activeSpeechRequestId === req.id && isSpeaking;

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-white dark:bg-slate-900 p-5 rounded-3xl border transition-all shadow-xs flex flex-col justify-between space-y-4",
                      isCurrentSpeaking 
                        ? "border-amber-500 ring-2 ring-amber-500/20" 
                        : "border-slate-200/80 dark:border-slate-800"
                    )}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                            <Wrench size={16} />
                          </span>
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              شقة {aptNum}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {buildingName}
                            </span>
                          </div>
                        </div>

                        {/* Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(req.id, 'status', isCompleted ? 'pending' : 'completed')}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer",
                            isCompleted 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" 
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{isCompleted ? 'تم الإصلاح' : 'قيد المعالجة'}</span>
                        </button>
                      </div>

                      {/* Problem Description */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-right space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block">وصف العطل:</span>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug">
                          {notes}
                        </p>
                      </div>

                      {/* Date & Resident info */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{format(dateObj, 'dd/MM/yyyy - p', { locale: ar })}</span>
                        {tenant && (
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            الساكن: {tenant.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      {/* Play Speech Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isCurrentSpeaking) {
                            stopSpeaking();
                          } else {
                            speakText(speechMsg, req.id);
                          }
                        }}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          isCurrentSpeaking
                            ? "bg-amber-600 text-white animate-pulse"
                            : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                        )}
                        title="قراءة البلاغ بصوت آلي واضح"
                      >
                        <Volume2 size={15} />
                        <span>{isCurrentSpeaking ? 'إيقاف الصوت' : 'قراءة صوتية 🔊'}</span>
                      </button>

                      {/* SEND THE ACTUAL AUDIO TO WHATSAPP BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleSendVoiceToWhatsApp(aptNum, buildingName, notes, undefined, tenant?.phone, speechMsg)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="تحويل مباشر للواتساب وإرسال الصوتية لقروب الصيانة"
                      >
                        <Send size={14} />
                        <span>إرسال الصوتية 🎙️</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteRequest(req.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                        title="حذف البلاغ"
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

      
    
      {/* Floating WhatsApp Voice Guide Box */}
      {voiceSentGuide && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900 text-white p-5 rounded-3xl border border-emerald-500/50 shadow-2xl space-y-3 font-cairo animate-in fade-in slide-in-from-bottom-5 duration-300" dir="rtl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <Volume2 size={18} />
              <span>تم تجهيز الفويس وتحويلك للواتساب!</span>
            </div>
            <button 
              type="button"
              onClick={() => setVoiceSentGuide(null)} 
              className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <p className="font-bold text-amber-300">
              🎙️ لإرسال الصوت كشريط صوتي (فويس) في الواتساب:
            </p>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-1.5 text-[11px]">
              <p>1️⃣ <b>اسحب ملف الصوت</b> ({voiceSentGuide.fileName}) المُنزل بأسفل الشاشة وأفلته داخل محادثة الواتساب.</p>
              <p>2️⃣ <b>أو اضغط 📎 في الواتساب</b> ثم اختر (صوت / Audio) وحدد الملف.</p>
              <p>3️⃣ <b>أو أرسل الرابط المباشر</b> المرفق في الرسالة ليستمع له الجميع فوراً.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {voiceSentGuide.playerUrl && (
              <a 
                href={voiceSentGuide.playerUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center text-xs font-black transition-colors"
              >
                🔊 سماع الفويس
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                if (voiceSentGuide.audioBlob) {
                  const url = URL.createObjectURL(voiceSentGuide.audioBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = voiceSentGuide.fileName;
                  a.click();
                }
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              title="إعادة تحميل ملف الصوت"
            >
              <Download size={14} />
            </button>
            <button 
              type="button"
              onClick={() => setVoiceSentGuide(null)} 
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
</div>
  );
};
