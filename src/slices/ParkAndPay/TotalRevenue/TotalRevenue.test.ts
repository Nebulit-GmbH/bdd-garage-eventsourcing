import {before, after, describe, it} from 'node:test';
import {SQLiteProjectionAssert, SQLiteProjectionSpec, sqliteConnection} from '@event-driven-io/emmett-sqlite';
import {TotalRevenueProjection, TOTAL_ID} from './TotalRevenueProjection';
import assert from 'assert';
import {createTestSqliteDb} from '../../../common/testHelpers';
import {unlinkSync} from 'fs';

describe('TotalRevenue Specification', () => {
    let dbPath: string;

    before(async () => {
        dbPath = await createTestSqliteDb();
    });

    after(() => {
        try { unlinkSync(dbPath); } catch { /* ignore */ }
    });

    it('spec: Total revenue sums paid fees and lost ticket fees', async () => {
        const assertReadModel: SQLiteProjectionAssert = async ({connection}) => {
            const [row] = await connection.query<{total_revenue: number; payments: number; as_of: string}>(
                `SELECT * FROM total_revenue WHERE id = ?`, [TOTAL_ID],
            );
            assert.ok(row, 'row should exist');
            assert.strictEqual(Number(row.total_revenue), 19.3);
            assert.strictEqual(row.payments, 2);
            assert.ok(row.as_of);
        };

        await SQLiteProjectionSpec.for({projection: TotalRevenueProjection, fileName: dbPath})([
            {type: 'ParkingFeePaid', data: {ticketId: 't-1', leftAt: '2026-11-18T10:00:00', parkingFee: 5.3}, metadata: {streamName: 'ParkAndPay-t-1'}},
            {type: 'LostTicketFeeCharged', data: {licensePlate: 'B-XY 1', vehicleType: 'CAR', leftAt: '2026-11-18T10:00:00', parkingFee: 14.0}, metadata: {streamName: 'ParkAndPay-t-2'}},
        ]).when([]).then(assertReadModel);
    });
});
