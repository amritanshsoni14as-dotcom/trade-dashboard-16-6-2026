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
                <h1 className={styles.title}>
                    Welcome Back
                </h1>

                <p className={styles.subtitle}>
                    Login to continue
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
                            placeholder="Enter username"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            name="password"
                            placeholder="Enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.button}
                    >
                        Login
                    </button>
                </Form>
            </div>
        </div>
    );
}
