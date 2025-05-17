import React, { useContext, useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import { api } from './api';
import "react-datepicker/dist/react-datepicker.css";
import "./ReservationPopup.css";
import { subDays } from "date-fns";
import { AuthContext } from "./AuthContext";
interface ReservationPopupProps {
    onClose: () => void;
    onDatesSelected?: (checkIn: Date, checkOut: Date, rooms: number) => void;
    apartmentId: string;
}


const ReservationPopup: React.FC<ReservationPopupProps> = ({
    onClose,
    onDatesSelected,
    apartmentId,
}) => {
    const [checkInDate, setCheckInDate] = useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
    const [unavailableIntervals, setUnavailableIntervals] = useState<DateInterval[]>([]);
    const [roomsCount, setRoomsCount] = useState<number>(0);
    // const [selectedRooms, setSelectedRooms] = useState<number>(1);
    const [selectedRooms, setSelectedRooms] = useState<number | "">("");
    const { token } = useContext(AuthContext);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (checkInDate && checkOutDate) {
            if (onDatesSelected) {
                onDatesSelected(checkInDate, checkOutDate, Number(selectedRooms));
            }
            onClose();
        } else {
            alert("Selecteaza atat data de check-in, cat si data de check-out.");
        }
    };
    type DateInterval = { start: Date; end: Date };
    function groupIntoIntervals(dateStrings: string[]): DateInterval[] {
        if (dateStrings.length === 0) return [];

        // 1. Convertim in Date şi sortam
        const dates = dateStrings
            .map(s => new Date(s))
            .sort((a, b) => a.getTime() - b.getTime());

        const intervals: DateInterval[] = [];
        let start = dates[0];
        let prev = dates[0];

        for (let i = 1; i < dates.length; i++) {
            const cur = dates[i];
            // cate ms are o zi?
            const oneDay = 1000 * 60 * 60 * 24;
            // daca nu sunt consecutive, incheiem intervalul curent
            if (cur.getTime() - prev.getTime() > oneDay) {
                intervals.push({ start, end: prev });
                start = cur;
            }
            prev = cur;
        }

        // adaugam ultimul interval
        intervals.push({ start, end: prev });
        return intervals;
    }

    const nextAvailableDate = useMemo(() => {
        if (!checkInDate) return undefined;

        // filtram intervalele care incep dupa checkInDate
        const upcoming = unavailableIntervals.filter((interval) => interval.start > checkInDate);
        if (upcoming.length === 0) return undefined;

        // gasim cel mai apropiat interval de timp
        const earliest = new Date(
            Math.min(...upcoming.map((interval) => interval.start.getTime())),
        );
        return earliest;
    }, [checkInDate, unavailableIntervals]);

    // setam maxDate pentru checkOut ca fiind o zi inainte de urmatorul interval indisponibil, daca exista
    const maxCheckOutDate = useMemo(() => {
        return nextAvailableDate ? subDays(nextAvailableDate, 1) : undefined;
    }, [nextAvailableDate]);

    useEffect(() => {

        // make a get request to local host /testez and console log the response
        api.post(
            `/unavailable_dates/${apartmentId}`,
            { numberOfRooms: selectedRooms },
            { headers: { Authorization: `Bearer ${token}` } },
        )
            .then((response) => {
                const data: string[] = response.data;
                const intervals = groupIntoIntervals(data);

                // // iteram prin array-ul primit de la requestul facut
                // for (let i = 0; i < data.length; i += 2) {
                //     intervals.push({
                //         start: new Date(data[i]),
                //         end: new Date(data[i + 1]),
                //     });
                // }
                setUnavailableIntervals(intervals);
            })
            .catch((error) => {
                console.error("Eroare la preluarea datelor:", error);
            });
    }, [selectedRooms]);
    useEffect(() => {

        api
            .get(`/apartments/number-of-rooms/${apartmentId}`)
            .then((response) => {
                const numberOfRooms = response.data.numberOfRooms;
                setRoomsCount(parseInt(numberOfRooms));
            })
            .catch(error => {
                console.error("Eroare la preluarea numarului de camere:", error);
            });
    }, []);

    return (
        <div className="reservation-overlay" onClick={onClose}>
            <div className="reservation-pop-up-card" onClick={(e) => e.stopPropagation()}>
                <button className="button-close-reservation" onClick={onClose}>
                    <strong>X</strong>
                </button>
                <h2>Selecteaza datele</h2>
                <form onSubmit={handleSubmit}>
                    {/* Select camere mai intai */}
                    <div className="rooms-selector">
                        <label>Doresc:</label>
                        <select
                            value={selectedRooms}
                            onChange={(e) => setSelectedRooms(e.target.value === "" ? "" : Number(e.target.value))}
                            required
                        >
                            <option value="" disabled>
                                --- Selecteaza ---
                            </option>
                            {Array.from({ length: roomsCount }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                    {n === 1 ? "o camera" : `${n} camere`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date pickers afisate doar dupa selectarea camerelor */}
                    {selectedRooms !== "" && (
                        <>
                            <div className="date-picker-container">
                                <label>Check-in:</label>
                                <DatePicker
                                    selected={checkInDate}
                                    onChange={(date) => setCheckInDate(date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Selecteaza check-in"
                                    minDate={new Date()}
                                    excludeDateIntervals={unavailableIntervals.map((interval) => ({
                                        start: subDays(interval.start, 1),
                                        end: interval.end,
                                    }))}
                                    required
                                />
                            </div>

                            <div className="date-picker-container">
                                <label>Check-out:</label>
                                <DatePicker
                                    selected={checkOutDate}
                                    onChange={(date) => setCheckOutDate(date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Selecteaza check-out"
                                    minDate={checkInDate || new Date()}
                                    maxDate={maxCheckOutDate}
                                    required
                                />
                            </div>

                            <button className="submit-confirma-interval" type="submit">
                                Confirma
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ReservationPopup;
