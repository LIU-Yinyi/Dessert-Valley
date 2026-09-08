// Server-owned, reviewed summaries. Keep these in step with the actual UI.
// This small collection is supplied in full so follow-ups and Chinese queries
// cannot lose a relevant article to keyword-only retrieval. No live web search.
export const KNOWLEDGE_VERSION = "2026-09-09.1";

export const MUSE_KNOWLEDGE = [
  {
    id: "valley-workflow", title: "Dessert Valley · workflow guide", zhTitle: "甜点谷 · 流程指南", url: null,
    content: "Idea → Design → Product → Bake. Idea: type or Record an idea; recording is transcribed into editable text. Attach up to four images. Add to gallery uses AI to polish the dessert name, description and tags, choosing an attached idea image as cover. Design: select a dessert and collect its Intent package using Add → Text, Image or Canvas. Inherited idea text and images remain editable. Product rendering generates an Exterior or Cutaway visual from these references. Save keeps the rendering; Save & build recipe opens Product. A picture is a design reference, not a tested recipe. Product: enter Material usage (base amounts), optional size variants, and Making plan steps. The AI advise button (AI 建议) in Making plan (制作方案) requires named materials and appends suggested editable steps to the existing plan. Bake: add production batches, select dessert/variant/count, then review consolidated materials. Diner mode makes an illustrated handbook from selected desserts, style and reference image; export its images, HTML or print to PDF. Muse can explain and suggest a stage to open; this chat cannot edit, save, render or execute these actions for the user.",
  },
  {
    id: "valley-units", title: "Dessert Valley · units & scaling", zhTitle: "甜点谷 · 单位与缩放", url: null,
    content: "Unit is an editable dropdown: mg, g, kg, lb, oz, piece, bar, or type a custom unit directly. For the same material, compatible mass units convert: 1 g = 1000 mg; 1 kg = 1000 g; 1 lb = 453.59237 g; 1 oz = 28.349523125 g. oz means mass, not fluid ounces. piece and bar only combine with the same count unit. Custom units combine only when their exact unit text matches; never invent a bar weight or convert volume to mass without ingredient-specific data. Product Upload supports text, image or audio import: review/edit extracted rows before applying; AI normalizes ingredient names, and deterministic code consolidates compatible units. Manual edits do not automatically merge rows. Bake combines material names and compatible units and scales by batch count and variant dimension ratio (volume when all three dimensions are set; otherwise the product of comparable positive dimensions). The first variant is the base; materialTotals in the snapshot are already scaled and consolidated. Never multiply those totals again. Units mm, cm and in are converted for variant dimensions. Dimension scaling estimates ingredient amounts, not baking time, doneness, or guaranteed yield. Existing steps and totals belong to the currently selected dessert or explicitly named batches.",
  },
  {
    id: "valley-storage", title: "Dessert Valley · workspace & gallery", zhTitle: "甜点谷 · 工作区与作品展", url: null,
    content: "Workspace auto-saves in this browser using IndexedDB with a localStorage fallback. Export/import JSON transfers a workspace; there is no shared cloud workspace or account sync. The gallery icon beside Import opens @Oli's example Design and Menu. Wheel zoom follows the cursor; left-drag pans; double-click resets. On narrow screens swipe or use the Design/Menu controls. Clicking outside or Escape closes the gallery. These are credited examples, not the user's selected dessert. Ask Muse is a session conversation; refreshing clears the chat. Each sent question shares a bounded text snapshot of the current dessert/workflow and recent conversation with AI; images and audio are not passed to the adviser. An audio attachment in chat is transcribed to editable text first. Closing chat keeps the conversation until refresh; New conversation clears it.",
  },
  {
    id: "ka-weights", title: "King Arthur Baking · ingredient weights", zhTitle: "King Arthur Baking · 材料重量", url: "https://www.kingarthurbaking.com/learn/ingredient-weight-chart",
    content: "Weigh ingredients with a digital scale for consistency. Volume-to-weight conversion depends on the ingredient. King Arthur's chart lists a cup of its all-purpose flour as 120 g; do not apply that value to other ingredients or assume every recipe uses that cup weight. Use the specific recipe's gram amounts when available.",
  },
  {
    id: "ka-recipe", title: "King Arthur Baking · recipe success", zhTitle: "King Arthur Baking · 配方实践", url: "https://www.kingarthurbaking.com/recipes/resources/recipe-success-guide",
    content: "For reproducibility, follow a tested recipe's ingredient choices, mixing method and specified pan. Substituting or omitting ingredients can change the outcome. Weigh dry ingredients; if measuring flour by volume, spoon it into the cup and sweep level rather than packing it. Read liquid measurements at eye level. A new dessert formulation or changed pan needs testing rather than a promise of identical results.",
  },
  {
    id: "ka-creaming", title: "King Arthur Baking · creaming butter & sugar", zhTitle: "King Arthur Baking · 黄油与糖的打发", url: "https://www.kingarthurbaking.com/blog/2015/04/27/creaming-butter-sugar",
    content: "Creaming sugar with butter creates air pockets that help baked goods rise. Butter should be pliable but still cool enough to offer resistance; greasy, melted butter cannot hold the same aeration. Butter that is too warm or unsuitable mixing can produce a dense texture. Assess the recipe's mixing method before recommending a butter-to-oil substitution.",
  },
  {
    id: "ka-cream", title: "King Arthur Baking · whipped cream", zhTitle: "King Arthur Baking · 打发奶油", url: "https://www.kingarthurbaking.com/recipes/homemade-whipped-cream-recipe",
    content: "Chill the bowl and whisk before whipping cream. Judge the peak and texture rather than relying only on a fixed mixing time, since mixer speeds vary. Over-whipping can make cream grainy or separated; stop when the recipe's desired peak is reached. This guidance does not establish shelf life for a finished mousse or filled dessert.",
  },
  {
    id: "callebaut-tempering", title: "Callebaut · chocolate tempering", zhTitle: "Callebaut · 巧克力调温", url: "https://www.callebaut.com/en-GB/guide-different-tempering-methods",
    content: "Tempering pre-crystallizes cocoa butter so chocolate sets hard and shiny and releases from molds. Melting, cooling and working temperatures depend on the exact chocolate formulation: dark, milk, white, ruby and gold have different curves. Follow the manufacturer's curve for that product and test a small sample before molding or coating. Do not prescribe one universal temperature sequence.",
  },
  {
    id: "fda-flour", title: "FDA · handling flour safely", zhTitle: "FDA · 面粉安全处理", url: "https://www.fda.gov/food/buy-store-serve-safe-food/handling-flour-safely-what-you-need-know",
    content: "Flour is a raw food, not ready to eat. Raw dough or batter may contain harmful bacteria from flour and eggs. Do not taste it uncooked. Follow cooking instructions and clean hands, utensils and surfaces after handling raw flour. Do not assume an improvised home heat treatment makes flour safe for a no-bake dessert.",
  },
  {
    id: "fda-chilling", title: "FDA · refrigeration & food safety", zhTitle: "FDA · 冷藏与食品安全", url: "https://www.fda.gov/food/buy-store-serve-safe-food/refrigerator-thermometers-cold-facts-about-food-safety",
    content: "FDA household guidance: keep the refrigerator at 40°F (about 4°C) or below and verify with a thermometer. Refrigerate perishables within two hours, or within one hour above 90°F (about 32°C). Divide leftovers into shallow containers for faster cooling. Appearance or smell cannot reliably establish safety. These general rules do not validate a dessert's shelf life, commercial cold chain, local selling rules, or a particular filling formulation.",
  },
] as const;
