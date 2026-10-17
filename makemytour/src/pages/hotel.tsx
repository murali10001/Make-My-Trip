import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { gethotel } from "@/api";
import Loader from "@/components/Loader";
import { SearchSelect } from "@/components/SearchSelect";
import { Button } from "@/components/ui/button";
import {
  Hotel as HotelIcon,
  MapPin,
  Star,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  ShieldCheck,
  Search,
  Sparkles,
  Wifi,
  Coffee,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
} from "lucide-react";

const CITY_FALLBACK_IMAGES: Record<string, string> = {
  goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&auto=format&fit=crop&q=80",
  mumbai: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800&auto=format&fit=crop&q=80",
  bengaluru: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80",
  jaipur: "https://images.unsplash.com/photo-1603262110263-fb010d6e59d4?w=800&auto=format&fit=crop&q=80",
  kerala: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80",
  manali: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&auto=format&fit=crop&q=80",
  udaipur: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&auto=format&fit=crop&q=80",
  shimla: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
};

function getDestinationImage(location: string, directUrl?: string): string {
  if (directUrl && directUrl.trim().length > 10) return directUrl;
  const loc = (location || "").toLowerCase();
  for (const key of Object.keys(CITY_FALLBACK_IMAGES)) {
    if (key !== "default" && loc.includes(key)) {
      return CITY_FALLBACK_IMAGES[key];
    }
  }
  return CITY_FALLBACK_IMAGES.default;
}

function getBaseCity(str: string): string {
  if (!str) return "";
  return str.replace(/\s*\([A-Za-z0-9\s]+\)\s*/g, "").trim();
}

function matchCity(recordCity: string, queryCity: string): boolean {
  if (!recordCity || !queryCity) return false;
  const recTrim = recordCity.trim().toLowerCase();
  const queryTrim = queryCity.trim().toLowerCase();
  if (recTrim === queryTrim) return true;

  const recBase = getBaseCity(recordCity).toLowerCase();
  const queryBase = getBaseCity(queryCity).toLowerCase();
  if (recBase && queryBase && recBase === queryBase) return true;

  if (recBase && queryBase && (recBase.includes(queryBase) || queryBase.includes(recBase))) return true;
  return false;
}

export default function HotelSearchPage() {
  const router = useRouter();
  const [location, setLocation] = useState<string>("");
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guests, setGuests] = useState<number>(2);

  const [allHotels, setAllHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [sortBy, setSortBy] = useState<string>("recommended");

  useEffect(() => {
    if (!router.isReady) return;

    const initialLocation =
      typeof router.query.location === "string"
        ? router.query.location
        : typeof router.query.query === "string"
        ? router.query.query
        : "";

    setLocation(initialLocation);
    fetchHotels(initialLocation);
  }, [router.isReady, router.query.location, router.query.query]);

  const fetchHotels = async (queryLocation = location) => {
    setLoading(true);
    try {
      let data = await gethotel(queryLocation);
      let list = Array.isArray(data) ? data : [];
      if (list.length === 0 && queryLocation) {
        const allData = await gethotel("");
        if (Array.isArray(allData) && allData.length > 0) {
          list = allData;
        }
      }
      setAllHotels(list);

      if (list.length > 0) {
        const highest = Math.max(...list.map((h: any) => h.pricePerNight || 0));
        if (highest > 0) setMaxPrice(Math.ceil(highest * 1.1));
      }
    } catch (err) {
      console.error("Failed to load hotels:", err);
      setAllHotels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    router.push(
      {
        pathname: "/hotel",
        query: {
          ...(location ? { location } : {}),
        },
      },
      undefined,
      { shallow: true }
    );
    fetchHotels(location);
  };

  const locationOptions = useMemo(() => {
    const citySet = new Set<string>();
    allHotels.forEach((h) => {
      if (!h?.location) return;
      const base = getBaseCity(h.location);
      if (base) citySet.add(base);
    });
    return Array.from(citySet)
      .sort((a, b) => a.localeCompare(b))
      .map((city) => ({ value: city, label: city }));
  }, [allHotels]);

  const availableAmenities = useMemo(() => {
    const set = new Set<string>();
    allHotels.forEach((h) => {
      if (h.amenities && typeof h.amenities === "string") {
        h.amenities.split(/[,;|]/).forEach((item: string) => {
          const trimmed = item.trim();
          if (trimmed && trimmed.length > 2) set.add(trimmed);
        });
      }
    });
    return Array.from(set).slice(0, 10);
  }, [allHotels]);

  const filteredHotels = useMemo(() => {
    let result = [...allHotels];

    if (location.trim()) {
      const matched = result.filter(
        (h) => matchCity(h.location, location) || (h.hotelName && h.hotelName.toLowerCase().includes(location.toLowerCase()))
      );
      if (matched.length > 0) result = matched;
    }

    if (minRating > 0) {
      result = result.filter((h) => (h.rating || 0) >= minRating);
    }

    if (maxPrice > 0) {
      result = result.filter((h) => (h.pricePerNight || 0) <= maxPrice);
    }

    if (selectedAmenities.length > 0) {
      result = result.filter((h) => {
        const itemAmenities = (h.amenities || "").toLowerCase();
        return selectedAmenities.every((a) => itemAmenities.includes(a.toLowerCase()));
      });
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
    } else if (sortBy === "rating_desc") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [allHotels, location, minRating, maxPrice, selectedAmenities, sortBy]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  return (
    <>
      <Head>
        <title>{location ? `Hotels in ${location} | MakeMyTour` : "Hotels & Stays Search | MakeMyTour"}</title>
        <meta
          name="description"
          content="Explore top rated hotels, resorts, and homestays fetched live from our database. Best price guarantee and free cancellation."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

        <header className="bg-white border-b border-slate-200/90 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5">
                <SearchSelect
                  placeholder="Where are you going?"
                  options={locationOptions}
                  isLoading={loading}
                  value={location}
                  onChange={setLocation}
                  icon={<MapPin className="w-4 h-4 text-blue-600" />}
                  subtitle="Destination city, area, or property"
                />
              </div>

              <div className="md:col-span-2">
                <div className="border border-slate-200 rounded-xl p-2.5 bg-white transition hover:border-blue-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check-in</div>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="text-xs font-bold text-slate-800 w-full bg-transparent border-none p-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="border border-slate-200 rounded-xl p-2.5 bg-white transition hover:border-blue-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check-out</div>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="text-xs font-bold text-slate-800 w-full bg-transparent border-none p-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="border border-slate-200 rounded-xl p-2.5 bg-white transition hover:border-blue-500">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guests</div>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value) || 2)}
                        className="text-xs font-bold text-slate-800 w-full bg-transparent border-none p-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  className="w-full h-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Update Search</span>
                </Button>
              </div>
            </form>
          </div>
        </header>

        <div className="bg-white/80 border-b border-slate-200/80 py-3 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-extrabold text-sm uppercase">
                {location ? `Hotels in ${location}` : "All Destinations"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                {filteredHotels.length} Properties Found
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-semibold shadow-sm"
              >
                <option value="recommended">Recommended Picks</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">User Rating: Highest First</option>
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span>Filter Properties</span>
                  </div>
                  {(selectedAmenities.length > 0 || minRating > 0) && (
                    <button
                      onClick={() => {
                        setSelectedAmenities([]);
                        setMinRating(0);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Guest Rating
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { val: 0, label: "Any Rating" },
                      { val: 4.5, label: "4.5+ Excellent" },
                      { val: 4.0, label: "4.0+ Very Good" },
                      { val: 3.5, label: "3.5+ Good" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setMinRating(item.val)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                          minRating === item.val
                            ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.val > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-600">Max Nightly Rate</span>
                    <span className="text-blue-700 font-black">₹{maxPrice.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="60000"
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value) || 50000)}
                    className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>₹1,000</span>
                    <span>₹60,000+</span>
                  </div>
                </div>

                {availableAmenities.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      Popular Amenities
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availableAmenities.map((amenity) => (
                        <label
                          key={amenity}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition border border-transparent hover:border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedAmenities.includes(amenity)}
                              onChange={() => toggleAmenity(amenity)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 font-medium">{amenity}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Free Cancellation Available</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>100% Live Database Pricing</span>
                  </div>
                </div>
              </div>
            </aside>

            <main className="lg:col-span-3 space-y-5">
              {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <Loader />
                  <p className="text-sm text-slate-500 mt-4 font-medium">Connecting to live database and fetching hotel listings...</p>
                </div>
              ) : filteredHotels.length > 0 ? (
                filteredHotels.map((hotel) => {
                  const hotelId = hotel.id || hotel._id;
                  const rawImg = (hotel.imageUrls && hotel.imageUrls.length > 0 && hotel.imageUrls[0]) || hotel.imageUrl;
                  const imageUrl = getDestinationImage(hotel.location, rawImg);
                  const rating = hotel.rating || hotel.reviewsRating || 4.5;
                  const price = hotel.pricePerNight || 4500;
                  const originalPrice = hotel.discountedPrice && hotel.discountedPrice > price ? hotel.discountedPrice : Math.round(price * 1.25);
                  const availableRooms = hotel.availableRooms ?? 5;

                  const amenityList = hotel.amenities
                    ? hotel.amenities
                        .split(/[,;|]/)
                        .map((a: string) => a.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                    : ["Free WiFi", "Swimming Pool", "Room Service"];

                  return (
                    <div
                      key={hotelId}
                      className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row hover:-translate-y-0.5"
                    >

                      <div className="md:w-80 h-56 md:h-auto relative overflow-hidden bg-slate-900 flex-shrink-0">
                        <img
                          src={imageUrl}
                          alt={hotel.hotelName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                          <Sparkles className="w-3 h-3 text-emerald-200" />
                          <span>98% Match</span>
                        </div>

                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                          HOTEL
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold mb-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{hotel.location}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-200">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-white">{rating.toFixed(1)}</span>
                            <span className="text-slate-300 font-normal">({hotel.reviewsCount || 128} reviews)</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                                {hotel.hotelName}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {hotel.roomType || "Luxury Deluxe Room"}
                                </span>
                                {hotel.roomFeatures && <span>• {hotel.roomFeatures}</span>}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 bg-blue-50/80 border border-blue-200/70 rounded-xl p-2.5 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-bold text-blue-900">Highly Recommended Stay: </span>
                              <span className="text-slate-600">Top-rated property by travelers booking trips in {hotel.location}. Verified amenities & instant check-in confirmation.</span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {amenityList.map((am: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/60"
                              >
                                {am}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Per Night Rate</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-slate-900">
                                ₹{price.toLocaleString()}
                              </span>
                              {originalPrice > price && (
                                <span className="text-xs text-slate-400 line-through">
                                  ₹{originalPrice.toLocaleString()}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                SAVE 20%
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">+ ₹{hotel.taxes || 0} taxes & service fees</div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {availableRooms < 4 && (
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                Only {availableRooms} left!
                              </span>
                            )}
                            <Button
                              onClick={() => router.push(`/book-hotel/${hotelId}`)}
                              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5"
                            >
                              <span>Explore & Book</span>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (

                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">
                    🏨
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    No Hotels Found {location ? `in "${location}"` : ""}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    We couldn't find properties matching your location and filter selection in the database. You can explore all available properties or search another city.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <Button
                      onClick={() => {
                        setLocation("");
                        setMinRating(0);
                        setSelectedAmenities([]);
                        fetchHotels("");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 shadow-md"
                    >
                      Browse All Database Hotels
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/")}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-5"
                    >
                      Return Home
                    </Button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
