'use client';

// Rappel sur l'origine des prix, affiché sous les résultats et sur la fiche destination
export default function PriceDisclaimer({ className = '' }: { className?: string }) {
  return (
    <details className={`text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-btn px-3 py-2 ${className}`}>
      <summary className="cursor-pointer select-none">
        ℹ️ Prix indicatifs — d&apos;où viennent-ils ?
      </summary>
      <ul className="mt-2 space-y-1 list-disc pl-4">
        <li>
          <strong>Vols</strong> : quand c&apos;est indiqué « vu récemment », prix le plus bas trouvé ces derniers jours par
          les utilisateurs d&apos;Aviasales. Il peut avoir changé ou ne plus être disponible. Sinon, estimation de l&apos;IA.
        </li>
        <li>
          <strong>Hébergement, repas, activités</strong> : estimation de l&apos;IA, ajustée selon la saison, le groupe et le
          type d&apos;hébergement.
        </li>
        <li>
          <strong>Voiture</strong> : calcul approximatif (distance, carburant, péages, parking).
        </li>
        <li>
          <strong>Ferry</strong> : quand c&apos;est indiqué « vu sur Ferryhopper », prix indicatif par passager (hors
          véhicule) pour les dates du séjour. Sinon, estimation de l&apos;IA.
        </li>
        <li>
          <strong>Train</strong> : estimation de l&apos;IA, incluse dans le budget total.
        </li>
      </ul>
      <p className="mt-2">Vérifie toujours le prix final sur le site de réservation.</p>
    </details>
  );
}
