import {DeciderSpecification} from '@event-driven-io/emmett';
import {describe, it} from 'node:test';
import {ReportLostTicketCommand, ReportLostTicketInitialState, decide, evolve} from './ReportLostTicketCommand';

describe('ReportLostTicket Specification', () => {
    const given = DeciderSpecification.for({decide, evolve, initialState: ReportLostTicketInitialState});
    const leftAt = '2026-11-18T10:00:00';

    const command = (vehicleType: string): ReportLostTicketCommand => ({
        type: 'ReportLostTicket',
        data: {licensePlate: 'B-XY 1', vehicleType, leftAt},
        metadata: {},
    });

    it('spec: Car without ticket pays the daily fee', () => {
        given([]).when(command('CAR')).then([{
            type: 'LostTicketFeeCharged',
            data: {licensePlate: 'B-XY 1', vehicleType: 'CAR', leftAt, parkingFee: 14.0},
        }]);
    });

    it('spec: Motorbike without ticket pays half the daily fee', () => {
        given([]).when(command('MOTORBIKE')).then([{
            type: 'LostTicketFeeCharged',
            data: {licensePlate: 'B-XY 1', vehicleType: 'MOTORBIKE', leftAt, parkingFee: 7.0},
        }]);
    });
});
