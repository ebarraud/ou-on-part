import type { TravelProfile, Destination, Itinerary, Route } from './types';
import { useTravelStore } from './store';

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Claude API error: ${res.status}`);
  }

  const data = await res.json();

  // Track usage
  if (data.usage) {
    useTravelStore.getState().addUsage(
      data.usage.cost || 0,
      data.usage.inputTokens || 0,
      data.usage.outputTokens || 0
    );
  }

  return data.content;
}

export async function generateDestinations(profile: TravelProfile): Promise<Destination[]> {
  // Build budget guidance
  const budgetGuide: Record<string, string> = {
    tight: 'SERRÉ — max 50€/jour/personne (hébergement + repas + activités, hors vol). Privilégie les destinations pas chères : Balkans, Asie du Sud-Est, Maroc, Tunisie, Europe de l\'Est, etc.',
    moderate: 'MODÉRÉ — 50-120€/jour/personne. Bon rapport qualité/prix.',
    comfort: 'CONFORT — 120-250€/jour/personne. Hôtels de qualité, restaurants, expériences.',
    unlimited: 'SANS LIMITE — pas de contrainte budgétaire. Propose du haut de gamme.',
  };

  const budgetInstruction = budgetGuide[profile.budget || 'moderate'] || budgetGuide.moderate;

  const prompt = `Tu es un expert voyagiste francophone. Voici le profil du voyageur :
${JSON.stringify(profile, null, 2)}

BUDGET : ${budgetInstruction}

Génère EXACTEMENT 3 destinations en JSON avec cette structure :
{
  "destinations": [
    {
      "id": "slug-unique",
      "country": "Nom du pays",
      "countryCode": "XX",
      "city": "Nom de la ville/région",
      "flag": "emoji drapeau",
      "matchScore": 98,
      "matchReasons": ["Raison 1", "Raison 2", "Raison 3"],
      "budget": { "min": 860, "max": 1050, "currency": "EUR", "includes": "vol + hôtel X nuits" },
      "flightDuration": "3h30",
      "flightType": "direct",
      "airTemp": 32,
      "waterTemp": 26,
      "visaRequired": false,
      "mainLanguage": "Langue locale / Anglais",
      "warnings": [
        { "level": "orange", "text": "Warning text" },
        { "level": "green", "text": "Positive note" }
      ],
      "pills": ["Pas de visa", "Vol direct", "Mer chaude"],
      "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4"],
      "bookingLinks": {
        "flights": "https://www.skyscanner.fr/",
        "hotels": "https://www.booking.com/",
        "activities": "https://www.getyourguide.fr/"
      }
    }
  ]
}

Règles STRICTES :
- Les destinations NE DOIVENT PAS être dans la liste des pays déjà visités : ${profile.visited.join(', ')}
- matchScore entre 70 et 99
- IMPORTANT : Le budget TOTAL (vol + hébergement + repas + activités) doit RESPECTER le niveau de budget choisi (${profile.budget}). ${budgetInstruction}
- Le champ budget.min et budget.max = budget TOTAL par personne pour ${profile.nights} nuits, vol inclus
- Warnings pertinents pour le mois ${profile.month}
- La première destination doit avoir le meilleur score
- waterTemp peut être null si pas de mer
- countryCode = code ISO 2 lettres du pays (ex: "GR", "ES", "TH")
- Adapte les suggestions au style de voyage : ${profile.travelStyle === 'moving' ? 'circuit multi-étapes' : 'base fixe'}
- IMPORTANT : Pense aussi aux territoires d'outre-mer français (Martinique, Guadeloupe, Réunion, Nouvelle-Calédonie, Polynésie, Guyane, Mayotte) comme destinations possibles. Utilise "MQ" pour Martinique, "GP" pour Guadeloupe, "RE" pour Réunion, "NC" pour Nouvelle-Calédonie, "PF" pour Polynésie française, "GF" pour Guyane, "YT" pour Mayotte. Ce ne sont PAS la même chose que la France métropolitaine (FR).
- Varie les destinations : propose des destinations originales et diversifiées, pas toujours les mêmes classiques

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

  const content = await callClaude(prompt);

  try {
    const parsed = JSON.parse(content);
    return parsed.destinations;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.destinations;
    }
    throw new Error('Failed to parse destinations from Claude response');
  }
}

export async function generateOneDestination(
  profile: TravelProfile,
  excludeCountryCodes: string[]
): Promise<Destination> {
  const budgetGuide: Record<string, string> = {
    tight: 'SERRÉ — max 50€/jour/personne (hébergement + repas + activités, hors vol). Privilégie les destinations pas chères : Balkans, Asie du Sud-Est, Maroc, Tunisie, Europe de l\'Est, etc.',
    moderate: 'MODÉRÉ — 50-120€/jour/personne. Bon rapport qualité/prix.',
    comfort: 'CONFORT — 120-250€/jour/personne. Hôtels de qualité, restaurants, expériences.',
    unlimited: 'SANS LIMITE — pas de contrainte budgétaire. Propose du haut de gamme.',
  };

  const budgetInstruction = budgetGuide[profile.budget || 'moderate'] || budgetGuide.moderate;
  const allExcluded = Array.from(new Set([...profile.visited, ...excludeCountryCodes]));

  const prompt = `Tu es un expert voyagiste francophone. Voici le profil du voyageur :
${JSON.stringify(profile, null, 2)}

BUDGET : ${budgetInstruction}

Génère EXACTEMENT 1 seule destination de remplacement en JSON avec cette structure :
{
  "destination": {
    "id": "slug-unique",
    "country": "Nom du pays",
    "countryCode": "XX",
    "city": "Nom de la ville/région",
    "flag": "emoji drapeau",
    "matchScore": 98,
    "matchReasons": ["Raison 1", "Raison 2", "Raison 3"],
    "budget": { "min": 860, "max": 1050, "currency": "EUR", "includes": "vol + hôtel X nuits" },
    "flightDuration": "3h30",
    "flightType": "direct",
    "airTemp": 32,
    "waterTemp": 26,
    "visaRequired": false,
    "mainLanguage": "Langue locale / Anglais",
    "warnings": [
      { "level": "orange", "text": "Warning text" },
      { "level": "green", "text": "Positive note" }
    ],
    "pills": ["Pas de visa", "Vol direct", "Mer chaude"],
    "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4"],
    "bookingLinks": {
      "flights": "https://www.skyscanner.fr/",
      "hotels": "https://www.booking.com/",
      "activities": "https://www.getyourguide.fr/"
    }
  }
}

Règles STRICTES :
- La destination NE DOIT PAS être dans cette liste de pays exclus : ${allExcluded.join(', ')}
- matchScore entre 70 et 99
- IMPORTANT : Le budget TOTAL (vol + hébergement + repas + activités) doit RESPECTER le niveau de budget choisi (${profile.budget}). ${budgetInstruction}
- Le champ budget.min et budget.max = budget TOTAL par personne pour ${profile.nights} nuits, vol inclus
- Warnings pertinents pour le mois ${profile.month}
- waterTemp peut être null si pas de mer
- countryCode = code ISO 2 lettres du pays (ex: "GR", "ES", "TH")
- Adapte les suggestions au style de voyage : ${profile.travelStyle === 'moving' ? 'circuit multi-étapes' : 'base fixe'}
- IMPORTANT : Pense aussi aux territoires d'outre-mer français (Martinique, Guadeloupe, Réunion, Nouvelle-Calédonie, Polynésie, Guyane, Mayotte) comme destinations possibles. Utilise "MQ" pour Martinique, "GP" pour Guadeloupe, "RE" pour Réunion, "NC" pour Nouvelle-Calédonie, "PF" pour Polynésie française, "GF" pour Guyane, "YT" pour Mayotte. Ce ne sont PAS la même chose que la France métropolitaine (FR).
- Varie les destinations : propose une destination originale et diversifiée, pas les classiques

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

  const content = await callClaude(prompt);

  try {
    const parsed = JSON.parse(content);
    return parsed.destination;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.destination;
    }
    throw new Error('Failed to parse destination from Claude response');
  }
}

export async function generateItinerary(
  profile: TravelProfile,
  destination: Destination
): Promise<Itinerary> {
  const prompt = `Tu es un expert voyagiste francophone. Crée un itinéraire détaillé pour :
- Destination : ${destination.city}, ${destination.country}
- Mois : ${profile.month}
- Durée : ${profile.nights} nuits
- Profil complet : ${JSON.stringify(profile, null, 2)}

Format JSON strict :
{
  "itinerary": [
    {
      "day": 1,
      "date": "Jour de la semaine + date",
      "title": "Titre du jour",
      "morning": { "activity": "...", "duration": "2h", "tip": "..." },
      "afternoon": { "activity": "...", "duration": "3h", "tip": "..." },
      "evening": { "activity": "...", "duration": "2h", "tip": "...", "restaurant": "Nom du restaurant" },
      "accommodation": { "name": "Nom", "area": "Quartier", "type": "Type" },
      "budget_day": 120
    }
  ],
  "total_budget": { "min": ${destination.budget.min}, "max": ${destination.budget.max} },
  "packing_tips": ["Conseil 1", "Conseil 2", "Conseil 3"],
  "best_transport_local": "Moyen de transport local recommandé"
}

Règles :
- Génère exactement le bon nombre de jours selon la durée (${profile.nights} nuits = ${profile.nights === '2-3' ? '3' : profile.nights === '4-6' ? '5' : profile.nights === '7' ? '7' : '10'} jours)
- Adapte les activités au profil (${profile.priority.join(', ')})
- Tiens compte des contraintes : ${profile.constraints.join(', ') || 'aucune'}
- Budget journalier réaliste

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

  const content = await callClaude(prompt);

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse itinerary from Claude response');
  }
}

export async function generateRoute(
  profile: TravelProfile,
  destination: Destination
): Promise<Route> {
  const prompt = `Tu es un expert voyagiste francophone. Crée un circuit multi-étapes pour :
- Région de départ : ${destination.city}, ${destination.country}
- Mois : ${profile.month}
- Durée : ${profile.nights} nuits
- Nombre d'étapes : ${profile.stopsCount || 3}
- Transport : ${profile.transport.join(', ')}
- Profil : ${JSON.stringify(profile, null, 2)}

Format JSON strict :
{
  "route": [
    {
      "stop": 1,
      "city": "Nom ville",
      "country": "Pays",
      "flag": "🏳️",
      "nights": 3,
      "transport_in": { "type": "plane", "from": "${profile.departureCity}", "duration": "3h30", "estimated_cost": 150 },
      "transport_to_next": { "type": "ferry", "to": "Ville suivante", "duration": "2h", "estimated_cost": 45 },
      "highlights": ["A voir 1", "A voir 2", "A voir 3"],
      "accommodation_area": "Quartier recommandé"
    }
  ],
  "total_transport_cost": 245,
  "total_budget": { "min": 1450, "max": 1800 }
}

Règles :
- Exactement ${profile.stopsCount || 3} étapes
- La dernière étape n'a pas de transport_to_next
- Répartis les nuits logiquement
- Budget réaliste par personne

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

  const content = await callClaude(prompt);

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse route from Claude response');
  }
}
