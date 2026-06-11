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

    const futures_2 = intraday_data.positions.filter((p: any) => p.instrumentType === "FUTURE");

    const options_2 = intraday_data.positions.filter((p: any) => p.instrumentType === "OPTIONS");
    return {
        user,
        futures,
        options,
        exitTrades: exitTradesWithPnL,
        intraday_data,
        futures_2,
        options_2
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

    const actionType =
        String(formData.get("actionType"));

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
    if (position.quantity <= 0) {
        return {
            error: "Position already closed"
        };
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
AVERAGE
=========================
*/

    if (actionType === "AVERAGE") {

        const newQuantity =
            position.quantity + lots;

        const previousAverage =
            Number(position.averagePrice);

        const newAverage =
            (
                (
                    previousAverage *
                    position.quantity
                ) +
                (
                    exitPrice *
                    lots
                )
            ) / newQuantity;

        await db
            .update(positions)
            .set({

                quantity:
                    newQuantity,

                averagePrice:
                    newAverage.toFixed(2),

                currentPrice:
                    exitPrice.toFixed(2)

            })
            .where(eq(
                positions.id,
                position.id
            ));

        await db
            .insert(trades)
            .values({

                positionId:
                    position.id,

                userId:
                    currentUser.id,

                tradeType:
                    "ADD",

                quantity:
                    lots,

                price:
                    exitPrice.toFixed(2),

                notes:
                    `Average ${lots}`

            });

        return {
            success: true
        };
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

function formatIndianNumber(num) {
    const [
        integerPart,
        decimalPart
    ] = num.toString().split(".");

    const lastThree = integerPart.slice(-3);
    const otherNumbers = integerPart.slice(0, -3);

    const formatted =
        otherNumbers
            ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
            : lastThree;

    return decimalPart
        ? `${formatted}.${decimalPart}`
        : formatted;
}

function formatDateIndian(dateString?: string | null) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString("en-GB");
}

export default function TradesPage({
    loaderData
}: any) {
    const {
        user,
        intraday_data,
        futures_2,
        options_2
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
            const lot_size = Number(pos.lotSize || 0);

            let pnl = 0;

            if (pos.positionType === "SHORT") {
                pnl = (avg - current) * qty * lot_size;
            } else {
                pnl = (current - avg) * qty * lot_size; // LONG default
            }

            /* console.log("========== POSITION ==========");
            console.log("Script:", pos.script);
            console.log("Type:", pos.positionType);
            console.log("Avg:", avg);
            console.log("Current:", current);
            console.log("Qty:", qty);
            console.log("PnL:", pnl);
            console.log("Running Total:", sum + pnl); */

            return sum + pnl;
        },
        0
    );
    // const exitTrades = loaderData.exitTrades;
    const totalOpenPositions = futures.length + options.length;

    const navigation =
        useNavigation();
    const revalidator =
        useRevalidator();

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
                {/* <h1>
                    Trades Dashboard
                </h1>

                <p>
                    {user.role === "admin"
                        ? "Viewing all active positions"
                        : "Viewing your active positions"}
                </p> */}
            </div>

            <div className={styles.kpiGrid}>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Open Positions
                    </div>

                    <div className={styles.kpiValue}>
                        {totalOpenPositions}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Intraday PnL
                    </div>

                    <div
                        className={`${styles.kpiValue} ${intraday_data.totalPnL >= 0
                            ? styles.profit
                            : styles.loss
                        }`}
                    >
                        ₹ {formatIndianNumber(intraday_data.totalPnL.toFixed(2))}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Open Trade PnL
                    </div>

                    <div
                        className={`${styles.kpiValue} ${openPnL >= 0
                            ? styles.profit
                            : styles.loss
                        }`}
                    >
                        ₹ {formatIndianNumber(openPnL.toFixed(2))}
                    </div>
                </div>

            </div>
            <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Futures
                    </h2>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Script</th>
                                <th>Type</th>
                                <th>Qty</th>
                                <th>Avg Price</th>
                                <th>Current</th>
                                <th>Prev Close</th>
                                <th>PnL</th>
                                <th>Expiry</th>
                                {user.role ===
                                    "admin" && (
                                    <th>
                                        User
                                    </th>
                                )}
                                <th>Edit</th>
                            </tr>
                        </thead>

                        <tbody>
                            {futures_2.map((position: any) => (
                                <tr key={position.id}>
                                    <td>{position.script}</td>

                                    <td>{position.positionType}</td>

                                    <td>{position.quantity}</td>

                                    <td>₹{Number(position.averagePrice ?? 0).toFixed(2)}</td>

                                    <td>₹{Number(position.currentPrice ?? 0).toFixed(2)}</td>

                                    <td>
                                        ₹{Number(position.previousSettledPrice ?? 0).toFixed(2)}
                                    </td>

                                    <td
                                        className={
                                            position.pnl >= 0 ? styles.profit : styles.loss
                                        }
                                    >
                                        ₹{formatIndianNumber(position.pnl.toFixed(2))}
                                    </td>

                                    <td>{formatDateIndian(position.expiry)}</td>

                                    {user.role ===
                                        "admin" && (
                                        <td>
                                            {
                                                position
                                                    .user
                                                    ?.username
                                            }
                                        </td>
                                    )}
                                    <td>
                                        {position.quantity <= 0 ? (
                                            <span className={styles.zeroQty}>
                                                0 quantity, no need to edit
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    className={styles.squareOffBtn}
                                                    onClick={() => {
                                                        (
                                                            document.getElementById(`dialog-${position.id}`) as HTMLDialogElement
                                                        ).showModal();
                                                    }}
                                                >
                                                    Edit
                                                </button>

                                                <dialog
                                                    id={`dialog-${position.id}`}
                                                    className={styles.dialog}
                                                >
                                                    <Form method="post">

                                                        <input
                                                            type="hidden"
                                                            name="positionId"
                                                            value={position.id}
                                                        />

                                                        <h3>Edit Position</h3>

                                                        <div className={styles.field}>
                                                            <label>Action</label>

                                                            <select
                                                                name="actionType"
                                                                required
                                                            >
                                                                <option value="EXIT">
                                                                    Exit
                                                                </option>

                                                                <option value="AVERAGE">
                                                                    Average
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <div className={styles.field}>
                                                            <label>Lots</label>

                                                            <input
                                                                type="number"
                                                                name="lots"
                                                                min="1"
                                                                max={position.quantity}
                                                                required
                                                            />
                                                        </div>

                                                        <div className={styles.field}>
                                                            <label>Price</label>

                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                name="exitPrice"
                                                                required
                                                            />
                                                        </div>

                                                        <div className={styles.dialogActions}>
                                                            <button type="submit">
                                                                Submit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    (
                                                                        document.getElementById(`dialog-${position.id}`) as HTMLDialogElement
                                                                    ).close();
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>

                                                    </Form>
                                                </dialog>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Options
                    </h2>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Script</th>
                                <th>Type</th>
                                <th>Strike</th>
                                <th>Option</th>
                                <th>Qty</th>
                                <th>Avg Price</th>
                                <th>Current</th>
                                <th>Prev Close</th>
                                <th>PnL</th>
                                <th>Expiry</th>
                                {user.role ===
                                    "admin" && (
                                    <th>
                                        User
                                    </th>
                                )}
                                <th>Edit</th>
                            </tr>
                        </thead>

                        <tbody>
                            {options_2.map((position: any) => (
                                <tr key={position.id}>
                                    <td>{position.script}</td>

                                    <td>{position.positionType}</td>

                                    <td>{position.strikePrice ?? "-"}</td>

                                    <td>{position.optionType ?? "-"}</td>

                                    <td>{position.quantity}</td>

                                    <td>₹{Number(position.averagePrice ?? 0).toFixed(2)}</td>

                                    <td>₹{Number(position.currentPrice ?? 0).toFixed(2)}</td>

                                    <td>
                                        ₹{Number(position.previousSettledPrice ?? 0).toFixed(2)}
                                    </td>

                                    <td
                                        className={
                                            position.pnl >= 0 ? styles.profit : styles.loss
                                        }
                                    >
                                        ₹{formatIndianNumber(position.pnl.toFixed(2))}
                                    </td>

                                    <td>{formatDateIndian(position.expiry)}</td>

                                    {user.role ===
                                        "admin" && (
                                        <td>
                                            {
                                                position
                                                    .user
                                                    ?.username
                                            }
                                        </td>
                                    )}
                                    <td>
                                        {position.quantity <= 0 ? (
                                            <span className={styles.zeroQty}>
                                                0 quantity, no need to edit
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    className={styles.squareOffBtn}
                                                    onClick={() => {
                                                        (
                                                            document.getElementById(`dialog-${position.id}`) as HTMLDialogElement
                                                        ).showModal();
                                                    }}
                                                >
                                                    Edit
                                                </button>

                                                <dialog
                                                    id={`dialog-${position.id}`}
                                                    className={styles.dialog}
                                                >
                                                    <Form method="post">

                                                        <input
                                                            type="hidden"
                                                            name="positionId"
                                                            value={position.id}
                                                        />

                                                        <h3>Edit Position</h3>

                                                        <div className={styles.field}>
                                                            <label>Action</label>

                                                            <select
                                                                name="actionType"
                                                                required
                                                            >
                                                                <option value="EXIT">
                                                                    Exit
                                                                </option>

                                                                <option value="AVERAGE">
                                                                    Average
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <div className={styles.field}>
                                                            <label>Lots</label>

                                                            <input
                                                                type="number"
                                                                name="lots"
                                                                min="1"
                                                                max={position.quantity}
                                                                required
                                                            />
                                                        </div>

                                                        <div className={styles.field}>
                                                            <label>Price</label>

                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                name="exitPrice"
                                                                required
                                                            />
                                                        </div>

                                                        <div className={styles.dialogActions}>
                                                            <button type="submit">
                                                                Submit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    (
                                                                        document.getElementById(`dialog-${position.id}`) as HTMLDialogElement
                                                                    ).close();
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>

                                                    </Form>
                                                </dialog>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
