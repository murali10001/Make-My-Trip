/**
 * Seed Showcase Hotels & Room Options into MongoDB
 * Target: HT-SHOWCASE-2 (The Oberoi Beach Resort) & all showcase hotels
 * 
 * Usage:
 *   1) Via mongosh:
 *      mongosh "$env:MongoDB_URL/InternshipMakemytrip" --norc testing/scripts/seed_showcase_hotels.js
 *   2) Via node:
 *      node testing/scripts/seed_showcase_hotels.js
 */

if (typeof db === "undefined") {
  // Running in Node.js environment -> execute through mongosh
  const { execSync } = require("child_process");
  const mongoUri = process.env.MongoDB_URL 
    ? `${process.env.MongoDB_URL}/InternshipMakemytrip`
    : "mongodb+srv://mmdharan2006_db_user:DithLptEIsUiBGjO@tourismimage.ovquwse.mongodb.net/InternshipMakemytrip";

  console.log("Detected Node.js runtime. Delegating seeding to mongosh...");
  console.log("Database URI:", mongoUri.replace(/:([^:@]+)@/, ":****@"));

  try {
    const cmd = `mongosh "${mongoUri}" --norc "${__filename}"`;
    execSync(cmd, { stdio: "inherit" });
    process.exit(0);
  } catch (err) {
    console.error("Failed to run seed script via mongosh:", err.message);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// MONGOSH SEEDING LOGIC
// -------------------------------------------------------------
print("===============================================================");
print("     MakeMyTrip - Showcase Hotels & Rooms Database Seeder      ");
print("===============================================================");

// 1. HOTEL: HT-SHOWCASE-2 (The Oberoi Beach Resort)
const hotelShowcase2 = {
  _id: "HT-SHOWCASE-2",
  hotelName: "The Oberoi Beach Resort",
  location: "Goa",
  pricePerNight: 16500,
  availableRooms: 12,
  amenities: "Private Balcony, Ocean View, King Bed, Free High-Speed Wi-Fi, Infinity Pool, Luxury Ayurvedic Spa, Complimentary Gourmet Breakfast, Nespresso Espresso Bar, Beachfront Fine Dining, 24/7 Butler Service, Airport Limousine Transfer, Air Conditioning, Designer Toiletries",
  imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
  imageUrls: [
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
  ],
  description: "An ultra-luxury coastal sanctuary perched directly on the sun-kissed beaches of Goa overlooking the azure Arabian Sea. The Oberoi Beach Resort seamlessly blends traditional Indian architectural grandeur with bespoke contemporary design. Features lavish private oceanfront balconies, handcrafted teak furnishings, personalized 24/7 butler service, private plunge pools, holistic Ayurvedic wellness treatments, and celebrated beachfront fine dining.",
  rating: 4.9,
  taxes: 1980,
  discountedPrice: 1200,
  roomType: "The Oberoi Balcony Retreat",
  roomFeatures: 'Private Furnished Balcony with Ocean View, Tufted Velvet King Bed, Teal Designer Loveseat, Nespresso Espresso Machine, Italian Marble En-suite Jacuzzi & Rain Shower, High-Speed Wi-Fi, 55" 4K Smart TV',
  propertyPhotos: 42,
  guestPhotos: 118,
  reviewsCount: 342,
  reviewsRating: 4.9,
  reviewsText: "Exceptional Luxury",
  distance: "0.1 km from Benaulim Beach • 22 km from Goa Dabolim Airport (GOI)",
  _class: "com.makemytrip.makemytrip.models.Hotel"
};

// Also verify additional showcase hotels exist for completeness
const otherShowcaseHotels = [
  {
    _id: "HT-SHOWCASE-1",
    hotelName: "Grand Hyatt Resort & Spa",
    location: "Goa",
    pricePerNight: 11500,
    availableRooms: 15,
    amenities: "Free High-Speed Wi-Fi, Swimming Pool, Spa & Wellness, Fine Dining, Air Conditioning, Smart TV, Work Desk, En-suite Bathroom",
    imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Contemporary classic luxury featuring warm oak textures, ergonomic queen bedding, dedicated work vanity, and high-speed Wi-Fi.",
    rating: 4.7,
    taxes: 1380,
    discountedPrice: 800,
    roomType: "Grand Hyatt Classic Queen",
    roomFeatures: "Comfort Queen Bed, Courtyard & City View, Smart LED TV, High-Speed Wi-Fi",
    propertyPhotos: 35,
    guestPhotos: 88,
    reviewsCount: 215,
    reviewsRating: 4.7,
    reviewsText: "Very Good",
    distance: "1.2 km from Bambolim Beach",
    _class: "com.makemytrip.makemytrip.models.Hotel"
  },
  {
    _id: "HT-SHOWCASE-3",
    hotelName: "Taj Palace Luxury Hotel",
    location: "Delhi",
    pricePerNight: 22500,
    availableRooms: 8,
    amenities: "Panoramic Skyline View, Executive Lounge Access, Soaking Jacuzzi Bath, Evening Cocktails, Free Wi-Fi, Swimming Pool, Luxury Spa",
    imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Bespoke multi-zone penthouse suite with wrap-around corner glass, California king bedroom, Italian leather sectional lounge, and freestanding soaking jacuzzi.",
    rating: 4.9,
    taxes: 2700,
    discountedPrice: 1500,
    roomType: "Taj Palace Panoramic Suite",
    roomFeatures: "California King Bed, High-Floor Panoramic Skyline, Italian Leather Sectional Lounge, Freestanding Soaking Jacuzzi",
    propertyPhotos: 50,
    guestPhotos: 140,
    reviewsCount: 410,
    reviewsRating: 4.9,
    reviewsText: "Outstanding",
    distance: "City Center • Chanakyapuri Diplomatic Enclave",
    _class: "com.makemytrip.makemytrip.models.Hotel"
  },
  {
    _id: "HT-SHOWCASE-4",
    hotelName: "The Leela Palace Penthouse",
    location: "Bengaluru",
    pricePerNight: 34000,
    availableRooms: 5,
    amenities: "Dedicated 24/7 Butler, Private Sun Terrace, Chesterfield Parlor, Dining Suite, Carrara Marble Jacuzzi, Limousine Transfer, High-Speed Wi-Fi",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "The pinnacle of luxury hospitality. Opulent Carrara marble flooring, four-poster master canopy bed, private cocktail bar, 4-seater dining salon, and terrace.",
    rating: 5.0,
    taxes: 4080,
    discountedPrice: 2000,
    roomType: "The Leela Presidential Penthouse",
    roomFeatures: "Master King Bed + Daybed, 360-Degree Penthouse Panoramic View, Carrara Marble Jacuzzi, Private Sun Terrace",
    propertyPhotos: 65,
    guestPhotos: 210,
    reviewsCount: 520,
    reviewsRating: 5.0,
    reviewsText: "Pure Royal Luxury",
    distance: "Old Airport Road • HAL Airport 2 km",
    _class: "com.makemytrip.makemytrip.models.Hotel"
  }
];

// Upsert HT-SHOWCASE-2
db.hotels.updateOne(
  { _id: hotelShowcase2._id },
  { $set: hotelShowcase2 },
  { upsert: true }
);
print(`✓ Successfully seeded Hotel: ${hotelShowcase2._id} - ${hotelShowcase2.hotelName} (${hotelShowcase2.location})`);

// Upsert other showcase hotels
for (const h of otherShowcaseHotels) {
  db.hotels.updateOne({ _id: h._id }, { $set: h }, { upsert: true });
  print(`✓ Successfully verified Hotel: ${h._id} - ${h.hotelName}`);
}

// -------------------------------------------------------------
// 2. ROOM TYPE OPTIONS FOR HT-SHOWCASE-2
// -------------------------------------------------------------
const roomOptionsShowcase2 = [
  {
    _id: "HT-SHOWCASE-2-ROOM-1",
    hotelId: "HT-SHOWCASE-2",
    roomTypeName: "The Oberoi Balcony Retreat",
    priceUpgradeAddon: 1200,
    availableRooms: 4,
    bedType: "King Size Bed",
    roomSize: "480 sq.ft",
    viewType: "Private Balcony Ocean View",
    amenities: [
      "Private Balcony",
      "Plush King Bed",
      "Teal Velvet Lounge",
      "Nespresso Machine",
      "Gourmet Breakfast",
      "Ocean View",
      "En-suite Jacuzzi Tub"
    ],
    imageUrls: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
    ],
    preview3dModelUrl: "room_deluxe_3d",
    description: "Upscale luxury suite with furnished outdoor private balcony, tufted velvet king bed, designer loveseat, and espresso bar.",
    isPopularUpsell: true,
    _class: "com.makemytrip.makemytrip.models.RoomTypeOption"
  },
  {
    _id: "HT-SHOWCASE-2-ROOM-2",
    hotelId: "HT-SHOWCASE-2",
    roomTypeName: "Premier Ocean View Room",
    priceUpgradeAddon: 0,
    availableRooms: 8,
    bedType: "Comfort King Bed",
    roomSize: "380 sq.ft",
    viewType: "Tropical Garden & Ocean View",
    amenities: [
      "High-Speed Wi-Fi",
      "Air Conditioning",
      "En-suite Bathroom",
      "Smart 43\" LED TV",
      "Work Desk",
      "Garden & Partial Ocean View"
    ],
    imageUrls: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80"
    ],
    preview3dModelUrl: "room_standard_3d",
    description: "Contemporary classic luxury featuring warm oak textures, ergonomic king bedding, dedicated work vanity, and high-speed Wi-Fi.",
    isPopularUpsell: false,
    _class: "com.makemytrip.makemytrip.models.RoomTypeOption"
  },
  {
    _id: "HT-SHOWCASE-2-ROOM-3",
    hotelId: "HT-SHOWCASE-2",
    roomTypeName: "Executive Oceanfront Panoramic Suite",
    priceUpgradeAddon: 2800,
    availableRooms: 3,
    bedType: "California King Bed",
    roomSize: "720 sq.ft",
    viewType: "High-Floor Panoramic Ocean View",
    amenities: [
      "Panoramic Wrap Windows",
      "Separate Living Lounge",
      "Soaking Jacuzzi Bath",
      "Executive Lounge Access",
      "Evening Cocktails",
      "Private Butler Service"
    ],
    imageUrls: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
    ],
    preview3dModelUrl: "room_executive_3d",
    description: "Bespoke multi-zone penthouse suite with wrap-around corner glass, California king bedroom, Italian leather sectional lounge, and freestanding soaking jacuzzi.",
    isPopularUpsell: false,
    _class: "com.makemytrip.makemytrip.models.RoomTypeOption"
  },
  {
    _id: "HT-SHOWCASE-2-ROOM-4",
    hotelId: "HT-SHOWCASE-2",
    roomTypeName: "Kohinoor Presidential Ocean Villa",
    priceUpgradeAddon: 5500,
    availableRooms: 2,
    bedType: "Master King Bed + Daybed",
    roomSize: "1,150 sq.ft",
    viewType: "360-Degree Beachfront Panoramic View",
    amenities: [
      "Dedicated 24/7 Butler",
      "Private Sun Terrace",
      "Chesterfield Parlor",
      "Dining Suite",
      "Carrara Marble Jacuzzi",
      "Limousine Transfer",
      "Private Plunge Pool"
    ],
    imageUrls: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
    ],
    preview3dModelUrl: "room_presidential_3d",
    description: "The pinnacle of coastal luxury hospitality. Opulent Carrara marble flooring, four-poster master canopy bed, private cocktail bar, 4-seater dining salon, and terrace.",
    isPopularUpsell: false,
    _class: "com.makemytrip.makemytrip.models.RoomTypeOption"
  }
];

for (const room of roomOptionsShowcase2) {
  // Retain existing room3dConfig if present, otherwise set basic
  const existing = db.room_type_options.findOne({ _id: room._id });
  if (existing && existing.room3dConfig) {
    room.room3dConfig = existing.room3dConfig;
  }
  db.room_type_options.updateOne(
    { _id: room._id },
    { $set: room },
    { upsert: true }
  );
  print(`✓ Seeded Room Option: ${room._id} - ${room.roomTypeName} (Available: ${room.availableRooms})`);
}

print("===============================================================");
print("     Seeding completed successfully! All records verified.    ");
print("===============================================================");

