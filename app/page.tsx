"use client";

import NextImage, { type ImageProps } from "next/image";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Bot,
  CakeSlice,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eraser,
  FileCode2,
  FileImage,
  FileText,
  ImagePlus,
  Images,
  Import,
  Layers3,
  Languages,
  LoaderCircle,
  Mic,
  PackageCheck,
  Pencil,
  Plus,
  Redo2,
  Sparkles,
  Square,
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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { transcribeAudioToText } from "./audio-to-text";
import IdeaAudioInput from "./idea-audio-input";
import GalleryImageViewer from "./gallery-image-viewer";
import MaterialUnitInput from "./material-unit-input";
import MuseAdviser from "./muse-adviser";
import { normalizeMuseContext } from "./muse-context";
import { compatibleMaterialPrice, consolidateMaterials, convertMaterialAmount, materialGroupKey, normalizeMaterialUnit } from "./material-units";
import {
  MAX_IDEA_IMAGES,
  MAX_IDEA_TEXT_LENGTH,
  normalizeIdeaAttachments,
  structureIdea,
  type IdeaAttachment,
} from "./idea-input";
import {
  ensureWorkspaceCookie,
  hasWorkspaceCookie,
  readWorkspace,
  WORKSPACE_STORAGE_VERSION,
  writeWorkspace,
} from "./workspace-storage";
import {
  DEFAULT_HANDBOOK_PAGE_COUNT,
  MAX_HANDBOOK_PAGE_COUNT,
  normalizeHandbookResult,
  type HandbookResult,
} from "./handbook-storage";

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

type MaterialImportKind = "text" | "audio" | "image";

type PlanStep = {
  id: number;
  title: string;
  instruction: string;
  image: string;
};

type ProductionRow = {
  id: number;
  ideaId: number;
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

type WorkspaceData = {
  stage: Stage;
  ideas: IdeaCard[];
  selectedIdeaId: number;
  ideaText: string;
  ideaImage: string;
  ideaImageName: string;
  ideaImages?: IdeaAttachment[];
  referencePackages: Record<number, DesignReference[]>;
  viewStyle: ViewStyle;
  renderResults: Record<number, RenderResult | null>;
  productDrafts: Record<number, ProductDraft>;
  bakeMode: "chef" | "diner";
  productionRows: ProductionRow[];
  materialPrices: Record<string, number>;
  selectedHandbookIdeaIds: number[];
  handbookStylePrompt: string;
  handbookReferenceImage: string;
  handbookReferenceName: string;
  handbookPageCount: number;
  handbookResult: HandbookResult | null;
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
    image: "/renderings/moonlit-jasmine-hero.jpg",
    imageName: "moonlit-jasmine-reference.jpg",
    tags: ["jasmine", "pear", "pearl"],
  },
  {
    id: 2,
    title: "Strawberry Picnic Box",
    prompt:
      "A single-serve strawberry shortcake that opens like a tiny gingham picnic hamper.",
    image: "/renderings/strawberry-picnic-hero.jpg",
    imageName: "strawberry-picnic-reference.jpg",
    tags: ["berry", "playful", "giftable"],
  },
  {
    id: 3,
    title: "Pistachio Garden",
    prompt:
      "A petite pistachio entremet with chamomile flowers, soft moss texture and a honey centre.",
    image: "/renderings/pistachio-garden-hero.jpg",
    imageName: "pistachio-garden-reference.jpg",
    tags: ["pistachio", "botanical", "honey"],
  },
];

const products = {
  moon: {
    name: "Moonlit Jasmine Cloud",
    alias: "MJC",
    image: "/renderings/moonlit-jasmine-hero.jpg",
    cutaway: "/renderings/moonlit-jasmine-cutaway.jpg",
  },
  berry: {
    name: "Strawberry Picnic Box",
    alias: "SPB",
    image: "/renderings/strawberry-picnic-hero.jpg",
    cutaway: "/renderings/strawberry-picnic-hero.jpg",
  },
  garden: {
    name: "Pistachio Garden",
    alias: "PG",
    image: "/renderings/pistachio-garden-hero.jpg",
    cutaway: "/renderings/pistachio-garden-hero.jpg",
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

function ideaAlias(idea: IdeaCard, index: number) {
  const matchingProduct = (
    Object.entries(products) as Array<[ProductId, (typeof products)[ProductId]]>
  ).find(([, product]) => product.name === idea.title);
  if (matchingProduct) return matchingProduct[1].alias;

  const words = idea.title.match(/[\p{L}\p{N}]+/gu) ?? [];
  const latinInitials = words
    .filter((word) => /^[a-z0-9]/i.test(word))
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  if (latinInitials) return latinInitials;
  return `D${index + 1}`;
}

function materialKey(name: string, unit: string) {
  const normalize = (value: string) =>
    value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return `${normalize(name)}::${normalizeMaterialUnit(unit)}`;
}

function materialAmount(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMaterialAmount(value: number, language: Language) {
  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en", {
    maximumFractionDigits: 9,
  }).format(value);
}

const referenceMeta: Record<
  ReferenceKind,
  { label: string; helper: string; icon: typeof FileText }
> = {
  text: { label: "Text", helper: "Describe a form, finish or feeling", icon: FileText },
  audio: { label: "Audio", helper: "Record or upload a voice direction", icon: AudioLines },
  image: { label: "Image", helper: "Add a photo, collage or visual sample", icon: ImagePlus },
  canvas: { label: "Canvas", helper: "Draw a fresh sketch on an empty canvas", icon: Pencil },
};

const addableReferenceKinds = [
  "text",
  "image",
  "canvas",
] as const satisfies readonly ReferenceKind[];

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

type WorkspaceImageProps = Omit<
  ImageProps,
  "height" | "unoptimized" | "width"
> & {
  portrait?: boolean;
};

function WorkspaceImage({
  alt,
  portrait = false,
  ...props
}: WorkspaceImageProps) {
  return (
    <NextImage
      {...props}
      alt={alt}
      width={portrait ? 1024 : 960}
      height={portrait ? 1536 : 720}
      unoptimized
    />
  );
}

function tr(language: Language, english: string, chinese: string) {
  return language === "zh" ? chinese : english;
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

const seedProductionRows: ProductionRow[] = [];

function createSeedWorkspaceData(): WorkspaceData {
  const ideas = seedIdeas.map((idea) => ({
    ...idea,
    tags: [...idea.tags],
  }));
  return {
    stage: "idea",
    ideas,
    selectedIdeaId: ideas[0]?.id ?? 1,
    ideaText: "",
    ideaImage: "",
    ideaImageName: "",
    ideaImages: [],
    referencePackages: Object.fromEntries(
      ideas.map((idea) => [idea.id, inheritedReferences(idea)])
    ),
    viewStyle: "exterior",
    renderResults: {},
    productDrafts: Object.fromEntries(
      ideas.map((idea) => [idea.id, emptyProductDraft()])
    ),
    bakeMode: "chef",
    productionRows: seedProductionRows.map((row) => ({ ...row })),
    materialPrices: {},
    selectedHandbookIdeaIds: ideas.map((idea) => idea.id),
    handbookStylePrompt: "",
    handbookReferenceImage: "",
    handbookReferenceName: "",
    handbookPageCount: DEFAULT_HANDBOOK_PAGE_COUNT,
    handbookResult: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type PersistedWorkspaceCore = Omit<
  WorkspaceData,
  | "materialPrices"
  | "productionRows"
  | "handbookPageCount"
  | "handbookResult"
> & {
  materialPrices?: unknown;
  prices?: unknown;
  productionRows: unknown;
  handbookPageCount?: unknown;
  handbookResult: unknown;
};

function isWorkspaceCoreData(
  value: unknown
): value is PersistedWorkspaceCore {
  if (!isRecord(value)) return false;
  const validStage =
    value.stage === "idea" ||
    value.stage === "design" ||
    value.stage === "product" ||
    value.stage === "bake";
  const validView =
    value.viewStyle === "exterior" || value.viewStyle === "cutaway";
  const validBakeMode =
    value.bakeMode === "chef" || value.bakeMode === "diner";
  const validIdeas =
    Array.isArray(value.ideas) &&
    value.ideas.length > 0 &&
    value.ideas.every(
      (idea) =>
        isRecord(idea) &&
        typeof idea.id === "number" &&
        typeof idea.title === "string" &&
        typeof idea.prompt === "string" &&
        typeof idea.image === "string" &&
        typeof idea.imageName === "string" &&
        Array.isArray(idea.tags) &&
        idea.tags.every((tag) => typeof tag === "string")
    );
  const validHandbookResult =
    value.handbookResult === null || isRecord(value.handbookResult);

  return (
    validStage &&
    validView &&
    validBakeMode &&
    validIdeas &&
    typeof value.selectedIdeaId === "number" &&
    typeof value.ideaText === "string" &&
    typeof value.ideaImage === "string" &&
    typeof value.ideaImageName === "string" &&
    isRecord(value.referencePackages) &&
    isRecord(value.renderResults) &&
    isRecord(value.productDrafts) &&
    Array.isArray(value.productionRows) &&
    Array.isArray(value.selectedHandbookIdeaIds) &&
    value.selectedHandbookIdeaIds.every((id) => typeof id === "number") &&
    typeof value.handbookStylePrompt === "string" &&
    typeof value.handbookReferenceImage === "string" &&
    typeof value.handbookReferenceName === "string" &&
    validHandbookResult
  );
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

function normalizeMaterialPrices(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, price]) => {
      const parsedPrice = Number(price);
      return key && Number.isFinite(parsedPrice)
        ? [[key, Math.max(0, parsedPrice)]]
        : [];
    })
  );
}

function isLegacySeedProductionRows(value: unknown) {
  if (!Array.isArray(value) || value.length !== 3) return false;
  const expected: Array<[ProductId, number]> = [
    ["moon", 4],
    ["berry", 6],
    ["garden", 4],
  ];
  return expected.every(
    ([productId, count], index) =>
      isRecord(value[index]) &&
      value[index].productId === productId &&
      Number(value[index].count) === count
  );
}

function normalizeProductionRows(
  value: unknown,
  ideas: IdeaCard[],
  renderResults: Record<number, RenderResult | null>
): ProductionRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const candidateIdeaId = Number(entry.ideaId);
    const directIdea = Number.isFinite(candidateIdeaId)
      ? ideas.find((idea) => idea.id === candidateIdeaId)
      : null;
    const legacyProductId =
      typeof entry.productId === "string" && entry.productId in products
        ? (entry.productId as ProductId)
        : null;
    const legacyIdea = legacyProductId
      ? ideas.find(
          (idea) =>
            (renderResults[idea.id]?.productId ?? ideaVariant(idea)) ===
            legacyProductId
        )
      : null;
    const ideaId = directIdea?.id ?? legacyIdea?.id;
    if (ideaId === undefined) return [];
    const parsedId = Number(entry.id);
    const parsedCount = Number(entry.count);
    const parsedVariantId =
      entry.variantId === null || entry.variantId === undefined
        ? null
        : Number(entry.variantId);
    return [
      {
        id: Number.isFinite(parsedId) ? parsedId : uid(),
        ideaId,
        variantId: Number.isFinite(parsedVariantId)
          ? parsedVariantId
          : null,
        count: Number.isFinite(parsedCount) ? Math.max(0, parsedCount) : 0,
      },
    ];
  });
}

function migrateWorkspaceData(
  value: unknown,
  storedVersion: number | undefined
): WorkspaceData | null {
  if (!isWorkspaceCoreData(value)) return null;
  const productionRows =
    storedVersion !== undefined &&
    storedVersion < WORKSPACE_STORAGE_VERSION &&
    isLegacySeedProductionRows(value.productionRows)
      ? []
      : normalizeProductionRows(
          value.productionRows,
          value.ideas,
          value.renderResults
        );
  const migrated = {
    ...value,
    ideaImages: normalizeIdeaAttachments(value.ideaImages, value.ideaImage, value.ideaImageName),
    productionRows,
    materialPrices: normalizeMaterialPrices(value.materialPrices),
    handbookPageCount:
      typeof value.handbookPageCount === "number" &&
      Number.isInteger(value.handbookPageCount) &&
      value.handbookPageCount >= 1 &&
      value.handbookPageCount <= MAX_HANDBOOK_PAGE_COUNT
        ? value.handbookPageCount
        : DEFAULT_HANDBOOK_PAGE_COUNT,
    handbookResult: normalizeHandbookResult(value.handbookResult),
  } as WorkspaceData & { prices?: unknown };
  delete migrated.prices;
  return migrated;
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

function MasterpieceGallery({ language, onClose }: {
  language: Language;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeImage, setActiveImage] = useState(0);
  const exhibits = [
    {
      src: "/gallery/oli-design.jpg",
      width: 1284,
      height: 2506,
      label: tr(language, "Design", "设计"),
      title: tr(language, "Yogurt Tanghulu", "酸奶糖葫芦"),
      alt: tr(language, "Oli's Dessert Valley design: a glossy red apple-shaped yogurt dessert with a little face.", "Oli 的甜点谷设计：带有可爱表情的亮红色苹果造型酸奶甜点。"),
      icon: Pencil,
    },
    {
      src: "/gallery/oli-menu.jpg",
      width: 1024,
      height: 1536,
      label: tr(language, "Menu", "菜单"),
      title: tr(language, "Oli's dessert collection", "Oli 的甜点集"),
      alt: tr(language, "Oli's illustrated menu with coconut mousse, yogurt tanghulu, little tiger espresso, Cinnamoroll canelé, and butter cookies.", "Oli 的手绘风菜单：海豹椰子酸奶慕斯、酸奶苹果糖葫芦、小脑斧意式咖啡、玉桂狗可露丽和小丸子黄油饼干。"),
      icon: BookOpen,
    },
  ];

  const showImage = (index: number) => {
    const track = trackRef.current;
    if (!track || track.scrollWidth <= track.clientWidth) return;
    const next = Math.max(0, Math.min(exhibits.length - 1, index));
    track.scrollTo({
      left: next * (track.scrollWidth - track.clientWidth),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    setActiveImage(next);
  };

  return (
    <div className="modal-backdrop masterpiece-backdrop" role="presentation"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="pixel-modal masterpiece-modal" role="dialog" aria-modal="true"
        aria-labelledby="masterpiece-gallery-title" aria-describedby="masterpiece-gallery-credit">
        <header className="modal-header masterpiece-heading">
          <span className="modal-icon"><Images size={22} aria-hidden="true" /></span>
          <div>
            <span className="masterpiece-eyebrow">Dessert Valley</span>
            <h2 id="masterpiece-gallery-title">{tr(language, "Masterpiece gallery", "甜点作品画廊")}</h2>
          </div>
          <button className="square-button" type="button" onClick={onClose}
            aria-label={tr(language, "Close gallery", "关闭画廊")}><X size={20} /></button>
        </header>
        <div className="masterpiece-body">
          <div className="masterpiece-track" ref={trackRef} tabIndex={0}
            role="region" aria-label={tr(language, "Design and menu showcase", "设计与菜单作品展示")}
            onScroll={(event) => {
              const track = event.currentTarget;
              const maximum = track.scrollWidth - track.clientWidth;
              if (maximum > 0) setActiveImage(track.scrollLeft >= maximum / 2 ? 1 : 0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                showImage(activeImage + (event.key === "ArrowRight" ? 1 : -1));
              }
            }}>
            {exhibits.map((exhibit, index) => {
              const Icon = exhibit.icon;
              return (
                <figure className="masterpiece-item" key={exhibit.src}>
                  <div className="masterpiece-frame">
                    <GalleryImageViewer src={exhibit.src} alt={exhibit.alt} width={exhibit.width} height={exhibit.height}
                      language={language} />
                  </div>
                  <figcaption className="masterpiece-caption">
                    <span className="masterpiece-number" aria-hidden="true">0{index + 1}</span>
                    <div><h3>{exhibit.label}</h3><p>{exhibit.title}</p></div>
                    <Icon size={21} aria-hidden="true" />
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="masterpiece-pagination" role="group" aria-label={tr(language, "Choose gallery image", "选择画廊图片")}>
            {exhibits.map((exhibit, index) => (
              <button type="button" key={exhibit.src} aria-pressed={activeImage === index} onClick={() => showImage(index)}>
                <span aria-hidden="true">0{index + 1}</span> {exhibit.label}
              </button>
            ))}
          </div>
        </div>
        <footer className="masterpiece-credit" id="masterpiece-gallery-credit">
          <span className="masterpiece-signature">@Oli</span>
          <span>{tr(language, "A girl who loves baking.", "一个热爱烘焙的女孩。")}</span>
          <Sprout size={22} aria-hidden="true" />
        </footer>
      </section>
    </div>
  );
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
  const [transcribing, setTranscribing] = useState(false);
  const [audioError, setAudioError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingFailedRef = useRef(false);
  const editorMountedRef = useRef(true);
  const dialogRef = useDialogFocus(onClose);

  useEffect(() => {
    editorMountedRef.current = true;
    return () => {
      editorMountedRef.current = false;
      recordingFailedRef.current = true;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  const toggleRecording = async () => {
    if (recording) {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      return;
    }
    if (transcribing) return;
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setAudioError(
        tr(
          language,
          kind === "text"
            ? "Audio recording is not supported in this browser."
            : "Audio recording is not supported in this browser. Choose an audio file instead.",
          kind === "text"
            ? "此浏览器不支持音频录制。"
            : "此浏览器不支持音频录制，请改为选择音频文件。"
        )
      );
      return;
    }

    setAudioError("");
    recordingFailedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (!editorMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const requestedMimeType = preferredRecordingMimeType();
      streamRef.current = stream;
      const recorder = requestedMimeType
        ? new MediaRecorder(stream, { mimeType: requestedMimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recordingFailedRef.current = true;
        stream.getTracks().forEach((track) => track.stop());
        if (!editorMountedRef.current) return;
        setRecording(false);
        setAudioError(
          tr(
            language,
            "Recording stopped unexpectedly. Please try again.",
            "录音意外停止，请重试。"
          )
        );
      };
      recorder.onstop = async () => {
        const recordedMimeType = baseRecordingMimeType(
          recorder.mimeType || requestedMimeType
        );
        const blob = new Blob(chunksRef.current, {
          type: recordedMimeType,
        });
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        if (recorderRef.current === recorder) recorderRef.current = null;
        if (!editorMountedRef.current) return;
        setRecording(false);
        if (recordingFailedRef.current) return;
        if (blob.size === 0) {
          setAudioError(
            tr(
              language,
              "No audio was captured. Check your microphone and record again.",
              "没有录制到音频，请检查麦克风后重试。"
            )
          );
          return;
        }

        const file = new File(
          [blob],
          recordingFilename(recordedMimeType),
          { type: recordedMimeType }
        );
        if (kind === "text") setTranscribing(true);
        try {
          const dataUrl = await readFileAsDataUrl(file);
          if (!editorMountedRef.current) return;
          if (kind === "audio") {
            setAsset(dataUrl);
            return;
          }

          const transcript = await transcribeAudioToText({
            content: dataUrl,
            filename: file.name,
            mimeType: recordedMimeType,
          });
          if (!editorMountedRef.current) return;
          setContent((current) => {
            const draft = current.trimEnd();
            return draft ? `${draft}\n${transcript}` : transcript;
          });
          setAudioError("");
        } catch (caughtError) {
          if (!editorMountedRef.current) return;
          const code =
            caughtError instanceof Error
              ? caughtError.message
              : "transcription_failed";
          setAudioError(audioTranscriptionError(language, code));
        } finally {
          if (editorMountedRef.current) setTranscribing(false);
        }
      };
      recorder.start(250);
      setRecording(true);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      if (!editorMountedRef.current) return;
      setRecording(false);
      setAudioError(
        tr(
          language,
          kind === "text"
            ? "Microphone access was not granted. Allow access and try again."
            : "Microphone access was not granted. Allow access or upload an audio clip instead.",
          kind === "text"
            ? "未获得麦克风权限，请允许访问后重试。"
            : "未获得麦克风权限，请允许访问或改为上传音频文件。"
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
        aria-busy={transcribing}
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
            <div className="field design-direction-field">
              <div className="design-direction-heading">
                <label htmlFor="reference-design-direction">
                  {tr(language, "Design direction", "设计方向")}
                </label>
                <button
                  className={cn(
                    "audio-to-text-button",
                    recording && "recording"
                  )}
                  type="button"
                  onClick={toggleRecording}
                  disabled={transcribing}
                  aria-pressed={recording}
                >
                  {transcribing ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : recording ? (
                    <Square size={15} fill="currentColor" />
                  ) : (
                    <Mic size={16} />
                  )}
                  {transcribing
                    ? tr(language, "Transcribing…", "正在转成文字……")
                    : recording
                      ? tr(language, "Stop & transcribe", "停止并转成文字")
                      : tr(language, "Audio to Text", "语音转文字")}
                </button>
              </div>
              <textarea
                id="reference-design-direction"
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
              <div
                className="audio-to-text-feedback"
                aria-live="polite"
                aria-atomic="true"
              >
                {recording && (
                  <p className="recording-status">
                    {tr(
                      language,
                      "Recording… Select “Stop & transcribe” when you finish.",
                      "正在录音……结束时请选择“停止并转成文字”。"
                    )}
                  </p>
                )}
                {transcribing && (
                  <p className="transcribing-status">
                    {tr(
                      language,
                      "Transcribing your recording…",
                      "正在将录音转成文字……"
                    )}
                  </p>
                )}
                {audioError && (
                  <p className="field-error" role="alert">
                    {audioError}
                  </p>
                )}
              </div>
            </div>
          )}

          {kind === "image" && (
            <>
              <label className={cn("asset-drop", asset && "has-asset")}>
                {asset ? (
                  <WorkspaceImage
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
                disabled={transcribing}
                aria-pressed={recording}
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
            disabled={
              recording ||
              transcribing ||
              (kind === "text" ? !content.trim() : kind !== "audio" && !asset)
            }
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
              <WorkspaceImage
                src={image}
                alt={tr(language, "Step visual", "步骤图片")}
              />
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

function audioTranscriptionError(language: Language, code?: string) {
  if (code === "invalid_request") {
    return tr(
      language,
      "The recording was empty, unsupported, or larger than 18 MB. Record a shorter direction and try again.",
      "录音为空、格式不受支持或超过 18 MB，请缩短录音后重试。"
    );
  }
  if (code === "not_configured") {
    return tr(
      language,
      "Audio transcription is not configured yet.",
      "语音转文字功能尚未配置。"
    );
  }
  if (code === "rate_limit") {
    return tr(
      language,
      "The transcription model is busy. Please try again shortly.",
      "转写模型正忙，请稍后重试。"
    );
  }
  if (code === "empty_transcription") {
    return tr(
      language,
      "No speech was recognized. Record again in a quieter place.",
      "没有识别到语音，请在更安静的环境中重新录制。"
    );
  }
  if (code === "transcription_blocked") {
    return tr(
      language,
      "This recording could not be transcribed.",
      "无法转写这段录音。"
    );
  }
  return tr(
    language,
    "The recording could not be transcribed. Please try again.",
    "录音暂时无法转成文字，请重试。"
  );
}

function materialImportError(language: Language, code?: string) {
  if (code === "request_too_large" || code === "invalid_request") {
    return tr(
      language,
      "Choose valid recipe text, an image up to 8 MB, or audio up to 18 MB.",
      "请选择有效的配方文字、8 MB 以内的图片或 18 MB 以内的音频。"
    );
  }
  if (code === "not_configured") {
    return tr(
      language,
      "AI material import is not configured yet.",
      "AI 材料导入功能尚未配置。"
    );
  }
  if (code === "rate_limit") {
    return tr(
      language,
      "The material importer is busy. Please try again shortly.",
      "材料导入助手正忙，请稍后重试。"
    );
  }
  if (code === "empty_import") {
    return tr(
      language,
      "No usable material rows were found. Try a clearer source.",
      "没有识别到可用的材料行，请尝试更清晰的来源。"
    );
  }
  if (code === "import_blocked") {
    return tr(
      language,
      "This material source could not be processed.",
      "无法处理此材料来源。"
    );
  }
  return tr(
    language,
    "The material source could not be converted. Please retry.",
    "材料来源暂时无法转换，请重试。"
  );
}

function audioMimeType(filename: string, providedType: string) {
  if (providedType) return providedType.toLowerCase();
  const extension = filename.toLowerCase().split(".").pop();
  const mimeByExtension: Record<string, string> = {
    flac: "audio/flac",
    m4a: "audio/m4a",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    mpeg: "audio/mpeg",
    mpga: "audio/mpga",
    oga: "audio/ogg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    webm: "audio/webm",
  };
  return extension ? mimeByExtension[extension] ?? "" : "";
}

function preferredRecordingMimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return "";
  }
  return (
    [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ].find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ""
  );
}

function baseRecordingMimeType(value: string) {
  return value.toLowerCase().split(";")[0]?.trim() || "audio/webm";
}

function recordingFilename(mimeType: string) {
  const extension = mimeType.includes("mp4")
    ? "m4a"
    : mimeType.includes("ogg")
      ? "ogg"
      : "webm";
  return `recipe-recording-${Date.now()}.${extension}`;
}

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function MaterialImportDialog({
  kind,
  idea,
  existingMaterialNames,
  language,
  onClose,
  onApply,
}: {
  kind: MaterialImportKind;
  idea: IdeaCard;
  existingMaterialNames: string[];
  language: Language;
  onClose: () => void;
  onApply: (rows: MaterialRow[]) => void;
}) {
  const [sourceText, setSourceText] = useState("");
  const [asset, setAsset] = useState("");
  const [filename, setFilename] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [summary, setSummary] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sourceMethod, setSourceMethod] = useState<
    "recording" | "upload" | null
  >(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingFailedRef = useRef(false);
  const dialogMountedRef = useRef(true);
  const dialogRef = useDialogFocus(onClose);

  useEffect(() => {
    dialogMountedRef.current = true;
    return () => {
      dialogMountedRef.current = false;
      recordingFailedRef.current = true;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      recordingStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const updateElapsedTime = () =>
      setRecordingSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
        )
      );
    updateElapsedTime();
    const timer = window.setInterval(updateElapsedTime, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  const kindMeta = {
    text: {
      icon: FileText,
      label: tr(language, "Text", "文字"),
      helper: tr(
        language,
        "Paste an ingredient list or recipe.",
        "粘贴材料清单或配方。"
      ),
    },
    audio: {
      icon: AudioLines,
      label: tr(language, "Audio", "音频"),
      helper: tr(
        language,
        "Record or upload a spoken recipe or kitchen note.",
        "录制或上传口述配方与厨房语音记录。"
      ),
    },
    image: {
      icon: FileImage,
      label: tr(language, "Image", "图片"),
      helper: tr(
        language,
        "Upload a recipe photo, screenshot or label.",
        "上传配方照片、截图或标签。"
      ),
    },
  }[kind];
  const KindIcon = kindMeta.icon;
  const sourceReady = kind === "text" ? Boolean(sourceText.trim()) : Boolean(asset);

  const resetExtraction = () => {
    setRows([]);
    setSummary("");
    setError("");
  };

  const loadSourceFile = async (
    file: File,
    method: "recording" | "upload"
  ) => {
    const imageTypes = new Set([
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    const nextMimeType =
      kind === "audio"
        ? audioMimeType(file.name, file.type)
        : file.type.toLowerCase();
    const maximumBytes =
      kind === "image" ? 8 * 1024 * 1024 : 18 * 1024 * 1024;
    const validType =
      kind === "image"
        ? imageTypes.has(nextMimeType)
        : nextMimeType.startsWith("audio/") ||
          nextMimeType === "video/mp4" ||
          nextMimeType === "video/webm";

    if (!validType || file.size === 0 || file.size > maximumBytes) {
      setError(
        tr(
          language,
          kind === "image"
            ? "Use a PNG, JPG, WEBP or still GIF up to 8 MB."
            : "Use an MP3, M4A, WAV, OGG, FLAC, MP4 or WEBM audio file up to 18 MB.",
          kind === "image"
            ? "请使用 8 MB 以内的 PNG、JPG、WEBP 或静态 GIF。"
            : "请使用 18 MB 以内的 MP3、M4A、WAV、OGG、FLAC、MP4 或 WEBM 音频。"
        )
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAsset(dataUrl);
      setFilename(file.name);
      setMimeType(nextMimeType);
      setSourceMethod(method);
      resetExtraction();
    } catch {
      setError(
        tr(
          language,
          "The selected file could not be read.",
          "无法读取所选文件。"
        )
      );
    }
  };

  const handleSourceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await loadSourceFile(file, "upload");
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const startRecording = async () => {
    if (recording || processing) return;
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        tr(
          language,
          "Audio recording is not supported in this browser. Choose an audio file instead.",
          "此浏览器不支持音频录制，请改为选择音频文件。"
        )
      );
      return;
    }

    setError("");
    setRows([]);
    setSummary("");
    recordingFailedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (!dialogMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const requestedMimeType = preferredRecordingMimeType();
      const recorder = requestedMimeType
        ? new MediaRecorder(stream, { mimeType: requestedMimeType })
        : new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recordingFailedRef.current = true;
        stream.getTracks().forEach((track) => track.stop());
        if (!dialogMountedRef.current) return;
        setRecording(false);
        setError(
          tr(
            language,
            "Recording stopped unexpectedly. Please try again or choose an audio file.",
            "录音意外停止，请重试或选择音频文件。"
          )
        );
      };
      recorder.onstop = async () => {
        const recordedMimeType = baseRecordingMimeType(
          recorder.mimeType || requestedMimeType
        );
        const blob = new Blob(recordingChunksRef.current, {
          type: recordedMimeType,
        });
        stream.getTracks().forEach((track) => track.stop());
        if (recordingStreamRef.current === stream) {
          recordingStreamRef.current = null;
        }
        if (recorderRef.current === recorder) recorderRef.current = null;
        if (!dialogMountedRef.current) return;
        setRecording(false);
        if (recordingFailedRef.current) return;
        if (blob.size === 0) {
          setError(
            tr(
              language,
              "No audio was captured. Check your microphone and record again.",
              "没有录制到音频，请检查麦克风后重试。"
            )
          );
          return;
        }
        await loadSourceFile(
          new File([blob], recordingFilename(recordedMimeType), {
            type: recordedMimeType,
          }),
          "recording"
        );
      };

      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      recorder.start(250);
      setRecording(true);
    } catch {
      recordingStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recorderRef.current = null;
      if (!dialogMountedRef.current) return;
      setRecording(false);
      setError(
        tr(
          language,
          "Microphone access was not granted. Allow access or choose an audio file instead.",
          "未获得麦克风权限，请允许访问或改为选择音频文件。"
        )
      );
    }
  };

  const extractMaterials = async () => {
    if (!sourceReady || processing || recording) return;
    setProcessing(true);
    setError("");
    setRows([]);
    setSummary("");

    try {
      const response = await fetch("/api/material-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          existingMaterialNames,
          product: {
            title: idea.title,
            description: idea.prompt,
            tags: idea.tags,
          },
          source: {
            kind,
            content: kind === "text" ? sourceText.trim() : asset,
            filename,
            mimeType: kind === "text" ? "text/plain" : mimeType,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            summary?: string;
            materials?: Array<{
              name?: string;
              amount?: string;
              unit?: string;
              note?: string;
            }>;
            error?: { code?: string };
          }
        | null;
      const importedRows: MaterialRow[] =
        payload?.materials
          ?.filter(
            (material) =>
              typeof material.name === "string" && material.name.trim()
          )
          .map((material) => ({
            id: uid(),
            name: material.name?.trim() ?? "",
            amount:
              typeof material.amount === "string" ? material.amount : "",
            unit: typeof material.unit === "string" ? material.unit : "",
            note: typeof material.note === "string" ? material.note : "",
          })) ?? [];

      if (!response.ok || !importedRows.length) {
        throw new Error(payload?.error?.code || "import_failed");
      }
      setRows(importedRows);
      setSummary(typeof payload?.summary === "string" ? payload.summary : "");
    } catch (caughtError) {
      const code =
        caughtError instanceof Error ? caughtError.message : "import_failed";
      setError(materialImportError(language, code));
    } finally {
      setProcessing(false);
    }
  };

  const updateRow = (id: number, patch: Partial<MaterialRow>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const usableRows = rows.filter((row) => row.name.trim());

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="pixel-modal material-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-import-title"
        aria-busy={processing}
      >
        <header className="modal-header">
          <div className="modal-icon">
            <KindIcon size={18} />
          </div>
          <div>
            <span className="micro-label">
              {tr(language, "AI material import", "AI 材料导入")}
            </span>
            <h2 id="material-import-title">
              {tr(
                language,
                `Import from ${kindMeta.label.toLowerCase()}`,
                `从${kindMeta.label}导入`
              )}
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

        <div className="modal-body material-import-body">
          <div className="material-import-intro">
            <KindIcon size={18} aria-hidden="true" />
            <span>
              <strong>{kindMeta.label}</strong>
              <small>{kindMeta.helper}</small>
            </span>
          </div>

          {kind === "text" ? (
            <label className="field material-source-text">
              <span>{tr(language, "Recipe text", "配方文字")}</span>
              <textarea
                rows={8}
                maxLength={16000}
                value={sourceText}
                onChange={(event) => {
                  setSourceText(event.target.value);
                  resetExtraction();
                }}
                placeholder={tr(
                  language,
                  "Example: Pear purée 120 g\nWhipping cream 80 g\nJasmine tea 4 g",
                  "例如：梨果泥 120 克\n淡奶油 80 克\n茉莉花茶 4 克"
                )}
              />
              <small className="field-help">
                {tr(
                  language,
                  `${sourceText.length.toLocaleString()} / 16,000 characters`,
                  `${sourceText.length.toLocaleString()} / 16,000 字符`
                )}
              </small>
            </label>
          ) : (
            <div className="material-file-source">
              <input
                ref={fileRef}
                type="file"
                accept={
                  kind === "image"
                    ? ".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                    : ".mp3,.m4a,.wav,.ogg,.flac,.mp4,.webm,audio/*"
                }
                onChange={handleSourceFile}
              />
              {kind === "audio" && recording ? (
                <div className="material-file-preview audio recording">
                  <span className="material-recording-icon" aria-hidden="true">
                    <Mic size={24} />
                  </span>
                  <span className="material-recording-copy">
                    <strong role="status">
                      {tr(
                        language,
                        "Recording recipe audio",
                        "正在录制配方音频"
                      )}
                    </strong>
                    <small>
                      <time>{formatRecordingTime(recordingSeconds)}</time>
                      <span aria-hidden="true"> · </span>
                      {tr(
                        language,
                        "Speak ingredients, amounts and preparation notes.",
                        "请口述材料、用量与处理说明。"
                      )}
                    </small>
                  </span>
                </div>
              ) : kind === "image" && asset ? (
                <div className="material-file-preview image">
                  <WorkspaceImage
                    src={asset}
                    alt={tr(language, "Recipe source preview", "配方来源预览")}
                  />
                </div>
              ) : kind === "audio" && asset ? (
                <div className="material-file-preview audio">
                  <AudioLines size={26} aria-hidden="true" />
                  <audio
                    controls
                    src={asset}
                    aria-label={tr(
                      language,
                      sourceMethod === "recording"
                        ? "Recorded recipe audio"
                        : "Uploaded recipe audio",
                      sourceMethod === "recording"
                        ? "已录制的配方音频"
                        : "已上传的配方音频"
                    )}
                  />
                </div>
              ) : (
                <div className="material-file-empty">
                  {kind === "image" ? (
                    <ImagePlus size={28} aria-hidden="true" />
                  ) : (
                    <Volume2 size={28} aria-hidden="true" />
                  )}
                  <strong>
                    {tr(
                      language,
                      kind === "image"
                        ? "No recipe image selected"
                        : "No recipe audio selected",
                      kind === "image"
                        ? "尚未选择配方图片"
                        : "尚未选择配方音频"
                    )}
                  </strong>
                </div>
              )}
              <div className="material-file-meta">
                <span>
                  <strong>
                    {recording
                      ? tr(
                          language,
                          `Recording · ${formatRecordingTime(recordingSeconds)}`,
                          `正在录音 · ${formatRecordingTime(recordingSeconds)}`
                        )
                      : filename ||
                        tr(language, "Choose a source file", "选择来源文件")}
                  </strong>
                  <small>
                    {tr(
                      language,
                      recording
                        ? "Stop when your spoken recipe is complete."
                        : sourceMethod === "recording"
                          ? "Recording ready for AI extraction."
                          : kind === "image"
                            ? "PNG, JPG, WEBP or still GIF · 8 MB max"
                            : "MP3, M4A, WAV, OGG, FLAC, MP4 or WEBM · 18 MB max",
                      recording
                        ? "口述完成后停止录音。"
                        : sourceMethod === "recording"
                          ? "录音已准备好，可进行 AI 识别。"
                          : kind === "image"
                            ? "PNG、JPG、WEBP 或静态 GIF · 最大 8 MB"
                            : "MP3、M4A、WAV、OGG、FLAC、MP4 或 WEBM · 最大 18 MB"
                    )}
                  </small>
                </span>
                {kind === "audio" ? (
                  <div className="material-file-actions">
                    <button
                      className={cn(
                        "button",
                        recording ? "danger" : "secondary"
                      )}
                      type="button"
                      onClick={recording ? stopRecording : startRecording}
                      disabled={processing}
                      aria-pressed={recording}
                    >
                      {recording ? <Square size={14} /> : <Mic size={15} />}
                      {recording
                        ? tr(language, "Stop recording", "停止录音")
                        : sourceMethod === "recording"
                          ? tr(language, "Record again", "重新录音")
                          : sourceMethod === "upload"
                            ? tr(language, "Record instead", "改用录音")
                            : tr(language, "Record audio", "录制音频")}
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={recording || processing}
                    >
                      <Upload size={15} />
                      {filename
                        ? tr(language, "Replace file", "更换文件")
                        : tr(language, "Choose file", "选择文件")}
                    </button>
                  </div>
                ) : (
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={processing}
                  >
                    <Upload size={15} />
                    {filename
                      ? tr(language, "Replace", "更换")
                      : tr(language, "Choose file", "选择文件")}
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="material-import-privacy">
            <Layers3 size={14} aria-hidden="true" />
            {tr(
              language,
              "The source is sent to AI for this import only. Only rows you confirm are saved in your local workspace.",
              "来源仅在本次导入时发送给 AI；只有确认后的材料行会保存到本地工作区。"
            )}
          </p>

          {processing && (
            <div className="material-import-status" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={17} />
              <span>
                <strong>
                  {tr(language, "Reading the material source…", "正在读取材料来源……")}
                </strong>
                <small>
                  {tr(
                    language,
                    "Muse is separating ingredients, amounts, units and notes.",
                    "缪斯正在拆分材料、用量、单位与备注。"
                  )}
                </small>
              </span>
            </div>
          )}

          {error && !processing && (
            <div className="render-error material-import-error" role="alert">
              <Bot size={15} />
              <span>{error}</span>
            </div>
          )}

          {rows.length > 0 && !processing && (
            <section
              className="material-import-review"
              aria-labelledby="material-review-title"
            >
              <header>
                <span>
                  <strong id="material-review-title">
                    {tr(language, "Review extracted rows", "检查识别结果")}
                  </strong>
                  <small>
                    {summary ||
                      tr(
                        language,
                        "Edit anything uncertain before adding it.",
                        "添加前可修改任何不确定的内容。"
                      )}
                  </small>
                </span>
                <span className="material-count">
                  {usableRows.length} {tr(language, "rows", "行")}
                </span>
              </header>
              <div className="material-review-headings" aria-hidden="true">
                <span>{tr(language, "Material", "材料")}</span>
                <span>{tr(language, "Amount", "用量")}</span>
                <span>{tr(language, "Unit", "单位")}</span>
                <span>{tr(language, "Note", "备注")}</span>
                <span />
              </div>
              <div className="material-review-rows">
                {rows.map((row, index) => (
                  <article className="material-review-row" key={row.id}>
                    <label>
                      <span>{tr(language, "Material", "材料")}</span>
                      <input
                        value={row.name}
                        onChange={(event) =>
                          updateRow(row.id, { name: event.target.value })
                        }
                        aria-label={tr(
                          language,
                          `Material ${index + 1} name`,
                          `第 ${index + 1} 项材料名称`
                        )}
                      />
                    </label>
                    <label>
                      <span>{tr(language, "Amount", "用量")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.amount}
                        onChange={(event) =>
                          updateRow(row.id, { amount: event.target.value })
                        }
                        aria-label={tr(
                          language,
                          `${row.name || `Material ${index + 1}`} amount`,
                          `${row.name || `第 ${index + 1} 项材料`}用量`
                        )}
                      />
                    </label>
                    <label>
                      <span>{tr(language, "Unit", "单位")}</span>
                      <MaterialUnitInput
                        value={row.unit}
                        onChange={(unit) => updateRow(row.id, { unit })}
                        language={language}
                        label={tr(
                          language,
                          `${row.name || `Material ${index + 1}`} unit`,
                          `${row.name || `第 ${index + 1} 项材料`}单位`
                        )}
                      />
                    </label>
                    <label>
                      <span>{tr(language, "Note", "备注")}</span>
                      <input
                        value={row.note}
                        onChange={(event) =>
                          updateRow(row.id, { note: event.target.value })
                        }
                        aria-label={tr(
                          language,
                          `${row.name || `Material ${index + 1}`} note`,
                          `${row.name || `第 ${index + 1} 项材料`}备注`
                        )}
                      />
                    </label>
                    <button
                      className="square-button mini danger"
                      type="button"
                      onClick={() =>
                        setRows((current) =>
                          current.filter((item) => item.id !== row.id)
                        )
                      }
                      aria-label={tr(
                        language,
                        `Remove ${row.name || `material ${index + 1}`}`,
                        `删除 ${row.name || `第 ${index + 1} 项材料`}`
                      )}
                    >
                      <Trash2 size={13} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="modal-footer material-import-footer">
          <button className="button ghost" type="button" onClick={onClose}>
            {tr(language, "Cancel", "取消")}
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={extractMaterials}
            disabled={!sourceReady || processing || recording}
          >
            {processing ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <WandSparkles size={15} />
            )}
            {rows.length
              ? tr(language, "Scan again", "重新识别")
              : tr(language, "Extract with AI", "使用 AI 识别")}
          </button>
          {rows.length > 0 && (
            <button
              className="button primary"
              type="button"
              disabled={!usableRows.length || processing}
              onClick={() => onApply(usableRows)}
            >
              <Check size={15} />
              {tr(
                language,
                `Add ${usableRows.length} to table`,
                `添加 ${usableRows.length} 行到表格`
              )}
            </button>
          )}
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
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [stage, setStage] = useState<Stage>("idea");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const closeGallery = useCallback(() => setGalleryOpen(false), []);
  const [ideas, setIdeas] = useState<IdeaCard[]>(seedIdeas);
  const [selectedIdeaId, setSelectedIdeaId] = useState(1);
  const [ideaText, setIdeaText] = useState("");
  const [ideaImages, setIdeaImages] = useState<IdeaAttachment[]>([]);
  const ideaImage = ideaImages[0]?.src ?? "";
  const ideaImageName = ideaImages[0]?.name ?? "";
  const [ideaAudioBusy, setIdeaAudioBusy] = useState(false);
  const [ideaImagesLoading, setIdeaImagesLoading] = useState(false);
  const [structuringIdea, setStructuringIdea] = useState(false);
  const ideaSubmitting = useRef(false);
  const ideaImageInput = useRef<HTMLInputElement>(null);
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
  const [materialUploadMenuOpen, setMaterialUploadMenuOpen] = useState(false);
  const [materialImportKind, setMaterialImportKind] =
    useState<MaterialImportKind | null>(null);
  const [stepEditor, setStepEditor] = useState<PlanStep | "new" | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [bakeMode, setBakeMode] = useState<"chef" | "diner">("chef");
  const [productionRows, setProductionRows] = useState<ProductionRow[]>(() =>
    seedProductionRows.map((row) => ({ ...row }))
  );
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>(
    {}
  );
  const [selectedHandbookIdeaIds, setSelectedHandbookIdeaIds] = useState<number[]>([1, 2, 3]);
  const [handbookStylePrompt, setHandbookStylePrompt] = useState("");
  const [handbookReferenceImage, setHandbookReferenceImage] = useState("");
  const [handbookReferenceName, setHandbookReferenceName] = useState("");
  const [handbookPageCount, setHandbookPageCount] = useState(
    DEFAULT_HANDBOOK_PAGE_COUNT
  );
  const [handbookPageCursor, setHandbookPageIndex] = useState(0);
  const [handbookPageTurn, setHandbookPageTurn] = useState<{
    direction: "next" | "previous";
    token: number;
  }>({ direction: "next", token: 0 });
  const [handbookResult, setHandbookResult] = useState<HandbookResult | null>(null);
  const [handbookGenerating, setHandbookGenerating] = useState(false);
  const [handbookError, setHandbookError] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement | null>(null);
  const ideaSelectorRef = useRef<HTMLDivElement | null>(null);
  const dockAddRef = useRef<HTMLDivElement | null>(null);
  const materialUploadRef = useRef<HTMLDivElement | null>(null);
  const handbookReferenceRef = useRef<HTMLInputElement | null>(null);
  const workspaceSaveWarningShown = useRef(false);

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
  const productionVariantsByIdea = useMemo(
    () =>
      Object.fromEntries(
        ideas.map((idea) => [
          idea.id,
          productDrafts[idea.id]?.variants ?? [],
        ])
      ) as Record<number, SizeVariant[]>,
    [ideas, productDrafts]
  );
  const selectedHandbookIdeas = ideas.filter((idea) =>
    selectedHandbookIdeaIds.includes(idea.id)
  );
  const currentHandbookSignature = hashText(
    [
      language,
      handbookStylePrompt,
      handbookPageCount,
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
  const handbookPages = handbookResult?.pages ?? [];
  const handbookPageIndex = Math.min(
    handbookPageCursor,
    Math.max(0, handbookPages.length - 1)
  );
  const handbookPage = handbookPages[handbookPageIndex] ?? "";
  const stageIndex = stages.findIndex((item) => item.id === stage);

  const turnHandbookPage = (direction: "next" | "previous") => {
    const delta = direction === "next" ? 1 : -1;
    const nextPageIndex = Math.min(
      Math.max(handbookPageIndex + delta, 0),
      Math.max(0, handbookPages.length - 1)
    );
    if (nextPageIndex === handbookPageIndex) return;
    setHandbookPageIndex(nextPageIndex);
    setHandbookPageTurn((current) => ({
      direction,
      token: current.token + 1,
    }));
  };

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
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem("dessert-valley-language", language);
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    const hydrateWorkspace = async () => {
      if (!hasWorkspaceCookie()) ensureWorkspaceCookie();

      try {
        const stored = await readWorkspace<unknown>();
        const migratedWorkspace = migrateWorkspaceData(
          stored?.data,
          stored?.version
        );
        const workspace = migratedWorkspace ?? createSeedWorkspaceData();

        if (
          stored?.version !== WORKSPACE_STORAGE_VERSION ||
          !migratedWorkspace
        ) {
          await writeWorkspace(workspace);
        }
        if (cancelled) return;

        const activeIdeaId = workspace.ideas.some(
          (idea) => idea.id === workspace.selectedIdeaId
        )
          ? workspace.selectedIdeaId
          : workspace.ideas[0].id;

        setStage(workspace.stage);
        setIdeas(workspace.ideas);
        setSelectedIdeaId(activeIdeaId);
        setIdeaText(workspace.ideaText);
        setIdeaImages(normalizeIdeaAttachments(workspace.ideaImages, workspace.ideaImage, workspace.ideaImageName));
        setReferencePackages(workspace.referencePackages);
        setViewStyle(workspace.viewStyle);
        setRenderResults(workspace.renderResults);
        setProductDrafts(workspace.productDrafts);
        setBakeMode(workspace.bakeMode);
        setProductionRows(workspace.productionRows);
        setMaterialPrices(workspace.materialPrices);
        setSelectedHandbookIdeaIds(workspace.selectedHandbookIdeaIds);
        setHandbookStylePrompt(workspace.handbookStylePrompt);
        setHandbookReferenceImage(workspace.handbookReferenceImage);
        setHandbookReferenceName(workspace.handbookReferenceName);
        setHandbookPageCount(workspace.handbookPageCount);
        setHandbookResult(workspace.handbookResult);
        setWorkspaceHydrated(true);
      } catch {
        if (cancelled) return;
        ensureWorkspaceCookie();
        setWorkspaceHydrated(true);
        setToast(
          "Local autosave is unavailable in this browser. / 本地自动保存不可用。"
        );
      }
    };

    void hydrateWorkspace();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceHydrated) return;

    const snapshot: WorkspaceData = {
      stage,
      ideas,
      selectedIdeaId,
      ideaText,
      ideaImage,
      ideaImageName,
      ideaImages,
      referencePackages,
      viewStyle,
      renderResults,
      productDrafts,
      bakeMode,
      productionRows,
      materialPrices,
      selectedHandbookIdeaIds,
      handbookStylePrompt,
      handbookReferenceImage,
      handbookReferenceName,
      handbookPageCount,
      handbookResult,
    };
    const persistSnapshot = () => {
      void writeWorkspace(snapshot).catch(() => {
        if (workspaceSaveWarningShown.current) return;
        workspaceSaveWarningShown.current = true;
        setToast(
          "This workspace could not be saved locally. / 无法在本地保存此工作区。"
        );
      });
    };
    const timer = window.setTimeout(persistSnapshot, 150);
    window.addEventListener("pagehide", persistSnapshot);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persistSnapshot);
    };
  }, [
    bakeMode,
    handbookReferenceImage,
    handbookReferenceName,
    handbookPageCount,
    handbookResult,
    handbookStylePrompt,
    ideaImage,
    ideaImageName,
    ideaImages,
    ideas,
    ideaText,
    materialPrices,
    productionRows,
    productDrafts,
    referencePackages,
    renderResults,
    selectedHandbookIdeaIds,
    selectedIdeaId,
    stage,
    viewStyle,
    workspaceHydrated,
  ]);

  const toggleLanguage = () => {
    const nextLanguage: Language = language === "en" ? "zh" : "en";
    setLanguage(nextLanguage);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dockAddRef.current &&
        !dockAddRef.current.contains(event.target as Node)
      ) {
        setDockOpen(false);
      }
      if (
        ideaSelectorRef.current &&
        !ideaSelectorRef.current.contains(event.target as Node)
      ) {
        setIdeaMenuOpen(false);
      }
      if (
        materialUploadRef.current &&
        !materialUploadRef.current.contains(event.target as Node)
      ) {
        setMaterialUploadMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (dockAddRef.current?.contains(document.activeElement)) {
          dockAddRef.current.querySelector<HTMLButtonElement>("button")?.focus();
        }
        setDockOpen(false);
        setIdeaMenuOpen(false);
        setMaterialUploadMenuOpen(false);
        setAgentOpen(false);
      }
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
    setDockOpen(false);
    setIdeaMenuOpen(false);
    setMaterialUploadMenuOpen(false);
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
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || structuringIdea || ideaImagesLoading) return;
    if (files.length + ideaImages.length > MAX_IDEA_IMAGES) {
      notify(tr(language, "Attach up to 4 images for this idea.", "每个创意最多可添加 4 张图片。"));
      return;
    }
    setIdeaImagesLoading(true);
    try {
      const images = await Promise.all(files.map(async (file) => {
        if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("invalid_image");
        return { src: await normalizeReferenceImage(await readFileAsDataUrl(file)), name: file.name };
      }));
      setIdeaImages((current) => normalizeIdeaAttachments([...current, ...images]));
    } catch {
      notify(tr(language, "Choose readable images up to 8 MB each. Your existing images are kept.", "请选择每张不超过 8 MB 的有效图片，已有图片会保留。"));
    } finally {
      setIdeaImagesLoading(false);
    }
  };

  const addIdea = async () => {
    if (ideaSubmitting.current || ideaAudioBusy || ideaImagesLoading || (!ideaText.trim() && !ideaImages.length)) return;
    if (ideaText.length > MAX_IDEA_TEXT_LENGTH) {
      notify(tr(language, "Shorten the idea to 16,000 characters before adding it.", "请将创意文字缩短至 16,000 字符以内。"));
      return;
    }
    ideaSubmitting.current = true;
    setStructuringIdea(true);
    const imagesSnapshot = [...ideaImages];
    const languageSnapshot = language;
    try {
      const fields = await structureIdea({ text: ideaText.trim(), language: languageSnapshot, images: imagesSnapshot });
      const idea: IdeaCard = { id: uid(), ...fields };
      const extraReferences: DesignReference[] = imagesSnapshot
        .filter((image) => image.src !== idea.image)
        .map((image) => ({ id: uid(), kind: "image", title: image.name || "Idea reference", content: "", asset: image.src }));
      setIdeas((current) => [idea, ...current]);
      setSelectedIdeaId(idea.id);
      setReferencePackages((current) => ({
        ...current,
        [idea.id]: [...inheritedReferences(idea), ...extraReferences],
      }));
      setProductDrafts((current) => ({ ...current, [idea.id]: emptyProductDraft() }));
      setIdeaText("");
      setIdeaImages([]);
      notify(tr(languageSnapshot, "Idea polished and added to the gallery", "创意已整理润色并添加到画廊"));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "idea_failed";
      notify(code === "not_configured"
        ? tr(languageSnapshot, "Idea polishing is not configured yet. Your draft is kept.", "创意整理功能尚未配置，草稿已保留。")
        : code === "rate_limit"
          ? tr(languageSnapshot, "The idea editor is busy. Your draft is kept; try again shortly.", "创意编辑助手正忙，草稿已保留，请稍后重试。")
          : code === "idea_blocked"
            ? tr(languageSnapshot, "This idea could not be processed. Revise the text or images and try again.", "暂时无法处理此创意，请调整文字或图片后重试。")
            : tr(languageSnapshot, "Could not polish this idea. Your text and images are kept; try again.", "创意整理失败，文字与图片已保留，请重试。"));
    } finally {
      ideaSubmitting.current = false;
      setStructuringIdea(false);
    }
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
    setProductionRows((current) =>
      current.filter((row) => row.ideaId !== removedId)
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

  const addImportedMaterials = (rows: MaterialRow[]) => {
    setActiveMaterials((current) => consolidateMaterials([...current, ...rows]));
    setMaterialImportKind(null);
    notify(
      tr(
        language,
        "Materials added; matching materials and compatible units combined",
        "材料已添加，相同材料的兼容单位用量已合并"
      )
    );
  };

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

  const addProductionBatchForIdea = (
    ideaId: number,
    continueToBake = false
  ) => {
    const idea = ideas.find((candidate) => candidate.id === ideaId) ?? ideas[0];
    if (!idea) return;
    const defaultVariants = productionVariantsByIdea[idea.id] ?? [];
    setProductionRows((current) => [
      ...current,
      {
        id: uid(),
        ideaId: idea.id,
        variantId: defaultVariants[0]?.id ?? null,
        count: 1,
      },
    ]);
    if (continueToBake) {
      setBakeMode("chef");
      openStage("bake");
      notify(
        tr(
          language,
          `${idea.title} added as a production batch`,
          `${idea.title} 已添加为生产批次`
        )
      );
    }
  };

  const addProductionBatch = () =>
    addProductionBatchForIdea(selectedIdea.id);

  const productionIdeas = useMemo(
    () =>
      productionRows.reduce<IdeaCard[]>((linkedIdeas, row) => {
        const idea = ideas.find((candidate) => candidate.id === row.ideaId);
        return idea && !linkedIdeas.some((candidate) => candidate.id === idea.id)
          ? [...linkedIdeas, idea]
          : linkedIdeas;
      }, []),
    [ideas, productionRows]
  );

  const consolidateRows = useMemo(
    () => {
      const consolidated = new Map<
        string,
        {
          key: string;
          name: string;
          unit: string;
          amounts: Record<number, number>;
        }
      >();

      productionRows.forEach((batch) => {
        const idea = ideas.find((candidate) => candidate.id === batch.ideaId);
        if (!idea) return;
        const draft = productDrafts[idea.id] ?? emptyProductDraft();
        const variants = draft.variants;
        const selectedVariant =
          variants.find((variant) => variant.id === batch.variantId) ??
          variants[0];
        const variantScale =
          selectedVariant && variants[0]
            ? sizeVariantScale(selectedVariant, variants[0])
            : 1;
        const batchScale = Math.max(0, batch.count) * variantScale;

        draft.materials.forEach((material) => {
          const name = material.name.trim();
          if (!name) return;
          const unit = normalizeMaterialUnit(material.unit);
          const group = materialGroupKey(name, unit) ?? `unknown:${idea.id}:${material.id}`;
          const current = consolidated.get(group) ?? {
            key: unit ? materialKey(name, unit) : group,
            name,
            unit,
            amounts: {},
          };
          current.amounts[idea.id] =
            (current.amounts[idea.id] ?? 0) +
            (convertMaterialAmount(materialAmount(material.amount) * batchScale, unit, current.unit)
              ?? materialAmount(material.amount) * batchScale);
          consolidated.set(group, current);
        });
      });

      return Array.from(consolidated.values()).map((row) => {
        const total = Object.values(row.amounts).reduce(
          (sum, amount) => sum + amount,
          0
        );
        const price = materialPrices[row.key] ?? compatibleMaterialPrice(materialPrices, row.name, row.unit);
        return { ...row, total, price, cost: total * price };
      });
    },
    [ideas, materialPrices, productDrafts, productionRows]
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
      materialPrices,
      handbook: {
        selectedIdeaIds: selectedHandbookIdeaIds,
        stylePrompt: handbookStylePrompt,
        pageCount: handbookPageCount,
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
      const importedIdeas = Array.isArray(payload.ideas)
        ? (payload.ideas as IdeaCard[])
        : ideas;
      if (Array.isArray(payload.ideas)) setIdeas(importedIdeas);
      const importedProductionRows = normalizeProductionRows(
        payload.productionRows,
        importedIdeas,
        renderResults
      );
      setProductionRows(importedProductionRows);
      setMaterialPrices(normalizeMaterialPrices(payload.materialPrices));
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
        if (
          typeof payload.handbook.pageCount === "number" &&
          Number.isInteger(payload.handbook.pageCount) &&
          payload.handbook.pageCount >= 1 &&
          payload.handbook.pageCount <= MAX_HANDBOOK_PAGE_COUNT
        ) {
          setHandbookPageCount(payload.handbook.pageCount);
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
    const pageCountSnapshot = handbookPageCount;
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
          pageCount: pageCountSnapshot,
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
            images?: unknown;
            dessertCount?: number;
            visualInputCount?: number;
            error?: { code?: string; message?: string };
          }
        | null;
      const pages = Array.isArray(payload?.images)
        ? payload.images.filter(
            (image): image is string =>
              typeof image === "string" &&
              (image.startsWith("data:image/") || /^https?:\/\//i.test(image))
          )
        : [];
      if (
        !response.ok ||
        !payload ||
        pages.length !== pageCountSnapshot
      ) {
        throw new Error(payload?.error?.code || "generation_failed");
      }
      setHandbookResult({
        pages,
        signature: signatureSnapshot,
        dessertCount: payload.dessertCount ?? selectedSnapshot.length,
        visualInputCount: payload.visualInputCount ?? 0,
      });
      setHandbookPageIndex(0);
      setHandbookPageTurn({ direction: "next", token: 0 });
      notify(
        tr(
          languageSnapshot,
          `${pages.length}-page AI handbook is ready`,
          `${pages.length} 页 AI 手册已生成`
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
    const pages = handbookResult?.pages ?? [];
    if (!pages.length) {
      notify(
        tr(
          language,
          "Generate the AI handbook pages before exporting.",
          "请先生成 AI 手册页面再导出。"
        )
      );
      return;
    }
    const pageMarkup = pages
      .map(
        (page, index) =>
          `<section class="page"><img src="${escapeHtml(
            page
          )}" alt="${escapeHtml(
            tr(
              language,
              `AI-generated dessert handbook page ${index + 1}`,
              `AI 生成的甜点手册第 ${index + 1} 页`
            )
          )}"></section>`
      )
      .join("");
    const handbookTitle = tr(language, "Dessert Handbook", "甜点手册");
    const html = `<!doctype html><html lang="${
      language === "zh" ? "zh-CN" : "en"
    }"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dessert Valley — ${escapeHtml(
      handbookTitle
    )}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#3f713d}.page{width:min(100%,210mm);aspect-ratio:2/3;margin:0 auto 18px;background:#f4dfa8;break-after:page;page-break-after:always}.page:last-child{margin-bottom:0;break-after:auto;page-break-after:auto}.page img{width:100%;height:100%;display:block;object-fit:cover}@media print{body{background:white}.page{width:210mm;height:297mm;margin:0}}</style></head><body><main>${pageMarkup}</main></body></html>`;
    downloadBlob(new Blob([html], { type: "text/html" }), "dessert-valley-handbook.html");
    notify(tr(language, "HTML handbook exported", "HTML 手册已导出"));
  };

  const exportHandbookImages = async () => {
    const pages = handbookResult?.pages ?? [];
    if (!pages.length) {
      notify(
        tr(
          language,
          "Generate the AI handbook pages before exporting.",
          "请先生成 AI 手册页面再导出。"
        )
      );
      return;
    }
    try {
      const pageBlobs = await Promise.all(
        pages.map(async (page) => {
          const response = await fetch(page);
          if (!response.ok) throw new Error("page_export_failed");
          return response.blob();
        })
      );
      pageBlobs.forEach((blob, index) => {
        const extension = blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "jpg";
        downloadBlob(
          blob,
          `dessert-valley-handbook-${String(index + 1).padStart(
            2,
            "0"
          )}.${extension}`
        );
      });
      notify(
        tr(
          language,
          `${pageBlobs.length} handbook page images exported`,
          `已导出 ${pageBlobs.length} 张手册页面图片`
        )
      );
    } catch {
      notify(
        tr(
          language,
          "The handbook pages could not be exported.",
          "无法导出手册页面。"
        )
      );
    }
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
            className="square-button gallery-trigger"
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={tr(language, "Open masterpiece gallery", "打开作品画廊")}
            data-tip={tr(language, "Masterpiece gallery", "作品画廊")}
            aria-haspopup="dialog"
            aria-expanded={galleryOpen}
          >
            <Images size={16} />
          </button>
          <button
            className="square-button import-cards-button"
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

            <div className="idea-composer pixel-panel" aria-busy={structuringIdea}>
              <textarea
                value={ideaText}
                onChange={(event) => setIdeaText(event.target.value)}
                disabled={!workspaceHydrated || structuringIdea}
                maxLength={MAX_IDEA_TEXT_LENGTH}
                placeholder={tr(
                  language,
                  "A tiny chestnut tart with maple cream and a little acorn lid…",
                  "一款迷你栗子挞，配枫糖奶油和小橡果造型顶盖……"
                )}
                aria-label={tr(language, "Dessert idea", "甜点创意")}
              />
              {ideaImages.length > 0 && <div className="idea-image-attachments" aria-label={tr(language, "Attached idea images", "创意附图")}>
                {ideaImages.map((image, index) => <div className="idea-image-attachment" key={image.src}>
                  <WorkspaceImage src={image.src} alt={image.name || tr(language, "Idea reference", "创意参考")} />
                  <span>{image.name}</span>
                  <button className="square-button" type="button" disabled={!workspaceHydrated || structuringIdea || ideaImagesLoading}
                    onClick={() => setIdeaImages((current) => current.filter((_image, position) => position !== index))}
                    aria-label={tr(language, `Remove image ${index + 1}`, `移除第 ${index + 1} 张图片`)}><X size={16} /></button>
                </div>)}
              </div>}
              <div className="composer-footer">
                <div className="composer-assets">
                  <button className="tool-chip" type="button" onClick={() => ideaImageInput.current?.click()}
                    disabled={!workspaceHydrated || structuringIdea || ideaImagesLoading || ideaImages.length >= MAX_IDEA_IMAGES}>
                    {ideaImagesLoading ? <LoaderCircle className="spin" size={15} /> : <ImagePlus size={15} />}
                    {tr(language, "Add image", "添加图片")}
                  </button>
                  <input ref={ideaImageInput} type="file" accept="image/*" multiple hidden onChange={handleIdeaImage}
                    disabled={!workspaceHydrated || structuringIdea || ideaImagesLoading || ideaImages.length >= MAX_IDEA_IMAGES} />
                  <IdeaAudioInput language={language} disabled={!workspaceHydrated || structuringIdea || ideaImagesLoading}
                    onBusyChange={setIdeaAudioBusy}
                    onError={notify}
                    onTranscript={(text) => {
                      setIdeaText((current) => current.trimEnd() ? `${current.trimEnd()}\n${text}` : text);
                    }} />
                </div>
                <button className={cn("button primary", structuringIdea && "thinking")} type="button" onClick={addIdea}
                  disabled={!workspaceHydrated || structuringIdea || ideaAudioBusy || ideaImagesLoading || (!ideaText.trim() && !ideaImages.length)}>
                  {structuringIdea ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
                  <span aria-live="polite" aria-atomic="true">{structuringIdea ? tr(language, "Muse Thinking", "缪斯思考中") : tr(language, "Add to gallery", "添加到画廊")}</span>
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
                      <WorkspaceImage
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
                    <WorkspaceImage src={selectedIdea.image} alt="" />
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
                            <WorkspaceImage src={idea.image} alt="" />
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
                  <div className="dock-add-wrap" ref={dockAddRef}>
                    <button
                      className="add-reference-button"
                      type="button"
                      onClick={() => setDockOpen((current) => !current)}
                      aria-expanded={dockOpen}
                      aria-haspopup="menu"
                    >
                      <Plus size={18} /> {tr(language, "Add", "添加")}
                      <ChevronDown size={14} />
                    </button>
                    {dockOpen && (
                      <div className="dock-menu" role="menu">
                        {addableReferenceKinds.map((kind) => {
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
                            <WorkspaceImage
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
                      <WorkspaceImage
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
                        <WorkspaceImage
                          src={ideaRender?.src || idea.image}
                          alt=""
                        />
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
                <WorkspaceImage
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
                <div className="section-actions">
                  <div className="material-upload-wrap" ref={materialUploadRef}>
                    <button
                      className="button ghost"
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={materialUploadMenuOpen}
                      aria-controls="material-upload-menu"
                      onClick={() =>
                        setMaterialUploadMenuOpen((current) => !current)
                      }
                    >
                      <Upload size={15} />
                      {tr(language, "Upload", "上传")}
                      <ChevronDown size={13} aria-hidden="true" />
                    </button>
                    {materialUploadMenuOpen && (
                      <div
                        className="material-upload-menu"
                        id="material-upload-menu"
                        role="menu"
                        aria-label={tr(
                          language,
                          "Choose material source",
                          "选择材料来源"
                        )}
                      >
                        {(
                          [
                            {
                              kind: "text" as const,
                              icon: FileText,
                              label: tr(language, "Text", "文字"),
                              helper: tr(
                                language,
                                "Paste a recipe or ingredient list",
                                "粘贴配方或材料清单"
                              ),
                            },
                            {
                              kind: "audio" as const,
                              icon: AudioLines,
                              label: tr(language, "Audio", "音频"),
                              helper: tr(
                                language,
                                "Upload a spoken kitchen note",
                                "上传厨房语音记录"
                              ),
                            },
                            {
                              kind: "image" as const,
                              icon: FileImage,
                              label: tr(language, "Image", "图片"),
                              helper: tr(
                                language,
                                "Upload a recipe photo or label",
                                "上传配方照片或标签"
                              ),
                            },
                          ] satisfies Array<{
                            kind: MaterialImportKind;
                            icon: typeof FileText;
                            label: string;
                            helper: string;
                          }>
                        ).map((option) => {
                          const OptionIcon = option.icon;
                          return (
                            <button
                              type="button"
                              role="menuitem"
                              key={option.kind}
                              onClick={() => {
                                setMaterialUploadMenuOpen(false);
                                setMaterialImportKind(option.kind);
                              }}
                            >
                              <span>
                                <OptionIcon size={16} aria-hidden="true" />
                              </span>
                              <span>
                                <strong>{option.label}</strong>
                                <small>{option.helper}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={addMaterial}
                  >
                    <Plus size={15} />
                    {tr(language, "Add material", "添加材料")}
                  </button>
                </div>
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
                            <MaterialUnitInput
                              value={row.unit}
                              onChange={(unit) => updateMaterial(row.id, { unit })}
                              language={language}
                              label={tr(language, `${row.name || "Material"} unit`, `${row.name || "材料"}单位`)}
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
                          <WorkspaceImage
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
              <button
                className="button primary"
                type="button"
                onClick={() =>
                  addProductionBatchForIdea(selectedIdea.id, true)
                }
              >
                {tr(language, "Save & add production batch", "保存并添加生产批次")}{" "}
                <ArrowRight size={15} />
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
                          "Every batch stays linked to its Product card, specification and recipe.",
                          "每个批次都会与其产品卡、规格及配方保持关联。"
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
                    {productionRows.length === 0 ? (
                      <div className="production-empty">
                        <PackageCheck size={24} />
                        <strong>
                          {tr(
                            language,
                            "No production batches yet",
                            "尚无生产批次"
                          )}
                        </strong>
                        <small>
                          {tr(
                            language,
                            "Add a batch here, or send the active recipe from the Product page.",
                            "可在此添加批次，或从“产品”页把当前配方加入生产。"
                          )}
                        </small>
                      </div>
                    ) : productionRows.map((row) => {
                      const idea =
                        ideas.find(
                          (candidate) => candidate.id === row.ideaId
                        ) ?? ideas[0];
                      if (!idea) return null;
                      const linkedDraft =
                        productDrafts[idea.id] ?? emptyProductDraft();
                      const linkedMaterials = linkedDraft.materials.filter(
                        (material) => material.name.trim()
                      );
                      const localizedProductName = localizedIdeaName(
                        idea,
                        language
                      );
                      const productVariant = ideaVariant(idea);
                      const artwork =
                        renderResults[idea.id]?.src ||
                        idea.image ||
                        products[productVariant].image;
                      const productVariants =
                        productionVariantsByIdea[idea.id] ?? [];
                      const selectedVariant =
                        productVariants.find(
                          (variant) => variant.id === row.variantId
                        ) ?? productVariants[0];
                      const productOptions = ideas.map(
                        (productIdea, index) => ({
                          value: productIdea.id,
                          label: localizedIdeaName(productIdea, language),
                          helper: tr(
                            language,
                            `${productDrafts[
                              productIdea.id
                            ]?.materials.filter((material) =>
                              material.name.trim()
                            ).length ?? 0} materials · ${ideaAlias(
                              productIdea,
                              index
                            )}`,
                            `${productDrafts[
                              productIdea.id
                            ]?.materials.filter((material) =>
                              material.name.trim()
                            ).length ?? 0} 种材料 · ${ideaAlias(
                              productIdea,
                              index
                            )}`
                          ),
                        })
                      );
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
                          <WorkspaceImage
                            className="production-thumb"
                            src={artwork}
                            alt={tr(
                              language,
                              `${localizedProductName} product rendering`,
                              `${localizedProductName} 产品渲染图`
                            )}
                          />
                          <div className="production-field product-field">
                            <span>{tr(language, "Dessert", "甜点")}</span>
                            <PixelSelect
                              value={idea.id}
                              options={productOptions}
                              onChange={(ideaId) => {
                                const nextVariants =
                                  productionVariantsByIdea[ideaId] ?? [];
                                updateProduction(row.id, {
                                  ideaId,
                                  variantId: nextVariants[0]?.id ?? null,
                                });
                              }}
                              label={tr(
                                language,
                                "Dessert card",
                                "甜点卡"
                              )}
                            />
                            <small
                              className={cn(
                                "production-source",
                                !linkedMaterials.length && "missing"
                              )}
                            >
                              {linkedMaterials.length
                                ? tr(
                                    language,
                                    `${linkedMaterials.length} recipe materials linked`,
                                    `已关联 ${linkedMaterials.length} 种配方材料`
                                  )
                                : tr(
                                    language,
                                    "Recipe has no materials yet",
                                    "该配方尚未添加材料"
                                  )}
                            </small>
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
                          "Amounts come from Product recipes and scale by specification × quantity. Hover an alias for the full name.",
                          "用量读取自产品配方，并按“规格 × 数量”缩放；悬停简称可查看全名。"
                        )}
                      </p>
                    </div>
                  </div>
                  {consolidateRows.length === 0 ? (
                    <button
                      className="empty-state compact cost-empty"
                      type="button"
                      onClick={() => {
                        const ideaId =
                          productionRows[0]?.ideaId ?? selectedIdea.id;
                        const idea =
                          ideas.find((candidate) => candidate.id === ideaId) ??
                          selectedIdea;
                        activateIdea(idea);
                        openStage("product");
                      }}
                    >
                      <CakeSlice size={24} />
                      <strong>
                        {tr(
                          language,
                          productionRows.length
                            ? "No recipe materials to consolidate"
                            : "Add a production batch first",
                          productionRows.length
                            ? "没有可合并的配方材料"
                            : "请先添加生产批次"
                        )}
                      </strong>
                      <small>
                        {tr(
                          language,
                          productionRows.length
                            ? "Open the linked Product card and add material names, base amounts and units."
                            : "Batches pull their dessert, specification and recipe directly from the Product page.",
                          productionRows.length
                            ? "打开关联的产品卡，添加材料名称、基础用量和单位。"
                            : "批次会直接读取“产品”页中的甜点、规格与配方。"
                        )}
                      </small>
                    </button>
                  ) : (
                    <>
                      <div className="cost-table-scroll">
                        <table className="cost-table">
                          <thead>
                            <tr>
                              <th>{tr(language, "Material", "材料")}</th>
                              {productionIdeas.map((idea, index) => {
                                const alias = ideaAlias(idea, index);
                                const fullName = localizedIdeaName(
                                  idea,
                                  language
                                );
                                return (
                                  <th key={idea.id}>
                                    <button
                                      type="button"
                                      className="alias-tip"
                                      data-full-name={fullName}
                                      title={fullName}
                                      aria-label={`${alias} — ${fullName}`}
                                    >
                                      {alias}
                                    </button>
                                  </th>
                                );
                              })}
                              <th>{tr(language, "Total", "总量")}</th>
                              <th>{tr(language, "Unit price", "单价")}</th>
                              <th>{tr(language, "Cost", "成本")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consolidateRows.map((row) => (
                              <tr key={row.key}>
                                <td>
                                  {row.name}
                                  <small>{row.unit}</small>
                                </td>
                                {productionIdeas.map((idea) => (
                                  <td key={idea.id}>
                                    {formatMaterialAmount(
                                      row.amounts[idea.id] ?? 0,
                                      language
                                    )}
                                  </td>
                                ))}
                                <td>
                                  <strong>
                                    {formatMaterialAmount(row.total, language)}
                                  </strong>
                                </td>
                                <td>
                                  <label className="price-field">
                                    <span aria-hidden="true">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={row.price || ""}
                                      placeholder="0"
                                      onChange={(event) => {
                                        const nextPrice = Number(
                                          event.target.value
                                        );
                                        setMaterialPrices((current) => ({
                                          ...current,
                                          [row.key]: Number.isFinite(nextPrice)
                                            ? Math.max(0, nextPrice)
                                            : 0,
                                        }));
                                      }}
                                      aria-label={tr(
                                        language,
                                        `${row.name} price per ${row.unit}`,
                                        `${row.name} 每 ${row.unit} 单价`
                                      )}
                                    />
                                    <small>/ {row.unit}</small>
                                  </label>
                                </td>
                                <td>
                                  <strong>${row.cost.toFixed(2)}</strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="cost-total">
                        <span>
                          {tr(
                            language,
                            "Total ingredient estimate",
                            "材料成本估算"
                          )}
                        </span>
                        <strong>
                          $
                          {consolidateRows
                            .reduce((sum, row) => sum + row.cost, 0)
                            .toFixed(2)}
                        </strong>
                      </div>
                    </>
                  )}
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
                            <WorkspaceImage
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
                    <div className="handbook-page-settings">
                      <label>
                        <span>{tr(language, "Pages", "页数")}</span>
                        <input
                          type="number"
                          min={1}
                          max={MAX_HANDBOOK_PAGE_COUNT}
                          value={handbookPageCount}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            setHandbookPageCount(
                              Math.min(
                                MAX_HANDBOOK_PAGE_COUNT,
                                Math.max(
                                  1,
                                  Number.isFinite(nextValue)
                                    ? Math.round(nextValue)
                                    : 1
                                )
                              )
                            );
                          }}
                          aria-describedby="handbook-page-help"
                        />
                      </label>
                      <p id="handbook-page-help">
                        <Layers3 size={14} />
                        {tr(
                          language,
                          `1–${MAX_HANDBOOK_PAGE_COUNT} finished AI images. Selected dessert cards are attached to every page prompt.`,
                          `可生成 1–${MAX_HANDBOOK_PAGE_COUNT} 张完整 AI 页面；每页提示词都会附上已选甜点卡片。`
                        )}
                      </p>
                    </div>
                    {handbookReferenceImage ? (
                      <div className="handbook-reference-attached">
                        <WorkspaceImage src={handbookReferenceImage} alt="" />
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
                            `Generating ${handbookPageCount} pages…`,
                            `正在生成 ${handbookPageCount} 页……`
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
                          `Composing ${handbookPageCount} finished pages from the selected cards and style references…`,
                          `正在根据已选卡片与风格参考生成 ${handbookPageCount} 张完整页面……`
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

                  <div className="handbook-book">
                    <div
                      id="handbook-page-viewer"
                      className="handbook-sheet"
                      role="group"
                      tabIndex={0}
                      aria-label={tr(
                        language,
                        handbookPage
                          ? `AI handbook page ${handbookPageIndex + 1} of ${handbookPages.length}. Use the left and right arrow keys to turn pages.`
                          : "AI handbook page preview",
                        handbookPage
                          ? `AI 手册第 ${handbookPageIndex + 1} 页，共 ${handbookPages.length} 页。可使用左右方向键翻页。`
                          : "AI 手册页面预览"
                      )}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          turnHandbookPage("previous");
                        }
                        if (event.key === "ArrowRight") {
                          event.preventDefault();
                          turnHandbookPage("next");
                        }
                      }}
                    >
                      {handbookPage ? (
                        <div
                          key={`${handbookPageIndex}-${handbookPageTurn.token}`}
                          className={cn(
                            "handbook-page",
                            handbookPageTurn.token > 0 &&
                              `turn-${handbookPageTurn.direction}`
                          )}
                        >
                          <WorkspaceImage
                            className="handbook-page-image"
                            src={handbookPage}
                            alt={tr(
                              language,
                              `AI-generated dessert handbook page ${handbookPageIndex + 1} of ${handbookPages.length}`,
                              `AI 生成的甜点手册第 ${handbookPageIndex + 1} 页，共 ${handbookPages.length} 页`
                            )}
                            portrait
                          />
                        </div>
                      ) : (
                        <div className="handbook-page-empty">
                          <BookOpen size={24} />
                          <strong>
                            {tr(
                              language,
                              "Your AI handbook will appear here",
                              "AI手册将在这里展示"
                            )}
                          </strong>
                          <span>
                            {tr(
                              language,
                              "Multi-page generation supported",
                              "支持多页生成"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {handbookPages.length > 1 && (
                      <nav
                        className="handbook-pagination"
                        aria-label={tr(
                          language,
                          "Handbook page controls",
                          "手册翻页控制"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => turnHandbookPage("previous")}
                          disabled={handbookPageIndex === 0}
                          aria-controls="handbook-page-viewer"
                          aria-label={tr(
                            language,
                            "Previous handbook page",
                            "上一页手册"
                          )}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <output aria-live="polite">
                          {tr(
                            language,
                            `Page ${handbookPageIndex + 1} / ${handbookPages.length}`,
                            `第 ${handbookPageIndex + 1} / ${handbookPages.length} 页`
                          )}
                        </output>
                        <button
                          type="button"
                          onClick={() => turnHandbookPage("next")}
                          disabled={
                            handbookPageIndex === handbookPages.length - 1
                          }
                          aria-controls="handbook-page-viewer"
                          aria-label={tr(
                            language,
                            "Next handbook page",
                            "下一页手册"
                          )}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </nav>
                    )}
                  </div>
                  {handbookResult && (
                    <p className="handbook-result-note">
                      {handbookIsStale
                        ? tr(
                            language,
                            "Selection, style, or page count changed—regenerate the pages before final export.",
                            "选卡、风格或页数已改变，最终导出前请重新生成页面。"
                          )
                        : tr(
                            language,
                            `${handbookResult.pages.length} complete AI pages reflect ${handbookResult.dessertCount} desserts and ${handbookResult.visualInputCount} visual references.`,
                            `${handbookResult.pages.length} 张完整 AI 页面已融合 ${handbookResult.dessertCount} 款甜点与 ${handbookResult.visualInputCount} 张视觉参考。`
                          )}
                    </p>
                  )}
                  <button
                    className="button secondary full"
                    type="button"
                    onClick={exportHandbookImages}
                    disabled={!handbookPages.length}
                  >
                    <FileImage size={15} />{" "}
                    {tr(language, "Export page images", "导出页面图片")}
                  </button>
                  <button
                    className="button secondary full"
                    type="button"
                    onClick={exportHandbookHTML}
                    disabled={!handbookPages.length}
                  >
                    <FileCode2 size={15} /> {tr(language, "Export HTML", "导出 HTML")}
                  </button>
                  <button
                    className="button primary full"
                    type="button"
                    onClick={() => window.print()}
                    disabled={!handbookPages.length}
                  >
                    <FileText size={15} /> {tr(language, "Export PDF", "导出 PDF")}
                  </button>
                  <div className="handbook-print-pages" aria-hidden="true">
                    {handbookPages.map((page, index) => (
                      <WorkspaceImage
                        key={`${page.slice(-36)}-${index}`}
                        src={page}
                        alt=""
                        portrait
                      />
                    ))}
                  </div>
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

      <button
        className={cn("agent-fab", agentOpen && "open")}
        type="button"
        onClick={() => setAgentOpen((current) => !current)}
        aria-controls="pastry-agent-window"
        aria-expanded={agentOpen}
        aria-label={tr(
          language,
          agentOpen ? "Close pastry agent" : "Open pastry agent",
          agentOpen ? "关闭甜点助手" : "打开甜点助手"
        )}
        data-global-assistant="true"
      >
        {agentOpen ? <X size={20} /> : <Bot size={21} />}
        {!agentOpen && <span>{tr(language, "Ask Muse", "问问缪斯")}</span>}
      </button>
      <MuseAdviser
        open={agentOpen}
        language={language}
        context={normalizeMuseContext({
          stage,
          ideaDraft: stage === "idea" ? ideaText : "",
          dessert: { title: selectedIdea.title, description: selectedIdea.prompt, tags: selectedIdea.tags, hasImage: Boolean(selectedIdea.image) },
          references: references.map(({ kind, title, content }) => ({ kind, title, content })),
          rendering: { available: Boolean(renderResult), stale: renderingIsStale, view: renderResult?.view },
          materials,
          variants: sizeVariants.map((item, index) => ({ ...item, scale: variantScales[index].scale })),
          steps: planSteps,
          batches: stage === "bake" ? productionRows.map((batch) => ({
            dessert: ideas.find((idea) => idea.id === batch.ideaId)?.title,
            variant: productionVariantsByIdea[batch.ideaId]?.find((item) => item.id === batch.variantId)?.name,
            count: batch.count,
          })) : [],
          materialTotals: stage === "bake" ? consolidateRows.map((row) => ({ name: row.name, amount: row.total, unit: row.unit })) : [],
          bakeMode: stage === "bake" ? bakeMode : null,
          handbook: stage === "bake" ? {
            desserts: selectedHandbookIdeas.map((idea) => idea.title), style: handbookStylePrompt,
            pageCount: handbookPageCount, generated: Boolean(handbookResult), stale: handbookIsStale,
          } : null,
        })}
        onClose={() => setAgentOpen(false)}
        onNavigate={openStage}
      />

      {galleryOpen && <MasterpieceGallery language={language} onClose={closeGallery} />}
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
      {materialImportKind && (
        <MaterialImportDialog
          key={`${selectedIdea.id}-${materialImportKind}`}
          kind={materialImportKind}
          idea={selectedIdea}
          existingMaterialNames={materials.map((row) => row.name).filter((name) => name.trim())}
          language={language}
          onClose={() => setMaterialImportKind(null)}
          onApply={addImportedMaterials}
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
