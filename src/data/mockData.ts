import { Location, Pilot, Ride } from '@/types';

// Pontos de embarque/desembarque reais — Ilha de Gigoia e arredores, Barra da Tijuca, RJ
// Coordenadas verificadas in loco — formato: coordinates: [lng, lat]

/**
 * ROUTE_ORDER[pierId] = posição na sequência de atendimento
 * Usado pelo sistema de pool para validar trechos à frente do barco.
 */
export const ROUTE_ORDER: Record<string, number> = {
  '1':  0,  // METRO
  '2':  1,  // ESTACIONAMENTO NOVO
  '3':  2,  // ESTACIONAMENTO MARCIA
  '4':  3,  // UNIMED/POSTO SHELL
  '5':  4,  // PRINCIPAL
  '6':  5,  // BARRA POINT
  '7':  6,  // PASSARELA
  '8':  7,  // CASA DAS ARTES
  '9':  8,  // BECO/PRAÇA
  '10': 9,  // JULIO
  '11': 10, // MARINA
  '12': 11, // PESCADORES
  '13': 12, // CAIÇARAS
  '14': 13, // ILHA PRIMEIRA/CICERO
  '15': 14, // ASSOCIAÇÃO
  '16': 15, // COQUEIROS
  '17': 16, // CANAL ILHA PRIMEIRA
  '18': 17, // JACARÉ
  '19': 18, // INVASÃO
  '20': 19, // RATO
  '21': 20, // COLIBRI
  '22': 21, // CONDADO
  '23': 22, // DOWNTOWN
  '24': 23, // HORTIFRUTI
};

export const BOAT_CAPACITY = 16;

export const locations: Location[] = [
  {
    id: '1',
    name: 'METRO',
    address: 'Ponto de embarque — METRO',
    coordinates: [-43.310381, -23.005759],
    estimatedTime: '~2 min',
  },
  {
    id: '2',
    name: 'ESTACIONAMENTO NOVO',
    address: 'Ponto de embarque — Estacionamento Novo',
    coordinates: [-43.311320, -23.005435],
    estimatedTime: '~2 min',
  },
  {
    id: '3',
    name: 'ESTACIONAMENTO MARCIA',
    address: 'Ponto de embarque — Estacionamento Marcia',
    coordinates: [-43.311542, -23.005307],
    estimatedTime: '~2 min',
  },
  {
    id: '4',
    name: 'UNIMED/POSTO SHELL',
    address: 'Ponto de embarque — Unimed / Posto Shell',
    coordinates: [-43.309472, -23.005804],
    estimatedTime: '~3 min',
  },
  {
    id: '5',
    name: 'PRINCIPAL',
    address: 'Ponto de embarque — Principal',
    coordinates: [-43.309290, -23.005374],
    estimatedTime: '~3 min',
  },
  {
    id: '6',
    name: 'BARRA POINT',
    address: 'Ponto de embarque — Barra Point',
    coordinates: [-43.308330, -23.005812],
    estimatedTime: '~4 min',
  },
  {
    id: '7',
    name: 'PASSARELA',
    address: 'Ponto de embarque — Passarela',
    coordinates: [-43.303934, -23.007142],
    estimatedTime: '~5 min',
  },
  {
    id: '8',
    name: 'CASA DAS ARTES',
    address: 'Ponto de embarque — Casa das Artes',
    coordinates: [-43.308119, -23.004108],
    estimatedTime: '~4 min',
  },
  {
    id: '9',
    name: 'BECO/PRAÇA',
    address: 'Ponto de embarque — Beco / Praça',
    coordinates: [-43.308320, -23.003356],
    estimatedTime: '~4 min',
  },
  {
    id: '10',
    name: 'JULIO',
    address: 'Ponto de embarque — Julio',
    coordinates: [-43.307149, -23.002135],
    estimatedTime: '~5 min',
  },
  {
    id: '11',
    name: 'MARINA',
    address: 'Ponto de embarque — Marina',
    coordinates: [-43.305805, -23.002761],
    estimatedTime: '~5 min',
  },
  {
    id: '12',
    name: 'PESCADORES',
    address: 'Ponto de embarque — Pescadores',
    coordinates: [-43.305538, -23.001759],
    estimatedTime: '~6 min',
  },
  {
    id: '13',
    name: 'CAIÇARAS',
    address: 'Ponto de embarque — Caiçaras',
    coordinates: [-43.308124, -23.001081],
    estimatedTime: '~6 min',
  },
  {
    id: '14',
    name: 'ILHA PRIMEIRA/CICERO',
    address: 'Ponto de embarque — Ilha Primeira / Cicero',
    coordinates: [-43.308165, -23.000731],
    estimatedTime: '~7 min',
  },
  {
    id: '15',
    name: 'ASSOCIAÇÃO',
    address: 'Ponto de embarque — Associação',
    coordinates: [-43.309044, -23.000902],
    estimatedTime: '~7 min',
  },
  {
    id: '16',
    name: 'COQUEIROS',
    address: 'Ponto de embarque — Coqueiros',
    coordinates: [-43.309300, -23.001395],
    estimatedTime: '~6 min',
  },
  {
    id: '17',
    name: 'CANAL ILHA PRIMEIRA',
    address: 'Ponto de embarque — Canal Ilha Primeira',
    coordinates: [-43.310539, -22.999788],
    estimatedTime: '~8 min',
  },
  {
    id: '18',
    name: 'JACARÉ',
    address: 'Ponto de embarque — Jacaré',
    coordinates: [-43.312948, -22.998707],
    estimatedTime: '~9 min',
  },
  {
    id: '19',
    name: 'INVASÃO',
    address: 'Ponto de embarque — Invasão',
    coordinates: [-43.316917, -22.998440],
    estimatedTime: '~10 min',
  },
  {
    id: '20',
    name: 'RATO',
    address: 'Ponto de embarque — Rato',
    coordinates: [-43.310472, -23.002474],
    estimatedTime: '~5 min',
  },
  {
    id: '21',
    name: 'COLIBRI',
    address: 'Ponto de embarque — Colibri',
    coordinates: [-43.310753, -23.003436],
    estimatedTime: '~5 min',
  },
  {
    id: '22',
    name: 'CONDADO',
    address: 'Ponto de embarque — Condado',
    coordinates: [-43.313515, -23.004039],
    estimatedTime: '~6 min',
  },
  {
    id: '23',
    name: 'DOWNTOWN',
    address: 'Ponto de embarque — Downtown',
    coordinates: [-43.316053, -23.005355],
    estimatedTime: '~7 min',
  },
  {
    id: '24',
    name: 'HORTIFRUTI',
    address: 'Ponto de embarque — Hortifruti',
    coordinates: [-43.317806, -23.007289],
    estimatedTime: '~8 min',
  },
];

export const mockPilot: Pilot = {
  id: 'pilot-1',
  name: 'Carlos Silva',
  photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  rating: 4.9,
  boat: 'Gamma Maritimo',
  phone: '+55 21 99999-9999',
};

export const mockPassenger = {
  id: 'passenger-1',
  name: 'Ana Santos',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
};

// Mock rides for pilot dashboard (simplified without boatType)
export const mockRides: Ride[] = [
  {
    id: 'ride-1',
    passengerId: 'passenger-1',
    passengerName: 'Ana Santos',
    passengerPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    origin: locations[0],
    destination: locations[2],
    status: 'pending',
    price: 5,
    estimatedTime: 8,
    distance: 1.2,
    createdAt: new Date(),
    passengerCount: 1,
  },
  {
    id: 'ride-2',
    passengerId: 'passenger-2',
    passengerName: 'Pedro Lima',
    passengerPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    origin: locations[1],
    destination: locations[4],
    status: 'pending',
    price: 7,
    estimatedTime: 12,
    distance: 1.8,
    createdAt: new Date(Date.now() - 60000), // 1 min ago
    passengerCount: 1,
  },
  {
    id: 'ride-3',
    passengerId: 'passenger-3',
    passengerName: 'Maria Costa',
    passengerPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    origin: locations[3],
    destination: locations[5],
    status: 'pending',
    price: 8,
    estimatedTime: 15,
    distance: 2.1,
    createdAt: new Date(Date.now() - 120000), // 2 min ago
    passengerCount: 1,
  },
];