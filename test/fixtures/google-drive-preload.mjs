// 실제 자격증명·네트워크를 쓰지 않는 별도 Node HTTP 종단 테스트용 모의 인증과 Drive API.
import { JWT } from "google-auth-library";

const originalFetch = globalThis.fetch;
const root = "root_folder_12345";
const folderMime = "application/vnd.google-apps.folder";
JWT.prototype.getRequestHeaders = async function () {
  if (this.email !== "test-service@example.invalid" || this.key !== "local-fake-private-key" ||
      JSON.stringify(this.scopes) !== JSON.stringify(["https://www.googleapis.com/auth/drive.metadata.readonly"])) {
    throw new Error("invalid test credentials");
  }
  return new Headers({ authorization: "Bearer local-test-token" });
};

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.origin !== "https://www.googleapis.com") return originalFetch(input, init);
  if (new Headers(init?.headers).get("authorization") !== "Bearer local-test-token") return new Response("{}", { status: 403 });
  let body;
  if (url.pathname.endsWith(`/files/${root}`)) {
    body = { id: root, mimeType: folderMime };
  } else {
    const q = url.searchParams.get("q") || "";
    if (!q.includes("visibility = 'anyoneWithLink' or visibility = 'anyoneCanFind'")) return new Response("{}", { status: 400 });
    const parent = q.match(/^'([^']+)' in parents/)?.[1];
    body = parent === root
      ? { files: [{ id: "childfolder123", name: "Do not expose folder", mimeType: folderMime }] }
      : parent === "childfolder123"
        ? { files: [{ id: "mockvideo1234", name: "Mock video.mp4", mimeType: "video/mp4", resourceKey: "mockkey12345", description: "Do not expose description" }] }
        : { files: [] };
  }
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};
