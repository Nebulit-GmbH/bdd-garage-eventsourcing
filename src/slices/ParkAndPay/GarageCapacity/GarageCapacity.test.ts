import {before, after, describe, it} from 'node:test';
import {SQLiteProjectionAssert, SQLiteProjectionSpec, sqliteConnection} from '@event-driven-io/emmett-sqlite';
import assert from 'assert';
import {createTestSqliteDb} from '../../../common/testHelpers';
import {unlinkSync} from 'fs';
import {CarsInGarageProjection} from '../CarsInGarage/CarsInGarageProjection';
import {GarageCapacityProjection} from '../ChangeGarageCapacity/GarageCapacityProjection';
import {toReadModel} from './GarageCapacityReadModel';

const issued = (ticketId: string, licensePlate: string, vehicleType: 'CAR' | 'MOTORBIKE', enteredAt: string) => ({
    type: 'TicketIssued' as const,
    data: {ticketId, licensePlate, vehicleType, enteredAt},
    metadata: {streamName: `ParkAndPay-${ticketId}`},
});
const paid = (ticketId: string, leftAt: string, parkingFee: number) => ({
    type: 'ParkingFeePaid' as const,
    data: {ticketId, leftAt, parkingFee},
    metadata: {streamName: `ParkAndPay-${ticketId}`},
});
const changed = (capacity: number) => ({
    type: 'GarageCapacityChanged' as const,
    data: {capacity},
    metadata: {streamName: 'garage-settings'},
});

// Read model = garage_settings (capacity) + count of cars_in_garage, as served by the query route.
const readModelAssert = (expected: {capacity: number; carsInGarage: number; freeSpots: number}): SQLiteProjectionAssert =>
    async ({connection}) => {
        const [settings] = await connection.query<{capacity: number}>(`SELECT capacity FROM garage_settings WHERE id = 1`);
        const [row] = await connection.query<{count: number}>(`SELECT COUNT(*) AS count FROM cars_in_garage`);
        assert.deepStrictEqual(toReadModel(Number(settings.capacity), Number(row.count)), expected);
    };

describe('GarageCapacity Specification', () => {
    let dbPath: string;

    before(async () => {
        dbPath = await createTestSqliteDb();
    });
    after(() => {
        try { unlinkSync(dbPath); } catch { /* ignore */ }
    });

    const reset = async () => {
        const connection = sqliteConnection({fileName: dbPath});
        await connection.command('DELETE FROM cars_in_garage');
        await connection.command('UPDATE garage_settings SET capacity = 1 WHERE id = 1');
        connection.close();
    };
    const cars = () => SQLiteProjectionSpec.for({projection: CarsInGarageProjection, fileName: dbPath});
    const settings = () => SQLiteProjectionSpec.for({projection: GarageCapacityProjection, fileName: dbPath});

    it('spec: Free spots are capacity minus the cars in the garage', async () => {
        await reset();
        await settings()([changed(60)]).when([]).then(async () => {});
        await cars()([
            issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00'),
            issued('T-1002', 'M-KT 42', 'MOTORBIKE', '2026-11-05T08:15'),
        ]).when([]).then(readModelAssert({capacity: 60, carsInGarage: 2, freeSpots: 58}));
    });

    it('spec: A paid car frees a spot', async () => {
        await reset();
        await settings()([changed(60)]).when([]).then(async () => {});
        await cars()([
            issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00'),
            issued('T-1002', 'M-KT 42', 'MOTORBIKE', '2026-11-05T08:15'),
            paid('T-1001', '2026-11-05T09:01', 2.0),
        ]).when([]).then(readModelAssert({capacity: 60, carsInGarage: 1, freeSpots: 59}));
    });

    it('spec: Capacity is 1 until it has been changed', async () => {
        await reset();
        await cars()([issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00')])
            .when([]).then(readModelAssert({capacity: 1, carsInGarage: 1, freeSpots: 0}));
    });
});
