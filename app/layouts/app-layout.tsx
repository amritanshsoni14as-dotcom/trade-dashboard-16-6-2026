import {
    Outlet,
    useLoaderData
} from "react-router";

import {
    Navbar
} from "../components/Navbar";

import styles from "./app-layout.module.css";
import {
    requireUser 
} from "~/utils/auth.server";

export async function loader({
    request 
}: any) {
    const user = await requireUser(request);
    // console.log(user)
    return {
        user
    };
}

export default function AppLayout({
    loaderData
}: any) {
    const {
        user 
    } = loaderData;

    return (
        <div className={styles.container}>
            <Navbar />

            <div className={styles.content}>
                <header className={styles.topbar}>
                    <div className={styles.market}>
                        <span>
                            Market Data
                        </span>

                        <div className={styles.badge}>
                            LIVE
                        </div>
                    </div>

                    <div className={styles.user}>
                        {user.username}
                    </div>
                </header>

                <main className={styles.main}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
