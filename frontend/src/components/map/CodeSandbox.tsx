"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Play,
  Square,
  Code,
  FileCode,
  Trash2,
  Copy,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  FolderOpen,
  Terminal,
  Sparkles,
  Check,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import Monaco Editor
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  { ssr: false, loading: () => <div className="h-full bg-muted animate-pulse" /> }
);

interface CodeSandboxProps {
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
}

interface ScriptResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

interface SavedScript {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}

const DEFAULT_CODE = `// Siteora Analysis Script
// Available: turf, map, layers

// Example: Calculate buffer around a point
const point = turf.point([153.03, -27.47]);
const buffered = turf.buffer(point, 1, { units: 'kilometers' });

// Add result to map
addGeoJSON('buffer-result', buffered, {
  fillColor: '#3b82f6',
  fillOpacity: 0.3,
  strokeColor: '#1d4ed8',
  strokeWidth: 2,
});

// Log output
console.log('Buffer created with area:', turf.area(buffered), 'm²');
`;

const EXAMPLE_SCRIPTS = [
  {
    name: 'Buffer Analysis',
    code: `// Create a 500m buffer around a point
const center = turf.point([153.03, -27.47]);
const buffer = turf.buffer(center, 0.5, { units: 'kilometers' });

addGeoJSON('buffer', buffer, {
  fillColor: '#10b981',
  fillOpacity: 0.2,
  strokeColor: '#059669',
});

console.log('Buffer area:', Math.round(turf.area(buffer)), 'm²');`,
  },
  {
    name: 'Distance Calculation',
    code: `// Calculate distance between two points
const from = turf.point([153.02, -27.46]);
const to = turf.point([153.04, -27.48]);

const distance = turf.distance(from, to, { units: 'kilometers' });
const line = turf.lineString([from.geometry.coordinates, to.geometry.coordinates]);

addGeoJSON('distance-line', line, {
  strokeColor: '#f59e0b',
  strokeWidth: 3,
});

console.log('Distance:', distance.toFixed(2), 'km');`,
  },
  {
    name: 'Bounding Box',
    code: `// Create a bounding box polygon
const bbox = [152.95, -27.55, 153.10, -27.40];
const bboxPolygon = turf.bboxPolygon(bbox);

addGeoJSON('bbox', bboxPolygon, {
  fillColor: '#8b5cf6',
  fillOpacity: 0.1,
  strokeColor: '#7c3aed',
  strokeWidth: 2,
  strokeDasharray: [5, 5],
});

const area = turf.area(bboxPolygon) / 10000;
console.log('Bounding box area:', area.toFixed(2), 'ha');`,
  },
];

export function CodeSandbox({
  map,
  onClose,
  className,
}: CodeSandboxProps) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const addedLayersRef = useRef<string[]>([]);

  // Load saved scripts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('siteora-scripts');
      if (saved) {
        setSavedScripts(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load saved scripts:', e);
    }
  }, []);

  // Clean up added layers on unmount
  useEffect(() => {
    return () => {
      if (map) {
        addedLayersRef.current.forEach(layerId => {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(layerId)) map.removeSource(layerId);
        });
      }
    };
  }, [map]);

  // Run the code in a sandboxed environment
  const runCode = useCallback(async () => {
    if (!map || isRunning) return;

    setIsRunning(true);
    setResult(null);
    setConsoleOutput([]);

    const startTime = performance.now();
    const logs: string[] = [];

    // Clear previously added layers
    addedLayersRef.current.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    });
    addedLayersRef.current = [];

    try {
      // Create sandboxed console
      const sandboxConsole = {
        log: (...args: any[]) => {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        },
        error: (...args: any[]) => {
          logs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
        },
        warn: (...args: any[]) => {
          logs.push('[WARN] ' + args.map(a => String(a)).join(' '));
        },
      };

      // Helper to add GeoJSON to map
      const addGeoJSON = (id: string, geojson: any, style: any = {}) => {
        const sourceId = `sandbox-${id}`;
        const layerId = `sandbox-${id}-layer`;

        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        const geomType = geojson.geometry?.type || geojson.features?.[0]?.geometry?.type || 'Point';

        if (geomType === 'Point' || geomType === 'MultiPoint') {
          map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': style.radius || 8,
              'circle-color': style.fillColor || '#3b82f6',
              'circle-stroke-width': style.strokeWidth || 2,
              'circle-stroke-color': style.strokeColor || '#fff',
            },
          });
        } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': style.strokeColor || '#3b82f6',
              'line-width': style.strokeWidth || 2,
            },
          });
        } else {
          // Polygon
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': style.fillColor || '#3b82f6',
              'fill-opacity': style.fillOpacity ?? 0.3,
            },
          });

          // Add outline
          const outlineId = `${layerId}-outline`;
          map.addLayer({
            id: outlineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': style.strokeColor || '#1d4ed8',
              'line-width': style.strokeWidth || 2,
            },
          });
          addedLayersRef.current.push(outlineId);
        }

        addedLayersRef.current.push(layerId);
        logs.push(`Added layer: ${id}`);
      };

      // Import turf
      const turf = await import('@turf/turf');

      // Create the sandbox function
      const sandboxFn = new Function(
        'turf',
        'map',
        'console',
        'addGeoJSON',
        code
      );

      // Run the code
      sandboxFn(turf, map, sandboxConsole, addGeoJSON);

      const duration = performance.now() - startTime;
      setConsoleOutput(logs);
      setResult({
        success: true,
        output: logs.join('\n'),
        duration,
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logs.push(`[ERROR] ${errorMessage}`);
      setConsoleOutput(logs);
      setResult({
        success: false,
        output: logs.join('\n'),
        error: errorMessage,
        duration,
      });
    } finally {
      setIsRunning(false);
    }
  }, [map, code, isRunning]);

  // Save current script
  const saveScript = () => {
    const name = prompt('Enter script name:');
    if (!name) return;

    const newScript: SavedScript = {
      id: `script-${Date.now()}`,
      name,
      code,
      createdAt: new Date(),
    };

    const updated = [...savedScripts, newScript];
    setSavedScripts(updated);
    localStorage.setItem('siteora-scripts', JSON.stringify(updated));
  };

  // Load a script
  const loadScript = (script: SavedScript) => {
    setCode(script.code);
    setShowExamples(false);
  };

  // Delete a saved script
  const deleteScript = (id: string) => {
    const updated = savedScripts.filter(s => s.id !== id);
    setSavedScripts(updated);
    localStorage.setItem('siteora-scripts', JSON.stringify(updated));
  };

  // Copy code to clipboard
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "absolute top-20 right-4 bottom-20 w-[520px] z-10 pointer-events-auto",
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20">
              <Code className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold">Code Sandbox</h2>
              <p className="text-[10px] text-muted-foreground">Turf.js spatial analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              JavaScript
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

        {/* Toolbar */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            onClick={runCode}
            disabled={isRunning}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            Run
          </Button>
          <Button size="sm" variant="outline" onClick={saveScript} className="h-9">
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>
          <Button
            size="sm"
            variant={showExamples ? 'default' : 'outline'}
            onClick={() => setShowExamples(!showExamples)}
            className={cn("h-9", showExamples && "bg-emerald-600 hover:bg-emerald-700")}
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            Examples
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 hover:bg-emerald-500/10 hover:text-emerald-600"
            onClick={copyCode}
          >
            {codeCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Examples Dropdown */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b bg-gradient-to-r from-muted/30 to-transparent overflow-hidden"
          >
            <div className="p-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <FileCode className="h-3 w-3" />
                Example Scripts
              </div>
              {EXAMPLE_SCRIPTS.map((script, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    setCode(script.code);
                    setShowExamples(false);
                  }}
                  className="w-full text-left text-sm p-2.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Code className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                    {script.name}
                  </span>
                </motion.button>
              ))}
              {savedScripts.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-4 mb-2 flex items-center gap-1">
                    <Save className="h-3 w-3" />
                    Saved Scripts
                  </div>
                  {savedScripts.map((script, idx) => (
                    <motion.div
                      key={script.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (EXAMPLE_SCRIPTS.length + idx) * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => loadScript(script)}
                        className="flex-1 text-left text-sm p-2.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-all group"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                          {script.name}
                        </span>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteScript(script.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Console Output */}
      <div className="border-t border-border/50">
        <button
          className="w-full px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-slate-900/50 to-transparent hover:from-slate-900/70 transition-colors"
          onClick={() => setShowConsole(!showConsole)}
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Console</span>
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      result.success
                        ? "bg-green-500/10 text-green-500 border-green-500/30"
                        : "bg-red-500/10 text-red-500 border-red-500/30"
                    )}
                  >
                    {result.success ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {result.duration.toFixed(0)}ms
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.div
            animate={{ rotate: showConsole ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showConsole && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 128 }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="h-32 overflow-y-auto bg-slate-950 p-3 font-mono text-xs">
                {consoleOutput.length === 0 ? (
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="text-emerald-500">&gt;</span>
                    Console output will appear here
                  </span>
                ) : (
                  consoleOutput.map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        "py-0.5 flex items-start gap-2",
                        line.startsWith('[ERROR]') && 'text-red-400',
                        line.startsWith('[WARN]') && 'text-yellow-400',
                        !line.startsWith('[') && 'text-slate-300'
                      )}
                    >
                      <span className={cn(
                        "flex-shrink-0",
                        line.startsWith('[ERROR]') ? 'text-red-500' :
                        line.startsWith('[WARN]') ? 'text-yellow-500' :
                        'text-emerald-500'
                      )}>
                        {line.startsWith('[ERROR]') ? '✕' :
                         line.startsWith('[WARN]') ? '!' :
                         '→'}
                      </span>
                      <span>{line.replace(/^\[(ERROR|WARN)\]\s*/, '')}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default CodeSandbox;
