"use client";

import { createContext, useContext } from 'react';

// Search data passed from header to property panel
export interface PropertySearchData {
  type: 'coordinates' | 'lotPlan';
  coordinates?: [number, number];
  address?: string;
  lotPlan?: string;
}

export interface AppContextValue {
  flyToLocation: (center: [number, number], zoom?: number) => void;
  searchLotPlan: (lotPlan: string) => void;
  savedCount: number;
  compareCount: number;
  setSavedCount: (count: number) => void;
  setCompareCount: (count: number) => void;
  registerMapFlyTo: (fn: (center: [number, number], zoom?: number) => void) => void;
  registerLotPlanSearch: (fn: (lotPlan: string) => void) => void;
  // New: for auto-opening property panel with search data
  pendingSearch: PropertySearchData | null;
  setPendingSearch: (data: PropertySearchData | null) => void;
  // New: for triggering map select mode from header
  triggerMapSelect: () => void;
  registerMapSelectHandler: (fn: () => void) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppLayout');
  }
  return context;
}
