# AI Brain App - Design Guidelines

## Design Approach
**System:** Material Design principles adapted for developer tools, drawing inspiration from VS Code, Linear, and GitHub's interface patterns. This platform is utility-focused, prioritizing clarity, efficiency, and technical precision over visual marketing appeal.

## Typography

**Font Families:**
- Primary UI: Inter (via Google Fonts CDN) - clean, technical readability
- Code/Data: JetBrains Mono - all JSON displays, console outputs, BT node IDs, numeric inputs
- Headings: Inter SemiBold/Bold

**Hierarchy:**
- Page titles: text-2xl font-semibold
- Section headers: text-lg font-medium  
- Body text: text-base
- Labels/metadata: text-sm text-gray-600
- Code/technical: text-sm font-mono

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Grid gaps: gap-4 to gap-6
- Form field spacing: space-y-4

**Container Structure:**
- App shell: Full viewport with fixed sidebar (w-64) + main content area
- Page content: max-w-7xl mx-auto px-6 py-8
- Cards/panels: Contained width with clear boundaries

## Component Library

**Navigation:**
- Left sidebar navigation (desktop) with icon + label for each tool
- Collapsible mobile drawer with hamburger menu
- Active state: Subtle left border accent + background tint
- Navigation items: Home, BT Tester, ONNX Tester, Narrative Lab, World State, Settings

**Testing Interfaces:**
- Split-panel layouts: Input/controls (left 40%) + Output/visualization (right 60%)
- Console panels: Dark background with monospace text, auto-scroll
- BT visualization: Canvas area with zoom controls, minimap in corner
- JSON editors: Syntax-highlighted textarea with line numbers

**Forms & Inputs:**
- Input fields: Outlined style with floating labels
- File upload: Drag-drop zone with bordered dashed area
- Numeric arrays: Dynamic field generator with +/- buttons
- Buttons: Filled primary actions, outlined secondary actions
- Validation: Inline error messages below fields

**Data Display:**
- Code blocks: Dark panel with syntax highlighting
- Key-value pairs: Table layout with alternating row backgrounds
- Prediction results: Large numeric display with confidence indicators
- Execution status: Pill-shaped badges (success/error/running)

**Cards & Panels:**
- Primary panels: border rounded-lg shadow-sm with p-6
- Nested sections: Subtle background differentiation
- Headers: Border-bottom separator with action buttons aligned right

**Interactive Elements:**
- "Run Tick" / "Predict" / "Generate": Prominent primary buttons
- "Copy Output" / "Export": Icon buttons with tooltips
- "Push to Godot": Secondary action button with network icon
- Real-time indicators: Animated pulse for active processes

**Icons:** 
Use Heroicons (outline for navigation, solid for actions) via CDN

## Page-Specific Layouts

**Home Dashboard:**
- Grid of feature cards (2 columns on tablet, 3 on desktop)
- Each card: Icon, title, description, "Open" link
- Recent activity log in sidebar or bottom section

**BT Tester:**
- Top toolbar: Upload button, example selector dropdown
- Main area: Interactive node graph with pan/zoom
- Bottom console: Fixed height with scroll, clear button
- Right panel: Node properties when selected

**ONNX Tester:**
- Left panel: Model upload, input array builder (dynamic rows)
- Right panel: Prediction output (large display), chart if multi-output
- Model info card: Shows loaded model details

**Narrative Lab:**
- Dropdown: Preset prompt selection (metro/riftwar/training)
- Form: Dynamic variable inputs based on selected prompt
- LLM status indicator: Shows Ollama vs OpenAI usage
- Output: Expandable text area with copy/download buttons

**World State Editor:**
- Table view: Editable key-value pairs with add/delete row
- JSON view toggle: Raw editor for advanced users
- Action bar: Save, Reset, Push to Godot
- Status badge: Last sync timestamp

**Settings:**
- Tabbed sections: API Keys, Preferences, About
- Key inputs: Password-style with show/hide toggle
- Connection test buttons: Check Ollama availability

## Images
**No hero images required.** This is a technical tool where screen real estate serves functional purposes. Use icon illustrations within feature cards and empty states only.

## Accessibility
- Clear focus states on all interactive elements
- Proper ARIA labels for icon-only buttons  
- Keyboard shortcuts for common actions (document in help tooltip)
- Responsive breakpoints: Mobile (sm), Tablet (md), Desktop (lg)
- High contrast for code/console displays