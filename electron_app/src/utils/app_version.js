/**
 * Build-number helpers for DiffusionBee GUI.
 *
 * Official DiffusionBee model catalog entries may include `min_version`, which
 * gates downloads against the *official* app build. This fork ships the same
 * inference backend and should not block models on that legacy check.
 */

function parseBuildNumber(buildNumber) {
    if (buildNumber == null) return 0;
    const raw = String(buildNumber).trim();
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getAppBuildNumber() {
    try {
        return parseBuildNumber(require('../../package.json').build_number);
    } catch (e) {
        return 0;
    }
}

/**
 * Whether the catalog model can be downloaded in DiffusionBee GUI.
 * We intentionally ignore upstream min_version gates meant for official DiffusionBee.
 */
function isModelDownloadAllowed(model) {
    return !!(model && model.id && model.url);
}

function getModelDownloadBlockMessage(model, isArabic) {
    if (isModelDownloadAllowed(model)) return '';
    return isArabic
        ? 'هذا النموذج غير متاح للتحميل حاليًا.'
        : 'This model is not available for download right now.';
}

module.exports = {
    parseBuildNumber,
    getAppBuildNumber,
    isModelDownloadAllowed,
    getModelDownloadBlockMessage,
};