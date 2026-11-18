// Fields per the Pay Parking Fee slice: ticketId, leftAt, parkingFee (fixed at payment time).
export type ParkingFeePaid = {
    type: 'ParkingFeePaid';
    data: { ticketId: string; leftAt: string; parkingFee: number };
};

// Fields per the Report Lost Ticket slice: licensePlate, vehicleType, leftAt, parkingFee (the flat daily fee).
export type LostTicketFeeCharged = {
    type: 'LostTicketFeeCharged';
    data: { licensePlate: string; vehicleType: string; leftAt: string; parkingFee: number };
};

// Assumption: Ticket Issued carries ticketId, licensePlate, vehicleType and enteredAt (local wall-clock ISO datetime).
export type TicketIssued = {
    type: 'TicketIssued';
    data: { ticketId: string; licensePlate: string; vehicleType: 'CAR' | 'MOTORBIKE'; enteredAt: string };
};

// Fields per the Change Garage Capacity slice: capacity.
export type GarageCapacityChanged = {
    type: 'GarageCapacityChanged';
    data: { capacity: number };
};

// All Park and Pay events live in ONE stream so command handlers can decide on the whole garage
// (occupancy, capacity, duplicate tickets) with a single aggregate and optimistic concurrency.
export const GARAGE_STREAM = 'garage';

export type GarageEvent = TicketIssued | ParkingFeePaid | LostTicketFeeCharged | GarageCapacityChanged;
