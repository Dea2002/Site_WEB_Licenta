export interface Apartment {
    _id: string; // keep this

    // // maybe remove these
    // name: string;
    // description: string;
    // numberOfRooms: number;
    // // price: number;
    // // location: string;
    // ownername: string;
    // owneremail: string;
    // status: string;
    // totalbooked: number;
    // image?: string; // `image` is optional
    // reason?: string; // camp optional

    // new structure
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
    colleagues: boolean;
    image: string;

    ownerInformation?: {
        fullName: string;
        email: string;
        phoneNumber: string;
        // alte detalii despre proprietar dacă e nevoie
    };
}
