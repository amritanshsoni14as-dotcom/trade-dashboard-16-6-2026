import { db } from "./app/database/db.server.ts";

import {
    positions,
    trades
} from "./app/database/schema.server.ts";

import {
    eq
} from "drizzle-orm";

const EXPIRY_DATE = "2026-04-30";

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
const rawData = `BEL	400 PE	30.03.2026	-140	16.38	08.04.2026	140	3.44
BHEL	247.5 PE	30.03.2026	-108	11.45	09.04.2026	108	2.26
PNB	102 PE	30.03.2026	-94	5.27	09.04.2026	94	1.08
SAIL	152 PE	02.04.2026	111	5.21	20.04.2026	111	0.5
NTPC	375 PE	30.03.2026	-128	10.63	13.04.2026	128	3.05
`;



await importOptionTrades(1, rawData);