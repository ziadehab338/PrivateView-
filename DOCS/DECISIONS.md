# Engineering Decisions

## Why ESC?

Users should be able to instantly disable privacy mode without reopening the extension.

---

## Why Per-Tab State?

Each browser tab represents an independent browsing session.

Restoring the previous state improves user experience.

---

## Why Hover Reveal?

Selection Mode makes navigation difficult.

Hover Reveal allows users to interact with hidden UI elements without exposing the whole page.

---

## Why Popup Protection?

Dynamic tooltips and floating elements may reveal sensitive information outside the protected area.

Automatically blurring these elements preserves privacy.