import {getSQLiteEventStore, sqliteConnection} from "@event-driven-io/emmett-sqlite";
import {projections} from "@event-driven-io/emmett";
import {TotalRevenueProjection} from "../slices/ParkAndPay/TotalRevenue/TotalRevenueProjection";
import {CurrentParkingFeeProjection} from "../slices/ParkAndPay/CurrentParkingFee/CurrentParkingFeeProjection";
import {CarsInGarageProjection} from "../slices/ParkAndPay/CarsInGarage/CarsInGarageProjection";
import {GarageCapacityProjection} from "../slices/ParkAndPay/ChangeGarageCapacity/GarageCapacityProjection";
import {sqliteDbPath} from "./db";

export const allProjections = [
    TotalRevenueProjection,
    CurrentParkingFeeProjection,
    CarsInGarageProjection,
    GarageCapacityProjection,
];

let eventStoreInstance: ReturnType<typeof getSQLiteEventStore> | null = null;

export const findEventstore = async () => {
    if (!eventStoreInstance) {
        // One shared, busy_timeout-configured connection: without it the store opens a fresh connection per
        // operation, each with SQLite's default zero busy timeout, which fails under write-lock contention.
        const connection = sqliteConnection({fileName: sqliteDbPath});
        await connection.command('PRAGMA busy_timeout = 15000;');
        eventStoreInstance = getSQLiteEventStore({
            fileName: sqliteDbPath,
            connectionOptions: {connection, singleton: true},
            schema: {autoMigration: "CreateOrUpdate"},
            projections: projections.inline(allProjections),
        });
        await eventStoreInstance.schema.migrate();
    }
    return eventStoreInstance;
};
