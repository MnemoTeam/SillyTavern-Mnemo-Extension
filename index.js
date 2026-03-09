// SillyTavern Extension — Mnemo Search
// Browse, search, and download character cards from mnemo.studio

import {
    getRequestHeaders,
    processDroppedFiles,
    callPopup,
    saveSettingsDebounced,
} from "../../../../script.js";
import { debounce } from "../../../utils.js";
import { extension_settings } from "../../../extensions.js";
import { registerSlashCommand } from "../../../slash-commands.js";

// ─── Constants ──────────────────────────────────────────────────────────────────

const EXTENSION_NAME = "SillyTavern-Mnemo-Search";
const DEFAULT_API_BASE = "https://api.mnemo.studio";
const PUBLIC_API_KEY = "218faff4f8c748d06fe83c2dd4684297a5b9028fdcda78aa9a0ea19480e297c5";
const RESULTS_PER_PAGE = 20;
const MNEMO_ICON = "https://mnemo.studio/images/mnemo-logo.svg";

const defaultSettings = {
    apiBaseUrl: DEFAULT_API_BASE,
    apiToken: "",
    findCount: RESULTS_PER_PAGE,
    nsfw: false,
};

const SORT_OPTIONS = {
    "download_count.desc": "Top Downloads",
    "created_at.desc": "Newest",
    "updated_at.desc": "Recently Updated",
    "name.asc": "Name (A-Z)",
};

const REC_METHOD_LABELS = {
    collaborative: "Based on your favorites",
    tag_based: "Similar tags",
    trending_fallback: "Trending",
};

// ─── Inline SVG Icons (Lucide) ──────────────────────────────────────────────────

const ICONS = {
    download: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    externalLink: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    heart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    starFilled: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    grid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    lock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    gitFork: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/></svg>',
};

// ─── State ──────────────────────────────────────────────────────────────────────

let currentPage = 1;
let currentSort = "download_count.desc";
let currentSearch = "";
let totalResults = 0;
let activeTab = "search";
let settingsOpen = false;
let cachedUserData = null;
let detailCharacter = null;
let selectedIndices = new Set();
let collectionsPage = 1;
let activeCollection = null;

// ─── Settings ───────────────────────────────────────────────────────────────────

function getSettings() {
    return extension_settings.mnemo || defaultSettings;
}

function loadSettings() {
    if (!extension_settings.mnemo) {
        extension_settings.mnemo = {};
    }
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!(key in extension_settings.mnemo)) {
            extension_settings.mnemo[key] = value;
        }
    }
}

function hasToken() {
    return !!getSettings().apiToken;
}

// ─── API Client ─────────────────────────────────────────────────────────────────

async function mnemoApi(path, params = {}) {
    const settings = getSettings();
    const base = settings.apiBaseUrl.replace(/\/+$/, "");
    const url = new URL(path, base);

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
        }
    }

    const headers = {
        "Content-Type": "application/json",
        "x-api-key": PUBLIC_API_KEY,
    };
    if (settings.apiToken) {
        headers["Authorization"] = `Bearer ${settings.apiToken}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
        throw new Error(`Mnemo API ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

async function searchCharactersApi({ searchTerm, sort, nsfw, page, limit }) {
    const [orderCol, orderDir] = (sort || "download_count.desc").split(".");
    const params = {
        limit: limit || RESULTS_PER_PAGE,
        offset: ((page || 1) - 1) * (limit || RESULTS_PER_PAGE),
        order: `${orderCol}.${orderDir || "desc"}`,
    };

    if (searchTerm) {
        params["name"] = `ilike.*${searchTerm}*`;
    }
    if (!nsfw) {
        params["is_nsfw"] = "eq.false";
    }

    return mnemoApi("/public-api/characters", params);
}

async function fetchUserData() {
    if (cachedUserData) return cachedUserData;
    cachedUserData = await mnemoApi("/user-api/me");
    return cachedUserData;
}

async function fetchForYouApi() {
    return mnemoApi("/user-api/for-you", { limit: 20 });
}

async function fetchCollectionsApi(page = 1) {
    return mnemoApi("/public-api/collections", {
        order: "created_at.desc",
        limit: RESULTS_PER_PAGE,
        offset: (page - 1) * RESULTS_PER_PAGE,
    });
}

async function fetchCollectionCharactersApi(collectionId) {
    const { data: links } = await mnemoApi("/public-api/collection_characters", {
        "collection_id": "eq." + collectionId,
        order: "sort_order.asc",
        limit: 100,
    });
    if (!links || links.length === 0) return [];

    const charIds = links.map((l) => l.character_id).filter(Boolean);
    if (charIds.length === 0) return [];

    const { data: characters } = await mnemoApi("/public-api/characters", {
        "id": `in.${charIds.join(",")}`,
        limit: 100,
    });
    return characters || [];
}

async function fetchCharacterDetail(characterId) {
    const { data } = await mnemoApi(`/public-api/characters/${characterId}`);
    return data;
}

async function fetchReviews(characterId) {
    const { data } = await mnemoApi("/public-api/reviews", {
        "character_id": "eq." + characterId,
        order: "created_at.desc",
        limit: 10,
    });
    return data || [];
}

// ─── Download ───────────────────────────────────────────────────────────────────

async function downloadCharacter(character, buttonEl) {
    // Use API proxy endpoint to avoid ST domain whitelist issues
    const url = `${DEFAULT_API_BASE}/public-api/characters/${character.id}/download`;

    if (buttonEl) {
        buttonEl.classList.add("downloading");
        buttonEl.textContent = "Importing…";
    }

    try {
        // Fetch directly from Mnemo API (CORS enabled) to bypass ST domain whitelist
        const response = await fetch(url, {
            headers: { "x-api-key": PUBLIC_API_KEY },
        });

        if (!response.ok) {
            toastr.info(
                "Click to open on Mnemo",
                `Import failed for ${character.name}`,
                {
                    onclick: () =>
                        window.open(
                            `https://mnemo.studio/character/${character.id}`,
                            "_blank"
                        ),
                }
            );
            return;
        }

        const data = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        const contentType = response.headers.get("Content-Type") || "";
        const ext = contentType.includes("json") ? "json" : contentType.includes("yaml") ? "yaml" : "png";
        const safeName = character.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = contentDisposition
            ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
            : `${safeName}.${ext}`;
        const file = new File([data], fileName, { type: data.type });

        processDroppedFiles([file]);
        toastr.success(`Imported "${character.name}"`);
    } catch (err) {
        console.error(`[Mnemo] Download failed for ${character.name}:`, err);
        toastr.error(`Failed to import "${character.name}"`);
    } finally {
        if (buttonEl) {
            buttonEl.classList.remove("downloading");
            buttonEl.innerHTML = `${ICONS.download} Import`;
        }
    }
}

async function downloadSelected() {
    const grid = document.getElementById("mnemoGrid");
    const characters = grid?._mnemoCharacters || [];
    const indices = Array.from(selectedIndices).sort((a, b) => a - b);

    for (const idx of indices) {
        if (characters[idx]) {
            await downloadCharacter(characters[idx], null);
            await new Promise((r) => setTimeout(r, 300));
        }
    }

    selectedIndices.clear();
    updateBulkButton();
    // Re-render to clear checkboxes
    if (grid && characters.length > 0) {
        grid.innerHTML = characters
            .map((char, i) => renderCharacterCard(char, i))
            .join("");
    }
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────────

function formatTagName(name) {
    return name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function getSpecBadge(specVersion) {
    if (!specVersion) return "";
    const v = specVersion.toLowerCase();
    let cls = "other";
    let label = specVersion;
    if (v.includes("3") || v === "chara_card_v3") {
        cls = "v3";
        label = "V3";
    } else if (v.includes("2") || v === "chara_card_v2") {
        cls = "v2";
        label = "V2";
    }
    return `<span class="mnemo-badge-spec ${cls}">${label}</span>`;
}

function renderStars(rating) {
    const full = Math.floor(rating);
    const empty = 5 - full;
    return (
        ICONS.starFilled.repeat(full) +
        ICONS.star.repeat(empty)
    );
}

// ─── Card Rendering ─────────────────────────────────────────────────────────────

function renderCharacterCard(character, index) {
    const tags = (character.character_tags || [])
        .slice(0, 4)
        .map((ct) => {
            const tagName = ct.tags?.name || "";
            return `<span class="mnemo-tag" data-tag="${escapeHtml(tagName)}">${formatTagName(tagName)}</span>`;
        })
        .join("");

    const authorName =
        character.profiles?.display_name ||
        character.profiles?.username ||
        "Unknown";

    const downloads = character.download_count ?? 0;
    const imageUrl = character.image_url || "";
    const isSelected = selectedIndices.has(index);

    return `
        <div class="mnemo-card" data-index="${index}">
            ${imageUrl ? `<img class="mnemo-card-img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(character.name)}" loading="lazy" />` : `<div class="mnemo-card-img" style="background:var(--mnemo-surface)"></div>`}
            ${character.is_nsfw ? '<span class="mnemo-badge-nsfw">NSFW</span>' : ""}
            ${getSpecBadge(character.spec_version)}
            <label class="mnemo-card-checkbox ${isSelected ? "checked" : ""}" title="Select for bulk import">
                <input type="checkbox" data-index="${index}" ${isSelected ? "checked" : ""} />
            </label>
            <div class="mnemo-card-overlay">
                <div class="mnemo-card-name" title="${escapeHtml(character.name)}" data-detail-id="${character.id}">${escapeHtml(character.name)}</div>
                <div class="mnemo-card-author">by ${escapeHtml(authorName)}</div>
                <div class="mnemo-card-meta">
                    <span class="mnemo-card-meta-item">${ICONS.download} ${downloads.toLocaleString()}</span>
                    ${character.token_count ? `<span class="mnemo-card-meta-item">${ICONS.sparkles} ${character.token_count.toLocaleString()}</span>` : ""}
                    ${character.fork_count ? `<span class="mnemo-card-meta-item">${ICONS.gitFork} ${character.fork_count}</span>` : ""}
                </div>
                <div class="mnemo-card-tags">${tags}</div>
                <div class="mnemo-card-actions">
                    <button class="mnemo-btn-download" data-index="${index}">${ICONS.download} Import</button>
                    <a class="mnemo-btn-link" href="${getSettings().apiBaseUrl.replace(/\/+$/, "")}/character/${character.id}" target="_blank" title="View on Mnemo">${ICONS.externalLink}</a>
                </div>
            </div>
        </div>
    `;
}

function renderCollectionCard(collection, index) {
    const creatorName =
        collection.profiles?.display_name ||
        collection.profiles?.username ||
        "Unknown";
    const coverUrl = collection.cover_image_url || "";

    return `
        <div class="mnemo-collection-card" data-collection-id="${collection.id}" data-index="${index}">
            ${coverUrl ? `<img class="mnemo-collection-img" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(collection.name)}" loading="lazy" />` : `<div class="mnemo-collection-img" style="background:var(--mnemo-surface)"></div>`}
            <div class="mnemo-collection-overlay">
                <div class="mnemo-card-name">${escapeHtml(collection.name)}</div>
                <div class="mnemo-card-author">by ${escapeHtml(creatorName)}</div>
                ${collection.description ? `<div class="mnemo-collection-desc">${escapeHtml(collection.description).slice(0, 100)}</div>` : ""}
            </div>
        </div>
    `;
}

function renderCharacterDetail(character, reviews = []) {
    const authorName =
        character.profiles?.display_name ||
        character.profiles?.username ||
        "Unknown";

    const allTags = (character.character_tags || [])
        .map((ct) => {
            const tagName = ct.tags?.name || "";
            return `<span class="mnemo-tag" data-tag="${escapeHtml(tagName)}">${formatTagName(tagName)}</span>`;
        })
        .join("");

    const greeting = character.greeting
        ? escapeHtml(character.greeting).slice(0, 500)
        : "";

    const reviewsHtml = reviews.length > 0
        ? reviews.map((r) => `
            <div class="mnemo-review">
                <div class="mnemo-review-header">
                    <span class="mnemo-review-stars">${renderStars(r.rating || 0)}</span>
                    <span class="mnemo-review-author">${escapeHtml(r.profiles?.display_name || r.profiles?.username || "Anonymous")}</span>
                </div>
                ${r.content ? `<div class="mnemo-review-content">${escapeHtml(r.content)}</div>` : ""}
            </div>
        `).join("")
        : '<div class="mnemo-text-muted" style="font-size:13px;">No reviews yet.</div>';

    return `
        <div class="mnemo-detail">
            <button class="mnemo-back-btn" id="mnemoDetailBack">${ICONS.arrowLeft} Back</button>
            <div class="mnemo-detail-layout">
                <div class="mnemo-detail-image-col">
                    ${character.image_url ? `<img class="mnemo-detail-img" src="${escapeHtml(character.image_url)}" alt="${escapeHtml(character.name)}" />` : ""}
                    <div class="mnemo-detail-actions">
                        <button class="mnemo-btn-download mnemo-btn-download-lg" data-detail-download="true">${ICONS.download} Import Character</button>
                        <a class="mnemo-btn-link" href="${getSettings().apiBaseUrl.replace(/\/+$/, "")}/character/${character.id}" target="_blank" title="View on Mnemo">${ICONS.externalLink}</a>
                    </div>
                </div>
                <div class="mnemo-detail-info">
                    <h2 class="mnemo-detail-name">${escapeHtml(character.name)}</h2>
                    <div class="mnemo-card-author" style="margin-bottom:12px;">by ${escapeHtml(authorName)}</div>
                    <div class="mnemo-detail-stats">
                        <span class="mnemo-card-meta-item">${ICONS.download} ${(character.download_count ?? 0).toLocaleString()} downloads</span>
                        ${character.token_count ? `<span class="mnemo-card-meta-item">${ICONS.sparkles} ${character.token_count.toLocaleString()} tokens</span>` : ""}
                        ${character.fork_count ? `<span class="mnemo-card-meta-item">${ICONS.gitFork} ${character.fork_count} forks</span>` : ""}
                        ${character.spec_version ? `<span>${getSpecBadge(character.spec_version)}</span>` : ""}
                    </div>
                    ${character.description ? `<div class="mnemo-detail-section"><div class="mnemo-detail-section-title">Description</div><div class="mnemo-detail-text">${escapeHtml(character.description)}</div></div>` : ""}
                    ${greeting ? `<div class="mnemo-detail-section"><div class="mnemo-detail-section-title">Greeting</div><div class="mnemo-detail-greeting">${greeting}</div></div>` : ""}
                    ${allTags ? `<div class="mnemo-detail-section"><div class="mnemo-detail-section-title">Tags</div><div class="mnemo-detail-tags">${allTags}</div></div>` : ""}
                    <div class="mnemo-detail-section">
                        <div class="mnemo-detail-section-title">Reviews</div>
                        ${reviewsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSkeletons(count = 8) {
    return Array(count)
        .fill('<div class="mnemo-skeleton"></div>')
        .join("");
}

function renderEmptyState(message = "No characters found", sub = "Try adjusting your search or filters.") {
    return `
        <div class="mnemo-empty">
            ${ICONS.search}
            <div class="mnemo-empty-title">${message}</div>
            <div>${sub}</div>
        </div>
    `;
}

function renderAuthRequired() {
    return `
        <div class="mnemo-empty">
            ${ICONS.lock}
            <div class="mnemo-empty-title">API Token Required</div>
            <div>Click the ${ICONS.settings} gear icon to add your personal API token from mnemo.studio</div>
        </div>
    `;
}

function renderError(message) {
    return `<div class="mnemo-error">${escapeHtml(message)}</div>`;
}

function renderMethodBadge(method) {
    const label = REC_METHOD_LABELS[method] || method;
    return `<div class="mnemo-method-badge">${ICONS.sparkles} ${label}</div>`;
}

// ─── Settings Panel ─────────────────────────────────────────────────────────────

function renderSettingsPanel() {
    const settings = getSettings();
    return `
        <div class="mnemo-settings" id="mnemoSettings">
            <div class="mnemo-settings-group">
                <label class="mnemo-settings-label">Personal API Token</label>
                <input type="password" class="mnemo-settings-input" id="mnemoTokenInput" value="${escapeHtml(settings.apiToken)}" placeholder="Paste your token from mnemo.studio → Settings" />
                <div class="mnemo-settings-hint">Generate a token at mnemo.studio → Settings → API Tokens</div>
            </div>
            <div class="mnemo-settings-group">
                <label class="mnemo-settings-label">API Base URL</label>
                <input type="text" class="mnemo-settings-input" id="mnemoBaseUrlInput" value="${escapeHtml(settings.apiBaseUrl)}" placeholder="${DEFAULT_API_BASE}" />
                <div class="mnemo-settings-hint">Default: ${DEFAULT_API_BASE}</div>
            </div>
            <div class="mnemo-settings-group">
                <button class="mnemo-btn-test" id="mnemoTestBtn">Test Connection</button>
                <span class="mnemo-test-result" id="mnemoTestResult"></span>
            </div>
        </div>
    `;
}

// ─── Popup Build ────────────────────────────────────────────────────────────────

function buildPopupHtml() {
    const settings = getSettings();
    const sortOptionsHtml = Object.entries(SORT_OPTIONS)
        .map(
            ([value, label]) =>
                `<option value="${value}" ${value === currentSort ? "selected" : ""}>${label}</option>`
        )
        .join("");

    const tabs = [
        { id: "search", label: `${ICONS.search} Search` },
        { id: "favorites", label: `${ICONS.heart} Favorites` },
        { id: "foryou", label: `${ICONS.sparkles} For You` },
        { id: "collections", label: `${ICONS.grid} Collections` },
    ];

    const tabsHtml = tabs
        .map(
            (t) =>
                `<button class="mnemo-tab ${t.id === activeTab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`
        )
        .join("");

    return `
        <div class="mnemo-popup">
            <div class="mnemo-header">
                <img src="${MNEMO_ICON}" alt="Mnemo" class="mnemo-header-icon" />
                <input type="text" class="mnemo-search-input" id="mnemoSearchInput" placeholder="Search characters…" value="${escapeHtml(currentSearch)}" />
                <select class="mnemo-select" id="mnemoSortSelect">${sortOptionsHtml}</select>
                <label class="mnemo-nsfw-toggle">
                    <input type="checkbox" id="mnemoNsfwCheck" ${settings.nsfw ? "checked" : ""} />
                    NSFW
                </label>
                <button class="mnemo-settings-btn" id="mnemoSettingsBtn" title="Settings">${ICONS.settings}</button>
            </div>
            <div class="mnemo-tabs" id="mnemoTabs">${tabsHtml}</div>
            <div class="mnemo-content" id="mnemoContent">
                <div class="mnemo-grid" id="mnemoGrid">
                    ${renderSkeletons()}
                </div>
            </div>
            <div class="mnemo-footer" id="mnemoFooter">
                <button class="mnemo-page-btn" id="mnemoPrevPage" disabled>${ICONS.chevronLeft}</button>
                <span class="mnemo-page-info" id="mnemoPageInfo">Page 1</span>
                <button class="mnemo-page-btn" id="mnemoNextPage">${ICONS.chevronRight}</button>
                <button class="mnemo-bulk-btn" id="mnemoBulkBtn" style="display:none;">${ICONS.download} Import Selected</button>
            </div>
        </div>
    `;
}

// ─── Tab Switching ──────────────────────────────────────────────────────────────

async function switchTab(tab) {
    activeTab = tab;
    detailCharacter = null;
    selectedIndices.clear();

    // Update tab active states
    document.querySelectorAll(".mnemo-tab").forEach((el) => {
        el.classList.toggle("active", el.getAttribute("data-tab") === tab);
    });

    // Show/hide search controls
    const searchInput = document.getElementById("mnemoSearchInput");
    const sortSelect = document.getElementById("mnemoSortSelect");
    const nsfwToggle = document.querySelector(".mnemo-nsfw-toggle");
    const footer = document.getElementById("mnemoFooter");
    const showSearchControls = tab === "search";
    if (searchInput) searchInput.style.display = showSearchControls ? "" : "none";
    if (sortSelect) sortSelect.style.display = showSearchControls ? "" : "none";
    if (nsfwToggle) nsfwToggle.style.display = showSearchControls || tab === "collections" ? "" : "none";
    if (footer) footer.style.display = tab === "search" || tab === "collections" ? "" : "none";

    // Hide settings if open
    const settingsEl = document.getElementById("mnemoSettings");
    if (settingsEl) settingsEl.remove();
    settingsOpen = false;

    updateBulkButton();

    switch (tab) {
        case "search":
            currentPage = 1;
            await executeSearch();
            break;
        case "favorites":
            await loadFavorites();
            break;
        case "foryou":
            await loadForYou();
            break;
        case "collections":
            activeCollection = null;
            collectionsPage = 1;
            await loadCollections();
            break;
    }
}

// ─── Search Tab ─────────────────────────────────────────────────────────────────

async function executeSearch(characters) {
    const grid = document.getElementById("mnemoGrid");
    const content = document.getElementById("mnemoContent");
    if (!grid || !content) return;

    content.classList.add("searching");

    try {
        let results;
        if (characters) {
            results = characters;
        } else {
            const data = await searchCharactersApi({
                searchTerm: currentSearch,
                sort: currentSort,
                nsfw: getSettings().nsfw,
                page: currentPage,
                limit: getSettings().findCount,
            });
            results = data.data || data || [];
        }

        if (!Array.isArray(results)) {
            results = [];
        }

        totalResults = results.length;

        if (results.length === 0) {
            grid.innerHTML = renderEmptyState();
        } else {
            grid.innerHTML = results
                .map((char, i) => renderCharacterCard(char, i))
                .join("");
            grid._mnemoCharacters = results;
        }

        updatePagination();
    } catch (err) {
        console.error("[Mnemo] Search failed:", err);
        grid.innerHTML = renderError(`Search failed: ${err.message}`);
    } finally {
        content.classList.remove("searching");
    }
}

// ─── Favorites Tab ──────────────────────────────────────────────────────────────

async function loadFavorites() {
    const grid = document.getElementById("mnemoGrid");
    const content = document.getElementById("mnemoContent");
    if (!grid) return;

    if (!hasToken()) {
        grid.innerHTML = renderAuthRequired();
        return;
    }

    content?.classList.add("searching");
    grid.innerHTML = renderSkeletons(4);

    try {
        const userData = await fetchUserData();
        const favorites = userData.favorites || [];

        if (favorites.length === 0) {
            grid.innerHTML = renderEmptyState("No favorites yet", "Star characters on mnemo.studio to see them here.");
            return;
        }

        // Fetch full character data for favorites
        const charIds = favorites.map((f) => f.character_id).filter(Boolean);
        const { data: fullChars } = await mnemoApi("/public-api/characters", {
            id: `in.${charIds.join(",")}`,
            limit: 100,
        });

        const characters = fullChars || [];
        if (characters.length === 0) {
            grid.innerHTML = renderEmptyState("No favorites found");
            return;
        }

        grid.innerHTML = characters
            .map((char, i) => renderCharacterCard(char, i))
            .join("");
        grid._mnemoCharacters = characters;
    } catch (err) {
        console.error("[Mnemo] Favorites failed:", err);
        grid.innerHTML = renderError(`Failed to load favorites: ${err.message}`);
    } finally {
        content?.classList.remove("searching");
    }
}

// ─── For You Tab ────────────────────────────────────────────────────────────────

async function loadForYou() {
    const grid = document.getElementById("mnemoGrid");
    const content = document.getElementById("mnemoContent");
    if (!grid) return;

    if (!hasToken()) {
        grid.innerHTML = renderAuthRequired();
        return;
    }

    content?.classList.add("searching");
    grid.innerHTML = renderSkeletons(4);

    try {
        const result = await fetchForYouApi();
        const characters = result.data || [];

        if (characters.length === 0) {
            grid.innerHTML = renderEmptyState("No recommendations yet", "Favorite some characters on mnemo.studio first!");
            return;
        }

        const methodBadge = renderMethodBadge(result.method);
        grid.innerHTML =
            methodBadge +
            characters.map((char, i) => renderCharacterCard(char, i)).join("");
        grid._mnemoCharacters = characters;
    } catch (err) {
        console.error("[Mnemo] For You failed:", err);
        grid.innerHTML = renderError(`Failed to load recommendations: ${err.message}`);
    } finally {
        content?.classList.remove("searching");
    }
}

// ─── Collections Tab ────────────────────────────────────────────────────────────

async function loadCollections() {
    const grid = document.getElementById("mnemoGrid");
    const content = document.getElementById("mnemoContent");
    if (!grid) return;

    content?.classList.add("searching");
    grid.innerHTML = renderSkeletons(4);

    try {
        const { data: collections, count } = await fetchCollectionsApi(collectionsPage);

        if (!collections || collections.length === 0) {
            grid.innerHTML = renderEmptyState("No collections found");
            return;
        }

        grid.innerHTML = collections
            .map((col, i) => renderCollectionCard(col, i))
            .join("");
        grid._mnemoCollections = collections;

        totalResults = collections.length;
        updatePagination();
    } catch (err) {
        console.error("[Mnemo] Collections failed:", err);
        grid.innerHTML = renderError(`Failed to load collections: ${err.message}`);
    } finally {
        content?.classList.remove("searching");
    }
}

async function openCollection(collectionId) {
    const grid = document.getElementById("mnemoGrid");
    const content = document.getElementById("mnemoContent");
    if (!grid) return;

    const collections = grid._mnemoCollections || [];
    activeCollection = collections.find((c) => c.id === collectionId) || { id: collectionId, name: "Collection" };

    content?.classList.add("searching");
    grid.innerHTML = renderSkeletons(4);

    try {
        const characters = await fetchCollectionCharactersApi(collectionId);

        const headerHtml = `
            <div class="mnemo-collection-header">
                <button class="mnemo-back-btn" id="mnemoCollectionBack">${ICONS.arrowLeft} Collections</button>
                <h3 class="mnemo-collection-title">${escapeHtml(activeCollection.name)}</h3>
                ${activeCollection.description ? `<div class="mnemo-collection-subtitle">${escapeHtml(activeCollection.description)}</div>` : ""}
            </div>
        `;

        if (characters.length === 0) {
            grid.innerHTML = headerHtml + renderEmptyState("No characters in this collection");
        } else {
            grid.innerHTML =
                headerHtml +
                characters.map((char, i) => renderCharacterCard(char, i)).join("");
            grid._mnemoCharacters = characters;
        }

        // Hide pagination in collection view
        const footer = document.getElementById("mnemoFooter");
        if (footer) footer.style.display = "none";
    } catch (err) {
        console.error("[Mnemo] Collection chars failed:", err);
        grid.innerHTML = renderError(`Failed to load collection: ${err.message}`);
    } finally {
        content?.classList.remove("searching");
    }
}

// ─── Character Detail ───────────────────────────────────────────────────────────

async function openCharacterDetail(characterId) {
    const grid = document.getElementById("mnemoGrid");
    const content = document.getElementById("mnemoContent");
    if (!grid) return;

    content?.classList.add("searching");
    grid.innerHTML = renderSkeletons(2);

    try {
        const [character, reviews] = await Promise.all([
            fetchCharacterDetail(characterId),
            fetchReviews(characterId),
        ]);

        if (!character) {
            grid.innerHTML = renderError("Character not found");
            return;
        }

        detailCharacter = character;
        grid.innerHTML = renderCharacterDetail(character, reviews);

        // Hide footer in detail view
        const footer = document.getElementById("mnemoFooter");
        if (footer) footer.style.display = "none";

        // Bind detail events
        const backBtn = document.getElementById("mnemoDetailBack");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                detailCharacter = null;
                switchTab(activeTab);
            });
        }

        const downloadBtn = grid.querySelector("[data-detail-download]");
        if (downloadBtn) {
            downloadBtn.addEventListener("click", () => {
                downloadCharacter(character, downloadBtn);
            });
        }

        // Tag clicks in detail → search
        grid.querySelectorAll(".mnemo-detail .mnemo-tag").forEach((tagEl) => {
            tagEl.addEventListener("click", () => {
                const tagName = tagEl.getAttribute("data-tag");
                if (tagName) {
                    currentSearch = tagName;
                    activeTab = "search";
                    detailCharacter = null;
                    switchTab("search");
                    const searchInput = document.getElementById("mnemoSearchInput");
                    if (searchInput) searchInput.value = tagName;
                }
            });
        });
    } catch (err) {
        console.error("[Mnemo] Detail failed:", err);
        grid.innerHTML = renderError(`Failed to load character: ${err.message}`);
    } finally {
        content?.classList.remove("searching");
    }
}

// ─── Pagination & Bulk ──────────────────────────────────────────────────────────

function updatePagination() {
    const prevBtn = document.getElementById("mnemoPrevPage");
    const nextBtn = document.getElementById("mnemoNextPage");
    const pageInfo = document.getElementById("mnemoPageInfo");

    const page = activeTab === "collections" ? collectionsPage : currentPage;

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = totalResults < getSettings().findCount;
    if (pageInfo) pageInfo.textContent = `Page ${page}`;
}

function updateBulkButton() {
    const bulkBtn = document.getElementById("mnemoBulkBtn");
    if (!bulkBtn) return;

    if (selectedIndices.size > 0) {
        bulkBtn.style.display = "";
        bulkBtn.innerHTML = `${ICONS.download} Import ${selectedIndices.size} Selected`;
    } else {
        bulkBtn.style.display = "none";
    }
}

// ─── Event Binding ──────────────────────────────────────────────────────────────

function bindPopupEvents() {
    const searchInput = document.getElementById("mnemoSearchInput");
    const sortSelect = document.getElementById("mnemoSortSelect");
    const nsfwCheck = document.getElementById("mnemoNsfwCheck");
    const prevBtn = document.getElementById("mnemoPrevPage");
    const nextBtn = document.getElementById("mnemoNextPage");
    const grid = document.getElementById("mnemoGrid");
    const settingsBtn = document.getElementById("mnemoSettingsBtn");
    const bulkBtn = document.getElementById("mnemoBulkBtn");

    const doSearch = debounce(() => {
        currentPage = 1;
        executeSearch();
    }, 750);

    // Search input
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            doSearch();
        });
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                currentPage = 1;
                executeSearch();
            }
        });
    }

    // Sort
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value;
            currentPage = 1;
            executeSearch();
        });
    }

    // NSFW toggle
    if (nsfwCheck) {
        nsfwCheck.addEventListener("change", (e) => {
            extension_settings.mnemo.nsfw = e.target.checked;
            saveSettingsDebounced();
            currentPage = 1;
            if (activeTab === "search") executeSearch();
            else if (activeTab === "collections" && !activeCollection) loadCollections();
        });
    }

    // Pagination
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (activeTab === "collections" && !activeCollection) {
                if (collectionsPage > 1) {
                    collectionsPage--;
                    loadCollections();
                }
            } else if (currentPage > 1) {
                currentPage--;
                executeSearch();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (activeTab === "collections" && !activeCollection) {
                collectionsPage++;
                loadCollections();
            } else {
                currentPage++;
                executeSearch();
            }
        });
    }

    // Bulk import
    if (bulkBtn) {
        bulkBtn.addEventListener("click", () => {
            downloadSelected();
        });
    }

    // Tab clicks
    document.querySelectorAll(".mnemo-tab").forEach((tabEl) => {
        tabEl.addEventListener("click", () => {
            const tab = tabEl.getAttribute("data-tab");
            if (tab && tab !== activeTab) {
                switchTab(tab);
            }
        });
    });

    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            toggleSettings();
        });
    }

    // Grid event delegation
    if (grid) {
        grid.addEventListener("click", (e) => {
            // Download button
            const downloadBtn = e.target.closest(".mnemo-btn-download");
            if (downloadBtn && !downloadBtn.hasAttribute("data-detail-download")) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(downloadBtn.getAttribute("data-index"), 10);
                const characters = grid._mnemoCharacters || [];
                if (characters[index]) {
                    downloadCharacter(characters[index], downloadBtn);
                }
                return;
            }

            // Tag click → search
            const tagEl = e.target.closest(".mnemo-tag");
            if (tagEl) {
                e.preventDefault();
                e.stopPropagation();
                const tagName = tagEl.getAttribute("data-tag");
                if (tagName && searchInput) {
                    currentSearch = tagName;
                    searchInput.value = tagName;
                    activeTab = "search";
                    detailCharacter = null;
                    switchTab("search");
                }
                return;
            }

            // Collection card click
            const collCard = e.target.closest(".mnemo-collection-card");
            if (collCard) {
                e.preventDefault();
                e.stopPropagation();
                const collId = collCard.getAttribute("data-collection-id");
                if (collId) openCollection(collId);
                return;
            }

            // Collection back button
            const collBack = e.target.closest("#mnemoCollectionBack");
            if (collBack) {
                e.preventDefault();
                e.stopPropagation();
                activeCollection = null;
                loadCollections();
                const footer = document.getElementById("mnemoFooter");
                if (footer) footer.style.display = "";
                return;
            }

            // Character name click → detail view
            const nameEl = e.target.closest("[data-detail-id]");
            if (nameEl) {
                e.preventDefault();
                e.stopPropagation();
                const charId = nameEl.getAttribute("data-detail-id");
                if (charId) openCharacterDetail(charId);
                return;
            }

            // Checkbox click for bulk select
            const checkbox = e.target.closest(".mnemo-card-checkbox input[type='checkbox']");
            if (checkbox) {
                // Don't prevent default - let checkbox toggle
                const index = parseInt(checkbox.getAttribute("data-index"), 10);
                if (checkbox.checked) {
                    selectedIndices.add(index);
                } else {
                    selectedIndices.delete(index);
                }
                checkbox.closest(".mnemo-card-checkbox").classList.toggle("checked", checkbox.checked);
                updateBulkButton();
                return;
            }
        });
    }
}

// ─── Settings Toggle ────────────────────────────────────────────────────────────

function toggleSettings() {
    const content = document.getElementById("mnemoContent");
    const existing = document.getElementById("mnemoSettings");

    if (existing) {
        existing.remove();
        settingsOpen = false;
        return;
    }

    settingsOpen = true;
    const settingsHtml = renderSettingsPanel();
    content.insertAdjacentHTML("afterbegin", settingsHtml);

    // Bind settings events
    const tokenInput = document.getElementById("mnemoTokenInput");
    const baseUrlInput = document.getElementById("mnemoBaseUrlInput");
    const testBtn = document.getElementById("mnemoTestBtn");

    if (tokenInput) {
        tokenInput.addEventListener("change", (e) => {
            extension_settings.mnemo.apiToken = e.target.value.trim();
            cachedUserData = null; // Invalidate cache
            saveSettingsDebounced();
            syncNsfwFromProfile();
        });
    }

    if (baseUrlInput) {
        baseUrlInput.addEventListener("change", (e) => {
            extension_settings.mnemo.apiBaseUrl = e.target.value.trim() || DEFAULT_API_BASE;
            cachedUserData = null;
            saveSettingsDebounced();
        });
    }

    if (testBtn) {
        testBtn.addEventListener("click", async () => {
            const result = document.getElementById("mnemoTestResult");
            if (!result) return;

            if (!hasToken()) {
                result.innerHTML = '<span style="color:var(--mnemo-destructive)">No token set</span>';
                return;
            }

            result.textContent = "Testing…";
            try {
                const data = await mnemoApi("/user-api/me");
                const name = data.profile?.display_name || data.profile?.username || "Unknown";
                result.innerHTML = `<span style="color:hsl(152,60%,42%)">Connected as ${escapeHtml(name)}</span>`;
            } catch (err) {
                result.innerHTML = `<span style="color:var(--mnemo-destructive)">Failed: ${escapeHtml(err.message)}</span>`;
            }
        });
    }
}

// ─── NSFW Sync ──────────────────────────────────────────────────────────────────

async function syncNsfwFromProfile() {
    if (!hasToken()) return;

    try {
        const userData = await fetchUserData();
        if (userData.preferences?.show_nsfw && !getSettings().nsfw) {
            extension_settings.mnemo.nsfw = true;
            saveSettingsDebounced();
            const nsfwCheck = document.getElementById("mnemoNsfwCheck");
            if (nsfwCheck) nsfwCheck.checked = true;
        }
    } catch {
        // Silently fail — not critical
    }
}

// ─── Popup Open ─────────────────────────────────────────────────────────────────

async function openSearchPopup() {
    const popupHtml = buildPopupHtml();

    callPopup(popupHtml, "text", "", {
        okButton: "Close",
        wide: true,
        large: true,
    });

    // Short delay to let the DOM render
    await new Promise((r) => setTimeout(r, 50));

    bindPopupEvents();

    if (activeTab === "search") {
        executeSearch();
    } else {
        switchTab(activeTab);
    }
}

// ─── Init ───────────────────────────────────────────────────────────────────────

jQuery(async () => {
    loadSettings();

    // Insert toolbar button
    $("#external_import_button").after(
        `<button id="mnemo-search-btn" class="menu_button" title="Search Mnemo for characters">
            <img src="${MNEMO_ICON}" alt="Mnemo" class="mnemo-toolbar-icon" />
        </button>`
    );

    $("#mnemo-search-btn").on("click", () => {
        openSearchPopup();
    });

    // Register slash command
    try {
        registerSlashCommand(
            "mnemo",
            async (_args, value) => {
                const searchTerm = (value || "").trim();
                currentSearch = searchTerm;
                currentPage = 1;
                activeTab = "search";
                openSearchPopup();
            },
            [],
            "Search Mnemo for characters — usage: /mnemo [search term]",
            true,
            true
        );
    } catch (err) {
        console.warn(`[${EXTENSION_NAME}] Could not register slash command:`, err);
    }

    // Sync NSFW from profile on load
    syncNsfwFromProfile();

    console.log(`[${EXTENSION_NAME}] Loaded successfully.`);
});
