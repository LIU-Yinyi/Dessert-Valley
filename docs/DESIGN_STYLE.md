Create a polished, responsive website inspired by the atmosphere of cozy 16-bit farming and village-life role-playing games.

The website must evoke warmth, nostalgia, nature, craftsmanship, and slow living. It should feel like an interactive illustrated world rather than a standard SaaS landing page.

Do not copy any existing game’s characters, maps, sprites, interface layouts, logos, item designs, dialogue boxes, fonts, music, or other identifiable assets. Create an original visual identity using the design principles described below.

## 1. Overall Creative Direction

Design the website as a small, welcoming countryside world rendered in original pixel art.

The experience should feel:

* Cozy
* Rural
* Handcrafted
* Nostalgic
* Playful
* Peaceful
* Rewarding to explore

The interface should resemble a thoughtfully designed game menu or village noticeboard while remaining intuitive as a modern website.

Avoid:

* Corporate gradients
* Glassmorphism
* Generic startup illustrations
* Photorealistic imagery
* Thin minimalist interfaces
* Excessively smooth vector artwork
* Neon cyberpunk colors
* Direct visual references to any existing farming game

## 2. Pixel-Art System

Use a consistent pixel-art visual language.

Requirements:

* Render decorative artwork using hard-edged shapes.
* Disable image smoothing for pixel-art images.
* Avoid blurry scaling.
* Use a consistent base pixel grid.
* Prefer integer scaling for important sprites.
* Use limited color ramps rather than continuous gradients.
* Use two to four tones per material or object.
* Use selective dithering for texture where appropriate.
* Add one-pixel highlights and dark edge accents to create depth.
* Use simplified silhouettes that remain readable at small sizes.

CSS treatment for pixel assets should generally use:

```css
image-rendering: pixelated;
image-rendering: crisp-edges;
```

Do not apply the pixelated treatment to body text.

## 3. Color Palette

Build an original earthy palette around the following approximate roles:

* Deep soil brown: `#4A2F24`
* Dark wood brown: `#70452E`
* Warm timber: `#A86F3D`
* Golden wheat: `#D9A441`
* Cream paper: `#F4DFA8`
* Soft grass: `#78A84B`
* Forest green: `#3F713D`
* Light sky blue: `#88C9D9`
* Deep water blue: `#397C8D`
* Barn red: `#A84E43`
* Plum accent: `#704A68`
* Charcoal text: `#2F2926`

These colors are starting points, not rigid requirements. Adjust them to produce sufficient contrast and an original identity.

Use darker values for outlines and borders. Use cream or pale yellow for content surfaces. Reserve brighter colors for interactive elements, rewards, badges, and important calls to action.

Avoid pure black and pure white whenever possible. Use warm near-black and cream instead.

## 4. Website Environment

The primary page should feel like a countryside scene containing functional interface elements.

Possible environmental elements include:

* Rolling fields
* Small gardens
* Wooden fences
* Fruit trees
* A windmill
* A cottage
* A river or pond
* Distant hills
* Clouds
* Birds
* Butterflies
* Lanterns
* Wildflowers
* Market stalls
* Wooden signs

All environmental assets must be original.

The environment should frame and support the content rather than reduce readability. Important text must remain on stable panels rather than directly over complex scenery.

Use layered backgrounds to create depth:

1. Sky layer
2. Distant landscape layer
3. Midground buildings or trees
4. Foreground grass, fences, flowers, or stones
5. Interface layer

Apply subtle parallax only when it improves the experience. Disable or simplify parallax for users who prefer reduced motion.

## 5. Page Structure

Build the site with the following sections.

### Header

Create a compact navigation bar resembling a wooden signboard or village noticeboard.

Include:

* Original logo or wordmark
* Home
* About
* Features or Services
* Gallery or Projects
* Journal or Updates
* Contact
* Primary call-to-action button

The navigation must remain fully usable on mobile. The mobile menu may open as a pixel-art inventory panel, folded map, journal, or wooden board.

### Hero Section

The hero should establish the illustrated world immediately.

Include:

* A strong headline
* One supporting paragraph
* Primary call to action
* Secondary call to action
* One original animated focal illustration
* Small environmental animations

Suggested composition:

* Content panel on the left
* Original countryside scene on the right
* Foreground plants or decorative objects overlapping the lower edge
* A sky, weather, or time-of-day element in the background

The headline should feel optimistic and personal. Avoid aggressive sales language.

### Features or Services

Present features as original game-like objects, locations, or journal entries.

Possible card metaphors:

* Seed packets
* Wooden crates
* Tool slots
* Quest notes
* Recipe cards
* Village buildings
* Produce baskets
* Map locations

Each card should contain:

* Pixel icon
* Short title
* Two or three lines of explanation
* Optional status, category, or reward indicator

Cards should appear tactile, with clear hover, focus, and pressed states.

### About Section

Use a journal, letter, scrapbook, or parchment panel.

Include:

* Short narrative introduction
* Values or principles
* Original portrait, cottage, workshop, or landscape illustration
* Small decorative details such as tape, leaves, stamps, flowers, or tools

Do not reduce readability for decorative authenticity.

### Gallery or Projects

Show projects as a map, seasonal collection, farm plot, market stall, or album.

Each project should have:

* Original thumbnail
* Name
* Category
* Short description
* Clear action link

Provide both grid and mobile-friendly stacked layouts.

### Testimonials or Community

Present testimonials as:

* Village letters
* Noticeboard postings
* Speech panels
* Festival ribbons
* Guestbook entries

Do not imitate dialogue boxes from an existing game. Create a distinct border shape, corner treatment, and icon system.

### Call-to-Action Section

Create a prominent end-of-page invitation presented as a destination in the illustrated world.

Examples:

* Enter the workshop
* Visit the market
* Start your journey
* Plant the first seed
* Open the journal

Use language appropriate to the actual business or product.

### Footer

Style the footer as evening countryside, a wooden dock, a market closing scene, or a dimly lit village edge.

Include:

* Navigation links
* Contact information
* Social links
* Legal links
* Copyright notice
* Small decorative animation such as fireflies, stars, water movement, or lantern glow

## 6. Components

Create a reusable component system.

Required components:

* `PixelButton`
* `WoodPanel`
* `PaperPanel`
* `PixelCard`
* `PixelIcon`
* `InventoryGrid`
* `JournalEntry`
* `NoticeBoard`
* `Badge`
* `ProgressMeter`
* `Tooltip`
* `Modal`
* `MobileMenu`
* `SectionHeading`
* `SeasonalDivider`
* `PixelAvatar`
* `ToastNotification`

Components must support:

* Hover states
* Keyboard focus
* Active states
* Disabled states
* Loading states
* Error states
* Mobile layouts
* Reduced-motion preferences

## 7. Borders, Panels, and Shadows

Use chunky, game-like construction.

Panels should generally have:

* A dark outer outline
* A midtone frame
* A lighter inner surface
* Optional corner pegs, knots, stitching, or carved details
* Small hard-edged shadows

Use stepped pixel shadows rather than soft, blurry drop shadows.

Example visual logic:

* Outer border: 3–5 pixels
* Inner highlight: 1–2 pixels
* Offset shadow: 4–8 pixels
* Border radius: low or absent unless using intentionally stepped corners

Create CSS utilities for:

* Wooden frame
* Stone frame
* Parchment panel
* Fabric banner
* Soil plot
* Water panel

## 8. Typography

Use two complementary typefaces:

1. A pixel-inspired display font for headings, labels, buttons, and badges.
2. A highly readable sans-serif or humanist font for paragraphs, forms, and longer content.

Do not use a pixel font for long body copy.

Typography guidelines:

* Headings should be compact and expressive.
* Body copy should use comfortable line height.
* Avoid very small text.
* Maintain WCAG-compliant contrast.
* Keep button labels short.
* Use uppercase sparingly.
* Avoid excessive letter spacing in pixel fonts.

Provide suitable fallback fonts to prevent layout shifts.

## 9. Iconography

Create a small original pixel-icon library.

Suggested icons:

* Leaf
* Seed
* Star
* Sun
* Moon
* Cloud
* Rain
* Tool
* Book
* Letter
* Basket
* Coin
* Heart
* Map
* House
* Shop
* Calendar
* Bell
* Arrow
* Check mark

Icons should use consistent dimensions, outline thickness, lighting direction, and color count.

Do not reuse recognizable item icons from existing games.

## 10. Interaction Design

Interactions should feel tactile and playful.

Buttons:

* Move down one or two pixels when pressed.
* Use a brighter top edge and darker bottom edge.
* Produce a clear focus outline.
* Never rely only on color to indicate state.

Cards:

* Lift slightly or brighten on hover.
* Reveal a small icon or sparkle.
* Avoid large, smooth transformations.

Navigation:

* Highlight the active section with a leaf, star, marker, or underlined plank.
* Use smooth scrolling where appropriate.
* Preserve standard browser behavior.

Tooltips:

* Use compact pixel panels.
* Appear after a short delay.
* Remain accessible by keyboard.
* Never contain essential information exclusively.

Forms:

* Style fields like journal lines, labels, envelopes, or carved slots.
* Keep conventional labels visible.
* Show clear error and success messages.
* Do not sacrifice form usability for visual novelty.

## 11. Animation

Use animation sparingly and intentionally.

Recommended ambient animations:

* Crops swaying by one or two pixels
* Clouds drifting slowly
* Water cycling through two to four frames
* Lanterns flickering
* Butterflies moving intermittently
* Leaves falling occasionally
* Smoke rising from a chimney
* Small stars or fireflies appearing at night
* A character-like mascot blinking

Recommended interaction animations:

* Button press
* Badge pop
* Item pickup effect
* Panel opening
* Page-section reveal
* Notification bounce
* Progress-bar filling

Animation principles:

* Prefer stepped or frame-based movement.
* Avoid excessive easing and continuous floating.
* Keep animations subtle.
* Do not animate every element.
* Support `prefers-reduced-motion`.
* Pause nonessential animation when the page is not visible.
* Avoid large cumulative layout shifts.

## 12. Optional Time and Season System

Where technically appropriate, create a lightweight visual theme system.

Possible modes:

* Morning
* Afternoon
* Sunset
* Night
* Spring
* Summer
* Autumn
* Winter

Theme changes may affect:

* Sky color
* Decorative plants
* Small weather elements
* Footer lighting
* Accent colors
* Background sounds, only when explicitly enabled

Do not automatically play audio.

Store the user’s chosen theme locally. Ensure every theme maintains sufficient contrast.

## 13. Responsive Behavior

The site must work from small mobile screens through large desktops.

Desktop:

* Use wide environmental compositions.
* Allow overlapping foreground decoration.
* Maintain a readable central content width.

Tablet:

* Reduce landscape complexity.
* Stack illustration and content where necessary.
* Simplify parallax.

Mobile:

* Prioritize content.
* Use fewer decorative sprites.
* Replace multi-column layouts with vertical cards.
* Keep tap targets at least 44 by 44 CSS pixels.
* Ensure menus and modals fit within the viewport.
* Avoid horizontal scrolling.
* Maintain crisp pixel-art scaling.
* Keep important calls to action visible without excessive scrolling.

## 14. Accessibility

Meet WCAG 2.2 AA where practical.

Requirements:

* Semantic HTML
* Logical heading hierarchy
* Keyboard-accessible navigation
* Visible focus indicators
* Sufficient contrast
* Descriptive alternative text
* Accessible names for icon-only controls
* Form labels and validation messages
* Reduced-motion support
* Skip-to-content link
* Correct modal focus trapping
* No essential information communicated only through color
* No mandatory audio
* No rapidly flashing elements

Pixel styling must never make the interface difficult to read or operate.

## 15. Performance

Keep the experience visually rich but technically efficient.

Requirements:

* Use optimized WebP or AVIF assets where appropriate.
* Use SVG only for elements that do not need authentic raster pixel treatment.
* Generate sprite sheets for repeated animations.
* Lazy-load below-the-fold artwork.
* Preload only critical fonts and hero assets.
* Prevent layout shifts by defining image dimensions.
* Avoid large animation libraries unless necessary.
* Prefer CSS animations for simple movement.
* Keep JavaScript bundles modular.
* Aim for strong Core Web Vitals.
* Ensure the main page remains usable before all decorative assets load.

## 16. Technical Architecture

Use a modern component-based stack.

Preferred implementation:

* Next.js or React
* TypeScript
* CSS Modules, Tailwind CSS, or a well-structured token system
* Accessible headless components where useful
* Framer Motion only for carefully selected interactions
* Static asset pipeline for original pixel artwork

Suggested project structure:

```text
src/
  app/
  components/
    ui/
    environment/
    sections/
  assets/
    sprites/
    backgrounds/
    icons/
    textures/
  styles/
    tokens.css
    typography.css
    utilities.css
  data/
  hooks/
  lib/
```

Create design tokens for:

* Colors
* Typography
* Spacing
* Borders
* Shadows
* Pixel scaling
* Animation durations
* Breakpoints
* Z-index layers

## 17. Content and Brand Voice

Write copy that feels:

* Warm
* Clear
* Encouraging
* Neighborly
* Grounded
* Lightly playful

Avoid:

* Excessive fantasy terminology
* Forced farming metaphors in every sentence
* Aggressive conversion language
* Corporate jargon
* Long paragraphs
* Childish or overly cute phrasing

Use thematic language selectively. The website must still communicate its actual purpose immediately.

## 18. Originality Requirements

The final product must be recognizably original.

Do not reproduce:

* Any named character
* Any recognizable building
* Any game map
* Any existing sprite
* Any inventory arrangement
* Any item icon
* Any exact interface frame
* Any logo
* Any title treatment
* Any dialogue layout
* Any copyrighted music or sound
* Any identifiable color arrangement strongly associated with one title

Develop a separate brand mythology, visual motif, and iconography.

For example, choose one original thematic direction:

* Mountain orchard village
* Coastal herb garden
* Woodland craft settlement
* Desert greenhouse community
* Floating island farm
* Alpine flower market
* Riverside pottery town

Use the selected direction consistently across artwork, copy, icons, and environmental details.

## 19. Deliverables

Produce:

1. A visual design system
2. Color and typography tokens
3. Desktop homepage
4. Mobile homepage
5. Reusable UI components
6. Original pixel-art icon set
7. Original environmental illustrations
8. Responsive navigation
9. Accessible forms
10. Reduced-motion mode
11. Loading, error, and empty states
12. README with setup instructions
13. Component documentation
14. Performance report
15. Accessibility audit checklist

## 20. Acceptance Criteria

The implementation is complete when:

* The website clearly communicates its purpose above the fold.
* The visual identity feels cozy, rural, handcrafted, and game-like.
* All artwork and interface elements are original.
* The website does not resemble a direct clone of any existing game.
* Pixel art remains crisp at supported screen sizes.
* The design works on mobile, tablet, and desktop.
* Navigation is fully keyboard-accessible.
* Reduced-motion preferences are respected.
* Text remains readable over all backgrounds.
* Interactive states are clear.
* Decorative animations do not harm performance.
* The page achieves strong accessibility and performance scores.
* Components are reusable rather than hard-coded into one page.

Begin by defining the original brand concept, visual tokens, page wireframe, and component inventory. Then implement the homepage in functional increments. Validate responsiveness, accessibility, originality, and performance before adding additional decorative animation.
