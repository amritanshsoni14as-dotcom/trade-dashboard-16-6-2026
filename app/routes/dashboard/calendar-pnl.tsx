// app/routes/dashboard/calendar-pnl.tsx
import {
    eq,
    sql
} from "drizzle-orm";
import type {
    Route 
} from "./+types/calendar-pnl";

import {
    db 
} from "~/database/db.server";
import styles from "./calendar-pnl.module.css";
import {
    useState 
} from "react";
// import {
//     positions, trades 
// } from "~/database/schema.server";

/* =========================
   LOADER
========================= */

export async function loader() {
    const rows = await db.query.dailyPnls.findMany({
        with: {
            user: true
        },
        orderBy: (table, {
            desc 
        }) => [
            desc(table.tradingDate)
        ]
    });

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
    const openPositions =
        await db.query.positions.findMany({
            where: (table, {
                gt 
            }) =>
                gt(table.quantity, 0)
        });

    const monthlyPnlsMap =
        new Map<string, number>();

    for (const trade of exitTradesWithPnL) {
        const expiry =
            trade.position?.expiry;

        if (!expiry) continue;

        const d =
            new Date(`${expiry}T00:00:00`);

        const key =
            `${d.getFullYear()}-${d.getMonth()}`;

        const existing =
            monthlyPnlsMap.get(key) ?? 0;

        monthlyPnlsMap.set(
            key,
            existing + trade.pnl
        );
    }

    for (const position of openPositions) {
        if (!position.expiry) continue;

        const pnl =
            calculateOpenPositionExpiryPnL(position);

        // console.log(pnl)
        if (!pnl) continue;

        const expiryDate =
            new Date(`${position.expiry}T00:00:00`);

        const key =
            `${expiryDate.getFullYear()}-${expiryDate.getMonth()}`;

        const existing =
            monthlyPnlsMap.get(key) ?? 0;

        monthlyPnlsMap.set(
            key,
            existing + pnl
        );
    }

    // console.log(monthlyPnlsMap);

    return {
        rows,
        monthlyPnls: Object.fromEntries(monthlyPnlsMap)
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

/* =========================
   HELPERS
========================= */

function getMonthRange(date: Date) {
    const year = date.getFullYear();
    const monthIndex = date.getMonth();

    return {
        year,
        monthIndex,
        daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
        firstDay: new Date(year, monthIndex, 1).getDay()
    };
}

function calculateOpenPositionExpiryPnL(position: any) {
    if (!position) return 0;

    const qty =
        Number(position.quantity ?? 0);

    if (qty <= 0) return 0;

    if (!position.expiry) return 0;

    const expiryDate =
        new Date(`${position.expiry}T00:00:00`);

    const now =
        new Date();

    const sameMonth =
        expiryDate.getMonth() === now.getMonth()
        &&
        expiryDate.getFullYear() === now.getFullYear();

    if (!sameMonth) return 0;

    const settled =
        Number(position.previousSettledPrice ?? 0);

    const average =
        Number(position.entryPrice ?? 0);

    const lotSize =
        Number(position.lotSize ?? 1);
    // console.log("SCRIPT:", position.script);
    // console.log("POSITION TYPE:", position.positionType);
    // console.log("SETTLED:", settled);
    // console.log("AVERAGE:", average);
    // console.log("LOT SIZE:", lotSize);

    let pnl = 0;

    if (position.positionType === "LONG") {
        pnl = (settled - average) * qty * lotSize;

        // console.log(
        //     `LONG => (${settled} - ${average}) * ${qty} * ${lotSize}`
        // );
    } else {
        pnl = (average - settled) * qty * lotSize;

        // console.log(
        //     `SHORT => (${average} - ${settled}) * ${qty} * ${lotSize}`
        // );
    }

    return Number(pnl.toFixed(2));
}

/* =========================
   COMPONENT
========================= */

export default function CalendarPnL({
    loaderData
}: Route.ComponentProps) {
    const {
        rows,
        monthlyPnls 
    } = loaderData;
    // console.log(monthlyPnls);
    const weekdays = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];

    const now = new Date();
    const [
        selectedDate,
        setSelectedDate
    ] = useState(new Date());
    const {
        year, monthIndex, daysInMonth, firstDay 
    } =
        getMonthRange(selectedDate);

    /* =========================
       BUILD PNL MAP (FAST LOOKUP)
    ========================= */

    const pnlMap = new Map<string, {
        pnl: number;
        username?: string 
    }>();

    for (const row of rows) {
        if (!row?.tradingDate) continue;

        const d = new Date(row.tradingDate);

        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

        pnlMap.set(key, {
            pnl: Number(row.pnl),
            username: row.user?.username
        });
    }
    /* =========================
       BUILD MONTH LIST
    ========================= */

    const months: {
        year: number;
        monthIndex: number;
    }[] = [
    ];

    let yeary = new Date().getFullYear();
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        months.push({
            year: yeary,
            monthIndex
        });
    }

    months.sort((a, b) => {
        const aValue =
            a.year * 12 + a.monthIndex;

        const bValue =
            b.year * 12 + b.monthIndex;

        return aValue - bValue;
    });
    const selectedMonthKey =
        `${year}-${monthIndex}`;

    const selectedMonthPnl =
        Number(monthlyPnls[selectedMonthKey] ?? 0);

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Daily PnL Calendar</h1>

            <section className={styles.monthSection}>
                <h2 className={styles.monthTitle}>
                    {selectedDate.toLocaleString("en-IN", {
                        month: "long",
                        year: "numeric"
                    })}
                </h2>
                <div className={styles.monthTabs}>
                    {months.map((month) => {
                        const isActive =
                            month.monthIndex === selectedDate.getMonth()
            &&
            month.year === selectedDate.getFullYear();

                        return (
                            <button
                                key={`${month.year}-${month.monthIndex}`}
                                type="button"
                                onClick={() =>
                                    setSelectedDate(new Date(
                                        month.year,
                                        month.monthIndex,
                                        1
                                    ))
                                }
                                className={
                                    isActive
                                        ? styles.activeMonthBtn
                                        : styles.monthBtn
                                }
                            >
                                {new Date(
                                    month.year,
                                    month.monthIndex
                                ).toLocaleString("en-IN", {
                                    month: "short",
                                    year: "numeric"
                                })}
                            </button>
                        );
                    })}
                </div>

                <div
                    className={
                        selectedMonthPnl >= 0
                            ? styles.monthPnlBoxProfit
                            : styles.monthPnlBoxLoss
                    }
                >
                    <div className={styles.monthPnlLabel}>
                        Monthly Expiry PnL
                    </div>

                    <div className={styles.monthPnlValue}>
                        ₹ {formatIndianNumber(selectedMonthPnl.toFixed(0))}
                    </div>
                </div>

                {/* Weekdays */}
                <div className={styles.weekdays}>
                    {weekdays.map((day) => (
                        <div key={day} className={styles.weekday}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className={styles.grid}>
                    {/* Empty slots before month start */}
                    {Array.from({
                        length: firstDay 
                    }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {/* Days */}
                    {Array.from({
                        length: daysInMonth 
                    }).map((_, index) => {
                        const day = index + 1;

                        const key = `${year}-${monthIndex}-${day}`;
                        const data = pnlMap.get(key);

                        const pnl = data?.pnl ?? 0;

                        return (
                            <div
                                key={day}
                                className={`${styles.card} ${
                                    data
                                        ? pnl >= 0
                                            ? styles.profit
                                            : styles.loss
                                        : styles.noData
                                }`}
                            >
                                <div className={styles.date}>
                                    {day}
                                </div>

                                {/* <div className={styles.user}>
                                    {data?.username ?? "-"}
                                </div> */}

                                <div className={styles.pnl}>
                                    ₹ {pnl.toFixed(0)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
