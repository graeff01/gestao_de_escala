// useCloudData — single source of truth for the schedule, backed by Firestore.
//
// All schedule data lives in ONE document at /escalas/main. We subscribe via
// onSnapshot so any change made on any device propagates in real time. Writes
// are coalesced into a setDoc(merge:true) call so partial updates are safe.
//
// Why one document?
//   - The dataset is tiny (a few hundred entries max) → easily fits in 1MB.
//   - One read = entire app state → cheap and trivial to cache offline.
//   - One snapshot listener = real-time across devices, no fan-out logic.

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, SCHEDULE_DOC_PATH } from '../firebase';

const DEFAULT_DATA = {
  consultants: ['Roberta', 'Elis', 'Duda'],
  holidays: [],
  overrides: {},
  vacations: [],
  auditLog: [],
};

function normalize(raw) {
  // Firestore returns plain objects, but we still want to guarantee shape
  // so the rest of the app never has to null-check.
  return {
    consultants: Array.isArray(raw?.consultants) ? raw.consultants : DEFAULT_DATA.consultants,
    holidays:    Array.isArray(raw?.holidays)    ? raw.holidays    : DEFAULT_DATA.holidays,
    overrides:   raw?.overrides && typeof raw.overrides === 'object' && !Array.isArray(raw.overrides)
                   ? raw.overrides
                   : DEFAULT_DATA.overrides,
    vacations:   Array.isArray(raw?.vacations)   ? raw.vacations   : DEFAULT_DATA.vacations,
    auditLog:    Array.isArray(raw?.auditLog)    ? raw.auditLog    : DEFAULT_DATA.auditLog,
  };
}

export function useCloudData({ readOnly = false } = {}) {
  const [data, setDataState] = useState(DEFAULT_DATA);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error' | 'empty'
  const [error, setError] = useState(null);

  // Track latest data without re-subscribing for the writers below.
  const latestRef = useRef(DEFAULT_DATA);
  latestRef.current = data;

  useEffect(() => {
    const ref = doc(db, SCHEDULE_DOC_PATH.collection, SCHEDULE_DOC_PATH.doc);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          // First-time install: the document doesn't exist yet. We don't
          // create it automatically — the admin must seed it (via migration
          // or by saving any change). For ConsultaView this is fine; it just
          // shows defaults.
          setDataState(DEFAULT_DATA);
          setStatus('empty');
          return;
        }
        setDataState(normalize(snap.data()));
        setStatus('ready');
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('[useCloudData] snapshot error:', err);
        setError(err);
        setStatus('error');
      }
    );
    return unsub;
  }, []);

  // Generic patcher: pass a partial object, it merges into the document.
  // Always sends a serverTimestamp so we can later detect last-write-wins.
  const writePatch = useCallback(async (patch) => {
    if (readOnly) return;
    const ref = doc(db, SCHEDULE_DOC_PATH.collection, SCHEDULE_DOC_PATH.doc);
    await setDoc(
      ref,
      { ...patch, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }, [readOnly]);

  // Field-level setters that mirror the React useState API the App.jsx code
  // already expects. They accept either a value OR an updater function.
  const makeSetter = useCallback((field) => {
    return (next) => {
      const current = latestRef.current[field];
      const value = typeof next === 'function' ? next(current) : next;
      // Optimistic update so the UI reflects immediately, before the server
      // confirms. Firestore offline persistence will queue the write.
      setDataState(prev => ({ ...prev, [field]: value }));
      latestRef.current = { ...latestRef.current, [field]: value };
      writePatch({ [field]: value }).catch(err => {
        // eslint-disable-next-line no-console
        console.error(`[useCloudData] failed to write ${field}:`, err);
      });
    };
  }, [writePatch]);

  // Bulk replace — used by the migration import.
  const replaceAll = useCallback(async (next) => {
    if (readOnly) return;
    const ref = doc(db, SCHEDULE_DOC_PATH.collection, SCHEDULE_DOC_PATH.doc);
    const clean = normalize(next);
    setDataState(clean);
    latestRef.current = clean;
    await setDoc(
      ref,
      { ...clean, updatedAt: serverTimestamp() },
      { merge: false }
    );
  }, [readOnly]);

  return {
    data,
    status,
    error,
    setConsultants: makeSetter('consultants'),
    setHolidays:    makeSetter('holidays'),
    setOverrides:   makeSetter('overrides'),
    setVacations:   makeSetter('vacations'),
    setAuditLog:    makeSetter('auditLog'),
    replaceAll,
  };
}
