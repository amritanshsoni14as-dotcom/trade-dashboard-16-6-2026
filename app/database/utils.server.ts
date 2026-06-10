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
                Number(position.currentPrice ??
                        0);

            let diff = 0;

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

            let diff =
                exitPrice -
                    previousSettled;

            /*
                =========================
                SHORT REVERSE
                =========================
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

async function calculatePnLForUser(user: User) {
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
                Number(position.currentPrice ??
                        0);

            let diff = 0;

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

            let diff =
                exitPrice -
                    previousSettled;

            /*
                =========================
                SHORT REVERSE
                =========================
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

export {
    getInstrumentDetails,
    doALogin,
    isMarketHoursIST,
    calculatePnL,
    calculatePnLForUser
};
