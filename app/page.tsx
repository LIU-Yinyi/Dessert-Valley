"use client";

import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Bot,
  CakeSlice,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eraser,
  FileCode2,
  FileImage,
  FileText,
  ImagePlus,
  Import,
  Layers3,
  LoaderCircle,
  Mic,
  PackageCheck,
  Pencil,
  Plus,
  Redo2,
  Send,
  Sparkles,
  Sprout,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  WandSparkles,
  Wheat,
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
type ReferenceKind = "text" | "audio" | "image" | "canvas";
type ViewStyle = "exterior" | "cutaway";

type IdeaCard = {
  id: number;
  title: string;
  prompt: string;
  image: string;
  imageName: string;
  tags: string[];
};

type DesignReference = {
  id: number;
  kind: ReferenceKind;
  title: string;
  content: string;
  asset: string;
  inherited?: boolean;
};

type MaterialRow = {
  id: number;
  name: string;
  amount: string;
  unit: string;
  note: string;
};

type PlanStep = {
  id: number;
  title: string;
  instruction: string;
  image: string;
};

type ProductionRow = {
  id: number;
  productId: "moon" | "berry" | "garden";
  count: number;
  sizeValue: string;
  sizeUnit: string;
  style: string;
};

const stages: { id: Stage; label: string; hint: string; icon: typeof Sprout }[] = [
  { id: "idea", label: "Idea", hint: "Gather", icon: Sprout },
  { id: "design", label: "Design", hint: "Shape", icon: Pencil },
  { id: "product", label: "Product", hint: "Build", icon: CakeSlice },
  { id: "bake", label: "Bake", hint: "Make", icon: Wheat },
];

const seedIdeas: IdeaCard[] = [
  {
    id: 1,
    title: "Moonlit Jasmine Cloud",
    prompt:
      "A small moon-shaped jasmine mousse with fresh pear, a translucent tea veil and tiny sugar stars.",
    image: "/renderings/moonlit-jasmine-hero.png",
    imageName: "moonlit-jasmine-reference.png",
    tags: ["jasmine", "pear", "pearl"],
  },
  {
    id: 2,
    title: "Strawberry Picnic Box",
    prompt:
      "A single-serve strawberry shortcake that opens like a tiny gingham picnic hamper.",
    image: "/renderings/strawberry-picnic-hero.png",
    imageName: "strawberry-picnic-reference.png",
    tags: ["berry", "playful", "giftable"],
  },
  {
    id: 3,
    title: "Pistachio Garden",
    prompt:
      "A petite pistachio entremet with chamomile flowers, soft moss texture and a honey centre.",
    image: "/renderings/pistachio-garden-hero.png",
    imageName: "pistachio-garden-reference.png",
    tags: ["pistachio", "botanical", "honey"],
  },
];

const products = {
  moon: {
    name: "Moonlit Jasmine Cloud",
    alias: "MJC",
    image: "/renderings/moonlit-jasmine-hero.png",
    cutaway: "/renderings/moonlit-jasmine-cutaway.png",
  },
  berry: {
    name: "Strawberry Picnic Box",
    alias: "SPB",
    image: "/renderings/strawberry-picnic-hero.png",
    cutaway: "/renderings/strawberry-picnic-hero.png",
  },
  garden: {
    name: "Pistachio Garden",
    alias: "PG",
    image: "/renderings/pistachio-garden-hero.png",
    cutaway: "/renderings/pistachio-garden-hero.png",
  },
} as const;

const productionMaterials = [
  { name: "Whipping cream", unit: "kg", per: { moon: 0.12, berry: 0.1, garden: 0.11 } },
  { name: "White chocolate", unit: "kg", per: { moon: 0.05, berry: 0.035, garden: 0.04 } },
  { name: "Fruit / purée", unit: "kg", per: { moon: 0.045, berry: 0.12, garden: 0.04 } },
  { name: "Nut flour / paste", unit: "kg", per: { moon: 0.04, berry: 0.02, garden: 0.09 } },
  { name: "Garnish set", unit: "set", per: { moon: 1, berry: 1, garden: 1 } },
];

const referenceMeta: Record<
  ReferenceKind,
  { label: string; helper: string; icon: typeof FileText }
> = {
  text: { label: "Text", helper: "Describe a form, finish or feeling", icon: FileText },
  audio: { label: "Audio", helper: "Record or upload a voice direction", icon: AudioLines },
  image: { label: "Image", helper: "Add a photo, collage or visual sample", icon: ImagePlus },
  canvas: { label: "Canvas", helper: "Draw a fresh sketch on an empty canvas", icon: Pencil },
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function ideaVariant(idea: IdeaCard): keyof typeof products {
  if (/strawberry|berry|picnic/i.test(idea.title)) return "berry";
  if (/pistachio|garden|botanical/i.test(idea.title)) return "garden";
  return "moon";
}

function inheritedReferences(idea: IdeaCard): DesignReference[] {
  const references: DesignReference[] = [
    {
      id: uid(),
      kind: "text",
      title: "Idea brief",
      content: idea.prompt,
      asset: "",
      inherited: true,
    },
  ];
  if (idea.image) {
    references.push({
      id: uid(),
      kind: "image",
      title: "Idea image",
      content: idea.imageName || "Visual reference from Idea",
      asset: idea.image,
      inherited: true,
    });
  }
  return references;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CanvasPad({
  initialAsset,
  onChange,
}: {
  initialAsset: string;
  onChange: (asset: string) => void;
}) {
  type CanvasSnapshot = ImageData;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<CanvasSnapshot[]>([]);
  const redoStack = useRef<CanvasSnapshot[]>([]);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#6f5135");
  const [size, setSize] = useState(5);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });

  const paintBlank = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fffdf3";
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    paintBlank();
    if (!initialAsset) return;
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = initialAsset;
  }, [initialAsset]);

  const capture = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return null;
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  const remember = () => {
    const snapshot = capture();
    if (!snapshot) return;
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
    setHistoryState({ undo: undoStack.current.length, redo: 0 });
  };

  const restore = (snapshot: CanvasSnapshot) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.putImageData(snapshot, 0, 0);
    onChange(canvasRef.current?.toDataURL("image/png") ?? "");
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    const current = capture();
    if (current) redoStack.current.push(current);
    restore(previous);
    setHistoryState({
      undo: undoStack.current.length,
      redo: redoStack.current.length,
    });
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    const current = capture();
    if (current) undoStack.current.push(current);
    restore(next);
    setHistoryState({
      undo: undoStack.current.length,
      redo: redoStack.current.length,
    });
  };

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    remember();
    lastPoint.current = point(event);
    setDrawing(true);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      visible: true,
    });
    if (!drawing || !lastPoint.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const next = point(event);
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = tool === "eraser" ? Math.max(size * 4, 18) : size;
    context.strokeStyle = color;
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    context.restore();
    lastPoint.current = next;
  };

  const stop = () => {
    if (drawing) onChange(canvasRef.current?.toDataURL("image/png") ?? "");
    setDrawing(false);
    lastPoint.current = null;
  };

  const clear = () => {
    remember();
    paintBlank();
    onChange("");
  };

  return (
    <div className="canvas-editor">
      <div className="canvas-editor-toolbar">
        <div className="pixel-segment">
          <button
            type="button"
            className={cn(tool === "pencil" && "active")}
            onClick={() => setTool("pencil")}
          >
            <Pencil size={15} /> Pencil
          </button>
          <button
            type="button"
            className={cn(tool === "eraser" && "active")}
            onClick={() => setTool("eraser")}
          >
            <Eraser size={15} /> Eraser
          </button>
        </div>
        <div className="canvas-controls">
          <label className="color-dot" style={{ "--ink": color } as CSSProperties}>
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              aria-label="Pencil color"
            />
          </label>
          <label className="size-slider">
            <span>{size}px</span>
            <input
              type="range"
              min="2"
              max="18"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              aria-label="Pencil size"
            />
          </label>
          <button
            className="square-button"
            type="button"
            onClick={undo}
            disabled={historyState.undo === 0}
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="square-button"
            type="button"
            onClick={redo}
            disabled={historyState.redo === 0}
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>
          <button className="square-button" type="button" onClick={clear} aria-label="Clear canvas">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="blank-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={900}
          height={520}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={() => {
            stop();
            setCursor((current) => ({ ...current, visible: false }));
          }}
          onPointerEnter={() => setCursor((current) => ({ ...current, visible: true }))}
          aria-label="Empty dessert sketch canvas"
        />
        <span
          className={cn("pixel-tool-cursor", cursor.visible && "visible", `tool-${tool}`)}
          style={{ left: cursor.x, top: cursor.y }}
          aria-hidden="true"
        >
          {tool === "pencil" ? <Pencil size={17} /> : <Eraser size={17} />}
        </span>
        <span className="canvas-empty-note">blank sketch paper</span>
      </div>
    </div>
  );
}

function ReferenceEditor({
  kind,
  existing,
  onClose,
  onSave,
}: {
  kind: ReferenceKind;
  existing: DesignReference | null;
  onClose: () => void;
  onSave: (reference: DesignReference) => void;
}) {
  const meta = referenceMeta[kind];
  const [title, setTitle] = useState(existing?.title ?? `${meta.label} reference`);
  const [content, setContent] = useState(existing?.content ?? "");
  const [asset, setAsset] = useState(existing?.asset ?? "");
  const [recording, setRecording] = useState(false);
  const [audioError, setAudioError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAsset(await readFileAsDataUrl(new File([blob], "voice-note.webm")));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setAudioError("");
      setRecording(true);
    } catch {
      setAudioError("Microphone unavailable. You can upload an audio clip instead.");
    }
  };

  const handleAsset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAsset(await readFileAsDataUrl(file));
    if (!content) setContent(file.name);
    event.target.value = "";
  };

  const confirm = () => {
    onSave({
      id: existing?.id ?? uid(),
      kind,
      title: title.trim() || `${meta.label} reference`,
      content: content.trim(),
      asset,
      inherited: existing?.inherited,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={cn("pixel-modal", kind === "canvas" && "canvas-modal")} role="dialog" aria-modal="true">
        <header className="modal-header">
          <div className="modal-icon"><meta.icon size={18} /></div>
          <div>
            <span className="micro-label">{existing ? "Edit reference" : "Add reference"}</span>
            <h2>{meta.label}</h2>
          </div>
          <button className="square-button" type="button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>Card name</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          {kind === "text" && (
            <label className="field">
              <span>Design direction</span>
              <textarea
                rows={7}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Shape, scale, texture, color, emotion…"
                autoFocus
              />
            </label>
          )}

          {kind === "image" && (
            <>
              <label className={cn("asset-drop", asset && "has-asset")}>
                {asset ? (
                  <img src={asset} alt="Reference preview" />
                ) : (
                  <>
                    <ImagePlus size={24} />
                    <strong>Choose an image</strong>
                    <small>PNG, JPG, WEBP or HEIC</small>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleAsset} />
              </label>
              <label className="field">
                <span>What should Muse notice?</span>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Use the soft glaze and tiny flower placement."
                />
              </label>
            </>
          )}

          {kind === "audio" && (
            <div className="audio-editor">
              <button
                className={cn("record-button", recording && "recording")}
                type="button"
                onClick={toggleRecording}
              >
                <Mic size={18} />
                {recording ? "Stop recording" : "Record a voice note"}
              </button>
              <span>or</span>
              <label className="upload-audio">
                <Upload size={16} /> Upload audio
                <input type="file" accept="audio/*" onChange={handleAsset} />
              </label>
              {audioError && <p className="field-error">{audioError}</p>}
              {asset && <audio controls src={asset} />}
              <label className="field">
                <span>Optional note</span>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="A short transcript or detail to remember."
                />
              </label>
            </div>
          )}

          {kind === "canvas" && <CanvasPad initialAsset={asset} onChange={setAsset} />}
        </div>

        <footer className="modal-footer">
          <button className="button ghost" type="button" onClick={onClose}>Cancel</button>
          <button
            className="button primary"
            type="button"
            onClick={confirm}
            disabled={kind === "text" ? !content.trim() : kind !== "audio" && !asset}
          >
            <Check size={15} /> Confirm reference
          </button>
        </footer>
      </section>
    </div>
  );
}

function StepEditor({
  existing,
  onClose,
  onSave,
}: {
  existing: PlanStep | null;
  onClose: () => void;
  onSave: (step: PlanStep) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [instruction, setInstruction] = useState(existing?.instruction ?? "");
  const [image, setImage] = useState(existing?.image ?? "");

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
    event.target.value = "";
  };

  return (
    <div className="modal-backdrop">
      <section className="pixel-modal step-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div className="modal-icon"><Layers3 size={18} /></div>
          <div>
            <span className="micro-label">{existing ? "Edit step" : "Add step"}</span>
            <h2>Making instruction</h2>
          </div>
          <button className="square-button" type="button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="modal-body step-form-grid">
          <label className={cn("asset-drop step-image-drop", image && "has-asset")}>
            {image ? (
              <img src={image} alt="Step visual" />
            ) : (
              <>
                <ImagePlus size={23} />
                <strong>Add a step image</strong>
                <small>Photo, diagram or generated visual</small>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImage} />
          </label>
          <div>
            <label className="field">
              <span>Step title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Fill the mould"
              />
            </label>
            <label className="field">
              <span>Operating detail</span>
              <textarea
                rows={6}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="Write temperature, timing, visual cues and handling notes."
              />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="button ghost" type="button" onClick={onClose}>Cancel</button>
          <button
            className="button primary"
            type="button"
            disabled={!title.trim() || !instruction.trim()}
            onClick={() =>
              onSave({
                id: existing?.id ?? uid(),
                title: title.trim(),
                instruction: instruction.trim(),
                image,
              })
            }
          >
            <Check size={15} /> Save step
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("idea");
  const [ideas, setIdeas] = useState<IdeaCard[]>(seedIdeas);
  const [selectedIdeaId, setSelectedIdeaId] = useState(1);
  const [ideaText, setIdeaText] = useState("");
  const [ideaImage, setIdeaImage] = useState("");
  const [ideaImageName, setIdeaImageName] = useState("");
  const [references, setReferences] = useState<DesignReference[]>(() =>
    inheritedReferences(seedIdeas[0])
  );
  const [dockOpen, setDockOpen] = useState(false);
  const [referenceEditor, setReferenceEditor] = useState<{
    kind: ReferenceKind;
    existing: DesignReference | null;
  } | null>(null);
  const [viewStyle, setViewStyle] = useState<ViewStyle>("exterior");
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<{
    src: string;
    view: ViewStyle;
    inputs: number;
  } | null>(null);
  const [sizeEnabled, setSizeEnabled] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: "",
    height: "",
    depth: "",
    unit: "cm",
  });
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [includeLoss, setIncludeLoss] = useState(false);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [stepEditor, setStepEditor] = useState<PlanStep | "new" | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState([
    "Hello! Ask about texture, temperature, substitutions or workflow.",
  ]);
  const [agentAudioName, setAgentAudioName] = useState("");
  const [bakeMode, setBakeMode] = useState<"chef" | "diner">("chef");
  const [productionRows, setProductionRows] = useState<ProductionRow[]>([
    { id: 1, productId: "moon", count: 4, sizeValue: "8", sizeUnit: "cm", style: "Pearl glaze" },
    { id: 2, productId: "berry", count: 6, sizeValue: "9", sizeUnit: "cm", style: "Picnic gingham" },
    { id: 3, productId: "garden", count: 4, sizeValue: "8", sizeUnit: "cm", style: "Chamomile moss" },
  ]);
  const [prices, setPrices] = useState([11.8, 28.5, 18.2, 31.4, 2.4]);
  const [selectedMenuRows, setSelectedMenuRows] = useState<number[]>([1, 2, 3]);
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement | null>(null);

  const selectedIdea =
    ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0] ?? seedIdeas[0];
  const variant = ideaVariant(selectedIdea);
  const currentProduct = products[variant];
  const stageIndex = stages.findIndex((item) => item.id === stage);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string) => setToast(message);

  const openStage = (next: Stage) => {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectIdea = (idea: IdeaCard) => {
    setSelectedIdeaId(idea.id);
    setReferences(inheritedReferences(idea));
    setRenderResult(null);
    setViewStyle("exterior");
    openStage("design");
    notify(`${idea.title} opened in the Design Dock`);
  };

  const handleIdeaImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIdeaImage(await readFileAsDataUrl(file));
    setIdeaImageName(file.name);
    event.target.value = "";
  };

  const addIdea = () => {
    if (!ideaText.trim()) return;
    const words = ideaText.trim().replace(/[^\w\s-]/g, "").split(/\s+/).slice(0, 4);
    const idea: IdeaCard = {
      id: uid(),
      title: words.join(" ") || "Untitled Dessert",
      prompt: ideaText.trim(),
      image: ideaImage,
      imageName: ideaImageName,
      tags: ["new", "ready"],
    };
    setIdeas((current) => [idea, ...current]);
    setIdeaText("");
    setIdeaImage("");
    setIdeaImageName("");
    notify("Idea added to the gallery");
  };

  const saveReference = (reference: DesignReference) => {
    setReferences((current) => {
      const exists = current.some((item) => item.id === reference.id);
      return exists
        ? current.map((item) => (item.id === reference.id ? reference : item))
        : [...current, reference];
    });
    setReferenceEditor(null);
    notify(reference.inherited ? "Reference updated" : "Reference added to the intent package");
  };

  const generateRendering = () => {
    if (!references.length || rendering) return;
    setRendering(true);
    setRenderResult(null);
    window.setTimeout(() => {
      setRenderResult({
        src: viewStyle === "cutaway" ? currentProduct.cutaway : currentProduct.image,
        view: viewStyle,
        inputs: references.length,
      });
      setRendering(false);
      notify("Product rendering ready");
    }, 1200);
  };

  const addMaterial = () =>
    setMaterials((current) => [
      ...current,
      { id: uid(), name: "", amount: "", unit: "g", note: "" },
    ]);

  const updateMaterial = (id: number, patch: Partial<MaterialRow>) =>
    setMaterials((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const advisePlan = () => {
    const suggestions: PlanStep[] = [
      {
        id: uid(),
        title: "Prepare the base",
        instruction:
          "Scale the components, line the mould and chill the tray. Keep the working area below 22°C.",
        image: currentProduct.image,
      },
      {
        id: uid(),
        title: "Build the centre",
        instruction:
          "Pipe the insert into the centre, leaving an even border. Freeze until firm before adding the final layer.",
        image: currentProduct.cutaway,
      },
      {
        id: uid(),
        title: "Finish and rest",
        instruction:
          "Unmould while frozen, apply the chosen finish, then temper in the refrigerator before serving.",
        image: currentProduct.image,
      },
    ];
    setPlanSteps((current) => (current.length ? [...current, ...suggestions] : suggestions));
    notify("Muse added a three-step starting plan");
  };

  const saveStep = (step: PlanStep) => {
    setPlanSteps((current) => {
      const exists = current.some((item) => item.id === step.id);
      return exists ? current.map((item) => (item.id === step.id ? step : item)) : [...current, step];
    });
    setStepEditor(null);
    notify("Making step saved");
  };

  const updateProduction = (id: number, patch: Partial<ProductionRow>) =>
    setProductionRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const addProductionStyle = () => {
    const nextId = uid();
    setProductionRows((current) => [
      ...current,
      {
        id: nextId,
        productId: "moon",
        count: 1,
        sizeValue: "8",
        sizeUnit: "cm",
        style: "New style",
      },
    ]);
    setSelectedMenuRows((current) => [...current, nextId]);
  };

  const countsByProduct = useMemo(
    () =>
      productionRows.reduce(
        (totals, row) => {
          totals[row.productId] += Math.max(0, row.count);
          return totals;
        },
        { moon: 0, berry: 0, garden: 0 }
      ),
    [productionRows]
  );

  const consolidateRows = useMemo(
    () =>
      productionMaterials.map((material, index) => {
        const amounts = {
          moon: material.per.moon * countsByProduct.moon,
          berry: material.per.berry * countsByProduct.berry,
          garden: material.per.garden * countsByProduct.garden,
        };
        const total = amounts.moon + amounts.berry + amounts.garden;
        return { ...material, amounts, total, cost: total * prices[index] };
      }),
    [countsByProduct, prices]
  );

  const exportCards = () => {
    const data = {
      format: "crumbloom-pixel-card-pack",
      exportedAt: new Date().toISOString(),
      ideas,
      selectedIdeaId,
      references: references.map(({ asset, ...reference }) => ({
        ...reference,
        hasAsset: Boolean(asset),
      })),
      size: sizeEnabled ? dimensions : null,
      materials,
      includeLoss,
      planSteps: planSteps.map(({ image, ...step }) => ({ ...step, hasImage: Boolean(image) })),
      productionRows,
    };
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      "crumbloom-card-pack.json"
    );
    notify("Card pack exported");
  };

  const importCards = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (Array.isArray(payload.ideas)) setIdeas(payload.ideas);
      if (Array.isArray(payload.productionRows)) setProductionRows(payload.productionRows);
      notify("Card pack imported");
    } catch {
      notify("This card pack could not be read");
    }
    event.target.value = "";
  };

  const selectedHandbookRows = productionRows.filter((row) =>
    selectedMenuRows.includes(row.id)
  );

  const exportHandbookHTML = () => {
    const cards = selectedHandbookRows
      .map(
        (row) =>
          `<article><small>${products[row.productId].alias} · ${row.sizeValue}${row.sizeUnit}</small><h2>${products[row.productId].name}</h2><p>${row.style}</p></article>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Crumbloom Dessert Handbook</title><style>body{font-family:Georgia,serif;background:#f4ead3;color:#443622;padding:48px}main{max-width:760px;margin:auto}header{text-align:center;border-bottom:2px solid #8a6a3d;padding-bottom:28px}article{background:#fffaf0;border:1px solid #b89a67;padding:24px;margin:18px 0}small{letter-spacing:.14em;text-transform:uppercase;color:#708552}h2{margin:8px 0}</style></head><body><main><header><p>CRUMBLOOM ATELIER</p><h1>Dessert Handbook</h1></header>${cards}</main></body></html>`;
    downloadBlob(new Blob([html], { type: "text/html" }), "crumbloom-handbook.html");
    notify("HTML handbook exported");
  };

  const exportHandbookPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f4ead3";
    context.fillRect(0, 0, 1200, 1500);
    context.strokeStyle = "#8a6a3d";
    context.lineWidth = 6;
    context.strokeRect(70, 70, 1060, 1360);
    context.fillStyle = "#52683d";
    context.textAlign = "center";
    context.font = "700 30px monospace";
    context.fillText("CRUMBLOOM ATELIER", 600, 150);
    context.fillStyle = "#443622";
    context.font = "64px Georgia";
    context.fillText("Dessert Handbook", 600, 245);
    selectedHandbookRows.slice(0, 6).forEach((row, index) => {
      const y = 370 + index * 165;
      context.font = "34px Georgia";
      context.fillText(products[row.productId].name, 600, y);
      context.font = "22px monospace";
      context.fillText(`${row.style} · ${row.sizeValue}${row.sizeUnit}`, 600, y + 50);
    });
    canvas.toBlob((blob) => blob && downloadBlob(blob, "crumbloom-handbook.png"));
    notify("Image handbook exported");
  };

  const sendAgentMessage = () => {
    if (!agentInput.trim() && !agentAudioName) return;
    const userMessage = agentInput.trim() || `Voice note: ${agentAudioName}`;
    setAgentMessages((current) => [
      ...current,
      userMessage,
      "Muse suggests testing one small portion first, then recording temperature and texture before scaling.",
    ]);
    setAgentInput("");
    setAgentAudioName("");
  };

  return (
    <div className="pixel-app">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => openStage("idea")}
          aria-label="Crumbloom home"
        >
          <span className="brand-mark"><Sprout size={18} /></span>
          <span>
            <strong>Crumbloom</strong>
            <small>dessert atelier</small>
          </span>
        </button>
        <nav className="stage-nav" aria-label="Dessert workflow">
          {stages.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(item.id === stage && "active", index < stageIndex && "complete")}
                onClick={() => openStage(item.id)}
              >
                <span><Icon size={15} /></span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            );
          })}
        </nav>
        <div className="top-actions">
          <button className="square-button" type="button" onClick={() => importRef.current?.click()} aria-label="Import cards" data-tip="Import cards">
            <Import size={16} />
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={importCards} hidden />
          <button className="square-button" type="button" onClick={exportCards} aria-label="Export cards" data-tip="Export cards">
            <Download size={16} />
          </button>
          <span className="avatar">S</span>
        </div>
      </header>

      <main className="workspace">
        {stage === "idea" && (
          <section className="stage-section idea-stage">
            <div className="stage-intro">
              <span className="stage-kicker"><Sprout size={14} /> Idea garden</span>
              <h1>Plant a dessert idea.</h1>
              <p>Keep it loose. One sentence and an image are enough to begin.</p>
            </div>

            <div className="idea-composer pixel-panel">
              <textarea
                value={ideaText}
                onChange={(event) => setIdeaText(event.target.value)}
                placeholder="A tiny chestnut tart with maple cream and a little acorn lid…"
                aria-label="Dessert idea"
              />
              <div className="composer-footer">
                <div className="composer-assets">
                  <label className={cn("tool-chip", ideaImage && "active")}>
                    <ImagePlus size={15} />
                    {ideaImageName || "Add image"}
                    <input type="file" accept="image/*" onChange={handleIdeaImage} />
                  </label>
                  {ideaImage && (
                    <button
                      className="square-button mini"
                      type="button"
                      onClick={() => {
                        setIdeaImage("");
                        setIdeaImageName("");
                      }}
                      aria-label="Remove idea image"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button className="button primary" type="button" onClick={addIdea} disabled={!ideaText.trim()}>
                  <Plus size={15} /> Add to gallery
                </button>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <h2>Idea gallery</h2>
                <p>{ideas.length} ready to design</p>
              </div>
            </div>
            <div className="idea-gallery">
              {ideas.map((idea) => (
                <article className="idea-tile pixel-panel" key={idea.id}>
                  <div className="idea-thumb">
                    {idea.image ? (
                      <img src={idea.image} alt="" />
                    ) : (
                      <span><CakeSlice size={28} /></span>
                    )}
                    <span className="ready-flag"><Check size={12} /> ready</span>
                  </div>
                  <div className="idea-copy">
                    <h3>{idea.title}</h3>
                    <p>{idea.prompt}</p>
                    <div className="tag-row">
                      {idea.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                    <button className="button text-button" type="button" onClick={() => selectIdea(idea)}>
                      Open design dock <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {stage === "design" && (
          <section className="stage-section design-stage">
            <div className="stage-intro split">
              <div>
                <span className="stage-kicker"><Pencil size={14} /> Design dock</span>
                <h1>Collect only what matters.</h1>
                <p>Each small reference card becomes part of one shared rendering intent.</p>
              </div>
              <button className="selected-idea" type="button" onClick={() => openStage("idea")}>
                {selectedIdea.image ? <img src={selectedIdea.image} alt="" /> : <CakeSlice size={19} />}
                <span>
                  <small>Designing</small>
                  <strong>{selectedIdea.title}</strong>
                </span>
              </button>
            </div>

            <div className="design-grid">
              <section className="dock-panel pixel-panel">
                <header className="panel-heading">
                  <div>
                    <span className="panel-icon"><PackageCheck size={17} /></span>
                    <span>
                      <strong>Intent package</strong>
                      <small>{references.length} references linked</small>
                    </span>
                  </div>
                  <div className="dock-add-wrap">
                    <button
                      className="add-reference-button"
                      type="button"
                      onClick={() => setDockOpen((current) => !current)}
                      aria-expanded={dockOpen}
                    >
                      <Plus size={18} /> Add
                      <ChevronDown size={14} />
                    </button>
                    {dockOpen && (
                      <div className="dock-menu" role="menu">
                        {(Object.keys(referenceMeta) as ReferenceKind[]).map((kind) => {
                          const meta = referenceMeta[kind];
                          const Icon = meta.icon;
                          return (
                            <button
                              key={kind}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setReferenceEditor({ kind, existing: null });
                                setDockOpen(false);
                              }}
                            >
                              <span><Icon size={16} /></span>
                              <span>
                                <strong>{meta.label}</strong>
                                <small>{meta.helper}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </header>

                <div className="reference-dock-grid">
                  {references.map((reference) => {
                    const meta = referenceMeta[reference.kind];
                    const Icon = meta.icon;
                    return (
                      <article className="reference-card" key={reference.id}>
                        <div className={cn("reference-preview", `kind-${reference.kind}`)}>
                          {reference.asset && (reference.kind === "image" || reference.kind === "canvas") ? (
                            <img src={reference.asset} alt="" />
                          ) : reference.kind === "audio" && reference.asset ? (
                            <Volume2 size={23} />
                          ) : (
                            <Icon size={23} />
                          )}
                          <span>{meta.label}</span>
                        </div>
                        <div className="reference-card-copy">
                          <div>
                            <strong>{reference.title}</strong>
                            {reference.inherited && <small className="inherited-pill">from idea</small>}
                          </div>
                          <p>{reference.content || "Visual reference"}</p>
                          {reference.kind === "audio" && reference.asset && (
                            <audio controls src={reference.asset} />
                          )}
                        </div>
                        <div className="card-actions">
                          <button
                            className="square-button mini"
                            type="button"
                            onClick={() => setReferenceEditor({ kind: reference.kind, existing: reference })}
                            aria-label={`Edit ${reference.title}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="square-button mini danger"
                            type="button"
                            onClick={() =>
                              setReferences((current) =>
                                current.filter((item) => item.id !== reference.id)
                              )
                            }
                            aria-label={`Delete ${reference.title}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  <button
                    className="reference-empty-card"
                    type="button"
                    onClick={() => setDockOpen(true)}
                  >
                    <Plus size={19} />
                    <span>Add another reference</span>
                  </button>
                </div>
              </section>

              <aside className="muse-panel pixel-panel">
                <header className="panel-heading">
                  <div>
                    <span className="panel-icon muse"><WandSparkles size={17} /></span>
                    <span>
                      <strong>Pastry Muse</strong>
                      <small>Product rendering</small>
                    </span>
                  </div>
                </header>
                <div className="view-switch" role="group" aria-label="Rendering view">
                  <button
                    className={cn(viewStyle === "exterior" && "active")}
                    type="button"
                    onClick={() => setViewStyle("exterior")}
                  >
                    Exterior
                  </button>
                  <button
                    className={cn(viewStyle === "cutaway" && "active")}
                    type="button"
                    onClick={() => setViewStyle("cutaway")}
                  >
                    Cutaway
                  </button>
                </div>
                <div className={cn("muse-result", rendering && "loading")}>
                  {rendering ? (
                    <div className="render-loader">
                      <LoaderCircle size={25} />
                      <strong>Reading {references.length} references</strong>
                      <small>shape · color · texture · structure</small>
                    </div>
                  ) : renderResult ? (
                    <>
                      <img
                        src={renderResult.src}
                        alt={`${renderResult.view} product rendering of ${selectedIdea.title}`}
                        className={cn(renderResult.view === "cutaway" && variant !== "moon" && "simulated-cutaway")}
                      />
                      <span className="view-badge">{renderResult.view}</span>
                    </>
                  ) : (
                    <div className="result-empty">
                      <Sparkles size={25} />
                      <strong>No rendering yet</strong>
                      <small>Choose a view, then send the intent package.</small>
                    </div>
                  )}
                </div>
                {renderResult && (
                  <div className="render-summary">
                    <Layers3 size={14} />
                    <span>{renderResult.inputs} references combined into this {renderResult.view} view</span>
                  </div>
                )}
                <button
                  className="button primary full"
                  type="button"
                  onClick={generateRendering}
                  disabled={rendering || references.length === 0}
                >
                  {rendering ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
                  Product rendering
                </button>
                <button className="button ghost full" type="button" onClick={() => openStage("product")}>
                  Continue to Product <ArrowRight size={15} />
                </button>
              </aside>
            </div>
          </section>
        )}

        {stage === "product" && (
          <section className="stage-section product-stage">
            <div className="stage-intro">
              <span className="stage-kicker"><CakeSlice size={14} /> Product bench</span>
              <h1>Make one. Then scale.</h1>
              <p>Nothing is fixed. Add only the size, materials and steps your dessert needs.</p>
            </div>

            <div className="product-overview pixel-panel">
              <div className="product-mini-render">
                <img src={renderResult?.src || currentProduct.image} alt="" />
              </div>
              <div>
                <span className="micro-label">Active design</span>
                <h2>{selectedIdea.title}</h2>
                <p>Built as a flexible single-serve recipe by default.</p>
              </div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={sizeEnabled}
                  onChange={(event) => setSizeEnabled(event.target.checked)}
                />
                <span />
                Define finished size
              </label>
            </div>

            {sizeEnabled && (
              <section className="size-builder pixel-panel">
                <div className="section-heading inline">
                  <div>
                    <h2>Finished size</h2>
                    <p>Use any dimensions that describe this piece.</p>
                  </div>
                </div>
                <div className="dimension-fields">
                  {(["width", "height", "depth"] as const).map((field) => (
                    <label className="field" key={field}>
                      <span>{field}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="—"
                        value={dimensions[field]}
                        onChange={(event) =>
                          setDimensions((current) => ({ ...current, [field]: event.target.value }))
                        }
                      />
                    </label>
                  ))}
                  <label className="field">
                    <span>unit</span>
                    <select
                      value={dimensions.unit}
                      onChange={(event) =>
                        setDimensions((current) => ({ ...current, unit: event.target.value }))
                      }
                    >
                      <option>cm</option>
                      <option>mm</option>
                      <option>in</option>
                    </select>
                  </label>
                </div>
              </section>
            )}

            <section className="materials-panel pixel-panel">
              <div className="section-heading inline">
                <div>
                  <h2>Material usage</h2>
                  <p>Empty by default. Build the recipe in your own units.</p>
                </div>
                <button className="button secondary" type="button" onClick={addMaterial}>
                  <Plus size={15} /> Add material
                </button>
              </div>
              {materials.length === 0 ? (
                <button className="empty-state compact" type="button" onClick={addMaterial}>
                  <Plus size={19} />
                  <strong>Add the first material</strong>
                  <small>No preset quantities or cake-sized assumptions.</small>
                </button>
              ) : (
                <div className="editable-table-wrap">
                  <table className="editable-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Amount</th>
                        <th>Unit</th>
                        <th>Note</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              value={row.name}
                              onChange={(event) => updateMaterial(row.id, { name: event.target.value })}
                              placeholder="e.g. Pear purée"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={row.amount}
                              onChange={(event) => updateMaterial(row.id, { amount: event.target.value })}
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <input
                              value={row.unit}
                              onChange={(event) => updateMaterial(row.id, { unit: event.target.value })}
                              placeholder="g"
                            />
                          </td>
                          <td>
                            <input
                              value={row.note}
                              onChange={(event) => updateMaterial(row.id, { note: event.target.value })}
                              placeholder="optional"
                            />
                          </td>
                          <td>
                            <button
                              className="square-button mini danger"
                              type="button"
                              onClick={() =>
                                setMaterials((current) => current.filter((item) => item.id !== row.id))
                              }
                              aria-label={`Delete ${row.name || "material"}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <label className="loss-option">
                <input
                  type="checkbox"
                  checked={includeLoss}
                  onChange={(event) => setIncludeLoss(event.target.checked)}
                />
                <span><strong>Include 6% handling loss</strong><small>Optional; applied only when you choose it.</small></span>
              </label>
              {materials.length > 0 && includeLoss && (
                <div className="loss-preview">
                  {materials
                    .filter((row) => row.amount)
                    .map((row) => (
                      <span key={row.id}>
                        {row.name || "Material"}: {(Number(row.amount) * 1.06).toFixed(1)} {row.unit}
                      </span>
                    ))}
                </div>
              )}
            </section>

            <section className="making-plan pixel-panel">
              <div className="section-heading inline">
                <div>
                  <h2>Making plan</h2>
                  <p>Each operating step can pair instructions with a visual.</p>
                </div>
                <div className="section-actions">
                  <button className="button ghost" type="button" onClick={advisePlan}>
                    <WandSparkles size={15} /> AI advise
                  </button>
                  <button className="button secondary" type="button" onClick={() => setStepEditor("new")}>
                    <Plus size={15} /> Add step
                  </button>
                </div>
              </div>
              {planSteps.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={23} />
                  <strong>No making steps yet</strong>
                  <small>Add your own operating plan or let Muse create a starting sequence.</small>
                </div>
              ) : (
                <div className="step-list">
                  {planSteps.map((step, index) => (
                    <article className="step-card" key={step.id}>
                      <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
                      <div className="step-visual">
                        {step.image ? <img src={step.image} alt="" /> : <ImagePlus size={21} />}
                      </div>
                      <div className="step-copy">
                        <h3>{step.title}</h3>
                        <p>{step.instruction}</p>
                      </div>
                      <div className="card-actions">
                        <button className="square-button mini" type="button" onClick={() => setStepEditor(step)} aria-label={`Edit ${step.title}`}>
                          <Pencil size={13} />
                        </button>
                        <button
                          className="square-button mini danger"
                          type="button"
                          onClick={() => setPlanSteps((current) => current.filter((item) => item.id !== step.id))}
                          aria-label={`Delete ${step.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="stage-end">
              <button className="button primary" type="button" onClick={() => openStage("bake")}>
                Save product card <ArrowRight size={15} />
              </button>
            </div>
          </section>
        )}

        {stage === "bake" && (
          <section className="stage-section bake-stage">
            <div className="stage-intro">
              <span className="stage-kicker"><Wheat size={14} /> Bake day</span>
              <h1>Scale the craft, keep the character.</h1>
              <p>Plan production first, then turn selected styles into a table handbook.</p>
            </div>

            <div className="bake-switch" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={bakeMode === "chef"}
                className={cn(bakeMode === "chef" && "active")}
                onClick={() => setBakeMode("chef")}
              >
                <CircleDollarSign size={16} />
                <span><strong>For chefs</strong><small>Quantities & cost</small></span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bakeMode === "diner"}
                className={cn(bakeMode === "diner" && "active")}
                onClick={() => setBakeMode("diner")}
              >
                <BookOpen size={16} />
                <span><strong>For diners</strong><small>Dessert handbook</small></span>
              </button>
            </div>

            {bakeMode === "chef" && (
              <div className="chef-layout">
                <section className="production-panel pixel-panel">
                  <div className="section-heading inline">
                    <div>
                      <h2>Production quantities</h2>
                      <p>Duplicate a dessert to make another style or size.</p>
                    </div>
                    <button className="button secondary compact-button" type="button" onClick={addProductionStyle}>
                      <Plus size={14} /> Style batch
                    </button>
                  </div>
                  <div className="production-list">
                    {productionRows.map((row) => {
                      const product = products[row.productId];
                      return (
                        <article className="production-row" key={row.id}>
                          <img src={product.image} alt="" />
                          <div className="production-name">
                            <select
                              value={row.productId}
                              onChange={(event) =>
                                updateProduction(row.id, {
                                  productId: event.target.value as ProductionRow["productId"],
                                })
                              }
                              aria-label="Dessert card"
                            >
                              {(Object.keys(products) as Array<keyof typeof products>).map((id) => (
                                <option value={id} key={id}>{products[id].name}</option>
                              ))}
                            </select>
                            <input
                              value={row.style}
                              onChange={(event) => updateProduction(row.id, { style: event.target.value })}
                              placeholder="Style name"
                              aria-label={`${product.name} style`}
                            />
                          </div>
                          <label>
                            <span>qty</span>
                            <input
                              type="number"
                              min="0"
                              value={row.count}
                              onChange={(event) =>
                                updateProduction(row.id, { count: Number(event.target.value) })
                              }
                            />
                          </label>
                          <label className="production-size">
                            <span>size</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={row.sizeValue}
                              onChange={(event) =>
                                updateProduction(row.id, { sizeValue: event.target.value })
                              }
                            />
                            <select
                              value={row.sizeUnit}
                              onChange={(event) =>
                                updateProduction(row.id, { sizeUnit: event.target.value })
                              }
                            >
                              <option>cm</option>
                              <option>mm</option>
                              <option>in</option>
                              <option>g</option>
                            </select>
                          </label>
                          <button
                            className="square-button mini danger"
                            type="button"
                            onClick={() =>
                              setProductionRows((current) =>
                                current.filter((item) => item.id !== row.id)
                              )
                            }
                            aria-label={`Remove ${product.name} batch`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="cost-panel pixel-panel">
                  <div className="section-heading inline">
                    <div>
                      <h2>Consolidated materials & cost sheet</h2>
                      <p>Aliases keep the sheet compact. Hover any alias for the full name.</p>
                    </div>
                  </div>
                  <div className="cost-table-scroll">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Material</th>
                          {(Object.keys(products) as Array<keyof typeof products>).map((id) => (
                            <th key={id}>
                              <button
                                type="button"
                                className="alias-tip"
                                data-full-name={products[id].name}
                                title={products[id].name}
                                aria-label={`${products[id].alias} — ${products[id].name}`}
                              >
                                {products[id].alias}
                              </button>
                            </th>
                          ))}
                          <th>Total</th>
                          <th>Unit price</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consolidateRows.map((row, index) => (
                          <tr key={row.name}>
                            <td>{row.name}<small>{row.unit}</small></td>
                            <td>{row.amounts.moon.toFixed(2)}</td>
                            <td>{row.amounts.berry.toFixed(2)}</td>
                            <td>{row.amounts.garden.toFixed(2)}</td>
                            <td><strong>{row.total.toFixed(2)}</strong></td>
                            <td>
                              <label className="price-field">
                                $<input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={prices[index]}
                                  onChange={(event) =>
                                    setPrices((current) =>
                                      current.map((price, priceIndex) =>
                                        priceIndex === index ? Number(event.target.value) : price
                                      )
                                    )
                                  }
                                />
                              </label>
                            </td>
                            <td><strong>${row.cost.toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="cost-total">
                    <span>Total ingredient estimate</span>
                    <strong>${consolidateRows.reduce((sum, row) => sum + row.cost, 0).toFixed(2)}</strong>
                  </div>
                </section>
              </div>
            )}

            {bakeMode === "diner" && (
              <div className="diner-layout">
                <section className="handbook-gallery">
                  <div className="section-heading inline">
                    <div>
                      <h2>Handbook cards</h2>
                      <p>Every style batch is its own configurable card.</p>
                    </div>
                  </div>
                  <div className="handbook-card-grid">
                    {productionRows.map((row) => {
                      const product = products[row.productId];
                      const selected = selectedMenuRows.includes(row.id);
                      return (
                        <article className={cn("handbook-card pixel-panel", selected && "selected")} key={row.id}>
                          <button
                            className="card-select"
                            type="button"
                            onClick={() =>
                              setSelectedMenuRows((current) =>
                                current.includes(row.id)
                                  ? current.filter((id) => id !== row.id)
                                  : [...current, row.id]
                              )
                            }
                            aria-label={`${selected ? "Remove" : "Add"} ${product.name} from handbook`}
                          >
                            {selected && <Check size={13} />}
                          </button>
                          <img src={product.image} alt="" />
                          <div>
                            <span>{product.alias}</span>
                            <h3>{product.name}</h3>
                            <label className="inline-edit">
                              Style
                              <input
                                value={row.style}
                                onChange={(event) => updateProduction(row.id, { style: event.target.value })}
                              />
                            </label>
                            <label className="inline-edit size">
                              Size
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={row.sizeValue}
                                onChange={(event) => updateProduction(row.id, { sizeValue: event.target.value })}
                              />
                              <select
                                value={row.sizeUnit}
                                onChange={(event) => updateProduction(row.id, { sizeUnit: event.target.value })}
                              >
                                <option>cm</option><option>mm</option><option>in</option><option>g</option>
                              </select>
                            </label>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <aside className="export-panel pixel-panel">
                  <span className="panel-icon"><BookOpen size={18} /></span>
                  <h2>Dessert handbook</h2>
                  <p>{selectedHandbookRows.length} style cards selected.</p>
                  <div className="mini-menu-preview">
                    <Sprout size={22} />
                    <small>CRUMBLOOM ATELIER</small>
                    <strong>Today&apos;s<br />Dessert Garden</strong>
                    <span>{selectedHandbookRows.map((row) => products[row.productId].alias).join(" · ") || "Choose cards"}</span>
                  </div>
                  <button className="button secondary full" type="button" onClick={exportHandbookPNG}>
                    <FileImage size={15} /> Export image
                  </button>
                  <button className="button secondary full" type="button" onClick={exportHandbookHTML}>
                    <FileCode2 size={15} /> Export HTML
                  </button>
                  <button className="button primary full" type="button" onClick={() => window.print()}>
                    <FileText size={15} /> Export PDF
                  </button>
                </aside>
              </div>
            )}
          </section>
        )}
      </main>

      {stage === "product" && (
        <>
          <button
            className={cn("agent-fab", agentOpen && "open")}
            type="button"
            onClick={() => setAgentOpen((current) => !current)}
            aria-label="Open pastry agent"
          >
            {agentOpen ? <X size={20} /> : <Bot size={21} />}
            {!agentOpen && <span>Ask Muse</span>}
          </button>
          {agentOpen && (
            <aside className="agent-window">
              <header>
                <span className="panel-icon muse"><Bot size={17} /></span>
                <span><strong>Pastry agent</strong><small>floating helper</small></span>
                <button className="square-button mini" type="button" onClick={() => setAgentOpen(false)} aria-label="Close chat"><X size={13} /></button>
              </header>
              <div className="agent-messages">
                {agentMessages.map((message, index) => (
                  <p className={cn(index % 2 === 1 && "user")} key={`${message}-${index}`}>{message}</p>
                ))}
              </div>
              {agentAudioName && <div className="audio-attached"><AudioLines size={13} /> {agentAudioName}</div>}
              <div className="agent-composer">
                <label className="square-button" data-tip="Attach audio">
                  <Mic size={15} />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => {
                      setAgentAudioName(event.target.files?.[0]?.name ?? "");
                      event.target.value = "";
                    }}
                  />
                </label>
                <input
                  value={agentInput}
                  onChange={(event) => setAgentInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && sendAgentMessage()}
                  placeholder="Ask about this product…"
                />
                <button className="square-button send" type="button" onClick={sendAgentMessage} aria-label="Send">
                  <Send size={15} />
                </button>
              </div>
            </aside>
          )}
        </>
      )}

      {referenceEditor && (
        <ReferenceEditor
          key={`${referenceEditor.kind}-${referenceEditor.existing?.id ?? "new"}`}
          kind={referenceEditor.kind}
          existing={referenceEditor.existing}
          onClose={() => setReferenceEditor(null)}
          onSave={saveReference}
        />
      )}
      {stepEditor && (
        <StepEditor
          key={stepEditor === "new" ? "new" : stepEditor.id}
          existing={stepEditor === "new" ? null : stepEditor}
          onClose={() => setStepEditor(null)}
          onSave={saveStep}
        />
      )}

      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    </div>
  );
}
