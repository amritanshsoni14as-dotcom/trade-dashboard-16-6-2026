import {
    Form, redirect, useActionData 
} from "react-router";
import bcrypt from "bcryptjs";

import {
    db 
} from "../../database/db.server";
import {
    users 
} from "../../database/schema.server";

import {
    createSession 
} from "~/utils/auth.server";

export async function action({
    request 
}: any) {
    const formData = await request.formData();

    const username = String(formData.get("username"));
    const password = String(formData.get("password"));

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

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const [
            user
        ] = await db.insert(users)
            .values({
                username,
                passwordHash 
            })
            .returning();

        return redirect("/dashboard/trades", {
            headers: {
                "Set-Cookie": createSession({
                    id: user.id,
                    username: user.username,
                    role: user.role
                })
            }
        });
    } catch (error) {
        return {
            error: "Username already exists" 
        };
    }
}

export default function SignupPage() {
    const actionData = useActionData() as any;

    return (
        <div>
            <h1>Sign Up</h1>

            {actionData?.error && (
                <p>{actionData.error}</p>
            )}

            <Form method="post">
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

                <button type="submit">
                    Create Account
                </button>
            </Form>
        </div>
    );
}
