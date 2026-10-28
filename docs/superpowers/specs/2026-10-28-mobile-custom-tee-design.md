# Mobile Custom Tee Design Studio — Architecture & Design Spec

Date: 2026-10-28  
Branch: `feat/custom-tee-design-antigravity`  
Status: Approved for implementation  

## 1. Overview & Objectives

Provide a dedicated, premium mobile-first Design Studio experience matching the provided Figma/reference design. This mobile studio is completely decoupled from the desktop layout in route, files, and presentation components, while reusing existing domain models, geometry, layers, and persistence state.

Key capabilities:
1. **Dedicated Route**: `/custom-tee/studio/mobile` with auto-redirection from `/custom-tee/studio` on mobile viewports (`< 1024px`).
2. **Dedicated Presentation Module**: `src/features/customTee/presentation/mobile/` containing all mobile UI components.
3. **Mobile Header**: Back navigation, title with tee name and size badge, and top-right black "Save" pill button.
4. **Mobile Canvas & Gestures**:
   - Single-finger move/drag.
   - Bounding box with 4 corner resize handles and circular top rotation handle with `↻`.
   - Undo/Redo pill overlay (top left).
   - Zoom/Fit pill overlay (top right).
   - Front/Back view segmented pill toggle and miniature angle thumbnails strip with `+` button.
5. **Fixed Bottom Tool Dock**:
   - 4 actions: **Design** (pen), **Text** ('T'), **Images** (photo), **Layers** (stack).
6. **Bottom Sheets (Drawers)**:
   - **Add Design**: Upload dropzone, recent uploads, cloud/device source links (From Device, Google Drive, Dropbox, Browse Gallery), sub-tabs (Upload, Free Gallery, My Designs).
   - **Free Gallery**: Category chips (All, Nature, Anime, Typography, Vintage), search, curated vector artwork cards.
   - **Text Editor**: Input field with clear, sub-tabs (Font, Style, Color, Effects), Bengali font cards (Noto Sans Bengali, Hind Siliguri, SolaimanLipi, Kalpurush) and Latin fonts (Inter, Bebas Neue, Playfair Display).
   - **Design Settings**: Layer preview, Position (X, Y), Size (W, H with lock), Rotate with slider, Flip (H, V), 6-way Align, Opacity with slider, Duplicate, Delete. Auto-opens when a layer is selected.
   - **Layers List**: Reorderable layers, visibility toggle, delete, Bring Forward, Send Backward.

## 2. File Organization

```
src/
├── app/
│   └── custom-tee/
│       └── studio/
│           ├── page.tsx               # Existing desktop route + mobile auto-redirect
│           └── mobile/
│               └── page.tsx           # Dedicated mobile route
├── features/
│   └── customTee/
│       ├── presentation/
│       │   └── mobile/
│       │       ├── MobileStudioPage.tsx        # Container, handoff & data resolver
│       │       ├── MobileStudioEditor.tsx      # Main state orchestrator & sheet manager
│       │       ├── MobileHeader.tsx            # Top app bar (Back, Title, Save)
│       │       ├── MobileCanvas.tsx            # Touch canvas & floating overlays
│       │       ├── MobileToolDock.tsx          # 4-button bottom dock
│       │       ├── MobileBottomSheet.tsx       # Animated slide-up drawer base
│       │       ├── sheets/
│       │       │   ├── AddDesignSheet.tsx      # Uploads, sources & My Designs
│       │       │   ├── FreeGallerySheet.tsx    # Curated artwork illustration grid
│       │       │   ├── TextEditorSheet.tsx     # Typography, fonts & text effects
│       │       │   ├── DesignSettingsSheet.tsx # Layer properties & transformations
│       │       │   └── LayersListSheet.tsx     # Layer ordering & visibility
│       │       ├── galleryData.ts              # Curated vector artwork assets
│       │       └── fonts.ts                    # Google Fonts & Bengali typography definitions
```

## 3. Data & State Management

- Reuses `useStudioState` for layer manipulations, undo/redo history, and view management.
- Reuses `useCustomTeeData` for parent products and live stock checking.
- Reuses `sessionStorage` keys:
  - `custom-tee-design` for serialized layers across views.
  - `custom-tee-selection` for tee ID and size handoff.
- Preserves full URL query compatibility: `?tee=<parentProductId>&size=<size>`.

## 4. Verification & Testing

- Unit tests for new helpers/gallery data if needed.
- `npx vitest run` and `npx tsc --noEmit` must pass with zero errors.
- Visual browser verification using the browser subagent in mobile viewport dimensions (e.g. 390x844 iPhone 14 / modern smartphone).
