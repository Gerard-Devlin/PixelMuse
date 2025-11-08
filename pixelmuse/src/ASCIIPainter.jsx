import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import {
    Settings,
    Paintbrush,
    Trash2,
    FileText,
    Upload,
    Copy,
} from "lucide-react";

function drawDots(
    ctx,
    width,
    height,
    step = 20,
    dotRadius = 0.6,
    bg = "#f5f5f5",
    dot = "#cbd5e1"
) {
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = dot;
    for (
        let y = step / 2;
        y < height;
        y += step
    ) {
        for (
            let x = step / 2;
            x < width;
            x += step
        ) {
            ctx.beginPath();
            ctx.arc(
                x,
                y,
                dotRadius,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }
    ctx.restore();
}

const escapeForHtml = (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    if (char === "'") return "&#39;";
    if (char === " ") return "&nbsp;";
    return char;
};

const ASCII_TARGET_WIDTH = 900;
const ASCII_DIALOG_MAX_WIDTH = 1100;
const ASCII_MAX_FONT_SIZE = 12;
const ASCII_MIN_FONT_SIZE = 3;
const ASCII_CHAR_ASPECT_RATIO = 0.6;
const ASCII_BASE_LINE_HEIGHT = 1.1;

const INTRO_STEPS = [
    {
        id: "brush",
        title: "Prep the Canvas",
        description:
            "Upload a reference image or paint directly with the pixel brush—mouse and touch both work.",
        icon: Paintbrush,
        accent: "from-rose-500/20 via-rose-500/10 to-transparent",
    },
    {
        id: "tune",
        title: "Tune the Style",
        description:
            "Adjust character sets, columns, line height, and density bias until the ASCII vibe feels right.",
        icon: Settings,
        accent: "from-amber-500/20 via-amber-500/10 to-transparent",
    },
    {
        id: "upload",
        title: "Bring in Assets",
        description:
            "Drop in any image to convert it into a guide layer, clear it anytime, or keep painting on top.",
        icon: Upload,
        accent: "from-sky-500/20 via-sky-500/10 to-transparent",
    },
    {
        id: "export",
        title: "Export & Share",
        description:
            "Generate monochrome or color ASCII, copy it, or download TXT/HTML files for instant sharing.",
        icon: FileText,
        accent: "from-violet-500/20 via-violet-500/10 to-transparent",
    },
];

const buildColorAsciiDocument = (
    content,
    requestedFontSize = ASCII_MAX_FONT_SIZE
) => {
    const normalizedFontSize = Math.max(
        ASCII_MIN_FONT_SIZE,
        Math.min(
            ASCII_MAX_FONT_SIZE,
            requestedFontSize
        )
    );
    const fontSize = Number(
        normalizedFontSize.toFixed(2)
    );
    const lineHeight = Number(
        ASCII_BASE_LINE_HEIGHT *
            Math.max(
                0.75,
                fontSize / ASCII_MAX_FONT_SIZE
            )
    ).toFixed(2);

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Colored ASCII Art</title>
    <style>
      body {
        background: #f8fafc;
        color: #0f172a;
        margin: 0;
        padding: 24px;
        display: flex;
        justify-content: center;
      }
      .ascii-wrapper {
        width: min(100%, ${ASCII_TARGET_WIDTH}px);
      }
      pre {
        font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
        font-size: ${fontSize}px;
        line-height: ${lineHeight};
        margin: 0;
        white-space: pre;
        overflow: auto;
      }
    </style>
  </head>
  <body>
    <div class="ascii-wrapper">
      <pre>${content}</pre>
    </div>
  </body>
</html>`;
};

export default function ASCIIPainter() {
    const canvasRef = useRef(null);
    const ghostRef = useRef(null);
    const artRef = useRef(null);
    const fileRef = useRef(null);
    const drawing = useRef(false);
    const last = useRef(null);

    const [brushColor, setBrushColor] =
        useState("#000000");
    const [brushSize, setBrushSize] = useState(8);
    const [eraser, setEraser] = useState(false);
    const [columns, setColumns] = useState(100);
    const [lineHeightRatio, setLineHeightRatio] =
        useState(2);
    const [charset, setCharset] =
        useState(" .:-=+*#%@");
    const [invert, setInvert] = useState(false);
    const [densityBias, setDensityBias] =
        useState(0);
    const [ascii, setAscii] = useState("");
    const [colorAsciiHtml, setColorAsciiHtml] =
        useState("");
    const [showDialog, setShowDialog] =
        useState(false);
    const [showIntro, setShowIntro] =
        useState(true);

    const [isMobile, setIsMobile] =
        useState(false);

    const asciiFontSize = useMemo(() => {
        const safeColumns = Math.max(1, columns);
        const widthLimitedFont =
            ASCII_TARGET_WIDTH /
            (safeColumns *
                ASCII_CHAR_ASPECT_RATIO);
        const clampedFont = Math.max(
            ASCII_MIN_FONT_SIZE,
            Math.min(
                ASCII_MAX_FONT_SIZE,
                widthLimitedFont
            )
        );
        return Number(clampedFont.toFixed(2));
    }, [columns]);

    const asciiLineHeight = useMemo(() => {
        const scale =
            asciiFontSize / ASCII_MAX_FONT_SIZE;
        const computed =
            ASCII_BASE_LINE_HEIGHT *
            Math.max(scale, 0.75);
        return Number(computed.toFixed(2));
    }, [asciiFontSize]);

    const dialogWidth = isMobile
        ? "100vw"
        : `min(95vw, ${ASCII_DIALOG_MAX_WIDTH}px)`;
    const dialogMaxHeight = isMobile
        ? "100vh"
        : "90vh";
    const dialogWrapperClass = isMobile
        ? "flex flex-col h-full max-h-screen"
        : "flex flex-col h-full max-h-[90vh]";
    const dialogHeaderClass = isMobile
        ? "px-4 pt-4 pb-2 border-b"
        : "px-6 pt-6 pb-3 border-b";
    const dialogBodyClass = isMobile
        ? "flex-1 overflow-auto px-4 py-4 space-y-4"
        : "flex-1 overflow-auto px-6 py-5 space-y-5";
    const dialogFooterClass = isMobile
        ? "px-4 py-3 border-t flex flex-col gap-2"
        : "px-6 py-4 border-t flex justify-end gap-3 flex-wrap";
    const previewFrameClass =
        "bg-slate-50 font-mono p-4 rounded-lg text-slate-900 border border-slate-200 overflow-auto max-w-full shadow-inner flex items-center justify-center";
    const previewContainerStyle = useMemo(
        () => ({
            maxHeight: isMobile ? "45vh" : "60vh",
        }),
        [isMobile]
    );
    const previewContentStyle = useMemo(
        () => ({
            fontSize: `${asciiFontSize}px`,
            lineHeight: asciiLineHeight,
            maxWidth: isMobile
                ? "100%"
                : `${ASCII_TARGET_WIDTH}px`,
            display: "inline-block",
        }),
        [asciiFontSize, asciiLineHeight, isMobile]
    );

    const PRESETS = {
        Classic: " .:-=+*#%@",
        "Ultra Dense":
            " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
        Blocks: " ░▒▓█",
        "Dot Matrix": "·•●○◦",
    };

    useEffect(() => {
        const checkMobile = () =>
            setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener(
            "resize",
            checkMobile
        );
        return () =>
            window.removeEventListener(
                "resize",
                checkMobile
            );
    }, []);

    useEffect(() => {
        const c = canvasRef.current;
        const g = ghostRef.current;
        const a = artRef.current;
        if (!c || !g || !a) return;
        const ctx = c.getContext("2d");
        const resize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            c.width = width;
            c.height = height;
            drawDots(ctx, width, height);
            a.width = width;
            a.height = height;
            const artCtx = a.getContext("2d");
            artCtx.fillStyle = "#ffffff";
            artCtx.fillRect(0, 0, width, height);
            g.width = width;
            g.height = height;
        };
        resize();
        window.addEventListener("resize", resize);
        return () =>
            window.removeEventListener(
                "resize",
                resize
            );
    }, []);

    const getPos = (e) => {
        const c = canvasRef.current;
        const rect = c.getBoundingClientRect();
        let x, y;
        if (e.touches?.length) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        return { x, y };
    };

    const drawLine = (x1, y1, x2, y2) => {
        const c = canvasRef.current;
        const ctx = c.getContext("2d");
        ctx.save();
        ctx.globalCompositeOperation = eraser
            ? "destination-out"
            : "source-over";
        ctx.strokeStyle = eraser
            ? "rgba(0,0,0,1)"
            : brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        const art = artRef.current;
        if (art) {
            const artCtx = art.getContext("2d");
            artCtx.save();
            artCtx.globalCompositeOperation =
                "source-over";
            artCtx.strokeStyle = eraser
                ? "#ffffff"
                : brushColor;
            artCtx.lineWidth = brushSize;
            artCtx.lineCap = "round";
            artCtx.beginPath();
            artCtx.moveTo(x1, y1);
            artCtx.lineTo(x2, y2);
            artCtx.stroke();
            artCtx.restore();
        }
    };

    const clearCanvas = () => {
        const c = canvasRef.current;
        const ctx = c.getContext("2d");
        drawDots(ctx, c.width, c.height);
        const art = artRef.current;
        if (art) {
            const artCtx = art.getContext("2d");
            artCtx.fillStyle = "#ffffff";
            artCtx.fillRect(
                0,
                0,
                art.width,
                art.height
            );
        }
        setAscii("");
        setColorAsciiHtml("");
    };

    const handleUpload = (file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const c = canvasRef.current;
            const ctx = c.getContext("2d");
            drawDots(ctx, c.width, c.height);
            const ratio = Math.min(
                c.width / img.width,
                c.height / img.height
            );
            const newW = img.width * ratio;
            const newH = img.height * ratio;
            const offsetX = (c.width - newW) / 2;
            const offsetY = (c.height - newH) / 2;
            ctx.drawImage(
                img,
                offsetX,
                offsetY,
                newW,
                newH
            );
            const art = artRef.current;
            if (art) {
                const artCtx =
                    art.getContext("2d");
                artCtx.fillStyle = "#ffffff";
                artCtx.fillRect(
                    0,
                    0,
                    art.width,
                    art.height
                );
                artCtx.drawImage(
                    img,
                    offsetX,
                    offsetY,
                    newW,
                    newH
                );
            }
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            console.error(
                "Image loading failed."
            );
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    const toASCII = () => {
        const source = artRef.current;
        const g = ghostRef.current;
        if (!source || !g) return;
        const gctx = g.getContext("2d", {
            willReadFrequently: true,
        });

        const cellW = Math.max(
            1,
            Math.floor(source.width / columns)
        );
        const cellH = Math.max(
            1,
            Math.floor(cellW * lineHeightRatio)
        );
        const outW = Math.floor(
            source.width / cellW
        );
        const outH = Math.floor(
            source.height / cellH
        );

        g.width = outW;
        g.height = outH;
        gctx.imageSmoothingEnabled = true;
        gctx.drawImage(source, 0, 0, outW, outH);

        const img = gctx.getImageData(
            0,
            0,
            outW,
            outH
        );
        const data = img.data;
        const chars = charset;

        let result = "";
        let colorResult = "";
        for (let y = 0; y < outH; y++) {
            let row = "";
            let colorRow = "";
            for (let x = 0; x < outW; x++) {
                const idx = (y * outW + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                let lum =
                    0.299 * r +
                    0.587 * g +
                    0.114 * b;
                lum = Math.min(
                    1,
                    Math.max(
                        0,
                        lum / 255 +
                            densityBias / 100
                    )
                );
                if (!invert) lum = 1 - lum;
                const ci = Math.round(
                    lum * (chars.length - 1)
                );
                const char = chars[ci];
                row += char;
                colorRow += `<span style="color: rgb(${r}, ${g}, ${b})">${escapeForHtml(
                    char
                )}</span>`;
            }
            result += row + "\n";
            colorResult += colorRow + "\n";
        }
        setAscii(result);
        setColorAsciiHtml(colorResult);
        setShowDialog(true);
    };

    const copyAscii = () =>
        navigator.clipboard.writeText(ascii);
    const downloadAscii = () => {
        const blob = new Blob([ascii], {
            type: "text/plain",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ascii_art.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyColorAscii = () => {
        if (!colorAsciiHtml) return;
        const doc = buildColorAsciiDocument(
            colorAsciiHtml,
            asciiFontSize
        );
        navigator.clipboard.writeText(doc);
    };

    const downloadColorAscii = () => {
        if (!colorAsciiHtml) return;
        const doc = buildColorAsciiDocument(
            colorAsciiHtml,
            asciiFontSize
        );
        const blob = new Blob([doc], {
            type: "text/html",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ascii_art_color.html";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full h-full bg-white overflow-hidden relative select-none">
            <canvas
                ref={canvasRef}
                className="w-full h-full touch-none"
                onMouseDown={(e) => {
                    drawing.current = true;
                    last.current = getPos(e);
                }}
                onMouseMove={(e) => {
                    if (!drawing.current) return;
                    const { x, y } = getPos(e);
                    drawLine(
                        last.current.x,
                        last.current.y,
                        x,
                        y
                    );
                    last.current = { x, y };
                }}
                onMouseUp={() =>
                    (drawing.current = false)
                }
                onMouseLeave={() =>
                    (drawing.current = false)
                }
                onTouchStart={(e) => {
                    drawing.current = true;
                    last.current = getPos(e);
                }}
                onTouchMove={(e) => {
                    if (!drawing.current) return;
                    const { x, y } = getPos(e);
                    drawLine(
                        last.current.x,
                        last.current.y,
                        x,
                        y
                    );
                    last.current = { x, y };
                }}
                onTouchEnd={() =>
                    (drawing.current = false)
                }
            />
            <canvas
                ref={artRef}
                className="hidden"
            />
            <canvas
                ref={ghostRef}
                className="hidden"
            />

            {/* Top Right Buttons */}
            <div className="absolute top-6 right-6 flex gap-3 flex-wrap justify-end">
                <Button
                    onClick={clearCanvas}
                    variant="outline"
                    className={`rounded-full shadow ${
                        isMobile
                            ? "w-10 h-10 p-0"
                            : "px-4 py-2"
                    }`}>
                    <Trash2 className="w-4 h-4 mx-auto" />{" "}
                    {!isMobile && "Clear"}
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={`rounded-full shadow-md ${
                                isMobile
                                    ? "w-10 h-10 p-0"
                                    : "px-4 py-2"
                            }`}>
                            <Paintbrush className="w-4 h-4 mx-auto" />{" "}
                            {!isMobile && "Brush"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4 space-y-3 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between">
                            <label className="text-sm">
                                Brush Size
                            </label>
                            <span className="text-sm text-slate-600">
                                {brushSize}px
                            </span>
                        </div>
                        <Slider
                            min={1}
                            max={32}
                            value={[brushSize]}
                            onValueChange={(v) =>
                                setBrushSize(v[0])
                            }
                        />
                        <div className="flex items-center justify-between">
                            <label className="text-sm">
                                Color
                            </label>
                            <input
                                type="color"
                                value={brushColor}
                                onChange={(e) =>
                                    setBrushColor(
                                        e.target
                                            .value
                                    )
                                }
                            />
                        </div>
                        <Button
                            variant={
                                eraser
                                    ? "default"
                                    : "outline"
                            }
                            onClick={() =>
                                setEraser(!eraser)
                            }>
                            {eraser
                                ? "Eraser On"
                                : "Toggle Eraser"}
                        </Button>
                    </PopoverContent>
                </Popover>
                <Button
                    variant="outline"
                    className={`rounded-full shadow-md ${
                        isMobile
                            ? "w-10 h-10 p-0"
                            : "px-4 py-2"
                    }`}
                    onClick={() =>
                        fileRef.current?.click()
                    }>
                    <Upload className="w-4 h-4 mx-auto" />{" "}
                    {!isMobile && "Import Image"}
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file =
                            e.target.files?.[0];
                        if (file)
                            handleUpload(file);
                    }}
                />
            </div>

            {/* Bottom Right Buttons */}
            <div className="absolute bottom-6 right-6 flex gap-3 flex-wrap justify-end">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={`rounded-full shadow-md ${
                                isMobile
                                    ? "w-10 h-10 p-0"
                                    : "px-4 py-2"
                            }`}>
                            <Settings className="w-4 h-4 mx-auto" />{" "}
                            {!isMobile && "Style"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4 space-y-3 rounded-2xl shadow-lg">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm">
                                Character Set
                            </label>
                            <Select
                                value={charset}
                                onValueChange={
                                    setCharset
                                }>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose a style" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(
                                        PRESETS
                                    ).map(
                                        ([
                                            k,
                                            v,
                                        ]) => (
                                            <SelectItem
                                                key={
                                                    k
                                                }
                                                value={
                                                    v
                                                }>
                                                {
                                                    k
                                                }
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm">
                                Columns
                            </label>
                            <span className="text-sm text-slate-600">
                                {columns}
                            </span>
                        </div>
                        <Slider
                            min={40}
                            max={400}
                            value={[columns]}
                            onValueChange={(v) =>
                                setColumns(v[0])
                            }
                        />
                        <div className="flex items-center justify-between">
                            <label className="text-sm">
                                Line Height
                            </label>
                            <span className="text-sm text-slate-600">
                                {lineHeightRatio.toFixed(
                                    1
                                )}
                            </span>
                        </div>
                        <Slider
                            min={1}
                            max={3}
                            step={0.1}
                            value={[
                                lineHeightRatio,
                            ]}
                            onValueChange={(v) =>
                                setLineHeightRatio(
                                    v[0]
                                )
                            }
                        />
                        <div className="flex items-center justify-between">
                            <label className="text-sm">
                                Density Bias
                            </label>
                            <span className="text-sm text-slate-600">
                                {densityBias}
                            </span>
                        </div>
                        <Slider
                            min={-100}
                            max={100}
                            value={[densityBias]}
                            onValueChange={(v) =>
                                setDensityBias(
                                    v[0]
                                )
                            }
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={invert}
                                onChange={(e) =>
                                    setInvert(
                                        e.target
                                            .checked
                                    )
                                }
                            />
                            <label className="text-sm">
                                Invert
                            </label>
                        </div>
                    </PopoverContent>
                </Popover>
                <Button
                    onClick={toASCII}
                    className={`bg-slate-900 text-white shadow-md rounded-full ${
                        isMobile
                            ? "w-10 h-10 p-0"
                            : "px-5 py-2"
                    }`}>
                    <FileText className="w-4 h-4 mx-auto" />{" "}
                    {!isMobile &&
                        "Generate ASCII"}
                </Button>
            </div>

            {/* Intro Dialog */}
            <Dialog
                open={showIntro}
                onOpenChange={setShowIntro}>
                <DialogContent className="w-full max-w-3xl rounded-[1em] border-0 bg-slate-50/95 p-0 text-slate-900 shadow-2xl"
                    style={{ borderRadius: "1em" }}>
                    <div className="space-y-6 p-6 sm:p-8">
                        <DialogHeader className="space-y-3 text-center">
                            <DialogTitle className="text-2xl font-semibold">
                                Welcome to
                                PixelMuse
                            </DialogTitle>
                            <p className="text-sm text-slate-600">
                                Follow this quick
                                guide to turn
                                sketches or photos
                                into ASCII art in
                                minutes.
                            </p>
                        </DialogHeader>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {INTRO_STEPS.map(
                                ({
                                    id,
                                    title,
                                    description,
                                    icon: Icon,
                                    accent,
                                }) => (
                                    <div
                                        key={id}
                                        className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                                        <div
                                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
                                            aria-hidden="true"
                                        />
                                        <div className="relative space-y-2">
                                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-slate-900 shadow-inner">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <h3 className="font-semibold tracking-tight">
                                                {
                                                    title
                                                }
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                {
                                                    description
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                        <Button
                            className="w-full rounded-2xl bg-slate-900 py-6 text-base font-semibold"
                            onClick={() =>
                                setShowIntro(
                                    false
                                )
                            }>
                            Start Creating
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ASCII Result Dialog */}
            <Dialog
                open={showDialog}
                onOpenChange={setShowDialog}>
                <DialogContent
                    className={`w-full max-w-none overflow-hidden bg-white text-slate-900 border shadow-2xl p-0 flex flex-col rounded-[1em] ${
                        isMobile
                            ? "h-screen max-h-screen left-0 top-0 translate-x-0 translate-y-0"
                            : "max-h-[90vh]"
                    }`}
                    style={{
                        width: dialogWidth,
                        maxHeight:
                            dialogMaxHeight,
                        height: isMobile
                            ? "100vh"
                            : undefined,
                        borderRadius: "1em",
                    }}>
                    <div
                        className={
                            dialogWrapperClass
                        }>
                        <DialogHeader
                            className={`${dialogHeaderClass} ${
                                isMobile
                                    ? "text-center sm:text-center"
                                    : ""
                            }`}>
                            <DialogTitle>
                                ASCII Conversion
                                Result
                            </DialogTitle>
                        </DialogHeader>
                        <div
                            className={
                                dialogBodyClass
                            }>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                    Monochrome
                                </p>
                                <div
                                    className={
                                        previewFrameClass
                                    }
                                    style={
                                        previewContainerStyle
                                    }>
                                    <pre
                                        className="whitespace-pre"
                                        style={
                                            previewContentStyle
                                        }>
                                        {ascii}
                                    </pre>
                                </div>
                            </div>
                            {colorAsciiHtml && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                        Color
                                        Preview
                                    </p>
                                    <div
                                        className={
                                            previewFrameClass
                                        }
                                        style={
                                            previewContainerStyle
                                        }>
                                        <div
                                            style={{
                                                ...previewContentStyle,
                                                whiteSpace:
                                                    "pre",
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: colorAsciiHtml,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter
                            className={`${dialogFooterClass} ${
                                isMobile
                                    ? "sm:flex-col sm:gap-2"
                                    : ""
                            }`}>
                            <Button
                                variant="outline"
                                onClick={
                                    copyAscii
                                }
                                className={
                                    isMobile
                                        ? "w-full justify-center"
                                        : undefined
                                }>
                                <Copy className="w-4 h-4 mr-1" />{" "}
                                {!isMobile &&
                                    "Copy Text"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={
                                    downloadAscii
                                }
                                className={
                                    isMobile
                                        ? "w-full justify-center"
                                        : undefined
                                }>
                                <FileText className="w-4 h-4 mr-1" />{" "}
                                {!isMobile &&
                                    "Download TXT"}
                            </Button>
                            {colorAsciiHtml && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={
                                            copyColorAscii
                                        }
                                        className={
                                            isMobile
                                                ? "w-full justify-center"
                                                : undefined
                                        }>
                                        <Copy className="w-4 h-4 mr-1" />{" "}
                                        {!isMobile &&
                                            "Copy Color HTML"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={
                                            downloadColorAscii
                                        }
                                        className={
                                            isMobile
                                                ? "w-full justify-center"
                                                : undefined
                                        }>
                                        <FileText className="w-4 h-4 mr-1" />{" "}
                                        {!isMobile &&
                                            "Download HTML"}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
