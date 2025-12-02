// src/components/movie/ShowtimeSelector.jsx
import React from 'react';

const ShowtimeSelector = ({ showtimes = [], selectedShowtimeId, onSelect }) => {
  // showtimes: array of { _id, theatre, date, timeslots: [{time, price}] }
  return (
    <div className="space-y-4">
      {showtimes.length === 0 && <div className="text-sm text-gray-500">No showtimes available</div>}
      {showtimes.map((st) => (
        <div key={st._id} className="p-3 border rounded-lg bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{st.theatre} — {st.location}</div>
              <div className="text-sm text-gray-600">{new Date(st.date).toLocaleDateString()}</div>
            </div>
            <div>
              {st.timeslots.map((slot) => {
                const id = `${st._id}__${slot.time}`;
                const isSelected = selectedShowtimeId === st._id;
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(st._id, slot.time)}
                    className={`mr-2 mb-2 inline-block px-3 py-2 rounded-md border ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'}`}
                  >
                    {slot.time} {slot.price ? `• ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(slot.price)}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShowtimeSelector;
