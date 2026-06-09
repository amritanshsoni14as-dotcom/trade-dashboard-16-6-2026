
// app/routes/api/store-daily-pnl.ts

import {
    and,
    eq
} from "drizzle-orm";

import {
    db
} from "~/database/db.server";

import {
    dailyPnls
} from "~/database/schema.server";

import {
    calculatePnLForUser,
    getExistingDailyPnL,
    getLatestDailyPnL
} from "~/database/utils.server";

/* =========================
   LOADER
========================= */

export async function loader() {

    /*
    =========================
    TODAY DATE (IST)
    =========================
    */

    const today =
        new Date()
            .toLocaleDateString(
                "en-CA",
                {
                    timeZone:
                        "Asia/Kolkata"
                }
            );

    /*
    =========================
    GET ALL USERS
    =========================
    */

    const allUsers =
        await db.query.users.findMany();

    /*
    =========================
    LOOP USERS
    =========================
    */

    for (const user of allUsers) {

        /*
        =========================
        PREVENT DUPLICATE ENTRY
        =========================
        */

        const existing = await getExistingDailyPnL(user.id, today);

        if (existing) {
            continue;
        }

        /*
        =========================
        CALCULATE DAILY PNL
        =========================
        */

        const data =
            await calculatePnLForUser(user);

        const previousEntry = await getLatestDailyPnL(user.id);

        const currentPnL =
            Number(data.totalPnL.toFixed(2));

        if (
            previousEntry &&
    Number(previousEntry.pnl).toFixed(2) ===
currentPnL.toFixed(2)
        ) {

            console.log(`Skipping ${user.username} (holiday/no change)`);

            continue;
        }

        /*
        =========================
        STORE SNAPSHOT
        =========================
        */

        await db
            .insert(dailyPnls)
            .values({
                userId:
                    user.id,

                pnl:
                    data.totalPnL.toFixed(2),

                tradingDate:
                    today
            });
    }

    return Response.json({
        success: true
    });
}

