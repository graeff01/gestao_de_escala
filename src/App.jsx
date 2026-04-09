import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, subMonths, differenceInMonths, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isSaturday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Plus, Trash2, ChevronLeft, ChevronRight,
  Edit3, X, Check, BarChart3, CalendarCheck2,
  ShieldCheck, Search, CalendarClock, History,
  Info, Menu, Eye, EyeOff, Lock, LogOut,
  ClipboardList, Palmtree, ArrowRight, CalendarOff,
  Download, Upload, Loader2, CloudOff, AlertTriangle, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { generateSchedule, capitalize } from './utils/scheduler';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, ADMIN_EMAIL } from './firebase';
import { useCloudData } from './hooks/useCloudData';

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Returns the active vacation for a consultant on a given date string (or today)
function getActiveVacation(name, vacations, dateStr) {
  const d = new Date((dateStr || format(new Date(), 'yyyy-MM-dd')) + 'T12:00:00');
  return vacations.find(v =>
    v.consultant === name &&
    isWithinInterval(d, {
      start: new Date(v.startDate + 'T12:00:00'),
      end:   new Date(v.endDate   + 'T12:00:00'),
    })
  ) || null;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const CONSULTANT_COLORS = [
  { dot: 'bg-emerald-500',  badge: 'bg-emerald-100 text-emerald-800',  bar: 'bg-emerald-500'  },
  { dot: 'bg-sky-500',      badge: 'bg-sky-100 text-sky-800',          bar: 'bg-sky-500'      },
  { dot: 'bg-violet-500',   badge: 'bg-violet-100 text-violet-800',    bar: 'bg-violet-500'   },
  { dot: 'bg-amber-500',    badge: 'bg-amber-100 text-amber-800',      bar: 'bg-amber-500'    },
  { dot: 'bg-rose-500',     badge: 'bg-rose-100 text-rose-800',        bar: 'bg-rose-500'     },
];

// ─── Motion Variants ──────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0  },
};

const staggerList = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } },
};

const rowVariant = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const drawerVariant = {
  hidden:  { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 360, damping: 36 } },
  exit:    { x: '-100%', transition: { duration: 0.22, ease: 'easeIn' } },
};

const modalSpring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.75 };

const sheetVariant = {
  hidden:  { opacity: 0, y: 56, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: modalSpring },
  exit:    { opacity: 0, y: 40, scale: 0.97 },
};

const overlayVariant = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};

// ─── Tiny Shared Components ───────────────────────────────────────────────────

function SectionLabel({ icon, label, accent = false }) {
  return (
    <h2 className={cn(
      'text-[9px] font-black uppercase tracking-[0.22em] flex items-center gap-1.5 px-0.5',
      accent ? 'text-emerald-400/80' : 'text-slate-500'
    )}>
      {icon}
      {label}
    </h2>
  );
}

function NavBtn({ onClick, children, light = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-2 rounded-xl transition-all touch-manipulation',
        disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-90',
        light ? 'hover:bg-slate-100' : (!disabled && 'hover:bg-white/10')
      )}
    >
      {children}
    </button>
  );
}

// ─── Stat Card (sidebar) ──────────────────────────────────────────────────────

function StatCard({ item, index, maxDays }) {
  const color      = CONSULTANT_COLORS[index % CONSULTANT_COLORS.length];
  const pct        = maxDays > 0 ? Math.round((item.total / maxDays) * 100) : 0;
  const onVacation = item.activeVacation;

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'rounded-2xl p-3.5 border transition-colors',
        onVacation
          ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
          : 'bg-white/[0.06] border-white/[0.07] hover:bg-white/10'
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', onVacation ? 'bg-amber-400' : color.dot)} />
          <span className={cn('text-xs font-semibold tracking-tight', onVacation ? 'text-amber-200' : 'text-slate-100')}>
            {item.name}
          </span>
        </div>
        {onVacation ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <Palmtree className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
              {onVacation.type === 'ferias' ? 'Férias' : 'Folga'}
            </span>
          </div>
        ) : (
          <span className="text-xs font-black text-emerald-400 tabular-nums">{item.total}d</span>
        )}
      </div>

      {onVacation ? (
        <div className="text-[10px] text-amber-400/70 font-bold space-y-0.5">
          <p>De {format(new Date(onVacation.startDate + 'T12:00:00'), 'dd/MM')} até {format(new Date(onVacation.endDate + 'T12:00:00'), 'dd/MM')}</p>
          <p className="text-amber-500">↩ Retorna em {format(new Date(onVacation.endDate + 'T12:00:00'), 'dd/MM/yyyy')}</p>
        </div>
      ) : (
        <>
          <div className="h-[3px] bg-white/10 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, delay: 0.4 + index * 0.12, ease: 'easeOut' }}
              className={cn('h-full rounded-full', color.bar)}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Úteis</p>
              <p className="text-xs font-bold text-slate-400 tabular-nums">{item.weekdays}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl py-1">
              <p className="text-[8px] text-emerald-600 uppercase font-black tracking-widest mb-0.5">Sábados</p>
              <p className="text-xs font-black text-emerald-400 tabular-nums">{item.saturdays}</p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─── Mobile Schedule Card ─────────────────────────────────────────────────────

function MobileCard({ row, onEdit, consultants: allConsultants }) {
  const isSat      = row.dayOfWeek === 'sábado';
  const isSun      = row.dayOfWeek === 'domingo';
  const isHoliday  = row.isHoliday;
  const isOff      = row.consultant === '#';
  const hasMultiple = isSat && row.saturdayConsultants && row.saturdayConsultants.length > 1;
  const isToday    = row.date === format(new Date(), 'yyyy-MM-dd');
  const consultantIdx = allConsultants ? allConsultants.indexOf(row.consultant) : -1;
  const consultantColor = consultantIdx >= 0 ? CONSULTANT_COLORS[consultantIdx % CONSULTANT_COLORS.length] : null;
  const vacCons    = row.vacationConsultants || [];

  return (
    <motion.div
      variants={rowVariant}
      className={cn(
        'relative rounded-2xl border p-4 flex flex-col gap-2 transition-colors',
        isToday    ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-200'  :
        isSat      ? 'bg-emerald-500/[0.06] border-emerald-200'      :
        isSun || isHoliday ? 'bg-slate-50 border-slate-100'         :
        row.hasVacation ? 'bg-amber-50/60 border-amber-200'          :
                    'bg-white border-slate-100'
      )}
    >
      {isToday && (
        <span className="absolute top-2 right-2 text-[8px] font-black text-sky-500 uppercase tracking-widest bg-sky-100 px-2 py-0.5 rounded-full">Hoje</span>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {isSat && <div className="w-[3px] self-stretch bg-emerald-500 rounded-full shrink-0" />}
          <div className="min-w-0">
            <p className={cn('text-xs font-bold tabular-nums', isToday ? 'text-sky-600' : 'text-slate-500')}>{row.formattedDate}</p>
            <p className={cn(
              'text-[10px] font-black uppercase tracking-wider mt-0.5',
              isSat ? 'text-emerald-600' : 'text-slate-400'
            )}>
              {capitalize(row.dayOfWeek)}
              {isHoliday && (
                <span className="ml-1.5 text-amber-500 normal-case font-semibold tracking-normal">· Feriado</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasMultiple ? (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {row.saturdayConsultants.map((name, ci) => {
                const cIdx = allConsultants ? allConsultants.indexOf(name) : ci;
                const color = CONSULTANT_COLORS[(cIdx >= 0 ? cIdx : ci) % CONSULTANT_COLORS.length];
                return (
                  <span key={name} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black', color.badge)}>
                    <span className={cn('w-1 h-1 rounded-full', color.dot)} />
                    {name}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {consultantColor && !isOff && !isHoliday && (
                <span className={cn('w-2 h-2 rounded-full shrink-0', consultantColor.dot)} />
              )}
              <span className={cn(
                'text-sm font-black tracking-tight',
                row.isOverridden ? 'text-blue-600 italic' :
                isOff || isHoliday ? 'text-slate-300 font-normal italic text-xs' :
                'text-slate-800'
              )}>
                {isOff ? '—' : row.consultant}
              </span>
            </div>
          )}

          {!isOff && !isHoliday && (
            <button
              onClick={() => onEdit(row)}
              className="no-print p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-90 touch-manipulation"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

// ─── Login Screen ────────────────────────────────────────────────────────────

// The admin's username (case-insensitive). The actual auth happens via Firebase
// Email/Password using the synthetic ADMIN_EMAIL — we keep the "name" field
// in the UI as a tiny extra hurdle and to preserve the existing UX.
const AUTH_USER = 'Ana';

function LoginScreen() {
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (name.trim().toLowerCase() !== AUTH_USER.toLowerCase()) {
      setError('Nome ou senha incorretos');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      // Auth state listener in App will pick this up and re-render.
    } catch (err) {
      // Firebase returns specific error codes; we collapse them all to a
      // single user-facing message to avoid leaking which field was wrong.
      const offlineCodes = ['auth/network-request-failed'];
      if (offlineCodes.includes(err?.code)) {
        setError('Sem conexão com o servidor. Verifique sua internet.');
      } else {
        setError('Nome ou senha incorretos');
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1F26] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-950/60 ring-1 ring-white/10 mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Jardim do Lago</h1>
          <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-[0.3em] mt-1.5">Painel Administrativo</p>
        </div>

        {/* Login Card */}
        <motion.form
          onSubmit={handleSubmit}
          animate={shake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.45 }}
          className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-3xl p-8 space-y-5"
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Seu nome..."
              className="w-full px-5 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm text-white placeholder:text-slate-600 font-semibold transition-all"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Sua senha..."
                className="w-full px-5 py-4 pr-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm text-white placeholder:text-slate-600 font-semibold transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors touch-manipulation"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs font-bold text-center py-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-950/50 transition-all active:scale-[0.97] flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </motion.form>

        <p className="text-center text-[9px] text-slate-600 font-semibold mt-6 uppercase tracking-[0.2em]">
          Acesso restrito · Jardim do Lago © 2026
        </p>
      </motion.div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const DEFAULT_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Ano Novo'              },
  { date: '2026-02-16', name: 'Carnaval'              },
  { date: '2026-02-17', name: 'Carnaval'              },
  { date: '2026-02-18', name: 'Cinzas'                },
  { date: '2026-04-03', name: 'Sexta-Feira Santa'     },
  { date: '2026-04-21', name: 'Tiradentes'            },
  { date: '2026-05-01', name: 'Dia do Trabalho'       },
  { date: '2026-06-04', name: 'Corpus Christi'        },
  { date: '2026-09-07', name: 'Independência'         },
  { date: '2026-10-12', name: 'N. Sra. Aparecida'     },
  { date: '2026-11-02', name: 'Finados'               },
  { date: '2026-11-15', name: 'Proclamação República' },
  { date: '2026-11-20', name: 'Consciência Negra'     },
  { date: '2026-12-25', name: 'Natal'                 },
];

export default function App() {
  // ── Auth (Firebase) ──────────────────────────────────────
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'in' | 'out'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthState(user ? 'in' : 'out');
    });
    return unsub;
  }, []);

  // ── Cloud data (Firestore real-time) ─────────────────────
  // We pass readOnly when not logged in so listeners are still attached
  // (snapshot subscriptions don't need auth for our public document) but
  // we silently ignore any write that slips through.
  const cloud = useCloudData({ readOnly: authState !== 'in' });
  const { data: cloudData, status: cloudStatus, replaceAll } = cloud;
  const consultants = cloudData.consultants;
  const holidays    = cloudData.holidays;
  const overrides   = cloudData.overrides;
  const vacations   = cloudData.vacations;
  const auditLog    = cloudData.auditLog;
  const setConsultants = cloud.setConsultants;
  const setHolidays    = cloud.setHolidays;
  const setOverrides   = cloud.setOverrides;
  const setVacations   = cloud.setVacations;
  const setAuditLog    = cloud.setAuditLog;

  // ── Local UI state (not persisted) ──────────────────────
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [searchTerm, setSearchTerm]         = useState('');
  const [editingDay, setEditingDay]         = useState(null);
  const [showHolidayManager, setHolidayMgr] = useState(false);
  const [holidayDate, setHolidayDate]       = useState('');
  const [holidayName, setHolidayName]       = useState('');
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [linkCopied, setLinkCopied]         = useState(false);
  const [showAuditLog, setShowAuditLog]     = useState(false);
  const [showVacationMgr, setShowVacationMgr] = useState(false);
  const [vacConsultant, setVacConsultant]   = useState('');
  const [vacStartDate, setVacStartDate]     = useState('');
  const [vacEndDate, setVacEndDate]         = useState('');
  const [vacType, setVacType]               = useState('ferias');
  const [vacDescription, setVacDescription] = useState('');

  // First-time setup: if Firestore document is empty AND we just logged in,
  // seed it with the default holidays and consultants so the gestora has
  // something to work with instead of an empty screen.
  useEffect(() => {
    if (authState === 'in' && cloudStatus === 'empty') {
      replaceAll({
        consultants: ['Roberta', 'Elis', 'Duda'],
        holidays:    DEFAULT_HOLIDAYS_2026,
        overrides:   {},
        vacations:   [],
        auditLog:    [],
      }).catch(() => {});
    }
  }, [authState, cloudStatus, replaceAll]);

  const copyConsultaLink = () => {
    const url = window.location.origin + window.location.pathname + '?modo=consulta';
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // ── Schedule ───────────────────────────────────────────
  const { schedule } = useMemo(() => {
    const referenceMonth = new Date(2026, 2, 1);
    let weekdayOffset = 0;
    let saturdayOffset = 0;
    const monthsDiff = differenceInMonths(currentMonth, referenceMonth);

    for (let i = 0; i < monthsDiff; i++) {
      const m = addMonths(referenceMonth, i);
      const tmp = generateSchedule(m, consultants, holidays, overrides, weekdayOffset, saturdayOffset, vacations);
      let wd = 0, sat = 0;
      tmp.forEach(d => {
        if (d.consultant !== '#' && !d.isHoliday) {
          if (d.dayOfWeek === 'sábado') sat++;
          else wd++;
        }
      });
      weekdayOffset  += wd;
      saturdayOffset += sat;
    }

    return { schedule: generateSchedule(currentMonth, consultants, holidays, overrides, weekdayOffset, saturdayOffset, vacations) };
  }, [currentMonth, consultants, holidays, overrides, vacations]);

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = {};
    consultants.forEach(c => (counts[c] = { total: 0, weekdays: 0, saturdays: 0 }));
    schedule.forEach(day => {
      if (day.dayOfWeek === 'sábado' && day.saturdayConsultants) {
        // Count each consultant assigned to this Saturday
        day.saturdayConsultants.forEach(name => {
          if (counts[name]) {
            counts[name].total++;
            counts[name].saturdays++;
          }
        });
      } else if (counts[day.consultant]) {
        counts[day.consultant].total++;
        if (day.dayOfWeek !== 'domingo') counts[day.consultant].weekdays++;
      }
    });
    return Object.entries(counts).map(([name, data]) => ({
      name,
      ...data,
      activeVacation: getActiveVacation(name, vacations),
    }));
  }, [schedule, consultants]);

  const maxDays = Math.max(...stats.map(s => s.total), 1);

  // Alerta: mês exibido não tem nenhum feriado e é diferente do mês atual
  // (não alertamos no mês corrente pois os feriados podem ter passado)
  const noHolidayWarning = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    const hasAny   = holidays.some(h => h.date.startsWith(monthStr));
    const isFuture = currentMonth > todayMonth;
    return isFuture && !hasAny;
  }, [currentMonth, holidays, todayMonth]);

  // Próximos plantões: para cada consultora, os próximos 3 dias a partir de hoje
  const nextShifts = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const result = {};
    consultants.forEach(name => { result[name] = []; });

    // Scan schedule from current month forward up to 60 days
    const allDays = [];
    [currentMonth, addMonths(currentMonth, 1)].forEach(m => {
      const s = startOfMonth(m);
      const e = endOfMonth(m);
      eachDayOfInterval({ start: s, end: e }).forEach(d => {
        allDays.push(format(d, 'yyyy-MM-dd'));
      });
    });

    for (const dateStr of allDays) {
      if (dateStr < today) continue;
      const row = schedule.find(r => r.date === dateStr);
      if (!row || row.consultant === '#' || row.isHoliday) continue;
      const names = row.saturdayConsultants && row.saturdayConsultants.length > 1
        ? row.saturdayConsultants
        : [row.consultant];
      names.forEach(name => {
        if (result[name] && result[name].length < 3) {
          result[name].push(row);
        }
      });
      if (Object.values(result).every(arr => arr.length >= 3)) break;
    }
    return result;
  }, [schedule, consultants, currentMonth]);

  // ── Auth guard (after all hooks) ─────────────────────
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('signOut failed', e);
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#1C1F26] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (authState === 'out') {
    return <LoginScreen />;
  }

  // ── Handlers ───────────────────────────────────────────
  // Navigation limits: ±12 months from today
  const todayMonth   = useMemo(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); }, []);
  const minMonth     = subMonths(todayMonth, 12);
  const maxMonth     = addMonths(todayMonth, 12);
  const canGoPrev    = currentMonth > minMonth;
  const canGoNext    = currentMonth < maxMonth;

  const prevMonth = () => { if (canGoPrev) setCurrentMonth(subMonths(currentMonth, 1)); };
  const nextMonth = () => { if (canGoNext) setCurrentMonth(addMonths(currentMonth, 1)); };

  const addHoliday = (e) => {
    e.preventDefault();
    const trimmedName = holidayName.trim();
    if (holidayDate && trimmedName) {
      if (holidays.some(h => h.date === holidayDate)) {
        alert('Já existe um feriado cadastrado nesta data.');
        return;
      }
      setHolidays(prev => [...prev, { date: holidayDate, name: trimmedName }]);
      setHolidayDate('');
      setHolidayName('');
    }
  };

  const removeHoliday = (date) => setHolidays(prev => prev.filter(h => h.date !== date));

  const applyOverride = (date, name) => {
    // Log the change
    if (name !== null && editingDay) {
      setAuditLog(prev => [{
        date,
        from: editingDay.consultant,
        to: name,
        changedAt: new Date().toISOString(),
        type: 'weekday'
      }, ...prev].slice(0, 200));
    } else if (name === null && editingDay) {
      setAuditLog(prev => [{
        date,
        from: editingDay.consultant,
        to: '(restaurado)',
        changedAt: new Date().toISOString(),
        type: 'restore'
      }, ...prev].slice(0, 200));
    }
    setOverrides(prev => {
      const next = { ...prev };
      if (name === null) delete next[date];
      else next[date] = name;
      return next;
    });
    setEditingDay(null);
  };

  // Remove a consultant AND clean up any orphan data so the schedule
  // doesn't end up referencing a name that no longer exists.
  const removeConsultant = (name) => {
    setConsultants(prev => prev.filter(c => c !== name));

    // Strip overrides that point to this consultant.
    setOverrides(prev => {
      const next = {};
      for (const [date, value] of Object.entries(prev)) {
        if (Array.isArray(value)) {
          const filtered = value.filter(n => n !== name);
          if (filtered.length > 0) next[date] = filtered;
        } else if (value !== name) {
          next[date] = value;
        }
      }
      return next;
    });

    // Drop vacation entries for this consultant.
    setVacations(prev => prev.filter(v => v.consultant !== name));
  };

  // Toggle a consultant for Saturday multi-select
  const toggleSaturdayConsultant = (date, name, currentList) => {
    let list = [...currentList];
    if (list.includes(name)) {
      list = list.filter(n => n !== name);
    } else {
      list.push(name);
    }
    // Log the Saturday change
    setAuditLog(prev => [{
      date,
      from: currentList.join(', ') || '(vazio)',
      to: list.join(', ') || '(vazio)',
      changedAt: new Date().toISOString(),
      type: 'saturday'
    }, ...prev].slice(0, 200));
    setOverrides(prev => {
      const next = { ...prev };
      if (list.length === 0) {
        delete next[date];
      } else {
        next[date] = list;
      }
      return next;
    });
    // Update editingDay to reflect the new list immediately
    setEditingDay(prev => prev ? {
      ...prev,
      saturdayConsultants: list,
      consultant: list.join(' + '),
      isOverridden: list.length > 0
    } : null);
  };

  const getColorIndex = (name) => {
    const i = consultants.indexOf(name);
    return i >= 0 ? i : 0;
  };

  const addVacation = (e) => {
    e.preventDefault();
    if (vacConsultant && vacStartDate && vacEndDate) {
      if (!consultants.includes(vacConsultant)) {
        alert('Consultora inválida.');
        return;
      }
      if (vacEndDate < vacStartDate) {
        alert('A data fim não pode ser anterior à data início.');
        return;
      }
      setVacations(prev => [...prev, {
        id: Date.now(),
        consultant: vacConsultant,
        startDate: vacStartDate,
        endDate: vacEndDate,
        type: vacType,
        description: vacDescription.trim()
      }]);
      setVacConsultant('');
      setVacStartDate('');
      setVacEndDate('');
      setVacType('ferias');
      setVacDescription('');
    }
  };

  const removeVacation = (id) => setVacations(prev => prev.filter(v => v.id !== id));

  // ── Backup / Restauração ─────────────────────────────
  const exportBackup = () => {
    const backup = {
      version: 'jl_backup_v1',
      exportedAt: new Date().toISOString(),
      consultants,
      holidays,
      overrides,
      vacations,
      auditLog,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-escalas-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed.version !== 'jl_backup_v1') {
            alert('Arquivo de backup inválido.');
            return;
          }
          if (!window.confirm('Restaurar backup? Isso substituirá todos os dados atuais (em todos os dispositivos).')) return;
          await replaceAll({
            consultants: parsed.consultants || [],
            holidays:    parsed.holidays    || [],
            overrides:   parsed.overrides   || {},
            vacations:   parsed.vacations   || [],
            auditLog:    parsed.auditLog    || [],
          });
          alert('Backup restaurado com sucesso!');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          alert('Erro ao ler arquivo ou enviar para o servidor. Verifique sua conexão e tente novamente.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Sidebar shared JSX ────────────────────────────────
  const sidebarContent = (
    <>
      {/* Brand + Profile */}
      <div className="p-7 border-b border-white/[0.07] shrink-0 space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50 ring-1 ring-white/10 shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-black tracking-tight text-white leading-none">Jardim do Lago</h1>
            <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-[0.28em] mt-1">Alta Performance</p>
          </div>
        </div>

        {/* Logged-in user */}
        <div className="flex items-center gap-3 bg-white/[0.05] rounded-2xl p-3 border border-white/[0.06]">
          <img
            src="/perfil.png"
            alt="Ana"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">Ana Paula</p>
            <p className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-wider">Administradora</p>
          </div>
          <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(5,150,105,0.6)] shrink-0" />
        </div>
      </div>

      {/* Scrollable content */}
      <nav className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

        {/* Month navigation */}
        <div className="space-y-3">
          <SectionLabel icon={<CalendarClock className="w-3 h-3" />} label="Navegação" />
          <div className="bg-white/[0.05] p-3.5 rounded-2xl border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <NavBtn onClick={prevMonth} disabled={!canGoPrev}>
                <ChevronLeft className={cn('w-4 h-4', canGoPrev ? 'text-emerald-400' : 'text-slate-600')} />
              </NavBtn>
              <span className="font-black text-slate-100 text-sm tracking-tight">
                {capitalize(format(currentMonth, 'MMMM yyyy', { locale: ptBR }))}
              </span>
              <NavBtn onClick={nextMonth} disabled={!canGoNext}>
                <ChevronRight className={cn('w-4 h-4', canGoNext ? 'text-emerald-400' : 'text-slate-600')} />
              </NavBtn>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <SectionLabel icon={<BarChart3 className="w-3 h-3" />} label="Equidade" accent />
          <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-2.5">
            {stats.map((item, idx) => (
              <StatCard key={item.name} item={item} index={idx} maxDays={maxDays} />
            ))}
          </motion.div>
        </div>

        {/* Próximos Plantões */}
        <div className="space-y-3">
          <SectionLabel icon={<CalendarDays className="w-3 h-3" />} label="Próximos Plantões" />
          <div className="space-y-2">
            {consultants.map((name, i) => {
              const color  = CONSULTANT_COLORS[i % CONSULTANT_COLORS.length];
              const shifts = nextShifts[name] || [];
              const onVac  = getActiveVacation(name, vacations);
              return (
                <div key={name} className="bg-white/[0.04] border border-white/[0.05] rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', onVac ? 'bg-amber-400' : color.dot)} />
                    <span className={cn('text-[11px] font-black tracking-tight', onVac ? 'text-amber-300' : 'text-slate-200')}>
                      {name}
                    </span>
                    {onVac && (
                      <span className="ml-auto text-[8px] font-black text-amber-500 uppercase tracking-wider">Ausente</span>
                    )}
                  </div>
                  {shifts.length === 0 ? (
                    <p className="text-[10px] text-slate-600 font-semibold pl-3.5">Sem plantões no período</p>
                  ) : (
                    <div className="space-y-1 pl-3.5">
                      {shifts.map(row => (
                        <div key={row.date} className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold tabular-nums">{row.formattedDate}</span>
                          <span className={cn(
                            'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg',
                            row.dayOfWeek === 'sábado'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-white/[0.04] text-slate-500'
                          )}>
                            {capitalize(row.dayOfWeek.split('-')[0])}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Consultants */}
        <div className="space-y-3">
          <SectionLabel icon={<Users className="w-3 h-3" />} label="Consultoras" />
          <div className="space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Adicionar nome..."
                className="w-full pl-4 pr-9 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-xs text-slate-200 placeholder:text-slate-600 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const nome = e.target.value.trim();
                    if (nome.length > 40) {
                      alert('Nome muito longo (máx. 40 caracteres).');
                      return;
                    }
                    if (consultants.some(c => c.toLowerCase() === nome.toLowerCase())) {
                      alert('Essa consultora já está cadastrada.');
                      return;
                    }
                    setConsultants(prev => [...prev, nome]);
                    e.target.value = '';
                  }
                }}
              />
              <Plus className="w-3.5 h-3.5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {consultants.map((name, i) => {
                const activeVac = getActiveVacation(name, vacations);
                const color = CONSULTANT_COLORS[i % CONSULTANT_COLORS.length];
                return (
                  <div key={i} className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 border rounded-xl group transition-all',
                    activeVac
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-white/[0.04] border-white/[0.05]'
                  )}>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', activeVac ? 'bg-amber-400' : color.dot)} />
                        <span className={cn('text-xs font-semibold truncate', activeVac ? 'text-amber-300' : 'text-slate-300')}>
                          {name}
                        </span>
                      </div>
                      {activeVac && (
                        <div className="flex items-center gap-1.5 pl-4">
                          <Palmtree className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">
                            {activeVac.type === 'ferias' ? 'Férias' : 'Folga'} · volta {format(new Date(activeVac.endDate + 'T12:00:00'), 'dd/MM')}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remover "${name}" da escala? Trocas manuais e férias dela também serão apagadas.`)) {
                          removeConsultant(name);
                        }
                      }}
                      className="p-1 text-slate-600 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-white/[0.06] space-y-2.5 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setHolidayMgr(true); setDrawerOpen(false); }}
            className="py-3 rounded-xl text-slate-400 hover:text-slate-100 font-bold text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
          >
            <CalendarOff className="w-3.5 h-3.5" /> Feriados
          </button>
          <button
            onClick={() => { setShowVacationMgr(true); setDrawerOpen(false); }}
            className="py-3 rounded-xl text-slate-400 hover:text-slate-100 font-bold text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
          >
            <Palmtree className="w-3.5 h-3.5" /> Férias
          </button>
        </div>
        <button
          onClick={() => { setShowAuditLog(true); setDrawerOpen(false); }}
          className="w-full py-3 rounded-xl text-slate-400 hover:text-slate-100 font-bold text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
        >
          <ClipboardList className="w-3.5 h-3.5" /> Histórico de Trocas
        </button>
        <button
          onClick={copyConsultaLink}
          className="w-full py-3 rounded-xl text-slate-400 hover:text-slate-100 font-bold text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
        >
          {linkCopied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Link Copiado!</> : <><Eye className="w-3.5 h-3.5" /> Link Consultoras</>}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportBackup}
            className="py-3 rounded-xl text-slate-400 hover:text-slate-100 font-bold text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Backup
          </button>
          <button
            onClick={importBackup}
            className="py-3 rounded-xl text-slate-400 hover:text-slate-100 font-bold text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Restaurar
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-950/50 transition-all active:scale-95"
        >
          Emitir Escala
        </button>
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl text-slate-600 hover:text-red-400 font-bold text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-3 h-3" /> Sair
        </button>
      </div>
    </>
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EEEEF0] text-[#111318] font-sans antialiased">

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#1C1F26] z-30 flex-col no-print hidden xl:flex shadow-[12px_0_40px_rgba(0,0,0,0.18)]">
        {sidebarContent}
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              variants={overlayVariant} initial="hidden" animate="visible" exit="exit"
              onClick={() => setDrawerOpen(false)}
              className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm no-print"
            />
            <motion.div
              variants={drawerVariant} initial="hidden" animate="visible" exit="exit"
              className="xl:hidden fixed left-0 top-0 bottom-0 w-[300px] bg-[#1C1F26] z-50 flex flex-col no-print shadow-2xl"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-5 right-5 p-2 hover:bg-white/10 rounded-xl transition-colors z-10"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="xl:ml-72 min-h-screen overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-10 md:py-10 space-y-6">

          {/* Header */}
          <motion.header
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ duration: 0.45 }}
            className="flex items-center justify-between gap-4 no-print"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setDrawerOpen(true)}
                className="xl:hidden p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-600 hover:text-emerald-700 transition-colors touch-manipulation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <p className="hidden sm:block text-[10px] font-black uppercase tracking-[0.35em] text-emerald-600 mb-0.5">
                  Painel de Escalas
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#111318] tracking-tight leading-none">
                  Jardim do Lago
                </h1>
              </div>
            </div>

            <div className="relative w-40 sm:w-56 shrink-0">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm text-xs transition-all placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </motion.header>

          {/* Mobile mini-stats */}
          <motion.div
            variants={staggerList} initial="hidden" animate="visible"
            className="xl:hidden grid gap-2 no-print"
            style={{ gridTemplateColumns: `repeat(${Math.min(consultants.length, 3)}, 1fr)` }}
          >
            {stats.map((item, idx) => {
              const color = CONSULTANT_COLORS[idx % CONSULTANT_COLORS.length];
              return (
                <motion.div
                  key={item.name} variants={fadeUp}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', color.dot)} />
                    <span className="text-[10px] font-bold text-slate-600 truncate">{item.name}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">{item.total}</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">dias</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Schedule Card */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ duration: 0.5, delay: 0.12 }}
            className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_16px_48px_-12px_rgba(17,19,24,0.1)] border border-slate-200/60 overflow-hidden"
          >
            {/* Card Header */}
            <div className="px-6 py-5 md:px-10 md:py-7 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.28em] mb-0.5">
                  Mapa Oficial de Atendimento
                </p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  Plantões&nbsp;
                  <span className="text-emerald-600">
                    {capitalize(format(currentMonth, 'MMMM', { locale: ptBR }))}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile month nav */}
                <div className="xl:hidden flex items-center gap-1">
                  <NavBtn onClick={prevMonth} light disabled={!canGoPrev}>
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </NavBtn>
                  <NavBtn onClick={nextMonth} light disabled={!canGoNext}>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </NavBtn>
                </div>

                <div className="px-4 py-2.5 md:px-6 md:py-3.5 bg-[#1C1F26] rounded-xl md:rounded-2xl flex items-center gap-2.5">
                  <CalendarCheck2 className="w-4 h-4 text-emerald-400 hidden sm:block" />
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-white tabular-nums">
                    {format(currentMonth, 'yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Holiday warning banner */}
            {noHolidayWarning && (
              <div className="mx-6 mt-4 mb-1 md:mx-10 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 no-print">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs font-bold text-amber-700">
                  Nenhum feriado cadastrado para {capitalize(format(currentMonth, 'MMMM yyyy', { locale: ptBR }))}. Verifique se há feriados nacionais ou locais a incluir.
                </p>
                <button
                  onClick={() => setHolidayMgr(true)}
                  className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto print:block">
              <table className="w-full text-left border-collapse table-fixed min-w-[580px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="w-36 px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">
                      Data
                    </th>
                    <th className="w-44 px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">
                      Dia
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">
                      Consultora
                    </th>
                  </tr>
                </thead>

                <motion.tbody
                  key={format(currentMonth, 'yyyy-MM')}
                  variants={staggerList} initial="hidden" animate="visible"
                  className="divide-y divide-slate-50"
                >
                  {(() => {
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    return schedule.map((row) => {
                    const isHighlighted  = searchTerm && row.consultant.toLowerCase().includes(searchTerm.toLowerCase());
                    const isSat          = row.dayOfWeek === 'sábado';
                    const isHolidayOrSun = row.dayOfWeek === 'domingo' || row.isHoliday;
                    const isToday        = row.date === todayStr;
                    const consultantIdx  = consultants.indexOf(row.consultant);
                    const consultantColor = consultantIdx >= 0 ? CONSULTANT_COLORS[consultantIdx % CONSULTANT_COLORS.length] : null;

                    return (
                      <motion.tr
                        key={row.date}
                        variants={rowVariant}
                        className={cn(
                          'group transition-all border-l-[3px]',
                          isToday        ? 'bg-sky-50/60 border-l-sky-500'                  :
                          isSat          ? 'bg-emerald-500/[0.05] border-l-emerald-500'     :
                          isHolidayOrSun ? 'bg-slate-50/40 border-l-transparent'            :
                          row.hasVacation? 'bg-amber-50/40 border-l-amber-300 hover:bg-amber-50/70' :
                                           'bg-white border-l-transparent hover:bg-slate-50/60',
                          isHighlighted  ? 'bg-emerald-50/60 border-l-emerald-400 ring-inset ring-1 ring-emerald-200' : ''
                        )}
                      >
                        <td className="px-8 py-5 text-center text-xs tabular-nums font-bold group-hover:text-slate-700 transition-colors">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={isToday ? 'text-sky-600 font-black' : 'text-slate-400'}>
                              {row.formattedDate}
                            </span>
                            {isToday && (
                              <span className="text-[8px] font-black text-sky-500 uppercase tracking-widest">Hoje</span>
                            )}
                          </div>
                        </td>

                        <td className="px-8 py-5 text-center">
                          <span className={cn(
                            'text-[10px] font-black px-3.5 py-1.5 rounded-xl border whitespace-nowrap inline-block',
                            row.dayOfWeek === 'domingo' ? 'text-slate-400 border-slate-200 bg-white'           :
                            row.dayOfWeek === 'sábado'  ? 'text-emerald-700 border-emerald-300 bg-emerald-50'  :
                                                          'text-slate-500 border-slate-100 bg-slate-50'
                          )}>
                            {capitalize(row.dayOfWeek)}
                          </span>
                        </td>

                        <td className="px-8 py-5 text-center relative">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-center gap-3">
                              {isSat && row.saturdayConsultants && row.saturdayConsultants.length > 1 ? (
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                  {row.saturdayConsultants.map((name, ci) => {
                                    const cIdx = consultants.indexOf(name);
                                    const color = CONSULTANT_COLORS[(cIdx >= 0 ? cIdx : ci) % CONSULTANT_COLORS.length];
                                    return (
                                      <span key={name} className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black', color.badge)}>
                                        <span className={cn('w-1.5 h-1.5 rounded-full', color.dot)} />
                                        {name}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {consultantColor && row.consultant !== '#' && !row.isHoliday && (
                                    <span className={cn('w-2 h-2 rounded-full shrink-0', consultantColor.dot)} />
                                  )}
                                  <span className={cn(
                                    'text-sm font-black tracking-tight transition-all',
                                    row.isOverridden ? 'text-blue-600 italic'         : 'text-slate-800',
                                    row.consultant === '#'  ? 'text-slate-200 font-normal italic text-xs' : '',
                                    row.isHoliday    ? 'text-slate-400 opacity-60'   : '',
                                    isHighlighted    ? 'text-emerald-800'             : ''
                                  )}>
                                    {row.consultant}
                                    {row.isHoliday && (
                                      <Info className="inline w-3.5 h-3.5 ml-1.5 text-amber-400/60" />
                                    )}
                                  </span>
                                </div>
                              )}

                              {row.consultant !== '#' && !row.isHoliday && (
                                <button
                                  onClick={() => setEditingDay(row)}
                                  className="no-print p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-emerald-700 hover:border-emerald-200 opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                          </div>
                        </td>
                      </motion.tr>
                    );
                  });})()}
                </motion.tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <motion.div
              key={format(currentMonth, 'yyyy-MM') + '-mobile'}
              variants={staggerList} initial="hidden" animate="visible"
              className="md:hidden p-4 space-y-2 print:hidden"
            >
              {schedule.map((row) => (
                <MobileCard
                  key={row.date}
                  row={row}

                  onEdit={setEditingDay}
                  consultants={consultants}
                />
              ))}
            </motion.div>

            {/* Card Footer */}
            <div className="px-6 py-4 md:px-10 bg-slate-50/60 border-t border-slate-100 flex items-center justify-center no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(5,150,105,0.5)]" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.28em]">
                  Equidade Inteligente Ativa · Jardim do Lago © 2026
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ── Holiday Manager Modal ─────────────────────────── */}
      <AnimatePresence>
        {showHolidayManager && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              variants={overlayVariant} initial="hidden" animate="visible" exit="exit"
              onClick={() => setHolidayMgr(false)}
              className="absolute inset-0 bg-[#1C1F26]/80 backdrop-blur-xl"
            />
            <motion.div
              variants={sheetVariant} initial="hidden" animate="visible" exit="exit"
              className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            >
              <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Feriados</h3>
                  <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                    Datas Especiais
                  </p>
                </div>
                <button
                  onClick={() => setHolidayMgr(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all touch-manipulation"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-7 space-y-5 overflow-y-auto">
                <form onSubmit={addHoliday} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={holidayDate}
                      onChange={e => setHolidayDate(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none"
                    />
                  </div>
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={holidayName}
                      onChange={e => setHolidayName(e.target.value)}
                      placeholder="Ex: Natal"
                      className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full p-4 bg-[#1C1F26] text-white rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center"
                    >
                      <Plus className="w-6 h-6 text-emerald-400" />
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {[...holidays]
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((h, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-emerald-600 tabular-nums w-24">
                            {format(new Date(h.date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                          <span className="text-sm font-bold text-slate-700">{h.name}</span>
                        </div>
                        <button
                          onClick={() => removeHoliday(h.date)}
                          className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all touch-manipulation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Audit Log Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showAuditLog && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              variants={overlayVariant} initial="hidden" animate="visible" exit="exit"
              onClick={() => setShowAuditLog(false)}
              className="absolute inset-0 bg-[#1C1F26]/80 backdrop-blur-xl"
            />
            <motion.div
              variants={sheetVariant} initial="hidden" animate="visible" exit="exit"
              className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            >
              <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Histórico</h3>
                  <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                    Registro de Alterações
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {auditLog.length > 0 && (
                    <button
                      onClick={() => setAuditLog([])}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all touch-manipulation"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    onClick={() => setShowAuditLog(false)}
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-all touch-manipulation"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-7 overflow-y-auto">
                {auditLog.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-semibold">Nenhuma alteração registrada</p>
                    <p className="text-xs text-slate-300 mt-1">As trocas de escala aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {auditLog.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black text-emerald-600 tabular-nums">
                            {entry.date ? format(new Date(entry.date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                          </span>
                          <span className={cn(
                            'text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg',
                            entry.type === 'saturday' ? 'bg-emerald-50 text-emerald-600' :
                            entry.type === 'restore' ? 'bg-amber-50 text-amber-600' :
                            'bg-sky-50 text-sky-600'
                          )}>
                            {entry.type === 'saturday' ? 'Sábado' : entry.type === 'restore' ? 'Restauração' : 'Dia útil'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-500">{entry.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          <span className="font-black text-slate-800">{entry.to}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                          {entry.changedAt ? format(new Date(entry.changedAt), "dd/MM/yyyy 'às' HH:mm") : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Vacation Manager Modal ──────────────────────────── */}
      <AnimatePresence>
        {showVacationMgr && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              variants={overlayVariant} initial="hidden" animate="visible" exit="exit"
              onClick={() => setShowVacationMgr(false)}
              className="absolute inset-0 bg-[#1C1F26]/80 backdrop-blur-xl"
            />
            <motion.div
              variants={sheetVariant} initial="hidden" animate="visible" exit="exit"
              className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            >
              <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Férias / Folgas</h3>
                  <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                    Gestão de Ausências
                  </p>
                </div>
                <button
                  onClick={() => setShowVacationMgr(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all touch-manipulation"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-7 space-y-5 overflow-y-auto">
                <form onSubmit={addVacation} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Consultora</label>
                      <select
                        value={vacConsultant}
                        onChange={e => setVacConsultant(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none appearance-none"
                      >
                        <option value="">Selecione...</option>
                        {consultants.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo</label>
                      <select
                        value={vacType}
                        onChange={e => setVacType(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none appearance-none"
                      >
                        <option value="ferias">Férias</option>
                        <option value="folga">Folga</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data Início</label>
                      <input
                        type="date"
                        value={vacStartDate}
                        onChange={e => setVacStartDate(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data Fim</label>
                      <input
                        type="date"
                        value={vacEndDate}
                        onChange={e => setVacEndDate(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descrição (opcional)</label>
                      <input
                        type="text"
                        value={vacDescription}
                        onChange={e => setVacDescription(e.target.value)}
                        placeholder="Ex: Férias de abril"
                        className="w-full p-4 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none"
                      />
                    </div>
                    <div className="self-end">
                      <button
                        type="submit"
                        className="p-4 bg-[#1C1F26] text-white rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center"
                      >
                        <Plus className="w-6 h-6 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {vacations.length === 0 ? (
                    <div className="text-center py-8">
                      <Palmtree className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 font-semibold">Nenhuma ausência cadastrada</p>
                    </div>
                  ) : (
                    [...vacations]
                      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                      .map((v) => {
                        const cIdx = consultants.indexOf(v.consultant);
                        const color = CONSULTANT_COLORS[(cIdx >= 0 ? cIdx : 0) % CONSULTANT_COLORS.length];
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn('w-2 h-2 rounded-full shrink-0', color.dot)} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-slate-700">{v.consultant}</span>
                                  <span className={cn(
                                    'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg',
                                    v.type === 'ferias' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                  )}>
                                    {v.type === 'ferias' ? 'Férias' : 'Folga'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 font-bold tabular-nums mt-0.5">
                                  {format(new Date(v.startDate + 'T12:00:00'), 'dd/MM/yyyy')} → {format(new Date(v.endDate + 'T12:00:00'), 'dd/MM/yyyy')}
                                </p>
                                {v.description && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">{v.description}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeVacation(v.id)}
                              className="p-2 text-slate-300 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Day Modal ────────────────────────────────── */}
      <AnimatePresence>
        {editingDay && (() => {
          const isSaturdayEdit = editingDay.dayOfWeek === 'sábado';
          const currentSatList = editingDay.saturdayConsultants || [];
          return (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              variants={overlayVariant} initial="hidden" animate="visible" exit="exit"
              onClick={() => setEditingDay(null)}
              className="absolute inset-0 bg-[#1C1F26]/80 backdrop-blur-md"
            />
            <motion.div
              variants={sheetVariant} initial="hidden" animate="visible" exit="exit"
              className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full sm:max-w-sm overflow-hidden"
            >
              <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-2xl text-slate-800 tracking-tight leading-tight">
                    {isSaturdayEdit ? 'Sábado' : 'Trocar'}<br />
                    {isSaturdayEdit ? 'Consultoras' : 'Responsável'}
                  </h3>
                  <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    {editingDay.formattedDate}
                    {isSaturdayEdit && <span className="ml-2 text-slate-400">· Selecione uma ou mais</span>}
                  </p>
                </div>
                <button
                  onClick={() => setEditingDay(null)}
                  className="p-3 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all touch-manipulation"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-7 space-y-2.5">
                {isSaturdayEdit ? (
                  /* Saturday multi-select mode */
                  <>
                    {consultants.map((name, idx) => {
                      const color    = CONSULTANT_COLORS[idx % CONSULTANT_COLORS.length];
                      const isActive = currentSatList.includes(name);
                      return (
                        <motion.button
                          key={name}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleSaturdayConsultant(editingDay.date, name, currentSatList)}
                          className={cn(
                            'w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-black text-sm touch-manipulation',
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:text-emerald-700 hover:bg-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('w-2 h-2 rounded-full', color.dot)} />
                            {name}
                          </div>
                          {isActive
                            ? <Check className="w-5 h-5 text-emerald-600" />
                            : <Plus className="w-4 h-4 opacity-25" />
                          }
                        </motion.button>
                      );
                    })}

                    <button
                      onClick={() => setEditingDay(null)}
                      className="w-full mt-4 py-4 flex items-center justify-center gap-2.5 text-white bg-emerald-600 hover:bg-emerald-500 transition-all text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl touch-manipulation"
                    >
                      <Check className="w-4 h-4" /> Confirmar
                    </button>

                    {editingDay.isOverridden && (
                      <button
                        onClick={() => applyOverride(editingDay.date, null)}
                        className="w-full py-4 flex items-center justify-center gap-2.5 text-slate-300 hover:text-slate-700 transition-all text-[11px] font-black uppercase tracking-[0.2em] border-t border-slate-100 touch-manipulation"
                      >
                        <History className="w-4 h-4" /> Restaurar Protocolo
                      </button>
                    )}
                  </>
                ) : (
                  /* Weekday single-select mode */
                  <>
                    {consultants.map((name, idx) => {
                      const color    = CONSULTANT_COLORS[idx % CONSULTANT_COLORS.length];
                      const isActive = editingDay.consultant === name;
                      return (
                        <motion.button
                          key={name}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => applyOverride(editingDay.date, name)}
                          className={cn(
                            'w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-black text-sm touch-manipulation',
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:text-emerald-700 hover:bg-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('w-2 h-2 rounded-full', color.dot)} />
                            {name}
                          </div>
                          {isActive
                            ? <Check className="w-5 h-5 text-emerald-600" />
                            : <Plus className="w-4 h-4 opacity-25" />
                          }
                        </motion.button>
                      );
                    })}

                    {editingDay.isOverridden && (
                      <button
                        onClick={() => applyOverride(editingDay.date, null)}
                        className="w-full mt-4 py-4 flex items-center justify-center gap-2.5 text-slate-300 hover:text-slate-700 transition-all text-[11px] font-black uppercase tracking-[0.2em] border-t border-slate-100 touch-manipulation"
                      >
                        <History className="w-4 h-4" /> Restaurar Protocolo
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Global Styles ─────────────────────────────────── */}
      <style>{`
        ::-webkit-scrollbar          { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb    { background: rgba(0,0,0,0.10); border-radius: 10px; }
        aside ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @media print {
          @page { size: portrait; margin: 1cm; }
          body  { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print   { display: none !important; }
          .xl\\:ml-72 { margin-left: 0 !important; }
          main  { padding: 0 !important; width: 100% !important; overflow: visible !important; }
          .max-w-5xl  { max-width: 100% !important; }
          .bg-white   { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 2pt solid #1c1f26 !important; }
          th    { background: #f8fafc !important; border: 1pt solid #cbd5e1 !important; color: #1c1f26 !important; font-weight: 900; padding: 10pt !important; }
          td    { border: 1pt solid #e2e8f0 !important; padding: 10pt !important; text-align: center !important; }
          tr    { page-break-inside: avoid !important; }
          main::before {
            content: "CONTROLE MENSAL DE ESCALAS — JARDIM DO LAGO";
            display: block; font-size: 18pt; font-weight: 900; text-align: center;
            margin-bottom: 24pt; color: #1c1f26;
            border-bottom: 4pt solid #059669; padding-bottom: 8pt;
          }
          main::after {
            content: "Gerado automaticamente pelo Sistema Jardim do Lago";
            display: block; font-size: 8pt; text-align: center;
            margin-top: 28pt; color: #64748b;
          }
        }
      `}</style>
    </div>
  );
}
