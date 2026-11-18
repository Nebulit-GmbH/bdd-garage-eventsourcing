import type {Command} from '@event-driven-io/emmett';
import {CommandHandler} from '@event-driven-io/emmett';
import {findEventstore} from '../../../common/loadEventstore';
import {GARAGE_STREAM, type GarageEvent, type TicketIssued} from '../ParkAndPayEvents';

// Default spots until a GarageCapacityChanged event says otherwise.
export const GARAGE_CAPACITY = 1;

export type IssueTicketCommand = Command<'IssueTicket', {
    ticketId: string;
    licensePlate: string;
    vehicleType: 'CAR' | 'MOTORBIKE';
    enteredAt: string;
}, {
    correlation_id?: string;
    causation_id?: string;
}>;

// Built purely from the garage stream: who is inside, which tickets were ever issued, current capacity.
export type IssueTicketState = {
    capacity: number;
    inside: Record<string, {licensePlate: string; enteredAt: string}>; // ticketId -> car currently in the garage
    issued: string[];                                                  // every ticketId ever issued
};
export const IssueTicketInitialState = (): IssueTicketState => ({capacity: GARAGE_CAPACITY, inside: {}, issued: []});

export const evolve = (state: IssueTicketState, event: GarageEvent): IssueTicketState => {
    switch (event.type) {
        case 'TicketIssued':
            return {
                ...state,
                issued: [...state.issued, event.data.ticketId],
                inside: {...state.inside, [event.data.ticketId]: {licensePlate: event.data.licensePlate, enteredAt: event.data.enteredAt}},
            };
        case 'ParkingFeePaid': {
            const {[event.data.ticketId]: _left, ...inside} = state.inside;
            return {...state, inside};
        }
        case 'LostTicketFeeCharged': {
            // The lost-ticket event carries no ticketId: the oldest car with that plate leaves (same rule as CarsInGarage).
            const oldest = Object.entries(state.inside)
                .filter(([, car]) => car.licensePlate === event.data.licensePlate)
                .sort(([, a], [, b]) => a.enteredAt.localeCompare(b.enteredAt))[0]?.[0];
            if (oldest === undefined) return state;
            const {[oldest]: _left, ...inside} = state.inside;
            return {...state, inside};
        }
        case 'GarageCapacityChanged':
            return {...state, capacity: event.data.capacity};
        default:
            return state;
    }
};

export const decide = (command: IssueTicketCommand, state: IssueTicketState): TicketIssued[] => {
    if (state.issued.includes(command.data.ticketId)) {
        throw {code: 'ticket_already_issued', message: 'Ticket has already been issued'};
    }
    if (Object.keys(state.inside).length >= state.capacity) throw {code: 'garage_full', message: 'No free spot'};
    return [{
        type: 'TicketIssued',
        data: {
            ticketId: command.data.ticketId,
            licensePlate: command.data.licensePlate,
            vehicleType: command.data.vehicleType,
            enteredAt: command.data.enteredAt,
        },
    }];
};

const IssueTicketCommandHandler = CommandHandler<IssueTicketState, GarageEvent>({
    evolve,
    initialState: IssueTicketInitialState,
});

// One garage stream: concurrent IssueTicket calls conflict on the stream version and cannot overbook.
export const handleIssueTicket = async (_id: string, command: IssueTicketCommand) => {
    const eventStore = await findEventstore();
    const result = await IssueTicketCommandHandler(
        eventStore,
        GARAGE_STREAM,
        (state: IssueTicketState) => decide(command, state),
    );
    return {
        nextExpectedStreamVersion: result.nextExpectedStreamVersion,
        lastEventGlobalPosition: result.lastEventGlobalPosition,
    };
};
