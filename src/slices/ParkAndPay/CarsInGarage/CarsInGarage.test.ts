import {before, after, describe, it} from 'node:test';
import {SQLiteProjectionAssert, SQLiteProjectionSpec, sqliteConnection} from '@event-driven-io/emmett-sqlite';
import {CarsInGarageProjection} from './CarsInGarageProjection';
import assert from 'assert';
import {createTestSqliteDb} from '../../../common/testHelpers';
import {unlinkSync} from 'fs';

const issued = (ticketId: string, licensePlate: string, vehicleType: 'CAR' | 'MOTORBIKE', enteredAt: string) => ({
    type: 'TicketIssued' as const,
    data: {ticketId, licensePlate, vehicleType, enteredAt},
    metadata: {streamName: `ParkAndPay-${ticketId}`},
});
const paid = (ticketId: string) => ({
    type: 'ParkingFeePaid' as const,
    data: {ticketId, leftAt: '2026-11-05T09:01', parkingFee: 2.0},
    metadata: {streamName: `ParkAndPay-${ticketId}`},
});

const rowsAssert = (expected: any[]): SQLiteProjectionAssert => async ({connection}) => {
    const rows = await connection.query<{ticket_id: string; license_plate: string; vehicle_type: string}>(
        `SELECT * FROM cars_in_garage ORDER BY ticket_id`,
    );
    assert.strictEqual(rows.length, expected.length);
    expected.forEach((e, i) => {
        assert.strictEqual(rows[i].ticket_id, e.ticketId);
        assert.strictEqual(rows[i].license_plate, e.licensePlate);
        assert.strictEqual(rows[i].vehicle_type, e.vehicleType);
    });
};

describe('CarsInGarage Specification', () => {
    let dbPath: string;

    before(async () => {
        dbPath = await createTestSqliteDb();
    });

    after(() => {
        try { unlinkSync(dbPath); } catch { /* ignore */ }
    });

    // SQLiteProjectionSpec.for() closes its connection in .then(): a fresh spec per test.
    const given = () => SQLiteProjectionSpec.for({projection: CarsInGarageProjection, fileName: dbPath});

    const clear = async () => {
        const connection = sqliteConnection({fileName: dbPath});
        await connection.command('DELETE FROM cars_in_garage');
        connection.close();
    };

    it('spec: Car appears in the garage when it enters', async () => {
        await clear();
        await given()([issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00')]).when([])
            .then(rowsAssert([{ticketId: 'T-1001', licensePlate: 'M-AB 1234', vehicleType: 'CAR'}]));
    });

    it('spec: Second car enters and is listed next to the first', async () => {
        await clear();
        await given()([
            issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00'),
            issued('T-1002', 'M-KT 42', 'MOTORBIKE', '2026-11-05T08:15'),
        ]).when([]).then(rowsAssert([
            {ticketId: 'T-1001', licensePlate: 'M-AB 1234', vehicleType: 'CAR'},
            {ticketId: 'T-1002', licensePlate: 'M-KT 42', vehicleType: 'MOTORBIKE'},
        ]));
    });

    it('spec: Car is removed from the garage when it has paid', async () => {
        await clear();
        await given()([
            issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00'),
            issued('T-1002', 'M-KT 42', 'MOTORBIKE', '2026-11-05T08:15'),
            paid('T-1001'),
        ]).when([]).then(rowsAssert([{ticketId: 'T-1002', licensePlate: 'M-KT 42', vehicleType: 'MOTORBIKE'}]));
    });

    it('spec: Garage is empty after the last car has paid', async () => {
        await clear();
        await given()([
            issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00'),
            paid('T-1001'),
        ]).when([]).then(rowsAssert([]));
    });

    it('spec: Car is removed from the garage when it reports its ticket lost', async () => {
        await clear();
        await given()([
            issued('T-1001', 'M-AB 1234', 'CAR', '2026-11-05T08:00'),
            issued('T-1002', 'M-KT 42', 'MOTORBIKE', '2026-11-05T08:15'),
            {
                type: 'LostTicketFeeCharged' as const,
                data: {licensePlate: 'M-AB 1234', vehicleType: 'CAR', leftAt: '2026-11-05T09:00', parkingFee: 14},
                metadata: {streamName: 'M-AB 1234-run1'},
            },
        ]).when([]).then(rowsAssert([{ticketId: 'T-1002', licensePlate: 'M-KT 42', vehicleType: 'MOTORBIKE'}]));
    });
});
