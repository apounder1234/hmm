// Beginner-only Driver.js bridge. Game events own progression; Driver renders one cue.
import { uiShared } from "./uiShared.js?v=a5.50.0";

const { React } = uiShared;
const LOCAL = "./vendor/driver/";
const CDN = "https://cdn.jsdelivr.net/npm/driver.js@1.10.1/dist/";
let driverPromise;

function loadDriver() {
    if (globalThis.driver?.js?.driver) return Promise.resolve(globalThis.driver.js.driver);
    if (driverPromise) return driverPromise;

    const load = base => new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${base}driver.js.iife.js`;
        script.onload = () => {
            if (!globalThis.driver?.js?.driver) {
                reject(new Error("Driver.js did not initialise"));
                return;
            }
            const css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = `${base}driver.css`;
            document.head.append(css);
            resolve(globalThis.driver.js.driver);
        };
        script.onerror = () => { script.remove(); reject(new Error(`Driver.js unavailable at ${base}`)); };
        document.head.append(script);
    });

    // A vendored copy works offline. Until it is installed, use the pinned CDN.
    driverPromise = load(LOCAL).catch(() => load(CDN))
        .then(driver => {
            const theme = document.createElement("link");
            theme.rel = "stylesheet";
            theme.href = "./app/styles/beginner-tour.css?v=a5.50.0";
            document.head.append(theme);
            return driver;
        })
        .catch(error => { driverPromise = null; throw error; });
    return driverPromise;
}

export function TutorialSpotlight({ cue, onDismiss }) {
    const dismiss = React.useRef(onDismiss);
    dismiss.current = onDismiss;

    React.useEffect(() => {
        if (!cue) return;
        let tour;
        let observer;
        let timeout;
        let cancelled = false;

        function highlight(driver) {
            const target = document.querySelector(cue.targetSelector);
            if (!target || !target.getClientRects().length) return false;
            observer?.disconnect();
            clearTimeout(timeout);
            tour = driver({
                animate: !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
                smoothScroll: true,
                overlayOpacity: 0.4,
                overlayClickBehavior: "close",
                allowClose: true,
                allowScroll: true,
                stagePadding: 7,
                stageRadius: 12,
                popoverClass: "sunpaths-driver-tour",
                showButtons: ["close"],
                onDestroyed: (_element, _step, { reason } = {}) => {
                    if (!cancelled && ["close", "escape", "overlay"].includes(reason)) dismiss.current?.();
                }
            });
            tour.highlight({
                element: target,
                popover: { title: cue.title, description: cue.body, side: "bottom", align: "start" }
            });
            return true;
        }

        loadDriver().then(driver => {
            if (cancelled || highlight(driver)) return;
            // React may render the next phase after the event. Avoid permanent observers.
            observer = new MutationObserver(() => { if (!cancelled) highlight(driver); });
            observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
            timeout = setTimeout(() => observer?.disconnect(), 6000);
        }).catch(error => console.warn("Sunpaths tutorial unavailable:", error.message));

        return () => {
            cancelled = true;
            observer?.disconnect();
            clearTimeout(timeout);
            tour?.destroy();
        };
    }, [cue?.id, cue?.title, cue?.body, cue?.targetSelector]);
    return null;
}
