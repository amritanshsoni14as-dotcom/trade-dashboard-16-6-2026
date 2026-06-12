import {
    useEffect,
    useRef
} from "react";

type Props = {
    futuresPnL: number;
    optionsPnL: number;
};

export default function PnLBarChart({
    futuresPnL,
    optionsPnL
}: Props) {

    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    useEffect(() => {

        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx =
            canvas.getContext("2d");

        if (!ctx) {
            return;
        }

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const values = [
            {
                label: "Futures",
                value: futuresPnL
            },
            {
                label: "Options",
                value: optionsPnL
            }
        ];

        const max =
            Math.max(
                ...values.map(v =>
                    Math.abs(v.value)),
                1
            );

        const chartTop = 20;
        const chartBottom = 220;
        const zeroY = 120;

        const barWidth = 80;

        values.forEach((
            item,
            index
        ) => {

            const x =
                70 +
                    index * 140;

            const height =
                (Math.abs(item.value) / max) *
                    90;

            const y =
                item.value >= 0
                    ? zeroY - height
                    : zeroY;

            ctx.fillStyle =
                item.value >= 0
                    ? "#00c853"
                    : "#ef4444";

            ctx.fillRect(
                x,
                y,
                barWidth,
                height
            );

            ctx.fillStyle = "#64748b";

            ctx.textAlign =
                "center";

            ctx.fillText(
                item.label,
                x +
                        barWidth /
                            2,
                chartBottom
            );

            ctx.fillText(
                `₹${Math.round(item.value).toLocaleString("en-IN")}`,
                x +
                        barWidth /
                            2,
                item.value >= 0
                    ? y - 8
                    : y +
                              height +
                              16
            );
        });

        ctx.strokeStyle =
            "#475569";

        ctx.beginPath();

        ctx.moveTo(
            30,
            zeroY
        );

        ctx.lineTo(
            280,
            zeroY
        );

        ctx.stroke();

    }, [
        futuresPnL,
        optionsPnL
    ]);

    return (
        <canvas
            ref={canvasRef}
            width={320}
            height={250}
        />
    );
}

type ScriptPnL = {
    script: string;
    pnl: number;
};

type Props_2 = {
    data: ScriptPnL[];
};

export function PnLBarChartScript({
    data
}: Props_2) {

    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    useEffect(() => {

        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx =
            canvas.getContext("2d");

        if (!ctx) {
            return;
        }

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const values = data.map(item => ({
            label: item.script,
            value: item.pnl
        }));

        const max =
            Math.max(
                ...values.map(v =>
                    Math.abs(v.value)),
                1
            );

        const chartTop = 20;
        const chartBottom = 220;
        const zeroY = 120;

        const barWidth = 80;

        values.forEach((
            item,
            index
        ) => {

            const x =
                70 +
                    index * 140;

            const height =
                (Math.abs(item.value) / max) *
                    90;

            const y =
                item.value >= 0
                    ? zeroY - height
                    : zeroY;

            ctx.fillStyle =
                item.value >= 0
                    ? "#00c853"
                    : "#ef4444";

            ctx.fillRect(
                x,
                y,
                barWidth,
                height
            );

            ctx.fillStyle = "#64748b";

            ctx.textAlign =
                "center";

            ctx.fillText(
                item.label,
                x +
                        barWidth /
                            2,
                chartBottom
            );

            ctx.fillText(
                `₹${Math.round(item.value).toLocaleString("en-IN")}`,
                x +
                        barWidth /
                            2,
                item.value >= 0
                    ? y - 8
                    : y +
                              height +
                              16
            );
        });

        ctx.strokeStyle =
            "#475569";

        ctx.beginPath();

        ctx.moveTo(
            30,
            zeroY
        );

        ctx.lineTo(
            280,
            zeroY
        );

        ctx.stroke();

    }, [
        data
    ]);

    return (
        <canvas
            ref={canvasRef}
            width={1000}
            height={250}
        />
    );
}
