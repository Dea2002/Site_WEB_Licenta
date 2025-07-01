import React, { useContext, useEffect, useState, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { api } from './api';
import { ro } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import "./ReservationPopup.css";
import { subDays, addYears, setMonth, getMonth, getYear, startOfMonth, endOfMonth, addDays, format } from "date-fns";
import { AuthContext } from "./authenticate/AuthContext";

interface ReservationPopupProps {
    onClose: () => void;
    onDatesSelected?: (checkIn: Date, checkOut: Date, rooms: number) => void;
    apartmentId: string;
}

registerLocale('ro', ro);

interface FacultyDetails {
    _id: string;
    name: string;
    aniStudiu: number;
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
    const [selectedRooms, setSelectedRooms] = useState<number | "">("");
    const { token, user } = useContext(AuthContext);

    // Stari noi pentru logica de validare a studentului
    const [studentMaxSelectableDate, setStudentMaxSelectableDate] = useState<Date | null>(null);
    const [loadingStudentValidation, setLoadingStudentValidation] = useState<boolean>(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (checkInDate && checkOutDate && selectedRooms !== "") {
            if (onDatesSelected) {
                onDatesSelected(checkInDate, checkOutDate, Number(selectedRooms));
            }
            onClose();
        } else {
            alert("Selecteaza atat data de check-in, cat si data de check-out si numarul de camere.");
        }
    };
    type DateInterval = { start: Date; end: Date };
    function groupIntoIntervals(dateStrings: string[]): DateInterval[] {
        if (dateStrings.length === 0) return [];

        // 1. Convertim in Date şi sortam
        const dates = dateStrings.map(s => new Date(s)).sort((a, b) => a.getTime() - b.getTime());

        const intervals: DateInterval[] = [];
        if (dates.length === 0) return intervals;
        let start = dates[0];
        let prev = dates[0];

        for (let i = 1; i < dates.length; i++) {
            const cur = dates[i];
            const oneDay = 1000 * 60 * 60 * 24;
            if (cur.getTime() - prev.getTime() > oneDay) {
                intervals.push({ start, end: prev });
                start = cur;
            }
            prev = cur;
        }
        intervals.push({ start, end: prev });
        return intervals;
    }

    const nextAvailableDateForApartment = useMemo(() => {
        if (!checkInDate) return undefined;

        // filtram intervalele care incep dupa checkInDate
        const upcoming = unavailableIntervals.filter((interval) => interval.start > checkInDate);
        if (upcoming.length === 0) return undefined;

        // gasim cel mai apropiat interval de timp
        const earliest = new Date(Math.min(...upcoming.map((interval) => interval.start.getTime())));
        return earliest;
    }, [checkInDate, unavailableIntervals]);

    // setam maxDate pentru checkOut ca fiind o zi inainte de urmatorul interval indisponibil, daca exista
    const maxCheckOutDateBasedOnApartment = useMemo(() => {
        return nextAvailableDateForApartment ? subDays(nextAvailableDateForApartment, 1) : undefined;
    }, [nextAvailableDateForApartment]);

    // Combinam cele doua restrictii pentru maxDate
    const finalMaxCheckOutDate = useMemo(() => {
        if (studentMaxSelectableDate && maxCheckOutDateBasedOnApartment) {
            return studentMaxSelectableDate < maxCheckOutDateBasedOnApartment ? studentMaxSelectableDate : maxCheckOutDateBasedOnApartment;
        }
        if (studentMaxSelectableDate) {
            return studentMaxSelectableDate;
        }
        if (maxCheckOutDateBasedOnApartment) {
            return maxCheckOutDateBasedOnApartment;
        }
        return undefined; // Fara restrictii
    }, [studentMaxSelectableDate, maxCheckOutDateBasedOnApartment]);

    useEffect(() => {

        api.post(`/unavailable_dates/${apartmentId}`,
            { requestedRooms: selectedRooms },
            { headers: { Authorization: `Bearer ${token}` } },
        )
            .then((response) => {
                const data: string[] = response.data;
                const intervals = groupIntoIntervals(data);

                setUnavailableIntervals(intervals);
            })
            .catch((error) => {
                console.error("Eroare la preluarea datelor:", error);
                setUnavailableIntervals([]);
            });
    }, [selectedRooms]);

    // Calculeaza data maxima selectabila pe baza restrictiilor studentului
    useEffect(() => {
        if (!user || !user.anUniversitar || !token) {
            // Daca nu avem datele studentului sau facultatii, permitem selectia fara restrictia de studentie
            setStudentMaxSelectableDate(null);
            return;
        }

        setLoadingStudentValidation(true);
        // Pasul 1: Preluam detaliile facultatii pentru a afla `aniStudiu`
        api.get<FacultyDetails>(`/faculty/by_name`,
            {
                params: {
                    name: user.faculty
                }
            })
            .then(response => {
                const facultyDetails = response.data;
                if (!facultyDetails || typeof facultyDetails.aniStudiu !== 'string') {
                    console.warn("Nu s-au putut prelua anii de studiu pentru facultate.");
                    setStudentMaxSelectableDate(null);
                    return;
                }

                const anUniversitarCurent = Number(user.anUniversitar);
                const aniStudiuTotal = facultyDetails.aniStudiu;

                let maxDateForStudent: Date | null = null;
                const today = new Date();
                const currentMonth = getMonth(today); // 0 = Ianuarie, ..., 11 = Decembrie
                const currentYear = getYear(today);

                if (anUniversitarCurent >= aniStudiuTotal) { // Este in an terminal sau a terminat
                    // Luna septembrie este luna 8 in date-fns (0-indexat)
                    if (currentMonth >= 8 && currentMonth <= 11) { // Sept, Oct, Nov, Dec
                        // Poate rezerva pana la 1 Septembrie anul urmator
                        maxDateForStudent = startOfMonth(setMonth(addYears(today, 1), 9)); // 1 Septembrie anul viitor
                    } else { // Ian - Aug
                        // Poate rezerva pana la 1 Septembrie anul curent
                        maxDateForStudent = startOfMonth(setMonth(today, 9)); // 1 Septembrie anul curent
                    }
                } else {
                    let endCurrentAcademicYear;
                    if (currentMonth < 9) { // Inainte de Octombrie
                        endCurrentAcademicYear = endOfMonth(setMonth(new Date(currentYear, 0, 1), 9)); // Sfarsit Septembrie anul curent
                    } else {
                        endCurrentAcademicYear = endOfMonth(setMonth(new Date(currentYear + 1, 0, 1), 9)); // Sfarsit Septembrie anul viitor
                    }
                    // Permitem rezervari pana la sfarsitul anilor ramasi de studiu
                    maxDateForStudent = addYears(endCurrentAcademicYear, (aniStudiuTotal - anUniversitarCurent));
                }




                if (maxDateForStudent) {
                    setStudentMaxSelectableDate(subDays(maxDateForStudent, 1));
                } else {
                    setStudentMaxSelectableDate(null); // Fara restrictie de studentie
                }

            })
            .catch(err => {
                console.error("Eroare la preluarea detaliilor facultatii pentru validare student:", err);
                setStudentMaxSelectableDate(null);
            })
            .finally(() => {
                setLoadingStudentValidation(false);
            });

    }, [user, token]);

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
    }, [apartmentId]);

    return (
        <div className="reservation-overlay" onClick={onClose}>
            <div className="reservation-pop-up-card" onClick={(e) => e.stopPropagation()}>
                <button className="button-close-reservation" onClick={onClose}>
                    <strong>X</strong>
                </button>
                <h2>Selecteaza datele</h2>
                <form onSubmit={handleSubmit}>

                    <div className="rooms-selector">
                        <label>Doresc:</label>
                        <select
                            value={selectedRooms}
                            onChange={(e) => {
                                setSelectedRooms(e.target.value === "" ? "" : Number(e.target.value));

                                setCheckInDate(null);
                                setCheckOutDate(null);
                            }
                            }
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


                    {selectedRooms !== "" && !loadingStudentValidation && (
                        <>
                            <div className="date-picker-container">
                                <label>Check-in:</label>
                                <DatePicker
                                    selected={checkInDate}
                                    onChange={(date) => {
                                        setCheckInDate(date);
                                        if (date && checkOutDate && date >= checkOutDate) {
                                            setCheckOutDate(null);
                                        }

                                    }}
                                    locale="ro"
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Selecteaza check-in"
                                    minDate={new Date()}
                                    maxDate={studentMaxSelectableDate!} // Restrictie student
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
                                    locale="ro"
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Selecteaza check-out"
                                    minDate={checkInDate ? addDays(checkInDate, 0) : new Date()}

                                    maxDate={finalMaxCheckOutDate}
                                    excludeDateIntervals={unavailableIntervals.map((interval) => ({
                                        start: interval.start,
                                        end: interval.end,
                                    }))}
                                    required
                                    disabled={!checkInDate}
                                />
                                {studentMaxSelectableDate && (
                                    <small className="date-restriction-info">
                                        Puteti selecta pana la: {format(studentMaxSelectableDate, 'dd MMMM yyyy', { locale: ro })} (conform situatiei scolare).
                                    </small>
                                )}
                            </div>

                            <button className="submit-confirma-interval" type="submit">
                                Confirma
                            </button>
                        </>
                    )}
                </form>
            </div >
        </div >
    );
};

export default ReservationPopup;
