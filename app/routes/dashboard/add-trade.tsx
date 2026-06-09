import {
    Form,
    useActionData,
    useNavigation
} from "react-router";

import {
    useEffect, useState 
} from "react";

import {
    addTrade 
} from "../../database/operations.server";

import styles from "./add-trade.module.css";

export async function action({
    request 
}: any) {
    const formData = await request.formData();

    const values = {
        exchange:
            formData.get("exchange")?.toString(),

        instrument_type:
            formData
                .get("instrument_type")
                ?.toString(),

        quantity:
            formData.get("quantity")?.toString()
    };

    const errors: Record<string, string> = {
    };

    if (!values.exchange) {
        errors.exchange =
            "Exchange is required";
    }

    if (!values.instrument_type) {
        errors.instrumentType =
            "Instrument type is required";
    }

    if (
        !values.quantity ||
        Number(values.quantity) <= 0
    ) {
        errors.quantity =
            "Quantity must be greater than 0";
    }

    if (Object.keys(errors).length) {
        return {
            errors,
            values
        };
    }
    return addTrade(request);
}

export default function AddTradePage() {
    const actionData = useActionData<any>();

    const navigation = useNavigation();

    const isSubmitting =
        navigation.state === "submitting";

    const errors = actionData?.errors || {
    };

    const values = actionData?.values || {
    };

    const [
        instrumentType,
        setInstrumentType
    ] =
        useState(values.instrument_type || "");

    useEffect(() => {
        if (values.instrument_type) {
            setInstrumentType(values.instrument_type);
        }
    }, [
        values.instrument_type
    ]);

    const isOptions =
        instrumentType === "OPTIONS";

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>
                Add Trade
            </h2>

            <Form method="post" className={styles.form}>
                {/* Exchange */}
                <div className={styles.field}>
                    <label>Exchange</label>

                    <select
                        name="exchange"
                        defaultValue={values.exchange}
                        className={
                            errors.exchange
                                ? styles.fieldError
                                : ""
                        }
                    >
                        <option value="">
                            Select Exchange
                        </option>

                        <option value="NSE">NSE</option>

                        <option value="BSE">BSE</option>
                    </select>

                    {errors.exchange && (
                        <p className={styles.error}>
                            {errors.exchange}
                        </p>
                    )}
                </div>

                {/* Instrument Type */}
                <div className={styles.field}>
                    <label>Instrument Type</label>

                    <select
                        name="instrument_type"
                        value={instrumentType}
                        onChange={(e) =>
                            setInstrumentType(e.target.value)
                        }
                        className={
                            errors.instrumentType
                                ? styles.fieldError
                                : ""
                        }
                    >
                        <option value="">
                            Select Instrument
                        </option>

                        <option value="FUTURE">
                            Futures
                        </option>

                        <option value="OPTIONS">
                            Options
                        </option>
                    </select>

                    {errors.instrumentType && (
                        <p className={styles.error}>
                            {errors.instrumentType}
                        </p>
                    )}
                </div>

                {/* Script */}
                <div className={styles.field}>
                    <label>Stock Symbol</label>

                    <input
                        type="text"
                        name="script"
                        placeholder="RELIANCE"
                        defaultValue={values.script}
                        className={
                            errors.script
                                ? styles.fieldError
                                : ""
                        }
                    />

                    {errors.script && (
                        <p className={styles.error}>
                            {errors.script}
                        </p>
                    )}
                </div>

                {/* Expiry */}
                <div className={styles.field}>
                    <label>Expiry Date</label>

                    <input
                        type="date"
                        name="expiry"
                        defaultValue={values.expiry}
                        className={
                            errors.expiry
                                ? styles.fieldError
                                : ""
                        }
                    />

                    {errors.expiry && (
                        <p className={styles.error}>
                            {errors.expiry}
                        </p>
                    )}
                </div>

                {/* Strike Price */}
                {isOptions && (
                    <div className={styles.field}>
                        <label>Strike Price</label>

                        <input
                            type="number"
                            step="0.01"
                            name="strike_price"
                            placeholder="25000"
                            defaultValue={
                                values.strike_price
                            }
                            className={
                                errors.strikePrice
                                    ? styles.fieldError
                                    : ""
                            }
                        />

                        {errors.strikePrice && (
                            <p className={styles.error}>
                                {errors.strikePrice}
                            </p>
                        )}
                    </div>
                )}

                {/* Option Type */}
                {isOptions && (
                    <div className={styles.field}>
                        <label>Option Type</label>

                        <select
                            name="option_type"
                            defaultValue={
                                values.option_type
                            }
                            className={
                                errors.optionType
                                    ? styles.fieldError
                                    : ""
                            }
                        >
                            <option value="">
                                Select Option Type
                            </option>

                            <option value="CE">
                                CE (Call)
                            </option>

                            <option value="PE">
                                PE (Put)
                            </option>
                        </select>

                        {errors.optionType && (
                            <p className={styles.error}>
                                {errors.optionType}
                            </p>
                        )}
                    </div>
                )}

                {/* Position Type */}
                <div className={styles.field}>
                    <label>Position Type</label>

                    <select
                        name="position_type"
                        defaultValue={
                            values.position_type
                        }
                        className={
                            errors.positionType
                                ? styles.fieldError
                                : ""
                        }
                    >
                        <option value="">
                            Select Position
                        </option>

                        <option value="LONG">
                            Buy / Long
                        </option>

                        <option value="SHORT">
                            Sell / Short
                        </option>
                    </select>

                    {errors.positionType && (
                        <p className={styles.error}>
                            {errors.positionType}
                        </p>
                    )}
                </div>

                {/* Quantity */}
                <div className={styles.field}>
                    <label>Number of Lots</label>

                    <input
                        type="number"
                        name="quantity"
                        defaultValue={values.quantity}
                        className={
                            errors.quantity
                                ? styles.fieldError
                                : ""
                        }
                    />

                    {errors.quantity && (
                        <p className={styles.error}>
                            {errors.quantity}
                        </p>
                    )}
                </div>

                {/* Entry Price */}
                <div className={styles.field}>
                    <label>Entry Price</label>

                    <input
                        type="number"
                        step="0.01"
                        name="entry_price"
                        defaultValue={
                            values.entry_price
                        }
                        className={
                            errors.entryPrice
                                ? styles.fieldError
                                : ""
                        }
                    />

                    {errors.entryPrice && (
                        <p className={styles.error}>
                            {errors.entryPrice}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.submitButton}
                >
                    {isSubmitting
                        ? "Saving..."
                        : "Save Trade"}
                </button>
            </Form>
        </div>
    );
}

