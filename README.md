# Pointage Hôtels — PWA

Application de pointage par QR code pour société de ménage hôtelier.
Frontend React (PWA installable iOS/Android) + API serverless Vercel + Notion en base de données.

## Architecture

```
PWA (React/Vite)  →  /api/* (Vercel serverless)  →  API Notion (v2025-09-03)
```

L'espace Notion « Pointage Hôtels — Société de ménage » sert de back-office :
toutes les données (employées, hôtels, QR codes, pointages, tarifs, factures)
s'administrent directement dans Notion. Les IDs des data sources sont figés
dans `api/_lib/notion.js`.

## Déploiement (10 minutes)

### 1. Créer l'intégration Notion
1. https://www.notion.so/my-integrations → « New integration » (workspace Laura Ballo)
2. Copier la clé secrète (`ntn_...` ou `secret_...`)
3. Dans Notion, ouvrir la page **Pointage Hôtels — Société de ménage** →
   menu `•••` → **Connexions** → ajouter votre intégration
   (l'accès se propage à toutes les bases enfants)

### 2. Déployer sur Vercel
```bash
git init && git add . && git commit -m "Pointage PWA v1"
# pousser sur GitHub puis importer le repo dans Vercel, ou :
npx vercel
```
Variables d'environnement à définir dans Vercel (Settings → Environment Variables) :
| Variable | Valeur |
|---|---|
| `NOTION_API_KEY` | la clé de l'intégration |
| `ADMIN_SECRET` | mot de passe du panneau admin (long et unique) |

### 3. Mise en route
1. Ouvrir `https://votre-app.vercel.app/admin` → se connecter
2. Onglet **QR codes** → générer un QR par hôtel × prestation → **Imprimer** → afficher dans les hôtels
3. Onglet **Équipe** → copier le lien personnel de chaque salariée → envoyer par SMS/WhatsApp
4. Renseigner la base **💶 Tarifs** dans Notion (un tarif par hôtel × prestation, mode Horaire ou Forfait, case Actif cochée) pour activer la facturation

### Développement local
```bash
npm install
npx vercel dev        # sert le front + les fonctions /api avec les variables d'env
```

## Fonctionnement du pointage
- Chaque QR encode `PTG:{id-notion-du-qr}` — aucune donnée en clair, rien à réimprimer si les tarifs changent
- 1er scan → pointage « En cours » (heure d'arrivée) ; 2e scan du même QR → départ + statut « Terminé », durée calculée par la formule Notion
- **Hors-ligne** : le pointage est mémorisé localement avec l'heure réelle du scan et synchronisé au retour du réseau
- **Géolocalisation** : capturée en meilleur effort (2 s max, jamais bloquante) et tracée dans le commentaire du pointage

## Facturation
1. Prévisualisation : agrège les pointages « Terminé » non facturés du mois pour l'hôtel, applique la grille Tarifs (horaire ou forfait par prestation)
2. Génération : crée la facture `FAC-AAAA-MM-XXX` dans Notion, lie les pointages (= marqués facturés), calcule HT/TTC
3. PDF téléchargeable depuis l'app — **compléter les mentions légales (SIRET, conditions de règlement) avec le comptable avant émission réelle**

## Limites V1 (assumées, cf. spécifications)
- Accès salariée par lien personnel non devinable, sans mot de passe (V2 : code PIN)
- Contrôle géoloc = traçage, pas de blocage (pas de coordonnées GPS des hôtels en base)
- Le cache du dashboard admin est par instance serverless (60 s, meilleur effort)
