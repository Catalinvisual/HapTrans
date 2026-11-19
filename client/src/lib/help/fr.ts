import type { HelpLocaleText } from "./types";

export const fr: HelpLocaleText = {
  ui: {
    guide_title: "Aide & guide",
    guide_subtitle: "Tout ce qu’il faut apprendre sur HapCargo, chapitre par chapitre",
    guide_search: "Rechercher dans le guide : page, fonction, statut…",
    guide_no_results: "Aucun chapitre ne correspond à cette recherche.",
    guide_clear: "Effacer la recherche",
    guide_categories: "Catégories",
    guide_chapters: "chapitres",
    guide_quick_start: "Nouveau ? Suivez ces trois étapes",
    guide_continue: "Continuer la lecture",
    guide_progress: "Progression du guide",
    guide_mark_read: "Marquer comme lu",
    guide_read: "Lu",
    guide_open_page: "Ouvrir cette page",
    guide_print: "Imprimer le chapitre",
    guide_prev: "Précédent",
    guide_next: "Suivant",
    guide_in_chapter: "Dans ce chapitre",
    guide_tip: "Bon à savoir",
    guide_warning: "Attention",
    guide_steps: "Étape par étape",
    guide_fields: "Options clés",
    guide_results: "résultats",
    guide_all: "Tous les chapitres",
    guide_back: "Retour à l’aperçu",
    guide_chapter: "Chapitre",
    guide_minutes: "min de lecture",
    guide_shortcut_hint: "Astuce : appuyez sur ? partout pour voir les raccourcis clavier.",
    guide_read_chapters: "chapitres lus",
    guide_reset: "Réinitialiser la progression",
    guide_start_here: "Commencer ici",
    guide_open_menu: "Ouvrir le menu des chapitres",
    guide_close_menu: "Fermer le menu des chapitres",
    guide_language_note: "Ce guide est rédigé dans les sept langues de l’application et suit la langue choisie dans la barre supérieure.",
    guide_updated: "Dernière vérification par rapport à la version actuelle du TMS.",
    guide_search_results: "Résultats de recherche",
  },
  categories: {
    start: {
      title: "Premiers pas",
      summary: "L’interface, le flux quotidien et les habitudes qui rendent tout le reste plus rapide.",
    },
    operations: {
      title: "Opérations quotidiennes",
      summary: "Commandes, trajets, planification, suivi en direct, chat et documents — le cœur du TMS.",
    },
    fleet: {
      title: "Flotte & chauffeurs",
      summary: "Camions, remorques, chauffeurs, maintenance, télématique et tachygraphe.",
    },
    finance: {
      title: "Finance",
      summary: "Factures, paiements, dépenses, paie, règlements, analyses et rapports.",
    },
    commercial: {
      title: "Commercial & conformité",
      summary: "Clients, site web, demandes de devis, transit UE et portail client.",
    },
    admin: {
      title: "Administration",
      summary: "Utilisateurs, rôles, droits, données de l’entreprise, tarifs et connexions.",
    },
    assist: {
      title: "Aide & dépannage",
      summary: "Que faire quand quelque chose bloque, plus un glossaire de chaque terme.",
    },
  },
  chapters: {
    welcome: {
      title: "L’écran en un coup d’œil",
      summary: "Ce qui se trouve où dans HapCargo et les commandes que vous utiliserez chaque jour.",
      blocks: [
        {
          kind: "diagram",
          variant: "layout",
          title: "Anatomie de chaque écran",
          callouts: [
            "Barre latérale — les modules que votre rôle peut ouvrir.",
            "Titre de page et onglets de module (Commandes / Devis, Camions / Remorques, Paie / Règlements).",
            "Recherche globale — trouvez toute page, commande, trajet, client ou facture avec Ctrl+K.",
            "Aide & guide — cette page, avec chaque fonction expliquée.",
            "Raccourcis clavier — appuyez sur ? pour le même panneau.",
            "Thème clair / sombre de l’espace de travail.",
            "Notifications — changements de statut, documents expirant, messages et risques de retard.",
            "Sélecteur de langue et menu de profil (installer, se déconnecter, se déconnecter partout).",
          ],
        },
        {
          kind: "p",
          text: "HapCargo est le système de gestion du transport (TMS) de l’entreprise : commandes commerciales, planification, trajets, flotte, chauffeurs, documents, facturation et rapports au même endroit. La barre latérale est construite selon votre rôle : deux collègues peuvent donc voir des modules différents.",
        },
        { kind: "h", text: "Ce que vous pouvez faire ici" },
        {
          kind: "list",
          items: [
            "Passer d’un module à l’autre depuis la barre latérale ; la replier avec la flèche sur son bord.",
            "Changer la langue à tout moment — le choix est enregistré dans votre navigateur.",
            "Chercher globalement avec Ctrl+K, ou appuyer sur / pour aller dans la recherche de la page.",
            "Appuyer sur N sur une page de liste pour créer un enregistrement et sur ? pour tous les raccourcis.",
            "Installer le TMS comme application de bureau (PWA) depuis l’icône de téléchargement ou le menu de profil.",
            "Lire ce guide dans les sept langues ; chaque chapitre renvoie à la page qu’il explique.",
          ],
        },
        { kind: "h", text: "Vos dix premières minutes" },
        {
          kind: "steps",
          items: [
            "Vérifiez votre nom et votre rôle en haut à droite — ils décident de ce que vous pouvez ouvrir.",
            "Choisissez votre langue dans la barre supérieure.",
            "Ouvrez le Tableau de bord et choisissez la période qui vous intéresse (jour, semaine, mois).",
            "Utilisez Ctrl+K pour trouver une vraie commande ou un client et l’ouvrir ; c’est le moyen le plus rapide d’apprendre la disposition.",
            "Revenez à ce guide depuis l’icône livre dès qu’un écran n’est pas clair.",
          ],
        },
        {
          kind: "tip",
          text: "Le TMS mémorise les filtres, la taille de page et votre dernière vue lorsque vous naviguez. Installé en PWA, il affiche aussi hors ligne les pages déjà visitées.",
        },
        {
          kind: "warn",
          text: "Un module absent de la barre latérale est un droit, pas un bug. Un administrateur doit ajouter cette page à votre compte dans Utilisateurs & rôles.",
        },
      ],
    },
    "first-day": {
      title: "Un transport de bout en bout",
      summary: "La vie normale d’une opération : de la demande client à l’argent sur le compte.",
      blocks: [
        {
          kind: "p",
          text: "Presque chaque tâche du TMS appartient à une même chaîne. Apprenez-la une fois et vous saurez toujours où vous êtes et ce qui vient ensuite.",
        },
        {
          kind: "diagram",
          variant: "flow",
          title: "La chaîne opérationnelle",
          callouts: [
            "Commande — ce que le client demande : itinéraire, dates, marchandise, prix.",
            "Planification — la position faisable la moins chère de cette commande sur un camion.",
            "Trajet — le tour exécutable avec arrêts, ETA, chauffeur et documents.",
            "Documents — CMR, POD, photos et tout ce dont le client ou le bureau a besoin.",
            "Facture — émise depuis la commande ou le trajet livré, avec numérotation automatique.",
            "Paiement — enregistré sur la facture ; rapports et vieillissement suivent automatiquement.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Un administrateur complète les données de l’entreprise, les coordonnées bancaires et les tarifs dans Paramètres.",
            "Ajoutez le client, puis le camion, la remorque et le chauffeur dans Flotte et Chauffeurs.",
            "Créez la commande dans Commandes avec l’assistant en trois étapes.",
            "Ouvrez la Planification, affectez la commande au camion faisable le moins cher et confirmez.",
            "Le chauffeur exécute le trajet depuis l’application mobile ; le bureau le suit sur la Carte en direct et dans le Chat.",
            "Téléversez le CMR/POD dans Documents et rattachez-le au trajet.",
            "Émettez la facture, enregistrez le paiement et clôturez le mois dans Paie et Rapports.",
          ],
        },
        {
          kind: "tip",
          text: "La configuration se fait une fois et sert partout : les données de l’entreprise figurent sur les PDF, les dimensions de la flotte décident de ce que la planification peut charger et les tarifs alimentent le calculateur.",
        },
        {
          kind: "warn",
          text: "La planification n’invente jamais de données. Si un camion n’a pas de dimensions intérieures, si l’itinéraire manque ou si le chauffeur n’a pas d’enregistrements tachygraphe, le système affiche NON VÉRIFIÉ au lieu de deviner.",
        },
      ],
    },
    orders: {
      title: "Commandes — de la demande à la livraison",
      summary: "Créer, modifier, filtrer et facturer des transports avec l’assistant en trois étapes.",
      blocks: [
        {
          kind: "p",
          text: "Commandes est le point d’entrée commercial. Chaque commande contient le client, le prix, les fenêtres de chargement et de livraison, la marchandise et plus tard le lien vers le trajet et la facture. Les demandes de devis se trouvent dans l’onglet voisin si votre rôle le permet.",
        },
        {
          kind: "diagram",
          variant: "wizard",
          title: "L’assistant de commande",
          callouts: [
            "Trois étapes : Infos générales, Chargement & Livraison, Lignes de marchandise.",
            "Général — client, prix convenu, devise, type de transport, équipement et priorité.",
            "Itinéraire — adresses avec autocomplétion, dates, fenêtres horaires, contacts et références.",
            "Marchandise — description, palettes/quantité, poids en kg, mètres linéaires et volume.",
            "Enregistrer — le système valide la commande et la rend disponible à la planification.",
          ],
        },
        { kind: "h", text: "Ce que vous pouvez faire ici" },
        {
          kind: "list",
          items: [
            "Rechercher et filtrer par statut, client, pays, type de transport, priorité et date.",
            "Ouvrir une ligne pour la fiche commande, ou la modifier depuis les actions de la ligne.",
            "Dupliquer une commande pour une liaison récurrente, supprimer ou archiver ce qui n’est plus utile.",
            "Exporter la liste filtrée en Excel, CSV ou PDF, ou importer des commandes depuis Excel / un document lu par IA.",
            "Générer la facture depuis la commande une fois livrée ; le lien est conservé pour l’audit.",
            "Sélectionner plusieurs lignes pour les exporter ou les supprimer en une action.",
          ],
        },
        { kind: "h", text: "Les trois étapes de l’assistant" },
        {
          kind: "table",
          head: ["Étape", "Ce que vous remplissez"],
          rows: [
            ["Infos générales", "Client, prix et devise, type de transport, équipement, priorité, notes."],
            ["Chargement & livraison", "Adresse, date, fenêtre horaire, contact, téléphone, références de chargement/déchargement."],
            ["Lignes de marchandise", "Description, quantité/palettes, poids (kg), LDM, volume (m³), détails ADR si besoin."],
          ],
        },
        { kind: "h", text: "Les champs qui décident de tout ensuite" },
        {
          kind: "list",
          items: [
            "Prix et devise — le bénéfice, la marge et les rapports en découlent.",
            "Poids et palettes — la planification les compare à la capacité du camion et de la remorque.",
            "LDM et m³ — utilisés quand le camion est limité par les mètres linéaires ou le volume, pas seulement le poids.",
            "ADR — signale les marchandises dangereuses et affiche le badge partout où la commande apparaît.",
            "Fenêtres horaires — la planification et les ETA les respectent ; une fenêtre manquée est un conflit dur.",
          ],
        },
        {
          kind: "tip",
          text: "Tapez une ville et choisissez la suggestion : l’adresse est géocodée, ce qui rend possibles l’itinéraire, les ETA et la carte en direct. Une adresse libre sans coordonnées ne peut pas être routée.",
        },
        {
          kind: "warn",
          text: "Le chargement et la livraison ne peuvent pas être à la même adresse dans une commande. Une marchandise au-delà de la capacité du camion affecté n’est pas bloquée à la création, mais la planification refusera la confirmation.",
        },
      ],
    },
    trips: {
      title: "Trajets — exécution et suivi",
      summary: "Suivez ce qui roule, qui conduit, ce que cela coûte et ce qui a été livré.",
      blocks: [
        {
          kind: "p",
          text: "Un trajet est la partie exécutable d’une ou plusieurs commandes : un camion, une remorque, un chauffeur, une liste ordonnée d’arrêts et un horaire. Les trajets naissent dans la Planification, puis sont mis à jour par l’application chauffeur et le bureau.",
        },
        { kind: "h", text: "La liste" },
        {
          kind: "list",
          items: [
            "Bandeau d’indicateurs avec trajets actifs, planifiés, retardés et terminés, plus chiffre d’affaires et bénéfice.",
            "Filtres par statut, camion, chauffeur et date, avec recherche sur numéro de trajet, plaque, chauffeur et ville.",
            "Colonnes triables pour départ, distance, poids, chiffre d’affaires, coût et bénéfice.",
            "Sélection multiple pour export ou suppression, et un PDF de profil par trajet.",
            "Actualisation en direct lorsqu’un chauffeur change un statut ou signale un incident.",
          ],
        },
        { kind: "h", text: "Dans la fiche trajet" },
        {
          kind: "list",
          items: [
            "Résumé : statut, camion, remorque, chauffeur, chiffre d’affaires, coût estimé et bénéfice.",
            "Itinéraire et arrêts dans l’ordre, avec arrivée/départ, ETA et état de la fenêtre.",
            "Marchandise à bord : poids, palettes, LDM et volume par rapport aux limites enregistrées.",
            "Documents et historique d’activité — chaque changement de statut est conservé avec l’heure et l’auteur.",
            "Liens vers les commandes, le tableau de planification et la carte en direct.",
          ],
        },
        { kind: "h", text: "Statuts principaux" },
        {
          kind: "list",
          items: [
            "PLANNING / ACCEPTED — créé, en attente du démarrage par le chauffeur.",
            "EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — la séquence de chargement.",
            "EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — la séquence de livraison.",
            "COMPLETED — livré et clôturé ; DELAYED / EXCEPTION — demande attention.",
            "DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — issues de livraison qui influencent la facturation.",
            "CANCELLED — le trajet est annulé ; les commandes peuvent être replanifiées.",
          ],
        },
        {
          kind: "tip",
          text: "Ouvrez le trajet depuis la commande, ou la commande depuis le trajet : les deux vues pointent toujours l’une vers l’autre, le contexte commercial n’est jamais perdu.",
        },
        {
          kind: "warn",
          text: "Ne supprimez pas un trajet qui porte encore des documents ou une facture. Clôturez-le en CANCELLED ou COMPLETED pour que l’audit et le portail client restent corrects.",
        },
      ],
    },
    planning: {
      title: "Planification — le tableau et ses outils",
      summary: "Affecter les commandes au camion faisable le moins cher, résoudre les conflits et confirmer un vrai horaire.",
      blocks: [
        {
          kind: "p",
          text: "La planification est le cockpit du dispatching : commandes non affectées d’un côté, tableau de flotte de l’autre. Le tableau montre camions et jours, la timeline montre les heures, et chaque affectation est validée par le backend avant toute écriture.",
        },
        { kind: "h", text: "Façons de planifier" },
        {
          kind: "list",
          items: [
            "Glissez une commande non affectée sur une cellule camion/jour, ou ouvrez-la et choisissez un camion.",
            "Utilisez la timeline pour les heures, pauses, repos quotidien et trajets qui se chevauchent.",
            "Utilisez la consolidation intelligente pour la position d’insertion faisable la moins chère dans un trajet existant.",
            "Enregistrez une vue (filtres, zoom, disposition) et revenez-y plus tard.",
            "Comparez des scénarios avant de confirmer, et annulez la dernière modification confirmée si besoin.",
            "Imprimez ou exportez le tableau pour la réunion du matin.",
          ],
        },
        { kind: "h", text: "Outils de la barre" },
        {
          kind: "table",
          head: ["Outil", "Quand l’utiliser"],
          rows: [
            ["Consolidation intelligente", "Ajouter une commande à un trajet existant ; montre l’ordre d’arrêt recommandé et les alternatives avec les km ajoutés réels."],
            ["Scinder / Combiner des trajets", "Un trajet est trop long, ou deux trajets peuvent rouler ensemble."],
            ["Cross-dock / Drop & hook", "Échanger remorque ou marchandise dans un hub sans livraison complète."],
            ["Sous-traitant", "Confier un segment à un partenaire en gardant la commande client dans le TMS."],
            ["Optimisation de flotte", "Le système propose le meilleur camion pour un ensemble de commandes."],
            ["Comparaison d’itinéraires", "Comparer fournisseurs, distance, péages et temps avant de choisir."],
            ["Incidents de trafic", "Voir les perturbations en direct qui touchent le plan du jour."],
            ["Palette de commandes", "Lancer une action de planification au clavier sans chercher le bouton."],
          ],
        },
        { kind: "h", text: "Confirmer une consolidation" },
        {
          kind: "steps",
          items: [
            "Sélectionnez les commandes à ajouter et ouvrez l’assistant.",
            "Lisez le verdict : faisable, avertissement ou bloqué ; bloqué ne peut pas être forcé.",
            "Choisissez l’ordre d’arrêt recommandé ou une alternative ; chacun montre sa distance ajoutée et son ETA.",
            "Vérifiez la marchandise contre la capacité, la compatibilité de l’équipement, les fenêtres et les heures chauffeur.",
            "S’il reste un avertissement, saisissez le motif de dérogation — il est enregistré avec votre nom dans l’audit.",
            "Confirmez une fois. L’écriture est transactionnelle et idempotente : un nouvel essai ne crée pas un second trajet.",
          ],
        },
        {
          kind: "tip",
          text: "Le verdict est l’unique source de vérité. L’écran affiche exactement ce que le backend a décidé — jamais une version plus arrangeante.",
        },
        {
          kind: "warn",
          text: "Les conflits durs arrêtent la confirmation : fenêtre manquée, surcharge/trop de palettes, chevauchement camion/remorque/chauffeur, équipement obligatoire manquant. Réparez les données ou le plan ; ne contournez jamais un vrai blocage.",
        },
      ],
    },
    "map-chat": {
      title: "Carte en direct, liens de suivi et chat",
      summary: "Voyez où est chaque camion, partagez un lien de suivi avec le client et parlez aux chauffeurs en temps réel.",
      blocks: [
        {
          kind: "p",
          text: "La Carte en direct combine les positions GPS de la télématique avec l’itinéraire planifié, le prochain arrêt et l’ETA en direct. Le Chat est la ligne directe vers le chauffeur, et le suivi public permet à un client de suivre un trajet sans compte TMS.",
        },
        { kind: "h", text: "Carte en direct" },
        {
          kind: "list",
          items: [
            "Marqueurs de camions avec plaque, chauffeur et activité en cours ; cliquez pour les détails.",
            "Prochain chargement/livraison, estimation d’arrivée et itinéraire restant du trajet sélectionné.",
            "Recherche par plaque, chauffeur ou ville ; la carte suit la sélection.",
            "Mises à jour en direct via WebSocket, plus une actualisation de secours si la connexion tombe.",
            "Activité tachygraphe et état de connexion à côté du camion lorsqu’ils sont disponibles.",
          ],
        },
        { kind: "h", text: "Partager un lien de suivi" },
        {
          kind: "steps",
          items: [
            "Ouvrez le trajet ou la commande et choisissez l’action de partage/suivi.",
            "Envoyez au client le lien généré (/track/…) ; il ouvre une page de suivi en lecture seule.",
            "Le lien montre la position actuelle et l’ETA, pas les prix, coûts ou notes internes.",
          ],
        },
        { kind: "h", text: "Chat et notifications" },
        {
          kind: "list",
          items: [
            "Une salle par trajet plus une salle générale de dispatching ; les messages arrivent en temps réel.",
            "Joignez photos et PDF — utiles pour un dommage au chargement, des pages CMR ou une preuve de livraison.",
            "Les messages non lus et changements de statut apparaissent dans le menu cloche et en popup.",
            "Les notifications de bureau s’activent depuis le menu cloche ; le navigateur demande la permission une fois.",
          ],
        },
        {
          kind: "tip",
          text: "Un client qui appelle pour une ETA est l’appel support le plus fréquent. Le lien de suivi y répond sans que personne n’ouvre le TMS.",
        },
        {
          kind: "warn",
          text: "Un camion sans connexion télématique affiche sa dernière position connue, pas une position en direct. Un horodatage ancien signifie « position non vérifiée », jamais « position actuelle ».",
        },
      ],
    },
    documents: {
      title: "Documents — CMR, POD et le reste",
      summary: "Téléverser, classer, partager et retrouver les papiers derrière chaque trajet.",
      blocks: [
        {
          kind: "p",
          text: "Documents garde la trace papier au même endroit et la relie à un trajet, pour que le bureau, le portail client et la facture renvoient au même fichier.",
        },
        {
          kind: "steps",
          items: [
            "Ouvrez Documents et choisissez Téléverser (ou appuyez sur N).",
            "Choisissez le fichier sur votre ordinateur ou glissez-le dans la fenêtre.",
            "Choisissez le type de document et, si possible, le trajet concerné.",
            "Ajoutez des notes pour vos collègues — ce que le fichier prouve ou ce qui manque.",
            "Enregistrez, puis utilisez téléchargement, aperçu ou partage depuis la liste.",
          ],
        },
        {
          kind: "table",
          head: ["Type", "Utilisation"],
          rows: [
            ["CMR", "Lettre de voiture internationale, le document légal du transport."],
            ["POD", "Preuve de livraison, signée par le destinataire."],
            ["Bon de livraison / liste de colisage", "Ce qui a été remis et en quelle quantité."],
            ["Facture", "Une copie de la facture commerciale dans le dossier."],
            ["Photo", "État au chargement, dommage, scellé ou nombre de palettes."],
            ["Ticket de pesée / autre", "Ticket de bascule ou document sans catégorie propre."],
          ],
        },
        { kind: "h", text: "Travailler avec la liste" },
        {
          kind: "list",
          items: [
            "Recherchez par nom de fichier, type, référence ou trajet ; filtrez par type et référence.",
            "Prévisualisez images et PDF sans les télécharger.",
            "Partagez un document par lien public avec jeton, puis révoquez-le quand nécessaire.",
            "Supprimez un mauvais envoi — l’action demande d’abord confirmation.",
          ],
        },
        {
          kind: "tip",
          text: "Téléversez le CMR et le POD avant de clôturer le trajet : le portail client et la facture montrent alors un dossier complet, et la clôture mensuelle ne court plus après le papier.",
        },
        {
          kind: "warn",
          text: "Un lien partagé est public pour quiconque le possède jusqu’à son expiration ou révocation. Ne partagez jamais un document contenant des coûts ou notes internes.",
        },
      ],
    },
    fleet: {
      title: "Flotte, remorques et maintenance",
      summary: "Gardez les données des véhicules complètes — la planification en dépend — et anticipez entretiens et expirations.",
      blocks: [
        {
          kind: "p",
          text: "Flotte & Équipements a deux onglets, Camions et Remorques. Les données saisies ici ne sont pas décoratives : dimensions, capacités et équipement décident de ce que la planification peut charger et de ce qu’affichent factures et rapports.",
        },
        { kind: "h", text: "Camions" },
        {
          kind: "list",
          items: [
            "Identité : plaque, marque, modèle, année, VIN et pays d’immatriculation.",
            "Affectation : statut, chauffeur actuel et remorque attachée.",
            "Capacité : poids total autorisé, charge utile, palettes, LDM, volume et dimensions intérieures.",
            "Équipement : type de caisse, norme euro et caractéristiques utilisées pour la compatibilité.",
            "Coûts : type et prix de carburant/énergie, consommation moyenne et coût par km.",
            "Documents : contrôle technique, assurance, tachygraphe et autres papiers avec dates d’expiration et alertes.",
          ],
        },
        { kind: "h", text: "Remorques" },
        {
          kind: "list",
          items: [
            "Plaque, type (mega, frigo, standard, walking floor, container, plateau), statut et dimensions.",
            "Capacité en palettes, LDM, m³ et poids, plus son propre jeu de documents avec expirations.",
            "La remorque doit correspondre à l’exigence d’équipement de la commande ; des données manquantes deviennent NON VÉRIFIÉ.",
          ],
        },
        {
          kind: "table",
          head: ["Champ", "Pourquoi il compte"],
          rows: [
            ["Longueur / largeur / hauteur intérieure", "La vérification de compatibilité pour mega, frigo et marchandise limitée en volume."],
            ["Charge utile et poids max", "La surcharge bloque une confirmation de planification."],
            ["Palettes et LDM", "Trop de palettes et les limites de mètres linéaires bloquent aussi."],
            ["Type de carburant et consommation", "Coût par km, coût d’itinéraire et estimations CO₂."],
          ],
        },
        { kind: "h", text: "Maintenance" },
        {
          kind: "list",
          items: [
            "Enregistrez entretiens préventifs et correctifs, contrôle technique, pneus et réparations.",
            "Saisissez date, kilométrage, coût pièces et main-d’œuvre, prestataire et notes ; joignez la facture ou le rapport.",
            "Statuts : planifié, en cours, terminé ; les entretiens en retard et à venir sont mis en évidence.",
            "Utilisez le kilométrage et le prochain km d’entretien pour planifier avant une panne.",
          ],
        },
        {
          kind: "tip",
          text: "Ouvrez un camion ou une remorque pour sa fiche : aperçu, documents, historique d’activité, chauffeur affecté et un profil PDF imprimable.",
        },
        {
          kind: "warn",
          text: "Un camion utilisé par un trajet actif ne peut pas être supprimé simplement. Terminez, annulez ou réaffectez le trajet d’abord et laissez les documents être archivés avec lui.",
        },
      ],
    },
    drivers: {
      title: "Chauffeurs, documents et heures de conduite",
      summary: "Le dossier chauffeur, ses expirations, sa disponibilité et les heures que la planification doit respecter.",
      blocks: [
        {
          kind: "p",
          text: "Chauffeurs réunit la personne, le compte de l’application mobile, le permis et les données médicales, le camion affecté et les heures de conduite enregistrées.",
        },
        { kind: "h", text: "Le dossier chauffeur" },
        {
          kind: "list",
          items: [
            "Nom, e-mail, téléphone et mot de passe utilisé dans l’application mobile.",
            "Numéro de permis, indemnité journalière et salaire brut pour la paie.",
            "Camion affecté et statut de disponibilité.",
            "Permis, certificat médical et carte tachygraphe avec leurs dates d’expiration.",
            "Onglet Documents pour les scans et historique d’activité pour chaque changement.",
          ],
        },
        {
          kind: "table",
          head: ["Document", "Ce qui se passe à l’expiration"],
          rows: [
            ["Permis de conduire", "Alerte dans les notifications ; le dossier est marqué et les rapports de conformité l’affichent."],
            ["Certificat médical", "Même flux d’alerte ; conservez le scan dans les documents du chauffeur."],
            ["Carte tachygraphe", "Alerte d’expiration ; sans carte valide, le chauffeur ne peut pas enregistrer légalement son activité."],
            ["Statut de disponibilité", "Disponible, en trajet, libre, malade ou congé — planification et dispatching le voient immédiatement."],
          ],
        },
        { kind: "h", text: "Heures de conduite (HOS)" },
        {
          kind: "list",
          items: [
            "Enregistrez conduite, travail, pauses et repos par jour dans la fiche chauffeur quand le tachygraphe n’est pas connecté.",
            "Limites du modèle de planification : 9 h de conduite par jour, 56 h par semaine, 45 min de pause après 4,5 h, 11 h de repos quotidien.",
            "Les enregistrements manquants apparaissent comme non vérifiés — jamais comme une disponibilité illimitée.",
            "La page Tachygraphe montre l’activité en direct de toute la flotte, actualisée toutes les quelques secondes.",
          ],
        },
        {
          kind: "tip",
          text: "Un chauffeur sans camion et sans heures peut exister dans le système, mais la planification traite sa disponibilité comme non vérifiée au lieu de supposer qu’il est libre.",
        },
        {
          kind: "warn",
          text: "Désactiver un chauffeur bloque immédiatement la connexion mobile. Vérifiez d’abord qu’aucun trajet ouvert ne dépend de ce compte et transférez le trajet.",
        },
      ],
    },
    telematics: {
      title: "Télématique et tachygraphe",
      summary: "Connectez le boîtier d’un camion, validez le flux et utilisez positions et activités en direct.",
      blocks: [
        {
          kind: "p",
          text: "Le Hub télématique gère la connexion entre un camion et son fournisseur de télématique ou de tachygraphe. Une fois la connexion active, positions, activité de conduite et ETA arrivent sur la Carte en direct et la page Tachygraphe.",
        },
        {
          kind: "steps",
          items: [
            "Ouvrez Télématique et choisissez Ajouter une connexion.",
            "Sélectionnez le camion et le fournisseur (un simulateur de test est disponible pour la formation).",
            "Saisissez l’identifiant appareil/véhicule du fournisseur et le type (OBD, FMS, tachygraphe).",
            "Pour les tachygraphes, ajoutez marque, modèle, numéro de série et génération.",
            "Saisissez les identifiants du fournisseur exactement comme fournis ; ils sont stockés côté serveur.",
            "Lancez le test de connexion, activez puis vérifiez la première position sur la carte.",
          ],
        },
        {
          kind: "table",
          head: ["Statut", "Signification"],
          rows: [
            ["En ligne / connecté", "Le fournisseur envoie des données pour ce camion."],
            ["Hors ligne", "Pas de données récentes ; la carte montre la dernière position connue avec son horodatage."],
            ["Erreur / identifiants", "Le fournisseur a refusé les identifiants ou l’ID appareil — corrigez et retestez."],
            ["Simulateur", "Données synthétiques pour la formation ; ne jamais les utiliser pour une promesse client."],
          ],
        },
        { kind: "h", text: "Ce que les données alimentent" },
        {
          kind: "list",
          items: [
            "Carte en direct : position, cap, activité actuelle et état de connexion.",
            "Tachygraphe : conduite, travail, disponibilité et repos, avec compteurs journaliers et hebdomadaires.",
            "Planification : enregistrements réels de conduite/repos lorsqu’ils existent ; sinon disponibilité non vérifiée.",
            "Tableau de bord et rapports : indicateurs de télémétrie et de fiabilité.",
          ],
        },
        {
          kind: "tip",
          text: "Utilisez le simulateur télématique pour former les nouveaux collègues : il produit positions et activités sans toucher un vrai camion ni une promesse client.",
        },
        {
          kind: "warn",
          text: "Les clés API et secrets client du fournisseur sont des identifiants d’entreprise. Saisissez-les uniquement dans l’assistant de connexion, jamais dans un chat, un e-mail ou un document partagé.",
        },
      ],
    },
    invoices: {
      title: "Factures, paiements et relances",
      summary: "Émettre, envoyer, encaisser et rapprocher le volet financier de chaque trajet.",
      blocks: [
        {
          kind: "p",
          text: "Les factures se créent depuis une commande/un trajet ou manuellement. La numérotation est automatique et le PDF utilise les données entreprise et bancaires de Paramètres : complétez cette page avant la première facture.",
        },
        {
          kind: "diagram",
          variant: "finance",
          title: "De la livraison à l’encaissement",
          callouts: [
            "Commande ou trajet livré — le document source et le lien d’audit.",
            "Facture — brouillon, vérifiée, puis émise avec un numéro automatique.",
            "PDF / e-mail / lien — le client reçoit le même document.",
            "Paiement — total ou partiel, avec date, méthode et référence.",
            "Vieillissement et rapports — solde dû par client, par tranche de jours.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Ouvrez Factures et créez-en une, ou utilisez l’action de facturation sur une commande livrée.",
            "Sélectionnez le client, la date d’émission, l’échéance et la devise.",
            "Ajoutez des lignes avec description, quantité, prix unitaire et TVA ; vérifiez les totaux.",
            "Enregistrez en brouillon, vérifiez, puis émettez le numéro définitif.",
            "Téléchargez le PDF, envoyez-le par e-mail ou partagez-le avec le client.",
            "Enregistrez le paiement à réception et vérifiez le solde restant.",
          ],
        },
        {
          kind: "table",
          head: ["Statut", "Signification"],
          rows: [
            ["Brouillon", "Modifiable, non émise ; pas de numéro définitif ni de PDF envoyé."],
            ["Émise / envoyée", "Document définitif remis au client."],
            ["Partiellement payée", "Certains paiements enregistrés ; le solde reste visible."],
            ["Payée", "Entièrement réglée."],
            ["En retard", "Échéance dépassée sans paiement complet ; signalée et incluse dans les relances."],
            ["Annulée", "Invalidée ; conservez-la pour l’audit au lieu de la supprimer."],
          ],
        },
        { kind: "h", text: "Recouvrement" },
        {
          kind: "list",
          items: [
            "Enregistrez des paiements totaux ou partiels sur une facture ; le solde se met à jour automatiquement.",
            "Ouvrez l’analyse de vieillissement pour le courant, 1–30, 31–60, 61–90 et 90+ jours.",
            "Envoyez des relances aux clients ayant des factures en retard depuis l’action de relance.",
            "Exportez le registre filtré en Excel, CSV ou PDF pour le comptable.",
          ],
        },
        {
          kind: "tip",
          text: "Facturez depuis la commande dès que possible : numéro de commande, client, trajet et documents restent liés, et le portail client montre la même facture.",
        },
        {
          kind: "warn",
          text: "Un brouillon n’a pas de numéro définitif. N’envoyez jamais le PDF d’un brouillon à un client ; émettez-le d’abord. Si les données entreprise ou l’IBAN changent, les anciens PDF ne sont pas réécrits.",
        },
      ],
    },
    "expenses-payroll": {
      title: "Dépenses, paie et règlements",
      summary: "Enregistrez les coûts de l’entreprise et clôturez le mois pour les chauffeurs et sous-traitants.",
      blocks: [
        { kind: "p", text: "Dépenses capture les coûts non liés à un trajet, tandis que Paie et Règlements calculent ce que les chauffeurs gagnent dans le mois." },
        { kind: "h", text: "Dépenses" },
        {
          kind: "list",
          items: [
            "Montant et devise, catégorie, date et description.",
            "Catégories : carburant, maintenance, comptabilité, salaire, péage et autre.",
            "Joignez la photo ou le PDF du reçu ; le lecteur IA peut préremplir les champs depuis un reçu.",
            "Filtrez et cherchez dans la liste, modifiez ou supprimez avec confirmation.",
            "Les dépenses alimentent le cockpit financier et la structure des coûts dans les rapports.",
          ],
        },
        { kind: "h", text: "Paie" },
        {
          kind: "steps",
          items: [
            "Choisissez le mois et l’année.",
            "Lancez Générer — le système calcule la paie depuis les trajets du mois et les données de rémunération du chauffeur.",
            "Vérifiez la liste, ouvrez le PDF d’un chauffeur et corrigez les données source si nécessaire.",
          ],
        },
        { kind: "h", text: "Règlements" },
        {
          kind: "list",
          items: [
            "Générez un règlement par chauffeur et par mois en choisissant le mode de paie (au km, pourcentage, fixe).",
            "Saisissez le taux ; le règlement montre les kilomètres, le chiffre d’affaires et le montant obtenu.",
            "Utilisez les règlements pour les chauffeurs propriétaires et sous-traitants, où la paie n’est pas l’outil adapté.",
            "Conservez le PDF avec les documents du mois pour le comptable.",
          ],
        },
        {
          kind: "tip",
          text: "Clôturez le mois dans l’ordre : dépenses → paie/règlements → factures → rapports. Chaque étape lit les données produites par la précédente.",
        },
        {
          kind: "warn",
          text: "Générer la paie deux fois pour le même mois peut doubler les montants. Vérifiez d’abord la liste existante ; corrigez les trajets source au lieu de modifier les chiffres à la main.",
        },
      ],
    },
    analytics: {
      title: "Cockpit financier et rapports",
      summary: "Lisez chiffre d’affaires, coûts, marge et créances, puis transformez-les en rapport imprimable.",
      blocks: [
        { kind: "p", text: "Financier est le cockpit d’analyse ; Rapports produit des documents réutilisables et exportables à partir des mêmes données opérationnelles. Les deux respectent la période et les filtres choisis." },
        { kind: "h", text: "Cockpit financier" },
        {
          kind: "list",
          items: [
            "Préréglages de période (ce mois, mois dernier, 30/90 jours, 12 mois, cette année) ou intervalle personnalisé.",
            "Granularité jour, semaine ou mois pour les graphiques de tendance.",
            "Indicateurs : facturé, encaissé, dû, chiffre d’affaires, coût, bénéfice et marge.",
            "Répartition des coûts par catégorie et vieillissement des créances/dettes.",
            "Export Excel du cockpit complet pour la réunion de direction.",
          ],
        },
        { kind: "h", text: "Rapports" },
        {
          kind: "list",
          items: [
            "Parcourez le catalogue par section : opérations, service, finance et méthodologie.",
            "Filtrez par client, camion, chauffeur, période et granularité, puis prévisualisez avant export.",
            "Exportez en Excel, CSV ou PDF ; les graphiques sont intégrés au PDF.",
            "Enregistrez un rapport configuré pour le réutiliser, planifiez-en un récurrent et consultez l’historique des exécutions.",
          ],
        },
        {
          kind: "table",
          head: ["Section", "Rapports typiques"],
          rows: [
            ["Opérations", "Trajets, utilisation, km chargés/à vide, retards, activité de flotte."],
            ["Service", "Chargement/livraison à l’heure, fenêtres manquées, incidents et fiabilité."],
            ["Finance", "Chiffre d’affaires, coût, bénéfice, marge, facturation et créances."],
            ["Méthodologie", "Définitions, hypothèses et notes de qualité des données derrière les chiffres."],
          ],
        },
        {
          kind: "tip",
          text: "Lisez la méthodologie avant de présenter un chiffre : elle indique quelles données étaient disponibles et lesquelles sont non vérifiées, pour que personne ne promette une valeur que le TMS ne peut pas prouver.",
        },
        {
          kind: "warn",
          text: "Un graphique vide signifie généralement qu’il n’y a pas de données sur la période, pas que le rapport est cassé. Élargissez les dates, effacez le filtre client/camion et vérifiez que factures et trajets sont clôturés.",
        },
      ],
    },
    clients: {
      title: "Clients et tarifs",
      summary: "Gardez le dossier commercial, les coordonnées et l’accès au portail au même endroit.",
      blocks: [
        {
          kind: "p",
          text: "Le dossier client est réutilisé par les commandes, factures, devis et le portail client. Un dossier complet signifie un seul enregistrement, pas cinq orthographes de la même entreprise.",
        },
        {
          kind: "list",
          items: [
            "Raison sociale, TVA, numéro de registre du commerce, adresse et pays.",
            "Contact, e-mail et téléphone utilisés pour les devis et factures.",
            "Ouvrez la fiche client pour les détails, commandes, trajets et factures.",
            "Accordez l’accès au portail pour que le client suive commandes, trajets, factures et documents.",
            "Recherchez, filtrez et exportez la liste ; ne supprimez qu’après vérification des documents ouverts.",
            "Les tarifs et le calculateur de prix se trouvent dans Paramètres → Moteur de tarifs.",
          ],
        },
        { kind: "h", text: "Ajouter un client et l’accès au portail" },
        {
          kind: "steps",
          items: [
            "Créez le client avec la raison sociale et la TVA exactement comme sur la facture.",
            "Ajoutez le contact et l’e-mail qui recevra devis et factures.",
            "Ouvrez les détails du client et activez l’accès au portail.",
            "Envoyez l’invitation/le lien de mot de passe ; le client choisit un mot de passe et se connecte à /portal/login.",
          ],
        },
        {
          kind: "table",
          head: ["Champ", "Où il apparaît"],
          rows: [
            ["Raison sociale et adresse", "PDF de facture, CMR, portail client."],
            ["TVA / registre", "Facture et rapports financiers."],
            ["E-mail de contact", "Réponses aux devis, factures et invitation au portail."],
            ["Pays", "Filtres, analyse du transit UE et rapports."],
          ],
        },
        {
          kind: "tip",
          text: "Les dossiers clients en double sont la cause habituelle des factures « manquantes ». Cherchez par numéro de TVA avant de créer un client.",
        },
        {
          kind: "warn",
          text: "Supprimer un client avec factures ou accès portail casse l’historique. Désactivez le portail ou archivez ; gardez le lien financier intact.",
        },
      ],
    },
    website: {
      title: "Contenu du site, demandes de devis et boîte de réception",
      summary: "Publiez le site public, répondez aux personnes qui écrivent et transformez les devis en commandes.",
      blocks: [
        { kind: "p", text: "Le module Site web modifie le site public de l’entreprise et collecte ses messages. Les demandes de devis se trouvent dans l’onglet du module Commandes et arrivent via le formulaire de transport du site." },
        {
          kind: "table",
          head: ["Onglet", "Ce que vous modifiez"],
          rows: [
            ["Boîte de réception", "Messages de contact du site ; lire, répondre et suivre le statut."],
            ["Carte & pays", "Les pays et liaisons affichés sur la carte publique."],
            ["À propos", "Histoire de l’entreprise, chiffres et contenu de confiance."],
            ["Services", "Les cartes de services et leurs descriptions."],
            ["Flotte", "Les véhicules présentés sur le site public."],
            ["Emplois", "Postes ouverts et candidatures."],
          ],
        },
        { kind: "h", text: "Demandes de devis" },
        {
          kind: "list",
          items: [
            "Statuts : nouveau, en analyse, contacté, devisé, accepté, refusé.",
            "Ouvrez une demande pour lire la liaison, la marchandise et les coordonnées.",
            "Répondez avec une offre de prix ; l’historique des réponses reste avec la demande.",
            "Quand le client accepte, utilisez Créer une commande pour transformer le devis en commande réelle sans ressaisie.",
          ],
        },
        { kind: "h", text: "Publier" },
        {
          kind: "steps",
          items: [
            "Choisissez la langue d’édition (RO, EN et les autres langues du site).",
            "Modifiez le bloc nécessaire et enregistrez ; le TMS confirme la modification.",
            "Ouvrez la page publique et vérifiez le texte avant de l’annoncer aux clients.",
          ],
        },
        {
          kind: "tip",
          text: "Les demandes de devis contiennent déjà la liaison et la marchandise. Transformez-les en commandes au lieu de copier le texte dans l’assistant — la demande source reste liée pour l’historique commercial.",
        },
        {
          kind: "warn",
          text: "Enregistrer un bloc modifie le site public en direct. Relisez le texte deux fois et vérifiez l’onglet de langue avant d’enregistrer.",
        },
      ],
    },
    compliance: {
      title: "Transit UE, cabotage et ADR",
      summary: "Prouvez où la flotte a roulé, gardez les marchandises dangereuses visibles et respectez les règles de conduite.",
      blocks: [
        { kind: "p", text: "Le rapport Transit UE & Cabotage (anciennement IFTA) construit une image par pays et par camion à partir des itinéraires des trajets. L’ADR est une propriété de la marchandise, et les limites tachygraphe sont le cadre légal utilisé par la planification." },
        {
          kind: "table",
          head: ["Concept", "Signification dans le TMS"],
          rows: [
            ["Transit UE", "Traversée d’un pays sans y charger ni livrer."],
            ["Cabotage", "Chargement et livraison dans un pays où vous n’êtes pas établi ; limité par les règles UE."],
            ["ADR", "Marchandises dangereuses : la commande porte le marquage ADR et le badge apparaît sur chaque écran."],
            ["Tachygraphe / HOS", "Conduite, travail, disponibilité et repos enregistrés par chauffeur et véhicule."],
          ],
        },
        { kind: "h", text: "Le rapport par pays" },
        {
          kind: "list",
          items: [
            "Choisissez une période ; les totaux viennent des trajets routés.",
            "Lisez kilomètres, trajets et part par pays, et la même répartition par camion.",
            "Exportez le rapport pour la déclaration ou le dossier de conformité.",
            "Une géométrie d’itinéraire ou un code pays manquant apparaît comme donnée incomplète, jamais comme distance devinée.",
          ],
        },
        { kind: "h", text: "ADR et règles de conduite" },
        {
          kind: "list",
          items: [
            "Marquez l’ADR sur la ligne de marchandise (classe, numéro UN et détails) pour que le badge suive commande et trajet.",
            "La planification affiche les camions et exigences ADR ; une incompatibilité est un conflit.",
            "Gardez permis, certificat médical, carte tachygraphe et heures à jour — les données expirées ou manquantes sont signalées.",
          ],
        },
        {
          kind: "tip",
          text: "Enregistrez les vrais pays de l’itinéraire via des arrêts géocodés. Les rapports de conformité valent ce que valent les adresses et itinéraires derrière.",
        },
        {
          kind: "warn",
          text: "Ce module rapporte ce que le TMS sait. Il ne remplace ni l’analyse légale du tachygraphe ni la responsabilité du gestionnaire de transport en matière de conformité.",
        },
      ],
    },
    portal: {
      title: "Le portail client",
      summary: "Ce que vos clients voient après connexion et comment leur donner accès en sécurité.",
      blocks: [
        {
          kind: "p",
          text: "Le portail client est un espace séparé, surtout en lecture, pour les clients : ils suivent commandes et trajets, téléchargent factures et documents et contactent le bureau. Ils ne voient jamais les coûts, marges ou autres clients.",
        },
        {
          kind: "diagram",
          variant: "portal",
          title: "La vue du client",
          callouts: [
            "Tableau de bord — commandes actives, factures échues, solde dû et activité récente.",
            "Commandes — leurs commandes, statuts et un formulaire de demande de transport.",
            "Trajets — trajets actifs avec arrêts et suivi.",
            "Factures — PDF, détails de paiement et coordonnées bancaires.",
            "Support — téléphone, e-mail et formulaire de message.",
          ],
        },
        { kind: "h", text: "Ce que le client peut faire" },
        {
          kind: "list",
          items: [
            "Se connecter à /portal/login avec l’e-mail invité par le bureau.",
            "Demander un nouveau transport ; la demande devient une commande/un devis pour l’équipe.",
            "Suivre les trajets actifs et ouvrir la page de suivi.",
            "Télécharger les factures, voir le solde dû et les coordonnées bancaires.",
            "Contacter le dispatching depuis la page support.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Ouvrez la fiche client et activez l’accès au portail.",
            "Envoyez l’invitation à l’e-mail de contact.",
            "Le client définit un mot de passe depuis le lien et se connecte.",
            "Vérifiez que le client ne voit que ses propres commandes, trajets et factures.",
          ],
        },
        {
          kind: "tip",
          text: "Utilisez le portail au lieu d’envoyer des PDF : le client voit toujours le statut actuel et les mêmes documents que le bureau.",
        },
        {
          kind: "warn",
          text: "Les comptes portail sont par client et ne doivent jamais être partagés entre entreprises. Si un contact part, révoquez l’accès et invitez son remplaçant.",
        },
      ],
    },
    "admin-users": {
      title: "Utilisateurs, rôles et droits",
      summary: "Créez des comptes, choisissez un modèle de rôle et décidez exactement quelles pages chacun peut ouvrir.",
      blocks: [
        {
          kind: "p",
          text: "Utilisateurs est le module de contrôle d’accès. Un rôle n’est qu’un modèle de départ ; les cases de pages sont le vrai droit, et la barre latérale comme le garde d’URL les respectent.",
        },
        {
          kind: "table",
          head: ["Rôle", "A besoin en général de"],
          rows: [
            ["Administrateur", "Tout, y compris Utilisateurs et Paramètres."],
            ["Manager", "Opérations, planification, flotte, chauffeurs, rapports et clients."],
            ["Dispatcheur", "Tableau de bord, commandes, planification, trajets, carte, chat et documents."],
            ["Gestionnaire de flotte", "Flotte, maintenance, chauffeurs, tachygraphe, transit et rapports."],
            ["Comptable", "Factures, finance, dépenses, rapports et clients."],
            ["Gestionnaire de paie", "Paie, règlements, chauffeurs, dépenses et rapports."],
            ["Conformité / service client / ventes", "Les pages liées à leur métier, sans finance ni administration."],
            ["Chauffeur", "Application mobile uniquement ; aucun module web."],
          ],
        },
        {
          kind: "steps",
          items: [
            "Choisissez Nouvel utilisateur et remplissez l’étape compte : nom, e-mail, mot de passe et langue.",
            "Choisissez le modèle de rôle le plus proche du métier.",
            "Ajustez les cases de pages ; les sections d’un module peuvent être accordées séparément.",
            "Activez ou désactivez le compte.",
            "Enregistrez et demandez à la personne de se connecter ; vérifiez que le menu correspond à ce que vous avez accordé.",
          ],
        },
        { kind: "h", text: "Actions de sécurité" },
        {
          kind: "list",
          items: [
            "Réinitialisez un mot de passe sans connaître l’ancien ; l’utilisateur peut le changer ensuite dans Paramètres → Mon profil.",
            "Désactivez immédiatement un compte quand quelqu’un part ; l’accès s’arrête à la requête suivante.",
            "Déconnectez un utilisateur de tous les appareils si un ordinateur ou téléphone est perdu.",
            "Supprimez un compte seulement si aucun audit n’en a besoin ; la désactivation est généralement le bon choix.",
          ],
        },
        {
          kind: "tip",
          text: "Donnez le plus petit ensemble de pages qui permet le travail. Un dispatcheur n’a pas besoin d’Utilisateurs, de Paramètres ou des coordonnées bancaires de l’entreprise.",
        },
        {
          kind: "warn",
          text: "Les comptes administrateur peuvent tout changer, y compris les autres administrateurs. Gardez au moins deux administrateurs actifs pour que l’entreprise ne soit jamais bloquée.",
        },
      ],
    },
    settings: {
      title: "Paramètres entreprise, tarifs et connexions",
      summary: "Les données dont dépendent chaque PDF, plan et facture — à configurer une fois, avec soin.",
      blocks: [
        {
          kind: "p",
          text: "Paramètres est la configuration de l’entreprise. La plupart des onglets sont réservés aux administrateurs ; l’onglet profil est pour chaque utilisateur. Les changements affectent immédiatement les documents, y compris les PDF générés plus tard.",
        },
        {
          kind: "table",
          head: ["Onglet", "Ce qu’il contrôle"],
          rows: [
            ["Données entreprise & facturation", "Raison sociale, TVA, registre, contact, adresse, banque, IBAN et logo."],
            ["Moteur de tarifs & calculateur", "Tarifs utilisés par le calculateur et les devis."],
            ["Mon profil & sécurité", "Votre nom, e-mail et mot de passe."],
            ["Connexions & serveur", "URL API et WebSocket du client."],
            ["Télématique & intégrations", "Les mêmes connexions gérées par le Hub télématique."],
          ],
        },
        { kind: "h", text: "Données entreprise" },
        {
          kind: "list",
          items: [
            "Utilisez la raison sociale, la TVA et le registre exactement comme sur les factures.",
            "Téléversez un logo net ; il apparaît sur les PDF et dans la barre latérale.",
            "Complétez banque et IBAN — le portail client les affiche pour le paiement.",
            "Les horaires et coordonnées arrivent aussi sur le site public et la page support du portail.",
            "L’enregistrement exige le rôle administrateur.",
          ],
        },
        { kind: "h", text: "Tarifs et connexions" },
        {
          kind: "list",
          items: [
            "Le moteur de tarifs stocke les taux du calculateur et des réponses aux devis ; gardez devises et unités cohérentes.",
            "Les URL API et WebSocket sont des réglages d’environnement ; ne les changez qu’avec le responsable IT.",
            "Les identifiants télématiques vont dans l’assistant de connexion, pas dans une note partagée.",
          ],
        },
        {
          kind: "tip",
          text: "Avant la première facture, remplissez données entreprise, coordonnées bancaires et logo. Les corriger plus tard ne régénère pas les PDF déjà émis.",
        },
        {
          kind: "warn",
          text: "Changer l’URL API déconnecte l’environnement actuel de son backend. À faire uniquement lors d’une migration planifiée, jamais comme essai de dépannage.",
        },
      ],
    },
    troubleshooting: {
      title: "Quand quelque chose bloque",
      summary: "Les problèmes les plus fréquents, ce qu’ils signifient vraiment et la correction rapide et sûre.",
      blocks: [
        {
          kind: "table",
          head: ["Symptôme", "Ce que vous vérifiez"],
          rows: [
            ["« Compte inactif » à la connexion", "Un administrateur doit réactiver le compte ou réinitialiser le mot de passe dans Utilisateurs."],
            ["Un module manque dans le menu", "Votre rôle/jeu de pages ne l’inclut pas ; demandez à un administrateur, ne recréez pas l’utilisateur."],
            ["Erreur réseau / page vide", "Connexion, URL API dans Paramètres → Serveur et si le backend tourne."],
            ["Adresse introuvable", "Tapez la ville et choisissez la suggestion ; une adresse sans coordonnées ne peut pas être routée."],
            ["La planification refuse de confirmer", "Lisez le code de conflit : fenêtre manquée, surcharge/palettes, chevauchement camion/remorque/chauffeur, équipement manquant."],
            ["Équipement NON VÉRIFIÉ", "Remplissez dimensions intérieures et type de caisse dans Flotte."],
            ["Heures chauffeur NON VÉRIFIÉES", "Aucun relevé tachygraphe sur la période ; saisissez HOS ou connectez la télématique. Ne le lisez pas comme du temps libre."],
            ["Aucune position en direct pour un camion", "La connexion télématique est hors ligne ; le dernier horodatage n’est pas la position actuelle."],
            ["Le PDF de facture affiche de mauvaises données", "Corrigez Paramètres → Données entreprise ; les anciens PDF ne sont pas réécrits."],
            ["Les notifications de bureau n’apparaissent pas", "Activez-les dans le menu cloche et autorisez la permission du navigateur."],
          ],
        },
        { kind: "h", text: "Codes de conflit de planification" },
        {
          kind: "list",
          items: [
            "STOP_WINDOW_MISSED — arrivée après la fenêtre ; changez la date, scindez le trajet ou renégociez la fenêtre.",
            "WEIGHT_OVERLOAD / PALLET_OVERLOAD — la marchandise dépasse la capacité enregistrée camion + remorque.",
            "TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — la ressource est déjà engagée sur cet intervalle.",
            "EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — la commande exige un équipement que le véhicule ne prouve pas avoir.",
            "ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — l’itinéraire ou les données de marchandise sont incomplets ; le système ne devine pas.",
            "PROPOSAL_CHANGED — la proposition vérifiée ne correspond plus ; rouvrez l’assistant et revérifiez.",
            "ASSIGNMENT_BLOCKED — un blocage dur est présent et ne peut pas être forcé.",
          ],
        },
        {
          kind: "tip",
          text: "Si le message mentionne NON VÉRIFIÉ, la bonne correction est presque toujours dans les données : complétez le véhicule, l’itinéraire ou les relevés chauffeur. Ne falsifiez jamais une dimension ou une position GPS pour faire passer un plan.",
        },
        {
          kind: "warn",
          text: "Ne contournez pas un vrai blocage par une dérogation ou une modification manuelle. Une fenêtre légale manquée ou un camion en surcharge est un risque réel, pas un désagrément logiciel.",
        },
      ],
    },
    glossary: {
      title: "Glossaire et statuts",
      summary: "Le vocabulaire du TMS, pour que chaque collègue parle de la même chose.",
      blocks: [
        {
          kind: "table",
          head: ["Terme", "Signification"],
          rows: [
            ["TMS", "Transport Management System — le logiciel que vous utilisez."],
            ["Commande", "La demande commerciale : client, itinéraire, marchandise, prix."],
            ["Trajet", "Le tour exécutable : camion, remorque, chauffeur, arrêts ordonnés."],
            ["Arrêt", "Un point de chargement ou livraison dans un trajet, avec fenêtre et ETA."],
            ["Tableau de planification", "La grille camions × jours où les commandes sont affectées."],
            ["Insertion", "La position faisable la moins chère d’une paire chargement/livraison dans un trajet existant."],
            ["Consolidation", "Ajouter une commande à un trajet existant au lieu d’en créer un nouveau."],
            ["ETA", "Heure d’arrivée estimée, recalculée depuis l’itinéraire et l’horaire."],
            ["LDM", "Mètres linéaires — la longueur de plancher occupée par la marchandise."],
            ["CMR / POD", "Lettre de voiture internationale / preuve de livraison."],
            ["ADR", "Accord européen sur le transport de marchandises dangereuses."],
            ["Cabotage", "Chargement et livraison dans un pays où le transporteur n’est pas établi."],
            ["Tachygraphe", "L’appareil qui enregistre conduite, travail, disponibilité et repos."],
            ["Règlement", "Le calcul mensuel d’un chauffeur ou sous-traitant, distinct de la paie."],
            ["Vieillissement (aging)", "Factures dues groupées par nombre de jours de retard."],
            ["Dérogation (override)", "Décision documentée d’accepter un avertissement souple ; motif et utilisateur sont stockés."],
            ["Verdict", "La décision de faisabilité du backend : faisable, avertissement ou bloqué."],
            ["NON VÉRIFIÉ", "Des données manquent, le système refuse de deviner — complétez les données source."],
          ],
        },
        { kind: "h", text: "Statuts de commande" },
        {
          kind: "list",
          items: [
            "draft — en préparation, pas encore visible pour la planification.",
            "new — complète et en attente de planification.",
            "planned / assigned — rattachée à un trajet et un camion.",
            "loading / in_transit — exécution en cours.",
            "delivered — le destinataire a accepté la marchandise.",
            "pod_received — la preuve signée est téléversée.",
            "ready_for_invoice / invoiced / paid — la queue financière de la commande.",
            "cancelled — la commande ne sera pas exécutée.",
          ],
        },
        { kind: "h", text: "Statuts de trajet" },
        {
          kind: "list",
          items: [
            "PLANNING, ACCEPTED — créé et confirmé, non démarré.",
            "EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — séquence de chargement.",
            "EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — séquence de livraison.",
            "COMPLETED — clôturé avec succès ; DELAYED, EXCEPTION — demande attention.",
            "DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — issues de livraison.",
            "CANCELLED — annulé ; ses commandes peuvent être replanifiées.",
          ],
        },
        {
          kind: "tip",
          text: "Quand deux collègues décrivent une tâche différemment, consultez d’abord ce glossaire. Un mot, un sens, moins d’erreurs.",
        },
        {
          kind: "warn",
          text: "Les statuts ne sont pas cosmétiques. Rapports, portail et facturation les lisent ; avancer un trajet sans l’événement réel rend tous les chiffres en aval faux.",
        },
      ],
    },
  },
};
