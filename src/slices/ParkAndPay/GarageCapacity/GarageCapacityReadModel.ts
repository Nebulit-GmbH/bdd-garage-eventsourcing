import {getKnexInstance} from '../../../common/db';
import {getGarageCapacity} from '../../../common/garageCapacity';

export type GarageCapacityReadModel = { capacity: number; carsInGarage: number; freeSpots: number };

// Capacity comes from garage_settings (1 until changed, kept by GarageCapacityProjection);
// carsInGarage/freeSpots are generated at query time from cars_in_garage (TicketIssued minus ParkingFeePaid/LostTicketFeeCharged).
export const toReadModel = (capacity: number, carsInGarage: number): GarageCapacityReadModel =>
    ({capacity, carsInGarage, freeSpots: capacity - carsInGarage});

export const queryGarageCapacity = async (): Promise<GarageCapacityReadModel> => {
    const capacity = await getGarageCapacity();
    const row = await getKnexInstance()('cars_in_garage').count({count: '*'}).first();
    const carsInGarage = Number(row?.count ?? 0);
    return toReadModel(capacity, carsInGarage);
};
