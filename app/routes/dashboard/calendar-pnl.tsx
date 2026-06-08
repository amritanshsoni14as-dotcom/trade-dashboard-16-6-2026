// app/routes/dashboard/calendar-pnl.tsx

import type {
    Route 
} from "./+types/calendar-pnl";

import {
    db 
} from "~/database/db.server";
import styles from "./calendar-pnl.module.css";

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

    return {
        rows 
    };
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

/* =========================
   COMPONENT
========================= */

export default function CalendarPnL({
    loaderData
}: Route.ComponentProps) {
    const {
        rows 
    } = loaderData;

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
    const {
        year, monthIndex, daysInMonth, firstDay 
    } =
        getMonthRange(now);

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

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Daily PnL Calendar</h1>

            <section className={styles.monthSection}>
                <h2 className={styles.monthTitle}>
                    {now.toLocaleString("en-IN", {
                        month: "long",
                        year: "numeric"
                    })}
                </h2>

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

                                <div className={styles.user}>
                                    {data?.username ?? "-"}
                                </div>

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
