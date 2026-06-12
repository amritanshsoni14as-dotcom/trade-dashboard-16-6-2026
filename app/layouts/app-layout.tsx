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
import {
    useEffect, useState 
} from "react";

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

    const [
        theme,
        setTheme
    ] = useState("light");

    useEffect(() => {
        const saved =
            localStorage.getItem("theme");

        const initialTheme =
            saved || "light";

        setTheme(initialTheme);

        document.documentElement.setAttribute(
            "data-theme",
            initialTheme
        );
    }, [
    ]);

    function toggleTheme() {
        const nextTheme =
            theme === "dark"
                ? "light"
                : "dark";

        setTheme(nextTheme);

        document.documentElement.setAttribute(
            "data-theme",
            nextTheme
        );

        localStorage.setItem(
            "theme",
            nextTheme
        );
    }

    return (
        <div className={styles.container}>
            <Navbar />

            <div className={styles.content}>
                <header className={styles.topbar}>
                    <div className={styles.market}>
                        {/* <span>
                            Market Data
                        </span>

                        <div className={styles.badge}>
                            LIVE
                        </div> */}
                        {user.username}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}
                    >
                        <button
                            onClick={toggleTheme}
                        >
                            {
                                theme === "dark"
                                    ? "☀️"
                                    : "🌙"
                            }
                        </button>

                        {/* <div className={styles.user}>
                            {user.username}
                        </div> */}
                    </div>
                </header>

                <main className={styles.main}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
