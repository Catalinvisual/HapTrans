import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { v4 as uuidv4 } from 'uuid';

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

const WebsiteJobsTab: React.FC<WebsiteJobsTabProps> = ({ cmsData, editLang, setEditLang, handleSave, saving }) => {
  const { t } = useTranslation();
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
      id: uuidv4(),
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
    setEditingJob({ ...job });
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('confirm_delete_job', 'Sigur dorești să ștergi acest job?'))) {
      const newJobs = jobs.filter(j => j.id !== id);
      handleSaveToCms(newJobs);
    }
  };

  const handleSaveForm = () => {
    if (!editingJob) return;
    if (!editingJob.title.trim()) {
      alert('Titlul este obligatoriu!');
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

    return (
      <div className="bg-surface/50 p-4 rounded-xl border border-border">
        <h3 className="text-lg font-bold mb-4">{jobs.find(j => j.id === editingJob.id) ? 'Editează Job' : 'Adaugă Job Nou'} ({editLang})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">Titlu Job *</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Departament</label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.department} onChange={e => setEditingJob({...editingJob, department: e.target.value})}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Locație</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.location} onChange={e => setEditingJob({...editingJob, location: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tip Contract</label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.contractType} onChange={e => setEditingJob({...editingJob, contractType: e.target.value})}>
              {CONTRACT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Program / Schimburi</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.schedule} onChange={e => setEditingJob({...editingJob, schedule: e.target.value})} placeholder="ex: L-V, 2 schimburi" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Salariu</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.salary} onChange={e => setEditingJob({...editingJob, salary: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Experiență necesară</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.experience} onChange={e => setEditingJob({...editingJob, experience: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Limbi necesare</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.languages} onChange={e => setEditingJob({...editingJob, languages: e.target.value})} placeholder="ex: NL, EN" />
          </div>
        </div>

        {isDriver && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-primary mb-3">Câmpuri pentru Șoferi</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Permis Necesar</label>
                <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.license || ''} onChange={e => setEditingJob({...editingJob, license: e.target.value})} placeholder="ex: C, CE" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tip Camion</label>
                <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.truckType || ''} onChange={e => setEditingJob({...editingJob, truckType: e.target.value})} placeholder="ex: Trekker-oplegger" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Rute</label>
                <input className="w-full px-3 py-2 rounded-lg border border-border bg-card" value={editingJob.routes || ''} onChange={e => setEditingJob({...editingJob, routes: e.target.value})} placeholder="ex: Internațional" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="code95" checked={editingJob.code95 || false} onChange={e => setEditingJob({...editingJob, code95: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="code95" className="text-sm font-medium cursor-pointer">Code 95 Necesar</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="adr" checked={editingJob.adr || false} onChange={e => setEditingJob({...editingJob, adr: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="adr" className="text-sm font-medium cursor-pointer">ADR Necesar</label>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">Responsabilități (HTML permis)</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-card min-h-[80px]" value={editingJob.responsibilities} onChange={e => setEditingJob({...editingJob, responsibilities: e.target.value})} placeholder="Ce va face candidatul?" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Cerințe (HTML permis)</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-card min-h-[80px]" value={editingJob.requirements} onChange={e => setEditingJob({...editingJob, requirements: e.target.value})} placeholder="Ce așteptări ai?" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Beneficii (HTML permis)</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-card min-h-[80px]" value={editingJob.benefits} onChange={e => setEditingJob({...editingJob, benefits: e.target.value})} placeholder="Ce oferi?" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <input type="checkbox" id="isActive" checked={editingJob.isActive} onChange={e => setEditingJob({...editingJob, isActive: e.target.checked})} className="w-5 h-5 rounded text-primary" />
          <label htmlFor="isActive" className="font-semibold cursor-pointer">Job Activ (vizibil pe site)</label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button onClick={() => setEditingJob(null)} className="px-4 py-2 rounded-lg font-medium border border-border hover:bg-surface transition-colors">
            Anulează
          </button>
          <button onClick={handleSaveForm} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Se salvează...' : 'Salvează Job'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-text-secondary whitespace-nowrap">Limba:</label>
          <CustomSelect 
            value={editLang} 
            onChange={val => setEditLang(val)}
            className="w-32 text-sm font-semibold shadow-sm bg-card"
            options={EDIT_LANGS.map(l => ({ value: l, label: l }))}
          />
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          Adaugă Job Nou
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-surface/50 rounded-xl border border-dashed border-border">
          <p className="text-text-secondary">Nu există joburi adăugate pentru limba {editLang}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {jobs.map(job => (
            <div key={job.id} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border hover:border-primary/50 transition-colors">
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  {job.title}
                  {!job.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactiv</span>}
                </h4>
                <p className="text-sm text-text-secondary mt-1">
                  {job.department} • {job.location} • {job.contractType}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(job)} className="p-2 text-text-secondary hover:text-primary transition-colors bg-card rounded-lg border border-border shadow-sm">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(job.id)} className="p-2 text-text-secondary hover:text-red-500 transition-colors bg-card rounded-lg border border-border shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebsiteJobsTab;
