import jwt from "jsonwebtoken";
import {
    redirect 
} from "react-router";

const JWT_SECRET = "my_ultra_secret_key_123";

type SessionUser = {
    id: number;
    username: string;
    role: "admin" | "participant";
};

export function createSession(user: SessionUser) {
    const token = jwt.sign(user, JWT_SECRET, {
        expiresIn: "7d"
    });

    return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function destroySession() {
    return "session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}

export async function requireAdmin(request: Request) {
    const user = await requireUser(request);

    if (user.role !== "admin") {
        throw new Response("Forbidden", {
            status: 403
        });
    }

    return user;
}

export function getTokenFromRequest(request: Request) {
    const cookie = request.headers.get("Cookie");

    if (!cookie) {
        return null;
    }

    const match = cookie.match(/session=([^;]+)/);

    return match?.[1] ?? null;
}

export function getUserFromCookie(request: Request): SessionUser | null {
    const token = getTokenFromRequest(request);

    if (!token) {
        return null;
    }

    try {
        return jwt.verify(token, JWT_SECRET) as SessionUser;
    }
    catch {
        return null;
    }
}

export async function requireUser(request: Request) {
    const user = getUserFromCookie(request);

    if (!user) {
        throw redirect("/login");
    }

    return user;
}
