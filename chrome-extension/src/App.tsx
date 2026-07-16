import { useEffect, useState } from 'react';
import './App.css';

const PRIVATE_VIEW_OVERLAY_ID =
  'privateview-spotlight-overlay';

type ModeId =
  | 'spotlight'
  | 'selection'
  | 'manual-blur'
  | 'smart-ai';

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
    icon: '◉',
    description:
      'Blurs the entire page and reveals only the area around your mouse.',
  },
  {
    id: 'selection',
    name: 'Selection',
    icon: '▣',
    description:
      'Select one area that stays visible while the rest of the page is blurred. Coming soon.',
  },
  {
    id: 'manual-blur',
    name: 'Manual Blur',
    icon: '▧',
    description:
      'Choose specific elements or areas on the page and blur them manually. Coming soon.',
  },
  {
    id: 'smart-ai',
    name: 'Smart AI',
    icon: '✦',
    description:
      'Automatically detects and hides sensitive information on the page. Coming soon.',
  },
];


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

/*
  الدالة دي يتم تشغيلها داخل صفحة الموقع نفسها.

  بتضيف Overlay فوق الصفحة، وتعمل Blur،
  وبعدها تعمل فتحة واضحة حول مكان الماوس.
*/
function enableSpotlightBlur(
  overlayId: string,
  blurAmount: number,
  spotlightSize: number,
): void {
  let overlay = document.getElementById(
    overlayId,
  ) as HTMLDivElement | null;

  /*
    لو الـOverlay مش موجود، بننشئه.
  */
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.setAttribute('aria-hidden', 'true');

    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',

      /*
        أكبر z-index تقريبًا علشان يبقى فوق الصفحة.
      */
      zIndex: '2147483647',

      /*
        علشان الـOverlay ميمنعش الضغط على
        فيديوهات أو أزرار الصفحة.
      */
      pointerEvents: 'none',

      background: 'rgba(5, 8, 18, 0.08)',

      transition:
        'backdrop-filter 120ms ease',
    });

    document.documentElement.appendChild(overlay);
  }

  /*
    بنحفظ القيم داخل الـOverlay نفسه،
    علشان الـMouse Listener يقرأ أحدث قيمة.
  */
  overlay.dataset.blurAmount =
    String(blurAmount);

  overlay.dataset.spotlightSize =
    String(spotlightSize);

  /*
    تطبيق قوة الـBlur.
  */
  overlay.style.setProperty(
    'backdrop-filter',
    `blur(${blurAmount}px)`,
  );

  overlay.style.setProperty(
    '-webkit-backdrop-filter',
    `blur(${blurAmount}px)`,
  );

  /*
    الدالة المسؤولة عن تحريك الفتحة الواضحة.
  */
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

    /*
      Feather بتعمل حواف ناعمة حول المنطقة الواضحة.
    */
    const feather = Math.max(
      25,
      Math.min(50, currentSize * 0.15),
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

    /*
      نحفظ آخر مكان للماوس.
    */
    document.documentElement.dataset
      .privateViewMouseX = String(mouseX);

    document.documentElement.dataset
      .privateViewMouseY = String(mouseY);
  };

  /*
    أول مكان للـSpotlight هيكون آخر مكان محفوظ،
    أو منتصف الشاشة لو مفيش مكان محفوظ.
  */
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

  /*
    نتأكد إننا مش بنضيف Mouse Listener
    أكثر من مرة.
  */
  const listenerAlreadyAdded =
    document.documentElement.dataset
      .privateViewMouseListener === 'true';

  if (!listenerAlreadyAdded) {
    let animationFrameId = 0;
    let nextMouseX = initialX;
    let nextMouseY = initialY;

    document.addEventListener(
      'mousemove',
      (event: MouseEvent) => {
        nextMouseX = event.clientX;
        nextMouseY = event.clientY;

        /*
          requestAnimationFrame بيمنع تنفيذ
          تحديثات كثيرة جدًا أثناء تحريك الماوس.
        */
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
}

/*
  إزالة الـBlur من الصفحة.
*/
function disableSpotlightBlur(
  overlayId: string,
): void {
  document
    .getElementById(overlayId)
    ?.remove();
}

/*
  تشغيل أو تحديث الـBlur داخل الـTab الحالية.
*/
async function applySpotlightToCurrentTab(
  blurAmount: number,
  spotlightSize: number,
): Promise<void> {
  const tabId = await getActiveTabId();

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

/*
  إزالة الـBlur من الـTab الحالية.
*/
async function removeSpotlightFromCurrentTab():
Promise<void> {
  const tabId = await getActiveTabId();

  await chrome.scripting.executeScript({
    target: {
      tabId,
    },

    func: disableSpotlightBlur,

    args: [PRIVATE_VIEW_OVERLAY_ID],
  });
}

/*
  رسالة خطأ مناسبة لو الصفحة ممنوع تشغيل
  Extensions داخلها.
*/
function showPageError(): void {
  window.alert(
    'PrivateView cannot run on this page.\n\n' +
      'Try it on a normal website such as YouTube, Google, GitHub, WhatsApp Web, or Gmail.\n\n' +
      'Chrome does not allow extensions to modify chrome:// pages or the Chrome Web Store.',
  );
}

function App() {
  const [enabled, setEnabled] =
    useState<boolean>(false);

  const [blurAmount, setBlurAmount] =
    useState<number>(
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

  const [isModeOpen, setIsModeOpen] =
    useState<boolean>(false);

  const [
    hoveredMode,
    setHoveredMode,
  ] = useState<ModeId | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

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

  /*
    أول ما الـPopup تفتح:

    1. نقرأ الإعدادات المحفوظة.
    2. نرجع الـSliders لنفس القيم.
    3. نرجع الزر ON لو كان ON.
    4. لو الحماية كانت ON نعيد تطبيقها
       على الصفحة الحالية.
  */
  useEffect(() => {
    const loadSavedSettings =
      async (): Promise<void> => {
        try {
          const saved =
            (await chrome.storage.local.get(
              DEFAULT_SETTINGS,
            )) as PrivateViewSettings;

          const savedBlurAmount =
            Number(saved.blurAmount);

          const savedSpotlightSize =
            Number(saved.spotlightSize);

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

          const safeMode =
            privacyModes.some(
              (mode) =>
                mode.id ===
                saved.selectedMode,
            )
              ? saved.selectedMode
              : DEFAULT_SETTINGS.selectedMode;

          const shouldBeEnabled =
            Boolean(saved.enabled) &&
            safeMode === 'spotlight';

          setBlurAmount(
            safeBlurAmount,
          );

          setSpotlightSize(
            safeSpotlightSize,
          );

          setSelectedMode(safeMode);

          setEnabled(shouldBeEnabled);

          /*
            لو كانت ON قبل ما الـPopup تتقفل،
            نطبق الـBlur مرة ثانية على الصفحة الحالية.
          */
          if (shouldBeEnabled) {
            try {
              await applySpotlightToCurrentTab(
                safeBlurAmount,
                safeSpotlightSize,
              );
            } catch (error) {
              console.error(
                'Could not apply PrivateView:',
                error,
              );
            }
          }
        } catch (error) {
          console.error(
            'Could not load settings:',
            error,
          );
        } finally {
          setIsLoading(false);
        }
      };

    void loadSavedSettings();
  }, []);

  /*
    اختيار Mode من القائمة.
  */
  const selectMode = async (
    modeId: ModeId,
  ): Promise<void> => {
    setSelectedMode(modeId);
    setIsModeOpen(false);
    setHoveredMode(null);

    await chrome.storage.local.set({
      selectedMode: modeId,
    });

    /*
      حاليًا Spotlight هو المود المنفذ
      في Milestone 1.

      لو المستخدم اختار مود قادم أثناء التشغيل،
      نقفل Spotlight الحالي.
    */
    if (
      enabled &&
      modeId !== 'spotlight'
    ) {
      try {
        await removeSpotlightFromCurrentTab();
      } catch (error) {
        console.error(
          'Could not remove spotlight:',
          error,
        );
      }

      setEnabled(false);

      await chrome.storage.local.set({
        enabled: false,
      });
    }
  };

  /*
    تشغيل أو إيقاف PrivateView.
  */
  const handleToggle =
    async (): Promise<void> => {
      if (isLoading) {
        return;
      }

      /*
        باقي الـModes ظاهرة في الواجهة،
        لكنها غير منفذة حاليًا.
      */
      if (
        !enabled &&
        selectedMode !== 'spotlight'
      ) {
        window.alert(
          `${currentMode.name} mode is coming soon.\n\nPlease select Spotlight mode for Milestone 1.`,
        );

        return;
      }

      setIsLoading(true);

      try {
        if (enabled) {
          await removeSpotlightFromCurrentTab();

          setEnabled(false);

          await chrome.storage.local.set({
            enabled: false,
          });
        } else {
          await applySpotlightToCurrentTab(
            blurAmount,
            spotlightSize,
          );

          setEnabled(true);

          await chrome.storage.local.set({
            enabled: true,
            blurAmount,
            spotlightSize,
            selectedMode,
          });
        }
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

  /*
    تغيير درجة الـBlur وحفظها.

    لو الحماية ON، نحدث الصفحة مباشرة.
  */
  const handleBlurChange =
    async (
      value: number,
    ): Promise<void> => {
      setBlurAmount(value);

      await chrome.storage.local.set({
        blurAmount: value,
      });

      if (
        enabled &&
        selectedMode === 'spotlight'
      ) {
        try {
          await applySpotlightToCurrentTab(
            value,
            spotlightSize,
          );
        } catch (error) {
          console.error(
            'Could not update blur:',
            error,
          );
        }
      }
    };

  /*
    تغيير حجم المنطقة الواضحة وحفظه.

    لو الحماية ON، نحدث الصفحة مباشرة.
  */
  const handleSpotlightSizeChange =
    async (
      value: number,
    ): Promise<void> => {
      setSpotlightSize(value);

      await chrome.storage.local.set({
        spotlightSize: value,
      });

      if (
        enabled &&
        selectedMode === 'spotlight'
      ) {
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
      }
    };

  return (
    <main className="popup">
      <header className="welcome-header">
        <div>
          <span className="welcome-text">
            Welcome, User
          </span>

          <h1>PrivateView</h1>

          <p>
            Protect sensitive information
            while sharing or recording your
            screen.
          </p>
        </div>

        <div className="logo">
          PV
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

            <strong>
              {currentMode.icon}{' '}
              {currentMode.name}
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
                        {mode.icon}
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
            Turn PrivateView on to
            protect the current webpage.
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
        </section>
      )}

      {!enabled && (
        <div className="disabled-message">
          Turn protection ON to customize
          the blur settings.
        </div>
      )}

      <footer>
        PrivateView · Milestone 1
      </footer>
    </main>
  );
}

export default App;