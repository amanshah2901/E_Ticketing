// src/pages/SearchPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  Film,
  Bus,
  Music,
  Mountain,
  Star,
  MapPin,
  Calendar,
  Clock,
  Users,
} from "lucide-react";

import {
  moviesAPI,
  busesAPI,
  eventsAPI,
  toursAPI,
  searchAPI,
} from "@/api/services";

import { formatCurrency, formatDate } from "@/utils";

/**
 * Robust helper to extract an array list from a response.
 * Supports either:
 *  - array directly (e.g. res = [{...}, {...}])
 *  - object with key (e.g. res = { buses: [...], pagination: {...} })
 */
const extractList = (res, key) => {
  if (!res) return [];
  // if backend already returned the data object (services.js unwraps res.data.data),
  // it could be either { buses: [...] } or an array [...]
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res[key])) return res[key];
  // Some APIs might return `{ data: { buses: [...] }}` in some edge cases — handle defensively:
  if (res.data && Array.isArray(res.data[key])) return res.data[key];
  return [];
};

const TabsControl = ({ active, setActive, totals }) => {
  const tabs = [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies", icon: Film },
    { value: "bus", label: "Buses", icon: Bus },
    { value: "event", label: "Events", icon: Music },
    { value: "tour", label: "Tours", icon: Mountain },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-5 gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const count =
            t.value === "all"
              ? (totals.movies + totals.buses + totals.events + totals.tours)
              : totals[t.value + "s"] || 0;

          const isActive = active === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setActive(t.value)}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-md text-sm font-medium transition-colors
                ${isActive ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"}
              `}
            >
              {Icon ? <Icon className="w-4 h-4" /> : null}
              <span>{t.label}</span>
              <Badge variant="secondary" className="ml-2">
                {count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ResultCard = ({ item, type, Icon }) => {
  const itemId = item?._id || item?.id || "";
  const price =
    type === "tour" ? item.price_per_person : item.price || item.ticket_price || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-48 h-48 md:h-auto">
            <img
              src={item.poster_url || item.image_url || "/default-image.jpg"}
              alt={item.title || item.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {item.title || item.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {Icon && <Icon className="w-3 h-3" />}
                    {type}
                  </Badge>

                  {type === "movie" && (item.imdb_rating || item.rating) && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      {item.imdb_rating || item.rating}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(price)}
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {type === "movie" && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(item.show_date || item.date)} {item.show_time ? `at ${item.show_time}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{item.theater || item.venue || item.city || "—"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{item.available_seats ?? item.seats_available ?? "—"} seats available</span>
                  </div>
                </>
              )}

              {type === "bus" && (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {item.from_city || item.from} → {item.to_city || item.to}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(item.departure_date)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {item.departure_time} - {item.arrival_time}
                    </span>
                  </div>
                </>
              )}

              {type === "event" && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(item.event_date || item.date)} {item.event_time ? `at ${item.event_time}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {item.venue}, {item.city}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{item.available_tickets ?? item.tickets_left ?? "—"} tickets left</span>
                  </div>
                </>
              )}

              {type === "tour" && (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{item.destination || item.location}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {item.duration || "—"} • Starts {formatDate(item.start_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{item.available_slots ?? "—"} slots available</span>
                  </div>
                </>
              )}
            </div>

            {item.genre && type === "movie" && (
              <div className="flex flex-wrap gap-1 mb-4">
                {String(item.genre)
                  .split(",")
                  .map((g) => (
                    <Badge key={g} variant="outline" className="text-xs">
                      {g.trim()}
                    </Badge>
                  ))}
              </div>
            )}

            {itemId ? (
              <Button asChild className="w-full md:w-auto">
                <Link to={`/${type}-booking?id=${itemId}`}>Book Now</Link>
              </Button>
            ) : (
              <Button disabled className="w-full md:w-auto">
                Book Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ResultsSection = ({ type, items, icon: Icon, title }) => {
  const list = items || [];
  if (!list.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title} ({list.length})
      </h3>

      <div className="space-y-4">
        {list.map((item) => (
          <ResultCard key={item._id || item.id} item={item} type={type} Icon={Icon} />
        ))}
      </div>
    </div>
  );
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();

  // tabs: all, movie, bus, event, tour
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({
    movies: [],
    buses: [],
    events: [],
    tours: [],
  });

  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    genre: "",
    city: "",
    date: "",
    priceRange: "",
  });

  // select open states (if your Select uses these)
  const [genreOpen, setGenreOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const query = searchParams.get("q") || "";
  const typeFromUrl = searchParams.get("type") || "all";

  useEffect(() => {
    setSearchQuery(query);
    setActiveTab(typeFromUrl);
    // Always run search to show all data, even without query
    performSearch(query, typeFromUrl);
    setGenreOpen(false);
    setCityOpen(false);
    setPriceOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, typeFromUrl]);

  // performSearch is memoized to avoid re-creating on each render
  const performSearch = useCallback(
    async (search = "", tab = "all") => {
      setLoading(true);

      try {
        // Use unified search API if there's a search query
        if (search && search.trim()) {
          try {
            const unifiedResults = await searchAPI.unifiedSearch(search.trim());
            
            // Filter results based on active tab
            const newResults = {
              movies: tab === "all" || tab === "movie" ? (unifiedResults.movies || []) : [],
              buses: tab === "all" || tab === "bus" ? (unifiedResults.buses || []) : [],
              events: tab === "all" || tab === "event" ? (unifiedResults.events || []) : [],
              tours: tab === "all" || tab === "tour" ? (unifiedResults.tours || []) : []
            };
            
            setResults(newResults);
            return;
          } catch (unifiedErr) {
            console.error("Unified search error, falling back to individual APIs:", unifiedErr);
            // Fall through to individual API calls
          }
        }

        // If no search query, fetch all items for the selected tab

        // Fallback to individual API calls (for filtered searches or if unified search fails)
        const params = {
          search,
          limit: 100, // Increased to show all movies
          // pass filters only if set
          ...(filters.genre ? { genre: filters.genre } : {}),
          ...(filters.city ? { city: filters.city } : {}),
          ...(filters.date ? { date: filters.date } : {}),
          ...(filters.priceRange ? { priceRange: filters.priceRange } : {}),
        };

        // Build queries depending on tab
        const reqs = [];
        // We'll keep track of which request maps to which resource.
        const reqMap = [];

        if (tab === "all" || tab === "movie") {
          reqs.push(moviesAPI.getMovies(params));
          reqMap.push("movies");
        }
        if (tab === "all" || tab === "bus") {
          reqs.push(busesAPI.getBuses(params));
          reqMap.push("buses");
        }
        if (tab === "all" || tab === "event") {
          reqs.push(eventsAPI.getEvents(params));
          reqMap.push("events");
        }
        if (tab === "all" || tab === "tour") {
          reqs.push(toursAPI.getTours(params));
          reqMap.push("tours");
        }

        const settled = await Promise.allSettled(reqs);

        // Prepare new results starting from previous state to keep stability
        const newResults = { movies: [], buses: [], events: [], tours: [] };

        settled.forEach((s, idx) => {
          const key = reqMap[idx]; // 'movies' | 'buses' | ...
          if (s.status === "fulfilled") {
            const data = s.value;
            // Use extractList to support both [..] and { buses: [...] } shapes
            newResults[key] = extractList(data, key) || [];
          } else {
            // if one resource fails, log but keep others
            console.error(`Search request for ${reqMap[idx]} failed:`, s.reason);
            newResults[key] = [];
          }
        });

        setResults(newResults);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // close dropdowns
    setGenreOpen(false);
    setCityOpen(false);
    setPriceOpen(false);
    performSearch(searchQuery, activeTab);
  };

  // helpers called by Select onSelect handlers
  const onSelectGenre = (value) => {
    setFilters((s) => ({ ...s, genre: value }));
    setGenreOpen(false);
    performSearch(searchQuery, activeTab);
  };
  const onSelectCity = (value) => {
    setFilters((s) => ({ ...s, city: value }));
    setCityOpen(false);
    performSearch(searchQuery, activeTab);
  };
  const onSelectPrice = (value) => {
    setFilters((s) => ({ ...s, priceRange: value }));
    setPriceOpen(false);
    performSearch(searchQuery, activeTab);
  };

  // recompute totals for tabs header badges
  const totals = {
    movies: results.movies.length,
    buses: results.buses.length,
    events: results.events.length,
    tours: results.tours.length,
  };

  // debug: show movies when they load (keeps your existing console)
  useEffect(() => {
    console.log("Movies:", results.movies);
  }, [results.movies]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Search Results
          </h1>

          <form onSubmit={handleSearchSubmit} className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for movies, buses, events, tours..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-lg py-3"
                />
              </div>

              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

        </div>

        {/* Tabs control (custom to avoid onValueChange warning) */}
        <TabsControl active={activeTab} setActive={(v) => { setActiveTab(v); performSearch(searchQuery, v); }} totals={totals} />

        {/* RESULTS */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ALL */}
            {(activeTab === "all" || activeTab === "movie") && (
              <ResultsSection type="movie" items={results.movies} icon={Film} title="Movies" />
            )}

            {(activeTab === "all" || activeTab === "bus") && (
              <ResultsSection type="bus" items={results.buses} icon={Bus} title="Bus Routes" />
            )}

            {(activeTab === "all" || activeTab === "event") && (
              <ResultsSection type="event" items={results.events} icon={Music} title="Events" />
            )}

            {(activeTab === "all" || activeTab === "tour") && (
              <ResultsSection type="tour" items={results.tours} icon={Mountain} title="Tours" />
            )}

            {/* no results */}
            {results.movies.length === 0 &&
              results.buses.length === 0 &&
              results.events.length === 0 &&
              results.tours.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or filters</p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
