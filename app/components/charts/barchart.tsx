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
    futuresPnL: number;
    optionsPnL: number;
};

type Props_2 = {
    data: ScriptPnL[];
    onScriptClick: (script: string) => void;
};

export function PnLBarChartScript({
    data,
    onScriptClick
}: Props_2) {

    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {

        const canvas =
            canvasRef.current;

        if (!canvas) return;

        const rect =
            canvas.getBoundingClientRect();

        const clickX =
            event.clientX - rect.left;

        const barWidth = 80;

        for (
            let index = 0;
            index < data.length;
            index++
        ) {

            const groupX =
                70 + index * 180;

            const groupLeft =
                groupX;

            const groupRight =
                groupX + 80;
            // Future(20) + gap(10) +
            // Option(20) + gap(10) +
            // Total(20)

            if (
                clickX >= groupLeft &&
        clickX <= groupRight
            ) {

                onScriptClick(data[index].script);

                break;
            }
        }
    };

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

        const values =
            data.map(item => ({
                label: item.script,
                futuresPnL:
            item.futuresPnL,
                optionsPnL:
            item.optionsPnL,
                totalPnL:
            item.pnl
            }));

        const max =
            Math.max(
                ...values.map(v =>
                    Math.max(
                        Math.abs(v.futuresPnL),
                        Math.abs(v.optionsPnL),
                        Math.abs(v.totalPnL)
                    )),
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

            //     const x =
            //         70 +
            // index * 140;

            const groupX =
                70 + index * 180;

            const futureX =
                groupX;

            const optionX =
                groupX + 30;

            const totalX =
                groupX + 60;

            const barWidth = 20;

            const futureHeight =
                Math.abs(item.futuresPnL) / max * 90;

            const optionHeight =
                Math.abs(item.optionsPnL) / max * 90;

            const totalHeight =
                Math.abs(item.totalPnL) / max * 90;

            /*
    =========================
    FUTURE
    =========================
    */

            const futureY =
                item.futuresPnL >= 0
                    ? zeroY - futureHeight
                    : zeroY;

            ctx.fillStyle = "#22d3ee";

            ctx.fillRect(
                futureX,
                futureY,
                barWidth,
                futureHeight
            );

            /*
    =========================
    OPTION
    =========================
    */

            const optionY =
                item.optionsPnL >= 0
                    ? zeroY - optionHeight
                    : zeroY;

            ctx.fillStyle = "#f57c00";

            ctx.fillRect(
                optionX,
                optionY,
                barWidth,
                optionHeight
            );
            const totalY =
                item.totalPnL >= 0
                    ? zeroY - totalHeight
                    : zeroY;

            ctx.fillStyle = "#10b981";

            ctx.fillRect(
                totalX,
                totalY,
                barWidth,
                totalHeight
            );

            const legendX = 920;
            const legendY = 40;
            const boxSize = 12;

            // Futures
            ctx.fillStyle = "#22d3ee";
            ctx.fillRect(
                legendX,
                legendY,
                boxSize,
                boxSize
            );

            ctx.fillStyle = "#64748b";
            ctx.textAlign = "left";
            ctx.fillText(
                "Futures",
                legendX + 20,
                legendY + 10
            );

            // Options
            ctx.fillStyle = "#f57c00";
            ctx.fillRect(
                legendX,
                legendY + 25,
                boxSize,
                boxSize
            );

            ctx.fillStyle = "#64748b";
            ctx.fillText(
                "Options",
                legendX + 20,
                legendY + 35
            );

            // Total
            ctx.fillStyle = "#10b981";
            ctx.fillRect(
                legendX,
                legendY + 50,
                boxSize,
                boxSize
            );

            ctx.fillStyle = "#64748b";
            ctx.fillText(
                "Total",
                legendX + 20,
                legendY + 60
            );

            /*
    =========================
    LABEL
    =========================
    */

            ctx.fillStyle =
                "#64748b";

            ctx.textAlign =
                "center";

            ctx.fillText(
                item.label,
                groupX + 30,
                chartBottom
            );

            ctx.fillText(
                `₹${Math.round(item.totalPnL).toLocaleString("en-IN")}`,
                totalX + barWidth / 2,
                item.totalPnL >= 0
                    ? totalY - 8
                    : totalY + totalHeight + 16
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
            870,
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
            onClick={handleClick}
        />
    );
}
