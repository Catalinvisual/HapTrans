import * as XLSX from 'xlsx';
import { SpreadsheetOrderParser } from '../server/src/trips/spreadsheet-order-parser';

const headers = ['Klant','Vv nr','Vracht autonr','Gepl. af magazijn','Tijd af magazijn','CP ord nummer','Naam','Adres','Postcode','Woonplaats','Ln I2','Telefoon nummer','Geplande leverdatum','Pal Euro','Pal Blok','Pal Ovrg','Colli aantal','Waarvan col.divers','Plt rmt','Bruto gewicht','Volume in m3','Rembours','Rembours waarde','Afleveradres info dl1','Afleveradres info dl2','Faktuur info','Faktuur info','Instructies afzender','V s','Afk Inc','Omschrijving Nederlands','Klant nr'];
const row = ['Koopman international BV','264','683940','25/08/2026','07:01:00','811266','STE ACTION SERVICE & DISTRIBUTION B.V. (FR)','700 AVENUE RENE CASSIN        Z.A.C. LYBERTECH','69220','BELLEVILLE','FR','','24-08-26',33,0,0,'1.753',0,'33,0','7.367,00','44,44','','0,00','!!NO PALLET EXCHANGE - KOOPMAN PAKI ACCOUNT 030533 !!','','29-08 om 06:00 - Laden in Vijn Echt                   PO 4003046039 - ID 2010954','','','G','DDP','Delivered Duty paid','16641'];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, row]), 'Orders');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

const trips = SpreadsheetOrderParser.parse(buf);
console.log('trips:', trips.length);
console.log(JSON.stringify(trips[0], null, 1));
