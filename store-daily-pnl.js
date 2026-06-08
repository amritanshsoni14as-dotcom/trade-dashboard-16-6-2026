

const BASE_URL =
    "http://localhost:5173/api/store-daily-pnl";

/*
=========================
PREVENT MULTIPLE RUNS
=========================
*/

let lastRunDate = null;

/*
=========================
STORE DAILY PNL
=========================
*/

async function storeDailyPnL() {

    try {

        const response =
            await fetch(BASE_URL);

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

    /*
    =========================
    IST TIME
    =========================
    */

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

    /*
    =========================
    IST DATE
    =========================
    */

    const istDate =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Kolkata"
            }
        ).format(now);

    /*
    =========================
    PARSE TIME
    =========================
    */

    const [
        hour,
        minute
    ] = istTime
        .split(":")
        .map(Number);

    /*
    =========================
    RUN AT 4:00 PM IST
    =========================
    */

    if (
        hour === 16 &&
        minute === 0 &&
        lastRunDate !== istDate
    ) {

        console.log(
            "Running daily pnl snapshot..."
        );

        await storeDailyPnL();

        lastRunDate =
            istDate;
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
    30000
);

