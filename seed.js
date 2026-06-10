import { db } from "./app/database/db.server.ts";
import { positions, trades } from "./app/database/schema.server.ts";
import { eq, sql } from "drizzle-orm";

const EXPIRY_DATE = "2026-05-27";

const instrumentMap = {
    BEL: { lotSize: 1425, exchangeInstrumentId: 1425 },
    BHEL: { lotSize: 2625, exchangeInstrumentId: 2625 },
    SAIL: { lotSize: 4700, exchangeInstrumentId: 4700 },
    PNB: { lotSize: 8000, exchangeInstrumentId: 8000 },
    NTPC: { lotSize: 1500, exchangeInstrumentId: 1500 }
};

/**
 * per-symbol runtime state
 */
const state = {};

function getState(symbol, userId) {
    const key = `${userId}:${symbol}`;

    if (!state[key]) {
        state[key] = {
            quantity: 0
        };
    }

    return state[key];
}

async function createPosition(symbol, userId, entryPrice) {
    const meta = instrumentMap[symbol];

    const [pos] = await db.insert(positions).values({
        userId,
        script: symbol,
        exchange: "NSE",
        instrumentType: "FUTURE",
        expiry: EXPIRY_DATE,

        strikePrice: null,
        optionType: null,
        positionType: "LONG",

        quantity: 0,
        lotSize: meta.lotSize,
        exchangeInstrumentId: meta.exchangeInstrumentId,

        entryPrice,
        averagePrice: entryPrice,
        currentPrice: entryPrice
    }).returning();

    return pos;
}

const positionCache = {};

/**
 * =========================
 * FINAL IMPORTER (CORRECT MODEL)
 * =========================
 */
export async function importTrades(userId, rawData) {
    const lines = rawData
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    for (const line of lines) {
        const p = line.split(/\s+/);

        const symbol = p[0];

        const entryQty = Number(p[2]);
        const entryPrice = Number(p[3]);

        const exitQty = Number(p[5]);
        const exitPrice = Number(p[6]);
        console.log({
            raw: line,
            symbol,
            entryQty,
            entryPrice,
            exitQty,
            exitPrice
        });

        if (!positionCache[symbol]) {
            positionCache[symbol] = await createPosition(symbol, userId, entryPrice);
        }

        const position = positionCache[symbol];
        const s = getState(symbol, userId);

        /**
         * =========================
         * ENTRY (ADD)
         * =========================
         */
        if (entryQty > 0) {
            const newQty = s.quantity + entryQty;

            await db.insert(trades).values({
                positionId: position.id,
                userId,
                tradeType: "ADD",
                quantity: entryQty,
                price: entryPrice,
                notes: `ADD ${symbol}`
            });

            s.quantity = newQty;

            await db.update(positions)
                .set({
                    // quantity: sql`${newQty}`,
                    currentPrice: entryPrice
                })
                .where(eq(positions.id, position.id));
        }

        /**
         * =========================
         * EXIT
         * =========================
         */
        if (exitQty && exitQty > 0) {
            const closeQty = Math.min(exitQty, s.quantity);

            s.quantity -= closeQty;

            await db.insert(trades).values({
                positionId: position.id,
                userId,
                tradeType: "EXIT",
                quantity: closeQty,
                price: exitPrice,
                notes: `EXIT ${symbol}`
            });

            await db.update(positions)
                .set({
                    // quantity: sql`${s.quantity}`,
                    currentPrice: exitPrice
                })
                .where(eq(positions.id, position.id));
        }
    }

    return state;
}
/**
 * TEST DATA
 */
const rawData = `BEL	28.04.2026	280	436.63	26.05.2026	280	420.55
						
						
BHEL	28.04.2026	216	353.39	26.05.2026	216	416.19
						
						
PNB	28.04.2026	266	110.3	28.04.2026	266	105.97
						
						
						
SAIL	28.04.2026	222	186.9	26.05.2026	222	202.46
						
						
						
NTPC	28.04.2026	320	404.86	26.05.2026	320	389.5
`;

await importTrades(1, rawData);