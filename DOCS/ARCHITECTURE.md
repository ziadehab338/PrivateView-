# 🏛️ PrivateView Architecture

## High Level Architecture

```mermaid
flowchart TD

    User["👤 User"]

    Popup["🧩 Popup UI"]

    Background["⚙️ Background Service Worker"]

    Storage["💾 Chrome Storage"]

    Content["📄 Content Script"]

    Overlay["🛡️ Privacy Engine"]

    Browser["🌐 Current Web Page"]

    User --> Popup

    Popup --> Background

    Background --> Storage

    Background --> Content

    Content --> Overlay

    Overlay --> Browser
```

---

# Extension Components

```mermaid
graph LR

Popup["Popup UI"]

Background["Background"]

Content["Content Script"]

Overlay["Privacy Engine"]

Storage["Chrome Storage"]

Popup --> Background

Background --> Storage

Background --> Content

Content --> Overlay
```

---

# Message Flow

```mermaid
sequenceDiagram

participant User

participant Popup

participant Background

participant Content

participant Page

User->>Popup: Enable Selection Mode

Popup->>Background: Send Command

Background->>Content: Activate Selection

Content->>Page: Create Overlay

Page-->>User: Privacy Enabled
```

---

# State Restoration

```mermaid
sequenceDiagram

participant User

participant Browser

participant Background

participant Storage

participant Content

User->>Browser: Switch Tab

Browser->>Background: Tab Activated

Background->>Storage: Read Saved State

Storage-->>Background: Selection Mode

Background->>Content: Restore Overlay

Content-->>User: Previous State Restored
```

---

# ESC Flow

```mermaid
flowchart TD

Start["ESC Pressed"]

Start --> Check{"Protection Enabled?"}

Check -- No --> End["Do Nothing"]

Check -- Yes --> Disable["Disable Current Mode"]

Disable --> Remove["Remove Overlay"]

Remove --> Save["Update Storage"]

Save --> End["Return To Normal"]
```

---

# Selection Mode

```mermaid
flowchart TD

Start["Selection Mode"]

Start --> Blur["Blur Whole Page"]

Blur --> Select["User Selects Area"]

Select --> Visible["Selected Area Visible"]

Visible --> Hover{"Mouse Outside?"}

Hover -- No --> Keep["Keep Blur"]

Hover -- Yes --> Reveal["Hover Reveal Around Cursor"]

Reveal --> Hover
```

---

# Privacy Engine

```mermaid
graph TD

Privacy["Privacy Engine"]

Privacy --> Spotlight

Privacy --> Selection

Privacy --> ManualBlur

Privacy --> HoverReveal

Privacy --> PopupProtection

Privacy --> ESC

Privacy --> StateManager
```

---

# Current Features

```mermaid
mindmap

root((PrivateView))

Spotlight

Selection

Hover Reveal

Blur Strength

Spotlight Radius

Popup Protection

ESC Exit

Tab Persistence

Reload Persistence

Alt+Tab Persistence

Settings

Future AI
```

---

# Future AI Architecture

```mermaid
flowchart LR

Page["Current Web Page"]

DOM["DOM Scanner"]

OCR["OCR Engine"]

Detector["Sensitive Data Detection"]

Decision["Decision Engine"]

Overlay["Privacy Engine"]

Page --> DOM

Page --> OCR

DOM --> Detector

OCR --> Detector

Detector --> Decision

Decision --> Overlay
```

---

# Tab State Management

```mermaid
graph TD

Tabs["Browser Tabs"]

Tabs --> Gmail

Tabs --> WhatsApp

Tabs --> ChatGPT

Tabs --> YouTube

Gmail --> Spotlight

WhatsApp --> Selection

ChatGPT --> Off

YouTube --> Blur
```

---

# Folder Structure

```text
PrivateView

│

├── popup/

│   ├── popup.html

│   ├── popup.css

│   └── popup.js

│

├── background/

│   └── service-worker.js

│

├── content/

│   ├── content.js

│   ├── overlay.js

│   ├── selection.js

│   ├── spotlight.js

│   └── hoverReveal.js

│

├── assets/

│

├── manifest.json

│

├── README.md

└── Architecture.md
```

---

# Design Principles

- 🔒 Privacy First

- ⚡ Fast Rendering

- 🧠 Minimal User Interaction

- 🪶 Lightweight

- 🧩 Modular

- ♻️ Maintainable

- 🚀 Easy To Extend

---

# Roadmap

- AI Sensitive Content Detection

- OCR Engine

- Password Detection

- Credit Card Detection

- Screen Sharing Mode

- Meeting Mode

- Privacy Profiles

- Smart Recommendations

- Website Rules

- Multi Browser Support
# Engineering Challenges

## Challenge 1

### Problem

Selection Mode made navigation difficult because users could not interact with hidden UI elements.

### Solution

Implemented Hover Reveal that temporarily creates a spotlight around the cursor when navigating outside the selected region.

---

## Challenge 2

### Problem

Protection was lost after switching tabs using Alt + Tab.

### Solution

Implemented automatic state restoration to preserve the active privacy mode.

---

## Challenge 3

### Problem

Each browser tab required independent privacy behavior.

### Solution

Designed a per-tab state management system that restores the correct mode whenever a tab becomes active.

---

## Challenge 4

### Problem

Users needed a fast way to disable privacy protection.

### Solution

Implemented a global ESC shortcut that immediately exits the current protection mode.