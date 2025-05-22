import { useContext } from "react";
import { parseISO, differenceInCalendarDays, isAfter } from "date-fns";
import { Apartment } from "../src/types"; // Assuming types.ts defines the Apartment interface
import { AuthContext } from "../src/AuthContext";

export interface SelectedDates {
    checkIn: Date;
    checkOut: Date;
}

export interface Colleague {
    _id: string;
    fullName: string;
    numberOfRooms: number;
    checkIn: string;
    checkOut: string;
}

export interface BookingCostDetails {
    nights: number;
    pricePerNight: number;
    numberOfRooms: number;
    dailyInternetCost: number;
    dailyTVCost: number;
    dailyWaterCost: number;
    dailyGasCost: number;
    dailyElectricityCost: number;
    totalDailyUtilityCost: number;
    totalUtilityCostForPeriod: number;
    baseApartmentCostForPeriod: number; // Cost apartament pentru perioada, per camera
    totalApartmentCostForPeriodAllRooms: number; // Cost apartament pentru perioada, toate camerele
    discountPercentage: number;
    discountAmount: number;
    finalCostWithDiscount: number; // Cost total cu discount si utilitati
    finalCostWithoutDiscount: number; // Cost total fara discount dar cu utilitati
    userHasValidDiscount: boolean;
}


export const calculateBookingCosts = (
    apartment: Apartment | null,
    dates: SelectedDates | null,
    numRooms: number
): BookingCostDetails | null => {
    if (!apartment || !dates || !dates.checkIn || !dates.checkOut || dates.checkOut <= dates.checkIn || numRooms <= 0) {
        return null;
    }
    const { user } = useContext(AuthContext);
    const nights = Math.max(1, differenceInCalendarDays(dates.checkOut, dates.checkIn));
    const pricePerNight = apartment.price || 0;

    const internetPriceMonthly = apartment.utilities.internetPrice || 0;
    const tvPriceMonthly = apartment.utilities.TVPrice || 0;
    const waterPriceMonthly = apartment.utilities.waterPrice || 0;
    const gasPriceMonthly = apartment.utilities.gasPrice || 0;
    const electricityPriceMonthly = apartment.utilities.electricityPrice || 0;

    const dailyInternetCost = internetPriceMonthly / 30;
    const dailyTVCost = tvPriceMonthly / 30;
    const dailyWaterCost = waterPriceMonthly / 30;
    const dailyGasCost = gasPriceMonthly / 30;
    const dailyElectricityCost = electricityPriceMonthly / 30;

    const totalDailyUtilityCost = dailyInternetCost + dailyTVCost + dailyWaterCost + dailyGasCost + dailyElectricityCost;
    const totalUtilityCostForPeriod = totalDailyUtilityCost * nights;

    const baseApartmentCostForPeriod = pricePerNight * nights; // Per camera
    const totalApartmentCostForPeriodAllRooms = baseApartmentCostForPeriod * numRooms;

    let discountPercentage = 0;
    let userHasValidDiscount = false;
    if (user && user.medie_valid && user.medie) {
        const validUntilDate = parseISO(user.medie_valid);
        userHasValidDiscount = isAfter(validUntilDate, new Date());
        if (userHasValidDiscount) {
            if (user.medie.includes("Categoria 1")) discountPercentage = apartment.discounts.discount1 ?? 0;
            else if (user.medie.includes("Categoria 2")) discountPercentage = apartment.discounts.discount2 ?? 0;
            else if (user.medie.includes("Categoria 3")) discountPercentage = apartment.discounts.discount3 ?? 0;
        }
    }

    const discountAmount = totalApartmentCostForPeriodAllRooms * (discountPercentage / 100);
    const discountedApartmentTotalCost = totalApartmentCostForPeriodAllRooms - discountAmount;

    const finalCostWithDiscount = discountedApartmentTotalCost + totalUtilityCostForPeriod;
    const finalCostWithoutDiscount = totalApartmentCostForPeriodAllRooms + totalUtilityCostForPeriod;


    return {
        nights,
        pricePerNight,
        numberOfRooms: numRooms,
        dailyInternetCost,
        dailyTVCost,
        dailyWaterCost,
        dailyGasCost,
        dailyElectricityCost,
        totalDailyUtilityCost,
        totalUtilityCostForPeriod,
        baseApartmentCostForPeriod,
        totalApartmentCostForPeriodAllRooms,
        discountPercentage,
        discountAmount,
        finalCostWithDiscount,
        finalCostWithoutDiscount,
        userHasValidDiscount,
    };
};