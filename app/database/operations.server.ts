import {
    redirect 
} from "react-router";
import {
    eq, and, isNull 
} from "drizzle-orm";

import {
    db 
} from "./db.server";
import {
    positions, trades 
} from "./schema.server";

import {
    requireUser
} from "~/utils/auth.server";
import {
    getInstrumentDetails
} from "~/database/utils.server";

type ActionResult = {
    errors?: Record<string, string>;
    values?: Record<string, string>;
};

type TradeFormData = {
    exchange: "NSE" | "BSE";
    instrumentType: "FUTURE" | "OPTIONS";
    script: string;
    expiry: string;
    positionType: "LONG" | "SHORT";
    quantity: number;
    entryPrice: number;
    strikePrice: string | null;
    optionType: "CE" | "PE" | null;
};

function parseTradeForm(formData: FormData): TradeFormData {
    const instrumentType = formData.get("instrument_type") as TradeFormData["instrumentType"];

    return {
        exchange: formData.get("exchange") as TradeFormData["exchange"],

        instrumentType,

        script: String(formData.get("script") || "")
            .trim()
            .toUpperCase(),

        expiry: String(formData.get("expiry") || ""),

        positionType: formData.get("position_type") as TradeFormData["positionType"],

        quantity: Number(formData.get("quantity")),

        entryPrice: Number(formData.get("entry_price")),

        strikePrice:
      instrumentType === "OPTIONS"
          ? Number(formData.get("strike_price")).toFixed(2)
          : null,

        optionType:
      instrumentType === "OPTIONS"
          ? (formData.get("option_type") as "CE" | "PE")
          : null
    };
}

function validateTrade(data: TradeFormData) {
    const errors: Record<string, string> = {
    };

    if (!data.exchange) {
        errors.exchange = "Exchange is required";
    }

    if (!data.instrumentType) {
        errors.instrumentType = "Instrument type is required";
    }

    if (!data.script) {
        errors.script = "Stock symbol is required";
    }

    if (!data.expiry) {
        errors.expiry = "Expiry date is required";
    }

    if (!data.positionType) {
        errors.positionType = "Position type is required";
    }

    if (data.quantity <= 0 || Number.isNaN(data.quantity)) {
        errors.quantity = "Quantity must be greater than 0";
    }

    if (data.entryPrice <= 0 || Number.isNaN(data.entryPrice)) {
        errors.entryPrice = "Entry price must be greater than 0";
    }

    if (data.instrumentType === "OPTIONS") {
        if (!data.strikePrice) {
            errors.strikePrice = "Strike price is required";
        }

        if (!data.optionType) {
            errors.optionType = "Option type is required";
        }
    }

    return errors;
}

async function findMatchingPosition(
    userId: number,
    data: TradeFormData
) {
    const conditions = [
        eq(positions.userId, userId),
        eq(positions.exchange, data.exchange),
        eq(positions.instrumentType, data.instrumentType),
        eq(positions.script, data.script),
        eq(positions.expiry, data.expiry),
        eq(positions.positionType, data.positionType)
    ];

    if (data.instrumentType === "OPTIONS") {
        conditions.push(eq(positions.strikePrice, data.strikePrice!));
        conditions.push(eq(positions.optionType, data.optionType!));
    } else {
        conditions.push(isNull(positions.strikePrice));
        conditions.push(isNull(positions.optionType));
    }

    const rows = await db
        .select()
        .from(positions)
        .where(and(...conditions))
        .limit(1);

    return rows[0] ?? null;
}

function computeUpdatedPosition(
    existing: {
        quantity: number;
        averagePrice: string | null;
        positionType: "LONG" | "SHORT";
    },
    trade: {
        quantity: number;
        price: number;
        positionType: "LONG" | "SHORT";
    }
) {
    const prevQty = existing.quantity;

    const prevAvg = existing.averagePrice
        ? Number(existing.averagePrice)
        : trade.price;

    if (existing.positionType === trade.positionType) {
        const quantity = prevQty + trade.quantity;

        const averagePrice =
            (
                (prevAvg * prevQty +
          trade.price * trade.quantity) /
        quantity
            ).toFixed(2);

        return {
            quantity,
            averagePrice,
            currentPrice: trade.price.toFixed(2),
            positionType: existing.positionType
        };
    }

    if (trade.quantity < prevQty) {
        return {
            quantity: prevQty - trade.quantity,
            averagePrice: prevAvg.toFixed(2),
            currentPrice: trade.price.toFixed(2),
            positionType: existing.positionType
        };
    }

    if (trade.quantity === prevQty) {
        return {
            quantity: 0,
            averagePrice: "0.00",
            currentPrice: trade.price.toFixed(2),
            positionType: existing.positionType
        };
    }

    return {
        quantity: trade.quantity - prevQty,
        averagePrice: trade.price.toFixed(2),
        currentPrice: trade.price.toFixed(2),
        positionType: trade.positionType
    };
}

export async function addTrade(request: Request): Promise<ActionResult | Response> {
    const user = await requireUser(request);

    const currentUserId = user.id;
    const formData = await request.formData();

    const data = parseTradeForm(formData);

    const errors = validateTrade(data);

    if (Object.keys(errors).length > 0) {
        return {
            errors,
            values: Object.fromEntries(formData) as Record<string, string>
        };
    }

    const existing = await findMatchingPosition(
        currentUserId,
        data
    );

    let positionId: number;

    if (existing) {
        const updated = computeUpdatedPosition(existing, {
            quantity: data.quantity,
            price: data.entryPrice,
            positionType: data.positionType
        });

        await db
            .update(positions)
            .set(updated)
            .where(eq(positions.id, existing.id));

        positionId = existing.id;
    } else {
        const instrument = await getInstrumentDetails({
            script: data.script,
            exchange: data.exchange,
            instrumentType: data.instrumentType,
            expiry: data.expiry,
            strikePrice: data.strikePrice,
            optionType: data.optionType
        });
        const inserted = await db
            .insert(positions)
            .values({
                userId: currentUserId,
                exchange: data.exchange,
                instrumentType: data.instrumentType,
                script: data.script,
                expiry: data.expiry,
                strikePrice: data.strikePrice,
                optionType: data.optionType,
                positionType: data.positionType,
                quantity: data.quantity,
                lotSize: instrument?.lotSize,
                exchangeInstrumentId:
            instrument?.exchangeInstrumentId,
                entryPrice: data.entryPrice.toFixed(2),
                averagePrice: data.entryPrice.toFixed(2),
                currentPrice: data.entryPrice.toFixed(2)
            })
            .returning({
                id: positions.id
            });

        positionId = inserted[0].id;
    }

    await db.insert(trades).values({
        positionId,
        userId: currentUserId,
        tradeType: "ADD",
        quantity: data.quantity,
        price: data.entryPrice.toFixed(2),
        notes: ""
    });

    return redirect("/dashboard/trades");
}
