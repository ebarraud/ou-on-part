import type { TravelProfile, Destination } from './types';

// Estimate check-in / check-out dates from profile
function getDates(profile: TravelProfile): { checkin: string; checkout: string } {
  const now = new Date();
  // Target: 15th of the selected month (default mid-month)
  const year = profile.year || now.getFullYear();
  const monthIdx = profile.monthIndex >= 0 ? profile.monthIndex : now.getMonth() + 1;

  // Use quinzaine info
  let dayStart = 15;
  if (profile.monthHalf === '1') dayStart = 5;    // early in 1st half
  if (profile.monthHalf === '2') dayStart = 20;   // early in 2nd half

  const checkin = new Date(year, monthIdx, dayStart);

  const nightsMap: Record<string, number> = { '2-3': 3, '4-6': 5, '7': 7, '10+': 10 };
  const nights = nightsMap[profile.nights || '7'] || 7;
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + nights);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { checkin: fmt(checkin), checkout: fmt(checkout) };
}

// Number of adults
function getAdults(profile: TravelProfile): number {
  switch (profile.group) {
    case 'solo': return 1;
    case 'couple': return 2;
    case 'family': return 2;
    case 'friends': return 4;
    default: return 2;
  }
}

export function getSkyscannerLink(profile: TravelProfile, dest: Destination): string {
  const { checkin } = getDates(profile);
  // Skyscanner URL format: /transport/flights/{from}/{to}/{date}/
  const fromSlug = profile.departureCity.toLowerCase().replace(/\s+/g, '-');
  const toSlug = dest.city.toLowerCase().replace(/\s+/g, '-');
  const dateSlug = checkin.replace(/-/g, '').substring(2); // YYMMDD
  return `https://www.skyscanner.fr/transport/vols/${fromSlug}/${toSlug}/${dateSlug}/?adults=${getAdults(profile)}&adultsv2=${getAdults(profile)}&currency=EUR`;
}

export function getBookingLink(profile: TravelProfile, dest: Destination): string {
  const { checkin, checkout } = getDates(profile);
  const adults = getAdults(profile);
  const children = profile.kidsAges?.length || 0;
  const citySlug = dest.city.toLowerCase().replace(/\s+/g, '+');
  return `https://www.booking.com/searchresults.fr.html?ss=${citySlug}%2C+${dest.country}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=1&group_children=${children}&selected_currency=EUR`;
}

export function getGetYourGuideLink(profile: TravelProfile, dest: Destination): string {
  const { checkin, checkout } = getDates(profile);
  const citySlug = dest.city.toLowerCase().replace(/\s+/g, '-');
  const adults = getAdults(profile);
  return `https://www.getyourguide.fr/s/?q=${citySlug}&date_from=${checkin}&date_to=${checkout}&adults=${adults}&currency=EUR`;
}
