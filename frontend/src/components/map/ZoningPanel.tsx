"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ArrowUpFromLine,
  Maximize2,
  Grid3X3,
  Home,
  Factory,
  Leaf,
  TreePine,
  Waves,
  Star,
  Scale,
  FileText,
  Download,
  TrendingUp,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeProperty,
  getQuickAnalysis,
  generateReport,
  getZoneCategoryColor,
  getHazardLevelColor,
  formatArea,
  detectStateFromCoordinates,
  type PropertyAnalysis,
  type PropertyAnalysisBrief,
  type AustralianState,
  type ZoneCategory,
  type DevelopmentScenario,
} from '@/lib/api/planning-api';

interface ZoningPanelProps {
  coordinates: [number, number] | null;
  address?: string;
  lotPlan?: string;
  lotArea?: number;
  className?: string;
}

const ZONE_ICONS: Record<ZoneCategory, typeof Building2> = {
  residential: Home,
  commercial: Building2,
  industrial: Factory,
  rural: TreePine,
  environmental: Leaf,
  recreation: TreePine,
  special_purpose: Star,
  mixed_use: Grid3X3,
  infrastructure: Building2,
  waterway: Waves,
};

const FEASIBILITY_COLORS = {
  high: 'bg-green-500/10 border-green-500/30 text-green-600',
  medium: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  low: 'bg-red-500/10 border-red-500/30 text-red-600',
};

export function ZoningPanel({
  coordinates,
  address,
  lotPlan,
  lotArea,
  className,
}: ZoningPanelProps) {
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['zoning', 'controls', 'scenarios'])
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch analysis when coordinates change
  useEffect(() => {
    if (!coordinates) {
      setAnalysis(null);
      return;
    }

    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [lon, lat] = coordinates;
        const state = detectStateFromCoordinates(lat, lon);

        const result = await analyzeProperty(lat, lon, {
          state,
          address,
          lotPlan,
          includeScenarios: true,
        });

        setAnalysis(result);
      } catch (err) {
        console.error('Analysis failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to analyze property');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [coordinates, address, lotPlan]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleGenerateReport = async () => {
    if (!coordinates || !analysis) return;

    setIsGeneratingReport(true);
    try {
      const [lon, lat] = coordinates;
      const report = await generateReport(
        lat,
        lon,
        analysis.location.state,
        { address, lotPlan }
      );

      if (report.pdf_url) {
        window.open(report.pdf_url, '_blank');
      } else {
        // Download JSON report as fallback
        const blob = new Blob([JSON.stringify(report.analysis, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `property-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (!coordinates) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a property to see zoning and development controls
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-8 text-center", className)}>
        <div className="relative mx-auto w-14 h-14">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
          <div className="relative bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full p-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </div>
        <p className="mt-4 font-medium">Analyzing property...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Fetching zoning and development controls
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4", className)}>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Analysis Failed</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              // Retry logic would go here
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const ZoneIcon = ZONE_ICONS[analysis.zoning.zone_category] || Building2;

  return (
    <div className={cn("divide-y divide-border/50", className)}>
      {/* Zoning Section */}
      <div>
        <button
          onClick={() => toggleSection('zoning')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: `${getZoneCategoryColor(analysis.zoning.zone_category)}20` }}
            >
              <ZoneIcon
                className="h-4 w-4"
                style={{ color: getZoneCategoryColor(analysis.zoning.zone_category) }}
              />
            </div>
            <span className="font-medium">Zoning</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className="text-white"
              style={{ backgroundColor: getZoneCategoryColor(analysis.zoning.zone_category) }}
            >
              {analysis.zoning.zone_code}
            </Badge>
            {expandedSections.has('zoning') ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expandedSections.has('zoning') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4"
            >
              <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Zone Name</span>
                  <p className="font-medium">{analysis.zoning.zone_name}</p>
                </div>

                {analysis.zoning.description && (
                  <div>
                    <span className="text-xs text-muted-foreground">Description</span>
                    <p className="text-sm text-muted-foreground">
                      {analysis.zoning.description}
                    </p>
                  </div>
                )}

                {analysis.zoning.lga_name && (
                  <div>
                    <span className="text-xs text-muted-foreground">LGA</span>
                    <p className="text-sm">{analysis.zoning.lga_name}</p>
                  </div>
                )}

                {/* Permitted Uses */}
                {analysis.zoning.permitted_uses.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Permitted Uses (with consent)
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {analysis.zoning.permitted_uses.slice(0, 6).map((use, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          {use}
                        </Badge>
                      ))}
                      {analysis.zoning.permitted_uses.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{analysis.zoning.permitted_uses.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Zone Objectives */}
                {analysis.zoning.objectives.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Zone Objectives</span>
                    <ul className="mt-1 space-y-1">
                      {analysis.zoning.objectives.slice(0, 3).map((obj, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Development Controls Section */}
      <div>
        <button
          onClick={() => toggleSection('controls')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <ArrowUpFromLine className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="font-medium">Development Controls</span>
          </div>
          {expandedSections.has('controls') ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has('controls') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4"
            >
              <div className="grid grid-cols-2 gap-2">
                {/* Height Limit */}
                {analysis.development_controls.height_limit && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowUpFromLine className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Max Height</span>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">
                      {analysis.development_controls.height_limit.max_value}
                      <span className="text-sm font-normal ml-0.5">
                        {analysis.development_controls.height_limit.unit}
                      </span>
                    </p>
                    {analysis.development_controls.estimated_storeys && (
                      <p className="text-xs text-muted-foreground">
                        ~{analysis.development_controls.estimated_storeys} storeys
                      </p>
                    )}
                  </div>
                )}

                {/* FSR */}
                {analysis.development_controls.fsr && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Maximize2 className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs text-muted-foreground">FSR</span>
                    </div>
                    <p className="text-lg font-semibold text-purple-600">
                      {analysis.development_controls.fsr.max_value}:1
                    </p>
                    {analysis.development_controls.estimated_gfa && (
                      <p className="text-xs text-muted-foreground">
                        ~{formatArea(analysis.development_controls.estimated_gfa)} GFA
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Setbacks */}
              {analysis.development_controls.setbacks.length > 0 && (
                <div className="mt-3 bg-muted/30 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">Setbacks</span>
                  <div className="mt-2 space-y-1.5">
                    {analysis.development_controls.setbacks.map((setback, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{setback.name}</span>
                        <span className="font-medium">
                          {setback.min_value} {setback.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Building Envelope Summary */}
              {analysis.development_potential.building_envelope.buildable_area_sqm && (
                <div className="mt-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg p-3 border border-blue-500/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Grid3X3 className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">
                      Building Envelope
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Buildable Area</span>
                      <p className="font-semibold">
                        {formatArea(analysis.development_potential.building_envelope.buildable_area_sqm)}
                      </p>
                    </div>
                    {analysis.development_potential.building_envelope.max_gfa_sqm && (
                      <div>
                        <span className="text-xs text-muted-foreground">Max GFA</span>
                        <p className="font-semibold">
                          {formatArea(analysis.development_potential.building_envelope.max_gfa_sqm)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Development Scenarios Section */}
      {analysis.development_potential.scenarios.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('scenarios')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <span className="font-medium">Development Potential</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {analysis.development_potential.scenarios.length} scenarios
              </Badge>
              {expandedSections.has('scenarios') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {expandedSections.has('scenarios') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4 space-y-2"
              >
                {analysis.development_potential.scenarios.map((scenario, idx) => (
                  <ScenarioCard
                    key={idx}
                    scenario={scenario}
                    isRecommended={scenario.scenario_name === analysis.development_potential.recommended_scenario}
                  />
                ))}

                {/* Opportunities & Constraints */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {analysis.development_potential.key_opportunities.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">
                          Opportunities
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {analysis.development_potential.key_opportunities.map((opp, idx) => (
                          <li key={idx} className="text-xs text-green-600/80">
                            • {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.development_potential.key_constraints.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-600">
                          Constraints
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {analysis.development_potential.key_constraints.map((con, idx) => (
                          <li key={idx} className="text-xs text-red-600/80">
                            • {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Subdivision Potential */}
                {analysis.development_potential.subdivision.can_subdivide && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Scale className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs font-medium text-purple-600">
                        Subdivision Potential
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Potential Lots</span>
                        <p className="font-semibold text-purple-600">
                          {analysis.development_potential.subdivision.potential_lots}
                        </p>
                      </div>
                      {analysis.development_potential.subdivision.min_lot_size && (
                        <div>
                          <span className="text-xs text-muted-foreground">Min Lot Size</span>
                          <p className="font-semibold">
                            {formatArea(analysis.development_potential.subdivision.min_lot_size)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Report Actions */}
      <div className="p-4 bg-gradient-to-r from-muted/30 to-transparent">
        <Button
          size="sm"
          className="w-full"
          onClick={handleGenerateReport}
          disabled={isGeneratingReport}
        >
          {isGeneratingReport ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Full Report
            </>
          )}
        </Button>

        {/* Confidence & Data Sources */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            <span>Confidence: {Math.round(analysis.confidence_score * 100)}%</span>
          </div>
          <span>{analysis.data_sources[0]}</span>
        </div>

        {analysis.limitations.length > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            {analysis.limitations[0]}
          </p>
        )}
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  isRecommended,
}: {
  scenario: DevelopmentScenario;
  isRecommended: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isRecommended);

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-colors",
        isRecommended
          ? "border-green-500/30 bg-green-500/5"
          : "border-border/50"
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isRecommended && (
            <Star className="h-3.5 w-3.5 text-green-500 fill-green-500" />
          )}
          <span className="font-medium text-sm">{scenario.scenario_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", FEASIBILITY_COLORS[scenario.feasibility_rating])}
          >
            {scenario.feasibility_rating.toUpperCase()}
          </Badge>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3"
          >
            <div className="flex gap-4 text-sm mb-2">
              {scenario.estimated_dwellings && (
                <div>
                  <span className="text-xs text-muted-foreground">Dwellings</span>
                  <p className="font-semibold">{scenario.estimated_dwellings}</p>
                </div>
              )}
              {scenario.estimated_gfa && (
                <div>
                  <span className="text-xs text-muted-foreground">Est. GFA</span>
                  <p className="font-semibold">{formatArea(scenario.estimated_gfa)}</p>
                </div>
              )}
            </div>

            <div className="text-xs mb-2">
              <span className="text-muted-foreground">Approval: </span>
              <Badge variant="outline" className="text-xs">
                {scenario.estimated_approval_pathway.toUpperCase()}
              </Badge>
            </div>

            {scenario.key_requirements.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">Requirements:</span>
                <ul className="mt-1 space-y-0.5">
                  {scenario.key_requirements.slice(0, 3).map((req, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-blue-500">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ZoningPanel;
