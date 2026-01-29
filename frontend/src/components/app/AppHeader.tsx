"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Search,
  Bookmark,
  Settings,
  User,
  LogOut,
  X,
  Loader2,
  Building2,
  ChevronDown,
  Layers,
  Scale,
  FolderOpen,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseLotPlan } from '@/lib/api/property-search';
import { createClient } from '@/lib/supabase/client';
import { FeedbackDialog } from '@/components/app/FeedbackDialog';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface GeocodingResult {
  place_name: string;
  center: [number, number];
  text: string;
}

interface AppHeaderProps {
  onLocationSelect?: (center: [number, number], address: string) => void;
  onLotPlanSelect?: (lotPlan: string) => void;
  onSelectFromMap?: () => void;
  savedCount?: number;
  compareCount?: number;
  className?: string;
}

export function AppHeader({
  onLocationSelect,
  onLotPlanSelect,
  onSelectFromMap,
  savedCount = 0,
  compareCount = 0,
  className,
}: AppHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Track client-side mount for hydration-safe components
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    // Check if it's a lot/plan format
    if (parseLotPlan(searchQuery)) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!MAPBOX_TOKEN) return;

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=AU&types=address,place,locality,neighborhood`
        );
        const data = await response.json();

        if (data.features?.length > 0) {
          setSearchResults(data.features.map((f: any) => ({
            place_name: f.place_name,
            center: f.center as [number, number],
            text: f.text,
          })));
          setShowResults(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;

    // Check if it's a lot/plan
    const lotPlan = parseLotPlan(searchQuery);
    if (lotPlan) {
      onLotPlanSelect?.(searchQuery);
      setShowResults(false);
      return;
    }

    // Otherwise search via geocoding
    setShowResults(true);
  }, [searchQuery, onLotPlanSelect]);

  const handleResultSelect = useCallback((result: GeocodingResult) => {
    onLocationSelect?.(result.center, result.place_name);
    setSearchQuery(result.text);
    setShowResults(false);
  }, [onLocationSelect]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      // Force a hard navigation to clear all client state
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
      // Still redirect even if there's an error
      window.location.href = '/login';
    }
  };

  return (
    <header className={cn(
      "h-14 bg-background/95 backdrop-blur-sm border-b flex items-center px-4 gap-4 z-50",
      className
    )}>
      {/* Logo */}
      <Link href="/app" className="flex items-center gap-2 flex-shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold hidden sm:block">Siteora</span>
      </Link>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl flex items-center gap-2">
        <div ref={searchRef} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search address or Lot/Plan (e.g. 123/SP456789)..."
            className="pl-10 pr-10 h-10 bg-muted/50 border-muted-foreground/20"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden z-50">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResultSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{result.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Select from Map button */}
        {onSelectFromMap && (
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 flex-shrink-0"
            onClick={onSelectFromMap}
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden md:inline">Select from map</span>
          </Button>
        )}
      </div>

      {/* Quick Actions - pushed to right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Projects */}
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Projects</span>
          </Button>
        </Link>

        {/* Saved Sites */}
        <Link href="/saved">
          <Button variant="ghost" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            <span className="hidden md:inline">Saved</span>
            {savedCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {savedCount}
              </Badge>
            )}
          </Button>
        </Link>

        {/* Compare */}
        {compareCount > 0 && (
          <Link href="/compare">
            <Button variant="ghost" size="sm" className="gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden md:inline">Compare</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {compareCount}
              </Badge>
            </Button>
          </Link>
        )}

        {/* User Menu - only render after mount to avoid hydration mismatch */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/projects" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Projects
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Feedback
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="sm" className="gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  );
}
