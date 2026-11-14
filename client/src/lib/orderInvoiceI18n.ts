// Messages shown when "create invoice" finds an invoice that already exists for
// the order. Without them the user gets a success toast for an invoice that was
// issued earlier and cannot find it in the register.
export const orderInvoiceResources: Record<string, Record<string, string>> = {
  ro: {
    order_invoice_exists_title: 'Factura există deja',
    order_invoice_exists_message:
      'Factura nr. {{number}} a fost creată deja pentru comanda {{order}} (emisă la {{date}}). Nu s-a generat o factură nouă.',
    order_invoice_draft_refreshed_message:
      'Factura nr. {{number}} exista deja ca ciornă pentru comanda {{order}} și a fost actualizată cu datele comenzii. Numărul rămâne același.',
    order_invoice_open: 'Deschide factura',
    order_invoice_close: 'Închide',
  },
  en: {
    order_invoice_exists_title: 'Invoice already exists',
    order_invoice_exists_message:
      'Invoice {{number}} was already raised for order {{order}} (issued on {{date}}). No new invoice was created.',
    order_invoice_draft_refreshed_message:
      'Invoice {{number}} already existed as a draft for order {{order}} and was updated with the order data. The number stays the same.',
    order_invoice_open: 'Open invoice',
    order_invoice_close: 'Close',
  },
  nl: {
    order_invoice_exists_title: 'Factuur bestaat al',
    order_invoice_exists_message:
      'Factuur {{number}} is al aangemaakt voor order {{order}} (uitgegeven op {{date}}). Er is geen nieuwe factuur gemaakt.',
    order_invoice_draft_refreshed_message:
      'Factuur {{number}} bestond al als concept voor order {{order}} en is bijgewerkt met de ordergegevens. Het nummer blijft hetzelfde.',
    order_invoice_open: 'Factuur openen',
    order_invoice_close: 'Sluiten',
  },
  de: {
    order_invoice_exists_title: 'Rechnung existiert bereits',
    order_invoice_exists_message:
      'Rechnung {{number}} wurde bereits für Auftrag {{order}} erstellt (ausgestellt am {{date}}). Es wurde keine neue Rechnung erzeugt.',
    order_invoice_draft_refreshed_message:
      'Rechnung {{number}} existierte bereits als Entwurf für Auftrag {{order}} und wurde mit den Auftragsdaten aktualisiert. Die Nummer bleibt gleich.',
    order_invoice_open: 'Rechnung öffnen',
    order_invoice_close: 'Schließen',
  },
  fr: {
    order_invoice_exists_title: 'Facture déjà existante',
    order_invoice_exists_message:
      'La facture {{number}} a déjà été créée pour la commande {{order}} (émise le {{date}}). Aucune nouvelle facture n\'a été générée.',
    order_invoice_draft_refreshed_message:
      'La facture {{number}} existait déjà en brouillon pour la commande {{order}} et a été mise à jour avec les données de la commande. Le numéro reste inchangé.',
    order_invoice_open: 'Ouvrir la facture',
    order_invoice_close: 'Fermer',
  },
  es: {
    order_invoice_exists_title: 'La factura ya existe',
    order_invoice_exists_message:
      'La factura {{number}} ya fue creada para el pedido {{order}} (emitida el {{date}}). No se generó una factura nueva.',
    order_invoice_draft_refreshed_message:
      'La factura {{number}} ya existía como borrador para el pedido {{order}} y se actualizó con los datos del pedido. El número no cambia.',
    order_invoice_open: 'Abrir factura',
    order_invoice_close: 'Cerrar',
  },
  pl: {
    order_invoice_exists_title: 'Faktura już istnieje',
    order_invoice_exists_message:
      'Faktura {{number}} została już wystawiona dla zamówienia {{order}} (data wystawienia: {{date}}). Nie utworzono nowej faktury.',
    order_invoice_draft_refreshed_message:
      'Faktura {{number}} istniała już jako szkic dla zamówienia {{order}} i została zaktualizowana danymi zamówienia. Numer pozostaje bez zmian.',
    order_invoice_open: 'Otwórz fakturę',
    order_invoice_close: 'Zamknij',
  },
};
