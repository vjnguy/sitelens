"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Plus,
  Trash2,
  MapPin,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Building2,
  Scale,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeSite, SiteAnalysis, formatArea, getConstraintSummary } from '@/lib/api/qld-identify';
import { generateDueDiligenceReport, downloadReport, DueDiligenceReport } from '@/lib/reports/due-diligence';
import { motion, AnimatePresence } from 'framer-motion';

interface ComparativeAnalysisProps {
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
}

interface ComparisonSite {
  id: string;
  analysis: SiteAnalysis;
  report: DueDiligenceReport;
  color: string;
}

const SITE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export function ComparativeAnalysis({
  map,
  onClose,
  className,
}: ComparativeAnalysisProps) {
  const [sites, setSites] = useState<ComparisonSite[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  const siteLayersRef = useRef<Set<string>>(new Set());
  const siteIdCounter = useRef(0);

  // Add site highlight to map
  const addSiteToMap = useCallback((site: ComparisonSite) => {
    if (!map || !site.analysis.property?.geometry) return;

    const sourceId = `compare-site-${site.id}`;
    const fillLayerId = `compare-site-${site.id}-fill`;
    const outlineLayerId = `compare-site-${site.id}-outline`;
    const labelLayerId = `compare-site-${site.id}-label`;

    // Remove existing
    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    const geometry = site.analysis.property.geometry;

    // Calculate center for label
    const coords = geometry.coordinates[0];
    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);
    const center = [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ];

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { label: site.analysis.property?.lotPlan || 'Site' },
            geometry,
          },
          {
            type: 'Feature',
            properties: { label: site.analysis.property?.lotPlan || 'Site' },
            geometry: { type: 'Point', coordinates: center },
          },
        ],
      },
    });

    // Add fill
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': site.color,
        'fill-opacity': 0.2,
      },
    });

    // Add outline
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': site.color,
        'line-width': 3,
      },
    });

    // Add label
    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': site.color,
        'text-halo-color': '#fff',
        'text-halo-width': 2,
      },
    });

    siteLayersRef.current.add(site.id);
  }, [map]);

  // Remove site from map
  const removeSiteFromMap = useCallback((siteId: string) => {
    if (!map) return;

    const sourceId = `compare-site-${siteId}`;
    const fillLayerId = `compare-site-${siteId}-fill`;
    const outlineLayerId = `compare-site-${siteId}-outline`;
    const labelLayerId = `compare-site-${siteId}-label`;

    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    siteLayersRef.current.delete(siteId);
  }, [map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      siteLayersRef.current.forEach(id => {
        removeSiteFromMap(id);
      });
    };
  }, [removeSiteFromMap]);

  // Handle map click when selecting
  useEffect(() => {
    if (!map || !isSelecting) return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      if (sites.length >= 5) {
        setIsSelecting(false);
        return;
      }

      setIsLoading(true);
      const { lng, lat } = e.lngLat;

      try {
        const analysis = await analyzeSite(lng, lat);

        if (!analysis.property) {
          alert('No property found at this location');
          return;
        }

        // Check if already added
        if (sites.some(s => s.analysis.property?.lotPlan === analysis.property?.lotPlan)) {
          alert('This property is already in the comparison');
          return;
        }

        const report = generateDueDiligenceReport(analysis);
        const id = `site-${siteIdCounter.current++}`;
        const color = SITE_COLORS[sites.length % SITE_COLORS.length];

        const newSite: ComparisonSite = { id, analysis, report, color };
        setSites(prev => [...prev, newSite]);
        addSiteToMap(newSite);

        // Zoom to include all sites
        if (sites.length === 0 && analysis.property.geometry) {
          const coords = analysis.property.geometry.coordinates[0];
          const lngs = coords.map((c: number[]) => c[0]);
          const lats = coords.map((c: number[]) => c[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 100, duration: 500 }
          );
        }
      } catch (err) {
        console.error('Failed to analyze site:', err);
        alert('Failed to analyze site');
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
  }, [map, isSelecting, sites, addSiteToMap]);

  // Remove a site
  const removeSite = useCallback((siteId: string) => {
    removeSiteFromMap(siteId);
    setSites(prev => prev.filter(s => s.id !== siteId));
  }, [removeSiteFromMap]);

  // Clear all sites
  const clearAll = useCallback(() => {
    sites.forEach(s => removeSiteFromMap(s.id));
    setSites([]);
    setExpandedSite(null);
  }, [sites, removeSiteFromMap]);

  // Get best site (lowest constraints)
  const getBestSite = (): ComparisonSite | null => {
    if (sites.length === 0) return null;

    return sites.reduce((best, current) => {
      const bestSummary = getConstraintSummary(best.analysis.constraints);
      const currentSummary = getConstraintSummary(current.analysis.constraints);

      // Score: high=3, medium=2, low=1
      const bestScore = bestSummary.high * 3 + bestSummary.medium * 2 + bestSummary.low;
      const currentScore = currentSummary.high * 3 + currentSummary.medium * 2 + currentSummary.low;

      return currentScore < bestScore ? current : best;
    });
  };

  const bestSite = getBestSite();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "absolute top-20 left-4 bottom-20 w-[460px] z-10 pointer-events-auto",
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20">
              <Scale className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold">Compare Sites</h2>
              <p className="text-[10px] text-muted-foreground">Analyze multiple properties</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              "text-xs transition-colors",
              sites.length >= 5 ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : ""
            )}>
              {sites.length}/5
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant={isSelecting ? 'default' : 'outline'}
            onClick={() => setIsSelecting(!isSelecting)}
            disabled={sites.length >= 5 || isLoading}
            className={cn(
              "h-9 transition-all",
              isSelecting && "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : isSelecting ? (
              <Target className="h-4 w-4 mr-1.5 animate-pulse" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            {isSelecting ? 'Click on Map...' : 'Add Site'}
          </Button>
          <AnimatePresence>
            {sites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  onClick={clearAll}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear All
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sites List */}
      <div className="flex-1 overflow-y-auto">
        {sites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex items-center justify-center p-8 min-h-[250px]"
          >
            <div className="text-center">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping opacity-30" />
                <div className="relative bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full p-4">
                  <Scale className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <h3 className="mt-4 font-semibold">No Sites Added</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
                Click "Add Site" then click on properties on the map to compare them side-by-side.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="divide-y divide-border/50">
            <AnimatePresence>
              {sites.map((site, idx) => {
                const summary = getConstraintSummary(site.analysis.constraints);
                const isExpanded = expandedSite === site.id;
                const isBest = bestSite?.id === site.id && sites.length > 1;

                return (
                  <motion.div
                    key={site.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "transition-colors",
                      isBest && "bg-gradient-to-r from-green-500/10 to-transparent"
                    )}
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ring-2 ring-background shadow-md"
                            style={{ backgroundColor: site.color }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">
                                {site.analysis.property?.lotPlan}
                              </span>
                              {isBest && (
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] shadow-sm">
                                  <Trophy className="h-2.5 w-2.5 mr-1" />
                                  Best Option
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {site.analysis.property?.locality}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {summary.high > 0 && (
                              <Badge className="bg-red-500/90 text-white text-[10px] shadow-sm">
                                {summary.high}
                              </Badge>
                            )}
                            {summary.medium > 0 && (
                              <Badge className="bg-amber-500/90 text-white text-[10px] shadow-sm">
                                {summary.medium}
                              </Badge>
                            )}
                            {summary.low > 0 && (
                              <Badge className="bg-blue-500/90 text-white text-[10px] shadow-sm">
                                {summary.low}
                              </Badge>
                            )}
                            {summary.total === 0 && (
                              <Badge className="bg-green-500/90 text-white text-[10px] shadow-sm">
                                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                Clear
                              </Badge>
                            )}
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4 space-y-3"
                        >
                          {/* Property Info */}
                          <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-2 border border-border/50">
                            {site.analysis.property?.area && site.analysis.property.area > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Area</span>
                                <span className="font-medium">{formatArea(site.analysis.property.area)}</span>
                              </div>
                            )}
                            {site.analysis.property?.tenure && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Tenure</span>
                                <Badge variant="outline" className="text-[10px]">{site.analysis.property.tenure}</Badge>
                              </div>
                            )}
                            {site.analysis.property?.lga && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">LGA</span>
                                <span>{site.analysis.property.lga}</span>
                              </div>
                            )}
                          </div>

                          {/* Constraints Summary */}
                          <div className="space-y-2">
                            <span className="text-xs font-semibold">Constraints:</span>
                            {site.analysis.constraints.length === 0 ? (
                              <div className="flex items-center gap-2 text-xs text-green-600 p-2 bg-green-500/10 rounded-lg">
                                <CheckCircle className="h-4 w-4" />
                                No constraints identified
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {site.analysis.constraints.slice(0, 5).map((c, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30"
                                  >
                                    {c.severity === 'high' ? (
                                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                    ) : (
                                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{c.layerName}</span>
                                  </motion.div>
                                ))}
                                {site.analysis.constraints.length > 5 && (
                                  <span className="text-xs text-muted-foreground pl-1">
                                    +{site.analysis.constraints.length - 5} more constraints
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (map && site.analysis.property?.geometry) {
                                  const coords = site.analysis.property.geometry.coordinates[0];
                                  const lngs = coords.map((c: number[]) => c[0]);
                                  const lats = coords.map((c: number[]) => c[1]);
                                  map.fitBounds(
                                    [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                                    { padding: 100, duration: 500 }
                                  );
                                }
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadReport(site.report, 'html');
                              }}
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Report
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSite(site.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Comparison Summary */}
      <AnimatePresence>
        {sites.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t bg-gradient-to-r from-muted/30 to-transparent"
          >
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple-600" />
                Comparison Summary
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-3 font-semibold">Site</th>
                      <th className="text-center py-2 px-2 font-semibold">
                        <span className="text-red-600">High</span>
                      </th>
                      <th className="text-center py-2 px-2 font-semibold">
                        <span className="text-amber-600">Med</span>
                      </th>
                      <th className="text-center py-2 px-2 font-semibold">
                        <span className="text-blue-600">Low</span>
                      </th>
                      <th className="text-right py-2 px-3 font-semibold">Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site, idx) => {
                      const summary = getConstraintSummary(site.analysis.constraints);
                      const isBest = bestSite?.id === site.id;
                      return (
                        <motion.tr
                          key={site.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "border-b last:border-b-0 transition-colors hover:bg-muted/30",
                            isBest && "bg-green-500/10"
                          )}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shadow-sm"
                                style={{ backgroundColor: site.color }}
                              />
                              <span className="font-mono font-medium truncate max-w-[100px]">
                                {site.analysis.property?.lotPlan}
                              </span>
                              {isBest && (
                                <Trophy className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={cn(
                              "font-mono font-semibold",
                              summary.high > 0 ? "text-red-600" : "text-muted-foreground"
                            )}>
                              {summary.high}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={cn(
                              "font-mono font-semibold",
                              summary.medium > 0 ? "text-amber-600" : "text-muted-foreground"
                            )}>
                              {summary.medium}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={cn(
                              "font-mono font-semibold",
                              summary.low > 0 ? "text-blue-600" : "text-muted-foreground"
                            )}>
                              {summary.low}
                            </span>
                          </td>
                          <td className="text-right py-2 px-3 font-medium">
                            {site.analysis.property?.area
                              ? formatArea(site.analysis.property.area)
                              : '-'}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ComparativeAnalysis;
