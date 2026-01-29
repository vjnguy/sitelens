"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app/AppHeader';
import { parseLotPlan } from '@/lib/api/property-search';
import { AppContext, type AppContextValue, type PropertySearchData } from '@/contexts/AppContext';

// Re-export types for backwards compatibility (types are allowed)
export type { PropertySearchData } from '@/contexts/AppContext';
// Note: AppContext should be imported directly from '@/contexts/AppContext'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [savedCount, setSavedCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);
  const [pendingSearch, setPendingSearch] = useState<PropertySearchData | null>(null);

  // Refs to store map control functions
  const flyToRef = useRef<((center: [number, number], zoom?: number) => void) | null>(null);
  const searchLotPlanRef = useRef<((lotPlan: string) => void) | null>(null);
  const mapSelectRef = useRef<(() => void) | null>(null);

  // Load saved count from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('siteora-saved-properties');
      if (saved) {
        const properties = JSON.parse(saved);
        setSavedCount(properties.length);
      }
    } catch (err) {
      console.warn('Failed to load saved properties count:', err);
    }
  }, []);

  const flyToLocation = useCallback((center: [number, number], zoom?: number) => {
    flyToRef.current?.(center, zoom);
  }, []);

  const searchLotPlan = useCallback((lotPlan: string) => {
    searchLotPlanRef.current?.(lotPlan);
  }, []);

  const registerMapFlyTo = useCallback((fn: (center: [number, number], zoom?: number) => void) => {
    flyToRef.current = fn;
  }, []);

  const registerLotPlanSearch = useCallback((fn: (lotPlan: string) => void) => {
    searchLotPlanRef.current = fn;
  }, []);

  const triggerMapSelect = useCallback(() => {
    mapSelectRef.current?.();
  }, []);

  const registerMapSelectHandler = useCallback((fn: () => void) => {
    mapSelectRef.current = fn;
  }, []);

  const handleLocationSelect = useCallback((center: [number, number], address: string) => {
    flyToLocation(center, 17);
    // Set pending search to auto-open property panel with coordinates
    setPendingSearch({
      type: 'coordinates',
      coordinates: center,
      address,
    });
  }, [flyToLocation]);

  const handleLotPlanSelect = useCallback((lotPlan: string) => {
    // Set pending search to auto-open property panel with lot/plan
    setPendingSearch({
      type: 'lotPlan',
      lotPlan,
    });
  }, []);

  const contextValue: AppContextValue = {
    flyToLocation,
    searchLotPlan,
    savedCount,
    compareCount,
    setSavedCount,
    setCompareCount,
    registerMapFlyTo,
    registerLotPlanSearch,
    pendingSearch,
    setPendingSearch,
    triggerMapSelect,
    registerMapSelectHandler,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="h-screen flex flex-col overflow-hidden">
        <AppHeader
          onLocationSelect={handleLocationSelect}
          onLotPlanSelect={handleLotPlanSelect}
          onSelectFromMap={triggerMapSelect}
          savedCount={savedCount}
          compareCount={compareCount}
        />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>
    </AppContext.Provider>
  );
}
