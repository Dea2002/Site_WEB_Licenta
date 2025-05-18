export interface Apartment {
    _id: string; // keep this
    numberOfRooms: number;
    numberOfBathrooms: number;
    floorNumber: number;
    parking: boolean;
    petFriendly: boolean;
    location: string;
    price: number;
    totalSurface: number;
    elevator: boolean;
    constructionYear: number;
    renovationYear: number;
    internetPrice: number;
    TVPrice: number;
    waterPrice: number;
    gasPrice: number;
    electricityPrice: number;
    airConditioning: boolean;
    balcony: boolean;
    discount1: number;
    discount2: number;
    discount3: number;
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
