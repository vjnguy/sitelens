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
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Landmark,
  TreePine,
  Layers,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  Target,
  MousePointer2,
  ExternalLink,
  Plane,
  Truck,
  Zap,
  TrendingUp,
  Ruler,
  Droplets,
  Car,
  Trees,
  Home,
  LayoutGrid,
  CircleDot,
  GraduationCap,
  Train,
  ShoppingCart,
  Heart,
  Utensils,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  searchByLotPlan,
  PropertySearchResult,
  parseLotPlan,
} from '@/lib/api/property-search';
import {
  analyzeSite,
  SiteAnalysis,
  IdentifyResult,
  formatArea,
  getConstraintSummary,
} from '@/lib/api/qld-identify';
import {
  analyzeDevelopmentPotential,
  DevelopmentPotential,
  InfrastructureService,
  ServicesAssessment,
  ServiceConnection,
} from '@/lib/api/development-potential';
import { LeadCaptureCard } from './LeadCaptureCard';
import {
  fetchNearbyAmenities,
  NearbyAmenitiesResult,
  AmenityCategory,
  NearbyPlace,
  getScoreDescription,
  formatDistance,
  formatTime,
} from '@/lib/api/nearby-amenities';
import type { Polygon } from 'geojson';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Search data from header/external source
interface InitialSearchData {
  type: 'coordinates' | 'lotPlan';
  coordinates?: [number, number];
  address?: string;
  lotPlan?: string;
}

interface UnifiedPropertyPanelProps {
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
  initialSearch?: InitialSearchData | null;
  onSearchConsumed?: () => void;
}

type TabType = 'search' | 'property' | 'constraints' | 'development' | 'location';

interface GeocodingResult {
  place_name: string;
  center: [number, number];
}

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  Planning: Building2,
  Heritage: Landmark,
  Environment: TreePine,
  Hazards: AlertTriangle,
  Infrastructure: Zap,
  Transport: Truck,
  Airport: Plane,
};

const SEVERITY_CONFIG = {
  high: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500',
    icon: AlertTriangle,
    label: 'High',
  },
  medium: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500',
    icon: AlertCircle,
    label: 'Medium',
  },
  low: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500',
    icon: Info,
    label: 'Low',
  },
  info: {
    bg: 'bg-slate-500/10 border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-500',
    icon: CheckCircle,
    label: 'Info',
  },
};

export function UnifiedPropertyPanel({
  map,
  onClose,
  className,
  initialSearch,
  onSearchConsumed,
}: UnifiedPropertyPanelProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<GeocodingResult[]>([]);
  const [propertyResults, setPropertyResults] = useState<PropertySearchResult[]>([]);

  // Selected property state
  const [selectedProperty, setSelectedProperty] = useState<PropertySearchResult | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedConstraints, setExpandedConstraints] = useState<Set<string>>(new Set());
  const [highlightedLayers, setHighlightedLayers] = useState<Set<string>>(new Set());

  // Development potential state
  const [developmentPotential, setDevelopmentPotential] = useState<DevelopmentPotential | null>(null);
  const [isAnalyzingDevelopment, setIsAnalyzingDevelopment] = useState(false);
  const [showBuildingFootprint, setShowBuildingFootprint] = useState(false);
  const [expandedInfrastructure, setExpandedInfrastructure] = useState<Set<string>>(new Set());
  const [expandedServicesConnections, setExpandedServicesConnections] = useState(false);

  // Location/amenities state
  const [amenitiesData, setAmenitiesData] = useState<NearbyAmenitiesResult | null>(null);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);
  const [expandedAmenityCategories, setExpandedAmenityCategories] = useState<Set<string>>(new Set());
  const [showAmenitiesOnMap, setShowAmenitiesOnMap] = useState(false);

  // UI state
  const [coordsCopied, setCoordsCopied] = useState(false);
  const [isMapSelectMode, setIsMapSelectMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const highlightLayerRef = useRef<boolean>(false);
  const constraintLayersRef = useRef<Set<string>>(new Set());
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialSearchProcessedRef = useRef<boolean>(false);
  const amenityMarkersRef = useRef<string[]>([]);

  // Focus input on mount (only if no initial search)
  useEffect(() => {
    if (!initialSearch) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialSearch]);

  // Debounced autocomplete for address search
  useEffect(() => {
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (searchQuery.length < 3 || !MAPBOX_TOKEN || parseLotPlan(searchQuery)) {
      if (searchQuery.length < 3) setAddressResults([]);
      return;
    }

    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=AU&types=address,place,locality`
        );
        const data = await response.json();

        if (data.features?.length > 0) {
          setAddressResults(data.features.map((f: any) => ({
            place_name: f.place_name,
            center: f.center as [number, number],
          })));
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 300);

    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Clear highlight layers
  const clearHighlights = useCallback(() => {
    if (!map) return;

    const sourceId = 'unified-property-highlight';
    if (map.getLayer('unified-property-highlight-fill')) map.removeLayer('unified-property-highlight-fill');
    if (map.getLayer('unified-property-highlight-outline')) map.removeLayer('unified-property-highlight-outline');
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    constraintLayersRef.current.forEach(layerId => {
      const constraintSourceId = `unified-constraint-${layerId}`;
      if (map.getLayer(`unified-constraint-${layerId}-fill`)) map.removeLayer(`unified-constraint-${layerId}-fill`);
      if (map.getLayer(`unified-constraint-${layerId}-outline`)) map.removeLayer(`unified-constraint-${layerId}-outline`);
      if (map.getSource(constraintSourceId)) map.removeSource(constraintSourceId);
    });
    constraintLayersRef.current.clear();
    setHighlightedLayers(new Set());
    highlightLayerRef.current = false;
  }, [map]);

  // Clear amenity markers from map
  const clearAmenityMarkers = useCallback(() => {
    if (!map) return;

    amenityMarkersRef.current.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    });
    amenityMarkersRef.current = [];
  }, [map]);

  // Show amenity markers on map
  const showAmenityMarkersOnMap = useCallback((amenities: NearbyAmenitiesResult) => {
    if (!map) return;

    clearAmenityMarkers();

    const categoryColors: Record<string, string> = {
      schools: '#8b5cf6',
      transport: '#3b82f6',
      shopping: '#10b981',
      healthcare: '#ef4444',
      recreation: '#22c55e',
      dining: '#f59e0b',
    };

    amenities.categories.forEach(category => {
      if (category.places.length === 0) return;

      const sourceId = `amenity-${category.id}`;
      const layerId = `amenity-${category.id}-points`;

      const features = category.places.map(place => ({
        type: 'Feature' as const,
        properties: {
          name: place.name,
          type: place.type,
          subtype: place.subtype || '',
          distance: place.distance,
          walkTime: place.walkTime,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: place.coordinates,
        },
      }));

      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': categoryColors[category.id] || '#6b7280',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      amenityMarkersRef.current.push(layerId, sourceId);
    });

    setShowAmenitiesOnMap(true);
  }, [map, clearAmenityMarkers]);

  // Toggle amenity markers visibility
  const toggleAmenityMarkers = useCallback(() => {
    if (showAmenitiesOnMap) {
      clearAmenityMarkers();
      setShowAmenitiesOnMap(false);
    } else if (amenitiesData) {
      showAmenityMarkersOnMap(amenitiesData);
    }
  }, [showAmenitiesOnMap, clearAmenityMarkers, amenitiesData, showAmenityMarkersOnMap]);

  // Fetch nearby amenities for coordinates
  const fetchAmenities = useCallback(async (coordinates: [number, number]) => {
    setIsLoadingAmenities(true);
    try {
      const result = await fetchNearbyAmenities(coordinates, 2000);
      setAmenitiesData(result);
    } catch (err) {
      console.error('Failed to fetch amenities:', err);
    } finally {
      setIsLoadingAmenities(false);
    }
  }, []);

  // Add property highlight to map
  const highlightProperty = useCallback((geometry: Polygon, color = '#3b82f6') => {
    if (!map) return;

    const sourceId = 'unified-property-highlight';

    if (map.getLayer('unified-property-highlight-fill')) map.removeLayer('unified-property-highlight-fill');
    if (map.getLayer('unified-property-highlight-outline')) map.removeLayer('unified-property-highlight-outline');
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry },
    });

    map.addLayer({
      id: 'unified-property-highlight-fill',
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': color, 'fill-opacity': 0.2 },
    });

    map.addLayer({
      id: 'unified-property-highlight-outline',
      type: 'line',
      source: sourceId,
      paint: { 'line-color': color, 'line-width': 3 },
    });

    highlightLayerRef.current = true;

    const coords = geometry.coordinates[0];
    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 100, duration: 500 }
    );
  }, [map]);

  // Add constraint layer to map
  const addConstraintToMap = useCallback((constraint: IdentifyResult) => {
    if (!map || constraint.features.length === 0) return;

    const sourceId = `unified-constraint-${constraint.layerId}`;

    if (map.getLayer(`unified-constraint-${constraint.layerId}-fill`)) map.removeLayer(`unified-constraint-${constraint.layerId}-fill`);
    if (map.getLayer(`unified-constraint-${constraint.layerId}-outline`)) map.removeLayer(`unified-constraint-${constraint.layerId}-outline`);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: constraint.features },
    });

    map.addLayer({
      id: `unified-constraint-${constraint.layerId}-fill`,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': constraint.color, 'fill-opacity': 0.3 },
    });

    map.addLayer({
      id: `unified-constraint-${constraint.layerId}-outline`,
      type: 'line',
      source: sourceId,
      paint: { 'line-color': constraint.color, 'line-width': 2 },
    });

    constraintLayersRef.current.add(constraint.layerId);
  }, [map]);

  // Remove constraint from map
  const removeConstraintFromMap = useCallback((layerId: string) => {
    if (!map) return;

    const sourceId = `unified-constraint-${layerId}`;
    if (map.getLayer(`unified-constraint-${layerId}-fill`)) map.removeLayer(`unified-constraint-${layerId}-fill`);
    if (map.getLayer(`unified-constraint-${layerId}-outline`)) map.removeLayer(`unified-constraint-${layerId}-outline`);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    constraintLayersRef.current.delete(layerId);
  }, [map]);

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setAddressResults([]);
    setPropertyResults([]);

    try {
      if (parseLotPlan(searchQuery)) {
        const results = await searchByLotPlan(searchQuery);
        setPropertyResults(results);
        if (results.length === 0) {
          setSearchError('No property found with that Lot/Plan');
        } else if (results.length === 1) {
          handlePropertySelect(results[0]);
        }
      } else if (MAPBOX_TOKEN) {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=AU`
        );
        const data = await response.json();

        if (data.features?.length > 0) {
          setAddressResults(data.features.map((f: any) => ({
            place_name: f.place_name,
            center: f.center as [number, number],
          })));
        } else {
          setSearchError('No addresses found');
        }
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Run site analysis
  const runAnalysis = useCallback(async (coordinates: [number, number]) => {
    setIsAnalyzing(true);
    setActiveTab('property');

    try {
      const siteAnalysis = await analyzeSite(coordinates[0], coordinates[1]);
      setAnalysis(siteAnalysis);

      if (siteAnalysis.property) {
        const parsed = parseLotPlan(siteAnalysis.property.lotPlan);
        const propertyData = {
          lotPlan: siteAnalysis.property.lotPlan,
          lot: parsed?.lot || '',
          plan: parsed?.plan || '',
          locality: siteAnalysis.property.locality || '',
          lga: siteAnalysis.property.lga || '',
          area: siteAnalysis.property.area || 0,
          tenure: siteAnalysis.property.tenure || '',
          parcelType: siteAnalysis.property.parcelType || '',
          geometry: siteAnalysis.property.geometry || null,
          coordinates: coordinates,
        };
        setSelectedProperty(propertyData);

        if (siteAnalysis.property.geometry) {
          highlightProperty(siteAnalysis.property.geometry);
        }

        // Run development potential analysis
        setIsAnalyzingDevelopment(true);
        try {
          const constraintNames = siteAnalysis.constraints.map(c => c.layerName);
          const devPotential = await analyzeDevelopmentPotential(
            coordinates[0],
            coordinates[1],
            propertyData.area,
            propertyData.geometry,
            propertyData.lotPlan,
            undefined, // frontage - could be calculated from geometry
            constraintNames
          );
          setDevelopmentPotential(devPotential);
        } catch (devErr) {
          console.error('Development potential analysis failed:', devErr);
        } finally {
          setIsAnalyzingDevelopment(false);
        }
      }

      // Auto-show high severity constraints on map
      siteAnalysis.constraints.filter(c => c.severity === 'high').forEach(c => {
        addConstraintToMap(c);
        setHighlightedLayers(prev => new Set(prev).add(c.layerId));
      });

      // Fetch nearby amenities
      fetchAmenities(coordinates);

      if (siteAnalysis.constraints.length > 0) {
        setActiveTab('constraints');
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setSearchError('Failed to analyse location');
    } finally {
      setIsAnalyzing(false);
    }
  }, [highlightProperty, addConstraintToMap]);

  // Handle address selection
  const handleAddressSelect = useCallback(async (result: GeocodingResult) => {
    setSelectedCoordinates(result.center);
    setAddressResults([]);

    if (map) {
      map.flyTo({ center: result.center, zoom: 17 });
    }

    await runAnalysis(result.center);
  }, [map, runAnalysis]);

  // Handle property selection
  const handlePropertySelect = useCallback(async (property: PropertySearchResult) => {
    setSelectedProperty(property);
    setPropertyResults([]);

    if (property.geometry) {
      highlightProperty(property.geometry);
    }

    if (property.coordinates) {
      setSelectedCoordinates(property.coordinates);
      await runAnalysis(property.coordinates);
    }
  }, [highlightProperty, runAnalysis]);

  // Auto-search when initialSearch is provided (from header search or map click)
  useEffect(() => {
    // Only process once per initialSearch
    if (!initialSearch || initialSearchProcessedRef.current) return;
    initialSearchProcessedRef.current = true;

    const performInitialSearch = async () => {
      if (initialSearch.type === 'coordinates' && initialSearch.coordinates) {
        // Search by coordinates - run analysis directly
        await runAnalysis(initialSearch.coordinates);
        onSearchConsumed?.();
      } else if (initialSearch.type === 'coordinates' && !initialSearch.coordinates) {
        // No coordinates provided - enter map select mode
        setIsMapSelectMode(true);
        setActiveTab('search');
        onSearchConsumed?.();
      } else if (initialSearch.type === 'lotPlan' && initialSearch.lotPlan) {
        // If we have coordinates (from map click), run analysis directly
        if (initialSearch.coordinates) {
          await runAnalysis(initialSearch.coordinates);
          onSearchConsumed?.();
          return;
        }

        // Otherwise search by lot/plan - trigger the lot/plan search
        setSearchQuery(initialSearch.lotPlan);
        setIsSearching(true);
        try {
          const results = await searchByLotPlan(initialSearch.lotPlan);
          if (results.length === 1) {
            // Single result - auto-select it
            await handlePropertySelect(results[0]);
          } else if (results.length > 1) {
            // Multiple results - show them for selection
            setPropertyResults(results);
            setActiveTab('search');
          } else {
            setSearchError('No property found with that Lot/Plan');
          }
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setIsSearching(false);
        }
        onSearchConsumed?.();
      }
    };

    performInitialSearch();
  }, [initialSearch, runAnalysis, handlePropertySelect, onSearchConsumed]);

  // Reset the processed ref when initialSearch changes to null
  useEffect(() => {
    if (!initialSearch) {
      initialSearchProcessedRef.current = false;
    }
  }, [initialSearch]);

  // Toggle constraint visibility
  const toggleConstraintVisibility = useCallback((constraint: IdentifyResult) => {
    const isVisible = highlightedLayers.has(constraint.layerId);

    if (isVisible) {
      removeConstraintFromMap(constraint.layerId);
      setHighlightedLayers(prev => {
        const next = new Set(prev);
        next.delete(constraint.layerId);
        return next;
      });
    } else {
      addConstraintToMap(constraint);
      setHighlightedLayers(prev => new Set(prev).add(constraint.layerId));
    }
  }, [highlightedLayers, addConstraintToMap, removeConstraintFromMap]);

  // Copy coordinates
  const copyCoordinates = useCallback(() => {
    if (selectedCoordinates) {
      navigator.clipboard.writeText(`${selectedCoordinates[1].toFixed(6)}, ${selectedCoordinates[0].toFixed(6)}`);
      setCoordsCopied(true);
      setTimeout(() => setCoordsCopied(false), 2000);
    }
  }, [selectedCoordinates]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedProperty(null);
    setSelectedCoordinates(null);
    setAnalysis(null);
    setDevelopmentPotential(null);
    setAmenitiesData(null);
    setSearchQuery('');
    clearHighlights();
    clearAmenityMarkers();
    setShowAmenitiesOnMap(false);
    setActiveTab('search');
  }, [clearHighlights, clearAmenityMarkers]);

  // Map click handler for select from map mode
  useEffect(() => {
    if (!map || !isMapSelectMode) return;

    map.getCanvas().style.cursor = 'crosshair';

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      setIsMapSelectMode(false);
      map.getCanvas().style.cursor = '';
      setSelectedCoordinates(coordinates);

      await runAnalysis(coordinates);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isMapSelectMode, runAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHighlights();
      clearAmenityMarkers();
    };
  }, [clearHighlights, clearAmenityMarkers]);

  const summary = analysis ? getConstraintSummary(analysis.constraints) : null;

  const tabs: { id: TabType; label: string; icon: typeof Search; badge?: number }[] = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'property', label: 'Property', icon: Building2 },
    { id: 'constraints', label: 'Constraints', icon: Shield, badge: analysis?.constraints.length || 0 },
    { id: 'development', label: 'Develop', icon: TrendingUp },
    { id: 'location', label: 'Location', icon: Compass },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex overflow-hidden h-full",
        className
      )}
    >
      {/* Vertical Tab Sidebar */}
      <div className="w-12 bg-muted/30 border-r flex flex-col items-center py-3 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="relative group">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-all relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium">
                    {tab.badge}
                  </span>
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {tab.label}
              </div>
            </div>
          );
        })}

        {/* Close button at bottom */}
        <div className="mt-auto relative group">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Close
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Search Tab */}
          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              {/* Map Select Mode Banner */}
              {isMapSelectMode && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20 animate-pulse">
                    <MousePointer2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600">Click on the map</p>
                    <p className="text-xs text-muted-foreground">Select any location to analyse</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setIsMapSelectMode(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search address or Lot/Plan..."
                    className="pr-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setAddressResults([]);
                        setPropertyResults([]);
                        setSearchError(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {/* Tip about clicking on parcels */}
              <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                <MousePointer2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Tip:</span> Click directly on any property parcel on the map to analyse it
                </p>
              </div>

              {/* Error */}
              {searchError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {searchError}
                </div>
              )}

              {/* Address Results */}
              {addressResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{addressResults.length} addresses found</p>
                  {addressResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddressSelect(result)}
                      className="w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg text-left flex items-center gap-3 transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm truncate">{result.place_name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* Property Results */}
              {propertyResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{propertyResults.length} properties found</p>
                  {propertyResults.map((property, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePropertySelect(property)}
                      className="w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-indigo-500" />
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-semibold text-sm">{property.lotPlan}</span>
                          {property.locality && (
                            <p className="text-xs text-muted-foreground truncate">{property.locality}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!addressResults.length && !propertyResults.length && !searchError && !isMapSelectMode && (
                <div className="text-center py-8">
                  <Search className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Search by address or Lot/Plan, or click a property on the map
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Property Tab */}
          {activeTab === 'property' && (
            <motion.div
              key="property"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="mt-3 text-sm">Analysing property...</p>
                  </div>
                </div>
              ) : selectedProperty ? (
                <div className="divide-y">
                  {/* Coordinates */}
                  {selectedCoordinates && (
                    <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-mono text-xs">
                          {selectedCoordinates[1].toFixed(6)}, {selectedCoordinates[0].toFixed(6)}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyCoordinates}>
                        {coordsCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}

                  {/* Property Details */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Property Details</h3>
                      {selectedCoordinates && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => window.open(`https://www.google.com/maps/@${selectedCoordinates[1]},${selectedCoordinates[0]},18z`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Maps
                        </Button>
                      )}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lot/Plan</span>
                        <span className="font-mono font-medium">{selectedProperty.lotPlan}</span>
                      </div>
                      {selectedProperty.locality && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Locality</span>
                          <span>{selectedProperty.locality}</span>
                        </div>
                      )}
                      {selectedProperty.lga && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">LGA</span>
                          <span>{selectedProperty.lga}</span>
                        </div>
                      )}
                      {selectedProperty.area > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Area</span>
                          <span className="font-medium">{formatArea(selectedProperty.area)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Summary */}
                  {summary && summary.total > 0 && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-2">Constraints Summary</h3>
                      <div className="flex gap-2 flex-wrap">
                        {summary.high > 0 && (
                          <Badge className="bg-red-500 text-white">{summary.high} High</Badge>
                        )}
                        {summary.medium > 0 && (
                          <Badge className="bg-amber-500 text-white">{summary.medium} Medium</Badge>
                        )}
                        {summary.low > 0 && (
                          <Badge className="bg-blue-500 text-white">{summary.low} Low</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => setActiveTab('constraints')}
                      >
                        View All Constraints
                      </Button>
                    </div>
                  )}

                  {/* No constraints */}
                  {summary && summary.total === 0 && (
                    <div className="p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                      <p className="mt-2 text-sm font-medium text-green-600">No Constraints Found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This property has no identified planning constraints
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-4">
                    <Button variant="outline" className="w-full" onClick={clearSelection}>
                      <Search className="h-4 w-4 mr-2" />
                      New Search
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="mt-3 text-sm text-muted-foreground">No property selected</p>
                    <Button size="sm" className="mt-3" onClick={() => setActiveTab('search')}>
                      Search Properties
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Constraints Tab */}
          {activeTab === 'constraints' && (
            <motion.div
              key="constraints"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {analysis && analysis.constraints.length > 0 ? (
                <div className="divide-y">
                  {analysis.constraints.map((constraint) => {
                    const severity = constraint.severity || 'info';
                    const config = SEVERITY_CONFIG[severity];
                    const isExpanded = expandedConstraints.has(constraint.layerId);
                    const isVisible = highlightedLayers.has(constraint.layerId);
                    const CategoryIcon = CATEGORY_ICONS[constraint.category] || Layers;

                    const borderColorClass =
                      severity === 'high' ? 'border-l-red-500' :
                      severity === 'medium' ? 'border-l-amber-500' :
                      severity === 'low' ? 'border-l-blue-500' :
                      'border-l-slate-500';

                    return (
                      <div key={constraint.layerId} className={cn("border-l-4", borderColorClass)}>
                        <div className="p-3 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setExpandedConstraints(prev => {
                                const next = new Set(prev);
                                if (next.has(constraint.layerId)) {
                                  next.delete(constraint.layerId);
                                } else {
                                  next.add(constraint.layerId);
                                }
                                return next;
                              });
                            }}
                            className="p-0.5"
                          >
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              !isExpanded && "-rotate-90"
                            )} />
                          </button>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: constraint.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {constraint.layerName}
                            </span>
                            <span className="text-xs text-muted-foreground">{constraint.category}</span>
                          </div>
                          <Badge className={cn("text-[10px] text-white h-5", config.badge)}>
                            {config.label}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleConstraintVisibility(constraint)}
                            title={isVisible ? "Hide on map" : "Show on map"}
                          >
                            {isVisible ? (
                              <Eye className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && constraint.attributes.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-3 pb-3"
                            >
                              <div className="bg-muted/30 rounded-lg p-2 text-xs space-y-1">
                                {Object.entries(constraint.attributes[0] || {})
                                  .filter(([key]) =>
                                    !key.toLowerCase().includes('objectid') &&
                                    !key.toLowerCase().includes('shape') &&
                                    !key.toLowerCase().includes('globalid')
                                  )
                                  .slice(0, 5)
                                  .map(([key, value]) => (
                                    <div key={key} className="flex justify-between gap-2">
                                      <span className="text-muted-foreground truncate">{key}</span>
                                      <span className="font-medium truncate max-w-[150px]">
                                        {String(value || '-')}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ) : analysis && analysis.constraints.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                  <p className="mt-3 font-medium text-green-600">No Constraints Found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This property has no identified planning constraints
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Search for a property to see constraints
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Development Tab */}
          {activeTab === 'development' && (
            <motion.div
              key="development"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isAnalyzingDevelopment ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="mt-3 text-sm">Analysing development potential...</p>
                  </div>
                </div>
              ) : developmentPotential ? (
                <div className="divide-y">
                  {/* Zoning Information */}
                  {developmentPotential.zoning && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <LayoutGrid className="h-4 w-4 text-indigo-500" />
                        Zoning
                      </h3>
                      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zone</span>
                          <span className="font-medium">{developmentPotential.zoning.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Description</span>
                          <span className="font-medium text-right max-w-[180px]">{developmentPotential.zoning.description}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min Lot Size</span>
                          <span className="font-medium">{developmentPotential.zoning.minLotSize.toLocaleString()} m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min Frontage</span>
                          <span className="font-medium">{developmentPotential.zoning.minFrontage} m</span>
                        </div>
                        {developmentPotential.zoning.maxSiteCover && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Site Cover</span>
                            <span className="font-medium">{developmentPotential.zoning.maxSiteCover}%</span>
                          </div>
                        )}
                        {developmentPotential.zoning.maxBuildingHeight && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Height</span>
                            <span className="font-medium">{developmentPotential.zoning.maxBuildingHeight}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subdivision Potential */}
                  {developmentPotential.subdivision && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <Ruler className="h-4 w-4 text-green-500" />
                        Subdivision Potential
                      </h3>
                      {developmentPotential.subdivision.practicalLots > 1 ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-full bg-green-500/20">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-green-600">
                                {developmentPotential.subdivision.practicalLots} Lot Subdivision
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Potential to subdivide into {developmentPotential.subdivision.practicalLots} lots
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Current Area</span>
                              <span className="font-medium">{developmentPotential.subdivision.currentArea.toLocaleString()} m²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Min Lot Size</span>
                              <span className="font-medium">{developmentPotential.subdivision.minLotSize.toLocaleString()} m²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Max Theoretical</span>
                              <span className="font-medium">{developmentPotential.subdivision.maxPotentialLots} lots</span>
                            </div>
                            {developmentPotential.subdivision.accessRequired && (
                              <div className="flex items-center gap-2 text-xs text-amber-600 mt-2">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Access required for rear lot(s)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted/30 border border-muted rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-muted">
                              <CircleDot className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">No Subdivision Potential</p>
                              <p className="text-xs text-muted-foreground">
                                Property does not meet minimum requirements for subdivision
                              </p>
                            </div>
                          </div>
                          {developmentPotential.subdivision.constraints.length > 0 && (
                            <div className="mt-3 text-xs">
                              <p className="text-muted-foreground mb-1">Limiting constraints:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {developmentPotential.subdivision.constraints.map((c, i) => (
                                  <li key={i} className="text-amber-600">{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Building Footprint */}
                  {developmentPotential.building && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <Home className="h-4 w-4 text-blue-500" />
                        Building Footprint
                      </h3>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Building Area</span>
                          <span className="font-medium">{Math.round(developmentPotential.building.area).toLocaleString()} m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Site Coverage</span>
                          <span className="font-medium">{developmentPotential.building.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Source</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {developmentPotential.building.source === 'mock' ? 'Estimated' : developmentPotential.building.source}
                          </Badge>
                        </div>
                      </div>
                      {developmentPotential.zoning?.maxSiteCover && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {developmentPotential.building.percentage < developmentPotential.zoning.maxSiteCover ? (
                            <span className="text-green-600">
                              ✓ Within {developmentPotential.zoning.maxSiteCover}% max site cover
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              ⚠ Exceeds {developmentPotential.zoning.maxSiteCover}% max site cover
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Services Connections (Water/Sewer) */}
                  {developmentPotential.servicesAssessment && (
                    <div className="p-4">
                      <button
                        className="w-full flex items-center justify-between mb-3"
                        onClick={() => setExpandedServicesConnections(!expandedServicesConnections)}
                      >
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-cyan-500" />
                          Services Connections
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              developmentPotential.servicesAssessment.overallFeasibility === 'straightforward' && "bg-green-500/20 text-green-600",
                              developmentPotential.servicesAssessment.overallFeasibility === 'requires-investigation' && "bg-amber-500/20 text-amber-600",
                              developmentPotential.servicesAssessment.overallFeasibility === 'challenging' && "bg-red-500/20 text-red-600"
                            )}
                          >
                            {developmentPotential.servicesAssessment.overallFeasibility === 'straightforward' ? 'Straightforward' :
                             developmentPotential.servicesAssessment.overallFeasibility === 'requires-investigation' ? 'Needs Investigation' :
                             'Challenging'}
                          </Badge>
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            !expandedServicesConnections && "-rotate-90"
                          )} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedServicesConnections && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            {/* Water Connection */}
                            <div className={cn(
                              "rounded-lg p-3 border",
                              developmentPotential.servicesAssessment.water.connectionFeasibility === 'easy' && "bg-blue-500/10 border-blue-500/30",
                              developmentPotential.servicesAssessment.water.connectionFeasibility === 'moderate' && "bg-amber-500/10 border-amber-500/30",
                              developmentPotential.servicesAssessment.water.connectionFeasibility === 'challenging' && "bg-red-500/10 border-red-500/30",
                              developmentPotential.servicesAssessment.water.connectionFeasibility === 'unknown' && "bg-muted/30 border-muted"
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm flex items-center gap-2">
                                  <Droplets className="h-4 w-4 text-blue-500" />
                                  Water Main
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    developmentPotential.servicesAssessment.water.available ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                                  )}
                                >
                                  {developmentPotential.servicesAssessment.water.available ? 'Available' : 'Not Found'}
                                </Badge>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                {developmentPotential.servicesAssessment.water.nearestDistance !== null && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Distance</span>
                                    <span className="font-medium">{developmentPotential.servicesAssessment.water.nearestDistance}m</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Location</span>
                                  <span className="font-medium capitalize">{developmentPotential.servicesAssessment.water.location.replace('-', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Feasibility</span>
                                  <span className={cn(
                                    "font-medium capitalize",
                                    developmentPotential.servicesAssessment.water.connectionFeasibility === 'easy' && "text-green-600",
                                    developmentPotential.servicesAssessment.water.connectionFeasibility === 'moderate' && "text-amber-600",
                                    developmentPotential.servicesAssessment.water.connectionFeasibility === 'challenging' && "text-red-600"
                                  )}>
                                    {developmentPotential.servicesAssessment.water.connectionFeasibility}
                                  </span>
                                </div>
                                {developmentPotential.servicesAssessment.water.details.pipeSize && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pipe Size</span>
                                    <span className="font-medium">{developmentPotential.servicesAssessment.water.details.pipeSize}</span>
                                  </div>
                                )}
                              </div>
                              {developmentPotential.servicesAssessment.water.notes.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                  {developmentPotential.servicesAssessment.water.notes.map((note, i) => (
                                    <p key={i} className="text-[11px] text-muted-foreground">{note}</p>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Sewer Connection */}
                            <div className={cn(
                              "rounded-lg p-3 border",
                              developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'easy' && "bg-green-500/10 border-green-500/30",
                              developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'moderate' && "bg-amber-500/10 border-amber-500/30",
                              developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'challenging' && "bg-red-500/10 border-red-500/30",
                              developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'unknown' && "bg-muted/30 border-muted"
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm flex items-center gap-2">
                                  <CircleDot className="h-4 w-4 text-red-500" />
                                  Sewer Main
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    developmentPotential.servicesAssessment.sewer.available ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                                  )}
                                >
                                  {developmentPotential.servicesAssessment.sewer.available ? 'Available' : 'Not Found'}
                                </Badge>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                {developmentPotential.servicesAssessment.sewer.nearestDistance !== null && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Distance</span>
                                    <span className="font-medium">{developmentPotential.servicesAssessment.sewer.nearestDistance}m</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Location</span>
                                  <span className={cn(
                                    "font-medium capitalize",
                                    developmentPotential.servicesAssessment.sewer.location === 'rear' && "text-amber-600",
                                    developmentPotential.servicesAssessment.sewer.location === 'adjacent-lot' && "text-red-600"
                                  )}>
                                    {developmentPotential.servicesAssessment.sewer.location.replace('-', ' ')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Feasibility</span>
                                  <span className={cn(
                                    "font-medium capitalize",
                                    developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'easy' && "text-green-600",
                                    developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'moderate' && "text-amber-600",
                                    developmentPotential.servicesAssessment.sewer.connectionFeasibility === 'challenging' && "text-red-600"
                                  )}>
                                    {developmentPotential.servicesAssessment.sewer.connectionFeasibility}
                                  </span>
                                </div>
                                {developmentPotential.servicesAssessment.sewer.details.pipeSize && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pipe Size</span>
                                    <span className="font-medium">{developmentPotential.servicesAssessment.sewer.details.pipeSize}</span>
                                  </div>
                                )}
                                {developmentPotential.servicesAssessment.sewer.details.depth && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Depth</span>
                                    <span className="font-medium">{developmentPotential.servicesAssessment.sewer.details.depth}m</span>
                                  </div>
                                )}
                              </div>
                              {developmentPotential.servicesAssessment.sewer.notes.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                  {developmentPotential.servicesAssessment.sewer.notes.map((note, i) => (
                                    <p key={i} className={cn(
                                      "text-[11px]",
                                      note.startsWith('⚠️') ? "text-amber-600 font-medium" : "text-muted-foreground"
                                    )}>{note}</p>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Recommendations */}
                            {developmentPotential.servicesAssessment.recommendations.length > 0 && (
                              <div className="bg-muted/30 rounded-lg p-3">
                                <p className="text-xs font-medium mb-2">Recommendations</p>
                                <ul className="space-y-1">
                                  {developmentPotential.servicesAssessment.recommendations.map((rec, i) => (
                                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-0.5">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Infrastructure Services */}
                  {developmentPotential.infrastructure.length > 0 && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Nearby Infrastructure
                      </h3>
                      <div className="space-y-2">
                        {developmentPotential.infrastructure.map((service, idx) => {
                          const ServiceIcon =
                            service.type === 'stormwater' ? Droplets :
                            service.type === 'transport' ? Car :
                            service.type === 'parks' ? Trees :
                            service.type === 'sewer' ? Droplets :
                            Zap;

                          const isExpanded = expandedInfrastructure.has(service.type);

                          return (
                            <div key={idx} className="bg-muted/30 rounded-lg overflow-hidden">
                              <button
                                className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setExpandedInfrastructure(prev => {
                                    const next = new Set(prev);
                                    if (next.has(service.type)) {
                                      next.delete(service.type);
                                    } else {
                                      next.add(service.type);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                <ServiceIcon className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-medium">{service.name}</p>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    service.status === 'existing' && "bg-green-500/20 text-green-600",
                                    service.status === 'planned' && "bg-blue-500/20 text-blue-600"
                                  )}
                                >
                                  {service.status}
                                </Badge>
                                <ChevronDown className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform",
                                  !isExpanded && "-rotate-90"
                                )} />
                              </button>
                              <AnimatePresence>
                                {isExpanded && service.attributes.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-3 pb-3"
                                  >
                                    <div className="bg-background/50 rounded p-2 text-xs space-y-1">
                                      {Object.entries(service.attributes[0] || {})
                                        .filter(([key]) =>
                                          !key.toLowerCase().includes('objectid') &&
                                          !key.toLowerCase().includes('shape') &&
                                          !key.toLowerCase().includes('globalid')
                                        )
                                        .slice(0, 4)
                                        .map(([key, value]) => (
                                          <div key={key} className="flex justify-between gap-2">
                                            <span className="text-muted-foreground truncate">{key}</span>
                                            <span className="font-medium truncate max-w-[150px]">
                                              {String(value || '-')}
                                            </span>
                                          </div>
                                        ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No Infrastructure Found */}
                  {developmentPotential.infrastructure.length === 0 && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Nearby Infrastructure
                      </h3>
                      <div className="bg-muted/30 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">No LGIP infrastructure data found nearby</p>
                      </div>
                    </div>
                  )}

                  {/* Lead Capture Card */}
                  {selectedCoordinates && (
                    <div className="p-4 pt-0">
                      <LeadCaptureCard
                        lotPlan={selectedProperty?.lotPlan || developmentPotential.property.lotPlan}
                        address={selectedProperty?.locality}
                        coordinates={selectedCoordinates}
                        developmentPotential={developmentPotential}
                        siteAnalysis={analysis}
                      />
                    </div>
                  )}
                </div>
              ) : selectedProperty ? (
                <div className="p-8 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Development analysis loading...
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Search for a property to see development potential
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab('search')}>
                    Search Properties
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isLoadingAmenities ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="mt-3 text-sm">Finding nearby amenities...</p>
                  </div>
                </div>
              ) : amenitiesData ? (
                <div className="divide-y">
                  {/* Overall Score */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Compass className="h-4 w-4 text-blue-500" />
                        Location Score
                      </h3>
                      <Button
                        size="sm"
                        variant={showAmenitiesOnMap ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={toggleAmenityMarkers}
                      >
                        {showAmenitiesOnMap ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide Markers
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show on Map
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Score Card */}
                    <div className={cn(
                      "rounded-xl p-4 border",
                      amenitiesData.overallScore >= 70 ? "bg-green-500/10 border-green-500/30" :
                      amenitiesData.overallScore >= 50 ? "bg-blue-500/10 border-blue-500/30" :
                      amenitiesData.overallScore >= 30 ? "bg-amber-500/10 border-amber-500/30" :
                      "bg-red-500/10 border-red-500/30"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "text-4xl font-bold",
                          getScoreDescription(amenitiesData.overallScore).color
                        )}>
                          {amenitiesData.overallScore}
                        </div>
                        <div>
                          <p className={cn(
                            "font-semibold",
                            getScoreDescription(amenitiesData.overallScore).color
                          )}>
                            {getScoreDescription(amenitiesData.overallScore).label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Based on walkable amenities within {amenitiesData.searchRadius / 1000}km
                          </p>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {amenitiesData.categories.slice(0, 6).map(cat => (
                          <div key={cat.id} className="text-center">
                            <div className="text-lg font-semibold">{cat.score || 0}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{cat.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category Lists */}
                  {amenitiesData.categories.map(category => {
                    const isExpanded = expandedAmenityCategories.has(category.id);
                    const CategoryIcon =
                      category.id === 'schools' ? GraduationCap :
                      category.id === 'transport' ? Train :
                      category.id === 'shopping' ? ShoppingCart :
                      category.id === 'healthcare' ? Heart :
                      category.id === 'recreation' ? Trees :
                      category.id === 'dining' ? Utensils :
                      MapPin;

                    const categoryColor =
                      category.id === 'schools' ? 'text-violet-500' :
                      category.id === 'transport' ? 'text-blue-500' :
                      category.id === 'shopping' ? 'text-emerald-500' :
                      category.id === 'healthcare' ? 'text-red-500' :
                      category.id === 'recreation' ? 'text-green-500' :
                      category.id === 'dining' ? 'text-amber-500' :
                      'text-slate-500';

                    return (
                      <div key={category.id}>
                        <button
                          className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                          onClick={() => {
                            setExpandedAmenityCategories(prev => {
                              const next = new Set(prev);
                              if (next.has(category.id)) {
                                next.delete(category.id);
                              } else {
                                next.add(category.id);
                              }
                              return next;
                            });
                          }}
                        >
                          <CategoryIcon className={cn("h-5 w-5", categoryColor)} />
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{category.icon} {category.name}</span>
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {category.places.length}
                              </Badge>
                            </div>
                            {category.places.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Nearest: {formatDistance(category.places[0].distance)} ({formatTime(category.places[0].walkTime)} walk)
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                (category.score || 0) >= 80 ? "bg-green-500/20 text-green-600" :
                                (category.score || 0) >= 60 ? "bg-blue-500/20 text-blue-600" :
                                (category.score || 0) >= 40 ? "bg-amber-500/20 text-amber-600" :
                                "bg-red-500/20 text-red-600"
                              )}
                            >
                              {category.score || 0}
                            </Badge>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              !isExpanded && "-rotate-90"
                            )} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && category.places.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-3 pb-3"
                            >
                              <div className="space-y-2">
                                {category.places.map((place, idx) => (
                                  <div
                                    key={place.id}
                                    className="bg-muted/30 rounded-lg p-2.5 flex items-start gap-3"
                                  >
                                    <div className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                                      idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{place.name}</p>
                                      {place.subtype && (
                                        <p className="text-xs text-muted-foreground capitalize">{place.subtype}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {formatDistance(place.distance)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          🚶 {formatTime(place.walkTime)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          🚗 {formatTime(place.driveTime)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {isExpanded && category.places.length === 0 && (
                          <div className="px-3 pb-3">
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">No {category.name.toLowerCase()} found within {amenitiesData.searchRadius / 1000}km</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Info Note */}
                  <div className="p-4">
                    <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          Location data sourced from OpenStreetMap. Walking times assume 5km/h, driving times assume 40km/h average speed.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedProperty || selectedCoordinates ? (
                <div className="p-8 text-center">
                  <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading amenities data...
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => selectedCoordinates && fetchAmenities(selectedCoordinates)}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Search for a property to see nearby amenities
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab('search')}>
                    Search Properties
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </motion.div>
  );
}

export default UnifiedPropertyPanel;
