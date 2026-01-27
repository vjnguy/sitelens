"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Info,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface LegendItem {
  label: string;
  color: string;
}

export interface LegendLayer {
  id: string;
  name: string;
  items: LegendItem[];
}

interface MapLegendProps {
  layers: LegendLayer[];
  className?: string;
  onClose?: () => void;
}

export function MapLegend({ layers, className, onClose }: MapLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(
    new Set(layers.map(l => l.id))
  );

  const toggleLayer = (id: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (layers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "absolute bottom-20 right-4 z-10 pointer-events-auto",
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 overflow-hidden",
        "max-w-64",
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Legend</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {layers.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
              {layers.map((layer) => {
                const isExpanded = expandedLayers.has(layer.id);

                return (
                  <div
                    key={layer.id}
                    className="bg-muted/30 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleLayer(layer.id)}
                      className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-medium truncate">
                        {layer.name}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-2 pb-2 space-y-1"
                        >
                          {layer.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-4 h-3 rounded-sm border border-border/50 shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-[10px] text-muted-foreground truncate">
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MapLegend;
