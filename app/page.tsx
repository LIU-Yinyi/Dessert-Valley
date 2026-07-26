"use client";

import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Bot,
  Brush,
  CakeSlice,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  CloudDownload,
  Download,
  Eraser,
  FileCode2,
  FileImage,
  FileText,
  Flower2,
  GripVertical,
  ImagePlus,
  Import,
  Layers3,
  Lightbulb,
  LoaderCircle,
  Menu,
  MessageCircleMore,
  Minus,
  PackageCheck,
  Palette,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Redo2,
  Send,
  Share2,
  Sparkles,
  Star,
  Store,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Stage = "idea" | "design" | "product" | "bake";
type Theme = "blush" | "french" | "harvest";
type Size = "small" | "medium" | "large";
type IdeaStatus = "inbox" | "ready";
type DessertVariant = "moon" | "berry" | "garden";

type IdeaCard = {
  id: number;
  title: string;
  description: string;
  tags: string[];
  accent: string;
  icon: string;
  status: IdeaStatus;
};

type SketchIntent = {
  preview: string;
  annotations: string[];
  brushColor: string;
  brushSize: number;
  revision: number;
};

type CapturedDesignIntent = {
  sketch: SketchIntent;
  moods: string[];
  referenceName: string;
  referencePreview: string;
  voiceNote: boolean;
  inputCount: number;
};

const stageMeta: {
  id: Stage;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof Lightbulb;
}[] = [
  {
    id: "idea",
    label: "Idea",
    eyebrow: "Dream",
    description: "Gather & shape",
    icon: Lightbulb,
  },
  {
    id: "design",
    label: "Design",
    eyebrow: "Sketch",
    description: "Visualize it",
    icon: Pencil,
  },
  {
    id: "product",
    label: "Product",
    eyebrow: "Craft",
    description: "Recipe & build",
    icon: CakeSlice,
  },
  {
    id: "bake",
    label: "Bake",
    eyebrow: "Serve",
    description: "Print & produce",
    icon: BookOpen,
  },
];

const seedIdeas: IdeaCard[] = [
  {
    id: 1,
    title: "Moonlit Jasmine Cloud",
    description:
      "A pearl-white mousse cake with a translucent tea veil and tiny sugar stars.",
    tags: ["jasmine", "airy", "night sky"],
    accent: "lavender",
    icon: "☾",
    status: "ready",
  },
  {
    id: 2,
    title: "Strawberry Picnic Box",
    description:
      "Layered strawberry shortcake that opens like a tiny gingham picnic hamper.",
    tags: ["berry", "giftable", "playful"],
    accent: "berry",
    icon: "🍓",
    status: "inbox",
  },
  {
    id: 3,
    title: "Pistachio Garden",
    description:
      "A mossy pistachio entremet with chamomile flowers and a honey centre.",
    tags: ["botanical", "nutty", "calm"],
    accent: "sage",
    icon: "✿",
    status: "inbox",
  },
];

const sizeScale: Record<Size, number> = {
  small: 0.72,
  medium: 1,
  large: 1.55,
};

const sizeDetails: Record<
  Size,
  { diameter: string; height: string; serves: string }
> = {
  small: { diameter: "12 cm", height: "5 cm", serves: "4–6" },
  medium: { diameter: "16 cm", height: "6 cm", serves: "8–10" },
  large: { diameter: "22 cm", height: "7 cm", serves: "14–18" },
};

const ingredients = [
  { name: "Jasmine-infused cream", amount: 420, unit: "g", note: "mousse" },
  { name: "White couverture", amount: 180, unit: "g", note: "mousse" },
  { name: "Pear purée", amount: 160, unit: "g", note: "centre" },
  { name: "Almond sponge", amount: 220, unit: "g", note: "base" },
  { name: "Gelatine mass", amount: 36, unit: "g", note: "structure" },
  { name: "Clear tea glaze", amount: 140, unit: "g", note: "finish" },
];

const processSteps = [
  {
    title: "Infuse the jasmine cream",
    detail:
      "Warm half the cream to 65°C, steep jasmine tea for 8 minutes, then strain.",
    time: "15 min",
  },
  {
    title: "Build the pear moon centre",
    detail:
      "Cook pear purée, fold in gelatine mass, pour into the insert mould and freeze.",
    time: "20 min + chill",
  },
  {
    title: "Whip & assemble the cloud",
    detail:
      "Emulsify white chocolate with the infusion, fold through softly whipped cream, then layer.",
    time: "25 min",
  },
  {
    title: "Glaze and add the night sky",
    detail:
      "Unmould frozen, glaze at 30°C, then finish with sugar pearls and tiny blossoms.",
    time: "20 min",
  },
];

const productionProducts = [
  {
    id: "moon",
    name: "Moonlit Jasmine Cloud",
    emoji: "☾",
    tint: "lavender",
    defaultCount: 3,
  },
  {
    id: "berry",
    name: "Strawberry Picnic Box",
    emoji: "🍓",
    tint: "berry",
    defaultCount: 2,
  },
  {
    id: "garden",
    name: "Pistachio Garden",
    emoji: "✿",
    tint: "sage",
    defaultCount: 1,
  },
];

const productionMaterials = [
  { name: "Whipping cream", unit: "kg", perProduct: [0.42, 0.35, 0.38], price: 11.8 },
  { name: "White chocolate", unit: "kg", perProduct: [0.18, 0.12, 0.15], price: 28.5 },
  { name: "Fresh fruit / purée", unit: "kg", perProduct: [0.16, 0.5, 0.2], price: 18.2 },
  { name: "Nut flour / paste", unit: "kg", perProduct: [0.22, 0.08, 0.34], price: 31.4 },
  { name: "Tea, herbs & garnish", unit: "set", perProduct: [1, 1, 1], price: 2.4 },
];

const productRenderings: Record<
  DessertVariant,
  { src: string; label: string; detail: string; alt: string }[]
> = {
  moon: [
    {
      src: "/renderings/moonlit-jasmine-hero.png",
      label: "Finished exterior",
      detail: "Form, glaze & decoration",
      alt: "Photoreal rendering of the finished Moonlit Jasmine Cloud cake",
    },
    {
      src: "/renderings/moonlit-jasmine-cutaway.png",
      label: "Cutaway structure",
      detail: "Layers & pear moon insert",
      alt: "Photoreal cutaway rendering showing the Moonlit Jasmine Cloud cake layers",
    },
  ],
  berry: [
    {
      src: "/renderings/strawberry-picnic-hero.png",
      label: "Finished exterior",
      detail: "Gingham finish & berry layers",
      alt: "Photoreal rendering of the Strawberry Picnic Box cake",
    },
  ],
  garden: [
    {
      src: "/renderings/pistachio-garden-hero.png",
      label: "Finished exterior",
      detail: "Pistachio moss & honey details",
      alt: "Photoreal rendering of the Pistachio Garden cake",
    },
  ],
};

const moodPresets: Record<
  DessertVariant,
  { label: string; className: string }[]
> = {
  moon: [
    { label: "moon pearl", className: "mood-moon" },
    { label: "soft tea veil", className: "mood-ribbon" },
    { label: "jasmine bloom", className: "mood-flower" },
  ],
  berry: [
    { label: "berry blush", className: "mood-moon" },
    { label: "gingham ribbon", className: "mood-ribbon" },
    { label: "picnic blossom", className: "mood-flower" },
  ],
  garden: [
    { label: "pistachio moss", className: "mood-moon" },
    { label: "honey ribbon", className: "mood-ribbon" },
    { label: "chamomile", className: "mood-flower" },
  ],
};

const seedAnnotations: Record<DessertVariant, string[]> = {
  moon: ["crystal tea veil", "soft almond base"],
  berry: ["edible gingham lid", "fresh berry layers"],
  garden: ["pistachio moss", "hidden honey centre"],
};

function freshSketchIntent(variant: DessertVariant): SketchIntent {
  return {
    preview: "",
    annotations: [...seedAnnotations[variant]],
    brushColor: "#665273",
    brushSize: 5,
    revision: 0,
  };
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function dessertVariantForIdea(idea: IdeaCard): DessertVariant {
  if (idea.accent === "berry" || /strawberry|berry|picnic/i.test(idea.title)) {
    return "berry";
  }
  if (idea.accent === "sage" || /pistachio|garden|botanical/i.test(idea.title)) {
    return "garden";
  }
  return "moon";
}

function DessertArt({
  variant = "moon",
  compact = false,
}: {
  variant?: DessertVariant;
  compact?: boolean;
}) {
  return (
    <div className={cn("dessert-art", `art-${variant}`, compact && "art-compact")}>
      <div className="art-halo" />
      <div className="art-spark art-spark-one">✦</div>
      <div className="art-spark art-spark-two">·</div>
      <div className="art-flower art-flower-one">✿</div>
      <div className="art-flower art-flower-two">✽</div>
      <div className="cake-shadow" />
      <div className="cake-body">
        <span className="cake-glaze" />
        <span className="cake-layer cake-layer-one" />
        <span className="cake-layer cake-layer-two" />
        <span className="cake-moon">{variant === "berry" ? "♥" : variant === "garden" ? "✿" : "☾"}</span>
        <span className="cake-pearl pearl-one" />
        <span className="cake-pearl pearl-two" />
        <span className="cake-pearl pearl-three" />
      </div>
      <div className="cake-board" />
      <span className="visual-caption">
        {variant === "moon"
          ? "pear · jasmine · almond"
          : variant === "berry"
            ? "strawberry · vanilla · milk"
            : "pistachio · honey · chamomile"}
      </span>
    </div>
  );
}

function InputTools({
  recording,
  onRecord,
  onImage,
}: {
  recording: boolean;
  onRecord: () => void;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="input-tools">
      <button
        className={cn("icon-button", recording && "is-recording")}
        onClick={onRecord}
        type="button"
        aria-label={recording ? "Stop voice note" : "Add a voice note"}
        data-tip={recording ? "Listening…" : "Voice note"}
      >
        <AudioLines size={17} />
      </button>
      <label className="icon-button" aria-label="Add a reference image" data-tip="Add image">
        <ImagePlus size={17} />
        <input type="file" accept="image/*" onChange={onImage} />
      </label>
    </div>
  );
}

function SketchCanvas({
  onToast,
  onIntentChange,
  variant,
}: {
  onToast: (message: string) => void;
  onIntentChange: (intent: SketchIntent) => void;
  variant: DessertVariant;
}) {
  type CanvasLabel = { id: number; x: number; y: number; text: string };
  type CanvasSnapshot = { image: ImageData; labels: CanvasLabel[] };

  const startingLabels: Record<DessertVariant, CanvasLabel[]> = {
    moon: [
      { id: 1, x: 68, y: 24, text: "crystal tea veil" },
      { id: 2, x: 24, y: 68, text: "soft almond base" },
    ],
    berry: [
      { id: 1, x: 67, y: 24, text: "edible gingham lid" },
      { id: 2, x: 23, y: 68, text: "fresh berry layers" },
    ],
    garden: [
      { id: 1, x: 68, y: 25, text: "pistachio moss" },
      { id: 2, x: 25, y: 69, text: "hidden honey centre" },
    ],
  };
  const brushColors = [
    "#665273",
    "#a6617d",
    "#9c88b6",
    "#718c72",
    "#cc805f",
    "#3f6579",
  ];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<CanvasSnapshot[]>([]);
  const redoStack = useRef<CanvasSnapshot[]>([]);
  const intentRevision = useRef(0);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brushColor, setBrushColor] = useState("#665273");
  const [brushSize, setBrushSize] = useState(5);
  const [brushPanelOpen, setBrushPanelOpen] = useState(false);
  const [annotationText, setAnnotationText] = useState("");
  const [placingLabel, setPlacingLabel] = useState(false);
  const [labels, setLabels] = useState<CanvasLabel[]>(() =>
    startingLabels[variant].map((label) => ({ ...label }))
  );
  const [, refreshHistoryControls] = useState(0);

  const emitIntent = (
    nextLabels = labels,
    nextColor = brushColor,
    nextSize = brushSize
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    intentRevision.current += 1;
    onIntentChange({
      preview: canvas.toDataURL("image/png"),
      annotations: nextLabels.map((label) => label.text),
      brushColor: nextColor,
      brushSize: nextSize,
      revision: intentRevision.current,
    });
  };

  const drawGuide = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = "rgba(120, 104, 146, .36)";
    ctx.fillStyle = "rgba(222, 208, 243, .18)";
    ctx.lineWidth = 3;

    if (variant === "berry") {
      ctx.setLineDash([10, 11]);
      ctx.beginPath();
      ctx.ellipse(450, 406, 270, 42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(288, 184);
      ctx.quadraticCurveTo(288, 158, 314, 158);
      ctx.lineTo(586, 158);
      ctx.quadraticCurveTo(612, 158, 612, 184);
      ctx.lineTo(612, 354);
      ctx.quadraticCurveTo(612, 376, 590, 376);
      ctx.lineTo(310, 376);
      ctx.quadraticCurveTo(288, 376, 288, 354);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(288, 236);
      ctx.lineTo(612, 236);
      ctx.moveTo(288, 297);
      ctx.lineTo(612, 297);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(348, 150);
      ctx.lineTo(348, 383);
      ctx.moveTo(552, 150);
      ctx.lineTo(552, 383);
      ctx.stroke();
    } else if (variant === "garden") {
      ctx.setLineDash([10, 11]);
      ctx.beginPath();
      ctx.ellipse(450, 397, 270, 46, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(258, 353);
      ctx.bezierCurveTo(264, 222, 332, 164, 450, 158);
      ctx.bezierCurveTo(568, 164, 636, 222, 642, 353);
      ctx.bezierCurveTo(578, 390, 322, 390, 258, 353);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2;
      [
        [355, 222, 18],
        [468, 204, 14],
        [548, 254, 17],
        [404, 302, 12],
      ].forEach(([x, y, radius]) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.moveTo(x - radius * 1.5, y);
        ctx.lineTo(x + radius * 1.5, y);
        ctx.moveTo(x, y - radius * 1.5);
        ctx.lineTo(x, y + radius * 1.5);
        ctx.stroke();
      });
    } else {
      ctx.setLineDash([10, 11]);
      ctx.beginPath();
      ctx.ellipse(450, 390, 265, 48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(260, 350);
      ctx.bezierCurveTo(250, 240, 305, 160, 450, 152);
      ctx.bezierCurveTo(596, 160, 650, 242, 640, 350);
      ctx.bezierCurveTo(580, 392, 320, 392, 260, 350);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(456, 146, 78, 0.2, Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  };

  useEffect(() => {
    drawGuide();
    const initialLabels = startingLabels[variant].map((label) => ({ ...label }));
    setLabels(initialLabels);
    undoStack.current = [];
    redoStack.current = [];
    const frame = window.requestAnimationFrame(() => emitIntent(initialLabels));
    return () => window.cancelAnimationFrame(frame);
  }, [variant]);

  const captureSnapshot = (currentLabels = labels): CanvasSnapshot | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    return {
      image: ctx.getImageData(0, 0, canvas.width, canvas.height),
      labels: currentLabels.map((label) => ({ ...label })),
    };
  };

  const rememberCurrentState = () => {
    const snapshot = captureSnapshot();
    if (!snapshot) return;
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
    refreshHistoryControls((value) => value + 1);
  };

  const restoreSnapshot = (snapshot: CanvasSnapshot) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(snapshot.image, 0, 0);
    const restoredLabels = snapshot.labels.map((label) => ({ ...label }));
    setLabels(restoredLabels);
    emitIntent(restoredLabels);
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    const current = captureSnapshot();
    if (current) redoStack.current.push(current);
    restoreSnapshot(previous);
    refreshHistoryControls((value) => value + 1);
    onToast("Last canvas change undone");
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    const current = captureSnapshot();
    if (current) undoStack.current.push(current);
    restoreSnapshot(next);
    refreshHistoryControls((value) => value + 1);
    onToast("Canvas change restored");
  };

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event);
    if (placingLabel && annotationText.trim()) {
      rememberCurrentState();
      const rect = event.currentTarget.getBoundingClientRect();
      const nextLabels = [
        ...labels,
        {
          id: Date.now(),
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
          text: annotationText.trim(),
        },
      ];
      setLabels(nextLabels);
      emitIntent(nextLabels);
      setAnnotationText("");
      setPlacingLabel(false);
      onToast("Annotation pinned to your sketch");
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    rememberCurrentState();
    setDrawing(true);
    lastPoint.current = point;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !lastPoint.current) return;
    const canvas = canvasRef.current;
    const point = pointFromEvent(event);
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = tool === "eraser" ? Math.max(brushSize * 3, 16) : brushSize;
    ctx.strokeStyle = brushColor;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    const changed = lastPoint.current !== null;
    setDrawing(false);
    lastPoint.current = null;
    if (changed) emitIntent();
  };

  return (
    <div className="sketch-shell">
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button
            className={cn("tool-button", tool === "brush" && "active")}
            type="button"
            onClick={() => setTool("brush")}
          >
            <Brush size={15} /> Draw
          </button>
          <button
            className={cn("tool-button", tool === "eraser" && "active")}
            type="button"
            onClick={() => setTool("eraser")}
          >
            <Eraser size={15} /> Erase
          </button>
        </div>
        <div className="canvas-actions">
          <button
            className="icon-button"
            type="button"
            onClick={undo}
            disabled={undoStack.current.length === 0}
            aria-label="Undo last canvas change"
            data-tip="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={redo}
            disabled={redoStack.current.length === 0}
            aria-label="Redo canvas change"
            data-tip="Redo"
          >
            <Redo2 size={16} />
          </button>
          <button
            className={cn("icon-button", brushPanelOpen && "active")}
            type="button"
            onClick={() => setBrushPanelOpen((current) => !current)}
            aria-expanded={brushPanelOpen}
            aria-controls="brush-settings-panel"
            aria-label="Toggle brush settings"
            data-tip="Brush settings"
          >
            <Palette size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              rememberCurrentState();
              drawGuide();
              setLabels([]);
              emitIntent([]);
              onToast("Canvas reset");
            }}
            aria-label="Reset canvas"
            data-tip="Reset canvas"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      {brushPanelOpen && (
        <div className="brush-panel" id="brush-settings-panel">
          <div className="brush-setting-group">
            <span className="brush-setting-label">Ink color</span>
            <div className="color-palette" role="radiogroup" aria-label="Brush color">
              {brushColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(color === brushColor && "active")}
                  style={{ "--swatch": color } as CSSProperties}
                  onClick={() => {
                    setBrushColor(color);
                    setTool("brush");
                    emitIntent(labels, color, brushSize);
                  }}
                  role="radio"
                  aria-checked={color === brushColor}
                  aria-label={`Use brush color ${color}`}
                >
                  {color === brushColor && <Check size={11} />}
                </button>
              ))}
              <label className="custom-color" data-tip="Custom color">
                <Plus size={13} />
                <input
                  type="color"
                  value={brushColor}
                  onChange={(event) => {
                    const nextColor = event.target.value;
                    setBrushColor(nextColor);
                    setTool("brush");
                    emitIntent(labels, nextColor, brushSize);
                  }}
                  aria-label="Choose a custom brush color"
                />
              </label>
            </div>
          </div>
          <div className="brush-setting-group size-setting">
            <div className="brush-size-heading">
              <span className="brush-setting-label">Brush size</span>
              <strong>{brushSize} px</strong>
            </div>
            <div className="brush-size-control">
              <span className="brush-dot small" />
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                onPointerUp={() => emitIntent(labels, brushColor, brushSize)}
                onBlur={() => emitIntent(labels, brushColor, brushSize)}
                aria-label="Brush size"
              />
              <span className="brush-dot large" />
            </div>
          </div>
          <button
            className="collapse-brush-panel"
            type="button"
            onClick={() => setBrushPanelOpen(false)}
          >
            Done <ChevronDown size={13} />
          </button>
        </div>
      )}
      <div className={cn("canvas-wrap", placingLabel && "placing-label")}>
        <canvas
          ref={canvasRef}
          width={900}
          height={520}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          aria-label="Dessert design sketch canvas"
        />
        {labels.map((label, index) => (
          <button
            className="canvas-pin"
            key={label.id}
            style={{ left: `${label.x}%`, top: `${label.y}%` }}
            onClick={() => {
              rememberCurrentState();
              const nextLabels = labels.filter((item) => item.id !== label.id);
              setLabels(nextLabels);
              emitIntent(nextLabels);
            }}
            type="button"
            aria-label={`Remove annotation: ${label.text}`}
          >
            <span>{index + 1}</span>
            <em>{label.text}</em>
          </button>
        ))}
        <div className="canvas-hint">
          {placingLabel ? "Tap the sketch to pin your note" : "Draw directly on the canvas"}
        </div>
      </div>
      <div className="annotation-bar">
        <span className="annotation-icon">
          <MessageCircleMore size={17} />
        </span>
        <input
          value={annotationText}
          onChange={(event) => setAnnotationText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && annotationText.trim()) setPlacingLabel(true);
          }}
          placeholder="Describe a detail, then pin it to the sketch…"
          aria-label="Canvas annotation"
        />
        <button
          type="button"
          className={cn("small-action", placingLabel && "active")}
          disabled={!annotationText.trim()}
          onClick={() => setPlacingLabel(true)}
        >
          <Plus size={15} /> Pin note
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("idea");
  const [theme, setTheme] = useState<Theme>("blush");
  const [ideas, setIdeas] = useState<IdeaCard[]>(seedIdeas);
  const [selectedIdeaId, setSelectedIdeaId] = useState(1);
  const [ideaPrompt, setIdeaPrompt] = useState(
    "A moon-shaped tea cake that feels pearly and dreamy. Jasmine, fresh pear, a little floral—but not too sweet. Maybe tiny stars?"
  );
  const [recording, setRecording] = useState(false);
  const [referenceName, setReferenceName] = useState("");
  const [referencePreview, setReferencePreview] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>(
    moodPresets.moon.map((mood) => mood.label)
  );
  const [sketchIntent, setSketchIntent] = useState<SketchIntent>(() =>
    freshSketchIntent("moon")
  );
  const [lastRenderIntent, setLastRenderIntent] =
    useState<CapturedDesignIntent | null>(null);
  const [draggedIdea, setDraggedIdea] = useState<number | null>(null);
  const [size, setSize] = useState<Size>("medium");
  const [museIndex, setMuseIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState<number | null>(null);
  const [renderingProduct, setRenderingProduct] = useState(false);
  const [bakeMode, setBakeMode] = useState<"diner" | "chef">("diner");
  const [menuStyle, setMenuStyle] = useState<"blush" | "editorial" | "pixel">(
    "blush"
  );
  const [chatText, setChatText] = useState("");
  const [chatReply, setChatReply] = useState(
    "I’d keep the jasmine aroma delicate and use pear acidity to make the white chocolate feel light."
  );
  const [counts, setCounts] = useState<Record<string, number>>({
    moon: 3,
    berry: 2,
    garden: 1,
  });
  const [prices, setPrices] = useState(
    productionMaterials.map((material) => material.price)
  );
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [ideaPickerOpen, setIdeaPickerOpen] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);

  const selectedIdea =
    ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0] ?? seedIdeas[0];
  const stageIndex = stageMeta.findIndex((item) => item.id === stage);
  const selectedVariant = dessertVariantForIdea(selectedIdea);
  const availableProductRenderings = productRenderings[selectedVariant];
  const activeProductRendering =
    availableProductRenderings[renderIndex ?? 0] ?? availableProductRenderings[0];
  const activeMoodPresets = moodPresets[selectedVariant];
  const designInputCount =
    1 +
    sketchIntent.annotations.length +
    selectedMoods.length +
    (referenceName ? 1 : 0) +
    (recording ? 1 : 0);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string) => setToast(message);

  const generateProductRendering = () => {
    if (renderingProduct) return;
    const capturedIntent: CapturedDesignIntent = {
      sketch: { ...sketchIntent },
      moods: [...selectedMoods],
      referenceName,
      referencePreview,
      voiceNote: recording,
      inputCount: designInputCount,
    };
    const structuralDirection = sketchIntent.annotations
      .join(" ")
      .toLowerCase();
    const intentRequestsCutaway =
      selectedVariant === "moon" &&
      /(inside|insert|cutaway|cross.?section|centre|center|layer)/i.test(
        structuralDirection
      );
    const nextRenderIndex = intentRequestsCutaway
      ? 1
      : renderIndex === null
        ? 0
        : (renderIndex + 1) % availableProductRenderings.length;

    setLastRenderIntent(capturedIntent);
    setRenderingProduct(true);
    notify(`Combining ${designInputCount} visual design inputs…`);
    window.setTimeout(() => {
      setRenderIndex(nextRenderIndex);
      setRenderingProduct(false);
      notify(
        renderIndex === null
          ? "Your combined-intent product rendering is ready"
          : "A revised product rendering is ready"
      );
    }, 1500);
  };

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReferenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => setReferencePreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
    notify(`${file.name} added as a visual reference`);
    event.target.value = "";
  };

  const classifyIdeas = () => {
    const hasCitrus = /citrus|lemon|yuzu|orange/i.test(ideaPrompt);
    const hasChocolate = /chocolate|cocoa|cacao/i.test(ideaPrompt);
    const next: IdeaCard = hasCitrus
      ? {
          id: Date.now(),
          title: "Sunbeam Citrus Ribbon",
          description:
            "A bright citrus mousse wrapped in a silky ribbon with a sparkling jelly crown.",
          tags: ["citrus", "silky", "bright"],
          accent: "butter",
          icon: "☀",
          status: "ready",
        }
      : hasChocolate
        ? {
            id: Date.now(),
            title: "Cocoa Velvet Keepsake",
            description:
              "A tiny dark chocolate jewel box with a soft caramel heart and velvet finish.",
            tags: ["cocoa", "intense", "giftable"],
            accent: "cocoa",
            icon: "♥",
            status: "ready",
          }
        : {
            id: Date.now(),
            title: "Pearl Tea Constellation",
            description:
              "A refined companion idea: jasmine crémeux, pear gel and a constellation of crisp pearls.",
            tags: ["tea", "pearl", "elegant"],
            accent: "lavender",
            icon: "✦",
            status: "ready",
          };
    setIdeas((current) => [...current, next]);
    notify("Your brainstorm became a new idea card");
  };

  const moveIdea = (id: number, status: IdeaStatus) => {
    setIdeas((current) =>
      current.map((idea) => (idea.id === id ? { ...idea, status } : idea))
    );
    setDraggedIdea(null);
    notify(status === "ready" ? "Idea moved to Ready to design" : "Idea moved to Inbox");
  };

  const selectAndAdvance = (id: number) => {
    const nextIdea = ideas.find((idea) => idea.id === id) ?? seedIdeas[0];
    const nextVariant = dessertVariantForIdea(nextIdea);
    setSelectedIdeaId(id);
    setRenderIndex(null);
    setLastRenderIntent(null);
    setSketchIntent(freshSketchIntent(nextVariant));
    setSelectedMoods(moodPresets[nextVariant].map((mood) => mood.label));
    setMuseIndex(0);
    setStage("design");
    window.scrollTo({ top: 0, behavior: "smooth" });
    notify("Idea selected — your design canvas is ready");
  };

  const chooseDesignIdea = (idea: IdeaCard) => {
    const nextVariant = dessertVariantForIdea(idea);
    setSelectedIdeaId(idea.id);
    setIdeaPickerOpen(false);
    setRenderIndex(null);
    setLastRenderIntent(null);
    setSketchIntent(freshSketchIntent(nextVariant));
    setSelectedMoods(moodPresets[nextVariant].map((mood) => mood.label));
    setMuseIndex(0);
    notify(`${idea.title} is ready on the design canvas`);
  };

  const goToStage = (nextStage: Stage) => {
    setStage(nextStage);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const advance = () => {
    const next = stageMeta[Math.min(stageIndex + 1, stageMeta.length - 1)];
    goToStage(next.id);
    notify(
      next.id === "product"
        ? "Design card saved — let’s make it buildable"
        : next.id === "bake"
          ? "Product card approved — ready for the kitchen"
          : "Moved to the next stage"
    );
  };

  const exportCards = () => {
    const payload = {
      format: "crumbloom-card-pack",
      version: 1,
      exportedAt: new Date().toISOString(),
      ideas,
      selectedIdea,
      design: {
        annotations: sketchIntent.annotations,
        brushColor: sketchIntent.brushColor,
        brushSize: sketchIntent.brushSize,
        moods: selectedMoods,
        referenceName,
        voiceNote: recording,
        renderingInputs: lastRenderIntent?.inputCount ?? designInputCount,
      },
      product: {
        title: selectedIdea.title,
        size,
        rendering: activeProductRendering.src,
        ingredients: ingredients.map((item) => ({
          ...item,
          amount: Math.round(item.amount * sizeScale[size]),
        })),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "crumbloom-card-pack.json");
    notify("Shareable card pack exported");
  };

  const importCards = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (Array.isArray(payload.ideas)) {
          setIdeas(payload.ideas);
          notify(`${payload.ideas.length} cards imported successfully`);
        } else {
          notify("That file does not contain a Crumbloom card pack");
        }
      } catch {
        notify("We couldn’t read that card pack");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportHandbookHTML = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Moonlit Jasmine Cloud</title><style>body{margin:0;background:#f4eee9;font-family:Georgia,serif;color:#403646}.menu{max-width:700px;margin:40px auto;background:#fffaf8;padding:72px;border:1px solid #e9d6dd;text-align:center}.kicker{letter-spacing:.3em;text-transform:uppercase;font:12px Arial;color:#a27386}h1{font-size:52px;font-weight:400;margin:30px 0}.moon{font-size:90px;color:#9b87b6}.notes{font-style:italic;color:#746876}.line{width:80px;border-top:1px solid #bd9cab;margin:32px auto}</style></head><body><main class="menu"><div class="kicker">Crumbloom Atelier · Dessert No. 01</div><div class="moon">☾</div><h1>Moonlit<br>Jasmine Cloud</h1><div class="line"></div><p class="notes">Jasmine · Williams pear · toasted almond · white chocolate</p><p>A weightless floral mousse with a bright pear moon at its heart.</p></main></body></html>`;
    downloadBlob(new Blob([html], { type: "text/html" }), "moonlit-jasmine-handbook.html");
    notify("HTML handbook exported");
  };

  const exportHandbookPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 1200, 1500);
    gradient.addColorStop(0, menuStyle === "pixel" ? "#d9edba" : "#fff7f4");
    gradient.addColorStop(1, menuStyle === "editorial" ? "#ece7df" : "#eadff3");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 1500);
    ctx.strokeStyle = "#9a7e8d";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 70, 1060, 1360);
    ctx.textAlign = "center";
    ctx.fillStyle = "#9a667c";
    ctx.font = "24px Arial";
    ctx.fillText("CRUMBLOOM ATELIER  ·  DESSERT NO. 01", 600, 170);
    ctx.fillStyle = "#806a97";
    ctx.font = "190px Georgia";
    ctx.fillText("☾", 600, 435);
    ctx.fillStyle = "#403646";
    ctx.font = "72px Georgia";
    ctx.fillText("Moonlit", 600, 610);
    ctx.fillText("Jasmine Cloud", 600, 700);
    ctx.strokeStyle = "#b696a6";
    ctx.beginPath();
    ctx.moveTo(485, 790);
    ctx.lineTo(715, 790);
    ctx.stroke();
    ctx.font = "italic 29px Georgia";
    ctx.fillStyle = "#6f6471";
    ctx.fillText("jasmine · pear · almond · white chocolate", 600, 875);
    ctx.font = "26px Arial";
    ctx.fillText("A weightless floral mousse with a bright pear moon", 600, 970);
    ctx.fillText("at its heart.", 600, 1010);
    ctx.font = "22px Arial";
    ctx.fillStyle = "#9a667c";
    ctx.fillText("8–10 GUESTS  ·  SERVE AT 8°C", 600, 1275);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, "moonlit-jasmine-handbook.png");
    }, "image/png");
    notify("Image handbook exported");
  };

  const handleImportClick = () => importRef.current?.click();

  const totalMaterialCost = useMemo(
    () =>
      productionMaterials.reduce((sum, material, rowIndex) => {
        const amount = material.perProduct.reduce(
          (rowSum, perItem, productIndex) =>
            rowSum +
            perItem * counts[productionProducts[productIndex].id] * sizeScale[size],
          0
        );
        return sum + amount * prices[rowIndex];
      }, 0),
    [counts, prices, size]
  );

  return (
    <main className="app-shell" data-theme={theme}>
      <aside className={cn("stage-sidebar", mobileNavOpen && "mobile-open")}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <CakeSlice size={22} />
            <Sparkles className="brand-spark" size={11} />
          </div>
          <div>
            <strong>crumbloom</strong>
            <span>dessert atelier</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileNavOpen(false)}
            type="button"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <div className="project-label">Creation journey</div>
        <nav className="stage-nav" aria-label="Dessert creation stages">
          {stageMeta.map((item, index) => {
            const Icon = item.icon;
            const active = item.id === stage;
            const complete = index < stageIndex;
            return (
              <button
                className={cn(
                  "stage-nav-item",
                  active && "active",
                  complete && "complete"
                )}
                key={item.id}
                type="button"
                onClick={() => goToStage(item.id)}
                aria-current={active ? "step" : undefined}
              >
                <span className="stage-number">
                  {complete ? <Check size={15} /> : <Icon size={16} />}
                </span>
                <span className="stage-copy">
                  <em>{item.eyebrow}</em>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {active && <ArrowRight className="stage-arrow" size={15} />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-tip">
          <div className="tip-icon">
            <WandSparkles size={16} />
          </div>
          <p>
            <strong>Your cards travel with you.</strong>
            Every choice is carried into the next stage.
          </p>
        </div>

        <div className="sidebar-project">
          <div className="mini-project-art">{selectedIdea.icon}</div>
          <div>
            <span>Current creation</span>
            <strong>{selectedIdea.title}</strong>
            <small>Last edited just now</small>
          </div>
          <button className="icon-button" type="button" aria-label="Open project options">
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open stage navigation"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              <span>My Atelier</span>
              <i>/</i>
              <strong>{selectedIdea.title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="theme-select">
              <Palette size={16} />
              <span className="sr-only">Choose theme</span>
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as Theme)}
              >
                <option value="blush">Blush Patisserie</option>
                <option value="french">French Atelier</option>
                <option value="harvest">Harvest Pixel</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <button className="quiet-button topbar-text-action" type="button" onClick={handleImportClick}>
              <Import size={16} /> Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={importCards}
              hidden
            />
            <button className="quiet-button topbar-text-action" type="button" onClick={exportCards}>
              <Share2 size={16} /> Share cards
            </button>
            <div className="avatar">S</div>
          </div>
        </header>

        <div className="stage-progress-mobile">
          {stageMeta.map((item, index) => (
            <button
              key={item.id}
              className={cn(item.id === stage && "active", index < stageIndex && "complete")}
              onClick={() => goToStage(item.id)}
              type="button"
            >
              <span>{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>

        {stage === "idea" && (
          <section className="stage-page idea-stage">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">
                  <Sparkles size={14} /> Stage 01 · Idea Garden
                </span>
                <h1>What are we dreaming up?</h1>
                <p>
                  Spill every half-formed thought. Your AI pastry partner will gently
                  sort the flavours, feelings and forms into ideas worth exploring.
                </p>
              </div>
              <div className="stage-count">
                <span>{ideas.length}</span>
                idea cards
              </div>
            </div>

            <div className="idea-composer paper-card">
              <div className="composer-top">
                <div className="ai-orb">
                  <Bot size={21} />
                  <span />
                </div>
                <div>
                  <strong>Tell me the whole messy idea</strong>
                  <small>Flavours, colours, memories, shapes—anything belongs here.</small>
                </div>
              </div>
              <textarea
                value={ideaPrompt}
                onChange={(event) => setIdeaPrompt(event.target.value)}
                placeholder="I’m imagining something light and floral…"
                aria-label="Dessert idea prompt"
              />
              {referenceName && (
                <div className="reference-pill">
                  <FileImage size={14} /> {referenceName}
                  <button
                    onClick={() => {
                      setReferenceName("");
                      setReferencePreview("");
                    }}
                    type="button"
                    aria-label="Remove reference image"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="composer-bottom">
                <InputTools
                  recording={recording}
                  onRecord={() => {
                    setRecording((current) => !current);
                    notify(recording ? "Voice note captured" : "Listening for your idea…");
                  }}
                  onImage={handleImage}
                />
                <div className="composer-actions">
                  <button
                    className="spark-button"
                    type="button"
                    onClick={() => {
                      setIdeaPrompt(
                        "Something inspired by a secret garden after rain: pistachio, honey, tiny flowers, and a centre that glows like morning sun."
                      );
                      notify("A fresh prompt has bloomed");
                    }}
                  >
                    <WandSparkles size={16} /> Surprise me
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={classifyIdeas}
                    disabled={!ideaPrompt.trim()}
                  >
                    Sort into idea cards <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flow-nudge">
              <span className="flow-line" />
              <ArrowRight size={16} />
              <p>
                <strong>Your ideas, untangled.</strong> Drag a card when it feels ready
                for the sketchbook.
              </p>
            </div>

            <div className="idea-board">
              {(["inbox", "ready"] as IdeaStatus[]).map((status) => (
                <div
                  className={cn("idea-column", draggedIdea && "drop-active")}
                  key={status}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => draggedIdea && moveIdea(draggedIdea, status)}
                >
                  <div className="column-heading">
                    <div>
                      <span className={cn("status-dot", status)} />
                      <strong>{status === "inbox" ? "Idea inbox" : "Ready to design"}</strong>
                      <small>
                        {ideas.filter((idea) => idea.status === status).length}
                      </small>
                    </div>
                    <span>{status === "inbox" ? "Still gathering" : "Pick one to continue"}</span>
                  </div>
                  <div className="idea-card-grid">
                    {ideas
                      .filter((idea) => idea.status === status)
                      .map((idea) => (
                        <article
                          className={cn("idea-card", `accent-${idea.accent}`)}
                          draggable
                          onDragStart={() => setDraggedIdea(idea.id)}
                          onDragEnd={() => setDraggedIdea(null)}
                          key={idea.id}
                        >
                          <div className="card-grip">
                            <GripVertical size={15} />
                          </div>
                          <div className="idea-art">
                            <span>{idea.icon}</span>
                            <i />
                            <b>✦</b>
                          </div>
                          <div className="idea-card-body">
                            <span className="card-type">Idea card · 0{idea.id > 9 ? ideas.length : idea.id}</span>
                            <h3>{idea.title}</h3>
                            <p>{idea.description}</p>
                            <div className="tag-row">
                              {idea.tags.map((tag) => (
                                <span key={tag}>{tag}</span>
                              ))}
                            </div>
                            <button
                              className="card-action"
                              type="button"
                              onClick={() =>
                                status === "ready"
                                  ? selectAndAdvance(idea.id)
                                  : moveIdea(idea.id, "ready")
                              }
                            >
                              {status === "ready" ? "Shape this idea" : "Move to ready"}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                    {ideas.filter((idea) => idea.status === status).length === 0 && (
                      <div className="empty-column">
                        <Flower2 size={20} />
                        Drop a little idea here
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {stage === "design" && (
          <section className="stage-page design-stage">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">
                  <Pencil size={14} /> Stage 02 · Design Studio
                </span>
                <h1>Give your idea a silhouette.</h1>
                <p>
                  Sketch, annotate and refine with your AI pastry partner. It does not
                  need to be neat—it only needs to feel like your intention.
                </p>
              </div>
              <div className="selected-idea-selector">
                <button
                  className="selected-idea-chip"
                  type="button"
                  onClick={() => setIdeaPickerOpen((current) => !current)}
                  aria-expanded={ideaPickerOpen}
                  aria-haspopup="listbox"
                >
                  <span>{selectedIdea.icon}</span>
                  <div>
                    <small>Designing from</small>
                    <strong>{selectedIdea.title}</strong>
                  </div>
                  <ChevronDown className={cn(ideaPickerOpen && "open")} size={15} />
                </button>
                {ideaPickerOpen && (
                  <div className="idea-picker-menu" role="listbox" aria-label="Choose an idea to design">
                    <div className="idea-picker-heading">
                      <span>Choose an idea card</span>
                      <small>{ideas.length} available</small>
                    </div>
                    <div className="idea-picker-options">
                      {ideas.map((idea) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={idea.id === selectedIdea.id}
                          className={cn(idea.id === selectedIdea.id && "active")}
                          key={idea.id}
                          onClick={() => chooseDesignIdea(idea)}
                        >
                          <span className={cn("picker-idea-icon", `accent-${idea.accent}`)}>
                            {idea.icon}
                          </span>
                          <span>
                            <strong>{idea.title}</strong>
                            <small>{idea.tags.join(" · ")}</small>
                          </span>
                          {idea.id === selectedIdea.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                    <button
                      className="idea-picker-back"
                      type="button"
                      onClick={() => {
                        setIdeaPickerOpen(false);
                        goToStage("idea");
                      }}
                    >
                      <Plus size={13} /> Create another idea
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="design-layout">
              <div className="design-main">
                <div className="section-title-row">
                  <div>
                    <span className="section-index">01</span>
                    <div>
                      <strong>Design intent board</strong>
                      <small>Shape, annotations and references become one render input.</small>
                    </div>
                  </div>
                  <span className="autosave">
                    <Check size={13} /> Saved
                  </span>
                </div>
                <div className="design-input-board">
                  <div className="intent-board-header">
                    <div>
                      <Layers3 size={15} />
                      <div>
                        <strong>Unified visual input</strong>
                        <small>Every edit below travels together to the renderer.</small>
                      </div>
                    </div>
                    <span>{designInputCount} linked inputs</span>
                  </div>
                  <SketchCanvas
                    key={selectedIdea.id}
                    onToast={notify}
                    onIntentChange={setSketchIntent}
                    variant={selectedVariant}
                  />

                  <div className="reference-dock">
                    <div className="reference-dock-header">
                      <div>
                        <ImagePlus size={15} />
                        <span>
                          <strong>Reference dock</strong>
                          <small>Photos, mood cues and voice refine the same sketch.</small>
                        </span>
                      </div>
                      <small>Select any cues that should influence the finish.</small>
                    </div>
                    <div className="reference-cards">
                      <div className="reference-upload-slot">
                        <label className={cn("add-reference-card", referencePreview && "has-preview")}>
                          {referencePreview ? (
                            <>
                              <img
                                className="reference-upload-preview"
                                src={referencePreview}
                                alt="Uploaded visual reference"
                              />
                              <span>{referenceName}</span>
                              <small>Tap to replace</small>
                            </>
                          ) : (
                            <>
                              <ImagePlus size={20} />
                              <span>Add image</span>
                              <small>PNG, JPG or HEIC</small>
                            </>
                          )}
                          <input type="file" accept="image/*" onChange={handleImage} />
                        </label>
                        {referencePreview && (
                          <button
                            className="clear-reference"
                            type="button"
                            onClick={() => {
                              setReferenceName("");
                              setReferencePreview("");
                              notify("Visual reference removed");
                            }}
                            aria-label="Remove uploaded visual reference"
                            data-tip="Remove reference"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      {activeMoodPresets.map((mood) => {
                        const active = selectedMoods.includes(mood.label);
                        return (
                          <button
                            className={cn("mood-card", mood.className, active && "active")}
                            type="button"
                            key={mood.label}
                            aria-pressed={active}
                            onClick={() =>
                              setSelectedMoods((current) =>
                                current.includes(mood.label)
                                  ? current.filter((item) => item !== mood.label)
                                  : [...current, mood.label]
                              )
                            }
                          >
                            <span>{mood.label}</span>
                            {active && <Check size={13} />}
                          </button>
                        );
                      })}
                      <button
                        className={cn("voice-reference-card", recording && "active")}
                        type="button"
                        onClick={() => setRecording((current) => !current)}
                        aria-pressed={recording}
                      >
                        <AudioLines size={19} />
                        <span>{recording ? "Voice linked" : "Add voice note"}</span>
                        <i />
                      </button>
                    </div>
                  </div>

                  <div className="intent-package-bar">
                    <div>
                      <span className="intent-status-icon"><Check size={13} /></span>
                      <span>
                        <strong>Ready as one intent package</strong>
                        <small>
                          Sketch v{Math.max(sketchIntent.revision, 1)} ·{" "}
                          {sketchIntent.annotations.length} annotations ·{" "}
                          {selectedMoods.length} mood cues
                        </small>
                      </span>
                    </div>
                    <ArrowRight size={16} />
                    <span className="intent-output-pill">
                      <WandSparkles size={13} /> Product rendering
                    </span>
                  </div>
                </div>
              </div>

              <aside className="design-assistant">
                <div className="assistant-heading">
                  <div className="ai-orb">
                    <WandSparkles size={19} />
                    <span />
                  </div>
                  <div>
                    <strong>Pastry Muse</strong>
                    <small>Your AI design companion</small>
                  </div>
                  <span className="online-pill">online</span>
                </div>
                <div
                  className={cn(
                    "assistant-visual",
                    renderIndex !== null && "has-product-render",
                    renderingProduct && "is-rendering"
                  )}
                  style={
                    {
                      "--intent-color":
                        lastRenderIntent?.sketch.brushColor ?? sketchIntent.brushColor,
                    } as CSSProperties
                  }
                  aria-live="polite"
                >
                  {renderIndex === null ? (
                    <DessertArt compact variant={selectedVariant} />
                  ) : (
                    <img
                      className="assistant-render-image"
                      src={activeProductRendering.src}
                      alt={activeProductRendering.alt}
                    />
                  )}
                  <span className="concept-badge">
                    {renderIndex === null
                      ? `Design concept · v${museIndex + 1}.0`
                      : `Product render · v${renderIndex + 1}.0`}
                  </span>
                  {renderIndex !== null && !renderingProduct && (
                    <a
                      className="render-download"
                      href={activeProductRendering.src}
                      download
                      aria-label="Download this product rendering"
                      data-tip="Download render"
                    >
                      <Download size={15} />
                    </a>
                  )}
                  {renderingProduct && (
                    <div className="rendering-overlay">
                      <span className="rendering-orb">
                        <LoaderCircle size={21} />
                      </span>
                      <strong>Rendering your dessert</strong>
                      <small>
                        Composing {lastRenderIntent?.inputCount ?? designInputCount} linked
                        inputs: canvas pixels, annotations and references…
                      </small>
                      <i><b /></i>
                    </div>
                  )}
                </div>
                <button
                  className="primary-button full render-product-button"
                  type="button"
                  onClick={generateProductRendering}
                  disabled={renderingProduct}
                >
                  {renderingProduct ? (
                    <>
                      <LoaderCircle className="spin-icon" size={16} /> Generating product rendering…
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {renderIndex === null
                        ? "Generate product rendering"
                        : availableProductRenderings.length > 1
                          ? "Generate another rendering"
                          : "Regenerate product reference"}
                    </>
                  )}
                </button>
                <p className="render-source-note">
                  <Layers3 size={13} />
                  Sends the captured canvas image and selected references together—not
                  just the written description.
                </p>
                {renderIndex !== null && lastRenderIntent && (
                  <div className="render-intent-receipt">
                    <div className="intent-receipt-heading">
                      <span>
                        <Layers3 size={14} />
                        <span>
                          <strong>Combined intent applied</strong>
                          <small>{lastRenderIntent.inputCount} inputs shaped this result</small>
                        </span>
                      </span>
                      <Check size={14} />
                    </div>
                    <div className="intent-source-flow">
                      <figure>
                        {lastRenderIntent.sketch.preview ? (
                          <img src={lastRenderIntent.sketch.preview} alt="Captured design sketch" />
                        ) : (
                          <Pencil size={17} />
                        )}
                        <figcaption>Sketch</figcaption>
                      </figure>
                      {lastRenderIntent.referencePreview ? (
                        <figure>
                          <img
                            src={lastRenderIntent.referencePreview}
                            alt="Captured uploaded reference"
                          />
                          <figcaption>Photo</figcaption>
                        </figure>
                      ) : (
                        <figure className="mood-source">
                          <Flower2 size={17} />
                          <figcaption>Mood</figcaption>
                        </figure>
                      )}
                      <ArrowRight size={15} />
                      <span className="intent-result-mark">
                        <WandSparkles size={15} />
                        <small>Rendered</small>
                      </span>
                    </div>
                    <div className="intent-receipt-chips">
                      {lastRenderIntent.sketch.annotations.slice(0, 2).map((annotation) => (
                        <span key={annotation}>↳ {annotation}</span>
                      ))}
                      {lastRenderIntent.moods.slice(0, 2).map((mood) => (
                        <span key={mood}>✦ {mood}</span>
                      ))}
                      {lastRenderIntent.voiceNote && <span>⌁ voice direction</span>}
                    </div>
                    <p>
                      Interpreted as <strong>{activeProductRendering.label}</strong> for{" "}
                      <strong>{selectedIdea.title}</strong>.
                    </p>
                  </div>
                )}
                {renderIndex !== null && (
                  <div className="render-variants" aria-label="Generated product renderings">
                    {availableProductRenderings.map((rendering, index) => (
                      <button
                        type="button"
                        className={cn(index === renderIndex && "active")}
                        key={rendering.src}
                        onClick={() => {
                          setRenderIndex(index);
                          notify(`${rendering.label} selected for the design card`);
                        }}
                        aria-label={`Select ${rendering.label} rendering`}
                      >
                        <img src={rendering.src} alt="" />
                        <span>
                          <strong>{rendering.label}</strong>
                          <small>{rendering.detail}</small>
                        </span>
                        {index === renderIndex && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
                <div className="assistant-note">
                  <Sparkles size={16} />
                  <p>
                    {[
                      "Try a slightly asymmetrical tea veil. It will make the moon feel like it is floating instead of sitting on top.",
                      "A ring of three pearl sizes creates more depth. Keep the sugar stars sparse so the silhouette stays calm.",
                      "Let the pear centre peek through one cut-out crescent—your first slice becomes a little reveal.",
                    ][museIndex]}
                  </p>
                </div>
                <button
                  className="secondary-button full"
                  type="button"
                  onClick={() => {
                    setMuseIndex((current) => (current + 1) % 3);
                    notify("Your Pastry Muse explored another direction");
                  }}
                >
                  <WandSparkles size={16} /> Advise another direction
                </button>
                <div className="design-decisions">
                  <span className="mini-label">Design card includes</span>
                  <div><Check size={14} /> Form & dimensions</div>
                  <div><Check size={14} /> Flavour mood</div>
                  <div><Check size={14} /> Finish annotations</div>
                  <div className={cn(renderIndex === null && "pending-decision")}>
                    {renderIndex === null ? <span /> : <Check size={14} />}
                    Product reference rendering
                  </div>
                </div>
                <button className="primary-button full" type="button" onClick={advance}>
                  Save design card <ArrowRight size={16} />
                </button>
              </aside>
            </div>
          </section>
        )}

        {stage === "product" && (
          <section className="stage-page product-stage">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">
                  <Layers3 size={14} /> Stage 03 · Product Lab
                </span>
                <h1>Make the beauty buildable.</h1>
                <p>
                  Your design is translated into reliable quantities and a calm,
                  step-by-step build plan. Adjust the size; the recipe follows.
                </p>
              </div>
              <div className="completion-ring">
                <span>82%</span>
                card ready
              </div>
            </div>

            <div className="product-layout">
              <div className="product-column">
                <div className="product-card paper-card">
                  <div className="product-card-top">
                    <span className="eyebrow tiny">
                      Product rendering · v{(renderIndex ?? 0) + 1}.0
                    </span>
                    <div className="card-top-actions">
                      <a
                        className="icon-button"
                        href={activeProductRendering.src}
                        download
                        aria-label="Download rendering"
                      >
                        <Download size={15} />
                      </a>
                      <button className="icon-button" type="button" aria-label="More product options">
                        <Menu size={15} />
                      </button>
                    </div>
                  </div>
                  <img
                    className="product-render-image"
                    src={activeProductRendering.src}
                    alt={activeProductRendering.alt}
                  />
                  <div className="product-title-row">
                    <div>
                      <span>Product card · 01</span>
                      <h2>{selectedIdea.title}</h2>
                      <p>{selectedIdea.tags.join(" · ")}</p>
                    </div>
                    <div className="temperature-pill">serve at 8°C</div>
                  </div>
                </div>

                <div className="size-panel paper-card">
                  <div className="section-title-row compact">
                    <div>
                      <span className="section-index">01</span>
                      <div>
                        <strong>Choose the finished size</strong>
                        <small>All ingredient amounts update automatically.</small>
                      </div>
                    </div>
                    <span className="recommended-label">Medium recommended</span>
                  </div>
                  <div className="size-selector">
                    {(["small", "medium", "large"] as Size[]).map((item) => (
                      <button
                        type="button"
                        className={cn(size === item && "active")}
                        key={item}
                        onClick={() => {
                          setSize(item);
                          notify(`Recipe scaled to ${item}`);
                        }}
                      >
                        <span className={cn("size-cake", `size-${item}`)}>●</span>
                        <strong>{item[0].toUpperCase() + item.slice(1)}</strong>
                        <small>{sizeDetails[item].diameter}</small>
                        {item === "medium" && <em>best balance</em>}
                      </button>
                    ))}
                  </div>
                  <div className="dimension-row">
                    <div><span>Diameter</span><strong>{sizeDetails[size].diameter}</strong></div>
                    <div><span>Height</span><strong>{sizeDetails[size].height}</strong></div>
                    <div><span>Serves</span><strong>{sizeDetails[size].serves}</strong></div>
                    <div><span>Skill level</span><strong>Intermediate</strong></div>
                  </div>
                </div>

                <div className="recipe-panel paper-card">
                  <div className="section-title-row compact">
                    <div>
                      <span className="section-index">02</span>
                      <div>
                        <strong>Material usage</strong>
                        <small>Calculated for one {size} cake.</small>
                      </div>
                    </div>
                    <button className="text-button" type="button" onClick={() => notify("Ingredient added")}>
                      <Plus size={14} /> Add material
                    </button>
                  </div>
                  <div className="ingredient-table">
                    <div className="ingredient-head">
                      <span>Material</span>
                      <span>Use</span>
                      <span>Amount</span>
                    </div>
                    {ingredients.map((ingredient) => (
                      <div className="ingredient-row" key={ingredient.name}>
                        <span><i /> {ingredient.name}</span>
                        <em>{ingredient.note}</em>
                        <strong>
                          {Math.round(ingredient.amount * sizeScale[size])} {ingredient.unit}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="recipe-note">
                    <Lightbulb size={16} />
                    Quantities include a 6% working allowance for bowl and piping-bag
                    loss.
                  </div>
                </div>
              </div>

              <div className="build-column">
                <div className="build-plan paper-card">
                  <div className="section-title-row compact">
                    <div>
                      <span className="section-index">03</span>
                      <div>
                        <strong>Making plan</strong>
                        <small>About 1 hr 20 min active · overnight set</small>
                      </div>
                    </div>
                  </div>
                  <div className="timeline">
                    {processSteps.map((step, index) => (
                      <div className="timeline-step" key={step.title}>
                        <span className="timeline-index">{index + 1}</span>
                        <div>
                          <div className="timeline-title">
                            <strong>{step.title}</strong>
                            <span>{step.time}</span>
                          </div>
                          <p>{step.detail}</p>
                          <button type="button" onClick={() => notify(`Step ${index + 1} marked reviewed`)}>
                            <Play size={12} /> Show technique tip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="agent-chat paper-card">
                  <div className="assistant-heading">
                    <div className="ai-orb compact">
                      <Bot size={17} />
                      <span />
                    </div>
                    <div>
                      <strong>Ask your pastry agent</strong>
                      <small>Discuss substitutions, texture or technique.</small>
                    </div>
                  </div>
                  <div className="chat-bubble">
                    <Bot size={15} />
                    <p>{chatReply}</p>
                  </div>
                  <div className="chat-input">
                    <input
                      value={chatText}
                      onChange={(event) => setChatText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && chatText.trim()) {
                          setChatReply(
                            "Yes—swap pear for white peach at the same purée weight. Add 1.5 g extra lemon juice to keep the centre bright."
                          );
                          setChatText("");
                          notify("Your pastry agent replied");
                        }
                      }}
                      placeholder="Could I swap the pear for white peach?"
                      aria-label="Ask the pastry agent"
                    />
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => setRecording((current) => !current)}
                      aria-label="Ask by voice"
                    >
                      <AudioLines size={16} />
                    </button>
                    <label className="icon-button" aria-label="Add an image">
                      <ImagePlus size={16} />
                      <input type="file" accept="image/*" onChange={handleImage} />
                    </label>
                    <button
                      className="send-button"
                      type="button"
                      aria-label="Send question"
                      onClick={() => {
                        if (!chatText.trim()) return;
                        setChatReply(
                          "That will work beautifully. I’d reduce the added sugar by 8 g and keep the peach insert fully frozen before assembly."
                        );
                        setChatText("");
                        notify("Your pastry agent replied");
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                <button className="primary-button approve-button" type="button" onClick={advance}>
                  <PackageCheck size={18} /> Approve product card
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === "bake" && (
          <section className="stage-page bake-stage">
            <div className="stage-heading bake-heading">
              <div>
                <span className="eyebrow">
                  <BookOpen size={14} /> Stage 04 · Bake & Serve
                </span>
                <h1>Bring it to the table.</h1>
                <p>
                  Dress the story for guests or scale the kitchen plan for a full
                  service. Your product cards do the quiet arithmetic.
                </p>
              </div>
              <div className="mode-switch" role="tablist" aria-label="Bake mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bakeMode === "diner"}
                  className={cn(bakeMode === "diner" && "active")}
                  onClick={() => setBakeMode("diner")}
                >
                  <BookOpen size={16} /> For diners
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bakeMode === "chef"}
                  className={cn(bakeMode === "chef" && "active")}
                  onClick={() => setBakeMode("chef")}
                >
                  <Store size={16} /> For chefs
                </button>
              </div>
            </div>

            {bakeMode === "diner" ? (
              <div className="diner-layout">
                <div className="handbook-controls">
                  <div className="section-title-row compact">
                    <div>
                      <span className="section-index">01</span>
                      <div>
                        <strong>Choose a table mood</strong>
                        <small>Start with a preset, then make it yours.</small>
                      </div>
                    </div>
                  </div>
                  <div className="preset-grid">
                    <button
                      className={cn("preset-card preset-blush", menuStyle === "blush" && "active")}
                      onClick={() => setMenuStyle("blush")}
                      type="button"
                    >
                      <span>☾</span><strong>Blush Dream</strong><small>soft · romantic</small>
                      {menuStyle === "blush" && <Check size={14} />}
                    </button>
                    <button
                      className={cn("preset-card preset-editorial", menuStyle === "editorial" && "active")}
                      onClick={() => setMenuStyle("editorial")}
                      type="button"
                    >
                      <span>Aa</span><strong>Paris Editorial</strong><small>serif · refined</small>
                      {menuStyle === "editorial" && <Check size={14} />}
                    </button>
                    <button
                      className={cn("preset-card preset-pixel", menuStyle === "pixel" && "active")}
                      onClick={() => setMenuStyle("pixel")}
                      type="button"
                    >
                      <span>✿</span><strong>Harvest Picnic</strong><small>cozy · playful</small>
                      {menuStyle === "pixel" && <Check size={14} />}
                    </button>
                  </div>

                  <div className="customize-card paper-card">
                    <div className="section-title-row compact">
                      <div>
                        <span className="section-index">02</span>
                        <div>
                          <strong>Personal direction</strong>
                          <small>Describe the atmosphere in your own way.</small>
                        </div>
                      </div>
                    </div>
                    <textarea
                      defaultValue="A quiet moonlit table, delicate but not childish. Keep plenty of breathing room."
                      aria-label="Handbook style direction"
                    />
                    <div className="customize-actions">
                      <InputTools
                        recording={recording}
                        onRecord={() => setRecording((current) => !current)}
                        onImage={handleImage}
                      />
                      <button className="spark-button" type="button" onClick={() => notify("Handbook restyled from your direction")}>
                        <WandSparkles size={15} /> Restyle with AI
                      </button>
                    </div>
                  </div>

                  <div className="export-card">
                    <div>
                      <strong>Export your dessert handbook</strong>
                      <small>Ready for print, sharing or a table display.</small>
                    </div>
                    <div className="export-options">
                      <button type="button" onClick={exportHandbookPNG}>
                        <FileImage size={18} /><span><strong>Image</strong><small>PNG · 1200×1500</small></span>
                      </button>
                      <button type="button" onClick={exportHandbookHTML}>
                        <FileCode2 size={18} /><span><strong>HTML</strong><small>Responsive web card</small></span>
                      </button>
                      <button type="button" onClick={() => window.print()}>
                        <FileText size={18} /><span><strong>PDF</strong><small>Print-ready A4</small></span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="handbook-preview-shell">
                  <div className="preview-toolbar">
                    <span><i /> Live handbook preview</span>
                    <div>
                      <button className="icon-button" type="button" onClick={() => notify("Preview zoom reset")} aria-label="Zoom out"><Minus size={14} /></button>
                      <span>82%</span>
                      <button className="icon-button" type="button" onClick={() => notify("Preview zoom increased")} aria-label="Zoom in"><Plus size={14} /></button>
                    </div>
                  </div>
                  <article className={cn("handbook-preview", `menu-${menuStyle}`)}>
                    <div className="menu-corner corner-one">✦</div>
                    <div className="menu-corner corner-two">✿</div>
                    <div className="menu-kicker">Crumbloom Atelier · Dessert No. 01</div>
                    <div className="menu-mark">☾</div>
                    <h2>Moonlit<br />Jasmine Cloud</h2>
                    <div className="menu-divider"><span>✦</span></div>
                    <p className="menu-notes">jasmine · williams pear · toasted almond · white chocolate</p>
                    <p className="menu-description">
                      A weightless floral mousse with a bright pear moon at its heart,
                      finished in a translucent tea veil.
                    </p>
                    <div className="menu-serve">
                      <span>8–10 guests</span><i>·</i><span>serve at 8°C</span>
                    </div>
                    <div className="menu-signoff">made slowly, shared sweetly</div>
                  </article>
                  <span className="paper-shadow" />
                </div>
              </div>
            ) : (
              <div className="chef-layout">
                <div className="production-summary paper-card">
                  <div className="section-title-row compact">
                    <div>
                      <span className="section-index">01</span>
                      <div>
                        <strong>Production quantities</strong>
                        <small>Set how many of each product the kitchen will make.</small>
                      </div>
                    </div>
                    <label className="inline-size-select">
                      <span>Size</span>
                      <select value={size} onChange={(event) => setSize(event.target.value as Size)}>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                      <ChevronDown size={13} />
                    </label>
                  </div>
                  <div className="production-products">
                    {productionProducts.map((product) => (
                      <div className={cn("production-product", `accent-${product.tint}`)} key={product.id}>
                        <span className="product-emoji">{product.emoji}</span>
                        <div><strong>{product.name}</strong><small>{sizeDetails[size].serves} servings each</small></div>
                        <div className="counter">
                          <button type="button" onClick={() => setCounts((current) => ({...current, [product.id]: Math.max(0, current[product.id] - 1)}))} aria-label={`Decrease ${product.name}`}><Minus size={13} /></button>
                          <input
                            type="number"
                            min="0"
                            value={counts[product.id]}
                            onChange={(event) => setCounts((current) => ({...current, [product.id]: Math.max(0, Number(event.target.value))}))}
                            aria-label={`Number of ${product.name}`}
                          />
                          <button type="button" onClick={() => setCounts((current) => ({...current, [product.id]: current[product.id] + 1}))} aria-label={`Increase ${product.name}`}><Plus size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="batch-stats">
                    <div><span>Total desserts</span><strong>{Object.values(counts).reduce((sum, value) => sum + value, 0)}</strong></div>
                    <div><span>Estimated portions</span><strong>{Object.values(counts).reduce((sum, value) => sum + value, 0) * (size === "small" ? 5 : size === "medium" ? 9 : 16)}</strong></div>
                    <div><span>Production days</span><strong>2</strong></div>
                  </div>
                </div>

                <div className="cost-card paper-card">
                  <div className="section-title-row compact">
                    <div>
                      <span className="section-index">02</span>
                      <div>
                        <strong>Consolidated material & cost sheet</strong>
                        <small>Quantities include the 6% working allowance.</small>
                      </div>
                    </div>
                    <div className="currency-pill">SGD <ChevronDown size={12} /></div>
                  </div>
                  <div className="cost-table-wrap">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Moonlit</th>
                          <th>Picnic</th>
                          <th>Garden</th>
                          <th>Total needed</th>
                          <th>Unit price</th>
                          <th>Est. cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionMaterials.map((material, rowIndex) => {
                          const scaled = material.perProduct.map(
                            (amount, index) =>
                              amount * counts[productionProducts[index].id] * sizeScale[size]
                          );
                          const total = scaled.reduce((sum, amount) => sum + amount, 0);
                          return (
                            <tr key={material.name}>
                              <td><span className="material-dot" />{material.name}</td>
                              {scaled.map((amount, index) => (
                                <td key={`${material.name}-${index}`}>{amount.toFixed(material.unit === "set" ? 0 : 2)}</td>
                              ))}
                              <td><strong>{total.toFixed(material.unit === "set" ? 0 : 2)} {material.unit}</strong></td>
                              <td>
                                <label className="price-input">
                                  <span>$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={prices[rowIndex]}
                                    onChange={(event) =>
                                      setPrices((current) =>
                                        current.map((price, index) =>
                                          index === rowIndex ? Number(event.target.value) : price
                                        )
                                      )
                                    }
                                    aria-label={`Unit price for ${material.name}`}
                                  />
                                </label>
                              </td>
                              <td><strong>${(total * prices[rowIndex]).toFixed(2)}</strong></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="cost-footer">
                    <div className="cost-note"><CircleDollarSign size={17} /><span>Estimated raw material total</span></div>
                    <div className="cost-total"><small>SGD</small><strong>${totalMaterialCost.toFixed(2)}</strong></div>
                  </div>
                </div>

                <div className="chef-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        productionMaterials.map((material) => material.name).join("\n")
                      );
                      notify("Prep list copied");
                    }}
                  >
                    <ClipboardCheck size={16} /> Copy prep list
                  </button>
                  <button className="secondary-button" type="button" onClick={() => window.print()}>
                    <FileText size={16} /> Print kitchen sheet
                  </button>
                  <button className="primary-button" type="button" onClick={() => notify("Production pack exported")}>
                    <CloudDownload size={16} /> Export production pack
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="workspace-footer">
          <span>Crumbloom keeps your work locally in this prototype.</span>
          <button type="button" onClick={exportCards}>
            <Download size={14} /> Export a backup
          </button>
        </footer>
      </section>

      {toast && (
        <div className="toast" role="status">
          <span><Check size={14} /></span>
          {toast}
        </div>
      )}
    </main>
  );
}
