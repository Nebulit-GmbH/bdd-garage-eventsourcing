import type {Command} from '@event-driven-io/emmett';
import {CommandHandler} from '@event-driven-io/emmett';
import {findEventstore} from '../../../common/loadEventstore';
import {GARAGE_STREAM, type GarageEvent, type LostTicketFeeCharged} from '../ParkAndPayEvents';

export type ReportLostTicketCommand = Command<'ReportLostTicket', {
    licensePlate: string;
    vehicleType: string;
    leftAt: string;
}, {
    correlation_id?: string;
    causation_id?: string;
}>;

// Assumption: no validation state. The board comments ask whether the car already paid / is a different car,
// but no rule is modeled, so no such check is made.
export type ReportLostTicketState = Record<string, never>;
export const ReportLostTicketInitialState = (): ReportLostTicketState => ({});

export const evolve = (state: ReportLostTicketState, _event: GarageEvent): ReportLostTicketState => state;

// Flat daily fee, independent of time of day or Sunday. Motorbikes pay half.
export const DAILY_FEE = 14.0;
export const lostTicketFee = (vehicleType: string): number =>
    vehicleType === 'MOTORBIKE' ? DAILY_FEE / 2 : DAILY_FEE;

export const decide = (command: ReportLostTicketCommand, _state: ReportLostTicketState): LostTicketFeeCharged[] => [{
    type: 'LostTicketFeeCharged',
    data: {
        licensePlate: command.data.licensePlate,
        vehicleType: command.data.vehicleType,
        leftAt: command.data.leftAt,
        parkingFee: lostTicketFee(command.data.vehicleType),
    },
}];

const ReportLostTicketCommandHandler = CommandHandler<ReportLostTicketState, GarageEvent>({
    evolve,
    initialState: ReportLostTicketInitialState,
});

export const handleReportLostTicket = async (_id: string, command: ReportLostTicketCommand) => {
    const eventStore = await findEventstore();
    const result = await ReportLostTicketCommandHandler(
        eventStore,
        GARAGE_STREAM,
        (state: ReportLostTicketState) => decide(command, state),
    );
    return {
        nextExpectedStreamVersion: result.nextExpectedStreamVersion,
        lastEventGlobalPosition: result.lastEventGlobalPosition,
    };
};
