import { User } from "./authenticate/AuthContext";

export interface Apartment {
    _id: string;
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
    createdAt: string;

    averageRating?: number;
    numberOfReviews?: number;
}

export interface Rental {
    _id: string;
    apartmentId: string;
    clientData: User;
    checkIn: string;
    checkOut: string;
    finalPrice: number;
    derivedStatus:
        | "active"
        | "upcoming"
        | "past"
        | "cancelled_by_owner"
        | "cancelled_by_tenant"
        | "pending_approval"
        | string;
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
    key: keyof Apartment["facilities"];
    label: string;
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

export interface University {
    _id: string;
    name: string;
    latitude: number;
    longitude: number;
}

export interface Review {
    _id: string;
    apartmentId: string;
    userId: string;
    userName?: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt?: string;
}

export interface PaginatedResponse<T> {
    reviews: T[];
    page: number;
    pages: number;
    totalReviews: number;
}

export interface Conversation {
    _id: string;
    participants: User[];
    type: "private" | "group";
    groupName?: string;
    groupAdmin?: User;
    lastMessage?: Message;
    updatedAt: string;
}

export interface Message {
    _id: string;
    conversationId: string;
    sender: User;
    content: string;
    createdAt: string;
}

export interface InitiateChatResponse {
    conversationId: string;
}

export interface ChatDataResponse {
    details: Conversation;
    messages: Message[];
}
