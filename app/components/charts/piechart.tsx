import {
    useEffect,
    useRef,
    useState
} from "react";

type Props = {
    futuresPnL: number;
    optionsPnL: number;
};

export default function PnLPieChart({
    futuresPnL,
    optionsPnL
}: Props) {

    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    const [
        tooltip,
        setTooltip
    ] = useState<{
        x: number;
        y: number;
        label: string;
        value: number;
    } | null>(null);

    const values = [
        {
            label: "Futures",
            value: Math.abs(futuresPnL),
            color: "#22d3ee"
        },
        {
            label: "Options",
            value: Math.abs(optionsPnL),
            color: "#00c853"
        }
    ];

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

        const total =
            values.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            );

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const cx = 150;
        const cy = 150;
        const radius = 100;

        let startAngle =
            -Math.PI / 2;

        values.forEach((slice) => {

            const angle =
                total === 0
                    ? 0
                    : (slice.value / total) *
                      Math.PI *
                      2;

            ctx.beginPath();

            ctx.moveTo(
                cx,
                cy
            );

            ctx.arc(
                cx,
                cy,
                radius,
                startAngle,
                startAngle + angle
            );

            ctx.closePath();

            ctx.fillStyle =
                slice.color;

            ctx.fill();

            startAngle +=
                angle;
        });

    }, [
        futuresPnL,
        optionsPnL
    ]);

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {

        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        const rect =
            canvas.getBoundingClientRect();

        const x =
            e.clientX -
            rect.left;

        const y =
            e.clientY -
            rect.top;

        const dx =
            x - 150;

        const dy =
            y - 150;

        const distance =
            Math.sqrt(dx * dx +
                dy * dy);

        if (distance > 100) {
            setTooltip(null);
            return;
        }

        let angle =
            Math.atan2(
                dy,
                dx
            ) +
            Math.PI / 2;

        if (angle < 0) {
            angle +=
                Math.PI * 2;
        }

        const total =
            values.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            );

        let accumulated =
            0;

        for (const slice of values) {

            const sliceAngle =
                total === 0
                    ? 0
                    : (slice.value / total) *
                      Math.PI *
                      2;

            if (
                angle >= accumulated &&
                angle <=
                    accumulated +
                        sliceAngle
            ) {

                setTooltip({
                    x,
                    y,
                    label:
                        slice.label,
                    value:
                        slice.value
                });

                return;
            }

            accumulated +=
                sliceAngle;
        }

        setTooltip(null);
    }

    return (
        <div
            style={{
                position:
                    "relative",
                width: 300
            }}
        >
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onMouseMove={
                    handleMouseMove
                }
                onMouseLeave={() =>
                    setTooltip(null)
                }
            />

            {tooltip && (
                <div
                    style={{
                        position:
                            "absolute",
                        left:
                            tooltip.x +
                            10,
                        top:
                            tooltip.y -
                            10,
                        background:
                            "#11161d",
                        border:
                            "1px solid #232a33",
                        padding:
                            "8px",
                        borderRadius:
                            "8px",
                        pointerEvents:
                            "none",
                        color:
                            "#f8fafc",
                        fontSize:
                            "12px"
                    }}
                >
                    <div>
                        {
                            tooltip.label
                        }
                    </div>

                    <div>
                        ₹
                        {tooltip.value.toLocaleString("en-IN")}
                    </div>
                </div>
            )}
        </div>
    );
}

type Props_2 = {
    data: {
        script: string;
        pnl: number;
    }[];
};

export function PnLPieChartSript({
    data
}: Props_2) {

    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    const [
        tooltip,
        setTooltip
    ] = useState<{
        x: number;
        y: number;
        label: string;
        value: number;
    } | null>(null);
    const COLORS = [
        "#22d3ee",
        "#00c853",
        "#f59e0b",
        "#8b5cf6",
        "#ef4444",
        "#14b8a6",
        "#ec4899",
        "#84cc16"
    ];

    const values =
        data.map((item, index) => ({
            label: item.script,
            pnl: item.pnl,
            value: Math.abs(item.pnl),
            color:
            COLORS[
                index % COLORS.length
            ]
        }));

    /* const values = [
        {
            label: "Futures",
            value: Math.abs(futuresPnL),
            color: "#22d3ee"
        },
        {
            label: "Options",
            value: Math.abs(optionsPnL),
            color: "#00c853"
        }
    ]; */

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

        const total =
            values.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            );

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const cx = 150;
        const cy = 150;
        const radius = 100;

        let startAngle =
            -Math.PI / 2;

        values.forEach((slice) => {

            const angle =
                total === 0
                    ? 0
                    : (slice.value / total) *
                      Math.PI *
                      2;

            ctx.beginPath();

            ctx.moveTo(
                cx,
                cy
            );

            ctx.arc(
                cx,
                cy,
                radius,
                startAngle,
                startAngle + angle
            );

            ctx.closePath();

            ctx.fillStyle =
                slice.color;

            ctx.fill();

            startAngle +=
                angle;
        });

    }, [
        data
    ]);

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {

        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        const rect =
            canvas.getBoundingClientRect();

        const x =
            e.clientX -
            rect.left;

        const y =
            e.clientY -
            rect.top;

        const dx =
            x - 150;

        const dy =
            y - 150;

        const distance =
            Math.sqrt(dx * dx +
                dy * dy);

        if (distance > 100) {
            setTooltip(null);
            return;
        }

        let angle =
            Math.atan2(
                dy,
                dx
            ) +
            Math.PI / 2;

        if (angle < 0) {
            angle +=
                Math.PI * 2;
        }

        const total =
            values.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            );

        let accumulated =
            0;

        for (const slice of values) {

            const sliceAngle =
                total === 0
                    ? 0
                    : (slice.value / total) *
                      Math.PI *
                      2;

            if (
                angle >= accumulated &&
                angle <=
                    accumulated +
                        sliceAngle
            ) {

                setTooltip({
                    x,
                    y,
                    label:
                        slice.label,
                    value:
                        slice.value
                });

                return;
            }

            accumulated +=
                sliceAngle;
        }

        setTooltip(null);
    }

    return (
        <div
            style={{
                position:
                    "relative",
                width: 300
            }}
        >
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onMouseMove={
                    handleMouseMove
                }
                onMouseLeave={() =>
                    setTooltip(null)
                }
            />

            {tooltip && (
                <div
                    style={{
                        position:
                            "absolute",
                        left:
                            tooltip.x +
                            10,
                        top:
                            tooltip.y -
                            10,
                        background:
                            "#11161d",
                        border:
                            "1px solid #232a33",
                        padding:
                            "8px",
                        borderRadius:
                            "8px",
                        pointerEvents:
                            "none",
                        color:
                            "#f8fafc",
                        fontSize:
                            "12px"
                    }}
                >
                    <div>
                        {
                            tooltip.label
                        }
                    </div>

                    <div>
                        ₹
                        {tooltip.value.toLocaleString("en-IN")}
                    </div>
                </div>
            )}
        </div>
    );
}
