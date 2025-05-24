import { User } from "./AuthContext";

export interface Apartment {
    _id: string; // keep this
    numberOfRooms: number;
    numberOfBathrooms: number;
    floorNumber: number;
    location: string;
    price: number;
    totalSurface: number;
    constructionYear: number;
    renovationYear: number;

    discounts: {
        discount1: number;
        discount2: number;
        discount3: number;
    };
    utilities: {
        internetPrice: number;
        TVPrice: number;
        waterPrice: number;
        gasPrice: number;
        electricityPrice: number;
    };
    facilities: {
        wifi: boolean;
        parking: boolean;
        airConditioning: boolean;
        tvCable: boolean;
        laundryMachine: boolean;
        fullKitchen: boolean;
        balcony: boolean;
        petFriendly: boolean;
        pool: boolean;
        gym: boolean;
        elevator: boolean;
        terrace: boolean;
        bikeStorage: boolean;
        storageRoom: boolean;
        rooftop: boolean;
        fireAlarm: boolean;
        smokeDetector: boolean;
        intercom: boolean;
        videoSurveillance: boolean;
        soundproofing: boolean;
        underfloorHeating: boolean;
        furniture: boolean;
    };
    images: string[];
    ownerInformation?: {
        fullName: string;
        email: string;
        phoneNumber: string;
        _id: string;
    };

    latitude: number;
    longitude: number;
}

export interface Rental {
    _id: string;
    apartmentId: string;
    // Am adaptat la ce ai folosit in mapare: rental.clientData.fullName etc.
    clientData: User; // Sau tenant: TenantInfo daca asa e structura
    checkIn: string; // Sau startDate
    checkOut: string; // Sau endDate
    finalPrice: number; // Sau totalPriceAgreed
    derivedStatus:
        | "active"
        | "upcoming"
        | "past"
        | "cancelled_by_owner"
        | "cancelled_by_tenant"
        | "pending_approval"
        | string; // Fa statusul mai flexibil sau defineste toate variantele
    // Adauga tenant daca e diferit de clientData
    tenant?: {
        _id: string;
        name: string;
    };
}

export interface PaginatedRentals {
    rentals: Rental[];
    currentPage: number;
    totalPages: number;
    totalRentals: number;
    derivedStatus: string;
}

interface FacilityMap {
    key: keyof Apartment["facilities"]; // 'wifi' | 'parking' | ...
    label: string; // "Wi-Fi", "Parcare Gratuita"
}

export const ALL_POSSIBLE_FACILITIES_MAP: FacilityMap[] = [
    { key: "parking", label: "Parcare inclusa" },
    { key: "videoSurveillance", label: "Supraveghere video" },
    { key: "wifi", label: "Wi-Fi" },
    { key: "airConditioning", label: "Aer Conditionat" },
    { key: "tvCable", label: "TV Cablu" },
    { key: "laundryMachine", label: "Masina de spalat rufe" },
    { key: "fullKitchen", label: "Bucatarie complet utilata" },
    { key: "fireAlarm", label: "Alarma de incendiu" },
    { key: "smokeDetector", label: "Detector de fum" },
    { key: "balcony", label: "Balcon" },
    { key: "terrace", label: "Terasa" },
    { key: "soundproofing", label: "Izolat fonic" },
    { key: "underfloorHeating", label: "Incalzire in pardoseala" },
    { key: "petFriendly", label: "Permite animale" },
    { key: "elevator", label: "Lift" },
    { key: "pool", label: "Piscina" },
    { key: "gym", label: "Sala de fitness" },
    { key: "bikeStorage", label: "Parcare biciclete" },
    { key: "storageRoom", label: "Camera depozitare" },
    { key: "rooftop", label: "Acces acoperis" },
    { key: "intercom", label: "Interfon" },
];
