import { useRouter } from "next/router";

import {
  Plane,
  Luggage,
  Clock,
  Calendar,
  MapPin,
  Gift,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Star,
  Info,
  ArrowRight,
  Building2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getflight, gethotel, handleflightbooking } from "@/api";
import { useDispatch, useSelector } from "react-redux";

interface Flight {
  id: string;
  _id?: string;
  flightName: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  flightNo?: string;
  aircraft?: string;
  airline?: string;
  duration?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  cabinBaggage?: string;
  checkInBaggage?: string;
  taxes?: number;
  otherServices?: number;
  discounts?: number;
}

interface HotelOffer {
  id?: string;
  _id?: string;
  hotelName: string;
  location: string;
  pricePerNight: number;
  rating?: number;
  imageUrl?: string;
  imageUrls?: string[];
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket } from "lucide-react";
import SignupDialog from "@/components/SignupDialog";
import Loader from "@/components/Loader";
import { setUser } from "@/store";

const BookFlightPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [flights, setFlights] = useState<Flight[]>([]);
  const [dbHotels, setDbHotels] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [open, setopem] = useState(false);
  const user = useSelector((state: any) => state.user.user);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const flightData = await getflight();
        const filteredData = flightData.filter((f: any) => (f.id === id || f._id === id));
        setFlights(filteredData);

        const hotelData = await gethotel();
        setDbHotels(Array.isArray(hotelData) ? hotelData.slice(0, 3) : []);
      } catch (error) {
        console.error("Error fetching flight booking data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, user]);

  if (loading) {
    return <Loader />;
  }

  if (flights.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Flight Not Found</h2>
          <p className="text-gray-600 mb-4">No flight data available for ID: {id}</p>
          <Button onClick={() => router.push("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const flight = flights[0];

  // Extended properties derived dynamically from DB flight object
  const flightNo = flight.flightNo || `FL-${(flight.id || flight._id || '101').substring(0, 5).toUpperCase()}`;
  const aircraft = flight.aircraft || "Airbus A320";
  const airline = flight.airline || flight.flightName;
  const duration = flight.duration || "3h 30m ";
  const departureTerminal = flight.departureTerminal || `${flight.from} International Airport, Terminal T2`;
  const arrivalTerminal = flight.arrivalTerminal || `${flight.to} International Airport, Terminal T3`;
  const cabinBaggage = flight.cabinBaggage || "7 Kgs / Adult";
  const checkInBaggage = flight.checkInBaggage || "15 Kgs (1 piece only) / Adult";

  const taxesPerTicket = flight.taxes || Math.round(flight.price * 0.15);
  const otherServicesPerTicket = flight.otherServices || 150;
  const discountsPerTicket = flight.discounts || 200;

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleString("en-US", options);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = Number.parseInt(e.target.value);
    setQuantity(
      isNaN(value) ? 1 : Math.max(1, Math.min(value, flight.availableSeats || 1))
    );
  };

  const totalPrice = flight.price * quantity;
  const totalTaxes = taxesPerTicket * quantity;
  const totalOtherServices = otherServicesPerTicket * quantity;
  const totalDiscounts = discountsPerTicket * quantity;
  const grandTotal = totalPrice + totalTaxes + totalOtherServices - totalDiscounts;

  const handlebooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await handleflightbooking(
        user?.id || user?._id,
        flight?.id || flight?._id,
        quantity,
        grandTotal
      );
      const updateuser = {
        ...user,
        bookings: [...(user?.bookings || []), data],
      };
      dispatch(setUser(updateuser));
      setopem(false);
      setQuantity(1);
      router.push("/profile");
    } catch (error) {
      console.error("Booking failed:", error);
    }
  };

  const BookingContent = () => (
    <DialogContent className="sm:max-w-[600px] bg-white">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold flex items-center">
          <Plane className="w-6 h-6 mr-2 text-blue-600" />
          Flight Booking Details
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="flightName" className="flex items-center">
              <Plane className="w-4 h-4 mr-2" />
              Flight Name
            </Label>
            <Input id="flightName" value={flight.flightName} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              From
            </Label>
            <Input id="from" value={flight.from} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              To
            </Label>
            <Input id="to" value={flight.to} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureTime" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Departure Time
            </Label>
            <Input
              id="departureTime"
              value={formatDate(flight.departureTime)}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrivalTime" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Arrival Time
            </Label>
            <Input
              id="arrivalTime"
              value={formatDate(flight.arrivalTime)}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Number of Tickets
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={flight.availableSeats}
              value={quantity}
              onChange={handleQuantityChange}
            />
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Fare Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-medium">
                ₹ {totalPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taxes and Surcharges</span>
              <span className="font-medium">
                ₹ {totalTaxes.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Other Services</span>
              <span className="font-medium">
                ₹ {totalOtherServices.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-green-600">
              <span className="font-medium">Discounts</span>
              <span className="font-medium">
                - ₹ {Math.abs(totalDiscounts).toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-lg">
                  ₹ {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Button className="w-full mt-4 bg-red-600 hover:bg-red-700" onClick={handlebooking}>
        Proceed to Payment
      </Button>
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flight Details */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex items-center flex-wrap gap-4 mb-2">
                    <h2 className="text-lg font-bold flex items-center">
                      <span>{flight.from}</span>
                      <ArrowRight className="w-5 h-5 mx-2" />
                      <span>{flight.to}</span>
                    </h2>
                    <span className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-full font-medium">
                      CANCELLATION FEES APPLY
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(flight.departureTime)}</span>
                    <span className="mx-2">•</span>
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Non Stop - {duration}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plane className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{flight.flightName} ({airline})</div>
                  <div className="text-sm text-gray-600">
                    {flightNo} • {aircraft}
                  </div>
                </div>
                <div className="ml-auto text-sm">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                    Economy
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-6 border-t pt-6">
                <div>
                  <div className="text-xl font-bold">
                    {formatDate(flight.departureTime)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex items-start">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                    {departureTerminal}
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <div className="text-sm text-gray-600 mb-1">{duration}</div>
                  <div className="w-32 h-0.5 bg-gray-300 relative my-2">
                    <div className="absolute -top-2 right-0 w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                      <Plane className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Non-stop</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    {formatDate(flight.arrivalTime)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex items-start justify-end">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                    {arrivalTerminal}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-600 border-t pt-4">
                <div className="flex items-center">
                  <Luggage className="w-5 h-5 mr-2 text-gray-500" />
                  <span>Cabin Baggage: {cabinBaggage}</span>
                </div>
                <div className="flex items-center">
                  <Luggage className="w-5 h-5 mr-2 text-gray-500" />
                  <span>Check-in Baggage: {checkInBaggage}</span>
                </div>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                  Cancellation & Date Change Policy
                </h2>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Plane className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-semibold">{flight.from} - {flight.to}</span>
                  </div>
                  <div className="font-bold text-lg">Standard Refundable Fee Applies</div>
                </div>
                <div className="h-2.5 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"></div>
              </div>
            </div>

            {/* Dynamic Hotel Offers from DB */}
            {dbHotels.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center">
                    <Gift className="w-5 h-5 mr-2 text-red-500" />
                    Hotels Available in Database
                  </h2>
                  <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full font-medium">
                    DB Special
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {dbHotels.map((h, index) => (
                    <div
                      key={h.id || h._id || index}
                      className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/book-hotel/${h.id || h._id}`)}
                    >
                      <div className="relative h-40 bg-gray-200 flex items-center justify-center">
                        {h.imageUrl || (h.imageUrls && h.imageUrls[0]) ? (
                          <img
                            src={h.imageUrl || (h.imageUrls && h.imageUrls[0])}
                            alt={h.hotelName}
                            className="w-full h-40 object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400">
                            <Building2 className="w-8 h-8 mb-1" />
                            <span className="text-xs">{h.hotelName}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-base mb-1 truncate">
                          {h.hotelName}
                        </h3>
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                          <MapPin className="w-3 h-3 mr-1" />
                          {h.location}
                        </div>
                        <div className="flex items-center justify-between mt-2 border-t pt-2">
                          <div className="text-xs text-gray-500">Per Night</div>
                          <div className="font-bold text-base text-blue-600">
                            ₹ {h.pricePerNight}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fare Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-6 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                Fare Summary
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base Fare ({quantity} Ticket{quantity > 1 ? 's' : ''})</span>
                  <span className="font-medium">
                    ₹ {totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxes and Surcharges</span>
                  <span className="font-medium">
                    ₹ {totalTaxes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Other Services</span>
                  <span className="font-medium">
                    ₹ {totalOtherServices.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">Discounts</span>
                  <span className="font-medium">
                    - ₹ {Math.abs(totalDiscounts).toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total Amount</span>
                    <span className="font-bold text-lg">
                      ₹ {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <Dialog open={open} onOpenChange={setopem}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white mt-6 py-6 text-base">
                    Book Now
                  </Button>
                </DialogTrigger>
                {user ? (
                  <BookingContent />
                ) : (
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Login Required</DialogTitle>
                    </DialogHeader>
                    <p>Please log in to continue with your flight booking.</p>
                    <SignupDialog
                      trigger={
                        <Button className="w-full">Log In / Sign Up</Button>
                      }
                    />
                  </DialogContent>
                )}
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookFlightPage;

