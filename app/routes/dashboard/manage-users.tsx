import {
    Form,
    useLoaderData,
    redirect
} from "react-router";

import bcrypt from "bcryptjs";
import styles from "./manage-users.module.css";
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
    requireAdmin
} from "~/utils/auth.server";

export async function loader({
    request 
}: any) {
    await requireAdmin(request);

    const allUsers = await db.query.users.findMany({
        orderBy: (users, {
            asc 
        }) => [
            asc(users.id)
        ]
    });

    return {
        users: allUsers
    };
}

export async function action({
    request 
}: any) {
    const admin = await requireAdmin(request);

    const formData = await request.formData();

    const intent = formData.get("intent");

    /*
    =========================
    CREATE USER
    =========================
    */

    if (intent === "create-user") {
        const username = String(formData.get("username"));
        const password = String(formData.get("password"));
        const role = String(formData.get("role"));

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return {
                error: "Invalid username"
            };
        }

        if (password.length < 6) {
            return {
                error: "Password too short"
            };
        }

        if (
            role !== "admin" &&
            role !== "participant"
        ) {
            return {
                error: "Invalid role"
            };
        }

        const existing = await db.query.users.findFirst({
            where: eq(users.username, username)
        });

        if (existing) {
            return {
                error: "Username already exists"
            };
        }

        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        await db
            .insert(users)
            .values({
                username,
                passwordHash,
                role: role as "admin" | "participant"
            });

        return redirect("/dashboard/manage-users");
    }

    /*
    =========================
    DELETE USER
    =========================
    */

    if (intent === "delete-user") {
        const userId = Number(formData.get("userId"));

        // prevent self delete
        if (userId === admin.id) {
            return {
                error: "You cannot delete yourself"
            };
        }

        await db
            .delete(users)
            .where(eq(users.id, userId));

        return redirect("/dashboard/manage-users");
    }

    return null;
}

export default function ManageUsersPage() {
    const data = useLoaderData() as any;

    return (
        <div className={styles.container}>
            
            <h1 className={styles.title}>
                Manage Users
            </h1>

            {/* ======================
                CREATE USER
            ====================== */}

            <Form method="post" className={styles.form}>
                <input
                    type="hidden"
                    name="intent"
                    value="create-user"
                />

                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                />

                <select name="role">
                    <option value="participant">
                        Participant
                    </option>
                    <option value="admin">
                        Admin
                    </option>
                </select>

                <button type="submit">
                    Add User
                </button>
            </Form>

            <hr />

            {/* ======================
                USERS LIST
            ====================== */}

            <div className={styles.list}>
                {data.users.map((user: any) => (
                    <div
                        key={user.id}
                        className={styles.userRow}
                    >
                        <div className={styles.userInfo}>
                            <div className={styles.userId}>
                                #{user.id}
                            </div>

                            <div className={styles.username}>
                                {user.username}
                            </div>

                            <div
                                className={`${styles.role} ${
                                    user.role === "admin"
                                        ? styles.roleAdmin
                                        : styles.roleParticipant
                                }`}
                            >
                                {user.role}
                            </div>
                        </div>

                        <Form method="post">
                            <input
                                type="hidden"
                                name="intent"
                                value="delete-user"
                            />

                            <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                            />

                            <button
                                type="submit"
                                className={styles.deleteBtn}
                            >
                                Delete
                            </button>
                        </Form>
                    </div>
                ))}
            </div>
        </div>
    );
}
