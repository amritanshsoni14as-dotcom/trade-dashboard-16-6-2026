import {
    redirect 
} from "react-router";

import {
    destroySession 
} from "~/utils/auth.server";

export async function loader() {
    return redirect("/login", {
        headers: {
            "Set-Cookie": destroySession()
        }
    });
}
