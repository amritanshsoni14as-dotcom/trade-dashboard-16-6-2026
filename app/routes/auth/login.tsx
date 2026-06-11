import {
    Form,
    redirect,
    useActionData
} from "react-router";

import bcrypt from "bcryptjs";

import {
    eq
} from "drizzle-orm";

import {
    db
} from "../../database/db.server";

import {
    users
} from "../../database/schema.server";

import {
    createSession
} from "~/utils/auth.server";

import styles from "./login.module.css";

export async function action({
    request
}: any) {
    const formData = await request.formData();

    const username = String(formData.get("username"));

    const password = String(formData.get("password"));

    const user = await db.query.users.findFirst({
        where: eq(users.username, username)
    });

    if (!user) {
        return {
            error: "Invalid credentials"
        };
    }

    const valid = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!valid) {
        return {
            error: "Invalid credentials"
        };
    }

    return redirect("/dashboard/trades", {
        headers: {
            "Set-Cookie": createSession({
                id: user.id,
                username: user.username,
                role: user.role
            })
        }
    });
}

export default function LoginPage() {
    const actionData = useActionData() as any;

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <div className={styles.dot} />

                    <span>
                        Trading Ops
                    </span>
                </div>

                <h1 className={styles.title}>
                    Sign in
                </h1>

                <p className={styles.subtitle}>
                    Internal terminal — authorised users only.
                </p>

                {actionData?.error && (
                    <div className={styles.error}>
                        {actionData.error}
                    </div>
                )}

                <Form
                    method="post"
                    className={styles.form}
                >
                    <div className={styles.field}>
                        <label>
                            Username
                        </label>

                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.button}
                    >
                        Sign In
                    </button>
                </Form>
            </div>
        </div>
    );
}
