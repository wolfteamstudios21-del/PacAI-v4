# AI Brain App

## Overview

AI Brain App is a professional testing companion for the AI Brain Core Godot addon. It provides a comprehensive suite of testing tools for game AI development, including behavior tree visualization and execution, ONNX model testing, narrative generation with LLM integration, and world state management. The application is designed as a developer tool with a focus on clarity and utility, following Material Design principles adapted for technical interfaces.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing
- TanStack Query for server state management and data fetching
- shadcn/ui component library built on Radix UI primitives

**Design System:**
- Material Design principles adapted for developer tools
- Tailwind CSS for styling with custom design tokens
- Inter font for UI text, JetBrains Mono for code/technical displays
- Custom color system supporting light/dark modes via CSS variables
- Utility-focused layouts prioritizing clarity over decoration

**Component Architecture:**
- Atomic design pattern with reusable UI components in `client/src/components/ui/`
- Page-level components in `client/src/pages/` for each testing tool
- Custom components like BTVisualizer using @xyflow/react for behavior tree visualization
- Shared sidebar navigation (AppSidebar) for consistent navigation across tools

**Routing:**
Routes defined in App.tsx:
- `/` - Home/dashboard
- `/bt-tester` - Behavior Tree testing interface
- `/onnx-tester` - ONNX model testing
- `/narrative-lab` - Narrative generation with LLM
- `/world-state` - World state editor
- `/settings` - Configuration for API keys and endpoints

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- Separate development (`index-dev.ts`) and production (`index-prod.ts`) entry points
- Development mode uses Vite middleware for HMR
- Production mode serves static built assets

**API Design:**
RESTful API endpoints in `server/routes.ts`:
- `POST /api/bt/run` - Execute behavior tree with context
- `POST /api/onnx/predict` - Run ONNX model predictions
- `POST /api/narrative/generate` - Generate narrative text via LLM
- `GET/POST /api/worldstate` - Retrieve and update world state

**Request Processing:**
- Request queue middleware limits concurrent processing (max 3 concurrent)
- CORS enabled for cross-origin requests
- JSON request/response bodies with Zod validation
- Request logging with timing information

**Business Logic Services:**
- `bt-executor.ts` - Parses and executes behavior tree strings
- `onnx-predictor.ts` - Simulates ONNX model inference (placeholder implementation)
- `llm-service.ts` - Integrates with Ollama (local) and OpenAI (fallback) for narrative generation

### Data Storage

**Current Implementation:**
- In-memory storage (`MemStorage` class) with JSON file persistence
- Data directory at `./data/` for persisting world state
- No database currently connected, but Drizzle ORM is configured

**Schema Definition:**
Located in `shared/schema.ts`:
- User authentication schema (username/password)
- Behavior tree execution records (BT string, context, results)
- ONNX model metadata and prediction history
- Narrative generation records (prompts, variables, outputs)
- World state as key-value JSON object

**Database Configuration:**
- Drizzle ORM configured for PostgreSQL via `drizzle.config.ts`
- Uses @neondatabase/serverless driver
- Schema migrations output to `./migrations/`
- Ready for database integration when `DATABASE_URL` is provided

### External Dependencies

**LLM Integration:**
- Primary: Ollama local inference (default endpoint: `http://localhost:11434`)
- Fallback: OpenAI API (using GPT-5 model as per service configuration)
- User can configure endpoints in Settings page
- Automatic fallback from Ollama to OpenAI on connection failure

**Frontend Libraries:**
- @xyflow/react - Behavior tree visualization with interactive flow diagrams
- @radix-ui/* - Accessible UI primitives (30+ components)
- @tanstack/react-query - Async state management
- react-hook-form with @hookform/resolvers - Form handling and validation
- Zod - Runtime type validation shared between client and server

**Development Tools:**
- Replit-specific plugins for development environment integration
- Runtime error modal overlay for development debugging
- Vite dev banner and cartographer for Replit IDE features

**API Keys & Configuration:**
- OpenAI API key stored in localStorage (client-side)
- Ollama endpoint configurable via Settings
- Environment variable `DATABASE_URL` for PostgreSQL connection
- Session management via connect-pg-simple (configured but not active)