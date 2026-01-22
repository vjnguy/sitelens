"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { CodeEditor } from './CodeEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Feature, FeatureCollection } from 'geojson';
import type { Layer, SandboxResult } from '@/types/gis';
import { cn } from '@/lib/utils';

interface CodeSandboxProps {
  layers: Layer[];
  selectedFeatures?: Feature[];
  mapBounds?: { west: number; south: number; east: number; north: number };
  onResult?: (result: SandboxResult) => void;
  className?: string;
}

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  args: unknown[];
  timestamp: Date;
}

const DEFAULT_CODE = `// SiteLens Code Sandbox
// Available globals:
//   gis - GIS functions (turf.js)
//   sitelens - Helper functions
//   format - Formatting helpers
//   layers - All layer data
//   selectedFeatures - Currently selected features
//   mapBounds - Current map bounds
//   getLayer(name) - Get layer by name or ID

// Example: Buffer the first selected feature
if (selectedFeatures.length > 0) {
  const buffered = gis.buffer(selectedFeatures[0], 100, { units: 'meters' });
  console.log('Buffered area:', format.area(gis.area(buffered)));
  return buffered;
}

return null;
`;

export function CodeSandbox({
  layers,
  selectedFeatures = [],
  mapBounds = { west: 0, south: 0, east: 0, north: 0 },
  onResult,
  className,
}: CodeSandboxProps) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker from blob to avoid build issues
    const workerCode = `
      importScripts('https://unpkg.com/@turf/turf@7/turf.min.js');

      const gis = {
        area: turf.area,
        length: turf.length,
        distance: turf.distance,
        bearing: turf.bearing,
        center: turf.center,
        centroid: turf.centroid,
        buffer: turf.buffer,
        simplify: turf.simplify,
        union: turf.union,
        intersect: turf.intersect,
        difference: turf.difference,
        convex: turf.convex,
        booleanContains: turf.booleanContains,
        booleanIntersects: turf.booleanIntersects,
        booleanPointInPolygon: turf.booleanPointInPolygon,
        booleanWithin: turf.booleanWithin,
        point: turf.point,
        lineString: turf.lineString,
        polygon: turf.polygon,
        featureCollection: turf.featureCollection,
        hexGrid: turf.hexGrid,
        pointGrid: turf.pointGrid,
        squareGrid: turf.squareGrid,
        nearestPoint: turf.nearestPoint,
        pointsWithinPolygon: turf.pointsWithinPolygon,
        bbox: turf.bbox,
        bboxPolygon: turf.bboxPolygon,
        randomPoint: turf.randomPoint,
        randomPolygon: turf.randomPolygon,
      };

      const sitelens = {
        filterByProperty: (fc, property, value) => ({
          type: 'FeatureCollection',
          features: fc.features.filter(f => f.properties && f.properties[property] === value),
        }),
        filterByCondition: (fc, predicate) => ({
          type: 'FeatureCollection',
          features: fc.features.filter(f => f.properties && predicate(f.properties)),
        }),
        uniqueValues: (fc, property) => {
          const values = new Set();
          fc.features.forEach(f => {
            if (f.properties && f.properties[property] !== undefined) {
              values.add(f.properties[property]);
            }
          });
          return Array.from(values);
        },
        statistics: (fc, property) => {
          const values = fc.features.map(f => f.properties && f.properties[property]).filter(v => typeof v === 'number');
          if (values.length === 0) return { min: 0, max: 0, mean: 0, sum: 0, count: 0 };
          const sum = values.reduce((a, b) => a + b, 0);
          return { min: Math.min(...values), max: Math.max(...values), mean: sum / values.length, sum, count: values.length };
        },
        addProperty: (fc, property, value) => ({
          type: 'FeatureCollection',
          features: fc.features.map(f => ({ ...f, properties: { ...f.properties, [property]: typeof value === 'function' ? value(f) : value } })),
        }),
        addAreaProperty: (fc, propertyName = 'area_sqm') => ({
          type: 'FeatureCollection',
          features: fc.features.map(f => ({ ...f, properties: { ...f.properties, [propertyName]: (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') ? turf.area(f) : 0 } })),
        }),
        findNearby: (fc, point, distance, units = 'meters') => {
          const pt = turf.point(point);
          const buffered = turf.buffer(pt, distance, { units });
          if (!buffered) return { type: 'FeatureCollection', features: [] };
          return { type: 'FeatureCollection', features: fc.features.filter(f => { try { return turf.booleanIntersects(f, buffered); } catch { return false; } }) };
        },
      };

      const format = {
        area: (sqMeters) => {
          if (sqMeters < 10000) return sqMeters.toFixed(1) + ' m²';
          const hectares = sqMeters / 10000;
          if (hectares < 100) return hectares.toFixed(2) + ' ha';
          return (sqMeters / 1000000).toFixed(2) + ' km²';
        },
        length: (meters) => {
          if (meters < 1000) return meters.toFixed(1) + ' m';
          return (meters / 1000).toFixed(2) + ' km';
        },
        coordinates: (coords) => coords[1].toFixed(6) + ', ' + coords[0].toFixed(6),
      };

      let executionLogs = [];
      const sandboxConsole = {
        log: (...args) => { executionLogs.push({ level: 'log', args }); },
        warn: (...args) => { executionLogs.push({ level: 'warn', args }); },
        error: (...args) => { executionLogs.push({ level: 'error', args }); },
        info: (...args) => { executionLogs.push({ level: 'info', args }); },
      };

      self.onmessage = function(e) {
        const { code, context } = e.data;
        executionLogs = [];
        const startTime = performance.now();

        try {
          const { layers, selectedFeatures, mapBounds } = context;
          const layerData = {};
          layers.forEach(l => { layerData[l.id] = l.data; layerData[l.name] = l.data; });
          const getLayer = (idOrName) => layerData[idOrName] || null;

          const fn = new Function('console', 'gis', 'sitelens', 'format', 'layers', 'selectedFeatures', 'mapBounds', 'getLayer', code);
          const result = fn(sandboxConsole, gis, sitelens, format, layerData, selectedFeatures, mapBounds, getLayer);

          self.postMessage({
            type: 'result',
            success: true,
            output: result,
            logs: executionLogs,
            executionTime: performance.now() - startTime,
          });
        } catch (error) {
          self.postMessage({
            type: 'result',
            success: false,
            error: error.message,
            logs: executionLogs,
            executionTime: performance.now() - startTime,
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      const { type, success, output, error, logs: workerLogs, executionTime } = e.data;

      if (type === 'result') {
        setIsRunning(false);

        // Add logs
        const newLogs = workerLogs.map((log: { level: string; args: unknown[] }) => ({
          level: log.level as LogEntry['level'],
          args: log.args,
          timestamp: new Date(),
        }));
        setLogs((prev) => [...prev, ...newLogs]);

        // Set result
        const sandboxResult: SandboxResult = {
          success,
          output,
          error,
          logs: workerLogs.map((l: { args: unknown[] }) =>
            l.args.map((a: unknown) => String(a)).join(' ')
          ),
          executionTime,
        };
        setResult(sandboxResult);
        onResult?.(sandboxResult);
      }
    };

    worker.onerror = (error) => {
      setIsRunning(false);
      setLogs((prev) => [
        ...prev,
        { level: 'error', args: [error.message], timestamp: new Date() },
      ]);
      setResult({ success: false, error: error.message });
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, [onResult]);

  const runCode = useCallback(() => {
    if (!workerRef.current || isRunning) return;

    setIsRunning(true);
    setResult(null);

    // Prepare layer data
    const layerData = layers.map((l) => ({
      id: l.id,
      name: l.name,
      data: l.source_config.data || { type: 'FeatureCollection', features: [] },
    }));

    workerRef.current.postMessage({
      code: `return (function() { ${code} })();`,
      context: {
        layers: layerData,
        selectedFeatures,
        mapBounds,
      },
    });
  }, [code, layers, selectedFeatures, mapBounds, isRunning]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setResult(null);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Code Editor */}
      <div className="flex-1 min-h-0">
        <CodeEditor
          value={code}
          onChange={setCode}
          onRun={runCode}
          isRunning={isRunning}
          className="h-full"
        />
      </div>

      {/* Console */}
      <div className="border-t">
        <div
          className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50"
          onClick={() => setShowConsole(!showConsole)}
        >
          <div className="flex items-center gap-2">
            {showConsole ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">Console</span>
            {logs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {logs.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <div className="flex items-center gap-1 text-xs">
                {result.success ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
                <Clock className="h-3 w-3 text-muted-foreground ml-2" />
                <span className="text-muted-foreground">
                  {result.executionTime?.toFixed(0)}ms
                </span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {showConsole && (
          <div className="max-h-40 overflow-y-auto p-2 bg-muted/30 font-mono text-xs space-y-1">
            {logs.length === 0 && !result?.error ? (
              <div className="text-muted-foreground">No output yet</div>
            ) : (
              <>
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-2',
                      log.level === 'error' && 'text-red-500',
                      log.level === 'warn' && 'text-yellow-500',
                      log.level === 'info' && 'text-blue-500'
                    )}
                  >
                    <span className="text-muted-foreground">
                      [{log.timestamp.toLocaleTimeString()}]
                    </span>
                    <span>
                      {log.args
                        .map((a) =>
                          typeof a === 'object' ? JSON.stringify(a) : String(a)
                        )
                        .join(' ')}
                    </span>
                  </div>
                ))}
                {result?.error && (
                  <div className="text-red-500 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{result.error}</span>
                  </div>
                )}
                {result?.success && result.output !== undefined && (
                  <div className="text-green-500 flex gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Result:{' '}
                      {typeof result.output === 'object'
                        ? JSON.stringify(result.output, null, 2).slice(0, 200)
                        : String(result.output)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
