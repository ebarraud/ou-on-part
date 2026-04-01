# "Où on part ?" — Spécifications complètes PWA

## Vision produit

Application mobile-first de voyage qui guide l'utilisateur **du choix de destination jusqu'à l'itinéraire complet**. L'IA est le moteur central. L'utilisateur ne saisit jamais de texte — tout se fait via des boutons.

---

## Stack technique

| Élément | Choix |
|---|---|
| Framework | Next.js 14 (App Router) |
| Style | Tailwind CSS |
| IA | Claude API (claude-sonnet-4-20250514) |
| Déploiement | Vercel |
| PWA | next-pwa (manifest + service worker) |
| Cartes | Google Maps API |
| Météo / eau | Open-Meteo API (gratuit) |
| Vols | Skyscanner Affiliate API |
| Hébergement | Booking.com Affiliate API |
| Activités | GetYourGuide API |
| Péages FR | TollGuru API ou base statique |

---

## Architecture PWA

```
/app
  /page.tsx              → écran d'accueil
  /flow/page.tsx         → flow de questions
  /results/page.tsx      → page résultats
  /destination/[id]/page.tsx → fiche destination
  /itinerary/page.tsx    → itinéraire généré par IA

/components
  /flow/
    QuestionStep.tsx     → composant générique boutons
    MonthPicker.tsx      → grille de mois
    CityPicker.tsx       → sélecteur ville départ
    VisitedCountries.tsx → grille pays visités
  /results/
    DestinationCard.tsx  → carte résultat avec score
    WarningBadge.tsx     → warning 3 niveaux
    BudgetRange.tsx      → fourchette calculée

/lib
  /claude.ts             → appels Claude API
  /budget.ts             → calcul budget dynamique
  /warnings.ts           → logique warnings saisonniers
  /transport.ts          → calcul voiture (carburant + péages)
```

### Configuration PWA (manifest.json)
```json
{
  "name": "Où on part ?",
  "short_name": "Où on part ?",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#534AB7",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Flow de questions — logique complète

### Structure de l'état global (TypeScript)

```typescript
interface TravelProfile {
  // Temporel
  month: string           // ex: "août 2025"
  monthIndex: number      // 0-11
  year: number
  nights: '2-3' | '4-6' | '7' | '10+'

  // Budget
  budget: 'tight' | 'moderate' | 'comfort' | 'unlimited'

  // Contexte
  tripContext: 'vacation' | 'honeymoon' | 'special' | 'friends' | 'workation'
  travelStyle: 'base' | 'moving'  // pose valise OU bouge

  // Groupe
  group: 'solo' | 'couple' | 'family' | 'friends'
  kidsAges?: ('baby' | 'young' | 'child' | 'teen')[]

  // Départ & transport
  departureCity: string
  departureLat?: number
  departureLng?: number
  transport: ('plane' | 'train' | 'car' | 'ferry')[]

  // Ambiance (multi)
  vibe: ('sea' | 'mountain' | 'city' | 'nature' | 'culture' | 'food')[]

  // Questions contextuelles
  waterTemp?: 'any' | 'fresh' | 'warm' | 'tropical'     // si sea
  mountainLevel?: 'walk' | 'hike' | 'trek' | 'climb'    // si mountain

  // Priorités (multi)
  priority: ('rest' | 'discover' | 'sport' | 'food' | 'scenery' | 'nightlife')[]

  // Climat
  climate: 'hot-dry' | 'tropical' | 'temperate' | 'cold'

  // Hébergement (multi)
  accommodation: ('hotel' | 'apartment' | 'allinclusive' | 'nature' | 'boutique' | 'hostel')[]

  // Contraintes (optionnel, multi)
  constraints: ('vegetarian' | 'halal' | 'glutenfree' | 'pmr' | 'noaltitude' | 'noheat')[]

  // Langue
  language: 'any' | 'english' | 'french' | 'nearby'

  // Destinations déjà visitées (multi)
  visited: string[]      // codes pays ISO ex: ['GR', 'ES', 'IT']

  // Mode "on bouge" uniquement
  stopsCount?: 2 | 3 | 4 | 5
  region?: string        // ex: "Grèce", "Japon"
}
```

---

## Les 15 questions — détail complet

### Q1 — Quel mois ?
- Type : sélection unique
- UI : grille 4 colonnes, 12 mois à partir du mois prochain
- Mois passés : grisés et non cliquables
- Affiche : nom du mois + année (ex: "Aoû / 2025")
- État sauvé : `month`, `monthIndex`, `year`

### Q2 — Combien de nuits ?
- Type : sélection unique
- UI : grille 2 colonnes
- Options : Week-end (2–3) / Semaine courte (4–6) / 1 semaine (7) / Grand voyage (10+)
- Affiche en temps réel la date de retour estimée
- État sauvé : `nights`

### Q3 — Budget par personne ?
- Type : sélection unique
- UI : grille 2 colonnes
- Options : Serré (< 500€) / Raisonnable (500–1 500€) / Confort (1 500–3 000€) / Sans limite (3 000€+)
- Sous-titre : "Vols + hébergement + activités"
- État sauvé : `budget`

### Q4 — Type de voyage ?
- Type : sélection unique
- UI : liste verticale (grands boutons avec icône + titre + sous-titre)
- Options :
  - ✈️ Vacances classiques — "On décroche, on profite"
  - 💑 Lune de miel / Romantique — "Coup de cœur garanti"
  - 🎂 Occasion spéciale — "Anniversaire, retraite, diplôme"
  - 🎉 Entre potes / EVG / EVJF — "On fête, on s'amuse"
  - 💼 Voyage + télétravail — "Wifi solide indispensable"
- État sauvé : `tripContext`

### Q5 — Style de voyage ?
- Type : sélection unique (bifurcation majeure)
- UI : 2 grands boutons
- Options :
  - ⚓ On pose la valise — "Une destination, excursions à la journée"
  - 🗺️ On bouge — "Plusieurs étapes, on change d'endroit"
- Note : change la logique de toutes les questions suivantes
- État sauvé : `travelStyle`

### Q6 — On part à combien ?
- Type : sélection unique
- UI : grille 2 colonnes
- Options : 🧍 Solo / 👫 En couple / 👨‍👩‍👧 En famille / 🎉 En groupe
- État sauvé : `group`

### Q6b — Âge des enfants ? [CONDITIONNEL : si group === 'family']
- Type : sélection multiple
- UI : grille 2 colonnes
- Options : 🍼 Bébé (< 2 ans) / 🧸 Petits (3–7) / ⚽ Enfants (8–12) / 🎧 Ados (13–17)
- État sauvé : `kidsAges`

### Q7 — Ville de départ ?
- Type : sélection unique
- UI : barre de recherche visuelle (non saisie) + liste des 5 grandes villes françaises + "Autre ville"
- Villes proposées : Paris / Lyon / Marseille / Bordeaux / Nantes / Strasbourg / Autre
- État sauvé : `departureCity`, `departureLat`, `departureLng`

### Q8 — Mode de transport ?
- Type : sélection multiple
- UI : liste verticale avec icône + nom + détail + disponibilité
- Options :
  - ✈️ Avion — toujours disponible
  - 🚂 Train — disponible selon destination
  - 🚗 Voiture — toujours disponible
  - ⛴️ Ferry — grisé si pas de port proche (Paris → grisé, Marseille → disponible)
- Si voiture sélectionnée → Q8b débloquée
- État sauvé : `transport`

### Q8b — Calcul voiture [CONDITIONNEL : si 'car' dans transport]
- Type : confirmation (pas de choix)
- UI : affiche le calcul dynamique depuis la ville de départ :
  - ⛽ Carburant aller-retour (calculé sur distance × 7L/100km × prix carburant)
  - 🛣️ Péages estimés (base statique France)
  - 🅿️ Parking destination (forfait fixe ~40€)
  - **Total transport / véhicule**
- Bouton "C'est bon, continuer"

### Q9 — Quelle ambiance ?
- Type : sélection multiple
- UI : grille 2 colonnes, 6 options
- Options : 🏖️ Mer & plage / 🏔️ Montagne / 🌆 Grande ville / 🌿 Nature & calme / 🏛️ Culture / 🍽️ Gastronomie
- État sauvé : `vibe`

### Q9b — Température de l'eau ? [CONDITIONNEL : si 'sea' dans vibe]
- Type : sélection unique
- UI : liste verticale
- Options :
  - 🥶 Peu importe — "Je nage quand même"
  - 🌊 Fraîche OK — "18–24°C"
  - 🔥 Chaude — "25°C et plus"
  - ♨️ Très chaude — "28°C+ mer tropicale"
- État sauvé : `waterTemp`

### Q9c — Niveau montagne ? [CONDITIONNEL : si 'mountain' dans vibe]
- Type : sélection unique
- UI : liste verticale
- Options :
  - 🚶 Balades tranquilles — "Pas d'effort"
  - 🥾 Randonnées — "Quelques heures / jour"
  - ⛰️ Trek sérieux — "Multi-jours, refuge"
  - 🧗 Alpinisme — "Technique, équipement"
- État sauvé : `mountainLevel`

### Q10 — Destinations déjà visitées ?
- Type : sélection multiple
- UI : grille 3 colonnes, drapeaux + noms pays
- Pays proposés : Grèce / Espagne / Italie / Portugal / Maroc / Thaïlande / USA / Japon / Turquie / Mexique / Bali / Autre
- Bouton "Passer — première fois que je voyage"
- État sauvé : `visited` (codes ISO)

### Q11 — Priorité du voyage ?
- Type : sélection multiple
- UI : grille 2 colonnes, 6 options
- Options : 😴 Se reposer / 🧭 Découvrir / 🤸 Sport & activités / 🍷 Gastronomie / 📸 Paysages / 🎭 Vie nocturne
- État sauvé : `priority`

### Q12 — Quel climat ?
- Type : sélection unique
- UI : grille 2 colonnes
- Options : ☀️ Chaud & sec (Méditerranée) / 🌴 Chaud & humide (Tropical) / 🌥️ Tempéré / ❄️ Froid (ski, neige)
- État sauvé : `climate`

### Q13 — Hébergement ?
- Type : sélection multiple
- UI : grille 2 colonnes
- Options : 🏨 Hôtel / 🏡 Appartement / ♾️ All inclusive / 🏕️ Nature (camping, cabane) / 🛎️ Boutique-hôtel / 💸 Auberge
- État sauvé : `accommodation`

### Q14 — Contraintes ? [OPTIONNEL]
- Type : sélection multiple
- UI : grille 2 colonnes + bouton "Passer" bien visible
- Options :
  - 🥦 Végétarien / Vegan
  - 🕌 Halal / Casher
  - 🌾 Sans gluten
  - 🦽 Mobilité réduite (PMR)
  - ⛰️ Éviter altitude (+ 2 000m)
  - 🌡️ Éviter chaleur (+ 35°C)
- État sauvé : `constraints`

### Q15 — Barrière de la langue ?
- Type : sélection unique
- UI : liste verticale
- Options :
  - 😌 Pas de souci — "J'aime me débrouiller"
  - 🇬🇧 Anglais suffit — "Je veux pouvoir communiquer"
  - 🇫🇷 Français si possible — "Je préfère ma langue"
  - 📵 Pas trop dépaysant — "Culture proche de la France"
- État sauvé : `language`

---

## Navigation dans le flow

```
Q1 → Q2 → Q3 → Q4 → Q5 → Q6
                              ↓
                         [si family] → Q6b
                              ↓
                         Q7 → Q8
                              ↓
                         [si car] → Q8b
                              ↓
                         Q9
                         ↓         ↓
                    [si sea]   [si mountain]
                      Q9b          Q9c
                         ↓
                    Q10 → Q11 → Q12 → Q13 → Q14 → Q15
                                                      ↓
                                                  RÉSULTATS
```

**Mode "on bouge" (travelStyle === 'moving') :**
Après Q15, une question supplémentaire :
- Combien d'étapes ? 2 / 3 / 4 / 5
- L'IA génère une route multi-destinations au lieu d'une seule destination

---

## Page Résultats

### Logique de génération (appel Claude API)

```typescript
const prompt = `
Tu es un expert voyagiste. Voici le profil du voyageur :
${JSON.stringify(travelProfile)}

Génère EXACTEMENT 3 destinations en JSON avec cette structure :
{
  "destinations": [
    {
      "id": "crete",
      "country": "Grèce",
      "city": "Crète",
      "flag": "🇬🇷",
      "matchScore": 98,
      "matchReasons": ["Mer 26°C en août", "Vol direct depuis Paris", "Gastronomie excellente"],
      "budget": { "min": 860, "max": 1050, "currency": "EUR", "includes": "vol + hôtel 7 nuits" },
      "flightDuration": "3h30",
      "flightType": "direct",
      "airTemp": 32,
      "waterTemp": 26,
      "visaRequired": false,
      "mainLanguage": "Grec / Anglais",
      "warnings": [
        { "level": "orange", "text": "Première quinzaine d'août très fréquentée. Préfère la 2e quinzaine." },
        { "level": "green", "text": "Eau à son maximum en août — critère 25°C+ parfaitement rempli." }
      ],
      "pills": ["Pas de visa", "Vol direct", "Mer chaude"],
      "highlights": ["Plages de Balos et Elafonisi", "Gorges de Samaria", "Gastronomie crétoise"],
      "bookingLinks": {
        "flights": "https://skyscanner.fr/...",
        "hotels": "https://booking.com/...",
        "activities": "https://getyourguide.fr/..."
      }
    }
  ]
}
Réponds UNIQUEMENT en JSON valide, sans markdown.
`
```

### Calcul du budget dynamique

```typescript
function calculateBudget(profile: TravelProfile, baseEstimate: { min: number, max: number }) {
  let multiplier = 1

  // Ajustement saison
  const highSeasonMonths = [7, 8] // août, juillet
  const shoulderMonths = [6, 9]   // juin, septembre
  if (highSeasonMonths.includes(profile.monthIndex)) multiplier *= 1.3
  if (shoulderMonths.includes(profile.monthIndex)) multiplier *= 1.1

  // Ajustement groupe
  if (profile.group === 'family') multiplier *= 1.2
  if (profile.group === 'friends') multiplier *= 0.9 // partage frais

  // Ajustement hébergement
  if (profile.accommodation.includes('allinclusive')) multiplier *= 1.4
  if (profile.accommodation.includes('hostel')) multiplier *= 0.6

  return {
    min: Math.round(baseEstimate.min * multiplier),
    max: Math.round(baseEstimate.max * multiplier)
  }
}
```

### Système de Warnings

```typescript
type WarningLevel = 'red' | 'orange' | 'green'

interface Warning {
  level: WarningLevel
  icon: string
  text: string
}

// Exemples de warnings générés par l'IA ou en base statique
const warningExamples = {
  red: { icon: '🔴', text: 'Haute saison absolue — hôtels souvent complets. Réservation indispensable.' },
  orange: { icon: '⚠️', text: 'Première quinzaine d\'août très fréquentée. Préfère la 2e quinzaine.' },
  green: { icon: '✓', text: 'Eau à son maximum — critère 25°C+ parfaitement rempli.' }
}

// Couleurs UI par niveau
const warningStyles = {
  red: 'bg-red-50 text-red-800',
  orange: 'bg-amber-50 text-amber-800',
  green: 'bg-green-50 text-green-800'
}
```

### UI Page Résultats

```
┌─────────────────────────────┐
│ 3 destinations pour toi      │
│ Basé sur 15 critères · Août  │
├─────────────────────────────┤
│ [Destinations] [Carte] [Comparer] │
├─────────────────────────────┤
│ 🇬🇷 Crète              98%  │
│ 860€ – 1 050€ / pers.       │
│ ✈️ 3h30 · ☀️ 32°C · 🌊 26°C │
│ ⚠️ Août très fréquenté...   │
│ ✓ Eau 26°C = critère rempli │
│ [Pas de visa] [Direct] [Mer]│
├─────────────────────────────┤
│ 🇲🇹 Malte              91%  │
│ ...                          │
├─────────────────────────────┤
│ 🇨🇻 Cap-Vert           85%  │
│ ...                          │
├─────────────────────────────┤
│    ↺ Affiner mes critères   │
└─────────────────────────────┘
```

---

## Fiche Destination

### Sections

1. **Header** : drapeau + nom + pays + score de matching
2. **Barre de matching** : barre de progression colorée
3. **Grille infos** (2 colonnes) :
   - Vol depuis [ville départ]
   - Meilleure période
   - Température eau
   - Budget estimé
   - Visa requis
   - Langue principale
4. **À ne pas rater** : liste 4–5 highlights générés par IA
5. **Warnings** : tous les warnings de la destination
6. **Réservations** : 3 boutons (Skyscanner / Booking / GetYourGuide)
7. **CTA principal** : "Créer mon itinéraire →"

---

## Génération d'itinéraire (Claude API)

### Mode "pose la valise"

```typescript
const itineraryPrompt = `
Tu es un expert voyagiste. Crée un itinéraire détaillé pour :
- Destination : ${destination.city}, ${destination.country}
- Dates : ${profile.month}, ${profile.nights} nuits
- Profil : ${JSON.stringify(profile)}

Format JSON :
{
  "itinerary": [
    {
      "day": 1,
      "date": "Samedi 2 août",
      "title": "Arrivée & première exploration",
      "morning": { "activity": "...", "duration": "2h", "tip": "..." },
      "afternoon": { "activity": "...", "duration": "3h", "tip": "..." },
      "evening": { "activity": "...", "restaurant": "...", "tip": "..." },
      "accommodation": { "name": "...", "area": "...", "type": "..." },
      "budget_day": 120
    }
  ],
  "total_budget": { "min": 860, "max": 1050 },
  "packing_tips": ["..."],
  "best_transport_local": "..."
}
`
```

### Mode "on bouge"

```typescript
const routePrompt = `
Crée un circuit multi-étapes pour :
- Région : ${profile.region}
- Durée : ${profile.nights} nuits
- Nombre d'étapes : ${profile.stopsCount}
- Transport disponible : ${profile.transport.join(', ')}

Format JSON :
{
  "route": [
    {
      "stop": 1,
      "city": "Athènes",
      "country": "Grèce",
      "flag": "🇬🇷",
      "nights": 4,
      "transport_in": { "type": "plane", "from": "Paris", "duration": "3h30", "estimated_cost": 150 },
      "transport_to_next": { "type": "ferry", "to": "Santorin", "duration": "2h", "estimated_cost": 45 },
      "highlights": ["Acropole", "Plaka", "Musée national"],
      "accommodation_area": "Monastiraki"
    }
  ],
  "total_transport_cost": 245,
  "total_budget": { "min": 1450, "max": 1800 }
}
`
```

---

## Calcul voiture (Q8b)

```typescript
interface CarCostEstimate {
  fuel: number       // aller-retour, base 7L/100km, diesel 1.75€/L
  tolls: number      // base statique France
  parking: number    // forfait 40€
  total: number
}

// Distances approximatives depuis Paris (km aller simple)
const distancesFromParis: Record<string, number> = {
  'Barcelona': 1050,
  'Rome': 1420,
  'Amsterdam': 500,
  'Berlin': 1050,
  'Madrid': 1270,
  'Lisbon': 1800,
  'Nice': 930,
  'Lyon': 465,
}

function calculateCarCost(departure: string, destination: string, nights: number): CarCostEstimate {
  const distance = getDistance(departure, destination)
  const fuel = Math.round((distance * 2) * 0.07 * 1.75)
  const tolls = Math.round(distance * 0.06) // ~6cts/km de péages
  const parking = nights <= 7 ? 40 : 80

  return { fuel, tolls, parking, total: fuel + tolls + parking }
}
```

---

## Composants UI clés

### QuestionStep (générique)

```typescript
interface QuestionStepProps {
  question: string
  subtitle?: string
  contextBadge?: string      // ex: "🏖️ Spécifique mer"
  options: Option[]
  multi?: boolean            // sélection multiple
  onComplete: (values: string[]) => void
  onBack?: () => void
  stepNumber: number
  totalSteps: number
  progress: number           // 0-100
}

interface Option {
  icon: string
  label: string
  detail?: string
  disabled?: boolean
  disabledReason?: string   // ex: "Non dispo depuis Paris"
}
```

### DestinationCard

```typescript
interface DestinationCardProps {
  destination: Destination
  rank: 1 | 2 | 3
  onSelect: () => void
  profile: TravelProfile     // pour personnaliser les warnings
}
```

---

## Design System

### Couleurs principales
```css
--primary: #534AB7        /* Violet principal */
--primary-light: #EEEDFE  /* Violet très clair (fonds) */
--primary-mid: #AFA9EC    /* Violet moyen (bordures) */
--primary-dark: #3C3489   /* Violet foncé (textes sur fond clair) */
```

### Boutons de questions
```css
/* État normal */
border: 1px solid #e5e7eb;
border-radius: 12px;
padding: 10px 8px;
background: white;

/* État sélectionné */
border: 2px solid #534AB7;
background: #EEEDFE;
color: #3C3489;

/* Hover */
border-color: #7F77DD;
background: #EEEDFE;
```

### Barre de progression
```css
height: 3px;
background: #534AB7;
transition: width 0.4s ease;
border-radius: 0 2px 2px 0;
```

---

## Ordre de développement recommandé

1. **Setup** : Next.js + Tailwind + PWA manifest + service worker
2. **State management** : TravelProfile avec Zustand ou Context
3. **Flow de questions** : composant QuestionStep générique + les 15 questions
4. **Logique conditionnelle** : buildQueue() qui filtre selon les réponses
5. **Page résultats** : appel Claude API + affichage 3 destinations
6. **Warnings** : système 3 niveaux (rouge / orange / vert)
7. **Budget dynamique** : calcul selon saison + groupe + hébergement
8. **Fiche destination** : infos détaillées + liens partenaires
9. **Génération itinéraire** : appel Claude API + affichage jour par jour
10. **Mode "on bouge"** : route multi-étapes
11. **Calcul voiture** : depuis ville de départ
12. **PWA** : test installation Android + iOS

---

## Prompt de démarrage pour Claude Code

Copie-colle ce prompt dans Claude Code pour démarrer :

```
Je veux construire une PWA de voyage appelée "Où on part ?".
Voici les spécifications complètes dans le fichier joint.

Commence par :
1. Scaffolding Next.js 14 avec App Router et Tailwind CSS
2. Configuration PWA (next-pwa, manifest.json, service worker)
3. Le composant QuestionStep générique (100% boutons, aucun input texte)
4. L'état global TravelProfile avec Zustand
5. Les 3 premières questions (mois, nuits, budget)

Stack : Next.js 14 / Tailwind CSS / Zustand / Claude API / Vercel
Design : mobile-first, couleur principale #534AB7, border-radius 12px, boutons avec état sélectionné en fond violet clair.
```
