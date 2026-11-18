import {sqliteRawSQLProjection} from '@event-driven-io/emmett-sqlite';
import {sqliteQueryBuilder} from '../../../common/sqliteQueryBuilder';
import {type GarageCapacityChanged} from '../ParkAndPayEvents';

// Keeps the garage_settings row (read by Garage Capacity / Issue Ticket) in sync with the events.
export const GarageCapacityProjection = sqliteRawSQLProjection<GarageCapacityChanged>({
    canHandle: ['GarageCapacityChanged'],
    evolve: (event) => sqliteQueryBuilder()('garage_settings')
        .insert({id: 1, capacity: event.data.capacity})
        .onConflict('id').merge({capacity: event.data.capacity})
        .toQuery(),
});
