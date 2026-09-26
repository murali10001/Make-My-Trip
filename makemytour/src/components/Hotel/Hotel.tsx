import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { gethotel } from "@/api";
import Loader from "../Loader";

const HotelList = ({ onSelect }: any) => {
  const [hotel, sethotel] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  useEffect(() => {
    const fetchhotel = async () => {
      try {
        const data = await gethotel();
        sethotel(data);
      } catch (error) {
        console.error(error);
      } finally {
        setloading(false);
      }
    };
    fetchhotel();
  }, []);
  
  if (loading) {
    return <Loader />;
  }
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Hotel List</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hotel Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Price/Night</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hotel.length > 0 ? (
            hotel.map((item: any, idx: number) => (
              <TableRow key={item.id || item._id || idx}>
                <TableCell>{item.hotelName}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>₹{item.pricePerNight}</TableCell>
                <TableCell>
                  <Button onClick={() => onSelect(item)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow key="no-data">
              <TableCell colSpan={4} className="text-center text-gray-500">No hotel data available</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
export default HotelList;
