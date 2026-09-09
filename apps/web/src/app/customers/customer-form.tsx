'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Alert,
  AlertDescription,
} from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';
import type { CustomerCategory, CustomerStatus } from './types';

export interface CustomerFormValues {
  code: string;
  legalName: string;
  tradingName?: string;
  vatNumber?: string;
  registrationNumber?: string;
  category: CustomerCategory;
  status: CustomerStatus;
  country?: string;
  city?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  accountManagerId?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currency?: string;
  invoiceEmail?: string;
  defaultService?: string;
  defaultTransportMode?: string;
  notes?: string;
  language?: string;
  timezone?: string;
  invoiceLayoutId?: string;
}

export interface CustomerFormProps {
  initialValues?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => Promise<void> | void;
  submitting?: boolean;
  errorMessage?: string | null;
}

const CATEGORIES: CustomerCategory[] = ['prospect', 'standard', 'premium', 'strategic'];
const STATUSES: CustomerStatus[] = ['active', 'inactive', 'archived'];

export function CustomerForm({ initialValues, onSubmit, submitting, errorMessage }: CustomerFormProps) {
  const { t } = useTranslation(NAMESPACES);
  const [values, setValues] = React.useState<CustomerFormValues>({
    code: '',
    legalName: '',
    tradingName: '',
    vatNumber: '',
    registrationNumber: '',
    category: 'standard',
    status: 'active',
    country: '',
    city: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    accountManagerId: '',
    mainContactName: '',
    mainContactEmail: '',
    mainContactPhone: '',
    paymentTerms: '',
    creditLimit: undefined,
    currency: 'EUR',
    invoiceEmail: '',
    defaultService: '',
    defaultTransportMode: '',
    notes: '',
    language: '',
    timezone: '',
    invoiceLayoutId: '',
    ...initialValues,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!values.code.trim()) next.code = 'required';
    if (!values.legalName.trim()) next.legalName = 'required';
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'invalid';
    if (values.invoiceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.invoiceEmail))
      next.invoiceEmail = 'invalid';
    if (values.mainContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.mainContactEmail))
      next.mainContactEmail = 'invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  };

  const errMsg = (key: string) => {
    if (!errors[key]) return null;
    if (errors[key] === 'required') return t('forms:required');
    if (errors[key] === 'invalid') return t('forms:invalidEmail');
    return errors[key];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('customers:sectionCompany')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">{t('customers:code')} *</Label>
            <Input
              id="code"
              value={values.code}
              onChange={(e) => set('code', e.target.value)}
              required
            />
            {errMsg('code') && <p className="text-xs text-destructive">{errMsg('code')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legalName">{t('customers:legalName')} *</Label>
            <Input
              id="legalName"
              value={values.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              required
            />
            {errMsg('legalName') && <p className="text-xs text-destructive">{errMsg('legalName')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tradingName">{t('customers:tradingName')}</Label>
            <Input
              id="tradingName"
              value={values.tradingName ?? ''}
              onChange={(e) => set('tradingName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vatNumber">{t('customers:vatNumber')}</Label>
            <Input
              id="vatNumber"
              value={values.vatNumber ?? ''}
              onChange={(e) => set('vatNumber', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registrationNumber">{t('customers:registrationNumber')}</Label>
            <Input
              id="registrationNumber"
              value={values.registrationNumber ?? ''}
              onChange={(e) => set('registrationNumber', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">{t('customers:category')}</Label>
            <Select
              value={values.category}
              onValueChange={(v) => set('category', v as CustomerCategory)}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`customers:category${c.charAt(0).toUpperCase() + c.slice(1)}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">{t('customers:status')}</Label>
            <Select
              value={values.status}
              onValueChange={(v) => set('status', v as CustomerStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`customers:status${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">{t('customers:country')}</Label>
            <Input
              id="country"
              value={values.country ?? ''}
              onChange={(e) => set('country', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">{t('customers:city')}</Label>
            <Input
              id="city"
              value={values.city ?? ''}
              onChange={(e) => set('city', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">{t('customers:address')}</Label>
            <Textarea
              id="address"
              value={values.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers:sectionContact')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('customers:email')}</Label>
            <Input
              id="email"
              type="email"
              value={values.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />
            {errMsg('email') && <p className="text-xs text-destructive">{errMsg('email')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t('customers:phone')}</Label>
            <Input
              id="phone"
              value={values.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">{t('customers:website')}</Label>
            <Input
              id="website"
              value={values.website ?? ''}
              onChange={(e) => set('website', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountManagerId">{t('customers:accountManager')}</Label>
            <Input
              id="accountManagerId"
              value={values.accountManagerId ?? ''}
              onChange={(e) => set('accountManagerId', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mainContactName">{t('customers:mainContact')}</Label>
            <Input
              id="mainContactName"
              value={values.mainContactName ?? ''}
              onChange={(e) => set('mainContactName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mainContactEmail">Email</Label>
            <Input
              id="mainContactEmail"
              type="email"
              value={values.mainContactEmail ?? ''}
              onChange={(e) => set('mainContactEmail', e.target.value)}
            />
            {errMsg('mainContactEmail') && (
              <p className="text-xs text-destructive">{errMsg('mainContactEmail')}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mainContactPhone">Phone</Label>
            <Input
              id="mainContactPhone"
              value={values.mainContactPhone ?? ''}
              onChange={(e) => set('mainContactPhone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers:sectionCommercial')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="paymentTerms">{t('customers:paymentTerms')}</Label>
            <Input
              id="paymentTerms"
              value={values.paymentTerms ?? ''}
              onChange={(e) => set('paymentTerms', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="creditLimit">{t('customers:creditLimit')}</Label>
            <Input
              id="creditLimit"
              type="number"
              value={values.creditLimit ?? ''}
              onChange={(e) =>
                set('creditLimit', e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">{t('customers:currency')}</Label>
            <Input
              id="currency"
              value={values.currency ?? 'EUR'}
              onChange={(e) => set('currency', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoiceEmail">{t('customers:invoiceEmail')}</Label>
            <Input
              id="invoiceEmail"
              type="email"
              value={values.invoiceEmail ?? ''}
              onChange={(e) => set('invoiceEmail', e.target.value)}
            />
            {errMsg('invoiceEmail') && (
              <p className="text-xs text-destructive">{errMsg('invoiceEmail')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers:sectionOperational')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="defaultService">{t('customers:defaultService')}</Label>
            <Input
              id="defaultService"
              value={values.defaultService ?? ''}
              onChange={(e) => set('defaultService', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultTransportMode">{t('customers:defaultMode')}</Label>
            <Input
              id="defaultTransportMode"
              value={values.defaultTransportMode ?? ''}
              onChange={(e) => set('defaultTransportMode', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="notes">{t('customers:notes')}</Label>
            <Textarea
              id="notes"
              rows={3}
              value={values.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers:sectionPreferences')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="language">{t('customers:language')}</Label>
            <Input
              id="language"
              value={values.language ?? ''}
              onChange={(e) => set('language', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">{t('customers:timezone')}</Label>
            <Input
              id="timezone"
              value={values.timezone ?? ''}
              onChange={(e) => set('timezone', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoiceLayoutId">{t('customers:invoiceLayout')}</Label>
            <Input
              id="invoiceLayoutId"
              value={values.invoiceLayoutId ?? ''}
              onChange={(e) => set('invoiceLayoutId', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {t('common:save')}
        </Button>
      </div>
    </form>
  );
}

