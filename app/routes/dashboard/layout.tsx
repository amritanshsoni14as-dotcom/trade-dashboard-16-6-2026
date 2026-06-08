// app/routes/dashboard/layout.tsx

import {
    Outlet 
} from "react-router";
import {
    requireUser 
} from "~/utils/auth.server";

export async function loader({
    request 
}: any) {
    const user = await requireUser(request);

    return {
        user
    };
}

export default function DashboardLayout() {
    return (
        <div>
            {/* <h1>Dashboard</h1> */}

            <Outlet />
        </div>
    );
}
