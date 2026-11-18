import {sqliteRawSQLProjection} from '@event-driven-io/emmett-sqlite';
import {sqliteQueryBuilder} from '../../../common/sqliteQueryBuilder';
import {type LostTicketFeeCharged, type ParkingFeePaid, type TicketIssued} from '../ParkAndPayEvents';

export const tableName = 'cars_in_garage';

type CarsInGarageEvents = TicketIssued | ParkingFeePaid | LostTicketFeeCharged;

// A car is in the garage from TicketIssued until ParkingFeePaid or, if it lost its ticket, LostTicketFeeCharged.
export const CarsInGarageProjection = sqliteRawSQLProjection<CarsInGarageEvents>({
    canHandle: ['TicketIssued', 'ParkingFeePaid', 'LostTicketFeeCharged'],
    evolve: (event) => {
        const db = sqliteQueryBuilder();
        switch (event.type) {
            case 'TicketIssued':
                return db(tableName)
                    .insert({
                        ticket_id: event.data.ticketId,
                        license_plate: event.data.licensePlate,
                        vehicle_type: event.data.vehicleType,
                        entered_at: event.data.enteredAt,
                    })
                    .onConflict('ticket_id').ignore()
                    .toQuery();
            case 'ParkingFeePaid':
                return db(tableName).where({ticket_id: event.data.ticketId}).delete().toQuery();
            case 'LostTicketFeeCharged': {
                // The lost-ticket event carries no ticketId: the car leaves under its plate (oldest entry first).
                const oldest = db(tableName).select('ticket_id')
                    .where({license_plate: event.data.licensePlate}).orderBy('entered_at').limit(1);
                return db(tableName).whereIn('ticket_id', oldest).delete().toQuery();
            }
            default:
                return [];
        }
    },
});
