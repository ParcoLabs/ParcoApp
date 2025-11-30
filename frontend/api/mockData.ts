import { Property, PropertyType } from '../../types';

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: '560 State St',
    location: 'New York, NY',
    totalValue: 9500,
    tokenPrice: 50,
    tokensAvailable: 450,
    tokensTotal: 1000,
    rentalYield: 9.8,
    type: PropertyType.RESIDENTIAL,
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    contractAddress: '0x123...abc'
  },
  {
    id: '2',
    title: '88 Oakely Lane',
    location: 'New Orleans, LA',
    totalValue: 870,
    tokenPrice: 50,
    tokensAvailable: 120,
    tokensTotal: 500,
    rentalYield: 13.8,
    type: PropertyType.RESIDENTIAL,
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    contractAddress: '0x456...def'
  },
  {
    id: '3',
    title: '112 Biscayne Rd',
    location: 'Miami, FL',
    totalValue: 2100,
    tokenPrice: 100,
    tokensAvailable: 20,
    tokensTotal: 200,
    rentalYield: 10.1,
    type: PropertyType.STR,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    contractAddress: '0x789...ghi'
  },
  {
    id: '4',
    title: '1492 E 84th St',
    location: 'New York, NY',
    totalValue: 12120,
    tokenPrice: 50,
    tokensAvailable: 0,
    tokensTotal: 500,
    rentalYield: 9.8,
    type: PropertyType.RESIDENTIAL,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    contractAddress: '0xabc...123'
  },
  {
    id: '5',
    title: 'Austin Tech Park',
    location: 'Austin, TX',
    totalValue: 5200000,
    tokenPrice: 100,
    tokensAvailable: 5000,
    tokensTotal: 52000,
    rentalYield: 6.9,
    type: PropertyType.COMMERCIAL,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    contractAddress: '0x789...ghi'
  }
];

export const getPropertyById = (id: string): Property | undefined => {
  return MOCK_PROPERTIES.find(p => p.id === id);
};