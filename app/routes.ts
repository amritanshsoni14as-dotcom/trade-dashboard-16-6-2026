import {
    type RouteConfig,
    route,
    index,
    layout
} from "@react-router/dev/routes";

export default [
    // https://chatgpt.com/share/6a22b03c-8dc4-8324-9e28-8486beb6ed22
    // at8
    layout("./layouts/app-layout.tsx", [
        index("./routes/home.tsx"),

        route("dashboard", "./routes/dashboard/layout.tsx", [
            route("trades", "./routes/dashboard/trades.tsx"),
            route("mtm", "./routes/dashboard/mtm.tsx"),
            route("add-trade", "./routes/dashboard/add-trade.tsx"),
            route("manage-users", "./routes/dashboard/manage-users.tsx"),
            route(
                "trades/live",
                "./routes/dashboard/trades-live.ts"
            ),
            route(
                "calendar-pnl",
                "./routes/dashboard/calendar-pnl.tsx"
            )
        ])
    ]),

    route("login", "./routes/auth/login.tsx"),
    route("logout", "./routes/auth/logout.tsx"),
    route("sign-up", "./routes/auth/sign-up.tsx"),

    // https://reactrouter.com/start/framework/routing 
    route("api/api-settlement", "./routes/api/settlement.ts"),
    route("api/live-price-update", "./routes/api/live-price-update.ts"),
    route(
        "api/store-daily-pnl",
        "./routes/api/store-daily-pnl.ts"
    )
] satisfies RouteConfig;
