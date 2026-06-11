import { useEffect } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { db } from "~/database/db.server";
import { fetchNewsForSymbols } from "~/database/news.server";
import { requireUser } from "~/utils/auth.server";
import styles from "./news.module.css"

export async function loader({ request }: any) {
    const user = await requireUser(request);

    const positions =
        await db.query.positions.findMany({
            where: (table, { gt }) =>
                gt(table.quantity, 0)
        });

    const symbols = [
        ...new Set(
            positions.map((p: any) => ({
                symbol: p.script
            }))
        )
    ];

    const news =
        await fetchNewsForSymbols(symbols, 5);

    return {
        news,
        openPositions: positions.length,
        trackedSymbols: symbols.length
    };
}


export default function NewsPage() {
    const {
        news,
        openPositions,
        trackedSymbols
    } = useLoaderData<any>();

    const revalidator =
        useRevalidator();

    useEffect(() => {

        const interval =
            setInterval(() => {

                revalidator.revalidate();

            }, 10000);

        return () =>
            clearInterval(interval);

    }, [revalidator]);

    return (
        <div className={styles.page}>

            <div className={styles.header}>
                <h1>News Dashboard</h1>

                <p>
                    Latest news for active positions
                </p>
            </div>

            <div className={styles.kpiGrid}>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Open Positions
                    </div>

                    <div className={styles.kpiValue}>
                        {openPositions}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        Symbols Tracked
                    </div>

                    <div className={styles.kpiValue}>
                        {trackedSymbols}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>
                        News Articles
                    </div>

                    <div className={styles.kpiValue}>
                        {news.length}
                    </div>
                </div>

            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Headline</th>
                            <th>Source</th>
                            <th>Published</th>
                            <th>Link</th>
                        </tr>
                    </thead>

                    <tbody>

                        {news.map((item: any) => (
                            <tr key={item.link}>

                                <td>
                                    {item.symbol}
                                </td>

                                <td>
                                    {item.title}
                                </td>

                                <td>
                                    {item.source || "-"}
                                </td>

                                <td>
                                    {item.publishedAt
                                        ? new Date(
                                            item.publishedAt
                                        ).toLocaleString("en-IN")
                                        : "-"}
                                </td>

                                <td>
                                    <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.newsLink}
                                    >
                                        Open
                                    </a>
                                </td>

                            </tr>
                        ))}

                    </tbody>
                </table>
            </div>

        </div>
    );
}