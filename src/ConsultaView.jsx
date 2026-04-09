import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, CalendarCheck2, ShieldCheck, Eye, Loader2, CloudOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { generateSchedule, capitalize } from './utils/scheduler';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useCloudData } from './hooks/useCloudData';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0  },
};

const staggerList = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.025, delayChildren: 0.06 } },
};

const rowVariant = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function ConsultaView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Subscribe in read-only mode. Real-time updates from Firestore will
  // automatically re-render this view whenever the gestora saves anything.
  const { data, status, error } = useCloudData({ readOnly: true });
  const { consultants, holidays, overrides, vacations } = data;

  const schedule = useMemo(() => {
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

    return generateSchedule(currentMonth, consultants, holidays, overrides, weekdayOffset, saturdayOffset, vacations);
  }, [currentMonth, consultants, holidays, overrides, vacations]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="min-h-screen bg-[#EEEEF0] text-[#111318] font-sans antialiased">
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-10 md:py-10 space-y-6">

        {/* Header */}
        <motion.header
          variants={fadeUp} initial="hidden" animate="visible"
          transition={{ duration: 0.45 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/30 ring-1 ring-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-black text-[#111318] tracking-tight leading-none">
                Jardim do Lago
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-emerald-600 mt-0.5">
                Escala de Atendimento
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
            {status === 'loading' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando…</>
            ) : status === 'error' ? (
              <><CloudOff className="w-3.5 h-3.5" /> Sem conexão</>
            ) : (
              <><Eye className="w-3.5 h-3.5" /> Modo Visualização</>
            )}
          </div>
          {status === 'error' && error && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
              Mostrando dados em cache. Verifique sua internet.
            </p>
          )}
        </motion.header>

        {/* Schedule Card */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          transition={{ duration: 0.5, delay: 0.12 }}
          className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_16px_48px_-12px_rgba(17,19,24,0.1)] border border-slate-200/60 overflow-hidden"
        >
          {/* Card Header with navigation */}
          <div className="px-6 py-5 md:px-10 md:py-7 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.28em] mb-0.5">
                Mapa de Atendimento
              </p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                Plantões&nbsp;
                <span className="text-emerald-600">
                  {capitalize(format(currentMonth, 'MMMM', { locale: ptBR }))}
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-all active:scale-90 touch-manipulation">
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-all active:scale-90 touch-manipulation">
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="px-4 py-2.5 md:px-6 md:py-3.5 bg-[#1C1F26] rounded-xl md:rounded-2xl flex items-center gap-2.5">
                <CalendarCheck2 className="w-4 h-4 text-emerald-400 hidden sm:block" />
                <span className="text-xs font-black uppercase tracking-[0.12em] text-white tabular-nums">
                  {format(currentMonth, 'yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                {schedule.map((row) => {
                  const isSat          = row.dayOfWeek === 'sábado';
                  const isHolidayOrSun = row.dayOfWeek === 'domingo' || row.isHoliday;

                  return (
                    <motion.tr
                      key={row.date}
                      variants={rowVariant}
                      className={cn(
                        'transition-all border-l-[3px]',
                        isSat          ? 'bg-emerald-500/[0.05] border-l-emerald-500'   :
                        isHolidayOrSun ? 'bg-slate-50/40 border-l-transparent'          :
                                         'bg-white border-l-transparent hover:bg-slate-50/60'
                      )}
                    >
                      <td className="px-8 py-5 text-center text-xs tabular-nums font-bold text-slate-400">
                        {row.formattedDate}
                      </td>

                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          'text-[10px] font-black px-3.5 py-1.5 rounded-xl border whitespace-nowrap inline-block',
                          row.dayOfWeek === 'domingo' ? 'text-slate-400 border-slate-200 bg-white'           :
                          row.dayOfWeek === 'sábado'  ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                                                        'text-slate-500 border-slate-100 bg-slate-50'
                        )}>
                          {capitalize(row.dayOfWeek)}
                        </span>
                      </td>

                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          'text-sm font-black tracking-tight',
                          row.consultant === '#' ? 'text-slate-200 font-normal italic text-xs' :
                          row.isHoliday          ? 'text-slate-400 opacity-60'                 :
                                                   'text-slate-800'
                        )}>
                          {row.consultant === '#' ? '—' : row.consultant}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <motion.div
            key={format(currentMonth, 'yyyy-MM') + '-mobile'}
            variants={staggerList} initial="hidden" animate="visible"
            className="md:hidden p-4 space-y-2"
          >
            {schedule.map((row) => {
              const isSat     = row.dayOfWeek === 'sábado';
              const isSun     = row.dayOfWeek === 'domingo';
              const isHoliday = row.isHoliday;
              const isOff     = row.consultant === '#';

              return (
                <motion.div
                  key={row.date}
                  variants={rowVariant}
                  className={cn(
                    'relative rounded-2xl border p-4 flex items-center justify-between gap-3 transition-colors',
                    isSat              ? 'bg-emerald-500/[0.06] border-emerald-200' :
                    isSun || isHoliday ? 'bg-slate-50 border-slate-100'             :
                                         'bg-white border-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isSat && <div className="w-[3px] self-stretch bg-emerald-500 rounded-full shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-500 tabular-nums">{row.formattedDate}</p>
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

                  <span className={cn(
                    'text-sm font-black tracking-tight shrink-0',
                    isOff || isHoliday ? 'text-slate-300 font-normal italic text-xs' :
                                         'text-slate-800'
                  )}>
                    {isOff ? '—' : row.consultant}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Card Footer */}
          <div className="px-6 py-4 md:px-10 bg-slate-50/60 border-t border-slate-100 flex items-center justify-center">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(5,150,105,0.5)]" />
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.28em]">
                Jardim do Lago © 2026 · Somente Visualização
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Minimal global styles */}
      <style>{`
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.10); border-radius: 10px; }
      `}</style>
    </div>
  );
}
