import {sqliteRawSQLProjection} from '@event-driven-io/emmett-sqlite';
import {sqliteQueryBuilder} from '../../../common/sqliteQueryBuilder';
import {type TicketIssued} from '../ParkAndPayEvents';

export const tableName = 'current_parking_fee';

// Stores issued tickets; currentFee and asOf are generated at query time (see routes.ts).
export const CurrentParkingFeeProjection = sqliteRawSQLProjection<TicketIssued>({
    canHandle: ['TicketIssued'],
    evolve: (event) => sqliteQueryBuilder()(tableName)
        .insert({
            ticket_id: event.data.ticketId,
            license_plate: event.data.licensePlate,
            vehicle_type: event.data.vehicleType,
            entered_at: event.data.enteredAt,
        })
        .onConflict('ticket_id').ignore()
        .toQuery(),
});
