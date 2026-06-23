// Client-safe helpers for "jump to work" deep links.

/** obsidian://open?vault=WorkOS&file=<relPath without .md> */
export function obsidianUri(relPath: string): string {
  const vault = process.env.NEXT_PUBLIC_OBSIDIAN_VAULT || "WorkOS";
  const file = relPath.replace(/\.md$/i, "");
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
}

/** vscode://file/<abs path> — opens the file in VS Code on the same machine. */
export function vscodeUri(absPath: string): string {
  const p = absPath.replace(/\\/g, "/");
  return `vscode://file/${p.startsWith("/") ? "" : "/"}${p}`;
}

/** Encode a vault-relative path for our own /file route. */
export function fileViewUri(relPath: string): string {
  return `/file/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
