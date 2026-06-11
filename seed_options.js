import { db } from "./app/database/db.server.ts";

import {
    positions,
    trades
} from "./app/database/schema.server.ts";

import {
    eq
} from "drizzle-orm";

const EXPIRY_DATE = "2026-05-27";

const instrumentMap = {
    BEL: {
        lotSize: 1425,
        exchangeInstrumentId: 1425
    },

    BHEL: {
        lotSize: 2625,
        exchangeInstrumentId: 2625
    },

    SAIL: {
        lotSize: 4700,
        exchangeInstrumentId: 4700
    },

    PNB: {
        lotSize: 8000,
        exchangeInstrumentId: 8000
    },

    NTPC: {
        lotSize: 1500,
        exchangeInstrumentId: 1500
    }
};

const positionCache = {};

function normalizeDate(d) {

    const [day, month, year] =
        d.split(".");

    return new Date(
        `${year}-${month}-${day}T00:00:00Z`
    );
}

async function createPosition({
    symbol,
    strikePrice,
    optionType,
    userId,
    entryPrice
}) {

    const meta =
        instrumentMap[symbol];

    const [pos] =
        await db.insert(positions)
            .values({
                userId,

                script: symbol,

                exchange: "NSE",

                instrumentType: "OPTIONS",

                expiry: EXPIRY_DATE,

                strikePrice:
                    strikePrice.toString(),

                optionType,

                positionType: "SHORT",

                quantity: 0,

                lotSize: meta.lotSize,

                exchangeInstrumentId:
                    meta.exchangeInstrumentId,

                entryPrice,

                averagePrice: entryPrice,

                currentPrice: entryPrice
            })
            .returning();

    return pos;
}

export async function importOptionTrades(
    userId,
    rawData
) {

    const lines =
        rawData
            .split("\n")
            .map(l => l.trim())
            .filter(Boolean);

    for (const line of lines) {

        const p =
            line.split(/\s+/);

        const symbol =
            p[0];

        const strikePrice =
            Number(p[1]);

        const optionType =
            p[2];

        const entryDate =
            p[3];

        const entryQty =
            Math.abs(Number(p[4]));

        const entryPrice =
            Number(p[5]);

        const exitDate =
            p[6];

        const exitQty =
            Number(p[7]);

        const exitPrice =
            Number(p[8]);

        console.log({
            symbol,
            strikePrice,
            optionType,

            entryDate,
            entryQty,
            entryPrice,

            exitDate,
            exitQty,
            exitPrice
        });

        const key =
            `${symbol}:${strikePrice}:${optionType}`;

        if (!positionCache[key]) {

            positionCache[key] =
                await createPosition({
                    symbol,
                    strikePrice,
                    optionType,
                    userId,
                    entryPrice
                });
        }

        const position =
            positionCache[key];

        /**
         * =========================
         * SELL ENTRY
         * =========================
         */

        await db.insert(trades)
            .values({
                positionId: position.id,

                userId,

                tradeType: "ADD",

                quantity: entryQty,

                price: entryPrice,

                notes:
                    `SELL ${symbol} ${strikePrice} ${optionType}`,

                createdAt:
                    normalizeDate(entryDate)
            });

        /**
         * =========================
         * BUYBACK EXIT
         * =========================
         */

        await db.insert(trades)
            .values({
                positionId: position.id,

                userId,

                tradeType: "EXIT",

                quantity: exitQty,

                price: exitPrice,

                notes:
                    `BUYBACK ${symbol} ${strikePrice} ${optionType}`,

                createdAt:
                    normalizeDate(exitDate)
            });

        await db.update(positions)
            .set({
                currentPrice:
                    exitPrice
            })
            .where(
                eq(
                    positions.id,
                    position.id
                )
            );
    }
}




/**
 * TEST DATA
 */
const rawData = `BHEL	352.5 PE	28.04.2026	-108	16.05	05.05.2026	108	4.29
PNB	112 PE	28.04.2026	-94	4.31	26.05.2026	47	6.3
NTPC	407.5 PE	28.04.2026	-128	10.63	26.05.2026	64	18.48
`;



await importOptionTrades(1, rawData);