'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import {
  buildQueue,
  Q2_NIGHTS, getBudgetQuestion, Q4_TRIP_CONTEXT_FULL, Q5_TRAVEL_STYLE,
  Q6_GROUP, Q6B_KIDS, Q8_TRANSPORT,
  Q9_VIBE, Q9B_WATER_TEMP, Q9C_MOUNTAIN_LEVEL,
  Q11_PRIORITY, Q11B_SPORT_ACTIVITIES, Q12_CLIMATE, Q13_ACCOMMODATION,
  Q14_CONSTRAINTS, Q15_LANGUAGE, Q16_STOPS,
  type StepId,
} from '@/lib/questions';
import type { TravelProfile, QuestionConfig } from '@/lib/types';
import QuestionStep from '@/components/flow/QuestionStep';
import MonthPicker from '@/components/flow/MonthPicker';
import CityPicker from '@/components/flow/CityPicker';
import VisitedCountries from '@/components/flow/VisitedCountries';

const STATIC_STEP_CONFIG: Record<string, QuestionConfig> = {
  nights: Q2_NIGHTS,
  tripContext: Q4_TRIP_CONTEXT_FULL,
  travelStyle: Q5_TRAVEL_STYLE,
  group: Q6_GROUP,
  kidsAges: Q6B_KIDS,
  transport: Q8_TRANSPORT,
  vibe: Q9_VIBE,
  waterTemp: Q9B_WATER_TEMP,
  mountainLevel: Q9C_MOUNTAIN_LEVEL,
  priority: Q11_PRIORITY,
  sportActivities: Q11B_SPORT_ACTIVITIES,
  climate: Q12_CLIMATE,
  accommodation: Q13_ACCOMMODATION,
  constraints: Q14_CONSTRAINTS,
  language: Q15_LANGUAGE,
  stopsCount: Q16_STOPS,
};

export default function FlowPage() {
  const router = useRouter();
  const { profile, setField, currentStep, setCurrentStep } = useTravelStore();

  // Build queue dynamically from current profile
  const queue = useMemo(() => buildQueue(profile), [profile]);
  const totalSteps = queue.length;
  const currentStepId = queue[currentStep] as StepId | undefined;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const goNext = useCallback(() => {
    // Rebuild queue after state change
    const newQueue = buildQueue(useTravelStore.getState().profile);
    const nextIdx = currentStep + 1;
    if (nextIdx >= newQueue.length) {
      router.push('/results');
    } else {
      setCurrentStep(nextIdx);
    }
  }, [currentStep, router, setCurrentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/');
    }
  }, [currentStep, router, setCurrentStep]);

  if (!currentStepId) {
    router.push('/results');
    return null;
  }

  // =============================================
  // Custom steps
  // =============================================

  if (currentStepId === 'month') {
    return (
      <MonthPicker
        onSelect={(month, monthIndex, year, monthHalf) => {
          setField('month', month);
          setField('monthIndex', monthIndex);
          setField('year', year);
          setField('monthHalf', monthHalf);
          goNext();
        }}
        onBack={goBack}
        stepNumber={currentStep + 1}
        totalSteps={totalSteps}
        progress={progress}
      />
    );
  }

  if (currentStepId === 'departureCity') {
    return (
      <CityPicker
        onSelect={(city) => {
          setField('departureCity', city);
          goNext();
        }}
        onBack={goBack}
        stepNumber={currentStep + 1}
        totalSteps={totalSteps}
        progress={progress}
      />
    );
  }

  if (currentStepId === 'visited') {
    return (
      <VisitedCountries
        initialSelected={profile.visited}
        onComplete={(codes) => {
          setField('visited', codes);
          goNext();
        }}
        onBack={goBack}
        stepNumber={currentStep + 1}
        totalSteps={totalSteps}
        progress={progress}
      />
    );
  }

  // =============================================
  // Generic QuestionStep
  // =============================================

  // Budget step uses dynamic config based on selected nights
  const config = currentStepId === 'budget'
    ? getBudgetQuestion(profile.nights)
    : STATIC_STEP_CONFIG[currentStepId];
  if (!config) {
    goNext();
    return null;
  }

  const options = config.options;

  // Get current value from profile for pre-filling on back navigation
  const currentValue = profile[config.field as keyof TravelProfile];
  const initialValues: string[] = Array.isArray(currentValue)
    ? (currentValue as string[])
    : currentValue
      ? [String(currentValue)]
      : [];

  return (
    <QuestionStep
      key={currentStepId}
      question={config.question}
      subtitle={config.subtitle}
      contextBadge={config.contextBadge}
      options={options}
      multi={config.multi}
      columns={config.columns}
      layout={config.layout}
      skipLabel={config.skipLabel}
      initialValues={config.multi ? initialValues : []}
      stepNumber={currentStep + 1}
      totalSteps={totalSteps}
      progress={progress}
      onBack={goBack}
      onComplete={(values) => {
        const field = config.field as keyof TravelProfile;

        if (config.multi) {
          setField(field, values as never);
        } else {
          // Single value — convert stopsCount to number
          let val: string | number = values[0] || '';
          if (currentStepId === 'stopsCount') {
            val = parseInt(val, 10) as 2 | 3 | 4 | 5;
          }
          setField(field, val as never);
        }
        goNext();
      }}
    />
  );
}
