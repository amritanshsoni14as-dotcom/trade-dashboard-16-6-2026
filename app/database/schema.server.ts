import {
    relations, sql 
} from "drizzle-orm";
import {
    pgTable,
    pgEnum,
    serial,
    integer,
    varchar,
    text,
    timestamp,
    date,
    bigint,
    numeric,
    index,
    uniqueIndex
} from "drizzle-orm/pg-core";

/* =========================
   Enums
========================= */

export const userRoleEnum = pgEnum("user_role", [
    "admin",
    "participant"
]);

export const instrumentTypeEnum = pgEnum("instrument_type", [
    "STOCK",
    "INDEX",
    "FUTURE",
    "OPTIONS"
]);

export const exchangeEnum = pgEnum("exchange", [
    "NSE",
    "BSE"
]);

export const positionTypeEnum = pgEnum("position_type", [
    "LONG",
    "SHORT"
]);

export const optionTypeEnum = pgEnum("option_type", [
    "CE",
    "PE"
]);

export const tradeTypeEnum = pgEnum("trade_type", [
    "ADD",
    "UPDATE",
    "EXIT"
]);

/* =========================
   Users
========================= */

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: varchar("username", {
        length: 150 
    }).notNull().unique(),
    email: varchar("email", {
        length: 254 
    }),
    createdAt: timestamp("created_at", {
        withTimezone: true 
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
        withTimezone: true 
    })
        .defaultNow()
        .$onUpdateFn(() => sql`now()`)
        .notNull(),
    role: userRoleEnum("role")
        .notNull()
        .default("participant"),
    passwordHash: text("password_hash").notNull()
});

export const dailyPnls = pgTable("daily_pnls", {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
        .notNull()
        .references(() => users.id),

    pnl: numeric("pnl", {
        precision: 15,
        scale: 2
    }).notNull(),

    tradingDate: date("trading_date")
        .notNull(),

    createdAt: timestamp("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
});

export const dailyPnlsRelations =
    relations(
        dailyPnls,
        ({
            one 
        }) => ({
            user: one(users, {
                fields: [
                    dailyPnls.userId
                ],

                references: [
                    users.id
                ]
            })
        })
    );

export const usersRelations =
    relations(
        users,
        ({
            many 
        }) => ({
            dailyPnls:
                many(dailyPnls)
        })
    );

/* =========================
   UserProfile → profiles
========================= */

export const profiles = pgTable(
    "profiles",
    {
        id: serial("id").primaryKey(),

        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade" 
            }),

        role: userRoleEnum("role").notNull().default("participant"),

        createdAt: timestamp("created_at", {
            withTimezone: true 
        }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true 
        })
            .defaultNow()
            .$onUpdateFn(() => sql`now()`)
            .notNull()
    },
    (t) => [
        uniqueIndex("profiles_user_id_unique").on(t.userId)
    ]
);

/* =========================
   Position
========================= */

export const positions = pgTable(
    "positions",
    {
        id: serial("id").primaryKey(),

        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade" 
            }),

        script: varchar("script", {
            length: 50 
        }).notNull(),

        exchange: exchangeEnum("exchange").notNull().default("NSE"),

        instrumentType: instrumentTypeEnum("instrument_type").notNull(),

        expiry: date("expiry"),

        strikePrice: numeric("strike_price", {
            precision: 10,
            scale: 2 
        }),

        optionType: optionTypeEnum("option_type"),

        positionType: positionTypeEnum("position_type").notNull(),

        quantity: integer("quantity").notNull().default(0),
        exchangeInstrumentId: bigint(
            "exchange_instrument_id",
            {
                mode: "number"
            }
        ).notNull(),

        lotSize: integer("lot_size").notNull().default(1),

        entryPrice: numeric("entry_price", {
            precision: 15,
            scale: 2 
        }).notNull(),

        averagePrice: numeric("average_price", {
            precision: 15,
            scale: 2 
        }),

        currentPrice: numeric("current_price", {
            precision: 15,
            scale: 2 
        }),

        previousSettledPrice: numeric("previous_settled_price", {
            precision: 10,
            scale: 2
        })
            .notNull()
            .default("0.00"),

        settledPrice: numeric("settled_price", {
            precision: 10,
            scale: 2
        })
            .notNull()
            .default("0.00"),

        createdAt: timestamp("created_at", {
            withTimezone: true 
        }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true 
        })
            .defaultNow()
            .$onUpdateFn(() => sql`now()`)
            .notNull()
    },
    (t) => [
        index("positions_user_id_idx").on(t.userId),
        index("positions_script_idx").on(t.script)
    ]
);

/* =========================
   Trade
========================= */

export const trades = pgTable(
    "trades",
    {
        id: serial("id").primaryKey(),

        positionId: integer("position_id")
            .notNull()
            .references(() => positions.id, {
                onDelete: "cascade" 
            }),

        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade" 
            }),

        tradeType: tradeTypeEnum("trade_type").notNull(),

        quantity: integer("quantity").notNull(),

        price: numeric("price", {
            precision: 15,
            scale: 2 
        }).notNull(),

        notes: text("notes").notNull().default(""),

        createdAt: timestamp("created_at", {
            withTimezone: true 
        }).defaultNow().notNull()
    },
    (t) => [
        index("trades_position_id_idx").on(t.positionId),
        index("trades_user_id_idx").on(t.userId),
        index("trades_created_at_idx").on(t.createdAt)
    ]
);

/* =========================
   Relations
========================= */

// export const usersRelations = relations(users, ({
//     one, many 
// }) => ({
//     profile: one(profiles),
//     positions: many(positions),
//     trades: many(trades)
// }));

export const profilesRelations = relations(profiles, ({
    one 
}) => ({
    user: one(users, {
        fields: [
            profiles.userId
        ],
        references: [
            users.id
        ]
    })
}));

export const positionsRelations = relations(positions, ({
    one, many 
}) => ({
    user: one(users, {
        fields: [
            positions.userId
        ],
        references: [
            users.id
        ]
    }),
    trades: many(trades)
}));

export const tradesRelations = relations(trades, ({
    one 
}) => ({
    position: one(positions, {
        fields: [
            trades.positionId
        ],
        references: [
            positions.id
        ]
    }),
    user: one(users, {
        fields: [
            trades.userId
        ],
        references: [
            users.id
        ]
    })
}));

/* =========================
   Types
========================= */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
