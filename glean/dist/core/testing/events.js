import { Context } from "../context.js";
import EventsDatabase from "../metrics/events_database/async.js";
export async function testRestartGlean(timeOffset = 1000 * 60) {
    Context.startTime.setTime(Context.startTime.getTime() + timeOffset);
    const db = new EventsDatabase();
    await db.initialize();
    return db;
}
