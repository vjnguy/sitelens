"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  X,
  Check,
  RotateCcw,
  ChevronLeft,
  Image as ImageIcon,
  MapPin,
  Crosshair,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface ControlPoint {
  imagePixel: { x: number; y: number };
  mapCoord: { lng: number; lat: number };
}

export interface GeoreferenceResult {
  imageUrl: string;
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
  name: string;
}

interface GeoreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  fileName: string;
  /** Current map center to initialize the mini-map */
  mapCenter?: [number, number];
  mapZoom?: number;
  onComplete: (result: GeoreferenceResult) => void;
  onCancel: () => void;
}

type Step = "image1" | "map1" | "image2" | "map2" | "preview";

const STEP_LABELS: Record<Step, string> = {
  image1: "Click point 1 on the image",
  map1: "Click point 1 on the map",
  image2: "Click point 2 on the image",
  map2: "Click point 2 on the map",
  preview: "Preview — verify the overlay position",
};

const STEP_INDEX: Record<Step, number> = {
  image1: 1,
  map1: 2,
  image2: 3,
  map2: 4,
  preview: 5,
};

/**
 * Compute the 4 image corners in geographic coordinates from 2 control points.
 * Supports translation, uniform scale, and rotation.
 */
function computeImageCorners(
  cp1: ControlPoint,
  cp2: ControlPoint,
  imageWidth: number,
  imageHeight: number
): [[number, number], [number, number], [number, number], [number, number]] {
  const { imagePixel: ip1, mapCoord: mc1 } = cp1;
  const { imagePixel: ip2, mapCoord: mc2 } = cp2;

  const dxPixel = ip2.x - ip1.x;
  const dyPixel = ip2.y - ip1.y;
  const dLng = mc2.lng - mc1.lng;
  const dLat = mc2.lat - mc1.lat;

  // Pixel angle (image space, Y-down)
  const pixelAngle = Math.atan2(dyPixel, dxPixel);
  // Geographic angle (Y-up, so negate lat diff for Y-down equivalence)
  const geoAngle = Math.atan2(-dLat, dLng);
  const rotation = geoAngle - pixelAngle;

  // Scale: geo distance per pixel distance
  const pixelDist = Math.sqrt(dxPixel * dxPixel + dyPixel * dyPixel);
  const geoDist = Math.sqrt(dLng * dLng + dLat * dLat);

  if (pixelDist === 0) {
    // Degenerate case: both image points are the same
    return [
      [mc1.lng, mc1.lat],
      [mc1.lng, mc1.lat],
      [mc1.lng, mc1.lat],
      [mc1.lng, mc1.lat],
    ];
  }

  const scale = geoDist / pixelDist;

  const cosR = Math.cos(rotation) * scale;
  const sinR = Math.sin(rotation) * scale;

  function pixelToGeo(px: number, py: number): [number, number] {
    const rx = px - ip1.x;
    const ry = py - ip1.y;
    const gx = rx * cosR - ry * sinR;
    const gy = -(rx * sinR + ry * cosR); // negate: pixel Y-down to geo Y-up
    return [mc1.lng + gx, mc1.lat + gy];
  }

  // Mapbox image source expects: [topLeft, topRight, bottomRight, bottomLeft]
  const topLeft = pixelToGeo(0, 0);
  const topRight = pixelToGeo(imageWidth, 0);
  const bottomRight = pixelToGeo(imageWidth, imageHeight);
  const bottomLeft = pixelToGeo(0, imageHeight);

  return [topLeft, topRight, bottomRight, bottomLeft];
}

export function GeoreferenceDialog({
  open,
  onOpenChange,
  imageUrl,
  fileName,
  mapCenter = [153.03, -27.47],
  mapZoom = 14,
  onComplete,
  onCancel,
}: GeoreferenceDialogProps) {
  const [step, setStep] = useState<Step>("image1");
  const [layerName, setLayerName] = useState(fileName);

  // Control points
  const [imagePoint1, setImagePoint1] = useState<{ x: number; y: number } | null>(null);
  const [mapPoint1, setMapPoint1] = useState<{ lng: number; lat: number } | null>(null);
  const [imagePoint2, setImagePoint2] = useState<{ x: number; y: number } | null>(null);
  const [mapPoint2, setMapPoint2] = useState<{ lng: number; lat: number } | null>(null);

  // Image dimensions
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);

  // Refs
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const previewSourceAdded = useRef(false);

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Initialize mini map
  useEffect(() => {
    if (!open || !miniMapContainerRef.current || miniMapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: miniMapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: mapCenter,
      zoom: mapZoom,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    miniMapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      miniMapRef.current = null;
      previewSourceAdded.current = false;
    };
  }, [open, mapCenter, mapZoom]);

  // Handle map clicks
  useEffect(() => {
    const map = miniMapRef.current;
    if (!map) return;

    const isMapStep = step === "map1" || step === "map2";
    map.getCanvas().style.cursor = isMapStep ? "crosshair" : "";

    if (!isMapStep) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const coord = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      if (step === "map1") {
        setMapPoint1(coord);
        setStep("image2");
      } else if (step === "map2") {
        setMapPoint2(coord);
        setStep("preview");
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [step]);

  // Sync map markers
  useEffect(() => {
    const map = miniMapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarker = (coord: { lng: number; lat: number }, label: string, color: string) => {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 28px; height: 28px; background: ${color}; border: 3px solid white;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: bold; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      `;
      el.textContent = label;
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([coord.lng, coord.lat])
        .addTo(map);
      markersRef.current.push(marker);
    };

    if (mapPoint1) addMarker(mapPoint1, "1", "#ef4444");
    if (mapPoint2) addMarker(mapPoint2, "2", "#3b82f6");
  }, [mapPoint1, mapPoint2]);

  // Show preview overlay on mini map
  useEffect(() => {
    const map = miniMapRef.current;
    if (!map || step !== "preview" || !imageDims) return;
    if (!imagePoint1 || !mapPoint1 || !imagePoint2 || !mapPoint2) return;

    const corners = computeImageCorners(
      { imagePixel: imagePoint1, mapCoord: mapPoint1 },
      { imagePixel: imagePoint2, mapCoord: mapPoint2 },
      imageDims.w,
      imageDims.h
    );

    const addPreview = () => {
      try {
        if (map.getLayer("georef-preview-layer")) map.removeLayer("georef-preview-layer");
        if (map.getSource("georef-preview")) map.removeSource("georef-preview");
      } catch { /* ignore */ }

      map.addSource("georef-preview", {
        type: "image",
        url: imageUrl,
        coordinates: corners,
      });

      map.addLayer({
        id: "georef-preview-layer",
        source: "georef-preview",
        type: "raster",
        paint: { "raster-opacity": 0.75 },
      });

      previewSourceAdded.current = true;

      // Fly to the image extent
      const lngs = corners.map((c) => c[0]);
      const lats = corners.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: 1000 }
      );
    };

    if (map.isStyleLoaded()) {
      addPreview();
    } else {
      map.once("style.load", addPreview);
    }

    return () => {
      if (!previewSourceAdded.current) return;
      try {
        if (map.getLayer("georef-preview-layer")) map.removeLayer("georef-preview-layer");
        if (map.getSource("georef-preview")) map.removeSource("georef-preview");
      } catch { /* ignore */ }
      previewSourceAdded.current = false;
    };
  }, [step, imageDims, imagePoint1, imagePoint2, mapPoint1, mapPoint2, imageUrl]);

  // Handle image click
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (step !== "image1" && step !== "image2") return;
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      // Convert display coords to natural image pixel coords
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      if (step === "image1") {
        setImagePoint1({ x: px, y: py });
        setStep("map1");
      } else if (step === "image2") {
        setImagePoint2({ x: px, y: py });
        setStep("map2");
      }
    },
    [step]
  );

  // Convert image pixel to display position for markers
  const pixelToDisplay = (px: number, py: number): { left: string; top: string } | null => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const container = imageContainerRef.current;
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();

    const displayX = (px / img.naturalWidth) * rect.width + (rect.left - containerRect.left);
    const displayY = (py / img.naturalHeight) * rect.height + (rect.top - containerRect.top);

    return { left: `${displayX}px`, top: `${displayY}px` };
  };

  const handleReset = () => {
    setStep("image1");
    setImagePoint1(null);
    setMapPoint1(null);
    setImagePoint2(null);
    setMapPoint2(null);
  };

  const handleBack = () => {
    switch (step) {
      case "map1":
        setImagePoint1(null);
        setStep("image1");
        break;
      case "image2":
        setMapPoint1(null);
        setStep("map1");
        break;
      case "map2":
        setImagePoint2(null);
        setStep("image2");
        break;
      case "preview":
        setMapPoint2(null);
        setStep("map2");
        break;
    }
  };

  const handleConfirm = () => {
    if (!imageDims || !imagePoint1 || !mapPoint1 || !imagePoint2 || !mapPoint2) return;

    const corners = computeImageCorners(
      { imagePixel: imagePoint1, mapCoord: mapPoint1 },
      { imagePixel: imagePoint2, mapCoord: mapPoint2 },
      imageDims.w,
      imageDims.h
    );

    onComplete({
      imageUrl,
      coordinates: corners,
      name: layerName || fileName,
    });
  };

  const handleClose = () => {
    handleReset();
    onCancel();
    onOpenChange(false);
  };

  const isImageStep = step === "image1" || step === "image2";
  const isMapStep = step === "map1" || step === "map2";
  const stepNum = STEP_INDEX[step];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" />
              Georeference Image
            </DialogTitle>
            <DialogDescription className="mt-1">
              Place 2 matching control points on the image and map to position the overlay
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {step !== "image1" && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    i < stepNum ? "bg-primary" : i === stepNum ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isImageStep && <ImageIcon className="h-4 w-4 text-amber-500" />}
              {isMapStep && <MapPin className="h-4 w-4 text-emerald-500" />}
              {step === "preview" && <Eye className="h-4 w-4 text-blue-500" />}
              <span className="text-sm font-medium">{STEP_LABELS[step]}</span>
            </div>
          </div>
        </div>

        {/* Main content — side by side panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Image */}
          <div
            ref={imageContainerRef}
            className={cn(
              "relative flex-1 overflow-auto bg-slate-950 flex items-center justify-center",
              isImageStep && "ring-2 ring-inset ring-amber-500/50"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt={fileName}
              className={cn(
                "max-w-full max-h-full object-contain select-none",
                isImageStep && "cursor-crosshair"
              )}
              onClick={handleImageClick}
              draggable={false}
            />

            {/* Image control point markers */}
            {imagePoint1 && imgRef.current && (() => {
              const pos = pixelToDisplay(imagePoint1.x, imagePoint1.y);
              if (!pos) return null;
              return (
                <div
                  className="absolute pointer-events-none z-10"
                  style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-7 h-7 rounded-full bg-red-500 border-[3px] border-white shadow-lg flex items-center justify-center text-[11px] font-bold text-white">
                    1
                  </div>
                </div>
              );
            })()}

            {imagePoint2 && imgRef.current && (() => {
              const pos = pixelToDisplay(imagePoint2.x, imagePoint2.y);
              if (!pos) return null;
              return (
                <div
                  className="absolute pointer-events-none z-10"
                  style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500 border-[3px] border-white shadow-lg flex items-center justify-center text-[11px] font-bold text-white">
                    2
                  </div>
                </div>
              );
            })()}

            {/* Label */}
            <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              Image
              {imageDims && (
                <span className="text-muted-foreground">
                  {imageDims.w} x {imageDims.h}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border" />

          {/* Right panel: Map */}
          <div
            className={cn(
              "relative flex-1",
              isMapStep && "ring-2 ring-inset ring-emerald-500/50"
            )}
          >
            <div ref={miniMapContainerRef} className="w-full h-full" />

            {/* Label */}
            <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 z-10 pointer-events-none">
              <MapPin className="h-3.5 w-3.5" />
              Map
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Layer name:</label>
            <Input
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              className="w-64 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === "preview" && (
              <Button onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Add to Map
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GeoreferenceDialog;
