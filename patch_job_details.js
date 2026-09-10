const fs = require('fs');
const path = require('path');

const ctxPath = path.join(__dirname, 'web/src/context/LanguageContext.tsx');
let ctxContent = fs.readFileSync(ctxPath, 'utf-8');

const newTranslations = `
    jobDetailsPermis: { RO: 'Permis Necesar', EN: 'Required License', NL: 'Rijbewijs Vereist', DE: 'Erforderlicher Führerschein', FR: 'Permis Requis', ES: 'Licencia Requerida' },
    jobDetailsTipCamion: { RO: 'Tip Camion', EN: 'Truck Type', NL: 'Type Vrachtwagen', DE: 'LKW-Typ', FR: 'Type de Camion', ES: 'Tipo de Camión' },
    jobDetailsRute: { RO: 'Rute', EN: 'Routes', NL: 'Routes', DE: 'Routen', FR: 'Itinéraires', ES: 'Rutas' },
    jobDetailsCode95: { RO: 'Code 95', EN: 'Code 95', NL: 'Code 95', DE: 'Code 95', FR: 'Code 95', ES: 'Code 95' },
    jobDetailsADR: { RO: 'ADR', EN: 'ADR', NL: 'ADR', DE: 'ADR', FR: 'ADR', ES: 'ADR' },
    jobDetailsYes: { RO: 'Da', EN: 'Yes', NL: 'Ja', DE: 'Ja', FR: 'Oui', ES: 'Sí' },
    jobDetailsNo: { RO: 'Nu', EN: 'No', NL: 'Nee', DE: 'Nein', FR: 'Non', ES: 'No' },
    jobDetailsResp: { RO: 'Responsabilități', EN: 'Responsibilities', NL: 'Verantwoordelijkheden', DE: 'Verantwortlichkeiten', FR: 'Responsabilités', ES: 'Responsabilidades' },
    jobDetailsReq: { RO: 'Cerințe', EN: 'Requirements', NL: 'Vereisten', DE: 'Anforderungen', FR: 'Exigences', ES: 'Requisitos' },
    jobDetailsBen: { RO: 'Ce oferim (Beneficii)', EN: 'What we offer (Benefits)', NL: 'Wat wij bieden (Voordelen)', DE: 'Was wir bieten (Vorteile)', FR: 'Ce que nous offrons (Avantages)', ES: 'Qué ofrecemos (Beneficios)' },
    jobDetailsApplyTitle: { RO: 'Aplică pentru acest job', EN: 'Apply for this job', NL: 'Solliciteer op deze vacature', DE: 'Bewerben Sie sich für diesen Job', FR: 'Postuler pour cet emploi', ES: 'Solicitar este empleo' },
    jobDetailsName: { RO: 'Nume complet *', EN: 'Full Name *', NL: 'Volledige naam *', DE: 'Vollständiger Name *', FR: 'Nom complet *', ES: 'Nombre completo *' },
    jobDetailsNamePh: { RO: 'Ex: Ion Popescu', EN: 'E.g.: John Doe', NL: 'Bijv.: Jan Jansen', DE: 'Z.B.: Max Mustermann', FR: 'Ex: Jean Dupont', ES: 'Ej: Juan Pérez' },
    jobDetailsPhone: { RO: 'Telefon *', EN: 'Phone *', NL: 'Telefoon *', DE: 'Telefon *', FR: 'Téléphone *', ES: 'Teléfono *' },
    jobDetailsPhonePh: { RO: 'Ex: 07XX XXX XXX', EN: 'E.g.: +44 XXX XXX', NL: 'Bijv.: 06XX XXX XXX', DE: 'Z.B.: +49 XXX XXX', FR: 'Ex: 06XX XXX XXX', ES: 'Ej: +34 XXX XXX' },
    jobDetailsEmail: { RO: 'Email *', EN: 'Email *', NL: 'E-mail *', DE: 'E-Mail *', FR: 'E-mail *', ES: 'Correo electrónico *' },
    jobDetailsEmailPh: { RO: 'Ex: ion@email.com', EN: 'E.g.: john@email.com', NL: 'Bijv.: jan@email.com', DE: 'Z.B.: max@email.com', FR: 'Ex: jean@email.com', ES: 'Ej: juan@email.com' },
    jobDetailsExp: { RO: 'Experiență în domeniu', EN: 'Experience in the field', NL: 'Ervaring in het veld', DE: 'Erfahrung im Bereich', FR: 'Expérience dans le domaine', ES: 'Experiencia en el campo' },
    jobDetailsExpPh: { RO: 'Ex: 3 ani / Fără experiență', EN: 'E.g.: 3 years / No experience', NL: 'Bijv.: 3 jaar / Geen ervaring', DE: 'Z.B.: 3 Jahre / Keine Erfahrung', FR: 'Ex: 3 ans / Sans expérience', ES: 'Ej: 3 años / Sin experiencia' },
    jobDetailsMsg: { RO: 'Mesaj (opțional)', EN: 'Message (optional)', NL: 'Bericht (optioneel)', DE: 'Nachricht (optional)', FR: 'Message (optionnel)', ES: 'Mensaje (opcional)' },
    jobDetailsMsgPh: { RO: 'Câteva cuvinte despre tine...', EN: 'A few words about yourself...', NL: 'Een paar woorden over jezelf...', DE: 'Ein paar Worte über dich...', FR: 'Quelques mots sur vous...', ES: 'Unas palabras sobre ti...' },
    jobDetailsCV: { RO: 'Upload CV (PDF, DOCX) *', EN: 'Upload CV (PDF, DOCX) *', NL: 'CV Uploaden (PDF, DOCX) *', DE: 'Lebenslauf hochladen (PDF, DOCX) *', FR: 'Télécharger le CV (PDF, DOCX) *', ES: 'Subir CV (PDF, DOCX) *' },
    jobDetailsCVBtn: { RO: 'Alege fișierul CV', EN: 'Choose CV file', NL: 'Kies CV bestand', DE: 'Lebenslaufdatei auswählen', FR: 'Choisir le fichier CV', ES: 'Elegir archivo CV' },
    jobDetailsDocs: { RO: 'Alte Documente (Opțional)', EN: 'Other Documents (Optional)', NL: 'Andere Documenten (Optioneel)', DE: 'Weitere Dokumente (Optional)', FR: 'Autres documents (Optionnel)', ES: 'Otros documentos (Opcional)' },
    jobDetailsDocsBtn: { RO: 'Alege fișier (diplome, atestate)', EN: 'Choose file (diplomas, certificates)', NL: 'Kies bestand (diploma\\'s, certificaten)', DE: 'Datei auswählen (Diplome, Zertifikate)', FR: 'Choisir un fichier (diplômes, certificats)', ES: 'Elegir archivo (diplomas, certificados)' },
    jobDetailsSubmit: { RO: 'Trimite Aplicația', EN: 'Submit Application', NL: 'Sollicitatie Verzenden', DE: 'Bewerbung einreichen', FR: 'Soumettre la candidature', ES: 'Enviar Solicitud' },
    jobDetailsSubmitting: { RO: 'Se trimite...', EN: 'Submitting...', NL: 'Verzenden...', DE: 'Einreichen...', FR: 'Envoi en cours...', ES: 'Enviando...' },
`;

ctxContent = ctxContent.replace(/(noJobsDesc: \{.*\},\s*)/, `$1${newTranslations}`);
fs.writeFileSync(ctxPath, ctxContent);
console.log('Language context updated.');

const careersCssPath = path.join(__dirname, 'web/src/app/cariere/Careers.module.css');
let careersCss = fs.readFileSync(careersCssPath, 'utf-8');
careersCss = careersCss.replace(/background: rgba\\(15, 23, 42, 0\\.4\\);/g, 'background: #0f172a;');
fs.writeFileSync(careersCssPath, careersCss);

const detailsCssPath = path.join(__dirname, 'web/src/app/cariere/[id]/JobDetails.module.css');
let detailsCss = fs.readFileSync(detailsCssPath, 'utf-8');
detailsCss = detailsCss.replace(/background: rgba\\(15, 23, 42, 0\\.4\\);/, 'background: #0f172a;');
detailsCss = detailsCss.replace(/border-radius: 2rem;/, 'border-radius: 2.5rem 0.5rem 2.5rem 0.5rem;');
fs.writeFileSync(detailsCssPath, detailsCss);
console.log('CSS updated.');
