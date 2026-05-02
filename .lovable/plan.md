
# Application Centre Esthétique — Coiffure Homme

Application web complète permettant aux clients de consulter le catalogue de services et la vitrine produits, réserver un créneau (validé par l'admin), et au coiffeur de gérer son agenda et ses disponibilités.

## Public ciblé & rôles

- **Visiteurs** : peuvent parcourir le catalogue, la vitrine, et réserver un RDV (en invité ou avec compte).
- **Clients connectés** : retrouvent l'historique et statut de leurs RDV, peuvent annuler.
- **Admin (coiffeur)** : gère son calendrier, valide/refuse les RDV, configure ses horaires, blocages, services et produits.

## Pages & navigation

```text
/                       Accueil — hero, services phares, CTA "Réserver"
/services               Catalogue complet des prestations + prix + durée
/vitrine                Produits (shampoing, parfum, etc.) — affichage seul
/reservation            Workflow de prise de RDV (4 étapes)
/login  /signup         Auth client (optionnel pour réserver)
/mon-compte             Mes RDV (à venir, passés, annulés)
/admin                  Dashboard admin — calendrier + RDV en attente
/admin/horaires         Horaires d'ouverture + blocages
/admin/services         CRUD des prestations (nom, prix, durée)
/admin/produits         CRUD des produits vitrine
```

## Workflow de prise de RDV (focus principal)

Parcours en 4 étapes, avec barre de progression visible en haut.

```text
[1 Service] → [2 Date & Créneau] → [3 Coordonnées] → [4 Confirmation]
```

**Étape 1 — Choix du service**
Cartes cliquables (une seule sélection) :
- Coiffure (cheveux)
- Coiffure barbe seulement
- Coiffure barbe + cheveux
- Brushing
- Soins cheveux — protéine / kératine / lissage (sous-choix)
- Soins visage — gommage

Chaque carte affiche : nom, prix, durée estimée. La durée détermine la taille du créneau bloqué.

**Étape 2 — Date & créneau**
- Calendrier (mois) : jours fermés grisés, jours sans dispo grisés.
- Sélection d'un jour → liste des créneaux libres ce jour-là, générés à partir des horaires d'ouverture moins :
  - les blocages admin,
  - les RDV déjà confirmés ou en attente,
  - en respectant la durée du service choisi.
- Affichage clair "Aucun créneau disponible" si vide, avec lien vers jour suivant disponible.

**Étape 3 — Coordonnées**
Deux choix visibles en haut :
- *J'ai un compte* → connexion → champs préremplis.
- *Continuer en invité* → formulaire : nom, prénom, téléphone (obligatoire), email (obligatoire), note optionnelle.
- Case "Créer un compte pour suivre mes RDV" (mot de passe optionnel).
- Validation Zod sur tous les champs.

**Étape 4 — Récapitulatif & envoi**
- Résumé : service, date/heure, durée, prix, infos client.
- Bouton **"Demander la réservation"**.
- Le RDV est créé avec statut `en_attente` ; le créneau est verrouillé pour empêcher un double-booking.
- Écran de confirmation : « Votre demande a été envoyée. Le coiffeur la validera sous peu. Vous recevrez une confirmation par email. » + numéro de référence.

**Côté admin** : notification dans le dashboard (badge sur "RDV en attente"). L'admin clique → **Valider** ou **Refuser** (avec motif optionnel). Le statut passe à `confirme` ou `refuse`. Si refusé, le créneau est libéré.

**Annulation** : le client (depuis Mon compte ou via lien dans email) ou l'admin peut annuler un RDV ; le créneau redevient libre.

## Calendrier admin

- Vue **semaine** par défaut + bascule **jour** / **mois**.
- Chaque RDV affiché comme bloc coloré selon statut :
  - jaune = en attente, vert = confirmé, rouge = refusé/annulé.
- Clic sur un bloc → panneau latéral : détails client, service, actions (valider, refuser, annuler, marquer terminé).
- Sidebar "RDV en attente" toujours visible avec compteur.

## Gestion horaires & blocages (admin)

- Horaires hebdomadaires : pour chaque jour de la semaine → ouvert/fermé + plage(s) horaire(s) (ex. 9h-12h, 14h-19h).
- Blocages ponctuels : ajouter une plage indisponible (date+heures) ou journée complète (vacances, formation). Affichés sur le calendrier.

## Catalogue & vitrine

- **Services** : grille de cartes (image optionnelle, nom, prix, durée, courte description). Bouton "Réserver" qui présélectionne le service à l'étape 1.
- **Vitrine produits** : grille de cartes (image, nom, marque, prix, catégorie, description). Pas de panier, juste consultation. Filtres par catégorie (shampoing, parfum, soins…).

## Design

- Style moderne et épuré, ambiance barber-shop masculin : palette sombre/contrastée (noir profond, blanc cassé, accent doré ou cuivre).
- Typographie soignée (titres serif élégants, corps sans-serif).
- Photos plein cadre sur la page d'accueil.
- Mobile-first, navigation simple, gros boutons CTA "Réserver".

## Détails techniques

- **Frontend** : TanStack Start (déjà en place), Tailwind v4, shadcn/ui (cards, dialog, calendar, sidebar, sonner pour les toasts).
- **Backend** : Lovable Cloud (Supabase) pour la DB et l'auth.
- **Auth** : email + mot de passe (compte optionnel, parcours invité supporté).
- **Tables Supabase** :
  - `profiles` (id ref auth.users, nom, prénom, téléphone)
  - `user_roles` (id, user_id, role enum: `admin`/`client`) + fonction `has_role()` (security definer) — sécurité des accès admin
  - `services` (id, nom, description, prix, durée_minutes, actif, image_url)
  - `products` (id, nom, marque, description, prix, catégorie, image_url, actif)
  - `business_hours` (id, jour_semaine 0-6, heure_debut, heure_fin, actif)
  - `time_blocks` (id, date_debut, date_fin, motif) — fermetures ponctuelles
  - `appointments` (id, client_user_id nullable, guest_name, guest_email, guest_phone, service_id, start_at, end_at, status enum `pending`/`confirmed`/`refused`/`cancelled`/`completed`, notes, refus_motif, created_at)
- **RLS** :
  - clients : lecture/insert sur leurs propres `appointments`, lecture publique sur services/products/business_hours
  - admin (via `has_role`) : tout accès en écriture
- **Génération créneaux** : server function qui calcule les slots disponibles pour une date+service donné, en croisant `business_hours`, `time_blocks` et `appointments` non annulés.
- **Notifications email** : à câbler ultérieurement via Resend (hors scope initial — on affiche les confirmations à l'écran).
- **Validation** : Zod sur tous les formulaires côté client + côté server function.

## Hors scope (peut être ajouté plus tard)

- Paiement en ligne d'acompte
- SMS de rappel
- Avis clients / notes
- Multi-coiffeurs
- Vente en ligne des produits
