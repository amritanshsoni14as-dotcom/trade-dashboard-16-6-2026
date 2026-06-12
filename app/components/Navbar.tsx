import {
    NavLink
} from "react-router";

import styles from "./navbar.module.css";

export function Navbar({
    nifty 
}: {
    nifty: number 
}) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.dot} />

                <span>
                    Trading Ops
                </span>
            </div>

            <nav className={styles.links}>
                <NavLink
                    to="/dashboard/trades"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    📋 My Trades
                </NavLink>

                <NavLink
                    to="/dashboard/closed-trades"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    📈 Closed Trades
                </NavLink>

                <NavLink
                    to="/dashboard/calendar-pnl"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    📅 Calendar PNL
                </NavLink>

                <NavLink
                    to="/dashboard/add-trade"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    ➕ Add Trade
                </NavLink>

                <NavLink
                    to="/dashboard/manage-users"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    👥 Manage Users
                </NavLink>
                <NavLink
                    to="/dashboard/news"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    📰 News
                </NavLink>

                <NavLink
                    to="/logout"
                    className={({
                        isActive 
                    }) =>
                        `${styles.link} ${isActive ? styles.active : ""}`
                    }
                >
                    🚪 Logout
                </NavLink>
            </nav>

            <div className={styles.nifty}>Nifty 50 = {nifty}</div>

            <div className={styles.footer}>
                v0.1 · internal
            </div>
        </aside>
    );
}
