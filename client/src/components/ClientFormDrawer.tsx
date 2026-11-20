import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import DetailDrawer from './ui/DetailDrawer';
import AddressAutocomplete from './AddressAutocomplete';
import CustomSelect from './CustomSelect';

// Every field the client profile shows later can already be entered here, so a
// client is created with its real payment terms instead of database defaults.
export const EMPTY_CLIENT_FORM = {
  name: '',
  cui: '',
  address: '',
  contactName: '',
  contactEmail: '',
  phone: '',
  country: '',
  paymentTermsDays: 30,
  discount: 0,
  defaultFuelSurchargePercent: 0,
  creditLimit: 0,
  currency: 'EUR',
  invoiceLanguage: 'en',
};

interface ClientFormDrawerProps {
  open: boolean;
  form: any;
  setForm: Dispatch<SetStateAction<any>>;
  onClose: () => void;
  onSubmit: () => void;
  editId?: string | null;
  saving?: boolean;
}

/**
 * The create/edit client modal. ClientsPage and the order wizard both open this
 * one drawer, so a client created while taking an order has exactly the fields
 * the clients page offers.
 */
export default function ClientFormDrawer({
  open,
  form,
  setForm,
  onClose,
  onSubmit,
  editId,
  saving,
}: ClientFormDrawerProps) {
  const { t } = useTranslation();

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={editId ? t('editClient') || 'Editează client' : t('addClient')}
      footer={
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('cancel', 'Anulează')}
          </button>
          <button type="button" onClick={onSubmit} disabled={saving} className="btn-primary">
            {t('save', 'Salvează')}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Basic fields */}
        {[{
          key: 'name',
          label: t('name'),
          required: true,
        }, {
          key: 'cui',
          label: t('vat_number', 'VAT / Tax ID'),
        }, {
          key: 'contactName',
          label: t('contact') || 'Contact',
        }, {
          key: 'contactEmail',
          label: t('email') || 'Email contact',
        }, {
          key: 'phone',
          label: t('phone'),
        }].map(f => (
          <div key={f.key}>
            <label className="label font-semibold">{f.label}</label>
            <input
              className="input"
              value={(form as any)[f.key]}
              onChange={e => setForm({
                ...form,
                [f.key]: e.target.value,
              })}
              required={f.required}
            />
          </div>
        ))}

        {/* Address — wider */}
        <div className="md:col-span-2">
          <label className="label font-semibold">{t('address')}</label>
          <AddressAutocomplete
            value={form.address}
            onChange={val => setForm({
              ...form,
              address: val,
            })}
            placeholder="Street, No., Building..."
          />
        </div>

        {/* Commercial terms shown on the client profile and used for invoicing */}
        <div className="md:col-span-2 pt-2 mt-1 border-t border-border">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {t('commercial_terms', 'Commercial terms')}
          </span>
        </div>
        <div>
          <label className="label font-semibold">{t('country', 'Country')}</label>
          <input className="input" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="RO, NL, DE..." />
        </div>
        <div>
          <label className="label font-semibold">{t('paymentTermsDays', 'Payment terms (days)')}</label>
          <input type="number" className="input" value={form.paymentTermsDays ?? 30} onChange={e => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label font-semibold">{t('discount', 'Discount (%)')}</label>
          <input type="number" step="0.1" className="input" value={form.discount ?? 0} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label font-semibold">{t('defaultFuelSurcharge', 'Fuel surcharge (%)')}</label>
          <input type="number" step="0.1" className="input" value={form.defaultFuelSurchargePercent ?? 0} onChange={e => setForm({ ...form, defaultFuelSurchargePercent: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label font-semibold">{t('creditLimitEur', 'Credit limit (€)')}</label>
          <input type="number" className="input" value={form.creditLimit ?? 0} onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label font-semibold">{t('defaultCurrency', 'Default currency')}</label>
          <CustomSelect value={form.currency || 'EUR'} onChange={val => setForm({ ...form, currency: val })} options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'RON', label: 'RON (lei)' }, { value: 'USD', label: 'USD ($)' }, { value: 'GBP', label: 'GBP (£)' }]} />
        </div>
        <div className="md:col-span-2">
          <label className="label font-semibold">{t('preferredInvoiceLanguage', 'Preferred invoice language')}</label>
          <CustomSelect value={form.invoiceLanguage || 'en'} onChange={val => setForm({ ...form, invoiceLanguage: val })} options={[{ value: 'en', label: 'English' }, { value: 'nl', label: 'Dutch' }, { value: 'ro', label: 'Romanian' }, { value: 'de', label: 'German' }, { value: 'fr', label: 'French' }]} />
        </div>
      </form>
    </DetailDrawer>
  );
}
