import { useRouter } from "next/router";
import {
  Star,
  MapPin,
  School as Pool,
  UtensilsCrossed,
  Wine,
  Power,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  CreditCard,
  Ticket,
  Home,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { gethotel, handlehotelbooking } from "@/api";

interface Hotel {
  id: string;
  _id?: string;
  hotelName: string;
  location: string;
  pricePerNight: number;
  availableRooms: number;
  amenities: string;
  imageUrl?: string;
  imageUrls?: string[];
  description?: string;
  rating?: number;
  taxes?: number;
  discountedPrice?: number;
  roomType?: string;
  roomFeatures?: string;
  propertyPhotos?: number;
  guestPhotos?: number;
  reviewsCount?: number;
  reviewsRating?: number;
  reviewsText?: string;
  distance?: string;
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
import { useDispatch, useSelector } from "react-redux";
import SignupDialog from "@/components/SignupDialog";
import Loader from "@/components/Loader";
import { setUser } from "@/store";

const BookHotelPage = () => {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const { id } = router.query;
  const [hotels, sethotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: any) => state.user.user);
  const [open, setopem] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchhotels = async () => {
      try {
        const data = await gethotel();
        const filteredData = data.filter((hotel: any) => (hotel.id === id || hotel._id === id));
        sethotels(filteredData);
      } catch (error) {
        console.error("Error fetching hotels:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchhotels();
  }, [id]);

  if (loading) {
    return <Loader />;
  }

  if (hotels.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hotel Not Found</h2>
          <p className="text-gray-600 mb-4">No hotel information could be found for ID: {id}</p>
          <Button onClick={() => router.push("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const hotel = hotels[0];

  // Dynamic values derived from DB hotel entity
  const mainImage = hotel.imageUrl || (hotel.imageUrls && hotel.imageUrls[0]) || "";
  const secondaryImage = (hotel.imageUrls && hotel.imageUrls[1]) || hotel.imageUrl || "";
  const tertiaryImage = (hotel.imageUrls && hotel.imageUrls[2]) || hotel.imageUrl || "";

  const rating = Math.min(5, Math.max(1, Math.round(hotel.rating || 4)));
  const description = hotel.description || `${hotel.hotelName} is located in ${hotel.location}, providing comfort, modern amenities, and pleasant accommodation.`;
  const amenitiesList = hotel.amenities ? hotel.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [];
  const roomType = hotel.roomType || "Standard Room";
  const roomFeaturesList = hotel.roomFeatures
    ? hotel.roomFeatures.split(",").map((f) => f.trim()).filter(Boolean)
    : ["No meals included", "10% off on food & beverage services", "Complimentary welcome drink", "Non-Refundable"];
  
  const taxesPerNight = hotel.taxes || Math.round(hotel.pricePerNight * 0.12);
  const discountPerNight = hotel.discountedPrice || Math.round(hotel.pricePerNight * 0.05);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = Number.parseInt(e.target.value);
    setQuantity(
      isNaN(value) ? 1 : Math.max(1, Math.min(value, hotel.availableRooms || 1))
    );
  };

  const totalPrice = hotel.pricePerNight * quantity;
  const totalTaxes = taxesPerNight * quantity;
  const totalDiscounts = discountPerNight * quantity;
  const grandTotal = totalPrice + totalTaxes - totalDiscounts;

  const handlebooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await handlehotelbooking(
        user?.id || user?._id,
        hotel?.id || hotel?._id,
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
      console.error("Booking error:", error);
    }
  };

  const HotelContent = () => (
    <DialogContent className="sm:max-w-[600px] bg-white">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold flex items-center">
          <Home className="w-6 h-6 mr-2" />
          Hotel Booking Details
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hotelName" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Hotel Name
            </Label>
            <Input id="hotelName" value={hotel.hotelName} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </Label>
            <Input id="location" value={hotel.location} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricePerNight" className="flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Price Per Night
            </Label>
            <Input
              id="pricePerNight"
              value={`₹ ${hotel.pricePerNight}`}
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableRooms" className="flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Available Rooms
            </Label>
            <Input id="availableRooms" value={hotel.availableRooms} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Number of Rooms to Book
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={hotel.availableRooms}
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
              <span className="text-gray-600">Taxes and Extracharges</span>
              <span className="font-medium">
                ₹ {totalTaxes.toLocaleString()}
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
      <Button className="w-full mt-4" onClick={handlebooking}>
        Proceed to Payment
      </Button>
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-2 text-sm">
            <a href="/" className="text-blue-500 hover:underline">
              Home
            </a>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-blue-500">{hotel.location}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{hotel.hotelName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hotel Title & Rating */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{hotel.hotelName}</h1>
              <div className="flex items-center space-x-1">
                {[...Array(rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                  />
                ))}
                {[...Array(5 - rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-gray-300" />
                ))}
                <span className="ml-2 text-sm text-gray-500">
                  ({hotel.reviewsRating || 4.2} / 5)
                </span>
              </div>
            </div>

            {/* Dynamic Image Gallery */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="col-span-2 relative group rounded-lg overflow-hidden bg-gray-200 h-80 flex items-center justify-center">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={hotel.hotelName}
                    className="w-full h-80 object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <Camera className="w-12 h-12 mb-2" />
                    <span>No image uploaded for this hotel</span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                  <Camera className="w-4 h-4" />
                  <span className="text-sm">
                    {hotel.propertyPhotos || (hotel.imageUrls?.length || 1)} Property Photos
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="relative group rounded-lg overflow-hidden bg-gray-200 h-[152px] flex items-center justify-center">
                  {secondaryImage ? (
                    <img
                      src={secondaryImage}
                      alt={`${hotel.hotelName} View`}
                      className="w-full h-[152px] object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-xs text-gray-400">No Photo</div>
                  )}
                </div>
                <div className="relative group rounded-lg overflow-hidden bg-gray-200 h-[152px] flex items-center justify-center">
                  {tertiaryImage ? (
                    <img
                      src={tertiaryImage}
                      alt={`${hotel.hotelName} Interior`}
                      className="w-full h-[152px] object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-xs text-gray-400">No Photo</div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">
                      {hotel.guestPhotos || 12} Guest Photos
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">About the Property</h2>
              <p className="text-gray-600 leading-relaxed">{description}</p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Amenities</h2>
              {amenitiesList.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {amenitiesList.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-gray-700 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Standard hotel amenities available.</p>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-2">{roomType}</h3>
              <p className="text-gray-600 mb-4">Location: {hotel.location}</p>

              <ul className="space-y-3 mb-6">
                {roomFeaturesList.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-6 border-t border-b py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-semibold">Price Per Night:</span>
                  <span className="text-lg font-bold text-gray-900">₹ {hotel.pricePerNight}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-semibold">Available Rooms:</span>
                  <span className="text-lg font-medium text-gray-800">{hotel.availableRooms}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Base Rate:</span>
                  <span>₹ {totalPrice}</span>
                </div>
                <div className="flex items-center justify-between text-2xl font-bold">
                  <span>₹ {grandTotal}</span>
                  <span className="text-xs text-gray-500 font-normal">
                    + ₹ {totalTaxes} taxes & fees
                  </span>
                </div>
              </div>

              <Dialog open={open} onOpenChange={setopem}>
                <DialogTrigger asChild>
                  <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-3">
                    BOOK THIS NOW
                  </button>
                </DialogTrigger>
                {user ? (
                  <HotelContent />
                ) : (
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Login Required</DialogTitle>
                    </DialogHeader>
                    <p>Please log in to continue with your booking.</p>
                    <SignupDialog
                      trigger={
                        <Button className="w-full">Log In / Sign Up</Button>
                      }
                    />
                  </DialogContent>
                )}
              </Dialog>
            </div>

            {/* Rating Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-600 text-white text-2xl font-bold w-14 h-14 rounded-lg flex items-center justify-center">
                    {hotel.reviewsRating || 4.2}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {hotel.reviewsText || "Very Good"}
                    </div>
                    <div className="text-gray-500 text-sm">
                      ({hotel.reviewsCount || 120} ratings)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{hotel.location}</h3>
                  <p className="text-sm text-gray-500">{hotel.distance || "Prime location with easy accessibility."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookHotelPage;

