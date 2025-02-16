export interface Apartment {
  _id: string;
  name: string;
  description: string;
  numberofrooms: number;
  price: number;
  location: string;
  ownername: string;
  owneremail: string;
  status: string;
  totalbooked: number;
  image?: string; // `image` is optional
  reason?: string; // camp optional
}
