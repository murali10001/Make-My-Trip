"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Textarea } from "@/components/ui/textarea";
import FlightList from "@/components/Flights/Flightlist";
import {
  addflight,
  addhotel,
  editflight,
  edithotel,
  getuserbyemail,
} from "@/api";
import HotelList from "@/components/Hotel/Hotel";
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber: string;
}

function UserSearch() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await getuserbyemail(email);
    const userData: User = data;
    setUser(userData);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Search user by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit">Search</Button>
      </form>
      {user && (
        <div className="border p-4 rounded-md">
          <h3 className="font-bold mb-2">User Details</h3>
          <p>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
          <p>
            <strong>Phone:</strong> {user.phoneNumber}
          </p>
        </div>
      )}
    </div>
  );
}

interface Hotel {
  id?: string;
  _id?: string;
  hotelName: string;
  location: string;
  pricePerNight: number;
  availableRooms: number;
  amenities: string;
  imageUrl?: string;
  description?: string;
  rating?: number;
  taxes?: number;
  discountedPrice?: number;
  roomType?: string;
  roomFeatures?: string;
}

function AddEditHotel({ hotel }: { hotel: Hotel | null }) {
  const [formData, setFormData] = useState<Hotel>({
    hotelName: "",
    location: "",
    pricePerNight: 0,
    availableRooms: 0,
    amenities: "",
    imageUrl: "",
    description: "",
    rating: 4,
    taxes: 0,
    discountedPrice: 0,
    roomType: "Standard Room",
    roomFeatures: "Free Wi-Fi, Welcome Drink",
  });

  useEffect(() => {
    if (hotel) {
      setFormData({
        ...hotel,
        id: hotel.id || hotel._id,
        imageUrl: hotel.imageUrl || "",
        description: hotel.description || "",
        rating: hotel.rating || 4,
        taxes: hotel.taxes || 0,
        discountedPrice: hotel.discountedPrice || 0,
        roomType: hotel.roomType || "Standard Room",
        roomFeatures: hotel.roomFeatures || "",
      });
    } else {
      setFormData({
        hotelName: "",
        location: "",
        pricePerNight: 0,
        availableRooms: 0,
        amenities: "",
        imageUrl: "",
        description: "",
        rating: 4,
        taxes: 0,
        discountedPrice: 0,
        roomType: "Standard Room",
        roomFeatures: "Free Wi-Fi, Welcome Drink",
      });
    }
  }, [hotel]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = hotel?.id || hotel?._id;
    if (targetId) {
      await edithotel(targetId, formData);
      alert("Hotel updated successfully!");
      return;
    }
    await addhotel(formData);
    alert("Hotel added successfully!");
    setFormData({
      hotelName: "",
      location: "",
      pricePerNight: 0,
      availableRooms: 0,
      amenities: "",
      imageUrl: "",
      description: "",
      rating: 4,
      taxes: 0,
      discountedPrice: 0,
      roomType: "Standard Room",
      roomFeatures: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[650px] overflow-y-auto p-2">
      <h3 className="text-lg font-semibold mb-2">
        {hotel ? "Edit Hotel" : "Add New Hotel"}
      </h3>
      <div>
        <Label htmlFor="hotelName">Hotel Name</Label>
        <Input
          id="hotelName"
          name="hotelName"
          value={formData.hotelName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <Label htmlFor="imageUrl">Hotel Main Image URL (DB Image)</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          placeholder="https://example.com/hotel-image.jpg"
          value={formData.imageUrl}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="pricePerNight">Price Per Night (₹)</Label>
        <Input
          id="pricePerNight"
          name="pricePerNight"
          type="number"
          value={formData.pricePerNight}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <Label htmlFor="availableRooms">Available Rooms</Label>
        <Input
          id="availableRooms"
          name="availableRooms"
          type="number"
          value={formData.availableRooms}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Hotel Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="amenities">Amenities (comma-separated)</Label>
        <Textarea
          id="amenities"
          name="amenities"
          value={formData.amenities}
          onChange={handleChange}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="taxes">Taxes & Fees (₹)</Label>
          <Input
            id="taxes"
            name="taxes"
            type="number"
            value={formData.taxes}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="discountedPrice">Discount Amount (₹)</Label>
          <Input
            id="discountedPrice"
            name="discountedPrice"
            type="number"
            value={formData.discountedPrice}
            onChange={handleChange}
          />
        </div>
      </div>
      <Button type="submit">{hotel ? "Update Hotel" : "Add Hotel"}</Button>
    </form>
  );
}

interface Flight {
  id?: string;
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

function AddEditFlight({ flight }: { flight: Flight | null }) {
  const [formData, setFormData] = useState<Flight>({
    flightName: "",
    from: "",
    to: "",
    departureTime: "",
    arrivalTime: "",
    price: 0,
    availableSeats: 0,
    flightNo: "",
    aircraft: "Airbus A320",
    airline: "",
    duration: "2h 30m",
    departureTerminal: "",
    arrivalTerminal: "",
    cabinBaggage: "7 Kgs / Adult",
    checkInBaggage: "15 Kgs (1 piece only) / Adult",
    taxes: 0,
    otherServices: 0,
    discounts: 0,
  });

  useEffect(() => {
    if (flight) {
      setFormData({
        ...flight,
        id: flight.id || flight._id,
        flightNo: flight.flightNo || "",
        aircraft: flight.aircraft || "Airbus A320",
        airline: flight.airline || flight.flightName,
        duration: flight.duration || "2h 30m",
        departureTerminal: flight.departureTerminal || "",
        arrivalTerminal: flight.arrivalTerminal || "",
        cabinBaggage: flight.cabinBaggage || "7 Kgs / Adult",
        checkInBaggage: flight.checkInBaggage || "15 Kgs (1 piece only) / Adult",
        taxes: flight.taxes || 0,
        otherServices: flight.otherServices || 0,
        discounts: flight.discounts || 0,
      });
    } else {
      setFormData({
        flightName: "",
        from: "",
        to: "",
        departureTime: "",
        arrivalTime: "",
        price: 0,
        availableSeats: 0,
        flightNo: "",
        aircraft: "Airbus A320",
        airline: "",
        duration: "2h 30m",
        departureTerminal: "",
        arrivalTerminal: "",
        cabinBaggage: "7 Kgs / Adult",
        checkInBaggage: "15 Kgs (1 piece only) / Adult",
        taxes: 0,
        otherServices: 0,
        discounts: 0,
      });
    }
  }, [flight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = flight?.id || flight?._id;
    if (targetId) {
      await editflight(targetId, formData);
      alert("Flight updated successfully!");
      return;
    }
    await addflight(formData);
    alert("Flight added successfully!");
    setFormData({
      flightName: "",
      from: "",
      to: "",
      departureTime: "",
      arrivalTime: "",
      price: 0,
      availableSeats: 0,
      flightNo: "",
      aircraft: "Airbus A320",
      airline: "",
      duration: "2h 30m",
      departureTerminal: "",
      arrivalTerminal: "",
      cabinBaggage: "7 Kgs / Adult",
      checkInBaggage: "15 Kgs (1 piece only) / Adult",
      taxes: 0,
      otherServices: 0,
      discounts: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[650px] overflow-y-auto p-2">
      <h3 className="text-lg font-semibold mb-2">
        {flight ? "Edit Flight" : "Add New Flight"}
      </h3>
      <div>
        <Label htmlFor="flightName">Flight Name</Label>
        <Input
          id="flightName"
          name="flightName"
          value={formData.flightName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="from">From (City)</Label>
          <Input
            id="from"
            name="from"
            value={formData.from}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="to">To (City)</Label>
          <Input
            id="to"
            name="to"
            value={formData.to}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="departureTime">Departure Time</Label>
          <Input
            id="departureTime"
            name="departureTime"
            type="datetime-local"
            value={formData.departureTime}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="arrivalTime">Arrival Time</Label>
          <Input
            id="arrivalTime"
            name="arrivalTime"
            type="datetime-local"
            value={formData.arrivalTime}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price (₹)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="availableSeats">Available Seats</Label>
          <Input
            id="availableSeats"
            name="availableSeats"
            type="number"
            value={formData.availableSeats}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="flightNo">Flight Number (e.g. AI-202)</Label>
          <Input
            id="flightNo"
            name="flightNo"
            value={formData.flightNo}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="aircraft">Aircraft Type</Label>
          <Input
            id="aircraft"
            name="aircraft"
            value={formData.aircraft}
            onChange={handleChange}
          />
        </div>
      </div>
      <Button type="submit">{flight ? "Update Flight" : "Add Flight"}</Button>
    </form>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("flights");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);

  return (
    <div className="container mx-auto p-4 bg-white max-w-full">
      <h1 className="text-3xl font-bold mb-6 ">Admin Dashboard</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3  text-black">
          <TabsTrigger value="flights">Flights</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="flights">
          <Card>
            <CardHeader>
              <CardTitle>Manage Flights</CardTitle>
              <CardDescription>
                Add, edit, or remove flights from the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <FlightList onSelect={setSelectedFlight} />
                <AddEditFlight flight={selectedFlight} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hotels">
          <Card>
            <CardHeader>
              <CardTitle>Manage Hotels</CardTitle>
              <CardDescription>
                Add, edit, or remove hotels from the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <HotelList onSelect={setSelectedHotel} />
                <AddEditHotel hotel={selectedHotel} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search for users by email.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSearch />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
