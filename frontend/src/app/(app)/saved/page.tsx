"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Search,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Bookmark,
  Building2,
  Calendar,
  MapIcon,
  Grid,
  List,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatArea } from '@/lib/api/qld-identify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SavedProperty {
  lotPlan: string;
  lot: string;
  plan: string;
  locality?: string;
  lga?: string;
  area?: number;
  tenure?: string;
  coordinates?: [number, number];
  savedAt?: string;
}

export default function SavedSitesPage() {
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved properties from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('siteora-saved-properties');
      if (saved) {
        setSavedProperties(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load saved properties:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove saved property
  const removeProperty = useCallback((lotPlan: string) => {
    setSavedProperties(prev => {
      const updated = prev.filter(p => p.lotPlan !== lotPlan);
      localStorage.setItem('siteora-saved-properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Filter properties by search
  const filteredProperties = savedProperties.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.lotPlan.toLowerCase().includes(query) ||
      p.locality?.toLowerCase().includes(query) ||
      p.lga?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-muted/30">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Map
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bookmark className="h-6 w-6 text-amber-500" />
                Saved Sites
              </h1>
              <p className="text-sm text-muted-foreground">
                {savedProperties.length} properties saved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Lot/Plan, locality, or LGA..."
            className="pl-10 max-w-md"
          />
        </div>

        {/* Empty State */}
        {savedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Bookmark className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Saved Sites</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Search for properties and click the bookmark icon to save them here for quick access.
            </p>
            <Link href="/app">
              <Button className="gap-2">
                <MapIcon className="h-4 w-4" />
                Go to Map
              </Button>
            </Link>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Results</h2>
            <p className="text-muted-foreground">
              No saved properties match your search.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((property) => (
              <div
                key={property.lotPlan}
                className="bg-background rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
              >
                {/* Mini Map Preview */}
                <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                  {property.coordinates && (
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${property.coordinates[0]},${property.coordinates[1]},15,0/400x200@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                      alt="Property location"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/?site=${property.lotPlan}`}>
                            <MapPin className="h-4 w-4 mr-2" />
                            View on Map
                          </Link>
                        </DropdownMenuItem>
                        {property.coordinates && (
                          <DropdownMenuItem
                            onClick={() => window.open(`https://www.google.com/maps/@${property.coordinates![1]},${property.coordinates![0]},18z`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Google Maps
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => removeProperty(property.lotPlan)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono font-semibold text-lg">{property.lotPlan}</p>
                      {property.locality && (
                        <p className="text-sm text-muted-foreground">{property.locality}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {property.area && property.area > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {formatArea(property.area)}
                      </Badge>
                    )}
                    {property.lga && (
                      <Badge variant="outline" className="text-xs">
                        {property.lga}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/?site=${property.lotPlan}`} className="flex-1">
                      <Button size="sm" className="w-full gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-background rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Lot/Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Locality</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">LGA</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Area</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProperties.map((property) => (
                  <tr key={property.lotPlan} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium">{property.lotPlan}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {property.locality || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {property.lga || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {property.area && property.area > 0 ? formatArea(property.area) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/?site=${property.lotPlan}`}>
                          <Button variant="ghost" size="sm">
                            <MapPin className="h-4 w-4" />
                          </Button>
                        </Link>
                        {property.coordinates && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://www.google.com/maps/@${property.coordinates![1]},${property.coordinates![0]},18z`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProperty(property.lotPlan)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
