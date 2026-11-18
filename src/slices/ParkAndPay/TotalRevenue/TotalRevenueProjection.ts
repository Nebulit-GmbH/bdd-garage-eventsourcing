import {sqliteRawSQLProjection} from '@event-driven-io/emmett-sqlite';
import {sqliteQueryBuilder} from '../../../common/sqliteQueryBuilder';
import {type LostTicketFeeCharged, type ParkingFeePaid} from '../ParkAndPayEvents';

export const tableName = 'total_revenue';
// Assumption: a single global row aggregates all revenue.
export const TOTAL_ID = 'total';

export type TotalRevenueReadModel = {
    id: string;
    totalRevenue: number;
    payments: number;
    asOf: string;
};

type TotalRevenueEvents = ParkingFeePaid | LostTicketFeeCharged;

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

export const TotalRevenueProjection = sqliteRawSQLProjection<TotalRevenueEvents>({
    canHandle: ['ParkingFeePaid', 'LostTicketFeeCharged'],
    evolve: (event) => {
        const db = sqliteQueryBuilder();
        const amount = event.data.parkingFee;
        return db(tableName)
            .insert({id: TOTAL_ID, total_revenue: amount, payments: 1, as_of: db.raw(NOW)})
            .onConflict('id')
            .merge({
                total_revenue: db.raw('?? + ?', [`${tableName}.total_revenue`, amount]),
                payments: db.raw('?? + 1', [`${tableName}.payments`]),
                as_of: db.raw(NOW),
            })
            .toQuery();
    },
});
