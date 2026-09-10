const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'mobile/lib/screens');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.dart'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // documents_screen.dart
  if (content.includes("Text('Error: $e')")) {
    content = content.replace(/Text\('Error: \$e'\)/g, "Text({'ro': 'Eroare: $e', 'en': 'Error: $e', 'nl': 'Fout: $e', 'de': 'Fehler: $e', 'fr': 'Erreur: $e'}[locale] ?? 'Error: $e')");
    changed = true;
  }
  if (content.includes("Text('Camera permission is required')")) {
    content = content.replace(/Text\('Camera permission is required'\)/g, "Text({'ro': 'Permisiunea camerei este necesară', 'en': 'Camera permission is required', 'nl': 'Cameratoestemming is vereist', 'de': 'Kameraberechtigung ist erforderlich', 'fr': 'Autorisation caméra requise'}[locale] ?? 'Camera permission is required')");
    changed = true;
  }
  if (content.includes("Text('Scan Error: $e')")) {
    content = content.replace(/Text\('Scan Error: \$e'\)/g, "Text({'ro': 'Eroare scanare: $e', 'en': 'Scan Error: $e', 'nl': 'Scanfout: $e', 'de': 'Scan-Fehler: $e', 'fr': 'Erreur de scan: $e'}[locale] ?? 'Scan Error: $e')");
    changed = true;
  }
  if (content.includes("Text('Upload failed: $e')")) {
    content = content.replace(/Text\('Upload failed: \$e'\)/g, "Text({'ro': 'Încărcare eșuată: $e', 'en': 'Upload failed: $e', 'nl': 'Upload mislukt: $e', 'de': 'Hochladen fehlgeschlagen: $e', 'fr': 'Échec du téléchargement: $e'}[locale] ?? 'Upload failed: $e')");
    changed = true;
  }
  if (content.includes("Text('Download failed: $err')")) {
    content = content.replace(/Text\('Download failed: \$err'\)/g, "Text({'ro': 'Descărcare eșuată: $err', 'en': 'Download failed: $err', 'nl': 'Download mislukt: $err', 'de': 'Download fehlgeschlagen: $err', 'fr': 'Échec du téléchargement: $err'}[locale] ?? 'Download failed: $err')");
    changed = true;
  }
  if (content.includes("Text('Sharing failed: $e')")) {
    content = content.replace(/Text\('Sharing failed: \$e'\)/g, "Text({'ro': 'Partajare eșuată: $e', 'en': 'Sharing failed: $e', 'nl': 'Delen mislukt: $e', 'de': 'Teilen fehlgeschlagen: $e', 'fr': 'Échec du partage: $e'}[locale] ?? 'Sharing failed: $e')");
    changed = true;
  }
  if (content.includes("Text(err)")) {
    // Only in profile_screen when err is caught
    if (file === 'profile_screen.dart') {
        content = content.replace(/Text\(err\)/g, "Text({'ro': 'Eroare: $err', 'en': 'Error: $err', 'nl': 'Fout: $err', 'de': 'Fehler: $err', 'fr': 'Erreur: $err'}[locale] ?? err)");
        changed = true;
    }
  }

  // trips_screen.dart
  if (content.includes("{'ro':'Status actualizat!','en':'Status updated!','nl':'Status bijgewerkt!'}")) {
    content = content.replace(/\{'ro':'Status actualizat!','en':'Status updated!','nl':'Status bijgewerkt!'\}/g, "{'ro':'Status actualizat!','en':'Status updated!','nl':'Status bijgewerkt!','de':'Status aktualisiert!','fr':'Statut mis à jour!'}");
    changed = true;
  }

  // Check for inline map in profile_screen.dart
  if (content.includes("'ro': 'Parola schimbata cu succes!'")) {
    if (!content.includes("'de': 'Passwort erfolgreich geändert!'")) {
        content = content.replace(/'en': 'Password successfully changed!',\n.*'nl': 'Wachtwoord succesvol gewijzigd!'/g, "'en': 'Password successfully changed!',\n                                'nl': 'Wachtwoord succesvol gewijzigd!',\n                                'de': 'Passwort erfolgreich geändert!',\n                                'fr': 'Mot de passe modifié avec succès!'");
        changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
