import { API_URL, WEB_URL } from "@/api/client";

const LOCAL_HOST = /^(https?:\/\/)(?:localhost|127\.0\.0\.1)(?=[:/]|$)/i;
const WEB_PHOTO = /^https?:\/\//i;
const hostOf = (origin: string) => origin.replace(/^https?:\/\//i, "").replace(/[:/].*$/, "");

/**
 * Where the app loads a listing photo from. A relative path is a file the web serves (the web renders
 * imageUrl as is), so it joins the web origin. A localhost URL keeps its port and moves to the host this
 * build reaches (the Android emulator reaches the Mac at 10.0.2.2, not localhost). A real photo host is
 * used as is, and anything else is refused.
 */
export function photoUri(url: string | null | undefined, origins: { api: string; web: string }): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return origins.web.replace(/\/+$/, "") + url;
  if (LOCAL_HOST.test(url)) return url.replace(LOCAL_HOST, `$1${hostOf(origins.api)}`);
  return WEB_PHOTO.test(url) ? url : null;
}

/** A listing photo's URL for this build. */
export const listingPhoto = (url: string | null | undefined) => photoUri(url, { api: API_URL, web: WEB_URL });
