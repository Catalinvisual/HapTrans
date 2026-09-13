import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet, UploadCloud, Loader2, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, XCircle, SkipForward, RefreshCw, Info,
  ArrowRight, Check, Pencil, Sparkles, ClipboardCheck, Table2, Eye,
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

function curSym(code?: string): string {
  return code === 'EUR' || !code ? '€' : code;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  reason: string;
}

interface ImportIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface NormalizedOrderRow {
  externalReference?: string;
  loadingReference?: string;
  unloadingReference?: string;
  pickupDate?: string;
  pickupTimeFrom?: string;
  pickupTimeTo?: string;
  pickupCompany?: string;
  pickupAddress?: string;
  pickupCity?: string;
  pickupCountry?: string;
  deliveryDate?: string;
  deliveryTimeFrom?: string;
  deliveryTimeTo?: string;
  deliveryCompany?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  weight?: number;
  pallets?: number;
  volume?: number;
  price?: number;
  currency?: string;
  clientName?: string;
  notes?: string;
}

type RowStatus = 'valid' | 'warning' | 'needs_review' | 'invalid' | 'duplicate';

interface ImportRowResult {
  rowIndex: number;
  excelRowNumber: number;
  status: RowStatus;
  issues: ImportIssue[];
  data: NormalizedOrderRow;
  duplicateOrderId?: string;
  duplicateOrderNumber?: string;
}

interface ImportStats {
  total: number;
  valid: number;
  warnings: number;
  needsReview: number;
  invalid: number;
  duplicates: number;
}

interface ImportPreviewResult {
  analyzeId: string;
  workbookInfo: { fileName: string; sheetName: string; rowCount: number; columnCount: number };
  mappings: FieldMapping[];
  rows: ImportRowResult[];
  stats: ImportStats;
}

type DuplicateStrategy = 'skip' | 'update' | 'import_anyway';
type Step = 'upload' | 'mapping' | 'preview' | 'done';

// ─── Constants ────────────────────────────────────────────────────────────────

const HAPCARGO_FIELDS = [
  { value: 'IGNORE', label: 'Ignore column' },
  { value: 'externalReference', label: 'External Reference' },
  { value: 'loadingReference', label: 'Loading Reference' },
  { value: 'unloadingReference', label: 'Unloading Reference' },
  { value: 'pickupDate', label: 'Pickup Date' },
  { value: 'pickupTimeFrom', label: 'Pickup Time (from)' },
  { value: 'pickupTimeTo', label: 'Pickup Time (to)' },
  { value: 'pickupCompany', label: 'Pickup Company' },
  { value: 'pickupAddress', label: 'Pickup Address' },
  { value: 'pickupPostalCode', label: 'Pickup Postal Code' },
  { value: 'pickupCity', label: 'Pickup City' },
  { value: 'pickupCountry', label: 'Pickup Country' },
  { value: 'deliveryDate', label: 'Delivery Date' },
  { value: 'deliveryTimeFrom', label: 'Delivery Time (from)' },
  { value: 'deliveryTimeTo', label: 'Delivery Time (to)' },
  { value: 'deliveryCompany', label: 'Delivery Company' },
  { value: 'deliveryAddress', label: 'Delivery Address' },
  { value: 'deliveryPostalCode', label: 'Delivery Postal Code' },
  { value: 'deliveryCity', label: 'Delivery City' },
  { value: 'deliveryCountry', label: 'Delivery Country' },
  { value: 'weight', label: 'Weight (kg)' },
  { value: 'pallets', label: 'Pallets' },
  { value: 'ldm', label: 'LDM' },
  { value: 'volume', label: 'Volume (m³)' },
  { value: 'goodsDescription', label: 'Goods Description' },
  { value: 'price', label: 'Price' },
  { value: 'currency', label: 'Currency' },
  { value: 'contactPerson', label: 'Contact Person' },
  { value: 'contactPhone', label: 'Contact Phone' },
  { value: 'clientName', label: 'Client Name' },
  { value: 'notes', label: 'Notes' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.9
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
    : confidence >= 0.7
      ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400'
      : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${color}`}>
      {pct}%
    </span>
  );
}

function StatusIcon({ status }: { status: RowStatus }) {
  switch (status) {
    case 'valid': return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'needs_review': return <Info className="w-4 h-4 text-orange-500 shrink-0" />;
    case 'invalid': return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
    case 'duplicate': return <RefreshCw className="w-4 h-4 text-sky-500 shrink-0" />;
  }
}

function StatusLabel({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; cls: string }> = {
    valid: { label: 'Valid', cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    warning: { label: 'Warning', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    needs_review: { label: 'Review', cls: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    invalid: { label: 'Invalid', cls: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    duplicate: { label: 'Duplicate', cls: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload', icon: <UploadCloud className="w-3.5 h-3.5" /> },
    { id: 'mapping', label: 'Mapping', icon: <Table2 className="w-3.5 h-3.5" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'done', label: 'Done', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  ];
  const stepOrder: Step[] = ['upload', 'mapping', 'preview', 'done'];
  const current = stepOrder.indexOf(step);

  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
              active ? 'bg-primary text-white' :
              done ? 'bg-primary/15 text-primary' :
              'bg-slate-100 dark:bg-slate-800 text-text-secondary'
            }`}>
              {done ? <Check className="w-3.5 h-3.5" /> : s.icon}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-5 h-0.5 mx-0.5 ${i < current ? 'bg-primary/40' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

export default function ExcelImportModal({ open, onClose, onImported }: Props) {
  useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Mapping step
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [editingCol, setEditingCol] = useState<string | null>(null);

  // Preview step
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setBusy(false);
    setPreview(null);
    setMappings([]);
    setEditingCol(null);
    setSelectedRows(new Set());
    setExpandedRows(new Set());
    setDuplicateStrategy('skip');
    setConfirming(false);
    setImportResult(null);
  }, []);

  const handleClose = () => {
    if (busy || confirming) return;
    reset();
    onClose();
  };

  // ─── Step 1: Analyze ───────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/orders/excel/analyze', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data: ImportPreviewResult = res.data;
      setPreview(data);
      setMappings(data.mappings);
      // Pre-select all non-invalid rows
      const sel = new Set(
        data.rows
          .filter(r => r.status !== 'invalid')
          .map(r => r.rowIndex)
      );
      setSelectedRows(sel);
      // Auto-expand needs_review rows
      const exp = new Set(
        data.rows
          .filter(r => r.status === 'needs_review' || r.status === 'warning')
          .map(r => r.rowIndex)
          .slice(0, 5)
      );
      setExpandedRows(exp);
      setStep('mapping');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Analysis failed');
    } finally {
      setBusy(false);
    }
  };

  // ─── Step 2: Mapping edits ─────────────────────────────────────────────────

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMappings(prev =>
      prev.map(m => m.sourceColumn === sourceColumn ? { ...m, targetField } : m)
    );
    setEditingCol(null);
  };

  // ─── Step 3: Confirm ───────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!file || !preview) return;
    setConfirming(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('analyzeId', preview.analyzeId);
      fd.append('mappings', JSON.stringify(mappings));
      fd.append('selectedIndices', JSON.stringify([...selectedRows]));
      fd.append('duplicateStrategy', duplicateStrategy);
      const res = await api.post('/orders/excel/confirm', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      setStep('done');
      onImported(res.data.createdCount || 0);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Import failed');
    } finally {
      setConfirming(false);
    }
  };

  if (!open) return null;

  const hasDuplicates = preview?.stats.duplicates > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="card w-full max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Universal Excel Import</h3>
              {file && <p className="text-xs text-text-secondary truncate max-w-[240px]">{file.name}</p>}
            </div>
          </div>
          <button onClick={handleClose} className="text-text-secondary hover:text-text p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          <StepIndicator step={step} />

          {/* ── STEP: UPLOAD ─────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Upload any customer Excel or CSV. The AI will analyze the entire workbook structure, 
                understand column meanings from context and values, and map them to HapCargo order fields — 
                regardless of language or column naming conventions.
              </p>

              <div
                className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/3 transition-all"
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ''; }}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="font-semibold text-sm">{file.name}</p>
                    <p className="text-xs text-text-secondary">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-10 h-10 text-text-secondary/40" />
                    <p className="font-semibold text-sm">Drop your Excel or CSV file here</p>
                    <p className="text-xs text-text-secondary">.xlsx · .xls · .csv</p>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-xs text-text-secondary space-y-1">
                <p className="font-semibold text-text flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> AI-powered context analysis</p>
                <p>The system analyzes column values, patterns, and relationships — not just column names. It correctly identifies fields like "Vracht auto nr" as a loading reference, not a truck plate.</p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!file || busy}
                className="btn-primary w-full py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing workbook…</> : <><Sparkles className="w-4 h-4" /> Analyze with AI</>}
              </button>
            </div>
          )}

          {/* ── STEP: MAPPING ─────────────────────────────────────── */}
          {step === 'mapping' && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Column Mapping Review</p>
                  <p className="text-xs text-text-secondary">
                    Sheet: <span className="font-medium">{preview.workbookInfo.sheetName}</span> · {preview.workbookInfo.rowCount} data rows · {preview.workbookInfo.columnCount} columns
                  </p>
                </div>
                <button onClick={() => setStep('preview')} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold text-text-secondary">Excel Column</th>
                      <th className="text-left px-3 py-2 font-semibold text-text-secondary">HapCargo Field</th>
                      <th className="text-center px-3 py-2 font-semibold text-text-secondary w-20">Confidence</th>
                      <th className="text-center px-3 py-2 font-semibold text-text-secondary w-12">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, i) => (
                      <tr key={i} className={`border-b border-border/50 last:border-0 ${
                        m.confidence < 0.7 && m.targetField !== 'IGNORE' ? 'bg-red-50/50 dark:bg-red-900/10' :
                        m.confidence < 0.9 && m.targetField !== 'IGNORE' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                        ''
                      }`}>
                        <td className="px-3 py-2">
                          <span className="font-mono font-semibold text-text">{m.sourceColumn}</span>
                        </td>
                        <td className="px-3 py-2">
                          {editingCol === m.sourceColumn ? (
                            <select
                              autoFocus
                              className="text-xs border border-primary rounded px-1.5 py-1 bg-white dark:bg-slate-800 text-text w-48"
                              value={m.targetField}
                              onChange={e => updateMapping(m.sourceColumn, e.target.value)}
                              onBlur={() => setEditingCol(null)}
                            >
                              {HAPCARGO_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`font-medium ${m.targetField === 'IGNORE' ? 'text-text-secondary italic' : 'text-text'}`}>
                              {HAPCARGO_FIELDS.find(f => f.value === m.targetField)?.label || m.targetField}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.targetField !== 'IGNORE' && <ConfidenceBadge confidence={m.confidence} />}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setEditingCol(editingCol === m.sourceColumn ? null : m.sourceColumn)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-text-secondary hover:text-primary"
                            title={`Reason: ${m.reason}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {mappings.some(m => m.confidence < 0.7 && m.targetField !== 'IGNORE') && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-400">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Some columns have <strong>low confidence</strong> mappings (red rows). Please verify or correct these before proceeding.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="btn-secondary px-4 py-2.5 text-sm">← Back</button>
                <button onClick={() => setStep('preview')} className="btn-primary flex-1 py-2.5 font-bold flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" /> Review Orders ({preview.stats.total})
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PREVIEW ─────────────────────────────────────── */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Stats strip */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Total', value: preview.stats.total, color: 'text-text' },
                  { label: 'Valid', value: preview.stats.valid, color: 'text-emerald-600' },
                  { label: 'Warnings', value: preview.stats.warnings, color: 'text-amber-600' },
                  { label: 'Review', value: preview.stats.needsReview, color: 'text-orange-600' },
                  { label: 'Duplicate', value: preview.stats.duplicates, color: 'text-sky-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-800/50 border border-border rounded-xl p-2.5 text-center">
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-text-secondary font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Duplicate strategy */}
              {hasDuplicates && (
                <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                    {preview.stats.duplicates} duplicate(s) detected — choose action:
                  </p>
                  <div className="flex gap-2">
                    {[
                      { value: 'skip' as const, label: 'Skip duplicates', icon: <SkipForward className="w-3.5 h-3.5" /> },
                      { value: 'update' as const, label: 'Update existing', icon: <RefreshCw className="w-3.5 h-3.5" /> },
                      { value: 'import_anyway' as const, label: 'Import anyway', icon: <Check className="w-3.5 h-3.5" /> },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setDuplicateStrategy(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2 rounded-lg border transition-colors ${
                          duplicateStrategy === opt.value
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'border-border text-text-secondary hover:border-sky-300'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Select all / deselect */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary font-medium">{selectedRows.size} of {preview.rows.length} rows selected</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRows(new Set(preview.rows.filter(r => r.status !== 'invalid').map(r => r.rowIndex)))}
                    className="text-xs text-primary hover:underline font-medium"
                  >Select all valid</button>
                  <span className="text-text-secondary text-xs">·</span>
                  <button onClick={() => setSelectedRows(new Set())} className="text-xs text-text-secondary hover:underline">Deselect all</button>
                </div>
              </div>

              {/* Row list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                {preview.rows.map(row => {
                  const isSelected = selectedRows.has(row.rowIndex);
                  const isExpanded = expandedRows.has(row.rowIndex);
                  const d = row.data;
                  const summary = [d.pickupCompany || d.pickupCity, d.deliveryCompany || d.deliveryCity].filter(Boolean).join(' → ');
                  return (
                    <div key={row.rowIndex} className={`rounded-xl border transition-colors ${
                      isSelected ? 'border-primary/40 bg-primary/3' : 'border-border bg-slate-50/50 dark:bg-slate-900/30'
                    }`}>
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        {/* Checkbox */}
                        <button
                          type="button"
                          disabled={row.status === 'invalid'}
                          onClick={() => {
                            const next = new Set(selectedRows);
                            if (next.has(row.rowIndex)) next.delete(row.rowIndex);
                            else next.add(row.rowIndex);
                            setSelectedRows(next);
                          }}
                          className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors disabled:opacity-30 ${
                            isSelected ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </button>

                        {/* Status */}
                        <StatusIcon status={row.status} />

                        {/* Row info */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                          const next = new Set(expandedRows);
                          if (next.has(row.rowIndex)) next.delete(row.rowIndex);
                          else next.add(row.rowIndex);
                          setExpandedRows(next);
                        }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-secondary font-mono">Row {row.excelRowNumber}</span>
                            <StatusLabel status={row.status} />
                            {row.duplicateOrderNumber && (
                              <span className="text-[10px] text-sky-600">= {row.duplicateOrderNumber}</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-text truncate">{summary || (d.loadingReference || d.externalReference || 'No location data')}</p>
                          <p className="text-[10px] text-text-secondary">
                            {d.pickupDate} {d.pickupDate && d.deliveryDate ? '→' : ''} {d.deliveryDate}
                          </p>
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => {
                            const next = new Set(expandedRows);
                            if (next.has(row.rowIndex)) next.delete(row.rowIndex);
                            else next.add(row.rowIndex);
                            setExpandedRows(next);
                          }}
                          className="text-text-secondary hover:text-text"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border/50 px-3 py-2.5 space-y-2">
                          {/* Issues */}
                          {row.issues.length > 0 && (
                            <div className="space-y-1">
                              {row.issues.map((issue, j) => (
                                <div key={j} className={`text-[11px] flex items-start gap-1.5 rounded-lg px-2 py-1 ${
                                  issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                                  'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                }`}>
                                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                  {issue.message}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Data preview grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {[
                              ['Loading', [d.pickupCompany, d.pickupAddress || d.pickupCity, d.pickupCountry].filter(Boolean).join(', ')],
                              ['Delivery', [d.deliveryCompany, d.deliveryAddress || d.deliveryCity, d.deliveryCountry].filter(Boolean).join(', ')],
                              ['Pick-up date', d.pickupDate ? `${d.pickupDate}${d.pickupTimeFrom ? ' ' + d.pickupTimeFrom : ''}` : ''],
                              ['Delivery date', d.deliveryDate ? `${d.deliveryDate}${d.deliveryTimeFrom ? ' ' + d.deliveryTimeFrom : ''}` : ''],
                              ['Loading ref', d.loadingReference || ''],
                              ['External ref', d.externalReference || ''],
                              ['Weight', d.weight ? `${d.weight} kg` : ''],
                              ['Pallets', d.pallets ? String(d.pallets) : ''],
                              ['Price', d.price ? `${d.price} ${curSym(d.currency)}` : ''],
                              ['Client', d.clientName || ''],
                            ].filter(([, v]) => v).map(([label, value]) => (
                              <div key={label as string}>
                                <p className="text-[9px] uppercase font-bold text-text-secondary tracking-wide">{label}</p>
                                <p className="text-[11px] text-text font-medium break-words">{value as string}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('mapping')} className="btn-secondary px-4 py-2.5 text-sm">← Mapping</button>
                <button
                  onClick={handleConfirm}
                  disabled={confirming || selectedRows.size === 0}
                  className="btn-primary flex-1 py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating orders…</> :
                    <><ClipboardCheck className="w-4 h-4" /> Create {selectedRows.size} order{selectedRows.size !== 1 ? 's' : ''}</>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: DONE ─────────────────────────────────────────── */}
          {step === 'done' && importResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-lg font-bold">Import complete!</h4>
                <p className="text-text-secondary text-sm mt-1">
                  {importResult.createdCount} order{importResult.createdCount !== 1 ? 's' : ''} created
                  {importResult.skippedCount > 0 ? `, ${importResult.skippedCount} duplicate(s) skipped` : ''}
                  {importResult.errorCount > 0 ? `, ${importResult.errorCount} error(s)` : ''}
                </p>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="text-left bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-400 space-y-1">
                  <p className="font-semibold">Errors:</p>
                  {importResult.errors.slice(0, 5).map((e: any, i: number) => (
                    <p key={i}>Row {e.rowIndex + 1}: {e.message}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button onClick={handleClose} className="btn-primary px-8 py-2.5 font-bold">Done</button>
                <button onClick={reset} className="btn-secondary px-4 py-2.5">Import another</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
