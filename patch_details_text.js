const fs = require('fs');
const path = require('path');

const idPath = path.join(__dirname, 'web/src/app/cariere/[id]/page.tsx');
let idContent = fs.readFileSync(idPath, 'utf-8');

idContent = idContent.replace(
  '<span className={styles.driverLabel}>Permis Necesar</span>',
  '<span className={styles.driverLabel}>{t("jobDetailsPermis") || "Permis Necesar"}</span>'
);
idContent = idContent.replace(
  '<span className={styles.driverLabel}>Tip Camion</span>',
  '<span className={styles.driverLabel}>{t("jobDetailsTipCamion") || "Tip Camion"}</span>'
);
idContent = idContent.replace(
  '<span className={styles.driverLabel}>Rute</span>',
  '<span className={styles.driverLabel}>{t("jobDetailsRute") || "Rute"}</span>'
);
idContent = idContent.replace(
  '<span className={styles.driverLabel}>Code 95</span>',
  '<span className={styles.driverLabel}>{t("jobDetailsCode95") || "Code 95"}</span>'
);
idContent = idContent.replace(
  "{job.code95 ? 'Da' : 'Nu'}",
  "{job.code95 ? (t('jobDetailsYes') || 'Da') : (t('jobDetailsNo') || 'Nu')}"
);
idContent = idContent.replace(
  '<span className={styles.driverLabel}>ADR</span>',
  '<span className={styles.driverLabel}>{t("jobDetailsADR") || "ADR"}</span>'
);
idContent = idContent.replace(
  "{job.adr ? 'Da' : 'Nu'}",
  "{job.adr ? (t('jobDetailsYes') || 'Da') : (t('jobDetailsNo') || 'Nu')}"
);
idContent = idContent.replace(
  '<h3 className={styles.sectionTitle}>Responsabilități</h3>',
  '<h3 className={styles.sectionTitle}>{t("jobDetailsResp") || "Responsabilități"}</h3>'
);
idContent = idContent.replace(
  '<h3 className={styles.sectionTitle}>Cerințe</h3>',
  '<h3 className={styles.sectionTitle}>{t("jobDetailsReq") || "Cerințe"}</h3>'
);
idContent = idContent.replace(
  '<h3 className={styles.sectionTitle}>Ce oferim (Beneficii)</h3>',
  '<h3 className={styles.sectionTitle}>{t("jobDetailsBen") || "Ce oferim (Beneficii)"}</h3>'
);
idContent = idContent.replace(
  "<h3 className={styles.sectionTitle} style={{ marginBottom: '2rem' }}>Aplică pentru acest job</h3>",
  "<h3 className={styles.sectionTitle} style={{ marginBottom: '2rem' }}>{t('jobDetailsApplyTitle') || 'Aplică pentru acest job'}</h3>"
);
idContent = idContent.replace(
  '<label>Nume complet *</label>',
  '<label>{t("jobDetailsName") || "Nume complet *"}</label>'
);
idContent = idContent.replace(
  'placeholder="Ex: Ion Popescu"',
  'placeholder={t("jobDetailsNamePh") || "Ex: Ion Popescu"}'
);
idContent = idContent.replace(
  '<label>Telefon *</label>',
  '<label>{t("jobDetailsPhone") || "Telefon *"}</label>'
);
idContent = idContent.replace(
  'placeholder="Ex: 07XX XXX XXX"',
  'placeholder={t("jobDetailsPhonePh") || "Ex: 07XX XXX XXX"}'
);
idContent = idContent.replace(
  '<label>Email *</label>',
  '<label>{t("jobDetailsEmail") || "Email *"}</label>'
);
idContent = idContent.replace(
  'placeholder="Ex: ion@email.com"',
  'placeholder={t("jobDetailsEmailPh") || "Ex: ion@email.com"}'
);
idContent = idContent.replace(
  '<label>Experiență în domeniu</label>',
  '<label>{t("jobDetailsExp") || "Experiență în domeniu"}</label>'
);
idContent = idContent.replace(
  'placeholder="Ex: 3 ani / Fără experiență"',
  'placeholder={t("jobDetailsExpPh") || "Ex: 3 ani / Fără experiență"}'
);
idContent = idContent.replace(
  '<label>Mesaj (opțional)</label>',
  '<label>{t("jobDetailsMsg") || "Mesaj (opțional)"}</label>'
);
idContent = idContent.replace(
  'placeholder="Câteva cuvinte despre tine..."',
  'placeholder={t("jobDetailsMsgPh") || "Câteva cuvinte despre tine..."}'
);
idContent = idContent.replace(
  '<label>Upload CV (PDF, DOCX) *</label>',
  '<label>{t("jobDetailsCV") || "Upload CV (PDF, DOCX) *"}</label>'
);
idContent = idContent.replace(
  "<span>{cvFile ? cvFile.name : 'Alege fișierul CV'}</span>",
  "<span>{cvFile ? cvFile.name : (t('jobDetailsCVBtn') || 'Alege fișierul CV')}</span>"
);
idContent = idContent.replace(
  '<label>Alte Documente (Opțional)</label>',
  '<label>{t("jobDetailsDocs") || "Alte Documente (Opțional)"}</label>'
);
idContent = idContent.replace(
  "<span>{docFile ? docFile.name : 'Alege fișier (diplome, atestate)'}</span>",
  "<span>{docFile ? docFile.name : (t('jobDetailsDocsBtn') || 'Alege fișier (diplome, atestate)')}</span>"
);
idContent = idContent.replace(
  "{submitting ? 'Se trimite...' : 'Trimite Aplicația'}",
  "{submitting ? (t('jobDetailsSubmitting') || 'Se trimite...') : (t('jobDetailsSubmit') || 'Trimite Aplicația')}"
);

fs.writeFileSync(idPath, idContent);
console.log('id page updated');
