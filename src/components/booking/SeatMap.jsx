import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSeatTypeColor } from "@/utils";
import { Users, Armchair, Info } from "lucide-react";

/* ------------------------------------------------------------------
   SAFELY NORMALIZE SEATS TO ALWAYS BE:
   {
     A: [ {...}, {...} ],
     B: [ {...} ]
   }
------------------------------------------------------------------- */
const normalizeSeats = (seats) => {
  if (!seats || typeof seats !== "object") return {};

  // CASE 1: Object keyed by row but values NOT arrays -> convert
  const keys = Object.keys(seats);
  if (keys.length > 0 && !Array.isArray(seats)) {
    const normalized = {};

    keys.forEach((row) => {
      const rowSeats = seats[row];

      if (!Array.isArray(rowSeats)) {
        normalized[row] = [];
        return;
      }

      normalized[row] = rowSeats.map((s, index) => ({
        seat_number:
          s?.seat_number || `${row}${s?.column ?? index + 1}`,
        row: s?.row || row,
        column: s?.column ?? index + 1,
        status: s?.status || "available",
        seat_type: s?.seat_type || "standard",
        price: s?.price || 200
      }));
    });

    return normalized;
  }

  // CASE 2: Flat array → group by row
  if (Array.isArray(seats)) {
    const grouped = {};
    seats.forEach((s, index) => {
      const row = s.row || s.seat_number?.charAt(0) || "A";
      if (!grouped[row]) grouped[row] = [];

      grouped[row].push({
        seat_number:
          s?.seat_number || `${row}${s?.column ?? index + 1}`,
        row,
        column: s?.column ?? index + 1,
        status: s?.status || "available",
        seat_type: s?.seat_type || "standard",
        price: s?.price || 200
      });
    });
    return grouped;
  }

  return {};
};

const SeatMap = ({
  seats = {},
  layout,
  onSeatSelect,
  selectedSeats = [],
  maxSeats = 1,
  type = "movie",
}) => {
  const safeSeats = normalizeSeats(seats); // 💥 KEY FIX
  const [selected, setSelected] = useState(selectedSeats);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => {
    setSelected(selectedSeats);
  }, [selectedSeats]);

  const handleSeatClick = (seat) => {
    if (!seat) return;
    if (seat.status !== "available" && seat.status !== "selected") return;

    let newSelected;
    if (selected.includes(seat.seat_number)) {
      newSelected = selected.filter((s) => s !== seat.seat_number);
    } else {
      if (selected.length >= maxSeats) {
        if (maxSeats === 1) newSelected = [seat.seat_number];
        else return;
      } else {
        newSelected = [...selected, seat.seat_number];
      }
    }

    setSelected(newSelected);
    onSeatSelect(newSelected);
  };

  const getSeatStatus = (seat) => {
    if (!seat) return "unavailable";
    if (selected.includes(seat.seat_number)) return "selected";
    return seat.status || "available";
  };

  const getSeatColor = (seat) => {
    const status = getSeatStatus(seat);
    const baseColor = getSeatTypeColor(seat.seat_type);

    switch (status) {
      case "selected":
        return "bg-green-500 border-green-600 text-white";
      case "booked":
        return "bg-red-400 border-red-500 text-white cursor-not-allowed";
      case "blocked":
        return "bg-gray-400 border-gray-500 text-white cursor-not-allowed";
      case "unavailable":
        return "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed";
      default:
        return `${baseColor} hover:bg-gray-100 cursor-pointer`;
    }
  };

  const renderScreen = () => (
    <div className="text-center mb-8">
      <div className="bg-gradient-to-r from-gray-400 to-gray-600 h-4 rounded-lg mx-auto max-w-2xl mb-2 shadow-lg"></div>
      <p className="text-sm text-gray-600 font-medium">SCREEN</p>
    </div>
  );

  const renderSeatLegend = () => (
    <div className="flex flex-wrap gap-4 justify-center mb-6">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
        <span className="text-sm">Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-green-500 border-2 border-green-600 rounded"></div>
        <span className="text-sm">Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-red-400 border-2 border-red-500 rounded"></div>
        <span className="text-sm">Booked</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-amber-100 border-2 border-amber-400 rounded"></div>
        <span className="text-sm">Premium</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-purple-100 border-2 border-purple-400 rounded"></div>
        <span className="text-sm">VIP</span>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Armchair className="w-5 h-5" />
          Select Your Seats
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {selected.length}/{maxSeats} selected
          </Badge>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            Click on available seats to select
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {renderSeatLegend()}

        <div className="bg-gray-50 rounded-lg p-6">
          {renderScreen()}

          <div className="space-y-4">
            {Object.entries(safeSeats).map(([row, rowSeats]) => (
              <div key={row} className="flex items-center justify-center gap-2">
                <div className="w-8 text-center font-medium text-gray-700">
                  {row}
                </div>

                <div className="flex gap-1">
                  {(rowSeats || []).map((seat, i) => (
                    <motion.button
                      key={seat.seat_number || i}
                      whileHover={{
                        scale:
                          getSeatStatus(seat) === "available" ? 1.1 : 1,
                      }}
                      whileTap={{
                        scale:
                          getSeatStatus(seat) === "available" ? 0.95 : 1,
                      }}
                      className={`
                        w-8 h-8 rounded text-xs font-medium border-2 transition-all duration-200
                        ${getSeatColor(seat)}
                        ${
                          getSeatStatus(seat) === "available"
                            ? "hover:shadow-md"
                            : ""
                        }
                      `}
                      onClick={() => handleSeatClick(seat)}
                      disabled={
                        !["available", "selected"].includes(
                          getSeatStatus(seat)
                        )
                      }
                      onMouseEnter={() => setHoveredSeat(seat)}
                      onMouseLeave={() => setHoveredSeat(null)}
                    >
                      {seat.column ?? "?"}
                    </motion.button>
                  ))}
                </div>

                <div className="w-8 text-center font-medium text-gray-700">
                  {row}
                </div>
              </div>
            ))}
          </div>
        </div>

        {hoveredSeat && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-white border rounded-lg shadow-lg"
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Seat:</span>{" "}
                {hoveredSeat.seat_number}
              </div>
              <div>
                <span className="font-medium">Type:</span>{" "}
                {hoveredSeat.seat_type}
              </div>
              <div>
                <span className="font-medium">Price:</span> ₹
                {hoveredSeat.price}
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <Badge className="ml-2 text-xs">
                  {hoveredSeat.status}
                </Badge>
              </div>
            </div>
          </motion.div>
        )}

        {selected.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">
              Selected Seats:
            </h4>

            <div className="flex flex-wrap gap-2">
              {selected.map((num) => {
                const seat =
                  Object.values(safeSeats).flat()
                    .find((s) => s.seat_number === num) || {};

                return (
                  <Badge
                    key={num}
                    variant="default"
                    className="bg-green-500 text-white"
                  >
                    {num} (₹{seat.price ?? "N/A"})
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeatMap;
