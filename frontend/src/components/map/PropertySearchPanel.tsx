"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  MapPin,
  Building2,
  Loader2,
  ChevronRight,
  Navigation,
  Layers,
  History,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchProperties,
  searchByLotPlan,
  PropertySearchResult,
  parseLotPlan,
} from '@/lib/api/property-search';
import { formatArea } from '@/lib/api/qld-identify';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertySearchPanelProps {
  map: mapboxgl.Map | null;
  onPropertySelect?: (property: PropertySearchResult) => void;
  onClose: () => void;
  className?: string;
}

export function PropertySearchPanel({
  map,
  onPropertySelect,
  onClose,
  className,
}: PropertySearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PropertySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'lotplan' | 'address' | 'locality' | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertySearchResult | null>(null);

  const highlightLayerRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Add property highlight to map
  const highlightProperty = useCallback((property: PropertySearchResult) => {
    if (!map || !property.geometry) return;

    const sourceId = 'property-search-highlight';
    const fillLayerId = 'property-search-highlight-fill';
    const outlineLayerId = 'property-search-highlight-outline';

    // Remove existing
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { lotPlan: property.lotPlan },
        geometry: property.geometry,
      },
    });

    // Add fill
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2,
      },
    });

    // Add outline
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
      },
    });

    highlightLayerRef.current = true;

    // Zoom to property
    if (property.geometry.coordinates[0]) {
      const coords = property.geometry.coordinates[0];
      const lngs = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 100, duration: 500 }
      );
    }
  }, [map]);

  // Clear highlight
  const clearHighlight = useCallback(() => {
    if (!map || !highlightLayerRef.current) return;

    const sourceId = 'property-search-highlight';
    if (map.getLayer('property-search-highlight-fill')) map.removeLayer('property-search-highlight-fill');
    if (map.getLayer('property-search-highlight-outline')) map.removeLayer('property-search-highlight-outline');
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    highlightLayerRef.current = false;
  }, [map]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults([]);
    clearHighlight();

    try {
      // Check if it's a Lot/Plan search
      if (parseLotPlan(query)) {
        const lotPlanResults = await searchByLotPlan(query);
        setSearchType('lotplan');
        setResults(lotPlanResults);

        if (lotPlanResults.length === 0) {
          setError('No property found with that Lot/Plan number');
        } else {
          // Add to recent searches
          setRecentSearches(prev => {
            const updated = [query, ...prev.filter(s => s !== query)].slice(0, 5);
            return updated;
          });
        }
      } else {
        // Try locality search
        const { type, results: searchResults } = await searchProperties(query);
        setSearchType(type);
        setResults(searchResults);

        if (searchResults.length === 0 && type !== 'address') {
          setError('No properties found. Try a different search term.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [query, clearHighlight]);

  // Handle result selection
  const handleSelect = useCallback((property: PropertySearchResult) => {
    setSelectedProperty(property);
    highlightProperty(property);
    onPropertySelect?.(property);
  }, [highlightProperty, onPropertySelect]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "absolute top-20 left-4 bottom-20 w-96 z-10 pointer-events-auto",
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold">Property Search</h2>
              <p className="text-[10px] text-muted-foreground">Search QLD cadastre</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search Lot/Plan or locality..."
              className="pr-10 h-10 bg-background/50 border-border/50 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setError(null);
                    clearHighlight();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search type hint */}
        <div className="mt-3 flex gap-2">
          <Badge variant="outline" className="text-[10px] bg-background/50 border-border/50">
            <Building2 className="h-3 w-3 mr-1" />
            Lot/Plan: 123/SP456789
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-background/50 border-border/50">
            <MapPin className="h-3 w-3 mr-1" />
            Locality: Brisbane
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4"
            >
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Searches */}
        <AnimatePresence>
          {!results.length && !error && recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 border-b"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <History className="h-3 w-3" />
                Recent Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setQuery(search);
                      handleSearch();
                    }}
                    className="text-xs bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  >
                    {search}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="divide-y divide-border/50"
            >
              <div className="px-4 py-2 bg-gradient-to-r from-muted/50 to-transparent text-xs text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                  {searchType === 'lotplan' && ' for Lot/Plan'}
                  {searchType === 'locality' && ' in locality'}
                </span>
              </div>

              {results.map((property, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleSelect(property)}
                  className={cn(
                    "w-full p-4 text-left transition-all duration-200 group",
                    "hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent",
                    selectedProperty?.lotPlan === property.lotPlan && "bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-l-blue-500"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1 rounded-md transition-colors",
                          selectedProperty?.lotPlan === property.lotPlan
                            ? "bg-blue-500/20"
                            : "bg-muted/50 group-hover:bg-blue-500/10"
                        )}>
                          <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="font-mono font-semibold text-sm">{property.lotPlan}</span>
                      </div>
                      <div className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.locality && <span>{property.locality}</span>}
                        {property.lga && <span className="text-xs opacity-70">({property.lga})</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {property.area > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-muted/50">
                            {formatArea(property.area)}
                          </Badge>
                        )}
                        {property.tenure && (
                          <Badge variant="outline" className="text-[10px]">
                            {property.tenure}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!results.length && !error && !recentSearches.length && (
          <div className="flex-1 flex items-center justify-center p-8 min-h-[300px]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-30" />
                <div className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full p-4">
                  <Layers className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="mt-4 font-semibold">Search Properties</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-[250px]">
                Enter a Lot/Plan number or locality name to find properties in Queensland
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Selected Property Details */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t bg-gradient-to-r from-blue-500/5 to-transparent"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Selected Property
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setSelectedProperty(null);
                    clearHighlight();
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="bg-background/50 backdrop-blur rounded-lg p-3 text-xs space-y-2 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Lot/Plan</span>
                  <span className="font-mono font-semibold text-blue-600">{selectedProperty.lotPlan}</span>
                </div>
                {selectedProperty.locality && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Locality</span>
                    <span>{selectedProperty.locality}</span>
                  </div>
                )}
                {selectedProperty.area > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Area</span>
                    <span className="font-medium">{formatArea(selectedProperty.area)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (map && selectedProperty.coordinates) {
                      map.flyTo({ center: selectedProperty.coordinates, zoom: 18 });
                    }
                  }}
                >
                  <Navigation className="h-3.5 w-3.5 mr-1.5" />
                  Zoom to Property
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PropertySearchPanel;
