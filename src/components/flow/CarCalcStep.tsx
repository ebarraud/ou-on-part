'use client';

interface CarCalcStepProps {
  departureCity: string;
  onContinue: () => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  progress: number;
}

function estimateCarCost(departure: string) {
  // Estimation moyenne basée sur un trajet typique de ~800km
  const fuel = Math.round(800 * 2 * 0.07 * 1.75); // aller-retour, 7L/100km, 1.75€/L
  const tolls = Math.round(800 * 0.06);
  const parking = 40;
  return { fuel, tolls, parking, total: fuel + tolls + parking };
}

export default function CarCalcStep({
  departureCity,
  onContinue,
  onBack,
  stepNumber,
  totalSteps,
  progress,
}: CarCalcStepProps) {
  const cost = estimateCarCost(departureCity);

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8">
      {/* Progress bar */}
      <div className="w-full h-[3px] bg-gray-100 mt-0">
        <div
          className="h-full bg-primary rounded-r-sm transition-all duration-400 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center pt-4 pb-2">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Retour"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">
          {stepNumber}/{totalSteps}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">🚗 Estimation voiture</h1>
      <p className="text-sm text-gray-500 mb-6">Depuis {departureCity} — estimation aller-retour</p>

      <div className="space-y-3 mb-8">
        <div className="flex items-center justify-between bg-gray-50 rounded-btn px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⛽</span>
            <span className="text-sm font-medium">Carburant</span>
          </div>
          <span className="text-sm font-bold text-gray-900">~{cost.fuel}€</span>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-btn px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛣️</span>
            <span className="text-sm font-medium">Péages estimés</span>
          </div>
          <span className="text-sm font-bold text-gray-900">~{cost.tolls}€</span>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-btn px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🅿️</span>
            <span className="text-sm font-medium">Parking destination</span>
          </div>
          <span className="text-sm font-bold text-gray-900">~{cost.parking}€</span>
        </div>
        <div className="flex items-center justify-between bg-primary-light rounded-btn px-4 py-4 border-2 border-primary">
          <span className="text-sm font-bold text-primary-dark">Total transport / véhicule</span>
          <span className="text-lg font-bold text-primary-dark">~{cost.total}€</span>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3.5 rounded-btn font-semibold text-base bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all"
      >
        C&apos;est bon, continuer
      </button>
    </div>
  );
}
