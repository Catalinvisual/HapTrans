import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FormState {
  tripsForm: any;
  tripsShowForm: boolean;
  tripsEditId: string | null;

  invoicesForm: any;
  invoicesShowForm: boolean;
  invoicesEditId: string | null;

  driversForm: any;
  driversShowForm: boolean;
  driversEditId: string | null;

  trucksForm: any;
  trucksShowForm: boolean;
  trucksEditId: string | null;

  clientsForm: any;
  clientsShowForm: boolean;
  clientsEditId: string | null;

  setFormState: (page: string, data: Partial<{ form: any; showForm: boolean; editId: string | null }>) => void;
  clearAllForms: () => void;
}

export const useFormStore = create<FormState>()(
  persist(
    (set) => ({
      tripsForm: null,
      tripsShowForm: false,
      tripsEditId: null,

      invoicesForm: null,
      invoicesShowForm: false,
      invoicesEditId: null,

      driversForm: null,
      driversShowForm: false,
      driversEditId: null,

      trucksForm: null,
      trucksShowForm: false,
      trucksEditId: null,

      clientsForm: null,
      clientsShowForm: false,
      clientsEditId: null,

      setFormState: (page, data) => set(() => {
        const update: any = {};
        if (data.form !== undefined) update[`${page}Form`] = data.form;
        if (data.showForm !== undefined) update[`${page}ShowForm`] = data.showForm;
        if (data.editId !== undefined) update[`${page}EditId`] = data.editId;
        return update;
      }),

      clearAllForms: () => set({
        tripsForm: null, tripsShowForm: false, tripsEditId: null,
        invoicesForm: null, invoicesShowForm: false, invoicesEditId: null,
        driversForm: null, driversShowForm: false, driversEditId: null,
        trucksForm: null, trucksShowForm: false, trucksEditId: null,
        clientsForm: null, clientsShowForm: false, clientsEditId: null,
      }),
    }),
    { name: 'hapcargo_forms' }
  )
);
