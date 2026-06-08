import {
    and,
    eq,
    gte,
    inArray,
    isNotNull
} from "drizzle-orm";

import {
    db
} from "~/database/db.server";

import {
    positions
} from "~/database/schema.server";

const BASE_URL =
    "http://xts.achintya.net.in:3000/apimarketdata";

/* =========================
   BULK QUOTES
========================= */

async function getBulkQuotes(
    exchangeInstrumentIds: number[],
    token: string
) {

    if (
        !exchangeInstrumentIds.length
    ) {
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
                            exchangeSegment:
                                    2,

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
        throw new Error("Failed quotes fetch");
    }

    const data =
        await response.json();

    const listQuotes =
        data?.result?.listQuotes ??
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

export async function updateSettledPrices(token: string) {

    /*
    =========================
    FETCH POSITIONS
    =========================
    */

    const rows =
        await db.query.positions.findMany({
            where: and(
                inArray(
                    positions.instrumentType,
                    [
                        "OPTIONS",
                        "FUTURE"
                    ]
                ),

                isNotNull(positions.expiry)
            )
        });

    /*
    =========================
    EXTRACT IDS
    =========================
    */

    const exchangeIds =
        [
            ...new Set(rows.map((p) =>
                p.exchangeInstrumentId))
        ];

    /*
    =========================
    FETCH LTPs
    =========================
    */

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

    for (const position of rows) {

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
                settledPrice:
                    ltp.toFixed(2)
            })
            .where(eq(
                positions.id,
                position.id
            ));
    }

    console.log("Evening settled prices updated");
}

export async function updatePreviousSettledPrices(token: string) {

    const rows =
        await db.query.positions.findMany({
            where: and(
                inArray(
                    positions.instrumentType,
                    [
                        "OPTIONS",
                        "FUTURE"
                    ]
                ),

                isNotNull(positions.expiry)
            )
        });

    for (const position of rows) {

        try {

            /*
            =========================
            TRY LAST 10 DAYS
            =========================
            */

            let closePrice:
                string | null = null;

            for (
                let daysAgo = 1;
                daysAgo <= 10;
                daysAgo++
            ) {

                const targetDate =
                    new Date();

                targetDate.setDate(targetDate.getDate() -
                    daysAgo);

                const formattedDate =
                    targetDate.toLocaleDateString(
                        "en-US",
                        {
                            month:
                                "short",

                            day:
                                "2-digit",

                            year:
                                "numeric"
                        }
                    ).replace(",", "");

                const startTime =
                    `${formattedDate} 091500`;

                const endTime =
                    `${formattedDate} 153000`;

                const params =
                    new URLSearchParams({
                        exchangeSegment:
                            "2",

                        exchangeInstrumentID:
                            String(position.exchangeInstrumentId),

                        startTime,

                        endTime,

                        compressionValue:
                            "D"
                    });

                const response =
                    await fetch(
                        `${BASE_URL}/instruments/ohlc?${params.toString()}`,
                        {
                            headers: {
                                Authorization:
                                    token
                            }
                        }
                    );

                if (
                    !response.ok
                ) {
                    continue;
                }

                const data =
                    await response.json();

                const pipeData =
                    data?.result?.dataReponse;

                if (
                    pipeData &&
    pipeData !== ""
                ) {

                    const cleaned =
                        pipeData.replace(/\|$/, "");

                    const parts =
                        cleaned.split("|");

                    if (
                        parts.length >= 5 &&
        parts[4]
                    ) {

                        closePrice =
                            parts[4];

                        // console.log(
                        //     "FOUND",
                        //     position.script,
                        //     formattedDate,
                        //     closePrice
                        // );

                        break;
                    }
                }
            }

            /*
            =========================
            UPDATE DB
            =========================
            */

            if (
                closePrice !== null
            ) {

                await db
                    .update(positions)
                    .set({
                        previousSettledPrice:
                            Number(closePrice).toFixed(2)
                    })
                    .where(eq(
                        positions.id,
                        position.id
                    ));
            }

        } catch (error) {

            console.error(
                position.script,
                error
            );
        }
    }

    console.log("Morning previous settled prices updated");
}
