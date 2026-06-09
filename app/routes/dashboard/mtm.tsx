import type {
    Route
} from "./+types/mtm";

import {
    calculatePnL
} from "~/database/utils.server";

import {
    useRevalidator
} from "react-router";

import {
    useEffect
} from "react";

import styles from "./mtm.module.css";

/* =========================
   LOADER
========================= */

export async function loader({
    request
}: Route.LoaderArgs) {
    const data =
        await calculatePnL(request);

    return data;
}




function formatDateIndian(
    dateString?: string | null
) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "en-GB"
    );
}


/* =========================
   COMPONENT
========================= */

export default function MTM({
    loaderData
}: Route.ComponentProps) {

    const {
        positions,
        totalPnL
    } = loaderData;
    const futures = positions.filter((p: any) => p.instrumentType === "FUTURE");

    const options = positions.filter((p: any) => p.instrumentType === "OPTIONS");

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

    return (
        <div className={styles.container}>

            <div className={styles.header}>
                <h1>
                    Stockwise Summary
                </h1>

                <div
                    className={`${styles.totalPnL} ${
                        totalPnL >= 0
                            ? styles.profit
                            : styles.loss
                    }`}
                >
                    ₹ {totalPnL.toFixed(2)}
                </div>
            </div>

            <h2 className={styles.sectionTitle}>Futures</h2>

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
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {futures.map((position: any) => (
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
                                    ₹{position.pnl.toFixed(2)}
                                </td>

                                <td>{formatDateIndian(position.expiry)}</td>

                                <td>
                                    {position.source === "EXIT" ? "Closed" : "Open"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h2 className={styles.sectionTitle}>Options</h2>

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
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {options.map((position: any) => (
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
                                    ₹{position.pnl.toFixed(2)}
                                </td>

                                <td>{formatDateIndian(position.expiry)}</td>

                                <td>
                                    {position.source === "EXIT" ? "Closed" : "Open"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
