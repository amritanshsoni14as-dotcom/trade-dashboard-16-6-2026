import {
    doALogin 
} from "~/database/utils.server";
import {
    updatePreviousSettledPrices, updateSettledPrices 
} from "~/utils/settlement.server";

export async function loader() {

    const now =
        new Date();

    const istTime =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone:
                    "Asia/Kolkata",

                hour: "2-digit",
                minute: "2-digit",

                hour12: false
            }
        ).format(now);

    /*
    =========================
    PARSE TIME
    =========================
    */

    const [
        hour,
        minute
    ] = istTime
        .split(":")
        .map(Number);

    const totalMinutes =
        hour * 60 + minute;

    /*
    =========================
    MORNING
    9:00 AM IST to 12:00 PM IST
    =========================
    */

    if (
        totalMinutes >= 540 &&
        totalMinutes <= 720
    ) {

        await updatePreviousSettledPrices(await doALogin());

        return Response.json({
            success: true,
            type: "morning"
        });
    }

    /*
    =========================
    EVENING
    4:00 PM IST to 8:00 PM
    =========================
    */

    if (
        totalMinutes >= 960 &&
        totalMinutes <= 1200
    ) {

        await updateSettledPrices(await doALogin());

        return Response.json({
            success: true,
            type: "evening"
        });
    }

    return Response.json({
        skipped: true
    });
}
