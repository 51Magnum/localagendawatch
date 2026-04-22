import { afterEach, describe, expect, it, vi } from "vitest";
import { queryFeatures, queryFeatureByField } from "./arcgis";

type Attrs = { OBJECTID: number; NAME: string };

function mockJsonResponse(body: unknown, init: { status?: number } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

function installFetch(responses: Response[]): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const layer = {
  serviceUrl: "https://example.com/rest/services/Test/MapServer",
  layerId: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("queryFeatures", () => {
  it("returns a flat list of attributes from a single-page response", async () => {
    installFetch([
      mockJsonResponse({
        features: [
          { attributes: { OBJECTID: 1, NAME: "a" } },
          { attributes: { OBJECTID: 2, NAME: "b" } },
        ],
      }),
    ]);
    const rows = await queryFeatures<Attrs>(layer);
    expect(rows).toEqual([
      { OBJECTID: 1, NAME: "a" },
      { OBJECTID: 2, NAME: "b" },
    ]);
  });

  it("builds the URL with the expected params and layer path", async () => {
    const fetchMock = installFetch([mockJsonResponse({ features: [] })]);
    await queryFeatures<Attrs>(layer, {
      where: "APPID = 'X'",
      outFields: ["OBJECTID", "NAME"],
      returnGeometry: true,
      orderByFields: "OBJECTID ASC",
    });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/rest/services/Test/MapServer/0/query");
    expect(url.searchParams.get("where")).toBe("APPID = 'X'");
    expect(url.searchParams.get("outFields")).toBe("OBJECTID,NAME");
    expect(url.searchParams.get("returnGeometry")).toBe("true");
    expect(url.searchParams.get("orderByFields")).toBe("OBJECTID ASC");
    expect(url.searchParams.get("f")).toBe("json");
    expect(url.searchParams.get("resultOffset")).toBe("0");
  });

  it("paginates while exceededTransferLimit is true and advances resultOffset", async () => {
    const fetchMock = installFetch([
      mockJsonResponse({
        features: [{ attributes: { OBJECTID: 1, NAME: "a" } }],
        exceededTransferLimit: true,
      }),
      mockJsonResponse({
        features: [{ attributes: { OBJECTID: 2, NAME: "b" } }],
        exceededTransferLimit: true,
      }),
      mockJsonResponse({
        features: [{ attributes: { OBJECTID: 3, NAME: "c" } }],
      }),
    ]);
    const rows = await queryFeatures<Attrs>(layer, { pageSize: 1 });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.OBJECTID)).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const offsets = fetchMock.mock.calls.map((c) =>
      new URL(c[0] as string).searchParams.get("resultOffset"),
    );
    expect(offsets).toEqual(["0", "1", "2"]);
  });

  it("throws on a non-ok HTTP response", async () => {
    installFetch([mockJsonResponse({}, { status: 503 })]);
    await expect(queryFeatures<Attrs>(layer)).rejects.toThrow(/ArcGIS 503/);
  });

  it("throws on an ArcGIS error body", async () => {
    installFetch([
      mockJsonResponse({
        features: [],
        error: { code: 400, message: "bad where clause" },
      }),
    ]);
    await expect(queryFeatures<Attrs>(layer)).rejects.toThrow(
      /ArcGIS error 400: bad where clause/,
    );
  });
});

describe("queryFeatureByField", () => {
  it("returns the first attribute row on match", async () => {
    installFetch([
      mockJsonResponse({
        features: [{ attributes: { OBJECTID: 7, NAME: "hit" } }],
      }),
    ]);
    const row = await queryFeatureByField<Attrs>(layer, "APPID", "ZMA-1");
    expect(row).toEqual({ OBJECTID: 7, NAME: "hit" });
  });

  it("returns null when no features match", async () => {
    installFetch([mockJsonResponse({ features: [] })]);
    const row = await queryFeatureByField<Attrs>(layer, "APPID", "missing");
    expect(row).toBeNull();
  });

  it("escapes single quotes in the lookup value", async () => {
    const fetchMock = installFetch([mockJsonResponse({ features: [] })]);
    await queryFeatureByField<Attrs>(layer, "NAME", "O'Brien");
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("where")).toBe("NAME = 'O''Brien'");
  });
});
