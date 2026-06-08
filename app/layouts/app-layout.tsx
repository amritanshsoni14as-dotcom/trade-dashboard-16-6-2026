import {
    Outlet 
} from "react-router";

import {
    Navbar
} from "../components/Navbar";

import styles from "./app-layout.module.css";

export default function AppLayout() {
    return (
        <div className={styles.container}>
            <Navbar />

            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}
