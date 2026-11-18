import type {Command} from '@event-driven-io/emmett';
import {CommandHandler} from '@event-driven-io/emmett';
import {findEventstore} from '../../../common/loadEventstore';
import {GARAGE_STREAM, type GarageEvent, type ParkingFeePaid, type TicketIssued} from '../ParkAndPayEvents';
import {calculateFee} from '../CurrentParkingFee/feeCalculator';

export type PayParkingFeeCommand = Command<'PayParkingFee', {
    ticketId: string;
    leftAt: string;
}, {
    correlation_id?: string;
    causation_id?: string;
}>;

export type PayParkingFeeState = {
    issued: Record<string, Pick<TicketIssued['data'], 'vehicleType' | 'enteredAt'>>; // by ticketId
    paid: string[];                                                                   // ticketIds already paid
};
export const PayParkingFeeInitialState = (): PayParkingFeeState => ({issued: {}, paid: []});

export const evolve = (state: PayParkingFeeState, event: GarageEvent): PayParkingFeeState => {
    switch (event.type) {
        case 'TicketIssued':
            return {...state, issued: {...state.issued, [event.data.ticketId]: {vehicleType: event.data.vehicleType, enteredAt: event.data.enteredAt}}};
        case 'ParkingFeePaid':
            return {...state, paid: [...state.paid, event.data.ticketId]};
        default:
            return state;
    }
};

// Assumption: the fee is calculated (and fixed) at payment time from the ticket's entry and the given leftAt.
// Assumption: the board comment about a grace period after paying is unanswered; no grace period is modeled.
export const decide = (command: PayParkingFeeCommand, state: PayParkingFeeState): (TicketIssued | ParkingFeePaid)[] => {
    const issued = state.issued[command.data.ticketId];
    if (!issued) throw {code: 'ticket_not_issued', message: 'Ticket has not been issued'};
    if (state.paid.includes(command.data.ticketId)) throw {code: 'already_paid', message: 'Ticket has already been paid'};
    return [{
        type: 'ParkingFeePaid',
        data: {
            ticketId: command.data.ticketId,
            leftAt: command.data.leftAt,
            parkingFee: calculateFee(issued.vehicleType, issued.enteredAt, command.data.leftAt),
        },
    }];
};

const PayParkingFeeCommandHandler = CommandHandler<PayParkingFeeState, GarageEvent>({
    evolve,
    initialState: PayParkingFeeInitialState,
});

export const handlePayParkingFee = async (_id: string, command: PayParkingFeeCommand) => {
    const eventStore = await findEventstore();
    const result = await PayParkingFeeCommandHandler(
        eventStore,
        GARAGE_STREAM,
        (state: PayParkingFeeState) => decide(command, state),
    );
    return {
        nextExpectedStreamVersion: result.nextExpectedStreamVersion,
        lastEventGlobalPosition: result.lastEventGlobalPosition,
    };
};
