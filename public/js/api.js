// The only place that talks to the backend. Everything is event-based: commands in, events/projections out.

// vehicle is 'CAR' or 'MOTORBIKE'; motorbikes pay a different fee.
// Running fee of a ticket, priced by the backend from its CurrentParkingFee projection (built from events).
// Resolves to null while the ticket is not projected yet.
export async function fetchFee(at, ticketId) {
    const params = new URLSearchParams({ at, ticketId });
    const response = await fetch(`/api/fee?${params}`);
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`fee request failed: ${response.status}`);
    }
    return response.json();
}

// Event-sourced side: record what happens in the garage. Fire and forget; the simulation never waits for it.
// Commands: resolve when accepted ("already paid" is fine for a retry), throw otherwise.
async function post(path, body) {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) {
        const alreadyPaid = response.status === 409
            && (await response.json().catch(() => ({}))).error === 'Ticket has already been paid';
        if (!alreadyPaid) throw Object.assign(new Error(`${path} failed: ${response.status}`), { status: response.status });
    }
}

// Timestamps are the simulated clock, so fees stored in events match what the simulation charges.
export const issueTicket = (ticketId, licensePlate, vehicleType, enteredAt) =>
    post(`/api/issueticket/${encodeURIComponent(ticketId)}`, { licensePlate, vehicleType, enteredAt });

export const payParkingFee = (ticketId, leftAt) =>
    post(`/api/payparkingfee/${encodeURIComponent(ticketId)}`, { leftAt });

// The :id in the URL is only a request id (events go to the garage stream); the plate travels in the body so the event knows the car.
export const reportLostTicket = (streamId, licensePlate, vehicleType, leftAt) =>
    post(`/api/reportlostticket/${encodeURIComponent(streamId)}`, { licensePlate, vehicleType, leftAt });

// Total revenue is the TotalRevenue projection: { totalRevenue, payments }.
export async function fetchTotalRevenue() {
    const response = await fetch('/api/query/totalrevenue');
    if (!response.ok) throw new Error(`total revenue request failed: ${response.status}`);
    return response.json();
}

// Cars currently in the garage is the CarsInGarage projection: [{ ticketId, licensePlate, vehicleType, enteredAt }].
export async function fetchCarsInGarage() {
    const response = await fetch('/api/query/carsingarage-collection');
    if (!response.ok) throw new Error(`cars in garage request failed: ${response.status}`);
    return response.json();
}

// All Park and Pay events live in the single 'garage' stream (newest first).
export const GARAGE_STREAM = 'garage';

// The latest events of one stream: the single source of what was charged.
export async function fetchStreamEvents(streamId = GARAGE_STREAM, limit = 200) {
    const response = await fetch(`/api/events?streamId=${encodeURIComponent(streamId)}&limit=${limit}`);
    if (!response.ok) throw new Error(`events request failed: ${response.status}`);
    return (await response.json()).events;
}

// Garage Capacity read model: { capacity, carsInGarage, freeSpots }.
export async function fetchGarageCapacity() {
    const response = await fetch('/api/query/garagecapacity-collection');
    if (!response.ok) throw new Error(`garage capacity request failed: ${response.status}`);
    return response.json();
}

// Change Garage Capacity command (fixed stream); resolves to the new capacity.
export async function setCapacity(capacity) {
    await post('/api/changegaragecapacity/garage-capacity', { capacity });
    return capacity;
}

// Dev helper: deletes all events and read-model rows (capacity back to its default).
export const resetAll = () => post('/api/reset');
