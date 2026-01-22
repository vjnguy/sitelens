"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, FeatureCollection, Polygon, LineString, Point } from 'geojson';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import {
  MousePointer2,
  Pencil,
  Square,
  Minus,
  Circle,
  Type,
  Ruler,
  Move,
  Trash2,
  Copy,
  Layers,
  RotateCcw,
  Download,
  X,
  ChevronDown,
  MapPin,
  Grid3X3,
  ArrowUpRight,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

export type DrawMode =
  | 'simple_select'
  | 'direct_select'
  | 'draw_point'
  | 'draw_line_string'
  | 'draw_polygon'
  | 'draw_rectangle'
  | 'draw_circle'
  | 'draw_arrow'
  | 'draw_freehand'
  | 'measure_distance'
  | 'measure_area'
  | 'draw_text';

interface DrawPanelProps {
  map: mapboxgl.Map | null;
  onDrawCreate?: (features: Feature[]) => void;
  onDrawUpdate?: (features: Feature[]) => void;
  onDrawDelete?: (features: Feature[]) => void;
  onSelectionChange?: (features: Feature[]) => void;
  onFeaturesChange?: (fc: FeatureCollection) => void;
  onClose?: () => void;
  className?: string;
}

interface DrawStats {
  area?: number;
  length?: number;
  perimeter?: number;
  pointCount: number;
}

interface TextAnnotation {
  id: string;
  coordinates: [number, number];
  text: string;
  marker: mapboxgl.Marker;
  color: string;
  bgColor: string;
}

// Preset colors
const COLORS = [
  { name: 'Blue', value: '#3bb2d0' },
  { name: 'Red', value: '#e55e5e' },
  { name: 'Orange', value: '#f0ad4e' },
  { name: 'Green', value: '#5cb85c' },
  { name: 'Purple', value: '#9b59b6' },
  { name: 'Cyan', value: '#17a2b8' },
  { name: 'Teal', value: '#1abc9c' },
  { name: 'Yellow', value: '#f39c12' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Dark', value: '#2c3e50' },
];

// Tool categories
const SELECTION_TOOLS = [
  { mode: 'simple_select' as DrawMode, icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { mode: 'direct_select' as DrawMode, icon: Move, label: 'Edit', shortcut: 'A' },
];

const SHAPE_TOOLS = [
  { mode: 'draw_rectangle' as DrawMode, icon: Square, label: 'Rectangle', shortcut: 'R' },
  { mode: 'draw_circle' as DrawMode, icon: Circle, label: 'Circle', shortcut: 'O' },
  { mode: 'draw_polygon' as DrawMode, icon: Pencil, label: 'Polygon', shortcut: 'P' },
  { mode: 'draw_line_string' as DrawMode, icon: Minus, label: 'Line', shortcut: 'L' },
  { mode: 'draw_arrow' as DrawMode, icon: ArrowUpRight, label: 'Arrow', shortcut: 'W' },
  { mode: 'draw_freehand' as DrawMode, icon: PenTool, label: 'Freehand', shortcut: 'F' },
  { mode: 'draw_point' as DrawMode, icon: MapPin, label: 'Point', shortcut: '.' },
];

const ANNOTATION_TOOLS = [
  { mode: 'draw_text' as DrawMode, icon: Type, label: 'Text', shortcut: 'T' },
];

const MEASURE_TOOLS = [
  { mode: 'measure_distance' as DrawMode, icon: Ruler, label: 'Distance', shortcut: 'D' },
  { mode: 'measure_area' as DrawMode, icon: Grid3X3, label: 'Area', shortcut: 'M' },
];

export function DrawPanel({
  map,
  onDrawCreate,
  onDrawUpdate,
  onDrawDelete,
  onSelectionChange,
  onFeaturesChange,
  onClose,
  className,
}: DrawPanelProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>('simple_select');
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [stats, setStats] = useState<DrawStats | null>(null);

  // Style state - for new shapes and selected shapes
  const [strokeColor, setStrokeColor] = useState('#3bb2d0');
  const [fillColor, setFillColor] = useState('#3bb2d0');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillOpacity, setFillOpacity] = useState(30);
  const [showStrokeDropdown, setShowStrokeDropdown] = useState(false);
  const [showFillDropdown, setShowFillDropdown] = useState(false);

  // Text annotation state
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [activeTextInput, setActiveTextInput] = useState<{
    coords: [number, number];
    marker: mapboxgl.Marker;
    inputEl: HTMLInputElement;
  } | null>(null);

  // Custom shape drawing state
  const [isDrawingCircle, setIsDrawingCircle] = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [isDrawingRectangle, setIsDrawingRectangle] = useState(false);
  const [rectangleStart, setRectangleStart] = useState<[number, number] | null>(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [arrowStart, setArrowStart] = useState<[number, number] | null>(null);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState<[number, number][]>([]);

  // Measurement state
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area' | null>(null);
  const [measurementPoints, setMeasurementPoints] = useState<[number, number][]>([]);

  // Update selected feature colors when they change
  const updateSelectedFeatureColors = useCallback((newStroke: string, newFill: string, newStrokeWidth: number, newFillOpacity: number) => {
    if (!drawRef.current || selectedFeatures.length === 0) return;

    selectedFeatures.forEach(feature => {
      if (feature.id) {
        const updatedFeature = {
          ...feature,
          properties: {
            ...feature.properties,
            stroke: newStroke,
            fill: newFill,
            'stroke-width': newStrokeWidth,
            'fill-opacity': newFillOpacity / 100,
          }
        };
        drawRef.current?.delete(feature.id as string);
        drawRef.current?.add(updatedFeature);
      }
    });

    onFeaturesChange?.(drawRef.current.getAll());
  }, [selectedFeatures, onFeaturesChange]);

  // When a feature is selected, load its colors
  useEffect(() => {
    if (selectedFeatures.length === 1) {
      const feature = selectedFeatures[0];
      if (feature.properties?.stroke) {
        setStrokeColor(feature.properties.stroke as string);
      }
      if (feature.properties?.fill) {
        setFillColor(feature.properties.fill as string);
      }
      if (feature.properties?.['stroke-width']) {
        setStrokeWidth(feature.properties['stroke-width'] as number);
      }
      if (feature.properties?.['fill-opacity']) {
        setFillOpacity((feature.properties['fill-opacity'] as number) * 100);
      }
    }
  }, [selectedFeatures]);

  // Get draw styles based on current color settings
  const getDrawStyles = useCallback(() => [
    // Polygon fill - use feature properties if available
    {
      id: 'gl-draw-polygon-fill',
      type: 'fill',
      filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
      paint: {
        'fill-color': ['coalesce', ['get', 'fill'], fillColor],
        'fill-outline-color': ['coalesce', ['get', 'stroke'], strokeColor],
        'fill-opacity': ['coalesce', ['get', 'fill-opacity'], fillOpacity / 100],
      },
    },
    // Polygon outline
    {
      id: 'gl-draw-polygon-stroke-active',
      type: 'line',
      filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'stroke'], strokeColor],
        'line-width': ['coalesce', ['get', 'stroke-width'], strokeWidth],
      },
    },
    // Line
    {
      id: 'gl-draw-line',
      type: 'line',
      filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'stroke'], strokeColor],
        'line-width': ['coalesce', ['get', 'stroke-width'], strokeWidth],
      },
    },
    // Point
    {
      id: 'gl-draw-point',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
      paint: {
        'circle-radius': 6,
        'circle-color': ['coalesce', ['get', 'fill'], fillColor],
        'circle-stroke-color': ['coalesce', ['get', 'stroke'], strokeColor],
        'circle-stroke-width': ['coalesce', ['get', 'stroke-width'], strokeWidth],
      },
    },
    // Vertex points
    {
      id: 'gl-draw-vertex-active',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'static']],
      paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': strokeColor, 'circle-stroke-width': 2 },
    },
    // Midpoint
    {
      id: 'gl-draw-midpoint',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
      paint: { 'circle-radius': 3, 'circle-color': strokeColor },
    },
  ], [strokeColor, fillColor, strokeWidth, fillOpacity]);

  // Initialize MapboxDraw
  useEffect(() => {
    if (!map || drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      styles: getDrawStyles(),
    });

    map.addControl(draw);
    drawRef.current = draw;

    const handleCreate = (e: { features: Feature[] }) => {
      // Apply current colors to newly created features
      e.features.forEach(feature => {
        if (feature.id) {
          const updatedFeature = {
            ...feature,
            properties: {
              ...feature.properties,
              stroke: strokeColor,
              fill: fillColor,
              'stroke-width': strokeWidth,
              'fill-opacity': fillOpacity / 100,
            }
          };
          draw.delete(feature.id as string);
          draw.add(updatedFeature);
        }
      });

      onDrawCreate?.(e.features);
      updateStats(e.features);
      onFeaturesChange?.(draw.getAll());
    };

    const handleUpdate = (e: { features: Feature[] }) => {
      onDrawUpdate?.(e.features);
      updateStats(e.features);
      onFeaturesChange?.(draw.getAll());
    };

    const handleDelete = (e: { features: Feature[] }) => {
      onDrawDelete?.(e.features);
      setStats(null);
      onFeaturesChange?.(draw.getAll());
    };

    const handleSelectionChange = (e: { features: Feature[] }) => {
      setSelectedFeatures(e.features);
      onSelectionChange?.(e.features);
      updateStats(e.features);
    };

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);
    map.on('draw.delete', handleDelete);
    map.on('draw.selectionchange', handleSelectionChange);

    return () => {
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      map.off('draw.selectionchange', handleSelectionChange);

      // Clean up text annotations
      textAnnotations.forEach(ann => ann.marker.remove());

      if (drawRef.current) {
        map.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Handle custom circle drawing
  useEffect(() => {
    if (!map || activeMode !== 'draw_circle') return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!circleCenter) {
        setCircleCenter(point);
        setIsDrawingCircle(true);
      } else {
        // Calculate radius and create circle
        const from = turf.point(circleCenter);
        const to = turf.point(point);
        const radius = turf.distance(from, to, { units: 'meters' });

        const circle = turf.circle(circleCenter, radius, {
          units: 'meters',
          steps: 64,
          properties: {
            shape: 'circle',
            radius: radius,
            stroke: strokeColor,
            fill: fillColor,
            'stroke-width': strokeWidth,
            'fill-opacity': fillOpacity / 100,
          }
        });

        if (drawRef.current) {
          drawRef.current.add(circle);
          onFeaturesChange?.(drawRef.current.getAll());
        }

        setCircleCenter(null);
        setIsDrawingCircle(false);
      }
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!circleCenter || !isDrawingCircle) return;

      // Show preview circle
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const from = turf.point(circleCenter);
      const to = turf.point(point);
      const radius = turf.distance(from, to, { units: 'meters' });

      updatePreviewCircle(circleCenter, radius);
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      removePreviewCircle();
    };
  }, [map, activeMode, circleCenter, isDrawingCircle, strokeColor, fillColor, strokeWidth, fillOpacity]);

  // Handle custom rectangle drawing
  useEffect(() => {
    if (!map || activeMode !== 'draw_rectangle') return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!rectangleStart) {
        setRectangleStart(point);
        setIsDrawingRectangle(true);
      } else {
        // Create rectangle
        const bbox = turf.bboxPolygon([
          Math.min(rectangleStart[0], point[0]),
          Math.min(rectangleStart[1], point[1]),
          Math.max(rectangleStart[0], point[0]),
          Math.max(rectangleStart[1], point[1]),
        ]);

        bbox.properties = {
          shape: 'rectangle',
          stroke: strokeColor,
          fill: fillColor,
          'stroke-width': strokeWidth,
          'fill-opacity': fillOpacity / 100,
        };

        if (drawRef.current) {
          drawRef.current.add(bbox);
          onFeaturesChange?.(drawRef.current.getAll());
        }

        setRectangleStart(null);
        setIsDrawingRectangle(false);
      }
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!rectangleStart || !isDrawingRectangle) return;

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      updatePreviewRectangle(rectangleStart, point);
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      removePreviewRectangle();
    };
  }, [map, activeMode, rectangleStart, isDrawingRectangle, strokeColor, fillColor, strokeWidth, fillOpacity]);

  // Handle custom arrow drawing
  useEffect(() => {
    if (!map || activeMode !== 'draw_arrow') return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!arrowStart) {
        setArrowStart(point);
        setIsDrawingArrow(true);
      } else {
        // Create arrow as a line with arrowhead
        const arrowFeature = createArrowFeature(arrowStart, point);

        if (drawRef.current && arrowFeature) {
          drawRef.current.add(arrowFeature);
          onFeaturesChange?.(drawRef.current.getAll());
        }

        setArrowStart(null);
        setIsDrawingArrow(false);
      }
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!arrowStart || !isDrawingArrow) return;

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      updatePreviewArrow(arrowStart, point);
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      removePreviewArrow();
    };
  }, [map, activeMode, arrowStart, isDrawingArrow, strokeColor, fillColor, strokeWidth, fillOpacity, onFeaturesChange]);

  // Handle freehand drawing
  useEffect(() => {
    if (!map || activeMode !== 'draw_freehand') return;

    let isMouseDown = false;
    let currentPoints: [number, number][] = [];

    const handleMouseDown = (e: mapboxgl.MapMouseEvent) => {
      isMouseDown = true;
      currentPoints = [[e.lngLat.lng, e.lngLat.lat]];
      setFreehandPoints(currentPoints);
      setIsDrawingFreehand(true);

      // Disable map dragging while drawing
      map.dragPan.disable();
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!isMouseDown) return;

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Only add point if it's far enough from the last point (reduce noise)
      const lastPoint = currentPoints[currentPoints.length - 1];
      const dx = point[0] - lastPoint[0];
      const dy = point[1] - lastPoint[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.00005) { // Minimum distance threshold
        currentPoints = [...currentPoints, point];
        setFreehandPoints(currentPoints);
        updatePreviewFreehand(currentPoints);
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDown || currentPoints.length < 2) {
        isMouseDown = false;
        setIsDrawingFreehand(false);
        setFreehandPoints([]);
        map.dragPan.enable();
        return;
      }

      isMouseDown = false;

      // Simplify the path to reduce points (optional smoothing)
      const simplifiedPoints = simplifyPath(currentPoints, 0.00002);

      // Create the freehand line feature
      const freehandFeature: Feature = {
        type: 'Feature',
        properties: {
          shape: 'freehand',
          stroke: strokeColor,
          fill: fillColor,
          'stroke-width': strokeWidth,
          'fill-opacity': fillOpacity / 100,
        },
        geometry: {
          type: 'LineString',
          coordinates: simplifiedPoints,
        },
      };

      if (drawRef.current) {
        drawRef.current.add(freehandFeature);
        onFeaturesChange?.(drawRef.current.getAll());
      }

      setFreehandPoints([]);
      setIsDrawingFreehand(false);
      removePreviewFreehand();
      map.dragPan.enable();
    };

    const handleMouseLeave = () => {
      if (isMouseDown) {
        handleMouseUp();
      }
    };

    const canvas = map.getCanvasContainer();

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      map.dragPan.enable();
      removePreviewFreehand();
    };
  }, [map, activeMode, strokeColor, fillColor, strokeWidth, fillOpacity, onFeaturesChange]);

  // Simplify path using Douglas-Peucker algorithm
  const simplifyPath = (points: [number, number][], tolerance: number): [number, number][] => {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance
    let maxDist = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = perpendicularDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
      const right = simplifyPath(points.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    }

    return [start, end];
  };

  const perpendicularDistance = (point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number => {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    const mag = Math.sqrt(dx * dx + dy * dy);

    if (mag === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);

    const u = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (mag * mag);
    const closestX = lineStart[0] + u * dx;
    const closestY = lineStart[1] + u * dy;

    return Math.sqrt((point[0] - closestX) ** 2 + (point[1] - closestY) ** 2);
  };

  // Create arrow feature with arrowhead
  const createArrowFeature = useCallback((start: [number, number], end: [number, number]): Feature | null => {
    // Calculate angle for arrowhead
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const angle = Math.atan2(dy, dx);

    // Arrowhead size (proportional to map scale)
    const arrowSize = Math.sqrt(dx * dx + dy * dy) * 0.15;
    const arrowAngle = Math.PI / 6; // 30 degrees

    // Calculate arrowhead points
    const arrowPoint1: [number, number] = [
      end[0] - arrowSize * Math.cos(angle - arrowAngle),
      end[1] - arrowSize * Math.sin(angle - arrowAngle),
    ];
    const arrowPoint2: [number, number] = [
      end[0] - arrowSize * Math.cos(angle + arrowAngle),
      end[1] - arrowSize * Math.sin(angle + arrowAngle),
    ];

    // Create a polygon that includes the line and arrowhead
    const arrowPolygon: Feature = {
      type: 'Feature',
      properties: {
        shape: 'arrow',
        stroke: strokeColor,
        fill: strokeColor,
        'stroke-width': strokeWidth,
        'fill-opacity': 1,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          start,
          [start[0] + (end[0] - start[0]) * 0.02, start[1] + (end[1] - start[1]) * 0.02 - 0.0001],
          [end[0] - arrowSize * 0.3 * Math.cos(angle), end[1] - arrowSize * 0.3 * Math.sin(angle) - 0.0001],
          arrowPoint1,
          end,
          arrowPoint2,
          [end[0] - arrowSize * 0.3 * Math.cos(angle), end[1] - arrowSize * 0.3 * Math.sin(angle) + 0.0001],
          [start[0] + (end[0] - start[0]) * 0.02, start[1] + (end[1] - start[1]) * 0.02 + 0.0001],
          start,
        ]],
      },
    };

    return arrowPolygon;
  }, [strokeColor, strokeWidth]);

  // Handle inline text annotation
  useEffect(() => {
    if (!map || activeMode !== 'draw_text') return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      // Remove any existing active input
      if (activeTextInput) {
        activeTextInput.marker.remove();
        setActiveTextInput(null);
      }

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Create inline text input on the map
      const container = document.createElement('div');
      container.style.cssText = `
        position: relative;
        transform: rotate(-2deg);
      `;

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type here...';
      input.style.cssText = `
        font-family: 'Caveat', 'Patrick Hand', 'Kalam', cursive, sans-serif;
        font-size: 18px;
        font-weight: 500;
        background: transparent;
        border: none;
        border-bottom: 2px dashed ${strokeColor};
        outline: none;
        color: ${fillColor};
        min-width: 100px;
        padding: 4px 8px;
        transform: rotate(${(Math.random() - 0.5) * 4}deg);
      `;

      container.appendChild(input);

      const marker = new mapboxgl.Marker({ element: container, anchor: 'left' })
        .setLngLat(point)
        .addTo(map);

      input.focus();

      const finishEditing = () => {
        const text = input.value.trim();
        if (text) {
          createTextAnnotation(point, text);
        }
        marker.remove();
        setActiveTextInput(null);
      };

      input.addEventListener('blur', finishEditing);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEditing();
        }
        if (e.key === 'Escape') {
          marker.remove();
          setActiveTextInput(null);
        }
      });

      setActiveTextInput({ coords: point, marker, inputEl: input });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, activeMode, strokeColor, fillColor, activeTextInput]);

  // Create text annotation with curved/hand-drawn style
  const createTextAnnotation = useCallback((coords: [number, number], text: string) => {
    if (!map) return;

    // Random slight rotation for hand-drawn feel
    const rotation = (Math.random() - 0.5) * 6;

    const el = document.createElement('div');
    el.className = 'map-text-annotation';
    el.style.cssText = `
      font-family: 'Caveat', 'Patrick Hand', 'Kalam', cursive, sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: ${fillColor};
      background: rgba(255, 255, 255, 0.9);
      padding: 6px 12px;
      border-radius: 4px;
      border: 2px solid ${strokeColor};
      cursor: move;
      transform: rotate(${rotation}deg);
      box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
      white-space: nowrap;
      user-select: none;
    `;
    el.textContent = text;

    // Add double-click to edit
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.value = text;
      input.style.cssText = `
        font-family: 'Caveat', 'Patrick Hand', 'Kalam', cursive, sans-serif;
        font-size: 18px;
        font-weight: 600;
        background: transparent;
        border: none;
        outline: none;
        color: ${fillColor};
        width: ${Math.max(100, text.length * 12)}px;
      `;
      el.textContent = '';
      el.appendChild(input);
      input.focus();
      input.select();

      const finishEdit = () => {
        const newText = input.value.trim();
        if (newText) {
          el.textContent = newText;
          // Update annotation in state
          setTextAnnotations(prev => prev.map(ann =>
            ann.coordinates[0] === coords[0] && ann.coordinates[1] === coords[1]
              ? { ...ann, text: newText }
              : ann
          ));
        } else {
          el.textContent = text;
        }
      };

      input.addEventListener('blur', finishEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEdit();
        }
        if (e.key === 'Escape') {
          el.textContent = text;
        }
      });
    });

    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat(coords)
      .addTo(map);

    const annotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      coordinates: coords,
      text,
      marker,
      color: fillColor,
      bgColor: strokeColor,
    };

    setTextAnnotations(prev => [...prev, annotation]);
  }, [map, fillColor, strokeColor]);

  // Handle measurement mode
  useEffect(() => {
    if (!map || !measurementMode) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setMeasurementPoints(prev => [...prev, point]);
    };

    const handleDblClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
    };
  }, [map, measurementMode]);

  // Update measurement visualization
  useEffect(() => {
    if (!map || measurementPoints.length === 0) return;

    const sourceId = 'measurement-source';
    const lineLayerId = 'measurement-line';
    const fillLayerId = 'measurement-fill';
    const pointLayerId = 'measurement-points';

    // Remove existing layers/source
    if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    const features: Feature[] = [];

    if (measurementPoints.length >= 2) {
      if (measurementMode === 'area' && measurementPoints.length >= 3) {
        const closed = [...measurementPoints, measurementPoints[0]];
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [closed] },
        });
      } else {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: measurementPoints },
        });
      }
    }

    measurementPoints.forEach((coord, idx) => {
      features.push({
        type: 'Feature',
        properties: { index: idx },
        geometry: { type: 'Point', coordinates: coord },
      });
    });

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    if (measurementMode === 'area' && measurementPoints.length >= 3) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': '#f0ad4e', 'fill-opacity': 0.2 },
      });
    }

    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
      paint: { 'line-color': '#f0ad4e', 'line-width': 2, 'line-dasharray': [2, 2] },
    });

    map.addLayer({
      id: pointLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#fff',
        'circle-stroke-color': '#f0ad4e',
        'circle-stroke-width': 2,
      },
    });

    return () => {
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, measurementPoints, measurementMode]);

  // Preview helpers
  const updatePreviewCircle = useCallback((center: [number, number], radius: number) => {
    if (!map) return;

    const sourceId = 'preview-circle';
    const layerId = 'preview-circle-fill';
    const outlineId = 'preview-circle-outline';

    const circle = turf.circle(center, radius, { units: 'meters', steps: 64 });

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circle);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: circle });
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': fillColor, 'fill-opacity': fillOpacity / 100 },
      });
      map.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': strokeColor, 'line-width': strokeWidth },
      });
    }
  }, [map, fillColor, strokeColor, fillOpacity, strokeWidth]);

  const removePreviewCircle = useCallback(() => {
    if (!map) return;
    if (map.getLayer('preview-circle-outline')) map.removeLayer('preview-circle-outline');
    if (map.getLayer('preview-circle-fill')) map.removeLayer('preview-circle-fill');
    if (map.getSource('preview-circle')) map.removeSource('preview-circle');
  }, [map]);

  const updatePreviewRectangle = useCallback((start: [number, number], end: [number, number]) => {
    if (!map) return;

    const sourceId = 'preview-rectangle';
    const layerId = 'preview-rectangle-fill';
    const outlineId = 'preview-rectangle-outline';

    const bbox = turf.bboxPolygon([
      Math.min(start[0], end[0]),
      Math.min(start[1], end[1]),
      Math.max(start[0], end[0]),
      Math.max(start[1], end[1]),
    ]);

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(bbox);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: bbox });
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': fillColor, 'fill-opacity': fillOpacity / 100 },
      });
      map.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': strokeColor, 'line-width': strokeWidth },
      });
    }
  }, [map, fillColor, strokeColor, fillOpacity, strokeWidth]);

  const removePreviewRectangle = useCallback(() => {
    if (!map) return;
    if (map.getLayer('preview-rectangle-outline')) map.removeLayer('preview-rectangle-outline');
    if (map.getLayer('preview-rectangle-fill')) map.removeLayer('preview-rectangle-fill');
    if (map.getSource('preview-rectangle')) map.removeSource('preview-rectangle');
  }, [map]);

  const updatePreviewArrow = useCallback((start: [number, number], end: [number, number]) => {
    if (!map) return;

    const sourceId = 'preview-arrow';
    const layerId = 'preview-arrow-fill';

    // Calculate arrow shape
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const angle = Math.atan2(dy, dx);
    const arrowSize = Math.sqrt(dx * dx + dy * dy) * 0.15;
    const arrowAngle = Math.PI / 6;

    const arrowPoint1: [number, number] = [
      end[0] - arrowSize * Math.cos(angle - arrowAngle),
      end[1] - arrowSize * Math.sin(angle - arrowAngle),
    ];
    const arrowPoint2: [number, number] = [
      end[0] - arrowSize * Math.cos(angle + arrowAngle),
      end[1] - arrowSize * Math.sin(angle + arrowAngle),
    ];

    // Simple arrow as line + triangle head
    const arrowLine: Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          start,
          [start[0] + (end[0] - start[0]) * 0.02, start[1] + (end[1] - start[1]) * 0.02 - 0.0001],
          [end[0] - arrowSize * 0.3 * Math.cos(angle), end[1] - arrowSize * 0.3 * Math.sin(angle) - 0.0001],
          arrowPoint1,
          end,
          arrowPoint2,
          [end[0] - arrowSize * 0.3 * Math.cos(angle), end[1] - arrowSize * 0.3 * Math.sin(angle) + 0.0001],
          [start[0] + (end[0] - start[0]) * 0.02, start[1] + (end[1] - start[1]) * 0.02 + 0.0001],
          start,
        ]],
      },
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(arrowLine);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: arrowLine });
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': strokeColor, 'fill-opacity': 0.8 },
      });
    }
  }, [map, strokeColor]);

  const removePreviewArrow = useCallback(() => {
    if (!map) return;
    if (map.getLayer('preview-arrow-fill')) map.removeLayer('preview-arrow-fill');
    if (map.getSource('preview-arrow')) map.removeSource('preview-arrow');
  }, [map]);

  const updatePreviewFreehand = useCallback((points: [number, number][]) => {
    if (!map || points.length < 2) return;

    const sourceId = 'preview-freehand';
    const layerId = 'preview-freehand-line';

    const freehandLine: Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points,
      },
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(freehandLine);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: freehandLine });
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': strokeColor, 'line-width': strokeWidth, 'line-opacity': 0.8 },
      });
    }
  }, [map, strokeColor, strokeWidth]);

  const removePreviewFreehand = useCallback(() => {
    if (!map) return;
    if (map.getLayer('preview-freehand-line')) map.removeLayer('preview-freehand-line');
    if (map.getSource('preview-freehand')) map.removeSource('preview-freehand');
  }, [map]);

  const updateStats = useCallback((features: Feature[]) => {
    if (features.length === 0) {
      setStats(null);
      return;
    }

    let totalArea = 0;
    let totalLength = 0;
    let totalPerimeter = 0;
    let pointCount = 0;

    features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        totalArea += turf.area(feature as Feature<Polygon>);
        totalPerimeter += turf.length(feature as Feature<Polygon>, { units: 'meters' });
      } else if (feature.geometry.type === 'LineString') {
        totalLength += turf.length(feature as Feature<LineString>, { units: 'meters' });
      } else if (feature.geometry.type === 'Point') {
        pointCount++;
      }
    });

    setStats({
      area: totalArea > 0 ? totalArea : undefined,
      length: totalLength > 0 ? totalLength : undefined,
      perimeter: totalPerimeter > 0 ? totalPerimeter : undefined,
      pointCount,
    });
  }, []);

  const setMode = useCallback((mode: DrawMode) => {
    // Reset any in-progress drawings
    setCircleCenter(null);
    setIsDrawingCircle(false);
    setRectangleStart(null);
    setIsDrawingRectangle(false);
    setArrowStart(null);
    setIsDrawingArrow(false);
    setFreehandPoints([]);
    setIsDrawingFreehand(false);
    removePreviewCircle();
    removePreviewRectangle();
    removePreviewArrow();
    removePreviewFreehand();

    // Remove active text input if any
    if (activeTextInput) {
      activeTextInput.marker.remove();
      setActiveTextInput(null);
    }

    // Handle measurement modes
    if (mode === 'measure_distance') {
      setMeasurementMode('distance');
      setMeasurementPoints([]);
      setActiveMode(mode);
      if (drawRef.current) drawRef.current.changeMode('simple_select');
      return;
    }

    if (mode === 'measure_area') {
      setMeasurementMode('area');
      setMeasurementPoints([]);
      setActiveMode(mode);
      if (drawRef.current) drawRef.current.changeMode('simple_select');
      return;
    }

    // Clear measurement mode
    setMeasurementMode(null);
    setMeasurementPoints([]);

    // Custom modes that don't use MapboxDraw
    if (mode === 'draw_circle' || mode === 'draw_rectangle' || mode === 'draw_arrow' || mode === 'draw_freehand' || mode === 'draw_text') {
      if (drawRef.current) drawRef.current.changeMode('simple_select');
      setActiveMode(mode);
      return;
    }

    if (drawRef.current) {
      drawRef.current.changeMode(mode as string);
      setActiveMode(mode);
    }
  }, [removePreviewCircle, removePreviewRectangle, removePreviewArrow, removePreviewFreehand, activeTextInput]);

  const deleteSelected = useCallback(() => {
    if (drawRef.current && selectedFeatures.length > 0) {
      const ids = selectedFeatures.map(f => f.id as string);
      drawRef.current.delete(ids);
      setSelectedFeatures([]);
      setStats(null);
      onFeaturesChange?.(drawRef.current.getAll());
    }
  }, [selectedFeatures, onFeaturesChange]);

  const duplicateSelected = useCallback(() => {
    if (drawRef.current && selectedFeatures.length > 0) {
      selectedFeatures.forEach(feature => {
        const copy = JSON.parse(JSON.stringify(feature));
        delete copy.id;
        // Offset the copy slightly
        if (copy.geometry.type === 'Point') {
          copy.geometry.coordinates[0] += 0.0005;
          copy.geometry.coordinates[1] += 0.0005;
        } else if (copy.geometry.type === 'Polygon' || copy.geometry.type === 'LineString') {
          const offset = (coords: number[][]) => coords.map(c => [c[0] + 0.0005, c[1] + 0.0005]);
          if (copy.geometry.type === 'Polygon') {
            copy.geometry.coordinates = copy.geometry.coordinates.map(offset);
          } else {
            copy.geometry.coordinates = offset(copy.geometry.coordinates);
          }
        }
        drawRef.current?.add(copy);
      });
      onFeaturesChange?.(drawRef.current.getAll());
    }
  }, [selectedFeatures, onFeaturesChange]);

  const clearAll = useCallback(() => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setSelectedFeatures([]);
      setStats(null);
      onFeaturesChange?.({ type: 'FeatureCollection', features: [] });
    }
    // Clear text annotations
    textAnnotations.forEach(ann => ann.marker.remove());
    setTextAnnotations([]);
    // Clear measurements
    setMeasurementPoints([]);
    setMeasurementMode(null);
  }, [onFeaturesChange, textAnnotations]);

  const exportGeoJSON = useCallback(() => {
    if (drawRef.current) {
      const data = drawRef.current.getAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drawings.geojson';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const formatArea = (sqm: number): string => {
    if (sqm >= 1000000) return `${(sqm / 1000000).toFixed(2)} km²`;
    if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`;
    return `${sqm.toFixed(0)} m²`;
  };

  const formatLength = (m: number): string => {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${m.toFixed(1)} m`;
  };

  // Calculate measurement results
  const measurementResult = useCallback(() => {
    if (measurementPoints.length < 2) return null;

    if (measurementMode === 'distance') {
      const line = turf.lineString(measurementPoints);
      const length = turf.length(line, { units: 'meters' });
      return { type: 'distance' as const, value: length };
    }

    if (measurementMode === 'area' && measurementPoints.length >= 3) {
      const closed = [...measurementPoints, measurementPoints[0]];
      const polygon = turf.polygon([closed]);
      const area = turf.area(polygon);
      const perimeter = turf.length(polygon, { units: 'meters' });
      return { type: 'area' as const, value: area, perimeter };
    }

    return null;
  }, [measurementPoints, measurementMode]);

  const measurement = measurementResult();

  // Handle color change for selected features
  const handleStrokeColorChange = useCallback((color: string) => {
    setStrokeColor(color);
    if (selectedFeatures.length > 0) {
      updateSelectedFeatureColors(color, fillColor, strokeWidth, fillOpacity);
    }
  }, [fillColor, strokeWidth, fillOpacity, selectedFeatures, updateSelectedFeatureColors]);

  const handleFillColorChange = useCallback((color: string) => {
    setFillColor(color);
    if (selectedFeatures.length > 0) {
      updateSelectedFeatureColors(strokeColor, color, strokeWidth, fillOpacity);
    }
  }, [strokeColor, strokeWidth, fillOpacity, selectedFeatures, updateSelectedFeatureColors]);

  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(width);
    if (selectedFeatures.length > 0) {
      updateSelectedFeatureColors(strokeColor, fillColor, width, fillOpacity);
    }
  }, [strokeColor, fillColor, fillOpacity, selectedFeatures, updateSelectedFeatureColors]);

  const handleFillOpacityChange = useCallback((opacity: number) => {
    setFillOpacity(opacity);
    if (selectedFeatures.length > 0) {
      updateSelectedFeatureColors(strokeColor, fillColor, strokeWidth, opacity);
    }
  }, [strokeColor, fillColor, strokeWidth, selectedFeatures, updateSelectedFeatureColors]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v': setMode('simple_select'); break;
        case 'a': setMode('direct_select'); break;
        case 'r': setMode('draw_rectangle'); break;
        case 'o': setMode('draw_circle'); break;
        case 'p': setMode('draw_polygon'); break;
        case 'l': setMode('draw_line_string'); break;
        case 'w': setMode('draw_arrow'); break;
        case 'f': setMode('draw_freehand'); break;
        case 't': setMode('draw_text'); break;
        case 'd': setMode('measure_distance'); break;
        case 'm': setMode('measure_area'); break;
        case 'delete':
        case 'backspace':
          if (selectedFeatures.length > 0) deleteSelected();
          break;
        case 'escape':
          setMode('simple_select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode, selectedFeatures, deleteSelected]);

  if (!map) return null;

  const renderToolButton = (tool: { mode: DrawMode; icon: typeof MousePointer2; label: string; shortcut: string }) => (
    <Button
      key={tool.mode}
      size="sm"
      variant={activeMode === tool.mode ? 'default' : 'outline'}
      className="h-9 w-full p-0"
      onClick={() => setMode(tool.mode)}
      title={`${tool.label} (${tool.shortcut})`}
    >
      <tool.icon className="h-4 w-4" />
    </Button>
  );

  const hasSelection = selectedFeatures.length > 0;

  return (
    <div className={cn(
      "absolute top-20 right-4 bottom-20 w-64 z-10 pointer-events-auto",
      "bg-background/95 backdrop-blur rounded-lg shadow-lg flex flex-col overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          <span className="font-medium">Draw Tools</span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tools */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Selection Tools */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selection</p>
          <div className="grid grid-cols-4 gap-1">
            {SELECTION_TOOLS.map(renderToolButton)}
          </div>
        </div>

        {/* Shape Tools */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shapes</p>
          <div className="grid grid-cols-4 gap-1">
            {SHAPE_TOOLS.map(renderToolButton)}
          </div>
          {(activeMode === 'draw_circle' || activeMode === 'draw_rectangle' || activeMode === 'draw_arrow' || activeMode === 'draw_freehand') && (
            <p className="text-xs text-muted-foreground">
              {activeMode === 'draw_freehand'
                ? 'Click and drag to draw freely'
                : `Click to set ${activeMode === 'draw_circle' ? 'center, then edge' : activeMode === 'draw_arrow' ? 'start, then end point' : 'first corner, then opposite corner'}`}
            </p>
          )}
        </div>

        {/* Annotation Tools */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Annotations</p>
          <div className="grid grid-cols-4 gap-1">
            {ANNOTATION_TOOLS.map(renderToolButton)}
          </div>
          {activeMode === 'draw_text' && (
            <p className="text-xs text-muted-foreground">Click on map to add text (double-click to edit)</p>
          )}
        </div>

        {/* Measurement Tools */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Measure</p>
          <div className="grid grid-cols-4 gap-1">
            {MEASURE_TOOLS.map(renderToolButton)}
          </div>
        </div>

        {/* Measurement Results */}
        {measurement && (
          <div className="space-y-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600">
              <Ruler className="h-4 w-4" />
              <span className="font-medium text-sm">Measurement</span>
            </div>
            {measurement.type === 'distance' && (
              <div className="text-sm">
                <span className="text-muted-foreground">Distance: </span>
                <span className="font-mono font-medium">{formatLength(measurement.value)}</span>
              </div>
            )}
            {measurement.type === 'area' && (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground">Area: </span>
                  <span className="font-mono font-medium">{formatArea(measurement.value)}</span>
                </div>
                {measurement.perimeter && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Perimeter: </span>
                    <span className="font-mono font-medium">{formatLength(measurement.perimeter)}</span>
                  </div>
                )}
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-7 text-xs"
              onClick={() => {
                setMeasurementMode(null);
                setMeasurementPoints([]);
              }}
            >
              Clear Measurement
            </Button>
          </div>
        )}

        {/* Style Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Style</p>
            {hasSelection && (
              <Badge variant="secondary" className="text-[10px]">Editing {selectedFeatures.length} selected</Badge>
            )}
          </div>

          {/* Stroke Color Dropdown */}
          <div className="space-y-1">
            <Label className="text-xs">Stroke</Label>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between h-8"
                onClick={() => {
                  setShowStrokeDropdown(!showStrokeDropdown);
                  setShowFillDropdown(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border" style={{ backgroundColor: strokeColor }} />
                  <span className="text-xs">{COLORS.find(c => c.value === strokeColor)?.name || 'Custom'}</span>
                </div>
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showStrokeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-2 grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "h-6 w-6 rounded border-2 transition-all",
                        strokeColor === color.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => {
                        handleStrokeColorChange(color.value);
                        setShowStrokeDropdown(false);
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fill Color Dropdown */}
          <div className="space-y-1">
            <Label className="text-xs">Fill</Label>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between h-8"
                onClick={() => {
                  setShowFillDropdown(!showFillDropdown);
                  setShowStrokeDropdown(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border" style={{ backgroundColor: fillColor, opacity: fillOpacity / 100 }} />
                  <span className="text-xs">{COLORS.find(c => c.value === fillColor)?.name || 'Custom'}</span>
                </div>
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showFillDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-2 grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "h-6 w-6 rounded border-2 transition-all",
                        fillColor === color.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => {
                        handleFillColorChange(color.value);
                        setShowFillDropdown(false);
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">Stroke Width</Label>
              <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
            </div>
            <Slider
              value={[strokeWidth]}
              onValueChange={([v]) => handleStrokeWidthChange(v)}
              min={1}
              max={10}
              step={1}
            />
          </div>

          {/* Fill Opacity */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">Fill Opacity</Label>
              <span className="text-xs text-muted-foreground">{fillOpacity}%</span>
            </div>
            <Slider
              value={[fillOpacity]}
              onValueChange={([v]) => handleFillOpacityChange(v)}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </div>

        {/* Selection Stats */}
        {stats && (stats.area || stats.length || stats.perimeter || stats.pointCount > 0) && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="font-medium text-sm">Selection</span>
            </div>
            {stats.area !== undefined && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">Area:</span>
                <span className="font-mono">{formatArea(stats.area)}</span>
              </div>
            )}
            {stats.length !== undefined && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">Length:</span>
                <span className="font-mono">{formatLength(stats.length)}</span>
              </div>
            )}
            {stats.perimeter !== undefined && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">Perimeter:</span>
                <span className="font-mono">{formatLength(stats.perimeter)}</span>
              </div>
            )}
            {stats.pointCount > 0 && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">Points:</span>
                <span className="font-mono">{stats.pointCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t space-y-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={duplicateSelected}
            disabled={selectedFeatures.length === 0}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-destructive"
            onClick={deleteSelected}
            disabled={selectedFeatures.length === 0}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={clearAll}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={exportGeoJSON}>
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {selectedFeatures.length > 0 && (
        <div className="px-3 pb-3">
          <Badge variant="secondary" className="w-full justify-center">
            {selectedFeatures.length} selected
          </Badge>
        </div>
      )}

      {/* Close dropdowns when clicking outside */}
      {(showStrokeDropdown || showFillDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowStrokeDropdown(false);
            setShowFillDropdown(false);
          }}
        />
      )}
    </div>
  );
}

export default DrawPanel;
