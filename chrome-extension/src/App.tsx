import { useEffect, useState } from 'react';
import './App.css';

const APP_COVER = '/icons/cover.png';

const PRIVATE_VIEW_OVERLAY_ID =
  'privateview-spotlight-overlay';

const PRIVATE_VIEW_SELECTION_ID =
  'privateview-selection-overlay';

const PRIVATE_VIEW_PICKER_ID =
  'privateview-selection-picker';

const PRIVATE_VIEW_AI_OVERLAY_ID =
  'privateview-ai-overlay';


type ModeId =
  | 'spotlight'
  | 'selection'
  | 'ai-protection';

type PrivacyMode = {
  id: ModeId;
  name: string;
  description: string;
  icon: string;
};

type PrivateViewSettings = {
  enabled: boolean;
  blurAmount: number;
  spotlightSize: number;
  selectedMode: ModeId;
};

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PageModeState = {
  spotlightActive: boolean;
  selectionActive: boolean;
  pickerActive: boolean;
};

const DEFAULT_SETTINGS: PrivateViewSettings = {
  enabled: false,
  blurAmount: 12,
  spotlightSize: 220,
  selectedMode: 'spotlight',
};

const privacyModes: PrivacyMode[] = [
  {
    id: 'spotlight',
    name: 'Spotlight',
    icon: '/modes/spott.jpg',
    description:
      'Blurs the entire page and reveals only the area around your mouse.',
  },
  {
    id: 'selection',
    name: 'Selection',
    icon: '/modes/selection photo.png',
    description:
      'Select one area that stays visible while the rest of the page is blurred.',
  },
  {
    id: 'ai-protection',
    name: 'AI Protection',
    icon: '/modes/ai cover.png',
    description:
      'Automatically detects and hides sensitive information on the page. Coming soon.',
  },
];

function isImageIcon(icon: string): boolean {
  return icon.startsWith('/');
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (typeof tab?.id !== 'number') {
    throw new Error('No active tab was found.');
  }

  return tab.id;
}

/* =========================
   Spotlight Mode
========================= */

function enableSpotlightBlur(
  overlayId: string,
  blurAmount: number,
  spotlightSize: number,
): void {
  let overlay = document.getElementById(
    overlayId,
  ) as HTMLDivElement | null;

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.setAttribute('aria-hidden', 'true');

    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '2147483647',
      pointerEvents: 'none',
      background: 'rgba(5, 8, 18, 0.08)',
      transition:
        'backdrop-filter 120ms ease',
    });

    document.documentElement.appendChild(
      overlay,
    );
  }

  overlay.dataset.blurAmount =
    String(blurAmount);

  overlay.dataset.spotlightSize =
    String(spotlightSize);

  overlay.style.setProperty(
    'backdrop-filter',
    `blur(${blurAmount}px)`,
  );

  overlay.style.setProperty(
    '-webkit-backdrop-filter',
    `blur(${blurAmount}px)`,
  );

  const renderSpotlight = (
    mouseX: number,
    mouseY: number,
  ): void => {
    const currentOverlay =
      document.getElementById(
        overlayId,
      ) as HTMLDivElement | null;

    if (!currentOverlay) {
      return;
    }

    const currentSize = Number(
      currentOverlay.dataset.spotlightSize ??
        spotlightSize,
    );

    const radius = currentSize / 2;

    const feather = Math.max(
      25,
      Math.min(
        50,
        currentSize * 0.15,
      ),
    );

    const mask = `
      radial-gradient(
        circle at ${mouseX}px ${mouseY}px,
        transparent 0px,
        transparent ${radius}px,
        black ${radius + feather}px
      )
    `;

    currentOverlay.style.setProperty(
      'mask-image',
      mask,
    );

    currentOverlay.style.setProperty(
      '-webkit-mask-image',
      mask,
    );

    document.documentElement.dataset
      .privateViewMouseX = String(mouseX);

    document.documentElement.dataset
      .privateViewMouseY = String(mouseY);
  };

  const initialX = Number(
    document.documentElement.dataset
      .privateViewMouseX ??
      window.innerWidth / 2,
  );

  const initialY = Number(
    document.documentElement.dataset
      .privateViewMouseY ??
      window.innerHeight / 2,
  );

  renderSpotlight(initialX, initialY);

  const listenerAlreadyAdded =
    document.documentElement.dataset
      .privateViewMouseListener === 'true';

  if (listenerAlreadyAdded) {
    return;
  }

  let animationFrameId = 0;
  let nextMouseX = initialX;
  let nextMouseY = initialY;

  document.addEventListener(
    'mousemove',
    (event: MouseEvent) => {
      nextMouseX = event.clientX;
      nextMouseY = event.clientY;

      if (animationFrameId !== 0) {
        return;
      }

      animationFrameId =
        window.requestAnimationFrame(() => {
          animationFrameId = 0;

          const currentOverlay =
            document.getElementById(
              overlayId,
            ) as HTMLDivElement | null;

          if (!currentOverlay) {
            return;
          }

          const currentSize = Number(
            currentOverlay.dataset
              .spotlightSize ??
              spotlightSize,
          );

          const radius =
            currentSize / 2;

          const feather = Math.max(
            25,
            Math.min(
              50,
              currentSize * 0.15,
            ),
          );

          const mask = `
            radial-gradient(
              circle at ${nextMouseX}px ${nextMouseY}px,
              transparent 0px,
              transparent ${radius}px,
              black ${radius + feather}px
            )
          `;

          currentOverlay.style.setProperty(
            'mask-image',
            mask,
          );

          currentOverlay.style.setProperty(
            '-webkit-mask-image',
            mask,
          );

          document.documentElement.dataset
            .privateViewMouseX =
            String(nextMouseX);

          document.documentElement.dataset
            .privateViewMouseY =
            String(nextMouseY);
        });
    },
    {
      capture: true,
      passive: true,
    },
  );

  document.documentElement.dataset
    .privateViewMouseListener = 'true';
}

function disableSpotlightBlur(
  overlayId: string,
): void {
  document
    .getElementById(overlayId)
    ?.remove();
}
function showPrivateViewToast(): void {
  document.getElementById("privateview-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "privateview-toast";

  Object.assign(toast.style, {
    position: "fixed",
    top: "60px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",

    display: "flex",
    alignItems: "center",
    gap: "12px",

    padding: "14px 22px",

    background: "rgba(40,40,40,.96)",
    color: "#fff",

    borderRadius: "4px",

    fontFamily: "Arial,sans-serif",
    fontSize: "17px",

    boxShadow: "0 8px 25px rgba(0,0,0,.35)",

    opacity: "1",
  });

  const text = document.createElement("span");
  text.textContent =
    " 👁️ PrivateView is active — to disable protection, press";

  const key = document.createElement("span");

  Object.assign(key.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    minWidth: "40px",
    height: "40px",

    padding: "0 10px",

    border: "1px solid rgba(255,255,255,.7)",
    borderRadius: "3px",

    background: "rgba(255,255,255,.05)",

    fontSize: "22px",
    fontWeight: "500",
  });

  key.textContent = "Esc";

  toast.append(text, key);

  document.documentElement.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4750);
}
/* =========================
   Selection Mode
========================= */

function startSelectionPicker(
  selectionId: string,
  pickerId: string,
  blurAmount: number,
): void {
  document
    .getElementById(selectionId)
    ?.remove();

  document
    .getElementById(pickerId)
    ?.remove();

  const picker =
    document.createElement('div');

  picker.id = pickerId;

  Object.assign(picker.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    cursor: 'crosshair',
    background:
      'rgba(4, 8, 18, 0.30)',
    userSelect: 'none',
  });

  const selectionBox =
    document.createElement('div');

  Object.assign(selectionBox.style, {
    position: 'fixed',
    display: 'none',
    border: '2px solid #8b7cff',
    borderRadius: '8px',
    background:
      'rgba(139, 124, 255, 0.12)',
    boxShadow:
      '0 0 0 1px rgba(255,255,255,0.25), ' +
      '0 0 25px rgba(124,108,255,0.40)',
    pointerEvents: 'none',
  });

  picker.appendChild(selectionBox);

  document.documentElement.appendChild(
    picker,
  );

  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const createBlurPanel = (
    styles: Partial<CSSStyleDeclaration>,
  ): HTMLDivElement => {
    const panel =
      document.createElement('div');

    panel.dataset
      .privateViewSelectionPanel =
      'true';

    Object.assign(panel.style, {
      position: 'fixed',
      background:
        'rgba(5, 8, 18, 0.08)',
      pointerEvents: 'none',
      transition:
      'mask-image 180ms ease, -webkit-mask-image 180ms ease, opacity 180ms ease',
      ...styles,
    });

    panel.style.setProperty(
      'backdrop-filter',
      `blur(${blurAmount}px)`,
    );

    panel.style.setProperty(
      '-webkit-backdrop-filter',
      `blur(${blurAmount}px)`,
    );

    return panel;
  };

  const enableSmartCursorReveal = (
    selectionRoot: HTMLDivElement,
  ): void => {
    type PrivateViewWindow = Window & {
      __privateViewSelectionMouseMove?: (
        event: MouseEvent,
      ) => void;

      __privateViewSelectionObserver?:
        MutationObserver;

      __privateViewSelectionFrame?: number;
    };

    const privateWindow =
      window as PrivateViewWindow;

    // Remove listeners left by an old selection.
    if (
      privateWindow
        .__privateViewSelectionMouseMove
    ) {
      document.removeEventListener(
        'mousemove',
        privateWindow
          .__privateViewSelectionMouseMove,
        true,
      );
    }

    privateWindow
      .__privateViewSelectionObserver
      ?.disconnect();

    if (
      privateWindow
        .__privateViewSelectionFrame
    ) {
      window.cancelAnimationFrame(
        privateWindow
          .__privateViewSelectionFrame,
      );
    }

    // Small reveal around the cursor.
    const cursorRadius = 32;
    const cursorFeather = 29;

    // Extra spacing around a detected tooltip.
    const popupPadding = 8;

    // Maximum distance between cursor and tooltip.
    const popupDetectionDistance = 90;

    let mouseX =
      window.innerWidth / 2;

    let mouseY =
      window.innerHeight / 2;

    const popupSelectors = [
      '[role="tooltip"]',
      '[role="menu"]',
      '[role="dialog"]',
      '[role="listbox"]',
      '[role="alert"]',
      '[role="status"]',
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      '[data-radix-popper-content-wrapper]',
      '[data-popper-placement]',
    ].join(',');

    const isVisibleElement = (
      element: HTMLElement,
    ): boolean => {
      const rect =
        element.getBoundingClientRect();

      const style =
        window.getComputedStyle(element);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || '1') > 0
      );
    };

    const distanceFromRect = (
      rect: DOMRect,
    ): number => {
      const nearestX = Math.max(
        rect.left,
        Math.min(mouseX, rect.right),
      );

      const nearestY = Math.max(
        rect.top,
        Math.min(mouseY, rect.bottom),
      );

      return Math.hypot(
        mouseX - nearestX,
        mouseY - nearestY,
      );
    };

    const findPopupNearCursor =
      (): HTMLElement | null => {
        const candidates =
          document
            .querySelectorAll<HTMLElement>(
              popupSelectors,
            );

        let nearestElement:
          | HTMLElement
          | null = null;

        let nearestDistance =
          Number.POSITIVE_INFINITY;

        candidates.forEach((element) => {
          if (
            element === selectionRoot ||
            selectionRoot.contains(element) ||
            element === picker ||
            picker.contains(element)
          ) {
            return;
          }

          if (!isVisibleElement(element)) {
            return;
          }

          const rect =
            element.getBoundingClientRect();

          const distance =
            distanceFromRect(rect);

          if (
            distance <=
              popupDetectionDistance &&
            distance < nearestDistance
          ) {
            nearestDistance = distance;
            nearestElement = element;
          }
        });

        return nearestElement;
      };

    const createRectangularMask = (
      panelWidth: number,
      panelHeight: number,
      holeLeft: number,
      holeTop: number,
      holeWidth: number,
      holeHeight: number,
    ): string | null => {
      const left = Math.max(
        0,
        holeLeft,
      );

      const top = Math.max(
        0,
        holeTop,
      );

      const right = Math.min(
        panelWidth,
        holeLeft + holeWidth,
      );

      const bottom = Math.min(
        panelHeight,
        holeTop + holeHeight,
      );

      const width = Math.max(
        0,
        right - left,
      );

      const height = Math.max(
        0,
        bottom - top,
      );

      if (
        width <= 0 ||
        height <= 0
      ) {
        return null;
      }

      const svg = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="${panelWidth}"
          height="${panelHeight}"
          viewBox="0 0 ${panelWidth} ${panelHeight}"
        >
          <mask
            id="privateViewMask"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="${panelWidth}"
            height="${panelHeight}"
          >
            <rect
              x="0"
              y="0"
              width="${panelWidth}"
              height="${panelHeight}"
              fill="white"
            />

            <rect
              x="${left}"
              y="${top}"
              width="${width}"
              height="${height}"
              rx="15"
              fill="black"
            />
          </mask>

          <rect
            x="0"
            y="0"
            width="${panelWidth}"
            height="${panelHeight}"
            fill="white"
            mask="url(#privateViewMask)"
          />
        </svg>
      `;

      return (
        `url("data:image/svg+xml,` +
        `${encodeURIComponent(svg)}")`
      );
    };

    const applyCursorMask = (
      panel: HTMLElement,
      panelRect: DOMRect,
    ): void => {
      const localX =
        mouseX - panelRect.left;

      const localY =
        mouseY - panelRect.top;

      const mask = `
        radial-gradient(
          circle at ${localX}px ${localY}px,
          transparent 0px,
          transparent ${cursorRadius}px,
          black ${
            cursorRadius +
            cursorFeather
          }px
        )
      `;

      panel.style.setProperty(
        'mask-image',
        mask,
      );

      panel.style.setProperty(
        '-webkit-mask-image',
        mask,
      );

      panel.style.removeProperty(
        'mask-repeat',
      );

      panel.style.removeProperty(
        '-webkit-mask-repeat',
      );

      panel.style.removeProperty(
        'mask-size',
      );

      panel.style.removeProperty(
        '-webkit-mask-size',
      );
    };

    const applyPopupMask = (
      panel: HTMLElement,
      panelRect: DOMRect,
      popupRect: DOMRect,
    ): void => {
      const localLeft =
        popupRect.left -
        panelRect.left -
        popupPadding;

      const localTop =
        popupRect.top -
        panelRect.top -
        popupPadding;

      const mask =
        createRectangularMask(
          panelRect.width,
          panelRect.height,
          localLeft,
          localTop,
          popupRect.width +
            popupPadding * 2,
          popupRect.height +
            popupPadding * 2,
        );

      // Popup does not intersect this panel.
      if (!mask) {
        panel.style.removeProperty(
          'mask-image',
        );

        panel.style.removeProperty(
          '-webkit-mask-image',
        );

        return;
      }

      panel.style.setProperty(
        'mask-image',
        mask,
      );

      panel.style.setProperty(
        '-webkit-mask-image',
        mask,
      );

      panel.style.setProperty(
        'mask-repeat',
        'no-repeat',
      );

      panel.style.setProperty(
        '-webkit-mask-repeat',
        'no-repeat',
      );

      panel.style.setProperty(
        'mask-size',
        '100% 100%',
      );

      panel.style.setProperty(
        '-webkit-mask-size',
        '100% 100%',
      );
    };

    const renderReveal = (): void => {
      privateWindow
        .__privateViewSelectionFrame =
        0;

      if (!selectionRoot.isConnected) {
        privateWindow
          .__privateViewSelectionObserver
          ?.disconnect();

        return;
      }

      const popup =
        findPopupNearCursor();

      const popupRect =
        popup?.getBoundingClientRect() ??
        null;

      const panels =
        selectionRoot
          .querySelectorAll<HTMLElement>(
            '[data-private-view-selection-panel="true"]',
          );

      panels.forEach((panel) => {
        const panelRect =
          panel.getBoundingClientRect();

        if (
          panelRect.width <= 0 ||
          panelRect.height <= 0
        ) {
          return;
        }

        if (popupRect) {
          applyPopupMask(
            panel,
            panelRect,
            popupRect,
          );

          return;
        }

        applyCursorMask(
          panel,
          panelRect,
        );
      });
    };

    const scheduleRender = (): void => {
      if (
        privateWindow
          .__privateViewSelectionFrame
      ) {
        return;
      }

      privateWindow
        .__privateViewSelectionFrame =
        window.requestAnimationFrame(
          renderReveal,
        );
    };

    const handleMouseMove = (
      event: MouseEvent,
    ): void => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      scheduleRender();
    };

    privateWindow
      .__privateViewSelectionMouseMove =
      handleMouseMove;

    document.addEventListener(
      'mousemove',
      handleMouseMove,
      {
        capture: true,
        passive: true,
      },
    );

    const observer =
      new MutationObserver(() => {
        scheduleRender();
      });

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'class',
          'style',
          'role',
          'aria-hidden',
          'aria-expanded',
        ],
      },
    );

    privateWindow
      .__privateViewSelectionObserver =
      observer;

    scheduleRender();
  };

  const renderSelectionBlur = (
    rect: SelectionRect,
  ): void => {
    document
      .getElementById(selectionId)
      ?.remove();

    const root =
      document.createElement('div');

    root.id = selectionId;

    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '2147483646',
      pointerEvents: 'none',
    });

    root.dataset.blurAmount =
      String(blurAmount);

    root.dataset.left =
      String(rect.left);

    root.dataset.top =
      String(rect.top);

    root.dataset.width =
      String(rect.width);

    root.dataset.height =
      String(rect.height);

    const topPanel =
      createBlurPanel({
        top: '0',
        left: '0',
        width: '100vw',
        height: `${rect.top}px`,
      });

    const bottomPanel =
      createBlurPanel({
        top: `${
          rect.top +
          rect.height
        }px`,
        left: '0',
        right: '0',
        bottom: '0',
      });

    const leftPanel =
      createBlurPanel({
        top: `${rect.top}px`,
        left: '0',
        width: `${rect.left}px`,
        height: `${rect.height}px`,
      });

    const rightPanel =
      createBlurPanel({
        top: `${rect.top}px`,
        left: `${
          rect.left +
          rect.width
        }px`,
        right: '0',
        height: `${rect.height}px`,
      });

    const border =
      document.createElement('div');

    Object.assign(border.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border:
        '2px solid rgba(139, 124, 255, 0.90)',
      borderRadius: '8px',
      boxShadow:
        '0 0 20px rgba(124,108,255,0.30)',
      pointerEvents: 'none',
    });

    root.append(
      topPanel,
      bottomPanel,
      leftPanel,
      rightPanel,
      border,
    );

    document.documentElement.appendChild(
      root,
    );

    enableSmartCursorReveal(root);
  };

  function cleanupPicker(): void {
    picker.remove();

    window.removeEventListener(
      'mousemove',
      handleMouseMove,
      true,
    );

    window.removeEventListener(
      'mouseup',
      handleMouseUp,
      true,
    );

    document.removeEventListener(
      'keydown',
      handleKeyDown,
      true,
    );
  }

  function handleMouseDown(
    event: MouseEvent,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    isDragging = true;

    startX = event.clientX;
    startY = event.clientY;

    Object.assign(
      selectionBox.style,
      {
        display: 'block',
        left: `${startX}px`,
        top: `${startY}px`,
        width: '0px',
        height: '0px',
      },
    );
  }

  function handleMouseMove(
    event: MouseEvent,
  ): void {
    if (!isDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const currentX =
      event.clientX;

    const currentY =
      event.clientY;

    const left = Math.min(
      startX,
      currentX,
    );

    const top = Math.min(
      startY,
      currentY,
    );

    const width = Math.abs(
      currentX - startX,
    );

    const height = Math.abs(
      currentY - startY,
    );

    Object.assign(
      selectionBox.style,
      {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      },
    );
  }

  function handleMouseUp(
    event: MouseEvent,
  ): void {
    if (!isDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    isDragging = false;

    const endX = event.clientX;
    const endY = event.clientY;

    const rect: SelectionRect = {
      left: Math.min(
        startX,
        endX,
      ),

      top: Math.min(
        startY,
        endY,
      ),

      width: Math.abs(
        endX - startX,
      ),

      height: Math.abs(
        endY - startY,
      ),
    };

    if (
      rect.width < 30 ||
      rect.height < 30
    ) {
      selectionBox.style.display =
        'none';

      return;
    }

    cleanupPicker();

    renderSelectionBlur(rect);
  }

  function handleKeyDown(
    event: KeyboardEvent,
  ): void {
    if (event.key !== 'Escape') {
      return;
    }

    cleanupPicker();
  }

  picker.addEventListener(
    'mousedown',
    handleMouseDown,
    true,
  );

  window.addEventListener(
    'mousemove',
    handleMouseMove,
    true,
  );

  window.addEventListener(
    'mouseup',
    handleMouseUp,
    true,
  );

  document.addEventListener(
    'keydown',
    handleKeyDown,
    true,
  );
}

function updateSelectionBlur(
  selectionId: string,
  blurAmount: number,
): void {
  const selectionRoot =
    document.getElementById(
      selectionId,
    );

  if (!selectionRoot) {
    return;
  }

  selectionRoot.dataset.blurAmount =
    String(blurAmount);

  const panels =
    selectionRoot.querySelectorAll<HTMLElement>(
      '[data-private-view-selection-panel="true"]',
    );

  panels.forEach((panel) => {
    panel.style.setProperty(
      'backdrop-filter',
      `blur(${blurAmount}px)`,
    );

    panel.style.setProperty(
      '-webkit-backdrop-filter',
      `blur(${blurAmount}px)`,
    );
  });
}

function disableSelectionBlur(
  selectionId: string,
  pickerId: string,
): void {
  type PrivateViewWindow = Window & {
    __privateViewSelectionMouseHandler?: (
      event: MouseEvent,
    ) => void;

    __privateViewSelectionLeaveHandler?: () => void;

    __privateViewSelectionAnimationFrame?: number;
  };

  const privateWindow =
    window as PrivateViewWindow;

  document
    .getElementById(selectionId)
    ?.remove();

  document
    .getElementById(pickerId)
    ?.remove();

  if (
    privateWindow
      .__privateViewSelectionMouseHandler
  ) {
    document.removeEventListener(
      'mousemove',
      privateWindow
        .__privateViewSelectionMouseHandler,
      true,
    );

    delete privateWindow
      .__privateViewSelectionMouseHandler;
  }

  if (
    privateWindow
      .__privateViewSelectionLeaveHandler
  ) {
    document.removeEventListener(
      'mouseleave',
      privateWindow
        .__privateViewSelectionLeaveHandler,
      true,
    );

    delete privateWindow
      .__privateViewSelectionLeaveHandler;
  }

  if (
    privateWindow
      .__privateViewSelectionAnimationFrame
  ) {
    cancelAnimationFrame(
      privateWindow
        .__privateViewSelectionAnimationFrame,
    );

    delete privateWindow
      .__privateViewSelectionAnimationFrame;
  }
}

function installPrivateViewEscapeHandler(
  spotlightId: string,
  selectionId: string,
  pickerId: string,
  aiOverlayId: string,
): void {
  const root = document.documentElement;

  const listenerInstalled =
    root.dataset.privateViewEscapeListener ===
    'true';

  if (listenerInstalled) {
    return;
  }

  const handleGlobalEscape = (
    event: KeyboardEvent,
  ): void => {
    if (event.key !== 'Escape') {
      return;
    }

    const privateViewElements = [
      spotlightId,
      selectionId,
      pickerId,
      aiOverlayId,
    ];

    const protectionIsActive =
      privateViewElements.some((id) =>
        Boolean(document.getElementById(id)),
      );

    if (!protectionIsActive) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    privateViewElements.forEach((id) => {
      document.getElementById(id)?.remove();
    });

    void chrome.storage.local.set({
      enabled: false,
    });

    console.log(
      'PrivateView protection stopped with Escape.',
    );
  };

  document.addEventListener(
    'keydown',
    handleGlobalEscape,
    true,
  );

  root.dataset.privateViewEscapeListener =
    'true';
}
/* =========================
   Current Tab Controls

========================= */

async function installEscapeHandlerOnCurrentTab():
Promise<void> {
  const tabId = await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: installPrivateViewEscapeHandler,
    args: [
      PRIVATE_VIEW_OVERLAY_ID,
      PRIVATE_VIEW_SELECTION_ID,
      PRIVATE_VIEW_PICKER_ID,
      PRIVATE_VIEW_AI_OVERLAY_ID,
    ],
  });
}

async function applySpotlightToCurrentTab(
  blurAmount: number,
  spotlightSize: number,
): Promise<void> {
  const tabId =
    await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: enableSpotlightBlur,
    args: [
      PRIVATE_VIEW_OVERLAY_ID,
      blurAmount,
      spotlightSize,
    ],
  });
}
async function showToastOnCurrentTab(): Promise<void> {
  const tabId = await getActiveTabId();

  await chrome.scripting.executeScript({
    target: { tabId },
    func: showPrivateViewToast,
  });
}
async function removeSpotlightFromCurrentTab():
Promise<void> {
  const tabId =
    await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: disableSpotlightBlur,
    args: [
      PRIVATE_VIEW_OVERLAY_ID,
    ],
  });
}

async function startSelectionOnCurrentTab(
  blurAmount: number,
): Promise<void> {
  const tabId =
    await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: startSelectionPicker,
    args: [
      PRIVATE_VIEW_SELECTION_ID,
      PRIVATE_VIEW_PICKER_ID,
      blurAmount,
    ],
  });
}

async function removeSelectionFromCurrentTab():
Promise<void> {
  const tabId =
    await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: disableSelectionBlur,
    args: [
      PRIVATE_VIEW_SELECTION_ID,
      PRIVATE_VIEW_PICKER_ID,
    ],
  });
}

async function updateSelectionOnCurrentTab(
  blurAmount: number,
): Promise<void> {
  const tabId =
    await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: updateSelectionBlur,
    args: [
      PRIVATE_VIEW_SELECTION_ID,
      blurAmount,
    ],
  });
}

async function getCurrentPageModeState():
Promise<PageModeState> {
  const tabId =
    await getActiveTabId();

  const results =
    await chrome.scripting.executeScript({
      target: {
        tabId,
      },
      func: (
        spotlightId: string,
        selectionId: string,
        pickerId: string,
      ): PageModeState => ({
        spotlightActive: Boolean(
          document.getElementById(
            spotlightId,
          ),
        ),
        selectionActive: Boolean(
          document.getElementById(
            selectionId,
          ),
        ),
        pickerActive: Boolean(
          document.getElementById(
            pickerId,
          ),
        ),
      }),
      args: [
        PRIVATE_VIEW_OVERLAY_ID,
        PRIVATE_VIEW_SELECTION_ID,
        PRIVATE_VIEW_PICKER_ID,
      ],
    });

  return (
    results[0]?.result ?? {
      spotlightActive: false,
      selectionActive: false,
      pickerActive: false,
    }
  );
}

function showPageError(): void {
  window.alert(
    'PrivateView cannot run on this page.\n\n' +
      'Try it on a normal website such as YouTube, Google, GitHub, Gmail, or WhatsApp Web.\n\n' +
      'Chrome does not allow extensions to modify chrome:// pages or the Chrome Web Store.',
  );
}

/* =========================
   React Popup
========================= */

function App() {
  const [enabled, setEnabled] =
    useState<boolean>(false);

  const [
    blurAmount,
    setBlurAmount,
  ] = useState<number>(
    DEFAULT_SETTINGS.blurAmount,
  );

  const [
    spotlightSize,
    setSpotlightSize,
  ] = useState<number>(
    DEFAULT_SETTINGS.spotlightSize,
  );

  const [
    selectedMode,
    setSelectedMode,
  ] = useState<ModeId>(
    DEFAULT_SETTINGS.selectedMode,
  );

  const [
    isModeOpen,
    setIsModeOpen,
  ] = useState<boolean>(false);

  const [
    hoveredMode,
    setHoveredMode,
  ] = useState<ModeId | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState<boolean>(true);

  const currentMode =
    privacyModes.find(
      (mode) =>
        mode.id === selectedMode,
    ) ?? privacyModes[0];

  const hoveredModeData =
    privacyModes.find(
      (mode) =>
        mode.id === hoveredMode,
    ) ?? null;

  useEffect(() => {
    const loadSavedSettings =
      async (): Promise<void> => {
        try {
          const saved =
            await chrome.storage.local.get(
              DEFAULT_SETTINGS,
            );

          const savedBlurAmount =
            Number(
              saved.blurAmount,
            );

          const savedSpotlightSize =
            Number(
              saved.spotlightSize,
            );

          const safeBlurAmount =
            Number.isFinite(
              savedBlurAmount,
            )
              ? savedBlurAmount
              : DEFAULT_SETTINGS.blurAmount;

          const safeSpotlightSize =
            Number.isFinite(
              savedSpotlightSize,
            )
              ? savedSpotlightSize
              : DEFAULT_SETTINGS.spotlightSize;

          const savedMode =
            saved.selectedMode as ModeId;

          const safeMode =
            privacyModes.some(
              (mode) =>
                mode.id === savedMode,
            )
              ? savedMode
              : DEFAULT_SETTINGS.selectedMode;

          setBlurAmount(
            safeBlurAmount,
          );

          setSpotlightSize(
            safeSpotlightSize,
          );

          setSelectedMode(
            safeMode,
          );

          const pageState =
            await getCurrentPageModeState();

          if (
            safeMode === 'spotlight'
          ) {
            const shouldEnable =
              Boolean(saved.enabled);

            if (
              shouldEnable &&
              !pageState.spotlightActive
            ) {
              await applySpotlightToCurrentTab(
                safeBlurAmount,
                safeSpotlightSize,
              );
            }

            setEnabled(
              shouldEnable,
            );

            return;
          }

          if (
            safeMode === 'selection'
          ) {
            const selectionExists =
              pageState.selectionActive ||
              pageState.pickerActive;

            setEnabled(
              selectionExists,
            );

            if (
              Boolean(saved.enabled) &&
              !selectionExists
            ) {
              await chrome.storage.local.set({
                enabled: false,
              });
            }

            return;
          }

          setEnabled(false);
        } catch (error) {
          console.error(
            'Could not load PrivateView settings:',
            error,
          );

          setEnabled(false);
        } finally {
          setIsLoading(false);
        }
      };

    void loadSavedSettings();
  }, []);

  const selectMode = async (
    modeId: ModeId,
  ): Promise<void> => {
    if (
      modeId === selectedMode
    ) {
      setIsModeOpen(false);
      setHoveredMode(null);

      return;
    }

    if (enabled) {
      try {
        if (
          selectedMode ===
          'spotlight'
        ) {
          await removeSpotlightFromCurrentTab();
        }

        if (
          selectedMode ===
          'selection'
        ) {
          await removeSelectionFromCurrentTab();
        }
      } catch (error) {
        console.error(
          'Could not stop current mode:',
          error,
        );
      }
    }

    setEnabled(false);
    setSelectedMode(modeId);
    setIsModeOpen(false);
    setHoveredMode(null);

    await chrome.storage.local.set({
      enabled: false,
      selectedMode: modeId,
    });
  };

  const handleToggle =
    async (): Promise<void> => {
      if (isLoading) {
        return;
      }

      if (
        selectedMode !==
          'spotlight' &&
        selectedMode !==
          'selection'
      ) {
        window.alert(
          `${currentMode.name} mode is coming soon.`,
        );

        return;
      }

      setIsLoading(true);

      try {
        if (enabled) {
          if (
            selectedMode ===
            'spotlight'
          ) {
            await removeSpotlightFromCurrentTab();
          }

          if (
            selectedMode ===
            'selection'
          ) {
            await removeSelectionFromCurrentTab();
          }

          setEnabled(false);

          await chrome.storage.local.set({
            enabled: false,
          });

          return;
        }
        await installEscapeHandlerOnCurrentTab();
        if (
          selectedMode ===
          'spotlight'
        ) {
          await removeSelectionFromCurrentTab();
          
          await applySpotlightToCurrentTab(
            blurAmount,
            spotlightSize,
          );
          await showToastOnCurrentTab();
        }

        if (
          selectedMode ===
          'selection'
        ) {
          await removeSpotlightFromCurrentTab();

          await startSelectionOnCurrentTab(
            blurAmount,
          );
          await showToastOnCurrentTab();
        }

        setEnabled(true);

        await chrome.storage.local.set({
          enabled: true,
          blurAmount,
          spotlightSize,
          selectedMode,
        });
      } catch (error) {
        console.error(
          'PrivateView toggle failed:',
          error,
        );

        showPageError();
      } finally {
        setIsLoading(false);
      }
    };

  const handleBlurChange =
    async (
      value: number,
    ): Promise<void> => {
      setBlurAmount(value);

      await chrome.storage.local.set({
        blurAmount: value,
      });

      if (!enabled) {
        return;
      }

      try {
        if (
          selectedMode ===
          'spotlight'
        ) {
          await applySpotlightToCurrentTab(
            value,
            spotlightSize,
          );
        }

        if (
          selectedMode ===
          'selection'
        ) {
          await updateSelectionOnCurrentTab(
            value,
          );
        }
      } catch (error) {
        console.error(
          'Could not update blur:',
          error,
        );
      }
    };

  const handleSpotlightSizeChange =
    async (
      value: number,
    ): Promise<void> => {
      setSpotlightSize(value);

      await chrome.storage.local.set({
        spotlightSize: value,
      });

      if (
        !enabled ||
        selectedMode !==
          'spotlight'
      ) {
        return;
      }

      try {
        await applySpotlightToCurrentTab(
          blurAmount,
          value,
        );
      } catch (error) {
        console.error(
          'Could not update spotlight size:',
          error,
        );
      }
    };

  const handleReselect =
    async (): Promise<void> => {
      if (
        selectedMode !==
        'selection'
      ) {
        return;
      }

      try {
        await startSelectionOnCurrentTab(
          blurAmount,
        );
         

        setEnabled(true);

        await chrome.storage.local.set({
          enabled: true,
        });
      } catch (error) {
        console.error(
          'Could not start selection:',
          error,
        );

        showPageError();
      }
    };

  return (
    <main className="popup">
      <header className="welcome-header">
        <div>
          <span className="welcome-text">
            Welcome, User
          </span>

          <h1>
            PrivateView
          </h1>

          <p>
            Protect sensitive information
            while sharing or recording your
            screen.
          </p>
        </div>

        <div className="logo">
          <img
            src={APP_COVER}
            alt="PrivateView"
            className="app-cover-image"
          />
        </div>
      </header>

      <section className="mode-section">
        <button
          type="button"
          className={`mode-trigger ${
            isModeOpen
              ? 'mode-trigger-open'
              : ''
          }`}
          onClick={() =>
            setIsModeOpen(
              !isModeOpen,
            )
          }
          aria-expanded={isModeOpen}
        >
          <span className="mode-trigger-content">
            <small>
              Privacy mode
            </small>

            <strong className="current-mode">
              <span className="current-mode-icon-box">
                {isImageIcon(
                  currentMode.icon,
                ) ? (
                  <img
                    src={currentMode.icon}
                    alt={`${currentMode.name} icon`}
                    className="current-mode-icon-image"
                  />
                ) : (
                  <span className="current-mode-symbol">
                    {currentMode.icon}
                  </span>
                )}
              </span>

              <span className="current-mode-name">
                {currentMode.name}
              </span>
            </strong>
          </span>

          <span
            className={`mode-arrow ${
              isModeOpen
                ? 'mode-arrow-open'
                : ''
            }`}
          >
            &gt;
          </span>
        </button>

        {isModeOpen && (
          <div className="mode-menu">
            <div className="mode-options">
              {privacyModes.map(
                (mode) => {
                  const isSelected =
                    mode.id ===
                    selectedMode;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      title={
                        mode.description
                      }
                      className={`mode-option ${
                        isSelected
                          ? 'mode-option-selected'
                          : ''
                      }`}
                      onClick={() =>
                        void selectMode(
                          mode.id,
                        )
                      }
                      onMouseEnter={() =>
                        setHoveredMode(
                          mode.id,
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredMode(
                          null,
                        )
                      }
                    >
                      <span className="mode-icon">
                        {isImageIcon(
                          mode.icon,
                        ) ? (
                          <img
                            src={mode.icon}
                            alt={`${mode.name} icon`}
                            className="mode-icon-image"
                          />
                        ) : (
                          <span className="mode-icon-symbol">
                            {mode.icon}
                          </span>
                        )}
                      </span>

                      <span className="mode-name">
                        {mode.name}
                      </span>

                      {isSelected && (
                        <span className="selected-mark">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                },
              )}
            </div>

            <div className="mode-description">
              {hoveredModeData ? (
                <>
                  <strong>
                    {
                      hoveredModeData.name
                    }
                  </strong>

                  <p>
                    {
                      hoveredModeData.description
                    }
                  </p>
                </>
              ) : (
                <p>
                  Move your mouse over a
                  mode to see its
                  description.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="power-card">
        <div className="power-content">
          <h2>
            Privacy protection
          </h2>

          <p>
            {selectedMode ===
            'selection'
              ? 'Turn PrivateView on, then drag over the area you want to keep visible.'
              : 'Turn PrivateView on to protect the current webpage.'}
          </p>
        </div>

        <button
          type="button"
          className={`power-toggle ${
            enabled
              ? 'power-toggle-on'
              : 'power-toggle-off'
          }`}
          onClick={() =>
            void handleToggle()
          }
          disabled={isLoading}
          aria-pressed={enabled}
          aria-label={
            enabled
              ? 'Turn PrivateView off'
              : 'Turn PrivateView on'
          }
        >
          <span className="toggle-label">
            {isLoading
              ? '...'
              : enabled
                ? 'ON'
                : 'OFF'}
          </span>

          <span className="toggle-knob" />
        </button>
      </section>

      {enabled && (
        <section className="settings-card">
          <div className="settings-title">
            <div>
              <h2>
                Protection settings
              </h2>

              <p>
                Customize the current
                privacy mode.
              </p>
            </div>

            <span className="active-badge">
              Active
            </span>
          </div>

          <div className="setting">
            <div className="setting-header">
              <div>
                <h3>
                  Blur intensity
                </h3>

                <p>
                  Control how strongly
                  the page is blurred.
                </p>
              </div>

              <span className="setting-value">
                {blurAmount}px
              </span>
            </div>

            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={blurAmount}
              onChange={(event) =>
                void handleBlurChange(
                  Number(
                    event.target.value,
                  ),
                )
              }
            />
          </div>

          {selectedMode ===
            'spotlight' && (
            <>
              <div className="divider" />

              <div className="setting">
                <div className="setting-header">
                  <div>
                    <h3>
                      Spotlight size
                    </h3>

                    <p>
                      Control the visible
                      area around the mouse.
                    </p>
                  </div>

                  <span className="setting-value">
                    {spotlightSize}px
                  </span>
                </div>

                <input
                  type="range"
                  min="120"
                  max="500"
                  step="20"
                  value={spotlightSize}
                  onChange={(event) =>
                    void handleSpotlightSizeChange(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </div>
            </>
          )}

          {selectedMode ===
            'selection' && (
            <>
              <div className="divider" />

              <div className="setting">
                <div className="setting-header">
                  <div>
                    <h3>
                      Selection area
                    </h3>

                    <p>
                      Draw a new visible area
                      on the current page.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mode-trigger"
                  onClick={() =>
                    void handleReselect()
                  }
                  style={{
                    marginTop: '14px',
                  }}
                >
                  <span className="mode-trigger-content">
                    <small>
                      Selection mode
                    </small>

                    <strong>
                      ▣ Select another area
                    </strong>
                  </span>

                  <span className="mode-arrow">
                    &gt;
                  </span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {!enabled && (
        <div className="disabled-message">
          {selectedMode ===
          'selection'
            ? 'Turn protection ON, then drag over the area you want to keep visible.'
            : 'Turn protection ON to customize the blur settings.'}
        </div>
      )}

      <footer>
        PrivateView · Privacy Protection
      </footer>
    </main>
  );
}

export default App;