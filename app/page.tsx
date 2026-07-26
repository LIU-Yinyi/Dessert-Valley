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
  Languages,
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
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Stage = "idea" | "design" | "product" | "bake";
type ReferenceKind = "text" | "audio" | "image" | "canvas";
type ViewStyle = "exterior" | "cutaway";
type Language = "en" | "zh";
type ProductId = "moon" | "berry" | "garden";
type StateUpdate<T> = T | ((current: T) => T);

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
  productId: ProductId;
  variantId: number | null;
  count: number;
};

type RenderResult = {
  src: string;
  view: ViewStyle;
  inputs: number;
  signature: string;
  productId: ProductId;
  influences: ReferenceKind[];
};

type HandbookResult = {
  src: string;
  signature: string;
  dessertCount: number;
  visualInputCount: number;
};

type SizeVariant = {
  id: number;
  name: string;
  width: string;
  height: string;
  depth: string;
  unit: string;
};

type ProductDraft = {
  variants: SizeVariant[];
  materials: MaterialRow[];
  planSteps: PlanStep[];
};

type PixelSelectOption<Value extends string | number> = {
  value: Value;
  label: string;
  helper?: string;
};

const stages: { id: Stage; icon: typeof Sprout }[] = [
  { id: "idea", icon: Sprout },
  { id: "design", icon: Pencil },
  { id: "product", icon: CakeSlice },
  { id: "bake", icon: Wheat },
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

const productNames: Record<Language, Record<ProductId, string>> = {
  en: {
    moon: "Moonlit Jasmine Cloud",
    berry: "Strawberry Picnic Box",
    garden: "Pistachio Garden",
  },
  zh: {
    moon: "月光茉莉云朵",
    berry: "草莓野餐盒",
    garden: "开心果花园",
  },
};

function productName(productId: ProductId, language: Language) {
  return productNames[language][productId];
}

function localizedIdeaName(idea: IdeaCard, language: Language) {
  const matchingProduct = (
    Object.entries(products) as Array<[ProductId, (typeof products)[ProductId]]>
  ).find(([, product]) => product.name === idea.title);
  return matchingProduct
    ? productName(matchingProduct[0], language)
    : idea.title;
}

const productionMaterials = [
  { name: "Whipping cream", nameZh: "淡奶油", unit: "kg", per: { moon: 0.12, berry: 0.1, garden: 0.11 } },
  { name: "White chocolate", nameZh: "白巧克力", unit: "kg", per: { moon: 0.05, berry: 0.035, garden: 0.04 } },
  { name: "Fruit / purée", nameZh: "水果／果泥", unit: "kg", per: { moon: 0.045, berry: 0.12, garden: 0.04 } },
  { name: "Nut flour / paste", nameZh: "坚果粉／坚果酱", unit: "kg", per: { moon: 0.04, berry: 0.02, garden: 0.09 } },
  { name: "Garnish set", nameZh: "装饰组合", unit: "set", per: { moon: 1, berry: 1, garden: 1 } },
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

const stageCopy: Record<
  Language,
  Record<Stage, { label: string; hint: string }>
> = {
  en: {
    idea: { label: "Idea", hint: "Gather" },
    design: { label: "Design", hint: "Shape" },
    product: { label: "Product", hint: "Build" },
    bake: { label: "Bake", hint: "Make" },
  },
  zh: {
    idea: { label: "创意", hint: "收集" },
    design: { label: "设计", hint: "塑形" },
    product: { label: "产品", hint: "配方" },
    bake: { label: "烘焙", hint: "制作" },
  },
};

const referenceCopy: Record<
  Language,
  Record<ReferenceKind, { label: string; helper: string }>
> = {
  en: {
    text: { label: "Text", helper: "Describe a form, finish or feeling" },
    audio: { label: "Audio", helper: "Record or upload a voice direction" },
    image: { label: "Image", helper: "Add a photo, collage or visual sample" },
    canvas: { label: "Canvas", helper: "Draw a fresh sketch on an empty canvas" },
  },
  zh: {
    text: { label: "文字", helper: "描述形状、质感或氛围" },
    audio: { label: "语音", helper: "录制或上传语音想法" },
    image: { label: "图片", helper: "添加照片、拼贴或视觉参考" },
    canvas: { label: "画布", helper: "在空白画布上绘制草图" },
  },
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function tr(language: Language, english: string, chinese: string) {
  return language === "zh" ? chinese : english;
}

function agentGreeting(language: Language) {
  return tr(
    language,
    "Hello! Ask about texture, temperature, substitutions or workflow.",
    "你好！可以询问质地、温度、替代材料或制作流程。"
  );
}

function applyStateUpdate<T>(current: T, update: StateUpdate<T>) {
  return typeof update === "function"
    ? (update as (value: T) => T)(current)
    : update;
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

function loadCanvasImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = source;
  });
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function intentSignature(references: DesignReference[]) {
  return hashText(
    references
      .map((reference) => {
        const assetHint = reference.asset
          ? `${reference.asset.length}:${reference.asset.slice(0, 48)}:${reference.asset.slice(-48)}`
          : "";
        return [
          reference.kind,
          reference.title,
          reference.content,
          assetHint,
          reference.inherited ? "inherited" : "added",
        ].join("|");
      })
      .join("::")
  );
}

function designIntentSignature(
  idea: IdeaCard,
  references: DesignReference[]
) {
  return hashText(
    [
      idea.title,
      idea.tags.join("|"),
      intentSignature(references),
    ].join("::")
  );
}

function intentProductId(idea: IdeaCard, references: DesignReference[]): ProductId {
  const intent = [
    idea.title,
    idea.tags.join(" "),
    ...references.map(
      (reference) => `${reference.title} ${reference.content}`
    ),
  ]
    .join(" ")
    .toLowerCase();
  if (/strawberry|raspberry|berry|pink|red|草莓|莓|粉色|红色/.test(intent)) return "berry";
  if (/pistachio|garden|herb|moss|green|开心果|花园|香草|苔藓|绿色/.test(intent)) {
    return "garden";
  }
  if (/jasmine|moon|pear|pearl|white|茉莉|月亮|梨|珍珠|白色/.test(intent)) return "moon";
  return ideaVariant(idea);
}

async function normalizeReferenceImage(source: string) {
  const image = await loadCanvasImage(source);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  if (!longestEdge) throw new Error("Image has no dimensions");
  const scale = Math.min(1, 1536 / longestEdge);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingEnabled = true;
  context.fillStyle = "#fffdf5";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function emptyProductDraft(): ProductDraft {
  return { variants: [], materials: [], planSteps: [] };
}

function sizeVariantScale(variant: SizeVariant, baseVariant: SizeVariant) {
  const unitScale: Record<string, number> = { mm: 1, cm: 10, in: 25.4 };
  const variantUnit = unitScale[variant.unit] ?? 1;
  const baseUnit = unitScale[baseVariant.unit] ?? 1;
  const keys: Array<"width" | "height" | "depth"> = ["width", "height", "depth"];
  const comparable = keys.filter(
    (key) => Number(variant[key]) > 0 && Number(baseVariant[key]) > 0
  );
  if (!comparable.length) return 1;
  const variantMeasure = comparable.reduce(
    (total, key) => total * Number(variant[key]) * variantUnit,
    1
  );
  const baseMeasure = comparable.reduce(
    (total, key) => total * Number(baseVariant[key]) * baseUnit,
    1
  );
  if (!Number.isFinite(variantMeasure / baseMeasure) || baseMeasure <= 0) return 1;
  return Math.min(100, Math.max(0.01, variantMeasure / baseMeasure));
}

function variantDisplayName(
  variant: SizeVariant,
  index: number,
  language: Language
) {
  return (
    variant.name.trim() ||
    tr(language, `Specification ${index + 1}`, `规格 ${index + 1}`)
  );
}

function variantDimensionLabel(variant: SizeVariant, language: Language) {
  const dimensions = [variant.width, variant.height, variant.depth].filter(
    (value) => Number(value) > 0
  );
  return dimensions.length
    ? `${dimensions.join(" × ")} ${variant.unit}`
    : tr(language, "Dimensions not set", "未填写尺寸");
}

function normalizeProductionRows(value: unknown): ProductionRow[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Record<string, unknown>;
    const productId =
      typeof candidate.productId === "string" &&
      candidate.productId in products
        ? (candidate.productId as ProductId)
        : null;
    if (!productId) return [];
    const parsedId = Number(candidate.id);
    const parsedCount = Number(candidate.count);
    const parsedVariantId =
      candidate.variantId === null || candidate.variantId === undefined
        ? null
        : Number(candidate.variantId);
    return [
      {
        id: Number.isFinite(parsedId) ? parsedId : uid(),
        productId,
        variantId: Number.isFinite(parsedVariantId)
          ? parsedVariantId
          : null,
        count: Number.isFinite(parsedCount) ? Math.max(0, parsedCount) : 0,
      },
    ];
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

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - renderedWidth) / 2,
    (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight
  );
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maximumWidth: number,
  maximumLines = 3
) {
  const tokens = value.includes(" ")
    ? value.split(/\s+/)
    : Array.from(value);
  const separator = value.includes(" ") ? " " : "";
  const lines: string[] = [];
  let current = "";
  tokens.forEach((token) => {
    const candidate = current ? `${current}${separator}${token}` : token;
    if (context.measureText(candidate).width <= maximumWidth || !current) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = token;
  });
  if (current) lines.push(current);
  if (lines.length <= maximumLines) return lines;
  const visible = lines.slice(0, maximumLines);
  let lastLine = visible[maximumLines - 1];
  while (
    lastLine &&
    context.measureText(`${lastLine}…`).width > maximumWidth
  ) {
    lastLine = lastLine.slice(0, -1);
  }
  visible[maximumLines - 1] = `${lastLine}…`;
  return visible;
}

function PixelSelect<Value extends string | number>({
  value,
  options,
  label,
  onChange,
}: {
  value: Value;
  options: PixelSelectOption<Value>[];
  label: string;
  onChange: (value: Value) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      (
        menuRef.current?.querySelector(
          '[role="option"][aria-selected="true"]'
        ) as HTMLButtonElement | null
      )?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const closeAndFocus = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const moveOptionFocus = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    const optionButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
        []
    );
    const currentIndex = optionButtons.indexOf(event.currentTarget);
    const direction =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (direction) {
      event.preventDefault();
      optionButtons[
        (currentIndex + direction + optionButtons.length) %
          optionButtons.length
      ]?.focus();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionButtons[event.key === "Home" ? 0 : optionButtons.length - 1]?.focus();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocus();
    }
  };

  return (
    <div className={cn("pixel-select", open && "open")} ref={rootRef}>
      <button
        ref={triggerRef}
        className="pixel-select-trigger"
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
          if (event.key === "Escape" && open) {
            event.preventDefault();
            closeAndFocus();
          }
        }}
      >
        <span>{selectedOption?.label ?? "—"}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="pixel-select-menu"
          ref={menuRef}
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                className={cn("pixel-select-option", selected && "selected")}
                type="button"
                role="option"
                aria-selected={selected}
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value);
                  closeAndFocus();
                }}
                onKeyDown={moveOptionFocus}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.helper && <small>{option.helper}</small>}
                </span>
                {selected && <Check size={13} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), audio[controls], [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.requestAnimationFrame(() => {
      dialog.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirst);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return dialogRef;
}

function CanvasPad({
  initialAsset,
  onChange,
  language,
}: {
  initialAsset: string;
  onChange: (asset: string) => void;
  language: Language;
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
            <Pencil size={15} /> {tr(language, "Pencil", "画笔")}
          </button>
          <button
            type="button"
            className={cn(tool === "eraser" && "active")}
            onClick={() => setTool("eraser")}
          >
            <Eraser size={15} /> {tr(language, "Eraser", "橡皮")}
          </button>
        </div>
        <div className="canvas-controls">
          <div className="brush-controls">
            <label
              className="color-control"
              style={{ "--pencil-color": color } as CSSProperties}
            >
              <span className="color-swatch" aria-hidden="true" />
              <span>{tr(language, "Color", "颜色")}</span>
              <input
                className="native-color-input"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label={tr(language, "Pencil color", "画笔颜色")}
              />
            </label>
            <label className="size-slider">
              <span>
                {tr(language, "Size", "大小")} <strong>{size}px</strong>
              </span>
              <input
                type="range"
                min="2"
                max="18"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                aria-label={tr(language, "Pencil size", "画笔大小")}
              />
            </label>
          </div>
          <div className="history-controls">
            <button
              className="square-button"
              type="button"
              onClick={undo}
              disabled={historyState.undo === 0}
              aria-label={tr(language, "Undo", "撤销")}
            >
              <Undo2 size={15} />
            </button>
            <button
              className="square-button"
              type="button"
              onClick={redo}
              disabled={historyState.redo === 0}
              aria-label={tr(language, "Redo", "重做")}
            >
              <Redo2 size={15} />
            </button>
            <button
              className="square-button"
              type="button"
              onClick={clear}
              aria-label={tr(language, "Clear canvas", "清空画布")}
            >
              <Trash2 size={15} />
            </button>
          </div>
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
          aria-label={tr(language, "Empty dessert sketch canvas", "空白甜点草图画布")}
        />
        <span
          className={cn("pixel-tool-cursor", cursor.visible && "visible", `tool-${tool}`)}
          style={{ left: cursor.x, top: cursor.y }}
          aria-hidden="true"
        >
          {tool === "pencil" ? <Pencil size={17} /> : <Eraser size={17} />}
        </span>
        <span className="canvas-empty-note">
          {tr(language, "blank sketch paper", "空白草图纸")}
        </span>
      </div>
    </div>
  );
}

function ReferenceEditor({
  kind,
  existing,
  onClose,
  onSave,
  language,
}: {
  kind: ReferenceKind;
  existing: DesignReference | null;
  onClose: () => void;
  onSave: (reference: DesignReference) => void;
  language: Language;
}) {
  const meta = referenceMeta[kind];
  const localizedMeta = referenceCopy[language][kind];
  const [title, setTitle] = useState(
    existing?.title ??
      tr(
        language,
        `${localizedMeta.label} reference`,
        `${localizedMeta.label}参考`
      )
  );
  const [content, setContent] = useState(existing?.content ?? "");
  const [asset, setAsset] = useState(existing?.asset ?? "");
  const [recording, setRecording] = useState(false);
  const [audioError, setAudioError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dialogRef = useDialogFocus(onClose);

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
      setAudioError(
        tr(
          language,
          "Microphone unavailable. You can upload an audio clip instead.",
          "麦克风不可用，可改为上传音频文件。"
        )
      );
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
      title:
        title.trim() ||
        tr(
          language,
          `${localizedMeta.label} reference`,
          `${localizedMeta.label}参考`
        ),
      content: content.trim(),
      asset,
      inherited: existing?.inherited,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className={cn("pixel-modal", kind === "canvas" && "canvas-modal")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-dialog-title"
      >
        <header className="modal-header">
          <div className="modal-icon"><meta.icon size={18} /></div>
          <div>
            <span className="micro-label">
              {existing
                ? tr(language, "Edit reference", "编辑参考")
                : tr(language, "Add reference", "添加参考")}
            </span>
            <h2 id="reference-dialog-title">{localizedMeta.label}</h2>
          </div>
          <button
            className="square-button"
            type="button"
            onClick={onClose}
            aria-label={tr(language, "Close", "关闭")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>{tr(language, "Card name", "卡片名称")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          {kind === "text" && (
            <label className="field">
              <span>{tr(language, "Design direction", "设计方向")}</span>
              <textarea
                rows={7}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={tr(
                  language,
                  "Shape, scale, texture, color, emotion…",
                  "形状、比例、质地、颜色、情绪……"
                )}
                autoFocus
              />
            </label>
          )}

          {kind === "image" && (
            <>
              <label className={cn("asset-drop", asset && "has-asset")}>
                {asset ? (
                  <img
                    src={asset}
                    alt={tr(language, "Reference preview", "参考预览")}
                  />
                ) : (
                  <>
                    <ImagePlus size={24} />
                    <strong>{tr(language, "Choose an image", "选择图片")}</strong>
                    <small>PNG, JPG, WEBP or HEIC</small>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleAsset} />
              </label>
              <label className="field">
                <span>{tr(language, "What should Muse notice?", "缪斯需要注意什么？")}</span>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={tr(
                    language,
                    "Use the soft glaze and tiny flower placement.",
                    "参考柔和的淋面与小花摆放。"
                  )}
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
                {recording
                  ? tr(language, "Stop recording", "停止录音")
                  : tr(language, "Record a voice note", "录制语音")}
              </button>
              <span>{tr(language, "or", "或")}</span>
              <label className="upload-audio">
                <Upload size={16} /> {tr(language, "Upload audio", "上传音频")}
                <input type="file" accept="audio/*" onChange={handleAsset} />
              </label>
              {audioError && <p className="field-error">{audioError}</p>}
              {asset && <audio controls src={asset} />}
              <label className="field">
                <span>{tr(language, "Optional note", "可选说明")}</span>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={tr(
                    language,
                    "A short transcript or detail to remember.",
                    "可填写简短文字记录或需要记住的细节。"
                  )}
                />
              </label>
            </div>
          )}

          {kind === "canvas" && (
            <CanvasPad
              initialAsset={asset}
              onChange={setAsset}
              language={language}
            />
          )}
        </div>

        <footer className="modal-footer">
          <button className="button ghost" type="button" onClick={onClose}>
            {tr(language, "Cancel", "取消")}
          </button>
          <button
            className="button primary"
            type="button"
            onClick={confirm}
            disabled={kind === "text" ? !content.trim() : kind !== "audio" && !asset}
          >
            <Check size={15} /> {tr(language, "Confirm reference", "确认参考")}
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
  language,
}: {
  existing: PlanStep | null;
  onClose: () => void;
  onSave: (step: PlanStep) => void;
  language: Language;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [instruction, setInstruction] = useState(existing?.instruction ?? "");
  const [image, setImage] = useState(existing?.image ?? "");
  const dialogRef = useDialogFocus(onClose);

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
    event.target.value = "";
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="pixel-modal step-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-dialog-title"
      >
        <header className="modal-header">
          <div className="modal-icon"><Layers3 size={18} /></div>
          <div>
            <span className="micro-label">
              {existing
                ? tr(language, "Edit step", "编辑步骤")
                : tr(language, "Add step", "添加步骤")}
            </span>
            <h2 id="step-dialog-title">
              {tr(language, "Making instruction", "制作说明")}
            </h2>
          </div>
          <button
            className="square-button"
            type="button"
            onClick={onClose}
            aria-label={tr(language, "Close", "关闭")}
          >
            <X size={16} />
          </button>
        </header>
        <div className="modal-body step-form-grid">
          <label className={cn("asset-drop step-image-drop", image && "has-asset")}>
            {image ? (
              <img src={image} alt={tr(language, "Step visual", "步骤图片")} />
            ) : (
              <>
                <ImagePlus size={23} />
                <strong>{tr(language, "Add a step image", "添加步骤图片")}</strong>
                <small>
                  {tr(language, "Photo, diagram or generated visual", "照片、示意图或生成图片")}
                </small>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImage} />
          </label>
          <div>
            <label className="field">
              <span>{tr(language, "Step title", "步骤标题")}</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={tr(language, "e.g. Fill the mould", "例如：填入模具")}
              />
            </label>
            <label className="field">
              <span>{tr(language, "Operating detail", "操作细节")}</span>
              <textarea
                rows={6}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder={tr(
                  language,
                  "Write temperature, timing, visual cues and handling notes.",
                  "填写温度、时间、视觉判断与操作注意事项。"
                )}
              />
            </label>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="button ghost" type="button" onClick={onClose}>
            {tr(language, "Cancel", "取消")}
          </button>
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
            <Check size={15} /> {tr(language, "Save step", "保存步骤")}
          </button>
        </footer>
      </section>
    </div>
  );
}

function parseIdeaTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，\n#]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

function IdeaEditor({
  idea,
  language,
  onClose,
  onSave,
}: {
  idea: IdeaCard;
  language: Language;
  onClose: () => void;
  onSave: (idea: IdeaCard) => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.prompt);
  const [tagText, setTagText] = useState(idea.tags.join(", "));
  const dialogRef = useDialogFocus(onClose);
  const previewTags = parseIdeaTags(tagText);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="pixel-modal idea-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-editor-title"
      >
        <header className="modal-header">
          <div className="modal-icon"><Pencil size={18} /></div>
          <div>
            <span className="micro-label">
              {tr(language, "Idea gallery", "创意画廊")}
            </span>
            <h2 id="idea-editor-title">
              {tr(language, "Edit idea card", "编辑创意卡")}
            </h2>
          </div>
          <button
            className="square-button"
            type="button"
            onClick={onClose}
            aria-label={tr(language, "Close", "关闭")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>{tr(language, "Dessert name", "甜点名称")}</span>
            <input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={tr(
                language,
                "Name this dessert idea",
                "为这个甜点创意命名"
              )}
              autoFocus
            />
          </label>
          <label className="field">
            <span>{tr(language, "Description", "创意描述")}</span>
            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={tr(
                language,
                "Describe the flavour, form, mood and details to preserve.",
                "描述想保留的风味、造型、氛围与细节。"
              )}
            />
          </label>
          <label className="field">
            <span>{tr(language, "Tags", "标签")}</span>
            <input
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder={tr(
                language,
                "jasmine, pear, pearl",
                "茉莉，梨，珍珠"
              )}
            />
            <small className="field-help">
              {tr(
                language,
                "Separate tags with commas. Up to 12 tags are kept.",
                "使用逗号分隔标签，最多保留 12 个。"
              )}
            </small>
          </label>
          {previewTags.length > 0 && (
            <div
              className="idea-tag-preview"
              aria-label={tr(language, "Tag preview", "标签预览")}
            >
              {previewTags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="button ghost" type="button" onClick={onClose}>
            {tr(language, "Cancel", "取消")}
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!title.trim()}
            onClick={() =>
              onSave({
                ...idea,
                title: title.trim(),
                prompt: description.trim(),
                tags: previewTags,
              })
            }
          >
            <Check size={15} /> {tr(language, "Save changes", "保存修改")}
          </button>
        </footer>
      </section>
    </div>
  );
}

function IdeaDeleteDialog({
  idea,
  language,
  onClose,
  onConfirm,
}: {
  idea: IdeaCard;
  language: Language;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="pixel-modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-idea-title"
        aria-describedby="delete-idea-description"
      >
        <header className="modal-header">
          <div className="modal-icon danger"><Trash2 size={18} /></div>
          <div>
            <span className="micro-label">
              {tr(language, "Idea gallery", "创意画廊")}
            </span>
            <h2 id="delete-idea-title">
              {tr(language, "Remove idea card?", "移除创意卡？")}
            </h2>
          </div>
          <button
            className="square-button"
            type="button"
            onClick={onClose}
            aria-label={tr(language, "Close", "关闭")}
          >
            <X size={16} />
          </button>
        </header>
        <div className="modal-body delete-dialog-copy">
          <strong>{idea.title}</strong>
          <p id="delete-idea-description">
            {tr(
              language,
              "Its intent package, renderings, size variants, materials and making steps will also be removed.",
              "与它关联的意图包、渲染图、尺寸规格、材料和制作步骤也会一并移除。"
            )}
          </p>
        </div>
        <footer className="modal-footer">
          <button className="button ghost" type="button" onClick={onClose}>
            {tr(language, "Keep card", "保留卡片")}
          </button>
          <button className="button danger" type="button" onClick={onConfirm}>
            <Trash2 size={15} /> {tr(language, "Remove idea", "移除创意")}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [stage, setStage] = useState<Stage>("idea");
  const [ideas, setIdeas] = useState<IdeaCard[]>(seedIdeas);
  const [selectedIdeaId, setSelectedIdeaId] = useState(1);
  const [ideaText, setIdeaText] = useState("");
  const [ideaImage, setIdeaImage] = useState("");
  const [ideaImageName, setIdeaImageName] = useState("");
  const [ideaEditor, setIdeaEditor] = useState<IdeaCard | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeaCard | null>(null);
  const [referencePackages, setReferencePackages] = useState<
    Record<number, DesignReference[]>
  >(() =>
    Object.fromEntries(
      seedIdeas.map((idea) => [idea.id, inheritedReferences(idea)])
    )
  );
  const [dockOpen, setDockOpen] = useState(false);
  const [ideaMenuOpen, setIdeaMenuOpen] = useState(false);
  const [referenceEditor, setReferenceEditor] = useState<{
    kind: ReferenceKind;
    existing: DesignReference | null;
  } | null>(null);
  const [viewStyle, setViewStyle] = useState<ViewStyle>("exterior");
  const [renderingDesignId, setRenderingDesignId] = useState<number | null>(null);
  const [renderResults, setRenderResults] = useState<Record<number, RenderResult | null>>({});
  const [renderErrors, setRenderErrors] = useState<Record<number, string>>({});
  const [advisingDesignId, setAdvisingDesignId] = useState<number | null>(null);
  const [planAdviceErrors, setPlanAdviceErrors] = useState<Record<number, string>>({});
  const [productDrafts, setProductDrafts] = useState<Record<number, ProductDraft>>(
    () =>
      Object.fromEntries(
        seedIdeas.map((idea) => [idea.id, emptyProductDraft()])
      )
  );
  const [stepEditor, setStepEditor] = useState<PlanStep | "new" | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState([agentGreeting("en")]);
  const [agentAudioName, setAgentAudioName] = useState("");
  const [bakeMode, setBakeMode] = useState<"chef" | "diner">("chef");
  const [productionRows, setProductionRows] = useState<ProductionRow[]>([
    { id: 1, productId: "moon", variantId: null, count: 4 },
    { id: 2, productId: "berry", variantId: null, count: 6 },
    { id: 3, productId: "garden", variantId: null, count: 4 },
  ]);
  const [prices, setPrices] = useState([11.8, 28.5, 18.2, 31.4, 2.4]);
  const [selectedHandbookIdeaIds, setSelectedHandbookIdeaIds] = useState<number[]>([1, 2, 3]);
  const [handbookStylePrompt, setHandbookStylePrompt] = useState("");
  const [handbookReferenceImage, setHandbookReferenceImage] = useState("");
  const [handbookReferenceName, setHandbookReferenceName] = useState("");
  const [handbookResult, setHandbookResult] = useState<HandbookResult | null>(null);
  const [handbookGenerating, setHandbookGenerating] = useState(false);
  const [handbookError, setHandbookError] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement | null>(null);
  const ideaSelectorRef = useRef<HTMLDivElement | null>(null);
  const handbookReferenceRef = useRef<HTMLInputElement | null>(null);

  const selectedIdea =
    ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0] ?? seedIdeas[0];
  const references = referencePackages[selectedIdea.id] ?? [];
  const renderResult = renderResults[selectedIdea.id] ?? null;
  const renderError = renderErrors[selectedIdea.id] ?? "";
  const planAdviceError = planAdviceErrors[selectedIdea.id] ?? "";
  const activeDraft = productDrafts[selectedIdea.id] ?? emptyProductDraft();
  const sizeVariants = activeDraft.variants;
  const materials = activeDraft.materials;
  const planSteps = activeDraft.planSteps;
  const variant = renderResult?.productId ?? ideaVariant(selectedIdea);
  const currentProduct = products[variant];
  const rendering = renderingDesignId === selectedIdea.id;
  const advisingPlan = advisingDesignId === selectedIdea.id;
  const currentIntentSignature = designIntentSignature(
    selectedIdea,
    references
  );
  const renderingIsStale =
    Boolean(renderResult) &&
    (renderResult?.signature !== currentIntentSignature ||
      renderResult?.view !== viewStyle);
  const variantScales = sizeVariants.map((sizeVariant, index) => ({
    id: sizeVariant.id,
    scale:
      index === 0
        ? 1
        : sizeVariantScale(sizeVariant, sizeVariants[0]),
  }));
  const productionVariantsByProduct = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(products) as ProductId[]).map((productId) => {
          const matchingIdea = ideas.find(
            (idea) =>
              (renderResults[idea.id]?.productId ?? ideaVariant(idea)) ===
              productId
          );
          return [
            productId,
            matchingIdea
              ? (productDrafts[matchingIdea.id]?.variants ?? [])
              : [],
          ];
        })
      ) as Record<ProductId, SizeVariant[]>,
    [ideas, productDrafts, renderResults]
  );
  const selectedHandbookIdeas = ideas.filter((idea) =>
    selectedHandbookIdeaIds.includes(idea.id)
  );
  const currentHandbookSignature = hashText(
    [
      language,
      handbookStylePrompt,
      handbookReferenceName,
      handbookReferenceImage
        ? `${handbookReferenceImage.length}:${handbookReferenceImage.slice(0, 36)}:${handbookReferenceImage.slice(-36)}`
        : "",
      ...selectedHandbookIdeas.map((idea) => {
        const artwork = renderResults[idea.id]?.src || idea.image;
        return [
          idea.id,
          idea.title,
          idea.prompt,
          idea.tags.join("|"),
          artwork
            ? `${artwork.length}:${artwork.slice(0, 36)}:${artwork.slice(-36)}`
            : "",
        ].join("::");
      }),
    ].join("||")
  );
  const handbookIsStale =
    Boolean(handbookResult) &&
    handbookResult?.signature !== currentHandbookSignature;
  const stageIndex = stages.findIndex((item) => item.id === stage);

  const setActiveReferences = (update: StateUpdate<DesignReference[]>) =>
    setReferencePackages((current) => {
      const existing = current[selectedIdea.id] ?? inheritedReferences(selectedIdea);
      return {
        ...current,
        [selectedIdea.id]: applyStateUpdate(existing, update),
      };
    });

  const updateActiveDraft = (update: (draft: ProductDraft) => ProductDraft) =>
    setProductDrafts((current) => {
      const existing = current[selectedIdea.id] ?? emptyProductDraft();
      return { ...current, [selectedIdea.id]: update(existing) };
    });

  const setActiveMaterials = (update: StateUpdate<MaterialRow[]>) =>
    updateActiveDraft((draft) => ({
      ...draft,
      materials: applyStateUpdate(draft.materials, update),
    }));

  const setActiveVariants = (update: StateUpdate<SizeVariant[]>) =>
    updateActiveDraft((draft) => ({
      ...draft,
      variants: applyStateUpdate(draft.variants, update),
    }));

  const setActivePlanSteps = (update: StateUpdate<PlanStep[]>) =>
    updateActiveDraft((draft) => ({
      ...draft,
      planSteps: applyStateUpdate(draft.planSteps, update),
    }));

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("dessert-valley-language");
    if (storedLanguage === "en" || storedLanguage === "zh") {
      const timer = window.setTimeout(() => {
        setLanguage(storedLanguage);
        setAgentMessages((current) =>
          current.length === 1 &&
          current.some(
            (message) =>
              message === agentGreeting("en") ||
              message === agentGreeting("zh")
          )
            ? [agentGreeting(storedLanguage)]
            : current
        );
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem("dessert-valley-language", language);
  }, [language]);

  const toggleLanguage = () => {
    const nextLanguage: Language = language === "en" ? "zh" : "en";
    setLanguage(nextLanguage);
    setAgentMessages((current) =>
      current.length === 1 &&
      (current[0] === agentGreeting("en") ||
        current[0] === agentGreeting("zh"))
        ? [agentGreeting(nextLanguage)]
        : current
    );
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        ideaSelectorRef.current &&
        !ideaSelectorRef.current.contains(event.target as Node)
      ) {
        setIdeaMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIdeaMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const notify = (message: string) => setToast(message);

  const openStage = (next: Stage) => {
    setIdeaMenuOpen(false);
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activateIdea = (idea: IdeaCard) => {
    setSelectedIdeaId(idea.id);
    setReferencePackages((current) =>
      current[idea.id]
        ? current
        : { ...current, [idea.id]: inheritedReferences(idea) }
    );
    setProductDrafts((current) =>
      current[idea.id]
        ? current
        : { ...current, [idea.id]: emptyProductDraft() }
    );
    setViewStyle(renderResults[idea.id]?.view ?? "exterior");
  };

  const selectIdea = (idea: IdeaCard) => {
    activateIdea(idea);
    openStage("design");
    notify(
      tr(
        language,
        `${idea.title} opened in the Design Dock`,
        `已在设计坞中打开 ${idea.title}`
      )
    );
  };

  const selectDesignIdea = (idea: IdeaCard) => {
    activateIdea(idea);
    setIdeaMenuOpen(false);
    setDockOpen(false);
    notify(
      tr(
        language,
        `${idea.title} loaded into the Design Dock`,
        `${idea.title} 已载入设计坞`
      )
    );
  };

  const switchActiveDesign = (idea: IdeaCard) => {
    activateIdea(idea);
    notify(
      tr(
        language,
        `${idea.title} is now the active product`,
        `${idea.title} 已设为当前产品`
      )
    );
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
    const words = ideaText
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .split(/\s+/)
      .slice(0, 4);
    const idea: IdeaCard = {
      id: uid(),
      title: words.join(" ") || tr(language, "Untitled Dessert", "未命名甜点"),
      prompt: ideaText.trim(),
      image: ideaImage,
      imageName: ideaImageName,
      tags: ["new", "ready"],
    };
    setIdeas((current) => [idea, ...current]);
    setReferencePackages((current) => ({
      ...current,
      [idea.id]: inheritedReferences(idea),
    }));
    setProductDrafts((current) => ({
      ...current,
      [idea.id]: emptyProductDraft(),
    }));
    setIdeaText("");
    setIdeaImage("");
    setIdeaImageName("");
    notify(tr(language, "Idea added to the gallery", "创意已添加到画廊"));
  };

  const saveIdea = (updatedIdea: IdeaCard) => {
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === updatedIdea.id ? updatedIdea : idea
      )
    );
    setReferencePackages((current) => {
      const existing = current[updatedIdea.id];
      if (!existing) {
        return {
          ...current,
          [updatedIdea.id]: inheritedReferences(updatedIdea),
        };
      }
      return {
        ...current,
        [updatedIdea.id]: existing.map((reference) =>
          reference.inherited && reference.kind === "text"
            ? { ...reference, content: updatedIdea.prompt }
            : reference
        ),
      };
    });
    setIdeaEditor(null);
    notify(tr(language, "Idea card updated", "创意卡已更新"));
  };

  const requestRemoveIdea = (idea: IdeaCard) => {
    if (ideas.length <= 1) {
      notify(
        tr(
          language,
          "Keep at least one idea in the gallery",
          "创意画廊中至少需要保留一个创意"
        )
      );
      return;
    }
    setIdeaToDelete(idea);
  };

  const removeIdea = () => {
    if (!ideaToDelete) return;
    const removedId = ideaToDelete.id;
    const remainingIdeas = ideas.filter((idea) => idea.id !== removedId);
    setIdeas(remainingIdeas);
    setReferencePackages((current) => {
      const next = { ...current };
      delete next[removedId];
      return next;
    });
    setRenderResults((current) => {
      const next = { ...current };
      delete next[removedId];
      return next;
    });
    setRenderErrors((current) => {
      const next = { ...current };
      delete next[removedId];
      return next;
    });
    setProductDrafts((current) => {
      const next = { ...current };
      delete next[removedId];
      return next;
    });
    setSelectedHandbookIdeaIds((current) =>
      current.filter((ideaId) => ideaId !== removedId)
    );
    if (selectedIdeaId === removedId) {
      const nextIdea = remainingIdeas[0];
      setSelectedIdeaId(nextIdea.id);
      setViewStyle(renderResults[nextIdea.id]?.view ?? "exterior");
    }
    if (renderingDesignId === removedId) setRenderingDesignId(null);
    setIdeaToDelete(null);
    notify(tr(language, "Idea removed from the gallery", "创意已从画廊移除"));
  };

  const saveReference = (reference: DesignReference) => {
    setActiveReferences((current) => {
      const exists = current.some((item) => item.id === reference.id);
      return exists
        ? current.map((item) => (item.id === reference.id ? reference : item))
        : [...current, reference];
    });
    setReferenceEditor(null);
    notify(
      reference.inherited
        ? tr(language, "Reference updated", "参考已更新")
        : tr(
            language,
            "Reference added to the intent package",
            "参考已加入意图包"
          )
    );
  };

  const generateRendering = async () => {
    if (!references.length || renderingDesignId !== null) return;
    const idea = selectedIdea;
    const ideaId = idea.id;
    const packageSnapshot = [...references];
    const viewSnapshot = viewStyle;
    const signature = designIntentSignature(idea, packageSnapshot);
    setRenderingDesignId(ideaId);
    setRenderErrors((current) => ({ ...current, [ideaId]: "" }));
    try {
      const apiReferences = await Promise.all(
        packageSnapshot.map(async (reference) => {
          let asset: string | undefined;
          if (
            reference.asset &&
            (reference.kind === "image" || reference.kind === "canvas")
          ) {
            try {
              asset = await normalizeReferenceImage(reference.asset);
            } catch {
              throw new Error("reference_image_failed");
            }
          }
          return {
            kind: reference.kind,
            title: reference.title,
            content: reference.content,
            asset,
          };
        })
      );
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: {
            title: idea.title,
            prompt: idea.prompt,
            tags: idea.tags,
          },
          references: apiReferences,
          view: viewSnapshot,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            image?: string;
            inputCount?: number;
            error?: { code?: string; message?: string };
          }
        | null;
      if (!response.ok || !payload?.image) {
        throw new Error(payload?.error?.code || "generation_failed");
      }
      const generatedImage = payload.image;
      const influences = Array.from(
        new Set(packageSnapshot.map((reference) => reference.kind))
      );
      setRenderResults((current) => ({
        ...current,
        [ideaId]: {
          src: generatedImage,
          productId: intentProductId(idea, packageSnapshot),
          signature,
          influences,
          view: viewSnapshot,
          inputs: payload.inputCount ?? packageSnapshot.length,
        },
      }));
      notify(tr(language, "Intent-aware rendering ready", "意图渲染已完成"));
    } catch (error) {
      const code = error instanceof Error ? error.message : "generation_failed";
      const message =
        code === "not_configured"
          ? tr(
              language,
              "Image generation is not configured.",
              "图片生成功能尚未配置。"
            )
          : code === "rate_limit"
            ? tr(
                language,
                "The image studio is busy. Try again in a moment.",
                "图像工作室正忙，请稍后再试。"
              )
            : code === "moderation_blocked"
              ? tr(
                  language,
                  "Revise the prompt or reference images, then try again.",
                  "请调整文字或参考图片后重试。"
                )
              : code === "request_too_large"
                ? tr(
                    language,
                    "The reference package is too large. Remove a large image and try again.",
                    "参考包过大，请移除一张大图后重试。"
                  )
                : code === "reference_image_failed"
                  ? tr(
                      language,
                      "A reference image could not be prepared. Try PNG, JPG, or WEBP.",
                      "无法处理某张参考图，请改用 PNG、JPG 或 WEBP。"
                    )
                  : tr(
                      language,
                      "The intent package could not be rendered. Please try again.",
                      "暂时无法渲染此意图包，请重试。"
                    );
      setRenderErrors((current) => ({ ...current, [ideaId]: message }));
      notify(message);
    } finally {
      setRenderingDesignId((current) => (current === ideaId ? null : current));
    }
  };

  const saveActiveRendering = (continueToProduct: boolean) => {
    if (!renderResult || renderingIsStale || rendering) {
      notify(
        tr(
          language,
          "Render the latest intent before saving.",
          "请先根据最新意图生成渲染图后再保存。"
        )
      );
      return;
    }

    const savedImageName = `${
      selectedIdea.title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "dessert"
    }-${renderResult.view}-rendering.png`;

    setIdeas((current) =>
      current.map((idea) =>
        idea.id === selectedIdea.id
          ? {
              ...idea,
              image: renderResult.src,
              imageName: savedImageName,
            }
          : idea
      )
    );

    if (continueToProduct) {
      openStage("product");
      notify(
        tr(
          language,
          "Rendering saved. Opening the recipe bench.",
          "渲染图已保存，正在进入配方工作台。"
        )
      );
      return;
    }

    notify(
      tr(
        language,
        "Rendering saved to the idea card.",
        "渲染图已保存并更新创意卡。"
      )
    );
  };

  const addVariant = () =>
    setActiveVariants((current) => [
      ...current,
      {
        id: uid(),
        name: tr(
          language,
          `Variant ${current.length + 1}`,
          `规格 ${current.length + 1}`
        ),
        width: "",
        height: "",
        depth: "",
        unit: "cm",
      },
    ]);

  const updateVariant = (id: number, patch: Partial<SizeVariant>) =>
    setActiveVariants((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  const addMaterial = () =>
    setActiveMaterials((current) => [
      ...current,
      { id: uid(), name: "", amount: "", unit: "g", note: "" },
    ]);

  const updateMaterial = (id: number, patch: Partial<MaterialRow>) =>
    setActiveMaterials((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const advisePlan = async () => {
    if (advisingDesignId !== null) return;
    const namedMaterials = materials.filter((row) => row.name.trim());
    if (!namedMaterials.length) {
      notify(
        tr(
          language,
          "Add at least one named material before asking AI for advice.",
          "请先添加至少一种有名称的材料，再请求 AI 建议。"
        )
      );
      return;
    }

    const ideaSnapshot = selectedIdea;
    const ideaId = ideaSnapshot.id;
    const languageSnapshot = language;
    const referencesSnapshot = references.map((reference) => ({
      kind: reference.kind,
      title: reference.title,
      content: reference.content,
    }));
    const variantsSnapshot = sizeVariants.map((sizeVariant, index) => ({
      name: sizeVariant.name,
      width: sizeVariant.width,
      height: sizeVariant.height,
      depth: sizeVariant.depth,
      unit: sizeVariant.unit,
      scale:
        index === 0
          ? 1
          : sizeVariantScale(sizeVariant, sizeVariants[0]),
    }));
    const materialsSnapshot = namedMaterials.map((row) => ({
      name: row.name,
      amount: row.amount,
      unit: row.unit,
      note: row.note,
      variantAmounts: variantsSnapshot.flatMap((sizeVariant) => {
        const adjusted = Number(row.amount) * sizeVariant.scale;
        return row.amount && Number.isFinite(adjusted)
          ? [
              {
                variantName: sizeVariant.name,
                amount: `${adjusted.toFixed(adjusted < 10 ? 2 : 1)} ${row.unit}`.trim(),
              },
            ]
          : [];
      }),
    }));
    const existingStepsSnapshot = planSteps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
    }));

    setAdvisingDesignId(ideaId);
    setPlanAdviceErrors((current) => ({ ...current, [ideaId]: "" }));
    try {
      const response = await fetch("/api/plan-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: languageSnapshot,
          product: {
            title: ideaSnapshot.title,
            description: ideaSnapshot.prompt,
            tags: ideaSnapshot.tags,
            designReferences: referencesSnapshot,
            renderingView: renderResult?.view ?? null,
          },
          variants: variantsSnapshot,
          materials: materialsSnapshot,
          existingSteps: existingStepsSnapshot,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            steps?: Array<{ title?: string; instruction?: string }>;
            error?: { code?: string; message?: string };
          }
        | null;
      const suggestions: PlanStep[] =
        payload?.steps
          ?.filter(
            (step) =>
              typeof step.title === "string" &&
              step.title.trim() &&
              typeof step.instruction === "string" &&
              step.instruction.trim()
          )
          .map((step) => ({
            id: uid(),
            title: step.title?.trim() ?? "",
            instruction: step.instruction?.trim() ?? "",
            image: "",
          })) ?? [];
      if (!response.ok || !suggestions.length) {
        throw new Error(payload?.error?.code || "advice_failed");
      }

      setProductDrafts((current) => {
        const draft = current[ideaId] ?? emptyProductDraft();
        return {
          ...current,
          [ideaId]: {
            ...draft,
            planSteps: [...draft.planSteps, ...suggestions],
          },
        };
      });
      notify(
        tr(
          languageSnapshot,
          `Muse added ${suggestions.length} material-aware steps`,
          `缪斯已添加 ${suggestions.length} 个基于材料的步骤`
        )
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "advice_failed";
      const message =
        code === "not_configured"
          ? tr(
              languageSnapshot,
              "AI making-plan advice is not configured.",
              "AI 制作方案功能尚未配置。"
            )
          : code === "rate_limit"
            ? tr(
                languageSnapshot,
                "The pastry advisor is busy. Try again in a moment.",
                "甜点顾问正忙，请稍后再试。"
              )
            : code === "advice_blocked"
              ? tr(
                  languageSnapshot,
                  "Revise the product brief or material notes, then try again.",
                  "请调整产品说明或材料备注后重试。"
                )
              : code === "request_too_large"
                ? tr(
                    languageSnapshot,
                    "The recipe context is too large. Shorten a few notes and try again.",
                    "配方上下文过大，请缩短部分备注后重试。"
                  )
                : tr(
                    languageSnapshot,
                    "The AI could not prepare making advice. Please try again.",
                    "AI 暂时无法生成制作建议，请重试。"
                  );
      setPlanAdviceErrors((current) => ({ ...current, [ideaId]: message }));
      notify(message);
    } finally {
      setAdvisingDesignId((current) => (current === ideaId ? null : current));
    }
  };

  const saveStep = (step: PlanStep) => {
    setActivePlanSteps((current) => {
      const exists = current.some((item) => item.id === step.id);
      return exists
        ? current.map((item) => (item.id === step.id ? step : item))
        : [...current, step];
    });
    setStepEditor(null);
    notify(tr(language, "Making step saved", "制作步骤已保存"));
  };

  const updateProduction = (id: number, patch: Partial<ProductionRow>) =>
    setProductionRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const addProductionBatch = () => {
    const nextId = uid();
    const defaultVariants = productionVariantsByProduct.moon;
    setProductionRows((current) => [
      ...current,
      {
        id: nextId,
        productId: "moon",
        variantId: defaultVariants[0]?.id ?? null,
        count: 1,
      },
    ]);
  };

  const countsByProduct = useMemo(
    () =>
      productionRows.reduce(
        (totals, row) => {
          const variants = productionVariantsByProduct[row.productId];
          const selectedVariant =
            variants.find((variant) => variant.id === row.variantId) ??
            variants[0];
          const scale =
            selectedVariant && variants[0]
              ? sizeVariantScale(selectedVariant, variants[0])
              : 1;
          totals[row.productId] += Math.max(0, row.count) * scale;
          return totals;
        },
        { moon: 0, berry: 0, garden: 0 }
      ),
    [productionRows, productionVariantsByProduct]
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
    const exportableReferences = Object.fromEntries(
      Object.entries(referencePackages).map(([ideaId, packageReferences]) => [
        ideaId,
        packageReferences.map(({ asset, ...reference }) => ({
          ...reference,
          hasAsset: Boolean(asset),
        })),
      ])
    );
    const exportableDrafts = Object.fromEntries(
      Object.entries(productDrafts).map(([ideaId, draft]) => [
        ideaId,
        {
          ...draft,
          planSteps: draft.planSteps.map(({ image, ...step }) => ({
            ...step,
            hasImage: Boolean(image),
          })),
        },
      ])
    );
    const data = {
      format: "dessert-valley-card-pack",
      exportedAt: new Date().toISOString(),
      ideas,
      selectedIdeaId,
      referencePackages: exportableReferences,
      productDrafts: exportableDrafts,
      productionRows,
      handbook: {
        selectedIdeaIds: selectedHandbookIdeaIds,
        stylePrompt: handbookStylePrompt,
      },
    };
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      "dessert-valley-card-pack.json"
    );
    notify(tr(language, "Card pack exported", "卡片包已导出"));
  };

  const importCards = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (Array.isArray(payload.ideas)) setIdeas(payload.ideas);
      const importedProductionRows = normalizeProductionRows(
        payload.productionRows
      );
      if (importedProductionRows) {
        setProductionRows(importedProductionRows);
      }
      if (payload.referencePackages && typeof payload.referencePackages === "object") {
        setReferencePackages(payload.referencePackages);
      }
      if (payload.productDrafts && typeof payload.productDrafts === "object") {
        setProductDrafts(payload.productDrafts);
      }
      if (payload.handbook && typeof payload.handbook === "object") {
        if (Array.isArray(payload.handbook.selectedIdeaIds)) {
          setSelectedHandbookIdeaIds(payload.handbook.selectedIdeaIds);
        }
        if (typeof payload.handbook.stylePrompt === "string") {
          setHandbookStylePrompt(payload.handbook.stylePrompt);
        }
      }
      notify(tr(language, "Card pack imported", "卡片包已导入"));
    } catch {
      notify(
        tr(
          language,
          "This card pack could not be read",
          "无法读取此卡片包"
        )
      );
    }
    event.target.value = "";
  };

  const handleHandbookReference = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setHandbookReferenceImage(await readFileAsDataUrl(file));
      setHandbookReferenceName(file.name);
      setHandbookError("");
    } catch {
      notify(
        tr(
          language,
          "The reference image could not be read.",
          "无法读取该参考图片。"
        )
      );
    }
    event.target.value = "";
  };

  const generateHandbook = async () => {
    if (handbookGenerating) return;
    if (!selectedHandbookIdeas.length) {
      notify(
        tr(
          language,
          "Choose at least one dessert card for the handbook.",
          "请至少选择一张甜点卡片。"
        )
      );
      return;
    }

    const languageSnapshot = language;
    const signatureSnapshot = currentHandbookSignature;
    const selectedSnapshot = [...selectedHandbookIdeas];
    const stylePromptSnapshot = handbookStylePrompt;
    const styleReferenceSnapshot = handbookReferenceImage;
    const styleReferenceNameSnapshot = handbookReferenceName;
    const maximumDessertVisuals = styleReferenceSnapshot ? 5 : 6;

    setHandbookGenerating(true);
    setHandbookError("");
    try {
      let normalizedStyleReference: string | undefined;
      if (styleReferenceSnapshot) {
        try {
          normalizedStyleReference = await normalizeReferenceImage(
            styleReferenceSnapshot
          );
        } catch {
          throw new Error("reference_image_failed");
        }
      }

      const desserts = await Promise.all(
        selectedSnapshot.map(async (idea, index) => {
          const source = renderResults[idea.id]?.src || idea.image;
          let asset: string | undefined;
          if (source && index < maximumDessertVisuals) {
            try {
              asset = await normalizeReferenceImage(source);
            } catch {
              // A written dessert description still keeps this card useful.
            }
          }
          return {
            title: localizedIdeaName(idea, languageSnapshot),
            description: idea.prompt,
            tags: idea.tags,
            asset,
          };
        })
      );

      const response = await fetch("/api/handbook-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: languageSnapshot,
          stylePrompt: stylePromptSnapshot,
          styleReference: normalizedStyleReference
            ? {
                name:
                  styleReferenceNameSnapshot ||
                  tr(
                    languageSnapshot,
                    "Uploaded style reference",
                    "上传的风格参考"
                  ),
                asset: normalizedStyleReference,
              }
            : undefined,
          desserts,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            image?: string;
            dessertCount?: number;
            visualInputCount?: number;
            error?: { code?: string; message?: string };
          }
        | null;
      if (!response.ok || !payload?.image) {
        throw new Error(payload?.error?.code || "generation_failed");
      }
      setHandbookResult({
        src: payload.image,
        signature: signatureSnapshot,
        dessertCount: payload.dessertCount ?? selectedSnapshot.length,
        visualInputCount: payload.visualInputCount ?? 0,
      });
      notify(
        tr(
          languageSnapshot,
          "AI handbook artwork is ready",
          "AI 手册视觉已生成"
        )
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "generation_failed";
      const message =
        code === "not_configured"
          ? tr(
              languageSnapshot,
              "AI handbook generation is not configured.",
              "AI 手册生成功能尚未配置。"
            )
          : code === "rate_limit"
            ? tr(
                languageSnapshot,
                "The handbook studio is busy. Try again in a moment.",
                "手册工作室正忙，请稍后再试。"
              )
            : code === "moderation_blocked"
              ? tr(
                  languageSnapshot,
                  "Revise the style prompt or reference image, then try again.",
                  "请调整风格提示词或参考图片后重试。"
                )
              : code === "request_too_large"
                ? tr(
                    languageSnapshot,
                    "The reference package is too large. Use a smaller image.",
                    "参考包过大，请使用更小的图片。"
                  )
                : code === "reference_image_failed"
                  ? tr(
                      languageSnapshot,
                      "The style image could not be prepared. Try PNG, JPG, or WEBP.",
                      "无法处理风格图片，请改用 PNG、JPG 或 WEBP。"
                    )
                  : tr(
                      languageSnapshot,
                      "The AI could not generate this handbook. Please try again.",
                      "AI 暂时无法生成该手册，请重试。"
                    );
      setHandbookError(message);
      notify(message);
    } finally {
      setHandbookGenerating(false);
    }
  };

  const exportHandbookHTML = () => {
    if (!selectedHandbookIdeas.length) {
      notify(
        tr(
          language,
          "Choose at least one dessert card before exporting.",
          "请至少选择一张甜点卡片后再导出。"
        )
      );
      return;
    }
    const cards = selectedHandbookIdeas
      .map(
        (idea, index) =>
          `<article><span>${String(index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(
            localizedIdeaName(idea, language)
          )}</h2><p>${escapeHtml(idea.prompt)}</p></div></article>`
      )
      .join("");
    const handbookTitle = tr(language, "Dessert Handbook", "甜点手册");
    const artwork = handbookResult?.src
      ? `<img class="artwork" src="${handbookResult.src}" alt="">`
      : "";
    const html = `<!doctype html><html lang="${
      language === "zh" ? "zh-CN" : "en"
    }"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dessert Valley — ${escapeHtml(
      handbookTitle
    )}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#d9a441;color:#2f2926;font-family:ui-serif,Georgia,"Songti SC",serif}.page{position:relative;width:210mm;min-height:297mm;margin:auto;overflow:hidden;background:#f4dfa8}.artwork{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.paper{position:relative;z-index:1;min-height:267mm;margin:15mm;padding:16mm;background:rgba(255,240,189,.91);border:2px solid #70452e;box-shadow:inset 0 0 0 5px rgba(244,223,168,.86)}header{padding-bottom:12mm;border-bottom:2px solid #70452e}header small{font:700 9pt ui-monospace,monospace;letter-spacing:.18em;color:#3f713d}h1{margin:4mm 0 0;font-size:28pt}article{display:grid;grid-template-columns:10mm 1fr;gap:5mm;padding:7mm 0;border-bottom:1px solid rgba(112,69,46,.45)}article>span{font:700 9pt ui-monospace,monospace;color:#3f713d}h2{margin:0 0 2mm;font-size:15pt}article p{margin:0;font:10pt/1.55 system-ui,sans-serif;color:#4a4038}@media(max-width:800px){.page{width:100%;min-height:100vh}.paper{min-height:calc(100vh - 32px);margin:16px;padding:28px}}@media print{body{background:white}.page{margin:0}}</style></head><body><main class="page">${artwork}<section class="paper"><header><small>DESSERT VALLEY</small><h1>${escapeHtml(
      handbookTitle
    )}</h1></header>${cards}</section></main></body></html>`;
    downloadBlob(new Blob([html], { type: "text/html" }), "dessert-valley-handbook.html");
    notify(tr(language, "HTML handbook exported", "HTML 手册已导出"));
  };

  const exportHandbookPNG = async () => {
    if (!selectedHandbookIdeas.length) {
      notify(
        tr(
          language,
          "Choose at least one dessert card before exporting.",
          "请至少选择一张甜点卡片后再导出。"
        )
      );
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = Math.max(1800, 520 + selectedHandbookIdeas.length * 190);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#e7c971";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (handbookResult?.src) {
      try {
        const artwork = await loadCanvasImage(handbookResult.src);
        drawImageCover(context, artwork, canvas.width, canvas.height);
      } catch {
        // The typographic handbook remains exportable without the artwork.
      }
    }
    context.fillStyle = "rgba(255, 240, 189, .91)";
    context.fillRect(68, 68, canvas.width - 136, canvas.height - 136);
    context.strokeStyle = "#70452e";
    context.lineWidth = 5;
    context.strokeRect(68, 68, canvas.width - 136, canvas.height - 136);
    context.strokeStyle = "rgba(112, 69, 46, .45)";
    context.lineWidth = 2;
    context.strokeRect(82, 82, canvas.width - 164, canvas.height - 164);
    context.textAlign = "left";
    context.fillStyle = "#3f713d";
    context.font = "700 25px ui-monospace, monospace";
    context.fillText("DESSERT VALLEY", 132, 160);
    context.fillStyle = "#2f2926";
    context.font = '700 62px Georgia, "Songti SC", serif';
    context.fillText(tr(language, "Dessert Handbook", "甜点手册"), 132, 242);
    context.fillStyle = "#70452e";
    context.fillRect(132, 286, canvas.width - 264, 3);

    let y = 370;
    selectedHandbookIdeas.forEach((idea, index) => {
      context.fillStyle = "#3f713d";
      context.font = "700 22px ui-monospace, monospace";
      context.fillText(String(index + 1).padStart(2, "0"), 132, y + 6);
      context.fillStyle = "#2f2926";
      context.font = '700 34px Georgia, "Songti SC", serif';
      const nameLines = wrapCanvasText(
        context,
        localizedIdeaName(idea, language),
        820,
        2
      );
      nameLines.forEach((line, lineIndex) => {
        context.fillText(line, 210, y + lineIndex * 42);
      });
      const descriptionY = y + nameLines.length * 42 + 12;
      context.fillStyle = "#4a4038";
      context.font = '22px system-ui, "PingFang SC", sans-serif';
      const descriptionLines = wrapCanvasText(
        context,
        idea.prompt,
        820,
        3
      );
      descriptionLines.forEach((line, lineIndex) => {
        context.fillText(line, 210, descriptionY + lineIndex * 31);
      });
      y += Math.max(175, nameLines.length * 42 + descriptionLines.length * 31 + 58);
      context.fillStyle = "rgba(112, 69, 46, .28)";
      context.fillRect(210, y - 28, 820, 2);
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, "dessert-valley-handbook.png");
      notify(tr(language, "Image handbook exported", "图片手册已导出"));
    });
  };

  const sendAgentMessage = () => {
    if (!agentInput.trim() && !agentAudioName) return;
    const userMessage =
      agentInput.trim() ||
      tr(
        language,
        `Voice note: ${agentAudioName}`,
        `语音记录：${agentAudioName}`
      );
    setAgentMessages((current) => [
      ...current,
      userMessage,
      tr(
        language,
        "Muse suggests testing one small portion first, then recording temperature and texture before scaling.",
        "缪斯建议先测试一个小份，再记录温度与质地后进行放大。"
      ),
    ]);
    setAgentInput("");
    setAgentAudioName("");
  };

  return (
    <>
      <a className="skip-link" href="#atelier-workspace">
        {tr(language, "Skip to atelier workspace", "跳转到工作区")}
      </a>
      <div className="pixel-app">
      <div className="world-scenery" aria-hidden="true">
        <span className="pixel-sun" />
        <span className="pixel-cloud cloud-one" />
        <span className="pixel-cloud cloud-two" />
        <span className="distant-hill hill-one" />
        <span className="distant-hill hill-two" />
        <span className="orchard-tree tree-left" />
        <span className="orchard-tree tree-right" />
        <span className="fence-line" />
      </div>
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => openStage("idea")}
          aria-label={tr(language, "Dessert Valley home", "甜点谷首页")}
        >
          <span className="brand-mark"><Sprout size={18} /></span>
          <span>
            <strong>Dessert Valley</strong>
            <small>{tr(language, "riverside pastry studio", "河畔甜点工坊")}</small>
          </span>
        </button>
        <nav
          className="stage-nav"
          aria-label={tr(language, "Dessert workflow", "甜点工作流程")}
        >
          {stages.map((item, index) => {
            const Icon = item.icon;
            const itemCopy = stageCopy[language][item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={cn(item.id === stage && "active", index < stageIndex && "complete")}
                onClick={() => openStage(item.id)}
                aria-current={item.id === stage ? "step" : undefined}
              >
                <span><Icon size={15} /></span>
                <strong>{itemCopy.label}</strong>
                <small>{itemCopy.hint}</small>
              </button>
            );
          })}
        </nav>
        <div className="top-actions">
          <button
            className="square-button"
            type="button"
            onClick={() => importRef.current?.click()}
            aria-label={tr(language, "Import cards", "导入卡片")}
            data-tip={tr(language, "Import cards", "导入卡片")}
          >
            <Import size={16} />
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={importCards} hidden />
          <button
            className="square-button"
            type="button"
            onClick={exportCards}
            aria-label={tr(language, "Export cards", "导出卡片")}
            data-tip={tr(language, "Export cards", "导出卡片")}
          >
            <Download size={16} />
          </button>
          <button
            className="language-button"
            type="button"
            onClick={toggleLanguage}
            aria-label={tr(language, "Switch to Chinese", "切换到英文")}
            data-tip={tr(language, "Switch to Chinese", "切换到英文")}
          >
            <Languages size={16} />
            <span>{language === "en" ? "中文" : "EN"}</span>
          </button>
          <span className="avatar">D</span>
        </div>
      </header>

      <main className="workspace" id="atelier-workspace" tabIndex={-1}>
        {stage === "idea" && (
          <section className="stage-section idea-stage">
            <div className="stage-intro">
              <span className="stage-kicker">
                <Sprout size={14} /> {tr(language, "Idea garden", "创意花园")}
              </span>
              <h1>
                {tr(language, "Dream a dessert worth making.", "构想一款值得制作的甜点。")}
              </h1>
              <p>
                {tr(
                  language,
                  "Gather a spark, shape it visually, build the recipe, then carry it into bake day.",
                  "收集灵感、塑造视觉、建立配方，再把它带进烘焙日。"
                )}
              </p>
            </div>

            <div className="idea-composer pixel-panel">
              <textarea
                value={ideaText}
                onChange={(event) => setIdeaText(event.target.value)}
                placeholder={tr(
                  language,
                  "A tiny chestnut tart with maple cream and a little acorn lid…",
                  "一款迷你栗子挞，配枫糖奶油和小橡果造型顶盖……"
                )}
                aria-label={tr(language, "Dessert idea", "甜点创意")}
              />
              <div className="composer-footer">
                <div className="composer-assets">
                  <label className={cn("tool-chip", ideaImage && "active")}>
                    <ImagePlus size={15} />
                    {ideaImageName || tr(language, "Add image", "添加图片")}
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
                      aria-label={tr(language, "Remove idea image", "移除创意图片")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button className="button primary" type="button" onClick={addIdea} disabled={!ideaText.trim()}>
                  <Plus size={15} /> {tr(language, "Add to gallery", "添加到画廊")}
                </button>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <h2>{tr(language, "Idea gallery", "创意画廊")}</h2>
                <p>
                  {tr(
                    language,
                    `${ideas.length} ready to design`,
                    `${ideas.length} 个创意可进入设计`
                  )}
                </p>
              </div>
            </div>
            <div className="idea-gallery">
              {ideas.map((idea) => (
                <article className="idea-tile pixel-panel" key={idea.id}>
                  <div className="idea-thumb">
                    {idea.image ? (
                      <img
                        src={idea.image}
                        alt={tr(
                          language,
                          `${idea.title} concept rendering`,
                          `${idea.title} 创意渲染图`
                        )}
                        decoding="async"
                      />
                    ) : (
                      <span><CakeSlice size={28} /></span>
                    )}
                    <div className="idea-card-actions">
                      <button
                        className="square-button mini"
                        type="button"
                        onClick={() => setIdeaEditor(idea)}
                        aria-label={tr(
                          language,
                          `Edit ${idea.title}`,
                          `编辑 ${idea.title}`
                        )}
                        title={tr(language, "Edit idea", "编辑创意")}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="square-button mini danger"
                        type="button"
                        onClick={() => requestRemoveIdea(idea)}
                        aria-label={tr(
                          language,
                          `Remove ${idea.title}`,
                          `移除 ${idea.title}`
                        )}
                        title={tr(language, "Remove idea", "移除创意")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <span className="ready-flag">
                      <Check size={12} /> {tr(language, "ready", "就绪")}
                    </span>
                  </div>
                  <div className="idea-copy">
                    <h3>{idea.title}</h3>
                    <p>{idea.prompt}</p>
                    <div className="tag-row">
                      {idea.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                    <button className="button text-button" type="button" onClick={() => selectIdea(idea)}>
                      {tr(language, "Open design dock", "打开设计坞")} <ArrowRight size={15} />
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
                <span className="stage-kicker">
                  <Pencil size={14} /> {tr(language, "Design dock", "设计坞")}
                </span>
                <h1>{tr(language, "Shape the feeling into form.", "把感受塑造成形。")}</h1>
                <p>
                  {tr(
                    language,
                    "Collect only the references that matter. Together, they become one clear rendering intent.",
                    "只收集真正重要的参考，让它们共同形成清晰的渲染意图。"
                  )}
                </p>
              </div>
              <div className="selected-idea-wrap" ref={ideaSelectorRef}>
                <button
                  className="selected-idea"
                  type="button"
                  onClick={() => setIdeaMenuOpen((current) => !current)}
                  aria-haspopup="listbox"
                  aria-expanded={ideaMenuOpen}
                  aria-label={tr(
                    language,
                    `Select an idea. Currently designing ${selectedIdea.title}`,
                    `选择创意，当前正在设计 ${selectedIdea.title}`
                  )}
                >
                  {selectedIdea.image ? (
                    <img src={selectedIdea.image} alt="" />
                  ) : (
                    <span className="selected-idea-placeholder">
                      <CakeSlice size={19} />
                    </span>
                  )}
                  <span>
                    <small>{tr(language, "Designing", "正在设计")}</small>
                    <strong>{selectedIdea.title}</strong>
                  </span>
                  <ChevronDown
                    className={cn("selected-idea-chevron", ideaMenuOpen && "open")}
                    size={17}
                  />
                </button>
                {ideaMenuOpen && (
                  <div
                    className="selected-idea-menu"
                    role="listbox"
                    aria-label={tr(language, "Idea gallery", "创意画廊")}
                  >
                    {ideas.map((idea) => {
                      const selected = idea.id === selectedIdea.id;
                      return (
                        <button
                          key={idea.id}
                          className={cn("selected-idea-option", selected && "active")}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => selectDesignIdea(idea)}
                        >
                          {idea.image ? (
                            <img src={idea.image} alt="" />
                          ) : (
                            <span className="selected-idea-placeholder">
                              <CakeSlice size={16} />
                            </span>
                          )}
                          <span>
                            <strong>{idea.title}</strong>
                            <small>
                              {renderResults[idea.id]
                                ? tr(language, "Rendering ready", "已有渲染")
                                : tr(language, "Ready to design", "可开始设计")}
                            </small>
                          </span>
                          {selected && <Check size={16} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="design-grid">
              <section className="dock-panel pixel-panel">
                <header className="panel-heading">
                  <div>
                    <span className="panel-icon"><PackageCheck size={17} /></span>
                    <span>
                      <strong>{tr(language, "Intent package", "意图包")}</strong>
                      <small>
                        {tr(
                          language,
                          `${references.length} references linked`,
                          `已关联 ${references.length} 个参考`
                        )}
                      </small>
                    </span>
                  </div>
                  <div className="dock-add-wrap">
                    <button
                      className="add-reference-button"
                      type="button"
                      onClick={() => setDockOpen((current) => !current)}
                      aria-expanded={dockOpen}
                    >
                      <Plus size={18} /> {tr(language, "Add", "添加")}
                      <ChevronDown size={14} />
                    </button>
                    {dockOpen && (
                      <div className="dock-menu" role="menu">
                        {(Object.keys(referenceMeta) as ReferenceKind[]).map((kind) => {
                          const meta = referenceMeta[kind];
                          const metaCopy = referenceCopy[language][kind];
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
                                <strong>{metaCopy.label}</strong>
                                <small>{metaCopy.helper}</small>
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
                    const metaCopy = referenceCopy[language][reference.kind];
                    const Icon = meta.icon;
                    return (
                      <article className="reference-card" key={reference.id}>
                        <div className={cn("reference-preview", `kind-${reference.kind}`)}>
                          {reference.asset && (reference.kind === "image" || reference.kind === "canvas") ? (
                            <img
                              src={reference.asset}
                              alt={tr(
                                language,
                                `${reference.title} reference`,
                                `${reference.title} 参考`
                              )}
                              decoding="async"
                            />
                          ) : reference.kind === "audio" && reference.asset ? (
                            <Volume2 size={23} />
                          ) : (
                            <Icon size={23} />
                          )}
                          <span>{metaCopy.label}</span>
                        </div>
                        <div className="reference-card-copy">
                          <div>
                            <strong>{reference.title}</strong>
                            {reference.inherited && (
                              <small className="inherited-pill">
                                {tr(language, "from idea", "来自创意")}
                              </small>
                            )}
                          </div>
                          <p>
                            {reference.content ||
                              tr(language, "Visual reference", "视觉参考")}
                          </p>
                          {reference.kind === "audio" && reference.asset && (
                            <audio controls src={reference.asset} />
                          )}
                        </div>
                        <div className="card-actions">
                          <button
                            className="square-button mini"
                            type="button"
                            onClick={() => setReferenceEditor({ kind: reference.kind, existing: reference })}
                            aria-label={tr(
                              language,
                              `Edit ${reference.title}`,
                              `编辑 ${reference.title}`
                            )}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="square-button mini danger"
                            type="button"
                            onClick={() =>
                              setActiveReferences((current) =>
                                current.filter((item) => item.id !== reference.id)
                              )
                            }
                            aria-label={tr(
                              language,
                              `Delete ${reference.title}`,
                              `删除 ${reference.title}`
                            )}
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
                    <span>{tr(language, "Add another reference", "继续添加参考")}</span>
                  </button>
                </div>
              </section>

              <aside className="muse-panel pixel-panel">
                <header className="panel-heading">
                  <div>
                    <span className="panel-icon muse"><WandSparkles size={17} /></span>
                    <span>
                      <strong>{tr(language, "Pastry Muse", "甜点缪斯")}</strong>
                      <small>{tr(language, "Product rendering", "产品渲染")}</small>
                    </span>
                  </div>
                </header>
                <div
                  className="view-switch"
                  role="group"
                  aria-label={tr(language, "Rendering view", "渲染视图")}
                >
                  <button
                    className={cn(viewStyle === "exterior" && "active")}
                    type="button"
                    onClick={() => setViewStyle("exterior")}
                  >
                    {tr(language, "Exterior", "外观")}
                  </button>
                  <button
                    className={cn(viewStyle === "cutaway" && "active")}
                    type="button"
                    onClick={() => setViewStyle("cutaway")}
                  >
                    {tr(language, "Cutaway", "剖面")}
                  </button>
                </div>
                <div className={cn("muse-result", rendering && "loading")}>
                  {rendering ? (
                    <div className="render-loader">
                      <LoaderCircle size={25} />
                      <strong>
                        {tr(
                          language,
                          `Generating from ${references.length} linked references`,
                          `正在根据 ${references.length} 个关联参考生成`
                        )}
                      </strong>
                      <small>
                        {tr(
                          language,
                          "text · reference images · canvas · annotations",
                          "文字 · 参考图 · 画布 · 注释"
                        )}
                      </small>
                    </div>
                  ) : renderResult ? (
                    <>
                      <img
                        src={renderResult.src}
                        alt={tr(
                          language,
                          `${renderResult.view} product rendering of ${selectedIdea.title}`,
                          `${selectedIdea.title} 的${renderResult.view === "cutaway" ? "剖面" : "外观"}产品渲染图`
                        )}
                      />
                      <span className="view-badge">
                        {renderResult.view === "cutaway"
                          ? tr(language, "cutaway", "剖面")
                          : tr(language, "exterior", "外观")}
                      </span>
                    </>
                  ) : (
                    <div className="result-empty">
                      <Sparkles size={25} />
                      <strong>{tr(language, "No rendering yet", "尚未渲染")}</strong>
                      <small>
                        {tr(
                          language,
                          "Choose a view, then send the intent package.",
                          "选择视图后发送意图包。"
                        )}
                      </small>
                    </div>
                  )}
                </div>
                {renderError && (
                  <div className="render-error" role="alert">
                    <X size={14} />
                    <span>{renderError}</span>
                  </div>
                )}
                {renderResult && (
                  <div className="render-summary">
                    <Layers3 size={14} />
                    <span>
                      {renderingIsStale
                        ? tr(
                            language,
                            "View or intent package changed — render again to update this image.",
                            "视图或意图包已变化，请重新渲染以更新图片。"
                          )
                        : tr(
                            language,
                            `${renderResult.inputs} references combined · ${renderResult.influences.join(
                              " + "
                            )}`,
                            `已合并 ${renderResult.inputs} 个参考 · ${renderResult.influences
                              .map((kind) => referenceCopy.zh[kind].label)
                              .join(" + ")}`
                          )}
                    </span>
                  </div>
                )}
                <button
                  className="button primary full"
                  type="button"
                  onClick={generateRendering}
                  disabled={renderingDesignId !== null || references.length === 0}
                >
                  {rendering ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
                  {rendering
                    ? tr(language, "Rendering intent…", "正在渲染意图……")
                    : renderingIsStale
                      ? tr(language, "Update rendering", "更新渲染")
                      : tr(language, "Product rendering", "产品渲染")}
                </button>
                <div className="muse-save-actions">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => saveActiveRendering(false)}
                    disabled={!renderResult || renderingIsStale || rendering}
                  >
                    <Check size={15} />
                    {tr(language, "Save", "保存")}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => saveActiveRendering(true)}
                    disabled={!renderResult || renderingIsStale || rendering}
                  >
                    {tr(
                      language,
                      "Save & build recipe",
                      "保存并进行配方"
                    )}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}

        {stage === "product" && (
          <section className="stage-section product-stage">
            <div className="stage-intro">
              <span className="stage-kicker">
                <CakeSlice size={14} /> {tr(language, "Product bench", "产品工作台")}
              </span>
              <h1>
                {tr(language, "Turn the sketch into a recipe.", "把设计转化为配方。")}
              </h1>
              <p>
                {tr(
                  language,
                  "Choose an active design, define its variants, then build the materials and making plan.",
                  "选择当前设计、定义多个规格，再建立材料用量与制作方案。"
                )}
              </p>
            </div>

            <section className="active-design-switcher pixel-panel">
              <div className="section-heading inline">
                <div>
                  <h2>{tr(language, "Active design", "当前设计")}</h2>
                  <p>
                    {tr(
                      language,
                      "Switch products without losing each design’s recipe draft.",
                      "切换产品时，每个设计的配方草稿都会保留。"
                    )}
                  </p>
                </div>
              </div>
              <div className="active-design-list" role="list">
                {ideas.map((idea) => {
                  const ideaRender = renderResults[idea.id];
                  const active = idea.id === selectedIdea.id;
                  return (
                    <button
                      className={cn("active-design-card", active && "active")}
                      type="button"
                      key={idea.id}
                      onClick={() => switchActiveDesign(idea)}
                      aria-pressed={active}
                    >
                      {idea.image ? (
                        <img src={ideaRender?.src || idea.image} alt="" />
                      ) : (
                        <span className="active-design-placeholder">
                          <CakeSlice size={20} />
                        </span>
                      )}
                      <span>
                        <strong>{idea.title}</strong>
                        <small>
                          {ideaRender
                            ? tr(language, "render ready", "渲染已完成")
                            : tr(language, "design draft", "设计草稿")}
                        </small>
                      </span>
                      {active && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="product-overview pixel-panel">
              <div className="product-mini-render">
                <img
                  src={
                    renderResult?.src ||
                    selectedIdea.image ||
                    currentProduct.image
                  }
                  alt={tr(
                    language,
                    `${selectedIdea.title} product rendering`,
                    `${selectedIdea.title} 产品渲染图`
                  )}
                />
              </div>
              <div>
                <span className="micro-label">
                  {tr(language, "Recipe for", "当前配方")}
                </span>
                <h2>{selectedIdea.title}</h2>
                <p>
                  {tr(
                    language,
                    renderResult
                      ? "Using the latest intent-aware product rendering."
                      : "No product rendering yet; using the idea image as a placeholder.",
                    renderResult
                      ? "正在使用最新的意图渲染结果。"
                      : "尚无产品渲染，暂时使用创意图片。"
                  )}
                </p>
              </div>
              <button className="button secondary" type="button" onClick={addVariant}>
                <Plus size={15} /> {tr(language, "Add variants", "添加规格")}
              </button>
            </div>

            {sizeVariants.length > 0 && (
              <section className="size-builder pixel-panel">
                <div className="section-heading inline">
                  <div>
                    <h2>{tr(language, "Size variants", "尺寸规格")}</h2>
                    <p>
                      {tr(
                        language,
                        "Material factors are calculated from dimensions relative to the first variant.",
                        "材料倍率会根据各规格相对于首个规格的尺寸自动计算。"
                      )}
                    </p>
                  </div>
                  <button className="button secondary" type="button" onClick={addVariant}>
                    <Plus size={15} /> {tr(language, "Add variant", "添加规格")}
                  </button>
                </div>
                <div className="variant-grid">
                  {sizeVariants.map((sizeVariant, index) => {
                    const scale =
                      variantScales.find((item) => item.id === sizeVariant.id)
                        ?.scale ?? 1;
                    return (
                      <article className="variant-card" key={sizeVariant.id}>
                        <header>
                          <label>
                            <span className="sr-only">
                              {tr(language, "Variant name", "规格名称")}
                            </span>
                            <input
                              value={sizeVariant.name}
                              onChange={(event) =>
                                updateVariant(sizeVariant.id, {
                                  name: event.target.value,
                                })
                              }
                              aria-label={tr(language, "Variant name", "规格名称")}
                            />
                          </label>
                          <span className="variant-factor">
                            {index === 0
                              ? tr(language, "BASE", "基准")
                              : `×${scale.toFixed(2)}`}
                          </span>
                          <button
                            className="square-button mini danger"
                            type="button"
                            onClick={() =>
                              setActiveVariants((current) =>
                                current.filter((item) => item.id !== sizeVariant.id)
                              )
                            }
                            aria-label={tr(
                              language,
                              `Delete ${sizeVariant.name}`,
                              `删除 ${sizeVariant.name}`
                            )}
                          >
                            <Trash2 size={13} />
                          </button>
                        </header>
                        <div className="variant-dimensions">
                          {(["width", "height", "depth"] as const).map((field) => (
                            <label className="field" key={field}>
                              <span>
                                {tr(
                                  language,
                                  field,
                                  field === "width"
                                    ? "宽"
                                    : field === "height"
                                      ? "高"
                                      : "深"
                                )}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="—"
                                value={sizeVariant[field]}
                                onChange={(event) =>
                                  updateVariant(sizeVariant.id, {
                                    [field]: event.target.value,
                                  })
                                }
                              />
                            </label>
                          ))}
                          <label className="field">
                            <span>{tr(language, "unit", "单位")}</span>
                            <select
                              value={sizeVariant.unit}
                              onChange={(event) =>
                                updateVariant(sizeVariant.id, {
                                  unit: event.target.value,
                                })
                              }
                            >
                              <option>cm</option>
                              <option>mm</option>
                              <option>in</option>
                            </select>
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="materials-panel pixel-panel">
              <div className="section-heading inline">
                <div>
                  <h2>{tr(language, "Material usage", "材料用量")}</h2>
                  <p>
                    {sizeVariants.length
                      ? tr(
                          language,
                          "Enter the base amount once; every variant updates automatically.",
                          "只需输入一次基准用量，各规格会自动更新。"
                        )
                      : tr(
                          language,
                          "Add materials in your own units. Variants are optional.",
                          "使用自定义单位添加材料；尺寸规格为可选项。"
                        )}
                  </p>
                </div>
                <button className="button secondary" type="button" onClick={addMaterial}>
                  <Plus size={15} /> {tr(language, "Add material", "添加材料")}
                </button>
              </div>
              {materials.length === 0 ? (
                <button className="empty-state compact" type="button" onClick={addMaterial}>
                  <Plus size={19} />
                  <strong>{tr(language, "Add the first material", "添加第一项材料")}</strong>
                  <small>
                    {tr(
                      language,
                      "No preset quantities or cake-sized assumptions.",
                      "不预设用量，也不假定甜点尺寸。"
                    )}
                  </small>
                </button>
              ) : (
                <div className="editable-table-wrap">
                  <table
                    className="editable-table"
                    style={{ minWidth: 720 + sizeVariants.length * 112 }}
                  >
                    <thead>
                      <tr>
                        <th>{tr(language, "Material", "材料")}</th>
                        <th>{tr(language, "Base amount", "基准用量")}</th>
                        <th>{tr(language, "Unit", "单位")}</th>
                        {sizeVariants.map((sizeVariant) => {
                          const scale =
                            variantScales.find(
                              (item) => item.id === sizeVariant.id
                            )?.scale ?? 1;
                          return (
                            <th key={sizeVariant.id}>
                              {sizeVariant.name}
                              <small>×{scale.toFixed(2)}</small>
                            </th>
                          );
                        })}
                        <th>{tr(language, "Note", "备注")}</th>
                        <th aria-label={tr(language, "Actions", "操作")} />
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              value={row.name}
                              onChange={(event) => updateMaterial(row.id, { name: event.target.value })}
                              placeholder={tr(
                                language,
                                "e.g. Pear purée",
                                "例如：梨果泥"
                              )}
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
                          {sizeVariants.map((sizeVariant) => {
                            const scale =
                              variantScales.find(
                                (item) => item.id === sizeVariant.id
                              )?.scale ?? 1;
                            const adjusted = Number(row.amount) * scale;
                            return (
                              <td className="material-calculation" key={sizeVariant.id}>
                                {row.amount && Number.isFinite(adjusted)
                                  ? adjusted.toFixed(adjusted < 10 ? 2 : 1)
                                  : "—"}
                                {row.amount && <small>{row.unit}</small>}
                              </td>
                            );
                          })}
                          <td>
                            <input
                              value={row.note}
                              onChange={(event) => updateMaterial(row.id, { note: event.target.value })}
                              placeholder={tr(language, "optional", "可选")}
                            />
                          </td>
                          <td>
                            <button
                              className="square-button mini danger"
                              type="button"
                              onClick={() =>
                                setActiveMaterials((current) =>
                                  current.filter((item) => item.id !== row.id)
                                )
                              }
                              aria-label={tr(
                                language,
                                `Delete ${row.name || "material"}`,
                                `删除 ${row.name || "材料"}`
                              )}
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
            </section>

            <section
              className="making-plan pixel-panel"
              aria-busy={advisingPlan}
            >
              <div className="section-heading inline">
                <div>
                  <h2>{tr(language, "Making plan", "制作方案")}</h2>
                  <p>
                    {tr(
                      language,
                      "Each operating step can pair instructions with a visual.",
                      "每个操作步骤都可以同时包含文字与图片。"
                    )}
                  </p>
                </div>
                <div className="section-actions">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={advisePlan}
                    disabled={advisingDesignId !== null}
                    aria-busy={advisingPlan}
                  >
                    {advisingPlan ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <WandSparkles size={15} />
                    )}
                    {advisingPlan
                      ? tr(language, "AI is advising…", "AI 正在建议……")
                      : tr(language, "AI advise", "AI 建议")}
                  </button>
                  <button className="button secondary" type="button" onClick={() => setStepEditor("new")}>
                    <Plus size={15} /> {tr(language, "Add step", "添加步骤")}
                  </button>
                </div>
              </div>
              {advisingPlan && (
                <div className="plan-advice-status" role="status" aria-live="polite">
                  <LoaderCircle className="spin" size={15} />
                  <span>
                    {tr(
                      language,
                      `Reviewing the product brief and ${materials.filter((row) => row.name.trim()).length} materials…`,
                      `正在分析产品说明和 ${materials.filter((row) => row.name.trim()).length} 种材料……`
                    )}
                  </span>
                </div>
              )}
              {planAdviceError && !advisingPlan && (
                <div className="render-error plan-advice-error" role="alert">
                  <Bot size={15} />
                  <span>{planAdviceError}</span>
                </div>
              )}
              {planSteps.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={23} />
                  <strong>{tr(language, "No making steps yet", "尚无制作步骤")}</strong>
                  <small>
                    {tr(
                      language,
                      "Add your own operating plan or let Muse create a starting sequence.",
                      "添加自己的操作方案，或让缪斯生成起始流程。"
                    )}
                  </small>
                </div>
              ) : (
                <div className="step-list">
                  {planSteps.map((step, index) => (
                    <article className="step-card" key={step.id}>
                      <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
                      <div className="step-visual">
                        {step.image ? (
                          <img
                            src={step.image}
                            alt={tr(
                              language,
                              `${step.title} step visual`,
                              `${step.title} 步骤图片`
                            )}
                            decoding="async"
                          />
                        ) : (
                          <ImagePlus size={21} />
                        )}
                      </div>
                      <div className="step-copy">
                        <h3>{step.title}</h3>
                        <p>{step.instruction}</p>
                      </div>
                      <div className="card-actions">
                        <button
                          className="square-button mini"
                          type="button"
                          onClick={() => setStepEditor(step)}
                          aria-label={tr(
                            language,
                            `Edit ${step.title}`,
                            `编辑 ${step.title}`
                          )}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="square-button mini danger"
                          type="button"
                          onClick={() =>
                            setActivePlanSteps((current) =>
                              current.filter((item) => item.id !== step.id)
                            )
                          }
                          aria-label={tr(
                            language,
                            `Delete ${step.title}`,
                            `删除 ${step.title}`
                          )}
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
                {tr(language, "Save product card", "保存产品卡")} <ArrowRight size={15} />
              </button>
            </div>
          </section>
        )}

        {stage === "bake" && (
          <section className="stage-section bake-stage">
            <div className="stage-intro">
              <span className="stage-kicker">
                <Wheat size={14} /> {tr(language, "Bake day", "烘焙日")}
              </span>
              <h1>{tr(language, "Plan the bake. Share the story.", "规划烘焙，分享故事。")}</h1>
              <p>
                  {tr(
                    language,
                    "Scale production with confidence, then turn selected dessert stories into a keepsake table handbook.",
                    "轻松安排生产数量，再把选中的甜点故事制作成可珍藏的桌面手册。"
                  )}
              </p>
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
                <span>
                  <strong>{tr(language, "For chefs", "厨师模式")}</strong>
                  <small>{tr(language, "Quantities & cost", "数量与成本")}</small>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bakeMode === "diner"}
                className={cn(bakeMode === "diner" && "active")}
                onClick={() => setBakeMode("diner")}
              >
                <BookOpen size={16} />
                <span>
                  <strong>{tr(language, "For diners", "食客模式")}</strong>
                  <small>{tr(language, "Dessert handbook", "甜点手册")}</small>
                </span>
              </button>
            </div>

            {bakeMode === "chef" && (
              <div className="chef-layout">
                <section className="production-panel pixel-panel">
                  <div className="section-heading inline">
                    <div>
                      <h2>{tr(language, "Production quantities", "生产数量")}</h2>
                      <p>
                        {tr(
                          language,
                          "Set the dessert, its Product-page specification, and the quantity for each batch.",
                          "为每个批次选择甜点、产品页中的规格和生产数量。"
                        )}
                      </p>
                    </div>
                    <button
                      className="button secondary compact-button"
                      type="button"
                      onClick={addProductionBatch}
                    >
                      <Plus size={14} /> {tr(language, "Add batch", "添加批次")}
                    </button>
                  </div>
                  <div className="production-column-headings" aria-hidden="true">
                    <span />
                    <span>{tr(language, "Dessert", "甜点")}</span>
                    <span>{tr(language, "Specification", "规格")}</span>
                    <span>{tr(language, "Qty", "数量")}</span>
                    <span />
                  </div>
                  <div className="production-list">
                    {productionRows.map((row) => {
                      const product = products[row.productId];
                      const localizedProductName = productName(row.productId, language);
                      const productVariants =
                        productionVariantsByProduct[row.productId];
                      const selectedVariant =
                        productVariants.find(
                          (variant) => variant.id === row.variantId
                        ) ?? productVariants[0];
                      const productOptions = (
                        Object.keys(products) as ProductId[]
                      ).map((productId) => ({
                        value: productId,
                        label: productName(productId, language),
                        helper: products[productId].alias,
                      }));
                      const specificationOptions = productVariants.map(
                        (productVariant, index) => ({
                          value: productVariant.id,
                          label: variantDisplayName(
                            productVariant,
                            index,
                            language
                          ),
                          helper: variantDimensionLabel(
                            productVariant,
                            language
                          ),
                        })
                      );
                      return (
                        <article className="production-row" key={row.id}>
                          <img
                            className="production-thumb"
                            src={product.image}
                            alt={tr(
                              language,
                              `${localizedProductName} product rendering`,
                              `${localizedProductName} 产品渲染图`
                            )}
                          />
                          <div className="production-field product-field">
                            <span>{tr(language, "Dessert", "甜点")}</span>
                            <PixelSelect
                              value={row.productId}
                              options={productOptions}
                              onChange={(productId) => {
                                const nextVariants =
                                  productionVariantsByProduct[productId];
                                updateProduction(row.id, {
                                  productId,
                                  variantId: nextVariants[0]?.id ?? null,
                                });
                              }}
                              label={tr(
                                language,
                                "Dessert card",
                                "甜点卡"
                              )}
                            />
                          </div>
                          <div className="production-field spec-field">
                            <span>
                              {tr(language, "Specification", "规格")}
                            </span>
                            {selectedVariant ? (
                              <PixelSelect
                                value={selectedVariant.id}
                                options={specificationOptions}
                                onChange={(variantId) =>
                                  updateProduction(row.id, { variantId })
                                }
                                label={tr(
                                  language,
                                  `${localizedProductName} specification`,
                                  `${localizedProductName} 规格`
                                )}
                              />
                            ) : (
                              <div
                                className="production-default-spec"
                                title={tr(
                                  language,
                                  "No specification has been set on the Product page.",
                                  "该产品尚未在“产品”页设置规格。"
                                )}
                              >
                                {tr(language, "Default", "默认")}
                              </div>
                            )}
                          </div>
                          <label className="production-field qty-field">
                            <span>{tr(language, "Qty", "数量")}</span>
                            <input
                              type="number"
                              min="0"
                              value={row.count}
                              onChange={(event) =>
                                updateProduction(row.id, { count: Number(event.target.value) })
                              }
                              aria-label={tr(
                                language,
                                `${localizedProductName} quantity`,
                                `${localizedProductName} 数量`
                              )}
                            />
                          </label>
                          <button
                            className="square-button mini danger"
                            type="button"
                            onClick={() =>
                              setProductionRows((current) =>
                                current.filter((item) => item.id !== row.id)
                              )
                            }
                            aria-label={tr(
                              language,
                              `Remove ${localizedProductName} batch`,
                              `删除 ${localizedProductName} 批次`
                            )}
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
                      <h2>{tr(language, "Consolidated materials & cost sheet", "合并材料与成本表")}</h2>
                      <p>
                        {tr(
                          language,
                          "Aliases keep the sheet compact. Hover any alias for the full name.",
                          "简称让表格保持紧凑；悬停即可查看完整名称。"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="cost-table-scroll">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>{tr(language, "Material", "材料")}</th>
                          {(Object.keys(products) as Array<keyof typeof products>).map((id) => (
                            <th key={id}>
                              <button
                                type="button"
                                className="alias-tip"
                                data-full-name={productName(id, language)}
                                title={productName(id, language)}
                                aria-label={`${products[id].alias} — ${productName(id, language)}`}
                              >
                                {products[id].alias}
                              </button>
                            </th>
                          ))}
                          <th>{tr(language, "Total", "总量")}</th>
                          <th>{tr(language, "Unit price", "单价")}</th>
                          <th>{tr(language, "Cost", "成本")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consolidateRows.map((row, index) => (
                          <tr key={row.name}>
                            <td>
                              {tr(language, row.name, row.nameZh)}
                              <small>{row.unit}</small>
                            </td>
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
                    <span>{tr(language, "Total ingredient estimate", "材料成本估算")}</span>
                    <strong>${consolidateRows.reduce((sum, row) => sum + row.cost, 0).toFixed(2)}</strong>
                  </div>
                </section>
              </div>
            )}

            {bakeMode === "diner" && (
              <div className="diner-layout">
                <section className="handbook-gallery pixel-panel">
                  <div className="section-heading inline">
                    <div>
                      <h2>{tr(language, "Handbook gallery", "手册候选画廊")}</h2>
                      <p>
                        {tr(
                          language,
                          "Choose the dessert stories that belong in this edition.",
                          "选择要收录进本期手册的甜点故事。"
                        )}
                      </p>
                    </div>
                    <span className="selection-count">
                      {selectedHandbookIdeas.length}/{ideas.length}
                    </span>
                  </div>
                  <div className="handbook-card-grid">
                    {ideas.map((idea) => {
                      const selected = selectedHandbookIdeaIds.includes(idea.id);
                      const artwork = renderResults[idea.id]?.src || idea.image;
                      const displayName = localizedIdeaName(idea, language);
                      return (
                        <button
                          className={cn(
                            "handbook-card pixel-panel",
                            selected && "selected"
                          )}
                          type="button"
                          key={idea.id}
                          onClick={() =>
                            setSelectedHandbookIdeaIds((current) =>
                              current.includes(idea.id)
                                ? current.filter((id) => id !== idea.id)
                                : [...current, idea.id]
                            )
                          }
                          aria-pressed={selected}
                          aria-label={tr(
                            language,
                            `${selected ? "Remove" : "Add"} ${displayName} ${
                              selected ? "from" : "to"
                            } the handbook`,
                            `${selected ? "从手册移除" : "添加到手册"} ${displayName}`
                          )}
                        >
                          <span className="card-select" aria-hidden="true">
                            {selected ? <Check size={13} /> : <Plus size={13} />}
                          </span>
                          {artwork ? (
                            <img
                              src={artwork}
                              alt={tr(
                                language,
                                `${displayName} dessert rendering`,
                                `${displayName} 甜点渲染图`
                              )}
                            />
                          ) : (
                            <span className="handbook-card-placeholder">
                              <ImagePlus size={22} />
                            </span>
                          )}
                          <span className="handbook-card-copy">
                            <small>
                              {tr(language, "Dessert story", "甜点故事")}
                            </small>
                            <h3>{displayName}</h3>
                            <span className="handbook-candidate-description">
                              {idea.prompt}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <aside
                  className="export-panel pixel-panel"
                  aria-busy={handbookGenerating}
                >
                  <span className="panel-icon"><BookOpen size={18} /></span>
                  <h2>{tr(language, "Dessert handbook", "甜点手册")}</h2>
                  <p>
                    {tr(
                      language,
                      `${selectedHandbookIdeas.length} dessert cards selected.`,
                      `已选择 ${selectedHandbookIdeas.length} 张甜点卡片。`
                    )}
                  </p>

                  <div className="handbook-generator">
                    <label className="handbook-prompt-label">
                      <span>
                        <WandSparkles size={14} />
                        {tr(
                          language,
                          "Handbook style prompt",
                          "手册风格提示词"
                        )}
                      </span>
                      <textarea
                        value={handbookStylePrompt}
                        onChange={(event) =>
                          setHandbookStylePrompt(event.target.value)
                        }
                        maxLength={3000}
                        placeholder={tr(
                          language,
                          "e.g. French tea salon, ivory linen, restrained botanical border…",
                          "例如：法式茶室、象牙色亚麻纸、克制的植物边框……"
                        )}
                      />
                    </label>
                    <div className="handbook-style-presets">
                      <span>{tr(language, "Quick styles", "快捷风格")}</span>
                      {[
                        {
                          label: tr(language, "French salon", "法式沙龙"),
                          prompt: tr(
                            language,
                            "French salon sophistication, ivory linen paper, fine plum rules, understated gold botanical details.",
                            "法式沙龙的精致感，象牙色亚麻纸、细梅子色线条与克制的金色植物细节。"
                          ),
                        },
                        {
                          label: tr(language, "Village harvest", "田园丰收"),
                          prompt: tr(
                            language,
                            "Cozy village harvest journal, warm handmade paper, tiny wildflowers, berries and soft countryside colors.",
                            "温暖的田园丰收手记，手工纸张、小野花、浆果与柔和乡村色彩。"
                          ),
                        },
                        {
                          label: tr(language, "Tea garden", "茶园雅集"),
                          prompt: tr(
                            language,
                            "Quiet botanical tea garden, jade green accents, pressed leaves, generous breathing room and refined menu balance.",
                            "安静的植物茶园，玉绿色点缀、压花叶片、充足留白与雅致菜单平衡。"
                          ),
                        },
                      ].map((preset) => (
                        <button
                          type="button"
                          key={preset.label}
                          onClick={() => setHandbookStylePrompt(preset.prompt)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {handbookReferenceImage ? (
                      <div className="handbook-reference-attached">
                        <img src={handbookReferenceImage} alt="" />
                        <span>
                          <strong>
                            {tr(language, "Style reference", "风格参考")}
                          </strong>
                          <small>{handbookReferenceName}</small>
                        </span>
                        <button
                          className="square-button mini"
                          type="button"
                          onClick={() => {
                            setHandbookReferenceImage("");
                            setHandbookReferenceName("");
                          }}
                          aria-label={tr(
                            language,
                            "Remove style reference",
                            "移除风格参考"
                          )}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="handbook-reference-upload"
                        type="button"
                        onClick={() => handbookReferenceRef.current?.click()}
                      >
                        <ImagePlus size={15} />
                        <span>
                          <strong>
                            {tr(
                              language,
                              "Add reference image",
                              "添加参考图片"
                            )}
                          </strong>
                          <small>PNG · JPG · WEBP</small>
                        </span>
                      </button>
                    )}
                    <input
                      ref={handbookReferenceRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleHandbookReference}
                    />
                    <button
                      className="button primary full"
                      type="button"
                      onClick={generateHandbook}
                      disabled={
                        handbookGenerating || !selectedHandbookIdeas.length
                      }
                    >
                      {handbookGenerating ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      {handbookGenerating
                        ? tr(
                            language,
                            "Generating handbook…",
                            "正在生成手册……"
                          )
                        : handbookIsStale
                          ? tr(
                              language,
                              "Update AI handbook",
                              "更新 AI 手册"
                            )
                          : tr(
                              language,
                              "Generate AI handbook",
                              "生成 AI 手册"
                            )}
                    </button>
                  </div>

                  {handbookGenerating && (
                    <div className="handbook-generation-status" role="status">
                      <LoaderCircle className="spin" size={15} />
                      <span>
                        {tr(
                          language,
                          "Composing selected desserts and style references…",
                          "正在融合所选甜点与风格参考……"
                        )}
                      </span>
                    </div>
                  )}
                  {handbookError && !handbookGenerating && (
                    <div className="render-error handbook-error" role="alert">
                      <Bot size={15} />
                      <span>{handbookError}</span>
                    </div>
                  )}

                  <div className="handbook-sheet">
                    {handbookResult && (
                      <img
                        className="handbook-artwork"
                        src={handbookResult.src}
                        alt={tr(
                          language,
                          "AI-generated handbook artwork",
                          "AI 生成的手册视觉"
                        )}
                      />
                    )}
                    <div className="handbook-sheet-content">
                      <Sprout size={20} />
                      <small>DESSERT VALLEY</small>
                      <strong>
                        {tr(language, "Today’s Dessert Garden", "今日甜点花园")}
                      </strong>
                      {selectedHandbookIdeas.length ? (
                        <div
                          className={cn(
                            "handbook-preview-list",
                            selectedHandbookIdeas.length > 4 && "dense"
                          )}
                        >
                          {selectedHandbookIdeas.map((idea, index) => (
                            <div key={idea.id}>
                              <span>
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <p>
                                <b>{localizedIdeaName(idea, language)}</b>
                                <small>{idea.prompt}</small>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="handbook-empty-selection">
                          {tr(language, "Choose dessert cards", "请选择甜点卡片")}
                        </span>
                      )}
                    </div>
                  </div>
                  {handbookResult && (
                    <p className="handbook-result-note">
                      {handbookIsStale
                        ? tr(
                            language,
                            "Selection or style changed—update the artwork before final export.",
                            "选卡或风格已改变，最终导出前请更新视觉。"
                          )
                        : tr(
                            language,
                            `AI artwork reflects ${handbookResult.dessertCount} desserts and ${handbookResult.visualInputCount} visual references.`,
                            `AI 视觉已融合 ${handbookResult.dessertCount} 款甜点与 ${handbookResult.visualInputCount} 张视觉参考。`
                          )}
                    </p>
                  )}
                  <button
                    className="button secondary full"
                    type="button"
                    onClick={exportHandbookPNG}
                    disabled={!selectedHandbookIdeas.length}
                  >
                    <FileImage size={15} /> {tr(language, "Export image", "导出图片")}
                  </button>
                  <button
                    className="button secondary full"
                    type="button"
                    onClick={exportHandbookHTML}
                    disabled={!selectedHandbookIdeas.length}
                  >
                    <FileCode2 size={15} /> {tr(language, "Export HTML", "导出 HTML")}
                  </button>
                  <button
                    className="button primary full"
                    type="button"
                    onClick={() => window.print()}
                    disabled={!selectedHandbookIdeas.length}
                  >
                    <FileText size={15} /> {tr(language, "Export PDF", "导出 PDF")}
                  </button>
                </aside>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="atelier-footer">
        <span className="footer-mark"><Sprout size={18} /></span>
        <div>
          <strong>{tr(language, "Dessert Valley Riverside Atelier", "甜点谷河畔工坊")}</strong>
          <small>
            {tr(
              language,
              "From first spark to a beautifully planned bake.",
              "从最初灵感，到从容完成每一次烘焙。"
            )}
          </small>
        </div>
        <button className="button ghost" type="button" onClick={() => openStage("idea")}>
          {tr(language, "Return to Idea garden", "返回创意花园")}
        </button>
      </footer>

      {stage === "product" && (
        <>
          <button
            className={cn("agent-fab", agentOpen && "open")}
            type="button"
            onClick={() => setAgentOpen((current) => !current)}
            aria-label={tr(language, "Open pastry agent", "打开甜点助手")}
          >
            {agentOpen ? <X size={20} /> : <Bot size={21} />}
            {!agentOpen && <span>{tr(language, "Ask Muse", "问问缪斯")}</span>}
          </button>
          {agentOpen && (
            <aside className="agent-window">
              <header>
                <span className="panel-icon muse"><Bot size={17} /></span>
                <span>
                  <strong>{tr(language, "Pastry agent", "甜点助手")}</strong>
                  <small>{tr(language, "floating helper", "浮动助手")}</small>
                </span>
                <button
                  className="square-button mini"
                  type="button"
                  onClick={() => setAgentOpen(false)}
                  aria-label={tr(language, "Close chat", "关闭对话")}
                >
                  <X size={13} />
                </button>
              </header>
              <div className="agent-messages">
                {agentMessages.map((message, index) => (
                  <p className={cn(index % 2 === 1 && "user")} key={`${message}-${index}`}>{message}</p>
                ))}
              </div>
              {agentAudioName && <div className="audio-attached"><AudioLines size={13} /> {agentAudioName}</div>}
              <div className="agent-composer">
                <label
                  className="square-button"
                  data-tip={tr(language, "Attach audio", "添加语音")}
                >
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
                  placeholder={tr(language, "Ask about this product…", "询问这个产品…")}
                />
                <button
                  className="square-button send"
                  type="button"
                  onClick={sendAgentMessage}
                  aria-label={tr(language, "Send", "发送")}
                >
                  <Send size={15} />
                </button>
              </div>
            </aside>
          )}
        </>
      )}

      {ideaEditor && (
        <IdeaEditor
          key={ideaEditor.id}
          idea={ideaEditor}
          language={language}
          onClose={() => setIdeaEditor(null)}
          onSave={saveIdea}
        />
      )}
      {ideaToDelete && (
        <IdeaDeleteDialog
          key={ideaToDelete.id}
          idea={ideaToDelete}
          language={language}
          onClose={() => setIdeaToDelete(null)}
          onConfirm={removeIdea}
        />
      )}
      {referenceEditor && (
        <ReferenceEditor
          key={`${referenceEditor.kind}-${referenceEditor.existing?.id ?? "new"}`}
          kind={referenceEditor.kind}
          existing={referenceEditor.existing}
          language={language}
          onClose={() => setReferenceEditor(null)}
          onSave={saveReference}
        />
      )}
      {stepEditor && (
        <StepEditor
          key={stepEditor === "new" ? "new" : stepEditor.id}
          existing={stepEditor === "new" ? null : stepEditor}
          language={language}
          onClose={() => setStepEditor(null)}
          onSave={saveStep}
        />
      )}

      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
      </div>
    </>
  );
}
