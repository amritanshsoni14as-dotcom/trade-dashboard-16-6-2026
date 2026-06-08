// app/routes/api/live-price-update.ts

import {
    eq,
    gt
} from "drizzle-orm";

import {
    db
} from "~/database/db.server";

import {
    positions
} from "~/database/schema.server";

import {
    doALogin
} from "~/database/utils.server";

const BASE_URL =
    "http://xts.achintya.net.in:3000/apimarketdata";

/* =========================
   BULK QUOTES
========================= */

async function getBulkQuotes(
    exchangeInstrumentIds: number[],
    token: string
) {

    if (!exchangeInstrumentIds.length) {
        return {
        };
    }

    const response =
        await fetch(
            `${BASE_URL}/instruments/quotes`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        token,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    instruments:
                        exchangeInstrumentIds.map((eid) => ({
                            exchangeSegment: 2,

                            exchangeInstrumentID:
                                eid
                        })),

                    xtsMessageCode:
                        1512,

                    publishFormat:
                        "JSON"
                })
            }
        );

    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(text);
    }

    const data =
        await response.json();

    const listQuotes =
        data?.result?.listQuotes ||
        [
        ];

    const ltpMap:
    Record<number, number> = {
    };

    for (const quoteStr of listQuotes) {

        const quote =
            JSON.parse(quoteStr);

        const eid =
            quote.ExchangeInstrumentID;

        const ltp =
            quote.LastTradedPrice;

        if (
            eid &&
            ltp !== undefined
        ) {
            ltpMap[eid] = ltp;
        }
    }

    return ltpMap;
}

/* =========================
   LOADER
========================= */

export async function loader() {

    try {

        /*
        =========================
        GET OPEN POSITIONS
        =========================
        */

        const activePositions =
            await db.query.positions.findMany({
                where:
                    gt(
                        positions.quantity,
                        0
                    )
            });

        /*
        =========================
        UNIQUE IDS
        =========================
        */

        const exchangeIds =
            [
                ...new Set(activePositions.map((p) =>
                    p.exchangeInstrumentId))
            ];

        /*
        =========================
        FETCH QUOTES
        =========================
        */

        const token =
            await doALogin();

        const quoteMap =
            await getBulkQuotes(
                exchangeIds,
                token
            );

        /*
        =========================
        UPDATE DB
        =========================
        */

        for (const position of activePositions) {

            const ltp =
                quoteMap[
                    position.exchangeInstrumentId
                ];

            if (
                ltp === undefined
            ) {
                continue;
            }

            await db
                .update(positions)
                .set({
                    currentPrice:
                        ltp.toFixed(2)
                })
                .where(eq(
                    positions.id,
                    position.id
                ));
        }

        return Response.json({
            success: true,
            message:
                `Updated ${activePositions.length} positions`
        });

    } catch (error) {

        console.error(error);

        return Response.json(
            {
                success: false,
                error:
                    "Failed to update prices"
            },
            {
                status: 500
            }
        );
    }
}
