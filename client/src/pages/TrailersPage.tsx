import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Search, Truck as TrailerIcon, Container, Snowflake, Box, Package, Boxes, CheckCircle2, Wrench, Download } from "lucide-react";
import api from "../lib/api";
import ConfirmModal from "../components/ConfirmModal";
import toast from "react-hot-toast";
import { useFormStore } from "../store/formStore";
import Pagination from "../components/Pagination";
import DataTable from "../components/ui/DataTable";
import type { Column } from "../components/ui/DataTable";
import KpiStrip from "../components/ui/KpiStrip";
import DetailDrawer from "../components/ui/DetailDrawer";
import type { TabDef } from "../components/ui/DetailDrawer";
import BulkBar from "../components/ui/BulkBar";
import StatusBadge from "../components/ui/StatusBadge";
import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect";
import ExportModal from "../components/ExportModal";
import { useSettingsStore } from '../store/settingsStore';
import { generateTrailerPdf } from '../lib/pdfGenerator';
import { FileText, Calendar, Clock } from 'lucide-react';
import ActivityTimeline from '../components/ActivityTimeline';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

const TRAILER_TYPES = [
  { value: "mega", label: "trailer_type_mega", default: "Mega" },
  { value: "frigo", label: "trailer_type_frigo", default: "Frigorific (Frigo)" },
  { value: "standard", label: "trailer_type_standard", default: "Standard" },
  { value: "walking_floor", label: "trailer_type_walking_floor", default: "Walking Floor" },
  { value: "container", label: "trailer_type_container", default: "Container" },
  { value: "flatbed", label: "trailer_type_flatbed", default: "Platformă (Flatbed)" },
  { value: "other", label: "truck_type_other", default: "Altul" },
];

const TRAILER_STATUSES: SelectOption[] = [
  { value: "active", label: "truck_status_active" },
  { value: "maintenance", label: "truck_status_maintenance" },
  { value: "inactive", label: "truck_status_inactive" },
];

const TYPE_ICONS: Record<string, any> = {
  mega: Package, frigo: Snowflake, standard: Box, walking_floor: Boxes, container: Container, flatbed: Box, other: TrailerIcon,
};

const typeLabel = (tl: any, t: any) => {
  const opt = TRAILER_TYPES.find((o) => o.value === (tl?.type || "standard"));
  return t(opt?.label || "trailer_type_standard") || opt?.default || "Standard";
};

export default function TrailersPage() {
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const { t, i18n } = useTranslation();
  const company = useSettingsStore(s => s.company);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(formStore.trailersShowForm);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [filters, setFilters] = useState<any>({ status: "all", type: "all" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState('info');
  const [showExport, setShowExport] = useState(false);

  const initialForm = {
    plateNumber: "", type: "standard", brand: "", year: "",
    payloadCapacityWeight: "", maxLdm: "", maxVolumeCbm: "", payloadCapacityPallets: "", status: "active",
    apkExpiry: "",
  };

  const fpOptions = useMemo(() => ({
    altInput: true,
    altFormat: 'd/m/Y',
    dateFormat: 'Y-m-d',
    allowInput: false
  }), []);

  const [form, setForm] = useState(formStore.trailersForm || initialForm);
  const [editId, setEditId] = useState<string | null>(formStore.trailersEditId);

  useEffect(() => {
    formStore.setFormState("trailers", { showForm, editId, form });
  }, [showForm, editId, form]);

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete("/trailers/" + deleteId);
      toast.success(t("trailerDeleted", "Remorcă ștearsă cu succes"));
      load();
    } catch {
      toast.error(t("error", "Eroare"));
    } finally {
      setDeleteId(null);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    api.get("/trailers")
      .then((res) => setTrailers(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    if (!(await confirmSave())) return;
    try {
      const payload = {
        ...form,
        payloadCapacityWeight: form.payloadCapacityWeight ? Number(form.payloadCapacityWeight) : null,
        maxLdm: form.maxLdm ? Number(form.maxLdm) : null,
        maxVolumeCbm: form.maxVolumeCbm ? Number(form.maxVolumeCbm) : null,
        payloadCapacityPallets: form.payloadCapacityPallets ? Number(form.payloadCapacityPallets) : null,
        year: form.year ? Number(form.year) : null,
        apkExpiry: form.apkExpiry || null,
      };
      if (editId) {
        await api.patch("/trailers/" + editId, payload);
        toast.success(t("trailerUpdated", "Remorcă actualizată"));
      } else {
        await api.post("/trailers", payload);
        toast.success(t("trailerAdded", "Remorcă adăugată"));
      }
      setShowForm(false);
      setEditId(null);
      setForm(initialForm);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("saveError", "Eroare la salvare"));
    }
  };

  const filtered = useMemo(() => {
    let list = [...trailers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((x) => (x.plateNumber || "").toLowerCase().includes(q) || (x.brand || "").toLowerCase().includes(q));
    }
    if (filters.status !== "all") list = list.filter((x) => x.status === filters.status);
    if (filters.type !== "all") list = list.filter((x) => x.type === filters.type);
    return list;
  }, [trailers, search, filters]);

  const total = trailers.length;
  const active = trailers.filter((x) => x.status === "active").length;
  const maintenance = trailers.filter((x) => x.status === "maintenance").length;
  const totalPallets = trailers.reduce((s, x) => s + Number(x.payloadCapacityPallets || 0), 0);
  const totalCbm = trailers.reduce((s, x) => s + Number(x.maxVolumeCbm || 0), 0);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [search, filters]);

  const openEdit = (tr: any) => {
    setForm({
      plateNumber: tr.plateNumber || "", type: tr.type || "standard", brand: tr.brand || "", year: tr.year || "",
      payloadCapacityWeight: tr.payloadCapacityWeight ?? "", maxLdm: tr.maxLdm ?? "", maxVolumeCbm: tr.maxVolumeCbm ?? "",
      payloadCapacityPallets: tr.payloadCapacityPallets ?? "", status: tr.status || "active",
      apkExpiry: tr.apkExpiry ? tr.apkExpiry.slice(0, 10) : "",
    });
    setEditId(tr.id);
    setShowForm(true);
    setDrawerId(null);
  };

  const columns: Column<any>[] = [
    {
      key: "plateNumber",
      label: t("plateNumber", "Nr. Înmatriculare"),
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-primary">
            {(() => { const I = TYPE_ICONS[r.type] || TrailerIcon; return <I className="w-4 h-4" />; })()}
          </span>
          <span className="font-bold">{r.plateNumber}</span>
        </div>
      ),
    },
    { key: "type", label: t("type", "Tip"), sortable: true, render: (r) => typeLabel(r, t) },
    { key: "brand", label: t("brand", "Brand"), sortable: true, render: (r) => r.brand || "—" },
    { key: "year", label: t("year", "An"), sortable: true, render: (r) => r.year || "—" },
    { key: "pallets", label: t("maxPallets", "Paleți"), sortable: true, render: (r) => r.payloadCapacityPallets || "—", align: "right" },
    { key: "cbm", label: t("maxVolumeCbm", "Volum m³"), sortable: true, render: (r) => (r.maxVolumeCbm ? Number(r.maxVolumeCbm) + " m³" : "—"), align: "right" },
    {
      key: "service",
      label: t("next_service", "Următoarea revizie"),
      render: (r) => {
        if (!r.apkExpiry) return <span className="text-xs text-text-muted">—</span>;
        const daysLeft = Math.ceil((new Date(r.apkExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const barColor = daysLeft <= 0 || daysLeft < 15 ? 'bg-red-500 animate-pulse' : daysLeft < 30 ? 'bg-amber-500' : 'bg-green-500/60';
        const pct = Math.max(0, Math.min(100, Math.round((daysLeft / 365) * 100)));
        return (
          <div className="min-w-[110px]">
            <div className="flex justify-between text-[10px] font-semibold mb-1">
              <span className="text-text-secondary">{new Date(r.apkExpiry).toLocaleDateString(i18n.language || 'en-GB')}</span>
              {daysLeft <= 0 ? (
                <span className="text-red-500 font-bold">{t('service_overdue', 'Overdue')}</span>
              ) : (
                <span className={daysLeft < 15 ? 'text-red-500 font-bold' : daysLeft < 30 ? 'text-amber-600 font-semibold' : 'text-green-600 font-semibold'}>
                  {daysLeft}d
                </span>
              )}
            </div>
            <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct || 100}%` }} />
            </div>
          </div>
        );
      }
    },
    {
      key: "status",
      label: t("status", "Status"),
      sortable: true,
      render: (r) => {
        const opt = TRAILER_STATUSES.find(o => o.value === r.status);
        const translatedLabel = opt ? t(opt.label as string) : r.status;
        return <StatusBadge type="fleet" status={r.status} label={translatedLabel} />;
      },
    },
    {
      key: "actions", label: t("actions", "Acțiuni"), align: "right",
      render: (tr) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={async (e) => {
             e.stopPropagation();
             try { await generateTrailerPdf(tr, company); } catch (err) { toast.error(t('error_pdf', 'Eroare generare PDF')); }
          }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('pdf', 'Download PDF')}>
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEdit(tr)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t("edit", "Editează")}><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteId(tr.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title={t("delete", "Șterge")}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];

  const bulkSetStatus = async (status: string) => {
    for (const id of selected) {
      try { await api.patch("/trailers/" + id, { status }); } catch { /* continue */ }
    }
    toast.success(t("saved", "Salvat"));
    setSelected(new Set());
    load();
  };

  const drawerTrailer = trailers.find((x) => x.id === drawerId) || null;

  const detailTabs: TabDef[] = drawerTrailer ? [
    {
      key: "info",
      label: t("info", "Informații"),
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><div className="text-xs text-text-secondary">{t("plateNumber", "Nr. Înmatriculare")}</div><div className="font-semibold">{drawerTrailer.plateNumber}</div></div>
          <div><div className="text-xs text-text-secondary">{t("type", "Tip")}</div><div className="font-semibold">{typeLabel(drawerTrailer, t)}</div></div>
          <div><div className="text-xs text-text-secondary">{t("brand", "Brand")}</div><div className="font-semibold">{drawerTrailer.brand || "—"}</div></div>
          <div><div className="text-xs text-text-secondary">{t("year", "An")}</div><div className="font-semibold">{drawerTrailer.year || "—"}</div></div>
          <div><div className="text-xs text-text-secondary">{t("payloadCapacity", "Capacitate greutate (kg)")}</div><div className="font-semibold">{drawerTrailer.payloadCapacityWeight ? Number(drawerTrailer.payloadCapacityWeight) + " kg" : "—"}</div></div>
          <div><div className="text-xs text-text-secondary">{t("maxLdm", "Max LDM")}</div><div className="font-semibold">{drawerTrailer.maxLdm ? Number(drawerTrailer.maxLdm) : "—"}</div></div>
          <div><div className="text-xs text-text-secondary">{t("maxPallets", "Paleți")}</div><div className="font-semibold">{drawerTrailer.payloadCapacityPallets || "—"}</div></div>
          <div><div className="text-xs text-text-secondary">{t("maxVolumeCbm", "Volum m³")}</div><div className="font-semibold">{drawerTrailer.maxVolumeCbm ? Number(drawerTrailer.maxVolumeCbm) + " m³" : "—"}</div></div>
          <div><div className="text-xs text-text-secondary">{t("status", "Status")}</div><div><StatusBadge type="fleet" status={drawerTrailer.status} label={t((TRAILER_STATUSES.find(o => o.value === drawerTrailer.status)?.label as string) || drawerTrailer.status)} /></div></div>
          <div className="mt-6 pt-4 border-t border-border/60 grid grid-cols-2 gap-3 text-xs text-text-secondary col-span-1 sm:col-span-2">
            <div className="flex items-start gap-2 bg-surface/30 p-2.5 rounded-xl border border-border/40">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary mt-0.5 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">{t('created_at', 'Created')}</div>
                <div className="font-semibold text-text-primary mt-0.5">{drawerTrailer.createdAt ? new Date(drawerTrailer.createdAt).toLocaleDateString(i18n.language || 'en-GB') : '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-surface/30 p-2.5 rounded-xl border border-border/40">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">{t('last_updated', 'Last updated')}</div>
                <div className="font-semibold text-text-primary mt-0.5">{drawerTrailer.updatedAt ? new Date(drawerTrailer.updatedAt).toLocaleDateString(i18n.language || 'en-GB') : '—'}</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "activity",
      label: t("tab_activity", "Activity"),
      content: <ActivityTimeline entityType="Trailer" entityId={drawerTrailer.id} />,
    },
  ] : [];

  return (
    <div className="space-y-4 animate-fade-in max-w-[1600px] mx-auto pb-10">
      <KpiStrip
        items={[
          { key: "total", label: t("total", "Total"), value: total, icon: TrailerIcon },
          { key: "active", label: t("active", "Active"), value: active, icon: CheckCircle2, color: "text-green-500" },
          { key: "maintenance", label: t("maintenance", "Mentenanță"), value: maintenance, icon: Wrench, color: "text-amber-500" },
          { key: "pallets", label: t("maxPallets", "Paleți total"), value: totalPallets, icon: Boxes, color: "text-blue-500" },
          { key: "cbm", label: t("maxVolumeCbm", "Volum total m³"), value: totalCbm, icon: Box, color: "text-purple-500" },
        ]}
      />

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input className="input pl-9 py-2 text-sm w-full" placeholder={t("search", "Caută...")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <CustomSelect className="w-40" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={[{ value: "all", label: t("allStatuses", "Toate statusurile") }, ...TRAILER_STATUSES]} />
            <CustomSelect className="w-44" value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} options={[{ value: "all", label: t("allTypes", "Toate tipurile") }, ...TRAILER_TYPES.map((o) => ({ value: o.value, label: t(o.label) || o.default }))]} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-3 py-1.5 rounded-lg border border-border">
              {filtered.length} {t("results", "results")}
            </span>
            <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-3 flex items-center gap-2 text-sm font-semibold">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t("export", "Export")}</span>
            </button>
            <button onClick={() => { setForm(initialForm); setShowForm(true); setEditId(null); }} className="btn-primary py-2 px-3 flex items-center gap-2 text-sm font-semibold shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" /> {t("addTrailer", "Adaugă Remorcă")}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDrawerId(r.id)}
          selectable
          selected={selected}
          loading={loading}
          onSelectionChange={setSelected}
          emptyState={<div className="text-center py-10 text-text-secondary">{t("noTrailers", "Nicio remorcă găsită")}</div>}
        />
      </div>

      {filtered.length > itemsPerPage && (
        <Pagination totalItems={filtered.length} currentPage={currentPage} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      )}

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())} actions={[
        { label: t("setActive", "Activează"), icon: CheckCircle2, onClick: () => bulkSetStatus("active") },
        { label: t("setMaintenance", "Mentenanță"), icon: Wrench, variant: "secondary", onClick: () => bulkSetStatus("maintenance") },
        { label: t("setInactive", "Dezactivează"), icon: Trash2, variant: "danger", onClick: () => bulkSetStatus("inactive") },
      ]} />

      <DetailDrawer
        open={!!drawerTrailer}
        onClose={() => { setDrawerId(null); setDrawerTab('info'); }}
        title={drawerTrailer?.plateNumber || ""}
        subtitle={drawerTrailer ? typeLabel(drawerTrailer, t) : ""}
        tabs={detailTabs}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        headerRight={
          drawerTrailer ? (
            <button className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5" onClick={() => openEdit(drawerTrailer)}>
              <Pencil className="w-3.5 h-3.5" /> {t("edit", "Editează")}
            </button>
          ) : null
        }
      />

      {showForm && (
        <DetailDrawer
          open
          onClose={() => setShowForm(false)}
          title={editId ? t("editTrailer", "Editează Remorcă") : t("addTrailer", "Adaugă Remorcă")}
          footer={
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(initialForm); }}>{t("cancel", "Anulează")}</button>
              <button type="button" className="btn-primary" onClick={handleSubmit}>{t("save", "Salvează")}</button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label font-semibold">{t("plateNumber", "Nr. Înmatriculare")} <span className="text-red-500">*</span></label><input type="text" className="input uppercase" required value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} /></div>
            <div><label className="label font-semibold">{t("type", "Tip")}</label><CustomSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TRAILER_TYPES.map((o) => ({ value: o.value, label: t(o.label) || o.default }))} /></div>
            <div><label className="label font-semibold">{t("brand", "Brand")}</label><input type="text" className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><label className="label font-semibold">{t("year", "An")}</label><input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
            <div><label className="label font-semibold">{t("payloadCapacity", "Capacitate greutate (kg)")}</label><input type="number" className="input" value={form.payloadCapacityWeight} onChange={(e) => setForm({ ...form, payloadCapacityWeight: e.target.value })} min="0" /></div>
            <div><label className="label font-semibold">{t("maxPallets", "Paleți")}</label><input type="number" className="input" value={form.payloadCapacityPallets} onChange={(e) => setForm({ ...form, payloadCapacityPallets: e.target.value })} min="0" /></div>
            <div><label className="label font-semibold">{t("maxLdm", "Max LDM")}</label><input type="number" step="0.1" className="input" value={form.maxLdm} onChange={(e) => setForm({ ...form, maxLdm: e.target.value })} min="0" /></div>
            <div><label className="label font-semibold">{t("maxVolumeCbm", "Volum (m³)")}</label><input type="number" step="0.1" className="input" value={form.maxVolumeCbm} onChange={(e) => setForm({ ...form, maxVolumeCbm: e.target.value })} min="0" /></div>
            <div>
              <label className="label font-semibold">{t("next_service", "Următoarea revizie (APK)")}</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <Flatpickr
                  value={form.apkExpiry}
                  onChange={(_, dateStr) => setForm({ ...form, apkExpiry: dateStr })}
                  className="input pl-9 bg-card cursor-pointer hover:border-primary/50 transition-colors h-[38px] w-full"
                  options={fpOptions}
                  placeholder={t('date_format_hint', 'DD/MM/YYYY')}
                />
              </div>
            </div>
            <div><label className="label font-semibold">{t("status", "Status")}</label><CustomSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={TRAILER_STATUSES.map((o) => ({ value: o.value, label: t(o.label as string) as string }))} /></div>
          </form>
        </DetailDrawer>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title={t("confirmDelete", "Confirmă ștergerea")}
        message={t("deleteTrailerConfirm", "Sigur vrei să ștergi această remorcă?")}
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={filtered}
        filename={"Trailers_" + new Date().toISOString().slice(0, 10)}
        title={t("trailers", "Remorci")}
        sheetName="Trailers"
        getDateField={(tr) => tr.createdAt}
        headers={[
          { key: "plateNumber", label: "Plate Number", transform: (v: any) => v || "" },
          { key: "type", label: "Type", transform: (_v: any, tr: any) => typeLabel(tr, t) },
          { key: "brand", label: "Brand", transform: (v: any) => v || "" },
          { key: "year", label: "Year", transform: (v: any) => v || "" },
          { key: "pallets", label: "Pallets", transform: (v: any) => v || "" },
          { key: "cbm", label: "Volume (m3)", transform: (v: any) => v || "" },
          { key: "status", label: "Status", transform: (v: any) => v || "" },
        ]}
      />
    </div>
  );
}