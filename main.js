import fs from "node:fs";
import path from "node:path";

/*
=========================
LOGGING
=========================
*/

const LOG_DIR =
    path.join(
        process.cwd(),
        "logs"
    );

if (
    !fs.existsSync(LOG_DIR)
) {
    fs.mkdirSync(
        LOG_DIR,
        {
            recursive: true
        }
    );
}

const today =
    new Date()
        .toISOString()
        .split("T")[0];

const LOG_FILE =
    path.join(
        LOG_DIR,
        `market-job-${today}.log`
    );

function writeLog(
    level,
    ...args
) {

    const message =
        args
            .map((arg) => {

                if (
                    typeof arg ===
                    "object"
                ) {

                    try {

                        return JSON.stringify(
                            arg
                        );

                    } catch {

                        return String(
                            arg
                        );
                    }
                }

                return String(
                    arg
                );
            })
            .join(" ");

    const line =
        `[${getFormattedTime()}] [${level}] ${message}\n`;

    process.stdout.write(
        line
    );

    fs.appendFile(
        LOG_FILE,
        line,
        (error) => {

            if (
                error
            ) {

                console.error(
                    "Failed to write log:",
                    error
                );
            }
        }
    );
}

function log(
    ...args
) {
    writeLog(
        "INFO",
        ...args
    );
}

function error(
    ...args
) {
    writeLog(
        "ERROR",
        ...args
    );
}




/*
=========================
BASE URLS
=========================
*/

const LIVE_PRICE_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/live-price-update";

const DAILY_PNL_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/store-daily-pnl";

const SETTLEMENT_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/api-settlement";


/*
=========================
HELPER - FORMATTED TIME
=========================
*/

function getFormattedTime() {
    const now = new Date();
    return now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '');
}


/*
=========================
FILE 1 - LIVE PRICE UPDATE
=========================
*/

async function updateLivePrices() {

    const formatted = getFormattedTime();

    try {

        const response =
            await fetch(LIVE_PRICE_URL);

        const data =
            await response.json();

        log(`[UPDATING LIVE PRICES]`, data);

    } catch (error) {

        error(`[UPDATING LIVE PRICES]`, error);
    }
}


/*
=========================
FILE 3 - SETTLEMENT
=========================
*/

async function runSettlement() {

    const formatted = getFormattedTime();

    try {

        const response =
            await fetch(SETTLEMENT_URL);

        const data =
            await response.json();

        log(`[UPDATING SETTLEMENT PRICES]`, data);

    } catch (error) {

        error(`[UPDATING SETTLEMENT PRICES]`, error);
    }
}


/*
=========================
FILE 2 - STORE DAILY PNL
=========================
*/

async function storeDailyPnL() {

    try {

        const response =
            await fetch(DAILY_PNL_URL);

        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(text);
        }

        const data =
            await response.json();

        log(
            `[UPDATING DAILY PNL]`,
            data
        );

    } catch (error) {

        error(
            `[UPDATING DAILY PNL]`,
            error
        );
    }
}


/*
=========================
FILE 2 - SCHEDULER (4PM IST)
=========================
*/

async function scheduler() {

    const now =
        new Date();

    const istTime =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        ).format(now);

    const [hour] =
        istTime
            .split(":")
            .map(Number);

    /*
    =========================
    RUN AFTER 4 PM IST
    =========================
    */

    if (hour >= 16 && hour < 17) {

        console.log(
            "Running daily pnl snapshot..."
        );

        await storeDailyPnL();
    }
}


/*
=========================
INIT - START ALL
=========================
*/

console.log("Daily PnL scheduler started...");

// Live price update — every 2 sec
setInterval(updateLivePrices, 2000);

// Settlement — every 2 sec
setInterval(runSettlement, 2000);

// Daily PnL scheduler — every 10 sec
setInterval(scheduler, 10000);

process.on(
    "uncaughtException",
    (err) => {

        error(
            "UNCAUGHT EXCEPTION:",
            err
        );
    }
);

process.on(
    "unhandledRejection",
    (err) => {

        error(
            "UNHANDLED REJECTION:",
            err
        );
    }
);