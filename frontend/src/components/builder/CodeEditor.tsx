"use client";

import { useRef, useCallback, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { Play, Save, Copy, RotateCcw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onSave?: () => void;
  language?: 'javascript' | 'typescript' | 'python';
  readOnly?: boolean;
  className?: string;
  showToolbar?: boolean;
  isRunning?: boolean;
}

// GIS library type definitions for autocomplete
const GIS_TYPE_DEFS = `
declare const gis: {
  // Measurement
  area(feature: Feature): number;
  length(feature: Feature, options?: { units?: Units }): number;
  distance(from: Feature, to: Feature, options?: { units?: Units }): number;
  bearing(start: Feature, end: Feature): number;
  center(feature: Feature | FeatureCollection): Feature<Point>;
  centroid(feature: Feature): Feature<Point>;

  // Transformation
  buffer(feature: Feature, radius: number, options?: { units?: Units }): Feature<Polygon> | null;
  simplify(feature: Feature, options?: { tolerance?: number }): Feature;
  union(poly1: Feature<Polygon>, poly2: Feature<Polygon>): Feature<Polygon> | null;
  intersect(poly1: Feature<Polygon>, poly2: Feature<Polygon>): Feature | null;
  difference(poly1: Feature<Polygon>, poly2: Feature<Polygon>): Feature<Polygon> | null;
  convex(feature: FeatureCollection): Feature<Polygon> | null;

  // Booleans
  booleanContains(feature1: Feature, feature2: Feature): boolean;
  booleanIntersects(feature1: Feature, feature2: Feature): boolean;
  booleanPointInPolygon(point: Feature<Point>, polygon: Feature<Polygon>): boolean;
  booleanWithin(feature1: Feature, feature2: Feature): boolean;

  // Feature helpers
  point(coordinates: [number, number], properties?: object): Feature<Point>;
  lineString(coordinates: Position[], properties?: object): Feature<LineString>;
  polygon(coordinates: Position[][], properties?: object): Feature<Polygon>;
  featureCollection(features: Feature[]): FeatureCollection;

  // Grids
  hexGrid(bbox: BBox, cellSide: number, options?: { units?: Units }): FeatureCollection;
  pointGrid(bbox: BBox, cellSide: number, options?: { units?: Units }): FeatureCollection;
  squareGrid(bbox: BBox, cellSide: number, options?: { units?: Units }): FeatureCollection;

  // Classification
  nearestPoint(targetPoint: Feature<Point>, points: FeatureCollection): Feature<Point>;
  pointsWithinPolygon(points: FeatureCollection, polygon: Feature<Polygon>): FeatureCollection;

  // Aggregation
  bbox(feature: Feature | FeatureCollection): BBox;
  bboxPolygon(bbox: BBox): Feature<Polygon>;

  // Random
  randomPoint(count: number, options?: { bbox?: BBox }): FeatureCollection;
  randomPolygon(count: number, options?: { bbox?: BBox }): FeatureCollection;
};

declare const sitelens: {
  filterByProperty(fc: FeatureCollection, property: string, value: any): FeatureCollection;
  filterByCondition(fc: FeatureCollection, predicate: (props: Record<string, any>) => boolean): FeatureCollection;
  uniqueValues(fc: FeatureCollection, property: string): any[];
  statistics(fc: FeatureCollection, property: string): { min: number; max: number; mean: number; sum: number; count: number };
  addProperty(fc: FeatureCollection, property: string, value: any | ((f: Feature) => any)): FeatureCollection;
  addAreaProperty(fc: FeatureCollection, propertyName?: string): FeatureCollection;
  findNearby(fc: FeatureCollection, point: [number, number], distance: number, units?: string): FeatureCollection;
};

declare const format: {
  area(sqMeters: number): string;
  length(meters: number): string;
  coordinates(coords: [number, number]): string;
};

declare const layers: Record<string, FeatureCollection>;
declare const selectedFeatures: Feature[];
declare const mapBounds: { west: number; south: number; east: number; north: number };
declare function getLayer(idOrName: string): FeatureCollection | null;

type Position = [number, number];
type BBox = [number, number, number, number];
type Units = 'meters' | 'kilometers' | 'miles' | 'feet';

interface Feature<G = Geometry> {
  type: 'Feature';
  geometry: G;
  properties: Record<string, any> | null;
  id?: string | number;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

interface Point {
  type: 'Point';
  coordinates: Position;
}

interface LineString {
  type: 'LineString';
  coordinates: Position[];
}

interface Polygon {
  type: 'Polygon';
  coordinates: Position[][];
}

type Geometry = Point | LineString | Polygon;
`;

// Example code snippets
const CODE_SNIPPETS = {
  buffer: `// Buffer selected features by 100 meters
const buffered = selectedFeatures.map(f => gis.buffer(f, 100, { units: 'meters' }));
return gis.featureCollection(buffered.filter(Boolean));`,

  filter: `// Filter features by property
const layer = getLayer('my-layer');
if (!layer) return null;

const filtered = sitelens.filterByProperty(layer, 'type', 'residential');
console.log('Found', filtered.features.length, 'residential features');
return filtered;`,

  statistics: `// Calculate statistics for a numeric property
const layer = getLayer('parcels');
if (!layer) return null;

const stats = sitelens.statistics(layer, 'area_sqm');
console.log('Area statistics:', stats);
return stats;`,

  nearby: `// Find features within 500m of a point
const layer = getLayer('points');
if (!layer) return null;

const center = [151.2093, -33.8688]; // Sydney
const nearby = sitelens.findNearby(layer, center, 500, 'meters');
console.log('Found', nearby.features.length, 'nearby features');
return nearby;`,
};

export function CodeEditor({
  value,
  onChange,
  onRun,
  onSave,
  language = 'javascript',
  readOnly = false,
  className,
  showToolbar = true,
  isRunning = false,
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add GIS type definitions for autocomplete
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      GIS_TYPE_DEFS,
      'gis.d.ts'
    );

    // Configure JavaScript defaults
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      lib: ['esnext'],
    });

    // Register code actions
    monaco.languages.registerCodeActionProvider('javascript', {
      provideCodeActions: () => ({ actions: [], dispose: () => {} }),
    });
  }, []);

  const handleChange: OnChange = useCallback(
    (newValue) => {
      onChange(newValue || '');
    },
    [onChange]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
  }, [value]);

  const handleFormat = useCallback(() => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
  }, []);

  const insertSnippet = useCallback(
    (snippet: string) => {
      onChange(snippet);
      setShowSnippets(false);
    },
    [onChange]
  );

  return (
    <div className={cn('flex flex-col border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between p-2 border-b bg-muted/30">
          <div className="flex items-center gap-1">
            {onRun && (
              <Button
                size="sm"
                onClick={onRun}
                disabled={isRunning || readOnly}
                className="gap-1"
              >
                <Play className="h-3 w-3" />
                {isRunning ? 'Running...' : 'Run'}
              </Button>
            )}
            {onSave && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSave}
                disabled={readOnly}
                className="gap-1"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSnippets(!showSnippets)}
              >
                Snippets
              </Button>
              {showSnippets && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-10">
                  {Object.entries(CODE_SNIPPETS).map(([name, code]) => (
                    <button
                      key={name}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted capitalize"
                      onClick={() => insertSnippet(code)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={handleCopy} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleFormat} title="Format">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-[200px]">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            renderLineHighlight: 'line',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
