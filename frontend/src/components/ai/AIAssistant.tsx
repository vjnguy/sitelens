"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Code,
  Copy,
  Play,
  Loader2,
  X,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIMessage, Layer } from '@/types/gis';

interface AIAssistantProps {
  projectId?: string;
  layers?: Layer[];
  selectedFeatures?: unknown[];
  mapBounds?: { west: number; south: number; east: number; north: number };
  onCodeGenerated?: (code: string) => void;
  onClose?: () => void;
  className?: string;
}

const SUGGESTED_QUERIES = [
  "What is the total area of selected features?",
  "Buffer selected points by 100 meters",
  "Find features within 500m of the center",
  "What zoning applies to this location?",
  "Generate a heatmap from these points",
];

export function AIAssistant({
  projectId,
  layers = [],
  selectedFeatures = [],
  mapBounds,
  onCodeGenerated,
  onClose,
  className,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm SiteLens AI, your spatial analysis assistant. I can help you analyze your GIS data, generate code, and answer questions about property and planning information. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setShowSuggestions(false);
    const userMessage: AIMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context
      const context = {
        layers: layers.map((l) => ({
          id: l.id,
          name: l.name,
          featureCount: (l.source_config.data as any)?.features?.length || 0,
        })),
        selectedFeatures: selectedFeatures.length,
        mapBounds,
      };

      // Call AI API
      const response = await fetch('/api/v1/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: content,
          context,
          conversation_history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      let result;
      if (response.ok) {
        result = await response.json();
      } else {
        // Mock response for development when backend is not running
        result = getMockResponse(content);
      }

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toISOString(),
        metadata: {
          query_type: result.type,
          generated_code: result.code,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Use mock response on error
      const result = getMockResponse(content);
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toISOString(),
        metadata: {
          query_type: result.type,
          generated_code: result.code,
        },
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const runCode = (code: string) => {
    onCodeGenerated?.(code);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">SiteLens AI</h3>
            <p className="text-xs text-muted-foreground">Spatial Analysis Assistant</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-lg p-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Code block if present */}
              {message.metadata?.generated_code && (
                <div className="mt-3 rounded-lg bg-background/80 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
                    <div className="flex items-center gap-2 text-xs">
                      <Code className="h-3 w-3" />
                      <span>Generated Code</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyCode(message.metadata!.generated_code!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {onCodeGenerated && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => runCode(message.metadata!.generated_code!)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <pre className="p-3 text-xs overflow-x-auto">
                    <code>{message.metadata.generated_code}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && messages.length === 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              <span>Try asking:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((query, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(query)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your spatial data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI responses are for guidance only. Verify important information.
        </p>
      </div>
    </div>
  );
}

// Mock response function for development
function getMockResponse(query: string): { text: string; code?: string; type: 'spatial' | 'analysis' | 'general' } {
  const queryLower = query.toLowerCase();

  if (queryLower.includes('buffer')) {
    return {
      text: "To create a buffer around selected features, you can use the `gis.buffer()` function. Here's an example that buffers by 100 meters:",
      code: `// Buffer selected features by 100 meters
const buffered = selectedFeatures.map(f =>
  gis.buffer(f, 100, { units: 'meters' })
).filter(Boolean);

// Combine into a feature collection
return gis.featureCollection(buffered);`,
      type: 'analysis',
    };
  }

  if (queryLower.includes('area') || queryLower.includes('size')) {
    return {
      text: "I can help you calculate areas. Here's code to calculate the total area of selected polygon features:",
      code: `// Calculate total area of selected polygons
const areas = selectedFeatures
  .filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  .map(f => gis.area(f));

const totalArea = areas.reduce((sum, a) => sum + a, 0);
console.log('Total area:', format.area(totalArea));
return { totalArea, formattedArea: format.area(totalArea) };`,
      type: 'analysis',
    };
  }

  if (queryLower.includes('zoning')) {
    return {
      text: `In Australian planning systems, common zoning codes include:

**Residential (R1-R5):**
- R1: General Residential
- R2: Low Density Residential
- R3: Medium Density Residential
- R4: High Density Residential
- R5: Large Lot Residential

**Business (B1-B7):**
- B1: Neighbourhood Centre
- B2: Local Centre
- B3: Commercial Core
- B4: Mixed Use

**Industrial (IN1-IN4):**
- IN1: General Industrial
- IN2: Light Industrial
- IN3: Heavy Industrial

To check zoning for a specific location, click on the map or use the property search feature.`,
      type: 'general',
    };
  }

  if (queryLower.includes('flood') || queryLower.includes('overlay')) {
    return {
      text: `Planning overlays in Australia provide additional controls beyond base zoning:

**Flood Planning (FP):** Areas affected by 1 in 100 year flood events. Development requires flood assessment.

**Bushfire (BPA/BAL):** Bushfire Attack Level ratings from BAL-Low to BAL-FZ. Higher ratings require specific construction standards.

**Heritage (H):** Heritage conservation areas requiring approval for modifications.

**Environmental (E):** Environmental protection zones with restrictions on development.

You can check overlays for a specific location using the property report feature in the Data Sources panel.`,
      type: 'general',
    };
  }

  if (queryLower.includes('heatmap') || queryLower.includes('cluster')) {
    return {
      text: "Here's code to create a heatmap grid from point features:",
      code: `// Create a heatmap grid from points
const points = getLayer('your-points-layer');
if (!points) return null;

// Create hex grid covering the data extent
const bbox = gis.bbox(points);
const grid = gis.hexGrid(bbox, 0.5, { units: 'kilometers' });

// Count points in each cell
const heatmap = {
  type: 'FeatureCollection',
  features: grid.features.map(cell => {
    const pointsInCell = gis.pointsWithinPolygon(points, cell);
    return {
      ...cell,
      properties: {
        ...cell.properties,
        count: pointsInCell.features.length,
      },
    };
  }),
};

return heatmap;`,
      type: 'analysis',
    };
  }

  return {
    text: `I understand you're asking about: "${query}"

I can help you with:
- **Spatial analysis**: Buffer, intersect, distance calculations
- **Property information**: Zoning, overlays, planning controls
- **Code generation**: Custom analysis scripts
- **Data interpretation**: Understanding your map layers

Could you provide more details about what you'd like to do?`,
    type: 'general',
  };
}
