"""Adds the driver-app operational detail strings to every supported language.

Idempotent: a key already present in a language block is left untouched.
"""
import re
import io

PATH = "mobile/lib/l10n/app_localizations.dart"

KEYS = {
    "section_overview": ["SUMAR CURSĂ", "TRIP OVERVIEW", "RITOVERZICHT", "TOURÜBERSICHT", "APERÇU DU TRAJET", "RESUMEN DEL VIAJE", "PODSUMOWANIE TRASY"],
    "section_order": ["COMENZI", "ORDERS", "OPDRACHTEN", "AUFTRÄGE", "COMMANDES", "PEDIDOS", "ZLECENIA"],
    "section_pickup": ["ÎNCĂRCARE", "PICKUP", "LADEN", "BELADUNG", "CHARGEMENT", "CARGA", "ZAŁADUNEK"],
    "section_delivery": ["DESCĂRCARE", "DELIVERY", "LOSSEN", "ENTLADUNG", "LIVRAISON", "DESCARGA", "ROZŁADUNEK"],
    "section_cargo": ["MARFĂ", "CARGO", "LADING", "LADUNG", "MARCHANDISE", "MERCANCÍA", "ŁADUNEK"],
    "section_documents": ["DOCUMENTE", "DOCUMENTS", "DOCUMENTEN", "DOKUMENTE", "DOCUMENTS", "DOCUMENTOS", "DOKUMENTY"],
    "section_history": ["ISTORIC STATUS", "STATUS HISTORY", "STATUSHISTORIE", "STATUSVERLAUF", "HISTORIQUE DU STATUT", "HISTORIAL DE ESTADO", "HISTORIA STATUSU"],
    "ref_loading": ["Ref. încărcare", "Loading ref.", "Laadreferentie", "Ladereferenz", "Réf. chargement", "Ref. carga", "Ref. załadunku"],
    "ref_unloading": ["Ref. descărcare", "Delivery ref.", "Losreferentie", "Entladereferenz", "Réf. livraison", "Ref. descarga", "Ref. rozładunku"],
    "ref_internal": ["Ref. internă", "Internal ref.", "Interne ref.", "Interne Ref.", "Réf. interne", "Ref. interna", "Ref. wewn."],
    "ref_customer": ["Ref. client", "Customer ref.", "Klantreferentie", "Kundenreferenz", "Réf. client", "Ref. cliente", "Ref. klienta"],
    "planned_window": ["Fereastră planificată", "Planned window", "Gepland tijdvak", "Zeitfenster", "Créneau prévu", "Ventana prevista", "Okno czasowe"],
    "actual_arrival": ["Sosire reală", "Actual arrival", "Werkelijke aankomst", "Tatsächliche Ankunft", "Arrivée réelle", "Llegada real", "Rzeczywiste przybycie"],
    "actual_completion": ["Finalizare reală", "Actual completion", "Werkelijke afronding", "Tatsächlicher Abschluss", "Fin réelle", "Finalización real", "Rzeczywiste zakończenie"],
    "contact_person": ["Persoană de contact", "Contact person", "Contactpersoon", "Ansprechpartner", "Personne de contact", "Persona de contacto", "Osoba kontaktowa"],
    "phone": ["Telefon", "Phone", "Telefoon", "Telefon", "Téléphone", "Teléfono", "Telefon"],
    "cargo_pallets": ["Paleți", "Pallets", "Pallets", "Paletten", "Palettes", "Palelets", "Palety"],
    "cargo_weight": ["Greutate", "Weight", "Gewicht", "Gewicht", "Poids", "Peso", "Waga"],
    "cargo_ldm": ["Metri liniari", "Loading meters", "Laadmeters", "Lademeter", "Mètres linéaires", "Metros lineales", "Metry ładunkowe"],
    "cargo_volume": ["Volum", "Volume", "Volume", "Volumen", "Volume", "Volumen", "Objętość"],
    "cargo_desc": ["Descriere", "Description", "Beschrijving", "Beschreibung", "Description", "Descripción", "Opis"],
    "no_documents": ["Niciun document", "No documents", "Geen documenten", "Keine Dokumente", "Aucun document", "Sin documentos", "Brak dokumentów"],
    "no_history": ["Niciun eveniment încă", "No events yet", "Nog geen gebeurtenissen", "Noch keine Ereignisse", "Aucun événement", "Sin eventos", "Brak zdarzeń"],
    "no_cargo": ["Fără marfă înregistrată", "No cargo recorded", "Geen lading geregistreerd", "Keine Ladung erfasst", "Aucune marchandise", "Sin carga registrada", "Brak ładunku"],
    "updated_from": ["Actualizat", "Updated", "Bijgewerkt", "Aktualisiert", "Mis à jour", "Actualizado", "Zaktualizowano"],
    "action_failed": ["Acțiunea a eșuat", "Action failed", "Actie mislukt", "Aktion fehlgeschlagen", "Action échouée", "Acción fallida", "Akcja nieudana"],
    "action_done": ["Actualizat", "Updated", "Bijgewerkt", "Aktualisiert", "Mis à jour", "Actualizado", "Zaktualizowano"],
    "stop_instructions": ["Instrucțiuni", "Instructions", "Instructies", "Anweisungen", "Instructions", "Instrucciones", "Instrukcje"],
    "ref_stop": ["Referință oprire", "Stop reference", "Stopreferentie", "Stoppreferenz", "Réf. arrêt", "Ref. parada", "Ref. przystanku"],
    "planned_date": ["Data planificată", "Planned date", "Geplande datum", "Geplantes Datum", "Date prévue", "Fecha prevista", "Planowana data"],
    "postal_code": ["Cod poștal", "Postal code", "Postcode", "PLZ", "Code postal", "Código postal", "Kod pocztowy"],
    "country": ["Țară", "Country", "Land", "Land", "Pays", "País", "Kraj"],
    "city": ["Oraș", "City", "Stad", "Stadt", "Ville", "Ciudad", "Miasto"],
    "address": ["Adresă", "Address", "Adres", "Adresse", "Adresse", "Dirección", "Adres"],
    "doc_open_error": ["Documentul nu poate fi deschis", "Document cannot be opened", "Document kan niet worden geopend", "Dokument kann nicht geöffnet werden", "Document impossible à ouvrir", "No se puede abrir el documento", "Nie można otworzyć dokumentu"],
    "btn_refresh": ["Reîncarcă", "Refresh", "Vernieuwen", "Aktualisieren", "Actualiser", "Actualizar", "Odśwież"],
    "trip_reference": ["Cursă", "Trip", "Rit", "Tour", "Trajet", "Viaje", "Trasa"],
    "total_cargo": ["Total marfă", "Total cargo", "Totale lading", "Gesamtladung", "Marchandise totale", "Carga total", "Ładunek ogółem"],
    "order_details": ["Detalii comandă", "Order details", "Opdrachtgegevens", "Auftragsdetails", "Détails de la commande", "Detalles del pedido", "Szczegóły zlecenia"],
}

LANGS = ["ro", "en", "nl", "de", "fr", "es", "pl"]
INDEX = {lang: i for i, lang in enumerate(LANGS)}


def esc(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


with io.open(PATH, "r", encoding="utf-8") as fh:
    lines = fh.readlines()

current = None
out = []
inserted = {lang: 0 for lang in LANGS}
seen = {lang: set() for lang in LANGS}

for line in lines:
    stripped = line.strip()
    m = re.match(r"^'(\w\w)':\s*\{\s*$", stripped)
    if m and m.group(1) in INDEX:
        current = m.group(1)
        out.append(line)
        continue
    if current:
        km = re.match(r"^'([\w]+)':", stripped)
        if km:
            seen[current].add(km.group(1))
        if stripped.startswith("'app_name':"):
            out.append(line)
            idx = INDEX[current]
            for key, values in KEYS.items():
                if key in seen[current]:
                    continue
                out.append("      '%s': '%s',\n" % (key, esc(values[idx])))
                seen[current].add(key)
                inserted[current] += 1
            continue
    out.append(line)

with io.open(PATH, "w", encoding="utf-8", newline="") as fh:
    fh.writelines(out)

print("inserted:", inserted)
