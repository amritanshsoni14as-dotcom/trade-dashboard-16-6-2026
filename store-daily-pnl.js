

const BASE_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/store-daily-pnl";

/*
=========================
PREVENT MULTIPLE RUNS
=========================
*/

// let lastRunDate = null;

/*
=========================
STORE DAILY PNL
=========================
*/

async function storeDailyPnL() {

    try {

        const response =
            await fetch(BASE_URL);

        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(text);
        }

        const data =
            await response.json();



        console.log(
            `[${new Date().toLocaleTimeString()}]`,
            data
        );

    } catch (error) {

        console.error(
            `[${new Date().toLocaleTimeString()}]`,
            error
        );
    }
}

/*
=========================
SCHEDULER
=========================
*/

async function scheduler() {

    const now =
        new Date();

    const istTime =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone:
                    "Asia/Kolkata",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    false
            }
        ).format(now);

    const [
        hour
    ] = istTime
        .split(":")
        .map(Number);

    /*
    =========================
    RUN AFTER 4 PM
    =========================
    */

    if (
        hour >= 16 &&
        hour < 17
    ) {

        console.log(
            "Running daily pnl snapshot..."
        );

        await storeDailyPnL();
    }
}



/*
=========================
INITIAL LOG
=========================
*/

console.log(
    "Daily PnL scheduler started..."
);

/*
=========================
CHECK EVERY 30 SEC
=========================
*/

setInterval(
    scheduler,
    10000
);

