export async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });
  const value = await res
    .json()
    .catch(() => ({
      error: "The server could not be reached. Please try again.",
    }));
  if (!res.ok)
    throw Object.assign(new Error(value.error || "Something went wrong."), {
      status: res.status,
    });
  return value;
}
export function uploadPdf(form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/packs");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(
        new Error("Upload interrupted. Check your connection and try again."),
      );
    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error("Upload failed. Please try again."));
      }
      if (xhr.status >= 400) reject(new Error(data.error));
      else resolve(data);
    };
    xhr.send(form);
  });
}
