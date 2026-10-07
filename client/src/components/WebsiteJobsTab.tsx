import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from './SaveConfirmProvider';
import CustomSelect from './CustomSelect';
interface JobData {
  id: string;
  title: string;
  department: string;
  location: string;
  contractType: string;
  schedule: string;
  salary: string;
  experience: string;
  languages: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  isActive: boolean;

  // Driver specific
  license?: string;
  code95?: boolean;
  adr?: boolean;
  truckType?: string;
  routes?: string;
}
interface WebsiteJobsTabProps {
  cmsData: Record<string, string>;
  editLang: string;
  setEditLang: (lang: string) => void;
  handleSave: (key: string, value: string) => void;
  saving: boolean;
}
const DEPARTMENTS = ['Transport', 'Planning', 'Administratie', 'Sales', 'Warehouse', 'Finance', 'HR', 'Other'];
const CONTRACT_TYPES = ['Full-time', 'Part-time', 'ZZP', 'Stage', 'Tijdelijk'];
const EDIT_LANGS = ['RO', 'EN', 'NL', 'DE', 'FR', 'ES'];
const WebsiteJobsTab: React.FC<WebsiteJobsTabProps> = ({
  cmsData,
  editLang,
  setEditLang,
  handleSave,
  saving
}) => {
  const {
    t
  } = useTranslation();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [editingJob, setEditingJob] = useState<JobData | null>(null);
  useEffect(() => {
    const key = `jobs_${editLang}`;
    if (cmsData[key]) {
      try {
        setJobs(JSON.parse(cmsData[key]));
      } catch (e) {
        setJobs([]);
      }
    } else {
      setJobs([]);
    }
    setEditingJob(null);
  }, [cmsData, editLang]);
  const handleSaveToCms = (newJobs: JobData[]) => {
    const key = `jobs_${editLang}`;
    handleSave(key, JSON.stringify(newJobs));
    setJobs(newJobs);
  };
  const handleAddNew = () => {
    setEditingJob({
      id: crypto.randomUUID(),
      title: '',
      department: 'Transport',
      location: '',
      contractType: 'Full-time',
      schedule: '',
      salary: 'În overleg',
      experience: '',
      languages: '',
      responsibilities: '',
      requirements: '',
      benefits: '',
      isActive: true,
      license: '',
      code95: false,
      adr: false,
      truckType: '',
      routes: ''
    });
  };
  const handleEdit = (job: JobData) => {
    setEditingJob({
      ...job
    });
  };
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t('delete_job', 'Job verwijderen'),
      message: t('confirm_delete_job', 'Sigur dorești să ștergi acest job?'),
      confirmText: t('delete', 'Verwijderen'),
      cancelText: t('cancel', 'Annuleren'),
      variant: 'danger'
    });
    if (ok) {
      const newJobs = jobs.filter(j => j.id !== id);
      handleSaveToCms(newJobs);
    }
  };
  const handleSaveForm = () => {
    if (!editingJob) return;
    if (!editingJob.title.trim()) {
      toast.error(t('jobs_title_req', 'Titlul este obligatoriu!'));
      return;
    }
    let newJobs = [...jobs];
    const index = newJobs.findIndex(j => j.id === editingJob.id);
    if (index >= 0) {
      newJobs[index] = editingJob;
    } else {
      newJobs.push(editingJob);
    }
    handleSaveToCms(newJobs);
    setEditingJob(null);
  };
  if (editingJob) {
    const isDriver = editingJob.department === 'Transport';
    return <div className="bg-surface/50 p-4 rounded-xl border border-border">
        <h3 className="text-lg font-bold mb-4">{jobs.find(j => j.id === editingJob.id) ? t('jobs_edit', 'Editează Job') : t('jobs_add_new', 'Adaugă Job Nou')} ({editLang})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_title', 'Titlu Job *')}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.title} onChange={e => setEditingJob({
            ...editingJob,
            title: e.target.value
          })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_department', 'Departament')}</label>
            <CustomSelect value={editingJob.department} onChange={val => setEditingJob({
            ...editingJob,
            department: val
          })} options={DEPARTMENTS.map(d => ({
            value: d,
            label: d
          }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_location', 'Locație')}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.location} onChange={e => setEditingJob({
            ...editingJob,
            location: e.target.value
          })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_contract_type', 'Tip Contract')}</label>
            <CustomSelect value={editingJob.contractType} onChange={val => setEditingJob({
            ...editingJob,
            contractType: val
          })} options={CONTRACT_TYPES.map(d => ({
            value: d,
            label: d
          }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_schedule', 'Program / Schimburi')}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.schedule} onChange={e => setEditingJob({
            ...editingJob,
            schedule: e.target.value
          })} placeholder="ex: L-V, 2 schimburi" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_salary', 'Salariu')}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.salary} onChange={e => setEditingJob({
            ...editingJob,
            salary: e.target.value
          })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_experience', 'Experiență necesară')}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.experience} onChange={e => setEditingJob({
            ...editingJob,
            experience: e.target.value
          })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_languages', 'Limbi necesare')}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.languages} onChange={e => setEditingJob({
            ...editingJob,
            languages: e.target.value
          })} placeholder="ex: NL, EN" />
          </div>
        </div>

        {isDriver && <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-primary mb-3">{t('jobs_driver_fields', 'Câmpuri pentru Șoferi')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('jobs_license', 'Permis Necesar')}</label>
                <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.license || ''} onChange={e => setEditingJob({
              ...editingJob,
              license: e.target.value
            })} placeholder="ex: C, CE" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('jobs_truck_type', 'Tip Camion')}</label>
                <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.truckType || ''} onChange={e => setEditingJob({
              ...editingJob,
              truckType: e.target.value
            })} placeholder="ex: Trekker-oplegger" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('jobs_routes', 'Rute')}</label>
                <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.routes || ''} onChange={e => setEditingJob({
              ...editingJob,
              routes: e.target.value
            })} placeholder="ex: Internațional" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="code95" checked={editingJob.code95 || false} onChange={e => setEditingJob({
              ...editingJob,
              code95: e.target.checked
            })} className="w-4 h-4" />
                <label htmlFor="code95" className="text-sm font-medium cursor-pointer">{t('jobs_code95', 'Code 95 Necesar')}</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="adr" checked={editingJob.adr || false} onChange={e => setEditingJob({
              ...editingJob,
              adr: e.target.checked
            })} className="w-4 h-4" />
                <label htmlFor="adr" className="text-sm font-medium cursor-pointer">{t('jobs_adr', 'ADR Necesar')}</label>
              </div>
            </div>
          </div>}

        <div className="space-y-4 mb-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_responsibilities', 'Responsabilități (HTML permis)')}</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-card min-h-[80px]" value={editingJob.responsibilities} onChange={e => setEditingJob({
            ...editingJob,
            responsibilities: e.target.value
          })} placeholder="Ce va face candidatul?" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_requirements', 'Cerințe (HTML permis)')}</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-card min-h-[80px]" value={editingJob.requirements} onChange={e => setEditingJob({
            ...editingJob,
            requirements: e.target.value
          })} placeholder="Ce așteptări ai?" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_benefits', 'Ce Oferim / Beneficii (HTML permis)')}</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-card min-h-[80px]" value={editingJob.benefits} onChange={e => setEditingJob({
            ...editingJob,
            benefits: e.target.value
          })} placeholder="Ce beneficii oferi?" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('jobs_status', 'Status')}</label>
            <CustomSelect value={editingJob.isActive ? 'active' : 'inactive'} onChange={val => setEditingJob({
            ...editingJob,
            isActive: val === 'active'
          })} options={[{
            value: 'active',
            label: t('jobs_active', 'Activ (Publicat)')
          }, {
            value: 'inactive',
            label: t('jobs_inactive', 'Inactiv (Ascuns)')
          }]} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors" onClick={handleSaveForm}>
            <Save size={18} />
            {t('jobs_save', 'Salvează')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface text-text rounded-lg font-medium hover:bg-surface-alt transition-colors" onClick={() => setEditingJob(null)}>
            <X size={18} />
            {t('jobs_cancel', 'Anulează')}
          </button>
        </div>
      </div>;
  }
  return <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-text-secondary whitespace-nowrap">{t("jsx_limba")}</label>
          <CustomSelect value={editLang} onChange={val => setEditLang(val)} className="w-32 text-sm font-semibold shadow-sm bg-card" options={EDIT_LANGS.map(l => ({
          value: l,
          label: l
        }))} />
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          {t('jobs_add_new', 'Adaugă Job Nou')}
        </button>
      </div>

      {jobs.length === 0 ? <div className="p-8 text-center text-text-muted border border-dashed border-border rounded-xl">
          {t('jobs_no_jobs', 'Niciun job adăugat în această limbă.')}
        </div> : <div className="space-y-3">
          {jobs.map(job => <div key={job.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface transition-colors">
              <div>
                <h4 className="font-bold text-text">{job.title}</h4>
                <p className="text-sm text-text-muted">{job.department} • {job.location} • {job.contractType}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.isActive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  {job.isActive ? t('jobs_active', 'Activ (Publicat)') : t('jobs_inactive', 'Inactiv (Ascuns)')}
                </span>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors" onClick={() => handleEdit(job)}>
                    <Edit2 size={18} />
                  </button>
                  <button className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors" onClick={() => handleDelete(job.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>)}
        </div>}
    </div>;
};
export default WebsiteJobsTab;