import {
    NavLink 
} from "react-router";
import styles from "./navbar.module.css";

export function Navbar() {
    return (
        <nav className={styles.navbar}>
            {" "}
            {/* Logo removed */}{" "}
            <div className={styles.links}>
                {" "}
                <NavLink to="/dashboard/trades" className={({
                    isActive 
                }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                }>
                    {" "}
                    My Trades{" "}
                </NavLink>{" "}
                <NavLink to="/dashboard/mtm" className={({
                    isActive 
                }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                }>
                    {" "}
                    Stockwise Summary{" "}
                </NavLink>{" "}
                <NavLink to="/dashboard/calendar-pnl" className={({
                    isActive 
                }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                }>
                    {" "}
                    Calendar PNL{" "}
                </NavLink>{" "}
                <NavLink to="/dashboard/add-trade" className={({
                    isActive 
                }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                }>
                    {" "}
                    Add Trade{" "}
                </NavLink>{" "}
                {/* manage-users */}{" "}
                <NavLink to="/dashboard/manage-users" className={({
                    isActive 
                }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                }>
                    {" "}
                    Manage Users{" "}
                </NavLink>{" "}
                <NavLink to="/logout" className={({
                    isActive 
                }) =>
                    `${styles.link} ${isActive ? styles.active : ""}`
                }>
                    {" "}
                    Logout{" "}
                </NavLink>{" "}
            </div>{" "}
        </nav>
    );
}
