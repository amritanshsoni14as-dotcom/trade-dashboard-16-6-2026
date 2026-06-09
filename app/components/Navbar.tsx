import {
    NavLink 
} from "react-router";
import styles from "./navbar.module.css";

export function Navbar() {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                
            </div>

            <nav className={styles.links}>
                <NavLink to="/dashboard/trades" className={styles.link}>
                    My Trades
                </NavLink>

                <NavLink to="/dashboard/mtm" className={styles.link}>
                    Stockwise Summary
                </NavLink>

                <NavLink to="/dashboard/calendar-pnl" className={styles.link}>
                    Calendar PNL
                </NavLink>

                <NavLink to="/dashboard/add-trade" className={styles.link}>
                    Add Trade
                </NavLink>

                <NavLink to="/dashboard/manage-users" className={styles.link}>
                    Manage Users
                </NavLink>

                <NavLink to="/logout" className={styles.link}>
                    Logout
                </NavLink>
            </nav>
        </aside>
    );
}
