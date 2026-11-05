// Adds the operational status vocabulary to TMS language blocks that lack it,
// so a status never renders as a raw key. Idempotent.
const fs = require('fs');

const PATH = 'client/src/lib/i18n.ts';

const KEYS = {
  planning: ['Planning', 'Planning', 'Planning', 'Planification', 'Planificación', 'Planowanie'],
  planned: ['Gepland', 'Geplant', 'Planifiée', 'Planificada', 'Zaplanowana'],
  assigned: ['Toegewezen', 'Zugewiesen', 'Assignée', 'Asignada', 'Przydzielona'],
  dispatched: ['Verzonden', 'Disponiert', 'Dépêchée', 'Despachada', 'Wysłana'],
  driver_received: ['Ontvangen', 'Empfangen', 'Reçue', 'Recibida', 'Odebrana'],
  driver_accepted: ['Geaccepteerd', 'Akzeptiert', 'Acceptée', 'Aceptada', 'Zaakceptowana'],
  started: ['Gestart', 'Gestartet', 'Démarrée', 'Iniciada', 'Rozpoczęta'],
  loading: ['Laden', 'Beladung', 'Chargement', 'Cargando', 'Załadunek'],
  driving: ['Rijden', 'Unterwegs', 'En route', 'En ruta', 'W drodze'],
  in_transit: ['Onderweg', 'In Transit', 'En transit', 'En tránsito', 'W tranzycie'],
  partially_delivered: ['Gedeeltelijk geleverd', 'Teilweise geliefert', 'Livraison partielle', 'Entrega parcial', 'Częściowa dostawa'],
  completed: ['Voltooid', 'Abgeschlossen', 'Terminée', 'Finalizada', 'Zakończona'],
  closed: ['Gesloten', 'Geschlossen', 'Clôturée', 'Cerrada', 'Zamknięta'],
  cancelled: ['Geannuleerd', 'Storniert', 'Annulée', 'Cancelada', 'Anulowana'],
};

// language -> index into KEYS arrays
const TARGETS = { nl: 0, de: 1, fr: 2, es: 3, pl: 4 };

const lines = fs.readFileSync(PATH, 'utf8').split(/\r?\n/);
const out = [];
let current = null;
let inserted = 0;
let seen = new Set();
let awaitedFirstKey = false;

for (const line of lines) {
  const start = line.match(/^  (\w\w): \{ translation: \{\s*$/);
  if (start) {
    current = TARGETS[start[1]] !== undefined ? start[1] : null;
    seen = new Set();
    awaitedFirstKey = Boolean(current);
    out.push(line);
    continue;
  }
  if (/^\s*\}\s*,?\s*$/.test(line) && current && line.startsWith('  }')) {
    current = null;
  }
  if (current) {
    const km = line.match(/^\s+"([^"]+)":/);
    if (km) seen.add(km[1]);
  }
  out.push(line);

  if (current && awaitedFirstKey && /^\s+"[^"]+":/.test(line)) {
    awaitedFirstKey = false;
    const idx = TARGETS[current];
    for (const [base, values] of Object.entries(KEYS)) {
      const key = 'status_' + base;
      if (seen.has(key)) continue;
      out.push(`      "${key}": ${JSON.stringify(values[idx])},`);
      seen.add(key);
      inserted += 1;
    }
  }
}

fs.writeFileSync(PATH, out.join('\n'), 'utf8');
console.log('inserted status keys:', inserted);
