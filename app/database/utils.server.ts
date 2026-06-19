import {
    and, eq, gt, 
    gte
} from "drizzle-orm";
import {
    requireUser 
} from "~/utils/auth.server";
import {
    positions, 
    trades,
    type User
} from "./schema.server";
import {
    db 
} from "./db.server";

async function doALogin() {
    const BASE_URL = "http://xts.achintya.net.in:3000/apimarketdata";
    const XTS_APP_KEY = "ddc9ca260dee67556bd436";
    const XTS_APP_SECRET = "Fixs437#W1";

    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json" 
        },
        body: JSON.stringify({
            secretKey: XTS_APP_SECRET,
            appKey: XTS_APP_KEY
        })
    });
    // console.log(response);
    const data = await response.json();
    
    return data.result.token;
}

async function getInstrumentDetails({
    script,
    exchange = "NSE",
    instrumentType, // "FUTURE" | "OPTIONS"
    expiry,         // "YYYY-MM-DD" or Date
    strikePrice = null,
    optionType = null,
    tokeny
}) {
    const BASE_URL = "http://xts.achintya.net.in:3000/apimarketdata";

    // 1. Get token if not provided
    const token = tokeny || (await doALogin());
    if (exchange.toUpperCase() !== "NSE") {
        throw new Error("Only NSE derivatives supported");
    }
    if (!expiry) throw new Error("expiry is required");

    const expiryDate = typeof expiry === "string" ? new Date(expiry) : expiry;
    if (isNaN(expiryDate)) throw new Error("invalid expiry");

    const day = String(expiryDate.getDate()).padStart(2, "0");
    const month = expiryDate.toLocaleString("en-US", {
        month: "short" 
    });
    const year = expiryDate.getFullYear();
    const expiryStr = `${day}${month}${year}`;

    const scriptUpper = script.toUpperCase();
    const type = instrumentType.toUpperCase();

    const indexSymbols = new Set([
        "NIFTY",
        "BANKNIFTY",
        "FINNIFTY",
        "MIDCPNIFTY",
        "SENSEX",
        "BANKEX"
    ]);

    const isIndex = indexSymbols.has(scriptUpper);

    let endpoint;
    const params = {
        exchangeSegment: 2,
        symbol: scriptUpper,
        expiryDate: expiryStr
    };

    if (type === "FUTURE") {
        endpoint = "/instruments/instrument/futureSymbol";
        params.series = isIndex ? "FUTIDX" : "FUTSTK";
    } else if (type === "OPTIONS") {
        if (strikePrice == null || optionType == null) {
            throw new Error("strikePrice and optionType are required for OPTIONS");
        }
        endpoint = "/instruments/instrument/optionSymbol";
        params.series = isIndex ? "OPTIDX" : "OPTSTK";
        params.optionType = String(optionType).toUpperCase();
        params.strikePrice = Number(strikePrice);
    } else {
        throw new Error("instrumentType must be FUTURE or OPTIONS");
    }

    const query = new URLSearchParams(params).toString();

    const response = await fetch(`${BASE_URL}${endpoint}?${query}`, {
        method: "GET",
        headers: {
            Authorization: token,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    const result = data?.result?.[0];

    if (!result) return null;

    return {
        exchangeInstrumentId: result.ExchangeInstrumentID,
        lotSize: result.LotSize
    };
}

function isMarketHoursIST() {
    const now = new Date();

    const istTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(now);

    const [
        hour,
        minute
    ] = istTime
        .split(":")
        .map(Number);

    const totalMinutes = hour * 60 + minute;

    // 9:00 AM -> 4:30 PM
    return totalMinutes >= 540 && totalMinutes < 990;
}

/*
=========================
TODAY START (IST)
=========================
*/

function getTodayStartIST() {
    const now = new Date();

    const istDate =
        new Date(now.toLocaleString(
            "en-US",
            {
                timeZone:
                        "Asia/Kolkata"
            }
        ));

    istDate.setHours(
        0,
        0,
        0,
        0
    );

    return istDate;
}

async function calculatePnL(request: Request) {
    /**
     * i think the bottom comment is no longer true tho ... maybe it got changed sometime ago
     */

    /**
 * NOTE FOR FUTURE DEVELOPERS
 *
 * This function calculates MTM PnL using:
 *
 *     current/settled price - previous day's settlement price
 *
 * Therefore it assumes that the entire position quantity existed at the
 * previous settlement.
 *
 * As a result, positions opened today (or quantities added today) will
 * produce incorrect PnL figures, because they were never held at the
 * previous settlement price.
 *
 * A proper implementation would need to distinguish:
 *   - Carry-forward quantity
 *   - Quantity opened today
 *   - Quantity added/reduced during the session
 *
 * At the time of writing, this limitation is known and accepted.
 *
 * If you're reading this because a user finally noticed...
 * good luck, and all the best. 🙂
 */

    const currentUser =
        await requireUser(request);

    const todayDate =
        new Date()
            .toISOString()
            .split("T")[0];

    /*
    =========================
    USER FILTER
    =========================
    */

    const activeWhereClause =
        currentUser.role ===
        "admin"
            ? gt(
                positions.quantity,
                0
            )
            : and(
                eq(
                    positions.userId,
                    currentUser.id
                ),

                and(
                    gt(
                        positions.quantity,
                        0
                    ),

                    gte(
                        positions.expiry,
                        todayDate
                    )
                )
            );

    /*
    =========================
    ACTIVE POSITIONS
    =========================
    */

    const activePositions =
        await db.query.positions.findMany({
            where:
                activeWhereClause,

            with: {
                user: true
            },

            orderBy: (
                positions,
                {
                    asc 
                }
            ) => [
                asc(positions.id)
            ]
        });

    /*
    =========================
    TODAY EXIT TRADES
    =========================
    */

    const todayStart =
        getTodayStartIST();

    const exitTrades =
        (
            await db.query.trades.findMany({

                where:
                currentUser.role ===
                "admin"

                    ? and(

                        eq(
                            trades.tradeType,
                            "EXIT"
                        ),

                        gte(
                            trades.createdAt,
                            todayStart
                        )
                    )

                    : and(

                        eq(
                            trades.tradeType,
                            "EXIT"
                        ),

                        eq(
                            trades.userId,
                            currentUser.id
                        ),

                        gte(
                            trades.createdAt,
                            todayStart
                        )
                    ),

                with: {
                    position: true
                }
            })
        ).filter(trade =>
            trade.position?.expiry &&
            trade.position.expiry >= todayDate);

    /*
    =========================
    MARKET HOURS
    =========================
    */

    const isLiveMarket =
        isMarketHoursIST();

    /*
    =========================
    ACTIVE POSITION PNL
    =========================
    */

    const activePnL =
        activePositions.map((position) => {

            const previousSettled =
                Number(position.previousSettledPrice);

            const settled =
                Number(position.settledPrice);

            const current =
                Number(position.currentPrice ?? 0);

            let diff: number;

            /*
        =========================
        POSITION OPENED TODAY
        =========================

        If the position was opened today,
        there is no meaningful overnight MTM.

        Calculate PnL relative to the
        average entry price:

            LONG  => current - averagePrice
            SHORT => averagePrice - current

        The SHORT reversal is handled later,
        so we calculate:

            current - averagePrice

        here and flip the sign afterwards.
        */

            const createdDate =
                position.createdAt
                    .toISOString()
                    .split("T")[0];

            if (
                createdDate ===
            todayDate
            ) {

                const averagePrice =
                    Number(position.averagePrice);

                diff =
                    current -
                averagePrice;

            } else {

                /*
            =========================
            EXISTING POSITION
            =========================

            Position was carried from a
            previous trading day.

            During market hours use:
                currentPrice - previousSettledPrice

            After market close use:
                settledPrice - previousSettledPrice
            */

                if (
                    isLiveMarket
                ) {

                    diff =
                        current -
                    previousSettled;

                } else {

                    diff =
                        settled -
                    previousSettled;

                }
            }

            /*
        =========================
        SHORT REVERSE
        =========================

        Price increases help LONG positions
        and hurt SHORT positions, so reverse
        the sign for SHORTs.
        */

            if (
                position.positionType ===
            "SHORT"
            ) {
                diff *= -1;
            }

            /*
        =========================
        MULTIPLY LOT SIZE
        =========================

        PnL =
            Price Difference
            × Quantity
            × Lot Size
        */

            const pnl =
                diff *
            position.quantity *
            position.lotSize;
            /*
ACTIVE positions contribute their
notional value:

    LONG  => -avgPrice × qty × lotSize
    SHORT => +avgPrice × qty × lotSize
*/
            const netVal =
                Number(position.averagePrice) *
    position.quantity *
    position.lotSize *
    (
        position.positionType === "LONG"
            ? -1
            : 1
    );

            return {
                ...position,

                pnl,
                netVal,

                source:
                "ACTIVE"
            };
        });

    /*
    =========================
    EXITED POSITION PNL
    =========================
    */

    const exitedPnL =
        exitTrades.map((trade) => {

            const position =
                trade.position;

            const previousSettled =
                Number(position.previousSettledPrice);

            const exitPrice =
                Number(trade.price);

            let diff: number;

            /*
        =========================
        SAME-DAY ENTRY + EXIT
        =========================

        If the position was created today and
        exited today, there is no meaningful
        overnight MTM from a previous settlement.

        In this case, calculate PnL using:

            LONG  => exitPrice - averagePrice
            SHORT => averagePrice - exitPrice

        instead of using previousSettledPrice.
        */

            const sameDay =
                position.createdAt.toDateString() ===
            trade.createdAt.toDateString();

            if (sameDay) {

                const averagePrice =
                    Number(position.averagePrice);

                diff =
                    exitPrice -
                averagePrice;

            } else {

                /*
            =========================
            NORMAL MTM EXIT
            =========================

            Position existed before today.

            Calculate today's realized PnL
            relative to yesterday's settlement.
            */

                diff =
                    exitPrice -
                previousSettled;

            }

            /*
        =========================
        SHORT REVERSE
        =========================

        Price increase benefits LONG positions
        but hurts SHORT positions, so reverse
        the sign for SHORTs.
        */

            if (
                position.positionType ===
            "SHORT"
            ) {
                diff *= -1;
            }

            const pnl =
                diff *
            trade.quantity *
            position.lotSize;

            /*
EXIT positions contribute realized
cash flow, so use the calculated
PnL directly instead of deriving a
notional value from averagePrice.
*/
            const netVal =
                pnl;

            return {
                ...position,

                pnl,
                netVal,

                exitedQuantity:
                trade.quantity,

                exitPrice,

                source:
                "EXIT"
            };
        });

    /*
    =========================
    MERGE
    =========================
    */

    const allPositions =
        [
            ...activePnL,
            ...exitedPnL
        ];

    /*
    =========================
    TOTAL
    =========================
    */

    const totalPnL =
        allPositions.reduce(
            (
                acc,
                position
            ) =>
                acc +
                position.pnl,

            0
        );
    const totalNetVal =
        allPositions.reduce(
            (
                acc,
                position
            ) =>
                acc +
            position.netVal,

            0
        );
    const pnlPercentage =
        totalNetVal === 0
            ? 0
            : (
                totalPnL /
            Math.abs(totalNetVal)
            ) * 100;

    return {
        positions:
            allPositions,

        totalPnL,
        totalNetVal,
        pnlPercentage
    };
}

async function calculatePnLForUser(user: User) {
    /**
 * NOTE FOR FUTURE DEVELOPERS
 *
 * This function calculates MTM PnL using:
 *
 *     current/settled price - previous day's settlement price
 *
 * Therefore it assumes that the entire position quantity existed at the
 * previous settlement.
 *
 * As a result, positions opened today (or quantities added today) will
 * produce incorrect PnL figures, because they were never held at the
 * previous settlement price.
 *
 * A proper implementation would need to distinguish:
 *   - Carry-forward quantity
 *   - Quantity opened today
 *   - Quantity added/reduced during the session
 *
 * At the time of writing, this limitation is known and accepted.
 *
 * If you're reading this because a user finally noticed...
 * good luck, and all the best. 🙂
 */
    const todayDate =
        new Date()
            .toISOString()
            .split("T")[0];

    // const currentUser =
    //     await requireUser(request);

    /*
    =========================
    USER FILTER
    =========================
    */

    const activeWhereClause =
        user.role ===
        "admin"
            ? gt(
                positions.quantity,
                0
            )
            : and(
                gt(
                    positions.quantity,
                    0
                ),

                gte(
                    positions.expiry,
                    todayDate
                )
            );

    /*
    =========================
    ACTIVE POSITIONS
    =========================
    */

    const activePositions =
        await db.query.positions.findMany({
            where:
                activeWhereClause,

            with: {
                user: true
            },

            orderBy: (
                positions,
                {
                    asc 
                }
            ) => [
                asc(positions.id)
            ]
        });

    /*
    =========================
    TODAY EXIT TRADES
    =========================
    */

    const todayStart =
        getTodayStartIST();

    const exitTrades =
        (
            await db.query.trades.findMany({

                where:
                user.role ===
                "admin"

                    ? and(

                        eq(
                            trades.tradeType,
                            "EXIT"
                        ),

                        gte(
                            trades.createdAt,
                            todayStart
                        )
                    )

                    : and(

                        eq(
                            trades.tradeType,
                            "EXIT"
                        ),

                        eq(
                            trades.userId,
                            user.id
                        ),

                        gte(
                            trades.createdAt,
                            todayStart
                        )
                    ),

                with: {
                    position: true
                }
            })
        ).filter(trade =>
            trade.position?.expiry &&
            trade.position.expiry >= todayDate);

    /*
    =========================
    MARKET HOURS
    =========================
    */

    const isLiveMarket =
        isMarketHoursIST();

    /*
    =========================
    ACTIVE POSITION PNL
    =========================
    */

    const activePnL =
        activePositions.map((position) => {

            const previousSettled =
                Number(position.previousSettledPrice);

            const settled =
                Number(position.settledPrice);

            const current =
                Number(position.currentPrice ?? 0);

            let diff: number;

            /*
        =========================
        POSITION OPENED TODAY
        =========================

        If the position was opened today,
        there is no meaningful overnight MTM.

        Calculate PnL relative to the
        average entry price:

            LONG  => current - averagePrice
            SHORT => averagePrice - current

        The SHORT reversal is handled later,
        so we calculate:

            current - averagePrice

        here and flip the sign afterwards.
        */

            const createdDate =
                position.createdAt
                    .toISOString()
                    .split("T")[0];

            if (
                createdDate ===
            todayDate
            ) {

                const averagePrice =
                    Number(position.averagePrice);

                diff =
                    current -
                averagePrice;

            } else {

                /*
            =========================
            EXISTING POSITION
            =========================

            Position was carried from a
            previous trading day.

            During market hours use:
                currentPrice - previousSettledPrice

            After market close use:
                settledPrice - previousSettledPrice
            */

                if (
                    isLiveMarket
                ) {

                    diff =
                        current -
                    previousSettled;

                } else {

                    diff =
                        settled -
                    previousSettled;

                }
            }

            /*
        =========================
        SHORT REVERSE
        =========================

        Price increases help LONG positions
        and hurt SHORT positions, so reverse
        the sign for SHORTs.
        */

            if (
                position.positionType ===
            "SHORT"
            ) {
                diff *= -1;
            }

            /*
        =========================
        MULTIPLY LOT SIZE
        =========================

        PnL =
            Price Difference
            × Quantity
            × Lot Size
        */

            const pnl =
                diff *
            position.quantity *
            position.lotSize;

            return {
                ...position,

                pnl,

                source:
                "ACTIVE"
            };
        });

    /*
    =========================
    EXITED POSITION PNL
    =========================
    */

    const exitedPnL =
        exitTrades.map((trade) => {

            const position =
                trade.position;

            const previousSettled =
                Number(position.previousSettledPrice);

            const exitPrice =
                Number(trade.price);

            let diff: number;

            /*
        =========================
        SAME-DAY ENTRY + EXIT
        =========================

        If the position was created today and
        exited today, there is no meaningful
        overnight MTM from a previous settlement.

        In this case, calculate PnL using:

            LONG  => exitPrice - averagePrice
            SHORT => averagePrice - exitPrice

        instead of using previousSettledPrice.
        */

            const sameDay =
                position.createdAt.toDateString() ===
            trade.createdAt.toDateString();

            if (sameDay) {

                const averagePrice =
                    Number(position.averagePrice);

                diff =
                    exitPrice -
                averagePrice;

            } else {

                /*
            =========================
            NORMAL MTM EXIT
            =========================

            Position existed before today.

            Calculate today's realized PnL
            relative to yesterday's settlement.
            */

                diff =
                    exitPrice -
                previousSettled;

            }

            /*
        =========================
        SHORT REVERSE
        =========================

        Price increase benefits LONG positions
        but hurts SHORT positions, so reverse
        the sign for SHORTs.
        */

            if (
                position.positionType ===
            "SHORT"
            ) {
                diff *= -1;
            }

            const pnl =
                diff *
            trade.quantity *
            position.lotSize;

            return {
                ...position,

                pnl,

                exitedQuantity:
                trade.quantity,

                exitPrice,

                source:
                "EXIT"
            };
        });

    /*
    =========================
    MERGE
    =========================
    */

    const allPositions =
        [
            ...activePnL,
            ...exitedPnL
        ];

    /*
    =========================
    TOTAL
    =========================
    */

    const totalPnL =
        allPositions.reduce(
            (
                acc,
                position
            ) =>
                acc +
                position.pnl,

            0
        );

    return {
        positions:
            allPositions,

        totalPnL
    };
}

/* =========================
   CHECK EXISTING PNL
========================= */

export async function getExistingDailyPnL(userId: number, date: string) {
    return db.query.dailyPnls.findFirst({
        where: (table, {
            eq, and 
        }) =>
            and(
                eq(table.userId, Number(userId)),
                eq(table.tradingDate, date)
            )
    });
}

/* =========================
   GET LATEST PNL ENTRY
========================= */

export async function getLatestDailyPnL(userId: number) {
    return db.query.dailyPnls.findFirst({
        where: (table, {
            eq 
        }) =>
            eq(table.userId, Number(userId)),

        orderBy: (table, {
            desc 
        }) => [
            desc(table.tradingDate)
        ]
    });
}

const BASE_URL =
    "http://xts.achintya.net.in:3000";

async function getToken() {
    const response =
        await fetch(
            `${BASE_URL}/apimarketdata/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    appKey: "ddc9ca260dee67556bd436",
                    secretKey: "Fixs437#W1"
                })
            }
        );

    if (!response.ok) {
        throw new Error("Login failed");
    }

    const data =
        await response.json();

    return data.result.token;
}

async function getLastTradedPrice(token) {
    const response =
        await fetch(
            `${BASE_URL}/apimarketdata/instruments/quotes`,
            {
                method: "POST",
                headers: {
                    Authorization: token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    instruments: [
                        // this is only for nifty, 
                        // todo: figure out sensex + banknifty
                        // mehhhh... do u think any1 will see it ??
                        {
                            exchangeSegment: 1,
                            exchangeInstrumentID: 26000
                        }
                    ],
                    xtsMessageCode: 1512,
                    publishFormat: "JSON"
                })
            }
        );

    if (!response.ok) {
        throw new Error("Quote request failed");
    }

    const data =
        await response.json();

    const quote =
        JSON.parse(data.result.listQuotes[0]);

    return quote.LastTradedPrice;
}

export {
    getInstrumentDetails,
    doALogin,
    isMarketHoursIST,
    calculatePnL,
    calculatePnLForUser,
    getLastTradedPrice,
    getToken
};
