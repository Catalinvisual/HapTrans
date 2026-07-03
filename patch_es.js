const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(/(  es: \{ translation: \{)/, `$1\n      jobs_add_new: "Nuevo Trabajo",
      jobs_edit: "Editar Trabajo",
      jobs_title: "Título del Puesto *",
      jobs_department: "Departamento",
      jobs_location: "Ubicación",
      jobs_contract_type: "Tipo de Contrato",
      jobs_schedule: "Horario / Turnos",
      jobs_salary: "Salario",
      jobs_experience: "Experiencia Requerida",
      jobs_languages: "Idiomas Requeridos",
      jobs_driver_fields: "Campos de Conductor",
      jobs_license: "Licencia Requerida",
      jobs_truck_type: "Tipo de Camión",
      jobs_routes: "Rutas",
      jobs_code95: "Código 95 Requerido",
      jobs_adr: "ADR Requerido",
      jobs_responsibilities: "Responsabilidades (HTML permitido)",
      jobs_requirements: "Requisitos (HTML permitido)",
      jobs_benefits: "Beneficios (HTML permitido)",
      jobs_status: "Estado",
      jobs_active: "Activo (Publicado)",
      jobs_inactive: "Inactivo (Oculto)",
      jobs_save: "Guardar",
      jobs_cancel: "Cancelar",
      jobs_no_jobs: "No hay trabajos agregados en este idioma.",
      confirm_delete_job: "¿Estás seguro de que deseas eliminar este trabajo?",
      jobs_title_req: "¡El título es obligatorio!",
`);

fs.writeFileSync(filePath, content);
console.log('Updated Spanish successfully.');
