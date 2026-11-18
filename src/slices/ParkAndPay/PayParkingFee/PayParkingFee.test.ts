import {DeciderSpecification} from '@event-driven-io/emmett';
import {describe, it} from 'node:test';
import {PayParkingFeeCommand, PayParkingFeeInitialState, PayParkingFeeState, decide, evolve} from './PayParkingFeeCommand';
import {type ParkingFeePaid, type TicketIssued} from '../ParkAndPayEvents';

describe('PayParkingFee Specification', () => {
    const given = DeciderSpecification.for<PayParkingFeeCommand, TicketIssued | ParkingFeePaid, PayParkingFeeState>({
        decide, evolve, initialState: PayParkingFeeInitialState,
    });

    const issued = (vehicleType: 'CAR' | 'MOTORBIKE', enteredAt: string): TicketIssued => ({
        type: 'TicketIssued',
        data: {ticketId: 't-1', licensePlate: 'B-XY 1', vehicleType, enteredAt},
    });
    const pay = (leftAt: string): PayParkingFeeCommand => ({
        type: 'PayParkingFee', data: {ticketId: 't-1', leftAt}, metadata: {},
    });
    const paid = (leftAt: string, parkingFee: number) => ({
        type: 'ParkingFeePaid' as const, data: {ticketId: 't-1', leftAt, parkingFee},
    });

    it('spec: Daytime: 1h01 enters the 0.80 band', () => {
        given([issued('CAR', '2026-11-18T08:00:00')]).when(pay('2026-11-18T09:01:00'))
            .then([paid('2026-11-18T09:01:00', 2.0)]);
    });

    it('spec: Motorbike pays half the daytime fee', () => {
        given([issued('MOTORBIKE', '2026-11-18T08:00:00')]).when(pay('2026-11-18T09:01:00'))
            .then([paid('2026-11-18T09:01:00', 1.0)]);
    });

    it('spec: Sunday daytime follows the night tariff', () => {
        given([issued('CAR', '2026-11-08T10:00:00')]).when(pay('2026-11-08T13:31:00'))
            .then([paid('2026-11-08T13:31:00', 7.0)]);
    });

    it('spec: Reject paying a ticket that is already paid', () => {
        given([issued('CAR', '2026-11-18T08:00:00'), paid('2026-11-18T09:01:00', 2.0)])
            .when(pay('2026-11-18T09:30:00')).thenThrows();
    });

    it('spec: Reject paying a ticket that was never issued', () => {
        given([]).when(pay('2026-11-18T09:01:00')).thenThrows();
    });
});
