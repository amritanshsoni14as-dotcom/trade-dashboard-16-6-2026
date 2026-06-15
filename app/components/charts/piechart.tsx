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
        futuresPnL: number;
        optionsPnL: number;
    }[];
};

export function PnLPieChartSript({
    data
}: Props_2) {
    const [
        selectedScript,
        setSelectedScript
    ] = useState<
    Props_2["data"][number] | null
    >(null);

    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    const miniCanvasRef =
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

    const scriptValues =
        data.map((item, index) => ({
            label: item.script,
            value: Math.abs(item.pnl),
            pnl: item.pnl,
            color:
            COLORS[
                index % COLORS.length
            ]
        }));

    const selectedInstrumentValues =
        selectedScript
            ? [
                {
                    label: "FUTURE",
                    value: Math.abs(selectedScript.futuresPnL),
                    color: "#22d3ee"
                },
                {
                    label: "OPTION",
                    value: Math.abs(selectedScript.optionsPnL),
                    color: "#00c853"
                }
            ]
            : [
            ];

    function drawPie(
        canvas: HTMLCanvasElement,
        slices: {
            value: number;
            color: string;
        }[],
        cx: number,
        cy: number,
        radius: number
    ) {

        const ctx =
            canvas.getContext("2d");

        if (!ctx) {
            return;
        }

        const total =
            slices.reduce(
                (sum, s) =>
                    sum + s.value,
                0
            );

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        let startAngle =
            -Math.PI / 2;

        for (const slice of slices) {

            const angle =
                total === 0
                    ? 0
                    : (
                        slice.value /
                    total
                    ) *
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
                startAngle +
                angle
            );

            ctx.closePath();

            ctx.fillStyle =
                slice.color;

            ctx.fill();

            startAngle +=
                angle;
        }
    }

    function getSliceIndex(
        x: number,
        y: number,
        slices: {
            value: number;
        }[],
        cx: number,
        cy: number,
        radius: number
    ) {

        const dx =
            x - cx;

        const dy =
            y - cy;

        const distance =
            Math.sqrt(dx * dx +
            dy * dy);

        if (
            distance >
        radius
        ) {
            return -1;
        }

        let angle =
            Math.atan2(
                dy,
                dx
            ) +
        Math.PI / 2;

        if (
            angle < 0
        ) {
            angle +=
                Math.PI * 2;
        }

        const total =
            slices.reduce(
                (sum, s) =>
                    sum + s.value,
                0
            );

        let accumulated =
            0;

        for (
            let i = 0;
            i < slices.length;
            i++
        ) {

            const sliceAngle =
                total === 0
                    ? 0
                    : (
                        slices[i]
                            .value /
                    total
                    ) *
                Math.PI *
                2;

            if (
                angle >=
                accumulated &&
            angle <=
                accumulated +
                    sliceAngle
            ) {
                return i;
            }

            accumulated +=
                sliceAngle;
        }

        return -1;
    }

    function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {

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

        const index =
            getSliceIndex(
                x,
                y,
                scriptValues,
                150,
                150,
                100
            );

        if (
            index === -1
        ) {
            setSelectedScript(null);
            return;
        }

        setSelectedScript(data[index]);
    }

    /*
=========================
MAIN SCRIPT PIE
=========================
*/

    useEffect(() => {

        if (
            !canvasRef.current
        ) {
            return;
        }

        drawPie(
            canvasRef.current,
            scriptValues,
            150,
            150,
            100
        );

    }, [
        scriptValues
    ]);

    /*
=========================
FUTURE VS OPTION PIE
=========================
*/

    useEffect(() => {

        if (
            !miniCanvasRef.current
        ) {
            return;
        }

        drawPie(
            miniCanvasRef.current,
            selectedInstrumentValues,
            75,
            75,
            60
        );

    }, [
        selectedScript
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

        if (
            distance > 100
        ) {
            setTooltip(null);
            return;
        }

        let angle =
            Math.atan2(
                dy,
                dx
            ) +
        Math.PI / 2;

        if (
            angle < 0
        ) {
            angle +=
                Math.PI * 2;
        }

        const total =
            scriptValues.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            );

        let accumulated =
            0;

        for (
            const slice of scriptValues
        ) {

            const sliceAngle =
                total === 0
                    ? 0
                    : (
                        slice.value /
                    total
                    ) *
                Math.PI *
                2;

            if (
                angle >=
                accumulated &&
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
                    slice.pnl
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
                display: "flex",
                gap: 32,
                alignItems: "flex-start"
            }}
        >

            {/* MAIN PIE */}

            <div
                style={{
                    position: "relative"
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    onClick={handleClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() =>
                        setTooltip(null)
                    }
                    style={{
                        cursor: "pointer"
                    }}
                />

                {tooltip && (
                    <div
                        style={{
                            position: "absolute",
                            left: tooltip.x + 10,
                            top: tooltip.y - 10,
                            background: "#11161d",
                            border: "1px solid #232a33",
                            padding: "8px",
                            borderRadius: "8px",
                            pointerEvents: "none",
                            color: "#f8fafc",
                            fontSize: "12px"
                        }}
                    >
                        <div>
                            {tooltip.label}
                        </div>

                        <div>
                            ₹
                            {tooltip.value.toLocaleString("en-IN")}
                        </div>
                    </div>
                )}
            </div>

            {/* DRILLDOWN PIE */}

            <div>
                <div
                    style={{
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "var(--text)"
                    }}
                >
                    {
                        selectedScript
                            ? `${selectedScript.script} Mix`
                            : "Click a script"
                    }
                </div>

                <canvas
                    ref={miniCanvasRef}
                    style={{
                        position: "relative",
                        top: "45px"
                    }}
                    width={150}
                    height={150}
                />

                {selectedScript && (
                    <div
                        style={{
                            position: "relative",
                            top: "40px",
                            left: "15px",
                            fontSize: 12,
                            color: "var(--text)"
                        }}
                    >
                        <div>
                            FUTURE:
                            {" "}
                            ₹
                            {selectedScript.futuresPnL.toLocaleString("en-IN")}
                        </div>

                        <div>
                            OPTION:
                            {" "}
                            ₹
                            {selectedScript.optionsPnL.toLocaleString("en-IN")}
                        </div>
                    </div>
                )}
            </div>

            {/* LEGENDS */}

            <div>
                <div
                    style={{
                        marginBottom: 12,
                        fontWeight: 600,
                        color: "var(--text)"
                    }}
                >
                    Scripts
                </div>

                {scriptValues.map((item) => (
                    <div
                        key={item.label}
                        onClick={() =>
                            setSelectedScript(data.find(d =>
                                d.script ===
                                        item.label) ?? null)
                        }
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                            cursor: "pointer",
                            padding:
                                "4px 8px",
                            borderRadius: 6,
                            color: "var(--text)",
                            background:
                                selectedScript?.script ===
                                item.label
                                    ? "var(--accent)"
                                    : "transparent"
                        }}
                    >
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background:
                                    item.color
                            }}
                        />

                        <span>
                            {item.label}
                        </span>
                    </div>
                ))}

                {selectedScript && (
                    <>
                        <hr
                            style={{
                                margin:
                                "12px 0"
                            }}
                        />

                        <div
                            style={{
                                fontWeight:
                                600,
                                marginBottom:
                                8,
                                color: "var(--text)"
                            }}
                        >
                            Instrument Split
                        </div>

                        <div
                            style={{
                                display:
                                "flex",
                                alignItems:
                                "center",
                                gap: 8,
                                marginBottom:
                                6
                            }}
                        >
                            <div
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius:
                                    "50%",
                                    background:
                                    "#22d3ee"
                                }}
                            />

                            <span style={{
                                color: "var(--text)"
                            }}>
                                FUTURE
                            </span>
                        </div>

                        <div
                            style={{
                                display:
                                "flex",
                                alignItems:
                                "center",
                                gap: 8
                            }}
                        >
                            <div
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius:
                                    "50%",
                                    background:
                                    "#00c853"
                                }}
                            />

                            <span style={{
                                color: "var(--text)"
                            }}>
                                OPTION
                            </span>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
