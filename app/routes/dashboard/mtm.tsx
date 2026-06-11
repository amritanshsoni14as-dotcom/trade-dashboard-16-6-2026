import {
    requireUser 
} from "~/utils/auth.server";
import styles from "./mtm.module.css";
import {
    db 
} from "~/database/db.server";

export async function loader({
    request
}: any) {
    const user = await requireUser(request);

    // const intraday_data =
    //     await calculatePnL(request);

    /*
    =========================
    ADMIN
    =========================
    */

    // const whereClause =
    //     user.role === "admin"
    //         ? gt(positions.quantity, 0)
    //         : eq(positions.userId, user.id);

    // const rows = await db.query.positions.findMany({
    //     where:
    //         user.role === "admin"
    //             ? gt(positions.quantity, 0)
    //             : (table, {
    //                 and
    //             }) =>
    //                 and(
    //                     eq(table.userId, user.id),
    //                     gt(table.quantity, 0)
    //                 ),

    //     with: {
    //         user: true
    //     },

    //     orderBy: [
    //         desc(positions.createdAt)
    //     ]
    // });

    // const futures = rows.filter((position) =>
    //     position.instrumentType ===
    //     "FUTURE").sort((a, b) => a.id - b.id);

    // const options = rows.filter((position) =>
    //     position.instrumentType ===
    //     "OPTIONS").sort((a, b) => a.id - b.id);

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

    // const futures_2 = intraday_data.positions.filter((p: any) => p.instrumentType === "FUTURE");

    // const options_2 = intraday_data.positions.filter((p: any) => p.instrumentType === "OPTIONS");
    return {
        user,
        // futures,
        // options,
        exitTrades: exitTradesWithPnL
        // intraday_data,
        // futures_2,
        // options_2
    };
}

export default function ExitTradesPage({
    loaderData
}: any) {

    const {
        exitTrades
    } = loaderData;

    const totalPnL = exitTrades.reduce(
        (sum: number, t: any) =>
            sum + (t.pnl ?? 0),
        0
    );
    const winners = exitTrades.filter((t: any) => t.pnl > 0).length;

    const losers = exitTrades.filter((t: any) => t.pnl < 0).length;

    const futureTrades = exitTrades.filter((t: any) =>
        t.position?.instrumentType === "FUTURE");

    const optionTrades = exitTrades.filter((t: any) =>
        t.position?.instrumentType === "OPTIONS");

    return (
        <div className={styles.page}>

            <div className={styles.header}>
                <h1>Exit Trades</h1>

                <p>
                    Historical exit transactions and realised PnL
                </p>
            </div>

            <div className={styles.kpiGrid}>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Total Exit Trades
                    </div>

                    <div className={styles.kpiValue}>
                        {exitTrades.length}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Realised PnL
                    </div>

                    <div
                        className={`${styles.kpiValue} ${
                            totalPnL >= 0
                                ? styles.profit
                                : styles.loss
                        }`}
                    >
                        ₹ {totalPnL.toLocaleString("en-IN")}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Winners
                    </div>

                    <div
                        className={`${styles.kpiValue} ${styles.profit}`}
                    >
                        {winners}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Losers
                    </div>

                    <div
                        className={`${styles.kpiValue} ${styles.loss}`}
                    >
                        {losers}
                    </div>
                </div>

            </div>

            <h2 className={styles.sectionTitle}>
                Futures
            </h2>
            <div className={styles.tableWrapper}>

                <table className={styles.table}>

                    <thead>
                        <tr>
                            <th>Script</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Lot Size</th>
                            <th>Avg Price</th>
                            <th>Exit Price</th>
                            <th>PnL</th>
                            <th>User</th>
                        </tr>
                    </thead>

                    <tbody>

                        {futureTrades.map((trade: any) => (

                            <tr key={trade.id}>

                                <td>
                                    {trade.position?.script}
                                </td>

                                <td>
                                    {trade.position?.positionType}
                                </td>

                                <td>
                                    {trade.qty}
                                </td>

                                <td>
                                    {trade.lotSize}
                                </td>

                                <td>
                                    ₹{trade.avgPrice.toFixed(2)}
                                </td>

                                <td>
                                    ₹{trade.exitPrice.toFixed(2)}
                                </td>

                                <td
                                    className={
                                        trade.pnl >= 0
                                            ? styles.profit
                                            : styles.loss
                                    }
                                >
                                    ₹{trade.pnl.toLocaleString("en-IN")}
                                </td>

                                <td>
                                    {trade.user?.username}
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>
            <h2 className={styles.sectionTitle}>
                Options
            </h2>
            <div className={styles.tableWrapper}>

                <table className={styles.table}>

                    <thead>
                        <tr>
                            <th>Script</th>
                            <th>Type</th>
                            <th>Strike</th>
                            <th>Option</th>
                            <th>Qty</th>
                            <th>Lot Size</th>
                            <th>Avg Price</th>
                            <th>Exit Price</th>
                            <th>PnL</th>
                            <th>User</th>
                        </tr>
                    </thead>

                    <tbody>

                        {optionTrades.map((trade: any) => (

                            <tr key={trade.id}>

                                <td>
                                    {trade.position?.script}
                                </td>

                                <td>
                                    {trade.position?.positionType}
                                </td>

                                <td>
                                    {trade.position?.strikePrice}
                                </td>

                                <td>
                                    {trade.position?.optionType}
                                </td>

                                <td>
                                    {trade.qty}
                                </td>

                                <td>
                                    {trade.lotSize}
                                </td>

                                <td>
                                    ₹{trade.avgPrice.toFixed(2)}
                                </td>

                                <td>
                                    ₹{trade.exitPrice.toFixed(2)}
                                </td>

                                <td
                                    className={
                                        trade.pnl >= 0
                                            ? styles.profit
                                            : styles.loss
                                    }
                                >
                                    ₹{trade.pnl.toLocaleString("en-IN")}
                                </td>

                                <td>
                                    {trade.user?.username}
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}
