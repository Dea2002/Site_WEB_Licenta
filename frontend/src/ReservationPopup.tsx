import React, { useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import axios from "axios";
import "react-datepicker/dist/react-datepicker.css";
import "./ReservationPopup.css";
import { subDays } from "date-fns";

interface ReservationPopupProps {
    onClose: () => void;
    onDatesSelected?: (checkIn: Date, checkOut: Date) => void;
    apartmentId: string;
}

interface DateInterval {
    start: Date;
    end: Date;
}

const ReservationPopup: React.FC<ReservationPopupProps> = ({
    onClose,
    onDatesSelected,
    apartmentId,
}) => {
    const [checkInDate, setCheckInDate] = useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
    const [unavailableIntervals, setUnavailableIntervals] = useState<DateInterval[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (checkInDate && checkOutDate) {
            if (onDatesSelected) {
                onDatesSelected(checkInDate, checkOutDate);
            }
            onClose();
        } else {
            alert("Selecteaza atat data de check-in, cat si data de check-out.");
        }
    };

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
        axios
            .get(`http://localhost:5000/unavailable_dates/${apartmentId}`)
            .then((response) => {
                const data: string[] = response.data;
                const intervals: DateInterval[] = [];

                // iteram prin array-ul primit de la requestul facut
                for (let i = 0; i < data.length; i += 2) {
                    intervals.push({
                        start: new Date(data[i]),
                        end: new Date(data[i + 1]),
                    });
                }
                setUnavailableIntervals(intervals);
            })
            .catch((error) => {
                console.error("Eroare la preluarea datelor:", error);
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
                    <div className="date-picker-container">
                        <label>Check-in:</label>
                        <DatePicker
                            selected={checkInDate}
                            onChange={(date: Date | null) => setCheckInDate(date)}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecteaza check-in"
                            minDate={new Date()}
                            required
                            excludeDateIntervals={unavailableIntervals.map((interval) => ({
                                start: subDays(interval.start, 1),
                                end: interval.end,
                            }))}
                        />
                    </div>
                    <div className="date-picker-container">
                        <label>Check-out:</label>
                        <DatePicker
                            selected={checkOutDate}
                            onChange={(date: Date | null) => setCheckOutDate(date)}
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
                </form>
            </div>
        </div>
    );
};

export default ReservationPopup;
