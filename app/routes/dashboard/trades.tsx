import {
    eq,
    gt,
    desc
} from "drizzle-orm";

import {
    db
} from "../../database/db.server";

import {
    positions,
    trades
} from "../../database/schema.server";

import {
    requireUser
} from "~/utils/auth.server";

import styles from "./trades.module.css";
import {
    useEffect, useState 
} from "react";
import {
    Form, 
    useNavigation,
    useRevalidator
} from "react-router";
import {
    calculatePnL 
} from "~/database/utils.server";

export async function loader({
    request
}: any) {
    const user = await requireUser(request);

    const intraday_data =
        await calculatePnL(request);

    /*
    =========================
    ADMIN
    =========================
    */

    const whereClause =
        user.role === "admin"
            ? gt(positions.quantity, 0)
            : eq(positions.userId, user.id);

    const rows = await db.query.positions.findMany({
        where:
        user.role === "admin"
            ? gt(positions.quantity, 0)
            : (table, {
                and 
            }) =>
                and(
                    eq(table.userId, user.id),
                    gt(table.quantity, 0)
                ),

        with: {
            user: true
        },

        orderBy: [
            desc(positions.createdAt)
        ]
    });

    const futures = rows.filter((position) =>
        position.instrumentType ===
      "FUTURE").sort((a, b) => a.id - b.id);

    const options = rows.filter((position) =>
        position.instrumentType ===
      "OPTIONS").sort((a, b) => a.id - b.id);

    const exitTrades = await db.query.trades.findMany({
        where: (table, {
            eq 
        }) => eq(table.tradeType, "EXIT"),
        with: {
            user: true,
            position: true
        },
        orderBy: (table, {
            desc 
        }) => [
            desc(table.createdAt)
        ]
    });

    const exitTradesWithPnL = exitTrades.map((trade: any) => {
        const position = trade.position;

        const avgPrice = Number(position.averagePrice);
        const exitPrice = Number(trade.price);
        const qty = Number(trade.quantity);
        const lotSize = Number(position.lotSize || 1);

        let pnl = 0;

        if (position.positionType === "LONG") {
            pnl = (exitPrice - avgPrice) * qty * lotSize;
        } else {
            pnl = (avgPrice - exitPrice) * qty * lotSize;
        }

        return {
            ...trade,
            pnl: Number(pnl.toFixed(2)),
            avgPrice,
            exitPrice,
            qty,
            lotSize
        };
    });
    return {
        user,
        futures,
        options,
        exitTrades: exitTradesWithPnL,
        intraday_data
    };
}

/* =========================
   ACTION
========================= */

export async function action({
    request
}: Route.ActionArgs) {

    const currentUser =
        await requireUser(request);

    const formData =
        await request.formData();

    const positionId =
        Number(formData.get("positionId"));

    const lots =
        Number(formData.get("lots"));

    const exitPrice =
        Number(formData.get("exitPrice"));

    /*
    =========================
    FETCH POSITION
    =========================
    */

    const position =
        await db.query.positions.findFirst({
            where: eq(
                positions.id,
                positionId
            )
        });

    if (!position) {
        throw new Error("Position not found");
    }

    /*
    =========================
    SECURITY CHECK
    =========================
    */

    if (
        currentUser.role !== "admin" &&
        position.userId !== currentUser.id
    ) {
        throw new Error("Unauthorized");
    }

    /*
    =========================
    FULL EXIT
    =========================
    */

    if (lots >= position.quantity) {

        await db
            .update(positions)
            .set({
                quantity: 0
            })
            .where(eq(
                positions.id,
                position.id
            ));

        await db.insert(trades).values({
            positionId:
                position.id,

            userId:
                currentUser.id,

            tradeType:
                "EXIT",

            quantity:
                position.quantity,

            price:
                exitPrice.toFixed(2),

            notes:
                "Full exit"
        });

        return {
            success: true
        };
    }

    /*
    =========================
    PARTIAL EXIT
    =========================
    */

    await db
        .update(positions)
        .set({
            quantity:
                position.quantity -
                lots
        })
        .where(eq(
            positions.id,
            position.id
        ));

    await db.insert(trades).values({
        positionId:
            position.id,

        userId:
            currentUser.id,

        tradeType:
            "EXIT",

        quantity:
            lots,

        price:
            exitPrice.toFixed(2),

        notes:
            `Partial exit ${lots}`
    });

    return {
        success: true
    };
}

export default function TradesPage({
    loaderData
}: any) {
    const {
        user,
        intraday_data
    } = loaderData;

    const futures =
        loaderData.futures;

    const options =
        loaderData.options;

    const openPnL = [
        ...futures,
        ...options
    ].reduce(
        (sum: number, pos: any) => {
            const avg = Number(pos.averagePrice || 0);
            const current = Number(pos.currentPrice || 0);
            const qty = Number(pos.quantity || 0);

            let pnl = 0;

            if (pos.positionType === "SHORT") {
                pnl = (avg - current) * qty;
            } else {
                pnl = (current - avg) * qty; // LONG default
            }

            return sum + pnl;
        },
        0
    );
    const exitTrades = loaderData.exitTrades;
    const totalOpenPositions = futures.length + options.length;

    const navigation =
        useNavigation();
    const revalidator =
        useRevalidator();

    const futuresTrades = exitTrades.filter((t: any) => t.position?.instrumentType === "FUTURE");

    const optionsTrades = exitTrades.filter((t: any) => t.position?.instrumentType === "OPTIONS");

    const totalPnL = exitTrades.reduce((sum: number, t: any) => {
        return sum + (t.pnl ?? 0);
    }, 0);
    // useEffect(() => {
    //     const es = new EventSource("/dashboard/trades/live");

    //     es.onmessage = (event) => {
    //         const data = JSON.parse(event.data);

    //         setLiveData(data);
    //     };

    //     return () => es.close();
    // }, [
    // ]);
    /*
=========================
AUTO REFRESH
=========================
*/

    useEffect(() => {

        const interval =
            setInterval(() => {

                revalidator.revalidate();

            }, 10000);

        return () =>
            clearInterval(interval);

    }, [
        revalidator
    ]);
    useEffect(() => {

        /*
    =========================
    CLOSE DIALOGS
    AFTER ACTION
    =========================
    */

        if (
            navigation.state ===
        "idle"
        ) {

            const dialogs =
                document.querySelectorAll("dialog");

            dialogs.forEach((dialog) => {
                (
                    dialog as HTMLDialogElement
                ).close();
            });
        }

    }, [
        navigation.state
    ]);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>
                    Trades Dashboard
                </h1>

                <p>
                    {user.role === "admin"
                        ? "Viewing all active positions"
                        : "Viewing your active positions"}
                </p>
            </div>

            <div className={styles.topStatsRow}>
                <div className={styles.totalPnlBox}>
                    <div className={styles.totalPnlLabel}>
                        TOTAL OPEN POSITIONS
                    </div>

                    <div className={styles.totalPnlValue}>
                        {totalOpenPositions}
                    </div>
                </div>

                <div className={styles.totalPnlBox}>
                    <div className={styles.totalPnlLabel}>
                        Intraday Pnl
                    </div>

                    <div className={styles.totalPnlValue} style={{
                        color: intraday_data.totalPnL >= 0 ? "green" : "red"
                    }}>
                        {/* same value for now */}
                        {intraday_data.totalPnL.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className={styles.totalPnlBox}>
                <div className={styles.totalPnlLabel}>
                    TOTAL PNL OF OPEN TRADES
                </div>

                <div
                    className={styles.totalPnlValue}
                    style={{
                        color: openPnL >= 0 ? "green" : "red"
                    }}
                >
                    ₹ {openPnL.toFixed(2)}
                </div>
            </div>

            {/* ======================
                FUTURES TABLE
            ====================== */}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Futures
                </h2>

                {futures.length === 0 ? (
                    <div className={styles.empty}>
                        No futures positions
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Symbol</th>

                                    <th>Type</th>

                                    <th>Qty</th>

                                    <th>Avg Price</th>

                                    <th>Current</th>

                                    <th>Exchange</th>

                                    {user.role ===
                    "admin" && (
                                        <th>
                                            User
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {futures.map((trade: any) => (
                                    <tr
                                        key={
                                            trade.id
                                        }
                                    >
                                        <td>
                                            {
                                                trade.script
                                            }
                                        </td>

                                        <td>
                                            {
                                                trade.positionType
                                            }
                                        </td>

                                        <td>
                                            {
                                                trade.quantity
                                            }
                                        </td>

                                        <td>
                                            ₹
                                            {
                                                trade.averagePrice
                                            }
                                        </td>

                                        <td>
                                            ₹
                                            {
                                                trade.currentPrice
                                            }
                                        </td>

                                        <td>
                                            {
                                                trade.exchange
                                            }
                                        </td>

                                        {user.role ===
                      "admin" && (
                                            <td>
                                                {
                                                    trade
                                                        .user
                                                        ?.username
                                                }
                                            </td>
                                        )}
                                        <td>
                                            <button
                                                className={
                                                    styles.squareOffBtn
                                                }
                                                onClick={() => {
                                                    (
                                                        document.getElementById(`dialog-${trade.id}`) as HTMLDialogElement
                                                    ).showModal();
                                                }}
                                            >
                                                Square Off
                                            </button>

                                            <dialog
                                                id={`dialog-${trade.id}`}
                                                className={styles.dialog}
                                            >

                                                <Form method="post">

                                                    <input
                                                        type="hidden"
                                                        name="positionId"
                                                        value={trade.id}
                                                    />

                                                    <h3>
                                                        Square Off
                                                    </h3>

                                                    <div
                                                        className={styles.field}
                                                    >
                                                        <label>
                                                            Lots
                                                        </label>

                                                        <input
                                                            type="number"
                                                            name="lots"
                                                            required
                                                            min="1"
                                                            max={
                                                                trade.quantity
                                                            }
                                                        />
                                                    </div>

                                                    <div
                                                        className={styles.field}
                                                    >
                                                        <label>
                                                            Exit Price
                                                        </label>

                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            name="exitPrice"
                                                            required
                                                        />
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.dialogActions
                                                        }
                                                    >
                                                        <button
                                                            type="submit"
                                                        >
                                                            Submit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                (
                                                                    document.getElementById(`dialog-${trade.id}`) as HTMLDialogElement
                                                                ).close();
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>

                                                </Form>

                                            </dialog>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ======================
                OPTIONS TABLE
            ====================== */}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Options
                </h2>

                {options.length === 0 ? (
                    <div className={styles.empty}>
                        No options positions
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Symbol</th>

                                    <th>Option</th>

                                    <th>Strike</th>

                                    <th>Qty</th>

                                    <th>Avg Price</th>

                                    <th>Expiry</th>

                                    {user.role ===
                    "admin" && (
                                        <th>
                                            User
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {options.map((trade: any) => (
                                    <tr
                                        key={
                                            trade.id
                                        }
                                    >
                                        <td>
                                            {
                                                trade.script
                                            }
                                        </td>

                                        <td>
                                            {
                                                trade.optionType
                                            }
                                        </td>

                                        <td>
                                                
                                            {
                                                trade.strikePrice
                                            }
                                        </td>

                                        <td>
                                            {
                                                trade.quantity
                                            }
                                        </td>

                                        <td>
                                            ₹
                                            {
                                                trade.averagePrice
                                            }
                                        </td>

                                        <td>
                                            {
                                                trade.expiry
                                            }
                                        </td>

                                        {user.role ===
                      "admin" && (
                                            <td>
                                                {
                                                    trade
                                                        .user
                                                        ?.username
                                                }
                                            </td>
                                        )}

                                        <td>
                                            <button
                                                className={
                                                    styles.squareOffBtn
                                                }
                                                onClick={() => {
                                                    (
                                                        document.getElementById(`dialog-${trade.id}`) as HTMLDialogElement
                                                    ).showModal();
                                                }}
                                            >
                                                Square Off
                                            </button>

                                            <dialog
                                                id={`dialog-${trade.id}`}
                                                className={styles.dialog}
                                            >

                                                <Form method="post">

                                                    <input
                                                        type="hidden"
                                                        name="positionId"
                                                        value={trade.id}
                                                    />

                                                    <h3>
                                                        Square Off
                                                    </h3>

                                                    <div
                                                        className={styles.field}
                                                    >
                                                        <label>
                                                            Lots
                                                        </label>

                                                        <input
                                                            type="number"
                                                            name="lots"
                                                            required
                                                            min="1"
                                                            max={
                                                                trade.quantity
                                                            }
                                                        />
                                                    </div>

                                                    <div
                                                        className={styles.field}
                                                    >
                                                        <label>
                                                            Exit Price
                                                        </label>

                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            name="exitPrice"
                                                            required
                                                        />
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.dialogActions
                                                        }
                                                    >
                                                        <button
                                                            type="submit"
                                                        >
                                                            Submit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                (
                                                                    document.getElementById(`dialog-${trade.id}`) as HTMLDialogElement
                                                                ).close();
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>

                                                </Form>

                                            </dialog>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ======================
    EXIT TRADES TABLE
====================== */}
            <div className={styles.totalPnlBox}>
                <div className={styles.totalPnlLabel}>
                    TOTAL PNL OF CLOSED TRADES
                </div>

                <div
                    className={styles.totalPnlValue}
                    style={{
                        color: totalPnL >= 0 ? "green" : "red"
                    }}
                >
                    ₹ {totalPnL.toFixed(2)}
                </div>
            </div>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Futures Exit Trades
                </h2>

                {futuresTrades.length === 0 ? (
                    <div className={styles.empty}>
                        No futures exit trades
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Qty</th>
                                    <th>Entry Price</th>
                                    <th>Exit Price</th>
                                    <th>PnL</th>
                                    <th>Expiry</th>
                                    <th>User</th>
                                    <th>Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {futuresTrades.map((t: any) => (
                                    <tr key={t.id}>
                                        <td>{t.position?.script}</td>
                                        <td>{t.quantity}</td>

                                        <td>
                                            ₹{Number(t.position?.averagePrice).toFixed(2)}
                                        </td>

                                        <td>₹{Number(t.price).toFixed(2)}</td>

                                        <td
                                            style={{
                                                color:
                                        t.pnl >= 0 ? "green" : "red"
                                            }}
                                        >
                                            ₹{t.pnl.toFixed(2)}
                                        </td>

                                        <td>
                                            {t.position?.expiry ?? "-"}
                                        </td>

                                        <td>{t.user?.username}</td>

                                        <td>
                                            {new Date(t.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Options Exit Trades
                </h2>

                {optionsTrades.length === 0 ? (
                    <div className={styles.empty}>
                        No options exit trades
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Type</th>
                                    <th>Strike</th>
                                    <th>Option</th>
                                    <th>Qty</th>
                                    <th>Entry Price</th>
                                    <th>Exit Price</th>
                                    <th>PnL</th>
                                    <th>Expiry</th>
                                    <th>User</th>
                                    <th>Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {optionsTrades.map((t: any) => (
                                    <tr key={t.id}>
                                        <td>{t.position?.script}</td>

                                        <td>{t.position?.instrumentType}</td>

                                        <td>{t.position?.strikePrice ?? "-"}</td>

                                        <td>{t.position?.optionType ?? "-"}</td>

                                        <td>{t.quantity}</td>

                                        <td>
                                            ₹{Number(t.position?.averagePrice).toFixed(2)}
                                        </td>

                                        <td>₹{Number(t.price).toFixed(2)}</td>

                                        <td
                                            style={{
                                                color:
                                        t.pnl >= 0 ? "green" : "red"
                                            }}
                                        >
                                            ₹{t.pnl.toFixed(2)}
                                        </td>

                                        <td>
                                            {t.position?.expiry ?? "-"}
                                        </td>

                                        <td>{t.user?.username}</td>

                                        <td>
                                            {new Date(t.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
