$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot "..\Saas HapTrans\client\src\lib\i18n.ts"
$content = [System.IO.File]::ReadAllText($path)

$langBlocks = @(
@'
all_statuses: "Toate statusurile",
all_clients: "Toți clienții",
all_countries: "Toate țările",
all_types: "Toate tipurile",
all_priorities: "Toate prioritățile",
all_trucks: "Toate camioanele",
all_drivers: "Toți șoferii",
search_trips: "Caută cursă, camion, șofer, oraș…",
search_trucks: "Caută camion, șofer…",
filter_all_statuses: "Toate statusurile",
jsx_allVehicles: "Toate camioanele",
jsx_allDrivers: "Toți șoferii",
status_all: "Toate",
export_csv: "Exportă CSV",
go_to_planning: "Tablou de bord",
expiry_date: "Data expirării (ZZ/LL/AAAA)",
results: "rezultate",
date_format_hint: "ZZ/LL/AAAA",
'@
@'
all_statuses: "All statuses",
all_clients: "All clients",
all_countries: "All countries",
all_types: "All types",
all_priorities: "All priorities",
all_trucks: "All trucks",
all_drivers: "All drivers",
search_trips: "Search trip, truck, driver, city...",
search_trucks: "Search truck, driver...",
filter_all_statuses: "All statuses",
jsx_allVehicles: "All Trucks",
jsx_allDrivers: "All Drivers",
export_csv: "Export CSV",
go_to_planning: "Dispatch board",
expiry_date: "Expiry Date (DD/MM/YYYY)",
results: "results",
date_format_hint: "DD/MM/YYYY",
'@
@'
all_statuses: "Alle statussen",
all_clients: "Alle klanten",
all_countries: "Alle landen",
all_types: "Alle typen",
all_priorities: "Alle prioriteiten",
all_trucks: "Alle vrachtwagens",
all_drivers: "Alle chauffeurs",
search_trips: "Zoek rit, vrachtwagen, chauffeur, stad...",
search_trucks: "Zoek vrachtwagen, chauffeur...",
filter_all_statuses: "Alle statussen",
jsx_allVehicles: "Alle vrachtwagens",
jsx_allDrivers: "Alle chauffeurs",
export_csv: "CSV exporteren",
go_to_planning: "Dispatchbord",
expiry_date: "Vervaldatum (DD/MM/JJJJ)",
results: "resultaten",
date_format_hint: "DD/MM/JJJJ",
'@
@'
all_statuses: "Alle Status",
all_clients: "Alle Kunden",
all_countries: "Alle Länder",
all_types: "Alle Typen",
all_priorities: "Alle Prioritäten",
all_trucks: "Alle LKW",
all_drivers: "Alle Fahrer",
search_trips: "Fahrt, LKW, Fahrer, Stadt suchen...",
search_trucks: "LKW, Fahrer suchen...",
filter_all_statuses: "Alle Status",
jsx_allVehicles: "Alle LKW",
jsx_allDrivers: "Alle Fahrer",
export_csv: "CSV exportieren",
go_to_planning: "Dispatch-Board",
expiry_date: "Ablaufdatum (TT.MM.JJJJ)",
results: "Ergebnisse",
date_format_hint: "TT.MM.JJJJ",
'@
@'
all_statuses: "Tous les statuts",
all_clients: "Tous les clients",
all_countries: "Tous les pays",
all_types: "Tous les types",
all_priorities: "Toutes les priorités",
all_trucks: "Tous les camions",
all_drivers: "Tous les chauffeurs",
search_trips: "Rechercher trajet, camion, chauffeur, ville...",
search_trucks: "Rechercher camion, chauffeur...",
filter_all_statuses: "Tous les statuts",
jsx_allVehicles: "Tous les camions",
jsx_allDrivers: "Tous les chauffeurs",
status_all: "Tous",
export_csv: "Exporter CSV",
go_to_planning: "Tableau de dispatch",
expiry_date: "Date d''expiration (JJ/MM/AAAA)",
results: "résultats",
date_format_hint: "JJ/MM/AAAA",
'@
)

# Anchor: the fin_last30d line appears exactly once per language block (order ro,en,nl,de,fr)
$pattern = '(?m)^([ \t]*)"fin_last30d":.*?\r?\n'
$ms = [regex]::Matches($content, $pattern)
if ($ms.Count -ne 5) { throw "Expected 5 'fin_last30d' anchors, found $($ms.Count)" }

for ($i = $ms.Count - 1; $i -ge 0; $i--) {
    $indent = $ms[$i].Groups[1].Value
    $lines = ($langBlocks[$i] -split "`n") | Where-Object { $_.Trim() } | ForEach-Object { $indent + $_.TrimEnd() }
    $block = (($lines -join "`r`n")) + "`r`n"
    $pos = $ms[$i].Index
    $content = $content.Substring(0, $pos) + $block + $content.Substring($pos)
}

[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Inserted filter/search keys into 5 languages."
