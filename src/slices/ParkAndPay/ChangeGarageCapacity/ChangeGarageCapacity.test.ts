import {DeciderSpecification} from '@event-driven-io/emmett';
import {describe, it} from 'node:test';
import {ChangeGarageCapacityCommand, ChangeGarageCapacityInitialState, decide, evolve} from './ChangeGarageCapacityCommand';

describe('ChangeGarageCapacity Specification', () => {
    const given = DeciderSpecification.for({decide, evolve, initialState: ChangeGarageCapacityInitialState});
    const command = (capacity: number): ChangeGarageCapacityCommand => ({
        type: 'ChangeGarageCapacity', data: {capacity}, metadata: {},
    });

    it('spec: Operator raises the capacity from 1 to 60', () => {
        given([]).when(command(60)).then([{type: 'GarageCapacityChanged', data: {capacity: 60}}]);
    });

    it('spec: Operator lowers the capacity again to 40', () => {
        given([{type: 'GarageCapacityChanged', data: {capacity: 60}}])
            .when(command(40)).then([{type: 'GarageCapacityChanged', data: {capacity: 40}}]);
    });

    it('rejects a non-positive capacity', () => {
        given([]).when(command(0)).thenThrows();
    });
});
