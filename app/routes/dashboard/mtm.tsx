import {
    requireUser 
} from "~/utils/auth.server";
import styles from "./mtm.module.css";
import {
    db 
} from "~/database/db.server";
import PnLPieChart, {
    PnLPieChartSript 
} from "~/components/charts/piechart";
import PnLBarChart, {
    PnLBarChartScript 
} from "~/components/charts/barchart";
import {
    useState 
} from "react";

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

function formatDateIndian(dateString?: string | null) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString);

    return date.toLocaleDateString("en-GB");
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

    const futuresPnL = futureTrades.reduce(
        (sum: number, trade: any) =>
            sum + (trade.pnl ?? 0),
        0
    );

    const optionsPnL = optionTrades.reduce(
        (sum: number, trade: any) =>
            sum + (trade.pnl ?? 0),
        0
    );

    const futuresContribution =
        Math.abs(futuresPnL);

    const optionsContribution =
        Math.abs(optionsPnL);

    const scriptPnLMap = new Map();

    for (const trade of exitTrades) {
        const script =
            trade.position?.script ?? "Unknown";

        const existing =
            scriptPnLMap.get(script) ?? 0;

        scriptPnLMap.set(
            script,
            existing + (trade.pnl ?? 0)
        );
    }

    const scriptPnLs = Array.from(scriptPnLMap.entries())
        .map(([
            script,
            pnl
        ]) => ({
            script,
            pnl
        }))
        .sort((a, b) =>
            Math.abs(b.pnl) -
        Math.abs(a.pnl));

    const [
        showFutures,
        setShowFutures
    ] = useState(false);

    const [
        showOptions,
        setShowOptions
    ] = useState(false);

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

            <div className={styles.chartGrid}>
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3>Futures vs Options Contribution</h3>

                        <p>
                            Share of realised PnL contribution
                        </p>
                    </div>

                    <PnLPieChart
                        futuresPnL={futuresContribution}
                        optionsPnL={optionsContribution}
                    />
                </div>

                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3>Futures vs Options PnL</h3>

                        <p>
                            Net realised profit and loss
                        </p>
                    </div>

                    <PnLBarChart
                        futuresPnL={futuresPnL}
                        optionsPnL={optionsPnL}
                    />
                </div>
            </div>

            <div className={styles.chartGrid}>
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3>Script Contribution</h3>

                        <p>
                            PnL share by traded script
                        </p>
                    </div>

                    <PnLPieChartSript
                        data={scriptPnLs}
                    />
                </div>

                <div
                    className={`${styles.chartCard} ${styles.chartCardWide}`}
                >
                    <div className={styles.chartHeader}>
                        <h3>Script-wise PnL</h3>

                        <p>
                            Realised profit and loss by script
                        </p>
                    </div>

                    <PnLBarChartScript
                        data={scriptPnLs}
                    />
                </div>
            </div>

            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    Futures
                </h2>

                <button
                    className={styles.toggleButton}
                    onClick={() =>
                        setShowFutures(!showFutures)
                    }
                >
                    {
                        showFutures
                            ? "Hide"
                            : "Show"
                    }
                </button>
            </div>
            {showFutures && (<div className={styles.tableWrapper}>

                <table className={styles.table}>

                    <thead>
                        <tr>
                            <th>Script</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Expiry Date</th>
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
                                <td>{formatDateIndian(trade.position?.expiry)}</td>

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

            </div>)}
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    Options
                </h2>

                <button
                    className={styles.toggleButton}
                    onClick={() =>
                        setShowOptions(!showOptions)
                    }
                >
                    {
                        showOptions
                            ? "Hide"
                            : "Show"
                    }
                </button>
            </div>
            {showOptions && (<div className={styles.tableWrapper}>

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

            </div>)}

        </div>
    );
}
