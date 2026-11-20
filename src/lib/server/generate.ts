import 'server-only';
import type { TravelProfile, Destination, Itinerary, Route } from '../types';
import { getDepartureIata } from '../airports';
import { getDates, getPassengers } from '../booking-links';
import { formatRange, getNightsCount, hasExactDates } from '../dates';
import { getBudgetMultiplier, isHolidayPeak } from '../budget';
import {
  checkDestination,
  formatHours,
  getBaseBudgetCap,
  getBudgetCap,
  getMaxTravelHours,
  type Rejection,
} from '../constraints';
import { flightPriceFromParams } from './flights';
import { ferryFromParams } from './ferry';

const MODEL = 'claude-sonnet-4-5';

// Appel direct à l'API Claude, côté serveur uniquement (la clé ne quitte jamais le serveur)
async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[claude] erreur', res.status, text.slice(0, 500));
    throw new Error(`Le service IA est indisponible (${res.status}). Réessaie dans un instant.`);
  }
  const data = await res.json();
  const usage = data.usage || {};
  console.log(`[claude] ${usage.input_tokens || 0} in / ${usage.output_tokens || 0} out`);
  return data.content?.[0]?.text || '';
}

const BUDGET_STYLE: Record<string, string> = {
  tight: 'SERRÉ — destinations pas chères : Balkans, Asie du Sud-Est, Maroc, Tunisie, Europe de l\'Est, etc.',
  moderate: 'MODÉRÉ — bon rapport qualité/prix.',
  comfort: 'CONFORT — hôtels de qualité, restaurants, expériences.',
  unlimited: 'SANS LIMITE — propose du haut de gamme.',
};

const SPORT_GLOSSARY = '(mountain_walk = balades tranquilles en montagne, hiking = randonnée en montagne/nature, climbing = escalade/via ferrata, trail = trail/running, ski = ski/snowboard, mtb = VTT, cycling = vélo route, surf = surf, windsurf = windsurf/wingfoil, watersports = sports nautiques, diving = plongée/snorkeling, paragliding = parapente, skydiving = parachute/ULM, kayak = kayak/canoë/rafting)';

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Réponse de Claude illisible');
  }
}

function buildDestinationsPrompt(
  profile: TravelProfile,
  count: number,
  excludedCodes: string[],
  rejected: Rejection[]
): string {
  const allExcluded = Array.from(new Set([...profile.visited, ...excludedCodes]));
  const budgetCap = getBudgetCap(profile);
  const baseCap = getBaseBudgetCap(profile);
  const budgetMultiplier = getBudgetMultiplier(profile);
  const maxHours = getMaxTravelHours(profile);
  const period = hasExactDates(profile)
    ? `DATES PRÉCISES ${formatRange(profile.startDate, profile.endDate)}`
    : `${profile.month}${profile.monthHalf ? (profile.monthHalf === '1' ? ' (première quinzaine)' : ' (deuxième quinzaine)') : ''} ${profile.year}`;
  const nightsLabel = hasExactDates(profile) ? String(getNightsCount(profile)) : profile.nights;
  const plural = count > 1;

  const budgetRule = isFinite(budgetCap)
    ? `- BUDGET MAX : ${budgetCap}€ par personne TOUT COMPRIS (vol aller-retour + hébergement + repas + activités) pour ${nightsLabel} nuits.
  L'application applique ensuite elle-même une majoration de ×${budgetMultiplier.toFixed(2)} (saison${isHolidayPeak(profile) ? ' — période des fêtes, la plus chère de l\'année' : ''}, groupe, type d'hébergement).
  Donc budget.min et budget.max doivent être des prix de base, et budget.min doit être ≤ ${baseCap}€. Sois réaliste sur le prix du vol à cette période : si le vol seul dépasse ce montant, la destination est exclue.`
    : `- BUDGET : pas de plafond. Donne budget.min et budget.max en prix de base (l'application applique la majoration saisonnière).`;

  const travelRule = isFinite(maxHours)
    ? `- TRAJET MAX : le trajet principal ALLER depuis ${profile.departureCity} (vol, route, train ou ferry) ne doit PAS dépasser ${formatHours(maxHours)}. Renseigne travelHours = cette durée en heures décimales (ex : 3.5 pour 3h30), escales comprises.`
    : `- TRAJET : pas de limite de durée (long-courrier accepté). Renseigne travelHours = durée du trajet principal aller en heures décimales, escales comprises.`;

  const rejectedBlock = rejected.length > 0
    ? `\nDESTINATIONS DÉJÀ REFUSÉES (ne les repropose pas, et évite les destinations comparables) :\n${rejected
        .map((r) => `- ${r.destination.city}, ${r.destination.country} : ${r.reason}`)
        .join('\n')}\n`
    : '';

  return `Tu es un expert voyagiste francophone. Voici le profil du voyageur :
${JSON.stringify(profile, null, 2)}

Génère EXACTEMENT ${count} destination${plural ? 's' : ''} en JSON avec cette structure :
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
      "budget": { "min": 860, "max": 1050, "currency": "EUR", "includes": "vol + hôtel X nuits", "flight": 280 },
      "airportCode": "ATH",
      "ferry": null,
      "flightDuration": "3h30",
      "travelHours": 3.5,
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

═══ CONTRAINTES ÉLIMINATOIRES ═══
Chaque destination est vérifiée automatiquement après ta réponse. Une seule contrainte non respectée = destination rejetée.
- PAYS EXCLUS : ${allExcluded.length > 0 ? allExcluded.join(', ') : 'aucun'}
${budgetRule}
${travelRule}
- TRANSPORTS ACCEPTÉS : ${profile.transport.join(', ')}. Ne propose QUE des destinations accessibles avec ces modes depuis ${profile.departureCity}
${profile.departureAirport && profile.departureAirportName && profile.departureAirportName !== profile.departureCity ? `- DÉPART EN AVION : depuis l'aéroport de ${profile.departureAirportName} (${profile.departureAirport}), à environ ${profile.departureAirportKm ?? '?'} km de ${profile.departureCity}. Calcule les durées de vol depuis cet aéroport.` : ''}
- PÉRIODE : ${period}, ${nightsLabel} nuits
${profile.constraints.length > 0 ? '- CONTRAINTES PERSONNELLES : ' + profile.constraints.join(', ') + ' (PMR → accessibilité, végétarien → offre locale, halal → offre locale, glutenfree → offre locale, noaltitude → pas au-dessus de 2 000 m, noheat → pas de chaleur au-dessus de 35°C à cette période)' : ''}
${profile.group === 'family' && profile.kidsAges.length > 0 ? '- ENFANTS : ' + profile.kidsAges.join(', ') + ' — destinations sûres et adaptées aux familles' : ''}
${rejectedBlock}
═══ PRÉFÉRENCES (à pondérer dans le matchScore) ═══
- Style de budget : ${BUDGET_STYLE[profile.budget || 'moderate']}
- Type de voyage : ${profile.tripContext || 'non précisé'} (honeymoon → romantique, friends → festif, workation → bon wifi)
- Groupe : ${profile.group || 'non précisé'}
- Style : ${profile.travelStyle === 'moving' ? 'circuit multi-étapes' : 'base fixe'}
- Ambiances : ${profile.vibe.join(', ') || 'non précisé'}
${profile.waterTemp && profile.waterTemp !== 'any' ? '- Température de l\'eau : ' + profile.waterTemp : ''}
- Climat : ${profile.climate.length > 0 ? profile.climate.join(', ') + '. Chaque destination doit correspondre à au moins un de ces climats à cette période' + (plural ? ' ; varie pour couvrir les climats choisis' : '') : 'non précisé'}
- Priorités : ${profile.priority.join(', ') || 'non précisé'}. Le matchScore et les matchReasons doivent les refléter
${profile.sportActivities.length > 0 ? '- Activités sportives : ' + profile.sportActivities.join(', ') + '. Mentionne les spots dans highlights et matchReasons. ' + SPORT_GLOSSARY : ''}
- Hébergement : ${profile.accommodation.length > 0 ? profile.accommodation.join(', ') : 'non précisé'}
- Langue : ${profile.language || 'any'}${profile.language === 'french' ? ' (privilégie les pays francophones ou l\'outre-mer)' : profile.language === 'english' ? ' (anglais largement parlé)' : profile.language === 'nearby' ? ' (culture proche de la France)' : ''}

═══ FORMAT ═══
- matchScore entre 70 et 99${plural ? ', la première destination a le meilleur score' : ''}
- flightDuration : durée lisible du trajet aller (ex : "3h30", "2h45 (1 escale)")
- budget.flight : ta part estimée du vol aller-retour par personne dans budget.min (0 si pas d'avion)
- ferry : si le trajet conseillé depuis ${profile.departureCity} comprend une traversée en ferry (Corse, Sardaigne, Baléares, îles grecques, Maghreb…) avec les transports acceptés, renseigne { "fromPort": "Toulon", "toPort": "Ajaccio", "duration": "6h", "pricePerPerson": 90, "vehiclePrice": 220 } : noms de ports simples, pricePerPerson = aller-retour par passager (compris dans budget.min), vehiclePrice = aller-retour pour une voiture ou null. Sinon null.
- airportCode : code IATA de la VILLE de l'aéroport d'arrivée le plus pratique (ex : "TYO", "LIS", "PMI", "RUN"), même si l'avion n'est pas choisi
- Warnings pertinents pour cette période (météo, saison des pluies, haute saison, prix des fêtes…)
- waterTemp peut être null si pas de mer
- countryCode = code ISO 2 lettres (ex : "GR", "ES", "TH"). Outre-mer français : "MQ", "GP", "RE", "NC", "PF", "GF", "YT" (pas "FR")
- Propose des destinations originales et diversifiées, pas toujours les mêmes classiques

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;
}

async function requestDestinations(
  profile: TravelProfile,
  count: number,
  excludedCodes: string[],
  rejected: Rejection[]
): Promise<Destination[]> {
  const content = await callClaude(buildDestinationsPrompt(profile, count, excludedCodes, rejected));
  const parsed = parseJson(content) as { destinations?: Destination[]; destination?: Destination };
  if (Array.isArray(parsed.destinations)) return parsed.destinations;
  if (parsed.destination) return [parsed.destination];
  throw new Error('Aucune destination dans la réponse de Claude');
}

// Quand le vol réel respecte la limite, sa durée et ses escales remplacent celles
// annoncées par Claude (qui peut dire « 4h15 direct » pour un vol à 6h35 avec escale).
function applyRealFlight(d: Destination): void {
  const fp = d.flightPrice;
  if (!fp || !fp.withinLimit || !fp.durationTo) return;
  const transfers = fp.transfers ?? 0;
  d.travelHours = fp.durationTo / 60;
  d.flightDuration = formatHours(d.travelHours);
  d.flightType = transfers === 0 ? 'direct' : `${transfers} escale${transfers > 1 ? 's' : ''}`;
  if (transfers > 0) {
    d.pills = (d.pills || []).filter((p) => !/vol direct|direct flight/i.test(p));
  }
}

// Prix réels des vols (Travelpayouts) — en cas d'échec on garde l'estimation de Claude
async function attachFlightPrices(profile: TravelProfile, batch: Destination[]): Promise<void> {
  if (!profile.transport.includes('plane')) return;
  const origin = getDepartureIata(profile);
  if (!origin || profile.monthIndex < 0 || !profile.year) return;
  const month = `${profile.year}-${String(profile.monthIndex + 1).padStart(2, '0')}`;
  const maxHours = getMaxTravelHours(profile);

  await Promise.all(
    batch.map(async (d) => {
      const dest = (d.airportCode || '').toUpperCase();
      if (!/^[A-Z]{3}$/.test(dest) || dest === origin) return;
      try {
        const pax = getPassengers(profile);
        const qs = new URLSearchParams({
          origin,
          destination: dest,
          month,
          nights: profile.nights || '7',
          adults: String(pax.adults),
          children: String(pax.childAges.length),
          infants: String(pax.infants),
        });
        if (hasExactDates(profile)) {
          qs.set('depart', profile.startDate);
          qs.set('return', profile.endDate);
        } else if (profile.monthHalf) {
          qs.set('half', profile.monthHalf);
        }
        if (isFinite(maxHours)) qs.set('maxHours', String(maxHours));
        const { body: data } = await flightPriceFromParams(qs);
        if (data.found && data.price > 0) {
          d.flightPrice = {
            price: data.price,
            approx: !!data.approx,
            departureAt: data.departureAt,
            returnAt: data.returnAt,
            transfers: data.transfers,
            durationTo: data.durationTo,
            withinLimit: !!data.withinLimit,
            link: data.link,
          };
          applyRealFlight(d);
        }
        if (data.alternative?.price > 0) {
          d.flightAlternative = data.alternative;
        }
        if (!data.found && data.searchLink) {
          d.flightSearchLink = data.searchLink;
        }
      } catch (err) {
        console.warn(`[prix vol] ${d.city} : indisponible`, err);
      }
    })
  );
}

// Prix indicatifs des traversées (Ferryhopper) — en cas d'échec on garde l'estimation de Claude
async function attachFerryPrices(profile: TravelProfile, batch: Destination[]): Promise<void> {
  const { checkin, checkout } = getDates(profile);
  const pax = getPassengers(profile);
  const passengers = pax.adults + pax.childAges.length + pax.infants;
  await Promise.all(
    batch.map(async (d) => {
      const f = d.ferry;
      if (!f || !f.fromPort || !f.toPort) return;
      try {
        const qs = new URLSearchParams({
          from: f.fromPort,
          to: f.toPort,
          date: checkin,
          return: checkout,
          passengers: String(passengers),
          vehicle: profile.transport.includes('car') ? '1' : '0',
        });
        const { body: data } = await ferryFromParams(qs);
        if (data.found && data.price > 0) {
          f.real = {
            price: data.price,
            roundTrip: !!data.roundTrip,
            returnEstimated: !!data.returnEstimated,
            durationHours: data.durationHours || 0,
            operator: data.operator || null,
            link: data.link || null,
          };
        }
      } catch (err) {
        console.warn(`[ferry] ${d.city} : indisponible`, err);
      }
    })
  );
}

export interface DestinationsResult {
  destinations: Destination[];
  rejected: Rejection[];
}

const MAX_RETRIES = 2;
const RETRY_DEADLINE_MS = 28_000;

/**
 * Demande `count` destinations à Claude, rejette celles qui ne respectent pas
 * les contraintes éliminatoires, et relance Claude (2 fois max) avec la liste
 * des refus et leur raison.
 */
export async function generateValidDestinations(
  profile: TravelProfile,
  count = 3,
  excludedCodes: string[] = []
): Promise<DestinationsResult> {
  const valid: Destination[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set(excludedCodes.map((c) => c.toUpperCase()));
  const start = Date.now();

  for (let attempt = 0; attempt <= MAX_RETRIES && valid.length < count; attempt++) {
    // Pas de relance si elle risque de dépasser la durée max d'une fonction serveur (60 s)
    if (attempt > 0 && Date.now() - start > RETRY_DEADLINE_MS) break;
    const exclude = Array.from(seen);
    let batch: Destination[];
    try {
      batch = await requestDestinations(profile, count - valid.length, exclude, rejected);
    } catch (err) {
      if (attempt === 0 && valid.length === 0) throw err;
      console.error('Relance Claude échouée :', err);
      break;
    }

    await Promise.all([attachFlightPrices(profile, batch), attachFerryPrices(profile, batch)]);

    for (const d of batch) {
      if (valid.length >= count) break;
      const rejection = checkDestination(profile, d, exclude);
      if (rejection) {
        if (rejection.kind !== 'excluded') rejected.push(rejection);
        console.warn(`[filtre] ${d.city}, ${d.country} rejetée : ${rejection.reason}`);
        continue;
      }
      valid.push(d);
      seen.add((d.countryCode || '').toUpperCase());
    }
  }

  // Ids uniques (Claude peut renvoyer le même slug d'un appel à l'autre)
  const ids = new Set<string>();
  for (const d of valid) {
    if (!d.id || ids.has(d.id)) d.id = `${d.id || 'dest'}-${ids.size + 1}`;
    ids.add(d.id);
  }

  return { destinations: valid, rejected };
}

export async function generateItinerary(
  profile: TravelProfile,
  destination: Destination
): Promise<Itinerary> {
  const prompt = `Tu es un expert voyagiste francophone. Crée un itinéraire détaillé pour :
- Destination : ${destination.city}, ${destination.country}
- Période : ${profile.month}
- Durée : ${getNightsCount(profile)} nuits
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
- Génère exactement ${getNightsCount(profile)} jours${hasExactDates(profile) ? ` (du ${profile.startDate} au ${profile.endDate}, utilise ces vraies dates dans le champ date)` : ''}
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
- Période : ${profile.month}
- Durée : ${getNightsCount(profile)} nuits
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
