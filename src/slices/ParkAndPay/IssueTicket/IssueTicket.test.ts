import {DeciderSpecification} from '@event-driven-io/emmett';
import {describe, it} from 'node:test';
import {IssueTicketCommand, IssueTicketInitialState, IssueTicketState, decide, evolve} from './IssueTicketCommand';
import {type GarageEvent, type ParkingFeePaid, type TicketIssued} from '../ParkAndPayEvents';

describe('IssueTicket Specification', () => {
    const given = DeciderSpecification.for<IssueTicketCommand, GarageEvent, IssueTicketState>({
        decide, evolve, initialState: IssueTicketInitialState,
    });

    const data = {ticketId: 't-new', licensePlate: 'B-XY 1', vehicleType: 'CAR' as const, enteredAt: '2026-11-18T08:00:00'};
    const issue: IssueTicketCommand = {type: 'IssueTicket', data, metadata: {}};
    const issued = (i: number): TicketIssued => ({type: 'TicketIssued', data: {...data, ticketId: `t-${i}`}});
    const paid: ParkingFeePaid = {type: 'ParkingFeePaid', data: {ticketId: 't-0', leftAt: '2026-11-18T09:00:00', parkingFee: 2}};
    const fullGarage = Array.from({length: 1}, (_, i) => issued(i));

    it('spec: Car enters and takes a ticket', () => {
        given([]).when(issue).then([{type: 'TicketIssued', data}]);
    });

    it('spec: Reject ticket when the only spot is are taken', () => {
        given(fullGarage).when(issue).thenThrows();
    });

    it('spec: Car enters after another car has paid and left', () => {
        given([...fullGarage, paid]).when(issue).then([{type: 'TicketIssued', data}]);
    });

    it('rejects a ticket id that was already issued', () => {
        given([{type: 'TicketIssued', data}]).when(issue).thenThrows();
    });

    it('honours a changed capacity from the stream', () => {
        given([issued(0), {type: 'GarageCapacityChanged', data: {capacity: 1}}]).when(issue).thenThrows();
        given([...fullGarage, {type: 'GarageCapacityChanged', data: {capacity: 49}}]).when(issue)
            .then([{type: 'TicketIssued', data}]);
    });

    it('frees a spot when a car leaves with a lost ticket', () => {
        given([...fullGarage, {type: 'LostTicketFeeCharged', data: {licensePlate: 'B-XY 1', vehicleType: 'CAR', leftAt: '2026-11-18T10:00:00', parkingFee: 14}}])
            .when(issue).then([{type: 'TicketIssued', data}]);
    });
});
