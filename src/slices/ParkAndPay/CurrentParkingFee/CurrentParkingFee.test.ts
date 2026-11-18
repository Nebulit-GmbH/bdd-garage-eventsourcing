import {before, after, describe, it} from 'node:test';
import {SQLiteProjectionAssert, SQLiteProjectionSpec, sqliteConnection} from '@event-driven-io/emmett-sqlite';
import {CurrentParkingFeeProjection} from './CurrentParkingFeeProjection';
import {calculateFee} from './feeCalculator';
import assert from 'assert';
import {createTestSqliteDb} from '../../../common/testHelpers';
import {unlinkSync} from 'fs';

describe('CurrentParkingFee Specification', () => {
    let dbPath: string;

    before(async () => {
        dbPath = await createTestSqliteDb();
    });

    after(() => {
        try { unlinkSync(dbPath); } catch { /* ignore */ }
    });

    it('spec: Running fee follows the daytime tariff', async () => {
        const assertReadModel: SQLiteProjectionAssert = async ({connection}) => {
            const [row] = await connection.query<{license_plate: string; vehicle_type: string}>(
                `SELECT * FROM current_parking_fee WHERE ticket_id = ?`, ['t-1'],
            );
            assert.ok(row, 'row should exist');
            assert.strictEqual(row.license_plate, 'M-AB 123');
            assert.strictEqual(row.vehicle_type, 'CAR');
            assert.strictEqual(calculateFee(row.vehicle_type, '2026-11-05T08:00:00', '2026-11-05T09:01:00'), 2.0);
        };

        await SQLiteProjectionSpec.for({projection: CurrentParkingFeeProjection, fileName: dbPath})([
            {
                type: 'TicketIssued',
                data: {ticketId: 't-1', licensePlate: 'M-AB 123', vehicleType: 'CAR', enteredAt: '2026-11-05T08:00:00'},
                metadata: {streamName: 'ParkAndPay-t-1'},
            },
        ]).when([]).then(assertReadModel);
    });

    it('motorbike pays half; daily cap applies', () => {
        assert.strictEqual(calculateFee('MOTORBIKE', '2026-11-05T08:00:00', '2026-11-05T09:01:00'), 1.0);
        assert.strictEqual(calculateFee('CAR', '2026-11-05T08:00:00', '2026-11-05T20:00:00'), 14.0);
    });
});
