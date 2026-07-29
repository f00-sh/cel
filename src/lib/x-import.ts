export type PrefillField = "onlineLife" | "identityContent" | "marketPressure" | "affectLoad";

export type PrefillTrace = {
  field: PrefillField;
  modelSymbol: string;
  mapping: string;
  signals: string;
  value: number;
};

export type XProfile = {
  handle: string;
  avatar?: string;
  name?: string;
  bio?: string;
  estimated: {
    onlineLife: number;
    identityContent: number;
    marketPressure: number;
    affectLoad: number;
  };
  traces: PrefillTrace[];
};

export type XImportResult =
  | { ok: true; profile: XProfile }
  | { ok: false; error: string };

export async function importXProfile(handle: string): Promise<XImportResult> {
  const res = await fetch("/api/x-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle }),
  });
  if (!res.ok) {
    return { ok: false, error: `Lookup failed (${res.status}). Continue without import.` };
  }
  return (await res.json()) as XImportResult;
}
