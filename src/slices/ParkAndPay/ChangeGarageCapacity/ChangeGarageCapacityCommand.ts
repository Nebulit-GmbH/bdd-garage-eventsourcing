import type {Command} from '@event-driven-io/emmett';
import {CommandHandler} from '@event-driven-io/emmett';
import {findEventstore} from '../../../common/loadEventstore';
import {GARAGE_STREAM, type GarageCapacityChanged, type GarageEvent} from '../ParkAndPayEvents';

export type ChangeGarageCapacityCommand = Command<'ChangeGarageCapacity', {
    capacity: number;
}, {
    correlation_id?: string;
    causation_id?: string;
}>;

// Assumption: no validation state; the only rule is that capacity is a positive integer (as in the capacity read model).
export type ChangeGarageCapacityState = Record<string, never>;
export const ChangeGarageCapacityInitialState = (): ChangeGarageCapacityState => ({});

export const evolve = (state: ChangeGarageCapacityState, _event: GarageEvent): ChangeGarageCapacityState => state;

export const decide = (command: ChangeGarageCapacityCommand, _state: ChangeGarageCapacityState): GarageCapacityChanged[] => {
    if (!Number.isInteger(command.data.capacity) || command.data.capacity < 1) {
        throw {code: 'invalid_capacity', message: 'capacity must be a positive integer'};
    }
    return [{type: 'GarageCapacityChanged', data: {capacity: command.data.capacity}}];
};

const ChangeGarageCapacityCommandHandler = CommandHandler<ChangeGarageCapacityState, GarageEvent>({
    evolve,
    initialState: ChangeGarageCapacityInitialState,
});

export const handleChangeGarageCapacity = async (_id: string, command: ChangeGarageCapacityCommand) => {
    const eventStore = await findEventstore();
    const result = await ChangeGarageCapacityCommandHandler(
        eventStore,
        GARAGE_STREAM,
        (state: ChangeGarageCapacityState) => decide(command, state),
    );
    return {
        nextExpectedStreamVersion: result.nextExpectedStreamVersion,
        lastEventGlobalPosition: result.lastEventGlobalPosition,
    };
};
