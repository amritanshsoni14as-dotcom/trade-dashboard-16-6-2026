// app/routes/dashboard/trades-live.ts

import {
    and,
    eq,
    gt,
    inArray
} from "drizzle-orm";

import {
    db
} from "../../database/db.server";

import {
    positions
} from "../../database/schema.server";

import {
    requireUser
} from "~/utils/auth.server";
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
    if (
        !exchangeInstrumentIds.length
    ) {
        return {
        };
    }

    const response = await fetch(
        `${BASE_URL}/instruments/quotes`,
        {
            method: "POST",

            headers: {
                Authorization: token,

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

                xtsMessageCode: 1512,

                publishFormat: "JSON"
            })
        }
    );

    if (!response.ok) {
        const text =
            await response.text();

        console.log(text);

        throw new Error("Failed to fetch quotes");
    }

    const data =
        await response.json();

    const listQuotes =
        data?.result?.listQuotes ||
        [
        ];

    const ltpMap: Record<
        number,
        number
    > = {
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
   SSE LOADER
========================= */

export async function loader({
    request
}: any) {
    const currentUser =
        await requireUser(request);

    const stream =
        new ReadableStream({
            async start(controller) {
                let closed = false;
                const encoder =
                    new TextEncoder();

                const sendData =
                    async () => {
                        try {
                            /*
                            =========================
                            GET ACTIVE POSITIONS
                            =========================
                            */
                            const whereClause =
                                currentUser.role === "admin"
                                    ? gt(positions.quantity, 0)
                                    : and(
                                        eq(
                                            positions.userId,
                                            currentUser.id
                                        ),

                                        gt(
                                            positions.quantity,
                                            0
                                        )
                                    );

                            const activePositions =
                                await db.query.positions.findMany({
                                    where: whereClause,

                                    with:
                      {
                          user: true
                      }
                                });

                            /*
                            =========================
                            EXTRACT UNIQUE IDS
                            =========================
                            */

                            const exchangeIds =
                                [
                                    ...new Set(activePositions.map((p) =>
                                        p.exchangeInstrumentId))
                                ];

                            /*
                            =========================
                            FETCH LIVE QUOTES
                            =========================
                            */

                            const quoteMap =
                                await getBulkQuotes(
                                    exchangeIds,

                                    await doALogin()
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
                                    ltp ===
                    undefined
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

                            /*
                            =========================
                            REFETCH UPDATED DATA
                            =========================
                            */

                            const updatedPositions =
                                await db.query.positions.findMany({
                                    where: whereClause,

                                    with:
                      {
                          user: true
                      }
                                });

                            /*
                            =========================
                            SPLIT FUTURES / OPTIONS
                            =========================
                            */

                            const futures =
                                updatedPositions.filter((p) =>
                                    p.instrumentType ===
                    "FUTURE").sort((a, b) => a.id - b.id);

                            const options =
                                updatedPositions.filter((p) =>
                                    p.instrumentType ===
                    "OPTIONS").sort((a, b) => a.id - b.id);

                            /*
                            =========================
                            SEND SSE EVENT
                            =========================
                            */

                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                futures,
                                options
                            })}\n\n`));
                        } catch (error) {
                            console.error(error);
                        }
                    };

                /*
                =========================
                INITIAL SEND
                =========================
                */

                await sendData();

                /*
                =========================
                INTERVAL
                =========================
                */

                const interval =
                    setInterval(
                        sendData,
                        2000
                    );

                /*
                =========================
                CLEANUP
                =========================
                */

                request.signal.addEventListener(
                    "abort",
                    () => {
                        clearInterval(interval);

                        controller.close();
                    }
                );
            }
        });

    return new Response(stream, {
        headers: {
            "Content-Type":
                "text/event-stream",

            "Cache-Control":
                "no-cache",

            Connection:
                "keep-alive"
        }
    });
}
