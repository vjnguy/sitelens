"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Building2,
  Landmark,
  TreePine,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  FileText,
  Crosshair,
  Navigation,
  Layers,
  Shield,
  Droplets,
  Flame,
  Download,
  Printer,
  Check,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeSite,
  SiteAnalysis,
  IdentifyResult,
  PropertyInfo,
  formatArea,
  getConstraintSummary,
  IDENTIFY_LAYERS,
} from '@/lib/api/qld-identify';
import {
  generateDueDiligenceReport,
  downloadReport,
  printReport,
} from '@/lib/reports/due-diligence';
import type { Feature, Polygon } from 'geojson';

interface SiteAnalysisPanelProps {
  map: mapboxgl.Map | null;
  isActive: boolean;
  onToggleActive: () => void;
  onClose: () => void;
  className?: string;
}

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  Planning: Building2,
  Heritage: Landmark,
  Environment: TreePine,
  Hazards: AlertTriangle,
  Infrastructure: Layers,
};

const SEVERITY_CONFIG = {
  high: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500',
    icon: AlertTriangle,
    label: 'High Impact',
  },
  medium: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500',
    icon: AlertCircle,
    label: 'Medium Impact',
  },
  low: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500',
    icon: Info,
    label: 'Low Impact',
  },
  info: {
    bg: 'bg-slate-500/10 border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-500',
    icon: CheckCircle,
    label: 'Information',
  },
};

export function SiteAnalysisPanel({
  map,
  isActive,
  onToggleActive,
  onClose,
  className,
}: SiteAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedConstraints, setExpandedConstraints] = useState<Set<string>>(new Set());
  const [highlightedLayers, setHighlightedLayers] = useState<Set<string>>(new Set());
  const [coordsCopied, setCoordsCopied] = useState(false);

  const propertyLayerRef = useRef<boolean>(false);
  const constraintLayersRef = useRef<Set<string>>(new Set());

  // Add property boundary to map
  const addPropertyToMap = useCallback((geometry: Polygon) => {
    if (!map) return;

    const sourceId = 'site-analysis-property';
    const fillLayerId = 'site-analysis-property-fill';
    const outlineLayerId = 'site-analysis-property-outline';

    // Remove existing
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry,
      },
    });

    // Add fill
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#ff6600',
        'fill-opacity': 0.15,
      },
    });

    // Add outline
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ff6600',
        'line-width': 3,
      },
    });

    propertyLayerRef.current = true;
  }, [map]);

  // Add constraint feature to map
  const addConstraintToMap = useCallback((constraint: IdentifyResult) => {
    if (!map || constraint.features.length === 0) return;

    const sourceId = `site-constraint-${constraint.layerId}`;
    const fillLayerId = `site-constraint-${constraint.layerId}-fill`;
    const outlineLayerId = `site-constraint-${constraint.layerId}-outline`;

    // Remove existing
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: constraint.features,
      },
    });

    // Add fill
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': constraint.color,
        'fill-opacity': 0.3,
      },
    });

    // Add outline
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': constraint.color,
        'line-width': 2,
      },
    });

    constraintLayersRef.current.add(constraint.layerId);
  }, [map]);

  // Remove constraint from map
  const removeConstraintFromMap = useCallback((layerId: string) => {
    if (!map) return;

    const sourceId = `site-constraint-${layerId}`;
    const fillLayerId = `site-constraint-${layerId}-fill`;
    const outlineLayerId = `site-constraint-${layerId}-outline`;

    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    constraintLayersRef.current.delete(layerId);
  }, [map]);

  // Clear all map layers
  const clearMapLayers = useCallback(() => {
    if (!map) return;

    // Remove property layer
    if (propertyLayerRef.current) {
      const sourceId = 'site-analysis-property';
      if (map.getLayer('site-analysis-property-fill')) map.removeLayer('site-analysis-property-fill');
      if (map.getLayer('site-analysis-property-outline')) map.removeLayer('site-analysis-property-outline');
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      propertyLayerRef.current = false;
    }

    // Remove all constraint layers
    constraintLayersRef.current.forEach(layerId => {
      removeConstraintFromMap(layerId);
    });
    constraintLayersRef.current.clear();
    setHighlightedLayers(new Set());
  }, [map, removeConstraintFromMap]);

  // Handle map click when active
  useEffect(() => {
    if (!map || !isActive) return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      setIsLoading(true);
      setError(null);
      clearMapLayers();

      try {
        const result = await analyzeSite(lng, lat);
        setAnalysis(result);

        // Add property boundary to map
        if (result.property?.geometry) {
          addPropertyToMap(result.property.geometry);

          // Zoom to property
          const coords = result.property.geometry.coordinates[0];
          const lngs = coords.map((c: number[]) => c[0]);
          const lats = coords.map((c: number[]) => c[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 100, duration: 500 }
          );
        }

        // Auto-highlight high severity constraints
        const highSeverity = result.constraints.filter(c => c.severity === 'high');
        highSeverity.forEach(c => {
          addConstraintToMap(c);
          setHighlightedLayers(prev => new Set(prev).add(c.layerId));
        });

      } catch (err) {
        console.error('Site analysis failed:', err);
        setError('Failed to analyze site. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isActive, clearMapLayers, addPropertyToMap, addConstraintToMap]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      clearMapLayers();
    };
  }, [clearMapLayers]);

  // Toggle constraint visibility
  const toggleConstraintVisibility = (constraint: IdentifyResult) => {
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
  };

  // Toggle constraint expansion
  const toggleExpanded = (layerId: string) => {
    setExpandedConstraints(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  // Copy coordinates
  const copyCoordinates = () => {
    if (analysis) {
      navigator.clipboard.writeText(`${analysis.coordinates[1].toFixed(6)}, ${analysis.coordinates[0].toFixed(6)}`);
      setCoordsCopied(true);
      setTimeout(() => setCoordsCopied(false), 2000);
    }
  };

  // Get summary
  const summary = analysis ? getConstraintSummary(analysis.constraints) : null;

  // Group constraints by category
  const constraintsByCategory = analysis?.constraints.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, IdentifyResult[]>) || {};

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "absolute top-20 left-4 bottom-20 w-[400px] z-10 pointer-events-auto",
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg transition-all",
              isActive
                ? "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-muted"
            )}>
              {isActive ? (
                <Target className="h-4 w-4 animate-pulse" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">Site Analysis</h2>
              <p className="text-[10px] text-muted-foreground">
                {isActive ? 'Click anywhere on map' : 'Planning & constraints'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={cn(
                "h-9 transition-all",
                isActive && "bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20"
              )}
              onClick={onToggleActive}
            >
              {isActive ? (
                <>
                  <Target className="h-4 w-4 mr-1.5 animate-pulse" />
                  Selecting...
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4 mr-1.5" />
                  Select Site
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
                <div className="relative bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              </div>
              <p className="mt-4 font-medium">Analyzing site...</p>
              <p className="text-xs text-muted-foreground mt-1">Querying {IDENTIFY_LAYERS.length} layers</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4"
          >
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
              <p className="mt-3 text-sm text-destructive">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!analysis && !isLoading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex items-center justify-center p-8"
        >
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping opacity-30" />
              <div className="relative bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full p-4">
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold">No Site Selected</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
              Click "Select Site" then click anywhere on the map to analyze planning constraints.
            </p>
          </div>
        </motion.div>
      )}

      {/* Analysis Results */}
      {analysis && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 overflow-y-auto"
        >
          {/* Coordinates */}
          <div className="px-4 py-3 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-mono text-xs">
                {analysis.coordinates[1].toFixed(6)}, {analysis.coordinates[0].toFixed(6)}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 hover:bg-orange-500/10 hover:text-orange-600"
              onClick={copyCoordinates}
            >
              {coordsCopied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Property Info */}
          {analysis.property ? (
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Property Details</h3>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lot/Plan</span>
                  <span className="text-sm font-mono font-medium">{analysis.property.lotPlan}</span>
                </div>
                {analysis.property.locality && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Locality</span>
                    <span className="text-sm">{analysis.property.locality}</span>
                  </div>
                )}
                {analysis.property.lga && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">LGA</span>
                    <span className="text-sm">{analysis.property.lga}</span>
                  </div>
                )}
                {analysis.property.area > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Area</span>
                    <span className="text-sm font-medium">{formatArea(analysis.property.area)}</span>
                  </div>
                )}
                {analysis.property.tenure && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tenure</span>
                    <span className="text-sm">{analysis.property.tenure}</span>
                  </div>
                )}
                {analysis.property.parcelType && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm">{analysis.property.parcelType}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border-b">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <AlertCircle className="h-5 w-5 mx-auto text-amber-500" />
                <p className="mt-1 text-sm text-amber-600">No property boundary found at this location</p>
              </div>
            </div>
          )}

          {/* Constraint Summary */}
          {summary && summary.total > 0 && (
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Constraint Summary</h3>
              </div>

              <div className="flex gap-2 flex-wrap">
                {summary.high > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {summary.high} High
                  </Badge>
                )}
                {summary.medium > 0 && (
                  <Badge className="bg-amber-500 text-white">
                    {summary.medium} Medium
                  </Badge>
                )}
                {summary.low > 0 && (
                  <Badge className="bg-blue-500 text-white">
                    {summary.low} Low
                  </Badge>
                )}
                <Badge variant="outline">{summary.total} Total</Badge>
              </div>
            </div>
          )}

          {/* Constraints by Category */}
          {Object.entries(constraintsByCategory).map(([category, constraints]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Layers;

            return (
              <div key={category} className="border-b">
                <div className="px-4 py-2 bg-muted/20 flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">{category}</span>
                  <Badge variant="secondary" className="text-xs">{constraints.length}</Badge>
                </div>

                <div className="divide-y">
                  {constraints.map((constraint) => {
                    const severity = constraint.severity || 'info';
                    const config = SEVERITY_CONFIG[severity];
                    const SeverityIcon = config.icon;
                    const isExpanded = expandedConstraints.has(constraint.layerId);
                    const isVisible = highlightedLayers.has(constraint.layerId);

                    return (
                      <div key={constraint.layerId} className={cn("", config.bg)}>
                        <div className="px-4 py-2 flex items-center gap-2">
                          <button
                            onClick={() => toggleExpanded(constraint.layerId)}
                            className="p-0.5"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: constraint.color }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm font-medium", config.text)}>
                                {constraint.layerName}
                              </span>
                              <Badge className={cn("text-[10px] text-white h-4", config.badge)}>
                                {config.label}
                              </Badge>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleConstraintVisibility(constraint)}
                          >
                            {isVisible ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && constraint.attributes.length > 0 && (
                          <div className="px-4 pb-3">
                            <div className="bg-background/50 rounded-lg p-2 text-xs space-y-1">
                              {Object.entries(constraint.attributes[0] || {})
                                .filter(([key]) =>
                                  !key.toLowerCase().includes('objectid') &&
                                  !key.toLowerCase().includes('shape') &&
                                  !key.toLowerCase().includes('globalid')
                                )
                                .slice(0, 8)
                                .map(([key, value]) => (
                                  <div key={key} className="flex justify-between gap-2">
                                    <span className="text-muted-foreground truncate">{key}</span>
                                    <span className="font-medium truncate max-w-[180px]">
                                      {String(value || '-')}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* No Constraints */}
          {analysis.constraints.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 text-center"
            >
              <div className="mx-auto w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mt-4 font-semibold text-green-600">No Constraints Found</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-[280px] mx-auto">
                This site has no identified planning constraints from the queried layers.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Footer Actions */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t bg-gradient-to-r from-muted/30 to-transparent"
          >
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20"
                  onClick={() => {
                    const report = generateDueDiligenceReport(analysis);
                    downloadReport(report, 'html');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30"
                  onClick={() => {
                    const report = generateDueDiligenceReport(analysis);
                    printReport(report);
                  }}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                Report includes property details and all identified constraints
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SiteAnalysisPanel;
