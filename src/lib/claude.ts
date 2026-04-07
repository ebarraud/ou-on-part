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

Règles STRICTES — TOUS les critères du profil doivent être respectés :

EXCLUSIONS :
- Les destinations NE DOIVENT PAS être dans la liste des pays déjà visités : ${profile.visited.join(', ')}

PÉRIODE & DURÉE :
- Mois de voyage : ${profile.month}${profile.monthHalf ? (profile.monthHalf === '1' ? ' (première quinzaine)' : ' (deuxième quinzaine)') : ''} ${profile.year}
- Durée : ${profile.nights} nuits. Le budget.min et budget.max = budget TOTAL par personne pour cette durée, vol inclus
- Warnings pertinents pour cette période (météo, saison des pluies, haute saison, etc.)

BUDGET :
- IMPORTANT : Le budget TOTAL (vol + hébergement + repas + activités) doit RESPECTER le niveau choisi (${profile.budget}). ${budgetInstruction}

CONTEXTE & GROUPE :
- Type de voyage : ${profile.tripContext || 'non précisé'}. Adapte l'ambiance (ex: honeymoon → romantique, friends → festif, workation → bon wifi)
- Groupe : ${profile.group || 'non précisé'}${profile.kidsAges.length > 0 ? '. Enfants : ' + profile.kidsAges.join(', ') + ' — destinations adaptées aux familles, sécurité, activités enfants' : ''}
- Style : ${profile.travelStyle === 'moving' ? 'circuit multi-étapes' : 'base fixe'}

TRANSPORT & DÉPART :
- Ville de départ : ${profile.departureCity}. La durée de vol (flightDuration) doit être calculée DEPUIS cette ville
- Transports acceptés : ${profile.transport.join(', ')}. Ne propose QUE des destinations accessibles avec ces modes de transport
${profile.transport.some((t: string) => ['car', 'train', 'ferry'].includes(t)) && !profile.transport.includes('plane') ? `- CONTRAINTE TEMPS DE TRAJET (voiture/train/ferry) : le trajet ALLER depuis ${profile.departureCity} ne doit PAS dépasser ${profile.nights === '10+' ? '8h' : '4h'}. C'est une règle STRICTE. Exemple : pour un week-end depuis Grenoble, la Croatie ou la Sardaigne sont TROP LOIN. Privilégie les destinations proches.` : profile.transport.some((t: string) => ['car', 'train', 'ferry'].includes(t)) && profile.transport.includes('plane') ? `- CONSEIL TEMPS DE TRAJET : si la destination est accessible en voiture/train/ferry, le trajet ALLER depuis ${profile.departureCity} ne devrait pas dépasser ${profile.nights === '10+' ? '8h' : '4h'}. Pour les destinations plus lointaines, privilégie l'avion.` : ''}

AMBIANCE & ENVIRONNEMENT :
- Ambiances souhaitées : ${profile.vibe.join(', ')}. Les destinations DOIVENT correspondre à ces ambiances
${profile.waterTemp && profile.waterTemp !== 'any' ? '- Température de l\'eau souhaitée : ' + profile.waterTemp + '. Adapte les destinations balnéaires en conséquence' : ''}
- Climat souhaité : ${profile.climate.length > 0 ? profile.climate.join(', ') : 'non précisé'}. Chaque destination doit correspondre à AU MOINS UN de ces climats pour la période choisie. Varie les propositions pour couvrir les différents climats sélectionnés.

PRIORITÉS & ACTIVITÉS :
- Priorités du voyageur : ${profile.priority.join(', ')}. Le matchScore et les matchReasons doivent refléter ces priorités
${profile.sportActivities.length > 0 ? '- IMPORTANT : Activités sportives : ' + profile.sportActivities.join(', ') + '. Les destinations DOIVENT proposer ces activités. Mentionne les spots dans highlights et matchReasons. (mountain_walk = balades tranquilles en montagne, hiking = randonnée en montagne/nature, climbing = escalade/via ferrata, trail = trail/running, ski = ski/snowboard, mtb = VTT, cycling = vélo route, surf = surf, windsurf = windsurf/wingfoil, watersports = sports nautiques, diving = plongée/snorkeling, paragliding = parapente, skydiving = parachute/ULM, kayak = kayak/canoë/rafting)' : ''}

HÉBERGEMENT :
- Types souhaités : ${profile.accommodation.length > 0 ? profile.accommodation.join(', ') : 'non précisé'}. Adapte le budget et les suggestions en conséquence

CONTRAINTES :
${profile.constraints.length > 0 ? '- Contraintes : ' + profile.constraints.join(', ') + '. RESPECTER impérativement (PMR → accessibilité, végétarien → offre locale, noaltitude → pas de haute altitude, noheat → pas de canicule)' : '- Aucune contrainte particulière'}

LANGUE :
- Préférence langue : ${profile.language || 'any'}${profile.language === 'french' ? '. Privilégie les pays francophones ou DOM-TOM' : profile.language === 'english' ? '. Pays où l\'anglais est largement parlé' : profile.language === 'nearby' ? '. Culture proche de la France, pas trop dépaysant' : ''}

FORMAT :
- matchScore entre 70 et 99, la première destination doit avoir le meilleur score
- waterTemp peut être null si pas de mer
- countryCode = code ISO 2 lettres du pays (ex: "GR", "ES", "TH")
- IMPORTANT : Pense aussi aux territoires d'outre-mer français (Martinique, Guadeloupe, Réunion, Nouvelle-Calédonie, Polynésie, Guyane, Mayotte). Utilise "MQ", "GP", "RE", "NC", "PF", "GF", "YT". Ce ne sont PAS la même chose que la France métropolitaine (FR).
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

Règles STRICTES — TOUS les critères du profil doivent être respectés :

EXCLUSIONS :
- La destination NE DOIT PAS être dans cette liste de pays exclus : ${allExcluded.join(', ')}

PÉRIODE & DURÉE :
- Mois de voyage : ${profile.month}${profile.monthHalf ? (profile.monthHalf === '1' ? ' (première quinzaine)' : ' (deuxième quinzaine)') : ''} ${profile.year}
- Durée : ${profile.nights} nuits. Le budget.min et budget.max = budget TOTAL par personne pour cette durée, vol inclus
- Warnings pertinents pour cette période (météo, saison des pluies, haute saison, etc.)

BUDGET :
- IMPORTANT : Le budget TOTAL (vol + hébergement + repas + activités) doit RESPECTER le niveau choisi (${profile.budget}). ${budgetInstruction}

CONTEXTE & GROUPE :
- Type de voyage : ${profile.tripContext || 'non précisé'}. Adapte l'ambiance (ex: honeymoon → romantique, friends → festif, workation → bon wifi)
- Groupe : ${profile.group || 'non précisé'}${profile.kidsAges.length > 0 ? '. Enfants : ' + profile.kidsAges.join(', ') + ' — destination adaptée aux familles, sécurité, activités enfants' : ''}
- Style : ${profile.travelStyle === 'moving' ? 'circuit multi-étapes' : 'base fixe'}

TRANSPORT & DÉPART :
- Ville de départ : ${profile.departureCity}. La durée de vol (flightDuration) doit être calculée DEPUIS cette ville
- Transports acceptés : ${profile.transport.join(', ')}. Ne propose QUE des destinations accessibles avec ces modes de transport
${profile.transport.some((t: string) => ['car', 'train', 'ferry'].includes(t)) && !profile.transport.includes('plane') ? `- CONTRAINTE TEMPS DE TRAJET (voiture/train/ferry) : le trajet ALLER depuis ${profile.departureCity} ne doit PAS dépasser ${profile.nights === '10+' ? '8h' : '4h'}. C'est une règle STRICTE. Privilégie les destinations proches.` : profile.transport.some((t: string) => ['car', 'train', 'ferry'].includes(t)) && profile.transport.includes('plane') ? `- CONSEIL TEMPS DE TRAJET : si la destination est accessible en voiture/train/ferry, le trajet ALLER depuis ${profile.departureCity} ne devrait pas dépasser ${profile.nights === '10+' ? '8h' : '4h'}. Pour les destinations plus lointaines, privilégie l'avion.` : ''}

AMBIANCE & ENVIRONNEMENT :
- Ambiances souhaitées : ${profile.vibe.join(', ')}. La destination DOIT correspondre à ces ambiances
${profile.waterTemp && profile.waterTemp !== 'any' ? '- Température de l\'eau souhaitée : ' + profile.waterTemp + '. Adapte la destination balnéaire en conséquence' : ''}
- Climat souhaité : ${profile.climate.length > 0 ? profile.climate.join(', ') : 'non précisé'}. La destination doit correspondre à AU MOINS UN de ces climats pour la période choisie

PRIORITÉS & ACTIVITÉS :
- Priorités du voyageur : ${profile.priority.join(', ')}. Le matchScore et les matchReasons doivent refléter ces priorités
${profile.sportActivities.length > 0 ? '- IMPORTANT : Activités sportives : ' + profile.sportActivities.join(', ') + '. La destination DOIT proposer ces activités. Mentionne les spots dans highlights et matchReasons. (mountain_walk = balades tranquilles en montagne, hiking = randonnée en montagne/nature, climbing = escalade/via ferrata, trail = trail/running, ski = ski/snowboard, mtb = VTT, cycling = vélo route, surf = surf, windsurf = windsurf/wingfoil, watersports = sports nautiques, diving = plongée/snorkeling, paragliding = parapente, skydiving = parachute/ULM, kayak = kayak/canoë/rafting)' : ''}

HÉBERGEMENT :
- Types souhaités : ${profile.accommodation.length > 0 ? profile.accommodation.join(', ') : 'non précisé'}. Adapte le budget et les suggestions en conséquence

CONTRAINTES :
${profile.constraints.length > 0 ? '- Contraintes : ' + profile.constraints.join(', ') + '. RESPECTER impérativement (PMR → accessibilité, végétarien → offre locale, noaltitude → pas de haute altitude, noheat → pas de canicule)' : '- Aucune contrainte particulière'}

LANGUE :
- Préférence langue : ${profile.language || 'any'}${profile.language === 'french' ? '. Privilégie les pays francophones ou DOM-TOM' : profile.language === 'english' ? '. Pays où l\'anglais est largement parlé' : profile.language === 'nearby' ? '. Culture proche de la France, pas trop dépaysant' : ''}

FORMAT :
- matchScore entre 70 et 99
- waterTemp peut être null si pas de mer
- countryCode = code ISO 2 lettres du pays (ex: "GR", "ES", "TH")
- IMPORTANT : Pense aussi aux territoires d'outre-mer français. Utilise "MQ", "GP", "RE", "NC", "PF", "GF", "YT". Ce ne sont PAS la même chose que la France métropolitaine (FR).
- Varie : propose une destination originale et diversifiée, pas les classiques

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
