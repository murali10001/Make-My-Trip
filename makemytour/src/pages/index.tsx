import { getflight, gethotel, getHomeContent } from "@/api";
import Loader from "@/components/Loader";
import { SearchSelect } from "@/components/SearchSelect";
import SignupDialog from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";
import {
  Bus,
  Calendar,
  Car,
  CreditCard,
  HomeIcon,
  Hotel,
  MapPin,
  Plane,
  QrCode,
  Shield,
  Train,
  Umbrella,
  Users,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

export default function Home() {
  const [bookingtype, setbookingtype] = useState("flights");
  const [from, setfrom] = useState("");
  const [to, setto] = useState("");
  const [date, setdate] = useState("");
  const [travelers, settravelers] = useState(1);
  const [searchresults, setsearchresult] = useState<any[]>([]);
  const [hotel, sethotel] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [flight, setflight] = useState<any[]>([]);
  const [homeContent, sethomeContent] = useState<any>(null);
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();

  useEffect(() => {
    const fetchdata = async () => {
      try {
        const data = await gethotel();
        sethotel(Array.isArray(data) ? data : []);
        const flightdata = await getflight();
        setflight(Array.isArray(flightdata) ? flightdata : []);
        const content = await getHomeContent();
        if (content) {
          sethomeContent(content);
        }
      } catch (error) {
        console.error("Fetch data error:", error);
        sethotel([]);
        setflight([]);
      } finally {
        setloading(false);
      }
    };

    fetchdata();
  }, [user]);

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    (flight || []).forEach((f) => {
      if (f?.from) cities.add(f.from);
      if (f?.to) cities.add(f.to);
    });
    (hotel || []).forEach((h) => {
      if (h?.location) cities.add(h.location);
    });
    return Array.from(cities).map((city) => ({ value: city, label: city }));
  }, [flight, hotel]);


  if (loading) {
    return <Loader />;
  }
  const handlesearch = () => {
    if (bookingtype === "flights") {
      const results = flight.filter(
        (FLIGHT) =>
          FLIGHT.from.toLowerCase() === from.toLowerCase() &&
          FLIGHT.to.toLowerCase() === to.toLowerCase()
      );
      setsearchresult(results);
    } else if (bookingtype === "hotels") {
      const results = hotel.filter(
        (hotel) => hotel.location.toLowerCase() === to.toLowerCase()
      );
      setsearchresult(results);
    }
  };
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(dateString);
    return date.toLocaleString("en-US", options);
  };
  const handlebooknow = (id: any) => {
    if (bookingtype === "flights") {
      router.push(`/book-flight/${id}`);
    } else {
      router.push(`/book-hotel/${id}`);
    }
  };
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950"
      style={{
        backgroundImage: homeContent?.heroBgUrl ? `url("${homeContent.heroBgUrl}")` : undefined,
      }}
    >
      <main className="container mx-auto px-4 py-6">
        <nav className="bg-white rounded-xl shadow-lg mx-auto max-w-5xl mb-6 p-4 overflow-x-auto">
          <div className="flex justify-between items-center min-w-max space-x-8">
            <NavItem
              icon={<Plane />}
              text="Flights"
              active={bookingtype === "flights"}
              onClick={() => setbookingtype("flights")}
            />
            <NavItem
              icon={<Hotel />}
              text="Hotels"
              active={bookingtype === "hotels"}
              onClick={() => setbookingtype("hotels")}
            />
            <NavItem
              icon={
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              }
              text="Live Flight Radar"
              active={false}
              onClick={() => router.push("/flight-status")}
            />
            <NavItem icon={<HomeIcon />} text="Homestays" />
            <NavItem icon={<Umbrella />} text="Holiday" />
            <NavItem icon={<Train />} text="Trains" />
            <NavItem icon={<Bus />} text="Buses" />
            <NavItem icon={<Car />} text="Cabs" />
            <NavItem icon={<CreditCard />} text="Forex" />
            <NavItem icon={<Shield />} text="Insurance" />
          </div>
        </nav>


        <div className="bg-white rounded-xl shadow-lg mx-auto max-w-5xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {bookingtype === "flights" && (
              <div className="col-span-1">
                <SearchSelect
                  options={cityOptions}
                  placeholder="From"
                  value={from}
                  onChange={setfrom}
                  icon={<MapPin className="text-gray-400" />}
                  subtitle="Enter city or airport"
                />
              </div>
            )}

            <div className="col-span-1">
              <SearchSelect
                options={cityOptions}
                placeholder={bookingtype === "flights" ? "To" : "City"}
                value={to}
                onChange={setto}
                icon={<MapPin className="text-gray-400" />}
                subtitle={
                  bookingtype === "flights"
                    ? "Enter city or airport"
                    : "Enter city"
                }
              />
            </div>

            <div className="col-span-1">
              <SearchInput
                icon={<Calendar className="text-gray-400" />}
                placeholder="Date"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setdate(e.target.value)
                }
                subtitle="Select a date"
                type="date"
              />
            </div>

            <div className="col-span-1">
              <SearchInput
                icon={<Users className="text-gray-400" />}
                placeholder="Travelers"
                value={travelers.toString()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  settravelers(parseInt(e.target.value) || 1)
                }
                subtitle="Number of travelers"
                type="number"
              />
            </div>

            <Button className="col-span-1 h-full" onClick={handlesearch}>
              SEARCH
            </Button>
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4 text-white">
              Search Results
            </h2>
            {searchresults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchresults.map((result) => (
                  <div
                    key={result.id || result._id}
                    className="bg-white rounded-lg shadow p-4 border border-gray-200"
                  >
                    {bookingtype === "flights" ? (
                      <>
                        <p className="font-semibold text-lg">
                          Flight Name: {result.flightName}
                        </p>
                        <h3 className="font-semibold text-lg">
                          {result.from} to {result.to}
                        </h3>
                        <p className="text-gray-600">
                          Departure Time: {formatDate(result.departureTime)}
                        </p>
                        <p className="text-gray-600">
                          Arrival Time: {formatDate(result.arrivalTime)}
                        </p>
                        <p className="text-lg font-bold mt-2">
                          ₹{result.price}
                        </p>
                        <Button
                          className="w-full mt-4"
                          onClick={() => handlebooknow(result.id || result._id)}
                        >
                          Book Now
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg">
                          {result.hotelName}
                        </h3>
                        <p className="text-gray-600">City: {result.location}</p>
                        <p className="text-lg font-bold mt-2">
                          ₹{result.pricePerNight} per night
                        </p>
                        <Button
                          className="w-full mt-4"
                          onClick={() => handlebooknow(result.id || result._id)}
                        >
                          Book Now
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No {bookingtype} available for the selected criteria.
              </p>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          {/* Offers Section */}
          <section className="my-16">
            <h2 className="text-2xl font-bold mb-8 text-white">Best Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(homeContent?.offers || []).map((offer: any, index: number) => (
                <OfferCard key={index} {...offer} />
              ))}
            </div>
          </section>

          {/* Collections Section */}
          <section className="my-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                Handpicked Collections for You
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(homeContent?.collections || []).map((collection: any, index: number) => (
                <CollectionCard key={index} {...collection} />
              ))}
            </div>
          </section>

          {/* Wonders Section */}
          <section className="my-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                Unlock Lesser-Known Wonders of India
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(homeContent?.wonders || []).map((wonder: any, index: number) => (
                <WonderCard key={index} {...wonder} />
              ))}
            </div>
          </section>

          {/* Download App Section */}
          <DownloadApp content={homeContent} />
        </div>
      </main>
    </div>
  );
}
const OfferCard = ({ title, description, imageUrl }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Book Now
        </button>
      </div>
    </div>
  );
};

const CollectionCard = ({ title, imageUrl, tag }: any) => {
  return (
    <div className="relative group cursor-pointer overflow-hidden rounded-lg">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70">
        <div className="absolute top-4 left-4">
          <span className="bg-white text-black text-sm font-semibold px-2 py-1 rounded">
            {tag}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-lg font-semibold">{title}</h3>
        </div>
      </div>
    </div>
  );
};
const DownloadApp = ({ content }: any) => {
  const appStoreBadge = content?.appStoreBadgeUrl || "https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg";
  const playStoreBadge = content?.playStoreBadgeUrl || "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg";

  return (
    // <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto my-12">
    //   <div className="flex flex-col md:flex-row items-center justify-between">
    //     <div className="mb-6 md:mb-0">
    //       <h3 className="text-xl font-bold mb-2">Download App Now!</h3>
    //       <p className="text-gray-600 mb-4">
    //         Get India's #1 travel super app with best deals on flights
    //       </p>
    //       <div className="flex space-x-4">
    //         <img
    //           src={appStoreBadge}
    //           alt="App Store"
    //           className="h-10"
    //         />
    //         <img
    //           src={playStoreBadge}
    //           alt="Play Store"
    //           className="h-10"
    //         />
    //       </div>
    //     </div>
    //     <div className="flex items-center space-x-4">
    //       <QrCode className="w-24 h-24" />
    //       <p className="text-sm text-gray-600">
    //         Scan QR code to download the app
    //       </p>
    //     </div>
    //   </div>
    // </div>
    <>  </>
  );
};

const WonderCard = ({ title, imageUrl }: any) => {
  return (
    <div className="relative group cursor-pointer overflow-hidden rounded-lg">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70">
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-lg font-semibold">{title}</h3>
        </div>
      </div>
    </div>
  );
};
function NavItem({ icon, text, active = false, onClick }: any) {
  return (
    <button
      className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
        active ? "text-blue-500" : "text-gray-600 hover:text-blue-500"
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm mt-1 whitespace-nowrap">{text}</span>
    </button>
  );
}

function SearchInput({
  icon,
  placeholder,
  value,
  onChange,
  subtitle,
  type = "text",
}: any) {
  return (
    <div className="border rounded-lg p-3 hover:border-blue-500 cursor-pointer h-full">
      <div className="flex items-center space-x-2">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 truncate">{placeholder}</div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            className="font-semibold w-full bg-transparent outline-none"
            placeholder={placeholder}
          />
          <div className="text-xs text-gray-400 truncate">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
